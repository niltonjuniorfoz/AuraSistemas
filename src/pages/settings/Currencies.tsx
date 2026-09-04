import React, { useEffect, useMemo, useState } from 'react';
import { Check, CircleDollarSign, Save } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { apiFetch } from '../../lib/api';
import { setBrlExchangeRate, setSystemCurrency } from '../../lib/i18n';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';

const CURRENCY_META = {
  BRL: { label: 'Real brasileiro', flag: '🇧🇷', symbol: 'R$', detail: '1 US$ = quantos Reais' },
  PYG: { label: 'Guarani paraguaio', flag: '🇵🇾', symbol: 'Gs.', detail: '1 US$ = quantos Guaranis' },
  USD: { label: 'Dólar americano', flag: '🇺🇸', symbol: 'US$', detail: 'Moeda de referência = 1' },
} as const;

type CurrencyCode = keyof typeof CURRENCY_META;
type SystemMode = 'USD' | 'BRL' | 'DUAL';

type CurrencyConfig = {
  defaultCurrency: SystemMode;
  enabledCurrencies: CurrencyCode[];
  rates: { USD: number; BRL: number; PYG: number };
  pixExchangeRate: number;
};

const DEFAULT_CONFIG: CurrencyConfig = {
  defaultCurrency: 'DUAL',
  enabledCurrencies: ['BRL', 'PYG', 'USD'],
  rates: { USD: 1, BRL: 5.5, PYG: 7300 },
  pixExchangeRate: 5.5,
};

export function Currencies() {
  const { user } = useAuthStore();
  const isAdmin = ['admin', 'master'].includes(user?.role?.toLowerCase() || '');
  const [config, setConfig] = useState<CurrencyConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | ''; text: string }>({ type: '', text: '' });

  useEffect(() => {
    if (!isAdmin) return;
    setLoading(true);
    apiFetch('/api/currency-config')
      .then(async (response) => {
        if (!response.ok) throw new Error('Não foi possível carregar as moedas.');
        const data = await response.json();
        setConfig({
          defaultCurrency: ['USD', 'BRL', 'DUAL'].includes(data.defaultCurrency) ? data.defaultCurrency : 'DUAL',
          enabledCurrencies: Array.isArray(data.enabledCurrencies) && data.enabledCurrencies.length
            ? data.enabledCurrencies.filter((code: string) => ['BRL', 'PYG', 'USD'].includes(code))
            : ['BRL', 'PYG', 'USD'],
          rates: {
            USD: 1,
            BRL: Number(data.rates?.BRL) > 0 ? Number(data.rates.BRL) : 5.5,
            PYG: Number(data.rates?.PYG) > 0 ? Number(data.rates.PYG) : 7300,
          },
          pixExchangeRate: Number(data.pixExchangeRate) > 0 ? Number(data.pixExchangeRate) : Number(data.rates?.BRL) || 5.5,
        });
      })
      .catch((error) => setMessage({ type: 'error', text: error.message || 'Erro ao carregar moedas.' }))
      .finally(() => setLoading(false));
  }, [isAdmin]);

  const toggleCurrency = (code: CurrencyCode) => {
    setConfig((current) => {
      const active = current.enabledCurrencies.includes(code);
      if (active && current.enabledCurrencies.length === 1) return current;
      return {
        ...current,
        enabledCurrencies: active
          ? current.enabledCurrencies.filter((item) => item !== code)
          : [...current.enabledCurrencies, code],
      };
    });
  };

  const preview = useMemo(() => {
    const brl = Number(config.rates.BRL) || 0;
    const pyg = Number(config.rates.PYG) || 0;
    return {
      usd: 'US$ 1,00',
      brl: `R$ ${brl.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`,
      pyg: `Gs. ${Math.round(pyg).toLocaleString('es-PY')}`,
    };
  }, [config.rates]);

  const save = async () => {
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const response = await apiFetch('/api/currency-config', {
        method: 'PUT',
        body: JSON.stringify({
          defaultCurrency: config.defaultCurrency,
          enabledCurrencies: config.enabledCurrencies,
          brlRate: config.rates.BRL,
          pygRate: config.rates.PYG,
          pixExchangeRate: config.pixExchangeRate,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Não foi possível salvar.');

      const next: CurrencyConfig = {
        defaultCurrency: data.defaultCurrency || config.defaultCurrency,
        enabledCurrencies: data.enabledCurrencies || config.enabledCurrencies,
        rates: {
          USD: 1,
          BRL: Number(data.rates?.BRL) || config.rates.BRL,
          PYG: Number(data.rates?.PYG) || config.rates.PYG,
        },
        pixExchangeRate: Number(data.pixExchangeRate) || config.pixExchangeRate,
      };
      setConfig(next);
      setSystemCurrency(next.defaultCurrency);
      setBrlExchangeRate(next.rates.BRL);
      window.dispatchEvent(new CustomEvent('origin:currency-config-change', { detail: next }));
      setMessage({ type: 'success', text: 'Moedas e cotações atualizadas com sucesso.' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Erro ao salvar moedas.' });
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) return <div className="p-8 text-center text-red-400">Acesso negado.</div>;
  if (loading) return <div className="p-8 text-center text-gray-500">Carregando...</div>;

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
          <CircleDollarSign className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-white">Moedas e Cotações</h2>
          <p className="text-sm text-gray-400">Fonte única das conversões do sistema, cadastro de produtos e loja online.</p>
        </div>
      </div>

      {message.text && (
        <div className={`rounded-lg border p-4 text-sm ${message.type === 'success' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' : 'border-red-500/20 bg-red-500/10 text-red-400'}`}>
          {message.text}
        </div>
      )}

      <Card className="gap-0 rounded-xl border-gray-800 bg-brand-navylight p-6 shadow-md">
        <CardContent className="space-y-7 p-0">
          <section>
            <h3 className="mb-1 text-base font-semibold text-white">Modo de operação</h3>
            <p className="mb-4 text-xs text-gray-500">Define em qual moeda os valores são gravados internamente. Mesmo assim, no cadastro você pode digitar em qualquer moeda habilitada.</p>
            <select
              value={config.defaultCurrency}
              onChange={(event) => setConfig((current) => ({ ...current, defaultCurrency: event.target.value as SystemMode }))}
              className="w-full max-w-xl rounded-lg border border-gray-800 bg-[#171717] px-4 py-2.5 text-white outline-none transition focus:border-brand-gold"
            >
              <option value="DUAL">Multimoeda — USD, BRL e PYG (base em US$)</option>
              <option value="BRL">Base em Real — R$</option>
              <option value="USD">Base em Dólar — US$</option>
            </select>
          </section>

          <section className="border-t border-gray-800 pt-6">
            <h3 className="mb-1 text-base font-semibold text-white">Moedas disponíveis na loja</h3>
            <p className="mb-4 text-xs text-gray-500">As moedas marcadas aparecem no seletor da vitrine. Por padrão, deixe as três ativas.</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {(Object.keys(CURRENCY_META) as CurrencyCode[]).map((code) => {
                const meta = CURRENCY_META[code];
                const active = config.enabledCurrencies.includes(code);
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => toggleCurrency(code)}
                    className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${active ? 'border-brand-gold/50 bg-brand-gold/5 text-white' : 'border-gray-800 bg-[#171717] text-gray-500'}`}
                  >
                    <span className="text-xl leading-none">{meta.flag}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">{code}</span>
                      <span className="block truncate text-xs opacity-70">{meta.label}</span>
                    </span>
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full border ${active ? 'border-brand-gold bg-brand-gold text-black' : 'border-gray-700'}`}>
                      {active && <Check className="h-3.5 w-3.5" />}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="border-t border-gray-800 pt-6">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-white">Cotações</h3>
                <p className="text-xs text-gray-500">Use o Dólar como referência: 1 US$ = valor abaixo.</p>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-gray-800 bg-[#171717] px-3 py-2 text-xs text-gray-400">
                <span>🇺🇸 {preview.usd}</span><span className="text-gray-700">·</span><span>🇧🇷 {preview.brl}</span><span className="text-gray-700">·</span><span>🇵🇾 {preview.pyg}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-2 rounded-xl border border-gray-800 bg-[#171717] p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-white"><span>🇺🇸</span> Dólar</div>
                <label className="text-xs text-gray-500">Referência</label>
                <div className="rounded-lg border border-gray-800 bg-black/20 px-3 py-2.5 text-sm text-gray-400">US$ 1,00</div>
              </div>
              <div className="space-y-2 rounded-xl border border-gray-800 bg-[#171717] p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-white"><span>🇧🇷</span> Real</div>
                <label className="text-xs text-gray-500">1 US$ = R$</label>
                <input
                  type="number"
                  min="0.0001"
                  step="0.0001"
                  value={config.rates.BRL}
                  onChange={(event) => setConfig((current) => ({ ...current, rates: { ...current.rates, BRL: Number(event.target.value) } }))}
                  className="w-full rounded-lg border border-gray-800 bg-black/20 px-3 py-2.5 text-white outline-none transition focus:border-brand-gold"
                />
              </div>
              <div className="space-y-2 rounded-xl border border-gray-800 bg-[#171717] p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-white"><span>🇵🇾</span> Guarani</div>
                <label className="text-xs text-gray-500">1 US$ = Gs.</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={config.rates.PYG}
                  onChange={(event) => setConfig((current) => ({ ...current, rates: { ...current.rates, PYG: Number(event.target.value) } }))}
                  className="w-full rounded-lg border border-gray-800 bg-black/20 px-3 py-2.5 text-white outline-none transition focus:border-brand-gold"
                />
              </div>
            </div>
          </section>

          <section className="border-t border-gray-800 pt-6">
            <h3 className="mb-1 text-base font-semibold text-white">PIX</h3>
            <p className="mb-3 text-xs text-gray-500">Cotação usada na cobrança PIX quando o valor base estiver em Dólar.</p>
            <div className="max-w-sm">
              <label className="mb-2 block text-xs text-gray-400">1 US$ = R$ no PIX</label>
              <input
                type="number"
                min="0.0001"
                step="0.0001"
                value={config.pixExchangeRate}
                onChange={(event) => setConfig((current) => ({ ...current, pixExchangeRate: Number(event.target.value) }))}
                className="w-full rounded-lg border border-gray-800 bg-[#171717] px-4 py-2.5 text-white outline-none transition focus:border-brand-gold"
              />
            </div>
          </section>

          <div className="flex justify-end border-t border-gray-800 pt-6">
            <Button
              onClick={save}
              disabled={saving}
              className="h-auto gap-2 rounded-lg bg-brand-gold px-6 py-2.5 text-base font-medium text-brand-navydark hover:bg-brand-goldhover"
            >
              <Save className="h-4 w-4" /> {saving ? 'Salvando...' : 'Salvar moedas e cotações'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
