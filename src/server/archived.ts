import { Router } from "express";
import { db } from "../db";
import { products, customers, users, productGroups, productSubgroups, shelves } from "../db/schema";
import { requireAuth, requirePermission, AuthRequest } from "./authMiddleware";
import { eq, and, isNotNull, ne } from "drizzle-orm";

const router = Router();
router.use(requireAuth);
router.use(requirePermission("admin", "manage")); // Only admin can view archived

router.get("/:type", async (req: AuthRequest, res) => {
  try {
    const type = req.params.type;
    let list: any[] = [];

    if (type === "products") {
       list = await db.select().from(products)
         .where(and(eq(products.isActive, false), isNotNull(products.deletedAt)))
         .orderBy(products.name, products.sku);
    } else if (type === "customers") {
       list = await db.select().from(customers)
         .where(and(eq(customers.isActive, false), isNotNull(customers.deletedAt)))
         .orderBy(customers.name);
    } else if (type === "users") {
       const isMaster = String(req.user?.roleName || "").toLowerCase() === "master";
       list = await db.select().from(users)
         .where(isMaster ? and(eq(users.isActive, false), isNotNull(users.deletedAt)) : and(eq(users.isActive, false), isNotNull(users.deletedAt), ne(users.username, "master")))
         .orderBy(users.name);
    } else if (type === "groups") {
       list = await db.select().from(productGroups)
         .where(and(eq(productGroups.isActive, false), isNotNull(productGroups.deletedAt)))
         .orderBy(productGroups.name);
    } else if (type === "subgroups") {
       list = await db.select().from(productSubgroups)
         .where(and(eq(productSubgroups.isActive, false), isNotNull(productSubgroups.deletedAt)))
         .orderBy(productSubgroups.name);
    } else if (type === "shelves") {
       list = await db.select().from(shelves)
         .where(and(eq(shelves.isActive, false), isNotNull(shelves.deletedAt)))
         .orderBy(shelves.name);
    } else {
       return res.status(400).json({ error: "Tipo inválido." });
    }

    res.json({ data: list });
  } catch (err: any) {
    console.error("Erro em /api/archived/:type", {
      type: req.params.type,
      message: err.message,
      stack: err.stack
    });

    res.status(500).json({
      error: "Erro interno",
      details: process.env.NODE_ENV !== "production" ? err.message : undefined
    });
  }
});

export default router;
