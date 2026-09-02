import { Router } from "express";
import { db } from "../db";
import { sales, saleItems, stockReservations, products, customers, users, roles, stockBalances, stockMovements, productSerials, deliveryTasks, deliveryItems, deliverySerials, separationTasks, separationItems, auditLogs, payments, cashRegisters, cashMovements, saleReturns, companySettings, saleItemLots, storeOrders } from "../db/schema";
import { requireAuth, requirePermission, AuthRequest } from "./authMiddleware";
import { eq, desc, sql, and, or, gte, lte, like, ilike, inArray, notInArray } from "drizzle-orm";
import { logAction } from "./audit";
import { consumeSaleLots, restoreSaleLots } from "./lots";
import { consumeFifo, restoreSaleLayers } from "./costLayers";
import { reverseSaleMovements } from "./finance";
import { getCustomerOutstanding } from "./receivables";
import { cancelSaleTx, syncStoreOrderFromSale } from "./storeOrderSync";
import { createNotification } from "./notifications";
import { formatBrl } from "../lib/money";
import { dayStartUtc, dayEndUtc } from "../lib/dateRange";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";

const router = Router();
router.use(requireAuth);


type LotInput = { saleItemId?: string; productId?: string; lotNumber?: string; quantity?: number | string };
type NormalizedLot = { saleItemId?: string; productId: string; lotNumber: string; quantity: number };

function normalizeFulfillmentStatus(value: unknown) {
  const status = String(value || "PENDING").toUpperCase();
  if (["PENDING", "DELIVERING", "DELIVERED", "RETURNED", "CANCELED", "CANCELLED"].includes(status)) return status;
  return "PENDING";
}

function normalizeLotAllocations(input: unknown): NormalizedLot[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((row: LotInput) => ({
      saleItemId: String(row?.saleItemId || "").trim() || undefined,
      productId: String(row?.productId || "").trim(),
      lotNumber: String(row?.lotNumber || "").trim().toUpperCase(),
      quantity: Math.floor(Number(row?.quantity || 0)),
    }))
    .filter((row) => row.productId && row.lotNumber && row.quantity > 0);
}

function calculateLotStatus(requiredByProduct: Map<string, number>, lots: NormalizedLot[]) {
  let requiredTotal = 0;
  let informedTotal = 0;
  for (const [productId, requiredQty] of requiredByProduct.entries()) {
    requiredTotal += requiredQty;
    const informed = lots.filter((lot) => lot.productId === productId).reduce((sum, lot) => sum + lot.quantity, 0);
    if (informed > requiredQty) throw new Error(`Quantidade de lote maior que a quantidade vendida para um produto.`);
    informedTotal += informed;
  }
  if (requiredTotal <= 0) return "NOT_REQUIRED";
  if (informedTotal <= 0) return "PENDING";
  if (informedTotal < requiredTotal) return "PARTIAL";
  return "COMPLETE";
}

async function recalculateSaleLotStatus(tx: any, saleId: string) {
  const items = await tx.select({
    id: saleItems.id,
    productId: saleItems.productId,
    quantity: saleItems.quantity,
    requiresLot: products.requiresLot,
  })
  .from(saleItems)
  .innerJoin(products, eq(saleItems.productId, products.id))
  .where(eq(saleItems.saleId, saleId));

  const lots = await tx.select({
    saleItemId: saleItemLots.saleItemId,
    productId: saleItemLots.productId,
    quantity: saleItemLots.quantity,
  }).from(saleItemLots).where(eq(saleItemLots.saleId, saleId));

  let requiredTotal = 0;
  let informedTotal = 0;
  for (const item of items) {
    if (!item.requiresLot) continue;
    const requiredQty = Number(item.quantity || 0);
    const informed = lots.filter((lot) => lot.saleItemId === item.id).reduce((sum, lot) => sum + Number(lot.quantity || 0), 0);
    requiredTotal += requiredQty;
    informedTotal += Math.min(informed, requiredQty);
  }
  const lotStatus = requiredTotal <= 0 ? "NOT_REQUIRED" : informedTotal <= 0 ? "PENDING" : informedTotal < requiredTotal ? "PARTIAL" : "COMPLETE";
  await tx.update(sales).set({ lotStatus }).where(eq(sales.id, saleId));
  return lotStatus;
}

async function markSaleDelivered(tx: any, saleId: string, userId: string) {
  // FOR UPDATE: mesma classe de bug do incidente LOJ-000006 (ver cancelSaleTx em
  // storeOrderSync.ts) — sem lock, duas chamadas concorrentes leem o mesmo estado "não entregue"
  // e ambas aplicam a baixa de estoque, duplicando a saída.
  const saleRows = await tx.select().from(sales).where(eq(sales.id, saleId)).for("update").limit(1);
  if (!saleRows.length) throw new Error("Venda não encontrada.");
  const sale = saleRows[0];
  if (["DELIVERED", "RETURNED", "CANCELED", "CANCELLED"].includes(String(sale.fulfillmentStatus))) return;

  // B9: produto com lote obrigatório só sai se a alocação de lote estiver completa.
  if (["PENDING", "PARTIAL"].includes(String(sale.lotStatus))) {
    throw new Error("Informe o lote completo dos itens antes de entregar (produto controlado por lote).");
  }

  const lines = await tx.select().from(saleItems).where(eq(saleItems.saleId, saleId));
  for (const line of lines) {
    const qty = Number(line.quantity || 0);
    const balRows = await tx.select().from(stockBalances).where(eq(stockBalances.productId, line.productId)).for("update").limit(1);
    if (!balRows.length) throw new Error("Estoque não encontrado para item da venda.");
    const bal = balRows[0];
    const beforePhysical = Number(bal.physicalStock || 0);
    const beforeReserved = Number(bal.reservedStock || 0);
    if (beforeReserved < qty) throw new Error("Estoque reservado insuficiente para entregar a venda.");
    const afterPhysical = beforePhysical - qty;
    const afterReserved = beforeReserved - qty;
    await tx.update(stockBalances).set({ physicalStock: afterPhysical, reservedStock: afterReserved, updatedAt: new Date() }).where(eq(stockBalances.productId, line.productId));
    // CMP: consome camadas FIFO (custo da época da compra) — base da margem real.
    await consumeFifo(tx, line.productId, qty, { saleId, reason: "SALE" });
    await tx.insert(stockMovements).values({
      id: uuidv4(),
      productId: line.productId,
      quantity: -qty,
      userId,
      movementType: "OUT_DELIVERY_SIMPLE",
      referenceId: saleId,
      beforePhysical,
      afterPhysical,
      beforeReserved,
      afterReserved,
      reason: "Entrega da venda",
      notes: "Controle simples de entregas",
    });
  }
  await tx.update(stockReservations).set({ status: "DELIVERED" }).where(eq(stockReservations.saleId, saleId));
  // Baixa o saldo físico dos lotes alocados a esta venda (saída real do estoque).
  await consumeSaleLots(tx, saleId);
  const orderStatus = sale.paymentStatus === "PAID" ? "COMPLETED" : sale.orderStatus;
  await tx.update(sales).set({ fulfillmentStatus: "DELIVERED", orderStatus }).where(eq(sales.id, saleId));
}


router.get("/", requirePermission("sales", "view"), async (req: AuthRequest, res) => {
  try {
    const { dateFrom, dateTo, customerName, number, paymentStatus, fulfillmentStatus, serialNumber, q } = req.query;

    const conditions = [notInArray(sales.orderStatus, ["CANCELED", "CANCELLED", "RETURNED"]), notInArray(sales.paymentStatus, ["REFUNDED"])] ;
    
    if (dateFrom) {
       conditions.push(gte(sales.createdAt, dayStartUtc(String(dateFrom))));
    }
    if (dateTo) {
       conditions.push(lte(sales.createdAt, dayEndUtc(String(dateTo))));
    }
    if (customerName) {
       conditions.push(ilike(customers.name, `%${customerName}%`));
    }
    if (number) {
       conditions.push(sql`CAST(${sales.number} AS TEXT) ILIKE ${`%${number}%`}`);
    }
    if (paymentStatus) {
       conditions.push(eq(sales.paymentStatus, String(paymentStatus)));
    }
    if (fulfillmentStatus) {
       conditions.push(eq(sales.fulfillmentStatus, String(fulfillmentStatus)));
    }
    if (serialNumber) {
       const serialQuery = String(serialNumber).trim();
       const matchedSales = await db.selectDistinct({ saleId: saleItems.saleId })
         .from(productSerials)
         .innerJoin(saleItems, eq(productSerials.saleItemId, saleItems.id))
         .where(ilike(productSerials.serialNumber, `%${serialQuery}%`));
       const saleIds = matchedSales.map((row) => row.saleId).filter(Boolean) as string[];
       if (saleIds.length === 0) {
         return res.json({ data: [], summary: { count: 0, grossAmount: 0, discountAmount: 0, ivaAmount: 0, netAmount: 0, paidAmount: 0, pendingAmount: 0 } });
       }
       conditions.push(inArray(sales.id, saleIds));
    }

    if (q) {
       const searchText = String(q).trim();
       if (searchText) {
         const serialMatches = await db.selectDistinct({ saleId: saleItems.saleId })
           .from(productSerials)
           .innerJoin(saleItems, eq(productSerials.saleItemId, saleItems.id))
           .where(ilike(productSerials.serialNumber, `%${searchText}%`));
         const serialSaleIds = serialMatches.map((row) => row.saleId).filter(Boolean) as string[];
         const searchConditions: any[] = [
           ilike(customers.name, `%${searchText}%`),
           ilike(customers.document, `%${searchText}%`),
           ilike(customers.phone, `%${searchText}%`),
           sql`CAST(${sales.number} AS TEXT) ILIKE ${`%${searchText}%`}`,
           sql`CONCAT(${sales.series}, '-', LPAD(CAST(${sales.number} AS TEXT), 6, '0')) ILIKE ${`%${searchText}%`}`,
         ];
         if (serialSaleIds.length > 0) searchConditions.push(inArray(sales.id, serialSaleIds));
         conditions.push(or(...searchConditions)!);
       }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const limit = 100;

    const [list, summaryRows] = await Promise.all([
      db.select({
        id: sales.id,
        series: sales.series,
        number: sales.number,
        orderStatus: sales.orderStatus,
        paymentStatus: sales.paymentStatus,
        fulfillmentStatus: sales.fulfillmentStatus,
        deliveryScheduledAt: sales.deliveryScheduledAt,
        deliveryNotes: sales.deliveryNotes,
        observations: sales.observations,
        lotStatus: sales.lotStatus,
        totalAmount: sales.totalAmount,
        ivaAmount: sales.ivaAmount,
        priceTable: sales.priceTable,
        currency: sales.currency,
        createdAt: sales.createdAt,
        customerName: customers.name,
        userName: users.name,
        subtotalAmount: sales.subtotalAmount,
        discountAmount: sales.discountAmount,
      })
      .from(sales)
      .leftJoin(customers, eq(sales.customerId, customers.id))
      .leftJoin(users, eq(sales.userId, users.id))
      .where(whereClause)
      .orderBy(desc(sales.createdAt))
      .limit(limit),
      // Resumo financeiro coerente com o caixa:
      // - Bruto/Líquido = total vendido no período filtrado.
      // - Total Pago = soma de pagamentos realmente recebidos.
      // - Pendente = líquido vendido - total recebido.
      // Também mantém compatibilidade com vendas antigas marcadas como PAID sem linha em payments.
      db.select({
        id: sales.id,
        paymentStatus: sales.paymentStatus,
        subtotalAmount: sales.subtotalAmount,
        discountAmount: sales.discountAmount,
        ivaAmount: sales.ivaAmount,
        totalAmount: sales.totalAmount,
      })
      .from(sales)
      .leftJoin(customers, eq(sales.customerId, customers.id))
      .where(whereClause),
    ]);

    const summarySaleIds = summaryRows.map((row) => row.id).filter(Boolean) as string[];
    const paidBySale = new Map<string, number>();

    if (summarySaleIds.length > 0) {
      const paymentRows = await db.select({
        saleId: payments.saleId,
        paidAmount: sql<number>`sum(cast(${payments.amountUsd} as numeric))`,
      })
      .from(payments)
      .where(and(inArray(payments.saleId, summarySaleIds), eq(payments.status, "COMPLETED")))
      .groupBy(payments.saleId);

      for (const row of paymentRows) {
        if (row.saleId) paidBySale.set(row.saleId, Number(row.paidAmount) || 0);
      }
    }

    const summary = summaryRows.reduce((acc, sale) => {
      const total = Number(sale.totalAmount) || 0;
      const paidFromPayments = paidBySale.get(sale.id) || 0;
      const effectivePaid = paidFromPayments > 0 ? Math.min(paidFromPayments, total) : (sale.paymentStatus === "PAID" ? total : 0);

      acc.count += 1;
      acc.grossAmount += Number(sale.subtotalAmount) || 0;
      acc.discountAmount += Number(sale.discountAmount) || 0;
      acc.ivaAmount += Number(sale.ivaAmount) || 0;
      acc.netAmount += total;
      acc.paidAmount += effectivePaid;
      acc.pendingAmount += Math.max(total - effectivePaid, 0);
      return acc;
    }, {
      count: 0,
      grossAmount: 0,
      discountAmount: 0,
      ivaAmount: 0,
      netAmount: 0,
      paidAmount: 0,
      pendingAmount: 0,
    });

    res.json({ data: list, summary });
  } catch (err: any) {
    res.status(500).json({ error: "Erro ao buscar vendas", details: err.message });
  }
});


router.get("/deliveries/simple", requirePermission("sales", "view"), async (req: AuthRequest, res) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit || "200"), 10) || 200, 500);
    const rows = await db.select({
      id: sales.id,
      series: sales.series,
      number: sales.number,
      orderStatus: sales.orderStatus,
      paymentStatus: sales.paymentStatus,
      fulfillmentStatus: sales.fulfillmentStatus,
      deliveryScheduledAt: sales.deliveryScheduledAt,
      deliveryNotes: sales.deliveryNotes,
      lotStatus: sales.lotStatus,
      totalAmount: sales.totalAmount,
      createdAt: sales.createdAt,
      customerName: customers.name,
      customerPhone: customers.phone,
      customerDocument: customers.document,
      addressStreet: storeOrders.street,
      addressNumber: storeOrders.number,
      addressNeighborhood: storeOrders.neighborhood,
      addressCity: storeOrders.city,
      addressState: storeOrders.state,
      addressCep: storeOrders.cep,
    })
    .from(sales)
    .leftJoin(customers, eq(sales.customerId, customers.id))
    .leftJoin(storeOrders, eq(storeOrders.saleId, sales.id))
    .where(notInArray(sales.orderStatus, ["CANCELED", "CANCELLED", "RETURNED"]))
    .orderBy(desc(sales.createdAt))
    .limit(limit);

    res.json({ data: rows });
  } catch (err: any) {
    res.status(500).json({ error: "Erro ao buscar entregas", details: err.message });
  }
});

router.patch("/:id/fulfillment", requirePermission("sales", "create"), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const requested = normalizeFulfillmentStatus(req.body?.fulfillmentStatus);
    const deliveryScheduledAt = req.body?.deliveryScheduledAt ? new Date(String(req.body.deliveryScheduledAt)) : null;
    const deliveryNotes = req.body?.deliveryNotes ? String(req.body.deliveryNotes).trim() : null;

    const result = await db.transaction(async (tx) => {
      const saleRows = await tx.select().from(sales).where(eq(sales.id, id)).limit(1);
      if (!saleRows.length) throw new Error("Venda não encontrada.");
      if (["CANCELED", "CANCELLED", "RETURNED"].includes(String(saleRows[0].orderStatus))) throw new Error("Venda cancelada/devolvida não pode ser alterada.");

      if (requested === "DELIVERED") {
        await tx.update(sales).set({ deliveryScheduledAt, deliveryNotes }).where(eq(sales.id, id));
        await markSaleDelivered(tx, id, req.user!.userId);
      } else {
        await tx.update(sales).set({ fulfillmentStatus: requested, deliveryScheduledAt, deliveryNotes }).where(eq(sales.id, id));
      }
      const [updated] = await tx.select().from(sales).where(eq(sales.id, id)).limit(1);
      return updated;
    });

    await logAction(req.user!.userId, "UPDATE_FULFILLMENT", "sales", id, null, { fulfillmentStatus: result.fulfillmentStatus });
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.patch("/:id/lots", requirePermission("sales", "create"), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const normalizedLots = normalizeLotAllocations(req.body?.lots);
    const result = await db.transaction(async (tx) => {
      const saleRows = await tx.select().from(sales).where(eq(sales.id, id)).limit(1);
      if (!saleRows.length) throw new Error("Venda não encontrada.");
      if (["CANCELED", "CANCELLED", "RETURNED"].includes(String(saleRows[0].orderStatus))) throw new Error("Venda cancelada/devolvida não pode receber lote.");

      const lines = await tx.select({ id: saleItems.id, productId: saleItems.productId, quantity: saleItems.quantity, requiresLot: products.requiresLot })
        .from(saleItems)
        .innerJoin(products, eq(saleItems.productId, products.id))
        .where(eq(saleItems.saleId, id));

      const required = new Map<string, number>();
      for (const line of lines) {
        if (line.requiresLot) required.set(line.productId, (required.get(line.productId) || 0) + Number(line.quantity || 0));
      }
      calculateLotStatus(required, normalizedLots);

      await tx.delete(saleItemLots).where(eq(saleItemLots.saleId, id));
      const lotRows: any[] = [];
      for (const lot of normalizedLots) {
        const line = lot.saleItemId
          ? lines.find((item) => item.id === lot.saleItemId)
          : lines.find((item) => item.productId === lot.productId);
        if (!line) continue;
        if (!line.requiresLot) continue;
        lotRows.push({
          id: uuidv4(),
          saleId: id,
          saleItemId: line.id,
          productId: line.productId,
          lotNumber: lot.lotNumber,
          quantity: lot.quantity,
          createdBy: req.user!.userId,
        });
      }
      if (lotRows.length) await tx.insert(saleItemLots).values(lotRows);
      const lotStatus = await recalculateSaleLotStatus(tx, id);
      return { lotStatus };
    });

    await logAction(req.user!.userId, "UPDATE_SALE_LOTS", "sale_item_lots", id, null, { lotStatus: result.lotStatus });
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/:id", requirePermission("sales", "view"), async (req: AuthRequest, res) => {
  try {
    const saleId = req.params.id;
    const [saleList, items] = await Promise.all([
      db.select({
        id: sales.id,
        series: sales.series,
        number: sales.number,
        orderStatus: sales.orderStatus,
        paymentStatus: sales.paymentStatus,
        fulfillmentStatus: sales.fulfillmentStatus,
        deliveryScheduledAt: sales.deliveryScheduledAt,
        deliveryNotes: sales.deliveryNotes,
        observations: sales.observations,
        lotStatus: sales.lotStatus,
        totalAmount: sales.totalAmount,
        subtotalAmount: sales.subtotalAmount,
        discountAmount: sales.discountAmount,
        ivaAmount: sales.ivaAmount,
        priceTable: sales.priceTable,
        currency: sales.currency,
        createdAt: sales.createdAt,
        customerName: customers.name,
        customerDocument: customers.document,
        customerPhone: customers.phone,
        userName: users.name
      })
      .from(sales)
      .leftJoin(customers, eq(sales.customerId, customers.id))
      .leftJoin(users, eq(sales.userId, users.id))
      .where(eq(sales.id, saleId))
      .limit(1),
      db.select({
        id: saleItems.id,
        quantity: saleItems.quantity,
        unitPrice: saleItems.unitPrice,
        totalPrice: saleItems.totalPrice,
        ivaAmount: saleItems.ivaAmount,
        discountAmount: saleItems.discountAmount,
        productName: products.name,
        productSku: products.sku,
        productId: products.id,
        hasSerialNumber: products.hasSerialNumber,
        requiresLot: products.requiresLot
      })
      .from(saleItems)
      .leftJoin(products, eq(saleItems.productId, products.id))
      .where(eq(saleItems.saleId, saleId)),
    ]);

    if (saleList.length === 0) return res.status(404).json({ error: "Venda não encontrada" });

    const sale = saleList[0];

    const itemIds = items.map(i => i.id);
    const [serialsList, lotsList, paymentActorRows, separationActorRows, deliveryActorRows, returnRows] = await Promise.all([
      itemIds.length > 0
        ? db.select({
            saleItemId: productSerials.saleItemId,
            serialNumber: productSerials.serialNumber
          }).from(productSerials).where(inArray(productSerials.saleItemId, itemIds))
        : Promise.resolve([]),
      itemIds.length > 0
        ? db.select({
            saleItemId: saleItemLots.saleItemId,
            productId: saleItemLots.productId,
            lotNumber: saleItemLots.lotNumber,
            quantity: saleItemLots.quantity,
          }).from(saleItemLots).where(inArray(saleItemLots.saleItemId, itemIds))
        : Promise.resolve([]),
      db.select({
        userName: users.name,
        createdAt: payments.createdAt,
      })
      .from(payments)
      .leftJoin(users, eq(payments.receivedBy, users.id))
      .where(and(eq(payments.saleId, saleId), eq(payments.status, "COMPLETED")))
      .orderBy(desc(payments.createdAt))
      .limit(1),
      db.select({
        userName: users.name,
        checkedAt: separationItems.checkedAt,
        taskCompletedAt: separationTasks.completedAt,
      })
      .from(separationTasks)
      .leftJoin(separationItems, eq(separationItems.separationTaskId, separationTasks.id))
      .leftJoin(users, eq(separationItems.checkedBy, users.id))
      .where(eq(separationTasks.saleId, saleId))
      .orderBy(desc(separationItems.checkedAt))
      .limit(1),
      db.select({
        userName: users.name,
        checkedAt: deliveryItems.checkedAt,
        taskCompletedAt: deliveryTasks.completedAt,
      })
      .from(deliveryTasks)
      .leftJoin(deliveryItems, eq(deliveryItems.deliveryTaskId, deliveryTasks.id))
      .leftJoin(users, eq(deliveryItems.checkedBy, users.id))
      .where(eq(deliveryTasks.saleId, saleId))
      .orderBy(desc(deliveryItems.checkedAt))
      .limit(1),
      db.select({
        id: saleReturns.id,
        notes: saleReturns.notes,
        totalAmountUsd: saleReturns.totalAmountUsd,
        createdAt: saleReturns.createdAt,
        returnedByName: users.name,
      })
      .from(saleReturns)
      .leftJoin(users, eq(saleReturns.returnedBy, users.id))
      .where(eq(saleReturns.saleId, saleId))
      .orderBy(desc(saleReturns.createdAt))
      .limit(1),
    ]);

    const itemsWithSerials = items.map(item => {
       const mappedSerials = serialsList.filter(s => s.saleItemId === item.id).map(s => s.serialNumber);
       const mappedLots = lotsList.filter((lot: any) => lot.saleItemId === item.id).map((lot: any) => ({ lotNumber: lot.lotNumber, quantity: lot.quantity }));
       return {
          ...item,
          serials: mappedSerials,
          lots: mappedLots,
          lotSummary: mappedLots.map((lot: any) => `${lot.lotNumber}${Number(lot.quantity || 0) > 0 ? ` (${lot.quantity})` : ""}`).join(" | ")
       };
    });

    res.json({
       ...sale,
       items: itemsWithSerials,
       actors: {
         order: { userName: sale.userName, at: sale.createdAt },
         payment: paymentActorRows[0] ? { userName: paymentActorRows[0].userName, at: paymentActorRows[0].createdAt } : null,
         separation: separationActorRows[0] ? { userName: separationActorRows[0].userName, at: separationActorRows[0].checkedAt || separationActorRows[0].taskCompletedAt } : null,
         delivery: deliveryActorRows[0] ? { userName: deliveryActorRows[0].userName, at: deliveryActorRows[0].checkedAt || deliveryActorRows[0].taskCompletedAt } : null,
       },
       returnInfo: returnRows[0] || null,
    });

  } catch (err: any) {
    res.status(500).json({ error: "Erro ao buscar venda", details: err.message });
  }
});

router.get("/:id/edit-data", requirePermission("sales", "view"), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const saleRows = await db.select().from(sales).where(eq(sales.id, id));
    if (saleRows.length === 0) return res.status(404).json({ error: "Venda não encontrada" });
    const sale = saleRows[0];

    if (sale.paymentStatus !== "PENDING" || sale.orderStatus !== "CONFIRMED" || sale.fulfillmentStatus === "DELIVERED") {
      return res.status(400).json({ error: "Esta venda não pode ser editada (paga, cancelada ou entregue)." });
    }

    const items = await db.select({
      id: saleItems.id,
      productId: saleItems.productId,
      quantity: saleItems.quantity,
      unitPrice: saleItems.unitPrice,
      ivaAmount: saleItems.ivaAmount,
      productName: products.name,
      sku: products.sku,
      hasSerials: products.hasSerialNumber,
      requiresLot: products.requiresLot,
    })
    .from(saleItems)
    .innerJoin(products, eq(saleItems.productId, products.id))
    .where(eq(saleItems.saleId, sale.id));

    // For editing, we must provide available stock including current reserved quantity.
    // Batcheado com inArray em vez de 2 queries por item (era N+1 — só GET de leitura, mas
    // pesava em vendas com carrinho grande).
    const productIds = [...new Set(items.map((i) => i.productId))];
    const [stockRows, reservedRows] = productIds.length ? await Promise.all([
      db.select().from(stockBalances).where(inArray(stockBalances.productId, productIds)),
      db.select().from(stockReservations)
        .where(and(eq(stockReservations.saleId, sale.id), inArray(stockReservations.productId, productIds), eq(stockReservations.status, "ACTIVE"))),
    ]) : [[], []];
    const stockByProduct = new Map(stockRows.map((s) => [s.productId, s]));
    const reservedByProduct = new Map<string, number>();
    for (const r of reservedRows) reservedByProduct.set(r.productId, (reservedByProduct.get(r.productId) || 0) + Number(r.quantity));

    const itemsWithStockArray = items.map((item) => {
      const stock = stockByProduct.get(item.productId);
      const reserved = stock ? Number(stock.reservedStock) : 0;
      const physical = stock ? Number(stock.physicalStock) : 0;
      // The available stock for this edit is the totally available stock PLUS the quantity already reserved by THIS sale item
      const alreadyReserved = reservedByProduct.get(item.productId) || 0;
      const availableStockForEdit = (physical - reserved) + alreadyReserved;
      return { ...item, availableStockForEdit };
    });

    res.json({
      id: sale.id,
      customerId: sale.customerId,
      priceTable: sale.priceTable,
      observations: sale.observations,
      fulfillmentStatus: sale.fulfillmentStatus,
      deliveryScheduledAt: sale.deliveryScheduledAt,
      deliveryNotes: sale.deliveryNotes,
      discountAmount: sale.discountAmount,
      dueDate: sale.dueDate,
      lotStatus: sale.lotStatus,
      items: itemsWithStockArray
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put("/:id", requirePermission("sales", "create"), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { customerId, observations, items, priceTable, freightAmount, discountAmount: requestedDiscountAmount, fulfillmentStatus, deliveryScheduledAt, deliveryNotes, dueDate } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: "Venda deve ter pelo menos um item" });
    }

    const finalSale = await db.transaction(async (tx) => {
      const saleRows = await tx.select().from(sales).where(eq(sales.id, id));
      if (saleRows.length === 0) throw new Error("Venda não encontrada");
      const currentSale = saleRows[0];

      if (currentSale.paymentStatus !== "PENDING" || currentSale.orderStatus !== "CONFIRMED") {
         throw new Error("Vendas pagas ou canceladas não podem ser editadas. Faça estorno ou nova venda.");
      }
      if (currentSale.fulfillmentStatus === "DELIVERED") {
         throw new Error("Vendas entregues não podem ser editadas.");
      }

      // If separated/separating, delete tasks and reset status
      if (currentSale.fulfillmentStatus === "SEPARATED" || currentSale.fulfillmentStatus === "SEPARATING") {
         const sTasks = await tx.select().from(separationTasks).where(eq(separationTasks.saleId, id));
         for(const st of sTasks) {
            await tx.delete(separationItems).where(eq(separationItems.separationTaskId, st.id));
         }
         await tx.delete(separationTasks).where(eq(separationTasks.saleId, id));
         
         const dTasks = await tx.select().from(deliveryTasks).where(eq(deliveryTasks.saleId, id));
         for(const dt of dTasks) {
            await tx.delete(deliveryItems).where(eq(deliveryItems.deliveryTaskId, dt.id));
         }
         await tx.delete(deliveryTasks).where(eq(deliveryTasks.saleId, id));
      }

      // Revert old reservations
      const oldReservations = await tx.select().from(stockReservations).where(and(eq(stockReservations.saleId, id), eq(stockReservations.status, "ACTIVE")));
      for (const r of oldReservations) {
        await tx.update(stockReservations).set({ status: "CANCELED" }).where(eq(stockReservations.id, r.id));
        const sb = await tx.select().from(stockBalances).where(eq(stockBalances.productId, r.productId)).for("update");
        if (sb.length > 0) {
           const beforeRes = Number(sb[0].reservedStock);
           const newRes = Math.max(0, beforeRes - Number(r.quantity));
           await tx.update(stockBalances).set({ reservedStock: newRes }).where(eq(stockBalances.productId, r.productId));
           await tx.insert(stockMovements).values({
            id: uuidv4(),
            productId: r.productId,
            movementType: "EDIT_SALE_RELEASE_RESERVATION",
            quantity: r.quantity,
            userId: req.user!.userId,
            referenceId: r.saleId,
            beforePhysical: Number(sb[0].physicalStock),
            afterPhysical: Number(sb[0].physicalStock),
            beforeReserved: beforeRes,
            afterReserved: newRes,
            notes: "Liberação de reserva para edição de nota",
          });
        }
      }

      // Delete old lot allocations first (FK -> sale_items), then old items
      await tx.delete(saleItemLots).where(eq(saleItemLots.saleId, id));
      await tx.delete(saleItems).where(eq(saleItems.saleId, id));

      // Calculate new totals and reserve new items
      let subtotalAmount = 0;
      let ivaAmount = 0;
      let discountAmount = 0;

      let isNational = false;
      if (customerId) {
        const custs = await tx.select().from(customers).where(eq(customers.id, customerId)).limit(1);
        if (custs.length > 0) isNational = custs[0].nationality === 'PY';
      }

      const productIds = items.map((i: any) => i.productId);
      const dbProducts = await tx.select().from(products).where(inArray(products.id, productIds));
      const pMap = new Map();
      dbProducts.forEach(p => pMap.set(p.id, p));

      const itemsToInsert = [];
      const reservationsToInsert = [];

      for (const item of items) {
        const prod = pMap.get(item.productId);
        if (!prod) throw new Error("Produto não encontrado");
        
        let unitPriceString = prod.salePriceA || prod.priceA;
        if (priceTable === "B") unitPriceString = prod.salePriceB || prod.priceB;
        
        const originalPrice = parseFloat(unitPriceString as string);
        const sellPrice = item.unitPrice ? parseFloat(item.unitPrice) : originalPrice;
        const lineTotal = sellPrice * item.quantity;
        const lineDiscount = Math.max(0, (originalPrice - sellPrice) * item.quantity);
        const productFreight = parseFloat(String(prod.ivaPercentage || "0")) || 0;
        const itemIvaAmount = Number.isFinite(Number(item.totalFreight))
          ? Number(item.totalFreight)
          : Number.isFinite(Number(item.freightAmount))
            ? Number(item.freightAmount) * item.quantity
            : productFreight * item.quantity;
        
        const unitCostStr = prod.costPrice || "0";
        const unitCost = parseFloat(String(unitCostStr));
        const totalCost = unitCost * item.quantity;
        const profitAmt = lineTotal - totalCost;

        subtotalAmount += (originalPrice * item.quantity);
        discountAmount += lineDiscount;
        ivaAmount += itemIvaAmount;

        // Reserva atômica: só incrementa se houver saldo disponível, evitando corrida entre edições simultâneas.
        const reserveRes = await tx.execute(sql`
          UPDATE "stock_balances"
          SET "reserved_stock" = "reserved_stock" + ${item.quantity}
          WHERE "product_id" = ${item.productId}
          AND ("physical_stock" - "reserved_stock") >= ${item.quantity}
          RETURNING *
        `);
        if (reserveRes.length === 0) {
           throw new Error(`Estoque insuficiente para o produto ${prod.name}`);
        }
        const reservedBal: any = reserveRes[0];
        const physical = parseFloat(reservedBal.physical_stock);
        const newReserved = parseFloat(reservedBal.reserved_stock);
        const reserved = newReserved - item.quantity;

        itemsToInsert.push({
          id: uuidv4(),
          saleId: id,
          productId: item.productId,
          quantity: item.quantity,
          priceTable: priceTable || "A",
          unitPrice: sellPrice.toString(),
          unitCostAtSale: unitCost.toString(),
          totalCostAtSale: totalCost.toString(),
          profitAmount: profitAmt.toString(),
          discountAmount: lineDiscount.toString(),
          ivaAmount: itemIvaAmount.toString(),
          totalPrice: lineTotal.toString(),
        });

        reservationsToInsert.push({
           id: uuidv4(),
           saleId: id,
           productId: item.productId,
           quantity: item.quantity,
           status: "ACTIVE"
        });

        await tx.insert(stockMovements).values({
          id: uuidv4(),
          productId: item.productId,
          movementType: "EDIT_SALE_RESERVE_STOCK",
          quantity: item.quantity,
          userId: req.user!.userId,
          referenceId: id,
          beforePhysical: physical,
          afterPhysical: physical,
          beforeReserved: reserved,
          afterReserved: newReserved,
          notes: "Reserva de estoque para edição de nota",
        });
      }

      await tx.insert(saleItems).values(itemsToInsert);
      await tx.insert(stockReservations).values(reservationsToInsert);

      const effectiveFreightAmount = Number.isFinite(Number(freightAmount)) ? Number(freightAmount) : ivaAmount;
      const saleLevelDiscount = Number.isFinite(Number(requestedDiscountAmount)) ? Math.min(Math.max(Number(requestedDiscountAmount), 0), subtotalAmount) : discountAmount;
      const totalAmount = subtotalAmount - saleLevelDiscount + effectiveFreightAmount;

      // Limite de crédito na edição (ignora a própria venda no cálculo do saldo em aberto).
      if (customerId) {
        const custRows = await tx.select({ creditLimit: customers.creditLimit, name: customers.name }).from(customers).where(eq(customers.id, customerId)).limit(1);
        const creditLimit = Number(custRows[0]?.creditLimit || 0);
        if (creditLimit > 0) {
          const outstanding = await getCustomerOutstanding(tx, customerId, id);
          if (outstanding + totalAmount > creditLimit + 0.01) {
            const available = Math.max(0, creditLimit - outstanding);
            throw new Error(`Limite de crédito excedido para ${custRows[0]?.name || "o cliente"}. Limite: ${creditLimit.toFixed(2)} | Em aberto: ${outstanding.toFixed(2)} | Disponível: ${available.toFixed(2)} | Esta venda: ${totalAmount.toFixed(2)}.`);
          }
        }
      }

      const updatedSale = await tx.update(sales).set({
        customerId: customerId || null,
        observations: observations || "",
        priceTable,
        subtotalAmount: subtotalAmount.toString(),
        ivaAmount: effectiveFreightAmount.toString(),
        discountAmount: saleLevelDiscount.toString(),
        totalAmount: totalAmount.toString(),
        fulfillmentStatus: normalizeFulfillmentStatus(fulfillmentStatus),
        deliveryScheduledAt: deliveryScheduledAt ? new Date(String(deliveryScheduledAt)) : null,
        deliveryNotes: deliveryNotes ? String(deliveryNotes).trim() : null,
        dueDate: dueDate ? new Date(String(dueDate)) : null,
      }).where(eq(sales.id, id)).returning();

      // A edição apagou as alocações de lote (saleItemLots). Recalcula o lotStatus a partir do estado
      // atual: produto com lote obrigatório volta a PENDING (precisa re-alocar em Vendas Realizadas antes
      // de entregar) — antes o lotStatus ficava COMPLETE velho e a entrega baixava o físico sem baixar o
      // lote, descolando a soma dos lotes do estoque.
      await recalculateSaleLotStatus(tx, id);

      // Sem isso, editar o total de uma venda que já virou pedido da loja deixava
      // store_orders.totalAmount (e o valor mostrado/cobrado do cliente) desatualizado —
      // era o único endpoint de mutação de venda que não chamava esse sync.
      await syncStoreOrderFromSale(tx, id, req.user!.userId);

      return updatedSale[0];
    });

    await logAction(req.user!.userId, "EDIT_SALE", "sales", finalSale.id, null, { totalAmount: parseFloat(String(finalSale.totalAmount)) });
    res.json({ success: true, saleId: finalSale.id });
  } catch (error: any) {
    console.error(error);
    res.status(400).json({ error: error.message });
  }
});

router.post("/", requirePermission("sales", "create"), async (req: AuthRequest, res) => {
  try {
    const { customerId, priceTable, items, observations, freightAmount, discountAmount, lotAllocations, fulfillmentStatus, deliveryScheduledAt, deliveryNotes, dueDate } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: "Carrinho vazio" });
    }

    const saleId = uuidv4();
    const dueDateValue = dueDate ? new Date(String(dueDate)) : null;
    let totalAmount = 0;
    let ivaAmount = 0;
    let subtotalAmount = 0;
    const normalizedLots = normalizeLotAllocations(lotAllocations);
    const requestedFulfillmentStatus = normalizeFulfillmentStatus(fulfillmentStatus);
    const scheduledDate = deliveryScheduledAt ? new Date(String(deliveryScheduledAt)) : null;

    const finalSale = await db.transaction(async (tx) => {
      const saleItemsToInsert: any[] = [];
      const stockMovementsToInsert: any[] = [];
      const requiredLotsByProduct = new Map<string, number>();

      // Busca todos os produtos do carrinho numa query só (em vez de 1 SELECT por item) —
      // são só leituras, nenhum item do laço abaixo escreve na tabela products.
      const productIds = [...new Set(items.map((i: any) => i.productId))];
      const productRows = await tx.select().from(products).where(inArray(products.id, productIds as string[]));
      const productsById = new Map(productRows.map((p) => [p.id, p]));

      for (const item of items) {
        const quantity = Math.max(1, Math.floor(Number(item.quantity || 1)));
        const product = productsById.get(item.productId);
        if (!product) throw new Error(`Produto não encontrado: ${item.productId}`);

        let unitPriceStr = product.salePriceA;
        if (priceTable === "B") unitPriceStr = product.salePriceB;
        const unitPrice = parseFloat(String(unitPriceStr)) || 0;
        const productFreight = parseFloat(String(product.ivaPercentage)) || 0;

        const updateResult = await tx.execute(sql`
          UPDATE "stock_balances" 
          SET "reserved_stock" = "reserved_stock" + ${quantity}
          WHERE "product_id" = ${item.productId} 
          AND ("physical_stock" - "reserved_stock") >= ${quantity}
          RETURNING *
        `);

        if (updateResult.length === 0) {
          throw new Error(`Estoque insuficiente ou falha de concorrência para o item: ${product.name}`);
        }

        const bal: any = updateResult[0];
        stockMovementsToInsert.push({
           id: uuidv4(),
           productId: item.productId,
           quantity,
           userId: req.user!.userId,
           movementType: "RESERVE_SALE",
           beforePhysical: parseFloat(bal.physical_stock),
           afterPhysical: parseFloat(bal.physical_stock),
           beforeReserved: parseFloat(bal.reserved_stock) - quantity,
           afterReserved: parseFloat(bal.reserved_stock),
           referenceId: saleId,
           reason: "Nova Venda - Reserva"
        });

        const lineTotal = quantity * unitPrice;
        const lineIva = Number.isFinite(Number(item.totalFreight))
          ? Number(item.totalFreight)
          : Number.isFinite(Number(item.freightAmount))
            ? Number(item.freightAmount) * quantity
            : productFreight * quantity;
        const unitCost = parseFloat(String(product.costPrice || "0"));
        const totalCost = unitCost * quantity;
        const profitAmt = lineTotal - totalCost;

        subtotalAmount += lineTotal;
        ivaAmount += lineIva;
        if (product.requiresLot) requiredLotsByProduct.set(item.productId, (requiredLotsByProduct.get(item.productId) || 0) + quantity);
        
        saleItemsToInsert.push({
          id: uuidv4(),
          saleId,
          productId: item.productId,
          quantity,
          unitPrice: String(unitPrice),
          unitCostAtSale: String(unitCost),
          totalCostAtSale: String(totalCost),
          profitAmount: String(profitAmt),
          totalPrice: String(lineTotal),
          discountAmount: "0",
          ivaAmount: String(lineIva),
          priceTable: priceTable || "A"
        });
      }

      const effectiveFreightAmount = Number.isFinite(Number(freightAmount)) ? Number(freightAmount) : ivaAmount;
      const saleDiscountAmount = Math.min(Math.max(Number(discountAmount || 0), 0), subtotalAmount);
      totalAmount = Math.max(0, subtotalAmount - saleDiscountAmount) + effectiveFreightAmount;
      const lotStatus = calculateLotStatus(requiredLotsByProduct, normalizedLots);

      // Limite de crédito: só bloqueia venda A PRAZO (com vencimento definido) e cliente com limite (> 0).
      // O sinal de "a prazo" é o dueDate — a entrega (DELIVERED) NÃO significa que foi paga, então
      // usar fulfillment aqui deixava o fluxo padrão do PDV (deliveryStatus=DELIVERED) furar o limite.
      if (customerId && dueDateValue) {
        const custRows = await tx.select({ creditLimit: customers.creditLimit, name: customers.name }).from(customers).where(eq(customers.id, customerId)).limit(1);
        const creditLimit = Number(custRows[0]?.creditLimit || 0);
        if (creditLimit > 0) {
          const outstanding = await getCustomerOutstanding(tx, customerId);
          if (outstanding + totalAmount > creditLimit + 0.01) {
            const available = Math.max(0, creditLimit - outstanding);
            throw new Error(`Limite de crédito excedido para ${custRows[0]?.name || "o cliente"}. Limite: ${creditLimit.toFixed(2)} | Em aberto: ${outstanding.toFixed(2)} | Disponível: ${available.toFixed(2)} | Esta venda: ${totalAmount.toFixed(2)}.`);
          }
        }
      }

      const upperObservations = observations ? String(observations).toUpperCase() : null;
      const companyCurrencyRows = await tx.select({ defaultCurrency: companySettings.defaultCurrency }).from(companySettings).limit(1);
      const saleCurrency = companyCurrencyRows[0]?.defaultCurrency === "BRL" ? "BRL" : "USD";

      const insertedSaleRes = await tx.insert(sales).values({
        id: saleId,
        series: "001",
        customerId: customerId || null,
        userId: req.user!.userId,
        priceTable: priceTable || "A",
        subtotalAmount: String(subtotalAmount),
        discountAmount: String(saleDiscountAmount),
        ivaAmount: String(effectiveFreightAmount),
        totalAmount: String(totalAmount),
        currency: saleCurrency,
        orderStatus: "CONFIRMED",
        paymentStatus: "PENDING",
        fulfillmentStatus: requestedFulfillmentStatus === "DELIVERED" ? "PENDING" : requestedFulfillmentStatus,
        deliveryScheduledAt: scheduledDate,
        deliveryNotes: deliveryNotes ? String(deliveryNotes).trim() : null,
        dueDate: dueDateValue,
        lotStatus,
        observations: upperObservations
      }).returning();
      const insertedSale = insertedSaleRes[0];

      await tx.insert(saleItems).values(saleItemsToInsert);
      if (stockMovementsToInsert.length > 0) await tx.insert(stockMovements).values(stockMovementsToInsert);

      const lotRows: any[] = [];
      for (const lot of normalizedLots) {
        const itemRow = saleItemsToInsert.find((line) => line.productId === lot.productId);
        if (!itemRow) continue;
        lotRows.push({
          id: uuidv4(),
          saleId,
          saleItemId: itemRow.id,
          productId: itemRow.productId,
          lotNumber: lot.lotNumber,
          quantity: lot.quantity,
          createdBy: req.user!.userId,
        });
      }
      if (lotRows.length) await tx.insert(saleItemLots).values(lotRows);

      const reservationsToInsert = saleItemsToInsert.map((item: any) => ({
        id: uuidv4(),
        saleId,
        productId: item.productId,
        quantity: item.quantity,
        status: "ACTIVE"
      }));
      await tx.insert(stockReservations).values(reservationsToInsert);

      if (requestedFulfillmentStatus === "DELIVERED") {
        await markSaleDelivered(tx, saleId, req.user!.userId);
        insertedSale.fulfillmentStatus = "DELIVERED";
      }
      return { ...insertedSale, lotStatus, discountAmount: String(saleDiscountAmount), totalAmount: String(totalAmount), ivaAmount: String(effectiveFreightAmount) };
    });

    await logAction(req.user!.userId, "CREATE_SALE", "sales", finalSale.id, null, { totalAmount: parseFloat(String(finalSale.totalAmount)) });
    
    res.status(201).json({ 
      saleId: finalSale.id,
      series: finalSale.series,
      number: finalSale.number,
      subtotalAmount: finalSale.subtotalAmount,
      discountAmount: finalSale.discountAmount,
      ivaAmount: finalSale.ivaAmount,
      totalAmount: finalSale.totalAmount,
      currency: finalSale.currency,
      priceTable: finalSale.priceTable,
      orderStatus: finalSale.orderStatus,
      paymentStatus: finalSale.paymentStatus,
      fulfillmentStatus: finalSale.fulfillmentStatus,
      lotStatus: finalSale.lotStatus
    });
  } catch (error: any) {
    console.error(error);
    res.status(400).json({ error: error.message });
  }
});

router.post("/:id/cancel", requirePermission("sales", "cancel"), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: "Motivo do cancelamento é obrigatório." });
    }

    const s = await db.select().from(sales).where(eq(sales.id, id)).limit(1);
    if (s.length === 0) return res.status(404).json({ error: "Venda não encontrada." });

    await db.transaction(async (tx) => {
      await cancelSaleTx(tx, s[0], reason, req.user!.userId);
    });

    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});


// Perfis que podem autorizar uma devolução. Mesma lista de privilégio usada no
// resto do sistema — antes só aceitava o perfil chamado exatamente "admin", o
// que deixava o Master (dono) sem conseguir autorizar nada.
const AUTHORIZING_ROLES = ["master", "admin", "administrador", "administrator", "super admin", "super_admin"];

async function findAdminByPassword(adminPassword: string) {
  const adminUsers = await db.select({
    id: users.id,
    name: users.name,
    passwordHash: users.passwordHash,
    isActive: users.isActive,
    roleName: roles.name,
  })
  .from(users)
  .leftJoin(roles, eq(users.roleId, roles.id))
  .where(eq(users.isActive, true));

  for (const admin of adminUsers) {
    if (!AUTHORIZING_ROLES.includes(String(admin.roleName || "").trim().toLowerCase())) continue;
    const valid = await bcrypt.compare(adminPassword, admin.passwordHash);
    if (valid) return admin;
  }
  return null;
}

router.post("/:id/return", requirePermission("admin", "manage"), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { notes, adminPassword } = req.body || {};

    if (!adminPassword) {
      return res.status(400).json({ error: "Senha de autorização é obrigatória." });
    }
    if (!notes || !String(notes).trim()) {
      return res.status(400).json({ error: "Anotação/motivo da devolução é obrigatório." });
    }

    const admin = await findAdminByPassword(String(adminPassword));
    if (!admin) {
      return res.status(403).json({ error: "Senha de autorização inválida. Use a senha de login de um usuário Master ou Administrador." });
    }

    const saleRows = await db.select().from(sales).where(eq(sales.id, id)).limit(1);
    if (!saleRows.length) return res.status(404).json({ error: "Venda não encontrada." });
    const sale = saleRows[0];

    if (["CANCELED", "CANCELLED", "RETURNED"].includes(sale.orderStatus) || sale.paymentStatus === "REFUNDED") {
      return res.status(400).json({ error: "Esta venda já foi cancelada/devolvida." });
    }
    await db.transaction(async (tx) => {
      // Relê e trava a venda AQUI dentro — a checagem acima rodou fora da transação, sem lock.
      // Duas devoluções quase simultâneas (duplo clique, retry) passavam as duas por aquela checagem
      // e cada uma chamava reverseSaleMovements, estornando o mesmo dinheiro duas vezes. Com o lock,
      // a segunda espera a primeira comitar e cai neste mesmo guard, já vendo RETURNED.
      const [sale] = await tx.select().from(sales).where(eq(sales.id, id)).limit(1).for("update");
      if (!sale) throw new Error("Venda não encontrada.");
      if (["CANCELED", "CANCELLED", "RETURNED"].includes(sale.orderStatus) || sale.paymentStatus === "REFUNDED") {
        throw new Error("Esta venda já foi cancelada/devolvida.");
      }
      const lines = await tx.select().from(saleItems).where(eq(saleItems.saleId, id));
      const wasDelivered = sale.fulfillmentStatus === "DELIVERED";
      for (const line of lines) {
        const balRows = await tx.select().from(stockBalances).where(eq(stockBalances.productId, line.productId)).for("update").limit(1);
        const qty = Number(line.quantity || 0);
        if (balRows.length) {
          const oldPhys = Number(balRows[0].physicalStock || 0);
          const oldRes = Number(balRows[0].reservedStock || 0);
          const newPhys = wasDelivered ? oldPhys + qty : oldPhys;
          const newRes = wasDelivered ? oldRes : Math.max(0, oldRes - qty);
          await tx.update(stockBalances).set({ physicalStock: newPhys, reservedStock: newRes, updatedAt: new Date() }).where(eq(stockBalances.productId, line.productId));
          await tx.insert(stockMovements).values({
            id: uuidv4(),
            productId: line.productId,
            quantity: wasDelivered ? qty : -qty,
            userId: req.user!.userId,
            movementType: wasDelivered ? "RETURN_SALE" : "RETURN_RESERVED_SALE",
            referenceId: id,
            beforePhysical: oldPhys,
            afterPhysical: newPhys,
            beforeReserved: oldRes,
            afterReserved: newRes,
            reason: "Devolução de venda",
            notes: String(notes).trim(),
          });
        }
      }

      if (!wasDelivered) {
        await tx.update(stockReservations).set({ status: "CANCELED" }).where(eq(stockReservations.saleId, id));
      } else {
        // Venda já havia saído: devolve o saldo aos lotes alocados.
        await restoreSaleLots(tx, id);
        // Devolve o custo consumido como camada nova (margem real volta ao lugar).
        await restoreSaleLayers(tx, id);
      }

      const itemIds = lines.map((line) => line.id);
      if (itemIds.length > 0) {
        await tx.update(productSerials)
          .set({ status: "AVAILABLE", saleItemId: null, updatedAt: new Date() })
          .where(inArray(productSerials.saleItemId, itemIds));
      }

      const salePayments = await tx.select().from(payments).where(and(eq(payments.saleId, id), eq(payments.status, "COMPLETED"))).orderBy(desc(payments.createdAt));
      for (const pmt of salePayments) {
        await tx.update(payments).set({ status: "REFUNDED" }).where(eq(payments.id, pmt.id));
      }

      // Só o dinheiro sai da gaveta do caixa na devolução (PIX/cartão saem das contas via estorno abaixo).
      const cashRefundUsd = salePayments.filter((p) => p.paymentMethod === "CASH").reduce((sum, pmt) => sum + Number(pmt.amountUsd || 0), 0);
      // O caixa do pagamento original só serve se ainda estiver ABERTO e for do próprio operador;
      // senão o estorno em dinheiro vai pro caixa aberto de quem está fazendo a devolução (evita
      // lançar sangria no caixa fechado/de outra pessoa e culpar o operador errado na conferência).
      let cashRegisterId: string | undefined;
      const candidateRegId = salePayments[0]?.cashRegisterId;
      if (candidateRegId) {
        const [reg] = await tx.select().from(cashRegisters).where(eq(cashRegisters.id, candidateRegId)).limit(1);
        if (reg && reg.status === "OPEN" && reg.userId === req.user!.userId) cashRegisterId = candidateRegId;
      }
      if (!cashRegisterId && cashRefundUsd > 0) {
        const openRegister = await tx.select().from(cashRegisters)
          .where(and(eq(cashRegisters.userId, req.user!.userId), eq(cashRegisters.status, "OPEN")))
          .limit(1);
        cashRegisterId = openRegister[0]?.id;
      }

      if (cashRegisterId && cashRefundUsd > 0) {
        await tx.insert(cashMovements).values({
          cashRegisterId,
          type: "REFUND",
          amountUsd: `-${cashRefundUsd.toFixed(2)}`,
          description: `Devolução venda ${sale.series}-${sale.number}`,
          referenceId: id,
          createdBy: req.user!.userId,
        });
      }

      // Estorna o dinheiro das contas financeiras (todas as formas de pagamento).
      await reverseSaleMovements(tx, id, req.user!.userId);

      await tx.update(sales).set({
        orderStatus: "RETURNED",
        paymentStatus: salePayments.length > 0 ? "REFUNDED" : sale.paymentStatus,
        fulfillmentStatus: "RETURNED",
        cancelReason: String(notes).trim(),
      }).where(eq(sales.id, id));

      // Pedido da loja ligado a essa venda (se houver) precisa refletir a
      // devolução também — sem isso ele ficava "Confirmado" pra sempre mesmo
      // com o dinheiro já estornado.
      await syncStoreOrderFromSale(tx, id, req.user!.userId);

      const ret = await tx.insert(saleReturns).values({
        id: uuidv4(),
        saleId: id,
        returnedBy: req.user!.userId,
        authorizedBy: admin.id,
        notes: String(notes).trim(),
        totalAmountUsd: String(sale.totalAmount || "0"),
        status: "COMPLETED",
      }).returning();

      await tx.insert(auditLogs).values({
        id: uuidv4(),
        userId: req.user!.userId,
        action: "RETURN_SALE",
        tableName: "sales",
        recordId: id,
        oldValues: JSON.stringify({ orderStatus: sale.orderStatus, paymentStatus: sale.paymentStatus, fulfillmentStatus: sale.fulfillmentStatus }),
        newValues: JSON.stringify({ returnId: ret[0]?.id, adminId: admin.id, adminName: admin.name, notes: String(notes).trim(), totalAmountUsd: sale.totalAmount }),
      });
    });

    await createNotification(db, {
      type: "SALE_RETURNED", title: "Venda devolvida",
      message: `Venda ${sale.series}-${String(sale.number).padStart(6, "0")} devolvida (${formatBrl(Number(sale.totalAmount || 0))}) — autorizado por ${admin.name}.`,
      link: "/sales",
    });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Erro ao processar devolução." });
  }
});

export default router;
