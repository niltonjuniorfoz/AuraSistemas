import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { BarChart3, ArrowLeft, Search, Loader2 } from "lucide-react";
import { apiFetch } from "../lib/api";
import { Money } from "../components/Money";
import { useAdminTranslation } from "../lib/i18n";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card } from "../components/ui/card";

function firstOfMonth() {
  const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10);
}
function today() {
  return new Date().toISOString().slice(0, 10);
}

const classStyle: Record<string, string> = {
  A: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  B: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  C: "bg-gray-500/15 text-gray-300 border-gray-500/30",
};

export function AbcReport() {
  const navigate = useNavigate();
  const [dateFrom, setDateFrom] = useState(firstOfMonth());
  const [dateTo, setDateTo] = useState(today());
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [byClass, setByClass] = useState<any>({ A: { count: 0, revenue: 0 }, B: { count: 0, revenue: 0 }, C: { count: 0, revenue: 0 } });
  const [totalRevenue, setTotalRevenue] = useState(0);

  const load = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ dateFrom, dateTo });
      const res = await apiFetch(`/api/reports/abc?${qs.toString()}`);
      const json = await res.json();
      setData(Array.isArray(json.data) ? json.data : []);
      setByClass(json.byClass || {});
      setTotalRevenue(json.totalRevenue || 0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" onClick={() => navigate("/reports")} className="size-auto p-0 text-gray-400 hover:bg-transparent hover:text-white dark:hover:bg-transparent"><ArrowLeft className="size-5" /></Button>
        <h2 className="text-2xl font-semibold text-white flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-brand-gold" /> Curva ABC de Produtos
        </h2>
      </div>

      <div className="rounded-2xl border border-gray-800 bg-[#171717] p-4 space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">De</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="bg-[#171717] border border-gray-700 rounded-lg px-3 py-2 text-white outline-none focus:border-brand-gold" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Até</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="bg-[#171717] border border-gray-700 rounded-lg px-3 py-2 text-white outline-none focus:border-brand-gold" />
          </div>
          <Button onClick={load} className="gap-2 rounded-lg bg-brand-gold px-4 py-2 text-base font-bold text-brand-navydark hover:bg-brand-goldhover">
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />} Gerar
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-gray-800 pt-4">
          {(["A", "B", "C"] as const).map((k) => (
            <Card key={k} className={`gap-0 rounded-xl border p-4 shadow-none ${classStyle[k]}`}>
              <div className="text-xs mb-1 font-semibold">Classe {k} {k === "A" ? "(essenciais)" : k === "B" ? "(intermediários)" : "(cauda longa)"}</div>
              <div className="text-xl font-bold"><Money value={byClass[k]?.revenue || 0} lang="pt-BR" /></div>
              <div className="text-xs mt-1 opacity-80">{byClass[k]?.count || 0} produto(s) · {totalRevenue > 0 ? Math.round(((byClass[k]?.revenue || 0) / totalRevenue) * 100) : 0}% do faturamento</div>
            </Card>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-800">
        <table className="w-full text-sm">
          <thead className="bg-[#171717] text-gray-400 text-xs">
            <tr className="text-left">
              <th className="py-2 px-3">#</th>
              <th className="py-2 px-3">Classe</th>
              <th className="py-2 px-3">Produto</th>
              <th className="py-2 px-3 text-right">Qtd</th>
              <th className="py-2 px-3 text-right">Faturamento</th>
              <th className="py-2 px-3 text-right">Lucro</th>
              <th className="py-2 px-3 text-right">% do total</th>
              <th className="py-2 px-3 text-right">Acumulado</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 && (
              <tr><td colSpan={8} className="py-8 text-center text-gray-500">{loading ? "Carregando..." : "Sem vendas no período."}</td></tr>
            )}
            {data.map((r, i) => (
              <tr key={r.productId || i} className="border-t border-gray-800 text-gray-200">
                <td className="py-2 px-3 text-gray-500">{i + 1}</td>
                <td className="py-2 px-3"><Badge variant="outline" className={`rounded px-2 py-0.5 text-xs font-bold ${classStyle[r.classe]}`}>{r.classe}</Badge></td>
                <td className="py-2 px-3">{r.productName} <span className="text-gray-500 text-xs">({r.sku})</span></td>
                <td className="py-2 px-3 text-right">{r.qty}</td>
                <td className="py-2 px-3 text-right font-semibold"><Money value={r.revenue} lang="pt-BR" /></td>
                <td className="py-2 px-3 text-right"><Money value={r.profit} lang="pt-BR" /></td>
                <td className="py-2 px-3 text-right">{r.share}%</td>
                <td className="py-2 px-3 text-right text-gray-400">{r.cumulative}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
