import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, TrendingUp, Search, Loader2 } from "lucide-react";
import { apiFetch } from "../lib/api";
import { Money } from "../components/Money";
import { useAdminTranslation } from "../lib/i18n";
import { format } from "date-fns";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";

// Margem REAL: venda em R$ − custo consumido FIFO (custo da ÉPOCA da compra, câmbio congelado).
// Diferente da margem nominal, que usa o custo atual do produto.
export function RealMarginReport() {
  const navigate = useNavigate();
  const { language } = useAdminTranslation();
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 8) + "01";
  const [dateFrom, setDateFrom] = useState(monthStart);
  const [dateTo, setDateTo] = useState(today);
  const [rows, setRows] = useState<any[]>([]);
  const [totals, setTotals] = useState<any>({ sales: 0, cost: 0, margin: 0, marginPercent: 0 });
  const [loading, setLoading] = useState(false);

  const load = async (from = dateFrom, to = dateTo) => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/cost/real-margin?dateFrom=${from}&dateTo=${to}`);
      if (res.ok) { const j = await res.json(); setRows(j.data || []); setTotals(j.totals || {}); }
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" onClick={() => navigate("/reports")} className="size-auto p-0 text-gray-400 hover:bg-transparent hover:text-white dark:hover:bg-transparent"><ArrowLeft className="size-5" /></Button>
        <div>
          <h2 className="text-2xl font-semibold text-white flex items-center gap-2"><TrendingUp className="w-6 h-6 text-brand-gold" /> Margem Real (corrigida pelo câmbio)</h2>
          <p className="text-sm text-gray-400">Venda em R$ − custo da época da compra (camadas FIFO com câmbio congelado). Só vendas já entregues.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-800 bg-[#171717] p-4 space-y-4">
        <div className="flex items-center gap-2">
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="bg-[#171717] border border-gray-700 text-white text-xs px-2 py-2 rounded-lg outline-none focus:border-brand-gold" />
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="bg-[#171717] border border-gray-700 text-white text-xs px-2 py-2 rounded-lg outline-none focus:border-brand-gold" />
          <Button onClick={() => load()} disabled={loading} className="gap-2 rounded-lg bg-brand-gold px-4 py-2 text-sm font-bold text-brand-navydark hover:bg-brand-goldhover">
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />} Buscar
          </Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 border-t border-gray-800 pt-4">
          <Card className="gap-0 rounded-xl border-gray-700 bg-brand-navylight p-4 shadow-none">
            <div className="text-[11px] text-gray-400 mb-1">Vendido no período (R$)</div>
            <div className="text-xl font-black text-white"><Money value={totals.sales || 0} lang={language} currencyOverride="BRL" /></div>
          </Card>
          <Card className="gap-0 rounded-xl border-gray-700 bg-brand-navylight p-4 shadow-none">
            <div className="text-[11px] text-gray-400 mb-1">Custo real (da época, R$)</div>
            <div className="text-xl font-black text-red-300"><Money value={totals.cost || 0} lang={language} currencyOverride="BRL" /></div>
          </Card>
          <Card className="gap-0 rounded-xl border-emerald-500/30 bg-emerald-500/5 p-4 shadow-none">
            <div className="text-[11px] text-emerald-300 mb-1">Margem real (R$)</div>
            <div className="text-xl font-black text-emerald-300"><Money value={totals.margin || 0} lang={language} currencyOverride="BRL" /></div>
          </Card>
          <Card className="gap-0 rounded-xl border-brand-gold/30 bg-brand-gold/5 p-4 shadow-none">
            <div className="text-[11px] text-brand-gold mb-1">Margem %</div>
            <div className="text-xl font-black text-brand-gold">{Number(totals.marginPercent || 0).toFixed(1)}%</div>
          </Card>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-800">
        <table className="w-full text-sm">
          <thead className="bg-[#171717] text-gray-400 text-xs">
            <tr className="text-left">
              <th className="py-2 px-3">Data</th>
              <th className="py-2 px-3">Venda</th>
              <th className="py-2 px-3">Cliente</th>
              <th className="py-2 px-3 text-right">Total (R$)</th>
              <th className="py-2 px-3 text-right">Custo real</th>
              <th className="py-2 px-3 text-right">Margem</th>
              <th className="py-2 px-3 text-right">%</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={7} className="py-8 text-center text-gray-500">{loading ? "Carregando..." : "Nenhuma venda entregue no período (a margem real só existe depois que o estoque sai)."}</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-gray-800 text-gray-200">
                <td className="py-2 px-3 text-gray-400 whitespace-nowrap">{format(new Date(r.createdAt), "dd/MM/yyyy HH:mm")}</td>
                <td className="py-2 px-3 font-mono">{r.series}-{String(r.number).padStart(6, "0")}</td>
                <td className="py-2 px-3">{r.customerName || "Consumidor Final"}</td>
                <td className="py-2 px-3 text-right font-semibold text-white"><Money value={r.totalAmount} lang={language} /></td>
                <td className="py-2 px-3 text-right text-red-300"><Money value={r.realCost} lang={language} /></td>
                <td className={`py-2 px-3 text-right font-bold ${r.realMargin >= 0 ? "text-emerald-300" : "text-red-400"}`}><Money value={r.realMargin} lang={language} /></td>
                <td className={`py-2 px-3 text-right font-semibold ${r.realMarginPercent >= 0 ? "text-emerald-300" : "text-red-400"}`}>{Number(r.realMarginPercent).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-gray-500">Margem real usa o custo congelado na entrada (câmbio + frete da compra). A margem do Painel usa o custo atual do produto — quando o câmbio muda, as duas divergem; esta aqui é a verdade do bolso.</p>
    </div>
  );
}
