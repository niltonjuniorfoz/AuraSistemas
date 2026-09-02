import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  Brain, TrendingDown, TrendingUp, Calculator, PackagePlus, Coins, RefreshCw, Plus, Trash2,
  AlertTriangle, CheckCircle2, ArrowRight, Loader2,
} from "lucide-react";
import { apiFetch } from "../lib/api";
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, ReferenceLine } from "recharts";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card, CardContent } from "../components/ui/card";

const brl = (v: any) => `R$ ${(Number(v) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const cur = (v: any, c: string) => c === "USD" ? `US$ ${(Number(v) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
  : c === "PYG" ? `₲ ${(Number(v) || 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}` : brl(v);

function ReportCard({ title, icon: Icon, iconColor = "text-brand-gold", action, children, className = "" }: any) {
  return (
    <Card className={`gap-0 rounded-2xl border-gray-700 bg-brand-navylight p-5 shadow-md ${className}`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-white">{Icon && <Icon className={`size-4 ${iconColor}`} />}{title}</h3>
        {action}
      </div>
      <CardContent className="p-0">{children}</CardContent>
    </Card>
  );
}

// Inteligência do negócio (Fase D): quando comprar (câmbio), quanto vai sobrar num lote,
// o que repor e de onde veio o custo.
export function Intelligence() {
  const navigate = useNavigate();
  const [fx, setFx] = useState<any>(null);
  const [restock, setRestock] = useState<any>(null);
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Simulador
  const [sim, setSim] = useState<any>({ currency: "USD", fxRate: "", freightAmount: "", extraCostAmount: "" });
  const [simItems, setSimItems] = useState<any[]>([{ name: "", quantity: 10, unitCost: "", salePrice: "" }]);
  const [simResult, setSimResult] = useState<any>(null);
  const [simLoading, setSimLoading] = useState(false);
  const [simError, setSimError] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [f, r, c] = await Promise.all([
        apiFetch("/api/intel/fx-spread?days=30"),
        apiFetch("/api/intel/restock?days=60"),
        apiFetch("/api/intel/currency-report"),
      ]);
      if (f.ok) setFx(await f.json());
      if (r.ok) setRestock(await r.json());
      if (c.ok) setReport(await c.json());
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const simulate = async () => {
    setSimError(""); setSimResult(null);
    const items = simItems.filter((i) => Number(i.quantity) > 0 && Number(i.unitCost) > 0);
    if (!items.length) { setSimError("Preencha ao menos um item com quantidade e custo."); return; }
    setSimLoading(true);
    try {
      const res = await apiFetch("/api/intel/import-simulator", { method: "POST", body: JSON.stringify({ ...sim, items }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Erro ao simular.");
      setSimResult(j);
    } catch (e: any) { setSimError(e.message); }
    finally { setSimLoading(false); }
  };

  const FxCard = ({ d }: { d: any }) => {
    if (!d?.enoughData) return (
      <div className="rounded-xl border border-gray-800 bg-brand-navy/40 p-4 text-center text-sm text-gray-500">
        {d?.label}<br /><span className="text-[11px]">Sem histórico suficiente ainda — o câmbio é gravado todo dia que o sistema abre.</span>
      </div>
    );
    const tone = d.verdict === "FAVORAVEL" ? { c: "text-emerald-300", b: "border-emerald-500/40 bg-emerald-500/10", i: TrendingDown, t: "Bom momento" }
      : d.verdict === "DESFAVORAVEL" ? { c: "text-red-300", b: "border-red-500/40 bg-red-500/10", i: TrendingUp, t: "Momento ruim" }
      : { c: "text-gray-300", b: "border-gray-700 bg-brand-navy/40", i: ArrowRight, t: "Neutro" };
    const TIcon = tone.i;
    return (
      <div className={`rounded-xl border p-4 ${tone.b}`}>
        <div className="mb-2 flex items-start justify-between gap-2">
          <div>
            <div className="text-[11px] text-gray-400">{d.label}</div>
            <div className={`text-2xl font-black ${tone.c}`}>{Number(d.current).toLocaleString("pt-BR", { maximumFractionDigits: d.pair === "USDBRL" ? 4 : 2 })}</div>
          </div>
          <Badge variant="outline" className={`gap-1 rounded-full px-2 py-1 text-[10px] font-bold ${tone.b} ${tone.c}`}>
            <TIcon className="size-3" /> {tone.t}
          </Badge>
        </div>
        {/* posição na faixa do período */}
        <div className="relative mt-3 h-2 rounded-full bg-brand-navydark">
          <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-500/60 to-red-500/60" style={{ width: "100%" }} />
          <div className="absolute -top-1 h-4 w-1 rounded-full bg-white shadow" style={{ left: `calc(${Math.min(98, Math.max(1, d.position))}% - 2px)` }} />
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-gray-500">
          <span>mín {Number(d.min).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}</span>
          <span>média {Number(d.avg).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}</span>
          <span>máx {Number(d.max).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}</span>
        </div>
        <div className="mt-2 text-[11px] text-gray-400">
          {d.diffPercent >= 0 ? "▲" : "▼"} {Math.abs(d.diffPercent)}% em relação à média de {fx?.days} dias.
          {d.pair === "USDBRL" && (d.verdict === "FAVORAVEL" ? " Dólar abaixo da média — bom para repor estoque." : d.verdict === "DESFAVORAVEL" ? " Dólar caro — se puder, espere para comprar." : "")}
          {d.pair === "BRLPYG" && (d.verdict === "FAVORAVEL" ? " Real forte — seu custo de vida no Paraguai fica mais barato." : "")}
        </div>
        {d.series?.length > 2 && (
          <div className="mt-2 h-16">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={d.series} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id={`fx-${d.pair}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ffd700" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#ffd700" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Tooltip content={({ active, payload }: any) => active && payload?.length ? (
                  <div className="rounded border border-gray-700 bg-[#171717] px-2 py-1 text-[10px] text-gray-200">
                    {payload[0].payload.day}: <b className="text-brand-gold">{Number(payload[0].value).toLocaleString("pt-BR", { maximumFractionDigits: 4 })}</b>
                  </div>
                ) : null} />
                <ReferenceLine y={d.avg} stroke="#34d399" strokeOpacity={0.5} strokeDasharray="3 3" />
                <Area type="monotone" dataKey="rate" stroke="#ffd700" strokeWidth={1.5} fill={`url(#fx-${d.pair})`} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-semibold text-white"><Brain className="h-6 w-6 text-brand-gold" /> Inteligência</h2>
          <p className="text-sm text-gray-400">Quando comprar, quanto vai sobrar e o que repor — com base no seu câmbio e no seu giro.</p>
        </div>
        <Button variant="outline" onClick={load} className="gap-2 rounded-lg border-gray-700 bg-[#171717] px-3 py-2 text-sm text-gray-300 shadow-none hover:bg-[#171717] hover:text-gray-300 dark:bg-[#171717] dark:border-gray-700 dark:hover:bg-[#171717]">
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Atualizar
        </Button>
      </div>

      <div className="rounded-2xl border border-gray-800 bg-[#171717] p-4 space-y-4">
      {/* D1 — Spread cambial */}
      <ReportCard title="Momento do câmbio" icon={Coins}
        action={<Button variant="link" onClick={() => navigate("/finance")} className="h-auto p-0 text-[11px] font-bold text-brand-gold hover:text-brand-gold">ajustar câmbio</Button>}>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <FxCard d={fx?.usd} />
          <FxCard d={fx?.pyg} />
        </div>
      </ReportCard>

      {/* D2 — Simulador de importação */}
      <ReportCard title="Simulador de lote de importação" icon={Calculator}
        action={<span className="text-[11px] text-gray-500">calcule antes de fechar o pedido</span>}>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs text-gray-400">Moeda da compra</label>
            <select value={sim.currency} onChange={(e) => setSim({ ...sim, currency: e.target.value })}
              className="w-full rounded-lg border border-gray-700 bg-[#171717] px-3 py-2 text-white outline-none focus:border-brand-gold">
              <option value="USD">US$ Dólar</option><option value="BRL">R$ Real</option><option value="PYG">₲ Guarani</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-400">Câmbio → R$ (vazio = hoje)</label>
            <input type="number" step="0.0001" value={sim.fxRate} onChange={(e) => setSim({ ...sim, fxRate: e.target.value })} placeholder="auto"
              className="w-full rounded-lg border border-gray-700 bg-[#171717] px-3 py-2 font-mono text-white outline-none focus:border-brand-gold" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-400">Frete ({sim.currency})</label>
            <input type="number" step="0.01" value={sim.freightAmount} onChange={(e) => setSim({ ...sim, freightAmount: e.target.value })} placeholder="0"
              className="w-full rounded-lg border border-gray-700 bg-[#171717] px-3 py-2 font-mono text-white outline-none focus:border-brand-gold" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-400">Outros custos ({sim.currency})</label>
            <input type="number" step="0.01" value={sim.extraCostAmount} onChange={(e) => setSim({ ...sim, extraCostAmount: e.target.value })} placeholder="taxas, despachante"
              className="w-full rounded-lg border border-gray-700 bg-[#171717] px-3 py-2 font-mono text-white outline-none focus:border-brand-gold" />
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {simItems.map((it, i) => (
            <div key={i} className="grid grid-cols-[1fr_70px_90px_90px_auto] gap-2">
              <input value={it.name} onChange={(e) => { const v = [...simItems]; v[i].name = e.target.value; setSimItems(v); }} placeholder="Produto"
                className="rounded-lg border border-gray-700 bg-[#171717] px-2.5 py-1.5 text-sm text-white outline-none focus:border-brand-gold" />
              <input type="number" value={it.quantity} onChange={(e) => { const v = [...simItems]; v[i].quantity = e.target.value; setSimItems(v); }} placeholder="qtd"
                className="rounded-lg border border-gray-700 bg-[#171717] px-2 py-1.5 text-right font-mono text-sm text-white outline-none focus:border-brand-gold" />
              <input type="number" step="0.01" value={it.unitCost} onChange={(e) => { const v = [...simItems]; v[i].unitCost = e.target.value; setSimItems(v); }} placeholder="custo un"
                className="rounded-lg border border-gray-700 bg-[#171717] px-2 py-1.5 text-right font-mono text-sm text-white outline-none focus:border-brand-gold" />
              <input type="number" step="0.01" value={it.salePrice} onChange={(e) => { const v = [...simItems]; v[i].salePrice = e.target.value; setSimItems(v); }} placeholder="venda R$"
                className="rounded-lg border border-gray-700 bg-[#171717] px-2 py-1.5 text-right font-mono text-sm text-white outline-none focus:border-brand-gold" />
              {simItems.length > 1 && (
                <Button variant="ghost" size="icon-xs" onClick={() => setSimItems(simItems.filter((_, j) => j !== i))} className="size-auto px-1 text-red-400 hover:bg-transparent hover:text-red-300 dark:hover:bg-transparent"><Trash2 className="size-4" /></Button>
              )}
            </div>
          ))}
          <div className="flex items-center justify-between">
            <Button variant="link" onClick={() => setSimItems([...simItems, { name: "", quantity: 10, unitCost: "", salePrice: "" }])}
              className="h-auto gap-1 p-0 text-xs font-bold text-brand-gold hover:text-brand-gold hover:no-underline"><Plus className="size-3.5" /> Adicionar item</Button>
            <Button onClick={simulate} disabled={simLoading}
              className="rounded-lg bg-brand-gold px-5 py-2 text-sm font-bold text-brand-navydark hover:bg-brand-goldhover">
              {simLoading ? "Calculando..." : "Simular lote"}
            </Button>
          </div>
          {simError && <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-300">{simError}</div>}
        </div>

        {simResult && (
          <div className="mt-4 space-y-3 border-t border-gray-800 pt-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <div className="rounded-xl border border-gray-800 bg-brand-navy/40 p-3">
                <div className="text-[10px] text-gray-500">Custo do lote</div>
                <div className="text-lg font-black text-white">{brl(simResult.totals.cost)}</div>
                <div className="text-[10px] text-gray-500">{cur(simResult.totalCostNative, simResult.currency)} · câmbio {simResult.fxRate}</div>
              </div>
              <div className="rounded-xl border border-gray-800 bg-brand-navy/40 p-3">
                <div className="text-[10px] text-gray-500">Receita prevista</div>
                <div className="text-lg font-black text-gray-200">{brl(simResult.totals.revenue)}</div>
              </div>
              <div className={`rounded-xl border p-3 ${simResult.totals.margin >= 0 ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/30 bg-red-500/10"}`}>
                <div className="text-[10px] text-gray-400">Lucro previsto</div>
                <div className={`text-lg font-black ${simResult.totals.margin >= 0 ? "text-emerald-300" : "text-red-300"}`}>{brl(simResult.totals.margin)}</div>
                <div className="text-[10px] text-gray-500">{simResult.totals.marginPercent}% de margem</div>
              </div>
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
                <div className="text-[10px] text-amber-300">Câmbio de equilíbrio</div>
                <div className="text-lg font-black text-amber-200">{simResult.breakEvenFx ?? "—"}</div>
                <div className="text-[10px] text-gray-500">acima disso, o lote dá prejuízo</div>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-800">
              <table className="w-full text-sm">
                <thead className="bg-[#171717] text-xs text-gray-400">
                  <tr className="text-left"><th className="px-3 py-2">Item</th><th className="px-3 py-2 text-right">Qtd</th><th className="px-3 py-2 text-right">Custo final (R$)</th><th className="px-3 py-2 text-right">Venda</th><th className="px-3 py-2 text-right">Margem</th><th className="px-3 py-2 text-right">Sugerido (30%)</th></tr>
                </thead>
                <tbody>
                  {simResult.lines.map((l: any, i: number) => (
                    <tr key={i} className="border-t border-gray-800 text-gray-200">
                      <td className="px-3 py-2">{l.name}</td>
                      <td className="px-3 py-2 text-right">{l.quantity}</td>
                      <td className="px-3 py-2 text-right font-mono">{brl(l.landedUnitBrl)}</td>
                      <td className="px-3 py-2 text-right font-mono">{brl(l.salePrice)}</td>
                      <td className={`px-3 py-2 text-right font-bold ${l.marginPercent >= 0 ? "text-emerald-300" : "text-red-300"}`}>{l.marginPercent}%</td>
                      <td className="px-3 py-2 text-right font-mono text-brand-gold">{brl(l.suggestedPrice30)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div>
              <div className="mb-2 text-xs font-semibold text-gray-300">E se o câmbio mudar até a mercadoria chegar?</div>
              <div className="grid grid-cols-5 gap-2">
                {simResult.scenarios.map((s: any) => (
                  <div key={s.fxChangePercent} className={`rounded-lg border p-2 text-center ${s.fxChangePercent === 0 ? "border-brand-gold/40 bg-brand-gold/5" : "border-gray-800 bg-brand-navy/40"}`}>
                    <div className="text-[10px] text-gray-500">{s.fxChangePercent > 0 ? "+" : ""}{s.fxChangePercent}%</div>
                    <div className={`text-sm font-bold ${s.marginBrl >= 0 ? "text-emerald-300" : "text-red-300"}`}>{s.marginPercent}%</div>
                    <div className="text-[10px] text-gray-500">{brl(s.marginBrl)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </ReportCard>

      {/* D3 — Sugestão de recompra */}
      <ReportCard title="O que repor agora" icon={PackagePlus}
        action={restock?.data?.length ? <span className="text-[11px] text-gray-500">investimento estimado {brl(restock.totalInvest)}</span> : undefined}>
        {loading ? <div className="py-8 text-center text-sm text-gray-500"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div>
          : !restock?.data?.length ? (
            <div className="py-8 text-center text-sm text-gray-500">Nada para repor com base nas vendas dos últimos {restock?.days || 60} dias.</div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-800">
              <table className="w-full text-sm">
                <thead className="bg-[#171717] text-xs text-gray-400">
                  <tr className="text-left"><th className="px-3 py-2">Produto</th><th className="px-3 py-2 text-right">Vendeu</th><th className="px-3 py-2 text-right">Em estoque</th><th className="px-3 py-2 text-right">Dura</th><th className="px-3 py-2 text-right">Comprar</th><th className="px-3 py-2 text-right">Custo est.</th></tr>
                </thead>
                <tbody>
                  {restock.data.slice(0, 12).map((p: any) => (
                    <tr key={p.id} className="border-t border-gray-800 text-gray-200">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          {p.urgency === "CRITICO" ? <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-400" />
                            : p.urgency === "ATENCAO" ? <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                            : <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />}
                          <span className="truncate">{p.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right">{p.sold} <span className="text-[10px] text-gray-500">({p.perDay}/dia)</span></td>
                      <td className="px-3 py-2 text-right">{p.available}</td>
                      <td className={`px-3 py-2 text-right font-bold ${p.urgency === "CRITICO" ? "text-red-300" : p.urgency === "ATENCAO" ? "text-amber-300" : "text-gray-300"}`}>
                        {p.daysLeft != null ? `${p.daysLeft}d` : "—"}
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-brand-gold">{p.suggestedQty}</td>
                      <td className="px-3 py-2 text-right font-mono text-gray-400">{brl(p.estimatedCostBrl)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </ReportCard>

      {/* D4 — Comparativo por moeda */}
      <ReportCard title="De onde veio o custo (por moeda)" icon={Coins}
        action={<Button variant="link" onClick={() => navigate("/reports/real-margin")} className="h-auto p-0 text-[11px] font-bold text-brand-gold hover:text-brand-gold">margem real</Button>}>
        {!report ? <div className="py-8 text-center text-sm text-gray-500">Carregando...</div> : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div>
              <div className="mb-2 text-xs font-semibold text-gray-300">Compras no período</div>
              {report.purchasesByCurrency.length === 0 ? <div className="text-sm text-gray-500">Nenhuma compra aprovada no período.</div> : (
                <div className="space-y-2">
                  {report.purchasesByCurrency.map((p: any, i: number) => (
                    <div key={i} className="rounded-xl border border-gray-800 bg-brand-navy/40 p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-white">{p.currency}</span>
                        <span className="text-sm font-bold text-brand-gold">{cur(p.totalNative, p.currency)}</span>
                      </div>
                      <div className="mt-1 flex justify-between text-[11px] text-gray-500">
                        <span>{p.count} compra(s){p.freightNative > 0 ? ` · frete ${cur(p.freightNative, p.currency)}` : ""}</span>
                        {p.totalBrl != null && <span>≈ {brl(p.totalBrl)} · câmbio {p.avgFxToBrl}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <div className="mb-2 text-xs font-semibold text-gray-300">Resultado no período</div>
              <div className="space-y-2">
                <div className="flex justify-between rounded-lg border border-gray-800 bg-brand-navy/40 px-3 py-2 text-sm">
                  <span className="text-gray-400">Vendido (pago)</span><span className="font-bold text-white">{brl(report.sales.revenue)}</span>
                </div>
                <div className="flex justify-between rounded-lg border border-gray-800 bg-brand-navy/40 px-3 py-2 text-sm">
                  <span className="text-gray-400">Custo real (câmbio da compra)</span><span className="font-bold text-red-300">{brl(report.sales.realCost)}</span>
                </div>
                <div className="flex justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm">
                  <span className="text-emerald-300">Margem real</span>
                  <span className="font-black text-emerald-300">{brl(report.sales.margin)} <span className="text-xs">({report.sales.marginPercent}%)</span></span>
                </div>
                {report.stockByCurrency.length > 0 && (
                  <div className="rounded-lg border border-gray-800 bg-brand-navy/40 px-3 py-2">
                    <div className="mb-1 text-[11px] text-gray-400">Estoque que entrou por moeda</div>
                    {report.stockByCurrency.map((s: any, i: number) => (
                      <div key={i} className="flex justify-between text-xs text-gray-300">
                        <span>{s.currency} · {s.qty} un</span><span className="font-mono">{brl(s.costBrl)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </ReportCard>
      </div>
    </div>
  );
}
