import { Router } from "express";
import { db } from "../db";
import {
  fxRates, products, stockBalances, saleItems, sales, costLayers, costConsumptions, purchaseOrders,
} from "../db/schema";
import { and, asc, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { AuthRequest, requireAuth, requirePermission } from "./authMiddleware";
import { resolveRates } from "./fx";
import { dayStartUtc, dayEndUtc } from "../lib/dateRange";

const router = Router();
router.use(requireAuth);

const r2 = (n: number) => Math.round(n * 100) / 100;
const num = (v: any) => Number(v || 0);

/* ---------- D1: spread cambial — está bom para comprar hoje? ---------- */
// Compara a cotação de hoje com a média/mínima dos últimos N dias. Como as compras são em USD,
// dólar BAIXO = hora boa de repor estoque.
router.get("/fx-spread", requirePermission("cash", "view"), async (req: AuthRequest, res) => {
  try {
    const days = Math.min(Math.max(parseInt(String(req.query.days || "30"), 10) || 30, 7), 180);
    const from = new Date(); from.setDate(from.getDate() - days);
    const fromDay = from.toISOString().slice(0, 10);

    const rows = await db.select().from(fxRates)
      .where(and(gte(fxRates.day, fromDay), inArray(fxRates.pair, ["USDBRL", "BRLPYG"])))
      .orderBy(asc(fxRates.day));

    // Um valor por dia/par (MANUAL prevalece).
    const byPair: Record<string, Map<string, number>> = { USDBRL: new Map(), BRLPYG: new Map() };
    for (const r of rows) {
      const m = byPair[r.pair];
      if (!m) continue;
      const cur = m.get(r.day);
      if (cur == null || r.source === "MANUAL") m.set(r.day, num(r.rate));
    }

    const today = await resolveRates().catch(() => ({} as any));

    const analyse = (pair: string, label: string, goodWhen: "low" | "high") => {
      const series = [...byPair[pair].entries()].map(([day, rate]) => ({ day, rate })).sort((a, b) => a.day.localeCompare(b.day));
      const vals = series.map((s) => s.rate);
      const current = today[pair]?.rate ?? (vals.length ? vals[vals.length - 1] : null);
      if (!current || vals.length < 3) return { pair, label, current, enoughData: false, series };
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      const min = Math.min(...vals), max = Math.max(...vals);
      const diffPercent = r2(((current - avg) / avg) * 100);
      // Posição de 0 (mínima do período) a 100 (máxima).
      const position = max > min ? r2(((current - min) / (max - min)) * 100) : 50;
      const favorable = goodWhen === "low" ? position <= 35 : position >= 65;
      const bad = goodWhen === "low" ? position >= 75 : position <= 25;
      return {
        pair, label, enoughData: true, current: r2(current), avg: r2(avg), min: r2(min), max: r2(max),
        diffPercent, position, favorable, bad,
        verdict: favorable ? "FAVORAVEL" : bad ? "DESFAVORAVEL" : "NEUTRO",
        series: series.slice(-60),
      };
    };

    // USD/BRL: dólar barato favorece a COMPRA (você compra em dólar com reais).
    const usd = analyse("USDBRL", "Dólar (compra de mercadoria)", "low");
    // BRL/PYG: real forte contra guarani favorece o CUSTO DE VIDA no Paraguai.
    const pyg = analyse("BRLPYG", "Real → Guarani (custo de vida)", "high");

    res.json({ days, usd, pyg });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

/* ---------- D2: simulador de lote de importação ---------- */
// Recebe os itens do lote (custo na moeda + qty + preço de venda pretendido) e devolve
// landed cost em R$ e margem projetada — antes de fechar o pedido.
router.post("/import-simulator", requirePermission("cash", "view"), async (req: AuthRequest, res) => {
  try {
    const { currency, fxRate, freightAmount, extraCostAmount, items } = req.body || {};
    const cur = ["BRL", "USD", "PYG"].includes(String(currency)) ? String(currency) : "USD";
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: "Informe ao menos um item." });

    // Câmbio: o informado ou o do dia.
    let fx = Number(fxRate);
    if (!(fx > 0)) {
      const rates = await resolveRates();
      fx = cur === "BRL" ? 1 : cur === "USD" ? (rates.USDBRL?.rate || 0) : (rates.BRLPYG?.rate ? 1 / rates.BRLPYG.rate : 0);
      if (!(fx > 0)) return res.status(400).json({ error: `Sem cotação ${cur}→BRL. Informe o câmbio.` });
    }

    const freight = Math.max(0, Number(freightAmount) || 0);
    const extra = Math.max(0, Number(extraCostAmount) || 0);
    const totalUnits = items.reduce((s: number, i: any) => s + (Math.floor(Number(i.quantity)) || 0), 0);
    if (totalUnits <= 0) return res.status(400).json({ error: "Quantidade inválida." });
    const perUnitExtra = (freight + extra) / totalUnits; // rateio na moeda de origem

    const lines = items.map((i: any) => {
      const qty = Math.floor(Number(i.quantity)) || 0;
      const unitNative = Number(i.unitCost) || 0;
      const landedUnitBrl = r2((unitNative + perUnitExtra) * fx);
      const sellPrice = Number(i.salePrice) || 0;
      const marginUnit = r2(sellPrice - landedUnitBrl);
      const marginPercent = sellPrice > 0 ? r2((marginUnit / sellPrice) * 100) : 0;
      const markup = landedUnitBrl > 0 ? r2(((sellPrice - landedUnitBrl) / landedUnitBrl) * 100) : 0;
      return {
        name: String(i.name || "Item"), quantity: qty, unitCostNative: unitNative,
        landedUnitBrl, salePrice: sellPrice, marginUnit, marginPercent, markup,
        totalCostBrl: r2(landedUnitBrl * qty), totalRevenue: r2(sellPrice * qty), totalMargin: r2(marginUnit * qty),
        // Preço mínimo para uma margem alvo de 30%
        suggestedPrice30: r2(landedUnitBrl / 0.7),
      };
    });

    const totalCostNative = r2(items.reduce((s: number, i: any) => s + (Number(i.unitCost) || 0) * (Math.floor(Number(i.quantity)) || 0), 0) + freight + extra);
    const totals = lines.reduce((a, l) => ({
      cost: r2(a.cost + l.totalCostBrl), revenue: r2(a.revenue + l.totalRevenue), margin: r2(a.margin + l.totalMargin),
    }), { cost: 0, revenue: 0, margin: 0 });

    // Sensibilidade: e se o câmbio subir/descer até a chegada da mercadoria?
    const scenarios = [-10, -5, 0, 5, 10].map((pct) => {
      const f = fx * (1 + pct / 100);
      const cost = r2(lines.reduce((s, l) => s + ((l.unitCostNative + perUnitExtra) * f) * l.quantity, 0));
      const margin = r2(totals.revenue - cost);
      return {
        fxChangePercent: pct, fxRate: r2(f), costBrl: cost, marginBrl: margin,
        marginPercent: totals.revenue > 0 ? r2((margin / totals.revenue) * 100) : 0,
      };
    });

    res.json({
      currency: cur, fxRate: r2(fx), totalUnits, perUnitExtraNative: r2(perUnitExtra), totalCostNative,
      lines,
      totals: { ...totals, marginPercent: totals.revenue > 0 ? r2((totals.margin / totals.revenue) * 100) : 0 },
      scenarios,
      // Ponto de equilíbrio: até que câmbio o lote ainda dá lucro.
      breakEvenFx: totals.revenue > 0 && totalCostNative > 0 ? r2(totals.revenue / totalCostNative) : null,
    });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

/* ---------- D3: sugestão de recompra (giro x estoque) ---------- */
router.get("/restock", requirePermission("product", "view"), async (req: AuthRequest, res) => {
  try {
    const days = Math.min(Math.max(parseInt(String(req.query.days || "60"), 10) || 60, 7), 365);
    const from = new Date(); from.setDate(from.getDate() - days);

    // Quanto saiu de cada produto no período (vendas não canceladas).
    const sold = await db.select({
      productId: saleItems.productId,
      qty: sql<number>`sum(${saleItems.quantity})`,
      revenue: sql<number>`sum(cast(${saleItems.totalPrice} as numeric))`,
    }).from(saleItems).innerJoin(sales, eq(saleItems.saleId, sales.id))
      .where(and(gte(sales.createdAt, from), sql`"sales"."order_status" NOT IN ('CANCELED','CANCELLED','RETURNED')`))
      .groupBy(saleItems.productId);

    if (!sold.length) return res.json({ days, data: [] });

    const ids = sold.map((s) => s.productId).filter(Boolean) as string[];
    const prods = await db.select({
      id: products.id, name: products.name, sku: products.sku, cost: products.costPrice,
      price: products.salePriceA, minStock: products.minStock,
      physical: stockBalances.physicalStock, reserved: stockBalances.reservedStock,
    }).from(products).innerJoin(stockBalances, eq(products.id, stockBalances.productId))
      .where(and(inArray(products.id, ids), eq(products.isActive, true)));

    const soldMap = new Map(sold.map((s) => [s.productId, s]));
    const data = prods.map((p) => {
      const s = soldMap.get(p.id)!;
      const qtySold = num(s.qty);
      const perDay = qtySold / days;
      const free = num(p.physical) - num(p.reserved);
      const daysLeft = perDay > 0 ? Math.floor(free / perDay) : null;
      // Sugestão: repor para cobrir 45 dias de venda.
      const target = Math.ceil(perDay * 45);
      const suggestedQty = Math.max(0, target - free);
      return {
        id: p.id, name: p.name, sku: p.sku, sold: qtySold, perDay: r2(perDay),
        available: free, daysLeft, suggestedQty,
        revenue: r2(num(s.revenue)), cost: num(p.cost), price: num(p.price),
        urgency: daysLeft == null ? "OK" : daysLeft <= 7 ? "CRITICO" : daysLeft <= 20 ? "ATENCAO" : "OK",
        estimatedCostBrl: r2(suggestedQty * num(p.cost)),
      };
    })
      .filter((p) => p.suggestedQty > 0)
      .sort((a, b) => (a.daysLeft ?? 999) - (b.daysLeft ?? 999) || b.revenue - a.revenue)
      .slice(0, 40);

    const totalInvest = r2(data.reduce((s, d) => s + d.estimatedCostBrl, 0));
    res.json({ days, data, totalInvest, criticalCount: data.filter((d) => d.urgency === "CRITICO").length });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

/* ---------- D4: comparativo por moeda ---------- */
// De onde veio o custo (moeda das compras) x o que foi vendido em R$, com a margem real.
router.get("/currency-report", requirePermission("reports", "financial"), async (req: AuthRequest, res) => {
  try {
    const dateFrom = req.query.dateFrom ? dayStartUtc(String(req.query.dateFrom)) : new Date(Date.now() - 90 * 864e5);
    const dateTo = req.query.dateTo ? dayEndUtc(String(req.query.dateTo)) : new Date();

    // Compras aprovadas por moeda.
    const purchases = await db.select({
      currency: purchaseOrders.currency,
      total: sql<number>`sum(cast(${purchaseOrders.totalAmount} as numeric))`,
      freight: sql<number>`sum(cast(coalesce(${purchaseOrders.freightAmount}, '0') as numeric))`,
      avgFx: sql<number>`avg(cast(${purchaseOrders.fxRateToBrl} as numeric))`,
      count: sql<number>`count(*)`,
    }).from(purchaseOrders)
      .where(and(eq(purchaseOrders.status, "APPROVED"), gte(purchaseOrders.approvedAt, dateFrom), lte(purchaseOrders.approvedAt, dateTo)))
      .groupBy(purchaseOrders.currency);

    // Camadas de custo criadas no período, por moeda de origem.
    const layers = await db.select({
      currency: costLayers.sourceCurrency,
      qty: sql<number>`sum(${costLayers.qtyOriginal})`,
      costBrl: sql<number>`sum(${costLayers.qtyOriginal} * cast(${costLayers.unitCostBrl} as numeric))`,
      avgFx: sql<number>`avg(cast(${costLayers.fxRate} as numeric))`,
    }).from(costLayers)
      .where(and(gte(costLayers.createdAt, dateFrom), lte(costLayers.createdAt, dateTo)))
      .groupBy(costLayers.sourceCurrency);

    // Vendas e custo real consumido no período.
    const [saleAgg] = await db.select({
      revenue: sql<number>`coalesce(sum(cast(${sales.totalAmount} as numeric)), 0)`,
      count: sql<number>`count(*)`,
    }).from(sales).where(and(
      gte(sales.createdAt, dateFrom), lte(sales.createdAt, dateTo),
      sql`"sales"."order_status" NOT IN ('CANCELED','CANCELLED','RETURNED')`, eq(sales.paymentStatus, "PAID"),
    ));

    const [consAgg] = await db.select({
      cost: sql<number>`coalesce(sum(${costConsumptions.qty} * cast(${costConsumptions.unitCostBrl} as numeric)), 0)`,
    }).from(costConsumptions).where(and(
      gte(costConsumptions.createdAt, dateFrom), lte(costConsumptions.createdAt, dateTo), eq(costConsumptions.reason, "SALE"),
    ));

    const revenue = r2(num(saleAgg?.revenue));
    const realCost = r2(num(consAgg?.cost));
    res.json({
      period: { dateFrom: dateFrom.toISOString().slice(0, 10), dateTo: dateTo.toISOString().slice(0, 10) },
      purchasesByCurrency: purchases.map((p) => ({
        currency: p.currency || "BRL", totalNative: r2(num(p.total)), freightNative: r2(num(p.freight)),
        avgFxToBrl: p.avgFx ? r2(num(p.avgFx)) : null, count: Number(p.count),
        totalBrl: p.avgFx ? r2((num(p.total) + num(p.freight)) * num(p.avgFx)) : null,
      })),
      stockByCurrency: layers.map((l) => ({
        currency: l.currency || "BRL", qty: Number(l.qty), costBrl: r2(num(l.costBrl)), avgFx: l.avgFx ? r2(num(l.avgFx)) : null,
      })),
      sales: { revenue, count: Number(saleAgg?.count || 0), realCost, margin: r2(revenue - realCost), marginPercent: revenue > 0 ? r2(((revenue - realCost) / revenue) * 100) : 0 },
    });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
