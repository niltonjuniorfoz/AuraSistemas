import { Router } from "express";
import { db } from "../db";
import { expenses, expenseCategories } from "../db/schema";
import { requireAuth, requirePermission, AuthRequest } from "./authMiddleware";
import { eq, desc, and, gte, lte } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { dayStartUtc, dayEndUtc } from "../lib/dateRange";

export const router = Router();

router.get("/categories", requireAuth, async (req: AuthRequest, res) => {
  try {
    const categories = await db.select().from(expenseCategories).where(eq(expenseCategories.isActive, true));
    res.json(categories);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/categories", requireAuth, requirePermission("expenses", "manage"), async (req: AuthRequest, res) => {
  try {
    const { name, type } = req.body;
    const result = await db.insert(expenseCategories).values({
      id: uuidv4(),
      name,
      type: type || "FIXED",
    }).returning();
    res.json({ success: true, category: result[0] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/", requireAuth, requirePermission("expenses", "view"), async (req: AuthRequest, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    
    let conditions = [];
    if (dateFrom) conditions.push(gte(expenses.expenseDate, dayStartUtc(String(dateFrom))));
    if (dateTo) conditions.push(lte(expenses.expenseDate, dayEndUtc(String(dateTo))));

    const results = await db.select({
      id: expenses.id,
      categoryId: expenses.categoryId,
      categoryName: expenseCategories.name,
      categoryType: expenseCategories.type,
      description: expenses.description,
      expenseDate: expenses.expenseDate,
      amountUsd: expenses.amountUsd,
      paymentMethod: expenses.paymentMethod,
      notes: expenses.notes,
      isFixed: expenses.isFixed,
      dueDay: expenses.dueDay,
      isActive: expenses.isActive,
      recurrence: expenses.recurrence,
    })
    .from(expenses)
    .leftJoin(expenseCategories, eq(expenses.categoryId, expenseCategories.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(expenses.expenseDate));

    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/", requireAuth, requirePermission("expenses", "manage"), async (req: AuthRequest, res) => {
  try {
    let { categoryId, description, expenseDate, amountUsd, paymentMethod, notes, isFixed, recurrence, dueDay, isActive } = req.body;
    
    if (!categoryId) {
       const outrosCat = await db.select().from(expenseCategories).where(eq(expenseCategories.name, "OUTROS")).limit(1);
       if (outrosCat.length > 0) {
          categoryId = outrosCat[0].id;
       }
    }

    const result = await db.insert(expenses).values({
      id: uuidv4(),
      categoryId,
      description,
      expenseDate: new Date(expenseDate || Date.now()),
      amountUsd: amountUsd.toString(),
      paymentMethod,
      notes,
      isFixed,
      dueDay: dueDay ? Number(dueDay) : null,
      isActive: isActive !== undefined ? isActive : true,
      recurrence: recurrence || "NONE",
      createdBy: req.user!.userId,
    }).returning();
    res.json({ success: true, expense: result[0] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put("/:id", requireAuth, requirePermission("expenses", "manage"), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    let { categoryId, description, expenseDate, amountUsd, paymentMethod, notes, isFixed, recurrence, dueDay, isActive } = req.body;
    const updateData: any = { updatedAt: new Date() };
    
    if (categoryId === "") {
       const outrosCat = await db.select().from(expenseCategories).where(eq(expenseCategories.name, "OUTROS")).limit(1);
       if (outrosCat.length > 0) {
          categoryId = outrosCat[0].id;
       }
    }

    if (categoryId !== undefined) updateData.categoryId = categoryId;
    if (description !== undefined) updateData.description = description;
    if (expenseDate !== undefined) updateData.expenseDate = new Date(expenseDate);
    if (amountUsd !== undefined) updateData.amountUsd = amountUsd.toString();
    if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod;
    if (notes !== undefined) updateData.notes = notes;
    if (isFixed !== undefined) updateData.isFixed = isFixed;
    if (dueDay !== undefined) updateData.dueDay = dueDay ? Number(dueDay) : null;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (recurrence !== undefined) updateData.recurrence = recurrence;

    const result = await db.update(expenses).set(updateData).where(eq(expenses.id, id)).returning();
    res.json({ success: true, expense: result[0] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/:id", requireAuth, requirePermission("expenses", "manage"), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    await db.delete(expenses).where(eq(expenses.id, id));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
