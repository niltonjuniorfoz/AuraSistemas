import { Router } from "express";
import { db } from "../db";
import { sales, customers, payments } from "../db/schema";
import { and, desc, eq, inArray, notInArray, sql } from "drizzle-orm";
import { AuthRequest, requireAuth, requirePermission } from "./authMiddleware";

const router = Router();
router.use(requireAuth);

// Saldo devedor de um cliente: soma de (total - pago) das vendas em aberto
// (PENDING/PARTIAL) que não foram canceladas/devolvidas. Usado no limite de crédito.
// Aceita ignoreSaleId para recalcular durante edição de uma venda existente.
export async function getCustomerOutstanding(tx: any, customerId: string, ignoreSaleId?: string) {
  if (!customerId) return 0;
  const conditions = [
    eq(sales.customerId, customerId),
    inArray(sales.paymentStatus, ["PENDING", "PARTIAL"]),
    notInArray(sales.orderStatus, ["CANCELED", "CANCELLED", "RETURNED"]),
  ];
  if (ignoreSaleId) conditions.push(sql`${sales.id} <> ${ignoreSaleId}`);

  const openSales = await tx.select({ id: sales.id, totalAmount: sales.totalAmount })
    .from(sales)
    .where(and(...conditions));
  if (openSales.length === 0) return 0;

  const saleIds = openSales.map((s: any) => s.id);
  const paidRows = await tx.select({
    saleId: payments.saleId,
    paid: sql<number>`sum(cast(${payments.amountUsd} as numeric))`,
  })
  .from(payments)
  .where(and(inArray(payments.saleId, saleIds), eq(payments.status, "COMPLETED")))
  .groupBy(payments.saleId);

  const paidBySale = new Map<string, number>();
  for (const r of paidRows) paidBySale.set(r.saleId, Number(r.paid) || 0);

  let outstanding = 0;
  for (const s of openSales) {
    const total = Number(s.totalAmount) || 0;
    const paid = paidBySale.get(s.id) || 0;
    outstanding += Math.max(0, total - paid);
  }
  return Math.round(outstanding * 100) / 100;
}

// Lista de contas a receber: vendas em aberto com saldo devedor, vencimento e situação.
router.get("/", requirePermission("cash", "view"), async (req: AuthRequest, res) => {
  try {
    const onlyOverdue = String(req.query.overdue || "") === "true";
    const customerId = req.query.customerId ? String(req.query.customerId) : null;

    const conditions = [
      inArray(sales.paymentStatus, ["PENDING", "PARTIAL"]),
      notInArray(sales.orderStatus, ["CANCELED", "CANCELLED", "RETURNED"]),
    ];
    if (customerId) conditions.push(eq(sales.customerId, customerId));

    const rows = await db.select({
      id: sales.id,
      series: sales.series,
      number: sales.number,
      customerId: sales.customerId,
      customerName: customers.name,
      customerPhone: customers.phone,
      totalAmount: sales.totalAmount,
      paymentStatus: sales.paymentStatus,
      fulfillmentStatus: sales.fulfillmentStatus,
      dueDate: sales.dueDate,
      createdAt: sales.createdAt,
      creditLimit: customers.creditLimit,
    })
    .from(sales)
    .leftJoin(customers, eq(sales.customerId, customers.id))
    .where(and(...conditions))
    .orderBy(desc(sales.createdAt))
    .limit(500);

    const saleIds = rows.map((r) => r.id);
    const paidBySale = new Map<string, number>();
    if (saleIds.length > 0) {
      const paidRows = await db.select({
        saleId: payments.saleId,
        paid: sql<number>`sum(cast(${payments.amountUsd} as numeric))`,
      })
      .from(payments)
      .where(and(inArray(payments.saleId, saleIds), eq(payments.status, "COMPLETED")))
      .groupBy(payments.saleId);
      for (const r of paidRows) paidBySale.set(r.saleId, Number(r.paid) || 0);
    }

    const now = Date.now();
    let data = rows.map((r) => {
      const total = Number(r.totalAmount) || 0;
      const paid = paidBySale.get(r.id) || 0;
      const outstanding = Math.round(Math.max(0, total - paid) * 100) / 100;
      const due = r.dueDate ? new Date(r.dueDate).getTime() : null;
      const daysToDue = due !== null ? Math.ceil((due - now) / (1000 * 60 * 60 * 24)) : null;
      const overdue = due !== null && due < now;
      return { ...r, paidAmount: paid, outstanding, daysToDue, overdue };
    });

    // creditLimit === 0 é o default da coluna e significa "sem limite
    // configurado" (mesma regra que getCustomerOutstanding/POS já usam) —
    // nunca marca customerOverLimit nesse caso.
    const outstandingByCustomer = new Map<string, number>();
    for (const d of data) {
      if (!d.customerId) continue;
      outstandingByCustomer.set(d.customerId, (outstandingByCustomer.get(d.customerId) || 0) + d.outstanding);
    }
    data = data.map((d) => {
      const limit = Number(d.creditLimit) || 0;
      const customerTotal = d.customerId ? (outstandingByCustomer.get(d.customerId) || 0) : 0;
      return { ...d, customerOverLimit: limit > 0 && customerTotal > limit };
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

// Saldo devedor e limite de um cliente (para exibir no PDV ao selecionar o cliente).
router.get("/customer/:customerId", requirePermission("cash", "view"), async (req: AuthRequest, res) => {
  try {
    const cust = await db.select({ id: customers.id, name: customers.name, creditLimit: customers.creditLimit })
      .from(customers).where(eq(customers.id, req.params.customerId)).limit(1);
    if (cust.length === 0) return res.status(404).json({ error: "Cliente não encontrado." });
    const outstanding = await getCustomerOutstanding(db, req.params.customerId);
    const creditLimit = Number(cust[0].creditLimit) || 0;
    res.json({
      customerId: cust[0].id,
      name: cust[0].name,
      creditLimit,
      outstanding,
      available: creditLimit > 0 ? Math.round((creditLimit - outstanding) * 100) / 100 : null,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
