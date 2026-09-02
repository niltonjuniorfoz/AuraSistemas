import React, { useEffect, useState } from "react";
import { Wallet, Landmark, CreditCard, Plus, ArrowLeftRight, RefreshCw, X, PiggyBank, Pencil } from "lucide-react";
import { apiFetch } from "../lib/api";
import { Money } from "../components/Money";
import { Modal } from "../components/Modal";
import { formatDate, useAdminTranslation, setBrlExchangeRate } from "../lib/i18n";
import { toast } from "../components/Toast";
import { CompositionDonut, FxSparkline } from "../components/charts";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";

const TYPE_LABEL: Record<string, string> = { CASH: "Caixa (dinheiro)", BANK: "Banco", CARD_RECEIVABLE: "Cartão a receber", OTHER: "Outra" };
const TYPE_ICON: Record<string, any> = { CASH: Wallet, BANK: Landmark, CARD_RECEIVABLE: CreditCard, OTHER: PiggyBank };
const METHODS: Array<[string, string]> = [["CASH", "Dinheiro"], ["PIX", "PIX"], ["DEBIT_CARD", "Cartão de débito"], ["CREDIT_CARD", "Cartão de crédito"], ["TRANSFER", "Transferência"]];

// Formata valor na moeda nativa da conta (PYG não usa centavos).
const fmtCur = (v: any, cur?: string) => {
  const n = Number(v) || 0;
  if (cur === "USD") return `US$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (cur === "PYG") return `₲ ${n.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
  if (cur === "USDT") return `USDT ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
const PAIR_LABEL: Record<string, string> = { USDBRL: "Dólar → Real", USDPYG: "Dólar → Guarani", BRLPYG: "Real → Guarani", USDTBRL: "USDT → Real" };

export function Finance() {
  const { language } = useAdminTranslation();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [map, setMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name: "", type: "BANK", currency: "BRL", scope: "BUSINESS", feePercent: "", settlementDays: "", openingBalance: "" });
  const [editingAccount, setEditingAccount] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ name: "", type: "BANK", currency: "BRL", scope: "BUSINESS", feePercent: "", settlementDays: "" });
  const [showTransfer, setShowTransfer] = useState(false);
  const [transfer, setTransfer] = useState({ fromAccountId: "", toAccountId: "", amount: "", toAmount: "", description: "" });
  const [movAccount, setMovAccount] = useState<any | null>(null);
  const [movements, setMovements] = useState<any[]>([]);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustForm, setAdjustForm] = useState({ amount: "", description: "", masterPassword: "" });
  const [adjustBusy, setAdjustBusy] = useState(false);
  const [settleAcc, setSettleAcc] = useState<any | null>(null);
  const [settleTo, setSettleTo] = useState("");
  const [settlePending, setSettlePending] = useState(0);
  const [fx, setFx] = useState<Record<string, { rate: number; source: string; day: string }>>({});
  const [unconverted, setUnconverted] = useState(0);
  const [fxEdit, setFxEdit] = useState<{ pair: string; value: string } | null>(null);

  const [fxHistory, setFxHistory] = useState<any[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const [a, m, f, h] = await Promise.all([
        apiFetch("/api/finance/accounts"), apiFetch("/api/finance/method-map"),
        apiFetch("/api/fx/today"), apiFetch("/api/fx/history?days=30"),
      ]);
      if (a.ok) { const j = await a.json(); setAccounts(j.data || []); setTotal(j.totalBalance || 0); setUnconverted(j.unconvertedCount || 0); }
      if (m.ok) { const j = await m.json(); setMap(j.data || {}); }
      if (f.ok) { const j = await f.json(); setFx(j.rates || {}); }
      if (h.ok) { const j = await h.json(); setFxHistory(j.data || []); }
    } finally { setLoading(false); }
  };

  // Série do dólar (30d): um valor por dia, manual prevalece sobre a API.
  const usdSeries = React.useMemo(() => {
    const byDay = new Map<string, { rate: number; manual: boolean }>();
    for (const r of fxHistory) {
      if (r.pair !== "USDBRL") continue;
      const cur = byDay.get(r.day);
      if (!cur || r.source === "MANUAL") byDay.set(r.day, { rate: Number(r.rate), manual: r.source === "MANUAL" });
    }
    return [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([day, v]) => ({ day, rate: v.rate }));
  }, [fxHistory]);

  // Donut "onde está o dinheiro": contas com valor convertido pra R$.
  const moneyDonut = React.useMemo(() => {
    const COLORS = ["#ffd700", "#34d399", "#60a5fa", "#a78bfa", "#fbbf24", "#f87171", "#64748b"];
    return accounts
      .map((a) => ({ label: `${a.name}${a.scope === "PERSONAL" ? " (pessoal)" : ""}`, value: Number(a.balanceBrl ?? (a.currency === "BRL" || !a.currency ? a.currentBalance : 0)) || 0 }))
      .filter((i) => i.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 7)
      .map((i, idx) => ({ ...i, color: COLORS[idx % COLORS.length] }));
  }, [accounts]);
  useEffect(() => { load(); }, []);

  const saveFxOverride = async () => {
    if (!fxEdit) return;
    const res = await apiFetch("/api/fx/override", { method: "POST", body: JSON.stringify({ pair: fxEdit.pair, rate: Number(String(fxEdit.value).replace(",", ".")) }) });
    if (res.ok) {
      const j = await res.json(); setFx(j.rates || {}); setFxEdit(null); toast.success("Câmbio manual salvo (prevalece hoje).");
      // Sem isso, <Money> em modo DUAL continua convertendo com a cotação antiga (cache em
      // localStorage, só atualizado no mount do App) até a página ser recarregada.
      if (j.rates?.USDBRL?.rate) setBrlExchangeRate(j.rates.USDBRL.rate);
      load();
    }
    else { const err = await res.json().catch(() => ({})); toast.error(err.error || "Erro ao salvar câmbio."); }
  };
  const clearFxOverride = async (pair: string) => {
    const res = await apiFetch(`/api/fx/override/${pair}`, { method: "DELETE" });
    if (res.ok) {
      const j = await res.json(); setFx(j.rates || {}); toast.success("Voltou para a cotação automática.");
      if (j.rates?.USDBRL?.rate) setBrlExchangeRate(j.rates.USDBRL.rate);
      load();
    }
  };
  const refreshFx = async () => {
    const res = await apiFetch("/api/fx/refresh", { method: "POST" });
    if (res.ok) { const j = await res.json(); setFx(j.rates || {}); toast.success("Cotações atualizadas."); load(); }
    else { const err = await res.json().catch(() => ({})); toast.error(err.error || "Falha ao buscar cotações."); }
  };

  const saveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await apiFetch("/api/finance/accounts", { method: "POST", body: JSON.stringify(form) });
    if (res.ok) { setShowNew(false); setForm({ name: "", type: "BANK", currency: "BRL", scope: "BUSINESS", feePercent: "", settlementDays: "", openingBalance: "" }); load(); toast.success("Conta criada."); }
    else { const err = await res.json().catch(() => ({})); toast.error(err.error || "Erro ao criar conta."); }
  };

  const openEdit = (a: any) => {
    setEditingAccount(a);
    setEditForm({
      name: a.name || "",
      type: a.type || "BANK",
      currency: a.currency || "BRL",
      scope: a.scope || "BUSINESS",
      feePercent: a.feePercent != null ? String(a.feePercent) : "",
      settlementDays: a.settlementDays != null ? String(a.settlementDays) : "",
    });
  };

  const saveEditAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;
    const res = await apiFetch(`/api/finance/accounts/${editingAccount.id}`, { method: "PUT", body: JSON.stringify(editForm) });
    if (res.ok) { setEditingAccount(null); load(); toast.success("Conta atualizada."); }
    else { const err = await res.json().catch(() => ({})); toast.error(err.error || "Erro ao atualizar conta."); }
  };

  const saveMap = async (method: string, accountId: string) => {
    const next = { ...map, [method]: accountId };
    setMap(next);
    const res = await apiFetch("/api/finance/method-map", { method: "PUT", body: JSON.stringify({ map: next }) });
    if (res.ok) toast.success("Mapeamento salvo."); else toast.error("Erro ao salvar mapeamento.");
  };

  const doTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await apiFetch("/api/finance/transfer", { method: "POST", body: JSON.stringify(transfer) });
    if (res.ok) { setShowTransfer(false); setTransfer({ fromAccountId: "", toAccountId: "", amount: "", toAmount: "", description: "" }); load(); toast.success("Transferência feita."); }
    else { const err = await res.json().catch(() => ({})); toast.error(err.error || "Erro na transferência."); }
  };

  const openMovements = async (acc: any) => {
    setMovAccount(acc); setMovements([]); setAdjustOpen(false); setAdjustForm({ amount: "", description: "", masterPassword: "" });
    const res = await apiFetch(`/api/finance/accounts/${acc.id}/movements`);
    if (res.ok) { const j = await res.json(); setMovements(j.data || []); }
  };

  const doAdjust = async () => {
    if (!movAccount) return;
    const amt = Number(String(adjustForm.amount).replace(",", "."));
    if (!Number.isFinite(amt) || amt === 0) { toast.error("Valor deve ser diferente de zero."); return; }
    if (!adjustForm.description.trim()) { toast.error("Descreva o motivo do ajuste."); return; }
    if (!adjustForm.masterPassword) { toast.error("Digite a senha do Master."); return; }
    setAdjustBusy(true);
    try {
      const res = await apiFetch(`/api/finance/accounts/${movAccount.id}/adjust`, {
        method: "POST",
        body: JSON.stringify({ amount: amt, description: adjustForm.description.trim(), masterPassword: adjustForm.masterPassword }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success("Ajuste lançado.");
        setAdjustOpen(false); setAdjustForm({ amount: "", description: "", masterPassword: "" });
        // Atualiza o saldo mostrado no cabeçalho do modal com o valor que o servidor devolveu
        // (re-buscar a conta de novo bateria com o `movAccount` antigo em memória).
        setMovAccount((prev: any) => prev ? { ...prev, currentBalance: j.newBalance } : prev);
        const res2 = await apiFetch(`/api/finance/accounts/${movAccount.id}/movements`);
        if (res2.ok) { const j2 = await res2.json(); setMovements(j2.data || []); }
        load();
      } else toast.error(j.error || "Erro ao lançar ajuste.");
    } finally { setAdjustBusy(false); }
  };

  const openSettle = async (acc: any) => {
    setSettleAcc(acc); setSettleTo(""); setSettlePending(0);
    const res = await apiFetch(`/api/finance/accounts/${acc.id}/pending`);
    if (res.ok) { const j = await res.json(); setSettlePending(j.pending || 0); }
  };

  const doSettle = async () => {
    if (!settleAcc || !settleTo) { toast.info("Escolha a conta de destino."); return; }
    const res = await apiFetch(`/api/finance/accounts/${settleAcc.id}/settle`, { method: "POST", body: JSON.stringify({ toAccountId: settleTo }) });
    if (res.ok) { setSettleAcc(null); load(); toast.success("Recebido da maquininha."); }
    else { const err = await res.json().catch(() => ({})); toast.error(err.error || "Erro ao liquidar."); }
  };

  const unmapped = METHODS.filter(([m]) => !map[m]).map(([, l]) => l);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-white flex items-center gap-2"><PiggyBank className="w-6 h-6 text-brand-gold" /> Financeiro — Onde está o dinheiro</h2>
          <p className="text-sm text-gray-400">Saldo por conta. Total (convertido p/ R$ no câmbio de hoje): <span className="font-bold text-brand-gold"><Money value={total} lang="pt-BR" /></span>{unconverted > 0 && <span className="ml-2 text-[11px] text-amber-300">({unconverted} conta(s) sem câmbio, fora do total)</span>}</p>
        </div>
      </div>

      {unmapped.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5 py-0">
          <CardContent className="px-4 py-3 text-sm text-amber-200">
            Formas de pagamento sem conta definida: <b>{unmapped.join(", ")}</b>. O dinheiro dessas formas não é rastreado até você definir a conta abaixo.
          </CardContent>
        </Card>
      )}

      {/* Tudo num box só: câmbio+dinheiro, contas e mapeamento de formas de pagamento */}
      <Card className="py-0">
        <CardContent className="space-y-5 p-4 md:p-5">

      {/* Câmbio do dia (com tendência 30d) + composição do dinheiro */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <div className="xl:col-span-2">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-white">Câmbio de hoje</h3>
            <p className="text-xs text-gray-500">Cotação automática (AwesomeAPI). Clique numa taxa pra informar a que você conseguiu de verdade — ela passa a valer no dia.</p>
          </div>
          <Button variant="outline" onClick={refreshFx}><RefreshCw className="w-3.5 h-3.5" /> Atualizar</Button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {["USDBRL", "USDPYG", "BRLPYG", "USDTBRL"].map((pair) => {
            const r = fx[pair];
            const editing = fxEdit?.pair === pair;
            return (
              <Card key={pair} className={r?.source === "MANUAL" ? "border-brand-gold/50 bg-brand-gold/5 py-0" : "py-0"}>
                <CardContent className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-gray-400">{PAIR_LABEL[pair]}</span>
                  {r?.source === "MANUAL"
                    ? <span className="text-[10px] font-bold text-brand-gold flex items-center gap-1.5">MANUAL <Button variant="ghost" size="icon-xs" onClick={() => clearFxOverride(pair)} title="Voltar pra automática" className="h-auto w-auto p-0 text-gray-500 hover:bg-transparent hover:text-red-300">✕</Button></span>
                    : <span className="text-[10px] text-gray-600">automática{r?.day && r.day !== new Date().toISOString().slice(0, 10) ? ` (${r.day})` : ""}</span>}
                </div>
                {editing ? (
                  <div className="flex gap-1.5">
                    <input autoFocus type="number" step="0.0001" value={fxEdit.value} onChange={(e) => setFxEdit({ pair, value: e.target.value })}
                      onKeyDown={(e) => { if (e.key === "Enter") saveFxOverride(); if (e.key === "Escape") setFxEdit(null); }}
                      className="w-full bg-[#171717] border border-brand-gold rounded-lg px-2 py-1 text-white text-sm font-mono outline-none" />
                    <Button onClick={saveFxOverride} className="text-xs font-bold text-brand-navydark bg-brand-gold rounded-lg px-2">OK</Button>
                  </div>
                ) : (
                  <Button variant="ghost" onClick={() => setFxEdit({ pair, value: r ? String(r.rate) : "" })} title="Informar taxa real" className="text-lg font-bold text-white font-mono hover:text-brand-gold transition">
                    {r ? Number(r.rate).toLocaleString("pt-BR", { maximumFractionDigits: pair === "USDPYG" || pair === "BRLPYG" ? 2 : 4 }) : "—"}
                  </Button>
                )}
                </CardContent>
              </Card>
            );
          })}
        </div>
        {usdSeries.length >= 2 && (
          <Card className="mt-3 py-0">
            <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-gray-400">Dólar → Real · últimos 30 dias</span>
              <span className="text-[11px] font-mono text-gray-500">
                {usdSeries[0].rate.toLocaleString("pt-BR", { maximumFractionDigits: 4 })} → <b className="text-brand-gold">{usdSeries[usdSeries.length - 1].rate.toLocaleString("pt-BR", { maximumFractionDigits: 4 })}</b>
              </span>
            </div>
            <FxSparkline data={usdSeries} height={72} digits={4} />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Onde está o dinheiro — composição do saldo em R$ por conta */}
      <div className="xl:border-l xl:border-gray-800 xl:pl-4">
        <h3 className="text-sm font-semibold text-white mb-1">Onde está o dinheiro</h3>
        <p className="text-xs text-gray-500 mb-3">Saldos convertidos pra R$ no câmbio de hoje.</p>
        <CompositionDonut items={moneyDonut} height={170} />
      </div>
      </div>

      <div className="border-t border-gray-800 pt-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">Contas</h3>
          <p className="text-xs text-gray-500">Saldo atual de cada conta. Clique numa conta pra ver a movimentação.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowTransfer(true)}><ArrowLeftRight className="w-4 h-4" /> Transferir</Button>
          <Button onClick={() => setShowNew(true)}><Plus className="w-4 h-4" /> Nova conta</Button>
          <Button variant="outline" onClick={load}><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /></Button>
        </div>
      </div>
      {(() => {
        const renderCard = (a: any) => {
          const Icon = TYPE_ICON[a.type] || PiggyBank;
          return (
            <Card key={a.id} className="py-0 shadow-md transition hover:border-primary/50">
              <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2"><span className="p-2 rounded-lg bg-[#171717] border border-gray-700 text-brand-gold"><Icon className="w-5 h-5" /></span>
                  <div><div className="text-sm font-semibold text-white">{a.name}</div><div className="text-[11px] text-gray-500">{TYPE_LABEL[a.type]}</div></div>
                </div>
                <div className="flex items-start gap-1.5">
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant={a.currency === "USD" ? "success" : a.currency === "PYG" ? "destructive" : "secondary"}>{a.currency || "BRL"}</Badge>
                    {a.scope === "PERSONAL" && <Badge variant="outline" className="border-purple-400/40 text-purple-300">PESSOAL</Badge>}
                  </div>
                  <Button variant="ghost" type="button" onClick={() => openEdit(a)} title="Editar conta" className="p-1 rounded-md text-gray-500 hover:text-brand-gold hover:bg-[#171717] transition"><Pencil className="w-3.5 h-3.5" /></Button>
                </div>
              </div>
              <Button variant="ghost" onClick={() => openMovements(a)} className="h-auto w-full flex-col items-start p-0 text-left hover:bg-transparent">
                <div className="text-2xl font-bold text-white">{fmtCur(a.currentBalance, a.currency)}</div>
                {a.currency && a.currency !== "BRL" && (
                  <div className="text-[11px] text-gray-500 mt-0.5">{a.balanceBrl != null ? <>≈ R$ {Number(a.balanceBrl).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} hoje</> : <span className="text-amber-300">sem câmbio pra converter</span>}</div>
                )}
                {a.type === "CARD_RECEIVABLE" && <div className="text-[11px] text-gray-500 mt-1">Taxa {Number(a.feePercent).toFixed(2)}% · D+{a.settlementDays}</div>}
              </Button>
              {a.type === "CARD_RECEIVABLE" && (
                <Button onClick={() => openSettle(a)} className="mt-3 w-full rounded-lg border border-brand-gold/40 bg-brand-gold/10 px-3 py-2 text-xs font-bold text-brand-gold hover:bg-brand-gold/15">Receber da maquininha</Button>
              )}
              </CardContent>
            </Card>
          );
        };
        const biz = accounts.filter((a) => a.scope !== "PERSONAL");
        const pers = accounts.filter((a) => a.scope === "PERSONAL");
        return (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {biz.map(renderCard)}
              {accounts.length === 0 && (
                <Card className="col-span-full border-dashed py-0">
                  <CardContent className="py-8 text-center text-gray-500">Nenhuma conta ainda. Crie sua primeira em "Nova conta".</CardContent>
                </Card>
              )}
            </div>
            {pers.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-purple-300 mb-3 mt-2 flex items-center gap-2">Contas pessoais <span className="text-[10px] text-gray-500 font-normal">(fora do caixa da empresa — detalhes na página Pessoal)</span></h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{pers.map(renderCard)}</div>
              </div>
            )}
          </>
        );
      })()}
      </div>

      {/* Mapeamento formas de pagamento */}
      <div className="border-t border-gray-800 pt-5">
        <h3 className="text-sm font-semibold text-white mb-1">Para onde vai cada forma de pagamento</h3>
        <p className="text-xs text-gray-500 mb-4">Define em qual conta o dinheiro cai quando você recebe por cada forma.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {METHODS.map(([m, label]) => (
            <div key={m}>
              <label className="block text-xs text-gray-400 mb-1">{label}</label>
              <select value={map[m] || ""} onChange={(e) => saveMap(m, e.target.value)} className="w-full bg-[#171717] border border-gray-700 rounded-lg px-3 py-2 text-white outline-none focus:border-brand-gold">
                <option value="">— não definido —</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name} ({TYPE_LABEL[a.type]})</option>)}
              </select>
            </div>
          ))}
        </div>
      </div>
      </CardContent>
      </Card>

      {/* Nova conta */}
      <Modal isOpen={showNew} onClose={() => setShowNew(false)} title="Nova conta financeira">
        <form onSubmit={saveAccount} className="space-y-4">
          <div><label className="block text-sm text-gray-400 mb-1">Nome *</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex.: Banco Inter, Maquininha, Caixa" className="w-full bg-[#171717] border border-gray-700 rounded-lg px-3 py-2 text-white outline-none focus:border-brand-gold" /></div>
          <div><label className="block text-sm text-gray-400 mb-1">Tipo</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full bg-[#171717] border border-gray-700 rounded-lg px-3 py-2 text-white outline-none focus:border-brand-gold">
              <option value="BANK">Banco</option><option value="CASH">Caixa (dinheiro)</option><option value="CARD_RECEIVABLE">Cartão a receber (maquininha)</option><option value="OTHER">Outra</option>
            </select></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm text-gray-400 mb-1">Moeda da conta</label>
              <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className="w-full bg-[#171717] border border-gray-700 rounded-lg px-3 py-2 text-white outline-none focus:border-brand-gold">
                <option value="BRL">R$ Real (Brasil)</option><option value="USD">US$ Dólar</option><option value="PYG">₲ Guarani (Paraguai)</option><option value="USDT">USDT (Tether)</option>
              </select></div>
            <div><label className="block text-sm text-gray-400 mb-1">Uso</label>
              <select value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })} className="w-full bg-[#171717] border border-gray-700 rounded-lg px-3 py-2 text-white outline-none focus:border-brand-gold">
                <option value="BUSINESS">Empresa</option><option value="PERSONAL">Pessoal</option>
              </select></div>
          </div>
          {form.type === "CARD_RECEIVABLE" && (
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm text-gray-400 mb-1">Taxa (%)</label>
                <input type="number" step="0.01" min="0" value={form.feePercent} onChange={(e) => setForm({ ...form, feePercent: e.target.value })} placeholder="Ex.: 3.5" className="w-full bg-[#171717] border border-gray-700 rounded-lg px-3 py-2 text-white outline-none focus:border-brand-gold" /></div>
              <div><label className="block text-sm text-gray-400 mb-1">Prazo (D+)</label>
                <input type="number" min="0" value={form.settlementDays} onChange={(e) => setForm({ ...form, settlementDays: e.target.value })} placeholder="Ex.: 30" className="w-full bg-[#171717] border border-gray-700 rounded-lg px-3 py-2 text-white outline-none focus:border-brand-gold" /></div>
            </div>
          )}
          <div><label className="block text-sm text-gray-400 mb-1">Saldo inicial</label>
            <input type="number" step="0.01" value={form.openingBalance} onChange={(e) => setForm({ ...form, openingBalance: e.target.value })} placeholder="0" className="w-full bg-[#171717] border border-gray-700 rounded-lg px-3 py-2 text-white outline-none focus:border-brand-gold" /></div>
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setShowNew(false)}>Cancelar</Button>
            <Button type="submit">Criar</Button></div>
        </form>
      </Modal>

      {/* Editar conta */}
      <Modal isOpen={!!editingAccount} onClose={() => setEditingAccount(null)} title="Editar conta financeira">
        <form onSubmit={saveEditAccount} className="space-y-4">
          <div><label className="block text-sm text-gray-400 mb-1">Nome *</label>
            <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} placeholder="Ex.: Banco Inter, Maquininha, Caixa" className="w-full bg-[#171717] border border-gray-700 rounded-lg px-3 py-2 text-white outline-none focus:border-brand-gold" /></div>
          <div><label className="block text-sm text-gray-400 mb-1">Tipo</label>
            <select value={editForm.type} onChange={(e) => setEditForm({ ...editForm, type: e.target.value })} className="w-full bg-[#171717] border border-gray-700 rounded-lg px-3 py-2 text-white outline-none focus:border-brand-gold">
              <option value="BANK">Banco</option><option value="CASH">Caixa (dinheiro)</option><option value="CARD_RECEIVABLE">Cartão a receber (maquininha)</option><option value="OTHER">Outra</option>
            </select></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm text-gray-400 mb-1">Moeda da conta</label>
              <select value={editForm.currency} onChange={(e) => setEditForm({ ...editForm, currency: e.target.value })} disabled={Math.abs(Number(editingAccount?.currentBalance)) > 0.005} title={Math.abs(Number(editingAccount?.currentBalance)) > 0.005 ? "Esta conta tem saldo — zere com uma Transferência antes de trocar a moeda." : ""} className="w-full bg-[#171717] border border-gray-700 rounded-lg px-3 py-2 text-white outline-none focus:border-brand-gold disabled:opacity-50">
                <option value="BRL">R$ Real (Brasil)</option><option value="USD">US$ Dólar</option><option value="PYG">₲ Guarani (Paraguai)</option><option value="USDT">USDT (Tether)</option>
              </select></div>
            <div><label className="block text-sm text-gray-400 mb-1">Uso</label>
              <select value={editForm.scope} onChange={(e) => setEditForm({ ...editForm, scope: e.target.value })} disabled={Math.abs(Number(editingAccount?.currentBalance)) > 0.005} title={Math.abs(Number(editingAccount?.currentBalance)) > 0.005 ? "Esta conta tem saldo — zere com uma Transferência antes de mudar entre Empresa/Pessoal." : ""} className="w-full bg-[#171717] border border-gray-700 rounded-lg px-3 py-2 text-white outline-none focus:border-brand-gold disabled:opacity-50">
                <option value="BUSINESS">Empresa</option><option value="PERSONAL">Pessoal</option>
              </select></div>
          </div>
          {editForm.type === "CARD_RECEIVABLE" && (
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm text-gray-400 mb-1">Taxa (%)</label>
                <input type="number" step="0.01" min="0" value={editForm.feePercent} onChange={(e) => setEditForm({ ...editForm, feePercent: e.target.value })} placeholder="Ex.: 3.5" className="w-full bg-[#171717] border border-gray-700 rounded-lg px-3 py-2 text-white outline-none focus:border-brand-gold" /></div>
              <div><label className="block text-sm text-gray-400 mb-1">Prazo (D+)</label>
                <input type="number" min="0" value={editForm.settlementDays} onChange={(e) => setEditForm({ ...editForm, settlementDays: e.target.value })} placeholder="Ex.: 30" className="w-full bg-[#171717] border border-gray-700 rounded-lg px-3 py-2 text-white outline-none focus:border-brand-gold" /></div>
            </div>
          )}
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setEditingAccount(null)}>Cancelar</Button>
            <Button type="submit">Salvar</Button></div>
        </form>
      </Modal>

      {/* Transferência */}
      <Modal isOpen={showTransfer} onClose={() => setShowTransfer(false)} title="Transferir entre contas">
        <form onSubmit={doTransfer} className="space-y-4">
          <div><label className="block text-sm text-gray-400 mb-1">De</label>
            <select value={transfer.fromAccountId} onChange={(e) => setTransfer({ ...transfer, fromAccountId: e.target.value })} className="w-full bg-[#171717] border border-gray-700 rounded-lg px-3 py-2 text-white outline-none focus:border-brand-gold">
              <option value="">Selecione...</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name} · {a.currency || "BRL"}</option>)}</select></div>
          <div><label className="block text-sm text-gray-400 mb-1">Para</label>
            <select value={transfer.toAccountId} onChange={(e) => setTransfer({ ...transfer, toAccountId: e.target.value })} className="w-full bg-[#171717] border border-gray-700 rounded-lg px-3 py-2 text-white outline-none focus:border-brand-gold">
              <option value="">Selecione...</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name} · {a.currency || "BRL"}</option>)}</select></div>
          {(() => {
            const fa = accounts.find((x) => x.id === transfer.fromAccountId), ta = accounts.find((x) => x.id === transfer.toAccountId);
            const cross = fa && ta && (fa.currency || "BRL") !== (ta.currency || "BRL");
            const out = Number(transfer.amount) || 0, inn = Number(transfer.toAmount) || 0;
            return (
              <>
                <div><label className="block text-sm text-gray-400 mb-1">Valor que SAI {fa ? `(${fa.currency || "BRL"})` : ""}</label>
                  <input type="number" step="0.01" min="0" value={transfer.amount} onChange={(e) => setTransfer({ ...transfer, amount: e.target.value })} className="w-full bg-[#171717] border border-gray-700 rounded-lg px-3 py-2 text-white outline-none focus:border-brand-gold" /></div>
                {cross && (
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Valor que ENTRA ({ta.currency || "BRL"}) — o que o câmbio entregou</label>
                    <input type="number" step="0.01" min="0" value={transfer.toAmount} onChange={(e) => setTransfer({ ...transfer, toAmount: e.target.value })} className="w-full bg-[#171717] border border-brand-gold/50 rounded-lg px-3 py-2 text-white outline-none focus:border-brand-gold" />
                    {out > 0 && inn > 0 && (
                      <p className="mt-1 text-[11px] text-brand-gold">Câmbio efetivo: 1 {fa.currency || "BRL"} = {(inn / out).toLocaleString("pt-BR", { maximumFractionDigits: 6 })} {ta.currency || "BRL"} — fica gravado nas duas contas.</p>
                    )}
                  </div>
                )}
              </>
            );
          })()}
          <div><label className="block text-sm text-gray-400 mb-1">Descrição (opcional)</label>
            <input value={transfer.description} onChange={(e) => setTransfer({ ...transfer, description: e.target.value })} placeholder="Ex.: Depósito da sangria" className="w-full bg-[#171717] border border-gray-700 rounded-lg px-3 py-2 text-white outline-none focus:border-brand-gold" /></div>
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setShowTransfer(false)}>Cancelar</Button>
            <Button type="submit">Transferir</Button></div>
        </form>
      </Modal>

      {/* Receber da maquininha */}
      <Modal isOpen={!!settleAcc} onClose={() => setSettleAcc(null)} title="Receber da maquininha">
        {settleAcc && (
          <div className="space-y-4">
            <Card className="py-0">
              <CardContent className="p-3">
                <div className="text-xs text-gray-400">A receber em {settleAcc.name}</div>
                <div className="text-xl font-bold text-brand-gold"><Money value={settlePending} lang="pt-BR" /></div>
              </CardContent>
            </Card>
            <p className="text-sm text-gray-400">Confirma que a maquininha depositou? O valor sai de "a receber" e entra na conta escolhida.</p>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Depositou em</label>
              <select value={settleTo} onChange={(e) => setSettleTo(e.target.value)} className="w-full bg-[#171717] border border-gray-700 rounded-lg px-3 py-2 text-white outline-none focus:border-brand-gold">
                <option value="">Selecione o banco...</option>
                {accounts.filter((a) => a.id !== settleAcc.id && a.type !== "CARD_RECEIVABLE").map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSettleAcc(null)}>Cancelar</Button>
              <Button onClick={doSettle} disabled={settlePending <= 0}>Confirmar recebimento</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Movimentos */}
      {movAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-gray-800 bg-brand-navylight shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-800 p-4">
              <div><h3 className="text-lg font-bold text-white">{movAccount.name} <span className="text-[11px] text-gray-500 font-normal">({movAccount.currency || "BRL"})</span></h3><div className="text-sm text-brand-gold font-bold">{fmtCur(movAccount.currentBalance, movAccount.currency)}</div></div>
              <div className="flex items-center gap-3">
                <Button variant="destructive" size="sm" onClick={() => setAdjustOpen((v) => !v)}>Lançar ajuste (Master)</Button>
                <Button variant="ghost" size="icon-sm" onClick={() => setMovAccount(null)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></Button>
              </div>
            </div>
            {adjustOpen && (
              <div className="border-b border-gray-800 bg-brand-navy/40 p-4 space-y-3">
                <p className="text-xs text-gray-400">
                  Lança um movimento avulso direto nesta conta — pra corrigir diferença que nenhum fluxo automático cobre (taxa não registrada, dinheiro preso de um caso já resolvido, etc). Positivo entra, negativo sai. Exige a senha de login do usuário Master.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-gray-400">Valor (positivo entra, negativo sai)</label>
                    <input value={adjustForm.amount} onChange={(e) => setAdjustForm((f) => ({ ...f, amount: e.target.value }))} placeholder="Ex.: -699,99"
                      className="w-full rounded-lg border border-gray-700 bg-[#171717] px-3 py-2 text-sm text-white outline-none focus:border-brand-gold" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-400">Senha do Master</label>
                    <input type="password" value={adjustForm.masterPassword} onChange={(e) => setAdjustForm((f) => ({ ...f, masterPassword: e.target.value }))} placeholder="Senha de login do Master"
                      className="w-full rounded-lg border border-gray-700 bg-[#171717] px-3 py-2 text-sm text-white outline-none focus:border-brand-gold" />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-400">Motivo (obrigatório)</label>
                  <input value={adjustForm.description} onChange={(e) => setAdjustForm((f) => ({ ...f, description: e.target.value }))} placeholder="Ex.: estorno da venda LOJ-000006, dinheiro preso por bug já corrigido"
                    className="w-full rounded-lg border border-gray-700 bg-[#171717] px-3 py-2 text-sm text-white outline-none focus:border-brand-gold" />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setAdjustOpen(false)}>Cancelar</Button>
                  <Button variant="destructive" onClick={doAdjust} disabled={adjustBusy}>Lançar ajuste</Button>
                </div>
              </div>
            )}
            <div className="max-h-[60vh] overflow-y-auto p-4">
              {movements.length === 0 ? <div className="text-sm text-gray-500 py-6 text-center">Nenhum movimento.</div> : (
                <table className="w-full text-sm">
                  <thead className="text-xs text-gray-500"><tr className="text-left"><th className="py-1">Data</th><th className="py-1">Descrição</th><th className="py-1 text-right">Valor</th><th className="py-1 text-right">Saldo</th></tr></thead>
                  <tbody>
                    {movements.map((mv) => (
                      <tr key={mv.id} className="border-t border-gray-800 text-gray-200">
                        <td className="py-1.5 text-gray-400 whitespace-nowrap">{formatDate(mv.createdAt, language)}</td>
                        <td className="py-1.5">{mv.description || mv.type}{!mv.settled && <span className="ml-2 text-[10px] text-amber-300">a receber{mv.expectedSettlementDate ? ` até ${formatDate(mv.expectedSettlementDate, language)}` : ""}</span>}</td>
                        <td className={`py-1.5 text-right font-semibold ${Number(mv.amountUsd) < 0 ? "text-red-300" : "text-emerald-300"}`}>{fmtCur(mv.amountUsd, movAccount.currency)}</td>
                        <td className="py-1.5 text-right text-gray-400">{fmtCur(mv.balanceAfter, movAccount.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
