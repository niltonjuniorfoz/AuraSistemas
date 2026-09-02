import { Router } from "express";
import { db } from "../db";
import { users, roles, sales, stockMovements } from "../db/schema";
import { requireAuth, requirePermission, AuthRequest } from "./authMiddleware";
import { eq, isNull, sql, and, ne } from "drizzle-orm";
import { logAction } from "./audit";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";
import { toUpperText, toLowerText, handleDbError } from "./utils";
import { withApiCache } from "./cache";

const router = Router();
router.use(requireAuth);

function isMasterRole(roleName?: string) {
  return String(roleName || "").toLowerCase() === "master";
}

// Comissão em percentual, entre 0 e 100, com 2 casas.
function clampCommission(value: unknown): string {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return "0";
  return (Math.min(Math.max(n, 0), 100)).toFixed(2);
}

function nonMasterUserFilter(req: AuthRequest) {
  return isMasterRole(req.user?.roleName)
    ? and(eq(users.isActive, true), isNull(users.deletedAt))
    : and(eq(users.isActive, true), isNull(users.deletedAt), ne(roles.name, "Master"));
}

async function isTargetMaster(userId: string) {
  const target = await db.select({ roleName: roles.name })
    .from(users)
    .leftJoin(roles, eq(users.roleId, roles.id))
    .where(eq(users.id, userId))
    .limit(1);
  return String(target[0]?.roleName || "").toLowerCase() === "master";
}

// Papéis privilegiados só podem ser atribuídos pelo Master. Impede que quem tem
// permissão "gerenciar usuários" se auto-promova a Admin/Master.
function isPrivilegedRoleName(roleName?: string | null) {
  return ["master", "admin", "administrador", "administrator"].includes(String(roleName || "").trim().toLowerCase());
}

async function roleNameById(roleId: string) {
  if (!roleId) return null;
  const row = await db.select({ name: roles.name }).from(roles).where(eq(roles.id, roleId)).limit(1);
  return row[0]?.name || null;
}


router.get("/", requirePermission("user", "manage"), async (req: AuthRequest, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;

    const filter = nonMasterUserFilter(req);
    const [list, countResult] = await Promise.all([
      db.select({
        id: users.id,
        name: users.name,
        username: users.username,
        email: users.email,
        isActive: users.isActive,
        roleName: roles.name,
        roleId: users.roleId,
        commissionPercent: users.commissionPercent,
        createdAt: users.createdAt,
      })
      .from(users)
      .leftJoin(roles, eq(users.roleId, roles.id))
      .where(filter)
      .limit(limit)
      .offset(offset),
      db.select({ count: sql<number>`count(*)` })
        .from(users)
        .leftJoin(roles, eq(users.roleId, roles.id))
        .where(filter),
    ]);
    const total = Number(countResult[0].count);

    res.json({ data: list, total, page, limit });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/roles", requirePermission("user", "manage"), async (req: AuthRequest, res) => {
  try {
    const includeMaster = isMasterRole(req.user?.roleName);
    const list = await withApiCache(`users:roles:${includeMaster ? "all" : "no-master"}`, 5 * 60 * 1000, async () => {
      const query = db.select({ id: roles.id, name: roles.name, description: roles.description }).from(roles);
      return includeMaster ? await query : await query.where(ne(roles.name, "Master"));
    });
    res.json({ data: list });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/", requirePermission("user", "manage"), async (req: AuthRequest, res) => {
  try {
    const id = uuidv4();
    const { name: rawName, username: rawUsername, email: rawEmail, password, roleId } = req.body;
    
    // Normalization
    const name = toUpperText(rawName);
    const username = toLowerText(rawUsername);
    const email = toLowerText(rawEmail);
    
    const fields: Record<string, string> = {};
    if (!name) fields.name = "Nome é obrigatório.";
    if (!username) fields.username = "Username é obrigatório.";
    if (!password) fields.password = "Senha é obrigatória ao criar.";
    if (!roleId) fields.roleId = "Perfil é obrigatório.";
    
    if (email) {
       const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
       if (!emailRegex.test(email)) {
          fields.email = "Formato de e-mail inválido.";
       }
    }
    
    if (Object.keys(fields).length > 0) {
       return res.status(400).json({ error: "Dados inválidos.", fields });
    }

    // Só o Master pode criar usuários com papel privilegiado (Admin/Master).
    if (isPrivilegedRoleName(await roleNameById(roleId)) && !isMasterRole(req.user?.roleName)) {
       return res.status(403).json({ error: "Apenas o Master pode criar usuários com perfil administrativo.", fields: { roleId: "Perfil não permitido." } });
    }

    if (username) {
       const oldUser = await db.select().from(users).where(eq(users.username, username)).limit(1);
       if (oldUser.length > 0) {
          if (oldUser[0].isActive) {
             return res.status(409).json({ error: "Já existe um usuário com este username.", fields: { username: "Username já está em uso." } });
          } else {
             return res.status(409).json({ error: "Já existe um usuário arquivado com este username. Restaure ou exclua definitivamente o usuário antigo.", fields: { username: "Username em uso por usuário arquivado." } });
          }
       }
    }
    
    const passwordHash = await bcrypt.hash(password, 10);
    const commissionPercent = clampCommission(req.body?.commissionPercent);

    await db.insert(users).values({ id, name: name!, username: username!, email, passwordHash, roleId, commissionPercent });
    await logAction(req.user!.userId, "CREATE", "users", id, null, { name, username, email, roleId, commissionPercent });
    res.status(201).json({ id });
  } catch (error: any) {
    res.status(400).json(handleDbError(error, { username: "Nome de usuário já existe.", email: "Email já está em uso." }));
  }
});

router.put("/:id", requirePermission("user", "manage"), async (req: AuthRequest, res) => {
  try {
    const id = req.params.id;
    if (await isTargetMaster(id) && !isMasterRole(req.user?.roleName)) {
      return res.status(403).json({ error: "Este usuário protegido não pode ser alterado." });
    }
    const { name: rawName, username: rawUsername, email: rawEmail, roleId, isActive, password } = req.body;
    
    // Normalization
    const name = toUpperText(rawName);
    const username = toLowerText(rawUsername);
    const email = toLowerText(rawEmail);
    
    const fields: Record<string, string> = {};
    if (!name) fields.name = "Nome é obrigatório.";
    if (!username) fields.username = "Username é obrigatório.";
    if (!roleId) fields.roleId = "Perfil é obrigatório.";
    
    if (email) {
       const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
       if (!emailRegex.test(email)) {
          fields.email = "Formato de e-mail inválido.";
       }
    }
    
    if (Object.keys(fields).length > 0) {
       return res.status(400).json({ error: "Dados inválidos.", fields });
    }

    // Só o Master pode promover alguém a um papel privilegiado (Admin/Master).
    if (isPrivilegedRoleName(await roleNameById(roleId)) && !isMasterRole(req.user?.roleName)) {
       return res.status(403).json({ error: "Apenas o Master pode atribuir perfil administrativo.", fields: { roleId: "Perfil não permitido." } });
    }

    // Check username uniqueness if changed
    const oldRec = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (username && username !== oldRec[0].username) {
        const dupUser = await db.select().from(users).where(eq(users.username, username)).limit(1);
        if (dupUser.length > 0) {
           if (dupUser[0].isActive) {
              return res.status(409).json({ error: "Já existe um usuário com este username.", fields: { username: "Username já está em uso." } });
           } else {
              return res.status(409).json({ error: "Já existe um usuário arquivado com este username. Restaure ou exclua definitivamente o usuário antigo.", fields: { username: "Username em uso por usuário arquivado." } });
           }
        }
    }

    let updates: any = { name: name!, username: username!, email, roleId, isActive, commissionPercent: clampCommission(req.body?.commissionPercent), updatedAt: new Date() };

    if (password) {
      updates.passwordHash = await bcrypt.hash(password, 10);
    }

    await db.update(users).set(updates).where(eq(users.id, id));
    // Nunca logar passwordHash cru — audit_logs.oldValues é lido por qualquer autenticado (ver /api/audit).
    const { passwordHash: _oldHash, ...oldRecSafe } = oldRec[0];
    await logAction(req.user!.userId, "UPDATE", "users", id, oldRecSafe, { name, username, email, roleId, isActive });
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json(handleDbError(error, { username: "Nome de usuário já existe.", email: "Email já está em uso." }));
  }
});

router.delete("/:id", requirePermission("user", "manage"), async (req: AuthRequest, res) => {
  try {
    const id = req.params.id;
    if (await isTargetMaster(id) && !isMasterRole(req.user?.roleName)) {
      return res.status(403).json({ error: "Este usuário protegido não pode ser arquivado." });
    }
    if (id === req.user?.userId) {
      return res.status(400).json({ error: "Você não pode arquivar seu próprio usuário." });
    }
    await db.update(users).set({ isActive: false, deletedAt: new Date(), updatedAt: new Date() }).where(eq(users.id, id));
    await logAction(req.user!.userId, "ARCHIVE", "users", id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete("/:id/hard-delete", requirePermission("admin", "manage"), async (req: AuthRequest, res) => {
  try {
    const id = req.params.id;
    if (await isTargetMaster(id)) {
      return res.status(403).json({ error: "Este usuário protegido não pode ser excluído definitivamente." });
    }

    // Check relationships
    const usedInSales = await db.select({ count: sql<number>`count(*)` }).from(sales).where(eq(sales.userId, id));
    if (Number(usedInSales[0].count) > 0) {
      return res.status(400).json({ error: "Este usuário possui histórico de vendas e não pode ser excluído definitivamente. Use a opção Arquivar." });
    }

    const usedInMovements = await db.select({ count: sql<number>`count(*)` }).from(stockMovements).where(eq(stockMovements.userId, id));
    if (Number(usedInMovements[0].count) > 0) {
      return res.status(400).json({ error: "Este usuário possui histórico de movimentações e não pode ser excluído. Use a opção Arquivar." });
    }

    await db.delete(users).where(eq(users.id, id));
    await logAction(req.user!.userId, "HARD_DELETE_SUCCESS", "users", id);
    res.json({ success: true });
  } catch (error: any) {
    await logAction(req.user!.userId, "HARD_DELETE_BLOCKED", "users", req.params.id, null, { error: error.message });
    res.status(500).json({ error: "Erro interno ao excluir registro." });
  }
});

router.patch("/:id/restore", requirePermission("admin", "manage"), async (req: AuthRequest, res) => {
  try {
    const id = req.params.id;
    if (await isTargetMaster(id) && !isMasterRole(req.user?.roleName)) {
      return res.status(403).json({ error: "Este usuário protegido não pode ser restaurado." });
    }
    await db.update(users).set({ isActive: true, deletedAt: null, updatedAt: new Date() }).where(eq(users.id, id));
    await logAction(req.user!.userId, "RESTORE", "users", id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
