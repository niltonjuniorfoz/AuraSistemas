import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  ArrowLeft, FileSpreadsheet, Scale, Search, Loader2, Printer, Wallet, Package, HandCoins,
  CreditCard, Receipt, Info, ChevronRight, ShoppingCart, Store, Target, Users2, Coins,
} from "lucide-react";
import { apiFetch } from "../lib/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const brl = (v: any) => `R$ ${(Number(v) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const brlShort = (v: any) => {
  const n = Number(v) || 0;
  if (Math.abs(n) >= 1000) return `R$ ${(n / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}k`;
  return brl(n);
};
const fmtCur = (v: any, cur?: string) => {
  const n = Number(v) || 0;
  if (cur === "USD") return `US$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (cur === "PYG") return `₲ ${n.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
  return brl(n);
};

// Emoji do grupo de despesa por palavra-chave do nome da categoria.
const groupEmoji = (name: string) => {
  const n = name.toLowerCase();
  if (/pessoal|sal[aá]rio|funcion/.test(n)) return "👥";
  if (/alug|ocupa|im[oó]vel|luz|[aá]gua|condom/.test(n)) return "🏢";
  if (/banc|financ|juro|tarifa/.test(n)) return "🏦";
  if (/tec|software|sistema|internet|equip/.test(n)) return "💻";
  if (/market|an[uú]ncio|propag|gr[aá]fic/.test(n)) return "📣";
  if (/tribut|imposto|taxa|licen/.test(n)) return "📋";
  if (/frete|log[ií]st|transporte|combust/.test(n)) return "🚚";
  if (/admin|escrit[oó]rio|jur[ií]d/.test(n)) return "🗂";
  return "📦";
};

const Delta = ({ cur, prev }: { cur: number; prev: number }) => {
  if (!prev) return <span className="text-[10px] font-bold text-gray-600">novo</span>;
  const pct = ((cur - prev) / Math.abs(prev)) * 100;
  return (
    <span className={`text-[10px] font-bold ${pct >= 0 ? "text-emerald-300" : "text-red-300"}`}>
      {pct >= 0 ? "▲" : "▼"} {Math.abs(pct).toFixed(1)}%
    </span>
  );
};

// Linha da DRE: rótulo | valor | % da receita | período anterior | Δ.
function DreLine({ label, value, base, prev, bold = false, negative = false, positive = false, indent = 0, note }: any) {
  const pctOfBase = base > 0 && value !== 0 ? ((Math.abs(value) / base) * 100).toFixed(1) + "%" : "";
  return (
    <div className={`grid grid-cols-[1fr_auto] items-baseline gap-2 py-1 sm:grid-cols-[1fr_120px_52px_110px_56px] ${bold ? "border-t border-gray-700 pt-2" : ""}`}>
      <span className={`${indent === 1 ? "pl-4" : indent === 2 ? "pl-8" : ""} ${bold ? "text-sm font-bold text-white" : "text-[13px] text-gray-400"} min-w-0 truncate`}>
        {label}{note && <span className="ml-1.5 text-[10px] text-gray-600">{note}</span>}
      </span>
      <span className={`whitespace-nowrap text-right font-mono ${bold ? "text-[15px] font-black" : "text-[13px] font-semibold"} ${negative ? "text-red-300" : positive ? "text-emerald-300" : bold ? "text-white" : "text-gray-200"}`}>
        {negative && value > 0 ? "−" : ""}{brl(Math.abs(value || 0))}
      </span>
      <span className="hidden text-right text-[10px] text-gray-600 sm:block">{pctOfBase}</span>
      <span className="hidden whitespace-nowrap text-right font-mono text-[11px] text-gray-500 sm:block">{prev != null ? brl(Math.abs(prev)) : ""}</span>
      <span className="hidden text-right sm:block">{prev != null ? <Delta cur={Math.abs(value || 0)} prev={Math.abs(prev || 0)} /> : null}</span>
    </div>
  );
}

// Grupo de despesa expansível (categoria → subcategorias).
function ExpenseGroup({ g, base, prevGroup }: any) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setOpen(!open)} className="grid w-full grid-cols-[1fr_auto] items-baseline gap-2 rounded py-1 text-left transition hover:bg-white/[.03] sm:grid-cols-[1fr_120px_52px_110px_56px]">
        <span className="flex min-w-0 items-center gap-1.5 pl-4 text-[13px] text-gray-300">
          <ChevronRight className={`h-3 w-3 shrink-0 text-gray-600 transition-transform ${open ? "rotate-90" : ""}`} />
          <span className="truncate">{groupEmoji(g.name)} {g.name}</span>
          <span className="text-[10px] text-gray-600">({g.items.length})</span>
        </span>
        <span className="whitespace-nowrap text-right font-mono text-[13px] font-semibold text-red-300">−{brl(g.total)}</span>
        <span className="hidden text-right text-[10px] text-gray-600 sm:block">{base > 0 ? ((g.total / base) * 100).toFixed(1) + "%" : ""}</span>
        <span className="hidden whitespace-nowrap text-right font-mono text-[11px] text-gray-500 sm:block">{prevGroup ? brl(prevGroup.total) : ""}</span>
        <span className="hidden text-right sm:block">{prevGroup ? <Delta cur={g.total} prev={prevGroup.total} /> : <span className="text-[10px] font-bold text-gray-600">novo</span>}</span>
      </button>
      {open && g.items.map((it: any, i: number) => (
        <div key={i} className="grid grid-cols-[1fr_auto] items-baseline gap-2 py-0.5 sm:grid-cols-[1fr_120px_52px_110px_56px]">
          <span className="truncate pl-10 text-[12px] text-gray-500">└ {it.name}{it.fixed && <Badge variant="outline" className="ml-1 rounded border-gray-700 px-1 py-0 text-[9px] font-normal">fixa</Badge>}</span>
          <span className="whitespace-nowrap text-right font-mono text-[12px] text-red-300/80">−{brl(it.total)}</span>
          <span className="hidden sm:block" /><span className="hidden sm:block" /><span className="hidden sm:block" />
        </div>
      ))}
    </div>
  );
}

const Rank = ({ items, color = "#ffd700" }: { items: Array<{ name: string; total: number; sub?: string }>; color?: string }) => {
  const max = Math.max(...items.map((i) => i.total), 1);
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={i}>
          <div className="mb-0.5 flex items-baseline justify-between gap-2 text-xs">
            <span className="min-w-0 truncate text-gray-300">{it.name}{it.sub && <span className="ml-1 text-[10px] text-gray-600">{it.sub}</span>}</span>
            <span className="whitespace-nowrap font-mono font-semibold text-gray-200">{brlShort(it.total)}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-brand-navydark">
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.max(4, (it.total / max) * 100)}%`, background: color }} />
          </div>
        </div>
      ))}
    </div>
  );
};

// DRE completa (colunas comparativas + grupos expansíveis) e Balanço/PL com índices.
export function FinancialStatements() {
  const navigate = useNavigate();
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 8) + "01";
  const [dateFrom, setDateFrom] = useState(monthStart);
  const [dateTo, setDateTo] = useState(today);
  const [data, setData] = useState<any>(null);
  const [bal, setBal] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = async (from = dateFrom, to = dateTo) => {
    setLoading(true);
    try {
      const [d, b] = await Promise.all([
        apiFetch(`/api/statements/dre?dateFrom=${from}&dateTo=${to}`),
        apiFetch("/api/statements/balance"),
      ]);
      if (d.ok) setData(await d.json());
      if (b.ok) setBal(await b.json());
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const d = data?.dre;
  const p = data?.previous;
  const base = d?.revenue?.total || 0;

  return (
    <div className="space-y-5 print:bg-white print:text-black">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" onClick={() => navigate("/reports")} className="size-auto p-0 text-gray-400 hover:bg-transparent hover:text-white dark:hover:bg-transparent"><ArrowLeft className="size-5" /></Button>
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-semibold text-white"><FileSpreadsheet className="h-6 w-6 text-brand-gold" /> DRE & Patrimônio</h2>
            <p className="text-sm text-gray-400">Demonstração completa do resultado e a foto do patrimônio (PL).</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="rounded-lg border border-gray-700 bg-[#171717] px-2 py-2 text-xs text-white outline-none focus:border-brand-gold" />
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="rounded-lg border border-gray-700 bg-[#171717] px-2 py-2 text-xs text-white outline-none focus:border-brand-gold" />
          <Button onClick={() => load()} disabled={loading} className="gap-2 rounded-lg bg-brand-gold px-4 py-2 text-sm font-bold text-brand-navydark hover:bg-brand-goldhover">
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />} Buscar
          </Button>
          <Button variant="outline" onClick={() => window.print()} title="Imprimir" className="gap-2 rounded-lg border-gray-700 bg-[#171717] px-3 py-2 text-sm text-gray-300 shadow-none hover:border-brand-gold hover:bg-[#171717] hover:text-gray-300 dark:bg-[#171717] dark:border-gray-700 dark:hover:bg-[#171717]">
            <Printer className="size-4" />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="dre" className="w-full">
        <TabsList className="print:hidden">
          <TabsTrigger value="dre"><FileSpreadsheet className="h-3.5 w-3.5" /> DRE</TabsTrigger>
          <TabsTrigger value="balance"><Scale className="h-3.5 w-3.5" /> Patrimônio (PL)</TabsTrigger>
        </TabsList>

        {/* ==================== DRE ==================== */}
        <TabsContent value="dre" className="mt-4">
          {!d ? (
            <div className="py-16 text-center text-gray-500">{loading ? "Carregando..." : "Sem dados."}</div>
          ) : (
            <div className="space-y-4">
              {/* KPIs do período */}
              <Card className="rounded-2xl border-gray-800 bg-[#171717] p-4 shadow-none gap-0">
                <CardContent className="p-0">
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                    {[
                      { icon: ShoppingCart, label: "Nº de vendas", show: String(d.salesCount), cur: d.salesCount, prev: p?.salesCount },
                      { icon: Target, label: "Ticket médio", show: brl(d.avgTicket), cur: d.avgTicket, prev: p?.avgTicket },
                      { icon: Coins, label: "Lucro / venda", show: brl(d.profitPerSale), cur: d.profitPerSale, prev: p?.profitPerSale },
                      { icon: Users2, label: "Clientes únicos", show: String(d.uniqueCustomers), cur: d.uniqueCustomers, prev: p?.uniqueCustomers },
                      { icon: HandCoins, label: "Recebido (caixa)", show: brl(data.cashReceived), cur: data.cashReceived },
                    ].map((k, i) => (
                      <Card key={i} className="rounded-xl border-gray-700 bg-brand-navylight p-3.5 shadow-none gap-0">
                        <CardContent className="p-0">
                          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-gray-500"><k.icon className="h-3 w-3" /> {k.label}</div>
                          <div className="mt-1 flex items-baseline gap-2">
                            <span className="text-lg font-black text-white">{k.show}</span>
                            {k.prev != null && <Delta cur={Number(k.cur) || 0} prev={Number(k.prev) || 0} />}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                {/* Demonstrativo */}
                <Card className="rounded-2xl border-gray-800 bg-brand-navylight p-5 shadow-md gap-0 xl:col-span-2">
                <CardContent className="p-0">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-white">DRE — {data.period.dateFrom} a {data.period.dateTo}</h3>
                    <span className="text-[10px] text-gray-500">coluna cinza = {data.previousPeriod.dateFrom} a {data.previousPeriod.dateTo}</span>
                  </div>
                  <div className="hidden grid-cols-[1fr_120px_52px_110px_56px] gap-2 border-b border-gray-800 pb-1 text-[9px] uppercase tracking-wider text-gray-600 sm:grid">
                    <span /><span className="text-right">período</span><span className="text-right">% rec.</span><span className="text-right">anterior</span><span className="text-right">Δ</span>
                  </div>

                  <DreLine label="(+) Receita Operacional Bruta" value={d.revenue.gross} base={base} prev={p?.revenue?.gross} bold />
                  <DreLine label="🛒 Vendas balcão (PDV)" value={d.revenue.grossPos} base={base} prev={p?.revenue?.grossPos} indent={1} />
                  {(d.revenue.grossStore > 0 || (p?.revenue?.grossStore || 0) > 0) && (
                    <DreLine label="🌐 Vendas loja online" value={d.revenue.grossStore} base={base} prev={p?.revenue?.grossStore} indent={1} />
                  )}
                  {d.revenue.freight > 0 && <DreLine label="🚚 Frete cobrado" value={d.revenue.freight} base={base} prev={p?.revenue?.freight} indent={1} />}

                  <DreLine label="(−) Deduções" value={-(d.revenue.discounts + d.revenue.returns)} base={base} prev={p ? -(p.revenue.discounts + p.revenue.returns) : undefined} negative bold />
                  <DreLine label="Descontos concedidos" value={d.revenue.discounts} base={base} prev={p?.revenue?.discounts} negative indent={1} />
                  {(d.revenue.returns > 0 || (p?.revenue?.returns || 0) > 0) && (
                    <DreLine label={`Devoluções (${d.revenue.returnsCount} op)`} value={d.revenue.returns} base={base} prev={p?.revenue?.returns} negative indent={1} />
                  )}

                  <DreLine label="(=) Receita Operacional Líquida" value={d.revenue.netOperating} base={base} prev={p?.revenue?.netOperating} bold />

                  {(d.revenue.other > 0 || (p?.revenue?.other || 0) > 0) && (
                    <>
                      <DreLine label="(+) Outras Receitas" value={d.revenue.other} base={base} prev={p?.revenue?.other} bold />
                      {d.revenue.otherItems.map((o: any, i: number) => (
                        <DreLine key={i} label={`💰 ${o.name}`} value={o.total} base={base} indent={1} />
                      ))}
                    </>
                  )}

                  <DreLine label="(=) Receita Total" value={d.revenue.total} base={base} prev={p?.revenue?.total} bold />

                  <DreLine label="(−) CMV — Custo das Mercadorias" value={d.cogs} base={base} prev={p?.cogs} negative bold note={d.hasEstimatedCost ? "parte estimada" : undefined} />
                  <DreLine label={`(=) Lucro Bruto · margem ${d.grossMarginPercent}%`} value={d.grossProfit} base={base} prev={p?.grossProfit} bold positive={d.grossProfit >= 0} negative={d.grossProfit < 0} />

                  <DreLine label="(−) Despesas Operacionais" value={-d.opex} base={base} prev={p ? -p.opex : undefined} negative bold />
                  {d.expenseGroups.filter((g: any) => !g.financial).map((g: any, i: number) => (
                    <ExpenseGroup key={i} g={g} base={base} prevGroup={p?.expenseGroups?.find((x: any) => x.name === g.name)} />
                  ))}

                  <DreLine label={`(=) EBIT — Resultado Operacional · ${d.ebitMarginPercent}%`} value={d.ebit} base={base} prev={p?.ebit} bold positive={d.ebit >= 0} negative={d.ebit < 0} />

                  {(d.financialExpenses > 0 || (p?.financialExpenses || 0) > 0) && (
                    <>
                      <DreLine label="(−) Despesas Financeiras" value={-d.financialExpenses} base={base} prev={p ? -p.financialExpenses : undefined} negative bold />
                      {d.expenseGroups.filter((g: any) => g.financial).map((g: any, i: number) => (
                        <ExpenseGroup key={i} g={g} base={base} prevGroup={p?.expenseGroups?.find((x: any) => x.name === g.name)} />
                      ))}
                    </>
                  )}

                  <DreLine label="(=) Resultado Líquido do Período" value={d.netIncome} base={base} prev={p?.netIncome} bold positive={d.netIncome >= 0} negative={d.netIncome < 0} />
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-gray-500">
                    <span>Margem líquida: <b className={d.netMarginPercent >= 0 ? "text-emerald-300" : "text-red-300"}>{d.netMarginPercent}%</b> (vs {p?.netMarginPercent ?? 0}% no período anterior) · Despesa/Receita: {data.expenseToRevenuePercent}%</span>
                  </div>

                  {data.personalWithdrawals > 0 && (
                    <div className="mt-3 border-t border-dashed border-purple-400/30 pt-2">
                      <DreLine label="(−) Retiradas / gastos pessoais (fora da DRE)" value={-data.personalWithdrawals} base={base} negative />
                      <DreLine label="(=) Resultado após retiradas" value={data.resultAfterWithdrawals} base={base} bold positive={data.resultAfterWithdrawals >= 0} negative={data.resultAfterWithdrawals < 0} />
                    </div>
                  )}

                  <div className="mt-4 space-y-1 border-t border-gray-800 pt-3 text-[11px] text-gray-500">
                    <div className="flex items-start gap-1.5"><Info className="mt-0.5 h-3 w-3 shrink-0" /> CMV real pelo câmbio da época (FIFO): <b className="text-gray-300">{brl(data.realCogs)}</b> — cobre o que já saiu do estoque.</div>
                    {d.monthsCount > 1 && <div className="flex items-start gap-1.5"><Info className="mt-0.5 h-3 w-3 shrink-0" /> Despesas fixas rateadas por {d.monthsCount} meses do período.</div>}
                    <div className="pt-1 text-right text-[10px] text-gray-600">Gerado em {new Date().toLocaleDateString("pt-BR")}</div>
                  </div>
                </CardContent>
                </Card>

                {/* Rankings */}
                <div className="space-y-4">
                  <Card className="rounded-2xl border-gray-800 bg-brand-navylight p-5 shadow-md gap-0">
                    <CardContent className="p-0">
                      <h3 className="mb-3 text-sm font-semibold text-white">Top despesas por subcategoria</h3>
                      {data.topExpenses.length === 0 ? <div className="py-4 text-center text-sm text-gray-500">Nenhuma despesa no período.</div>
                        : <Rank items={data.topExpenses.map((t: any) => ({ name: t.name, sub: t.group, total: t.total }))} color="#f87171" />}
                    </CardContent>
                  </Card>
                  <Card className="rounded-2xl border-gray-800 bg-brand-navylight p-5 shadow-md gap-0">
                    <CardContent className="p-0">
                      <h3 className="mb-3 text-sm font-semibold text-white">Composição da receita</h3>
                      <Rank items={[
                        { name: "🛒 Balcão (PDV)", total: d.revenue.grossPos },
                        { name: "🌐 Loja online", total: d.revenue.grossStore },
                        ...(d.revenue.other > 0 ? [{ name: "💰 Outras receitas", total: d.revenue.other }] : []),
                      ].filter((x) => x.total > 0)} />
                      {d.revenue.freight > 0 && <p className="mt-2 text-[10px] text-gray-600">+ frete cobrado {brl(d.revenue.freight)}</p>}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ==================== Balanço / PL ==================== */}
        <TabsContent value="balance" className="mt-4">
          {!bal ? (
            <div className="py-16 text-center text-gray-500">{loading ? "Carregando..." : "Sem dados."}</div>
          ) : (
            <div className="space-y-4">
              <Card className="rounded-2xl border-gray-800 bg-[#171717] p-4 shadow-none gap-0">
                <CardContent className="p-0">
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                    <Card className="rounded-xl border-gray-700 bg-brand-navylight p-4 shadow-none gap-0">
                      <CardContent className="p-0">
                        <div className="text-[11px] text-gray-400">Ativos</div>
                        <div className="text-xl font-black text-white">{brl(bal.assets.total)}</div>
                      </CardContent>
                    </Card>
                    <Card className="rounded-xl border-gray-700 bg-brand-navylight p-4 shadow-none gap-0">
                      <CardContent className="p-0">
                        <div className="text-[11px] text-gray-400">Passivos</div>
                        <div className="text-xl font-black text-red-300">{brl(bal.liabilities.total)}</div>
                      </CardContent>
                    </Card>
                    <Card className={`rounded-xl p-4 shadow-none gap-0 ${bal.equity >= 0 ? "border-brand-gold/40 bg-brand-gold/10" : "border-red-500/40 bg-red-500/10"}`}>
                      <CardContent className="p-0">
                        <div className="text-[11px] text-gray-300">Patrimônio Líquido</div>
                        <div className={`text-xl font-black ${bal.equity >= 0 ? "text-brand-gold" : "text-red-300"}`}>{brl(bal.equity)}</div>
                      </CardContent>
                    </Card>
                    <Card className="rounded-xl border-gray-700 bg-brand-navylight p-4 shadow-none gap-0">
                      <CardContent className="p-0">
                        <div className="text-[11px] text-gray-400">Liquidez corrente</div>
                        <div className={`text-xl font-black ${(bal.ratios.currentRatio ?? 99) >= 1.5 ? "text-emerald-300" : (bal.ratios.currentRatio ?? 99) >= 1 ? "text-amber-300" : "text-red-300"}`}>
                          {bal.ratios.currentRatio != null ? bal.ratios.currentRatio.toFixed(2) : "∞"}
                        </div>
                        <div className="text-[10px] text-gray-500">quanto tem pra cada R$1 devido</div>
                      </CardContent>
                    </Card>
                    <Card className="rounded-xl border-gray-700 bg-brand-navylight p-4 shadow-none gap-0">
                      <CardContent className="p-0">
                        <div className="text-[11px] text-gray-400">Endividamento</div>
                        <div className={`text-xl font-black ${bal.ratios.debtToAssets <= 30 ? "text-emerald-300" : bal.ratios.debtToAssets <= 60 ? "text-amber-300" : "text-red-300"}`}>{bal.ratios.debtToAssets}%</div>
                        <div className="text-[10px] text-gray-500">dívida sobre o ativo</div>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Card className="rounded-2xl border-gray-800 bg-brand-navylight p-5 shadow-md gap-0">
                <CardContent className="p-0">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-emerald-300">ATIVO</h3>
                    {bal.ratios.composition && (
                      <div className="flex h-2 w-40 overflow-hidden rounded-full">
                        <div style={{ width: `${bal.ratios.composition.cashPercent}%`, background: "#ffd700" }} title={`Caixa ${bal.ratios.composition.cashPercent}%`} />
                        <div style={{ width: `${bal.ratios.composition.cardPercent}%`, background: "#60a5fa" }} title={`Maquininha ${bal.ratios.composition.cardPercent}%`} />
                        <div style={{ width: `${bal.ratios.composition.receivablesPercent}%`, background: "#34d399" }} title={`A receber ${bal.ratios.composition.receivablesPercent}%`} />
                        <div style={{ width: `${bal.ratios.composition.inventoryPercent}%`, background: "#fbbf24" }} title={`Estoque ${bal.ratios.composition.inventoryPercent}%`} />
                      </div>
                    )}
                  </div>

                  <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-gray-300"><Wallet className="h-3.5 w-3.5 text-brand-gold" /> Caixa e bancos</div>
                  {bal.assets.cash.accounts.map((a: any, i: number) => (
                    <div key={i} className="flex justify-between py-0.5 pl-5 text-sm">
                      <span className="text-gray-400">{a.name} <span className="text-[10px] text-gray-600">{a.currency}</span></span>
                      <span className="font-mono text-gray-200">{fmtCur(a.balance, a.currency)}{a.currency !== "BRL" && a.balanceBrl != null && <span className="ml-1 text-[10px] text-gray-500">≈{brl(a.balanceBrl)}</span>}</span>
                    </div>
                  ))}
                  <div className="flex justify-between border-t border-gray-800/60 py-1 pl-5 text-sm font-bold text-white"><span>Subtotal</span><span className="font-mono">{brl(bal.assets.cash.total)}</span></div>

                  {bal.assets.cardReceivable.total > 0 && (
                    <>
                      <div className="mb-1 mt-3 flex items-center gap-1.5 text-xs font-semibold text-gray-300"><CreditCard className="h-3.5 w-3.5 text-blue-300" /> A receber da maquininha</div>
                      <div className="flex justify-between py-0.5 pl-5 text-sm"><span className="text-gray-400">Cartões pendentes de liquidação</span><span className="font-mono text-gray-200">{brl(bal.assets.cardReceivable.total)}</span></div>
                    </>
                  )}

                  <div className="mb-1 mt-3 flex items-center gap-1.5 text-xs font-semibold text-gray-300"><HandCoins className="h-3.5 w-3.5 text-emerald-300" /> Clientes</div>
                  <div className="flex justify-between py-0.5 pl-5 text-sm">
                    <span className="text-gray-400">Contas a receber{bal.assets.customerReceivablesOverdue > 0 && <Badge variant="outline" className="ml-1.5 rounded border-red-500/30 bg-red-500/10 px-1 py-0 text-[9px] font-bold text-red-300">{brl(bal.assets.customerReceivablesOverdue)} vencidas</Badge>}</span>
                    <span className="font-mono text-gray-200">{brl(bal.assets.customerReceivables)}</span>
                  </div>

                  <div className="mb-1 mt-3 flex items-center gap-1.5 text-xs font-semibold text-gray-300"><Package className="h-3.5 w-3.5 text-amber-300" /> Estoque (a custo)</div>
                  {bal.assets.inventory.byCurrency.map((l: any, i: number) => (
                    <div key={i} className="flex justify-between py-0.5 pl-5 text-sm">
                      <span className="text-gray-400">Comprado em {l.currency} <span className="text-[10px] text-gray-600">({l.qty} un)</span></span>
                      <span className="font-mono text-gray-200">{brl(l.totalBrl)}</span>
                    </div>
                  ))}
                  {bal.assets.inventory.estimated > 0 && (
                    <div className="flex justify-between py-0.5 pl-5 text-sm"><span className="text-gray-400">Itens sem camada (estimado)</span><span className="font-mono text-gray-200">{brl(bal.assets.inventory.estimated)}</span></div>
                  )}

                  <div className="mt-3 flex justify-between border-t border-gray-700 pt-2 text-sm font-black text-emerald-300"><span>TOTAL DO ATIVO</span><span className="font-mono text-base">{brl(bal.assets.total)}</span></div>
                </CardContent>
                </Card>

                <div className="space-y-4">
                  <Card className="rounded-2xl border-gray-800 bg-brand-navylight p-5 shadow-md gap-0">
                    <CardContent className="p-0">
                    <h3 className="mb-3 text-sm font-semibold text-red-300">PASSIVO</h3>
                    <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-gray-300"><Receipt className="h-3.5 w-3.5 text-red-300" /> Fornecedores e contas</div>
                    <div className="flex justify-between py-0.5 pl-5 text-sm">
                      <span className="text-gray-400">Contas a pagar em aberto{bal.liabilities.payablesOverdue > 0 && <Badge variant="outline" className="ml-1.5 rounded border-red-500/30 bg-red-500/10 px-1 py-0 text-[9px] font-bold text-red-300">{brl(bal.liabilities.payablesOverdue)} vencidas</Badge>}</span>
                      <span className="font-mono text-gray-200">{brl(bal.liabilities.payables)}</span>
                    </div>
                    <div className="mt-3 flex justify-between border-t border-gray-700 pt-2 text-sm font-black text-red-300"><span>TOTAL DO PASSIVO</span><span className="font-mono text-base">{brl(bal.liabilities.total)}</span></div>
                    <div className={`mt-4 flex justify-between border-t border-gray-800 pt-3 text-sm font-black ${bal.equity >= 0 ? "text-brand-gold" : "text-red-300"}`}>
                      <span>PATRIMÔNIO LÍQUIDO</span><span className="font-mono text-base">{brl(bal.equity)}</span>
                    </div>
                    </CardContent>
                  </Card>

                  <Card className="rounded-2xl border-purple-400/25 bg-purple-500/5 p-5 shadow-none gap-0">
                    <CardContent className="p-0">
                    <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-purple-300"><Store className="h-4 w-4" /> Fora do PL da empresa</h3>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Contas pessoais (patrimônio seu)</span>
                      <span className="font-mono font-bold text-purple-300">{brl(bal.personalNetWorthBrl)}</span>
                    </div>
                    <p className="mt-2 text-[11px] text-gray-500">
                      PL gerencial: caixa, estoque a custo, a receber e a pagar de hoje. Não inclui imobilizado nem
                      capital social. {bal.unconvertedAccounts > 0 && `${bal.unconvertedAccounts} conta(s) sem câmbio ficaram fora.`}
                    </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
