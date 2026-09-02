import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { CheckCircle, Clock, PackageSearch, Search, X, Loader2, ArrowLeft, Printer, Edit2, RotateCcw, Eye, ClipboardList, Download } from "lucide-react";
import { apiFetch } from "../lib/api";
import { ReceiptModal } from "../components/ReceiptModal";
import { Money } from "../components/Money";
import { DataTable } from "../components/DataTable";
import type { ColumnDef } from "@tanstack/react-table";
import { useAdminTranslation, formatCurrency, formatDate, moneyFieldLabel } from "../lib/i18n";
import { useAuthStore } from "../stores/authStore";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { cn } from "../lib/utils";

const getTodayString = () => {
  const d = new Date();
  return d.toISOString().split('T')[0];
};

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function getStatusBadgeProps(status: string): { variant: "success" | "secondary" | "destructive" | "caution" | "info"; className?: string } {
  switch (status) {
    case "CONFIRMED":
    case "PAID": return { variant: "success" };
    case "DRAFT": return { variant: "secondary" };
    case "CANCELLED":
    case "CANCELED": return { variant: "destructive" };
    case "RETURNED":
    case "REFUNDED": return { variant: "caution" };
    default: return { variant: "info" };
  }
}

function getFulfillmentBadgeProps(status: string): { variant: "success" | "secondary" | "warning" | "caution"; className?: string } {
  switch (status) {
    case "PENDING": return { variant: "secondary" };
    case "SEPARATING": return { variant: "warning" };
    case "DELIVERED": return { variant: "success" };
    case "RETURNED": return { variant: "caution" };
    default: return { variant: "secondary" };
  }
}

function StatusBadge({ status, extraClassName, t }: { status: string; extraClassName?: string; t: (key: string) => string }) {
  const sp = getStatusBadgeProps(status);
  return <Badge variant={sp.variant} className={cn("text-[10px] font-bold tracking-wider", extraClassName, sp.className)}>{t(`status.${status}`)}</Badge>;
}
function FulfillmentBadge({ status, extraClassName, children, t }: { status: string; extraClassName?: string; children?: React.ReactNode; t: (key: string) => string }) {
  const fp = getFulfillmentBadgeProps(status);
  return <Badge variant={fp.variant} className={cn("text-[10px] font-bold tracking-wider", extraClassName, fp.className)}>{children ?? t(`status.${status}`)}</Badge>;
}

export function Sales() {
  const navigate = useNavigate();
  const { t, language } = useAdminTranslation();
  const { user } = useAuthStore();
  const isAdmin = (user?.roleKey === "admin" || user?.roleKey === "master") || ["admin", "master"].includes(user?.role?.toLowerCase() || "");
  const [sales, setSales] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Filters
  const [dateFrom, setDateFrom] = useState(getTodayString());
  const [dateTo, setDateTo] = useState(getTodayString());
  const [customerName, setCustomerName] = useState("");
  const [number, setNumber] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [fulfillmentStatus, setFulfillmentStatus] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [saleDetails, setSaleDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [receiptSale, setReceiptSale] = useState<{ id: string, number: string } | null>(null);
  
  // Cancel Sale State
  const [cancelModal, setCancelModal] = useState<string | null>(null); // saleId
  const [cancelReason, setCancelReason] = useState("");
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);

  const [returnModal, setReturnModal] = useState<string | null>(null);
  const [returnNotes, setReturnNotes] = useState("");
  const [returnAdminPassword, setReturnAdminPassword] = useState("");
  const [returnConfirm, setReturnConfirm] = useState(false);
  const [returnError, setReturnError] = useState("");
  const [returnLoading, setReturnLoading] = useState(false);
  const [lotModalOpen, setLotModalOpen] = useState(false);
  const [lotDrafts, setLotDrafts] = useState<Record<string, Array<{ lotNumber: string; quantity: string }>>>({});
  const [lotError, setLotError] = useState("");

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    if (!dateFrom || !dateTo) {
      alert("Por favor, selecione um período (Data Início e Fim) para buscar vendas.");
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.append("dateFrom", dateFrom);
      if (dateTo) params.append("dateTo", dateTo);
      if (customerName) params.append("customerName", customerName);
      if (number) params.append("number", number);
      if (paymentStatus) params.append("paymentStatus", paymentStatus);
      if (fulfillmentStatus) params.append("fulfillmentStatus", fulfillmentStatus);
      if (serialNumber.trim()) params.append("serialNumber", serialNumber.trim());
      if (searchTerm.trim()) params.append("q", searchTerm.trim());

      const res = await apiFetch(`/api/sales?${params.toString()}`);
      const resData = await res.json();
      if(resData.data) {
         setSales(resData.data);
         setSummary(resData.summary || {});
      }
    } catch(err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const exportCsv = () => {
    setExporting(true);
    try {
      const header = ["Data", "Número", "Cliente", "Situação", "Pagamento", "Entrega", "Total"];
      const lines = [header.map(csvCell).join(";")];
      sales.forEach((s: any) => {
        lines.push([
          new Date(s.createdAt).toLocaleString("pt-BR"),
          `${s.series}-${String(s.number).padStart(6, "0")}`,
          s.customerName || "Cliente Padrão",
          t(`status.${s.orderStatus}`),
          t(`status.${s.paymentStatus}`),
          t(`status.${s.fulfillmentStatus}`),
          s.totalAmount,
        ].map(csvCell).join(";"));
      });
      const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `vendas-${dateFrom || "inicio"}-${dateTo || "fim"}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const handleClearFilters = () => {
     setDateFrom(getTodayString());
     setDateTo(getTodayString());
     setCustomerName("");
     setNumber("");
     setPaymentStatus("");
     setFulfillmentStatus("");
     setSerialNumber("");
     setSearchTerm("");
  };

  const viewDetails = async (id: string) => {
     setSelectedSaleId(id);
     setLoadingDetails(true);
     try {
       const res = await apiFetch(`/api/sales/${id}`);
       if (res.ok) {
         const data = await res.json();
         setSaleDetails(data);
       }
     } catch (e) {
       console.error(e);
     } finally {
       setLoadingDetails(false);
     }
  };

  const closeDetails = () => {
    setSelectedSaleId(null);
    setSaleDetails(null);
  };

  const handleCancelSale = async () => {
    if (!cancelModal) return;
    setCancelError("");
    setCancelLoading(true);
    try {
      const res = await apiFetch(`/api/sales/${cancelModal}/cancel`, {
        method: "POST",
        body: JSON.stringify({ reason: cancelReason })
      });
      if (res.ok) {
        setCancelModal(null);
        setCancelReason("");
        setCancelConfirm(false);
        fetchSales();
        if (selectedSaleId === cancelModal) {
           viewDetails(selectedSaleId);
        }
      } else {
        const d = await res.json().catch(() => ({}));
        setCancelError(d.error || "Erro ao cancelar venda.");
      }
    } catch (e: any) {
      setCancelError(e.message);
    } finally {
      setCancelLoading(false);
    }
  };

  const handleReturnSale = async () => {
    if (!returnModal) return;
    setReturnError("");
    setReturnLoading(true);
    try {
      const res = await apiFetch(`/api/sales/${returnModal}/return`, {
        method: "POST",
        body: JSON.stringify({ notes: returnNotes, adminPassword: returnAdminPassword })
      });
      if (res.ok) {
        setReturnModal(null);
        setReturnNotes("");
        setReturnAdminPassword("");
        setReturnConfirm(false);
        fetchSales();
        if (selectedSaleId === returnModal) viewDetails(returnModal);
      } else {
        const d = await res.json().catch(() => ({}));
        setReturnError(d.error || "Erro ao fazer devolução.");
      }
    } catch (e: any) {
      setReturnError(e.message || "Erro ao fazer devolução.");
    } finally {
      setReturnLoading(false);
    }
  };

  const openLotEditor = () => {
    const drafts: Record<string, Array<{ lotNumber: string; quantity: string }>> = {};
    for (const item of saleDetails?.items || []) {
      if (!item.requiresLot) continue;
      const rows = Array.isArray(item.lots) && item.lots.length
        ? item.lots.map((lot: any) => ({ lotNumber: String(lot.lotNumber || ""), quantity: String(lot.quantity || "") }))
        : [{ lotNumber: "", quantity: "" }];
      drafts[item.id] = rows;
    }
    setLotDrafts(drafts);
    setLotError("");
    setLotModalOpen(true);
  };

  const updateLotDraft = (saleItemId: string, index: number, field: "lotNumber" | "quantity", value: string) => {
    setLotDrafts((prev) => {
      const rows = [...(prev[saleItemId] || [{ lotNumber: "", quantity: "" }])];
      rows[index] = { ...rows[index], [field]: value };
      const item = saleDetails?.items?.find((it: any) => it.id === saleItemId);
      const totalQty = Number(item?.quantity || 0);

      // Mesma regra do PDV: nova linha só aparece quando a linha atual
      // já possui lote + quantidade e ainda existe saldo para informar.
      const compactRows = rows.filter((row, rowIndex) => (
        rowIndex === 0 || row.lotNumber.trim() || String(row.quantity || "").trim()
      ));
      const safeRows = compactRows.length ? compactRows : [{ lotNumber: "", quantity: "" }];
      const informed = safeRows.reduce((sum, row) => sum + Math.max(0, Number(row.quantity || 0)), 0);
      const last = safeRows[safeRows.length - 1];
      const lastIsComplete = Boolean(last?.lotNumber.trim()) && Number(last?.quantity || 0) > 0;

      if (informed < totalQty && lastIsComplete) safeRows.push({ lotNumber: "", quantity: "" });
      return { ...prev, [saleItemId]: safeRows };
    });
  };

  const saveLots = async () => {
    if (!saleDetails) return;
    const lots = Object.entries(lotDrafts).flatMap(([saleItemId, rows]) => {
      const lotRows = rows as Array<{ lotNumber: string; quantity: string }>;
      const item = saleDetails.items.find((it: any) => it.id === saleItemId);
      return lotRows.filter((row) => row.lotNumber.trim() && Number(row.quantity) > 0).map((row) => ({
        saleItemId,
        productId: item?.productId,
        lotNumber: row.lotNumber.trim(),
        quantity: Number(row.quantity),
      }));
    });
    const res = await apiFetch(`/api/sales/${saleDetails.id}/lots`, { method: "PATCH", body: JSON.stringify({ lots }) });
    if (res.ok) {
      setLotModalOpen(false);
      viewDetails(saleDetails.id);
      fetchSales();
    } else {
      const data = await res.json().catch(() => ({}));
      setLotError(data.error || "Erro ao salvar lotes.");
    }
  };

  if (selectedSaleId) {
    return (
      <div className="space-y-6">
         <div className="sale-detail-header flex items-center justify-between gap-4">
           <div className="flex items-center gap-3 min-w-0">
             <Button variant="ghost" size="icon" onClick={closeDetails} className="text-gray-400 hover:text-white">
               <ArrowLeft size={20} />
             </Button>
             <h2 className="sale-detail-title text-2xl font-semibold text-white">Detalhes da Venda</h2>
           </div>
           
           {!loadingDetails && saleDetails && (
             <div className="sale-detail-actions flex items-center gap-2">
               {saleDetails.paymentStatus === "PENDING" && saleDetails.orderStatus === "CONFIRMED" && saleDetails.fulfillmentStatus !== "DELIVERED" && saleDetails.orderStatus !== "CANCELED" && saleDetails.orderStatus !== "CANCELLED" && (
                 <Button variant="ghost" onClick={() => navigate(`/pos?editSaleId=${saleDetails.id}`)} className="bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 hover:text-blue-300">
                    <Edit2 className="w-5 h-5" />
                    Editar Nota
                 </Button>
               )}
               {saleDetails.paymentStatus === "PENDING" && saleDetails.orderStatus !== "CANCELED" && saleDetails.orderStatus !== "CANCELLED" && (
                 <Button variant="ghost" onClick={() => setCancelModal(saleDetails.id)} className="bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300">
                   <X className="w-5 h-5" />
                   Cancelar
                 </Button>
               )}
               {isAdmin && !["CANCELED", "CANCELLED", "RETURNED"].includes(saleDetails.orderStatus) && saleDetails.paymentStatus !== "REFUNDED" && (
                 <Button variant="ghost" onClick={() => setReturnModal(saleDetails.id)} className="sale-return-button bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 hover:text-orange-300">
                   <RotateCcw className="w-5 h-5" />
                   Fazer Devolução
                 </Button>
               )}
               {(saleDetails.lotStatus === "PENDING" || saleDetails.lotStatus === "PARTIAL") && (
                <Button variant="ghost" onClick={openLotEditor} className="bg-yellow-500/10 text-yellow-300 hover:bg-yellow-500/20 hover:text-yellow-200">
                  <ClipboardList className="w-4 h-4" /> Informar lote
                </Button>
              )}
              <Button variant="ghost" onClick={() => setReceiptSale({ id: saleDetails.id, number: `${saleDetails.series}-${saleDetails.number}` })} className="bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 hover:text-indigo-300">
                 <Printer className="w-5 h-5" />
                 Recibo
               </Button>
             </div>
           )}
         </div>

         {loadingDetails || !saleDetails ? (
            <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-brand-gold" /></div>
         ) : (
            <div className="max-w-5xl space-y-6">
               <Card className="py-0">
               <CardContent className="grid grid-cols-2 gap-6 p-6 md:grid-cols-4">
                 <div>
                   <p className="text-xs text-gray-400 uppercase">Número</p>
                   <p className="text-lg font-mono text-white font-bold">{saleDetails.series}-{String(saleDetails.number).padStart(6, '0')}</p>
                 </div>
                 <div>
                   <p className="text-xs text-gray-400 uppercase">Data</p>
                   <p className="text-md text-white">{new Date(saleDetails.createdAt).toLocaleString('pt-BR')}</p>
                 </div>
                 <div>
                   <p className="text-xs text-gray-400 uppercase">Cliente</p>
                   <p className="text-md text-white font-medium">{saleDetails.customerName || 'Cliente Padrão'}</p>
                   {saleDetails.customerDocument && <p className="text-sm text-gray-500">{saleDetails.customerDocument}</p>}
                 </div>
                 <div>
                   <p className="text-xs text-gray-400 uppercase">Vendedor</p>
                   <p className="text-md text-white font-medium">{saleDetails.userName}</p>
                 </div>
                 
                 <div>
                   <p className="text-xs text-gray-400 uppercase mb-1">Status Pedido</p>
                   <StatusBadge status={saleDetails.orderStatus} t={t} />
                   <p className="mt-1 text-[11px] text-gray-500">Pedido: {saleDetails.actors?.order?.userName || saleDetails.userName || '-'}</p>
                 </div>
                 <div>
                   <p className="text-xs text-gray-400 uppercase mb-1">Status Pagamento</p>
                   <StatusBadge status={saleDetails.paymentStatus} t={t} />
                   <p className="mt-1 text-[11px] text-gray-500">Pagamento: {saleDetails.actors?.payment?.userName || '-'}</p>
                 </div>
                 <div>
                   <p className="text-xs text-gray-400 uppercase mb-1">Status Lote</p>
                   <span className={`px-2 py-0.5 rounded border text-[10px] font-bold tracking-wider ${saleDetails.lotStatus === 'COMPLETE' || saleDetails.lotStatus === 'NOT_REQUIRED' ? 'bg-green-900/30 text-green-400 border-green-800/50' : 'bg-yellow-900/30 text-yellow-300 border-yellow-800/50'}`}>
                     {saleDetails.lotStatus === 'NOT_REQUIRED' ? 'Sem controle' : saleDetails.lotStatus === 'COMPLETE' ? 'Completo' : saleDetails.lotStatus === 'PARTIAL' ? 'Parcial' : 'Pendente'}
                   </span>
                   <p className="mt-1 text-[11px] text-gray-500">Rastreio por lote</p>
                 </div>
                 <div>
                   <p className="text-xs text-gray-400 uppercase mb-1">Status Entrega</p>
                   <FulfillmentBadge status={saleDetails.fulfillmentStatus} t={t} />
                   <p className="mt-1 text-[11px] text-gray-500">{saleDetails.deliveryScheduledAt ? `Prev.: ${new Date(saleDetails.deliveryScheduledAt).toLocaleDateString('pt-BR')}` : 'Sem data prevista'}</p>
                 </div>
               </CardContent>
               </Card>

               {saleDetails.returnInfo && (
                 <Card className="border-orange-500/30 bg-orange-500/10 py-0">
                 <CardContent className="p-4 text-sm text-orange-200">
                   <div className="font-bold text-orange-300">Venda devolvida</div>
                   <div>Responsável: {saleDetails.returnInfo.returnedByName || '-'}</div>
                   <div>Data: {saleDetails.returnInfo.createdAt ? new Date(saleDetails.returnInfo.createdAt).toLocaleString('pt-BR') : '-'}</div>
                   {saleDetails.returnInfo.notes && <div>Obs.: {saleDetails.returnInfo.notes}</div>}
                 </CardContent>
                 </Card>
               )}

               {String(saleDetails.observations || '').trim() && (
                 <Card className="py-0">
                 <CardContent className="px-4 py-3">
                   <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Observações da venda</p>
                   <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-200">
                     {saleDetails.observations}
                   </p>
                 </CardContent>
                 </Card>
               )}

               <Card className="sales-table-card sale-detail-items-card overflow-hidden py-0">
               <CardContent className="p-0">
                 <div className="sale-detail-table-scroll overflow-x-auto">
                 <table className="w-full min-w-[760px] text-left text-sm">
                   <thead className="bg-[#171717] border-b border-gray-800 text-gray-400">
                     <tr>
                       <th className="px-6 py-3 font-medium">SKU / Produto</th>
                       <th className="px-6 py-3 font-medium text-center">Qtd</th>
                       <th className="px-6 py-3 font-medium text-right">{moneyFieldLabel("Unitário")}</th>
                       <th className="px-6 py-3 font-medium text-right">{moneyFieldLabel("Frete")}</th>
                       <th className="px-6 py-3 font-medium text-right">{moneyFieldLabel("Total")}</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-800/50">
                     {saleDetails.items.map((item: any) => (
                       <tr key={item.id}>
                          <td className="px-6 py-4">
                            <p className="font-mono text-xs text-brand-gold">{item.productSku || 'S/N'}</p>
                            <p className="font-medium text-gray-200">{item.productName}</p>
                            <div className="mt-1 text-[10px] text-gray-500 font-mono">
                              S/N: {item.serials && item.serials.length > 0 ? item.serials.join(", ") : "-"}
                            </div>
                            {item.lots && item.lots.length > 0 && (
                              <div className="mt-1 text-[10px] text-emerald-300 font-mono">
                                Lote: {item.lots.map((lot: any) => `${lot.lotNumber}${Number(lot.quantity || 0) > 0 ? ` (${lot.quantity})` : ""}`).join(" | ")}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center font-bold text-gray-300">{item.quantity}</td>
                          <td className="px-6 py-4 text-right text-gray-400"><Money value={item.unitPrice} lang={language} /></td>
                          <td className="px-6 py-4 text-right text-gray-400"><Money value={item.ivaAmount} lang={language} /></td>
                          <td className="px-6 py-4 text-right font-medium text-white"><Money value={item.totalPrice} lang={language} /></td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
                 </div>
               </CardContent>
               </Card>

               <div className="flex justify-end">
                 <Card className="w-72 py-0">
                 <CardContent className="flex flex-col gap-2 p-5">
                    <div className="flex justify-between text-sm text-gray-400">
                       <span>Venda Bruta:</span>
                       <span><Money value={saleDetails.subtotalAmount} lang={language} /></span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-400">
                       <span>Descontos:</span>
                       <span>- <Money value={saleDetails.discountAmount} lang={language} /></span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-400">
                       <span>Frete:</span>
                       <span>+ <Money value={saleDetails.ivaAmount} lang={language} /></span>
                    </div>
                    <div className="border-t border-gray-800 mt-2 pt-2 flex justify-between font-bold text-lg text-brand-gold">
                       <span>Total Final:</span>
                       <span><Money value={saleDetails.totalAmount} lang={language} /></span>
                    </div>
                 </CardContent>
                 </Card>
               </div>
            </div>
         )}

   
      {lotModalOpen && saleDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto py-0">
          <CardContent className="p-0">
            <div className="flex items-center justify-between border-b border-gray-800 p-4">
              <h3 className="text-lg font-semibold text-white">Informar lotes da venda</h3>
              <Button variant="ghost" size="icon" onClick={() => setLotModalOpen(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></Button>
            </div>
            <div className="space-y-3 p-4">
              {saleDetails.items.filter((item: any) => item.requiresLot).map((item: any) => {
                const rows = lotDrafts[item.id] || [{ lotNumber: "", quantity: "" }];
                const informed = rows.reduce((sum, row) => sum + Math.max(0, Number(row.quantity || 0)), 0);
                return (
                  <Card key={item.id} className="py-0">
                  <CardContent className="p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="font-bold text-white">{item.productName}</span>
                      <span className="text-xs font-bold text-brand-gold">{informed} / {item.quantity}</span>
                    </div>
                    <div className="space-y-2">
                      {rows.map((row, index) => (
                        <div key={index} className="grid grid-cols-[minmax(0,1fr)_5.5rem] gap-2">
                          <label className="flex items-center gap-2 rounded-lg border border-gray-700 bg-[#171717] px-2 py-1.5 text-xs text-gray-400">Lote:<input value={row.lotNumber} onChange={(e) => updateLotDraft(item.id, index, "lotNumber", e.target.value.toUpperCase())} className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-white outline-none" /></label>
                          <label className="flex items-center gap-2 rounded-lg border border-gray-700 bg-[#171717] px-2 py-1.5 text-xs text-gray-400">Qtd:<input type="number" min="0" value={row.quantity} onChange={(e) => updateLotDraft(item.id, index, "quantity", e.target.value)} className="w-full bg-transparent text-center text-sm font-bold text-white outline-none" /></label>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                  </Card>
                );
              })}
              {lotError && (
                <Card className="border-red-500/30 bg-red-500/10 py-0">
                <CardContent className="px-3 py-2 text-sm text-red-300">{lotError}</CardContent>
                </Card>
              )}
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-800 p-4">
              <Button variant="outline" onClick={() => setLotModalOpen(false)}>Cancelar</Button>
              <Button onClick={saveLots}>Salvar lotes</Button>
            </div>
          </CardContent>
          </Card>
        </div>
      )}

      {receiptSale && (
        <ReceiptModal
           saleId={receiptSale.id}
           saleNumber={receiptSale.number}
           onClose={() => setReceiptSale(null)}
        />
      )}


      {returnModal && (
           <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
             <Card className="w-full max-w-md overflow-hidden py-0">
             <CardContent className="flex flex-col p-0">
               <div className="flex items-center justify-between p-4 border-b border-gray-800">
                 <h3 className="text-lg font-medium text-white flex items-center gap-2"><RotateCcw className="w-5 h-5 text-orange-400" />Fazer Devolução</h3>
                 <Button variant="ghost" size="icon" onClick={() => setReturnModal(null)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></Button>
               </div>
               <div className="p-4 flex flex-col gap-4">
                 {returnError && <div className="text-red-400 text-xs font-bold">{returnError}</div>}
                 <div className="text-sm text-gray-300">A devolução retorna o estoque ou libera a reserva. Se a venda já tiver pagamento, o valor pago será reembolsado no caixa/relatórios.</div>
                 <div><label className="block text-xs font-medium text-gray-400 mb-1">Anotação / motivo obrigatório</label><textarea value={returnNotes} onChange={e => setReturnNotes(e.target.value)} placeholder="Ex.: produto devolvido pelo cliente..." className="w-full bg-brand-navylight border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-brand-gold outline-none min-h-[80px]" /></div>
                 <div><label className="block text-xs font-medium text-gray-400 mb-1">Senha de autorização <span className="font-normal text-gray-500">(sua senha de login — Master ou Admin)</span></label><input type="password" value={returnAdminPassword} onChange={e => setReturnAdminPassword(e.target.value)} placeholder="Digite a senha" className="w-full bg-brand-navylight border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-brand-gold outline-none" /></div>
                 <label className="flex items-start gap-2 cursor-pointer"><input type="checkbox" checked={returnConfirm} onChange={(e) => setReturnConfirm(e.target.checked)} className="mt-1 bg-brand-navylight border-gray-700 rounded text-brand-gold focus:ring-offset-brand-navy focus:ring-brand-gold" /><span className="text-xs text-gray-400 select-none">Confirmo que esta devolução deve retornar estoque e reverter o valor da venda.</span></label>
               </div>
               <div className="p-4 border-t border-gray-800 flex gap-2 justify-end bg-brand-navylight/30">
                 <Button variant="ghost" onClick={() => setReturnModal(null)} disabled={returnLoading}>Fechar</Button>
                 <Button onClick={handleReturnSale} disabled={!returnNotes.trim() || !returnAdminPassword || !returnConfirm || returnLoading} className="bg-orange-600 text-white hover:bg-orange-500">{returnLoading && <Loader2 className="w-4 h-4 animate-spin" />}Confirmar Devolução</Button>
               </div>
             </CardContent>
             </Card>
           </div>
         )}
      </div>
    );
  }

  // Colunas da tabela de vendas (TanStack). Ordenação por coluna, busca instantânea e
  // paginação vêm do DataTable; os filtros de período/situação continuam no servidor.
  const salesColumns = useMemo<ColumnDef<any>[]>(() => [
    {
      accessorKey: "createdAt",
      header: "Data",
      cell: ({ row }) => <span className="whitespace-nowrap text-gray-300">{new Date(row.original.createdAt).toLocaleString("pt-BR")}</span>,
    },
    {
      id: "numero",
      header: "Número",
      accessorFn: (s: any) => `${s.series}-${String(s.number).padStart(6, "0")}`,
      cell: ({ getValue }) => <span className="font-mono text-gray-300">{String(getValue())}</span>,
    },
    {
      id: "cliente",
      header: "Cliente",
      accessorFn: (s: any) => s.customerName || "Cliente Padrão",
      cell: ({ getValue }) => <span className="font-medium text-gray-200">{String(getValue())}</span>,
    },
    {
      id: "situacao",
      header: "Situação / Pgto",
      accessorFn: (s: any) => `${t(`status.${s.orderStatus}`)} ${t(`status.${s.paymentStatus}`)}`,
      cell: ({ row }) => {
        const s = row.original;
        return (
          <div className="flex flex-col items-start gap-1">
            <StatusBadge status={s.orderStatus} t={t} />
            <StatusBadge status={s.paymentStatus} t={t} />
          </div>
        );
      },
    },
    {
      id: "entrega",
      header: "Entrega",
      accessorFn: (s: any) => t(`status.${s.fulfillmentStatus}`),
      cell: ({ row }) => {
        const s = row.original;
        return (
          <FulfillmentBadge status={s.fulfillmentStatus} extraClassName="flex w-max items-center gap-1 py-1" t={t}>
            {s.fulfillmentStatus === "PENDING" ? <Clock className="h-3 w-3" /> : <PackageSearch className="h-3 w-3" />}
            {t(`status.${s.fulfillmentStatus}`)}
          </FulfillmentBadge>
        );
      },
    },
    {
      accessorKey: "totalAmount",
      header: () => <div className="text-right">{moneyFieldLabel("Total")}</div>,
      sortingFn: (a, b) => Number(a.original.totalAmount) - Number(b.original.totalAmount),
      cell: ({ row }) => <div className="text-right font-medium text-brand-gold"><Money value={row.original.totalAmount} lang={language} /></div>,
    },
    {
      id: "acoes",
      header: () => <div className="text-center">Ações</div>,
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => {
        const s = row.original;
        return (
          <div className="flex justify-center gap-2" onClick={(e) => e.stopPropagation()}>
            {s.paymentStatus === "PENDING" && s.orderStatus !== "CANCELED" && s.orderStatus !== "CANCELLED" && (
              <Button variant="ghost" size="icon-xs" onClick={() => setCancelModal(s.id)} title="Cancelar" className="text-red-400 hover:bg-red-500/20 hover:text-red-300">
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button variant="ghost" size="icon-xs" onClick={() => viewDetails(s.id)} title="Visualizar" className="sales-action-icon text-brand-gold hover:bg-brand-navydark">
              <Eye className="h-3.5 w-3.5" />
            </Button>
            {isAdmin && !["CANCELED", "CANCELLED", "RETURNED"].includes(s.orderStatus) && s.paymentStatus !== "REFUNDED" && (
              <Button variant="ghost" size="icon-xs" onClick={() => setReturnModal(s.id)} title="Fazer devolução" className="text-orange-400 hover:bg-orange-500/20 hover:text-orange-300">
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button variant="ghost" size="icon-xs" onClick={() => setReceiptSale({ id: s.id, number: `${s.series}-${s.number}` })} title="Imprimir Recibo" className="text-indigo-400 hover:bg-indigo-500/20 hover:text-indigo-300">
              <Printer className="h-3.5 w-3.5" />
            </Button>
          </div>
        );
      },
    },
  ], [t, language, isAdmin]);


  return (
    <div className="sales-page space-y-6">
      <div className="sales-header flex justify-between items-center gap-3">
        <h2 className="sales-title text-2xl font-semibold text-white">Vendas Realizadas</h2>
      </div>

      <Card className="py-0">
      <CardContent className="space-y-4 p-4">
      <div className="sales-filter-panel flex flex-col lg:flex-row gap-4 items-end">
        <div className="sales-filter-grid flex-1 grid grid-cols-2 md:grid-cols-6 gap-3">
           <div>
             <label className="block text-xs font-medium text-gray-400 mb-1">Data Início</label>
             <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm outline-none focus:border-brand-gold" />
           </div>
           <div>
             <label className="block text-xs font-medium text-gray-400 mb-1">Data Fim</label>
             <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm outline-none focus:border-brand-gold" />
           </div>
           <div className="md:col-span-2">
             <label className="block text-xs font-medium text-gray-400 mb-1">Buscar</label>
             <input type="text" placeholder="Cliente, nº venda ou S/N..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') fetchSales(); }} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm outline-none focus:border-brand-gold" />
           </div>
           <div>
             <label className="block text-xs font-medium text-gray-400 mb-1">Status Pagamento</label>
             <select value={paymentStatus} onChange={e => setPaymentStatus(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-brand-gold">
               <option value="">Todos</option>
               <option value="PAID">{t('status.PAID')}</option>
               <option value="PENDING">{t('status.PENDING')}</option>
             </select>
           </div>
           <div>
             <label className="block text-xs font-medium text-gray-400 mb-1">Entrega</label>
             <select value={fulfillmentStatus} onChange={e => setFulfillmentStatus(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-brand-gold">
               <option value="">Todas</option>
               <option value="PENDING">{t('status.PENDING')}</option>
               <option value="SEPARATING">{t('status.SEPARATING')}</option>
               <option value="DELIVERED">{t('status.DELIVERED')}</option>
             </select>
           </div>
        </div>
        <div className="sales-filter-actions flex gap-2">
           <Button variant="outline" onClick={() => { handleClearFilters(); setTimeout(fetchSales, 0); }}>
              <X size={16} /> Limpar
           </Button>
           <Button variant="outline" onClick={exportCsv} disabled={exporting || loading || sales.length === 0}>
              {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} Exportar CSV
           </Button>
           <Button onClick={fetchSales}>
              <Search size={16} /> Buscar
           </Button>
        </div>
      </div>

      {/* Tabela desktop com TanStack: ordenar por coluna, busca instantanea e paginacao.
          Os cards do celular seguem logo abaixo (melhor leitura em tela pequena). */}
      <div className="desktop-sales-table border-t border-gray-800 pt-4">
        <DataTable
          columns={salesColumns}
          data={sales}
          loading={loading}
          pageSize={15}
          searchPlaceholder="Filtrar na lista atual (sem consultar o servidor)..."
          emptyText="Nenhuma venda encontrada no periodo/filtros"
          onRowClick={(s: any) => viewDetails(s.id)}
        />
      </div>

      <div className="sales-mobile-list">
        {loading ? (
          <div className="mobile-empty-card"><Loader2 className="mx-auto h-5 w-5 animate-spin text-brand-gold" /></div>
        ) : sales.length === 0 ? (
          <div className="mobile-empty-card">Nenhuma venda encontrada no período/filtros</div>
        ) : (
          sales.map((s) => (
            <div key={s.id} className="sales-mobile-card">
              <div className="sales-mobile-card-main">
                <div className="min-w-0">
                  <div className="sales-mobile-card-title truncate">{s.customerName || 'Cliente Padrão'}</div>
                  <div className="sales-mobile-card-meta">
                    {s.series}-{String(s.number).padStart(6, '0')} · {new Date(s.createdAt).toLocaleDateString('pt-BR')}
                  </div>
                </div>
                <div className="sales-mobile-card-total"><Money value={s.totalAmount} lang={language} /></div>
              </div>

              <div className="sales-mobile-card-row">
                <div className="sales-mobile-statuses">
                  <StatusBadge status={s.orderStatus} extraClassName="sales-mobile-pill" t={t} />
                  <StatusBadge status={s.paymentStatus} extraClassName="sales-mobile-pill" t={t} />
                  <FulfillmentBadge status={s.fulfillmentStatus} extraClassName="sales-mobile-pill" t={t} />
                </div>
                <div className="sales-mobile-actions">
                  {s.paymentStatus === "PENDING" && s.orderStatus !== "CANCELED" && s.orderStatus !== "CANCELLED" && (
                    <Button variant="ghost" size="icon-xs" onClick={(e) => { e.stopPropagation(); setCancelModal(s.id); }} title="Cancelar" className="sales-mobile-icon text-red-400 bg-red-500/10 border-red-500/20">
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon-xs" onClick={() => viewDetails(s.id)} title="Visualizar" className="sales-mobile-icon text-brand-gold bg-gray-800 border-gray-700">
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                  {isAdmin && !["CANCELED", "CANCELLED", "RETURNED"].includes(s.orderStatus) && s.paymentStatus !== "REFUNDED" && (
                    <Button variant="ghost" size="icon-xs" onClick={(e) => { e.stopPropagation(); setReturnModal(s.id); }} title="Fazer devolução" className="sales-mobile-icon text-orange-400 bg-orange-500/10 border-orange-500/20">
                      <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon-xs" onClick={() => setReceiptSale({ id: s.id, number: `${s.series}-${s.number}` })} title="Imprimir Recibo" className="sales-mobile-icon text-indigo-400 bg-indigo-500/10 border-indigo-500/20">
                    <Printer className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer view: 7 cards, todos do mesmo tamanho num grid só */}
      <div className="sales-summary-grid border-t border-gray-800 pt-4">
         <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
           <Card className="py-0">
             <CardContent className="p-3">
               <p className="text-xs text-gray-500 uppercase tracking-widest">Encontradas</p>
               <p className="text-lg text-white font-bold">{summary.count || 0}</p>
             </CardContent>
           </Card>
           <Card className="py-0">
             <CardContent className="p-3">
               <p className="text-xs text-gray-500 uppercase tracking-widest">{moneyFieldLabel("Bruto")}</p>
               <p className="text-lg text-gray-300"><Money value={summary.grossAmount} lang={language} /></p>
             </CardContent>
           </Card>
           <Card className="py-0">
             <CardContent className="p-3">
               <p className="text-xs text-gray-500 uppercase tracking-widest">Descontos</p>
               <p className="text-lg text-red-400">-<Money value={summary.discountAmount} lang={language} /></p>
             </CardContent>
           </Card>
           <Card className="py-0">
             <CardContent className="p-3">
               <p className="text-xs text-gray-500 uppercase tracking-widest">{moneyFieldLabel("Frete")}</p>
               <p className="text-lg text-brand-gold">+<Money value={summary.ivaAmount} lang={language} /></p>
             </CardContent>
           </Card>
           <Card className="py-0">
             <CardContent className="p-3">
               <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Líquido vendido</p>
               <p className="text-lg text-white font-bold"><Money value={summary.netAmount} lang={language} /></p>
             </CardContent>
           </Card>
           <Card className="py-0">
             <CardContent className="p-3">
               <p className="text-xs text-green-700 font-bold uppercase tracking-widest">Total Recebido</p>
               <p className="text-lg text-green-400 font-bold"><Money value={summary.paidAmount} lang={language} /></p>
             </CardContent>
           </Card>
           <Card className="py-0">
             <CardContent className="p-3">
               <p className="text-xs text-yellow-700 font-bold uppercase tracking-widest">Pendente</p>
               <p className="text-lg text-yellow-500 font-bold"><Money value={summary.pendingAmount} lang={language} /></p>
             </CardContent>
           </Card>
         </div>
      </div>
      </CardContent>
      </Card>

      {receiptSale && (
        <ReceiptModal 
           saleId={receiptSale.id} 
           saleNumber={receiptSale.number} 
           onClose={() => setReceiptSale(null)} 
        />
      )}


      {returnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
           <Card className="w-full max-w-md overflow-hidden py-0">
           <CardContent className="flex flex-col p-0">
              <div className="flex items-center justify-between p-4 border-b border-gray-800">
                 <h3 className="text-lg font-medium text-white flex items-center gap-2">
                    <RotateCcw className="w-5 h-5 text-orange-400" />
                    Fazer Devolução
                 </h3>
                 <Button variant="ghost" size="icon" onClick={() => setReturnModal(null)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></Button>
              </div>
              <div className="p-4 flex flex-col gap-4">
                 {returnError && <div className="text-red-400 text-xs font-bold">{returnError}</div>}
                 <div className="text-sm text-gray-300">
                   A devolução retorna o estoque ou libera a reserva. Se a venda já tiver pagamento, o valor pago será reembolsado no caixa/relatórios.
                 </div>
                 <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Anotação / motivo obrigatório</label>
                    <textarea value={returnNotes} onChange={e => setReturnNotes(e.target.value)} placeholder="Ex.: produto devolvido pelo cliente..." className="w-full bg-brand-navylight border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-brand-gold outline-none min-h-[80px]" />
                 </div>
                 <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Senha de autorização <span className="font-normal text-gray-500">(sua senha de login — Master ou Admin)</span></label>
                    <input type="password" value={returnAdminPassword} onChange={e => setReturnAdminPassword(e.target.value)} placeholder="Digite a senha" className="w-full bg-brand-navylight border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-brand-gold outline-none" />
                 </div>
                 <label className="flex items-start gap-2 cursor-pointer">
                    <input type="checkbox" checked={returnConfirm} onChange={(e) => setReturnConfirm(e.target.checked)} className="mt-1 bg-brand-navylight border-gray-700 rounded text-brand-gold focus:ring-offset-brand-navy focus:ring-brand-gold" />
                    <span className="text-xs text-gray-400 select-none">Confirmo que esta devolução deve retornar estoque e reverter o valor da venda.</span>
                 </label>
              </div>
              <div className="p-4 border-t border-gray-800 flex gap-2 justify-end bg-brand-navylight/30">
                 <Button variant="ghost" onClick={() => setReturnModal(null)} disabled={returnLoading}>Fechar</Button>
                 <Button onClick={handleReturnSale} disabled={!returnNotes.trim() || !returnAdminPassword || !returnConfirm || returnLoading} className="bg-orange-600 text-white hover:bg-orange-500">
                    {returnLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    Confirmar Devolução
                 </Button>
              </div>
           </CardContent>
           </Card>
        </div>
      )}

      {cancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
           <Card className="w-full max-w-sm overflow-hidden py-0">
           <CardContent className="flex flex-col p-0">
              <div className="flex items-center justify-between p-4 border-b border-gray-800">
                 <h3 className="text-lg font-medium text-white flex items-center gap-2">
                    <X className="w-5 h-5 text-red-500" />
                    Cancelar Venda
                 </h3>
                 <Button variant="ghost" size="icon" onClick={() => setCancelModal(null)} className="text-gray-400 hover:text-white">
                    <X className="w-5 h-5" />
                 </Button>
              </div>
              <div className="p-4 flex flex-col gap-4">
                 {cancelError && <div className="text-red-400 text-xs font-bold">{cancelError}</div>}

                 <div className="text-sm text-gray-300">
                   Esta ação reverterá todo o processo da venda.
                 </div>

                 <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Motivo do cancelamento (Obrigatório)</label>
                    <textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)} placeholder="Motivo detalhado..." className="w-full bg-brand-navylight border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-brand-gold outline-none min-h-[80px]" />
                 </div>

                 <label className="flex items-start gap-2 cursor-pointer">
                    <input type="checkbox" checked={cancelConfirm} onChange={(e) => setCancelConfirm(e.target.checked)} className="mt-1 bg-brand-navylight border-gray-700 rounded text-brand-gold focus:ring-offset-brand-navy focus:ring-brand-gold" />
                    <span className="text-xs text-gray-400 select-none">Confirmo que quero cancelar esta venda e reverter o estoque. Se houver pagamento registrado, será necessário reembolso.</span>
                 </label>
              </div>
              <div className="p-4 border-t border-gray-800 flex gap-2 justify-end bg-brand-navylight/30">
                 <Button variant="ghost" onClick={() => setCancelModal(null)} disabled={cancelLoading}>Fechar</Button>
                 <Button variant="destructive" onClick={handleCancelSale} disabled={!cancelReason || !cancelConfirm || cancelLoading}>
                    {cancelLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    Confirmar Cancelamento
                 </Button>
              </div>
           </CardContent>
           </Card>
        </div>
      )}
    </div>
  );
}
