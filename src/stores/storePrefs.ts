import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const CURRENCIES = [
  { code: 'BRL', flag: '🇧🇷', format: (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
  { code: 'PYG', flag: '🇵🇾', format: (v: number) => `Gs. ${Math.round(v).toLocaleString('es-PY')}` },
  { code: 'USD', flag: '🇺🇸', format: (v: number) => `U$ ${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
] as const;

export const defaultRates = (): Record<string, number> =>
  Object.fromEntries(CURRENCIES.map((c) => [c.code, 1]));

interface StorePrefsState {
  currency: string;
  setCurrency: (c: string) => void;
  rates: Record<string, number>;
  setRates: (rates: Record<string, number>) => void;
  allowedCurrencies: string[];
  setAllowedCurrencies: (codes: string[]) => void;
}

export const useStorePrefs = create<StorePrefsState>()(
  persist(
    (set) => ({
      currency: 'BRL',
      setCurrency: (currency) => set({ currency }),
      rates: defaultRates(),
      setRates: (rates) => set({ rates }),
      allowedCurrencies: ['BRL'],
      setAllowedCurrencies: (codes) => set({ allowedCurrencies: codes.length ? codes : ['BRL'] }),
    }),
    {
      name: 'store-prefs',
      version: 2,
      migrate: (persisted: any) => ({
        ...persisted,
        currency: persisted?.currency || 'BRL',
        allowedCurrencies: Array.isArray(persisted?.allowedCurrencies) ? persisted.allowedCurrencies : ['BRL'],
      }),
    }
  )
);

export function formatPrice(brlPrice: number | string, currency: string, rates: Record<string, number>) {
  const val = Number(brlPrice) || 0;
  const brlRate = rates.BRL || 1;
  const targetRate = rates[currency] || brlRate;
  const converted = (val / brlRate) * targetRate;
  const c = CURRENCIES.find((c) => c.code === currency) || CURRENCIES[0];
  return c.format(converted);
}
