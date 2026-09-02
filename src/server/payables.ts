import { Router } from "express";
import { db } from "../db";
import { payables, suppliers, financialAccounts, accountMovements } from "../db/schema";
import { and, desc, eq } from "drizzle-orm";
import { AuthRequest, requireAuth, requirePermission } from "./authMiddleware";
import { logAction } from "./audit";
import { postMovement, convertBrlToAccountCurrency } from "./finance";
import { MONEY_EPSILON } from "../lib/money";

const router = Router();
router.use(requireAuth);

// Cria um título a pagar a partir de uma compra aprovada. Idempotente por referenceId.
export async function createPayableForPurchase(
  tx: any,
  order: { id: string; supplierId?: string | null; totalAmount?: any; invoiceNumber?: string | null; paymentDueDate?: Date | null; payableNotes?: string | null },
  userId?: string,
) {
  const amount = Number(order.totalAmount || 0); // já em BRL (convertido pelo câmbio da compra)
  if (amount <= 0) return;
  const existing = await tx.select({ id: payables.id }).from(payables)
    .where(and(eq(payables.source, "PURCHASE"), eq(payables.referenceId, order.id))).limit(1);
  if (existing.length > 0) return;
  await tx.insert(payables).values({
    source: "PURCHASE",
    referenceId: order.id,
    supplierId: order.supplierId || null,
    description: `Compra ${order.invoiceNumber || order.id.slice(0, 8)}`,
    amountUsd: amount.toFixed(2),
    paidAmount: "0",
    dueDate: order.paymentDueDate || null,
    status: "PENDING",
    notes: order.payableNotes || null,
    createdBy: userId || null,
  });
}

// Lista de contas a pagar em aberto (com vencidas) + resumo.
router.get("/", requirePermission("cash", "view"), async (req: AuthRequest, res) => {
  try {
    const onlyOverdue = String(req.query.overdue || "") === "true";
    const includePaid = String(req.query.includePaid || "") === "true";

    const rows = await db.select({
      id: payables.id,
      source: payables.source,
      description: payables.description,
      supplierName: suppliers.name,
      amountUsd: payables.amountUsd,
      paidAmount: payables.paidAmount,
      dueDate: payables.dueDate,
      status: payables.status,
      paidAt: payables.paidAt,
      createdAt: payables.createdAt,
    })
    .from(payables)
    .leftJoin(suppliers, eq(payables.supplierId, suppliers.id))
    .orderBy(desc(payables.createdAt))
    .limit(500);

    const now = Date.now();
    let data = rows
      .filter((r) => includePaid || r.status !== "PAID")
      .map((r) => {
        const outstanding = Math.round(Math.max(0, Number(r.amountUsd) - Number(r.paidAmount)) * 100) / 100;
        const due = r.dueDate ? new Date(r.dueDate).getTime() : null;
        const daysToDue = due !== null ? Math.ceil((due - now) / (1000 * 60 * 60 * 24)) : null;
        const overdue = due !== null && due < now && r.status !== "PAID";
        return { ...r, outstanding, daysToDue, overdue };
      });

    if (onlyOverdue) data = data.filter((d) => d.overdue);

    const summary = data.reduce((acc, d) => {
      acc.totalOutstanding += d.outstanding;
      if (d.overdue) { acc.overdueCount += 1; acc.overdueAmount += d.outstanding; }
      return acc;
    }, { count: data.length, totalOutstanding: 0, overdueCount: 0, overdueAmount: 0 });
    summary.totalOutstanding = Math.round(summary.totalOutstanding * 100) / 100;
    summary.overdueAmount = Math.round(summary.overdueAmount * 100) / 100;

    res.json({ data, summary });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Lançamento manual de conta a pagar.
router.post("/", requirePermission("expenses", "manage"), async (req: AuthRequest, res) => {
  try {
    const { description, amountUsd, dueDate, supplierId, notes } = req.body || {};
    const amount = Number(amountUsd);
    if (!description || !String(description).trim()) return res.status(400).json({ error: "Descrição é obrigatória." });
    if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: "Valor deve ser maior que zero." });

    const [row] = await db.insert(payables).values({
      source: "MANUAL",
      supplierId: supplierId || null,
      description: String(description).trim(),
      amountUsd: amount.toFixed(2),
      paidAmount: "0",
      dueDate: dueDate ? new Date(String(dueDate)) : null,
      status: "PENDING",
      notes: notes ? String(notes).trim() : null,
      createdBy: req.user!.userId,
    }).returning();

    await logAction(req.user!.userId, "CREATE", "payables", row.id, null, { description, amountUsd: amount });
    res.status(201).json(row);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Registrar pagamento (total ou parcial) de um título.
router.post("/:id/pay", requirePermission("expenses", "manage"), async (req: AuthRequest, res) => {
  try {
    const { amount, accountId } = req.body || {};
    if (!accountId) return res.status(400).json({ error: "Escolha a conta de onde o dinheiro sai." });
    const result = await db.transaction(async (tx) => {
      // FOR UPDATE: sem isso, dois pagamentos quase simultâneos no mesmo título liam o mesmo
      // "paidAmount" antes de qualquer commit e cada um debitava a conta financeira por completo —
      // o título ficava marcado como pago uma vez só (lost update), mas o dinheiro saía em dobro.
      const rows = await tx.select().from(payables).where(eq(payables.id, req.params.id)).limit(1).for("update");
      if (rows.length === 0) throw new Error("Título não encontrado.");
      const p = rows[0];
      if (p.status === "PAID") throw new Error("Título já está pago.");

      // Conta de saída: precisa existir e ser dinheiro/banco (não "cartão a receber").
      const [acc] = await tx.select().from(financialAccounts).where(eq(financialAccounts.id, accountId)).limit(1);
      if (!acc) throw new Error("Conta financeira inválida.");
      if (acc.type === "CARD_RECEIVABLE") throw new Error("Conta de cartão a receber não pode pagar contas.");
      // Conta em moeda ≠ R$: debita o equivalente na moeda da conta (cotação do dia), com o câmbio anotado.

      const total = Number(p.amountUsd);
      const alreadyPaid = Number(p.paidAmount);
      const remaining = Math.max(0, total - alreadyPaid);
      // Sem valor informado = quita o restante.
      const payNum = amount !== undefined && amount !== null && amount !== "" ? Number(amount) : remaining;
      if (!Number.isFinite(payNum) || payNum <= 0) throw new Error("Valor de pagamento inválido.");
      const applied = Math.min(Math.round(payNum * 100) / 100, remaining);
      const newPaid = Math.round((alreadyPaid + applied) * 100) / 100;
      const status = newPaid >= total - MONEY_EPSILON ? "PAID" : "PARTIAL";

      await tx.update(payables).set({
        paidAmount: newPaid.toFixed(2),
        status,
        paidAt: status === "PAID" ? new Date() : p.paidAt,
        updatedAt: new Date(),
      }).where(eq(payables.id, p.id));

      // Debita de verdade a conta financeira (saída de dinheiro) na MOEDA DA CONTA.
      const conv = await convertBrlToAccountCurrency(applied, String(acc.currency || "BRL"));
      const fxNote = String(acc.currency || "BRL") !== "BRL" ? ` - R$ ${applied.toFixed(2)} -> ${acc.currency} ${conv.amount.toFixed(2)} (cambio do dia)` : "";
      await postMovement(tx, accountId, "EXPENSE", -conv.amount, {
        referenceType: "payable", referenceId: p.id, userId: req.user!.userId,
        description: `Pagamento: ${p.description}${fxNote}`,
      });
      return { status, paidAmount: newPaid.toFixed(2) };
    });

    await logAction(req.user!.userId, "PAY", "payables", req.params.id, null, result);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Excluir título (apenas manual). Se já tinha pagamento lançado, estorna antes de apagar —
// antes só checava a origem, nunca o status: excluir um título já PAGO apagava o registro sem
// reverter o postMovement que debitou a conta, deixando o lançamento órfão (mesma classe do
// achado da purga automática de vendas).
router.delete("/:id", requirePermission("expenses", "manage"), async (req: AuthRequest, res) => {
  try {
    await db.transaction(async (tx) => {
      const rows = await tx.select().from(payables).where(eq(payables.id, req.params.id)).limit(1).for("update");
      if (rows.length === 0) throw new Error("Título não encontrado.");
      const p = rows[0];
      if (p.source !== "MANUAL") throw new Error("Somente títulos manuais podem ser excluídos.");

      if (Number(p.paidAmount) > 0) {
        const movs = await tx.select().from(accountMovements)
          .where(and(eq(accountMovements.referenceType, "payable"), eq(accountMovements.referenceId, p.id)));
        for (const m of movs) {
          const amt = Number(m.amountUsd);
          if (amt === 0) continue;
          await postMovement(tx, m.accountId, "ADJUSTMENT", -amt, {
            referenceType: "payable", referenceId: p.id, userId: req.user!.userId,
            description: `Estorno: título "${p.description}" excluído`,
          });
        }
      }

      await tx.delete(payables).where(eq(payables.id, p.id));
      await logAction(req.user!.userId, "DELETE", "payables", p.id, p, null);
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
