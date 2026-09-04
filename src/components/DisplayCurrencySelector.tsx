import React, { useEffect } from "react";
import { useDisplayCurrency, DisplayCurrency } from "../stores/displayCurrency";

// Moeda de EXIBIÇÃO do ERP. A cotação vem sempre de Configurações > Moedas;
// trocar aqui nunca altera o valor salvo, somente a apresentação da tela.
export function DisplayCurrencySelector({ className = "" }: { className?: string }) {
  const { currency, setCurrency, refreshRates } = useDisplayCurrency();

  useEffect(() => {
    refreshRates();
    const refresh = () => refreshRates(true);
    window.addEventListener("origin:currency-config-change", refresh);
    return () => window.removeEventListener("origin:currency-config-change", refresh);
  }, [refreshRates]);

  return (
    <div className={`flex items-center gap-0.5 rounded-lg border border-gray-700 bg-[#171717] p-0.5 ${className}`} role="group" aria-label="Moeda de exibição">
      {(["BRL", "USD", "PYG"] as DisplayCurrency[]).map((c) => (
        <button key={c} type="button" onClick={() => setCurrency(c)}
          className={`rounded-md px-2.5 py-1.5 text-xs font-bold transition ${currency === c ? "bg-brand-gold text-brand-navydark" : "text-gray-400 hover:text-white"}`}>
          {c === "BRL" ? "R$" : c === "USD" ? "$" : "G$"}
        </button>
      ))}
    </div>
  );
}
