import { Router } from "express";
import { db } from "../db";
import { costLayers, costConsumptions, products, sales, customers } from "../db/schema";
import { and, asc, desc, eq, gt, gte, lte, inArray, sql } from "drizzle-orm";
import { AuthRequest, requireAuth, requirePermission } from "./authMiddleware";
import { dayStartUtc, dayEndUtc } from "../lib/dateRange";

const router = Router();
router.use(requireAuth);

const round4 = (n: number) => Math.round(n * 10000) / 10000;
const round2 = (n: number) => Math.round(n * 100) / 100;

// Cria uma camada de custo (entrada de estoque). unitCostBrl SEMPRE em BRL.
export async function addCostLayer(tx: any, opts: {
  productId: string; qty: number; unitCostBrl: number;
  purchaseOrderId?: string | null; sourceCurrency?: string; fxRate?: number | null; note?: string | null;
}) {
  const qty = Math.floor(Number(opts.qty) || 0);
  if (qty <= 0) return;
  await tx.insert(costLayers).values({
    productId: opts.productId,
    purchaseOrderId: opts.purchaseOrderId || null,
    qtyOriginal: qty,
    qtyRemaining: qty,
    unitCostBrl: round4(Number(opts.unitCostBrl) || 0).toFixed(4),
    sourceCurrency: opts.sourceCurrency || "BRL",
    fxRate: opts.fxRate ? Number(opts.fxRate).toFixed(6) : null,
    note: opts.note || null,
  });
}

// Consome `qty` do produto pelas camadas FIFO (mais antiga primeiro) e grava o consumo.
// Estoque sem camada (legado): consome "camada virtual" ao custo atual do produto.
// Retorna o custo total em BRL do que foi consumido.
export async function consumeFifo(tx: any, productId: string, qty: number, ref: { saleId?: string | null; reason?: string }): Promise<number> {
  let remaining = Math.floor(Number(qty) || 0);
  if (remaining <= 0) return 0;
  const reason = ref.reason || "SALE";
  let totalCost = 0;

  // FOR UPDATE: serializa consumos concorrentes das mesmas camadas.
  const layers = await tx.select().from(costLayers)
    .where(and(eq(costLayers.productId, productId), gt(costLayers.qtyRemaining, 0)))
    .orderBy(asc(costLayers.createdAt), asc(costLayers.id))
    .for("update");

  for (const layer of layers) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, Number(layer.qtyRemaining));
    const unitCost = Number(layer.unitCostBrl);
    await tx.update(costLayers).set({ qtyRemaining: Number(layer.qtyRemaining) - take }).where(eq(costLayers.id, layer.id));
    await tx.insert(costConsumptions).values({
      layerId: layer.id, productId, saleId: ref.saleId || null,
      qty: take, unitCostBrl: unitCost.toFixed(4), reason,
    });
    totalCost += take * unitCost;
    remaining -= take;
  }

  if (remaining > 0) {
    // Sem camada suficiente — camada virtual ao custo atual (mantém a margem calculável).
    const [prod] = await tx.select({ costPrice: products.costPrice }).from(products).where(eq(products.id, productId)).limit(1);
    const unitCost = Number(prod?.costPrice || 0);
    await tx.insert(costConsumptions).values({
      layerId: null, productId, saleId: ref.saleId || null,
      qty: remaining, unitCostBrl: unitCost.toFixed(4), reason,
    });
    totalCost += remaining * unitCost;
  }
  return round2(totalCost);
}

// Devolução/cancelamento de venda entregue: devolve o consumo da venda como camada nova
// (ao custo médio do que foi consumido), pra margem e estoque de custo voltarem ao lugar.
export async function restoreSaleLayers(tx: any, saleId: string) {
  const cons = await tx.select().from(costConsumptions)
    .where(and(eq(costConsumptions.saleId, saleId), eq(costConsumptions.reason, "SALE")));
  if (!cons.length) return;
  const byProduct = new Map<string, { qty: number; cost: number }>();
  for (const c of cons) {
    const cur = byProduct.get(c.productId) || { qty: 0, cost: 0 };
    cur.qty += Number(c.qty); cur.cost += Number(c.qty) * Number(c.unitCostBrl);
    byProduct.set(c.productId, cur);
  }
  for (const [productId, agg] of byProduct.entries()) {
    if (agg.qty <= 0) continue;
    const avg = agg.cost / agg.qty;
    await addCostLayer(tx, { productId, qty: agg.qty, unitCostBrl: avg, note: `Devolução da venda ${saleId.slice(0, 8)}` });
    await tx.insert(costConsumptions).values({
      layerId: null, productId, saleId, qty: -agg.qty, unitCostBrl: round4(avg).toFixed(4), reason: "RETURN_REVERSAL",
    });
  }
}

// -------- Endpoint: margem REAL por venda (venda BRL − custo consumido da época) --------
router.get("/real-margin", requirePermission("reports", "financial"), async (req: AuthRequest, res) => {
  try {
    const dateFrom = req.query.dateFrom ? dayStartUtc(String(req.query.dateFrom)) : new Date(Date.now() - 30 * 864e5);
    const dateTo = req.query.dateTo ? dayEndUtc(String(req.query.dateTo)) : new Date();

    const saleRows = await db.select({
      id: sales.id, series: sales.series, number: sales.number, createdAt: sales.createdAt,
      customerName: customers.name, totalAmount: sales.totalAmount, currency: sales.currency, paymentStatus: sales.paymentStatus,
    })
      .from(sales).leftJoin(customers, eq(sales.customerId, customers.id))
      .where(and(gte(sales.createdAt, dateFrom), lte(sales.createdAt, dateTo)))
      .orderBy(desc(sales.createdAt)).limit(500);

    // sales.totalAmount segue a moeda da venda (sales.currency); realCost (costConsumptions) é
    // SEMPRE BRL. Sem converter o total pra R$ primeiro, a margem em loja USD/DUAL saía sem sentido
    // (ex.: venda de $100 com custo real de R$300 aparecia como margem de -200, não uma margem real positiva).
    const { resolveRates } = await import("./fx");
    const marginRates = await resolveRates().catch(() => ({} as any));
    const toBrlSync = (amount: number, currency: string): number => {
      const cur = String(currency || "BRL");
      if (cur === "BRL" || !amount) return amount;
      if (cur === "USD") { const r = marginRates.USDBRL?.rate; return r ? amount * r : amount; }
      if (cur === "PYG") { const r = marginRates.BRLPYG?.rate; return r ? amount / r : amount; }
      return amount;
    };

    const ids = saleRows.map((s) => s.id);
    const costBySale = new Map<string, number>();
    if (ids.length) {
      const consRows = await db.select({
        saleId: costConsumptions.saleId,
        total: sql<number>`sum(${costConsumptions.qty} * cast(${costConsumptions.unitCostBrl} as numeric))`,
      }).from(costConsumptions)
        .where(and(inArray(costConsumptions.saleId, ids), eq(costConsumptions.reason, "SALE")))
        .groupBy(costConsumptions.saleId);
      for (const r of consRows) if (r.saleId) costBySale.set(r.saleId, Number(r.total) || 0);
    }

    const data = saleRows
      .filter((s) => costBySale.has(s.id)) // só vendas já entregues (custo consumido)
      .map((s) => {
        const total = toBrlSync(Number(s.totalAmount) || 0, String(s.currency || "BRL"));
        const realCost = round2(costBySale.get(s.id) || 0);
        const margin = round2(total - realCost);
        return { ...s, totalAmountBrl: round2(total), realCost, realMargin: margin, realMarginPercent: total > 0 ? round2((margin / total) * 100) : 0 };
      });

    const totals = data.reduce((a, s) => ({
      sales: round2(a.sales + s.totalAmountBrl), cost: round2(a.cost + s.realCost), margin: round2(a.margin + s.realMargin),
    }), { sales: 0, cost: 0, margin: 0 });

    res.json({ data, totals: { ...totals, marginPercent: totals.sales > 0 ? round2((totals.margin / totals.sales) * 100) : 0 } });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
