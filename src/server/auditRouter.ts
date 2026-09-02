import { Router } from "express";
import { db } from "../db";
import { auditLogs, users, roles } from "../db/schema";
import { requireAuth, requirePermission, AuthRequest } from "./authMiddleware";
import { eq, desc, sql } from "drizzle-orm";

const router = Router();
router.use(requireAuth);
// Audit log crua (oldValues/newValues) pode conter dado sensível de qualquer tabela editada —
// nunca deixar aberto a qualquer autenticado, só quem já gerencia usuários.
router.use(requirePermission("user", "manage"));

function isMasterRole(roleName?: string | null) {
  const normalized = String(roleName || "").trim().toLowerCase();
  return ["master", "super admin", "super_admin", "superadmin"].includes(normalized);
}

const hideMasterLogsCondition = sql`lower(coalesce(${roles.name}, '')) not in ('master', 'super admin', 'super_admin', 'superadmin')`;

async function listRecentAuditLogs(req: AuthRequest, res: any) {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 10, 1), 100);
    const canSeeMasterLogs = isMasterRole(req.user?.roleName);
    
    let query = db.select({
      id: auditLogs.id,
      action: auditLogs.action,
      tableName: auditLogs.tableName,
      createdAt: auditLogs.createdAt,
      userId: auditLogs.userId,
      userName: users.name,
      recordId: auditLogs.recordId,
      oldValues: auditLogs.oldValues,
      newValues: auditLogs.newValues,
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.userId, users.id))
    .leftJoin(roles, eq(users.roleId, roles.id))
    .$dynamic();

    if (!canSeeMasterLogs) {
      query = query.where(hideMasterLogsCondition);
    }

    const logs = await query
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);

    res.json({ data: logs });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
}

router.get("/recent", listRecentAuditLogs);
router.get("/", listRecentAuditLogs);

export default router;
