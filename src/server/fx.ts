import { Router } from "express";
import { db } from "../db";
import { fxRates } from "../db/schema";
import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { AuthRequest, requireAuth, requirePermission } from "./authMiddleware";
import { logAction } from "./audit";

const router = Router();
router.use(requireAuth);

export const FX_PAIRS = ["USDBRL", "USDPYG", "BRLPYG", "USDTBRL"] as const;
export type FxPair = (typeof FX_PAIRS)[number];

const todayStr = () => new Date().toISOString().slice(0, 10);

// Busca as cotações do dia. USDBRL/USDPYG/BRLPYG vêm da AwesomeAPI; USDTBRL
// vem da Binance à parte — a AwesomeAPI não tem Tether de verdade, "USDT-BRL"
// nela cai no par errado ("USD/BRL Turismo", symbol USDBRLT, outra coisa).
// Grava tudo como source=API (upsert por dia/par). BRLPYG é derivado
// (USDPYG ÷ USDBRL) quando a API não devolve o par direto.
export async function fetchApiRates(): Promise<Record<string, number>> {
  const res = await fetch("https://economia.awesomeapi.com.br/json/last/USD-BRL,USD-PYG,BRL-PYG", {
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`AwesomeAPI ${res.status}`);
  const data: any = await res.json();
  const out: Record<string, number> = {};
  for (const pair of FX_PAIRS) {
    const bid = Number(data?.[pair]?.bid);
    if (Number.isFinite(bid) && bid > 0) out[pair] = bid;
  }
  if (!out.BRLPYG && out.USDPYG && out.USDBRL) out.BRLPYG = out.USDPYG / out.USDBRL;
  if (!out.USDPYG && out.BRLPYG && out.USDBRL) out.USDPYG = out.BRLPYG * out.USDBRL;

  // Falha na Binance não pode derrubar as outras 3 cotações que já vieram certas.
  try {
    const btRes = await fetch("https://api.binance.com/api/v3/ticker/price?symbol=USDTBRL", {
      signal: AbortSignal.timeout(8000),
    });
    if (btRes.ok) {
      const btData: any = await btRes.json();
      const price = Number(btData?.price);
      if (Number.isFinite(price) && price > 0) out.USDTBRL = price;
    }
  } catch (e: any) { console.error("[FX] Binance USDTBRL falhou:", e.message); }

  const day = todayStr();
  for (const [pair, rate] of Object.entries(out)) {
    await db.insert(fxRates)
      .values({ day, pair, rate: rate.toFixed(6), source: "API" })
      .onConflictDoUpdate({
        target: [fxRates.day, fxRates.pair, fxRates.source],
        set: { rate: rate.toFixed(6), updatedAt: new Date() },
      });
  }
  return out;
}

// Resolve as cotações de um dia: MANUAL prevalece sobre API. Sem linha do dia, cai para a
// última cotação conhecida (dias anteriores) — melhor um câmbio de ontem que nenhum.
export async function resolveRates(day?: string): Promise<Record<string, { rate: number; source: string; day: string }>> {
  const d = day || todayStr();
  const rows = await db.select().from(fxRates).where(eq(fxRates.day, d));
  const map: Record<string, { rate: number; source: string; day: string }> = {};
  for (const r of rows) {
    const cur = map[r.pair];
    if (!cur || r.source === "MANUAL") map[r.pair] = { rate: Number(r.rate), source: r.source, day: r.day };
  }
  const missing = FX_PAIRS.filter((p) => !map[p]);
  if (missing.length) {
    const prev = await db.select().from(fxRates)
      .where(inArray(fxRates.pair, missing as unknown as string[]))
      .orderBy(desc(fxRates.day), desc(fxRates.updatedAt)).limit(50);
    for (const r of prev) {
      if (!map[r.pair] || (map[r.pair].day === r.day && r.source === "MANUAL")) {
        if (!map[r.pair] || r.source === "MANUAL") map[r.pair] = { rate: Number(r.rate), source: r.source, day: r.day };
      }
    }
  }
  return map;
}

// Converte um valor de `currency` para BRL usando as cotações resolvidas do dia.
export async function toBrl(amount: number, currency: string, day?: string): Promise<number> {
  if (currency === "BRL" || !currency) return amount;
  const rates = await resolveRates(day);
  if (currency === "USD") {
    const r = rates.USDBRL?.rate;
    if (!r) throw new Error("Sem cotação USD/BRL — informe o câmbio em Financeiro > Câmbio.");
    return amount * r;
  }
  if (currency === "PYG") {
    const r = rates.BRLPYG?.rate;
    if (!r) throw new Error("Sem cotação BRL/PYG — informe o câmbio em Financeiro > Câmbio.");
    return amount / r;
  }
  if (currency === "USDT") {
    // Cotação USDT→BRL própria (Binance), não a do dólar oficial — é
    // justamente por isso que o negócio confia mais em USDT como
    // referência de dólar real que no câmbio comercial.
    const r = rates.USDTBRL?.rate;
    if (!r) throw new Error("Sem cotação USDT/BRL — informe o câmbio em Financeiro > Câmbio.");
    return amount * r;
  }
  throw new Error(`Moeda desconhecida: ${currency}`);
}

// Converte um valor de `currency` para USD usando as cotações resolvidas do
// dia. Usado onde o total precisa ficar comparável entre moedas diferentes
// (ex.: total equivalente do Caixa somando saldos de BRL+USD+PYG+USDT).
export async function toUsd(amount: number, currency: string, day?: string): Promise<number> {
  if (currency === "USD" || !currency) return amount;
  const rates = await resolveRates(day);
  if (currency === "BRL") {
    const r = rates.USDBRL?.rate;
    if (!r) throw new Error("Sem cotação USD/BRL — informe o câmbio em Financeiro > Câmbio.");
    return amount / r;
  }
  if (currency === "PYG") {
    const r = rates.USDPYG?.rate;
    if (!r) throw new Error("Sem cotação USD/PYG — informe o câmbio em Financeiro > Câmbio.");
    return amount / r;
  }
  if (currency === "USDT") {
    // Cotação cruzada USDTBRL ÷ USDBRL: quanto aquele USDT valeria em dólar
    // oficial naquele dia específico, sem fixar paridade 1:1 artificial.
    const usdtBrl = rates.USDTBRL?.rate;
    const usdBrl = rates.USDBRL?.rate;
    if (!usdtBrl || !usdBrl) throw new Error("Sem cotação USDT/BRL ou USD/BRL — informe o câmbio em Financeiro > Câmbio.");
    return amount * (usdtBrl / usdBrl);
  }
  throw new Error(`Moeda desconhecida: ${currency}`);
}

// -------- Endpoints --------

// Cotações de hoje (busca da API se ainda não tem linha API do dia).
router.get("/today", requirePermission("cash", "view"), async (_req: AuthRequest, res) => {
  try {
    const day = todayStr();
    const existing = await db.select({ id: fxRates.id }).from(fxRates)
      .where(and(eq(fxRates.day, day), eq(fxRates.source, "API"))).limit(1);
    if (!existing.length) {
      try { await fetchApiRates(); } catch (e: any) { console.error("[FX] AwesomeAPI falhou:", e.message); }
    }
    const rates = await resolveRates(day);
    res.json({ day, rates });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Força re-busca da API agora.
router.post("/refresh", requirePermission("cash", "view"), async (_req: AuthRequest, res) => {
  try {
    const fetched = await fetchApiRates();
    res.json({ success: true, fetched, rates: await resolveRates() });
  } catch (err: any) { res.status(502).json({ error: `Falha ao buscar câmbio: ${err.message}` }); }
});

// Override manual do dia (taxa real da casa de câmbio). Prevalece sobre a API.
router.post("/override", requirePermission("cash", "manage_accounts"), async (req: AuthRequest, res) => {
  try {
    const { pair, rate } = req.body || {};
    if (!FX_PAIRS.includes(pair)) return res.status(400).json({ error: `Par inválido (${FX_PAIRS.join(", ")}).` });
    const r = Number(rate);
    if (!Number.isFinite(r) || r <= 0) return res.status(400).json({ error: "Taxa inválida." });
    const day = todayStr();
    await db.insert(fxRates)
      .values({ day, pair, rate: r.toFixed(6), source: "MANUAL" })
      .onConflictDoUpdate({
        target: [fxRates.day, fxRates.pair, fxRates.source],
        set: { rate: r.toFixed(6), updatedAt: new Date() },
      });
    await logAction(req.user!.userId, "FX_OVERRIDE", "fx_rates", pair, null, { day, pair, rate: r });
    res.json({ success: true, rates: await resolveRates(day) });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

// Remove o override manual do dia (volta a valer a API).
router.delete("/override/:pair", requirePermission("cash", "manage_accounts"), async (req: AuthRequest, res) => {
  try {
    const pair = String(req.params.pair);
    await db.delete(fxRates).where(and(eq(fxRates.day, todayStr()), eq(fxRates.pair, pair), eq(fxRates.source, "MANUAL")));
    res.json({ success: true, rates: await resolveRates() });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

// Histórico (últimos N dias) — para gráfico de câmbio.
router.get("/history", requirePermission("cash", "view"), async (req: AuthRequest, res) => {
  try {
    const days = Math.min(Math.max(parseInt(String(req.query.days || "30"), 10) || 30, 1), 365);
    const from = new Date(); from.setDate(from.getDate() - days);
    const rows = await db.select().from(fxRates)
      .where(gte(fxRates.day, from.toISOString().slice(0, 10)))
      .orderBy(fxRates.day);
    res.json({ data: rows });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
