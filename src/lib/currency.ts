// src/lib/currency.ts
// Fonte única de verdade pra "quais moedas o sistema aceita" — usado em front
// e back. Antes desta constante, cada rota validava moeda com seu próprio
// ["BRL","USD","PYG"].includes(...) copiado à mão (purchases.ts x3, finance.ts
// x2, cash.ts) — fácil esquecer um lugar ao adicionar moeda nova.
export const CURRENCIES = ["BRL", "USD", "PYG", "USDT"] as const;
export type Currency = (typeof CURRENCIES)[number];

export function isValidCurrency(value: unknown): value is Currency {
  return typeof value === "string" && (CURRENCIES as readonly string[]).includes(value);
}

export const CURRENCY_SYMBOL: Record<Currency, string> = {
  BRL: "R$",
  USD: "US$",
  PYG: "₲",
  USDT: "USDT",
};

export const CURRENCY_LABEL: Record<Currency, string> = {
  BRL: "R$ Real",
  USD: "US$ Dólar",
  PYG: "₲ Guarani",
  USDT: "USDT (Tether)",
};
