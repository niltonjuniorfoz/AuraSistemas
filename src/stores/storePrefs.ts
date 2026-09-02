import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Única lista de moedas da loja — antes BRL/PYG/USD apareciam hardcoded aqui,
// no dropdown do header (ShopLayout.tsx) e nos ifs do formatPrice, cada um
// podendo ficar desatualizado sem os outros perceberem.
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
}

export const useStorePrefs = create<StorePrefsState>()(
  persist(
    (set) => ({
      currency: 'BRL',
      setCurrency: (c) => set({ currency: c }),
      rates: defaultRates(),
      setRates: (rates) => set({ rates })
    }),
    { name: 'store-prefs' }
  )
);

export function formatPrice(brlPrice: number | string, currency: string, rates: Record<string, number>) {
  const val = Number(brlPrice) || 0;
  // Preço vem sempre em R$ (products.salePriceA). rates[code] = quantas
  // unidades daquela moeda valem 1 USD, então convertemos via USD como base.
  const brlRate = rates.BRL || 1;
  const targetRate = rates[currency] || brlRate;
  const converted = (val / brlRate) * targetRate;
  const c = CURRENCIES.find((c) => c.code === currency) || CURRENCIES[0];
  return c.format(converted);
}
