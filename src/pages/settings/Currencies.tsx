import React, { useEffect, useState } from 'react';
import { DollarSign, Save } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { apiFetch } from '../../lib/api';
import { currencyLabel, getSystemCurrency, setBrlExchangeRate } from '../../lib/i18n';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';

export function Currencies() {
  const { user } = useAuthStore();
  const isAdmin = ['admin', 'master'].includes(user?.role?.toLowerCase() || '');

  const [brlRate, setBrlRate] = useState('');
  const [pygRate, setPygRate] = useState('');
  const [pixRate, setPixRate] = useState('');
  const [loading, setLoading] = useState(true);
  const [savings, setSavings] = useState<{ [key: string]: boolean }>({});
  const [messages, setMessages] = useState<{ [key: string]: { type: string; text: string } }>({});
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const systemCurrency = getSystemCurrency();

  useEffect(() => {
    if (isAdmin) loadRates();
  }, [isAdmin]);

  const loadRates = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/settings/currencies');
      if (res.ok) {
        const data = await res.json();
        const brl = data.find((c: any) => c.code === 'BRL');
        const pyg = data.find((c: any) => c.code === 'PYG');
        if (brl) {
          setBrlRate(brl.rateToUsd);
          if (brl.updatedAt && (!lastUpdated || new Date(brl.updatedAt) > new Date(lastUpdated))) setLastUpdated(brl.updatedAt);
        }
        if (pyg) {
          setPygRate(pyg.rateToUsd);
          if (pyg.updatedAt && (!lastUpdated || new Date(pyg.updatedAt) > new Date(lastUpdated))) setLastUpdated(pyg.updatedAt);
        }
      }
      const pixRes = await apiFetch('/api/settings/pix');
      if (pixRes.ok) {
        const pix = await pixRes.json();
        setPixRate(pix.pixExchangeRate || '5.50');
      }
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (code: string, type: string, text: string) => {
    setMessages(prev => ({ ...prev, [code]: { type, text } }));
    setTimeout(() => setMessages(prev => ({ ...prev, [code]: { type: '', text: '' } })), 3000);
  };

  const handleSave = async (code: string, rate: string) => {
    setSavings(prev => ({ ...prev, [code]: true }));
    setMessages(prev => ({ ...prev, [code]: { type: '', text: '' } }));
    try {
      const res = await apiFetch('/api/settings/currencies', {
        method: 'PUT',
        body: JSON.stringify({ code, rateToUsd: rate })
      });
      if (res.ok) {
        if (code === 'BRL') setBrlExchangeRate(rate);
        showMessage(code, 'success', 'Atualizado');
        setLastUpdated(new Date().toISOString());
      } else {
        const data = await res.json().catch(() => ({}));
        showMessage(code, 'error', data.error || 'Erro');
      }
    } catch {
      showMessage(code, 'error', 'Erro');
    } finally {
      setSavings(prev => ({ ...prev, [code]: false }));
    }
  };

  const handleSavePix = async () => {
    setSavings(prev => ({ ...prev, PIX: true }));
    setMessages(prev => ({ ...prev, PIX: { type: '', text: '' } }));
    try {
      const res = await apiFetch('/api/settings/pix', {
        method: 'PUT',
        body: JSON.stringify({ pixExchangeRate: pixRate })
      });
      if (res.ok) {
        showMessage('PIX', 'success', 'Atualizado');
        setLastUpdated(new Date().toISOString());
      } else {
        const data = await res.json().catch(() => ({}));
        showMessage('PIX', 'error', data.error || 'Erro');
      }
    } catch {
      showMessage('PIX', 'error', 'Erro');
    } finally {
      setSavings(prev => ({ ...prev, PIX: false }));
    }
  };

  if (!isAdmin) return <div className="p-8 text-center text-red-400">Acesso negado.</div>;
  if (loading) return <div className="p-8 text-center text-gray-500">Carregando...</div>;

  const rateRows = [
    { code: 'BRL', label: 'BRL (Real)', inputLabel: systemCurrency === 'BRL' ? 'Cotação desconsiderada' : 'Cotação (R$ por US$)', value: brlRate, setValue: setBrlRate, step: '0.01', placeholder: '5.45', action: () => handleSave('BRL', brlRate), button: 'Atualizar Real' },
    { code: 'PYG', label: 'PYG (Guaraní)', inputLabel: systemCurrency === 'BRL' ? 'Cotação desconsiderada' : 'Cotação (US$ para PYG)', value: pygRate, setValue: setPygRate, step: '1', placeholder: '7300', action: () => handleSave('PYG', pygRate), button: 'Atualizar Guaraní' },
    { code: 'PIX', label: 'PIX (BRL)', inputLabel: systemCurrency === 'BRL' ? 'PIX em R$ sem cotação' : 'Cotação PIX (R$ por US$)', value: pixRate, setValue: setPixRate, step: '0.01', placeholder: '5.50', action: handleSavePix, button: 'Atualizar Cotação PIX', note: systemCurrency === 'BRL' ? 'Com o sistema em Real, o PIX usa o valor direto em R$.' : 'Sincroniza com Configurações > Empresa.' },
  ];

  return (
    <div className="currency-rate-page max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center text-green-400">
          <DollarSign className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-white">Moedas e Cotações</h2>
          <p className="text-gray-400 text-sm">Gerencie o câmbio oficial utilizado no ponto de venda.</p>
        </div>
      </div>

      <Card className="rounded-xl gap-0 border-gray-800 bg-brand-navylight p-6 shadow-md">
      <CardContent className="p-0">
        <div className="mb-6 p-4 bg-[#171717] border border-gray-800 rounded-lg flex items-start gap-4">
          <div className="text-green-400 mt-1">✓</div>
          <div>
            <h3 className="text-white font-medium">Moeda do Sistema: {currencyLabel(systemCurrency)}</h3>
            <p className="text-gray-400 text-sm">{systemCurrency === 'BRL' ? 'Cotações desconsideradas enquanto o sistema estiver em Real.' : systemCurrency === 'DUAL' ? 'O dólar é o valor base e o Real é exibido pela cotação abaixo.' : 'As conversões são baseadas na moeda principal em Dólar.'}</p>
          </div>
        </div>

        <div className="divide-y divide-gray-800">
          {rateRows.map(row => (
            <div key={row.code} className="currency-rate-row grid grid-cols-1 md:grid-cols-3 gap-6 items-end py-5 first:pt-0 last:pb-0">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">{row.code === 'PIX' ? 'Uso' : 'Moeda'}</label>
                <div className="w-full bg-[#171717] border border-gray-800 rounded-lg px-4 py-2.5 text-white/50 cursor-not-allowed">
                  {row.label}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">{row.inputLabel}</label>
                <input
                  type="number"
                  step={row.step}
                  value={row.value}
                  onChange={e => row.setValue(e.target.value)}
                  placeholder={row.placeholder}
                  disabled={systemCurrency === 'BRL'}
                  className="w-full bg-[#171717] border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-brand-gold transition-colors disabled:opacity-50"
                />
                {row.note && <p className="text-xs text-gray-500">{row.note}</p>}
              </div>
              <div className="space-y-2 relative">
                <Button
                  variant="outline"
                  onClick={row.action}
                  disabled={savings[row.code] || systemCurrency === 'BRL'}
                  className="w-full h-auto justify-center gap-2 rounded-lg border-gray-700 bg-[#171717] px-4 py-2.5 has-[>svg]:px-4 text-base font-medium text-white shadow-none hover:bg-gray-800 hover:text-white dark:border-gray-700 dark:bg-[#171717] dark:hover:bg-gray-800 dark:hover:text-white"
                >
                  <Save className="size-4" /> {savings[row.code] ? 'Atualizando...' : row.button}
                </Button>
                {messages[row.code]?.text && <div className={`absolute -top-6 right-0 text-xs ${messages[row.code].type === 'success' ? 'text-green-400' : 'text-red-400'}`}>{messages[row.code].text}</div>}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 text-xs text-gray-500 font-mono">
          Última atualização: {lastUpdated ? new Date(lastUpdated).toLocaleString() : new Date().toLocaleString()}
        </div>
      </CardContent>
      </Card>
    </div>
  );
}
