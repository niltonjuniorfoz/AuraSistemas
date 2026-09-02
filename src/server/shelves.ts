import { Router } from "express";
import { db } from "../db";
import { shelves, products } from "../db/schema";
import { requireAuth, requirePermission, AuthRequest } from "./authMiddleware";
import { eq, sql, and, isNull } from "drizzle-orm";
import { logAction } from "./audit";
import { v4 as uuidv4 } from "uuid";
import { toUpperText, handleDbError } from "./utils";
import { clearApiCache, withApiCache } from "./cache";

const router = Router();
router.use(requireAuth);

router.get("/", async (req: AuthRequest, res) => {
  try {
    const result = await withApiCache(`shelves:list:${req.originalUrl}`, 5 * 60 * 1000, async () => {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = (page - 1) * limit;

      const [list, countResult] = await Promise.all([
        db.select().from(shelves)
          .where(and(eq(shelves.isActive, true), isNull(shelves.deletedAt)))
          .orderBy(shelves.name)
          .limit(limit).offset(offset),
        db.select({ count: sql<number>`count(*)` }).from(shelves)
          .where(and(eq(shelves.isActive, true), isNull(shelves.deletedAt))),
      ]);
      const total = Number(countResult[0].count);

      return { data: list, total, page, limit };
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/", requirePermission("product", "manage"), async (req: AuthRequest, res) => {
  try {
    const id = uuidv4();
    const rawData = req.body;
    const data = {
      ...rawData,
      name: toUpperText(rawData.name),
      description: toUpperText(rawData.description)
    };
    
    const fields: Record<string, string> = {};
    if (!data.name) fields.name = "Nome é obrigatório.";
    if (Object.keys(fields).length > 0) return res.status(400).json({ error: "Dados inválidos.", fields });

    await db.insert(shelves).values({ ...data, id });
    clearApiCache("shelves:");
    await logAction(req.user!.userId, "CREATE", "shelves", id, null, data);
    res.status(201).json({ id });
  } catch (error: any) {
    res.status(400).json(handleDbError(error, { name: "Já existe uma prateleira com este código/nome." }));
  }
});

router.put("/:id", requirePermission("product", "manage"), async (req: AuthRequest, res) => {
  try {
    const id = req.params.id;
    const rawData = req.body;
    const data = {
      ...rawData,
      name: toUpperText(rawData.name),
      description: toUpperText(rawData.description)
    };
    
    const fields: Record<string, string> = {};
    if (!data.name) fields.name = "Nome é obrigatório.";
    if (Object.keys(fields).length > 0) return res.status(400).json({ error: "Dados inválidos.", fields });

    await db.update(shelves).set({ ...data, updatedAt: new Date() }).where(eq(shelves.id, id));
    clearApiCache("shelves:");
    await logAction(req.user!.userId, "UPDATE", "shelves", id, null, data);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json(handleDbError(error, { name: "Já existe uma prateleira com este código/nome." }));
  }
});

router.delete("/:id", requirePermission("product", "manage"), async (req: AuthRequest, res) => {
  try {
    const id = req.params.id;
    await db.update(shelves).set({ isActive: false, deletedAt: new Date(), updatedAt: new Date() }).where(eq(shelves.id, id));
    clearApiCache("shelves:");
    await logAction(req.user!.userId, "ARCHIVE", "shelves", id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete("/:id/hard-delete", requirePermission("admin", "manage"), async (req: AuthRequest, res) => {
  try {
    const id = req.params.id;

    const usedInProducts = await db.select({ count: sql<number>`count(*)` }).from(products).where(eq(products.shelfId, id));
    if (Number(usedInProducts[0].count) > 0) {
      return res.status(400).json({ error: "Existem produtos vinculados a esta prateleira. Não é possível excluir definitivamente." });
    }

    await db.delete(shelves).where(eq(shelves.id, id));
    clearApiCache("shelves:");
    await logAction(req.user!.userId, "HARD_DELETE_SUCCESS", "shelves", id);
    res.json({ success: true });
  } catch (error: any) {
    await logAction(req.user!.userId, "HARD_DELETE_BLOCKED", "shelves", req.params.id, null, { error: error.message });
    res.status(500).json({ error: "Erro interno ao excluir registro." });
  }
});

router.patch("/:id/restore", requirePermission("admin", "manage"), async (req: AuthRequest, res) => {
  try {
    const id = req.params.id;
    await db.update(shelves).set({ isActive: true, deletedAt: null, updatedAt: new Date() }).where(eq(shelves.id, id));
    clearApiCache("shelves:");
    await logAction(req.user!.userId, "RESTORE", "shelves", id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
