import React, { useEffect, useMemo, useState } from 'react';
import { useCurrencyPreferences } from '../lib/i18n';
import { parseMoneyInput } from '../lib/money';
import { apiFetch } from '../lib/api';

type EntryCurrency = 'USD' | 'BRL' | 'PYG';

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

type CurrencyConfig = {
  defaultCurrency?: 'USD' | 'BRL' | 'DUAL';
  enabledCurrencies?: string[];
  rates?: { USD?: number; BRL?: number; PYG?: number };
};

let configCache: CurrencyConfig | null = null;
let configPromise: Promise<CurrencyConfig> | null = null;

function loadCurrencyConfig(force = false) {
  if (!force && configCache) return Promise.resolve(configCache);
  if (!force && configPromise) return configPromise;
  configPromise = apiFetch('/api/currency-config')
    .then(async (response) => response.ok ? await response.json() : {})
    .catch(() => ({}))
    .then((config) => {
      configCache = config;
      return config;
    })
    .finally(() => { configPromise = null; });
  return configPromise;
}

const inputNumber = (value: number, decimals: number) => {
  if (!Number.isFinite(value)) return '';
  return String(Number(value.toFixed(decimals)));
};

const ceilAuto = (value: number) => Math.ceil((Number(value) || 0) - 1e-6);

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
  const { currency: systemCurrency, brlRate: fallbackBrlRate } = useCurrencyPreferences();
  const baseCurrency: 'USD' | 'BRL' = systemCurrency === 'BRL' ? 'BRL' : 'USD';
  const [rates, setRates] = useState({ BRL: fallbackBrlRate || 5.5, PYG: 7300 });
  const [enabledCurrencies, setEnabledCurrencies] = useState<EntryCurrency[]>(['USD', 'BRL', 'PYG']);
  const [entryCurrency, setEntryCurrency] = useState<EntryCurrency>(baseCurrency);
  const [isFocused, setIsFocused] = useState(false);
  const [manualValue, setManualValue] = useState<{ currency: EntryCurrency; value: number } | null>(null);

  const applyConfig = (config: CurrencyConfig) => {
    const enabled = (config.enabledCurrencies || ['USD', 'BRL', 'PYG'])
      .map((code) => String(code).toUpperCase())
      .filter((code): code is EntryCurrency => ['USD', 'BRL', 'PYG'].includes(code));
    setEnabledCurrencies(enabled.length ? enabled : ['USD', 'BRL', 'PYG']);
    setRates({
      BRL: Number(config.rates?.BRL) > 0 ? Number(config.rates?.BRL) : fallbackBrlRate || 5.5,
      PYG: Number(config.rates?.PYG) > 0 ? Number(config.rates?.PYG) : 7300,
    });
  };

  useEffect(() => {
    loadCurrencyConfig().then(applyConfig);
    const refresh = () => loadCurrencyConfig(true).then(applyConfig);
    window.addEventListener('origin:currency-config-change', refresh);
    return () => window.removeEventListener('origin:currency-config-change', refresh);
  }, [fallbackBrlRate]);

  useEffect(() => {
    if (!enabledCurrencies.includes(entryCurrency)) {
      setEntryCurrency(enabledCurrencies.includes(baseCurrency) ? baseCurrency : enabledCurrencies[0]);
      setManualValue(null);
    }
  }, [enabledCurrencies, baseCurrency, entryCurrency]);

  const toUsd = (amount: number, currency: EntryCurrency) => {
    if (currency === 'USD') return amount;
    if (currency === 'BRL') return amount / rates.BRL;
    return amount / rates.PYG;
  };

  const fromUsd = (usd: number, currency: EntryCurrency) => {
    if (currency === 'USD') return usd;
    if (currency === 'BRL') return usd * rates.BRL;
    return usd * rates.PYG;
  };

  const toBase = (amount: number, currency: EntryCurrency) => {
    const usd = toUsd(amount, currency);
    return baseCurrency === 'BRL' ? usd * rates.BRL : usd;
  };

  const fromBase = (baseValue: number, currency: EntryCurrency) => {
    const usd = baseCurrency === 'BRL' ? baseValue / rates.BRL : baseValue;
    return fromUsd(usd, currency);
  };

  const entryAmount = useMemo(() => {
    if (manualValue?.currency === entryCurrency) return manualValue.value;
    const converted = fromBase(Number(value) || 0, entryCurrency);
    if (entryCurrency === baseCurrency) return converted;
    if (entryCurrency === 'BRL' || entryCurrency === 'PYG') return ceilAuto(converted);
    return converted;
  }, [value, entryCurrency, baseCurrency, rates.BRL, rates.PYG, manualValue]);

  const entryDecimals = entryCurrency === 'PYG' ? 0 : entryCurrency === 'BRL' ? 2 : 4;
  const [draft, setDraft] = useState(() => inputNumber(entryAmount, entryDecimals));

  useEffect(() => {
    if (!isFocused) setDraft(inputNumber(entryAmount, entryDecimals));
  }, [entryAmount, entryDecimals, isFocused]);

  const changeEntryCurrency = (nextCurrency: EntryCurrency) => {
    setEntryCurrency(nextCurrency);
    setManualValue(null);
    const converted = fromBase(Number(value) || 0, nextCurrency);
    const automatic = nextCurrency !== baseCurrency && (nextCurrency === 'BRL' || nextCurrency === 'PYG') ? ceilAuto(converted) : converted;
    setDraft(inputNumber(automatic, nextCurrency === 'PYG' ? 0 : nextCurrency === 'BRL' ? 2 : 4));
  };

  const handleChange = (raw: string) => {
    setDraft(raw);
    if (raw.trim() === '') {
      setManualValue({ currency: entryCurrency, value: 0 });
      onChange(0);
      return;
    }

    const parsed = parseMoneyInput(raw);
    if (!Number.isFinite(parsed)) return;

    setManualValue({ currency: entryCurrency, value: parsed });
    onChange(Number(toBase(parsed, entryCurrency).toFixed(8)));
  };

  const baseValue = Number(value) || 0;
  const usd = fromBase(baseValue, 'USD');
  const brl = manualValue?.currency === 'BRL' ? manualValue.value : fromBase(baseValue, 'BRL');
  const pyg = manualValue?.currency === 'PYG' ? manualValue.value : fromBase(baseValue, 'PYG');
  const conversionHint = enabledCurrencies.length > 1
    ? `Equivalência: US$ ${usd.toLocaleString('en-US', { maximumFractionDigits: 4 })} · R$ ${brl.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} · Gs. ${Math.round(pyg).toLocaleString('es-PY')}`
    : '';

  const prefix = entryCurrency === 'BRL' ? 'R$' : entryCurrency === 'PYG' ? 'Gs.' : 'US$';

  return (
    <div className="product-price-field">
      <div className="product-price-label-row">
        <label className={`product-price-label ${accent ? 'product-price-label-accent' : ''}`}>
          {label}{required ? ' *' : ''}
        </label>

        {enabledCurrencies.length > 1 ? (
          <div className="currency-entry-toggle" role="group" aria-label={`Moeda de entrada para ${label}`}>
            {enabledCurrencies.map((code) => (
              <button key={code} type="button" aria-pressed={entryCurrency === code} onClick={() => changeEntryCurrency(code)} className={entryCurrency === code ? 'is-active' : ''}>
                {code === 'BRL' ? 'R$' : code === 'PYG' ? 'Gs' : 'US$'}
              </button>
            ))}
          </div>
        ) : (
          <span className="currency-entry-badge">{prefix}</span>
        )}
      </div>

      <div className="product-price-input-shell">
        <span className="product-price-input-prefix">{prefix}</span>
        <input
          required={required}
          type="text"
          inputMode={entryCurrency === 'PYG' ? 'numeric' : 'decimal'}
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
