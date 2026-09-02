import React, { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  Package, Users, ShoppingCart, DollarSign, Loader2, ArrowUpRight, Eye, ChevronDown,
  TrendingUp, TrendingDown, Clock, Search, Bot, HandCoins, Receipt, AlertTriangle,
  Boxes, BarChart3, Activity, Wallet, Plus, Pencil, Trash2, Lightbulb,
  CreditCard, PackageX, Trophy, UserRound, Crown, ArrowLeftRight, Percent, Target,
} from "lucide-react";
import { apiFetch } from "../lib/api";
import { formatDate, moneyFieldLabel, useAdminTranslation } from "../lib/i18n";
import { useAuthStore } from "../stores/authStore";
import { useNavigate } from "react-router";
import { AiReportModal } from "../components/AiReportModal";
import { Modal } from "../components/Modal";
import { ConfirmModal } from "../components/ConfirmModal";
import { Money } from "../components/Money";
import { AnimatedNumber } from "../components/AnimatedNumber";
import { prefersReducedMotion } from "../lib/motion";
import { RevenueAreaChart, CompositionDonut, RankingBars } from "../components/charts";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { useDisplayCurrency, formatDisplayBrl } from "../stores/displayCurrency";
import { DisplayCurrencySelector } from "../components/DisplayCurrencySelector";

const GOLD = "#ffd700";
const EMERALD = "#34d399";
const RED = "#f87171";
const AMBER = "#fbbf24";
const BLUE = "#60a5fa";
const PURPLE = "#a78bfa";

const intFmt = (v: any) => (Number(v) || 0).toLocaleString("pt-BR");

// Abas do gráfico "Desempenho por dia" — cada uma pluga num campo de `dailySales` (já vem pronto
// da API) com sua cor e formatação de valor próprias, sem precisar de um gráfico por métrica.
// Presets do filtro de período do cabeçalho — cada um sabe calcular seu próprio dateFrom/dateTo.
const PERIOD_PRESETS: Array<[string, string]> = [
  ["TODAY", "Hoje"], ["YESTERDAY", "Ontem"], ["D7", "7 dias"], ["D15", "15 dias"], ["D30", "30 dias"],
  ["THIS_MONTH", "Este mês"], ["D60", "60 dias"], ["D90", "90 dias"], ["D180", "180 dias"],
  ["YEAR", String(new Date().getFullYear())], ["ALL", "Tudo"], ["CUSTOM", "Personalizado"],
];
const PERIOD_LABELS = Object.fromEntries(PERIOD_PRESETS) as Record<string, string>;

// Mesmo vocabulário/cores de status já usado em Pedidos da Loja (src/pages/StoreOrders.tsx) —
// repetir aqui em vez de importar porque lá é local ao componente, não exportado.
const ORDER_STATUS: Record<string, { label: string; cls: string }> = {
  AWAITING_PAYMENT: { label: "Aguardando pagamento", cls: "border-amber-500/30 bg-amber-500/10 text-amber-300" },
  PROOF_SENT: { label: "Comprovante enviado", cls: "border-blue-500/30 bg-blue-500/10 text-blue-300" },
  CONFIRMED: { label: "Confirmado", cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" },
  CANCELED: { label: "Cancelado", cls: "border-red-500/30 bg-red-500/10 text-red-300" },
};
// Estágio de entrega — só faz sentido mostrar depois que o pagamento já foi confirmado.
const FULFILLMENT_LABEL: Record<string, string> = {
  PENDING: "Separando / a caminho", DELIVERED: "Entregue", RETURNED: "Devolvido",
};
const AVATAR_COLORS = ["#f97316", "#10b981", "#3b82f6", "#a855f7", "#ec4899", "#eab308"];
const initials = (name: string) => (name || "?").trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");

type ChartMetricKey = "total" | "ticket" | "profit" | "count" | "customers" | "views";
const CHART_METRIC_LABELS: Record<ChartMetricKey, { label: string; color: string }> = {
  total: { label: "Receita", color: GOLD },
  ticket: { label: "Ticket Médio", color: PURPLE },
  profit: { label: "Lucro Líquido", color: EMERALD },
  count: { label: "Pedidos", color: BLUE },
  customers: { label: "Clientes ativos", color: "#f472b6" },
  views: { label: "Visualizações", color: AMBER },
};
const compact = (v: number) => {
  const n = Number(v) || 0;
  if (Math.abs(n) >= 1000000) return `${(n / 1000000).toFixed(1).replace(".0", "")}M`;
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1).replace(".0", "")}k`;
  return String(Math.round(n));
};

function relTime(value: string | Date) {
  const d = new Date(value).getTime();
  if (!d) return "";
  const diff = Date.now() - d;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `há ${hrs} h`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "ontem";
  if (days < 7) return `há ${days} dias`;
  return new Date(value).toLocaleDateString("pt-BR");
}

// Ranking com pódio (top vendedores / compradores).
function RankList({ items, emptyText, onClick, accent = GOLD, money }:
  { items: Array<{ name: string; total: number; count: number; avgTicket: number; extra?: string }>; emptyText: string; onClick?: () => void; accent?: string; money: (v: any) => string }) {
  if (!items || items.length === 0) return <div className="py-8 text-center text-sm text-gray-500">{emptyText}</div>;
  const max = Math.max(...items.map((i) => i.total), 1);
  const medal = ["#ffd700", "#cbd5e1", "#d97706"];
  return (
    <div className="space-y-2.5">
      {items.map((it, i) => (
        <div key={i} onClick={onClick} className={`group rounded-xl border border-gray-800 bg-[#171717] p-2.5 transition hover:border-gray-600 ${onClick ? "cursor-pointer" : ""}`}>
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-black"
              style={{ background: i < 3 ? `${medal[i]}22` : "#1e1e1e", color: i < 3 ? medal[i] : "#737373", border: `1px solid ${i < 3 ? medal[i] + "55" : "#404040"}` }}>
              {i === 0 ? <Crown className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-white">{it.name}</div>
              <div className="text-[10px] text-gray-500">{it.count} venda(s) · ticket {money(it.avgTicket)}{it.extra ? ` · ${it.extra}` : ""}</div>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-sm font-bold" style={{ color: accent }}>{money(it.total)}</div>
            </div>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-brand-navydark">
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.max(5, (it.total / max) * 100)}%`, background: i < 3 ? medal[i] : "#475569" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// Ícone/estilo por tipo de evento do feed de atividade.
function feedMeta(kind: string) {
  const map: Record<string, { icon: any; color: string; bg: string }> = {
    SALE: { icon: ShoppingCart, color: "#34d399", bg: "rgba(52,211,153,.12)" },
    PAYMENT: { icon: HandCoins, color: GOLD, bg: "rgba(255,215,0,.12)" },
    PURCHASE: { icon: Package, color: BLUE, bg: "rgba(96,165,250,.12)" },
    PERSONAL: { icon: UserRound, color: PURPLE, bg: "rgba(167,139,250,.12)" },
  };
  return map[kind] || { icon: Activity, color: "#94a3b8", bg: "rgba(148,163,184,.12)" };
}

export function Dashboard() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const { t, language } = useAdminTranslation();

  const canViewProfit = user?.roleKey === "admin" || user?.roleKey === "master" || user?.roleKey === "management";
  const canManageExpenses = canViewProfit;

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [filterType, setFilterType] = useState("THIS_MONTH");
  const [periodOpen, setPeriodOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString().split("T")[0]; });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split("T")[0]);

  const [expenses, setExpenses] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ id: "", categoryId: "", description: "", amountUsd: "", expenseDate: new Date().toISOString().split("T")[0] });
  const [confirmDeleteExpenseOpen, setConfirmDeleteExpenseOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);
  const [isDeletingExpense, setIsDeletingExpense] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiReport, setAiReport] = useState("");
  const [aiError, setAiError] = useState("");

  const [expiringLots, setExpiringLots] = useState<any[]>([]);
  const [receivables, setReceivables] = useState<any>(null);
  const [payables, setPayables] = useState<any>(null);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [financeAccounts, setFinanceAccounts] = useState<any[]>([]);
  const [financeTotal, setFinanceTotal] = useState(0);
  const [ops, setOps] = useState({ separation: 0, delivery: 0 });

  const reduceMotion = useMemo(() => prefersReducedMotion(), []);

  useEffect(() => {
    fetchData();
    fetchExpiringLots();
    fetchReceivables();
    fetchPayables();
    fetchTopProducts();
    fetchLowStock();
    fetchFinanceAccounts();
    fetchOpsQueues();
    if (canManageExpenses) { fetchExpenses(); fetchCategories(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const safeJson = async (res: Response) => { try { return await res.json(); } catch { return {}; } };

  const fetchLowStock = async () => {
    try { const res = await apiFetch("/api/products/low-stock"); if (res.ok) { const j = await safeJson(res); setLowStock(Array.isArray(j.data) ? j.data : []); } } catch {}
  };
  const fetchFinanceAccounts = async () => {
    try { const res = await apiFetch("/api/finance/accounts"); if (res.ok) { const j = await safeJson(res); setFinanceAccounts(Array.isArray(j.data) ? j.data : []); setFinanceTotal(j.totalBalance || 0); } } catch {}
  };
  // Fila operacional (separação/entrega). Sem permissão, o fetch falha em silêncio e o card some.
  const fetchOpsQueues = async () => {
    const count = async (url: string) => {
      try {
        const res = await apiFetch(url);
        if (!res.ok) return 0;
        const j = await safeJson(res);
        const arr = Array.isArray(j) ? j : Array.isArray(j.data) ? j.data : [];
        return arr.length;
      } catch { return 0; }
    };
    const [sep, del] = await Promise.all([count("/api/separation/queue"), count("/api/delivery/queue")]);
    setOps({ separation: sep, delivery: del });
  };
  const fetchExpiringLots = async () => {
    try { const res = await apiFetch("/api/lots/expiring?days=90"); if (res.ok) { const j = await safeJson(res); setExpiringLots(Array.isArray(j.data) ? j.data : []); } } catch {}
  };
  const fetchReceivables = async () => {
    try { const res = await apiFetch("/api/receivables"); if (res.ok) { const j = await safeJson(res); setReceivables(j.summary || null); } } catch {}
  };
  const fetchPayables = async () => {
    try { const res = await apiFetch("/api/payables"); if (res.ok) { const j = await safeJson(res); setPayables(j.summary || null); } } catch {}
  };
  const fetchTopProducts = async (fromArg?: string, toArg?: string) => {
    try {
      const qs = new URLSearchParams({ dateFrom: fromArg ?? dateFrom, dateTo: toArg ?? dateTo });
      const res = await apiFetch(`/api/reports/abc?${qs.toString()}`);
      if (res.ok) { const j = await safeJson(res); setTopProducts(Array.isArray(j.data) ? j.data.slice(0, 5) : []); }
    } catch {}
  };

  const DAY_OFFSETS: Record<string, number> = { D7: 7, D15: 15, D30: 30, D60: 60, D90: 90, D180: 180 };

  const handleFilterChange = (val: string) => {
    setFilterType(val);
    setPeriodOpen(false);
    if (val === "CUSTOM") return; // usuário passa a controlar pelos campos de data manualmente

    const today = new Date();
    const to = today.toISOString().split("T")[0];
    let from = to;
    if (val === "TODAY") { /* from = to já cobre */ }
    else if (val === "YESTERDAY") {
      const y = new Date(); y.setDate(y.getDate() - 1);
      const yStr = y.toISOString().split("T")[0];
      setDateFrom(yStr); setDateTo(yStr); fetchData(yStr, yStr); return;
    }
    else if (val in DAY_OFFSETS) {
      const d = new Date(); d.setDate(d.getDate() - (DAY_OFFSETS[val] - 1)); from = d.toISOString().split("T")[0];
    }
    else if (val === "THIS_MONTH") { const d = new Date(); d.setDate(1); from = d.toISOString().split("T")[0]; }
    else if (val === "YEAR") { const d = new Date(); d.setMonth(0, 1); from = d.toISOString().split("T")[0]; }
    else if (val === "ALL") { from = "2000-01-01"; }

    setDateFrom(from); setDateTo(to);
    fetchData(from, to); // dispara com as datas recém-calculadas (não depende do setState assíncrono)
  };

  // Aceita datas explícitas: os botões de filtro passam as datas recém-calculadas para não depender
  // do estado (que ainda não atualizou no mesmo tick).
  const fetchData = async (fromArg?: string, toArg?: string) => {
    const from = fromArg ?? dateFrom, to = toArg ?? dateTo;
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (from) qs.append("dateFrom", from);
      if (to) qs.append("dateTo", to);
      const res = await apiFetch(`/api/dashboard/overview?${qs.toString()}`);
      if (res.ok) setData(await safeJson(res));
      else { const err = await safeJson(res); alert(err.error || "Erro ao carregar dashboard"); }
    } catch (err) { console.error(err); alert("Erro ao conectar"); }
    finally { setLoading(false); }
    if (canManageExpenses) fetchExpenses(from, to);
    fetchTopProducts(from, to);
  };

  const fetchExpenses = async (fromArg?: string, toArg?: string) => {
    try {
      const qs = new URLSearchParams();
      const dFrom = fromArg ?? dateFrom, dTo = toArg ?? dateTo;
      if (dFrom) qs.append("dateFrom", dFrom);
      if (dTo) qs.append("dateTo", dTo);
      const res = await apiFetch(`/api/expenses?${qs.toString()}`);
      if (res.ok) setExpenses(await safeJson(res));
    } catch {}
  };
  const fetchCategories = async () => {
    try { const res = await apiFetch("/api/expenses/categories"); if (res.ok) setCategories(await safeJson(res)); } catch {}
  };

  const saveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = expenseForm.id ? `/api/expenses/${expenseForm.id}` : "/api/expenses";
      const method = expenseForm.id ? "PUT" : "POST";
      const res = await apiFetch(url, { method, body: JSON.stringify(expenseForm) });
      if (res.ok) { setShowExpenseModal(false); setExpenseForm({ id: "", categoryId: "", description: "", amountUsd: "", expenseDate: new Date().toISOString().split("T")[0] }); fetchData(); }
      else { const err = await safeJson(res); alert(err.error || "Erro ao salvar despesa"); }
    } catch { alert("Erro na conexão"); }
  };
  const initDeleteExpense = (id: string) => {
    setExpenseToDelete(id);
    setConfirmDeleteExpenseOpen(true);
  };
  const handleConfirmDeleteExpense = async () => {
    if (!expenseToDelete) return;
    setIsDeletingExpense(true);
    try {
      const res = await apiFetch(`/api/expenses/${expenseToDelete}`, { method: "DELETE" });
      if (res.ok) { setConfirmDeleteExpenseOpen(false); fetchData(); }
      else { const err = await safeJson(res); alert(err.error || "Erro ao excluir"); }
    } catch { alert("Erro na conexão"); }
    finally { setIsDeletingExpense(false); setExpenseToDelete(null); }
  };
  const generateAiReport = async () => {
    if (!data) return;
    setAiModalOpen(true); setAiLoading(true); setAiError(""); setAiReport("");
    try {
      const res = await apiFetch("/api/ai-reports/analysis", { method: "POST", body: JSON.stringify({ reportType: "dashboard_financeiro", language, filters: { dateFrom, dateTo, filterType }, data: { dashboard: data, expenses: expenses.slice(0, 120) } }) });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || "Erro ao gerar relatório com IA.");
      setAiReport(payload.analysis || "");
    } catch (err: any) { setAiError(err.message || "Erro ao gerar relatório com IA."); }
    finally { setAiLoading(false); }
  };

  const s = data?.summary;
  const daily = data?.dailySales || [];
  const recentOrders = data?.recentOrders || [];
  const recentOrderStatusCounts = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const o of recentOrders) acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, [recentOrders]);
  const [chartMetric, setChartMetric] = useState<ChartMetricKey>("total");
  const bestDay = useMemo(() => {
    if (!daily.length) return null;
    return daily.reduce((a: any, b: any) => (b.total > a.total ? b : a), daily[0]);
  }, [daily]);

  // Alertas e dicas contextuais.
  const overdueReceber = receivables?.overdueCount || 0;
  const overduePagar = payables?.overdueCount || 0;
  const expiringCount = expiringLots.length;
  const lowStockCount = lowStock.length;
  const opsPending = (ops.separation || 0) + (ops.delivery || 0);
  const hasAlerts = overdueReceber > 0 || overduePagar > 0 || expiringCount > 0 || lowStockCount > 0 || opsPending > 0;

  const realMargin = data?.realMargin;
  const personal = data?.personal;
  const fxToday = data?.fxToday || {};

  // Moeda de exibição do Dashboard (seletor R$/US$/G$ no topo, pedido do
  // usuário — empresa paraguaia precisa ver os números em Guarani). Os
  // valores continuam guardados em R$; só a exibição converte, usando a
  // mesma cotação viva do pill "⇄ US$ ..." (fxToday). Sem cotação carregada
  // ainda, cai pra R$ em vez de travar/mostrar NaN.
  const { currency: dashCurrency } = useDisplayCurrency();
  const brl = (v: any) => formatDisplayBrl(v, dashCurrency, fxToday);
  // Valor na moeda nativa da conta (PYG não usa centavos) — não segue o
  // seletor: uma conta em US$/G$ de verdade sempre mostra o próprio saldo.
  const fmtCur = (v: any, cur?: string) => {
    const n = Number(v) || 0;
    if (cur === "USD") return `US$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (cur === "PYG") return `₲ ${n.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
    return brl(n);
  };
  const CHART_METRICS: Record<ChartMetricKey, { label: string; color: string; format: (v: any) => string }> = {
    total: { ...CHART_METRIC_LABELS.total, format: brl },
    ticket: { ...CHART_METRIC_LABELS.ticket, format: brl },
    profit: { ...CHART_METRIC_LABELS.profit, format: brl },
    count: { ...CHART_METRIC_LABELS.count, format: intFmt },
    customers: { ...CHART_METRIC_LABELS.customers, format: intFmt },
    views: { ...CHART_METRIC_LABELS.views, format: intFmt },
  };

  const tips: string[] = [];
  if (data?.hasEstimatedCost) tips.push("Algumas vendas não têm custo gravado — cadastre o custo dos produtos para a margem ficar exata.");
  if (realMargin && realMargin.coverage > 0 && realMargin.coverage < 100) tips.push(`Margem real cobre ${realMargin.coverage.toFixed(0)}% das vendas do período — o resto ainda não saiu do estoque.`);
  if (expiringCount > 0) tips.push(`Você tem ${expiringCount} lote(s) a vencer. Priorize a venda dos que vencem primeiro (o PDV já sugere).`);
  if (overdueReceber > 0) tips.push(`Há ${overdueReceber} conta(s) a receber vencida(s). Faça a cobrança em Contas a Receber.`);
  if (personal?.runwayMonths != null && personal.runwayMonths < 3) tips.push(`Seu caixa pessoal cobre ${personal.runwayMonths.toFixed(1)} meses de custo de vida. Considere reforçar a retirada.`);
  if (opsPending > 0) tips.push(`${opsPending} pedido(s) aguardando na operação (${ops.separation} separar / ${ops.delivery} entregar).`);
  if (s && s.salesCount === 0) tips.push("Nenhuma venda paga no período. Ajuste o filtro ou registre vendas no PDV.");
  if (tips.length === 0) tips.push("Tudo em dia! Acompanhe seu faturamento no gráfico e use a Curva ABC para saber o que mais vende.");

  const period = filterType === "TODAY" ? "hoje" : (PERIOD_LABELS[filterType]?.toLowerCase() || "período selecionado");

  const PAYL: Record<string, string> = { CASH: "Dinheiro", PIX: "PIX", DEBIT_CARD: "Débito", CREDIT_CARD: "Crédito", TRANSFER: "Transferência" };
  const PAYC: Record<string, string> = { CASH: GOLD, PIX: EMERALD, DEBIT_CARD: PURPLE, CREDIT_CARD: BLUE, TRANSFER: AMBER };
  const payItems = (data?.paymentMix || []).map((m: any) => ({ label: PAYL[m.method] || m.method, value: Number(m.total), color: PAYC[m.method] || "#64748b" }));
  const payTotal = payItems.reduce((a: number, b: any) => a + b.value, 0);

  // pct exatamente 0 quase sempre é "sem dado pra comparar" (período anterior também zerado), não
  // "cresceu 0%" — mostrar como seta verde nesse caso é enganoso. Badge neutro cinza em vez disso.
  const Delta = ({ pct }: { pct: number }) => (
    pct === 0
      ? <Badge variant="secondary" className="rounded-md gap-0.5 bg-gray-700/25 px-1.5 py-0.5 text-[10px] font-bold text-gray-400">— sem variação</Badge>
      : <Badge variant="outline" className={`rounded-md gap-0.5 border-transparent px-1.5 py-0.5 text-[10px] font-bold ${pct >= 0 ? "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/15" : "bg-red-500/15 text-red-300 hover:bg-red-500/15"}`}>
          {pct >= 0 ? "▲" : "▼"} {Math.abs(pct).toFixed(1)}%
        </Badge>
  );

  // Mini-gráfico de tendência (sparkline) pro rodapé dos KpiCards — só decorativo, o valor exato
  // já está no número grande acima; a linha é só "subiu ou desceu nos últimos dias".
  // Quando todos os dias do período têm o mesmo valor (tipicamente zero), uma linha "reta" no
  // meio parece card quebrado — troca por um traço pontilhado bem apagado (estado vazio, não bug).
  const Sparkline = ({ data, color }: { data: number[]; color: string }) => {
    if (!data || data.length < 2) return null;
    const w = 100, h = 28, pad = 2;
    if (new Set(data).size <= 1) {
      return (
        <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="mt-2 h-7 w-full sparkline-size-fix">
          <line x1="0" y1={h - pad} x2={w} y2={h - pad} stroke={color} strokeOpacity="0.3" strokeWidth="1.5" strokeDasharray="3 3" />
        </svg>
      );
    }
    const min = Math.min(...data), max = Math.max(...data);
    const range = max - min || 1;
    const pts = data.map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - pad - ((v - min) / range) * (h - pad * 2);
      return [x, y];
    });
    const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
    const area = `0,${h} ${line} ${w},${h}`;
    const gid = `spark-${color.replace(/[^a-zA-Z0-9]/g, "")}`;
    const [lastX, lastY] = pts[pts.length - 1];
    return (
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="mt-2 h-7 w-full sparkline-size-fix">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={area} fill={`url(#${gid})`} />
        <polyline points={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={lastX} cy={lastY} r="2.2" fill={color} stroke="#1e1e1e" strokeWidth="1" />
      </svg>
    );
  };

  // Card com sparkline ganha um tint de fundo/ícone na cor da própria tendência — dá identidade
  // visual própria pra cada métrica em vez de todos os cards "dark" ficarem idênticos entre si.
  const KpiCard = ({ title, value, format = intFmt, icon: Icon, to, tone = "gold", sub, delta, sparkline, sparklineColor }: any) => {
    const accent = tone === "dark" ? sparklineColor : null;
    return (
      <Button
        variant="ghost"
        onClick={() => to && navigate(to)}
        className={`group relative flex h-auto w-full flex-col items-stretch justify-start gap-0 overflow-hidden rounded-2xl border p-4 text-left shadow-md hover:-translate-y-0.5 hover:shadow-xl ${tone === "gold" ? "border-brand-gold/25 bg-gradient-to-br from-brand-gold/10 via-transparent to-transparent hover:border-brand-gold/60 hover:bg-transparent dark:hover:bg-transparent" : "border-white/10 bg-brand-navylight hover:border-white/20 hover:bg-brand-navylight dark:hover:bg-brand-navylight"}`}
        style={accent ? { backgroundImage: `linear-gradient(135deg, ${accent}14, transparent 65%)` } : undefined}>
        <div className="flex items-start justify-between">
          <div className={`rounded-lg p-2 ${tone === "gold" ? "bg-brand-gold/20 text-brand-gold" : accent ? "" : "border border-gray-700 bg-[#171717] text-gray-300"}`}
            style={accent ? { background: `${accent}22`, color: accent, border: `1px solid ${accent}33` } : undefined}>
            <Icon className="size-5" />
          </div>
          {to && <ArrowUpRight className="size-4 text-gray-600 transition group-hover:text-brand-gold" />}
        </div>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <div className="text-2xl font-bold leading-tight tabular-nums text-white"><AnimatedNumber value={value} format={format} /></div>
          {delta != null && <Delta pct={delta} />}
        </div>
        <div className="mt-0.5 flex items-center justify-between">
          <span className="text-xs text-gray-400">{title}</span>
          {sub && <span className="text-[11px] text-gray-500">{sub}</span>}
        </div>
        {sparkline && <Sparkline data={sparkline} color={sparklineColor || "#d4af37"} />}
      </Button>
    );
  };

  // Delega pro `Card`/`CardContent` compartilhados (importados no topo do arquivo), preservando a
  // MESMA API (title/icon/iconColor/action/children/className) e a aparência exata do painel local
  // que existia aqui antes — `rounded-2xl`/`shadow-md`/`gap-0` sobrescrevem os defaults do `Card`
  // compartilhado (`rounded-xl`/`shadow-sm`/`gap-6`) para não mudar o visual. `className` do
  // chamador vem ANTES das classes-base (não depois): o `Card` local antigo usava concatenação de
  // string simples (não `cn()`/`twMerge`), então em conflito (ex.: "Dicas" passa `className="p-4"`
  // por cima do `p-5` base) quem vencia era a ordem de geração do CSS do Tailwind, não a ordem no
  // atributo — e nesse caso `p-5` sempre vencia (confirmado no CSS buildado). Com `Card` compartilhado
  // (que usa `cn()`/`twMerge`, onde a ÚLTIMA classe do string sempre vence), colocar a className do
  // chamador primeiro preserva esse mesmo resultado (`p-5` vence). Os outros 3 usos de `className`
  // neste arquivo (`xl:col-span-2`/`mb-6`/`lg:col-span-2`) não conflitam com as classes-base, então
  // a ordem não os afeta.
  const ReportCard = ({ title, icon: Icon, iconColor = "text-brand-gold", action, children, className = "" }: any) => (
    <Card className={`${className} rounded-2xl gap-0 border-white/10 bg-brand-navylight p-5 shadow-md`}>
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-white">{Icon && <Icon className={`size-4 ${iconColor}`} />}{title}</h3>
        {action}
      </div>
      <CardContent className="p-0">{children}</CardContent>
    </Card>
  );

  // Motion de entrada: cada bloco da página aparece em sequência (fade+leve subida), uma vez só
  // no carregamento — trocar o filtro de período não deve re-disparar isso. Desliga sozinho se o
  // usuário pediu "reduzir movimento" no sistema operacional (reduceMotion, calculado uma vez acima).
  const fadeUpItem = {
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
  };
  const kpiGridContainer = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.05 } },
  };
  const belowKpiContainer = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.06, delayChildren: 0.3 } },
  };

  return (
    <div className="dashboard-financial-page flex h-full flex-col overflow-y-auto pb-8">
      <style>{`@keyframes dashIn{to{stroke-dashoffset:0}}`}</style>

      {/* Header */}
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Bem-vindo de volta{user?.name ? `, ${user.name.split(" ")[0]}` : ""}!</h2>
          <p className="text-sm text-gray-400">Aqui está o que está acontecendo com o seu negócio hoje — {period}.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-800 bg-[#171717] p-2">
          {/* Câmbio do dia (Fase A) — atalho pro Financeiro */}
          {(fxToday.USDBRL || fxToday.BRLPYG) && (
            <Button variant="outline" onClick={() => navigate("/finance")} title="Câmbio de hoje — clique para ajustar"
              className="h-9 gap-2 rounded-lg border-gray-700 bg-[#171717] px-3 text-xs shadow-none hover:border-brand-gold hover:bg-[#171717] dark:border-gray-700 dark:bg-[#171717] dark:hover:bg-[#171717]">
              <ArrowLeftRight className="size-3.5 text-brand-gold" />
              {fxToday.USDBRL && <span className="text-gray-300">US$ <b className="text-white">{Number(fxToday.USDBRL.rate).toFixed(2)}</b></span>}
              {fxToday.BRLPYG && <span className="text-gray-300">₲ <b className="text-white">{Number(fxToday.BRLPYG.rate).toFixed(0)}</b></span>}
              {(fxToday.USDBRL?.source === "MANUAL" || fxToday.BRLPYG?.source === "MANUAL") && <span className="font-bold text-brand-gold">M</span>}
            </Button>
          )}
          {/* Moeda de exibição do dashboard — troca todos os valores da página
              (guardados sempre em R$) pra US$/G$ usando a cotação ao lado. */}
          <DisplayCurrencySelector />
          <div className="relative">
            <Button variant="outline" onClick={() => setPeriodOpen((v) => !v)}
              className="h-9 gap-1.5 rounded-lg border-gray-700 bg-[#171717] px-3 text-xs font-medium text-white shadow-none hover:border-brand-gold hover:bg-[#171717] hover:text-white dark:border-gray-700 dark:bg-[#171717] dark:hover:bg-[#171717]">
              {PERIOD_LABELS[filterType] || "Período"} <ChevronDown className={`size-3.5 text-gray-400 transition ${periodOpen ? "rotate-180" : ""}`} />
            </Button>
            {periodOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setPeriodOpen(false)} />
                <div className="absolute right-0 top-full z-50 mt-1 grid w-56 grid-cols-2 gap-1 rounded-lg border border-gray-800 bg-brand-navylight p-1.5 shadow-xl">
                  {PERIOD_PRESETS.map(([val, label]) => (
                    <Button key={val} variant="ghost" onClick={() => handleFilterChange(val)}
                      className={`h-auto w-full justify-start rounded-md px-2.5 py-1.5 text-xs font-medium ${filterType === val ? "bg-brand-gold text-brand-navydark hover:bg-brand-gold hover:text-brand-navydark dark:hover:bg-brand-gold" : "text-gray-300 hover:bg-brand-navy hover:text-white dark:hover:bg-brand-navy"}`}>
                      {label}
                    </Button>
                  ))}
                </div>
              </>
            )}
          </div>
          {filterType === "CUSTOM" && (
            <>
              <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); }} className="h-9 rounded-lg border border-gray-700 bg-[#171717] px-2 text-xs text-white outline-none focus:border-brand-gold" />
              <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); }} className="h-9 rounded-lg border border-gray-700 bg-[#171717] px-2 text-xs text-white outline-none focus:border-brand-gold" />
            </>
          )}
          <Button onClick={() => fetchData()} disabled={loading} className="h-9 gap-2 rounded-lg bg-brand-gold px-3 text-xs font-bold text-brand-navydark hover:bg-brand-goldhover">
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />} Buscar
          </Button>
          {canViewProfit && <Button variant="outline" onClick={generateAiReport} className="h-9 gap-2 rounded-lg border-gray-700 bg-[#171717] px-3 text-xs text-white shadow-none hover:border-brand-gold hover:bg-[#171717] hover:text-white dark:border-gray-700 dark:bg-[#171717] dark:hover:bg-[#171717]"><Bot className="size-4" /> IA</Button>}
        </div>
      </div>

      {/* Faixa de alertas */}
      {hasAlerts && (
        <div className="mb-6 flex flex-wrap gap-2">
          {overdueReceber > 0 && <Button variant="outline" onClick={() => navigate("/receivables")} className="h-auto gap-1.5 rounded-full border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-300 shadow-none hover:bg-red-500/20 hover:text-red-300 dark:border-red-500/30 dark:bg-red-500/10 dark:hover:bg-red-500/20"><AlertTriangle className="size-3.5" /> {overdueReceber} a receber vencida(s)</Button>}
          {overduePagar > 0 && <Button variant="outline" onClick={() => navigate("/payables")} className="h-auto gap-1.5 rounded-full border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-300 shadow-none hover:bg-amber-500/20 hover:text-amber-300 dark:border-amber-500/30 dark:bg-amber-500/10 dark:hover:bg-amber-500/20"><Receipt className="size-3.5" /> {overduePagar} a pagar vencida(s)</Button>}
          {expiringCount > 0 && <Button variant="outline" onClick={() => navigate("/products")} className="h-auto gap-1.5 rounded-full border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-200 shadow-none hover:bg-amber-500/20 hover:text-amber-200 dark:border-amber-500/30 dark:bg-amber-500/10 dark:hover:bg-amber-500/20"><Clock className="size-3.5" /> {expiringCount} lote(s) a vencer</Button>}
          {lowStockCount > 0 && <Button variant="outline" onClick={() => navigate("/products")} className="h-auto gap-1.5 rounded-full border-orange-500/30 bg-orange-500/10 px-3 py-1.5 text-xs font-medium text-orange-300 shadow-none hover:bg-orange-500/20 hover:text-orange-300 dark:border-orange-500/30 dark:bg-orange-500/10 dark:hover:bg-orange-500/20"><PackageX className="size-3.5" /> {lowStockCount} produto(s) com estoque baixo</Button>}
          {ops.separation > 0 && <Button variant="outline" onClick={() => navigate("/separation")} className="h-auto gap-1.5 rounded-full border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-300 shadow-none hover:bg-blue-500/20 hover:text-blue-300 dark:border-blue-500/30 dark:bg-blue-500/10 dark:hover:bg-blue-500/20"><Boxes className="size-3.5" /> {ops.separation} para separar</Button>}
          {ops.delivery > 0 && <Button variant="outline" onClick={() => navigate("/delivery")} className="h-auto gap-1.5 rounded-full border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-300 shadow-none hover:bg-blue-500/20 hover:text-blue-300 dark:border-blue-500/30 dark:bg-blue-500/10 dark:hover:bg-blue-500/20"><Package className="size-3.5" /> {ops.delivery} para entregar</Button>}
        </div>
      )}

      {/* KPIs principais */}
      <motion.div initial={reduceMotion ? false : "hidden"} animate="visible" variants={kpiGridContainer} className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <motion.div variants={fadeUpItem}>
          <KpiCard title="Faturamento" value={s?.netSales || 0} format={brl} icon={DollarSign} to="/sales" tone="gold"
            delta={data?.previous?.netSalesDeltaPercent} sub={`${s?.salesCount || 0} vendas`}
            sparkline={daily.map((d: any) => d.total)} sparklineColor="#d4af37" />
        </motion.div>
        <motion.div variants={fadeUpItem}>
          <KpiCard title="Ticket médio" value={s?.averageTicket || 0} format={brl} icon={Target} tone="dark"
            sub={bestDay ? `melhor dia ${brl(bestDay.total)}` : undefined} sparklineColor={PURPLE} />
        </motion.div>
        <motion.div variants={fadeUpItem}>
          {canViewProfit
            ? <KpiCard title="Lucro líquido" value={s?.netProfit || 0} format={brl} icon={TrendingUp} tone="dark" sub={`${(s?.netMarginPercent || 0).toFixed(1)}% margem`} sparklineColor={EMERALD} />
            : <KpiCard title="Produtos ativos" value={s?.activeProducts || 0} icon={Package} to="/products" tone="dark" sparklineColor={EMERALD} />}
        </motion.div>
        <motion.div variants={fadeUpItem}>
          <KpiCard title="Em caixa (todas as contas)" value={financeTotal} format={brl} icon={Wallet} to="/finance" tone="dark"
            sub={`${financeAccounts.length} conta(s)`} sparklineColor={BLUE} />
        </motion.div>
        <motion.div variants={fadeUpItem}>
          <KpiCard title="Total de pedidos" value={s?.salesCount || 0} icon={ShoppingCart} to="/sales" tone="dark"
            delta={data?.previous?.salesCountDeltaPercent} sparkline={daily.map((d: any) => d.count)} sparklineColor="#60a5fa" />
        </motion.div>
        <motion.div variants={fadeUpItem}>
          <KpiCard title="Clientes ativos" value={s?.activeCustomersInPeriod ?? s?.activeCustomers ?? 0} icon={Users} to="/customers" tone="dark"
            delta={data?.previous?.activeCustomersDeltaPercent} sub="compraram no período"
            sparkline={daily.map((d: any) => d.customers)} sparklineColor="#34d399" />
        </motion.div>
        <motion.div variants={fadeUpItem}>
          <KpiCard title="Visualizações de página" value={s?.pageviews || 0} icon={Eye} to="/store-settings" tone="dark"
            delta={data?.previous?.pageviewsDeltaPercent} sub="/loja"
            sparkline={daily.map((d: any) => d.views)} sparklineColor="#fbbf24" />
        </motion.div>
        <motion.div variants={fadeUpItem}>
          <ReportCard title="Dicas" icon={Lightbulb} iconColor="text-brand-gold" className="p-4">
            <ul className="space-y-1.5">
              {tips.slice(0, 3).map((tip, i) => (
                <li key={i} className="flex gap-2 text-xs text-gray-300"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-gold" />{tip}</li>
              ))}
            </ul>
          </ReportCard>
        </motion.div>
      </motion.div>

      <motion.div initial={reduceMotion ? false : "hidden"} animate="visible" variants={belowKpiContainer}>
      {/* Gráfico + Onde está o dinheiro */}
      <motion.div variants={fadeUpItem} className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <ReportCard title="Desempenho por dia" icon={BarChart3} className="xl:col-span-2"
          action={
            <div className="flex flex-wrap gap-1 rounded-lg border border-gray-800 bg-[#171717] p-1">
              {(Object.entries(CHART_METRICS) as Array<[keyof typeof CHART_METRICS, typeof CHART_METRICS[keyof typeof CHART_METRICS]]>).map(([key, m]) => (
                <Button key={key} variant="ghost" onClick={() => setChartMetric(key)}
                  className={`h-auto rounded-md px-2.5 py-1 text-[11px] font-medium ${chartMetric === key ? "bg-brand-navylight text-white hover:bg-brand-navylight hover:text-white dark:hover:bg-brand-navylight" : "text-gray-500 hover:bg-transparent hover:text-gray-300 dark:hover:bg-transparent"}`}>
                  {m.label}
                </Button>
              ))}
            </div>
          }>
          <RevenueAreaChart data={daily} dataKey={chartMetric} color={CHART_METRICS[chartMetric].color} formatValue={CHART_METRICS[chartMetric].format} />
        </ReportCard>

        <ReportCard title="Onde está o dinheiro" icon={DollarSign}
          action={<Button variant="link" onClick={() => navigate("/finance")} className="h-auto p-0 text-[11px] font-bold text-brand-gold hover:text-brand-gold">ver tudo</Button>}>
          <div className="mb-3 rounded-xl border border-brand-gold/20 bg-brand-gold/5 p-3">
            <div className="text-[11px] text-gray-400">Total convertido em R$</div>
            <div className="text-2xl font-black tabular-nums text-brand-gold"><AnimatedNumber value={financeTotal} format={brl} /></div>
          </div>
          <div className="max-h-[190px] space-y-1.5 overflow-y-auto pr-1">
            {financeAccounts.length === 0 && <div className="py-6 text-center text-sm text-gray-500">Nenhuma conta cadastrada.</div>}
            {financeAccounts.map((a) => (
              <Button key={a.id} variant="ghost" onClick={() => navigate("/finance")} className="h-auto w-full justify-between rounded-lg border border-gray-800 bg-[#171717] px-3 py-2 text-left hover:border-gray-600 hover:bg-[#171717] dark:hover:bg-[#171717]">
                <span className="min-w-0 flex-1 truncate text-xs text-gray-300">
                  {a.name}
                  {a.type === "CARD_RECEIVABLE" && <span className="text-gray-500"> (a receber)</span>}
                  {a.scope === "PERSONAL" && <Badge variant="outline" className="ml-1 rounded border-purple-400/40 px-1 py-0 text-[9px] font-normal text-purple-300">PESSOAL</Badge>}
                </span>
                <span className="shrink-0 pl-2 text-right">
                  {/* moeda nativa da conta (corrige exibir US$/₲ como se fosse R$) */}
                  <span className="text-sm font-bold text-white">{fmtCur(a.currentBalance, a.currency)}</span>
                  {a.currency && a.currency !== "BRL" && a.balanceBrl != null && <span className="block text-[10px] text-gray-500">≈ {brl(a.balanceBrl)}</span>}
                </span>
              </Button>
            ))}
          </div>
        </ReportCard>
      </motion.div>

      {/* Pedidos recentes da loja */}
      <motion.div variants={fadeUpItem}>
      <ReportCard title="Pedidos recentes" icon={ShoppingCart} className="mb-6"
        action={
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-1.5 sm:flex">
              {Object.entries(recentOrderStatusCounts).map(([key, count]) => {
                const st = ORDER_STATUS[key];
                if (!st) return null;
                return (
                  <Badge key={key} variant="outline" title={st.label} className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${st.cls}`}>
                    {count}
                  </Badge>
                );
              })}
            </div>
            <Button variant="link" onClick={() => navigate("/store-orders")} className="h-auto p-0 text-[11px] font-bold text-brand-gold hover:text-brand-gold">ver tudo</Button>
          </div>
        }>
        {recentOrders.length === 0 ? (
          <div className="py-6 text-center text-sm text-gray-500">Nenhum pedido da loja no período.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-gray-500">
                <tr className="text-left">
                  <th className="pb-2 font-medium">Cliente</th>
                  <th className="pb-2 font-medium">Pedido</th>
                  <th className="pb-2 font-medium">Produto</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 text-right font-medium">Valor</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((o: any, i: number) => {
                  const st = ORDER_STATUS[o.status] || { label: o.status, cls: "border-gray-700 text-gray-400" };
                  const fulfill = o.status === "CONFIRMED" ? FULFILLMENT_LABEL[o.fulfillmentStatus] : null;
                  return (
                    <tr key={o.id} className="border-t border-gray-800">
                      <td className="py-2.5 pr-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                            style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}>
                            {initials(o.customerName)}
                          </div>
                          <div>
                            <div className="font-medium text-white">{o.customerName}</div>
                            <div className="text-[11px] text-gray-500">{o.customerPhone}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 pr-3 font-mono text-xs text-gray-400">{o.code}</td>
                      <td className="py-2.5 pr-3 text-gray-300">{o.productLabel}</td>
                      <td className="py-2.5 pr-3">
                        <Badge variant="outline" className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${st.cls}`}>{st.label}</Badge>
                        {fulfill && <div className="mt-0.5 text-[10px] text-gray-500">{fulfill}</div>}
                      </td>
                      <td className="py-2.5 text-right font-semibold text-white">{brl(o.totalAmount)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </ReportCard>
      </motion.div>

      {/* Rankings + formas de pagamento */}
      <motion.div variants={fadeUpItem} className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ReportCard title="Top vendedores" icon={Trophy} iconColor="text-amber-300"
          action={<Button variant="link" onClick={() => navigate("/reports/commissions")} className="h-auto p-0 text-[11px] font-bold text-brand-gold hover:text-brand-gold">comissões</Button>}>
          <RankList items={(data?.topSellers || []).map((v: any) => ({ ...v, extra: v.commission > 0 ? `com. ${brl(v.commission)}` : undefined }))}
            emptyText="Nenhuma venda com vendedor no período." onClick={() => navigate("/reports/commissions")} money={brl} />
        </ReportCard>

        <ReportCard title="Top compradores" icon={Users} iconColor="text-emerald-300"
          action={<Button variant="link" onClick={() => navigate("/customers")} className="h-auto p-0 text-[11px] font-bold text-brand-gold hover:text-brand-gold">clientes</Button>}>
          <RankList items={(data?.topCustomers || []).map((c: any) => ({ ...c, extra: c.lastAt ? `últ. ${relTime(c.lastAt)}` : undefined }))}
            emptyText="Nenhuma venda com cliente identificado." onClick={() => navigate("/customers")} accent={EMERALD} money={brl} />
        </ReportCard>

        <ReportCard title="Formas de pagamento" icon={CreditCard}>
          <CompositionDonut items={payItems} />
        </ReportCard>
      </motion.div>

      {/* Margem real (Fase A) + Posição financeira + Pessoal (Fase B) */}
      <motion.div variants={fadeUpItem} className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {canViewProfit && (
          <ReportCard title="Margem real (câmbio)" icon={Percent} iconColor="text-emerald-300"
            action={<Button variant="link" onClick={() => navigate("/reports/real-margin")} className="h-auto p-0 text-[11px] font-bold text-brand-gold hover:text-brand-gold">relatório</Button>}>
            {realMargin && realMargin.sales > 0 ? (
              <div className="space-y-3">
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-[11px] text-gray-400">Margem real do período</div>
                    <div className="text-2xl font-black tabular-nums text-emerald-300"><AnimatedNumber value={realMargin.margin} format={brl} /></div>
                  </div>
                  <Badge variant="outline" className="rounded-lg border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-lg font-black tabular-nums text-emerald-300"><AnimatedNumber value={realMargin.marginPercent} format={(n) => `${n.toFixed(1)}%`} /></Badge>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-brand-navydark">
                  <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-300 transition-all duration-700" style={{ width: `${Math.max(3, Math.min(100, realMargin.marginPercent))}%` }} />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg border border-gray-800 bg-[#171717] p-2">
                    <div className="text-[10px] text-gray-500">Vendido (apurado)</div>
                    <div className="font-bold tabular-nums text-white">{brl(realMargin.sales)}</div>
                  </div>
                  <div className="rounded-lg border border-gray-800 bg-[#171717] p-2">
                    <div className="text-[10px] text-gray-500">Custo da época</div>
                    <div className="font-bold tabular-nums text-red-300">{brl(realMargin.cost)}</div>
                  </div>
                </div>
                <p className="text-[10px] text-gray-500">Custo congelado na compra (câmbio + frete). Cobre {realMargin.coveredCount}/{realMargin.totalSales} vendas do período.</p>
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-gray-500">
                Sem custo real apurado no período.<br />
                <span className="text-[11px]">A margem real aparece quando a mercadoria sai do estoque (entrega).</span>
              </div>
            )}
          </ReportCard>
        )}

        <ReportCard title="Posição financeira" icon={Wallet}>
          <div className="space-y-2.5">
            {[
              { label: "A receber (vencidas)", value: receivables?.overdueAmount || 0, total: receivables?.totalOutstanding || 0, color: RED, to: "/receivables" },
              { label: "A pagar (vencidas)", value: payables?.overdueAmount || 0, total: payables?.totalOutstanding || 0, color: AMBER, to: "/payables" },
            ].map((row, i) => (
              <Button key={i} variant="ghost" onClick={() => navigate(row.to)} className="h-auto w-full flex-col items-stretch justify-start gap-0 rounded-xl border border-gray-800 bg-[#171717] p-3 text-left hover:border-gray-600 hover:bg-[#171717] dark:hover:bg-[#171717]">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-300">{row.label}</span>
                  <span className="font-bold tabular-nums" style={{ color: row.color }}><AnimatedNumber value={row.value} format={brl} /></span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-brand-navydark">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${row.total > 0 ? Math.min(100, (row.value / row.total) * 100) : 0}%`, background: row.color }} />
                </div>
                <div className="mt-1 text-[10px] tabular-nums text-gray-500">total em aberto {brl(row.total)}</div>
              </Button>
            ))}
            {canViewProfit && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="rounded-lg border border-gray-800 bg-[#171717] p-2">
                  <div className="text-[10px] text-gray-500">Despesas</div>
                  <div className="text-sm font-bold text-red-300">{brl(s?.expenses || 0)}</div>
                </div>
                <div className="rounded-lg border border-gray-800 bg-[#171717] p-2">
                  <div className="text-[10px] text-gray-500">Custo produto</div>
                  <div className="text-sm font-bold text-gray-200">{brl(s?.productCost || 0)}</div>
                </div>
              </div>
            )}
          </div>
        </ReportCard>

        <ReportCard title="Pessoal" icon={UserRound} iconColor="text-purple-300"
          action={<Button variant="link" onClick={() => navigate("/personal")} className="h-auto p-0 text-[11px] font-bold text-brand-gold hover:text-brand-gold">abrir</Button>}>
          {personal && (personal.totalBrl > 0 || personal.avgMonthlyBrl > 0) ? (
            <div className="space-y-3">
              <div className={`rounded-xl border p-3 ${personal.runwayMonths != null && personal.runwayMonths < 3 ? "border-red-500/40 bg-red-500/10" : "border-emerald-500/30 bg-emerald-500/5"}`}>
                <div className="text-[11px] text-gray-300">Fôlego (runway)</div>
                <div className={`text-2xl font-black ${personal.runwayMonths != null && personal.runwayMonths < 3 ? "text-red-300" : "text-emerald-300"}`}>
                  {personal.runwayMonths != null ? `${personal.runwayMonths.toFixed(1)} meses` : "—"}
                </div>
                <div className="text-[10px] text-gray-500">custo de vida {brl(personal.avgMonthlyBrl)}/mês</div>
              </div>
              <div className="space-y-1.5">
                {personal.accounts.map((a: any, i: number) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border border-gray-800 bg-[#171717] px-2.5 py-1.5 text-xs">
                    <span className="truncate text-gray-300">{a.name}</span>
                    <span className="font-bold text-white">{fmtCur(a.balance, a.currency)}</span>
                  </div>
                ))}
                {personal.accounts.length === 0 && <div className="text-[11px] text-gray-500">Sem conta pessoal — crie em Financeiro (uso: Pessoal).</div>}
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-gray-500">
              Módulo pessoal vazio.<br />
              <span className="text-[11px]">Crie contas de uso "Pessoal" e lance seus gastos em Pessoal.</span>
            </div>
          )}
        </ReportCard>
      </motion.div>

      {/* Produtos: top / estoque baixo / lotes */}
      <motion.div variants={fadeUpItem} className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ReportCard title="Top produtos" icon={Boxes}
          action={<Button variant="link" onClick={() => navigate("/reports/abc")} className="h-auto p-0 text-[11px] font-bold text-brand-gold hover:text-brand-gold">curva ABC</Button>}>
          <RankingBars items={topProducts.map((p: any) => ({ label: String(p.name || "").slice(0, 18), value: Number(p.revenue) || 0 }))} />
        </ReportCard>

        <ReportCard title="Estoque baixo" icon={PackageX} iconColor="text-orange-300"
          action={lowStock.length > 0 ? <Badge variant="outline" className="rounded-full border-transparent bg-orange-500/15 px-2 py-0.5 text-[10px] font-bold text-orange-300">{lowStock.length}</Badge> : undefined}>
          {lowStock.length > 0 ? (
            <div className="max-h-[210px] space-y-1.5 overflow-y-auto pr-1">
              {lowStock.slice(0, 8).map((p: any) => (
                <Button key={p.id} variant="ghost" onClick={() => navigate("/products")} className="h-auto w-full justify-between rounded-lg border border-gray-800 bg-[#171717] px-3 py-2 text-left hover:border-orange-500/40 hover:bg-[#171717] dark:hover:bg-[#171717]">
                  <span className="min-w-0 flex-1 truncate text-xs text-gray-300">{p.name}</span>
                  <span className="shrink-0 pl-2 text-xs font-bold text-orange-300">{p.physicalStock} un</span>
                </Button>
              ))}
            </div>
          ) : <div className="py-8 text-center text-sm text-gray-500">Nenhum produto abaixo do mínimo.</div>}
        </ReportCard>

        <ReportCard title="Lotes a vencer (90 dias)" icon={Clock} iconColor="text-amber-300"
          action={expiringCount > 0 ? <Badge variant="outline" className="rounded-full border-transparent bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-300">{expiringCount}</Badge> : undefined}>
          {expiringCount > 0 ? (
            <div className="max-h-[210px] space-y-1.5 overflow-y-auto pr-1">
              {expiringLots.slice(0, 8).map((l: any) => (
                <Button key={l.id} variant="ghost" onClick={() => navigate("/products")} className={`h-auto w-full justify-between rounded-lg border px-3 py-2 text-left ${l.expired ? "border-red-500/30 bg-red-500/10 hover:border-red-500/60 hover:bg-red-500/10 dark:hover:bg-red-500/10" : "border-gray-800 bg-[#171717] hover:border-amber-500/40 hover:bg-[#171717] dark:hover:bg-[#171717]"}`}>
                  <span className="min-w-0 flex-1 truncate text-xs text-gray-300">{l.productName}<span className="ml-1 font-mono text-[10px] text-gray-500">#{l.lotNumber}</span></span>
                  <span className={`shrink-0 pl-2 text-[11px] font-bold ${l.expired ? "text-red-300" : "text-amber-300"}`}>{l.expired ? "vencido" : `${l.daysLeft}d`}</span>
                </Button>
              ))}
            </div>
          ) : <div className="py-8 text-center text-sm text-gray-500">Nenhum lote vencendo em 90 dias.</div>}
        </ReportCard>
      </motion.div>

      {/* Atividade recente (feed rico) + dicas */}
      <motion.div variants={fadeUpItem} className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ReportCard title="Atividade recente" icon={Activity} className="lg:col-span-2"
          action={<span className="text-[11px] text-gray-500">vendas · recebimentos · compras · pessoal</span>}>
          {(data?.recentActivity || []).length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-500">Nenhum movimento no período.</div>
          ) : (
            <div className="max-h-[340px] space-y-1.5 overflow-y-auto pr-1">
              {(data?.recentActivity || []).map((a: any, i: number) => {
                const m = feedMeta(a.kind);
                const Icon = m.icon;
                return (
                  <Button key={i} variant="ghost" onClick={() => a.link && navigate(a.link)}
                    className="h-auto w-full justify-start gap-3 rounded-xl border border-gray-800 bg-brand-navy/30 px-3 py-2.5 text-left hover:border-gray-600 hover:bg-brand-navy/60 dark:hover:bg-brand-navy/60">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ background: m.bg, color: m.color }}>
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-white">{a.title}</div>
                      <div className="truncate text-[11px] text-gray-500">
                        {a.subtitle}{a.who ? ` · ${a.who}` : ""} · {relTime(a.at)}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-sm font-bold" style={{ color: m.color }}>{fmtCur(a.amount, a.currency)}</div>
                      {a.currency && a.currency !== "BRL" && (
                        <div className="text-[10px] text-gray-500">
                          {a.amountBrl != null ? `≈ ${brl(a.amountBrl)}` : a.fxRate ? `câmbio ${Number(a.fxRate).toFixed(2)}` : ""}
                        </div>
                      )}
                      {a.status && <div className={`text-[10px] font-bold ${a.status === "PAID" ? "text-emerald-400" : a.status === "PARTIAL" ? "text-amber-400" : "text-gray-500"}`}>{a.status === "PAID" ? "pago" : a.status === "PARTIAL" ? "parcial" : "pendente"}</div>}
                    </div>
                  </Button>
                );
              })}
            </div>
          )}
        </ReportCard>

        <div className="grid grid-cols-2 gap-3">
          <KpiCard title="Produtos" value={s?.activeProducts || 0} icon={Package} to="/products" tone="dark" sparklineColor={BLUE} />
          <KpiCard title="Clientes" value={s?.activeCustomers || 0} icon={Users} to="/customers" tone="dark" sparklineColor={PURPLE} />
        </div>
      </motion.div>

      {/* Despesas (admin) */}
      {canManageExpenses && (
        <motion.div variants={fadeUpItem}>
        <ReportCard title="Despesas do período" icon={TrendingDown} iconColor="text-red-400"
          action={<Button onClick={() => { setExpenseForm({ id: "", categoryId: "", description: "", amountUsd: "", expenseDate: new Date().toISOString().split("T")[0] }); setShowExpenseModal(true); }} className="h-auto gap-1.5 rounded-lg bg-brand-gold px-3 py-1.5 text-xs font-bold text-brand-navydark hover:bg-brand-gold"><Plus className="size-3.5" /> Nova despesa</Button>}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-gray-500">
                <tr className="text-left"><th className="py-1">Data</th><th className="py-1">Descrição</th><th className="py-1">Categoria</th><th className="py-1 text-right">{moneyFieldLabel("Valor")}</th><th className="py-1"></th></tr>
              </thead>
              <tbody>
                {expenses.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-gray-500">Nenhuma despesa no período.</td></tr>}
                {expenses.map((e: any) => (
                  <tr key={e.id} className="border-t border-gray-800 text-gray-200">
                    <td className="py-1.5 whitespace-nowrap text-gray-400">{formatDate(e.expenseDate, language)}</td>
                    <td className="py-1.5">{e.description}{e.isFixed && <Badge variant="outline" className="ml-1 rounded border-gray-700 px-1 py-0 text-[9px] font-normal text-gray-500">fixa</Badge>}</td>
                    <td className="py-1.5 text-gray-400">{e.categoryName || "—"}</td>
                    <td className="py-1.5 text-right font-semibold text-red-300"><Money value={e.amountUsd} lang={language} /></td>
                    <td className="py-1.5 text-right whitespace-nowrap">
                      <Button variant="ghost" size="icon-xs" onClick={() => { setExpenseForm({ id: e.id, categoryId: e.categoryId || "", description: e.description || "", amountUsd: String(e.amountUsd || ""), expenseDate: e.expenseDate ? String(e.expenseDate).split("T")[0] : "" }); setShowExpenseModal(true); }} className="size-auto p-1 text-blue-300 hover:bg-transparent hover:text-blue-200 dark:hover:bg-transparent"><Pencil className="size-3.5" /></Button>
                      <Button variant="ghost" size="icon-xs" onClick={() => initDeleteExpense(e.id)} className="size-auto p-1 text-red-400 hover:bg-transparent hover:text-red-300 dark:hover:bg-transparent"><Trash2 className="size-3.5" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ReportCard>
        </motion.div>
      )}
      </motion.div>

      {/* Modal despesa */}
      <Modal isOpen={showExpenseModal} onClose={() => setShowExpenseModal(false)} title={expenseForm.id ? "Editar Despesa" : "Nova Despesa"} maxWidth="max-w-md">
        <form onSubmit={saveExpense} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-gray-400">Descrição *</label>
            <input value={expenseForm.description} onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })} className="w-full rounded-lg border border-gray-700 bg-[#171717] px-3 py-2 text-white outline-none focus:border-brand-gold" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm text-gray-400">{moneyFieldLabel("Valor")} *</label>
              <input type="number" step="0.01" min="0" value={expenseForm.amountUsd} onChange={(e) => setExpenseForm({ ...expenseForm, amountUsd: e.target.value })} className="w-full rounded-lg border border-gray-700 bg-[#171717] px-3 py-2 text-white outline-none focus:border-brand-gold" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-400">Data</label>
              <input type="date" value={expenseForm.expenseDate} onChange={(e) => setExpenseForm({ ...expenseForm, expenseDate: e.target.value })} className="w-full rounded-lg border border-gray-700 bg-[#171717] px-3 py-2 text-white outline-none focus:border-brand-gold" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-400">Categoria</label>
            <select value={expenseForm.categoryId} onChange={(e) => setExpenseForm({ ...expenseForm, categoryId: e.target.value })} className="w-full rounded-lg border border-gray-700 bg-[#171717] px-3 py-2 text-white outline-none focus:border-brand-gold">
              <option value="">Sem categoria</option>
              {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setShowExpenseModal(false)} className="rounded-lg border border-gray-700 text-gray-300 hover:bg-transparent hover:text-gray-300 dark:hover:bg-transparent">Cancelar</Button>
            <Button type="submit" className="rounded-lg bg-brand-gold px-5 font-bold text-brand-navydark hover:bg-brand-gold">Salvar</Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={confirmDeleteExpenseOpen}
        onClose={() => setConfirmDeleteExpenseOpen(false)}
        onConfirm={handleConfirmDeleteExpense}
        title="Excluir Despesa"
        message="Tem certeza que deseja excluir esta despesa?"
        confirmText="Excluir"
        confirmingText="Excluindo..."
        confirmAsDeleting={isDeletingExpense}
      />

      <AiReportModal isOpen={aiModalOpen} title="Análise do Painel Financeiro" onClose={() => setAiModalOpen(false)} loading={aiLoading} content={aiReport} error={aiError} />
    </div>
  );
}
