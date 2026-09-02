import { Router } from "express";
import { db } from "../db";
import { separationTasks, separationItems, sales, saleItems, products, shelves } from "../db/schema";
import { eq, and, desc, inArray, inArray as sqlInArray } from "drizzle-orm";
import { AuthRequest, requireAuth, requirePermission } from "./authMiddleware";
import { v4 as uuidv4 } from "uuid";

const router = Router();
router.use(requireAuth);

router.get("/queue", requirePermission("separation", "view"), async (req: AuthRequest, res) => {
  try {
    const list = await db.select({
      id: sales.id,
      series: sales.series,
      number: sales.number,
      fulfillmentStatus: sales.fulfillmentStatus,
      createdAt: sales.createdAt,
    })
    .from(sales)
    .where(inArray(sales.fulfillmentStatus, ["PENDING", "SEPARATING"]))
    .orderBy(desc(sales.createdAt))
    .limit(100);
    
    // fetch tasks for these sales
    let tasks: any[] = [];
    if (list.length > 0) {
       tasks = await db.select().from(separationTasks).where(inArray(separationTasks.saleId, list.map(s => s.id)));
    }
    
    const taskBySaleId = new Map(tasks.map((task) => [task.saleId, task]));
    const enriched = list.map(s => {
      const task = taskBySaleId.get(s.id);
      return {
        ...s,
        taskId: task?.id,
        taskStatus: task?.status,
        assignedTo: task?.assignedTo
      };
    }).filter(s => s.fulfillmentStatus === "SEPARATING" || (s.fulfillmentStatus === "PENDING" && !s.taskId)); // pending without tasks can be grabbed

    res.json(enriched);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/sales/:saleId/start", requirePermission("separation", "process"), async (req: AuthRequest, res) => {
  try {
    const { saleId } = req.params;
    const userId = req.user!.userId;
    
    // Check if task exists
    const existing = await db.select().from(separationTasks).where(eq(separationTasks.saleId, saleId)).limit(1);
    let taskId = "";
    if (existing.length > 0) {
      taskId = existing[0].id;
    } else {
      taskId = uuidv4();
      await db.transaction(async (tx) => {
         await tx.insert(separationTasks).values({
            id: taskId,
            saleId,
            assignedTo: userId,
            status: "IN_PROGRESS",
            startedAt: new Date()
         });
         
         const items = await tx.select().from(saleItems).where(eq(saleItems.saleId, saleId));
         if (items.length > 0) {
           await tx.insert(separationItems).values(items.map((item) => ({
              id: uuidv4(),
              separationTaskId: taskId,
              saleItemId: item.id,
              productId: item.productId,
              quantityExpected: item.quantity,
              quantitySeparated: 0,
              status: "PENDING" as const,
           })));
         }

         await tx.update(sales).set({ fulfillmentStatus: "SEPARATING" }).where(eq(sales.id, saleId));
      });
    }
    
    res.json({ taskId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/tasks/:taskId", requirePermission("separation", "process"), async (req: AuthRequest, res) => {
  try {
    const { taskId } = req.params;
    const task = await db.select().from(separationTasks).where(eq(separationTasks.id, taskId)).limit(1);
    if (task.length === 0) return res.status(404).json({ error: "Task not found" });
    
    const items = await db.select({
      id: separationItems.id,
      saleItemId: separationItems.saleItemId,
      productId: separationItems.productId,
      quantityExpected: separationItems.quantityExpected,
      quantitySeparated: separationItems.quantitySeparated,
      status: separationItems.status,
      productName: products.name,
      sku: products.sku,
      upc: products.upc,
      shelfName: shelves.name,
    })
    .from(separationItems)
    .leftJoin(products, eq(separationItems.productId, products.id))
    .leftJoin(shelves, eq(products.shelfId, shelves.id))
    .where(eq(separationItems.separationTaskId, taskId));
    
    res.json({ ...task[0], items });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/tasks/:taskId/items/:itemId/confirm", requirePermission("separation", "process"), async (req: AuthRequest, res) => {
  try {
    const { taskId, itemId } = req.params;
    const { quantity } = req.body;
    
    await db.update(separationItems).set({
      quantitySeparated: quantity,
      status: "SEPARATED",
      checkedBy: req.user!.userId,
      checkedAt: new Date()
    }).where(and(eq(separationItems.id, itemId), eq(separationItems.separationTaskId, taskId)));
    
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/tasks/:taskId/items/:itemId/divergence", requirePermission("separation", "process"), async (req: AuthRequest, res) => {
  try {
    const { taskId, itemId } = req.params;
    const { quantity, notes } = req.body;
    
    await db.update(separationItems).set({
      quantitySeparated: quantity,
      status: "DIVERGENT",
      checkedBy: req.user!.userId,
      checkedAt: new Date(),
      notes
    }).where(and(eq(separationItems.id, itemId), eq(separationItems.separationTaskId, taskId)));
    
    // mark task as divergent
    await db.update(separationTasks).set({ status: "DIVERGENT" }).where(eq(separationTasks.id, taskId));
    
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


router.post("/tasks/:taskId/cancel", requirePermission("separation", "process"), async (req: AuthRequest, res) => {
  try {
    const { taskId } = req.params;

    const task = await db.select().from(separationTasks).where(eq(separationTasks.id, taskId)).limit(1);
    if (task.length === 0) {
      return res.status(404).json({ error: "Separação não encontrada." });
    }

    if (["COMPLETED"].includes(task[0].status)) {
      return res.status(400).json({ error: "Separação já finalizada não pode ser cancelada por aqui." });
    }

    await db.transaction(async (tx) => {
      await tx.delete(separationItems).where(eq(separationItems.separationTaskId, taskId));
      await tx.delete(separationTasks).where(eq(separationTasks.id, taskId));

      await tx.update(sales)
        .set({ fulfillmentStatus: "PENDING" })
        .where(and(eq(sales.id, task[0].saleId), eq(sales.fulfillmentStatus, "SEPARATING")));
    });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/tasks/:taskId/complete", requirePermission("separation", "process"), async (req: AuthRequest, res) => {
  try {
    const { taskId } = req.params;
    
    // Check if task is already divergent, or all items are processed.
    const items = await db.select().from(separationItems).where(eq(separationItems.separationTaskId, taskId));
    
    const hasPending = items.some(i => i.status === "PENDING");
    if (hasPending) {
       return res.status(400).json({ error: "Cannot complete task with PENDING items." });
    }
    
    const hasDivergent = items.some(i => i.status === "DIVERGENT");
    
    await db.transaction(async (tx) => {
      const taskStatus = hasDivergent ? "DIVERGENT" : "COMPLETED";
      await tx.update(separationTasks).set({
        status: taskStatus,
        completedAt: new Date()
      }).where(eq(separationTasks.id, taskId));
      
      const task = await tx.select().from(separationTasks).where(eq(separationTasks.id, taskId)).limit(1);
      
      // We only move to SEPARATED if there are no divergences blocking it?
      // Actually we can move to SEPARATED and delivery guys might see it with warning, or we just allow them to deliver what was separated.
      await tx.update(sales).set({ fulfillmentStatus: "SEPARATED" }).where(eq(sales.id, task[0].saleId));
    });
    
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export { router as separationRouter };
