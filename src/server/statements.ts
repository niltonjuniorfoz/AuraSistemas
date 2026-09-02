import { Router } from "express";
import { db } from "../db";
import {
  sales, saleItems, products, payments, expenses, expenseCategories, personalExpenses,
  financialAccounts, costLayers, costConsumptions, payables, stockBalances, saleReturns, auditLogs,
} from "../db/schema";
import { and, eq, gte, inArray, lte, notInArray, sql } from "drizzle-orm";
import { AuthRequest, requireAuth, requirePermission } from "./authMiddleware";
import { toBrl } from "./fx";
import { dayStartUtc, dayEndUtc } from "../lib/dateRange";

const router = Router();
router.use(requireAuth);
// Demonstrativos são visão de dono: mesma permissão dos relatórios financeiros.
router.use(requirePermission("reports", "financial"));

const r2 = (n: number) => Math.round(n * 100) / 100;
const num = (v: any) => Number(v || 0);
const NOT_CANCELED = sql`"sales"."order_status" NOT IN ('CANCELED','CANCELLED','RETURNED')`;
// Categorias com estes nomes viram "Despesas Financeiras" (abaixo da linha operacional).
const FINANCIAL_CAT = /banc|financ|juro|tarifa|emprest|cart[aã]o de cr[eé]dito/i;

/* ================================================================
   Núcleo da DRE completa de um período (rodado também para o período
   anterior, para a coluna comparativa linha a linha).
   ================================================================ */
// Converte um valor pra R$ dado um mapa de cotações já resolvido (evita refazer a consulta de
// câmbio a cada venda/pagamento do período — ver uso em computeDre e no handler /dre).
function toBrlSync(rates: Record<string, { rate: number }>, amount: number, currency: string): number {
  const cur = String(currency || "BRL");
  if (cur === "BRL" || !amount) return amount;
  if (cur === "USD") { const r = rates.USDBRL?.rate; return r ? amount * r : amount; }
  if (cur === "PYG") { const r = rates.BRLPYG?.rate; return r ? amount / r : amount; }
  return amount;
}

async function computeDre(fromDate: Date, toDate: Date, rates: Record<string, { rate: number }>) {
  // Achado real: sales.totalAmount/subtotalAmount/etc seguem a moeda da própria venda
  // (sales.currency — USD por padrão da empresa, salvo configurado BRL), mas a DRE somava tudo
  // cru como se já fosse R$. Loja configurada em USD/DUAL declarava receita ~5x menor que a real.

  // ---- 1) Receita bruta por canal (série 001 = balcão/PDV, LOJ = loja online) ----
  const salesList = await db.select({
    id: sales.id, series: sales.series, customerId: sales.customerId, currency: sales.currency,
    subtotalAmount: sales.subtotalAmount, discountAmount: sales.discountAmount,
    ivaAmount: sales.ivaAmount, totalAmount: sales.totalAmount,
  }).from(sales).where(and(gte(sales.createdAt, fromDate), lte(sales.createdAt, toDate), NOT_CANCELED));

  let grossPos = 0, grossStore = 0, discounts = 0, freight = 0, netRevenue = 0;
  const customers = new Set<string>();
  for (const s of salesList) {
    const cur = String(s.currency || "BRL");
    const gross = toBrlSync(rates, num(s.subtotalAmount), cur);
    if (String(s.series) === "LOJ") grossStore += gross; else grossPos += gross;
    discounts += toBrlSync(rates, num(s.discountAmount), cur);
    freight += toBrlSync(rates, num(s.ivaAmount), cur);
    netRevenue += toBrlSync(rates, num(s.totalAmount), cur);
    if (s.customerId) customers.add(s.customerId);
  }
  const grossRevenue = grossPos + grossStore;

  // ---- 2) Deduções: descontos + devoluções registradas no período ----
  // Só deduz devolução de venda de período ANTERIOR (dinheiro devolvido agora, de receita já
  // reconhecida antes). Venda feita E devolvida dentro do mesmo período não entra aqui: ela já
  // não conta na receita bruta acima (NOT_CANCELED exclui RETURNED), então deduzir de novo fazia
  // a DRE mostrar a transação inteira como prejuízo em vez de neutra.
  // totalAmountUsd de saleReturns é uma cópia de sales.totalAmount no momento da devolução —
  // mesma moeda da venda, mesmo cuidado de conversão do bloco 1 acima (não dá pra somar em SQL cru).
  const returnRows = await db.select({ amount: saleReturns.totalAmountUsd, currency: sales.currency })
    .from(saleReturns)
    .innerJoin(sales, eq(saleReturns.saleId, sales.id))
    .where(and(gte(saleReturns.createdAt, fromDate), lte(saleReturns.createdAt, toDate), sql`${sales.createdAt} < ${fromDate}`));
  const returns = returnRows.reduce((s, r) => s + toBrlSync(rates, num(r.amount), String(r.currency || "BRL")), 0);
  const returnsCount = returnRows.length;

  const netOperating = grossRevenue + freight - discounts - returns;

  // ---- 3) Outras receitas: recebimentos avulsos (auditoria MISC_RECEIPT) ----
  const miscLogs = await db.select({ newValues: auditLogs.newValues })
    .from(auditLogs)
    .where(and(eq(auditLogs.action, "MISC_RECEIPT"), gte(auditLogs.createdAt, fromDate), lte(auditLogs.createdAt, toDate)));
  const otherItems = new Map<string, number>();
  let otherRevenue = 0;
  for (const l of miscLogs) {
    try {
      const v = JSON.parse(String(l.newValues || "{}"));
      const amt = num(v.amount);
      if (amt > 0) {
        otherRevenue += amt;
        const k = String(v.description || "Recebimento avulso").slice(0, 60);
        otherItems.set(k, r2((otherItems.get(k) || 0) + amt));
      }
    } catch { /* log malformado */ }
  }
  const totalRevenue = netOperating + otherRevenue;

  // ---- 4) CMV (custo gravado na venda; sem ele, estimado pelo custo atual) ----
  let cogs = 0, hasEstimatedCost = false;
  const saleIds = salesList.map((s) => s.id);
  if (saleIds.length) {
    const items = await db.select({
      totalCostAtSale: saleItems.totalCostAtSale, quantity: saleItems.quantity, unitCost: products.costPrice,
    }).from(saleItems).leftJoin(products, eq(saleItems.productId, products.id))
      .where(inArray(saleItems.saleId, saleIds));
    for (const i of items) {
      if (i.totalCostAtSale != null) cogs += num(i.totalCostAtSale);
      else { hasEstimatedCost = true; cogs += num(i.unitCost) * num(i.quantity); }
    }
  }
  const grossProfit = totalRevenue - cogs;

  // ---- 5) Despesas: variáveis do período + fixas ativas rateadas, agrupadas
  //         categoria → subcategoria (descrição), separando as FINANCEIRAS ----
  const [variableExp, fixedExp, cats] = await Promise.all([
    db.select({ amountUsd: expenses.amountUsd, categoryId: expenses.categoryId, description: expenses.description })
      .from(expenses)
      .where(and(gte(expenses.expenseDate, fromDate), lte(expenses.expenseDate, toDate), eq(expenses.isFixed, false))),
    db.select({ amountUsd: expenses.amountUsd, categoryId: expenses.categoryId, description: expenses.description })
      .from(expenses).where(and(eq(expenses.isFixed, true), eq(expenses.isActive, true))),
    db.select().from(expenseCategories),
  ]);
  const monthsCount = Math.max(1, (toDate.getFullYear() - fromDate.getFullYear()) * 12 + (toDate.getMonth() - fromDate.getMonth()) + 1);
  const catName = new Map(cats.map((c) => [c.id, c.name]));

  type Group = { name: string; total: number; financial: boolean; items: Map<string, { total: number; fixed: boolean }> };
  const groups = new Map<string, Group>();
  const push = (categoryId: any, description: any, amount: number, fixed: boolean) => {
    const gName = (categoryId && catName.get(categoryId)) || "Outros";
    const g = groups.get(gName) || { name: gName, total: 0, financial: FINANCIAL_CAT.test(gName), items: new Map() };
    g.total = r2(g.total + amount);
    const sub = String(description || "Diversos").trim().slice(0, 60) || "Diversos";
    const it = g.items.get(sub) || { total: 0, fixed };
    it.total = r2(it.total + amount);
    it.fixed = it.fixed || fixed;
    g.items.set(sub, it);
    groups.set(gName, g);
  };
  for (const e of variableExp) push(e.categoryId, e.description, num(e.amountUsd), false);
  for (const e of fixedExp) push(e.categoryId, e.description, num(e.amountUsd) * monthsCount, true);

  const expenseGroups = [...groups.values()]
    .map((g) => ({
      name: g.name, total: r2(g.total), financial: g.financial,
      items: [...g.items.entries()].map(([name, v]) => ({ name, total: v.total, fixed: v.fixed })).sort((a, b) => b.total - a.total),
    }))
    .sort((a, b) => b.total - a.total);

  const opex = r2(expenseGroups.filter((g) => !g.financial).reduce((s, g) => s + g.total, 0));
  const financialExpenses = r2(expenseGroups.filter((g) => g.financial).reduce((s, g) => s + g.total, 0));

  // ---- 6) Degraus finais ----
  const ebit = grossProfit - opex;            // resultado operacional (antes das financeiras)
  const netIncome = ebit - financialExpenses; // resultado líquido do período

  return {
    salesCount: salesList.length,
    uniqueCustomers: customers.size,
    revenue: {
      grossPos: r2(grossPos), grossStore: r2(grossStore), gross: r2(grossRevenue),
      freight: r2(freight), discounts: r2(discounts), returns: r2(returns), returnsCount,
      netOperating: r2(netOperating),
      other: r2(otherRevenue),
      otherItems: [...otherItems.entries()].map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total),
      total: r2(totalRevenue),
    },
    cogs: r2(cogs), hasEstimatedCost,
    grossProfit: r2(grossProfit),
    grossMarginPercent: totalRevenue > 0 ? r2((grossProfit / totalRevenue) * 100) : 0,
    expenseGroups,
    opex, financialExpenses,
    ebit: r2(ebit),
    ebitMarginPercent: totalRevenue > 0 ? r2((ebit / totalRevenue) * 100) : 0,
    netIncome: r2(netIncome),
    netMarginPercent: totalRevenue > 0 ? r2((netIncome / totalRevenue) * 100) : 0,
    avgTicket: salesList.length > 0 ? r2(netRevenue / salesList.length) : 0,
    profitPerSale: salesList.length > 0 ? r2(netIncome / salesList.length) : 0,
    monthsCount,
  };
}

/* ---------- DRE completa ---------- */
router.get("/dre", async (req: AuthRequest, res) => {
  try {
    const fromDate = req.query.dateFrom ? dayStartUtc(String(req.query.dateFrom)) : new Date(new Date().setDate(1));
    const toDate = req.query.dateTo ? dayEndUtc(String(req.query.dateTo)) : new Date();
    const spanMs = toDate.getTime() - fromDate.getTime();
    const prevTo = new Date(fromDate.getTime() - 1);
    const prevFrom = new Date(fromDate.getTime() - 1 - spanMs);

    const { resolveRates } = await import("./fx");
    const rates = await resolveRates().catch(() => ({} as any));
    const [cur, prev] = await Promise.all([computeDre(fromDate, toDate, rates), computeDre(prevFrom, prevTo, rates)]);

    // Regime de caixa (informativo): o que efetivamente ENTROU no período. payments.amountUsd
    // segue a moeda da venda (sales.currency), não é sempre R$ — precisa converter por linha.
    const cashInRows = await db.select({ amount: payments.amountUsd, currency: sales.currency })
      .from(payments)
      .innerJoin(sales, eq(payments.saleId, sales.id))
      .where(and(gte(payments.createdAt, fromDate), lte(payments.createdAt, toDate), eq(payments.status, "COMPLETED")));
    const cashInTotal = cashInRows.reduce((s, r) => s + toBrlSync(rates, num(r.amount), String(r.currency || "BRL")), 0);

    // CMV real FIFO (câmbio da época) — comparativo do CMV padrão.
    const [realCogsRow] = await db.select({ cost: sql<number>`coalesce(sum(${costConsumptions.qty} * cast(${costConsumptions.unitCostBrl} as numeric)),0)` })
      .from(costConsumptions)
      .where(and(gte(costConsumptions.createdAt, fromDate), lte(costConsumptions.createdAt, toDate), eq(costConsumptions.reason, "SALE")));

    // Retiradas/gastos pessoais no período (fora da DRE, mostrado após o resultado).
    const [personalRow] = await db.select({ total: sql<number>`coalesce(sum(cast(${personalExpenses.amountBrl} as numeric)),0)` })
      .from(personalExpenses)
      .where(and(gte(personalExpenses.expenseDate, fromDate), lte(personalExpenses.expenseDate, toDate)));
    const personalWithdrawals = r2(num(personalRow?.total));

    // Ranking: top despesas por subcategoria (todas as pernas abertas).
    const topExpenses = cur.expenseGroups
      .flatMap((g) => g.items.map((i) => ({ group: g.name, name: i.name, total: i.total })))
      .sort((a, b) => b.total - a.total).slice(0, 10);

    res.json({
      period: { dateFrom: fromDate.toISOString().slice(0, 10), dateTo: toDate.toISOString().slice(0, 10) },
      previousPeriod: { dateFrom: prevFrom.toISOString().slice(0, 10), dateTo: prevTo.toISOString().slice(0, 10) },
      dre: cur,
      previous: prev,
      cashReceived: r2(cashInTotal),
      realCogs: r2(num(realCogsRow?.cost)),
      personalWithdrawals,
      resultAfterWithdrawals: r2(cur.netIncome - personalWithdrawals),
      topExpenses,
      expenseToRevenuePercent: cur.revenue.total > 0 ? r2(((cur.opex + cur.financialExpenses) / cur.revenue.total) * 100) : 0,
    });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

/* ---------- Balanço gerencial / Patrimônio Líquido ---------- */
router.get("/balance", async (_req: AuthRequest, res) => {
  try {
    const now = new Date();

    // 1) Caixa e bancos da EMPRESA (pessoais ficam fora do PL do negócio).
    const accounts = await db.select().from(financialAccounts)
      .where(and(eq(financialAccounts.isActive, true), eq(financialAccounts.scope, "BUSINESS")));
    const cashAccounts: any[] = [];
    const cardAccounts: any[] = [];
    let cashBrl = 0, cardBrl = 0, unconverted = 0;
    for (const a of accounts) {
      let brl: number | null = null;
      try { brl = r2(await toBrl(num(a.currentBalance), String(a.currency || "BRL"))); } catch { unconverted += 1; }
      const row = { name: a.name, currency: a.currency || "BRL", balance: num(a.currentBalance), balanceBrl: brl };
      if (a.type === "CARD_RECEIVABLE") { cardAccounts.push(row); if (brl != null) cardBrl += brl; }
      else { cashAccounts.push(row); if (brl != null) cashBrl += brl; }
    }

    // 2) A receber de clientes, com vencidas destacadas (aging). sales.totalAmount e
    // payments.amountUsd seguem a moeda da própria venda (sales.currency) — precisa converter
    // por venda antes de somar, senão um recebível em US$ entra no Balanço como se fosse R$.
    const { resolveRates } = await import("./fx");
    const balanceRates = await resolveRates().catch(() => ({} as any));
    const openSales = await db.select({ id: sales.id, total: sales.totalAmount, dueDate: sales.dueDate, currency: sales.currency })
      .from(sales).where(and(inArray(sales.paymentStatus, ["PENDING", "PARTIAL"]), NOT_CANCELED));
    const paidBySale = new Map<string, number>();
    if (openSales.length) {
      const paidRows = await db.select({ saleId: payments.saleId, paid: sql<number>`sum(cast(${payments.amountUsd} as numeric))` })
        .from(payments)
        .where(and(inArray(payments.saleId, openSales.map((s) => s.id)), eq(payments.status, "COMPLETED")))
        .groupBy(payments.saleId);
      for (const p of paidRows) if (p.saleId) paidBySale.set(p.saleId, num(p.paid));
    }
    let receivables = 0, receivablesOverdue = 0;
    for (const s of openSales) {
      const cur = String(s.currency || "BRL");
      const totalBrl = toBrlSync(balanceRates, num(s.total), cur);
      const paidBrl = toBrlSync(balanceRates, paidBySale.get(s.id) || 0, cur);
      const open = Math.max(0, totalBrl - paidBrl);
      receivables += open;
      if (s.dueDate && new Date(s.dueDate) < now) receivablesOverdue += open;
    }
    receivables = r2(receivables); receivablesOverdue = r2(receivablesOverdue);

    // 3) Estoque a custo: camadas (câmbio congelado) por moeda de origem + itens sem camada (estimado).
    const layerRows = await db.select({
      currency: costLayers.sourceCurrency,
      total: sql<number>`coalesce(sum(${costLayers.qtyRemaining} * cast(${costLayers.unitCostBrl} as numeric)),0)`,
      qty: sql<number>`coalesce(sum(${costLayers.qtyRemaining}),0)`,
    }).from(costLayers).groupBy(costLayers.sourceCurrency);
    const inventoryByCurrency = layerRows
      .map((l) => ({ currency: l.currency || "BRL", totalBrl: r2(num(l.total)), qty: Number(l.qty) }))
      .filter((l) => l.totalBrl > 0 || l.qty > 0)
      .sort((a, b) => b.totalBrl - a.totalBrl);
    const inventoryLayers = r2(inventoryByCurrency.reduce((s, l) => s + l.totalBrl, 0));
    const noLayer = await db.select({ qty: stockBalances.physicalStock, cost: products.costPrice })
      .from(stockBalances).innerJoin(products, eq(stockBalances.productId, products.id))
      .where(and(
        sql`${stockBalances.physicalStock} > 0`,
        sql`NOT EXISTS (SELECT 1 FROM cost_layers cl WHERE cl.product_id = ${stockBalances.productId} AND cl.qty_remaining > 0)`,
      ));
    const inventoryEstimated = r2(noLayer.reduce((s, p) => s + num(p.qty) * num(p.cost), 0));
    const inventory = r2(inventoryLayers + inventoryEstimated);

    // 4) Passivo: contas a pagar em aberto, com vencidas destacadas.
    const openPayables = await db.select({ amountUsd: payables.amountUsd, paidAmount: payables.paidAmount, dueDate: payables.dueDate })
      .from(payables).where(notInArray(payables.status, ["PAID"]));
    let payablesOpen = 0, payablesOverdue = 0;
    for (const p of openPayables) {
      const open = Math.max(0, num(p.amountUsd) - num(p.paidAmount));
      payablesOpen += open;
      if (p.dueDate && new Date(p.dueDate) < now) payablesOverdue += open;
    }
    payablesOpen = r2(payablesOpen); payablesOverdue = r2(payablesOverdue);

    const totalAssets = r2(cashBrl + cardBrl + receivables + inventory);
    const totalLiabilities = payablesOpen;
    const equity = r2(totalAssets - totalLiabilities);

    // Índices gerenciais.
    const currentRatio = totalLiabilities > 0 ? r2(totalAssets / totalLiabilities) : null; // liquidez corrente
    const debtToAssets = totalAssets > 0 ? r2((totalLiabilities / totalAssets) * 100) : 0; // endividamento %
    const composition = totalAssets > 0 ? {
      cashPercent: r2((cashBrl / totalAssets) * 100),
      cardPercent: r2((cardBrl / totalAssets) * 100),
      receivablesPercent: r2((receivables / totalAssets) * 100),
      inventoryPercent: r2((inventory / totalAssets) * 100),
    } : null;

    // Informativo: patrimônio pessoal (fora do PL da empresa).
    const personalAccounts = await db.select().from(financialAccounts)
      .where(and(eq(financialAccounts.isActive, true), eq(financialAccounts.scope, "PERSONAL")));
    let personalBrl = 0;
    for (const a of personalAccounts) {
      try { personalBrl += await toBrl(num(a.currentBalance), String(a.currency || "BRL")); } catch { /* sem câmbio */ }
    }

    res.json({
      asOf: now.toISOString(),
      assets: {
        cash: { total: r2(cashBrl), accounts: cashAccounts },
        cardReceivable: { total: r2(cardBrl), accounts: cardAccounts },
        customerReceivables: receivables,
        customerReceivablesOverdue: receivablesOverdue,
        inventory: { total: inventory, fromLayers: inventoryLayers, estimated: inventoryEstimated, byCurrency: inventoryByCurrency },
        total: totalAssets,
      },
      liabilities: { payables: payablesOpen, payablesOverdue, total: totalLiabilities },
      equity,
      ratios: { currentRatio, debtToAssets, composition },
      unconvertedAccounts: unconverted,
      personalNetWorthBrl: r2(personalBrl),
    });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
