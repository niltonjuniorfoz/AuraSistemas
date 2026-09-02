import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { HandCoins, AlertTriangle, RefreshCw, MessageCircle } from "lucide-react";
import { apiFetch } from "../lib/api";
import { Money } from "../components/Money";
import { formatDate, useAdminTranslation } from "../lib/i18n";
import { DataTable } from "../components/DataTable";
import type { ColumnDef } from "@tanstack/react-table";
import { CompositionDonut } from "../components/charts";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";

export function Receivables() {
  const { language } = useAdminTranslation();
  const navigate = useNavigate();
  const [rows, setRows] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({ count: 0, totalOutstanding: 0, overdueCount: 0, overdueAmount: 0 });
  const [loading, setLoading] = useState(false);
  const [onlyOverdue, setOnlyOverdue] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/receivables${onlyOverdue ? "?overdue=true" : ""}`);
      const data = await res.json();
      setRows(Array.isArray(data.data) ? data.data : []);
      setSummary(data.summary || {});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [onlyOverdue]);

  // Colunas (TanStack): a busca do DataTable substitui o filtro manual antigo.
  const columns = useMemo<ColumnDef<any>[]>(() => [
    {
      accessorKey: "customerName",
      header: "Cliente",
      cell: ({ getValue }) => getValue() ? <span className="font-medium text-gray-200">{String(getValue())}</span> : <span className="text-gray-500">Sem cliente</span>,
    },
    {
      id: "nota",
      header: "Nota",
      accessorFn: (r: any) => `${r.series}-${String(r.number).padStart(6, "0")}`,
      cell: ({ getValue }) => <span className="font-mono text-xs text-gray-400">{String(getValue())}</span>,
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
      // ordena por urgência: vencidas (negativas) primeiro, sem vencimento por último
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
            {r.paymentStatus === "PARTIAL" && <span className="ml-2 text-xs text-blue-300">(parcial)</span>}
            {r.customerOverLimit && <Badge variant="warning" className="ml-2">Limite excedido</Badge>}
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
        const openWhatsApp = () => {
          const phone = String(r.customerPhone || "").replace(/\D/g, "");
          if (!phone) return;
          const firstName = (r.customerName || "Cliente").split(" ")[0];
          const nota = `${r.series}-${String(r.number).padStart(6, "0")}`;
          const dias = r.overdue ? Math.abs(r.daysToDue) : 0;
          const valor = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(r.outstanding || 0);
          const message = encodeURIComponent(`Olá ${firstName}! Identificamos uma pendência de ${valor} na nota ${nota}, vencida há ${dias} dia(s). Poderia regularizar quando possível? Qualquer dúvida estamos à disposição!`);
          window.open(`https://wa.me/55${phone}?text=${message}`, "_blank");
        };
        return (
          <div className="flex justify-end gap-2">
            {r.overdue && r.customerPhone && (
              <Button size="icon-sm" onClick={openWhatsApp} title="Cobrar via WhatsApp">
                <MessageCircle className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button size="sm" onClick={() => navigate(`/cash?saleId=${r.id}`)}>Receber</Button>
          </div>
        );
      },
    },
  ], [language, navigate]);

  const notOverdue = Math.max(0, (summary.totalOutstanding || 0) - (summary.overdueAmount || 0));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-semibold text-white flex items-center gap-2">
          <HandCoins className="w-6 h-6 text-brand-gold" /> Contas a Receber
        </h2>
        <Button variant="outline" onClick={load}><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Atualizar</Button>
      </div>

      {/* Infográfico + tabela num box só */}
      <Card className="py-0">
        <CardContent className="space-y-4 p-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="py-0">
            <CardContent className="p-3">
              <div className="text-xs text-gray-400 mb-1">Total a receber</div>
              <div className="text-xl font-bold text-white"><Money value={summary.totalOutstanding} lang="pt-BR" /></div>
              <div className="text-xs text-gray-500 mt-1">{summary.count} nota(s) em aberto</div>
            </CardContent>
          </Card>
          <Card className="border-red-500/40 bg-red-500/10 py-0">
            <CardContent className="p-3">
              <div className="text-xs text-red-300 mb-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Vencidas</div>
              <div className="text-xl font-bold text-red-200"><Money value={summary.overdueAmount} lang="pt-BR" /></div>
              <div className="text-xs text-red-300/70 mt-1">{summary.overdueCount} nota(s) vencida(s)</div>
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
            <CardContent className="flex flex-col justify-center p-3">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300">
                <input type="checkbox" checked={onlyOverdue} onChange={(e) => setOnlyOverdue(e.target.checked)} className="h-4 w-4 accent-brand-gold" />
                Mostrar somente vencidas
              </label>
            </CardContent>
          </Card>
        </div>

        {/* Tabela TanStack: busca instantânea, ordenação (Situação ordena por urgência) e paginação */}
        <div className="border-t border-gray-800 pt-4">
          <DataTable
            columns={columns}
            data={rows}
            loading={loading}
            pageSize={15}
            searchPlaceholder="Buscar por cliente ou número da nota..."
            emptyText="Nenhuma conta a receber."
          />
        </div>
        </CardContent>
      </Card>
    </div>
  );
}
