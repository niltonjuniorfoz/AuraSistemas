import { Router } from "express";
import bcrypt from "bcryptjs";
import multer from "multer";
import { db } from "../db";
import { users, roles } from "../db/schema";
import { eq } from "drizzle-orm";
import { requireAuth, AuthRequest } from "./authMiddleware";
import { logAction } from "./audit";
import { getBackupSettings, saveBackupSettings, runManualBackup, restoreBackupFromBuffer, isDropboxConfigured, checkPendingAutomaticBackupNow } from "./backupService";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 80 * 1024 * 1024 } });
router.use(requireAuth);

function isMaster(req: AuthRequest) {
  return String(req.user?.roleName || "").toLowerCase() === "master";
}

function requireMaster(req: AuthRequest, res: any, next: any) {
  if (!isMaster(req)) return res.status(403).json({ error: "Acesso restrito." });
  next();
}

async function validateMasterPassword(password: string) {
  if (!password) return false;
  const row = await db.select({ passwordHash: users.passwordHash, isActive: users.isActive })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.id))
    .where(eq(roles.name, "Master"))
    .limit(1);
  const master = row[0];
  if (!master || !master.isActive) return false;
  return bcrypt.compare(password, master.passwordHash);
}

router.get("/status", requireMaster, async (req: AuthRequest, res) => {
  await checkPendingAutomaticBackupNow("abertura do painel master", { force: true });
  const settings = await getBackupSettings();
  res.json({
    user: { role: "Master" },
    backup: settings,
    dropboxConfigured: isDropboxConfigured(),
    googleDriveConfigured: false,
    renderFreeWarning: true,
  });
});

router.put("/backup-settings", requireMaster, async (req: AuthRequest, res) => {
  const saved = await saveBackupSettings(req.body || {});
  await logAction(req.user!.userId, "UPDATE_MASTER_BACKUP_SETTINGS", "system_settings", "backup_settings", null, saved);
  res.json({ success: true, backup: saved });
});

router.post("/backup-now", requireMaster, async (req: AuthRequest, res) => {
  try {
    const result = await runManualBackup(req.user!.userId);
    await logAction(req.user!.userId, "MASTER_BACKUP_NOW", "system_settings", "backup_settings", null, result);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Erro ao gerar backup." });
  }
});

router.post("/backup-restore", requireMaster, upload.single("backup"), async (req: AuthRequest, res) => {
  try {
    const { masterPassword } = req.body || {};

    const ok = await validateMasterPassword(masterPassword);
    if (!ok) return res.status(401).json({ error: "Senha Master invalida." });
    if (!req.file?.buffer) return res.status(400).json({ error: "Envie um arquivo de backup .json.gz gerado pelo Aura Sistemas." });

    const result = await restoreBackupFromBuffer(req.file.buffer, req.user!.userId);

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Erro ao restaurar backup." });
  }
});

router.post("/reset-check", requireMaster, async (req: AuthRequest, res) => {
  const { masterPassword, confirmation } = req.body || {};
  if (confirmation !== "RESETAR AURA") {
    return res.status(400).json({ error: "Digite exatamente RESETAR AURA para confirmar." });
  }
  const ok = await validateMasterPassword(masterPassword);
  if (!ok) return res.status(401).json({ error: "Senha Master inválida." });
  await logAction(req.user!.userId, "MASTER_RESET_CHECK_APPROVED", "system_settings", "reset", null, { confirmation });
  res.json({
    success: true,
    message: "Confirmação validada. Para resetar o banco real com segurança, gere backup e execute DROP SCHEMA/db:push/db:seed ou ative a rotina definitiva quando estiver pronto.",
  });
});

export default router;
