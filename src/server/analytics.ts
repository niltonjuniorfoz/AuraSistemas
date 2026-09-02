import { Router } from "express";
import { db } from "../db";
import { storePageviews, sales, saleItems, products, productGroups } from "../db/schema";
import { requireAuth, AuthRequest, requirePermission } from "./authMiddleware";
import { and, gte, lte, eq, sql } from "drizzle-orm";
import { dayStartUtc, dayEndUtc } from "../lib/dateRange";

export const router = Router();
router.use(requireAuth);
router.use(requirePermission("reports", "financial"));

const num = (v: any) => Number(v || 0);
const r2 = (n: number) => Math.round(n * 100) / 100;
const SESSION_GAP_MS = 30 * 60 * 1000; // 30min parado = sessão nova, padrão de mercado

// Agrupa as visualizações (já ordenadas por visitante+data) em sessões — uma sessão é uma
// sequência de páginas do MESMO visitante sem um intervalo maior que SESSION_GAP_MS entre elas.
function buildSessions(rows: Array<{ visitorId: string | null; path: string; createdAt: Date }>) {
  const byVisitor = new Map<string, Array<{ path: string; createdAt: Date }>>();
  for (const r of rows) {
    if (!r.visitorId) continue; // visualização de antes do visitorId existir — não entra nas métricas de sessão
    const arr = byVisitor.get(r.visitorId) || [];
    arr.push({ path: r.path, createdAt: r.createdAt });
    byVisitor.set(r.visitorId, arr);
  }
  const sessions: Array<{ entryPath: string; pages: number; durationMs: number }> = [];
  for (const pages of byVisitor.values()) {
    pages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    let start = 0;
    for (let i = 1; i <= pages.length; i++) {
      const gap = i < pages.length ? pages[i].createdAt.getTime() - pages[i - 1].createdAt.getTime() : Infinity;
      if (gap > SESSION_GAP_MS) {
        const slice = pages.slice(start, i);
        sessions.push({
          entryPath: slice[0].path, pages: slice.length,
          durationMs: slice[slice.length - 1].createdAt.getTime() - slice[0].createdAt.getTime(),
        });
        start = i;
      }
    }
  }
  return sessions;
}

router.get("/overview", async (req: AuthRequest, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    const fromDate = dateFrom ? dayStartUtc(String(dateFrom)) : new Date(new Date().setDate(new Date().getDate() - 29));
    const toDate = dateTo ? dayEndUtc(String(dateTo)) : new Date();

    const views = await db.select({
      path: storePageviews.path, visitorId: storePageviews.visitorId,
      country: storePageviews.country, region: storePageviews.region, city: storePageviews.city,
      createdAt: storePageviews.createdAt,
    }).from(storePageviews).where(and(gte(storePageviews.createdAt, fromDate), lte(storePageviews.createdAt, toDate)));

    const totalViews = views.length;
    const uniqueVisitorSet = new Set(views.map((v) => v.visitorId).filter(Boolean) as string[]);
    const uniqueVisitors = uniqueVisitorSet.size;

    const rowsWithDate = views.map((v) => ({ ...v, createdAt: v.createdAt ? new Date(v.createdAt) : new Date() }));
    const sessions = buildSessions(rowsWithDate);
    const bounces = sessions.filter((s) => s.pages === 1).length;
    const bounceRate = sessions.length > 0 ? r2((bounces / sessions.length) * 100) : 0;
    const avgSessionDurationSec = sessions.length > 0
      ? Math.round(sessions.reduce((s, x) => s + x.durationMs, 0) / sessions.length / 1000)
      : 0;

    // Série por dia: visualizações + visitantes distintos daquele dia.
    const byDay = new Map<string, { views: number; visitors: Set<string> }>();
    for (const v of rowsWithDate) {
      const key = v.createdAt.toISOString().split("T")[0];
      const cur = byDay.get(key) || { views: 0, visitors: new Set<string>() };
      cur.views += 1;
      if (v.visitorId) cur.visitors.add(v.visitorId);
      byDay.set(key, cur);
    }
    const dailySeries: Array<{ date: string; views: number; visitors: number }> = [];
    const cursor = new Date(fromDate); cursor.setHours(0, 0, 0, 0);
    const last = new Date(toDate); last.setHours(0, 0, 0, 0);
    let guard = 0;
    while (cursor <= last && guard < 370) {
      const key = cursor.toISOString().split("T")[0];
      const found = byDay.get(key);
      dailySeries.push({ date: key, views: found?.views || 0, visitors: found?.visitors.size || 0 });
      cursor.setDate(cursor.getDate() + 1);
      guard += 1;
    }

    // Páginas principais: vistas + visitantes únicos (qualquer ocorrência) + taxa de rejeição
    // (só conta sessões onde essa página foi a ENTRADA — mesma definição usada em analytics padrão).
    const pageViews = new Map<string, number>();
    const pageVisitors = new Map<string, Set<string>>();
    for (const v of rowsWithDate) {
      pageViews.set(v.path, (pageViews.get(v.path) || 0) + 1);
      const set = pageVisitors.get(v.path) || new Set<string>();
      if (v.visitorId) set.add(v.visitorId);
      pageVisitors.set(v.path, set);
    }
    const entryTotals = new Map<string, number>();
    const entryBounces = new Map<string, number>();
    for (const s of sessions) {
      entryTotals.set(s.entryPath, (entryTotals.get(s.entryPath) || 0) + 1);
      if (s.pages === 1) entryBounces.set(s.entryPath, (entryBounces.get(s.entryPath) || 0) + 1);
    }
    const topPages = [...pageViews.entries()]
      .map(([path, viewsCount]) => {
        const entries = entryTotals.get(path) || 0;
        const bouncesForPath = entryBounces.get(path) || 0;
        return {
          path, views: viewsCount, uniqueVisitors: pageVisitors.get(path)?.size || 0,
          bounceRate: entries > 0 ? r2((bouncesForPath / entries) * 100) : null,
        };
      })
      .sort((a, b) => b.views - a.views).slice(0, 10);

    // Localização: país > estado > cidade, por visitante único (não por view — evita que um
    // visitante recarregando a página várias vezes infle o ranking de uma cidade só).
    const locKey = (v: (typeof rowsWithDate)[number]) => `${v.country || "?"}|${v.region || "?"}|${v.city || "?"}`;
    const locVisitors = new Map<string, Set<string>>();
    const locMeta = new Map<string, { country: string | null; region: string | null; city: string | null }>();
    for (const v of rowsWithDate) {
      if (!v.country && !v.city) continue; // sem geolocalização (IP local/desconhecido) — não entra no ranking
      const key = locKey(v);
      const set = locVisitors.get(key) || new Set<string>();
      if (v.visitorId) set.add(v.visitorId);
      locVisitors.set(key, set);
      locMeta.set(key, { country: v.country, region: v.region, city: v.city });
    }
    const topLocations = [...locVisitors.entries()]
      .map(([key, set]) => ({ ...locMeta.get(key)!, visitors: set.size }))
      .sort((a, b) => b.visitors - a.visitors).slice(0, 10);

    // Receita da loja por grupo de produto (só vendas LOJ pagas no período) — adaptação real do
    // "receita por categoria" da referência, que usava categorias de SaaS que não existem aqui.
    const revenueRows = await db.select({
      groupName: productGroups.name,
      total: sql<number>`coalesce(sum(cast(${saleItems.totalPrice} as numeric)), 0)`,
    })
      .from(saleItems)
      .innerJoin(sales, eq(saleItems.saleId, sales.id))
      .leftJoin(products, eq(saleItems.productId, products.id))
      .leftJoin(productGroups, eq(products.groupId, productGroups.id))
      .where(and(
        eq(sales.series, "LOJ"), eq(sales.paymentStatus, "PAID"),
        gte(sales.createdAt, fromDate), lte(sales.createdAt, toDate),
      ))
      .groupBy(productGroups.name);
    const revenueByGroup = revenueRows
      .map((r) => ({ name: r.groupName || "Sem grupo", total: r2(num(r.total)) }))
      .filter((r) => r.total > 0)
      .sort((a, b) => b.total - a.total);

    res.json({
      totalViews, uniqueVisitors, bounceRate, avgSessionDurationSec,
      dailySeries, topPages, topLocations, revenueByGroup,
      period: { dateFrom: fromDate.toISOString().split("T")[0], dateTo: toDate.toISOString().split("T")[0] },
    });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
