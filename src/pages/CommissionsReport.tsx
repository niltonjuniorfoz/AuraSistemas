import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Percent, ArrowLeft, Search, Loader2 } from "lucide-react";
import { apiFetch } from "../lib/api";
import { Money } from "../components/Money";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";

function firstOfMonth() {
  const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10);
}
function today() {
  return new Date().toISOString().slice(0, 10);
}

export function CommissionsReport() {
  const navigate = useNavigate();
  const [dateFrom, setDateFrom] = useState(firstOfMonth());
  const [dateTo, setDateTo] = useState(today());
  const [status, setStatus] = useState("PAID");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({ sellers: 0, totalBase: 0, totalCommission: 0, totalSold: 0 });

  const load = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ dateFrom, dateTo, status });
      const res = await apiFetch(`/api/reports/commissions?${qs.toString()}`);
      const json = await res.json();
      setData(Array.isArray(json.data) ? json.data : []);
      setSummary(json.summary || {});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [status]);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" onClick={() => navigate("/reports")} className="size-auto p-0 text-gray-400 hover:bg-transparent hover:text-white dark:hover:bg-transparent"><ArrowLeft className="size-5" /></Button>
        <h2 className="text-2xl font-semibold text-white flex items-center gap-2">
          <Percent className="w-6 h-6 text-brand-gold" /> Comissões de Vendedores
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
          <div>
            <label className="block text-xs text-gray-400 mb-1">Base</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="bg-[#171717] border border-gray-700 rounded-lg px-3 py-2 text-white outline-none focus:border-brand-gold">
              <option value="PAID">Somente vendas pagas</option>
              <option value="ALL">Todas as vendas (não canceladas)</option>
            </select>
          </div>
          <Button onClick={load} className="gap-2 rounded-lg bg-brand-gold px-4 py-2 text-base font-bold text-brand-navydark hover:bg-brand-gold">
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />} Gerar
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-gray-800 pt-4">
          <Card className="gap-0 rounded-xl border-gray-700 bg-brand-navylight p-4 shadow-none">
            <div className="text-xs text-gray-400 mb-1">Base de comissão</div>
            <div className="text-xl font-bold text-white"><Money value={summary.totalBase} lang="pt-BR" /></div>
            <div className="text-xs text-gray-500 mt-1">faturamento de produtos (sem frete)</div>
          </Card>
          <Card className="gap-0 rounded-xl border-brand-gold/40 bg-brand-gold/5 p-4 shadow-none">
            <div className="text-xs text-brand-gold mb-1">Total de comissões</div>
            <div className="text-xl font-bold text-white"><Money value={summary.totalCommission} lang="pt-BR" /></div>
            <div className="text-xs text-gray-500 mt-1">{summary.sellers} vendedor(es)</div>
          </Card>
          <Card className="gap-0 rounded-xl border-gray-700 bg-brand-navylight p-4 shadow-none">
            <div className="text-xs text-gray-400 mb-1">Total vendido</div>
            <div className="text-xl font-bold text-white"><Money value={summary.totalSold} lang="pt-BR" /></div>
          </Card>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-800">
        <table className="w-full text-sm">
          <thead className="bg-[#171717] text-gray-400 text-xs">
            <tr className="text-left">
              <th className="py-2 px-3">Vendedor</th>
              <th className="py-2 px-3 text-right">Vendas</th>
              <th className="py-2 px-3 text-right">Total vendido</th>
              <th className="py-2 px-3 text-right">Base</th>
              <th className="py-2 px-3 text-right">%</th>
              <th className="py-2 px-3 text-right">Comissão</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 && (
              <tr><td colSpan={6} className="py-8 text-center text-gray-500">{loading ? "Carregando..." : "Sem vendas no período."}</td></tr>
            )}
            {data.map((r) => (
              <tr key={r.userId || r.sellerName} className="border-t border-gray-800 text-gray-200">
                <td className="py-2 px-3">{r.sellerName}</td>
                <td className="py-2 px-3 text-right">{r.salesCount}</td>
                <td className="py-2 px-3 text-right"><Money value={r.totalSold} lang="pt-BR" /></td>
                <td className="py-2 px-3 text-right"><Money value={r.commissionBase} lang="pt-BR" /></td>
                <td className="py-2 px-3 text-right">{r.commissionPercent}%</td>
                <td className="py-2 px-3 text-right font-bold text-brand-gold"><Money value={r.commission} lang="pt-BR" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
