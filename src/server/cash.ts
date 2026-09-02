import { Router } from "express";
import { db } from "../db";
import { cashRegisters, cashRegisterBalances, payments, cashMovements, sales, saleItems, products, users, auditLogs, customers, saleItemLots, companySettings } from "../db/schema";
import { eq, desc, and, inArray, notInArray, sql, gte, lte } from "drizzle-orm";
import { AuthRequest, requirePermission, requireAuth } from "./authMiddleware";
import { routePayment } from "./finance";
import { syncStoreOrderFromSale } from "./storeOrderSync";
import { MONEY_EPSILON } from "../lib/money";
import { dayStartUtc, dayEndUtc } from "../lib/dateRange";
import { v4 as uuidv4 } from "uuid";
import { toUsd } from "./fx";
import { CURRENCIES } from "../lib/currency";

const router = Router();

router.use(requireAuth);

function isPrivilegedRole(roleName?: string | null) {
  return ["master", "admin", "administrador", "administrator"].includes(String(roleName || "").trim().toLowerCase());
}

// Sem isso, dois cliques (ou uma requisição repetida por rede lenta) em
// "Confirmar Abertura" podiam passar os dois pela checagem "já tem caixa
// aberto?" antes de qualquer um dos dois commitar, criando 2 registros OPEN
// pro mesmo operador — o /current só devolve 1 (sem ORDER BY), o outro fica
// órfão pra sempre. Índice parcial garante isso no banco, não só na aplicação.
let cashRegisterOpenIndexReady = false;
async function ensureCashRegisterOpenIndex() {
  if (cashRegisterOpenIndexReady) return;
  await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_cash_registers_one_open_per_user ON cash_registers (user_id) WHERE status = 'OPEN'`);
  cashRegisterOpenIndexReady = true;
}

// Soma real dos movimentos do caixa (abertura + suprimentos + vendas + sangrias + estornos).
async function computeExpectedClosingUsd(tx: any, registerId: string) {
  const movs = await tx.select({ amountUsd: cashMovements.amountUsd }).from(cashMovements).where(eq(cashMovements.cashRegisterId, registerId));
  const total = movs.reduce((acc: number, m: any) => acc + parseFloat(String(m.amountUsd || "0")), 0);
  return Math.round(total * 100) / 100;
}

// Get current open cash register for the user
router.get("/registers/current", requirePermission("cash", "view"), async (req: AuthRequest, res) => {
  try {
    const list = await db.select()
      .from(cashRegisters)
      .where(
        and(
          eq(cashRegisters.userId, req.user!.userId),
          eq(cashRegisters.status, "OPEN")
        )
      )
      .limit(1);

    res.json(list.length > 0 ? list[0] : null);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Open cash register
router.post("/registers/open", requirePermission("cash", "open"), async (req: AuthRequest, res) => {
  try {
    await ensureCashRegisterOpenIndex();
    // balances: [{ currency: "USD", amount: 100 }, { currency: "USDT", amount: 50 }, ...]
    // Retrocompatível: se vier só openingAmountUsd (chamada antiga), trata como [{currency:"USD",amount:openingAmountUsd}].
    const { balances, openingAmountUsd, notes } = req.body;
    const rawBalances = Array.isArray(balances) ? balances : [];
    for (const b of rawBalances) {
      if (!(CURRENCIES as readonly string[]).includes(String(b?.currency))) {
        return res.status(400).json({ error: `Moeda inválida: ${b?.currency}` });
      }
      if (!Number.isFinite(Number(b?.amount))) {
        return res.status(400).json({ error: `Valor inválido para ${b.currency}.` });
      }
    }
    // balanceList só some com entradas de valor <= 0 (que não representam saldo de abertura
    // real); entradas com moeda/valor inválidos já foram rejeitadas com 400 acima, nunca
    // descartadas em silêncio. Ficar com a lista vazia aqui é válido (abriu caixa sem contar
    // dinheiro ainda), igual ao comportamento antigo de openingAmountUsd 0/ausente.
    const balanceList: { currency: string; amount: number }[] = rawBalances.length > 0
      ? rawBalances
          .map((b: any) => ({ currency: String(b.currency), amount: Number(b.amount) || 0 }))
          .filter((b: any) => b.amount > 0)
      : (Number(openingAmountUsd) > 0 ? [{ currency: "USD", amount: Number(openingAmountUsd) }] : []);

    const seenCurrencies = new Set<string>();
    for (const b of balanceList) {
      if (seenCurrencies.has(b.currency)) {
        return res.status(400).json({ error: `Moeda ${b.currency} informada mais de uma vez.` });
      }
      seenCurrencies.add(b.currency);
    }

    const existing = await db.select().from(cashRegisters).where(
      and(
        eq(cashRegisters.userId, req.user!.userId),
        eq(cashRegisters.status, "OPEN")
      )
    ).limit(1);

    if (existing.length > 0) {
      return res.status(400).json({ error: "Você já possui um caixa em aberto." });
    }

    let totalUsd = 0;
    for (const b of balanceList) totalUsd += await toUsd(b.amount, b.currency);
    totalUsd = Math.round(totalUsd * 100) / 100;

    const inserted = await db.transaction(async (tx) => {
      const insertedRegRes = await tx.insert(cashRegisters).values({
        userId: req.user!.userId,
        status: "OPEN",
        openingAmountUsd: totalUsd.toFixed(2),
        notes
      }).returning();
      const reg = insertedRegRes[0];

      for (const b of balanceList) {
        await tx.insert(cashRegisterBalances).values({
          registerId: reg.id,
          currency: b.currency,
          openingAmount: b.amount.toFixed(4),
        });
      }

      if (totalUsd > 0) {
        await tx.insert(cashMovements).values({
          cashRegisterId: reg.id,
          type: "OPENING",
          amountUsd: totalUsd.toFixed(2),
          description: "Abertura de caixa",
          createdBy: req.user!.userId
        });
      }

      await tx.insert(auditLogs).values({
        userId: req.user!.userId,
        action: "OPEN",
        tableName: "cash_registers",
        recordId: reg.id,
        newValues: JSON.stringify({ balances: balanceList, notes })
      });
      return reg;
    });

    res.status(201).json(inserted);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Close cash register
router.post("/registers/:id/close", requirePermission("cash", "close"), async (req: AuthRequest, res) => {
  try {
    const id = req.params.id;
    // balances: [{ currency: "USD", declaredAmount: 120 }, ...] — retrocompatível com declaredClosingAmountUsd único.
    const { balances, declaredClosingAmountUsd, notes } = req.body;
    const rawDeclaredBalances = Array.isArray(balances) ? balances : [];
    for (const b of rawDeclaredBalances) {
      if (!(CURRENCIES as readonly string[]).includes(String(b?.currency))) {
        return res.status(400).json({ error: `Moeda inválida: ${b?.currency}` });
      }
      if (!Number.isFinite(Number(b?.declaredAmount)) || Number(b?.declaredAmount) < 0) {
        return res.status(400).json({ error: `Valor declarado inválido para ${b.currency}.` });
      }
    }
    const declaredList: { currency: string; declaredAmount: number }[] = rawDeclaredBalances.length > 0
      ? rawDeclaredBalances.map((b: any) => ({ currency: String(b.currency), declaredAmount: Number(b.declaredAmount) }))
      : (Number.isFinite(Number(declaredClosingAmountUsd)) && Number(declaredClosingAmountUsd) >= 0
          ? [{ currency: "USD", declaredAmount: Number(declaredClosingAmountUsd) }]
          : []);

    if (declaredList.length === 0) {
      return res.status(400).json({ error: "Informe o valor declarado de pelo menos uma moeda." });
    }

    const seenCurrencies = new Set<string>();
    for (const d of declaredList) {
      if (seenCurrencies.has(d.currency)) {
        return res.status(400).json({ error: `Moeda ${d.currency} informada mais de uma vez.` });
      }
      seenCurrencies.add(d.currency);
    }

    const list = await db.select().from(cashRegisters).where(eq(cashRegisters.id, id)).limit(1);
    if (list.length === 0) return res.status(404).json({ error: "Caixa não encontrado" });
    if (list[0].status === "CLOSED") return res.status(400).json({ error: "Caixa já está fechado" });
    if (list[0].userId !== req.user!.userId && !isPrivilegedRole(req.user!.roleName)) {
      return res.status(403).json({ error: "Este caixa pertence a outro operador." });
    }

    const result = await db.transaction(async (tx) => {
      // "Esperado" do TOTAL em USD equivalente usa o cálculo real de movimentos
      // (computeExpectedClosingUsd — soma cashMovements: abertura + vendas em
      // dinheiro + suprimentos − sangrias − estornos), currency-agnostic porque
      // cashMovements.amountUsd já é USD. NÃO usar a aproximação por moeda abaixo
      // pra esse total — ela conta só o saldo de abertura de cada moeda, ignorando
      // movimentos do turno, e serviria pra mascarar sobra/falta reais se fosse
      // usada aqui. O breakdown por moeda (cashRegisterBalances.expectedClosingAmount)
      // continua usando a aproximação por falta de rastreio de movimento por moeda —
      // é só uma referência granular, não a fonte do "Esperado" que a tela mostra.
      const expectedTotalUsd = Math.round((await computeExpectedClosingUsd(tx, id)) * 100) / 100;
      let declaredTotalUsd = 0;
      for (const d of declaredList) {
        const [existingBalance] = await tx.select().from(cashRegisterBalances)
          .where(and(eq(cashRegisterBalances.registerId, id), eq(cashRegisterBalances.currency, d.currency))).limit(1);
        // Sem linha de abertura pra essa moeda (caixa legado, aberto antes desse
        // recurso, ou moeda declarada no fechamento que nunca foi contada na
        // abertura) — não dá pra saber o esperado de verdade. Grava null em vez
        // de fabricar um "esperado=0" que criaria uma diferença falsa no
        // histórico (ex.: caixa legado com US$200 reais de abertura fecharia
        // acusando US$200 de sobra que nunca existiu).
        const expectedForCurrency = existingBalance ? Number(existingBalance.openingAmount) : null;
        const differenceForCurrency = expectedForCurrency !== null
          ? Math.round((d.declaredAmount - expectedForCurrency) * 10000) / 10000
          : null;

        if (existingBalance) {
          await tx.update(cashRegisterBalances).set({
            declaredClosingAmount: d.declaredAmount.toFixed(4),
            expectedClosingAmount: expectedForCurrency !== null ? expectedForCurrency.toFixed(4) : null,
            differenceAmount: differenceForCurrency !== null ? differenceForCurrency.toFixed(4) : null,
            updatedAt: new Date(),
          }).where(eq(cashRegisterBalances.id, existingBalance.id));
        } else {
          await tx.insert(cashRegisterBalances).values({
            registerId: id,
            currency: d.currency,
            openingAmount: "0",
            declaredClosingAmount: d.declaredAmount.toFixed(4),
            expectedClosingAmount: null,
            differenceAmount: null,
          });
        }

        declaredTotalUsd += await toUsd(d.declaredAmount, d.currency);
      }
      declaredTotalUsd = Math.round(declaredTotalUsd * 100) / 100;
      const differenceTotalUsd = Math.round((declaredTotalUsd - expectedTotalUsd) * 100) / 100;

      await tx.update(cashRegisters).set({
        status: "CLOSED",
        closedAt: new Date(),
        declaredClosingAmountUsd: declaredTotalUsd.toFixed(2),
        expectedClosingAmountUsd: expectedTotalUsd.toFixed(2),
        differenceAmountUsd: differenceTotalUsd.toFixed(2),
        notes,
        updatedAt: new Date()
      }).where(eq(cashRegisters.id, id));

      await tx.insert(auditLogs).values({
        userId: req.user!.userId,
        action: "CLOSE",
        tableName: "cash_registers",
        recordId: id,
        newValues: JSON.stringify({ balances: declaredList, expectedClosingAmountUsd: expectedTotalUsd.toFixed(2), differenceAmountUsd: differenceTotalUsd.toFixed(2) })
      });

      return { expectedClosingAmountUsd: expectedTotalUsd.toFixed(2), differenceAmountUsd: differenceTotalUsd.toFixed(2) };
    });

    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Supply
router.post("/registers/:id/supply", requirePermission("cash", "supply"), async (req: AuthRequest, res) => {
  try {
    const id = req.params.id;
    const { amountUsd, description } = req.body;
    
    if (!amountUsd || parseFloat(amountUsd) <= 0) return res.status(400).json({ error: "Valor inválido" });
    
    await db.transaction(async (tx) => {
      const reg = await tx.select().from(cashRegisters).where(eq(cashRegisters.id, id)).limit(1);
      if (reg.length === 0 || reg[0].status === "CLOSED") throw new Error("Caixa não encontrado ou fechado");
      if (reg[0].userId !== req.user!.userId && !isPrivilegedRole(req.user!.roleName)) throw new Error("Este caixa pertence a outro operador.");

      await tx.insert(cashMovements).values({
        cashRegisterId: id,
        type: "SUPPLY",
        amountUsd,
        description: description || "Suprimento manual",
        createdBy: req.user!.userId
      });
      
      await tx.insert(auditLogs).values({
        userId: req.user!.userId,
        action: "SUPPLY",
        tableName: "cash_registers",
        recordId: id,
        newValues: JSON.stringify({ amountUsd, description })
      });
    });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Withdrawal (Sangria)
router.post("/registers/:id/withdrawal", requirePermission("cash", "withdrawal"), async (req: AuthRequest, res) => {
  try {
    const id = req.params.id;
    const { amountUsd, description } = req.body;
    
    if (!amountUsd || parseFloat(amountUsd) <= 0) return res.status(400).json({ error: "Valor inválido" });
    
    await db.transaction(async (tx) => {
      const reg = await tx.select().from(cashRegisters).where(eq(cashRegisters.id, id)).limit(1);
      if (reg.length === 0 || reg[0].status === "CLOSED") throw new Error("Caixa não encontrado ou fechado");
      if (reg[0].userId !== req.user!.userId && !isPrivilegedRole(req.user!.roleName)) throw new Error("Este caixa pertence a outro operador.");

      await tx.insert(cashMovements).values({
        cashRegisterId: id,
        type: "WITHDRAWAL",
        amountUsd: "-" + amountUsd,
        description: description || "Retirada/Sangria manual",
        createdBy: req.user!.userId
      });
      
      await tx.insert(auditLogs).values({
        userId: req.user!.userId,
        action: "WITHDRAWAL",
        tableName: "cash_registers",
        recordId: id,
        newValues: JSON.stringify({ amountUsd: "-" + amountUsd, description })
      });
    });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get movements
router.get("/registers/:id/movements", requirePermission("cash", "view"), async (req: AuthRequest, res) => {
  try {
    const list = await db.select({
      id: cashMovements.id,
      type: cashMovements.type,
      amountUsd: cashMovements.amountUsd,
      description: cashMovements.description,
      createdAt: cashMovements.createdAt,
      createdBy: users.name
    })
    .from(cashMovements)
    .leftJoin(users, eq(cashMovements.createdBy, users.id))
    .where(eq(cashMovements.cashRegisterId, req.params.id))
    .orderBy(desc(cashMovements.createdAt));

    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Sales pending payment
router.get("/sales-pending", requirePermission("cash", "view"), async (req: AuthRequest, res) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit || "100"), 10) || 100, 200);
    const list = await db.select({
      id: sales.id,
      series: sales.series,
      number: sales.number,
      customerName: customers.name,
      totalAmount: sales.totalAmount,
      paymentStatus: sales.paymentStatus,
      fulfillmentStatus: sales.fulfillmentStatus,
      lotStatus: sales.lotStatus,
      createdAt: sales.createdAt
    })
    .from(sales)
    .leftJoin(customers, eq(sales.customerId, customers.id))
    .where(
      and(
        inArray(sales.paymentStatus, ["PENDING", "PARTIAL"]),
        notInArray(sales.orderStatus, ["CANCELED", "CANCELLED", "RETURNED"])
      )
    )
    .orderBy(desc(sales.createdAt))
    .limit(limit);

    // Quanto já foi pago em cada venda (para mostrar "pago X / falta Y" no parcial).
    const saleIds = list.map((s) => s.id);
    const paidBySale = new Map<string, number>();
    if (saleIds.length > 0) {
      const paidRows = await db.select({ saleId: payments.saleId, paid: sql<number>`sum(cast(${payments.amountUsd} as numeric))` })
        .from(payments)
        .where(and(inArray(payments.saleId, saleIds), eq(payments.status, "COMPLETED")))
        .groupBy(payments.saleId);
      for (const r of paidRows) if (r.saleId) paidBySale.set(r.saleId, Number(r.paid) || 0);
    }
    const enriched = list.map((s) => {
      const paid = paidBySale.get(s.id) || 0;
      const total = Number(s.totalAmount) || 0;
      return { ...s, paidAmount: Math.round(paid * 100) / 100, remainingAmount: Math.round(Math.max(0, total - paid) * 100) / 100 };
    });
    res.json(enriched);
  } catch(err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Sales paid
router.get("/sales-paid", requirePermission("cash", "view"), async (req: AuthRequest, res) => {
  try {
    // Sem dateFrom/dateTo: comportamento antigo (últimas N vendas). Com filtro,
    // é uma busca histórica deliberada — sobe o teto até o limite máximo da rota.
    const dateFrom = req.query.dateFrom ? String(req.query.dateFrom) : null;
    const dateTo = req.query.dateTo ? String(req.query.dateTo) : null;
    const defaultLimit = dateFrom || dateTo ? 200 : 50;
    const limit = Math.min(parseInt(String(req.query.limit || String(defaultLimit)), 10) || defaultLimit, 200);
    const conditions = [
      eq(sales.paymentStatus, "PAID"),
      notInArray(sales.orderStatus, ["CANCELED", "CANCELLED", "RETURNED"]),
    ];
    if (dateFrom) conditions.push(gte(sales.createdAt, dayStartUtc(dateFrom)));
    if (dateTo) conditions.push(lte(sales.createdAt, dayEndUtc(dateTo)));
    const list = await db.select({
      id: sales.id,
      series: sales.series,
      number: sales.number,
      customerName: customers.name,
      totalAmount: sales.totalAmount,
      paymentStatus: sales.paymentStatus,
      fulfillmentStatus: sales.fulfillmentStatus,
      lotStatus: sales.lotStatus,
      createdAt: sales.createdAt,
      // We will join payments later to get these
    })
    .from(sales)
    .leftJoin(customers, eq(sales.customerId, customers.id))
    .where(and(...conditions))
    .orderBy(desc(sales.createdAt))
    .limit(limit);

    // Fetch latest payment for each sale
    const saleIds = list.map(s => s.id);
    let pmts = [];
    if (saleIds.length > 0) {
      pmts = await db.select({
        saleId: payments.saleId,
        paymentMethod: payments.paymentMethod,
        createdAt: payments.createdAt,
        userName: users.name
      })
      .from(payments)
      .leftJoin(users, eq(payments.receivedBy, users.id))
      .where(inArray(payments.saleId, saleIds))
      .orderBy(desc(payments.createdAt));
    }

    // pmts vem ordenado por createdAt desc — o 1º de cada venda é o pagamento mais recente.
    const latestBySale = new Map<string, any>();
    for (const p of pmts) if (p.saleId && !latestBySale.has(p.saleId)) latestBySale.set(p.saleId, p);
    const enhancedList = list.map(s => {
      const pmt = latestBySale.get(s.id);
      return {
        ...s,
        paymentMethod: pmt?.paymentMethod,
        paymentDate: pmt?.createdAt,
        cashierName: pmt?.userName
      };
    });

    res.json(enhancedList);
  } catch(err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET sale details with items for cash review
router.get("/sales/:saleId/details", requirePermission("cash", "view"), async (req: AuthRequest, res) => {
  try {
    const saleRows = await db.select({
      id: sales.id,
      series: sales.series,
      number: sales.number,
      customerName: customers.name,
      subtotalAmount: sales.subtotalAmount,
      ivaAmount: sales.ivaAmount,
      discountAmount: sales.discountAmount,
      totalAmount: sales.totalAmount,
      paymentStatus: sales.paymentStatus,
      fulfillmentStatus: sales.fulfillmentStatus,
      createdAt: sales.createdAt,
      observations: sales.observations,
    })
    .from(sales)
    .leftJoin(customers, eq(sales.customerId, customers.id))
    .where(eq(sales.id, req.params.saleId))
    .limit(1);

    if (!saleRows.length) return res.status(404).json({ error: "Venda não encontrada" });

    const items = await db.select({
      id: saleItems.id,
      productName: products.name,
      sku: products.sku,
      quantity: saleItems.quantity,
      unitPrice: saleItems.unitPrice,
      ivaAmount: saleItems.ivaAmount,
      totalPrice: saleItems.totalPrice,
    })
    .from(saleItems)
    .leftJoin(products, eq(saleItems.productId, products.id))
    .where(eq(saleItems.saleId, req.params.saleId));

    const itemIds = items.map((item) => item.id);
    const lots = itemIds.length ? await db.select({ saleItemId: saleItemLots.saleItemId, lotNumber: saleItemLots.lotNumber, quantity: saleItemLots.quantity }).from(saleItemLots).where(inArray(saleItemLots.saleItemId, itemIds)) : [];
    const itemsWithLots = items.map((item) => ({
      ...item,
      lots: lots.filter((lot) => lot.saleItemId === item.id).map((lot) => ({ lotNumber: lot.lotNumber, quantity: lot.quantity }))
    }));

    res.json({ sale: saleRows[0], items: itemsWithLots });
  } catch(err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET sale payments (to see how much was already paid)
router.get("/sales/:saleId/payments", requirePermission("cash", "view"), async (req: AuthRequest, res) => {
  try {
    const list = await db.select()
      .from(payments)
      .where(and(eq(payments.saleId, req.params.saleId), eq(payments.status, "COMPLETED")))
      .orderBy(payments.createdAt);
      
    res.json(list);
  } catch(err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Receive Payment
const ALLOWED_PAYMENT_METHODS = ["CASH", "PIX", "CREDIT_CARD", "DEBIT_CARD", "TRANSFER"];
// Subconjunto deliberado de CURRENCIES (lib/currency.ts) — PYG fica de fora porque
// nenhuma tela oferece essa opção pra pagamento. NÃO sincroniza automaticamente com
// CURRENCIES: se uma moeda nova entrar lá e também servir pra pagamento, adicionar aqui à mão.
const ALLOWED_PAYMENT_CURRENCIES = ["USD", "BRL", "USDT"];

router.post("/sales/:saleId/payments", requirePermission("cash", "receive_payment"), async (req: AuthRequest, res) => {
  try {
    const saleId = req.params.saleId;
    const { cashRegisterId, paymentMethod, currency, amount, exchangeRate, notes, accountId } = req.body;

    // Validação de entrada — nunca confiar em valores calculados pelo cliente.
    if (!ALLOWED_PAYMENT_METHODS.includes(String(paymentMethod))) {
      return res.status(400).json({ error: "Forma de pagamento inválida." });
    }
    const payCurrency = ALLOWED_PAYMENT_CURRENCIES.includes(String(currency)) ? String(currency) : "USD";
    const amountNum = Number(amount);
    const rateNum = Number(exchangeRate);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      return res.status(400).json({ error: "Valor do pagamento deve ser maior que zero." });
    }
    if (!Number.isFinite(rateNum) || rateNum <= 0) {
      return res.status(400).json({ error: "Taxa de câmbio inválida." });
    }

    const saleInfo = await db.select().from(sales).where(eq(sales.id, saleId)).limit(1);
    if (saleInfo.length === 0) return res.status(404).json({ error: "Venda não encontrada" });
    if (["CANCELED", "CANCELLED", "RETURNED"].includes(String(saleInfo[0].orderStatus)) || saleInfo[0].paymentStatus === "REFUNDED") {
      return res.status(400).json({ error: "Venda cancelada/devolvida não aceita pagamento." });
    }

    const regInfo = await db.select().from(cashRegisters).where(eq(cashRegisters.id, cashRegisterId)).limit(1);
    if (regInfo.length === 0 || regInfo[0].status === "CLOSED") return res.status(400).json({ error: "Caixa inválido ou fechado" });
    // O pagamento só pode entrar no caixa do próprio operador (ou de quem tem permissão administrativa).
    if (regInfo[0].userId !== req.user!.userId && !isPrivilegedRole(req.user!.roleName)) {
      return res.status(403).json({ error: "Este caixa pertence a outro operador." });
    }

    const result = await db.transaction(async (tx) => {
      // Trava a venda E reconfere o status com o dado travado — a checagem lá em cima (linha 439)
      // rodou fora da transação; se a venda foi cancelada entre aquela leitura e este lock, o
      // pagamento não pode seguir usando o `saleInfo` velho (senão o dinheiro entra numa venda
      // morta e o cancelamento fica silenciosamente desfeito).
      const [locked] = await tx.select().from(sales).where(eq(sales.id, saleId)).limit(1).for("update");
      if (!locked) throw new Error("Venda não encontrada.");
      if (["CANCELED", "CANCELLED", "RETURNED"].includes(String(locked.orderStatus)) || locked.paymentStatus === "REFUNDED") {
        throw new Error("Venda cancelada/devolvida não aceita pagamento.");
      }
      // Saldo pendente calculado no servidor a partir dos pagamentos já concluídos.
      const priorPayments = await tx.select().from(payments).where(and(eq(payments.saleId, saleId), eq(payments.status, "COMPLETED")));
      const alreadyPaidUsd = priorPayments.reduce((acc, curr) => acc + parseFloat(String(curr.amountUsd)), 0);
      const saleTotal = parseFloat(String(locked.totalAmount));
      const remaining = Math.max(0, saleTotal - alreadyPaidUsd);
      if (remaining <= MONEY_EPSILON) {
        throw new Error("Esta venda já está totalmente paga.");
      }

      // amountUsd recalculado no servidor: valor na moeda ÷ câmbio, limitado ao pendente.
      const rawUsd = amountNum / rateNum;
      const appliedUsd = Math.min(Math.round(rawUsd * 100) / 100, remaining);
      if (appliedUsd <= 0) {
        throw new Error("Valor convertido do pagamento é zero.");
      }
      const appliedUsdStr = appliedUsd.toFixed(2);

      const insertedPaymentRes = await tx.insert(payments).values({
        saleId,
        cashRegisterId,
        paymentMethod,
        currency: payCurrency,
        amount: String(amountNum),
        exchangeRate: String(rateNum),
        amountUsd: appliedUsdStr,
        status: "COMPLETED",
        receivedBy: req.user!.userId,
        notes
      }).returning();
      const pmt = insertedPaymentRes[0];

      // A gaveta do caixa só recebe DINHEIRO. PIX/cartão/transferência não entram no caixa físico.
      if (paymentMethod === "CASH") {
        await tx.insert(cashMovements).values({
          cashRegisterId,
          type: "SALE_PAYMENT",
          amountUsd: appliedUsdStr,
          description: `Pgt venda ${locked.series}-${locked.number}`,
          referenceId: pmt.id,
          createdBy: req.user!.userId
        });
      }

      // Direciona o dinheiro para a conta escolhida (ou mapeada pela forma de pagamento). Se não
      // houver conta mapeada pra essa forma, routePayment devolve null e não lança nada — sem essa
      // checagem a venda seguia marcada como paga com o dinheiro sem nenhum registro no Financeiro.
      const routed = await routePayment(tx, paymentMethod, appliedUsd, {
        saleId,
        saleLabel: `Venda ${locked.series}-${String(locked.number).padStart(6, "0")}`,
        userId: req.user!.userId,
        accountId: accountId || null,
        sourceCurrency: String(locked.currency || "BRL"),
      });
      if (!routed) {
        throw new Error(`Nenhuma conta configurada para ${paymentMethod} — mapeie em Financeiro > Mapear Contas antes de receber.`);
      }

      const totalPaidUsd = alreadyPaidUsd + appliedUsd;
      let newStatus = "PARTIAL";
      if (totalPaidUsd >= saleTotal - MONEY_EPSILON) {
        newStatus = "PAID";
      }

      let orderStatusUpdate = {};
      if (newStatus === "PAID" && locked.fulfillmentStatus === "DELIVERED") {
        orderStatusUpdate = { orderStatus: "COMPLETED" };
      }
      await tx.update(sales).set({ paymentStatus: newStatus, ...orderStatusUpdate }).where(eq(sales.id, saleId));

      // Se essa venda veio de um pedido da loja, reflete o pagamento lá também
      // (sem isso, pagar pelo Caixa nunca aparecia como "Confirmado" em
      // Pedidos da Loja, mesmo com o dinheiro já recebido).
      await syncStoreOrderFromSale(tx, saleId, req.user!.userId);

      await tx.insert(auditLogs).values({
        id: uuidv4(),
        userId: req.user!.userId,
        action: "RECEIVE_PAYMENT",
        tableName: "sales",
        recordId: saleId,
        newValues: JSON.stringify({ paymentId: pmt.id, amountUsd: appliedUsdStr, newStatus, ...orderStatusUpdate })
      });

      return { appliedUsd: appliedUsdStr, newStatus };
    });

    res.status(201).json({ success: true, ...result });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Split: recebe uma venda em várias formas de pagamento de uma vez (valores em R$).
router.post("/sales/:saleId/payments/split", requirePermission("cash", "receive_payment"), async (req: AuthRequest, res) => {
  try {
    const saleId = req.params.saleId;
    const { cashRegisterId, lines, notes } = req.body || {};
    if (!Array.isArray(lines) || lines.length === 0) return res.status(400).json({ error: "Informe as formas de pagamento." });

    const saleInfo = await db.select().from(sales).where(eq(sales.id, saleId)).limit(1);
    if (saleInfo.length === 0) return res.status(404).json({ error: "Venda não encontrada" });
    if (["CANCELED", "CANCELLED", "RETURNED"].includes(String(saleInfo[0].orderStatus)) || saleInfo[0].paymentStatus === "REFUNDED") {
      return res.status(400).json({ error: "Venda cancelada/devolvida não aceita pagamento." });
    }
    const regInfo = await db.select().from(cashRegisters).where(eq(cashRegisters.id, cashRegisterId)).limit(1);
    if (regInfo.length === 0 || regInfo[0].status === "CLOSED") return res.status(400).json({ error: "Caixa inválido ou fechado" });
    if (regInfo[0].userId !== req.user!.userId && !isPrivilegedRole(req.user!.roleName)) return res.status(403).json({ error: "Este caixa pertence a outro operador." });

    const saleLabel = `Venda ${saleInfo[0].series}-${String(saleInfo[0].number).padStart(6, "0")}`;
    const result = await db.transaction(async (tx) => {
      // Trava a venda E reconfere o status travado, mesmo motivo do endpoint de pagamento único acima.
      const [locked] = await tx.select().from(sales).where(eq(sales.id, saleId)).limit(1).for("update");
      if (!locked) throw new Error("Venda não encontrada.");
      if (["CANCELED", "CANCELLED", "RETURNED"].includes(String(locked.orderStatus)) || locked.paymentStatus === "REFUNDED") {
        throw new Error("Venda cancelada/devolvida não aceita pagamento.");
      }
      // Cada linha do split é gravada com exchangeRate="1" (valor digitado = valor aplicado, sem
      // conversão) — só é seguro quando a venda já está em R$. Numa venda em outra moeda isso faria
      // a 1ª linha "quitar" sozinha (valor maior do que deveria) e descartar a 2ª em silêncio.
      if (String(locked.currency || "BRL") !== "BRL") {
        throw new Error("Pagamento dividido só está disponível pra vendas em R$. Para vendas em outra moeda, use pagamento único com o câmbio informado.");
      }
      const prior = await tx.select().from(payments).where(and(eq(payments.saleId, saleId), eq(payments.status, "COMPLETED")));
      const alreadyPaid = prior.reduce((a, p) => a + parseFloat(String(p.amountUsd)), 0);
      const saleTotal = parseFloat(String(locked.totalAmount));
      let remaining = Math.max(0, saleTotal - alreadyPaid);
      let appliedTotal = 0;

      for (const line of lines) {
        if (remaining <= MONEY_EPSILON) break;
        const method = String(line.method || "");
        if (!ALLOWED_PAYMENT_METHODS.includes(method)) throw new Error("Forma de pagamento inválida na divisão.");
        const amt = Number(line.amount);
        if (!Number.isFinite(amt) || amt <= 0) continue;
        const applied = Math.min(Math.round(amt * 100) / 100, remaining);
        if (applied <= 0) continue;
        const appliedStr = applied.toFixed(2);

        const [pmt] = await tx.insert(payments).values({
          saleId, cashRegisterId, paymentMethod: method, currency: "BRL",
          amount: String(amt), exchangeRate: "1", amountUsd: appliedStr,
          status: "COMPLETED", receivedBy: req.user!.userId, notes,
        }).returning();

        if (method === "CASH") {
          await tx.insert(cashMovements).values({ cashRegisterId, type: "SALE_PAYMENT", amountUsd: appliedStr, description: `Pgt ${saleLabel} (dinheiro)`, referenceId: pmt.id, createdBy: req.user!.userId });
        }
        const routed = await routePayment(tx, method, applied, { saleId, saleLabel, userId: req.user!.userId, accountId: line.accountId || null, sourceCurrency: "BRL" });
        if (!routed) throw new Error(`Nenhuma conta configurada para ${method} — mapeie em Financeiro > Mapear Contas antes de receber.`);

        remaining = Math.round((remaining - applied) * 100) / 100;
        appliedTotal = Math.round((appliedTotal + applied) * 100) / 100;
      }

      const totalPaid = alreadyPaid + appliedTotal;
      const newStatus = totalPaid >= saleTotal - MONEY_EPSILON ? "PAID" : "PARTIAL";
      const orderStatusUpdate = newStatus === "PAID" && locked.fulfillmentStatus === "DELIVERED" ? { orderStatus: "COMPLETED" } : {};
      await tx.update(sales).set({ paymentStatus: newStatus, ...orderStatusUpdate }).where(eq(sales.id, saleId));
      await syncStoreOrderFromSale(tx, saleId, req.user!.userId);
      await tx.insert(auditLogs).values({ id: uuidv4(), userId: req.user!.userId, action: "RECEIVE_PAYMENT_SPLIT", tableName: "sales", recordId: saleId, newValues: JSON.stringify({ appliedTotal, newStatus, lines: lines.length }) });
      return { appliedTotal, newStatus };
    });

    res.status(201).json({ success: true, ...result });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Recebimento avulso (sem venda): entra numa conta financeira.
router.post("/misc-receipt", requirePermission("cash", "receive_payment"), async (req: AuthRequest, res) => {
  try {
    const { cashRegisterId, method, amount, accountId, description } = req.body || {};
    if (!ALLOWED_PAYMENT_METHODS.includes(String(method))) return res.status(400).json({ error: "Forma de pagamento inválida." });
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) return res.status(400).json({ error: "Valor deve ser maior que zero." });
    const desc = String(description || "Recebimento avulso").trim() || "Recebimento avulso";

    await db.transaction(async (tx) => {
      if (method === "CASH" && cashRegisterId) {
        const reg = await tx.select().from(cashRegisters).where(eq(cashRegisters.id, cashRegisterId)).limit(1);
        if (reg.length && reg[0].status === "OPEN") {
          // Só o dono do caixa (ou papel privilegiado) pode lançar na gaveta — evita inflar o caixa de um colega.
          if (reg[0].userId !== req.user!.userId && !isPrivilegedRole(req.user!.roleName)) {
            throw new Error("Este caixa pertence a outro operador.");
          }
          await tx.insert(cashMovements).values({ cashRegisterId, type: "SUPPLY", amountUsd: amt.toFixed(2), description: `Avulso: ${desc}`, createdBy: req.user!.userId });
        }
      }
      // Recebimento avulso não tem venda pra herdar a moeda — segue a moeda padrão da empresa,
      // mesma convenção do resto do Caixa (abertura, sangria/suprimento).
      const companyRows = await tx.select({ defaultCurrency: companySettings.defaultCurrency }).from(companySettings).limit(1);
      const miscCurrency = companyRows[0]?.defaultCurrency === "BRL" ? "BRL" : "USD";
      const routed = await routePayment(tx, method, amt, { saleLabel: `Avulso: ${desc}`, userId: req.user!.userId, accountId: accountId || null, sourceCurrency: miscCurrency });
      if (!routed) throw new Error(`Nenhuma conta configurada para ${method} — mapeie em Financeiro > Mapear Contas antes de receber.`);
      await tx.insert(auditLogs).values({ id: uuidv4(), userId: req.user!.userId, action: "MISC_RECEIPT", tableName: "financial_accounts", recordId: accountId || "-", newValues: JSON.stringify({ method, amount: amt, description: desc }) });
    });
    res.status(201).json({ success: true });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

// Histórico de caixas fechados.
router.get("/registers/history", requirePermission("cash", "view"), async (req: AuthRequest, res) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit || "50"), 10) || 50, 200);
    const rows = await db.select({
      id: cashRegisters.id, openedAt: cashRegisters.openedAt, closedAt: cashRegisters.closedAt,
      openingAmountUsd: cashRegisters.openingAmountUsd, declaredClosingAmountUsd: cashRegisters.declaredClosingAmountUsd,
      expectedClosingAmountUsd: cashRegisters.expectedClosingAmountUsd, differenceAmountUsd: cashRegisters.differenceAmountUsd,
      notes: cashRegisters.notes, userName: users.name,
    })
    .from(cashRegisters).leftJoin(users, eq(cashRegisters.userId, users.id))
    .where(eq(cashRegisters.status, "CLOSED"))
    .orderBy(desc(cashRegisters.closedAt)).limit(limit);
    res.json({ data: rows });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Relatório de um caixa (para imprimir).
router.get("/registers/:id/report", requirePermission("cash", "view"), async (req: AuthRequest, res) => {
  try {
    const regRows = await db.select().from(cashRegisters).leftJoin(users, eq(cashRegisters.userId, users.id)).where(eq(cashRegisters.id, req.params.id)).limit(1);
    if (!regRows.length) return res.status(404).json({ error: "Caixa não encontrado." });
    const reg: any = regRows[0].cash_registers;
    const userName = regRows[0].users?.name;
    const movs = await db.select().from(cashMovements).where(eq(cashMovements.cashRegisterId, req.params.id)).orderBy(cashMovements.createdAt);
    const sum = (type: string) => movs.filter((m) => m.type === type).reduce((a, m) => a + parseFloat(String(m.amountUsd)), 0);
    res.json({
      register: { ...reg, userName },
      summary: {
        opening: Number(reg.openingAmountUsd || 0),
        salesCash: Math.round(sum("SALE_PAYMENT") * 100) / 100,
        supplies: Math.round(sum("SUPPLY") * 100) / 100,
        withdrawals: Math.round(sum("WITHDRAWAL") * 100) / 100,
        refunds: Math.round(sum("REFUND") * 100) / 100,
        expected: Number(reg.expectedClosingAmountUsd || 0),
        declared: Number(reg.declaredClosingAmountUsd || 0),
        difference: Number(reg.differenceAmountUsd || 0),
      },
      movements: movs.map((m) => ({ type: m.type, amountUsd: m.amountUsd, description: m.description, createdAt: m.createdAt })),
    });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
