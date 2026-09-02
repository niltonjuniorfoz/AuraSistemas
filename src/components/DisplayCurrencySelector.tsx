import React from "react";
import { useDisplayCurrency, DisplayCurrency } from "../stores/displayCurrency";

// Pill R$/US$/G$ compartilhado entre Dashboard/Caixa/PDV — troca a moeda de
// EXIBIÇÃO dos valores da tela (os valores continuam guardados do jeito que
// já são; ver src/stores/displayCurrency.ts). Escolha persiste e vale nas
// três telas juntas.
export function DisplayCurrencySelector({ className = "" }: { className?: string }) {
  const { currency, setCurrency } = useDisplayCurrency();
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
