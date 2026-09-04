import { Router } from "express";
import { db } from "../db";
import { financialAccounts, accountMovements, paymentMethodAccounts, users } from "../db/schema";
import { and, desc, eq } from "drizzle-orm";
import { AuthRequest, requireAuth, requirePermission, findMasterByPassword } from "./authMiddleware";
import { logAction } from "./audit";
import { createNotification } from "./notifications";
import { isValidCurrency } from "../lib/currency";

const router = Router();
router.use(requireAuth);

const round2 = (n: number) => Math.round(n * 100) / 100;

// Converte um valor em BRL para a moeda nativa de uma conta (cotação do dia, manual > API).
// Retorna { amount, fx } — fx é a taxa BRL→moeda usada (1 quando a conta é BRL).
export async function convertBrlToAccountCurrency(amountBrl: number, accountCurrency: string): Promise<{ amount: number; fx: number }> {
  const cur = String(accountCurrency || "BRL");
  if (cur === "BRL") return { amount: round2(amountBrl), fx: 1 };
  const { resolveRates } = await import("./fx");
  const rates = await resolveRates();
  if (cur === "USD") {
    const r = rates.USDBRL?.rate;
    if (!r) throw new Error("Sem cotação USD/BRL — informe o câmbio em Financeiro > Câmbio de hoje.");
    return { amount: round2(amountBrl / r), fx: 1 / r };
  }
  if (cur === "PYG") {
    const r = rates.BRLPYG?.rate;
    if (!r) throw new Error("Sem cotação BRL/PYG — informe o câmbio em Financeiro > Câmbio de hoje.");
    return { amount: round2(amountBrl * r), fx: r };
  }
  if (cur === "USDT") {
    const r = rates.USDTBRL?.rate;
    if (!r) throw new Error("Sem cotação USDT/BRL — informe o câmbio em Financeiro > Câmbio de hoje.");
    return { amount: round2(amountBrl / r), fx: 1 / r };
  }
  throw new Error(`Moeda desconhecida: ${cur}`);
}

// Converte um valor de QUALQUER moeda de origem pra moeda nativa de uma conta, passando por BRL
// como moeda-ponte (usa toBrl() de fx.ts + convertBrlToAccountCurrency acima, sem reimplementar
// a lógica de câmbio). Achado real: routePayment chamava convertBrlToAccountCurrency direto
// assumindo que o valor já vinha em BRL — mas o valor de uma venda segue a moeda padrão da empresa
// (companySettings.defaultCurrency, USD por padrão), então em loja configurada pra USD/DUAL isso
// corrompia o saldo lançado (dividia ou deixava de multiplicar pela cotação, dependendo da conta).
export async function convertCurrency(amount: number, fromCurrency: string, toCurrency: string): Promise<{ amount: number; fx: number }> {
  const from = String(fromCurrency || "BRL");
  const to = String(toCurrency || "BRL");
  if (from === to) return { amount: round2(amount), fx: 1 };
  const { toBrl } = await import("./fx");
  const amountBrl = from === "BRL" ? amount : await toBrl(amount, from);
  const converted = await convertBrlToAccountCurrency(amountBrl, to);
  const fx = amount !== 0 ? converted.amount / amount : converted.fx;
  return { amount: converted.amount, fx };
}

// Tipos de conta válidos por forma de pagamento (espelha accountsForMethod do front).
const METHOD_ACCOUNT_TYPES: Record<string, string[]> = {
  CASH: ["CASH"],
  PIX: ["BANK"],
  DEBIT_CARD: ["BANK"],
  CREDIT_CARD: ["CARD_RECEIVABLE"],
  TRANSFER: ["BANK", "OTHER"],
  USDT: ["BANK", "OTHER"],
};

interface PostOpts {
  referenceType?: string | null;
  referenceId?: string | null;
  expectedSettlementDate?: Date | null;
  settled?: boolean;
  description?: string | null;
  userId?: string | null;
}

// Lança um movimento numa conta e atualiza o saldo. amount sinalizado (+ entra, − sai).
export async function postMovement(tx: any, accountId: string, type: string, amount: number, opts: PostOpts = {}) {
  // SELECT ... FOR UPDATE: serializa movimentos concorrentes na mesma conta (evita lost update no saldo).
  const rows = await tx.select().from(financialAccounts).where(eq(financialAccounts.id, accountId)).limit(1).for("update");
  if (!rows.length) throw new Error("Conta financeira não encontrada.");
  const next = round2(Number(rows[0].currentBalance) + Number(amount));
  await tx.update(financialAccounts).set({ currentBalance: next.toFixed(2), updatedAt: new Date() }).where(eq(financialAccounts.id, accountId));
  await tx.insert(accountMovements).values({
    accountId,
    type,
    amountUsd: Number(amount).toFixed(2),
    balanceAfter: next.toFixed(2),
    referenceType: opts.referenceType || null,
    referenceId: opts.referenceId || null,
    expectedSettlementDate: opts.expectedSettlementDate || null,
    settled: opts.settled !== false,
    description: opts.description || null,
    createdBy: opts.userId || null,
  });
  return next;
}

// Direciona um pagamento recebido para a conta mapeada da forma de pagamento.
// Cartão de crédito (conta CARD_RECEIVABLE): aplica taxa e prazo, entra como "a receber".
// `sourceCurrency` é a moeda em que `amount` já está (moeda da venda/pedido) — obrigatório informar
// quando não for BRL, senão o valor lançado na conta sai errado (ver convertCurrency acima).
export async function routePayment(tx: any, method: string, amount: number, ctx: { saleId?: string; saleLabel?: string; userId?: string; accountId?: string | null; sourceCurrency?: string }) {
  // Conta escolhida no recebimento tem prioridade; senão usa o mapa da forma de pagamento.
  const explicit = !!ctx.accountId; // conta veio do cliente (precisa validar tipo)
  let accountId = ctx.accountId || null;
  if (!accountId) {
    const map = await tx.select().from(paymentMethodAccounts).where(eq(paymentMethodAccounts.method, method)).limit(1);
    accountId = map[0]?.accountId || null;
  }
  if (!accountId) return null; // sem conta — não movimenta (aparece como pendente de config)
  const accRows = await tx.select().from(financialAccounts).where(eq(financialAccounts.id, accountId)).limit(1);
  if (!accRows.length) return null;
  const account = accRows[0];

  // Nunca confiar no accountId do cliente: se veio explícito, o tipo tem que bater com a forma
  // (ex.: dinheiro só em conta CASH; crédito só em "cartão a receber"). Fallback do mapa não valida
  // (é config do dono). Evita rotear dinheiro pra banco ou crédito sem taxa.
  const allowedTypes = METHOD_ACCOUNT_TYPES[method];
  if (explicit && allowedTypes && !allowedTypes.includes(String(account.type))) {
    throw new Error(`Conta "${account.name}" (${account.type}) é incompatível com a forma ${method}.`);
  }

  // Conta em moeda diferente da moeda de origem do pagamento: converte pela cotação do dia —
  // o saldo da conta é sempre na moeda dela.
  const accCurrency = String(account.currency || "BRL");
  const sourceCurrency = String(ctx.sourceCurrency || "BRL");
  const conv = await convertCurrency(amount, sourceCurrency, accCurrency);
  const fxNote = accCurrency !== sourceCurrency ? ` - ${sourceCurrency} ${amount.toFixed(2)} -> ${accCurrency} (cambio do dia)` : "";

  if (account.type === "CARD_RECEIVABLE") {
    const fee = round2(conv.amount * (Number(account.feePercent) / 100));
    const net = round2(conv.amount - fee);
    const settlementDate = new Date();
    settlementDate.setDate(settlementDate.getDate() + Number(account.settlementDays || 0));
    await postMovement(tx, accountId, "SALE_PAYMENT", net, {
      referenceType: "sale", referenceId: ctx.saleId, userId: ctx.userId,
      description: `${ctx.saleLabel || "Venda"} · cartão (taxa ${Number(account.feePercent).toFixed(2)}% = ${fee.toFixed(2)})${fxNote}`,
      settled: false, expectedSettlementDate: settlementDate,
    });
    return { accountId, net, fee, settled: false };
  }

  await postMovement(tx, accountId, "SALE_PAYMENT", conv.amount, {
    referenceType: "sale", referenceId: ctx.saleId, userId: ctx.userId,
    description: (ctx.saleLabel || "Venda") + fxNote, settled: true,
  });
  return { accountId, net: conv.amount, fee: 0, settled: true };
}

// Estorna os movimentos de venda de uma conta (usado em devolução e na exclusão Master de
// pedido travado). `note`, quando passado, entra entre parênteses na descrição — sem isso, todo
// estorno aparece igual no extrato ("Estorno de venda"), sem dar pra distinguir uma devolução
// normal de uma correção manual feita por outro caminho.
export async function reverseSaleMovements(tx: any, saleId: string, userId?: string, note?: string) {
  const movs = await tx.select({
    id: accountMovements.id,
    accountId: accountMovements.accountId,
    amountUsd: accountMovements.amountUsd,
    settled: accountMovements.settled,
    accType: financialAccounts.type,
  })
    .from(accountMovements)
    .innerJoin(financialAccounts, eq(accountMovements.accountId, financialAccounts.id))
    .where(and(eq(accountMovements.referenceType, "sale"), eq(accountMovements.referenceId, saleId), eq(accountMovements.type, "SALE_PAYMENT")));
  for (const m of movs) {
    const amt = Number(m.amountUsd);
    if (amt === 0) continue;
    // Cartão já liquidado (settled=true numa conta "a receber"): o dinheiro já saiu desta conta pro banco
    // via liquidação, que não referencia a venda. Estornar aqui deixaria a conta do cartão negativa e o
    // banco superestimado. Bloqueia e orienta o estorno manual — melhor recusar que corromper saldo.
    if (m.accType === "CARD_RECEIVABLE" && m.settled === true) {
      throw new Error("Esta venda tem cartão já liquidado (dinheiro movido para o banco). Estorne o valor manualmente na conta do banco antes de registrar a devolução.");
    }
    // Espelha o settled do movimento original: cartão ainda não liquidado (settled=false) gera REFUND
    // também settled=false, então o par se cancela na soma de pendentes da liquidação (evita dinheiro fantasma).
    await postMovement(tx, m.accountId, "REFUND", -amt, {
      referenceType: "sale", referenceId: saleId, userId,
      description: note ? `Estorno de venda (${note})` : "Estorno de venda",
      settled: m.settled,
    });
  }
}

// -------- Endpoints --------

// Lista de contas com saldo.
router.get("/accounts", requirePermission("cash", "view"), async (_req: AuthRequest, res) => {
  try {
    const rows = await db.select().from(financialAccounts).where(eq(financialAccounts.isActive, true)).orderBy(financialAccounts.sortOrder, financialAccounts.name);
    // Total em BRL: converte contas USD/PYG pela cotação do dia (manual > API). Conta sem cotação
    // disponível entra como null em balanceBrl e fica fora do total (com aviso no front).
    const { resolveRates } = await import("./fx");
    const rates = await resolveRates().catch(() => ({} as any));
    const conv = (amount: number, currency: string): number | null => {
      if (!currency || currency === "BRL") return amount;
      if (currency === "USD") return rates.USDBRL ? amount * rates.USDBRL.rate : null;
      if (currency === "PYG") return rates.BRLPYG ? amount / rates.BRLPYG.rate : null;
      if (currency === "USDT") return rates.USDTBRL ? amount * rates.USDTBRL.rate : null;
      return null;
    };
    const data = rows.map((a) => ({ ...a, balanceBrl: conv(Number(a.currentBalance), String(a.currency || "BRL")) }));
    const total = data.reduce((s, a) => s + (a.balanceBrl ?? 0), 0);
    const unconverted = data.filter((a) => a.balanceBrl === null).length;
    res.json({ data, totalBalance: round2(total), totalIsBrl: true, unconvertedCount: unconverted });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/accounts", requirePermission("cash", "manage_accounts"), async (req: AuthRequest, res) => {
  try {
    const { name, type, feePercent, settlementDays, openingBalance, currency, scope } = req.body || {};
    if (!name || !String(name).trim()) return res.status(400).json({ error: "Nome é obrigatório." });
    const t = ["CASH", "BANK", "CARD_RECEIVABLE", "OTHER"].includes(String(type)) ? String(type) : "BANK";
    const cur = isValidCurrency(currency) ? currency : "BRL";
    const sc = ["BUSINESS", "PERSONAL"].includes(String(scope)) ? String(scope) : "BUSINESS";
    const opening = round2(Number(openingBalance) || 0);
    const [row] = await db.insert(financialAccounts).values({
      name: String(name).trim(),
      type: t,
      currency: cur,
      scope: sc,
      feePercent: (Number(feePercent) || 0).toFixed(2),
      settlementDays: Math.max(0, parseInt(String(settlementDays || 0), 10) || 0),
      openingBalance: opening.toFixed(2),
      currentBalance: opening.toFixed(2),
    }).returning();
    if (opening !== 0) {
      await db.insert(accountMovements).values({ accountId: row.id, type: "OPENING", amountUsd: opening.toFixed(2), balanceAfter: opening.toFixed(2), description: "Saldo inicial", createdBy: req.user!.userId });
    }
    await logAction(req.user!.userId, "CREATE", "financial_accounts", row.id, null, { name, type: t });
    res.status(201).json(row);
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

router.put("/accounts/:id", requirePermission("cash", "manage_accounts"), async (req: AuthRequest, res) => {
  try {
    const { name, type, feePercent, settlementDays, isActive, currency, scope } = req.body || {};
    const [existing] = await db.select().from(financialAccounts).where(eq(financialAccounts.id, req.params.id)).limit(1);
    if (!existing) return res.status(404).json({ error: "Conta não encontrada." });

    // Trocar moeda ou escopo (Empresa/Pessoal) de uma conta que já tem saldo/histórico não move
    // nem converte nada — o saldo guardado passa a ser lido como se já estivesse na moeda/livro
    // novo, criando um saldo fantasma (troca BRL→USD "multiplica" o total reportado pela cotação)
    // ou movendo dinheiro real de um livro pro outro sem nenhum registro de transferência. Exige
    // saldo zerado primeiro (use Transferir pra esvaziar a conta antes de reclassificar).
    const hasBalance = Math.abs(Number(existing.currentBalance)) > 0.005;
    if (currency !== undefined && String(currency) !== existing.currency && hasBalance) {
      return res.status(400).json({ error: `Esta conta tem saldo (${existing.currency} ${Number(existing.currentBalance).toFixed(2)}) — zere com uma Transferência antes de trocar a moeda.` });
    }
    if (scope !== undefined && String(scope) !== existing.scope && hasBalance) {
      return res.status(400).json({ error: `Esta conta tem saldo (${existing.currency} ${Number(existing.currentBalance).toFixed(2)}) — zere com uma Transferência antes de mudar entre Empresa/Pessoal.` });
    }

    const updates: any = { updatedAt: new Date() };
    if (name !== undefined) updates.name = String(name).trim();
    if (type !== undefined && ["CASH", "BANK", "CARD_RECEIVABLE", "OTHER"].includes(String(type))) updates.type = String(type);
    if (currency !== undefined && isValidCurrency(currency)) updates.currency = currency;
    if (scope !== undefined && ["BUSINESS", "PERSONAL"].includes(String(scope))) updates.scope = String(scope);
    if (feePercent !== undefined) updates.feePercent = (Number(feePercent) || 0).toFixed(2);
    if (settlementDays !== undefined) updates.settlementDays = Math.max(0, parseInt(String(settlementDays), 10) || 0);
    if (isActive !== undefined) updates.isActive = !!isActive;
    await db.update(financialAccounts).set(updates).where(eq(financialAccounts.id, req.params.id));
    await logAction(req.user!.userId, "UPDATE", "financial_accounts", req.params.id, null, updates);
    res.json({ success: true });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

// Movimentos de uma conta.
router.get("/accounts/:id/movements", requirePermission("cash", "view"), async (req: AuthRequest, res) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit || "100"), 10) || 100, 500);
    const rows = await db.select({
      id: accountMovements.id, type: accountMovements.type, amountUsd: accountMovements.amountUsd,
      balanceAfter: accountMovements.balanceAfter, description: accountMovements.description,
      settled: accountMovements.settled, expectedSettlementDate: accountMovements.expectedSettlementDate,
      createdAt: accountMovements.createdAt, userName: users.name,
    })
    .from(accountMovements).leftJoin(users, eq(accountMovements.createdBy, users.id))
    .where(eq(accountMovements.accountId, req.params.id))
    .orderBy(desc(accountMovements.createdAt)).limit(limit);
    res.json({ data: rows });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Ajuste manual: lança um movimento avulso (positivo ou negativo) direto numa conta — ferramenta
// de correção pra diferença que nenhum fluxo automático cobre (taxa de banco não registrada,
// erro antigo, dinheiro que ficou preso numa venda cancelada de antes da trava de concorrência
// existir). Só Master, com senha — mexe no saldo sem vir de nenhum pagamento/venda real, então
// é mais estrito que qualquer outro fluxo administrativo do sistema.
router.post("/accounts/:id/adjust", requirePermission("cash", "manage_accounts"), async (req: AuthRequest, res) => {
  try {
    const { amount, description, masterPassword, referenceId } = req.body || {};
    if (!masterPassword) return res.status(400).json({ error: "Senha do Master é obrigatória." });
    const master = await findMasterByPassword(String(masterPassword));
    if (!master) return res.status(403).json({ error: "Senha inválida — só o perfil Master pode lançar um ajuste manual." });

    const amt = round2(Number(amount));
    if (!Number.isFinite(amt) || amt === 0) return res.status(400).json({ error: "Valor deve ser diferente de zero (positivo entra, negativo sai)." });
    if (!description || !String(description).trim()) return res.status(400).json({ error: "Descreva o motivo do ajuste." });

    const newBalance = await db.transaction(async (tx) =>
      postMovement(tx, req.params.id, "ADJUSTMENT", amt, {
        referenceType: "manual_adjustment",
        referenceId: referenceId ? String(referenceId).trim().slice(0, 100) : null,
        userId: master.id,
        description: `Ajuste manual: ${String(description).trim()}`,
      })
    );

    await logAction(master.id, "MANUAL_ADJUSTMENT", "financial_accounts", req.params.id, null, {
      amount: amt, description: String(description).trim(), referenceId: referenceId || null, executedBy: req.user!.userId,
    });
    const [acc] = await db.select({ name: financialAccounts.name }).from(financialAccounts).where(eq(financialAccounts.id, req.params.id)).limit(1);
    await createNotification(db, {
      type: "MASTER_ACTION", title: "Ajuste manual lançado",
      message: `${master.name} lançou ${amt > 0 ? "+" : ""}${amt.toFixed(2).replace(".", ",")} na conta ${acc?.name || ""}: ${String(description).trim()}`,
      link: "/finance",
    });
    res.json({ success: true, newBalance });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

// Transferência entre contas.
router.post("/transfer", requirePermission("cash", "manage_accounts"), async (req: AuthRequest, res) => {
  try {
    const { fromAccountId, toAccountId, amount, toAmount, description } = req.body || {};
    const amt = round2(Number(amount));
    if (!fromAccountId || !toAccountId || fromAccountId === toAccountId) return res.status(400).json({ error: "Contas de origem e destino inválidas." });
    if (!Number.isFinite(amt) || amt <= 0) return res.status(400).json({ error: "Valor inválido." });
    await db.transaction(async (tx) => {
      const from = await tx.select().from(financialAccounts).where(eq(financialAccounts.id, fromAccountId)).limit(1);
      if (!from.length) throw new Error("Conta de origem não encontrada.");
      const to = await tx.select().from(financialAccounts).where(eq(financialAccounts.id, toAccountId)).limit(1);
      if (!to.length) throw new Error("Conta de destino não encontrada.");
      const fromCur = String(from[0].currency || "BRL");
      const toCur = String(to[0].currency || "BRL");

      // Mesma moeda: sai X, entra X. Moedas diferentes: câmbio embutido — sai `amount` na moeda
      // de origem e entra `toAmount` na moeda de destino (o que o câmbio/banco realmente entregou);
      // a taxa implícita fica gravada nas descrições dos dois lados.
      let inAmt = amt;
      let descOut = description || "Transferência";
      let descIn = description || "Transferência";
      if (fromCur !== toCur) {
        inAmt = round2(Number(toAmount));
        if (!Number.isFinite(inAmt) || inAmt <= 0) throw new Error(`Informe quanto ENTRA em ${toCur} (valor que o câmbio entregou).`);
        const implicit = inAmt / amt;
        // ASCII nas strings gravadas: o Postgres local usa encoding WIN1252 (setas Unicode quebram o INSERT).
        const rateNote = `cambio efetivo ${fromCur}->${toCur}: ${implicit.toFixed(6)}`;
        descOut = `${description || "Transferência"} - saiu ${fromCur} ${amt.toFixed(2)} -> entrou ${toCur} ${inAmt.toFixed(2)} (${rateNote})`;
        descIn = descOut;
      }

      const ref = `${fromAccountId}->${toAccountId}`;
      await postMovement(tx, fromAccountId, "TRANSFER_OUT", -amt, { referenceType: "transfer", referenceId: ref, userId: req.user!.userId, description: descOut });
      await postMovement(tx, toAccountId, "TRANSFER_IN", inAmt, { referenceType: "transfer", referenceId: ref, userId: req.user!.userId, description: descIn });
    });
    res.json({ success: true });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

// Total pendente (a receber) de uma conta de cartão.
router.get("/accounts/:id/pending", requirePermission("cash", "view"), async (req: AuthRequest, res) => {
  try {
    const rows = await db.select({ amountUsd: accountMovements.amountUsd }).from(accountMovements)
      .where(and(eq(accountMovements.accountId, req.params.id), eq(accountMovements.settled, false)));
    const pending = round2(rows.reduce((s, r) => s + Number(r.amountUsd), 0));
    res.json({ pending });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Liquidar cartão: move o líquido pendente da conta "a receber" para uma conta banco.
router.post("/accounts/:id/settle", requirePermission("cash", "manage_accounts"), async (req: AuthRequest, res) => {
  try {
    const { toAccountId } = req.body || {};
    if (!toAccountId) return res.status(400).json({ error: "Escolha a conta de destino (banco)." });
    const result = await db.transaction(async (tx) => {
      const [toAcc] = await tx.select().from(financialAccounts).where(eq(financialAccounts.id, toAccountId)).limit(1);
      if (!toAcc) throw new Error("Conta de destino não encontrada.");
      // Maquininha recebe em R$ — liquidar direto numa conta USD/PYG corromperia o saldo.
      if (String(toAcc.currency || "BRL") !== "BRL") throw new Error(`A maquininha deposita em R$ — escolha uma conta em R$ (a "${toAcc.name}" é ${toAcc.currency}). Depois converta com Transferir.`);
      // FOR UPDATE: duas liquidações quase simultâneas (duplo clique em "Liquidar") liam o mesmo
      // lote de pendentes antes de qualquer commit e cada uma movia o valor inteiro — o banco
      // recebia o dobro do que a maquininha realmente depositou. Com a trava, a segunda chamada
      // espera a primeira, vê os movimentos já settled=true e cai no "nada a liquidar" abaixo.
      const pendingRows = await tx.select().from(accountMovements)
        .where(and(eq(accountMovements.accountId, req.params.id), eq(accountMovements.settled, false)))
        .for("update");
      const pending = round2(pendingRows.reduce((s: number, r: any) => s + Number(r.amountUsd), 0));
      if (pending <= 0) throw new Error("Nada a liquidar nesta conta.");
      for (const r of pendingRows) {
        await tx.update(accountMovements).set({ settled: true }).where(eq(accountMovements.id, r.id));
      }
      await postMovement(tx, req.params.id, "CARD_SETTLEMENT", -pending, { referenceType: "settlement", userId: req.user!.userId, description: "Liquidação da maquininha" });
      await postMovement(tx, toAccountId, "CARD_SETTLEMENT", pending, { referenceType: "settlement", userId: req.user!.userId, description: "Recebido da maquininha" });
      return pending;
    });
    await logAction(req.user!.userId, "SETTLE_CARD", "financial_accounts", req.params.id, null, { toAccountId, amount: result });
    res.json({ success: true, settled: result });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

// Mapa forma de pagamento -> conta.
router.get("/method-map", requirePermission("cash", "view"), async (_req: AuthRequest, res) => {
  try {
    const rows = await db.select().from(paymentMethodAccounts);
    const map: Record<string, string | null> = {};
    for (const r of rows) map[r.method] = r.accountId;
    res.json({ data: map });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.put("/method-map", requirePermission("cash", "manage_accounts"), async (req: AuthRequest, res) => {
  try {
    const map = req.body?.map || {};
    for (const method of ["CASH", "PIX", "CREDIT_CARD", "DEBIT_CARD", "TRANSFER", "USDT"]) {
      const accountId = map[method] || null;
      const existing = await db.select().from(paymentMethodAccounts).where(eq(paymentMethodAccounts.method, method)).limit(1);
      if (existing.length) await db.update(paymentMethodAccounts).set({ accountId }).where(eq(paymentMethodAccounts.method, method));
      else await db.insert(paymentMethodAccounts).values({ method, accountId });
    }
    await logAction(req.user!.userId, "UPDATE", "payment_method_accounts", "map", null, map);
    res.json({ success: true });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

export default router;
