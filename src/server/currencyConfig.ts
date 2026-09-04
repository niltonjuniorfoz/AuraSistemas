import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { companySettings, currencies, systemSettings } from "../db/schema";
import { AuthRequest, requireAuth, requirePermission } from "./authMiddleware";
import { logAction } from "./audit";
import { clearApiCache } from "./cache";

const router = Router();
const PREFS_KEY = "currency_preferences";
const PIX_KEY = "company_pix";
const SUPPORTED = ["BRL", "PYG", "USD"] as const;
type SupportedCurrency = (typeof SUPPORTED)[number];

const DEFAULT_RATES: Record<SupportedCurrency, number> = {
  USD: 1,
  BRL: 5.5,
  PYG: 7300,
};

function positiveNumber(value: unknown, fallback: number) {
  const parsed = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeEnabled(value: unknown): SupportedCurrency[] {
  const raw = Array.isArray(value) ? value : [];
  const unique = [...new Set(raw.map((item) => String(item || "").toUpperCase()))]
    .filter((code): code is SupportedCurrency => SUPPORTED.includes(code as SupportedCurrency));
  return unique.length ? unique : [...SUPPORTED];
}

function normalizeMode(value: unknown): "BRL" | "USD" | "DUAL" {
  const mode = String(value || "").toUpperCase();
  if (mode === "BRL" || mode === "USD" || mode === "DUAL") return mode;
  return "DUAL";
}

async function readCurrencyConfig() {
  const [companyRows, currencyRows, preferenceRows, pixRows] = await Promise.all([
    db.select().from(companySettings).limit(1),
    db.select().from(currencies),
    db.select().from(systemSettings).where(eq(systemSettings.key, PREFS_KEY)).limit(1),
    db.select().from(systemSettings).where(eq(systemSettings.key, PIX_KEY)).limit(1),
  ]);

  const rateMap = new Map(currencyRows.map((row) => [String(row.code || "").toUpperCase(), positiveNumber(row.rateToUsd, 1)]));
  const preferences = (preferenceRows[0]?.value as any) || {};
  const pix = (pixRows[0]?.value as any) || {};
  const defaultCurrency = normalizeMode(companyRows[0]?.defaultCurrency || preferences.defaultCurrency || "DUAL");
  const enabledCurrencies = normalizeEnabled(preferences.enabledCurrencies);

  return {
    defaultCurrency,
    enabledCurrencies,
    rates: {
      USD: 1,
      BRL: positiveNumber(rateMap.get("BRL"), DEFAULT_RATES.BRL),
      PYG: positiveNumber(rateMap.get("PYG"), DEFAULT_RATES.PYG),
    },
    pixExchangeRate: positiveNumber(pix.pixExchangeRate, positiveNumber(rateMap.get("BRL"), DEFAULT_RATES.BRL)),
  };
}

async function upsertSystemSetting(key: string, value: any) {
  const rows = await db.select().from(systemSettings).where(eq(systemSettings.key, key)).limit(1);
  if (rows.length) {
    await db.update(systemSettings).set({ value, updatedAt: new Date() }).where(eq(systemSettings.key, key));
  } else {
    await db.insert(systemSettings).values({ key, value });
  }
}

async function upsertRate(code: SupportedCurrency, rate: number, updatedBy: string) {
  const existing = await db.select().from(currencies).where(eq(currencies.code, code)).limit(1);
  const metadata = code === "USD"
    ? { name: "Dólar americano", symbol: "US$" }
    : code === "BRL"
      ? { name: "Real brasileiro", symbol: "R$" }
      : { name: "Guarani paraguaio", symbol: "Gs" };

  if (existing.length) {
    await db.update(currencies).set({
      rateToUsd: String(rate),
      name: existing[0].name || metadata.name,
      symbol: existing[0].symbol || metadata.symbol,
      updatedAt: new Date(),
      updatedBy,
    }).where(eq(currencies.code, code));
  } else {
    await db.insert(currencies).values({
      code,
      name: metadata.name,
      symbol: metadata.symbol,
      rateToUsd: String(rate),
      updatedBy,
    });
  }
}

router.get("/public", async (_req, res) => {
  try {
    const config = await readCurrencyConfig();
    res.setHeader("Cache-Control", "no-store");
    res.json(config);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Não foi possível carregar as moedas." });
  }
});

router.use((req, res, next) => requireAuth(req as AuthRequest, res, next));

router.get("/", requirePermission("settings", "manage"), async (_req: AuthRequest, res) => {
  try {
    res.json(await readCurrencyConfig());
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Não foi possível carregar as moedas." });
  }
});

router.put("/", requirePermission("settings", "manage"), async (req: AuthRequest, res) => {
  try {
    const updatedBy = req.user!.userId;
    const current = await readCurrencyConfig();
    const defaultCurrency = normalizeMode(req.body?.defaultCurrency ?? current.defaultCurrency);
    const enabledCurrencies = normalizeEnabled(req.body?.enabledCurrencies ?? current.enabledCurrencies);
    const brlRate = positiveNumber(req.body?.brlRate ?? req.body?.rates?.BRL, current.rates.BRL);
    const pygRate = positiveNumber(req.body?.pygRate ?? req.body?.rates?.PYG, current.rates.PYG);
    const pixExchangeRate = positiveNumber(req.body?.pixExchangeRate, brlRate);

    await Promise.all([
      upsertRate("USD", 1, updatedBy),
      upsertRate("BRL", brlRate, updatedBy),
      upsertRate("PYG", pygRate, updatedBy),
    ]);

    const companyRows = await db.select().from(companySettings).limit(1);
    if (companyRows.length) {
      await db.update(companySettings).set({ defaultCurrency, updatedAt: new Date(), updatedBy }).where(eq(companySettings.id, companyRows[0].id));
    } else {
      await db.insert(companySettings).values({ defaultCurrency, updatedBy });
    }

    await upsertSystemSetting(PREFS_KEY, { defaultCurrency, enabledCurrencies });

    const pixRows = await db.select().from(systemSettings).where(eq(systemSettings.key, PIX_KEY)).limit(1);
    const oldPix = (pixRows[0]?.value as any) || {};
    await upsertSystemSetting(PIX_KEY, {
      ...oldPix,
      pixKey: String(oldPix.pixKey || ""),
      pixExchangeRate: String(pixExchangeRate),
    });

    clearApiCache("settings:");
    await logAction(updatedBy, "UPDATE", "currency_preferences", PREFS_KEY, current, {
      defaultCurrency,
      enabledCurrencies,
      rates: { USD: 1, BRL: brlRate, PYG: pygRate },
      pixExchangeRate,
    });

    res.json(await readCurrencyConfig());
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Não foi possível salvar as moedas." });
  }
});

export default router;
