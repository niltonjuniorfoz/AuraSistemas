import { Router } from "express";
import { db } from "../db";
import { products, customers, sales, saleItems, expenses, auditLogs, users, roles, payments, purchaseOrders, suppliers, personalExpenses, personalCategories, costConsumptions, financialAccounts, storePageviews, storeOrders } from "../db/schema";
import { requireAuth, AuthRequest } from "./authMiddleware";
import { and, gte, lte, eq, desc, sql, inArray, isNotNull } from "drizzle-orm";
import { dayStartUtc, dayEndUtc } from "../lib/dateRange";

export const router = Router();

const toNumber = (value: any) => Number(value || 0);

function isMasterRole(roleName?: string | null) {
  const normalized = String(roleName || "").trim().toLowerCase();
  return ["master", "super admin", "super_admin", "superadmin"].includes(normalized);
}

const hideMasterLogsCondition = sql`lower(coalesce(${roles.name}, '')) not in ('master', 'super admin', 'super_admin', 'superadmin')`;

function getRecentAuditLogsForUser(roleName?: string | null) {
  // SEM oldValues/newValues aqui: o dashboard é visto por qualquer autenticado (até caixa sem
  // privilégio nenhum), e esses campos crus podem conter dado sensível (ex.: hash de senha de
  // uma edição de usuário). O frontend do dashboard nem consome esses campos — quem precisa do
  // diff completo usa /api/audit, que já é restrito a quem gerencia usuários.
  let query = db.select({
    id: auditLogs.id,
    action: auditLogs.action,
    tableName: auditLogs.tableName,
    createdAt: auditLogs.createdAt,
    userId: auditLogs.userId,
    userName: users.name,
    recordId: auditLogs.recordId,
  })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.userId, users.id))
    .leftJoin(roles, eq(users.roleId, roles.id))
    .$dynamic();

  if (!isMasterRole(roleName)) {
    query = query.where(hideMasterLogsCondition);
  }

  return query.orderBy(desc(auditLogs.createdAt)).limit(10);
}

router.get("/overview", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { dateFrom, dateTo } = req.query;

    const fromDate = dateFrom ? dayStartUtc(String(dateFrom)) : new Date(new Date().setDate(1));
    const toDate = dateTo ? dayEndUtc(String(dateTo)) : new Date();

    // Período anterior de mesmo tamanho, imediatamente antes do período atual.
    const spanMs = toDate.getTime() - fromDate.getTime();
    const prevTo = new Date(fromDate.getTime() - 1);
    const prevFrom = new Date(fromDate.getTime() - 1 - spanMs);

    const [activeProductsCount, activeCustomersCount, salesList, variableExpensesList, fixedExpensesList, recentAuditLogs, prevSalesRows, paymentMixRows, prevCustomersRows, pageviewRows, prevPageviewsRows] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(products).where(eq(products.isActive, true)),
      db.select({ count: sql<number>`count(*)` }).from(customers).where(eq(customers.isActive, true)),
      db.select({
        id: sales.id,
        subtotalAmount: sales.subtotalAmount,
        totalAmount: sales.totalAmount,
        paymentStatus: sales.paymentStatus,
        createdAt: sales.createdAt,
        customerId: sales.customerId,
      })
        .from(sales)
        .where(and(
          gte(sales.createdAt, fromDate),
          lte(sales.createdAt, toDate),
          sql`"sales"."order_status" NOT IN ('CANCELED', 'CANCELLED', 'RETURNED')`,
          eq(sales.paymentStatus, "PAID"),
        )),
      db.select().from(expenses).where(and(
        gte(expenses.expenseDate, fromDate),
        lte(expenses.expenseDate, toDate),
        eq(expenses.isFixed, false),
      )),
      db.select().from(expenses).where(and(eq(expenses.isFixed, true), eq(expenses.isActive, true))),
      getRecentAuditLogsForUser(req.user?.roleName),
      // Faturamento e nº de vendas do período anterior (para comparativo).
      db.select({ total: sql<number>`coalesce(sum(cast(${sales.totalAmount} as numeric)), 0)`, count: sql<number>`count(*)` })
        .from(sales)
        .where(and(
          gte(sales.createdAt, prevFrom),
          lte(sales.createdAt, prevTo),
          sql`"sales"."order_status" NOT IN ('CANCELED', 'CANCELLED', 'RETURNED')`,
          eq(sales.paymentStatus, "PAID"),
        )),
      // Formas de pagamento recebidas no período.
      db.select({ method: payments.paymentMethod, total: sql<number>`sum(cast(${payments.amountUsd} as numeric))` })
        .from(payments)
        .where(and(gte(payments.createdAt, fromDate), lte(payments.createdAt, toDate), eq(payments.status, "COMPLETED")))
        .groupBy(payments.paymentMethod),
      // Clientes distintos que compraram no período ANTERIOR (comparativo de "clientes ativos").
      db.select({ count: sql<number>`count(distinct ${sales.customerId})` })
        .from(sales)
        .where(and(
          gte(sales.createdAt, prevFrom), lte(sales.createdAt, prevTo),
          sql`"sales"."order_status" NOT IN ('CANCELED', 'CANCELLED', 'RETURNED')`,
          eq(sales.paymentStatus, "PAID"), isNotNull(sales.customerId),
        )),
      // Visualizações de página da loja no período atual (só a data, pra agrupar por dia depois).
      db.select({ createdAt: storePageviews.createdAt })
        .from(storePageviews)
        .where(and(gte(storePageviews.createdAt, fromDate), lte(storePageviews.createdAt, toDate))),
      // Total de visualizações no período ANTERIOR (só a contagem, pro comparativo).
      db.select({ count: sql<number>`count(*)` })
        .from(storePageviews)
        .where(and(gte(storePageviews.createdAt, prevFrom), lte(storePageviews.createdAt, prevTo))),
    ]);

    // ---- Rankings, feed de atividade e módulos novos (multimoeda / pessoal / margem real) ----
    const salesPeriodFilter = and(
      gte(sales.createdAt, fromDate),
      lte(sales.createdAt, toDate),
      sql`"sales"."order_status" NOT IN ('CANCELED', 'CANCELLED', 'RETURNED')`,
    );

    const [topSellersRows, topCustomersRows, recentSales, recentPayments, recentPurchases, recentPersonal, realMarginRows, personalAccountsRows, recentOrdersRows] = await Promise.all([
      // Top vendedores: quem faturou mais no período (vendas não canceladas).
      db.select({
        userId: sales.userId, userName: users.name, commissionPercent: users.commissionPercent,
        total: sql<number>`coalesce(sum(cast(${sales.totalAmount} as numeric)), 0)`,
        count: sql<number>`count(*)`,
      }).from(sales).leftJoin(users, eq(sales.userId, users.id))
        .where(and(salesPeriodFilter, isNotNull(sales.userId)))
        .groupBy(sales.userId, users.name, users.commissionPercent)
        .orderBy(desc(sql`sum(cast(${sales.totalAmount} as numeric))`)).limit(6),
      // Top compradores: melhores clientes do período.
      db.select({
        customerId: sales.customerId, customerName: customers.name,
        total: sql<number>`coalesce(sum(cast(${sales.totalAmount} as numeric)), 0)`,
        count: sql<number>`count(*)`,
        lastAt: sql<string>`max(${sales.createdAt})`,
      }).from(sales).leftJoin(customers, eq(sales.customerId, customers.id))
        .where(and(salesPeriodFilter, isNotNull(sales.customerId)))
        .groupBy(sales.customerId, customers.name)
        .orderBy(desc(sql`sum(cast(${sales.totalAmount} as numeric))`)).limit(6),
      // Feed: vendas recentes
      db.select({
        id: sales.id, series: sales.series, number: sales.number, total: sales.totalAmount,
        status: sales.paymentStatus, createdAt: sales.createdAt,
        customerName: customers.name, userName: users.name,
      }).from(sales).leftJoin(customers, eq(sales.customerId, customers.id)).leftJoin(users, eq(sales.userId, users.id))
        .where(salesPeriodFilter).orderBy(desc(sales.createdAt)).limit(12),
      // Feed: recebimentos
      db.select({
        id: payments.id, saleId: payments.saleId, method: payments.paymentMethod,
        amount: payments.amountUsd, createdAt: payments.createdAt, userName: users.name,
      }).from(payments).leftJoin(users, eq(payments.receivedBy, users.id))
        .where(and(gte(payments.createdAt, fromDate), lte(payments.createdAt, toDate), eq(payments.status, "COMPLETED")))
        .orderBy(desc(payments.createdAt)).limit(12),
      // Feed: entradas de mercadoria aprovadas (com moeda da compra)
      db.select({
        id: purchaseOrders.id, invoice: purchaseOrders.invoiceNumber, total: purchaseOrders.totalAmount,
        currency: purchaseOrders.currency, fxRate: purchaseOrders.fxRateToBrl,
        createdAt: purchaseOrders.approvedAt, supplierName: suppliers.name,
      }).from(purchaseOrders).leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
        .where(and(eq(purchaseOrders.status, "APPROVED"), gte(purchaseOrders.approvedAt, fromDate), lte(purchaseOrders.approvedAt, toDate)))
        .orderBy(desc(purchaseOrders.approvedAt)).limit(8),
      // Feed: gastos pessoais
      db.select({
        id: personalExpenses.id, amount: personalExpenses.amount, currency: personalExpenses.currency,
        amountBrl: personalExpenses.amountBrl, description: personalExpenses.description,
        createdAt: personalExpenses.expenseDate, categoryName: personalCategories.name,
      }).from(personalExpenses).leftJoin(personalCategories, eq(personalExpenses.categoryId, personalCategories.id))
        .where(and(gte(personalExpenses.expenseDate, fromDate), lte(personalExpenses.expenseDate, toDate)))
        .orderBy(desc(personalExpenses.expenseDate)).limit(8),
      // Margem REAL do período (custo FIFO da época da compra) — só vendas já entregues.
      db.select({
        saleId: costConsumptions.saleId,
        cost: sql<number>`sum(${costConsumptions.qty} * cast(${costConsumptions.unitCostBrl} as numeric))`,
      }).from(costConsumptions)
        .where(and(gte(costConsumptions.createdAt, fromDate), lte(costConsumptions.createdAt, toDate), eq(costConsumptions.reason, "SALE")))
        .groupBy(costConsumptions.saleId),
      // Contas pessoais (saldo em moeda nativa) — para o card do módulo Pessoal.
      db.select({ id: financialAccounts.id, name: financialAccounts.name, currency: financialAccounts.currency, balance: financialAccounts.currentBalance })
        .from(financialAccounts).where(and(eq(financialAccounts.scope, "PERSONAL"), eq(financialAccounts.isActive, true))),
      // Pedidos da loja mais recentes (card "Pedidos recentes") — fulfillmentStatus vem da venda
      // ligada pra saber o estágio real (separando/entregue), não só o status do pedido em si.
      db.select({
        id: storeOrders.id, code: storeOrders.code, customerName: storeOrders.customerName,
        customerPhone: storeOrders.customerPhone, totalAmount: storeOrders.totalAmount,
        status: storeOrders.status, createdAt: storeOrders.createdAt, saleId: storeOrders.saleId,
        fulfillmentStatus: sales.fulfillmentStatus,
      }).from(storeOrders).leftJoin(sales, eq(storeOrders.saleId, sales.id))
        .where(and(gte(storeOrders.createdAt, fromDate), lte(storeOrders.createdAt, toDate)))
        .orderBy(desc(storeOrders.createdAt)).limit(8),
    ]);

    let grossSales = 0;
    let netSales = 0;
    let productCost = 0;
    let profitAmount = 0;
    let paidAmount = 0;
    let pendingAmount = 0;
    let hasEstimatedCost = false;

    const saleIds = salesList.map((s) => s.id);
    const saleTotals = new Map<string, { cost: number; profit: number }>();

    if (saleIds.length) {
      const items = await db
        .select({
          saleId: saleItems.saleId,
          totalCostAtSale: saleItems.totalCostAtSale,
          profitAmount: saleItems.profitAmount,
          totalPrice: saleItems.totalPrice,
          unitCost: products.costPrice,
          quantity: saleItems.quantity,
        })
        .from(saleItems)
        .leftJoin(products, eq(saleItems.productId, products.id))
        .where(inArray(saleItems.saleId, saleIds));

      for (const i of items) {
        const current = saleTotals.get(i.saleId) || { cost: 0, profit: 0 };
        let cost = 0;
        if (i.totalCostAtSale != null) {
          cost = toNumber(i.totalCostAtSale);
        } else {
          hasEstimatedCost = true;
          cost = toNumber(i.unitCost) * toNumber(i.quantity);
        }
        current.cost += cost;
        current.profit += i.profitAmount != null ? toNumber(i.profitAmount) : toNumber(i.totalPrice) - cost;
        saleTotals.set(i.saleId, current);
      }
    }

    // Produto(s) de cada pedido recente — busca à parte porque um pedido pode ter vários itens
    // (junto na mesma query multiplicaria a linha do pedido por item, quebrando o limit de 8).
    const orderSaleIds = recentOrdersRows.map((o) => o.saleId).filter((id): id is string => !!id);
    const orderItemRows = orderSaleIds.length
      ? await db.select({ saleId: saleItems.saleId, productName: products.name })
          .from(saleItems).leftJoin(products, eq(saleItems.productId, products.id))
          .where(inArray(saleItems.saleId, orderSaleIds))
      : [];
    const itemsByOrderSale = new Map<string, string[]>();
    for (const it of orderItemRows) {
      if (!it.saleId) continue;
      const arr = itemsByOrderSale.get(it.saleId) || [];
      if (it.productName) arr.push(it.productName);
      itemsByOrderSale.set(it.saleId, arr);
    }
    const recentOrders = recentOrdersRows.map((o) => {
      const items = o.saleId ? (itemsByOrderSale.get(o.saleId) || []) : [];
      return {
        id: o.id, code: o.code, customerName: o.customerName, customerPhone: o.customerPhone,
        totalAmount: Math.round(toNumber(o.totalAmount) * 100) / 100,
        status: o.status, fulfillmentStatus: o.fulfillmentStatus, createdAt: o.createdAt,
        productLabel: items.length === 0 ? "—" : items.length === 1 ? items[0] : `${items[0]} +${items.length - 1} item(ns)`,
      };
    });

    for (const s of salesList) {
      grossSales += toNumber(s.subtotalAmount);
      netSales += toNumber(s.totalAmount);
      if (s.paymentStatus === "PAID") paidAmount += toNumber(s.totalAmount);
      else if (s.paymentStatus === "PENDING") pendingAmount += toNumber(s.totalAmount);
      const totals = saleTotals.get(s.id) || { cost: 0, profit: 0 };
      productCost += totals.cost;
      profitAmount += totals.profit;
    }

    let totalExpenses = variableExpensesList.reduce((sum, e) => sum + toNumber(e.amountUsd), 0);
    let totalFixedExpenses = 0;

    const startYear = fromDate.getFullYear();
    const startMonth = fromDate.getMonth();
    const endYear = toDate.getFullYear();
    const endMonth = toDate.getMonth();
    const monthsCount = (endYear - startYear) * 12 + (endMonth - startMonth) + 1;

    if (monthsCount > 0) {
      for (const fe of fixedExpensesList) {
        totalFixedExpenses += toNumber(fe.amountUsd) * monthsCount;
      }
      totalExpenses += totalFixedExpenses;
    }

    const grossProfit = profitAmount;
    const netProfit = grossProfit - totalExpenses;
    const grossMarginPercent = netSales > 0 ? (grossProfit / netSales) * 100 : 0;
    const netMarginPercent = netSales > 0 ? (netProfit / netSales) * 100 : 0;

    // Série por dia (para os gráficos de tendência e os mini-sparklines dos KPIs). Preenche dias
    // sem movimento com zero — faturamento/nº de vendas/clientes distintos/visualizações da loja/
    // lucro. Despesa FIXA não tem "dia" (é um valor mensal, não um lançamento datado) — espalhada
    // em fatia igual por todos os dias do período; despesa VARIÁVEL entra no dia real dela.
    const byDay = new Map<string, { total: number; count: number; customers: Set<string>; profit: number }>();
    for (const s of salesList) {
      const key = s.createdAt ? new Date(s.createdAt).toISOString().split("T")[0] : "";
      if (!key) continue;
      const cur = byDay.get(key) || { total: 0, count: 0, customers: new Set<string>(), profit: 0 };
      cur.total += toNumber(s.totalAmount);
      cur.count += 1;
      if (s.customerId) cur.customers.add(s.customerId);
      cur.profit += saleTotals.get(s.id)?.profit || 0;
      byDay.set(key, cur);
    }
    const byDayViews = new Map<string, number>();
    for (const v of pageviewRows) {
      const key = v.createdAt ? new Date(v.createdAt).toISOString().split("T")[0] : "";
      if (!key) continue;
      byDayViews.set(key, (byDayViews.get(key) || 0) + 1);
    }
    const byDayVariableExpenses = new Map<string, number>();
    for (const e of variableExpensesList) {
      const key = e.expenseDate ? new Date(e.expenseDate).toISOString().split("T")[0] : "";
      if (!key) continue;
      byDayVariableExpenses.set(key, (byDayVariableExpenses.get(key) || 0) + toNumber(e.amountUsd));
    }
    const dailySales: Array<{ date: string; total: number; count: number; customers: number; views: number; profit: number; ticket: number }> = [];
    const dayCursor = new Date(fromDate);
    dayCursor.setHours(0, 0, 0, 0);
    const lastDay = new Date(toDate);
    lastDay.setHours(0, 0, 0, 0);
    const totalDays = Math.max(1, Math.round((lastDay.getTime() - dayCursor.getTime()) / 86400000) + 1);
    const fixedShare = totalFixedExpenses / totalDays;
    let guard = 0;
    while (dayCursor <= lastDay && guard < 120) {
      const key = dayCursor.toISOString().split("T")[0];
      const found = byDay.get(key) || { total: 0, count: 0, customers: new Set<string>(), profit: 0 };
      const dayNetProfit = found.profit - (byDayVariableExpenses.get(key) || 0) - fixedShare;
      dailySales.push({
        date: key, total: Math.round(found.total * 100) / 100, count: found.count,
        customers: found.customers.size, views: byDayViews.get(key) || 0,
        profit: Math.round(dayNetProfit * 100) / 100,
        ticket: found.count > 0 ? Math.round((found.total / found.count) * 100) / 100 : 0,
      });
      dayCursor.setDate(dayCursor.getDate() + 1);
      guard += 1;
    }

    const prevNetSales = toNumber(prevSalesRows[0]?.total);
    const prevSalesCount = Number(prevSalesRows[0]?.count || 0);
    const pct = (cur: number, prev: number) => prev > 0 ? ((cur - prev) / prev) * 100 : (cur > 0 ? 100 : 0);

    // "Clientes ativos" = clientes distintos que compraram no período (mais fiel a "ativo" do que
    // o total histórico de cadastros marcados como ativos) — dá pra comparar com o período anterior.
    const activeCustomersInPeriod = new Set(salesList.map((s) => s.customerId).filter(Boolean)).size;
    const prevActiveCustomers = Number(prevCustomersRows[0]?.count || 0);
    const pageviewsTotal = pageviewRows.length;
    const prevPageviewsTotal = Number(prevPageviewsRows[0]?.count || 0);

    const paymentMix = paymentMixRows
      .map((r) => ({ method: r.method, total: Math.round(toNumber(r.total) * 100) / 100 }))
      .filter((r) => r.total > 0)
      .sort((a, b) => b.total - a.total);

    // ---- Monta rankings, feed unificado e blocos dos módulos novos ----
    const r2 = (n: number) => Math.round(n * 100) / 100;

    const topSellers = topSellersRows.map((r) => ({
      userId: r.userId, name: r.userName || "—",
      total: r2(toNumber(r.total)), count: Number(r.count || 0),
      avgTicket: Number(r.count) > 0 ? r2(toNumber(r.total) / Number(r.count)) : 0,
      commission: r2(toNumber(r.total) * (toNumber(r.commissionPercent) / 100)),
    }));
    const topCustomers = topCustomersRows.map((r) => ({
      customerId: r.customerId, name: r.customerName || "—",
      total: r2(toNumber(r.total)), count: Number(r.count || 0),
      avgTicket: Number(r.count) > 0 ? r2(toNumber(r.total) / Number(r.count)) : 0,
      lastAt: r.lastAt,
    }));

    // Feed unificado de atividade: o que aconteceu, com valor e link — não só "UPDATE em sales".
    const activity: any[] = [];
    for (const s of recentSales) activity.push({
      kind: "SALE", at: s.createdAt, title: `Venda ${s.series}-${String(s.number).padStart(6, "0")}`,
      subtitle: s.customerName || "Consumidor final", who: s.userName, amount: r2(toNumber(s.total)),
      currency: "BRL", status: s.status, link: "/sales",
    });
    for (const p of recentPayments) activity.push({
      kind: "PAYMENT", at: p.createdAt, title: "Recebimento", subtitle: p.method,
      who: p.userName, amount: r2(toNumber(p.amount)), currency: "BRL", link: "/cash",
    });
    for (const p of recentPurchases) activity.push({
      kind: "PURCHASE", at: p.createdAt, title: `Entrada ${p.invoice || ""}`.trim(),
      subtitle: p.supplierName || "Fornecedor", amount: r2(toNumber(p.total)),
      currency: p.currency || "BRL", fxRate: p.fxRate ? Number(p.fxRate) : null, link: "/purchases",
    });
    for (const e of recentPersonal) activity.push({
      kind: "PERSONAL", at: e.createdAt, title: e.description || "Gasto pessoal",
      subtitle: e.categoryName || "sem categoria", amount: r2(toNumber(e.amount)),
      currency: e.currency, amountBrl: r2(toNumber(e.amountBrl)), link: "/personal",
    });
    activity.sort((a, b) => new Date(b.at || 0).getTime() - new Date(a.at || 0).getTime());
    const recentActivity = activity.slice(0, 14);

    // Margem real (custo FIFO da época) x margem nominal do período.
    const realCostBySale = new Map<string, number>();
    for (const r of realMarginRows) if (r.saleId) realCostBySale.set(r.saleId, toNumber(r.cost));
    let realSales = 0, realCost = 0, coveredCount = 0;
    for (const s of salesList) {
      const c = realCostBySale.get(s.id);
      if (c == null) continue; // ainda sem baixa de estoque (custo só existe quando a mercadoria sai)
      coveredCount += 1;
      realSales += toNumber(s.totalAmount);
      realCost += c;
    }
    const realMargin = {
      sales: r2(realSales), cost: r2(realCost), margin: r2(realSales - realCost),
      marginPercent: realSales > 0 ? r2(((realSales - realCost) / realSales) * 100) : 0,
      // % das vendas do período que já têm custo real apurado (o resto ainda não saiu do estoque).
      coverage: salesList.length > 0 ? r2((coveredCount / salesList.length) * 100) : 0,
      coveredCount, totalSales: salesList.length,
    };

    // Câmbio do dia + módulo pessoal (custo de vida e runway) — conectam Fases A e B ao Painel.
    let fxToday: Record<string, any> = {};
    let personal: any = null;
    try {
      const { resolveRates, toBrl } = await import("./fx");
      fxToday = await resolveRates();
      const conv = async (v: number, c: string) => { try { return await toBrl(v, c); } catch { return null; } };
      let personalTotalBrl = 0;
      const accounts = [];
      for (const a of personalAccountsRows) {
        const brl = await conv(toNumber(a.balance), String(a.currency || "BRL"));
        if (brl != null) personalTotalBrl += brl;
        accounts.push({ name: a.name, currency: a.currency, balance: toNumber(a.balance), balanceBrl: brl != null ? r2(brl) : null });
      }
      const d90 = new Date(); d90.setDate(d90.getDate() - 90);
      const last90 = await db.select({ amountBrl: personalExpenses.amountBrl }).from(personalExpenses).where(gte(personalExpenses.expenseDate, d90));
      const avgMonthlyBrl = r2(last90.reduce((s, e) => s + toNumber(e.amountBrl), 0) / 3);
      personal = {
        accounts, totalBrl: r2(personalTotalBrl), avgMonthlyBrl,
        runwayMonths: avgMonthlyBrl > 0 ? r2(personalTotalBrl / avgMonthlyBrl) : null,
        monthSpentBrl: r2(recentPersonal.reduce((s, e) => s + toNumber(e.amountBrl), 0)),
      };
    } catch { /* câmbio indisponível — Painel segue sem os blocos convertidos */ }

    res.json({
      topSellers,
      topCustomers,
      recentOrders,
      recentActivity,
      realMargin,
      fxToday,
      personal,
      dailySales,
      previous: {
        netSales: prevNetSales,
        salesCount: prevSalesCount,
        netSalesDeltaPercent: Math.round(pct(netSales, prevNetSales) * 10) / 10,
        salesCountDeltaPercent: Math.round(pct(salesList.length, prevSalesCount) * 10) / 10,
        activeCustomers: prevActiveCustomers,
        activeCustomersDeltaPercent: Math.round(pct(activeCustomersInPeriod, prevActiveCustomers) * 10) / 10,
        pageviews: prevPageviewsTotal,
        pageviewsDeltaPercent: Math.round(pct(pageviewsTotal, prevPageviewsTotal) * 10) / 10,
      },
      paymentMix,
      hasEstimatedCost,
      period: {
        dateFrom: fromDate.toISOString().split("T")[0],
        dateTo: toDate.toISOString().split("T")[0],
      },
      summary: {
        activeProducts: Number(activeProductsCount[0]?.count || 0),
        activeCustomers: Number(activeCustomersCount[0]?.count || 0),
        activeCustomersInPeriod,
        pageviews: pageviewsTotal,
        salesCount: salesList.length,
        grossSales,
        netSales,
        productCost,
        grossProfit,
        expenses: totalExpenses,
        netProfit,
        grossMarginPercent,
        netMarginPercent,
        paidAmount,
        pendingAmount,
        averageTicket: salesList.length > 0 ? netSales / salesList.length : 0,
      },
      recentAuditLogs,
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
