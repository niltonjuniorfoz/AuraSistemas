import { db } from "../db";
import { auditLogs } from "../db/schema";
import { v4 as uuidv4 } from "uuid";

export async function logAction(userId: string, action: string, tableName: string, recordId: string, oldValues?: any, newValues?: any) {
  try {
    await db.insert(auditLogs).values({
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
