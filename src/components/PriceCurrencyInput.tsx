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

// Conversão automática USD -> BRL sempre sobe para o próximo inteiro, mas
// tolera apenas o ruído microscópico de ponto flutuante gerado ao reconstruir
// um valor em Real que o usuário definiu manualmente.
const ceilMoney = (value: number) => Math.ceil((Number(value) || 0) - 1e-6);

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
  const [manualBrlValue, setManualBrlValue] = useState<number | null>(null);
  const dualBrlEntry = systemCurrency === 'DUAL' && entryCurrency === 'BRL';

  const entryAmount = useMemo(() => {
    const baseValue = Number(value) || 0;
    if (systemCurrency === 'DUAL' && entryCurrency === 'BRL') {
      // Depois que o usuário altera o valor em R$, ele passa a ser a fonte de
      // verdade visual e não deve voltar pelo arredondamento automático.
      if (manualBrlValue !== null) return manualBrlValue;
      return ceilMoney(baseValue * brlRate);
    }
    return baseValue;
  }, [value, systemCurrency, entryCurrency, brlRate, manualBrlValue]);

  const entryDecimals = dualBrlEntry ? 0 : entryCurrency === 'BRL' ? 2 : 4;
  const [draft, setDraft] = useState(() => inputNumber(entryAmount, entryDecimals));

  useEffect(() => {
    if (!isFocused) setDraft(inputNumber(entryAmount, entryDecimals));
  }, [entryAmount, entryDecimals, isFocused]);

  const changeEntryCurrency = (nextCurrency: BaseCurrency) => {
    setDualEntryCurrency(nextCurrency);
    // Trocar de moeda inicia uma nova conversão automática. Só depois que o
    // usuário digita em R$ o valor vira override manual.
    setManualBrlValue(null);
    const baseValue = Number(value) || 0;
    const converted = nextCurrency === 'BRL' ? ceilMoney(baseValue * brlRate) : baseValue;
    setDraft(inputNumber(converted, nextCurrency === 'BRL' ? 0 : 4));
  };

  const handleChange = (raw: string) => {
    setDraft(raw);
    if (raw.trim() === '') {
      if (dualBrlEntry) setManualBrlValue(0);
      onChange(0);
      return;
    }

    const parsed = parseMoneyInput(raw);
    if (!Number.isFinite(parsed)) return;

    if (systemCurrency === 'DUAL' && entryCurrency === 'BRL') {
      // Valor digitado manualmente em Real é obedecido exatamente. Não aplica
      // Math.ceil aqui; o ceil é exclusivo da conversão automática USD -> BRL.
      setManualBrlValue(parsed);
      onChange(Number((parsed / brlRate).toFixed(8)));
      return;
    }

    setManualBrlValue(null);
    onChange(Number(parsed.toFixed(4)));
  };

  const conversionHint = systemCurrency === 'DUAL'
    ? entryCurrency === 'BRL'
      ? manualBrlValue !== null
        ? `Valor final em Real definido manualmente: ${formatCurrency(manualBrlValue, 'pt-BR', 'BRL')}.`
        : `Conversão automática em Real: ${formatCurrency(ceilMoney((Number(value) || 0) * brlRate), 'pt-BR', 'BRL')}. Edite para definir o valor exato.`
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
