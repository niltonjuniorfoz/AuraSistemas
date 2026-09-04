import React, { useEffect, useMemo, useState } from 'react';
import {
  BaseCurrency,
  formatCurrency,
  useCurrencyPreferences,
} from '../lib/i18n';
import { parseMoneyInput } from '../lib/money';

interface PriceCurrencyInputProps {
  label: string;
  value: number;
  onChange: (baseValue: number) => void;
  required?: boolean;
  error?: string;
  helperText?: string;
  accent?: boolean;
  min?: number;
}

const inputNumber = (value: number, decimals: number) => {
  if (!Number.isFinite(value)) return '';
  return String(Number(value.toFixed(decimals)));
};

const ceilMoney = (value: number) => Math.ceil((Number(value) || 0) - 1e-9);

export function PriceCurrencyInput({
  label,
  value,
  onChange,
  required = false,
  error,
  helperText,
  accent = false,
  min = 0,
}: PriceCurrencyInputProps) {
  const { currency: systemCurrency, brlRate } = useCurrencyPreferences();
  const [dualEntryCurrency, setDualEntryCurrency] = useState<BaseCurrency>('USD');
  const entryCurrency: BaseCurrency = systemCurrency === 'BRL' ? 'BRL' : dualEntryCurrency;
  const [isFocused, setIsFocused] = useState(false);
  const dualBrlEntry = systemCurrency === 'DUAL' && entryCurrency === 'BRL';

  const entryAmount = useMemo(() => {
    const baseValue = Number(value) || 0;
    if (systemCurrency === 'DUAL' && entryCurrency === 'BRL') {
      return ceilMoney(baseValue * brlRate);
    }
    return baseValue;
  }, [value, systemCurrency, entryCurrency, brlRate]);

  const entryDecimals = dualBrlEntry ? 0 : entryCurrency === 'BRL' ? 2 : 4;
  const [draft, setDraft] = useState(() => inputNumber(entryAmount, entryDecimals));

  useEffect(() => {
    if (!isFocused) setDraft(inputNumber(entryAmount, entryDecimals));
  }, [entryAmount, entryDecimals, isFocused]);

  const changeEntryCurrency = (nextCurrency: BaseCurrency) => {
    setDualEntryCurrency(nextCurrency);
    const baseValue = Number(value) || 0;
    const converted = nextCurrency === 'BRL' ? ceilMoney(baseValue * brlRate) : baseValue;
    setDraft(inputNumber(converted, nextCurrency === 'BRL' ? 0 : 4));
  };

  const handleChange = (raw: string) => {
    setDraft(raw);
    if (raw.trim() === '') {
      onChange(0);
      return;
    }

    const parsed = parseMoneyInput(raw);
    if (!Number.isFinite(parsed)) return;

    if (systemCurrency === 'DUAL' && entryCurrency === 'BRL') {
      const roundedBrl = ceilMoney(parsed);
      onChange(Number((roundedBrl / brlRate).toFixed(6)));
      return;
    }

    onChange(Number(parsed.toFixed(4)));
  };

  const conversionHint = systemCurrency === 'DUAL'
    ? entryCurrency === 'BRL'
      ? `Salvo como base em dólar: ${formatCurrency(value, 'pt-BR', 'USD')}. Você pode ajustar este valor em Real.`
      : `Conversão automática: R$ ${ceilMoney((Number(value) || 0) * brlRate).toLocaleString('pt-BR')} (arredondado para cima). Troque para R$ se quiser ajustar.`
    : '';

  return (
    <div className="product-price-field">
      <div className="product-price-label-row">
        <label className={`product-price-label ${accent ? 'product-price-label-accent' : ''}`}>
          {label}{required ? ' *' : ''}
        </label>

        {systemCurrency === 'DUAL' ? (
          <div className="currency-entry-toggle" role="group" aria-label={`Moeda de entrada para ${label}`}>
            <button
              type="button"
              aria-pressed={entryCurrency === 'USD'}
              onClick={() => changeEntryCurrency('USD')}
              className={entryCurrency === 'USD' ? 'is-active' : ''}
            >
              US$
            </button>
            <button
              type="button"
              aria-pressed={entryCurrency === 'BRL'}
              onClick={() => changeEntryCurrency('BRL')}
              className={entryCurrency === 'BRL' ? 'is-active' : ''}
            >
              R$
            </button>
          </div>
        ) : (
          <span className="currency-entry-badge">{systemCurrency === 'BRL' ? 'R$' : 'US$'}</span>
        )}
      </div>

      <div className="product-price-input-shell">
        <span className="product-price-input-prefix">{entryCurrency === 'BRL' ? 'R$' : 'US$'}</span>
        <input
          required={required}
          type="text"
          inputMode={dualBrlEntry ? 'numeric' : 'decimal'}
          value={draft}
          aria-valuemin={min}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setIsFocused(false);
            setDraft(inputNumber(entryAmount, entryDecimals));
          }}
          onChange={(event) => handleChange(event.target.value)}
          className="product-price-input"
        />
      </div>

      {conversionHint && <p className="product-price-conversion">{conversionHint}</p>}
      {helperText && <p className="product-price-helper">{helperText}</p>}
      {error && <p className="product-price-error">{error}</p>}
    </div>
  );
}
