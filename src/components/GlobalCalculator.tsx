import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Calculator, X } from 'lucide-react';

const buttons = ['C', '⌫', '%', '÷', '7', '8', '9', '×', '4', '5', '6', '-', '1', '2', '3', '+', '0', '.', '(', ')'];

export function GlobalCalculator() {
  const [open, setOpen] = useState(false);
  const [display, setDisplay] = useState('0');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const evaluate = () => {
    try {
      const expr = display
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/,/g, '.');

      if (!/^[0-9+\-*/().\s]+$/.test(expr)) return;
      const result = Function(`"use strict"; return (${expr})`)();
      if (Number.isFinite(result)) {
        setDisplay(String(Number(result.toFixed(8))));
      }
    } catch {
      // Mantém o valor atual quando a expressão ainda está incompleta.
    }
  };

  const press = (value: string) => {
    if (value === 'C') {
      setDisplay('0');
      return;
    }

    if (value === '⌫') {
      setDisplay(prev => (prev.length <= 1 ? '0' : prev.slice(0, -1)));
      return;
    }

    if (value === '=') {
      evaluate();
      return;
    }

    if (value === '%') {
      setDisplay(prev => {
        const match = prev.match(/(.*?)(\d+(?:[.,]\d+)?)$/);
        if (!match) return prev;
        const prefix = match[1] || '';
        const number = Number(match[2].replace(',', '.')) / 100;
        return `${prefix}${Number(number.toFixed(8))}`;
      });
      return;
    }

    setDisplay(prev => (prev === '0' && /\d/.test(value) ? value : `${prev}${value}`));
  };

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key;

      if (/^[0-9]$/.test(key)) {
        event.preventDefault();
        press(key);
        return;
      }

      if (key === ',' || key === '.') {
        event.preventDefault();
        press('.');
        return;
      }

      if (key === '+') {
        event.preventDefault();
        press('+');
        return;
      }

      if (key === '-') {
        event.preventDefault();
        press('-');
        return;
      }

      if (key === '*') {
        event.preventDefault();
        press('×');
        return;
      }

      if (key === '/') {
        event.preventDefault();
        press('÷');
        return;
      }

      if (key === '(' || key === ')') {
        event.preventDefault();
        press(key);
        return;
      }

      if (key === '%') {
        event.preventDefault();
        press('%');
        return;
      }

      if (key === 'Enter' || key === '=') {
        event.preventDefault();
        evaluate();
        return;
      }

      if (key === 'Backspace') {
        event.preventDefault();
        press('⌫');
        return;
      }

      if (key.toLowerCase() === 'c' || key === 'Delete') {
        event.preventDefault();
        press('C');
        return;
      }

      if (key === 'Escape') {
        event.preventDefault();
        setOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, display]);

  const modal = open ? (
    <div
      className="calculator-overlay fixed inset-0 z-[9999] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setOpen(false);
      }}
    >
      <div className="calculator-modal w-full max-w-xs overflow-hidden rounded-2xl border border-gray-700 bg-brand-navylight shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-800 p-4">
          <h3 className="flex items-center gap-2 font-semibold text-white">
            <Calculator className="h-5 w-5 text-brand-gold" />
            Calculadora
          </h3>
          <button onClick={() => setOpen(false)} className="text-gray-400 transition hover:text-white" aria-label="Fechar calculadora">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-3 p-4">
          <div className="min-h-[58px] break-all rounded-xl border border-gray-800 bg-[#171717] px-4 py-3 text-right font-mono text-2xl text-white">
            {display}
          </div>
          <div className="grid grid-cols-4 gap-2">
            {buttons.map(btn => (
              <button
                key={btn}
                onClick={() => press(btn)}
                className="min-h-[44px] rounded-lg border border-gray-700 bg-brand-navylight font-bold text-white transition hover:border-brand-gold/60"
              >
                {btn}
              </button>
            ))}
            <button
              onClick={() => press('=')}
              className="col-span-4 min-h-[44px] rounded-lg bg-brand-gold font-extrabold text-brand-navydark transition hover:bg-brand-goldhover"
            >
              =
            </button>
          </div>
          <p className="text-[11px] text-gray-500">
            Use também o teclado numérico. Ex.: 1500 × 10% = 150.
          </p>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="global-calculator-button inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-700 bg-[#171717] text-gray-300 transition hover:border-brand-gold/60 hover:text-brand-gold"
        title="Calculadora"
        aria-label="Abrir calculadora"
      >
        <Calculator className="h-4 w-4" />
      </button>

      {mounted && modal ? createPortal(modal, document.body) : null}
    </>
  );
}
