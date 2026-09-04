import React, { useEffect } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useDisplayCurrency } from '../stores/displayCurrency';

export function AdminExchangeBadge() {
  const navigate = useNavigate();
  const { rates, refreshRates } = useDisplayCurrency();

  useEffect(() => {
    refreshRates();
    const refresh = () => refreshRates(true);
    window.addEventListener('origin:currency-config-change', refresh);
    return () => window.removeEventListener('origin:currency-config-change', refresh);
  }, [refreshRates]);

  return (
    <button
      type="button"
      onClick={() => navigate('/settings/currencies')}
      title="Cotações usadas pelo sistema — clique para alterar"
      className="hidden h-9 items-center gap-2 rounded-lg border border-gray-700 bg-[#171717] px-2.5 text-[10px] font-semibold text-gray-400 transition hover:border-primary/60 hover:text-white lg:flex"
    >
      <ArrowLeftRight className="h-3.5 w-3.5 text-primary" />
      <span className="whitespace-nowrap">US$ 1 = <b className="text-gray-200">R$ {Number(rates.BRL || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</b></span>
      <span className="text-gray-600">·</span>
      <span className="whitespace-nowrap"><b className="text-gray-200">Gs. {Math.round(Number(rates.PYG || 0)).toLocaleString('es-PY')}</b></span>
    </button>
  );
}
