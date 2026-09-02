import { eq } from 'drizzle-orm';
import { db } from '../db';
import { companySettings, currencies } from '../db/schema';

export type ServerCurrencyMode = 'USD' | 'BRL' | 'DUAL';

export interface ServerCurrencySettings {
  mode: ServerCurrencyMode;
  brlRate: number;
}

export function normalizeCurrencyMode(value: unknown): ServerCurrencyMode {
  const normalized = String(value || '').trim().toUpperCase();
  if (normalized === 'BRL') return 'BRL';
  if (normalized === 'DUAL' || normalized === 'USD_BRL' || normalized === 'BOTH') return 'DUAL';
  return 'USD';
}

export function normalizeExchangeRate(value: unknown, fallback = 5.5): number {
  const parsed = Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export async function getServerCurrencySettings(companyCurrency?: unknown): Promise<ServerCurrencySettings> {
  const [companyRows, brlRows] = await Promise.all([
    companyCurrency === undefined ? db.select().from(companySettings).limit(1) : Promise.resolve([]),
    db.select().from(currencies).where(eq(currencies.code, 'BRL')).limit(1),
  ]);

  return {
    mode: normalizeCurrencyMode(companyCurrency ?? companyRows[0]?.defaultCurrency),
    brlRate: normalizeExchangeRate(brlRows[0]?.rateToUsd),
  };
}

function number(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatAmount(value: number): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatServerCurrency(
  value: unknown,
  settings: ServerCurrencySettings,
  dualSeparator = ' / ',
): string {
  const amount = number(value);
  if (settings.mode === 'BRL') return `R$ ${formatAmount(amount)}`;
  const usd = `US$ ${formatAmount(amount)}`;
  if (settings.mode === 'USD') return usd;
  return `${usd}${dualSeparator}R$ ${formatAmount(amount * settings.brlRate)}`;
}
