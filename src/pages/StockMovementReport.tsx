import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowUpFromLine,
  Boxes,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  RotateCcw,
  Search,
  ShieldCheck,
} from "lucide-react";
import { useNavigate } from "react-router";
import { apiFetch } from "../lib/api";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";

const movementLabels: Record<string, string> = {
  INITIAL_ENTRY: "Estoque inicial",
  PURCHASE: "Entrada por compra",
  MANUAL_ENTRY: "Entrada manual",
  MANUAL_EXIT: "Saída manual",
  MANUAL_ADJUSTMENT: "Ajuste manual",
  OUT_DELIVERY: "Saída por entrega",
  RESERVE_SALE: "Reserva de venda",
  CANCEL_RESERVATION: "Liberação de reserva",
  RETURN_CANCEL_SALE: "Retorno por cancelamento",
  RETURN_SALE: "Devolução de venda",
  EDIT_SALE_RELEASE_RESERVATION: "Liberação por edição",
  EDIT_SALE_RESERVE_STOCK: "Reserva por edição",
};

const directionLabels: Record<string, string> = {
  ENTRY: "Entrada",
  EXIT: "Saída",
  RESERVATION: "Reserva",
  RELEASE: "Liberação",
  NO_CHANGE: "Registro",
};

const directionClasses: Record<string, string> = {
  ENTRY: "stock-movement-badge stock-movement-entry",
  EXIT: "stock-movement-badge stock-movement-exit",
  RESERVATION: "stock-movement-badge stock-movement-reservation",
  RELEASE: "stock-movement-badge stock-movement-release",
  NO_CHANGE: "stock-movement-badge stock-movement-neutral",
};

// A cor real vem das classes stock-movement-* (CSS puro fora de @layer, sempre vence os utilitários do Badge) — o variant aqui só afeta data-attribute/anel de foco, não bg/texto.
function movementBadgeVariant(direction: string): "success" | "destructive" | "info" | "caution" | "secondary" {
  switch (direction) {
    case "ENTRY":
      return "success";
    case "EXIT":
      return "destructive";
    case "RESERVATION":
      return "info";
    case "RELEASE":
      return "caution";
    default:
      return "secondary"; // NO_CHANGE
  }
}

const today = () => new Date().toISOString().split("T")[0];
const monthStart = () => {
  const date = new Date();
  date.setDate(1);
  return date.toISOString().split("T")[0];
};

function formatDateTime(value: string) {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

export function StockMovementReport() {
  const navigate = useNavigate();
  const [dateFrom, setDateFrom] = useState(monthStart);
  const [dateTo, setDateTo] = useState(today);
  const [productId, setProductId] = useState("");
  const [direction, setDirection] = useState("ALL");
  const [movementType, setMovementType] = useState("");
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<any[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [summary, setSummary] = useState({ movements: 0, entries: 0, exits: 0, reservations: 0, releases: 0 });
  const [movementTypes, setMovementTypes] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(50);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const sortedProducts = useMemo(
    () => [...products].sort((a, b) => String(a.name).localeCompare(String(b.name), "pt-BR")),
    [products],
  );

  useEffect(() => {
    loadProducts();
    fetchData(1);
  }, []);

  const loadProducts = async () => {
    try {
      const res = await apiFetch("/api/products?limit=2000&page=1");
      const data = await res.json().catch(() => ({}));
      if (res.ok) setProducts(Array.isArray(data?.data) ? data.data : []);
    } catch {
      setProducts([]);
    }
  };

  const buildQuery = (requestedPage = page, requestedLimit = limit, overrides: Record<string, string> = {}) => {
    const values = { dateFrom, dateTo, productId, direction, movementType, search, ...overrides };
    const qs = new URLSearchParams({ page: String(requestedPage), limit: String(requestedLimit) });
    if (values.dateFrom) qs.set("dateFrom", values.dateFrom);
    if (values.dateTo) qs.set("dateTo", values.dateTo);
    if (values.productId) qs.set("productId", values.productId);
    if (values.direction !== "ALL") qs.set("direction", values.direction);
    if (values.movementType) qs.set("movementType", values.movementType);
    if (values.search.trim()) qs.set("q", values.search.trim());
    return qs;
  };

  const fetchData = async (requestedPage = 1, overrides: Record<string, string> = {}) => {
    const effectiveFrom = overrides.dateFrom ?? dateFrom;
    const effectiveTo = overrides.dateTo ?? dateTo;
    if (effectiveFrom && effectiveTo && effectiveFrom > effectiveTo) {
      setError("A data inicial não pode ser posterior à data final.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch(`/api/reports/stock-movements?${buildQuery(requestedPage, limit, overrides).toString()}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Erro ao carregar a movimentação de produtos.");
        return;
      }
      setRows(Array.isArray(data.data) ? data.data : []);
      setSummary(data.summary || { movements: 0, entries: 0, exits: 0, reservations: 0, releases: 0 });
      setMovementTypes(Array.isArray(data.movementTypes) ? data.movementTypes : []);
      setTotal(Number(data.total || 0));
      setPage(Number(data.page || requestedPage));
    } catch {
      setError("Não foi possível conectar ao relatório de movimentação.");
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    const defaults = { dateFrom: monthStart(), dateTo: today(), productId: "", direction: "ALL", movementType: "", search: "" };
    setDateFrom(defaults.dateFrom);
    setDateTo(defaults.dateTo);
    setProductId(defaults.productId);
    setDirection(defaults.direction);
    setMovementType(defaults.movementType);
    setSearch(defaults.search);
    fetchData(1, defaults);
  };

  const exportCsv = async () => {
    setExporting(true);
    setError("");
    try {
      const res = await apiFetch(`/api/reports/stock-movements?${buildQuery(1, 5000).toString()}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Erro ao exportar movimentações.");
        return;
      }
      const exportRows = Array.isArray(data.data) ? data.data : [];
      const header = [
        "Data",
        "SKU",
        "Produto",
        "Movimento",
        "Direção",
        "Quantidade física",
        "Estoque físico antes",
        "Estoque físico depois",
        "Quantidade reservada",
        "Reservado antes",
        "Reservado depois",
        "Motivo",
        "Observações",
        "Usuário",
        "Referência",
      ];
      const lines = [header.map(csvCell).join(";")];
      exportRows.forEach((row: any) => {
        lines.push([
          formatDateTime(row.createdAt),
          row.sku,
          row.productName,
          movementLabels[row.movementType] || row.movementType,
          directionLabels[row.direction] || row.direction,
          row.physicalDelta,
          row.beforePhysical,
          row.afterPhysical,
          row.reservedDelta,
          row.beforeReserved,
          row.afterReserved,
          row.reason,
          row.notes,
          row.userName,
          row.referenceId,
        ].map(csvCell).join(";"));
      });
      const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `movimentacao-produtos-${dateFrom || "inicio"}-${dateTo || "fim"}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Não foi possível gerar o arquivo CSV.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="stock-movement-page space-y-4">
      <div className="stock-movement-header flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/reports")}
            title="Voltar"
            className="rounded-full bg-gray-800 text-gray-400 hover:bg-gray-800 hover:text-white dark:hover:bg-gray-800"
          >
            <ArrowLeft className="size-5" />
          </Button>
          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl font-semibold text-white">Movimentação de Produtos</h2>
            <p className="text-xs text-gray-500 mt-0.5">Entradas, saídas, reservas, devoluções e ajustes de estoque.</p>
          </div>
        </div>
        <Button
          variant="outline"
          disabled={exporting || loading}
          className="stock-export-button border-gray-700 bg-brand-navylight text-gray-200 hover:border-primary hover:bg-brand-navylight hover:text-gray-200 dark:border-gray-700 dark:bg-brand-navylight dark:hover:bg-brand-navylight"
          onClick={exportCsv}
        >
          {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
          Exportar CSV
        </Button>
      </div>

      <Card className="stock-movement-filters py-0 border-gray-800 bg-[#171717] rounded-xl">
      <CardContent className="grid grid-cols-2 items-end gap-2.5 p-3 md:grid-cols-3 xl:grid-cols-7">
        <div className="min-w-0">
          <label>Data inicial</label>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <div className="min-w-0">
          <label>Data final</label>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
        <div className="stock-filter-product min-w-0">
          <label>Produto</label>
          <select value={productId} onChange={(e) => setProductId(e.target.value)}>
            <option value="">Todos os produtos</option>
            {sortedProducts.map((product) => (
              <option key={product.id} value={product.id}>{product.sku} — {product.name}</option>
            ))}
          </select>
        </div>
        <div className="min-w-0">
          <label>Movimentação</label>
          <select value={direction} onChange={(e) => setDirection(e.target.value)}>
            <option value="ALL">Todas</option>
            <option value="ENTRY">Entradas</option>
            <option value="EXIT">Saídas</option>
            <option value="RESERVATION">Reservas</option>
            <option value="RELEASE">Liberações</option>
            <option value="ADJUSTMENT">Ajustes</option>
          </select>
        </div>
        <div className="min-w-0">
          <label>Origem</label>
          <select value={movementType} onChange={(e) => setMovementType(e.target.value)}>
            <option value="">Todas as origens</option>
            {movementTypes.map((type) => <option key={type} value={type}>{movementLabels[type] || type}</option>)}
          </select>
        </div>
        <div className="stock-filter-search min-w-0">
          <label>Busca rápida</label>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="SKU, produto ou motivo" onKeyDown={(e) => e.key === "Enter" && fetchData(1)} />
        </div>
        <div className="stock-filter-actions flex gap-2">
          <Button variant="ghost" className="stock-search-button" onClick={() => fetchData(1)}>
            <Search className="size-4" /> Buscar
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="stock-clear-button hover:bg-transparent dark:hover:bg-transparent"
            title="Limpar filtros"
            onClick={clearFilters}
          >
            <RotateCcw className="size-4" />
          </Button>
        </div>
      </CardContent>
      </Card>

      {error && (
        <Card className="rounded-lg border-red-500/30 bg-red-500/10 py-0 text-sm text-red-300">
          <CardContent className="px-3 py-2">{error}</CardContent>
        </Card>
      )}

      <div className="stock-summary-grid grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="stock-summary-card"><Boxes /><div><span>Movimentos</span><strong>{summary.movements}</strong></div></div>
        <div className="stock-summary-card stock-summary-entry"><ArrowDownToLine /><div><span>Entradas</span><strong>+{summary.entries}</strong></div></div>
        <div className="stock-summary-card stock-summary-exit"><ArrowUpFromLine /><div><span>Saídas</span><strong>-{summary.exits}</strong></div></div>
        <div className="stock-summary-card stock-summary-reserved"><ShieldCheck /><div><span>Reservas / liberações</span><strong>{summary.reservations} / {summary.releases}</strong></div></div>
      </div>

      <Card className="stock-movement-table-card overflow-hidden py-0">
      <CardContent className="p-0">
        <div className="stock-movement-desktop overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#171717] text-gray-500 text-xs uppercase">
              <tr>
                <th>Data</th><th>Produto</th><th>Tipo</th><th className="text-center">Qtd.</th><th>Físico</th><th>Reservado</th><th>Motivo / usuário</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/70">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-10 text-gray-500"><Loader2 className="w-5 h-5 animate-spin inline mr-2" />Carregando...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-gray-500">Nenhuma movimentação encontrada.</td></tr>
              ) : rows.map((row) => (
                <tr key={row.id} className="hover:bg-brand-navy/45">
                  <td className="whitespace-nowrap text-gray-400">{formatDateTime(row.createdAt)}</td>
                  <td><div className="font-medium text-white">{row.productName}</div><div className="font-mono text-[11px] text-gray-500">{row.sku}</div></td>
                  <td><Badge variant={movementBadgeVariant(row.direction)} className={directionClasses[row.direction] || directionClasses.NO_CHANGE}>{directionLabels[row.direction] || "Registro"}</Badge><div className="text-[11px] text-gray-500 mt-1">{movementLabels[row.movementType] || row.movementType}</div></td>
                  <td className={`text-center font-bold ${row.physicalDelta > 0 ? "text-green-400" : row.physicalDelta < 0 ? "text-red-400" : "text-blue-300"}`}>{row.physicalDelta !== 0 ? `${row.physicalDelta > 0 ? "+" : ""}${row.physicalDelta}` : `${row.reservedDelta > 0 ? "+" : ""}${row.reservedDelta} res.`}</td>
                  <td className="font-mono text-xs whitespace-nowrap">{row.beforePhysical} → <strong className="text-white">{row.afterPhysical}</strong></td>
                  <td className="font-mono text-xs whitespace-nowrap">{row.beforeReserved} → <strong className="text-white">{row.afterReserved}</strong></td>
                  <td><div className="text-gray-300 line-clamp-1">{row.reason || row.notes || "—"}</div><div className="text-[11px] text-gray-500 mt-1">{row.userName || "Usuário"}{row.referenceId ? ` · Ref. ${String(row.referenceId).slice(0, 8)}` : ""}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="stock-movement-mobile">
          {loading ? <div className="py-10 text-center text-gray-500"><Loader2 className="w-5 h-5 animate-spin inline mr-2" />Carregando...</div> : rows.length === 0 ? <div className="py-10 text-center text-gray-500">Nenhuma movimentação encontrada.</div> : rows.map((row) => (
            <div key={row.id} className="stock-movement-mobile-card">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0"><div className="font-semibold text-white truncate">{row.productName}</div><div className="font-mono text-[10px] text-gray-500">{row.sku} · {formatDateTime(row.createdAt)}</div></div>
                <Badge variant={movementBadgeVariant(row.direction)} className={directionClasses[row.direction] || directionClasses.NO_CHANGE}>{directionLabels[row.direction] || "Registro"}</Badge>
              </div>
              <div className="stock-mobile-values">
                <div><span>Quantidade</span><strong className={row.physicalDelta > 0 ? "text-green-400" : row.physicalDelta < 0 ? "text-red-400" : "text-blue-300"}>{row.physicalDelta !== 0 ? `${row.physicalDelta > 0 ? "+" : ""}${row.physicalDelta}` : `${row.reservedDelta > 0 ? "+" : ""}${row.reservedDelta} res.`}</strong></div>
                <div><span>Físico</span><strong>{row.beforePhysical} → {row.afterPhysical}</strong></div>
                <div><span>Reservado</span><strong>{row.beforeReserved} → {row.afterReserved}</strong></div>
              </div>
              <div className="text-[11px] text-gray-400"><span className="text-gray-500">{movementLabels[row.movementType] || row.movementType}</span>{row.reason || row.notes ? ` · ${row.reason || row.notes}` : ""}</div>
              <div className="text-[10px] text-gray-600 mt-1">{row.userName || "Usuário"}{row.referenceId ? ` · Ref. ${String(row.referenceId).slice(0, 8)}` : ""}</div>
            </div>
          ))}
        </div>

        <div className="stock-pagination flex items-center justify-between gap-3 border-t border-gray-800 px-3 py-2 text-xs text-gray-500">
          <span>{total === 0 ? "0 registros" : `${(page - 1) * limit + 1}–${Math.min(page * limit, total)} de ${total}`}</span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-transparent dark:hover:bg-transparent"
              disabled={page <= 1 || loading}
              onClick={() => fetchData(page - 1)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span>Página {page} de {totalPages}</span>
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-transparent dark:hover:bg-transparent"
              disabled={page >= totalPages || loading}
              onClick={() => fetchData(page + 1)}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </CardContent>
      </Card>
    </div>
  );
}
