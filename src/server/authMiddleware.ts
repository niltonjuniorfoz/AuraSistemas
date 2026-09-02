import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { db } from "../db";
import { rolePermissions, permissions, users, roles } from "../db/schema";
import { and, eq } from "drizzle-orm";

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is missing from environment variables.");
}
const SECRET = process.env.JWT_SECRET;

const PERMISSION_CACHE_MAX_SIZE = 1000;
type PermissionCacheEntry = { allowed: boolean; expiresAt: number };
const permissionCache = new Map<string, PermissionCacheEntry>();
const permissionInflight = new Map<string, Promise<boolean>>();

function getPermissionCacheTtlMs() {
  const parsed = Number(process.env.PERMISSION_CACHE_TTL_MS || "120000");
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 120000;
}

function getCachedPermission(key: string) {
  const cached = permissionCache.get(key);
  if (!cached) return null;
  if (Date.now() > cached.expiresAt) {
    permissionCache.delete(key);
    return null;
  }
  return cached.allowed;
}

function isPrivilegedRole(roleName?: string | null) {
  const normalized = String(roleName || "").trim().toLowerCase();
  return ["master", "admin", "administrador", "administrator", "super admin", "super_admin"].includes(normalized);
}

function setCachedPermission(key: string, allowed: boolean) {
  const ttl = getPermissionCacheTtlMs();
  if (ttl <= 0) return;

  if (permissionCache.size >= PERMISSION_CACHE_MAX_SIZE) {
    const firstKey = permissionCache.keys().next().value;
    if (firstKey) permissionCache.delete(firstKey);
  }

  permissionCache.set(key, {
    allowed,
    expiresAt: Date.now() + ttl,
  });
}

// Reautenticação por senha restrita ao perfil "master" (mais estrita que isPrivilegedRole, que
// também aceita admin/administrador/etc). Pra ações que corrigem ou apagam dado financeiro fora
// do fluxo normal — devolução comum ainda usa a lista de admin, isto é só pro caso mais sensível.
export async function findMasterByPassword(password: string) {
  const candidates = await db.select({
    id: users.id, name: users.name, passwordHash: users.passwordHash,
    isActive: users.isActive, roleName: roles.name,
  }).from(users).leftJoin(roles, eq(users.roleId, roles.id)).where(eq(users.isActive, true));
  for (const c of candidates) {
    if (String(c.roleName || "").trim().toLowerCase() !== "master") continue;
    const valid = await bcrypt.compare(password, c.passwordHash);
    if (valid) return c;
  }
  return null;
}

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    roleId: string;
    roleName: string;
  };
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Token not provided" });

  const token = authHeader.split(" ")[1];
  try {
    const payload = jwt.verify(token, SECRET) as any;
    if (payload?.kind === "customer") {
      return res.status(401).json({ error: "Invalid token" });
    }
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

export function requirePermission(moduleName: string, actionName: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      if (isPrivilegedRole(req.user.roleName)) {
        return next();
      }

      const cacheKey = `${req.user.roleId}:${moduleName}:${actionName}`;
      const cachedPermission = getCachedPermission(cacheKey);

      if (cachedPermission === true) {
        return next();
      }

      if (cachedPermission === false) {
        return res.status(403).json({ error: "Forbidden: Missing permission" });
      }

      let permissionPromise = permissionInflight.get(cacheKey);
      if (!permissionPromise) {
        permissionPromise = db.select()
          .from(rolePermissions)
          .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
          .where(
            and(
              eq(rolePermissions.roleId, req.user.roleId),
              eq(permissions.module, moduleName),
              eq(permissions.action, actionName)
            )
          )
          .limit(1)
          .then((hasPerm) => {
            const allowed = hasPerm.length > 0;
            setCachedPermission(cacheKey, allowed);
            return allowed;
          })
          .finally(() => {
            permissionInflight.delete(cacheKey);
          });
        permissionInflight.set(cacheKey, permissionPromise);
      }

      const allowed = await permissionPromise;

      if (!allowed) {
        return res.status(403).json({ error: "Forbidden: Missing permission" });
      }

      next();
    } catch (err) {
      console.error("Error checking permissions:", err);
      return res.status(500).json({ error: "Server error" });
    }
  };
}
