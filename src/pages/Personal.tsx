import React, { useEffect, useState } from "react";
import { HandCoins, Plus, Trash2, RefreshCw, PiggyBank, TrendingDown, CalendarClock, Split } from "lucide-react";
import { apiFetch } from "../lib/api";
import { CompositionDonut, RevenueAreaChart } from "../components/charts";
import { Modal } from "../components/Modal";
import { toast } from "../components/Toast";
import { format } from "date-fns";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";

const fmtCur = (v: any, cur?: string) => {
  const n = Number(v) || 0;
  if (cur === "USD") return `US$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (cur === "PYG") return `₲ ${n.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
  return `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Vida pessoal separada da empresa: contas PESSOAL, orçamento por categoria,
// custo de vida, runway e distribuição de lucro (ex.: 70% reposição / 30% vida).
export function Personal() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [summary, setSummary] = useState<any>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [allAccounts, setAllAccounts] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [showCat, setShowCat] = useState(false);
  const [catForm, setCatForm] = useState<any>({ id: "", name: "", monthlyBudget: "", budgetCurrency: "PYG" });
  const [expForm, setExpForm] = useState({ amount: "", accountId: "", categoryId: "", description: "", expenseDate: new Date().toISOString().slice(0, 10) });
  const [savingExp, setSavingExp] = useState(false);
  const [distForm, setDistForm] = useState({ fromAccountId: "", baseAmountBrl: "" });
  const [distributing, setDistributing] = useState(false);
  const [rulesDirty, setRulesDirty] = useState(false);
  const [trend, setTrend] = useState<any[]>([]);

  const load = async (m = month) => {
    setLoading(true);
    try {
      // Monta a data só com número, sem passar pelo Date(string) — "YYYY-MM-01" é lido como UTC
      // meia-noite, e .getFullYear()/.getMonth() liam de volta em hora LOCAL: no fuso Brasil/Paraguai
      // (UTC negativo) isso caía um dia pra trás e inteiro rolava pro mês anterior, invertendo
      // first/last e fazendo "Gastos do mês" nunca bater com nenhum registro.
      const [yy, mm] = m.split("-").map(Number);
      const first = `${m}-01`;
      const lastDay = new Date(yy, mm, 0).getDate();
      const last = `${m}-${String(lastDay).padStart(2, "0")}`;
      const [s, e, a, r, tr] = await Promise.all([
        apiFetch(`/api/personal/summary?month=${m}`),
        apiFetch(`/api/personal/expenses?dateFrom=${first}&dateTo=${last}`),
        apiFetch("/api/finance/accounts"),
        apiFetch("/api/personal/rules"),
        apiFetch("/api/personal/trend"),
      ]);
      if (s.ok) setSummary(await s.json());
      if (e.ok) { const j = await e.json(); setExpenses(j.data || []); }
      if (a.ok) { const j = await a.json(); setAllAccounts(j.data || []); }
      if (r.ok) { const j = await r.json(); setRules((j.data || []).map((x: any) => ({ ...x, percent: Number(x.percent) }))); }
      if (tr.ok) { const j = await tr.json(); setTrend(j.data || []); }
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const saveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = catForm.id ? `/api/personal/categories/${catForm.id}` : "/api/personal/categories";
    const res = await apiFetch(url, { method: catForm.id ? "PUT" : "POST", body: JSON.stringify(catForm) });
    if (res.ok) { setShowCat(false); setCatForm({ id: "", name: "", monthlyBudget: "", budgetCurrency: "PYG" }); load(); toast.success("Categoria salva."); }
    else { const err = await res.json().catch(() => ({})); toast.error(err.error || "Erro ao salvar."); }
  };

  const saveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!(Number(expForm.amount) > 0)) { toast.info("Informe o valor."); return; }
    setSavingExp(true);
    try {
      const res = await apiFetch("/api/personal/expenses", { method: "POST", body: JSON.stringify(expForm) });
      if (res.ok) { setExpForm({ ...expForm, amount: "", description: "" }); load(); toast.success("Gasto lançado."); }
      else { const err = await res.json().catch(() => ({})); toast.error(err.error || "Erro ao lançar gasto."); }
    } finally { setSavingExp(false); }
  };

  const removeExpense = async (id: string) => {
    if (!confirm("Excluir este gasto? Se saiu de uma conta, o valor volta pra ela.")) return;
    const res = await apiFetch(`/api/personal/expenses/${id}`, { method: "DELETE" });
    if (res.ok) { load(); toast.success("Gasto excluído e estornado."); } else toast.error("Erro ao excluir.");
  };

  const saveRules = async () => {
    const res = await apiFetch("/api/personal/rules", { method: "PUT", body: JSON.stringify({ rules }) });
    if (res.ok) { setRulesDirty(false); load(); toast.success("Regras salvas."); }
    else { const err = await res.json().catch(() => ({})); toast.error(err.error || "Erro ao salvar regras."); }
  };

  const distribute = async () => {
    if (!distForm.fromAccountId || !(Number(distForm.baseAmountBrl) > 0)) { toast.info("Escolha a origem e o valor."); return; }
    if (!confirm(`Distribuir R$ ${Number(distForm.baseAmountBrl).toFixed(2)} pelas regras ativas?`)) return;
    setDistributing(true);
    try {
      const res = await apiFetch("/api/personal/distribute", { method: "POST", body: JSON.stringify(distForm) });
      const j = await res.json().catch(() => ({}));
      if (res.ok) { setDistForm({ fromAccountId: "", baseAmountBrl: "" }); load(); toast.success(`Distribuído em ${j.executed?.length || 0} conta(s).`); }
      else toast.error(j.error || "Erro na distribuição.");
    } finally { setDistributing(false); }
  };

  const expenseAccounts = allAccounts.filter((a) => a.scope === "PERSONAL").concat(allAccounts.filter((a) => a.scope !== "PERSONAL"));
  const activePct = rules.filter((r) => r.isActive !== false).reduce((s, r) => s + (Number(r.percent) || 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-white flex items-center gap-2"><HandCoins className="w-6 h-6 text-brand-gold" /> Pessoal — Custo de vida</h2>
          <p className="text-sm text-gray-400">Suas contas e gastos, separados da empresa. Valores convertidos pra R$ no câmbio do dia.</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="month" value={month} onChange={(e) => { setMonth(e.target.value); load(e.target.value); }} className="bg-[#171717] border border-gray-700 text-white text-xs px-2 py-2 rounded-lg outline-none focus:border-brand-gold" />
          <Button
            onClick={() => load()}
            variant="outline"
            className="h-auto gap-2 rounded-lg border-gray-700 bg-[#171717] px-3 py-2 text-sm text-gray-300 shadow-none hover:bg-[#171717] hover:text-gray-300 dark:border-gray-700 dark:bg-[#171717] dark:hover:bg-[#171717] dark:hover:text-gray-300"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Box pai: cada seção mantém a própria caixa, só ganham um contorno comum */}
      <div className="rounded-2xl border border-gray-800 bg-[#171717] p-4 space-y-4">

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="gap-0 rounded-2xl border-purple-400/30 bg-purple-500/5 p-4 shadow-none">
          <div className="text-[11px] text-purple-300 mb-1 flex items-center gap-1"><PiggyBank className="w-3.5 h-3.5" /> Caixa pessoal (total)</div>
          <div className="text-xl font-black text-white">{fmtCur(summary?.personalTotalBrl || 0)}</div>
          <div className="text-[10px] text-gray-500">{(summary?.accounts || []).map((a: any) => `${a.name}: ${fmtCur(a.balance, a.currency)}`).join(" · ") || "sem conta pessoal ainda"}</div>
        </Card>
        <Card className="gap-0 rounded-2xl border-gray-700 bg-brand-navylight p-4 shadow-none">
          <div className="text-[11px] text-gray-400 mb-1">Gasto no mês</div>
          <div className="text-xl font-black text-red-300">{fmtCur(summary?.monthTotalBrl || 0)}</div>
        </Card>
        <Card className="gap-0 rounded-2xl border-gray-700 bg-brand-navylight p-4 shadow-none">
          <div className="text-[11px] text-gray-400 mb-1 flex items-center gap-1"><TrendingDown className="w-3.5 h-3.5" /> Custo de vida (média 3 meses)</div>
          <div className="text-xl font-black text-white">{fmtCur(summary?.avgMonthlyBrl || 0)}<span className="text-xs text-gray-500 font-normal">/mês</span></div>
        </Card>
        <Card className={`gap-0 rounded-2xl p-4 shadow-none ${summary?.runwayMonths != null && summary.runwayMonths < 3 ? "border-red-500/40 bg-red-500/10" : "border-emerald-500/30 bg-emerald-500/5"}`}>
          <div className="text-[11px] text-gray-300 mb-1 flex items-center gap-1"><CalendarClock className="w-3.5 h-3.5" /> Runway (fôlego)</div>
          <div className={`text-xl font-black ${summary?.runwayMonths != null && summary.runwayMonths < 3 ? "text-red-300" : "text-emerald-300"}`}>
            {summary?.runwayMonths != null ? `${summary.runwayMonths.toFixed(1)} meses` : "—"}
          </div>
          <div className="text-[10px] text-gray-500">quanto o caixa pessoal aguenta sem entrada</div>
        </Card>
      </div>

      {/* Gráficos: pra onde foi o dinheiro + tendência do custo de vida */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card className="gap-0 rounded-2xl border-gray-700 bg-brand-navylight p-5 shadow-md">
          <h3 className="text-sm font-semibold text-white mb-1">Pra onde foi o dinheiro</h3>
          <p className="text-xs text-gray-500 mb-3">Gastos do mês por categoria (em R$).</p>
          {(() => {
            const COLORS = ["#ffd700", "#34d399", "#60a5fa", "#a78bfa", "#fbbf24", "#f87171", "#64748b"];
            const items = [
              ...(summary?.categories || []).filter((c: any) => Number(c.spentBrl) > 0).map((c: any) => ({ label: c.name, value: Number(c.spentBrl) })),
              ...(Number(summary?.uncategorizedBrl) > 0 ? [{ label: "Sem categoria", value: Number(summary.uncategorizedBrl) }] : []),
            ].sort((a, b) => b.value - a.value).slice(0, 7).map((i, idx) => ({ ...i, color: COLORS[idx % COLORS.length] }));
            return <CompositionDonut items={items} height={180} />;
          })()}
        </Card>
        <Card className="gap-0 rounded-2xl border-gray-700 bg-brand-navylight p-5 shadow-md">
          <h3 className="text-sm font-semibold text-white mb-1">Custo de vida · 6 meses</h3>
          <p className="text-xs text-gray-500 mb-3">Total gasto por mês (tudo convertido pra R$ no dia do gasto).</p>
          <RevenueAreaChart data={trend.map((t: any) => ({ date: t.month, total: t.totalBrl, count: 0 }))} height={180} />
        </Card>
      </div>

      {/* Lançar gasto */}
      <Card className="gap-0 rounded-2xl border-gray-700 bg-brand-navylight p-5 shadow-md">
        <h3 className="text-sm font-semibold text-white mb-3">Lançar gasto</h3>
        <form onSubmit={saveExpense} className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Valor</label>
            <input type="number" step="0.01" min="0" value={expForm.amount} onChange={(e) => setExpForm({ ...expForm, amount: e.target.value })} placeholder="0" className="w-full bg-[#171717] border border-gray-700 rounded-lg px-3 py-2 text-white font-mono outline-none focus:border-brand-gold" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Sai da conta</label>
            <select value={expForm.accountId} onChange={(e) => setExpForm({ ...expForm, accountId: e.target.value })} className="w-full bg-[#171717] border border-gray-700 rounded-lg px-3 py-2 text-white outline-none focus:border-brand-gold">
              <option value="">Bolso (não debita conta)</option>
              {expenseAccounts.map((a) => <option key={a.id} value={a.id}>{a.name} · {a.currency || "BRL"}{a.scope === "PERSONAL" ? "" : " (empresa)"}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Categoria</label>
            <select value={expForm.categoryId} onChange={(e) => setExpForm({ ...expForm, categoryId: e.target.value })} className="w-full bg-[#171717] border border-gray-700 rounded-lg px-3 py-2 text-white outline-none focus:border-brand-gold">
              <option value="">Sem categoria</option>
              {(summary?.categories || []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Descrição</label>
            <input value={expForm.description} onChange={(e) => setExpForm({ ...expForm, description: e.target.value })} placeholder="Ex.: mercado, aluguel" className="w-full bg-[#171717] border border-gray-700 rounded-lg px-3 py-2 text-white outline-none focus:border-brand-gold" />
          </div>
          <Button type="submit" disabled={savingExp} className="h-auto gap-1.5 rounded-lg bg-brand-gold px-4 py-2 text-sm font-bold text-brand-navydark hover:bg-brand-goldhover">
            <Plus className="size-4" /> Lançar
          </Button>
        </form>
        <p className="mt-2 text-[11px] text-gray-500">Com conta escolhida, o gasto sai na moeda dela e o saldo cai na hora. "Bolso" só registra (não mexe em conta).</p>
      </Card>

      {/* Orçamento por categoria */}
      <Card className="gap-0 rounded-2xl border-gray-700 bg-brand-navylight p-5 shadow-md">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white">Orçamento do mês por categoria</h3>
          <Button
            type="button"
            variant="link"
            onClick={() => { setCatForm({ id: "", name: "", monthlyBudget: "", budgetCurrency: "PYG" }); setShowCat(true); }}
            className="h-auto gap-1 p-0 has-[>svg]:p-0 text-xs font-bold text-brand-gold hover:text-brand-goldhover hover:no-underline"
          >
            <Plus className="size-3.5" /> Nova categoria
          </Button>
        </div>
        {(summary?.categories || []).length === 0 ? (
          <div className="text-sm text-gray-500 py-4 text-center">Crie categorias (ex.: Casa, Mercado, Lazer) com orçamento mensal em ₲/US$/R$.</div>
        ) : (
          <div className="space-y-3">
            {(summary?.categories || []).map((c: any) => {
              const pct = c.usedPercent;
              const over = pct != null && pct > 100;
              return (
                <div key={c.id}>
                  <div className="flex justify-between text-xs mb-1">
                    <Button
                      type="button"
                      variant="link"
                      onClick={() => { setCatForm({ id: c.id, name: c.name, monthlyBudget: String(c.monthlyBudget), budgetCurrency: c.budgetCurrency }); setShowCat(true); }}
                      className="h-auto p-0 text-xs font-medium text-gray-200 hover:text-brand-gold hover:no-underline"
                    >
                      {c.name}
                    </Button>
                    <span className={over ? "text-red-300 font-bold" : "text-gray-400"}>
                      {fmtCur(c.spentBrl)} {c.budgetBrl > 0 && <> / {fmtCur(c.budgetBrl)} ({fmtCur(c.monthlyBudget, c.budgetCurrency)}) · {pct?.toFixed(0)}%</>}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-brand-navydark overflow-hidden">
                    <div className={`h-full rounded-full ${over ? "bg-red-500" : pct != null && pct > 80 ? "bg-amber-400" : "bg-emerald-400"}`} style={{ width: `${Math.min(100, pct ?? (c.spentBrl > 0 ? 100 : 0))}%` }} />
                  </div>
                </div>
              );
            })}
            {summary?.uncategorizedBrl > 0 && <div className="text-[11px] text-gray-500">Sem categoria: {fmtCur(summary.uncategorizedBrl)}</div>}
          </div>
        )}
      </Card>

      {/* Distribuição de lucro */}
      <Card className="gap-0 rounded-2xl border-brand-gold/25 bg-brand-gold/5 p-5 shadow-md">
        <h3 className="text-sm font-semibold text-white mb-1 flex items-center gap-2"><Split className="w-4 h-4 text-brand-gold" /> Distribuição de lucro</h3>
        <p className="text-xs text-gray-500 mb-4">Defina pra onde vai cada fatia do lucro (ex.: 70% reposição de estoque em US$, 30% vida em ₲). Depois informe o valor e distribua com 1 clique — conversão pela cotação do dia, tudo gravado.</p>
        <div className="space-y-2 mb-3">
          {rules.map((r, i) => (
            <div key={i} className="grid grid-cols-[1fr_70px_1fr_auto] gap-2 items-center">
              <input value={r.name} onChange={(e) => { const v = [...rules]; v[i] = { ...v[i], name: e.target.value }; setRules(v); setRulesDirty(true); }} placeholder="Nome (ex.: Reposição)" className="bg-[#171717] border border-gray-700 rounded-lg px-2.5 py-1.5 text-white text-sm outline-none focus:border-brand-gold" />
              <input type="number" step="1" min="0" max="100" value={r.percent} onChange={(e) => { const v = [...rules]; v[i] = { ...v[i], percent: Number(e.target.value) }; setRules(v); setRulesDirty(true); }} className="bg-[#171717] border border-gray-700 rounded-lg px-2 py-1.5 text-white text-sm font-mono text-right outline-none focus:border-brand-gold" />
              <select value={r.accountId || ""} onChange={(e) => { const v = [...rules]; v[i] = { ...v[i], accountId: e.target.value }; setRules(v); setRulesDirty(true); }} className="bg-[#171717] border border-gray-700 rounded-lg px-2 py-1.5 text-white text-sm outline-none focus:border-brand-gold">
                <option value="">— conta destino —</option>
                {allAccounts.map((a) => <option key={a.id} value={a.id}>{a.name} · {a.currency || "BRL"}</option>)}
              </select>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => { setRules(rules.filter((_, j) => j !== i)); setRulesDirty(true); }}
                className="size-auto p-1 text-red-400 hover:bg-transparent hover:text-red-300 dark:hover:bg-transparent"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="link"
              onClick={() => { setRules([...rules, { name: "", percent: 0, accountId: "", isActive: true }]); setRulesDirty(true); }}
              className="h-auto gap-1 p-0 has-[>svg]:p-0 text-xs font-bold text-brand-gold hover:no-underline"
            >
              <Plus className="size-3.5" /> Adicionar regra
            </Button>
            <div className="flex items-center gap-3">
              <span className={`text-xs font-bold ${activePct > 100 ? "text-red-400" : "text-gray-400"}`}>Total: {activePct.toFixed(0)}%</span>
              {rulesDirty && (
                <Button
                  type="button"
                  onClick={saveRules}
                  className="h-auto rounded-lg bg-brand-gold px-3 py-1.5 text-xs font-bold text-brand-navydark hover:bg-brand-gold"
                >
                  Salvar regras
                </Button>
              )}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end border-t border-gray-800 pt-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Sai da conta (origem)</label>
            <select value={distForm.fromAccountId} onChange={(e) => setDistForm({ ...distForm, fromAccountId: e.target.value })} className="w-full bg-[#171717] border border-gray-700 rounded-lg px-3 py-2 text-white outline-none focus:border-brand-gold">
              <option value="">Selecione...</option>
              {allAccounts.map((a) => <option key={a.id} value={a.id}>{a.name} · {a.currency || "BRL"} · saldo {Number(a.currentBalance).toFixed(2)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Valor a distribuir (R$)</label>
            <input type="number" step="0.01" min="0" value={distForm.baseAmountBrl} onChange={(e) => setDistForm({ ...distForm, baseAmountBrl: e.target.value })} placeholder="Ex.: lucro da semana" className="w-full bg-[#171717] border border-gray-700 rounded-lg px-3 py-2 text-white font-mono outline-none focus:border-brand-gold" />
          </div>
          <Button
            type="button"
            onClick={distribute}
            disabled={distributing || rulesDirty}
            title={rulesDirty ? "Salve as regras primeiro" : ""}
            className="h-auto rounded-lg bg-brand-gold px-5 py-2 text-sm font-bold text-brand-navydark hover:bg-brand-goldhover"
          >
            {distributing ? "Distribuindo..." : "Distribuir"}
          </Button>
        </div>
      </Card>

      {/* Gastos do mês */}
      <div className="overflow-x-auto rounded-xl border border-gray-700 bg-[#171717]">
        <table className="w-full text-sm">
          <thead className="bg-[#171717] text-gray-400 text-xs">
            <tr className="text-left"><th className="py-2 px-3">Data</th><th className="py-2 px-3">Descrição</th><th className="py-2 px-3">Categoria</th><th className="py-2 px-3">Conta</th><th className="py-2 px-3 text-right">Valor</th><th className="py-2 px-3 text-right">em R$</th><th className="py-2 px-3"></th></tr>
          </thead>
          <tbody>
            {expenses.length === 0 && <tr><td colSpan={7} className="py-6 text-center text-gray-500">Nenhum gasto neste mês.</td></tr>}
            {expenses.map((e) => (
              <tr key={e.id} className="border-t border-gray-800 text-gray-200">
                <td className="py-2 px-3 text-gray-400 whitespace-nowrap">{format(new Date(e.expenseDate), "dd/MM")}</td>
                <td className="py-2 px-3">{e.description || "—"}</td>
                <td className="py-2 px-3 text-gray-400">{e.categoryName || "—"}</td>
                <td className="py-2 px-3 text-gray-400">{e.accountName || "bolso"}</td>
                <td className="py-2 px-3 text-right font-semibold">{fmtCur(e.amount, e.currency)}</td>
                <td className="py-2 px-3 text-right text-gray-400">{fmtCur(e.amountBrl)}</td>
                <td className="py-2 px-3 text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => removeExpense(e.id)}
                    className="size-auto p-1 text-red-400 hover:bg-transparent hover:text-red-300 dark:hover:bg-transparent"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      </div>

      {/* Modal categoria */}
      <Modal isOpen={showCat} onClose={() => setShowCat(false)} title={catForm.id ? "Editar categoria" : "Nova categoria de gasto"}>
        <form onSubmit={saveCategory} className="space-y-4">
          <div><label className="block text-sm text-gray-400 mb-1">Nome *</label>
            <input value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} placeholder="Ex.: Casa, Mercado, Lazer" className="w-full bg-[#171717] border border-gray-700 rounded-lg px-3 py-2 text-white outline-none focus:border-brand-gold" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm text-gray-400 mb-1">Orçamento mensal</label>
              <input type="number" step="0.01" min="0" value={catForm.monthlyBudget} onChange={(e) => setCatForm({ ...catForm, monthlyBudget: e.target.value })} placeholder="0 = sem teto" className="w-full bg-[#171717] border border-gray-700 rounded-lg px-3 py-2 text-white outline-none focus:border-brand-gold" /></div>
            <div><label className="block text-sm text-gray-400 mb-1">Moeda</label>
              <select value={catForm.budgetCurrency} onChange={(e) => setCatForm({ ...catForm, budgetCurrency: e.target.value })} className="w-full bg-[#171717] border border-gray-700 rounded-lg px-3 py-2 text-white outline-none focus:border-brand-gold">
                <option value="PYG">₲ Guarani</option><option value="BRL">R$ Real</option><option value="USD">US$ Dólar</option>
              </select></div>
          </div>
          <div className="flex justify-end gap-2">
            {catForm.id && (
              <Button
                type="button"
                variant="link"
                onClick={async () => { await apiFetch(`/api/personal/categories/${catForm.id}`, { method: "PUT", body: JSON.stringify({ isActive: false }) }); setShowCat(false); load(); }}
                className="h-auto p-0 text-sm text-red-400 mr-auto hover:no-underline"
              >
                Arquivar
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCat(false)}
              className="h-auto rounded-lg border-gray-700 bg-transparent px-4 py-2 text-sm text-gray-300 shadow-none hover:bg-transparent hover:text-gray-300 dark:border-gray-700 dark:bg-transparent dark:hover:bg-transparent dark:hover:text-gray-300"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="h-auto rounded-lg bg-brand-gold px-5 py-2 text-sm font-bold text-brand-navydark hover:bg-brand-gold"
            >
              Salvar
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
