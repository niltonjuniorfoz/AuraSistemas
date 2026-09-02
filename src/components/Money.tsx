import React, { useEffect } from 'react';
import { getCurrencyDisplayParts, SystemCurrency, useCurrencyPreferences } from '../lib/i18n';
import { useDisplayCurrency, useFxRates } from '../stores/displayCurrency';

interface MoneyProps {
  value: number | string | undefined;
  lang?: string;
  currencyOverride?: SystemCurrency | string;
  className?: string;
  title?: string;
}

// Sem currencyOverride explícito, segue o seletor global R$/US$/G$
// (Dashboard/Caixa/PDV) — um override passado pelo chamador (ex.: o "≈
// US$..." do Caixa) sempre vence, nunca é pisado pela preferência global.
export function Money({ value, lang = 'pt-BR', currencyOverride, className = '', title }: MoneyProps) {
  useCurrencyPreferences();
  const { currency: displayCurrency } = useDisplayCurrency();
  const fxRates = useFxRates();
  const needsLiveRate = displayCurrency === 'PYG' || displayCurrency === 'USD';
  useEffect(() => { if (needsLiveRate && !fxRates.loaded) fxRates.refresh(); }, [needsLiveRate, fxRates.loaded]);
  const effectiveOverride = currencyOverride ?? (needsLiveRate ? displayCurrency : undefined);
  const parts = getCurrencyDisplayParts(value, lang, effectiveOverride, fxRates);

  return (
    <span className={`money-value ${parts.length > 1 ? 'money-value-dual' : ''} ${className}`.trim()} title={title}>
      {parts.map((part, index) => (
        <span key={part.currency} className={index > 0 ? 'money-secondary' : 'money-primary'}>
          {part.text}
        </span>
      ))}
    </span>
  );
}
