import { Router } from "express";
import { db } from "../db";
import { personalCategories, personalExpenses, profitDistributionRules, financialAccounts } from "../db/schema";
import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import { AuthRequest, requireAuth, requirePermission } from "./authMiddleware";
import { postMovement, convertBrlToAccountCurrency } from "./finance";
import { toBrl } from "./fx";
import { logAction } from "./audit";
import { dayEndUtc } from "../lib/dateRange";

const router = Router();
router.use(requireAuth);
// Módulo pessoal é do dono — mesma permissão de gestão financeira.
router.use(requirePermission("cash", "manage_accounts"));

const round2 = (n: number) => Math.round(n * 100) / 100;
const CURS = ["BRL", "USD", "PYG"];

// ---- Categorias ----
router.get("/categories", async (_req: AuthRequest, res) => {
  try {
    const rows = await db.select().from(personalCategories).where(eq(personalCategories.isActive, true)).orderBy(asc(personalCategories.sortOrder), asc(personalCategories.name));
    res.json({ data: rows });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/categories", async (req: AuthRequest, res) => {
  try {
    const { name, monthlyBudget, budgetCurrency } = req.body || {};
    if (!name || !String(name).trim()) return res.status(400).json({ error: "Nome é obrigatório." });
    const [row] = await db.insert(personalCategories).values({
      name: String(name).trim(),
      monthlyBudget: (Number(monthlyBudget) > 0 ? Number(monthlyBudget) : 0).toFixed(2),
      budgetCurrency: CURS.includes(String(budgetCurrency)) ? String(budgetCurrency) : "PYG",
    }).returning();
    res.status(201).json(row);
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

router.put("/categories/:id", async (req: AuthRequest, res) => {
  try {
    const { name, monthlyBudget, budgetCurrency, isActive } = req.body || {};
    const updates: any = {};
    if (name !== undefined) updates.name = String(name).trim();
    if (monthlyBudget !== undefined) updates.monthlyBudget = (Number(monthlyBudget) > 0 ? Number(monthlyBudget) : 0).toFixed(2);
    if (budgetCurrency !== undefined && CURS.includes(String(budgetCurrency))) updates.budgetCurrency = String(budgetCurrency);
    if (isActive !== undefined) updates.isActive = !!isActive;
    await db.update(personalCategories).set(updates).where(eq(personalCategories.id, req.params.id));
    res.json({ success: true });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

// ---- Gastos ----
router.get("/expenses", async (req: AuthRequest, res) => {
  try {
    const from = req.query.dateFrom ? new Date(String(req.query.dateFrom)) : new Date(new Date().toISOString().slice(0, 8) + "01");
    const to = req.query.dateTo ? dayEndUtc(String(req.query.dateTo)) : new Date();
    const rows = await db.select({
      id: personalExpenses.id, amount: personalExpenses.amount, currency: personalExpenses.currency,
      amountBrl: personalExpenses.amountBrl, description: personalExpenses.description,
      expenseDate: personalExpenses.expenseDate, categoryId: personalExpenses.categoryId,
      categoryName: personalCategories.name, accountId: personalExpenses.accountId, accountName: financialAccounts.name,
    })
      .from(personalExpenses)
      .leftJoin(personalCategories, eq(personalExpenses.categoryId, personalCategories.id))
      .leftJoin(financialAccounts, eq(personalExpenses.accountId, financialAccounts.id))
      .where(and(gte(personalExpenses.expenseDate, from), lte(personalExpenses.expenseDate, to)))
      .orderBy(desc(personalExpenses.expenseDate)).limit(500);
    res.json({ data: rows });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/expenses", async (req: AuthRequest, res) => {
  try {
    const { categoryId, accountId, amount, currency, description, expenseDate } = req.body || {};
    const amt = round2(Number(amount));
    if (!Number.isFinite(amt) || amt <= 0) return res.status(400).json({ error: "Valor deve ser maior que zero." });

    const result = await db.transaction(async (tx) => {
      let cur = CURS.includes(String(currency)) ? String(currency) : "PYG";
      if (accountId) {
        const [acc] = await tx.select().from(financialAccounts).where(eq(financialAccounts.id, accountId)).limit(1);
        if (!acc) throw new Error("Conta não encontrada.");
        cur = String(acc.currency || "BRL"); // gasto sai na moeda da conta
        await postMovement(tx, accountId, "EXPENSE", -amt, {
          referenceType: "personal_expense", userId: req.user!.userId,
          description: `Gasto pessoal: ${String(description || "sem descricao").slice(0, 120)}`,
        });
      }
      const amountBrl = round2(await toBrl(amt, cur)); // congelado na cotação do dia
      const [row] = await tx.insert(personalExpenses).values({
        categoryId: categoryId || null,
        accountId: accountId || null,
        amount: amt.toFixed(2),
        currency: cur,
        amountBrl: amountBrl.toFixed(2),
        description: description ? String(description).trim() : null,
        expenseDate: expenseDate ? new Date(String(expenseDate)) : new Date(),
        createdBy: req.user!.userId,
      }).returning();
      return row;
    });
    await logAction(req.user!.userId, "CREATE", "personal_expenses", result.id, null, { amount: amt });
    res.status(201).json(result);
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

router.delete("/expenses/:id", async (req: AuthRequest, res) => {
  try {
    await db.transaction(async (tx) => {
      // FOR UPDATE: sem travar, duas exclusões quase simultâneas (duplo clique) liam a mesma linha
      // antes de qualquer commit e cada uma credita o valor de volta — a conta é estornada em
      // dobro por um gasto que só existiu uma vez (a segunda exclusão vira um no-op silencioso).
      const [row] = await tx.select().from(personalExpenses).where(eq(personalExpenses.id, req.params.id)).limit(1).for("update");
      if (!row) throw new Error("Gasto não encontrado.");
      if (row.accountId) {
        await postMovement(tx, row.accountId, "ADJUSTMENT", Number(row.amount), {
          referenceType: "personal_expense", referenceId: row.id, userId: req.user!.userId,
          description: "Estorno de gasto pessoal excluido",
        });
      }
      await tx.delete(personalExpenses).where(eq(personalExpenses.id, row.id));
    });
    res.json({ success: true });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

// ---- Resumo do mês: orçamento × gasto por categoria + custo de vida + runway ----
router.get("/summary", async (req: AuthRequest, res) => {
  try {
    const month = String(req.query.month || new Date().toISOString().slice(0, 7)); // YYYY-MM
    const monthStart = new Date(month + "-01");
    const nextMonth = new Date(monthStart); nextMonth.setMonth(nextMonth.getMonth() + 1);

    const cats = await db.select().from(personalCategories).where(eq(personalCategories.isActive, true)).orderBy(asc(personalCategories.sortOrder));
    const monthExpenses = await db.select().from(personalExpenses)
      .where(and(gte(personalExpenses.expenseDate, monthStart), lte(personalExpenses.expenseDate, nextMonth)));

    const byCat = new Map<string, { spentBrl: number; spentNative: Record<string, number> }>();
    let monthTotalBrl = 0;
    for (const e of monthExpenses) {
      const key = e.categoryId || "none";
      const cur = byCat.get(key) || { spentBrl: 0, spentNative: {} };
      cur.spentBrl = round2(cur.spentBrl + Number(e.amountBrl));
      cur.spentNative[e.currency] = round2((cur.spentNative[e.currency] || 0) + Number(e.amount));
      byCat.set(key, cur);
      monthTotalBrl = round2(monthTotalBrl + Number(e.amountBrl));
    }

    // Orçamento convertido pra BRL pra comparar na mesma régua.
    const categories = [];
    for (const c of cats) {
      const spent = byCat.get(c.id) || { spentBrl: 0, spentNative: {} };
      let budgetBrl = 0;
      try { budgetBrl = round2(await toBrl(Number(c.monthlyBudget), String(c.budgetCurrency))); } catch { budgetBrl = 0; }
      categories.push({
        id: c.id, name: c.name, monthlyBudget: Number(c.monthlyBudget), budgetCurrency: c.budgetCurrency,
        budgetBrl, spentBrl: spent.spentBrl, spentNative: spent.spentNative,
        usedPercent: budgetBrl > 0 ? round2((spent.spentBrl / budgetBrl) * 100) : null,
      });
    }
    const uncategorized = byCat.get("none");

    // Custo de vida médio: últimos 3 meses fechados + mês atual proporcional não — média simples dos últimos 90 dias / 3.
    const d90 = new Date(); d90.setDate(d90.getDate() - 90);
    const last90 = await db.select().from(personalExpenses).where(gte(personalExpenses.expenseDate, d90));
    const avgMonthlyBrl = round2(last90.reduce((s, e) => s + Number(e.amountBrl), 0) / 3);

    // Contas pessoais + runway.
    const personalAccounts = await db.select().from(financialAccounts)
      .where(and(eq(financialAccounts.scope, "PERSONAL"), eq(financialAccounts.isActive, true)));
    let personalTotalBrl = 0;
    const accounts = [];
    for (const a of personalAccounts) {
      let brl: number | null = null;
      try { brl = round2(await toBrl(Number(a.currentBalance), String(a.currency || "BRL"))); personalTotalBrl = round2(personalTotalBrl + brl); } catch { brl = null; }
      accounts.push({ id: a.id, name: a.name, currency: a.currency, balance: Number(a.currentBalance), balanceBrl: brl });
    }
    const runwayMonths = avgMonthlyBrl > 0 ? round2(personalTotalBrl / avgMonthlyBrl) : null;

    res.json({
      month, categories,
      uncategorizedBrl: uncategorized?.spentBrl || 0,
      monthTotalBrl, avgMonthlyBrl,
      accounts, personalTotalBrl, runwayMonths,
    });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Tendência do custo de vida: total gasto (R$) por mês, últimos 6 meses.
router.get("/trend", async (_req: AuthRequest, res) => {
  try {
    const from = new Date(); from.setMonth(from.getMonth() - 5); from.setDate(1); from.setHours(0, 0, 0, 0);
    const rows = await db.select({ amountBrl: personalExpenses.amountBrl, expenseDate: personalExpenses.expenseDate })
      .from(personalExpenses).where(gte(personalExpenses.expenseDate, from));
    const byMonth = new Map<string, number>();
    // Garante os 6 meses no eixo mesmo sem gasto (zero).
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      byMonth.set(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, 0);
    }
    for (const r of rows) {
      const d = new Date(r.expenseDate as any);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (byMonth.has(k)) byMonth.set(k, round2((byMonth.get(k) || 0) + Number(r.amountBrl)));
    }
    res.json({ data: [...byMonth.entries()].map(([month, totalBrl]) => ({ month, totalBrl })) });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ---- Regras de distribuição de lucro ----
router.get("/rules", async (_req: AuthRequest, res) => {
  try {
    const rows = await db.select({
      id: profitDistributionRules.id, name: profitDistributionRules.name, percent: profitDistributionRules.percent,
      accountId: profitDistributionRules.accountId, isActive: profitDistributionRules.isActive,
      accountName: financialAccounts.name, accountCurrency: financialAccounts.currency,
    }).from(profitDistributionRules)
      .leftJoin(financialAccounts, eq(profitDistributionRules.accountId, financialAccounts.id))
      .orderBy(asc(profitDistributionRules.sortOrder));
    res.json({ data: rows });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.put("/rules", async (req: AuthRequest, res) => {
  try {
    const rules = Array.isArray(req.body?.rules) ? req.body.rules : [];
    const activeSum = rules.filter((r: any) => r.isActive !== false).reduce((s: number, r: any) => s + (Number(r.percent) || 0), 0);
    if (activeSum > 100.01) return res.status(400).json({ error: `Percentuais ativos somam ${activeSum.toFixed(1)}% — máximo 100%.` });
    await db.transaction(async (tx) => {
      await tx.delete(profitDistributionRules);
      for (const [i, r] of rules.entries()) {
        if (!r.name || !(Number(r.percent) > 0)) continue;
        await tx.insert(profitDistributionRules).values({
          name: String(r.name).trim(), percent: Number(r.percent).toFixed(2),
          accountId: r.accountId || null, sortOrder: i, isActive: r.isActive !== false,
        });
      }
    });
    await logAction(req.user!.userId, "UPDATE", "profit_distribution_rules", "rules", null, { count: rules.length });
    res.json({ success: true });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

// Distribui um valor (em R$) da conta de origem para as contas das regras ativas,
// convertendo pela cotação do dia quando as moedas diferem. Tudo gravado como transferência.
router.post("/distribute", async (req: AuthRequest, res) => {
  try {
    const { fromAccountId, baseAmountBrl } = req.body || {};
    const base = round2(Number(baseAmountBrl));
    if (!fromAccountId) return res.status(400).json({ error: "Escolha a conta de origem." });
    if (!Number.isFinite(base) || base <= 0) return res.status(400).json({ error: "Valor base inválido." });

    const result = await db.transaction(async (tx) => {
      const [from] = await tx.select().from(financialAccounts).where(eq(financialAccounts.id, fromAccountId)).limit(1);
      if (!from) throw new Error("Conta de origem não encontrada.");
      const rules = await tx.select().from(profitDistributionRules)
        .where(eq(profitDistributionRules.isActive, true)).orderBy(asc(profitDistributionRules.sortOrder));
      const applicable = rules.filter((r) => r.accountId && r.accountId !== fromAccountId);
      if (!applicable.length) throw new Error("Nenhuma regra ativa com conta de destino definida.");

      const executed = [];
      for (const rule of applicable) {
        const shareBrl = round2(base * (Number(rule.percent) / 100));
        if (shareBrl <= 0) continue;
        const [to] = await tx.select().from(financialAccounts).where(eq(financialAccounts.id, rule.accountId!)).limit(1);
        if (!to) continue;
        const outConv = await convertBrlToAccountCurrency(shareBrl, String(from.currency || "BRL"));
        const inConv = await convertBrlToAccountCurrency(shareBrl, String(to.currency || "BRL"));
        const desc = `Distribuicao de lucro: ${rule.name} ${Number(rule.percent).toFixed(0)}% (base R$ ${base.toFixed(2)})`;
        const ref = `dist:${fromAccountId}->${rule.accountId}`;
        await postMovement(tx, fromAccountId, "TRANSFER_OUT", -outConv.amount, { referenceType: "distribution", referenceId: ref, userId: req.user!.userId, description: desc });
        await postMovement(tx, rule.accountId!, "TRANSFER_IN", inConv.amount, { referenceType: "distribution", referenceId: ref, userId: req.user!.userId, description: desc });
        executed.push({ rule: rule.name, percent: Number(rule.percent), shareBrl, out: { amount: outConv.amount, currency: from.currency }, in: { amount: inConv.amount, currency: to.currency } });
      }
      return executed;
    });
    await logAction(req.user!.userId, "DISTRIBUTE_PROFIT", "financial_accounts", fromAccountId, null, { base, executed: result.length });
    res.json({ success: true, executed: result });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

export default router;
