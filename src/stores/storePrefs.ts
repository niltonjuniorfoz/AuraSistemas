import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const CURRENCIES = [
  { code: 'BRL', flag: '🇧🇷', format: (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
  { code: 'PYG', flag: '🇵🇾', format: (v: number) => `Gs. ${Math.round(v).toLocaleString('es-PY')}` },
  { code: 'USD', flag: '🇺🇸', format: (v: number) => `U$ ${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
] as const;

export const defaultRates = (): Record<string, number> =>
  Object.fromEntries(CURRENCIES.map((c) => [c.code, 1]));

type StoreBaseCurrency = 'BRL' | 'USD';

interface StorePrefsState {
  currency: string;
  setCurrency: (c: string) => void;
  rates: Record<string, number>;
  setRates: (rates: Record<string, number>) => void;
  allowedCurrencies: string[];
  baseCurrency: StoreBaseCurrency;
  setAllowedCurrencies: (codes: string[]) => void;
}

const normalizeCodes = (codes: string[]) => {
  const unique = [...new Set((codes || []).map((code) => String(code || '').toUpperCase()).filter(Boolean))];
  return unique.length ? unique : ['BRL'];
};

export const useStorePrefs = create<StorePrefsState>()(
  persist(
    (set) => ({
      currency: 'BRL',
      setCurrency: (currency) => set({ currency }),
      rates: defaultRates(),
      setRates: (rates) => set({ rates }),
      allowedCurrencies: ['BRL'],
      baseCurrency: 'BRL',
      setAllowedCurrencies: (codes) => set((state) => {
        const allowedCurrencies = normalizeCodes(codes);
        // O backend grava preço em R$ quando o sistema é BRL e em US$ quando
        // existe USD na configuração (USD ou DUAL). Inferir aqui evita que a
        // vitrine trate um preço-base em dólar como se já fosse Real.
        const baseCurrency: StoreBaseCurrency = allowedCurrencies.includes('USD') ? 'USD' : 'BRL';
        const currency = allowedCurrencies.includes(state.currency) ? state.currency : allowedCurrencies[0];
        return { allowedCurrencies, baseCurrency, currency };
      }),
    }),
    {
      name: 'store-prefs',
      version: 3,
      migrate: (persisted: any) => {
        const allowedCurrencies = normalizeCodes(
          Array.isArray(persisted?.allowedCurrencies) ? persisted.allowedCurrencies : ['BRL']
        );
        const baseCurrency: StoreBaseCurrency = allowedCurrencies.includes('USD') ? 'USD' : 'BRL';
        const currency = allowedCurrencies.includes(persisted?.currency) ? persisted.currency : allowedCurrencies[0];
        return { ...persisted, currency, allowedCurrencies, baseCurrency };
      },
    }
  )
);

export function formatPrice(basePrice: number | string, currency: string, rates: Record<string, number>) {
  const val = Number(basePrice) || 0;
  const state = useStorePrefs.getState();
  const brlRate = Number(rates.BRL) > 0 ? Number(rates.BRL) : 1;
  const targetRate = Number(rates[currency]) > 0 ? Number(rates[currency]) : (currency === 'USD' ? 1 : brlRate);

  // Normaliza primeiro para USD e só depois converte para a moeda solicitada.
  const usdValue = state.baseCurrency === 'USD' ? val : val / brlRate;
  const converted = currency === 'USD' ? usdValue : usdValue * targetRate;
  const isDualUsdBrl = state.baseCurrency === 'USD'
    && state.allowedCurrencies.includes('USD')
    && state.allowedCurrencies.includes('BRL');

  // No modo Dólar + Real o valor em Real é sempre inteiro e arredondado para
  // cima. Ex.: US$ convertido em R$ 11,08 aparece/sugere R$ 12.
  if (currency === 'BRL' && isDualUsdBrl) {
    const roundedUp = Math.ceil(converted - 1e-9);
    return `R$ ${roundedUp.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`;
  }

  const c = CURRENCIES.find((item) => item.code === currency) || CURRENCIES[0];
  return c.format(converted);
}
