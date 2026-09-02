import { Router } from "express";
import { db } from "../db";
import { deliveryTasks, deliveryItems, sales, saleItems, products, shelves, productSerials, deliverySerials, stockBalances, stockReservations, stockMovements, auditLogs, customers, deliveryPaymentOverrides, users, roles } from "../db/schema";
import { eq, and, desc, inArray, sql } from "drizzle-orm";
import { AuthRequest, requireAuth, requirePermission } from "./authMiddleware";
import { consumeSaleLots } from "./lots";
import { consumeFifo } from "./costLayers";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";

const router = Router();
router.use(requireAuth);

async function assertSalePaidOrOverrideForDelivery(saleId: string) {
  const s = await db.select({
    id: sales.id,
    paymentStatus: sales.paymentStatus
  }).from(sales).where(eq(sales.id, saleId)).limit(1);

  if (s.length === 0) {
    throw new Error("Venda não encontrada.");
  }

  if (s[0].paymentStatus !== "PAID") {
    const override = await db.select().from(deliveryPaymentOverrides).where(eq(deliveryPaymentOverrides.saleId, saleId)).limit(1);
    if (override.length === 0) {
      const err: any = new Error("A entrega só pode ser iniciada após pagamento ou autorização administrativa.");
      err.statusCode = 400;
      throw err;
    }
  }

  return s[0];
}

router.get("/queue", requirePermission("delivery", "view"), async (req: AuthRequest, res) => {
  try {
    const list = await db.select({
      id: sales.id,
      series: sales.series,
      number: sales.number,
      fulfillmentStatus: sales.fulfillmentStatus,
      paymentStatus: sales.paymentStatus,
      createdAt: sales.createdAt,
      customerName: customers.name
    })
    .from(sales)
    .leftJoin(customers, eq(sales.customerId, customers.id))
    .where(
      inArray(sales.fulfillmentStatus, ["PENDING", "SEPARATED", "DELIVERING"])
    )
    .orderBy(desc(sales.createdAt))
    .limit(100);
    
    const saleIds = list.map((s) => s.id);
    const [overrides, tasks] = saleIds.length > 0
      ? await Promise.all([
          db.select().from(deliveryPaymentOverrides).where(inArray(deliveryPaymentOverrides.saleId, saleIds)),
          db.select().from(deliveryTasks).where(inArray(deliveryTasks.saleId, saleIds)),
        ])
      : [[], []];

    const taskBySaleId = new Map(tasks.map((task) => [task.saleId, task]));
    const overrideSaleIds = new Set(overrides.map((override) => override.saleId));
    
    const enriched = list.map(s => {
      const task = taskBySaleId.get(s.id);
      const isPaid = s.paymentStatus === "PAID";
      const hasOverride = overrideSaleIds.has(s.id);
      return {
        ...s,
        taskId: task?.id,
        taskStatus: task?.status,
        assignedTo: task?.assignedTo,
        paymentBlocked: !isPaid && !hasOverride,
        blockReason: !isPaid && !hasOverride ? "Aguardando pagamento para entrega" : undefined
      };
    }).filter(s => s.fulfillmentStatus !== "SEPARATING");

    res.json(enriched);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/sales/:saleId/start", requirePermission("delivery", "process"), async (req: AuthRequest, res) => {
  try {
    const { saleId } = req.params;
    const userId = req.user!.userId;
    
    await assertSalePaidOrOverrideForDelivery(saleId);
    
    // Check if task exists
    const existing = await db.select().from(deliveryTasks).where(eq(deliveryTasks.saleId, saleId)).limit(1);
    let taskId = "";
    if (existing.length > 0) {
      taskId = existing[0].id;
    } else {
      taskId = uuidv4();
      await db.transaction(async (tx) => {
         await tx.insert(deliveryTasks).values({
            id: taskId,
            saleId,
            assignedTo: userId,
            status: "IN_PROGRESS",
            startedAt: new Date()
         });
         
         const items = await tx.select().from(saleItems).where(eq(saleItems.saleId, saleId));
         if (items.length > 0) {
           await tx.insert(deliveryItems).values(items.map((item) => ({
              id: uuidv4(),
              deliveryTaskId: taskId,
              saleItemId: item.id,
              productId: item.productId,
              quantityExpected: item.quantity,
              quantityDelivered: 0,
              status: "PENDING" as const,
           })));
         }

         await tx.update(sales).set({ fulfillmentStatus: "DELIVERING" }).where(eq(sales.id, saleId));
      });
    }
    
    res.json({ taskId });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

router.post("/sales/:saleId/skip-separation", requirePermission("separation", "skip"), async (req: AuthRequest, res) => {
  try {
    const { saleId } = req.params;
    
    await assertSalePaidOrOverrideForDelivery(saleId);
    
    const s = await db.select().from(sales).where(eq(sales.id, saleId)).limit(1);
    if(s.length > 0 && s[0].fulfillmentStatus === "PENDING") {
      // create a PENDING delivery task without updating fulfillment yet, or update to SEPARATED?
      // "colocar venda em fulfillment_status = DELIVERING" but maybe keep it PENDING until start delivery.
      
      const existing = await db.select().from(deliveryTasks).where(eq(deliveryTasks.saleId, saleId)).limit(1);
      if (existing.length === 0) {
         const taskId = uuidv4();
         await db.transaction(async (tx) => {
           await tx.insert(deliveryTasks).values({
              id: taskId,
              saleId,
              status: "PENDING",
           });
           const items = await tx.select().from(saleItems).where(eq(saleItems.saleId, saleId));
           if (items.length > 0) {
             await tx.insert(deliveryItems).values(items.map((item) => ({
                id: uuidv4(),
                deliveryTaskId: taskId,
                saleItemId: item.id,
                productId: item.productId,
                quantityExpected: item.quantity,
                quantityDelivered: 0,
                status: "PENDING" as const,
             })));
           }
         });
      }
      res.json({ success: true });
    } else {
      res.status(400).json({ error: "Não é possível pular separação para esta venda." });
    }
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

router.get("/tasks/:taskId", requirePermission("delivery", "process"), async (req: AuthRequest, res) => {
  try {
    const { taskId } = req.params;
    const task = await db.select().from(deliveryTasks).where(eq(deliveryTasks.id, taskId)).limit(1);
    if (task.length === 0) return res.status(404).json({ error: "Task not found" });
    
    const items = await db.select({
      id: deliveryItems.id,
      saleItemId: deliveryItems.saleItemId,
      productId: deliveryItems.productId,
      quantityExpected: deliveryItems.quantityExpected,
      quantityDelivered: deliveryItems.quantityDelivered,
      status: deliveryItems.status,
      productName: products.name,
      sku: products.sku,
      upc: products.upc,
      hasSerialNumber: products.hasSerialNumber,
      shelfName: shelves.name,
    })
    .from(deliveryItems)
    .leftJoin(products, eq(deliveryItems.productId, products.id))
    .leftJoin(shelves, eq(products.shelfId, shelves.id))
    .where(eq(deliveryItems.deliveryTaskId, taskId));
    
    const allItemsIds = items.map(i => i.id);
    let serials: any[] = [];
    if (allItemsIds.length > 0) {
      serials = await db.select().from(deliverySerials).where(inArray(deliverySerials.deliveryItemId, allItemsIds));
    }

    res.json({ ...task[0], items: items.map(i => ({...i, scannedSerials: serials.filter(s => s.deliveryItemId === i.id)})) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/tasks/:taskId/items/:itemId/confirm", requirePermission("delivery", "process"), async (req: AuthRequest, res) => {
  try {
    const { taskId, itemId } = req.params;
    const { quantity } = req.body;
    
    const task = await db.select().from(deliveryTasks).where(eq(deliveryTasks.id, taskId)).limit(1);
    if(task.length > 0) {
      await assertSalePaidOrOverrideForDelivery(task[0].saleId);
    }

    // get product info
    const dItem = await db.select().from(deliveryItems).where(eq(deliveryItems.id, itemId)).limit(1);
    const prod = await db.select().from(products).where(eq(products.id, dItem[0].productId)).limit(1);
    
    if (prod[0].hasSerialNumber) {
       // Cannot confirm quantity directly, need to scan serials
       return res.status(400).json({ error: "Este produto exige leitura de número de série." });
    }
    
    await db.update(deliveryItems).set({
      quantityDelivered: quantity,
      status: "DELIVERED",
      checkedBy: req.user!.userId,
      checkedAt: new Date()
    }).where(and(eq(deliveryItems.id, itemId), eq(deliveryItems.deliveryTaskId, taskId)));
    
    res.json({ success: true });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

router.post("/tasks/:taskId/items/:itemId/scan-serial", requirePermission("delivery", "scan_serial"), async (req: AuthRequest, res) => {
  try {
    const { taskId, itemId } = req.params;
    const { serialNumber } = req.body;

    const task = await db.select().from(deliveryTasks).where(eq(deliveryTasks.id, taskId)).limit(1);
    if(task.length > 0) {
      await assertSalePaidOrOverrideForDelivery(task[0].saleId);
    }
    
    const dItem = await db.select().from(deliveryItems).where(eq(deliveryItems.id, itemId)).limit(1);
    if(dItem.length === 0) return res.status(404).json({ error: "Item not found" });

    // Trava a linha do serial pra serializar dois scans concorrentes do mesmo número (duas
    // tarefas de entrega diferentes escaneando o mesmo serial ao mesmo tempo) — sem isso, ambas
    // passam pela checagem de duplicidade abaixo antes de qualquer uma inserir, e o mesmo item
    // físico acaba reservado pra duas vendas.
    await db.transaction(async (tx) => {
      const s = await tx.select().from(productSerials)
        .where(and(eq(productSerials.productId, dItem[0].productId), eq(productSerials.serialNumber, serialNumber)))
        .for("update").limit(1);

      if (s.length === 0) throw Object.assign(new Error("Número de série não encontrado no sistema."), { statusCode: 400 });
      if (s[0].status !== "AVAILABLE") throw Object.assign(new Error("Número de série não está disponível (já vendido ou reservado)."), { statusCode: 400 });

      // Duplicidade pro MESMO item (re-scan) OU pra outro item/tarefa (double-claim concorrente).
      const alreadyScanned = await tx.select().from(deliverySerials).where(and(
        eq(deliverySerials.productId, dItem[0].productId),
        eq(deliverySerials.serialNumber, serialNumber)
      )).limit(1);
      if (alreadyScanned.length > 0) {
        const msg = alreadyScanned[0].deliveryItemId === itemId
          ? "Número de série já lido para este item."
          : "Número de série já foi lido em outra entrega.";
        throw Object.assign(new Error(msg), { statusCode: 400 });
      }

      await tx.insert(deliverySerials).values({
        id: uuidv4(),
        deliveryItemId: itemId,
        productId: dItem[0].productId,
        saleItemId: dItem[0].saleItemId,
        serialNumber,
        scannedBy: req.user!.userId
      });
    });

    res.json({ success: true });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

router.post("/sales/:saleId/authorize-unpaid", requirePermission("delivery", "view"), async (req: AuthRequest, res) => {
  try {
    const { saleId } = req.params;
    const { adminUsername, adminPassword, reason } = req.body;

    if (!adminUsername || !adminPassword || !reason) {
      return res.status(400).json({ error: "Usuário, senha e motivo são obrigatórios." });
    }

    const adminUser = await db.select({
      id: users.id,
      passwordHash: users.passwordHash,
      roleName: roles.name
    }).from(users).leftJoin(roles, eq(users.roleId, roles.id)).where(eq(users.username, adminUsername)).limit(1);
    if (adminUser.length === 0) {
      return res.status(401).json({ error: "Credenciais de autorização inválidas." });
    }

    const isValid = await bcrypt.compare(adminPassword, adminUser[0].passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: "Credenciais de autorização inválidas." });
    }

    if (adminUser[0].roleName?.toLowerCase() !== "admin") {
      return res.status(403).json({ error: "Este login não tem permissão para autorizar a entrega sem pagamento." });
    }

    await db.transaction(async (tx) => {
      await tx.insert(deliveryPaymentOverrides).values({
        saleId,
        authorizedBy: adminUser[0].id,
        reason,
        createdBy: req.user!.userId
      });

      await tx.insert(auditLogs).values({
        id: uuidv4(),
        userId: req.user!.userId,
        action: "AUTHORIZE_UNPAID_DELIVERY",
        tableName: "sales",
        recordId: saleId,
        newValues: JSON.stringify({ adminId: adminUser[0].id, reason })
      });
    });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/tasks/:taskId/complete", requirePermission("delivery", "complete"), async (req: AuthRequest, res) => {
  try {
    const { taskId } = req.params;
    
    const taskDetails = await db.select().from(deliveryTasks).where(eq(deliveryTasks.id, taskId)).limit(1);
    if(taskDetails.length > 0) {
      await assertSalePaidOrOverrideForDelivery(taskDetails[0].saleId);
    }

    const items = await db.select().from(deliveryItems).where(eq(deliveryItems.deliveryTaskId, taskId));
    const allItemIds = items.map(i => i.id);
    let allScannedSerials: any[] = [];
    if (allItemIds.length > 0) {
       allScannedSerials = await db.select().from(deliverySerials).where(inArray(deliverySerials.deliveryItemId, allItemIds));
    }
    
    const hasPendingOrDivergent = items.some(i => i.status === "PENDING" || i.status === "DIVERGENT");
    if (hasPendingOrDivergent) return res.status(400).json({ error: "Não é possível concluir com itens pendentes ou divergentes." });
    
    const task = await db.select().from(deliveryTasks).where(eq(deliveryTasks.id, taskId)).limit(1);
    const saleId = task[0].saleId;
    
    const s = await db.select().from(sales).where(eq(sales.id, saleId)).limit(1);
    const orderSt = s[0].paymentStatus === "PAID" ? "COMPLETED" : s[0].orderStatus;

    await db.transaction(async (tx) => {
       for (const item of items) {
          if (item.quantityDelivered > item.quantityExpected) {
             throw new Error("Quantidade entregue não pode ser maior que a quantidade esperada.");
          }
          if (item.quantityDelivered < item.quantityExpected) {
             throw new Error("Quantidade entregue menor que a esperada. Marque divergência para prosseguir."); // in this scope we assume full delivery for now
          }
          
          const prod = await tx.select().from(products).where(eq(products.id, item.productId)).limit(1);
          if (prod[0].hasSerialNumber) {
             const scannedCount = allScannedSerials.filter(v => v.deliveryItemId === item.id).length;
             if (item.quantityExpected !== scannedCount) {
                throw new Error(`Item ${prod[0].sku} exige ${item.quantityExpected} números de série, mas obteve ${scannedCount}.`);
             }
             
             // mark serials as sold — WHERE status='AVAILABLE' garante que, se outra tarefa já
             // vendeu esse serial numa corrida (duas entregas concluídas quase juntas), esta
             // falha em vez de sobrescrever silenciosamente o dono do item físico.
             const scannedForThis = allScannedSerials.filter(v => v.deliveryItemId === item.id);
             for (const sc of scannedForThis) {
                const sold = await tx.update(productSerials).set({ status: "SOLD", saleItemId: item.saleItemId })
                  .where(and(eq(productSerials.productId, item.productId), eq(productSerials.serialNumber, sc.serialNumber), eq(productSerials.status, "AVAILABLE")))
                  .returning({ id: productSerials.id });
                if (sold.length === 0) {
                  throw new Error(`Número de série ${sc.serialNumber} não está mais disponível — já foi entregue em outra tarefa.`);
                }
             }
          }
          
          // apply stock logic — FOR UPDATE trava contra outra transação lendo o mesmo saldo
          // antes deste UPDATE (lost-update: duas entregas do mesmo produto ao mesmo tempo).
          const bal = await tx.select().from(stockBalances).where(eq(stockBalances.productId, item.productId)).for("update").limit(1);
          
          if (!bal[0] || bal[0].reservedStock < item.quantityDelivered) {
             throw new Error(`Estoque reservado insuficiente para o item ${prod[0].sku || item.productId}`);
          }
          
          await tx.update(stockBalances).set({
            physicalStock: bal[0].physicalStock - item.quantityDelivered,
            reservedStock: bal[0].reservedStock - item.quantityDelivered
          }).where(eq(stockBalances.productId, item.productId));

          // CMP: consome camadas FIFO (custo da época da compra) — base da margem real.
          await consumeFifo(tx, item.productId, item.quantityDelivered, { saleId, reason: "SALE" });
          
          await tx.insert(stockMovements).values({
            id: uuidv4(),
            productId: item.productId,
            quantity: -item.quantityDelivered, // delivery is an outward movement
            userId: req.user!.userId,
            movementType: "OUT_DELIVERY",
            referenceId: saleId,
            beforePhysical: bal[0].physicalStock,
            afterPhysical: bal[0].physicalStock - item.quantityDelivered,
            beforeReserved: bal[0].reservedStock,
            afterReserved: bal[0].reservedStock - item.quantityDelivered,
            reason: "Delivery confirmation",
            notes: "DELIVERY"
          });
       }
       
       await tx.update(stockReservations).set({ status: "DELIVERED" }).where(eq(stockReservations.saleId, saleId));
       // Só entrega (baixa os lotes) se a alocação de lote estiver COMPLETA — senão os lotes baixam menos
       // que o físico e a soma dos lotes descola do estoque. Espelha o guard de markSaleDelivered.
       const saleLotRow = await tx.select({ lotStatus: sales.lotStatus }).from(sales).where(eq(sales.id, saleId)).limit(1);
       if (saleLotRow[0] && ["PENDING", "PARTIAL"].includes(String(saleLotRow[0].lotStatus))) {
         throw new Error("Venda com lote obrigatório ainda não totalmente alocado. Complete a alocação de lotes em Vendas Realizadas antes de entregar.");
       }
       // Baixa o saldo físico dos lotes alocados a esta venda (saída real).
       await consumeSaleLots(tx, saleId);

       await tx.update(deliveryTasks).set({ status: "COMPLETED", completedAt: new Date() }).where(eq(deliveryTasks.id, taskId));
       
       await tx.update(sales).set({ fulfillmentStatus: "DELIVERED", orderStatus: orderSt }).where(eq(sales.id, saleId));
       
       await tx.insert(auditLogs).values({
         id: uuidv4(),
         userId: req.user!.userId,
         action: orderSt === "COMPLETED" ? "DELIVER_SALE" : "DELIVER_UNPAID_AUTHORIZED",
         tableName: "sales",
         recordId: saleId,
       });

    });

    res.json({ success: true });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

export { router as deliveryRouter };
