import React, { useEffect, useState } from "react";
import { Eye, Users, MousePointerClick, Clock, LineChart as LineChartIcon, Layers, Globe2 } from "lucide-react";
import { apiFetch } from "../lib/api";
import { RevenueAreaChart, RankingBars } from "../components/charts";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";

const intFmt = (v: any) => (Number(v) || 0).toLocaleString("pt-BR");
const brl = (v: any) => `R$ ${(Number(v) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function fmtDuration(totalSec: number) {
  const m = Math.floor(totalSec / 60), s = totalSec % 60;
  return `${m} min ${s}s`;
}

const PERIODS: Array<[string, string]> = [["7", "7 dias"], ["30", "30 dias"], ["90", "90 dias"], ["365", "1 ano"]];

function ReportCard({ title, icon: Icon, iconColor = "text-brand-gold", action, children, className = "" }: any) {
  return (
    <Card className={`${className} gap-0 rounded-xl border-gray-700 bg-brand-navylight p-4 shadow-none`}>
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-white">{Icon && <Icon className={`size-4 ${iconColor}`} />}{title}</h3>
        {action}
      </div>
      <CardContent className="p-0">{children}</CardContent>
    </Card>
  );
}

function KpiCard({ title, value, icon: Icon, tone }: any) {
  return (
    <Card className="gap-0 rounded-xl border-gray-700 bg-brand-navylight p-4 shadow-none">
      <div className="flex items-start justify-between">
        <span className="text-xs text-gray-400">{title}</span>
        <div className={`rounded-lg p-2 ${tone}`}><Icon className="size-4" /></div>
      </div>
      <div className="mt-2 text-2xl font-bold text-white">{value}</div>
    </Card>
  );
}

export function Analytics() {
  const [days, setDays] = useState("90");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const to = new Date();
      const from = new Date(); from.setDate(from.getDate() - (Number(days) - 1));
      const qs = new URLSearchParams({ dateFrom: from.toISOString().split("T")[0], dateTo: to.toISOString().split("T")[0] });
      const res = await apiFetch(`/api/analytics/overview?${qs.toString()}`);
      if (res.ok) setData(await res.json());
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [days]); // eslint-disable-line react-hooks/exhaustive-deps

  const revenueBars = (data?.revenueByGroup || []).map((r: any) => ({ label: r.name, value: r.total }));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white">Análises</h2>
          <p className="text-sm text-gray-400">Métricas e comportamento de visitantes da sua loja online (/loja) — para achar as melhores oportunidades.</p>
        </div>
        <div className="flex rounded-lg border border-gray-800 bg-[#171717] p-1">
          {PERIODS.map(([val, label]) => (
            <Button key={val} variant="ghost" onClick={() => setDays(val)}
              className={`h-auto rounded-md px-3 py-1.5 text-xs font-medium ${days === val ? "bg-brand-gold text-brand-navydark hover:bg-brand-gold hover:text-brand-navydark dark:hover:bg-brand-gold" : "text-gray-300 hover:bg-transparent hover:text-white dark:hover:bg-transparent"}`}>
              {label}
            </Button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-800 bg-[#171717] p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard title="Visualizações de página" value={intFmt(data?.totalViews)} icon={Eye} tone="bg-orange-500/15 text-orange-300" />
          <KpiCard title="Visitantes únicos" value={intFmt(data?.uniqueVisitors)} icon={Users} tone="bg-teal-500/15 text-teal-300" />
          <KpiCard title="Taxa de rejeição" value={`${(data?.bounceRate ?? 0).toFixed(1).replace(".", ",")}%`} icon={MousePointerClick} tone="bg-blue-500/15 text-blue-300" />
          <KpiCard title="Média da sessão" value={fmtDuration(data?.avgSessionDurationSec || 0)} icon={Clock} tone="bg-amber-500/15 text-amber-300" />
        </div>

        <div className="grid grid-cols-1 gap-4 border-t border-gray-800 pt-4 xl:grid-cols-3">
          <ReportCard title="Visualizações de página ao longo do tempo" icon={LineChartIcon} className="xl:col-span-2">
            {loading ? <div className="py-10 text-center text-sm text-gray-500">Carregando...</div> : (
              <RevenueAreaChart data={data?.dailySeries || []} dataKey="views" color="#fb923c" formatValue={intFmt} height={240} emptyLabel="Sem visualizações no período." />
            )}
          </ReportCard>
          <ReportCard title="Receita por grupo de produto" icon={Layers}>
            {revenueBars.length === 0 ? <div className="py-10 text-center text-sm text-gray-500">Sem vendas da loja no período.</div> : <RankingBars items={revenueBars} height={240} />}
          </ReportCard>
        </div>

        <div className="grid grid-cols-1 gap-4 border-t border-gray-800 pt-4 lg:grid-cols-2">
          <ReportCard title="Páginas principais" icon={Eye}>
            {(data?.topPages || []).length === 0 ? <div className="py-6 text-center text-sm text-gray-500">Sem visualizações no período.</div> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-gray-500"><tr className="text-left"><th className="pb-2">Página</th><th className="pb-2 text-right">Vistas</th><th className="pb-2 text-right">Únicos</th><th className="pb-2 text-right">Rejeição</th></tr></thead>
                  <tbody>
                    {data.topPages.map((p: any) => (
                      <tr key={p.path} className="border-t border-gray-800">
                        <td className="py-2 pr-2 font-mono text-xs text-gray-300">{p.path}</td>
                        <td className="py-2 text-right font-semibold text-white">{intFmt(p.views)}</td>
                        <td className="py-2 text-right text-gray-400">{intFmt(p.uniqueVisitors)}</td>
                        <td className="py-2 text-right text-gray-400">{p.bounceRate != null ? `${p.bounceRate.toFixed(0)}%` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ReportCard>
          <ReportCard title="De onde vêm os visitantes" icon={Globe2}
            action={<span className="text-[11px] text-gray-500">por localização estimada (IP)</span>}>
            {(data?.topLocations || []).length === 0 ? <div className="py-6 text-center text-sm text-gray-500">Sem localização identificada no período.</div> : (
              <div className="space-y-2">
                {data.topLocations.map((l: any, i: number) => {
                  const max = data.topLocations[0].visitors || 1;
                  const label = [l.country, l.region, l.city].filter((x) => x && x !== "?").join(" › ") || "Desconhecido";
                  return (
                    <div key={i}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="text-gray-300">{label}</span>
                        <span className="font-semibold text-white">{intFmt(l.visitors)}</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-brand-navy">
                        <div className="h-full rounded-full bg-brand-gold" style={{ width: `${Math.max(4, (l.visitors / max) * 100)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ReportCard>
        </div>
      </div>
    </div>
  );
}
