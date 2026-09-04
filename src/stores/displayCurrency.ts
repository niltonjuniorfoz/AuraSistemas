import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiFetch } from '../lib/api';

export type DisplayCurrency = 'BRL' | 'USD' | 'PYG';

type SystemDisplayRates = {
  BRL: number; // quantos R$ = US$ 1
  PYG: number; // quantos Gs = US$ 1
};

interface DisplayCurrencyState {
  currency: DisplayCurrency;
  rates: SystemDisplayRates;
  ratesLoaded: boolean;
  setCurrency: (c: DisplayCurrency) => void;
  refreshRates: (force?: boolean) => Promise<void>;
}

let ratesInFlight: Promise<void> | null = null;

export const useDisplayCurrency = create<DisplayCurrencyState>()(
  persist(
    (set, get) => ({
      currency: 'BRL',
      rates: { BRL: 5.5, PYG: 7300 },
      ratesLoaded: false,
      setCurrency: (currency) => set({ currency }),
      refreshRates: async (force = false) => {
        if (!force && get().ratesLoaded) return;
        if (ratesInFlight) return ratesInFlight;
        ratesInFlight = (async () => {
          try {
            const res = await apiFetch('/api/currency-config');
            if (!res.ok) return;
            const data = await res.json();
            const brl = Number(data?.rates?.BRL);
            const pyg = Number(data?.rates?.PYG);
            set((state) => ({
              rates: {
                BRL: Number.isFinite(brl) && brl > 0 ? brl : state.rates.BRL,
                PYG: Number.isFinite(pyg) && pyg > 0 ? pyg : state.rates.PYG,
              },
              ratesLoaded: true,
            }));
          } catch {
            // Mantém a última cotação conhecida/persistida. A exibição nunca trava.
          } finally {
            ratesInFlight = null;
          }
        })();
        return ratesInFlight;
      },
    }),
    {
      name: 'dashboard-currency',
      version: 2,
      partialize: (state) => ({ currency: state.currency, rates: state.rates }),
      migrate: (persisted: any) => ({
        ...persisted,
        currency: ['BRL', 'USD', 'PYG'].includes(persisted?.currency) ? persisted.currency : 'BRL',
        rates: {
          BRL: Number(persisted?.rates?.BRL) > 0 ? Number(persisted.rates.BRL) : 5.5,
          PYG: Number(persisted?.rates?.PYG) > 0 ? Number(persisted.rates.PYG) : 7300,
        },
        ratesLoaded: false,
      }),
    }
  )
);

export type FxToday = {
  USDBRL?: { rate: number | string };
  BRLPYG?: { rate: number | string };
};

// Todos os indicadores do painel chegam em BRL. A fonte principal da conversão
// é Configurações > Moedas; fxToday fica apenas como compatibilidade/fallback.
export function formatDisplayBrl(brlValue: any, currency: DisplayCurrency, fxToday: FxToday = {}): string {
  const n = Number(brlValue) || 0;
  const configured = useDisplayCurrency.getState().rates;
  const usdBrl = Number(configured.BRL) > 0
    ? Number(configured.BRL)
    : Number(fxToday.USDBRL?.rate) > 0 ? Number(fxToday.USDBRL?.rate) : 5.5;
  const brlPygFromConfig = Number(configured.PYG) > 0 && usdBrl > 0 ? Number(configured.PYG) / usdBrl : 0;
  const brlPyg = brlPygFromConfig > 0
    ? brlPygFromConfig
    : Number(fxToday.BRLPYG?.rate) > 0 ? Number(fxToday.BRLPYG?.rate) : 7300 / 5.5;

  if (currency === 'USD') {
    return `US$ ${(n / usdBrl).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (currency === 'PYG') {
    return `Gs. ${Math.round(n * brlPyg).toLocaleString('es-PY')}`;
  }
  return `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface FxRatesState {
  BRLPYG?: number;
  USDPYG?: number;
  USDBRL?: number;
  loaded: boolean;
  refresh: () => Promise<void>;
}

// Mantido para componentes legados <Money>. Primeiro tenta a configuração
// administrativa; se falhar, usa o endpoint histórico de câmbio.
let fxRatesInFlight: Promise<void> | null = null;
export const useFxRates = create<FxRatesState>()((set, get) => ({
  loaded: false,
  refresh: async () => {
    if (get().loaded) return;
    if (fxRatesInFlight) return fxRatesInFlight;
    fxRatesInFlight = (async () => {
      try {
        const configRes = await apiFetch('/api/currency-config');
        if (configRes.ok) {
          const data = await configRes.json();
          const usdBrl = Number(data?.rates?.BRL);
          const usdPyg = Number(data?.rates?.PYG);
          if (usdBrl > 0 && usdPyg > 0) {
            set({ USDBRL: usdBrl, USDPYG: usdPyg, BRLPYG: usdPyg / usdBrl, loaded: true });
            return;
          }
        }
        const res = await apiFetch('/api/fx/today');
        if (res.ok) {
          const { rates } = await res.json();
          set({
            BRLPYG: rates?.BRLPYG?.rate ? Number(rates.BRLPYG.rate) : undefined,
            USDPYG: rates?.USDPYG?.rate ? Number(rates.USDPYG.rate) : undefined,
            USDBRL: rates?.USDBRL?.rate ? Number(rates.USDBRL.rate) : undefined,
            loaded: true,
          });
        }
      } catch {
        // Sem cotação: os componentes continuam usando seus fallbacks.
      } finally {
        fxRatesInFlight = null;
      }
    })();
    return fxRatesInFlight;
  },
}));
