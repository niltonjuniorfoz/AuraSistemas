import { Router } from "express";
import { db } from "../db";
import { sales, saleItems, saleItemLots, saleReturns, payments, productSerials, stockReservations, stockMovements, deliverySerials, deliveryItems, deliveryTasks, separationItems, separationTasks, deliveryPaymentOverrides, printLogs, emailLogs, auditLogs, maintenanceLogs, purchaseOcrJobs, accountMovements, storeOrders, costConsumptions } from "../db/schema";
import { requireAuth, requirePermission, AuthRequest } from "./authMiddleware";
import { eq, and, lt, or, isNull } from "drizzle-orm";
import fs from "fs";
import path from "path";

export const router = Router();

export async function purgeOldOcrJobs() {
  try {
    // Mesma folga de 1 dia usada em purgeOldCanceledSales logo abaixo — o processo roda no fuso
    // do servidor (normalmente UTC), diferente do fuso do negócio, e aqui o risco é maior: a purga
    // apaga o arquivo físico do disco, não só a linha do banco.
    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - 1);

    const oldJobs = await db.select().from(purchaseOcrJobs).where(lt(purchaseOcrJobs.createdAt, cutoff));

    if (oldJobs.length === 0) return 0;

    let totalDeleted = 0;

    for (const job of oldJobs) {
      if (job.filePath) {
        const localPath = path.join(process.cwd(), job.filePath.replace(/^\//, ""));
        if (fs.existsSync(localPath)) {
          try {
            fs.unlinkSync(localPath);
          } catch (e: any) {
            console.error(`Failed to delete physical file during purge: ${localPath}`, e);
          }
        }
      }
      await db.delete(purchaseOcrJobs).where(eq(purchaseOcrJobs.id, job.id));
      totalDeleted++;
    }

    if (totalDeleted > 0) {
      await db.insert(maintenanceLogs).values({
        action: "PURGE_OLD_OCR_JOBS",
        totalDeleted,
        details: `Purgou ${totalDeleted} trabalhos de OCR antigos.`,
      });
    }

    return totalDeleted;
  } catch (err) {
    console.error("Erro na purga de trabalhos de OCR antigos:", err);
    return 0;
  }
}

// Apaga de vez tudo que depende de uma venda morta (sale_items e tudo que referencia eles,
// tarefas de entrega/separação, pagamentos, reservas, auditoria da própria venda, a venda em si).
// Extraído do loop de purgeOldCanceledSales pra ser reaproveitado também pela exclusão manual
// (Master, sob demanda) de um pedido/venda específico — mesma sequência, dois gatilhos diferentes.
// NUNCA chamar isto sem antes garantir que não sobrou dinheiro rastreado nessa venda (ver os dois
// call sites: um pula a venda se houver account_movements, o outro estorna antes de chamar).
export async function deleteDeadSaleRecords(tx: any, saleId: string) {
  const items = await tx.select().from(saleItems).where(eq(saleItems.saleId, saleId));

  // Primeiro remove tudo que referencia sale_items.
  // Sem esta ordem, a purga quebra quando a venda cancelada já gerou tarefas de separação/entrega.
  for (const item of items) {
    await tx.delete(deliverySerials).where(eq(deliverySerials.saleItemId, item.id));
    await tx.delete(deliveryItems).where(eq(deliveryItems.saleItemId, item.id));
    await tx.delete(separationItems).where(eq(separationItems.saleItemId, item.id));
    await tx.update(productSerials).set({ saleItemId: null, status: "AVAILABLE", updatedAt: new Date() }).where(eq(productSerials.saleItemId, item.id));
  }

  await tx.delete(deliveryTasks).where(eq(deliveryTasks.saleId, saleId));
  await tx.delete(separationTasks).where(eq(separationTasks.saleId, saleId));
  await tx.delete(deliveryPaymentOverrides).where(eq(deliveryPaymentOverrides.saleId, saleId));
  await tx.delete(printLogs).where(eq(printLogs.saleId, saleId));
  await tx.delete(emailLogs).where(eq(emailLogs.saleId, saleId));
  await tx.delete(payments).where(eq(payments.saleId, saleId));
  await tx.delete(stockReservations).where(eq(stockReservations.saleId, saleId));
  await tx.delete(stockMovements).where(eq(stockMovements.referenceId, saleId));
  await tx.delete(saleItemLots).where(eq(saleItemLots.saleId, saleId));
  await tx.delete(saleReturns).where(eq(saleReturns.saleId, saleId));
  // Sem FK declarada, mas costConsumptions.saleId aponta pra cá — é a base do relatório de
  // Margem Real. Sem apagar aqui, a venda some mas o consumo de custo dela fica órfão pra sempre.
  await tx.delete(costConsumptions).where(eq(costConsumptions.saleId, saleId));
  await tx.delete(auditLogs).where(and(eq(auditLogs.tableName, "sales"), eq(auditLogs.recordId, saleId)));
  await tx.delete(saleItems).where(eq(saleItems.saleId, saleId));
  await tx.delete(sales).where(eq(sales.id, saleId));
}

export async function purgeOldCanceledSales() {
  try {
    // Corte com 1 dia extra de folga (em vez de "meia-noite de hoje" cru): o processo roda no fuso
    // do servidor (normalmente UTC), diferente do fuso do negócio (Brasil/Paraguai) — sem a folga,
    // uma venda podia virar elegível pra exclusão até ~4h mais cedo do que o dono considera "ontem".
    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - 1);

    const oldCanceled = await db.select().from(sales).where(
      and(
        eq(sales.orderStatus, "CANCELED"),
        eq(sales.paymentStatus, "CANCELED"),
        eq(sales.fulfillmentStatus, "CANCELED"),
        or(
          lt(sales.canceledAt, cutoff),
          and(isNull(sales.canceledAt), lt(sales.createdAt, cutoff)),
          and(isNull(sales.canceledAt), isNull(sales.createdAt))
        )
      )
    );

    if (oldCanceled.length === 0) return 0;

    let totalDeleted = 0;

    for (const sale of oldCanceled) {
      // Nunca apagar de vez uma venda que ainda tem dinheiro rastreado nela — isso é o que torna um
      // achado como o A (pagamento preso por corrida) irrecuperável: sem a linha de `sales`, o
      // lançamento na conta financeira vira órfão, sem nenhum jeito de explicar de onde veio.
      const hasMovement = await db.select({ id: accountMovements.id }).from(accountMovements)
        .where(eq(accountMovements.referenceId, sale.id)).limit(1);
      if (hasMovement.length > 0) continue;
      // Mesma lógica pro pedido da loja ligado a ela: apagar a venda deixaria store_orders.sale_id
      // pendurado (referenciando uma venda que não existe mais).
      const hasOrder = await db.select({ id: storeOrders.id }).from(storeOrders)
        .where(eq(storeOrders.saleId, sale.id)).limit(1);
      if (hasOrder.length > 0) continue;

      await db.transaction(async (tx) => {
        await deleteDeadSaleRecords(tx, sale.id);
      });
      totalDeleted++;
    }

    if (totalDeleted > 0) {
       await db.insert(maintenanceLogs).values({
          action: "PURGE_OLD_CANCELED_SALES",
          totalDeleted,
          details: `Purgou ${totalDeleted} vendas canceladas antigas.`,
       });
    }

    return totalDeleted;
  } catch (err) {
    console.error("Erro na purga de vendas canceladas:", err);
    return 0;
  }
}

router.post("/purge-canceled-sales", requireAuth, requirePermission("admin", "manage"), async (req: AuthRequest, res) => {
  try {
     const count = await purgeOldCanceledSales();
     res.json({ success: true, count });
  } catch(err: any) {
     res.status(500).json({ error: err.message });
  }
});

router.post("/purge-ocr-jobs", requireAuth, requirePermission("admin", "manage"), async (req: AuthRequest, res) => {
  try {
     const deleted = await purgeOldOcrJobs();
     res.json({ success: true, deleted });
  } catch(err: any) {
     res.status(500).json({ error: err.message });
  }
});
