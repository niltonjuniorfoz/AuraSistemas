import fs from "fs";
import path from "path";
import zlib from "zlib";
import { promisify } from "util";
import { sql } from "drizzle-orm";
import { db, sqlClient } from "../db";
import { systemSettings } from "../db/schema";
import { eq } from "drizzle-orm";

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);
export const BACKUP_SETTINGS_KEY = "backup_settings";

export type BackupSettings = {
  enabled: boolean;
  time: string;
  localServer: boolean;
  dropbox: boolean;
  googleDrive?: boolean;
  includeReports: boolean;
  retentionDays: number;
  lastRunAt?: string | null;
  lastRunStatus?: "SUCCESS" | "FAILED" | "NEVER";
  lastRunMessage?: string | null;
};

export type BackupRunResult = {
  success: boolean;
  filename: string;
  filepath: string;
  dropboxConfigured: boolean;
  dropboxUploaded: boolean;
  dropboxPath?: string | null;
  cloudMessage: string;
  driveMessage: string;
};

type RestoreColumn = {
  type: string;
  isIdentity: boolean;
};

export type BackupRestoreResult = {
  success: boolean;
  restoredTables: number;
  restoredRows: number;
  safetyBackupFilename: string;
  safetyBackupPath: string;
};

export const defaultBackupSettings: BackupSettings = {
  enabled: false,
  time: "02:00",
  localServer: true,
  dropbox: true,
  googleDrive: false,
  includeReports: true,
  retentionDays: 30,
  lastRunAt: null,
  lastRunStatus: "NEVER",
  lastRunMessage: "Backup automático preparado, mas desativado.",
};

function normalizeBackupSettings(value?: Partial<BackupSettings> | null): BackupSettings {
  const raw = (value || {}) as any;
  const merged = { ...defaultBackupSettings, ...raw };
  const dropboxEnabled = raw.dropbox ?? raw.googleDrive ?? defaultBackupSettings.dropbox;

  return {
    ...merged,
    enabled: Boolean(merged.enabled),
    localServer: Boolean(merged.localServer),
    dropbox: Boolean(dropboxEnabled),
    googleDrive: false,
    includeReports: Boolean(merged.includeReports),
    time: String(merged.time || "02:00"),
    retentionDays: Math.max(1, Number(merged.retentionDays ?? 30)),
    lastRunAt: merged.lastRunAt ?? null,
    lastRunStatus: merged.lastRunStatus || "NEVER",
    lastRunMessage: merged.lastRunMessage || defaultBackupSettings.lastRunMessage,
  };
}

export function isDropboxConfigured() {
  return Boolean(process.env.DROPBOX_ACCESS_TOKEN);
}

function getDropboxFolder() {
  const configured = String(process.env.DROPBOX_BACKUP_FOLDER || "/Backups Aura Sistemas").trim();
  if (!configured || configured === "/") return "";
  const normalized = configured.startsWith("/") ? configured : `/${configured}`;
  return normalized.replace(/\/+$/g, "");
}

async function uploadToDropbox(buffer: Buffer, filename: string) {
  const token = process.env.DROPBOX_ACCESS_TOKEN;
  if (!token) {
    throw new Error("Dropbox pendente: configure DROPBOX_ACCESS_TOKEN no Render.");
  }

  const folder = getDropboxFolder();
  const dropboxPath = `${folder}/${filename}`.replace(/\/+/g, "/");
  const args = {
    path: dropboxPath,
    mode: "add",
    autorename: true,
    mute: false,
    strict_conflict: false,
  };

  const response = await fetch("https://content.dropboxapi.com/2/files/upload", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Dropbox-API-Arg": JSON.stringify(args),
      "Content-Type": "application/octet-stream",
    },
    body: buffer as any,
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Falha ao enviar backup para Dropbox (${response.status}): ${text.slice(0, 400)}`);
  }

  const json = text ? JSON.parse(text) : {};
  return String(json.path_display || dropboxPath);
}

async function postDropboxApi(pathname: string, body: Record<string, unknown>) {
  const token = process.env.DROPBOX_ACCESS_TOKEN;
  if (!token) {
    throw new Error("Dropbox pendente: configure DROPBOX_ACCESS_TOKEN no Render.");
  }

  return fetch(`https://api.dropboxapi.com/2/${pathname}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

function formatDropboxError(text: string) {
  if (!text) return "sem detalhes retornados pela API.";
  try {
    const json = JSON.parse(text);
    return String(json.error_summary || json.error_description || json.error || text).slice(0, 400);
  } catch {
    return text.slice(0, 400);
  }
}

async function cleanupOldDropboxBackups(retentionDays: number) {
  const folder = getDropboxFolder();
  const cutoff = Date.now() - Math.max(1, retentionDays) * 24 * 60 * 60 * 1000;
  let removed = 0;
  let cursor = "";
  let hasMore = true;

  while (hasMore) {
    const response = cursor
      ? await postDropboxApi("files/list_folder/continue", { cursor })
      : await postDropboxApi("files/list_folder", { path: folder, recursive: false, include_deleted: false });
    const text = await response.text();

    if (!response.ok) {
      throw new Error(`Falha ao limpar backups antigos do Dropbox (${response.status}): ${formatDropboxError(text)}`);
    }

    const json = text ? JSON.parse(text) : {};
    for (const entry of json.entries || []) {
      const name = String(entry.name || "");
      const pathLower = String(entry.path_lower || "");
      if (entry[".tag"] !== "file") continue;
      if (!/^(?:aura-sistemas|origin)-backup-.*\.json\.gz$/i.test(name)) continue;

      const modifiedAt = Date.parse(String(entry.client_modified || entry.server_modified || ""));
      if (Number.isNaN(modifiedAt) || modifiedAt >= cutoff) continue;

      const deleteResponse = await postDropboxApi("files/delete_v2", { path: pathLower });
      const deleteText = await deleteResponse.text();
      if (!deleteResponse.ok) {
        throw new Error(`Falha ao apagar backup antigo do Dropbox (${deleteResponse.status}): ${formatDropboxError(deleteText)}`);
      }
      removed += 1;
    }

    cursor = String(json.cursor || "");
    hasMore = Boolean(json.has_more && cursor);
  }

  return removed;
}

export async function getBackupSettings(): Promise<BackupSettings> {
  const rows = await db.select().from(systemSettings).where(eq(systemSettings.key, BACKUP_SETTINGS_KEY)).limit(1);
  return normalizeBackupSettings((rows[0]?.value as any) || {});
}

export async function saveBackupSettings(settings: Partial<BackupSettings>): Promise<BackupSettings> {
  const current = await getBackupSettings();
  const normalized = normalizeBackupSettings({
    ...current,
    ...settings,
    dropbox: (settings as any).dropbox ?? (settings as any).googleDrive ?? current.dropbox,
  });

  const rows = await db.select().from(systemSettings).where(eq(systemSettings.key, BACKUP_SETTINGS_KEY)).limit(1);
  if (rows.length) {
    await db.update(systemSettings).set({ value: normalized as any, updatedAt: new Date() }).where(eq(systemSettings.key, BACKUP_SETTINGS_KEY));
  } else {
    await db.insert(systemSettings).values({ key: BACKUP_SETTINGS_KEY, value: normalized as any });
  }
  return normalized;
}

function backupsDir() {
  const dir = path.join(process.cwd(), "backups");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

async function getPublicTables(): Promise<string[]> {
  const result: any = await db.execute(sql`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename ASC
  `);
  const rows = Array.isArray(result) ? result : result.rows || [];
  return rows.map((row: any) => row.tablename).filter(Boolean);
}

async function exportDatabaseJson() {
  const tables = await getPublicTables();
  const dump: Record<string, unknown> = {
    meta: {
      app: "Aura Sistemas",
      format: "origin-json-gzip-v1", // identificador interno de formato — nunca aparece pro usuário
      exportedAt: new Date().toISOString(),
      tables,
    },
    tables: {},
  };

  for (const table of tables) {
    const rowsResult: any = await db.execute(sql.raw(`SELECT * FROM "${table.replace(/"/g, '""')}"`));
    (dump.tables as Record<string, unknown>)[table] = Array.isArray(rowsResult) ? rowsResult : rowsResult.rows || [];
  }

  return dump;
}

async function createLocalBackupFile(prefix = "aura-sistemas-backup") {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `${prefix}-${stamp}.json.gz`;
  const filepath = path.join(backupsDir(), filename);
  const dump = await exportDatabaseJson();
  const compressed = await gzip(Buffer.from(JSON.stringify(dump), "utf8"));
  fs.writeFileSync(filepath, compressed);
  return { filename, filepath, compressed };
}

function assertOriginBackupPayload(value: any) {
  if (!value || typeof value !== "object") {
    throw new Error("Arquivo de backup invalido.");
  }
  const validApp = value?.meta?.app === "Aura Sistemas" || value?.meta?.app === "Origin";
  if (!validApp || value?.meta?.format !== "origin-json-gzip-v1") {
    throw new Error("Este arquivo não parece ser um backup válido do Aura Sistemas.");
  }
  if (!value.tables || typeof value.tables !== "object" || Array.isArray(value.tables)) {
    throw new Error("Backup sem dados de tabelas.");
  }
}

async function readBackupPayload(buffer: Buffer) {
  const decompressed = await gunzip(buffer);
  const text = decompressed.toString("utf8");
  const payload = JSON.parse(text);
  assertOriginBackupPayload(payload);
  return payload as { meta: { tables?: string[]; exportedAt?: string }; tables: Record<string, Record<string, unknown>[]> };
}

async function getTableDependencies(tables: string[]) {
  const result: any = await db.execute(sql`
    SELECT
      source.relname AS table_name,
      target.relname AS depends_on
    FROM pg_constraint constraint_info
    JOIN pg_class source ON source.oid = constraint_info.conrelid
    JOIN pg_namespace source_schema ON source_schema.oid = source.relnamespace
    JOIN pg_class target ON target.oid = constraint_info.confrelid
    JOIN pg_namespace target_schema ON target_schema.oid = target.relnamespace
    WHERE constraint_info.contype = 'f'
      AND source_schema.nspname = 'public'
      AND target_schema.nspname = 'public'
  `);
  const rows = Array.isArray(result) ? result : result.rows || [];
  const tableSet = new Set(tables);
  const dependencies = new Map<string, Set<string>>();
  for (const table of tables) dependencies.set(table, new Set());
  for (const row of rows) {
    const tableName = String(row.table_name || "");
    const dependsOn = String(row.depends_on || "");
    if (tableSet.has(tableName) && tableSet.has(dependsOn) && tableName !== dependsOn) {
      dependencies.get(tableName)?.add(dependsOn);
    }
  }
  return dependencies;
}

async function getTableColumnTypes(tables: string[]) {
  const result: any = await db.execute(sql`
    SELECT table_name, column_name, data_type, is_identity, is_generated
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY ordinal_position ASC
  `);
  const rows = Array.isArray(result) ? result : result.rows || [];
  const tableSet = new Set(tables);
  const types = new Map<string, Map<string, RestoreColumn>>();

  for (const row of rows) {
    const tableName = String(row.table_name || "");
    if (!tableSet.has(tableName)) continue;
    if (row.is_generated === "ALWAYS") continue;
    if (!types.has(tableName)) types.set(tableName, new Map());
    types.get(tableName)?.set(String(row.column_name || ""), {
      type: String(row.data_type || ""),
      isIdentity: row.is_identity === "YES",
    });
  }

  return types;
}

function orderTablesByDependencies(tables: string[], dependencies: Map<string, Set<string>>) {
  const pending = new Set(tables);
  const ordered: string[] = [];

  while (pending.size) {
    const ready = [...pending].filter((table) => {
      const deps = dependencies.get(table) || new Set();
      return [...deps].every((dep) => !pending.has(dep));
    });

    if (!ready.length) {
      ordered.push(...[...pending].sort());
      break;
    }

    ready.sort();
    for (const table of ready) {
      ordered.push(table);
      pending.delete(table);
    }
  }

  return ordered;
}

function normalizeRows(rows: Record<string, unknown>[], columnTypes: Map<string, RestoreColumn>) {
  if (!rows.length) return rows;
  const columns = [...rows.reduce((set, row) => {
    Object.keys(row || {}).filter((key) => columnTypes.has(key)).forEach((key) => set.add(key));
    return set;
  }, new Set<string>())];

  return rows.map((row) => {
    const normalized: Record<string, unknown> = {};
    for (const column of columns) {
      const value = row[column] ?? null;
      const metadata = columnTypes.get(column);
      normalized[column] = normalizeRestoreValue(value, metadata?.type);
    }
    return normalized;
  });
}

function normalizeRestoreValue(value: unknown, dataType?: string) {
  if (value === null || value === undefined) return null;
  if (dataType === "json" || dataType === "jsonb") return JSON.stringify(value);
  if (typeof value === "object" && !(value instanceof Date) && !Buffer.isBuffer(value)) return JSON.stringify(value);
  return value;
}

async function insertRestoreRows(tx: any, table: string, rows: Record<string, unknown>[], columnTypes: Map<string, RestoreColumn>) {
  const columns = Object.keys(rows[0] || {});
  if (!columns.length) return;

  const hasIdentityColumn = columns.some((column) => columnTypes.get(column)?.isIdentity);
  if (!hasIdentityColumn) {
    await tx`INSERT INTO ${tx(table)} ${tx(rows as any, columns)}`;
    return;
  }

  const escapedColumns = columns.map((column) => `"${column.replace(/"/g, '""')}"`).join(", ");
  const escapedTable = `"${table.replace(/"/g, '""')}"`;
  const placeholders = columns.map((_, index) => `$${index + 1}`).join(", ");
  const query = `INSERT INTO ${escapedTable} (${escapedColumns}) OVERRIDING SYSTEM VALUE VALUES (${placeholders})`;

  for (const row of rows) {
    await tx.unsafe(query, columns.map((column) => row[column]));
  }
}

export async function restoreBackupFromBuffer(buffer: Buffer, triggeredBy: string): Promise<BackupRestoreResult> {
  const payload = await readBackupPayload(buffer);
  const currentTables = await getPublicTables();
  const backupTables = Object.keys(payload.tables).filter((table) => currentTables.includes(table));
  if (!backupTables.length) {
    throw new Error("Backup nao contem tabelas restauraveis para este banco.");
  }

  const safetyBackup = await createLocalBackupFile("aura-sistemas-safety-before-restore");
  const dependencies = await getTableDependencies(backupTables);
  const tableColumnTypes = await getTableColumnTypes(backupTables);
  const orderedTables = orderTablesByDependencies(backupTables, dependencies);
  let restoredRows = 0;

  await sqlClient.begin(async (tx) => {
    for (const table of currentTables) {
      await tx`TRUNCATE TABLE ${tx(table)} RESTART IDENTITY CASCADE`;
    }

    for (const table of orderedTables) {
      const columnTypes = tableColumnTypes.get(table) || new Map<string, RestoreColumn>();
      const rows = normalizeRows(payload.tables[table] || [], columnTypes);
      if (!rows.length) continue;
      await insertRestoreRows(tx, table, rows, columnTypes);
      restoredRows += rows.length;
    }
  });

  await saveBackupSettings({
    lastRunAt: new Date().toISOString(),
    lastRunStatus: "SUCCESS",
    lastRunMessage: `Backup restaurado por ${triggeredBy}. Backup de seguranca atual: ${safetyBackup.filename}.`,
  });

  return {
    success: true,
    restoredTables: orderedTables.length,
    restoredRows,
    safetyBackupFilename: safetyBackup.filename,
    safetyBackupPath: safetyBackup.filepath,
  };
}

export async function runManualBackup(triggeredBy: string): Promise<BackupRunResult> {
  const settings = await getBackupSettings();

  try {
    const { filename, filepath, compressed } = await createLocalBackupFile();

    let dropboxUploaded = false;
    let dropboxPath: string | null = null;
    let cloudMessage = "Envio para Dropbox desativado.";
    const dropboxConfigured = isDropboxConfigured();

    if (settings.dropbox) {
      if (!dropboxConfigured) {
        cloudMessage = "Dropbox pendente: configure DROPBOX_ACCESS_TOKEN no Render.";
      } else {
        dropboxPath = await uploadToDropbox(compressed, filename);
        const cleaned = await cleanupOldDropboxBackups(settings.retentionDays);
        dropboxUploaded = true;
        cloudMessage = `Backup enviado ao Dropbox: ${dropboxPath}. Limpeza: ${cleaned} backup(s) antigo(s) removido(s).`;
      }
    }

    await saveBackupSettings({
      lastRunAt: new Date().toISOString(),
      lastRunStatus: "SUCCESS",
      lastRunMessage: `Backup local gerado por ${triggeredBy}: ${filename}. ${cloudMessage}`,
    });

    return {
      success: true,
      filename,
      filepath,
      dropboxConfigured,
      dropboxUploaded,
      dropboxPath,
      cloudMessage,
      driveMessage: cloudMessage,
    };
  } catch (error: any) {
    await saveBackupSettings({
      lastRunAt: new Date().toISOString(),
      lastRunStatus: "FAILED",
      lastRunMessage: error.message || "Falha ao gerar backup.",
    });
    throw error;
  }
}

let lastScheduledSuccessKey = "";
let lastFailedScheduledAttemptAt = 0;
let backupCheckInFlight = false;
let lastPendingCheckAt = 0;
const PENDING_CHECK_THROTTLE_MS = 30 * 1000;
const FAILED_RETRY_COOLDOWN_MS = 10 * 60 * 1000;
const BACKUP_TIME_ZONE = process.env.BACKUP_TIME_ZONE || "America/Sao_Paulo";

function normalizeHHMM(time?: string | null) {
  const raw = String(time || "02:00").trim();
  const match = raw.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return "02:00";

  const hour = Math.min(23, Math.max(0, Number(match[1])));
  const minute = Math.min(59, Math.max(0, Number(match[2])));
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function zonedParts(date: Date, timeZone = BACKUP_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  };
}

function timeZoneOffsetMs(date: Date, timeZone = BACKUP_TIME_ZONE) {
  const parts = zonedParts(date, timeZone);
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return asUtc - date.getTime();
}

function zonedLocalTimeToUtc(year: number, month: number, day: number, hour: number, minute: number, timeZone = BACKUP_TIME_ZONE) {
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0));
  const offset = timeZoneOffsetMs(guess, timeZone);
  return new Date(guess.getTime() - offset);
}

function localDateKey(parts: Pick<ReturnType<typeof zonedParts>, "year" | "month" | "day">) {
  return [
    parts.year,
    String(parts.month).padStart(2, "0"),
    String(parts.day).padStart(2, "0"),
  ].join("-");
}

function getScheduledDateForToday(now: Date, targetHHMM: string) {
  const [hour, minute] = normalizeHHMM(targetHHMM).split(":").map(Number);
  const parts = zonedParts(now);
  return zonedLocalTimeToUtc(parts.year, parts.month, parts.day, hour, minute);
}

function wasScheduledBackupSuccessful(settings: BackupSettings, scheduledAt: Date) {
  if (!settings.lastRunAt || settings.lastRunStatus !== "SUCCESS") return false;
  const lastRun = new Date(settings.lastRunAt);
  if (Number.isNaN(lastRun.getTime())) return false;
  return lastRun.getTime() >= scheduledAt.getTime();
}

function failedAttemptIsCoolingDown(settings: BackupSettings) {
  const now = Date.now();
  if (lastFailedScheduledAttemptAt && now - lastFailedScheduledAttemptAt < FAILED_RETRY_COOLDOWN_MS) return true;

  if (settings.lastRunStatus === "FAILED" && settings.lastRunAt) {
    const lastRun = new Date(settings.lastRunAt).getTime();
    if (!Number.isNaN(lastRun) && now - lastRun < FAILED_RETRY_COOLDOWN_MS) return true;
  }

  return false;
}

export async function checkPendingAutomaticBackupNow(source = "verificação automática", options: { force?: boolean } = {}) {
  const nowMs = Date.now();
  if (backupCheckInFlight) return;
  if (!options.force && nowMs - lastPendingCheckAt < PENDING_CHECK_THROTTLE_MS) return;

  backupCheckInFlight = true;
  lastPendingCheckAt = nowMs;

  try {
    const settings = await getBackupSettings();
    if (!settings.enabled) return;

    const now = new Date();
    const today = localDateKey(zonedParts(now));
    const target = normalizeHHMM(settings.time);
    const scheduledAt = getScheduledDateForToday(now, target);
    const runKey = `${today}:${target}`;

    const scheduledTimeAlreadyPassed = now.getTime() >= scheduledAt.getTime();
    if (!scheduledTimeAlreadyPassed) return;
    if (lastScheduledSuccessKey === runKey) return;
    if (wasScheduledBackupSuccessful(settings, scheduledAt)) {
      lastScheduledSuccessKey = runKey;
      return;
    }
    if (failedAttemptIsCoolingDown(settings)) return;

    const wakeupDelayMs = now.getTime() - scheduledAt.getTime();
    const trigger = wakeupDelayMs > 60 * 1000
      ? `backup pendente após reativação do servidor (${source})`
      : `agendamento automático (${source})`;

    console.log(`[BACKUP] Executando ${trigger}. Horário alvo=${target} (${BACKUP_TIME_ZONE}), agora=${now.toISOString()}`);

    try {
      await runManualBackup(trigger);
      lastScheduledSuccessKey = runKey;
      lastFailedScheduledAttemptAt = 0;
    } catch (error) {
      lastFailedScheduledAttemptAt = Date.now();
      throw error;
    }
  } catch (error) {
    console.error("Erro no agendador de backup:", error);
  } finally {
    backupCheckInFlight = false;
  }
}

export function initAutomaticBackupSchedule() {
  setInterval(() => {
    checkPendingAutomaticBackupNow("intervalo interno").catch(() => {});
  }, 60 * 1000);
  checkPendingAutomaticBackupNow("inicialização do servidor").catch(() => {});
}
