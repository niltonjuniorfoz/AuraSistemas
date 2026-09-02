import { Router } from "express";
import { db } from "../db";
import { notifications } from "../db/schema";
import { and, desc, eq, sql } from "drizzle-orm";
import { AuthRequest, requireAuth } from "./authMiddleware";

const router = Router();
router.use(requireAuth);

// Cria uma notificação — chamado a partir de outros módulos no exato momento de cada evento real
// (pedido novo, pagamento confirmado, devolução, etc). Aceita `tx` opcional pra gravar dentro da
// mesma transação do evento que a originou (se aquela transação der rollback, a notificação some
// junto — evita notificação "fantasma" de algo que não aconteceu de verdade).
export async function createNotification(
  executor: any,
  data: { type: string; title: string; message: string; link?: string | null },
) {
  try {
    await executor.insert(notifications).values({
      type: data.type, title: data.title, message: data.message, link: data.link || null,
    });
  } catch (err) {
    // Notificação é conveniência, não pode derrubar o fluxo principal (venda, pagamento etc)
    // se por algum motivo a gravação falhar.
    console.error("Erro ao criar notificação:", err);
  }
}

router.get("/", async (req: AuthRequest, res) => {
  try {
    const filter = String(req.query.filter || "all"); // all | unread | read
    const limit = Math.min(parseInt(String(req.query.limit || "50"), 10) || 50, 200);
    const where = filter === "unread" ? eq(notifications.read, false) : filter === "read" ? eq(notifications.read, true) : undefined;
    const rows = await db.select().from(notifications).where(where).orderBy(desc(notifications.createdAt)).limit(limit);
    const [{ count: unreadCount }] = await db.select({ count: sql<number>`count(*)` }).from(notifications).where(eq(notifications.read, false));
    res.json({ data: rows, unreadCount: Number(unreadCount || 0) });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get("/unread-count", async (_req: AuthRequest, res) => {
  try {
    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(notifications).where(eq(notifications.read, false));
    res.json({ count: Number(count || 0) });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/:id/read", async (req: AuthRequest, res) => {
  try {
    await db.update(notifications).set({ read: true }).where(eq(notifications.id, req.params.id));
    res.json({ success: true });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

router.post("/mark-all-read", async (_req: AuthRequest, res) => {
  try {
    await db.update(notifications).set({ read: true }).where(eq(notifications.read, false));
    res.json({ success: true });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

export default router;
