import { and, eq, inArray, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import {
  sales, saleItems, stockBalances, stockMovements, stockReservations,
  deliveryTasks, deliveryItems, deliverySerials, productSerials, auditLogs,
  storeOrders, storeOrderPayments, storeCoupons,
} from "../db/schema";
import { restoreSaleLots } from "./lots";
import { restoreSaleLayers } from "./costLayers";

// Corpo da transação de cancelamento de venda — extraído de POST /api/sales/:id/cancel
// pra ser reaproveitado por POST /api/store/admin/orders/:id/cancel também.
// Antes as duas rotas tinham cada uma sua própria cópia parcial dessa lógica:
// a rota da loja não checava se a venda já estava paga (podia cancelar e perder
// o rastro do dinheiro recebido, sem estorno), não checava se a venda já tinha
// sido cancelada pela outra rota (dava pra descontar a reserva de estoque duas
// vezes, corrompendo a reserva de OUTROS pedidos do mesmo produto), e não tinha
// o caminho de restauração de estoque físico/custo pra venda já entregue (o
// estoque vazava). Uma cópia só, usada nos dois lugares, elimina as três coisas
// de uma vez — se um lugar tem a checagem certa, o outro também tem.
export async function cancelSaleTx(tx: any, sale: any, reason: string, userId: string) {
  // Trava e relê a venda AQUI, mesmo que o chamador já tenha um `sale` em mãos — quem chamou pode
  // tê-lo lido fora da transação (ou sem FOR UPDATE), e um pagamento pode ter comitado entre essa
  // leitura e agora. Sem isso, o guard abaixo confiava num status desatualizado e um cancelamento
  // podia sobrescrever uma venda recém-paga sem nunca estornar o dinheiro (achado real: LOJ-000006).
  const [locked] = await tx.select().from(sales).where(eq(sales.id, sale.id)).limit(1).for("update");
  if (!locked) throw new Error("Venda não encontrada.");
  sale = locked;

  if (["CANCELED", "CANCELLED", "RETURNED"].includes(String(sale.orderStatus))) {
    throw new Error("Venda já está cancelada.");
  }
  if (sale.paymentStatus !== "PENDING") {
    throw new Error("Somente vendas pendentes podem ser canceladas. Vendas pagas precisam passar pelo fluxo de estorno/reembolso.");
  }

  if (sale.fulfillmentStatus !== "DELIVERED") {
    const lines = await tx.select().from(saleItems).where(eq(saleItems.saleId, sale.id));
    const productIds = [...new Set(lines.map((l: any) => l.productId))];
    // Trava e lê o saldo dos produtos envolvidos numa query só (em vez de 1 SELECT por linha),
    // mantendo um "cursor" em memória pra cascatear corretamente caso a venda tenha 2 linhas
    // do mesmo produto (o 2º UPDATE precisa enxergar o resultado do 1º, não o valor original).
    const balRows: any[] = productIds.length > 0
      ? await tx.select().from(stockBalances).where(inArray(stockBalances.productId, productIds as string[])).for("update")
      : [];
    const balCursor = new Map<string, { physicalStock: number; reservedStock: number }>(
      balRows.map((b: any) => [b.productId, { physicalStock: Number(b.physicalStock), reservedStock: Number(b.reservedStock) }])
    );
    const movementsToInsert: any[] = [];
    for (const line of lines) {
      const cur = balCursor.get(line.productId);
      if (cur) {
        const oldRes = cur.reservedStock;
        const oldPhys = cur.physicalStock;
        const newRes = Math.max(0, oldRes - Number(line.quantity));
        cur.reservedStock = newRes;
        await tx.update(stockBalances).set({ reservedStock: newRes }).where(eq(stockBalances.productId, line.productId));
        movementsToInsert.push({
          id: uuidv4(), productId: line.productId, quantity: -Number(line.quantity), userId,
          movementType: "CANCEL_RESERVATION", referenceId: sale.id,
          beforePhysical: oldPhys, afterPhysical: oldPhys, beforeReserved: oldRes, afterReserved: newRes,
          notes: "Cancelamento de venda: " + reason,
        });
      }
    }
    if (movementsToInsert.length > 0) await tx.insert(stockMovements).values(movementsToInsert);
    await tx.update(stockReservations).set({ status: "CANCELED" }).where(eq(stockReservations.saleId, sale.id));
    await tx.insert(auditLogs).values({
      id: uuidv4(), userId, action: "CANCEL_RESERVATION", tableName: "stock_reservations", recordId: sale.id,
      newValues: JSON.stringify({ reason }),
    });
  } else {
    const lines = await tx.select().from(saleItems).where(eq(saleItems.saleId, sale.id));
    const productIds = [...new Set(lines.map((l: any) => l.productId))];
    const balRows: any[] = productIds.length > 0
      ? await tx.select().from(stockBalances).where(inArray(stockBalances.productId, productIds as string[])).for("update")
      : [];
    const balCursor = new Map<string, { physicalStock: number; reservedStock: number }>(
      balRows.map((b: any) => [b.productId, { physicalStock: Number(b.physicalStock), reservedStock: Number(b.reservedStock) }])
    );
    const movementsToInsert: any[] = [];
    for (const line of lines) {
      const cur = balCursor.get(line.productId);
      if (cur) {
        const oldRes = cur.reservedStock;
        const oldPhys = cur.physicalStock;
        const newPhys = oldPhys + Number(line.quantity);
        cur.physicalStock = newPhys;
        await tx.update(stockBalances).set({ physicalStock: newPhys }).where(eq(stockBalances.productId, line.productId));
        movementsToInsert.push({
          id: uuidv4(), productId: line.productId, quantity: Number(line.quantity), userId,
          movementType: "RETURN_CANCEL_SALE", referenceId: sale.id,
          beforePhysical: oldPhys, afterPhysical: newPhys, beforeReserved: oldRes, afterReserved: oldRes,
          notes: "Cancelamento de venda: " + reason,
        });
      }
    }
    if (movementsToInsert.length > 0) await tx.insert(stockMovements).values(movementsToInsert);
    await restoreSaleLots(tx, sale.id);
    await restoreSaleLayers(tx, sale.id);
    // Devolve as séries entregues numa query só por etapa (em vez de 1 SELECT + 1 UPDATE
    // por item de entrega), já que todo serial devolvido vira o mesmo status "RETURNED".
    const task = await tx.select().from(deliveryTasks).where(eq(deliveryTasks.saleId, sale.id)).limit(1);
    if (task.length > 0) {
      const dItems = await tx.select({ id: deliveryItems.id }).from(deliveryItems).where(eq(deliveryItems.deliveryTaskId, task[0].id));
      const dItemIds = dItems.map((di: any) => di.id);
      if (dItemIds.length > 0) {
        const dSerials = await tx.select({ serialNumber: deliverySerials.serialNumber }).from(deliverySerials).where(inArray(deliverySerials.deliveryItemId, dItemIds));
        const serialNumbers = [...new Set(dSerials.map((ds: any) => ds.serialNumber))];
        if (serialNumbers.length > 0) {
          await tx.update(productSerials).set({ status: "RETURNED" }).where(inArray(productSerials.serialNumber, serialNumbers as string[]));
        }
      }
    }
    await tx.insert(auditLogs).values({
      id: uuidv4(), userId, action: "RETURN_STOCK_CANCELLED_SALE", tableName: "sales", recordId: sale.id,
      newValues: JSON.stringify({ reason }),
    });
  }

  await tx.update(sales).set({
    orderStatus: "CANCELED", paymentStatus: "CANCELED", fulfillmentStatus: "CANCELED",
    canceledAt: new Date(), canceledBy: userId, cancelReason: reason,
  }).where(eq(sales.id, sale.id));

  await tx.insert(auditLogs).values({
    id: uuidv4(), userId, action: "CANCEL_SALE", tableName: "sales", recordId: sale.id,
    newValues: JSON.stringify({ reason }),
  });

  await syncStoreOrderFromSale(tx, sale.id, userId);
}

// Mantém store_orders.status coerente com o status real da venda (sales) depois
// de qualquer pagamento/cancelamento/estorno feito pelo Caixa. Antes cada rota
// (cancelar, estornar, receber pagamento) mexia só num lado — pedido cancelado
// no Caixa nunca aparecia cancelado em Pedidos da Loja, e o cliente continuava
// vendo QR PIX pagável pra um pedido morto. Chamar isso no fim da MESMA
// transação que mexeu em `sales`, sempre que a venda tiver saleId de origem
// da loja. Não faz nada se a venda não veio da loja (a maioria dos casos).
export async function syncStoreOrderFromSale(tx: any, saleId: string, actorUserId?: string | null) {
  const [order] = await tx.select().from(storeOrders).where(eq(storeOrders.saleId, saleId)).limit(1);
  if (!order) return;
  if (order.status === "CANCELED") return; // terminal — nada a fazer, evita escrita/auditoria redundante

  const [sale] = await tx.select().from(sales).where(eq(sales.id, saleId)).limit(1);
  if (!sale) return;

  const saleIsDead = ["CANCELED", "CANCELLED", "RETURNED"].includes(String(sale.orderStatus)) || sale.paymentStatus === "REFUNDED";
  if (saleIsDead) {
    await tx.update(storeOrders).set({
      status: "CANCELED",
      canceledReason: sale.cancelReason ? `Sincronizado do Caixa: ${sale.cancelReason}` : "Sincronizado do Caixa",
      updatedAt: new Date(),
    }).where(eq(storeOrders.id, order.id));

    // O pedido cancelado não deve mais contar pro limite do cupom (mesma regra
    // já aplicada quando o cancelamento acontece pela tela de Pedidos da Loja).
    if (order.couponCode) {
      await tx.update(storeCoupons)
        .set({ usedCount: sql`greatest(${storeCoupons.usedCount} - 1, 0)`, updatedAt: new Date() })
        .where(eq(storeCoupons.code, order.couponCode));
    }
    return;
  }

  // Venda paga em cheio no Caixa mas o pedido ainda não tinha sido conferido/
  // confirmado pela tela de Pedidos — reflete o pagamento lá também.
  if (sale.paymentStatus === "PAID" && order.status !== "CONFIRMED") {
    await tx.update(storeOrders).set({
      status: "CONFIRMED",
      confirmedAt: new Date(),
      confirmedBy: actorUserId || null,
      updatedAt: new Date(),
      // receivedAmountBrl fica como estava: o valor pago no Caixa pode não ter
      // sido em BRL (ver sales.currency), então não dá pra preencher esse campo
      // com confiança aqui sem converter — melhor deixar em branco do que errado.
    }).where(eq(storeOrders.id, order.id));
    await tx.update(storeOrderPayments).set({ status: "CONFIRMED", confirmedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(storeOrderPayments.orderId, order.id), eq(storeOrderPayments.status, "PENDING")));
  }
}
