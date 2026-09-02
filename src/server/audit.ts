import { db } from "../db";
import { auditLogs } from "../db/schema";
import { v4 as uuidv4 } from "uuid";

export async function logAction(userId: string, action: string, tableName: string, recordId: string, oldValues?: any, newValues?: any, executor: any = db) {
  try {
    // Quando a ação principal já está dentro de uma transação, use o mesmo `tx`.
    // Em Vercel o pool roda com DB_POOL_MAX=1; abrir uma segunda consulta pelo
    // `db` global enquanto a transação segura a única conexão causa espera até
    // timeout e fazia operações como criar produto parecerem que "não salvam".
    await executor.insert(auditLogs).values({
      id: uuidv4(),
      userId,
      action,
      tableName,
      recordId,
      oldValues: oldValues ? JSON.stringify(oldValues) : null,
      newValues: newValues ? JSON.stringify(newValues) : null,
    });
  } catch (err) {
    console.error("Failed to log audit action:", err);
  }
}
