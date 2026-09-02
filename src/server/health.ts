import { Router } from "express";
import { db } from "../db";
import { users, roles, permissions, rolePermissions, sales, deliveryPaymentOverrides } from "../db/schema";
import { eq, sql, and, ne } from "drizzle-orm";
import { requireAuth, requirePermission } from "./authMiddleware";

const router = Router();

// Liveness/readiness pública (sem login) — é nela que o health check do Render
// bate. Antes não existia rota "/" aqui: a chamada caía no catch-all do SPA e
// sempre devolvia 200 (a página do site), então o health check nunca detectava
// backend travado ou banco fora do ar. Faz um SELECT trivial pra confirmar que
// a conexão com o banco está de pé de verdade.
router.get("/", async (_req, res) => {
  try {
    await db.execute(sql`select 1`);
    res.json({ status: "ok", db: "connected", time: new Date().toISOString() });
  } catch (err: any) {
    res.status(503).json({ status: "error", db: "unreachable", error: err.message });
  }
});

router.get("/flow", requireAuth, requirePermission("admin", "manage"), async (req, res) => {
  try {
    const list = await db.select({
      id: sales.id,
      number: sales.number,
      fulfillmentStatus: sales.fulfillmentStatus,
      paymentStatus: sales.paymentStatus,
      authorizeReason: deliveryPaymentOverrides.reason,
      authorizerUsername: users.username
    }).from(sales)
      .leftJoin(deliveryPaymentOverrides, eq(sales.id, deliveryPaymentOverrides.saleId))
      .leftJoin(users, eq(users.id, deliveryPaymentOverrides.authorizedBy))
      .where(and(
        eq(sales.fulfillmentStatus, "DELIVERED"),
         ne(sales.paymentStatus, "PAID")
      ));
      
    res.json({
      deliveredNotPaid: list,
      deliveredNotPaidCount: list.length
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/db", requireAuth, requirePermission("admin", "manage"), async (req, res) => {
  try {
    // Check connection and simple query
    const userCount = await db.select({ count: sql<number>`count(*)` }).from(users);
    
    // permissions count
    const permCount = await db.select({ count: sql<number>`count(*)` }).from(permissions);
    
    const admin = await db.select().from(users).where(eq(users.username, "admin")).limit(1);
    
    let adminHasManageAdmin = false;
    let adminHasManageCustomer = false;
    let adminHasManageProduct = false;
    let adminHasManageUser = false;
    let adminHasSalesCreate = false;

    if (admin.length > 0) {
      const r_permissions = await db.select().from(rolePermissions).where(eq(rolePermissions.roleId, admin[0].roleId));
      const perms = await db.select().from(permissions);
      const permIds = r_permissions.map(r => r.permissionId);
      const userPerms = perms.filter(p => permIds.includes(p.id));
      
      adminHasManageAdmin = userPerms.some(p => p.module === "admin" && p.action === "manage");
      adminHasManageCustomer = userPerms.some(p => p.module === "customer" && p.action === "manage");
      adminHasManageProduct = userPerms.some(p => p.module === "product" && p.action === "manage");
      adminHasManageUser = userPerms.some(p => p.module === "user" && p.action === "manage");
      adminHasSalesCreate = userPerms.some(p => p.module === "sales" && p.action === "create");
    }

    res.json({
      status: "Ok",
      usersCount: Number(userCount[0].count),
      permissionsCount: Number(permCount[0].count),
      adminFound: admin.length > 0,
      adminHasManageAdmin,
      adminHasManageCustomer,
      adminHasManageProduct,
      adminHasManageUser,
      adminHasSalesCreate
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
