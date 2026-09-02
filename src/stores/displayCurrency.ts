import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiFetch } from '../lib/api';

// Moeda de EXIBIÇÃO no admin (R$/US$/G$) — separada do SystemCurrency
// (Configurações > Moeda do Sistema), que mistura exibição com a moeda de
// ENTRADA/gravação dos preços (PriceCurrencyInput) e não tem Guarani.
// Aqui é só leitura: os valores continuam guardados do jeito que já são
// (R$ ou US$ conforme o SystemCurrency), a conversão pra exibição usa a
// cotação viva (fxToday) buscada em cada tela. Compartilhada entre
// Dashboard/Caixa/PDV — escolhe uma vez, as três lembram juntas.
export type DisplayCurrency = 'BRL' | 'USD' | 'PYG';

interface DisplayCurrencyState {
  currency: DisplayCurrency;
  setCurrency: (c: DisplayCurrency) => void;
}

export const useDisplayCurrency = create<DisplayCurrencyState>()(
  persist(
    (set) => ({
      currency: 'BRL',
      setCurrency: (c) => set({ currency: c }),
    }),
    { name: 'dashboard-currency' }
  )
);

export type FxToday = {
  USDBRL?: { rate: number | string };
  BRLPYG?: { rate: number | string };
};

// Converte um valor guardado em R$ pra moeda de exibição escolhida, usando
// a cotação viva do dia (fxToday, GET /api/fx/today). Sem cotação carregada
// ainda pra US$/G$, cai pra R$ em vez de travar/mostrar NaN.
export function formatDisplayBrl(brlValue: any, currency: DisplayCurrency, fxToday: FxToday): string {
  const n = Number(brlValue) || 0;
  if (currency === 'USD' && fxToday.USDBRL?.rate) {
    return `US$ ${(n / Number(fxToday.USDBRL.rate)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (currency === 'PYG' && fxToday.BRLPYG?.rate) {
    return `₲ ${Math.round(n * Number(fxToday.BRLPYG.rate)).toLocaleString('pt-BR')}`;
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

// Cotação viva (GET /api/fx/today) pro <Money> converter pra Guarani em
// qualquer lugar que já usa <Money> (Caixa, PDV, etc.) sem precisar mexer
// em cada chamada. Guarda em store em vez de variável solta pra reagir e
// reprocessar quando a cotação chega — <Money> é chamado dezenas de vezes
// por tela, então o refresh() se protege de disparar N buscas iguais.
let fxRatesInFlight: Promise<void> | null = null;
export const useFxRates = create<FxRatesState>()((set, get) => ({
  loaded: false,
  refresh: async () => {
    if (get().loaded) return;
    if (fxRatesInFlight) return fxRatesInFlight;
    fxRatesInFlight = (async () => {
      try {
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
        // sem cotação: <Money> cai pro comportamento normal (BRL/USD), sem travar.
      } finally {
        fxRatesInFlight = null;
      }
    })();
    return fxRatesInFlight;
  },
}));
