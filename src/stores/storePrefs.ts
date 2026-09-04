import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const CURRENCIES = [
  { code: 'BRL', flag: '🇧🇷', format: (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
  { code: 'PYG', flag: '🇵🇾', format: (v: number) => `Gs. ${Math.round(v).toLocaleString('es-PY')}` },
  { code: 'USD', flag: '🇺🇸', format: (v: number) => `U$ ${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
] as const;

export const defaultRates = (): Record<string, number> => ({ USD: 1, BRL: 5.5, PYG: 7300 });

type StoreBaseCurrency = 'BRL' | 'USD';

type CurrencyConfig = {
  codes: string[];
  rates: Record<string, number>;
  baseCurrency: StoreBaseCurrency;
};

interface StorePrefsState {
  currency: string;
  setCurrency: (c: string) => void;
  rates: Record<string, number>;
  setRates: (rates: Record<string, number>) => void;
  allowedCurrencies: string[];
  baseCurrency: StoreBaseCurrency;
  authoritativeConfig: boolean;
  setAllowedCurrencies: (codes: string[]) => void;
  setCurrencyConfig: (config: CurrencyConfig) => void;
}

const normalizeCodes = (codes: string[]) => {
  const unique = [...new Set((codes || []).map((code) => String(code || '').toUpperCase()).filter((code) => ['BRL', 'PYG', 'USD'].includes(code)))];
  return unique.length ? unique : ['BRL', 'PYG', 'USD'];
};

export const useStorePrefs = create<StorePrefsState>()(
  persist(
    (set) => ({
      currency: 'BRL',
      setCurrency: (currency) => set((state) => state.allowedCurrencies.includes(currency) ? { currency } : state),
      rates: defaultRates(),
      setRates: (rates) => set((state) => state.authoritativeConfig ? state : { rates: { ...defaultRates(), ...rates } }),
      allowedCurrencies: ['BRL', 'PYG', 'USD'],
      baseCurrency: 'BRL',
      authoritativeConfig: false,
      setAllowedCurrencies: (codes) => set((state) => {
        if (state.authoritativeConfig) return state;
        const allowedCurrencies = normalizeCodes(codes);
        const baseCurrency: StoreBaseCurrency = allowedCurrencies.includes('USD') ? 'USD' : 'BRL';
        const currency = allowedCurrencies.includes(state.currency) ? state.currency : allowedCurrencies[0];
        return { allowedCurrencies, baseCurrency, currency };
      }),
      setCurrencyConfig: ({ codes, rates, baseCurrency }) => set((state) => {
        const allowedCurrencies = normalizeCodes(codes);
        const currency = allowedCurrencies.includes(state.currency) ? state.currency : allowedCurrencies[0];
        return {
          allowedCurrencies,
          rates: { ...defaultRates(), ...rates, USD: 1 },
          baseCurrency,
          currency,
          authoritativeConfig: true,
        };
      }),
    }),
    {
      name: 'store-prefs',
      version: 4,
      partialize: (state) => ({
        currency: state.currency,
        rates: state.rates,
        allowedCurrencies: state.allowedCurrencies,
        baseCurrency: state.baseCurrency,
      }),
      migrate: (persisted: any) => {
        const allowedCurrencies = normalizeCodes(
          Array.isArray(persisted?.allowedCurrencies) ? persisted.allowedCurrencies : ['BRL', 'PYG', 'USD']
        );
        const baseCurrency: StoreBaseCurrency = persisted?.baseCurrency === 'USD' ? 'USD' : 'BRL';
        const currency = allowedCurrencies.includes(persisted?.currency) ? persisted.currency : allowedCurrencies[0];
        return {
          ...persisted,
          currency,
          rates: { ...defaultRates(), ...(persisted?.rates || {}) },
          allowedCurrencies,
          baseCurrency,
          authoritativeConfig: false,
        };
      },
    }
  )
);

export function formatPrice(basePrice: number | string, currency: string, rates: Record<string, number>) {
  const val = Number(basePrice) || 0;
  const state = useStorePrefs.getState();
  const brlRate = Number(rates.BRL) > 0 ? Number(rates.BRL) : 5.5;
  const targetRate = Number(rates[currency]) > 0 ? Number(rates[currency]) : (currency === 'PYG' ? 7300 : currency === 'USD' ? 1 : brlRate);

  const usdValue = state.baseCurrency === 'USD' ? val : val / brlRate;
  const converted = currency === 'USD' ? usdValue : usdValue * targetRate;
  const convertedFromUsdToBrl = currency === 'BRL' && state.baseCurrency === 'USD';

  if (convertedFromUsdToBrl) {
    const roundedUp = Math.ceil(converted - 1e-6);
    return `R$ ${roundedUp.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`;
  }

  const c = CURRENCIES.find((item) => item.code === currency) || CURRENCIES[0];
  return c.format(converted);
}
