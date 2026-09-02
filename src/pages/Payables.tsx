import React, { useEffect, useState } from "react";
import { Receipt, AlertTriangle, Plus, RefreshCw, Check, Trash2 } from "lucide-react";
import { apiFetch } from "../lib/api";
import { Money } from "../components/Money";
import { Modal } from "../components/Modal";
import { formatDate, useAdminTranslation } from "../lib/i18n";
import { DataTable } from "../components/DataTable";
import type { ColumnDef } from "@tanstack/react-table";
import { CompositionDonut } from "../components/charts";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";

export function Payables() {
  const { language } = useAdminTranslation();
  const [rows, setRows] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({ count: 0, totalOutstanding: 0, overdueCount: 0, overdueAmount: 0 });
  const [loading, setLoading] = useState(false);
  const [onlyOverdue, setOnlyOverdue] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ description: "", amountUsd: "", dueDate: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [accounts, setAccounts] = useState<any[]>([]);
  const [payModal, setPayModal] = useState<{ id: string; outstanding: number; description: string } | null>(null);
  const [payAccountId, setPayAccountId] = useState("");
  const [paying, setPaying] = useState(false);

  // Contas de onde o dinheiro pode sair (dinheiro/banco/outros — nunca "cartão a receber").
  useEffect(() => {
    apiFetch("/api/finance/accounts").then(async (r) => {
      if (r.ok) { const j = await r.json(); setAccounts((j.data || []).filter((a: any) => a.type !== "CARD_RECEIVABLE")); }
    }).catch(() => {});
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/payables${onlyOverdue ? "?overdue=true" : ""}`);
      const data = await res.json();
      setRows(Array.isArray(data.data) ? data.data : []);
      setSummary(data.summary || {});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [onlyOverdue]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError("");
    try {
      const res = await apiFetch("/api/payables", { method: "POST", body: JSON.stringify(form) });
      if (res.ok) {
        setShowNew(false);
        setForm({ description: "", amountUsd: "", dueDate: "", notes: "" });
        load();
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.error || "Erro ao salvar.");
      }
    } finally { setSaving(false); }
  };

  const openPay = (r: any) => {
    setPayModal({ id: r.id, outstanding: r.outstanding, description: r.description });
    setPayAccountId(accounts[0]?.id || "");
    setError("");
  };
  const confirmPay = async () => {
    if (!payModal) return;
    if (!payAccountId) { setError("Escolha a conta de onde o dinheiro sai."); return; }
    setPaying(true); setError("");
    try {
      const res = await apiFetch(`/api/payables/${payModal.id}/pay`, { method: "POST", body: JSON.stringify({ accountId: payAccountId }) });
      if (res.ok) { setPayModal(null); load(); }
      else { const e = await res.json().catch(() => ({})); setError(e.error || "Erro ao pagar."); }
    } finally { setPaying(false); }
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir este título?")) return;
    const res = await apiFetch(`/api/payables/${id}`, { method: "DELETE" });
    if (res.ok) load(); else { const e = await res.json().catch(() => ({})); alert(e.error || "Erro ao excluir."); }
  };

  const sourceLabel: Record<string, string> = { PURCHASE: "Compra", MANUAL: "Manual" };

  // Colunas (TanStack): Situação ordena por urgência (vencidas primeiro).
  const columns = React.useMemo<ColumnDef<any>[]>(() => [
    {
      accessorKey: "description",
      header: "Descrição",
      cell: ({ getValue }) => <span className="font-medium text-gray-200">{String(getValue() || "")}</span>,
    },
    {
      id: "fornecedor",
      header: "Fornecedor",
      accessorFn: (r: any) => r.supplierName || "—",
      cell: ({ getValue }) => <span className="text-gray-400">{String(getValue())}</span>,
    },
    {
      id: "origem",
      header: "Origem",
      accessorFn: (r: any) => sourceLabel[r.source] || r.source,
      cell: ({ getValue }) => <span className="text-xs text-gray-500">{String(getValue())}</span>,
    },
    {
      accessorKey: "dueDate",
      header: "Vencimento",
      sortingFn: (a, b) => new Date(a.original.dueDate || "2999-01-01").getTime() - new Date(b.original.dueDate || "2999-01-01").getTime(),
      cell: ({ getValue }) => getValue() ? <span className="text-gray-300">{formatDate(String(getValue()), language)}</span> : <span className="text-gray-600">—</span>,
    },
    {
      accessorKey: "outstanding",
      header: () => <div className="text-right">Em aberto</div>,
      sortingFn: (a, b) => Number(a.original.outstanding) - Number(b.original.outstanding),
      cell: ({ row }) => <div className="text-right font-semibold text-white"><Money value={row.original.outstanding} lang="pt-BR" /></div>,
    },
    {
      id: "situacao",
      header: "Situação",
      accessorFn: (r: any) => (r.daysToDue == null ? 999999 : r.daysToDue),
      cell: ({ row }) => {
        const r = row.original;
        return (
          <span>
            {r.overdue
              ? <span className="font-semibold text-red-400">Vencida há {Math.abs(r.daysToDue)}d</span>
              : r.daysToDue !== null
                ? <span className="text-amber-300">Vence em {r.daysToDue}d</span>
                : <span className="text-gray-500">Sem vencimento</span>}
            {r.status === "PARTIAL" && <span className="ml-2 text-xs text-blue-300">(parcial)</span>}
          </span>
        );
      },
    },
    {
      id: "acoes",
      header: "",
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => {
        const r = row.original;
        return (
          <div className="whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
            <Button size="sm" onClick={() => openPay(r)}><Check className="h-3 w-3" /> Pagar</Button>
            {r.source === "MANUAL" && (
              <Button variant="destructive" size="icon-xs" onClick={() => remove(r.id)} title="Excluir" className="ml-2"><Trash2 className="h-3.5 w-3.5" /></Button>
            )}
          </div>
        );
      },
    },
  ], [language, accounts]);

  const notOverdue = Math.max(0, (summary.totalOutstanding || 0) - (summary.overdueAmount || 0));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-semibold text-white flex items-center gap-2">
          <Receipt className="w-6 h-6 text-brand-gold" /> Contas a Pagar
        </h2>
      </div>

      {/* Infográfico + tabela num box só */}
      <Card className="py-0">
        <CardContent className="space-y-4 p-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="py-0">
            <CardContent className="p-4">
              <div className="text-xs text-gray-400 mb-1">Total a pagar</div>
              <div className="text-xl font-bold text-white"><Money value={summary.totalOutstanding} lang="pt-BR" /></div>
              <div className="text-xs text-gray-500 mt-1">{summary.count} título(s) em aberto</div>
            </CardContent>
          </Card>
          <Card className="border-red-500/40 bg-red-500/10 py-0">
            <CardContent className="p-4">
              <div className="text-xs text-red-300 mb-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Vencidas</div>
              <div className="text-xl font-bold text-red-200"><Money value={summary.overdueAmount} lang="pt-BR" /></div>
              <div className="text-xs text-red-300/70 mt-1">{summary.overdueCount} título(s) vencido(s)</div>
            </CardContent>
          </Card>
          <Card className="py-0">
            <CardContent className="p-3">
              <div className="mb-1 text-[11px] text-gray-400">Vencidas × A vencer</div>
              {(summary.totalOutstanding || 0) > 0
                ? <CompositionDonut height={100} items={[
                    { label: "Vencidas", value: summary.overdueAmount || 0, color: "#f87171" },
                    { label: "A vencer", value: notOverdue, color: "#34d399" },
                  ].filter((i) => i.value > 0)} />
                : <div className="py-4 text-center text-xs text-gray-600">nada em aberto</div>}
            </CardContent>
          </Card>
          <Card className="py-0">
            <CardContent className="flex flex-col justify-center p-4">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300">
                <input type="checkbox" checked={onlyOverdue} onChange={(e) => setOnlyOverdue(e.target.checked)} className="h-4 w-4 accent-brand-gold" />
                Mostrar somente vencidas
              </label>
            </CardContent>
          </Card>
        </div>

        {/* Tabela TanStack: busca instantânea, ordenação por urgência e paginação */}
        <div className="border-t border-gray-800 pt-4">
          <DataTable
            columns={columns}
            data={rows}
            loading={loading}
            pageSize={15}
            searchPlaceholder="Buscar por descrição ou fornecedor..."
            emptyText="Nenhuma conta a pagar."
            headerEnd={
              <div className="flex gap-2">
                <Button onClick={() => setShowNew(true)}><Plus className="w-3.5 h-3.5" /> Novo título</Button>
                <Button variant="outline" onClick={load}><RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Atualizar</Button>
              </div>
            }
          />
        </div>
        </CardContent>
      </Card>

      <Modal isOpen={showNew} onClose={() => setShowNew(false)} title="Novo título a pagar">
        <form onSubmit={save} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Descrição *</label>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full bg-[#171717] border border-gray-700 rounded-lg px-3 py-2 text-white outline-none focus:border-brand-gold" placeholder="Ex.: Aluguel, energia, fornecedor X" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Valor *</label>
              <input type="number" step="0.01" min="0" value={form.amountUsd} onChange={(e) => setForm({ ...form, amountUsd: e.target.value })} className="w-full bg-[#171717] border border-gray-700 rounded-lg px-3 py-2 text-white outline-none focus:border-brand-gold" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Vencimento</label>
              <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="w-full bg-[#171717] border border-gray-700 rounded-lg px-3 py-2 text-white outline-none focus:border-brand-gold" />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Observações</label>
            <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full bg-[#171717] border border-gray-700 rounded-lg px-3 py-2 text-white outline-none focus:border-brand-gold" />
          </div>
          {error && <div className="text-sm text-red-400">{error}</div>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setShowNew(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!payModal} onClose={() => setPayModal(null)} title="Pagar título">
        {payModal && (
          <div className="space-y-4">
            <Card className="py-0">
              <CardContent className="p-3 text-sm">
                <div className="text-gray-300">{payModal.description}</div>
                <div className="mt-1 text-gray-400">Valor a quitar: <span className="font-bold text-white"><Money value={payModal.outstanding} lang="pt-BR" /></span></div>
              </CardContent>
            </Card>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Sai de qual conta? *</label>
              <select value={payAccountId} onChange={(e) => setPayAccountId(e.target.value)} className="w-full bg-[#171717] border border-gray-700 rounded-lg px-3 py-2 text-white outline-none focus:border-brand-gold">
                <option value="">— escolher conta —</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name} · {a.currency || "BRL"} · saldo {Number(a.currentBalance).toFixed(2)}{(a.currency || "BRL") !== "BRL" ? " (debita convertido no câmbio do dia)" : ""}</option>)}
              </select>
              {accounts.length === 0 && <p className="mt-1 text-[11px] text-amber-300">Nenhuma conta cadastrada. Crie em Financeiro.</p>}
            </div>
            {error && <div className="text-sm text-red-400">{error}</div>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setPayModal(null)}>Cancelar</Button>
              <Button type="button" onClick={confirmPay} disabled={paying || !payAccountId}>{paying ? "Pagando..." : "Confirmar pagamento"}</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
