import { Router } from "express";
import { db } from "../db";
import { productGroups, productSubgroups, products, productGroupsDraft } from "../db/schema";
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
    const result = await withApiCache(`groups:list:${req.originalUrl}`, 5 * 60 * 1000, async () => {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = (page - 1) * limit;

      const [list, subgroups, countResult] = await Promise.all([
        db.select().from(productGroups)
          .where(and(eq(productGroups.isActive, true), isNull(productGroups.deletedAt)))
          .orderBy(productGroups.name)
          .limit(limit).offset(offset),
        db.select().from(productSubgroups)
          .where(and(eq(productSubgroups.isActive, true), isNull(productSubgroups.deletedAt)))
          .orderBy(productSubgroups.name),
        db.select({ count: sql<number>`count(*)` }).from(productGroups)
          .where(and(eq(productGroups.isActive, true), isNull(productGroups.deletedAt))),
      ]);

      const groupsWithSubgroups = list.map(g => ({
         ...g,
         subgroups: subgroups.filter(s => s.groupId === g.id)
      }));
      const total = Number(countResult[0].count);

      return { data: groupsWithSubgroups, total, page, limit };
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/subgroups", async (req: AuthRequest, res) => {
  try {
    const result = await withApiCache(`groups:subgroups:${req.originalUrl}`, 5 * 60 * 1000, async () => {
      const list = await db.select({
        id: productSubgroups.id,
        name: productSubgroups.name,
        description: productSubgroups.description,
        groupId: productSubgroups.groupId,
        groupName: productGroups.name
      })
      .from(productSubgroups)
      .leftJoin(productGroups, eq(productSubgroups.groupId, productGroups.id))
      .where(and(eq(productSubgroups.isActive, true), isNull(productSubgroups.deletedAt)))
      .orderBy(productSubgroups.name);
      return { data: list };
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/subgroups", requirePermission("product", "manage"), async (req: AuthRequest, res) => {
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
    if (!data.groupId) fields.groupId = "Grupo é obrigatório.";
    if (Object.keys(fields).length > 0) return res.status(400).json({ error: "Dados inválidos.", fields });

    await db.insert(productSubgroups).values({ ...data, id });
    clearApiCache("groups:");
    await logAction(req.user!.userId, "CREATE", "product_subgroups", id, null, data);
    res.status(201).json({ id });
  } catch (error: any) {
    res.status(400).json(handleDbError(error, { name: "Já existe um subgrupo com este nome." }));
  }
});

router.put("/subgroups/:id", requirePermission("product", "manage"), async (req: AuthRequest, res) => {
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
    if (!data.groupId) fields.groupId = "Grupo é obrigatório.";
    if (Object.keys(fields).length > 0) return res.status(400).json({ error: "Dados inválidos.", fields });

    await db.update(productSubgroups).set({ ...data, updatedAt: new Date() }).where(eq(productSubgroups.id, id));
    clearApiCache("groups:");
    await logAction(req.user!.userId, "UPDATE", "product_subgroups", id, null, data);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json(handleDbError(error, { name: "Já existe um subgrupo com este nome." }));
  }
});

router.delete("/subgroups/:id", requirePermission("product", "manage"), async (req: AuthRequest, res) => {
  try {
    const id = req.params.id;
    await db.update(productSubgroups).set({ isActive: false, deletedAt: new Date(), updatedAt: new Date() }).where(eq(productSubgroups.id, id));
    clearApiCache("groups:");
    await logAction(req.user!.userId, "ARCHIVE", "product_subgroups", id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete("/subgroups/:id/hard-delete", requirePermission("admin", "manage"), async (req: AuthRequest, res) => {
  try {
    const id = req.params.id;

    const usedInProducts = await db.select({ count: sql<number>`count(*)` }).from(products).where(eq(products.subgroupId, id));
    if (Number(usedInProducts[0].count) > 0) {
      return res.status(400).json({ error: "Existem produtos vinculados a este subgrupo. Não é possível excluir definitivamente." });
    }

    await db.delete(productSubgroups).where(eq(productSubgroups.id, id));
    clearApiCache("groups:");
    await logAction(req.user!.userId, "HARD_DELETE_SUCCESS", "product_subgroups", id);
    res.json({ success: true });
  } catch (error: any) {
    await logAction(req.user!.userId, "HARD_DELETE_BLOCKED", "product_subgroups", req.params.id, null, { error: error.message });
    res.status(500).json({ error: "Erro interno ao excluir registro." });
  }
});

router.patch("/subgroups/:id/restore", requirePermission("admin", "manage"), async (req: AuthRequest, res) => {
  try {
    const id = req.params.id;
    await db.update(productSubgroups).set({ isActive: true, deletedAt: null, updatedAt: new Date() }).where(eq(productSubgroups.id, id));
    clearApiCache("groups:");
    await logAction(req.user!.userId, "RESTORE", "product_subgroups", id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
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

    await db.insert(productGroups).values({ ...data, id });
    clearApiCache("groups:");
    await logAction(req.user!.userId, "CREATE", "product_groups", id, null, data);
    res.status(201).json({ id });
  } catch (error: any) {
    res.status(400).json(handleDbError(error, { name: "Já existe um grupo com este nome." }));
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

    await db.update(productGroups).set({ ...data, updatedAt: new Date() }).where(eq(productGroups.id, id));
    clearApiCache("groups:");
    await logAction(req.user!.userId, "UPDATE", "product_groups", id, null, data);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json(handleDbError(error, { name: "Já existe um grupo com este nome." }));
  }
});

router.delete("/:id", requirePermission("product", "manage"), async (req: AuthRequest, res) => {
  try {
    const id = req.params.id;
    await db.update(productGroups).set({ isActive: false, deletedAt: new Date(), updatedAt: new Date() }).where(eq(productGroups.id, id));
    clearApiCache("groups:");
    await logAction(req.user!.userId, "ARCHIVE", "product_groups", id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete("/:id/hard-delete", requirePermission("admin", "manage"), async (req: AuthRequest, res) => {
  try {
    const id = req.params.id;

    const usedInProducts = await db.select({ count: sql<number>`count(*)` }).from(products).where(eq(products.groupId, id));
    if (Number(usedInProducts[0].count) > 0) {
      return res.status(400).json({ error: "Existem produtos vinculados a este grupo. Não é possível excluir definitivamente. Use Arquivar." });
    }

    const usedInSubgroups = await db.select({ count: sql<number>`count(*)` }).from(productSubgroups).where(eq(productSubgroups.groupId, id));
    if (Number(usedInSubgroups[0].count) > 0) {
      return res.status(400).json({ error: "Existem subgrupos vinculados a este grupo. Não é possível excluir definitivamente." });
    }

    const usedInDrafts = await db.select({ count: sql<number>`count(*)` }).from(productGroupsDraft).where(eq(productGroupsDraft.sourceGroupId, id));
    if (Number(usedInDrafts[0].count) > 0) {
      return res.status(400).json({ error: "Existem alterações de rascunho vinculadas a este grupo. Não é possível excluir definitivamente." });
    }

    await db.delete(productGroups).where(eq(productGroups.id, id));
    clearApiCache("groups:");
    await logAction(req.user!.userId, "HARD_DELETE_SUCCESS", "product_groups", id);
    res.json({ success: true });
  } catch (error: any) {
    await logAction(req.user!.userId, "HARD_DELETE_BLOCKED", "product_groups", req.params.id, null, { error: error.message });
    res.status(500).json({ error: "Erro interno ao excluir registro." });
  }
});

router.patch("/:id/restore", requirePermission("admin", "manage"), async (req: AuthRequest, res) => {
  try {
    const id = req.params.id;
    await db.update(productGroups).set({ isActive: true, deletedAt: null, updatedAt: new Date() }).where(eq(productGroups.id, id));
    clearApiCache("groups:");
    await logAction(req.user!.userId, "RESTORE", "product_groups", id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
