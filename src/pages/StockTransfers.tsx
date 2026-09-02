import React, { useEffect, useState } from "react";
import {
  ArrowRight,
  ArrowRightLeft,
  Check,
  CheckCircle2,
  Camera,
  Download,
  Eye,
  FileImage,
  MapPin,
  PackagePlus,
  Paperclip,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Truck,
  Upload,
  X,
} from "lucide-react";
import { apiFetch, extractList } from "../lib/api";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { cn } from "../lib/utils";

function transferBadgeVariant(status: string): "secondary" | "info" | "success" | "warning" | "destructive" {
  switch (status) {
    case "IN_TRANSIT": return "info";
    case "RECEIVED": return "success";
    case "PARTIAL": return "warning";
    case "DIVERGENT": return "destructive";
    default: return "secondary"; // DRAFT, CANCELED
  }
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function toDateInput(value?: string | null) {
  return value ? String(value).slice(0, 10) : "";
}

function formatDate(value?: string | null) {
  if (!value) return "Sem data";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "Sem data" : d.toLocaleDateString("pt-BR");
}

function formatFileSize(value?: number | null) {
  const bytes = Number(value || 0);
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isPdfInvoice(value: any) {
  return String(value?.invoiceFileType || "").toLowerCase().includes("pdf");
}

function isLate(row: any) {
  if (row.status !== "IN_TRANSIT" || !row.expectedAt) return false;
  return toDateInput(row.expectedAt) < todayIso();
}

type TransferItemForm = {
  clientId: string;
  productId: string;
  productName: string;
  sku: string;
  isManual: boolean;
  quantitySent: number;
  lotSent: string;
};

const initialForm = () => ({
  title: "",
  origin: "Paraguai",
  destination: "",
  carrier: "",
  departureAt: todayIso(),
  expectedAt: "",
  notes: "",
});

export function StockTransfers() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("IN_TRANSIT");
  const [search, setSearch] = useState("");

  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [items, setItems] = useState<TransferItemForm[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [productResults, setProductResults] = useState<any[]>([]);
  const [productLoading, setProductLoading] = useState(false);
  const [transferInvoiceFile, setTransferInvoiceFile] = useState<File | null>(null);
  const [invoicePreview, setInvoicePreview] = useState<any | null>(null);

  const [receiving, setReceiving] = useState<any | null>(null);
  const [receiptItems, setReceiptItems] = useState<any[]>([]);
  const [receiptNotes, setReceiptNotes] = useState("");
  const [differenceItemIds, setDifferenceItemIds] = useState<string[]>([]);
  const [details, setDetails] = useState<any | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status, q: search.trim() });
      const res = await apiFetch(`/api/transfers?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao carregar transferências.");
      setRows(extractList(data));
    } catch (error: any) {
      alert(error.message || "Erro ao carregar transferências.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(load, 250);
    return () => window.clearTimeout(timer);
  }, [status, search]);

  useEffect(() => {
    if (!showNew || !productSearch.trim()) {
      setProductResults([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      setProductLoading(true);
      try {
        const res = await apiFetch(`/api/products/search?q=${encodeURIComponent(productSearch.trim())}&limit=12`);
        const data = await res.json();
        setProductResults(extractList(data));
      } finally {
        setProductLoading(false);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [productSearch, showNew]);

  const openNew = () => {
    setForm(initialForm());
    setItems([]);
    setProductSearch("");
    setProductResults([]);
    setTransferInvoiceFile(null);
    setShowNew(true);
  };

  const makeTransferItem = (product: any): TransferItemForm => ({
    clientId: `${product.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    productId: product.id,
    productName: product.name,
    sku: product.sku || "",
    isManual: false,
    quantitySent: 1,
    lotSent: "",
  });

  const addProduct = (product: any) => {
    setItems((current) => [...current, makeTransferItem(product)]);
    setProductSearch("");
    setProductResults([]);
  };

  const addManualProduct = () => {
    const productName = productSearch.trim();
    if (!productName) return;
    setItems((current) => [...current, {
      clientId: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      productId: "",
      productName,
      sku: "",
      isManual: true,
      quantitySent: 1,
      lotSent: "",
    }]);
    setProductSearch("");
    setProductResults([]);
  };

  const addAnotherLot = (item: TransferItemForm) => {
    setItems((current) => [...current, {
      ...item,
      clientId: `${item.productId || "manual"}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      quantitySent: 1,
      lotSent: "",
    }]);
  };

  const updateItem = (clientId: string, patch: Partial<TransferItemForm>) => {
    setItems((current) => current.map((item) => item.clientId === clientId ? { ...item, ...patch } : item));
  };

  const selectInvoiceFile = (file: File | null, input?: HTMLInputElement) => {
    if (input) input.value = "";
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      alert("A nota deve ter no máximo 4 MB.");
      return;
    }
    setTransferInvoiceFile(file);
  };

  const uploadTransferInvoice = async (transferId: string, file: File) => {
    const payload = new FormData();
    payload.append("file", file);
    const res = await apiFetch(`/api/transfers/${transferId}/invoice`, {
      method: "POST",
      body: payload,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Erro ao salvar a nota da transferência.");
    return data;
  };

  const loadTransfer = async (id: string) => {
    const res = await apiFetch(`/api/transfers/${id}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Erro ao carregar a transferência.");
    return data;
  };

  const openDetails = async (row: any) => {
    try {
      setDetails(await loadTransfer(row.id));
    } catch (error: any) {
      alert(error.message || "Erro ao carregar a transferência.");
    }
  };

  const downloadInvoice = (transfer: any) => {
    if (!transfer?.invoiceFilePath) return;
    const link = document.createElement("a");
    link.href = transfer.invoiceFilePath;
    link.download = transfer.invoiceFileName || "nota-transferencia";
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const createTransfer = async () => {
    if (!form.destination.trim()) return alert("Informe o destino da mercadoria.");
    if (!items.length) return alert("Adicione pelo menos um produto.");
    for (const item of items) {
      if (!item.productName.trim()) return alert("Informe o nome do produto.");
      if (!item.quantitySent || item.quantitySent <= 0) return alert(`Informe a quantidade de ${item.productName}.`);
    }

    setSaving(true);
    try {
      const res = await apiFetch("/api/transfers", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          items: items.map((item) => ({
            productId: item.productId || null,
            productName: item.productName.trim(),
            quantitySent: item.quantitySent,
            lotSent: item.lotSent,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao criar transferência.");
      if (transferInvoiceFile) {
        try {
          await uploadTransferInvoice(data.id, transferInvoiceFile);
        } catch (uploadError: any) {
          alert(`A transferência ${data.code || ""} foi salva, mas a nota não foi anexada. ${uploadError.message || ""}`.trim());
        }
      }
      setTransferInvoiceFile(null);
      setShowNew(false);
      await load();
    } catch (error: any) {
      alert(error.message || "Erro ao criar transferência.");
    } finally {
      setSaving(false);
    }
  };

  const openReceive = async (row: any) => {
    try {
      const transfer = await loadTransfer(row.id);
      setReceiving(transfer);
      setReceiptNotes("");
      setDifferenceItemIds([]);
      setReceiptItems((transfer.items || []).map((item: any) => ({
        ...item,
        lotReceived: item.lotSent || "",
        quantityReceived: Number(item.quantitySent || 0),
        quantityDamaged: 0,
        notes: "",
      })));
    } catch (error: any) {
      alert(error.message || "Erro ao carregar a transferência.");
    }
  };

  const resetReceiptItem = (id: string) => {
    setReceiptItems((current) => current.map((item) => item.id === id ? {
      ...item,
      lotReceived: item.lotSent || "",
      quantityReceived: Number(item.quantitySent || 0),
      quantityDamaged: 0,
    } : item));
    setDifferenceItemIds((current) => current.filter((itemId) => itemId !== id));
  };

  const toggleReceiptDifference = (id: string) => {
    setDifferenceItemIds((current) => current.includes(id)
      ? current.filter((itemId) => itemId !== id)
      : [...current, id]);
  };

  const receiptItemHasDifference = (item: any) => {
    const sent = Number(item.quantitySent || 0);
    const received = Number(item.quantityReceived || 0);
    const damaged = Number(item.quantityDamaged || 0);
    const sentLot = String(item.lotSent || "").trim();
    const receivedLot = String(item.lotReceived || "").trim();
    return received + damaged !== sent || damaged > 0 || (!!sentLot && sentLot !== receivedLot);
  };

  const updateReceiptItem = (id: string, patch: any) => {
    setReceiptItems((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
  };

  const confirmReceipt = async () => {
    if (!receiving) return;
    for (const item of receiptItems) {
      const received = Number(item.quantityReceived || 0);
      const damaged = Number(item.quantityDamaged || 0);
      if (received < 0 || damaged < 0 || received + damaged > Number(item.quantitySent || 0)) {
        return alert(`Confira as quantidades de ${item.productName}.`);
      }
    }

    setSaving(true);
    try {
      const res = await apiFetch(`/api/transfers/${receiving.id}/receive`, {
        method: "POST",
        body: JSON.stringify({
          receiptNotes,
          items: receiptItems.map((item) => ({
            id: item.id,
            lotReceived: item.lotReceived,
            quantityReceived: Number(item.quantityReceived || 0),
            quantityDamaged: Number(item.quantityDamaged || 0),
            notes: item.notes,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao conferir chegada.");
      setReceiving(null);
      await load();
    } catch (error: any) {
      alert(error.message || "Erro ao conferir chegada.");
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    ["IN_TRANSIT", "Em trânsito"],
    ["RECEIVED", "Recebidas"],
  ];

  const hasReceiptDifference = receiptItems.some(receiptItemHasDifference);

  return (
    <div className="stock-transfers-page space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
            <ArrowRightLeft className="h-5 w-5 text-brand-gold" /> Transferências
          </h1>
          <p className="text-sm text-gray-500">Registre a saída, acompanhe o trajeto e confira a chegada por produto e lote.</p>
        </div>
      </div>


      <Card className="py-0">
      <CardContent className="space-y-4 p-4">
      {(() => {
        const late = rows.filter(isLate).length;
        const units = rows.reduce((s, r) => s + (Number(r.totalUnits) || 0), 0);
        const withDiff = rows.filter((r) => ["PARTIAL", "DIVERGENT"].includes(r.status)).length;
        return (
          <div className="grid grid-cols-3 gap-3">
            <Card className="py-0 shadow-md border-gray-700 bg-brand-navylight">
              <CardContent className="p-4">
                <div className="text-[11px] text-gray-400 mb-1">{status === "IN_TRANSIT" ? "Na estrada" : "Nesta aba"}</div>
                <div className="text-xl font-black text-white">{rows.length} <span className="text-xs font-normal text-gray-500">transferência(s)</span></div>
                <div className="text-[10px] text-gray-500">{units.toLocaleString("pt-BR")} unidade(s)</div>
              </CardContent>
            </Card>
            <Card className={cn("py-0 shadow-md border-gray-700 bg-brand-navylight", late > 0 && "border-red-500/40 bg-red-500/10")}>
              <CardContent className="p-4">
                <div className="text-[11px] text-gray-400 mb-1">Atrasadas</div>
                <div className={`text-xl font-black ${late > 0 ? "text-red-300" : "text-emerald-300"}`}>{late}</div>
                <div className="text-[10px] text-gray-500">{late > 0 ? "passaram da previsão" : "tudo no prazo"}</div>
              </CardContent>
            </Card>
            <Card className={cn("py-0 shadow-md border-gray-700 bg-brand-navylight", withDiff > 0 && "border-amber-500/40 bg-amber-500/10")}>
              <CardContent className="p-4">
                <div className="text-[11px] text-gray-400 mb-1">Com diferença</div>
                <div className={`text-xl font-black ${withDiff > 0 ? "text-amber-300" : "text-white"}`}>{withDiff}</div>
                <div className="text-[10px] text-gray-500">{withDiff > 0 ? "conferência achou divergência" : "sem divergências"}</div>
              </CardContent>
            </Card>
          </div>
        );
      })()}

      <div className="border-t border-gray-800 pt-4">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-gray-700 bg-brand-navylight px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-gray-500" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar título, código, origem, destino ou freteiro..." className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none" />
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" className="border-gray-700 bg-[#171717] text-gray-300 hover:border-primary hover:bg-[#171717] hover:text-primary dark:border-gray-700 dark:bg-[#171717] dark:hover:bg-[#171717]" onClick={load}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Atualizar
            </Button>
            <Button className="font-bold" onClick={openNew}>
              <Plus className="h-4 w-4" /> Nova transferência
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {tabs.map(([key, label]) => (
            <Button
              key={key}
              variant={status === key ? "default" : "outline"}
              className={status === key ? "font-bold" : "border-gray-700 bg-brand-navylight font-bold text-gray-400 hover:bg-brand-navylight hover:text-white dark:border-gray-700 dark:bg-brand-navylight dark:hover:bg-brand-navylight"}
              onClick={() => setStatus(key)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2 border-t border-gray-800 pt-4">
        {rows.map((row) => (
          <Card key={row.id} className={cn("py-0 border-gray-700 bg-brand-navylight", isLate(row) && "border-red-500/40")}>
          <CardContent className="p-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="max-w-full truncate text-sm font-black text-white">{row.title || `${row.origin} → ${row.destination}`}</span>
                  <span className="text-[10px] font-semibold text-gray-500">{row.code}</span>
                  <Badge variant={transferBadgeVariant(row.status)}>{row.status === "IN_TRANSIT" ? "Em trânsito" : "Recebida"}</Badge>
                  {["PARTIAL", "DIVERGENT"].includes(row.status) && <Badge variant="warning">Com diferença</Badge>}
                  {row.status === "RECEIVED" && <Badge variant="success">Tudo certo</Badge>}
                  {isLate(row) && <span className="text-[10px] font-bold text-red-300">Atrasada</span>}
                </div>
                <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-sm text-gray-300">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-gray-500" />
                  <span className="truncate font-semibold">{row.origin}</span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-brand-gold" />
                  <span className="truncate font-semibold">{row.destination}</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                  <span>{row.totalProducts} item(ns)/lote(s) · {row.totalUnits} unidade(s)</span>
                  <span>Saída: {formatDate(row.departureAt)}</span>
                  <span>Previsão: {formatDate(row.expectedAt)}</span>
                  {row.carrier && <span>Freteiro: {row.carrier}</span>}
                  {row.hasInvoiceFile && <span className="inline-flex items-center gap-1 font-semibold text-sky-300"><Paperclip className="h-3 w-3" /> Nota anexada</span>}
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="outline" size="sm" className="text-xs font-bold hover:border-gray-500 hover:bg-transparent hover:text-gray-300 dark:hover:bg-transparent" onClick={() => openDetails(row)}>Detalhes</Button>
                {row.status === "IN_TRANSIT" && <Button size="sm" className="bg-emerald-500 text-xs font-bold text-white hover:bg-emerald-600" onClick={() => openReceive(row)}><CheckCircle2 className="size-3.5" /> Conferir</Button>}
              </div>
            </div>
          </CardContent>
          </Card>
        ))}
        {!loading && rows.length === 0 && <div className="rounded-xl border border-dashed border-gray-800 py-12 text-center text-sm text-gray-500">Nenhuma transferência encontrada.</div>}
      </div>
      </CardContent>
      </Card>

      {showNew && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/65 p-0 sm:items-center sm:p-4">
          <div className="flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl border border-gray-800 bg-brand-navylight shadow-2xl sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
              <div>
                <h2 className="text-lg font-bold text-white">Nova transferência</h2>
                <p className="text-xs text-gray-500">Informe o trajeto e os produtos. A cidade pode ser digitada livremente.</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowNew(false)} className="text-gray-400 hover:bg-gray-800 hover:text-white dark:hover:bg-gray-800"><X className="size-5" /></Button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              <label className="block space-y-1 text-xs font-semibold text-gray-400">Título / loja da nota <span className="font-normal text-gray-600">(opcional)</span>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex.: Atacado Paraguay — Nota 4521" className="w-full rounded-lg border border-gray-700 bg-brand-navylight px-3 py-2 text-sm text-white outline-none focus:border-brand-gold" />
              </label>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <label className="space-y-1 text-xs font-semibold text-gray-400">Origem
                  <input list="transfer-cities" value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })} className="w-full rounded-lg border border-gray-700 bg-brand-navylight px-3 py-2 text-sm text-white outline-none focus:border-brand-gold" />
                </label>
                <label className="space-y-1 text-xs font-semibold text-gray-400">Destino
                  <input list="transfer-cities" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} placeholder="Ex.: Rio de Janeiro" className="w-full rounded-lg border border-gray-700 bg-brand-navylight px-3 py-2 text-sm text-white outline-none focus:border-brand-gold" />
                </label>
                <label className="space-y-1 text-xs font-semibold text-gray-400">Freteiro (opcional)
                  <input value={form.carrier} onChange={(e) => setForm({ ...form, carrier: e.target.value })} className="w-full rounded-lg border border-gray-700 bg-brand-navylight px-3 py-2 text-sm text-white outline-none focus:border-brand-gold" />
                </label>
                <label className="space-y-1 text-xs font-semibold text-gray-400">Previsão (opcional)
                  <input type="date" value={form.expectedAt} onChange={(e) => setForm({ ...form, expectedAt: e.target.value })} className="w-full rounded-lg border border-gray-700 bg-brand-navylight px-3 py-2 text-sm text-white outline-none focus:border-brand-gold" />
                </label>
                <datalist id="transfer-cities">
                  <option value="Paraguai" /><option value="Ciudad del Este" /><option value="Assunção" /><option value="Foz do Iguaçu" /><option value="Rio de Janeiro" /><option value="São Paulo" />
                </datalist>
              </div>

              <div className="rounded-xl border border-gray-800 bg-brand-navylight p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm font-bold text-white"><FileImage className="h-4 w-4 text-sky-300" /> Foto ou PDF da nota <span className="text-xs font-normal text-gray-500">(opcional)</span></div>
                    <div className="mt-0.5 text-xs text-gray-500">Fica guardada na transferência para consultar durante a conferência.</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs font-bold text-sky-300 hover:bg-sky-500/15">
                      <Upload className="h-4 w-4" /> Escolher arquivo
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        className="hidden"
                        onChange={(e) => selectInvoiceFile(e.target.files?.[0] || null, e.currentTarget)}
                      />
                    </label>
                    <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500/15">
                      <Camera className="h-4 w-4" /> Tirar foto
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => selectInvoiceFile(e.target.files?.[0] || null, e.currentTarget)}
                      />
                    </label>
                  </div>
                </div>
                {transferInvoiceFile && (
                  <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-gray-800 bg-[#171717] px-3 py-2">
                    <div className="min-w-0"><div className="truncate text-xs font-bold text-white">{transferInvoiceFile.name}</div><div className="text-[11px] text-gray-500">{formatFileSize(transferInvoiceFile.size)}</div></div>
                    <Button type="button" variant="ghost" size="icon-xs" onClick={() => setTransferInvoiceFile(null)} title="Remover nota" className="text-red-300 hover:bg-red-500/10 hover:text-red-300 dark:hover:bg-red-500/10"><X className="size-4" /></Button>
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-gray-800 bg-brand-navylight p-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm font-bold text-white"><PackagePlus className="h-4 w-4 text-brand-gold" /> Adicionar produtos</div>
                  <Badge variant="info">Somente conferência — não altera estoque</Badge>
                </div>
                <div className="relative">
                  <div className="flex items-center gap-2 rounded-lg border border-gray-700 bg-[#171717] px-3 py-2">
                    <Search className="h-4 w-4 text-gray-500" />
                    <input value={productSearch} onChange={(e) => setProductSearch(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && productSearch.trim() && productResults.length === 0) { e.preventDefault(); addManualProduct(); } }} placeholder="Buscar produto ou digitar um nome novo..." className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none" />
                    {productLoading && <RefreshCw className="h-4 w-4 animate-spin text-gray-500" />}
                  </div>
                  {!!productSearch.trim() && (
                    <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-gray-700 bg-brand-navylight p-1 shadow-2xl">
                      {productResults.map((product) => (
                        <Button key={product.id} type="button" variant="ghost" onClick={() => addProduct(product)} className="h-auto w-full justify-between hover:bg-gray-800 dark:hover:bg-gray-800">
                          <div className="min-w-0"><div className="truncate text-sm font-semibold text-white">{product.name}</div><div className="text-xs text-gray-500">{product.sku || "Produto cadastrado"}</div></div>
                          <Plus className="h-4 w-4 shrink-0 text-brand-gold" />
                        </Button>
                      ))}
                      <Button type="button" variant="outline" onClick={addManualProduct} className="mt-1 h-auto w-full justify-start border-dashed border-primary/40 bg-primary/5 text-xs font-bold text-primary hover:bg-primary/10 hover:text-primary dark:border-primary/40 dark:bg-primary/5 dark:hover:bg-primary/10">
                        <Plus className="h-4 w-4 shrink-0" /> Adicionar “{productSearch.trim()}” como produto não cadastrado
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((item) => (
                  <div key={item.clientId} className="flex min-h-[154px] flex-col rounded-xl border border-gray-800 bg-brand-navylight p-3">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        {item.isManual ? (
                          <input value={item.productName} onChange={(e) => updateItem(item.clientId, { productName: e.target.value })} className="w-full border-0 bg-transparent p-0 text-sm font-bold text-white outline-none placeholder:text-gray-600" placeholder="Nome do produto" />
                        ) : (
                          <div className="line-clamp-2 text-sm font-bold leading-tight text-white">{item.productName}</div>
                        )}
                        <div className="mt-0.5 text-[10px] text-gray-500">{item.isManual ? "Produto não cadastrado" : item.sku || "Produto cadastrado"}</div>
                      </div>
                      <Button type="button" variant="ghost" size="icon-xs" onClick={() => setItems((current) => current.filter((row) => row.clientId !== item.clientId))} title="Remover" className="shrink-0 text-red-400 hover:bg-red-500/10 hover:text-red-400 dark:hover:bg-red-500/10"><Trash2 className="size-3.5" /></Button>
                    </div>
                    <div className="grid grid-cols-[minmax(0,1fr)_72px] gap-2">
                      <label className="space-y-1 text-[10px] font-semibold text-gray-500">Lote <span className="font-normal text-gray-600">(opcional)</span>
                        <input value={item.lotSent} onChange={(e) => updateItem(item.clientId, { lotSent: e.target.value.toUpperCase() })} placeholder="Nº do lote" className="w-full rounded-lg border border-gray-700 bg-[#171717] px-2.5 py-2 text-xs text-white outline-none focus:border-brand-gold" />
                      </label>
                      <label className="space-y-1 text-[10px] font-semibold text-gray-500">Qtd.
                        <input type="number" min={1} value={item.quantitySent} onChange={(e) => updateItem(item.clientId, { quantitySent: Math.max(0, Number(e.target.value)) })} className="w-full rounded-lg border border-gray-700 bg-[#171717] px-2 py-2 text-center text-xs font-bold text-white outline-none focus:border-brand-gold" />
                      </label>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={() => addAnotherLot(item)} className="mt-auto border-dashed border-gray-700 bg-transparent text-[10px] text-gray-400 hover:border-primary hover:bg-transparent hover:text-primary dark:border-gray-700 dark:bg-transparent dark:hover:bg-transparent"><Plus className="size-3" /> Adicionar outro lote</Button>
                  </div>
                ))}
                {items.length === 0 && <div className="col-span-full rounded-xl border border-dashed border-gray-800 py-8 text-center text-sm text-gray-500">Busque um produto cadastrado ou digite o nome de um produto novo.</div>}
              </div>

              <label className="block space-y-1 text-xs font-semibold text-gray-400">Observação (opcional)
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Ex.: lacre, contato, orientação para conferência..." className="min-h-[72px] w-full resize-none rounded-lg border border-gray-700 bg-brand-navylight px-3 py-2 text-sm text-white outline-none focus:border-brand-gold" />
              </label>
            </div>

            <div className="flex justify-end gap-2 border-t border-gray-800 p-4">
              <Button disabled={saving} className="font-bold" onClick={createTransfer}><Truck className="h-4 w-4" /> Registrar saída</Button>
            </div>
          </div>
        </div>
      )}

      {receiving && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/65 p-0 sm:items-center sm:p-4">
          <div className="flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl border border-gray-800 bg-brand-navylight shadow-2xl sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
              <div><h2 className="text-lg font-bold text-white">Conferir chegada</h2><p className="text-xs text-gray-400">{receiving.title || receiving.code}</p><p className="text-[11px] text-gray-600">{receiving.code} · {receiving.origin} → {receiving.destination}</p></div>
              <Button variant="ghost" size="icon" onClick={() => setReceiving(null)} className="text-gray-400 hover:bg-gray-800 hover:text-white dark:hover:bg-gray-800"><X className="size-5" /></Button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm text-gray-300">
                Confira cada linha comparando <strong className="text-white">produto, lote e quantidade</strong>. Quando estiver tudo certo, confirme no botão abaixo.
              </div>

              {receiving.invoiceFilePath && (
                <Card className="border-sky-500/25 bg-sky-500/5 py-0">
                <CardContent className="flex flex-wrap items-center justify-between gap-2 p-3">
                  <div className="min-w-0"><div className="text-xs font-bold text-sky-200">Nota anexada na saída</div><div className="truncate text-[11px] text-gray-500">{receiving.invoiceFileName}</div></div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setInvoicePreview(receiving)} className="border-sky-500/30 text-sky-300 hover:bg-transparent hover:text-sky-200 dark:border-sky-500/30 dark:hover:bg-transparent"><Eye className="size-3.5" /> Visualizar</Button>
                    <Button type="button" variant="outline" size="icon-sm" title="Baixar nota" className="border-gray-700 text-gray-300 hover:bg-transparent hover:text-gray-300 dark:border-gray-700 dark:hover:bg-transparent" onClick={() => downloadInvoice(receiving)}><Download className="size-3.5" /></Button>
                  </div>
                </CardContent>
                </Card>
              )}

              <div className="overflow-x-auto rounded-xl border border-gray-800 bg-brand-navylight">
                <div className="min-w-[720px]">
                  <div className="grid grid-cols-[minmax(190px,1.6fr)_125px_70px_minmax(170px,1fr)_115px] gap-2 border-b border-gray-800 bg-[#171717] px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-gray-500">
                    <div>Produto</div><div>Lote enviado</div><div className="text-center">Qtd.</div><div>Conferência</div><div className="text-center">Situação</div>
                  </div>
                  {receiptItems.map((item) => {
                    const sent = Number(item.quantitySent || 0);
                    const received = Number(item.quantityReceived || 0);
                    const damaged = Number(item.quantityDamaged || 0);
                    const hasDifference = receiptItemHasDifference(item);
                    const editingDifference = differenceItemIds.includes(item.id);
                    return (
                      <div key={item.id} className="border-b border-gray-800 last:border-0">
                        <div className={`grid grid-cols-[minmax(190px,1.6fr)_125px_70px_minmax(170px,1fr)_115px] items-center gap-2 px-3 py-2.5 text-xs ${hasDifference ? "bg-amber-500/5" : ""}`}>
                          <div className="min-w-0"><div className="truncate font-bold text-white">{item.productName}</div><div className="truncate text-[10px] text-gray-500">{item.sku || "Sem SKU"}</div></div>
                          <div className="truncate font-semibold text-gray-200">{item.lotSent || "Sem lote"}</div>
                          <div className="text-center font-black text-white">{sent}</div>
                          <div className="truncate text-gray-300"><strong className={hasDifference ? "text-amber-300" : "text-emerald-300"}>{item.lotReceived || "Sem lote"}</strong> · {received} recebida(s){damaged > 0 ? ` · ${damaged} avariada(s)` : ""}</div>
                          <div className="flex flex-col items-center gap-1">
                            <Badge variant={hasDifference ? "warning" : "success"} className="gap-1"><Check className="h-3 w-3" /> {hasDifference ? "Diferença" : "Confere"}</Badge>
                            <Button type="button" variant="link" className="h-auto p-0 text-[10px] font-bold text-gray-400 hover:text-white hover:no-underline" onClick={() => editingDifference ? resetReceiptItem(item.id) : toggleReceiptDifference(item.id)}>{editingDifference ? "Marcar OK" : "Informar diferença"}</Button>
                          </div>
                        </div>
                        {editingDifference && (
                          <div className="grid gap-2 border-t border-gray-800/70 bg-brand-navy/60 px-3 py-3 sm:grid-cols-[minmax(0,1fr)_110px_110px]">
                            <label className="space-y-1 text-[10px] font-semibold text-gray-500">Lote recebido
                              <input value={item.lotReceived || ""} onChange={(e) => updateReceiptItem(item.id, { lotReceived: e.target.value.toUpperCase() })} className="w-full rounded-lg border border-gray-700 bg-[#171717] px-3 py-2 text-sm text-white outline-none focus:border-brand-gold" />
                            </label>
                            <label className="space-y-1 text-[10px] font-semibold text-gray-500">Recebido
                              <input type="number" min={0} max={sent} value={item.quantityReceived} onChange={(e) => updateReceiptItem(item.id, { quantityReceived: Math.max(0, Number(e.target.value)) })} className="w-full rounded-lg border border-gray-700 bg-[#171717] px-3 py-2 text-center text-sm font-bold text-white outline-none focus:border-brand-gold" />
                            </label>
                            <label className="space-y-1 text-[10px] font-semibold text-gray-500">Avariado
                              <input type="number" min={0} max={sent} value={item.quantityDamaged} onChange={(e) => updateReceiptItem(item.id, { quantityDamaged: Math.max(0, Number(e.target.value)) })} className="w-full rounded-lg border border-gray-700 bg-[#171717] px-3 py-2 text-center text-sm font-bold text-white outline-none focus:border-brand-gold" />
                            </label>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <label className="block space-y-1 text-xs font-semibold text-gray-400">Observação da chegada (opcional)
                <textarea value={receiptNotes} onChange={(e) => setReceiptNotes(e.target.value)} placeholder="Explique diferenças, perdas ou avarias..." className="min-h-[72px] w-full resize-none rounded-lg border border-gray-700 bg-brand-navylight px-3 py-2 text-sm text-white outline-none focus:border-brand-gold" />
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-800 p-4">
              <Button variant="outline" className="border-gray-700 text-gray-300 hover:bg-transparent hover:text-gray-300 dark:border-gray-700 dark:hover:bg-transparent" onClick={() => setReceiving(null)}>Cancelar</Button>
              <Button disabled={saving} className={cn("font-bold text-white", hasReceiptDifference ? "bg-amber-500 hover:bg-amber-600" : "bg-emerald-500 hover:bg-emerald-600")} onClick={confirmReceipt}><CheckCircle2 className="h-4 w-4" /> {hasReceiptDifference ? "Finalizar com diferença" : "Confirmar tudo OK"}</Button>
            </div>
          </div>
        </div>
      )}

      {details && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/65 p-0 sm:items-center sm:p-4">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-gray-800 bg-brand-navylight shadow-2xl sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
              <div><h2 className="text-lg font-bold text-white">{details.title || details.code}</h2><p className="text-xs text-gray-500">{details.code} · {details.origin} → {details.destination}</p></div>
              <Button variant="ghost" size="icon" onClick={() => setDetails(null)} className="text-gray-400 hover:bg-gray-800 hover:text-white dark:hover:bg-gray-800"><X className="size-5" /></Button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                <Card className="py-0"><CardContent className="p-2"><div className="text-gray-500">Status</div><div className="mt-0.5 font-bold text-white">{details.status === "IN_TRANSIT" ? "Em trânsito" : ["PARTIAL", "DIVERGENT"].includes(details.status) ? "Recebida com diferença" : "Recebida — Tudo certo"}</div></CardContent></Card>
                <Card className="py-0"><CardContent className="p-2"><div className="text-gray-500">Saída</div><div className="mt-0.5 font-bold text-white">{formatDate(details.departureAt)}</div></CardContent></Card>
                <Card className="py-0"><CardContent className="p-2"><div className="text-gray-500">Previsão</div><div className="mt-0.5 font-bold text-white">{formatDate(details.expectedAt)}</div></CardContent></Card>
                <Card className="py-0"><CardContent className="p-2"><div className="text-gray-500">Chegada</div><div className="mt-0.5 font-bold text-white">{formatDate(details.receivedAt)}</div></CardContent></Card>
              </div>
              {details.invoiceFilePath && (
                <Card className="border-sky-500/25 bg-sky-500/5 py-0">
                <CardContent className="flex flex-wrap items-center justify-between gap-2 p-3">
                  <div className="min-w-0"><div className="text-xs font-bold text-sky-200">Nota da transferência</div><div className="truncate text-[11px] text-gray-500">{details.invoiceFileName} {details.invoiceFileSize ? `· ${formatFileSize(details.invoiceFileSize)}` : ""}</div></div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setInvoicePreview(details)} className="border-sky-500/30 text-sky-300 hover:bg-transparent hover:text-sky-200 dark:border-sky-500/30 dark:hover:bg-transparent"><Eye className="size-3.5" /> Visualizar</Button>
                    <Button type="button" variant="outline" size="icon-sm" title="Baixar nota" className="border-gray-700 text-gray-300 hover:bg-transparent hover:text-gray-300 dark:border-gray-700 dark:hover:bg-transparent" onClick={() => downloadInvoice(details)}><Download className="size-3.5" /></Button>
                  </div>
                </CardContent>
                </Card>
              )}
              {(details.items || []).map((item: any) => (
                <Card key={item.id} className="py-0">
                <CardContent className="p-3">
                  <div className="text-sm font-bold text-white">{item.productName}</div>
                  <div className="mt-1 grid grid-cols-2 gap-2 text-xs sm:grid-cols-5">
                    <div><span className="text-gray-500">Enviado:</span> <strong className="text-white">{item.quantitySent}</strong></div>
                    <div><span className="text-gray-500">Recebido:</span> <strong className="text-emerald-300">{item.quantityReceived}</strong></div>
                    <div><span className="text-gray-500">Avariado:</span> <strong className="text-amber-300">{item.quantityDamaged}</strong></div>
                    <div><span className="text-gray-500">Lote enviado:</span> <strong className="text-white">{item.lotSent || "—"}</strong></div>
                    <div><span className="text-gray-500">Lote recebido:</span> <strong className={item.lotSent && item.lotReceived && item.lotSent !== item.lotReceived ? "text-red-300" : "text-white"}>{item.lotReceived || "—"}</strong></div>
                  </div>
                </CardContent>
                </Card>
              ))}
              {details.notes && <Card className="py-0"><CardContent className="p-3 text-sm text-gray-300"><span className="font-bold text-white">Saída:</span> {details.notes}</CardContent></Card>}
              {details.receiptNotes && <Card className="py-0"><CardContent className="p-3 text-sm text-gray-300"><span className="font-bold text-white">Chegada:</span> {details.receiptNotes}</CardContent></Card>}
            </div>
          </div>
        </div>
      )}

      {invoicePreview && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm">
          <div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-gray-800 bg-brand-navylight shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-gray-800 px-4 py-3">
              <div className="min-w-0"><div className="truncate text-sm font-bold text-white">{invoicePreview.invoiceFileName || "Nota da transferência"}</div><div className="text-xs text-gray-500">{formatFileSize(invoicePreview.invoiceFileSize)}</div></div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" className="border-gray-700 text-gray-200 hover:bg-transparent hover:text-gray-200 dark:border-gray-700 dark:hover:bg-transparent" onClick={() => downloadInvoice(invoicePreview)}><Download className="size-3.5" /> Baixar</Button>
                <Button variant="ghost" size="icon" onClick={() => setInvoicePreview(null)} className="text-gray-400 hover:bg-gray-800 hover:text-white dark:hover:bg-gray-800"><X className="size-5" /></Button>
              </div>
            </div>
            <div className="flex-1 overflow-auto bg-brand-navydark p-3">
              {isPdfInvoice(invoicePreview) ? (
                <iframe title="Nota da transferência" src={invoicePreview.invoiceFilePath} className="h-[78vh] w-full rounded-lg border border-gray-800 bg-white" />
              ) : (
                <img src={invoicePreview.invoiceFilePath} alt="Nota da transferência" className="mx-auto max-h-[78vh] max-w-full rounded-lg bg-white object-contain" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
