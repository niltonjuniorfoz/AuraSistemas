import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "../db";
import { users, roles } from "../db/schema";
import { eq } from "drizzle-orm";
import { logAction } from "./audit";

const router = Router();
if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is missing from environment variables.");
}
const SECRET = process.env.JWT_SECRET;

type MeCacheEntry = { value: any; expiresAt: number };
const meCache = new Map<string, MeCacheEntry>();
const ME_CACHE_TTL_MS = Number(process.env.AUTH_ME_CACHE_TTL_MS || "300000");

// Limite de tentativas de login por IP+usuário (proteção contra força bruta).
const LOGIN_MAX_ATTEMPTS = Number(process.env.LOGIN_MAX_ATTEMPTS || "8");
const LOGIN_WINDOW_MS = Number(process.env.LOGIN_WINDOW_MS || "900000"); // 15 min
type LoginAttempt = { count: number; firstAt: number; blockedUntil: number };
const loginAttempts = new Map<string, LoginAttempt>();

function loginKey(req: any, username: string) {
  const fwd = req.headers["x-forwarded-for"];
  const ip = Array.isArray(fwd) ? fwd[0] : String(fwd || req.socket?.remoteAddress || "").split(",")[0].trim();
  return `${ip}:${String(username || "").toLowerCase()}`;
}

function checkLoginBlocked(key: string): number {
  const entry = loginAttempts.get(key);
  if (!entry) return 0;
  const now = Date.now();
  if (entry.blockedUntil > now) return Math.ceil((entry.blockedUntil - now) / 1000);
  if (now - entry.firstAt > LOGIN_WINDOW_MS) { loginAttempts.delete(key); return 0; }
  return 0;
}

function registerLoginFailure(key: string) {
  const now = Date.now();
  const entry = loginAttempts.get(key);
  if (!entry || now - entry.firstAt > LOGIN_WINDOW_MS) {
    loginAttempts.set(key, { count: 1, firstAt: now, blockedUntil: 0 });
    return;
  }
  entry.count += 1;
  if (entry.count >= LOGIN_MAX_ATTEMPTS) entry.blockedUntil = now + LOGIN_WINDOW_MS;
}

function clearLoginAttempts(key: string) {
  loginAttempts.delete(key);
}

function getCachedMe(userId: string) {
  const cached = meCache.get(userId);
  if (!cached) return null;
  if (Date.now() > cached.expiresAt) {
    meCache.delete(userId);
    return null;
  }
  return cached.value;
}

function setCachedMe(userId: string, value: any) {
  if (!Number.isFinite(ME_CACHE_TTL_MS) || ME_CACHE_TTL_MS <= 0) return;
  if (meCache.size > 1000) meCache.clear();
  meCache.set(userId, { value, expiresAt: Date.now() + ME_CACHE_TTL_MS });
}

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const attemptKey = loginKey(req, username);
    const blockedFor = checkLoginBlocked(attemptKey);
    if (blockedFor > 0) {
      return res.status(429).json({ error: `Muitas tentativas de login. Tente novamente em ${Math.ceil(blockedFor / 60)} min.` });
    }

    // Find user
    const usersResult = await db.select({
      id: users.id,
      name: users.name,
      username: users.username,
      email: users.email,
      passwordHash: users.passwordHash,
      isActive: users.isActive,
      roleId: users.roleId,
      roleName: roles.name,
    })
    .from(users)
    .leftJoin(roles, eq(users.roleId, roles.id))
    .where(eq(users.username, username))
    .limit(1);

    const user = usersResult[0];

    if (!user) {
      registerLoginFailure(attemptKey);
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: "Usuário inativo" });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      registerLoginFailure(attemptKey);
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    clearLoginAttempts(attemptKey);

    const token = jwt.sign(
      { userId: user.id, roleId: user.roleId, roleName: user.roleName },
      SECRET,
      { expiresIn: "8h" }
    );

    const forwardedFor = req.headers["x-forwarded-for"];
    const ip = Array.isArray(forwardedFor) ? forwardedFor[0] : String(forwardedFor || req.socket.remoteAddress || "").split(",")[0].trim();
    const userAgent = String(req.headers["user-agent"] || "");
    const deviceInfo = req.body?.deviceInfo || {};

    const responseUser = {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.roleName,
      roleName: user.roleName,
      roleKey: user.roleName?.toLowerCase()
    };
    setCachedMe(user.id, responseUser);

    res.json({
      token,
      user: responseUser
    });

    // Auditoria não deve travar o login. Se o Neon estiver com latência alta, o usuário entra no sistema primeiro
    // e o log é gravado logo depois.
    logAction(user.id, "LOGIN", "users", user.id, null, {
      username: user.username,
      ip,
      deviceLabel: deviceInfo.deviceLabel,
      platform: deviceInfo.platform,
      timezone: deviceInfo.timezone,
      userAgent,
    }).catch((error) => console.error("Erro ao registrar auditoria de login:", error));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro no servidor" });
  }
});

router.get("/me", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Não autorizado" });

  const token = authHeader.split(" ")[1];
  try {
    const payload = jwt.verify(token, SECRET) as any;
    
    const cached = getCachedMe(payload.userId);
    if (cached) {
      return res.json(cached);
    }

    const usersResult = await db.select({
      id: users.id,
      name: users.name,
      username: users.username,
      email: users.email,
      isActive: users.isActive,
      roleName: roles.name,
      roleKey: roles.name
    })
    .from(users)
    .leftJoin(roles, eq(users.roleId, roles.id))
    .where(eq(users.id, payload.userId))
    .limit(1);

    const user = usersResult[0];

    if (!user) return res.status(401).json({ error: "Usuário não encontrado" });
    if (!user.isActive) return res.status(403).json({ error: "Usuário inativo" });

    const responseUser = {
      ...user,
      role: user.roleName,
      roleKey: user.roleName?.toLowerCase()
    };
    setCachedMe(payload.userId, responseUser);

    res.json(responseUser);
  } catch (err) {
    return res.status(401).json({ error: "Token inválido ou expirado" });
  }
});

export default router;
