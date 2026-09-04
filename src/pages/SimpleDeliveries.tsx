import React, { useEffect, useMemo, useState } from "react";
import { Truck, CheckCircle, Clock, Search, CalendarDays, RefreshCw, MapPin } from "lucide-react";
import { apiFetch } from "../lib/api";
import { Money } from "../components/Money";
import { useAdminTranslation } from "../lib/i18n";
import { useAuthStore } from "../stores/authStore";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Modal } from "../components/Modal";
import { cn } from "../lib/utils";

const deliveryLabels: Record<string, string> = {
  PENDING: "Aguardando entrega",
  DELIVERING: "Saiu para entrega",
  DELIVERED: "Entregue",
  RETURNED: "Devolvida",
  CANCELED: "Cancelada",
  CANCELLED: "Cancelada",
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function dateOnly(value?: string | null) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function formatDeliveryAddress(sale: any) {
  const line1 = [sale.addressStreet, sale.addressNumber].filter(Boolean).join(", ");
  const line2 = [sale.addressNeighborhood, sale.addressCity && sale.addressState ? `${sale.addressCity}/${sale.addressState}` : sale.addressCity].filter(Boolean).join(" - ");
  return [line1, line2].filter(Boolean).join(" - ");
}

export function SimpleDeliveries() {
  const { language } = useAdminTranslation();
  const user = useAuthStore((s) => s.user);
  const role = String((user as any)?.roleKey || (user as any)?.role || "").toLowerCase();
  const isPrivileged = ["admin", "master", "administrador", "administrator", "super admin", "super_admin"].includes(role);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("OPEN");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<any | null>(null);
  const [editStatus, setEditStatus] = useState("PENDING");
  const [editDate, setEditDate] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const today = todayIso();

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/sales/deliveries/simple?limit=300");
      const data = await res.json();
      setRows(Array.isArray(data.data) ? data.data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((sale) => {
      const status = String(sale.fulfillmentStatus || "PENDING");
      const due = dateOnly(sale.deliveryScheduledAt);
      const isOpen = !["DELIVERED", "RETURNED", "CANCELED", "CANCELLED"].includes(status);
      const matchText = !q || [sale.customerName, sale.customerPhone, sale.customerDocument, sale.number, sale.series].filter(Boolean).some((v) => String(v).toLowerCase().includes(q));
      if (!matchText) return false;
      if (filter === "OPEN") return isOpen;
      if (filter === "TODAY") return isOpen && due === today;
      if (filter === "LATE") return isOpen && due && due < today;
      if (filter === "PAID_NOT_DELIVERED") return sale.paymentStatus === "PAID" && isOpen;
      if (filter === "DELIVERED_NOT_PAID") return status === "DELIVERED" && sale.paymentStatus !== "PAID";
      if (filter === "PENDING") return status === "PENDING";
      if (filter === "DELIVERING") return status === "DELIVERING";
      if (filter === "DELIVERED") return status === "DELIVERED";
      return true;
    });
  }, [rows, filter, search, today]);

  const openEdit = (sale: any, status?: string) => {
    setEditing(sale);
    setEditStatus(status || sale.fulfillmentStatus || "PENDING");
    setEditDate(dateOnly(sale.deliveryScheduledAt));
    setEditNotes(sale.deliveryNotes || "");
  };

  const persistEdit = async (allowUnpaid = false) => {
    if (!editing) return false;
    const res = await apiFetch(`/api/sales/${editing.id}/fulfillment`, {
      method: "PATCH",
      body: JSON.stringify({
        fulfillmentStatus: editStatus,
        deliveryScheduledAt: editDate || null,
        deliveryNotes: editNotes || null,
        allowUnpaid,
      }),
    });
    if (res.ok) {
      setEditing(null);
      load();
      return true;
    }
    const data = await res.json().catch(() => ({}));
    if (res.status === 409 && data.code === "UNPAID_CONFIRM_REQUIRED" && isPrivileged) {
      const proceed = window.confirm("Esta venda ainda não está paga. Deseja continuar com a entrega mesmo assim?");
      if (proceed) return persistEdit(true);
      return false;
    }
    alert(data.error || "Erro ao atualizar entrega.");
    return false;
  };

  const saveEdit = async () => {
    if (!editing) return;
    const movingPhysically = ["DELIVERING", "DELIVERED"].includes(String(editStatus).toUpperCase());
    const unpaid = String(editing.paymentStatus || "PENDING").toUpperCase() !== "PAID";
    if (movingPhysically && unpaid) {
      if (!isPrivileged) {
        alert("Esta venda ainda não está paga. Somente Admin ou Master pode liberar a entrega.");
        return;
      }
      const proceed = window.confirm("Esta venda ainda não está paga. Deseja continuar com a entrega mesmo assim?");
      if (!proceed) return;
      await persistEdit(true);
      return;
    }
    await persistEdit(false);
  };

  const tabs = [
    ["OPEN", "Abertas"], ["TODAY", "Hoje"], ["LATE", "Atrasadas"], ["PENDING", "Aguardando"], ["DELIVERING", "Saiu"], ["DELIVERED", "Entregues"], ["PAID_NOT_DELIVERED", "Pagas não entregues"], ["DELIVERED_NOT_PAID", "Entregues não pagas"], ["ALL", "Todas"],
  ];

  return (
    <div className="simple-deliveries-page space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-white"><Truck className="h-6 w-6 text-brand-gold" /> Entregas</h1>
          <p className="text-sm text-gray-500">Controle simples de vendas aguardando entrega, entregues e pendências de pagamento.</p>
        </div>
        <Button variant="outline" className="hover:border-brand-gold hover:text-brand-gold" onClick={load}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Atualizar
        </Button>
      </div>

      <Card className="py-0">
        <CardContent className="space-y-3 p-3">
          <div className="flex items-center gap-2 rounded-lg border border-gray-800 bg-[#171717] px-3 py-2">
            <Search className="h-4 w-4 text-gray-500" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar cliente, telefone ou venda..." className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none" />
          </div>
          <div className="flex flex-wrap gap-2">
            {tabs.map(([key, label]) => (
              <Button
                key={key}
                variant={filter === key ? "default" : "outline"}
                size="sm"
                className={`h-8 shrink-0 rounded-full whitespace-nowrap px-4 text-[11px] font-bold uppercase tracking-wide ${filter === key ? "" : "hover:bg-transparent hover:border-gray-600 hover:text-white"}`}
                onClick={() => setFilter(key)}
              >
                {label}
              </Button>
            ))}
          </div>

          <div className="grid gap-3 border-t border-gray-800 pt-3 xl:grid-cols-2 2xl:grid-cols-3">
            {filtered.map((sale) => {
              const status = String(sale.fulfillmentStatus || "PENDING");
              const due = dateOnly(sale.deliveryScheduledAt);
              const isLate = due && due < today && !["DELIVERED", "RETURNED", "CANCELED", "CANCELLED"].includes(status);
              return (
                <Card key={sale.id} className={cn("py-0 shadow-md", isLate ? "border-red-500/40" : "border-gray-800")}>
                  <CardContent className="p-3">
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs font-bold uppercase tracking-wide text-gray-500">Venda #{sale.number}</div>
                        <div className="truncate text-sm font-bold text-white">{sale.customerName || "Cliente padrão"}</div>
                        {sale.customerPhone && <div className="text-xs text-gray-500">{sale.customerPhone}</div>}
                      </div>
                      <div className="text-right">
                        <Money value={sale.totalAmount} lang={language} className="text-sm font-black text-brand-gold" />
                        <Badge variant={sale.paymentStatus === "PAID" ? "success" : "warning"} className="mt-1">{sale.paymentStatus === "PAID" ? "Pago" : "A receber"}</Badge>
                      </div>
                    </div>
                    <div className="mb-3 grid grid-cols-2 gap-2 text-xs">
                      <Badge className="w-full justify-center" variant={
                        status === "DELIVERED" ? "success" :
                        status === "DELIVERING" ? "info" :
                        ["RETURNED", "CANCELED", "CANCELLED"].includes(status) ? "destructive" :
                        "secondary"
                      }><Clock className="h-3 w-3" />{deliveryLabels[status] || status}</Badge>
                      <div className={`rounded-lg bg-[#171717] px-2 py-1.5 text-gray-400 ${isLate ? "text-red-300" : ""}`}><CalendarDays className="mr-1 inline h-3 w-3" />{due ? new Date(`${due}T00:00:00`).toLocaleDateString("pt-BR") : "Sem data"}</div>
                    </div>
                    {sale.addressStreet && (
                      <div className="mb-3 flex items-center justify-between gap-2 rounded-lg bg-[#171717] px-2 py-1.5 text-xs text-gray-400">
                        <span className="min-w-0 truncate">{formatDeliveryAddress(sale)}</span>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(formatDeliveryAddress(sale) + (sale.addressCep ? `, ${sale.addressCep}` : ""))}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Abrir no mapa"
                          className="shrink-0 text-brand-gold hover:text-brand-goldhover"
                        >
                          <MapPin className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    )}
                    {sale.deliveryNotes && <p className="mb-3 rounded-lg bg-[#171717] px-2 py-1.5 text-xs text-gray-500">{sale.deliveryNotes}</p>}
                    <div className="flex flex-wrap justify-end gap-2">
                      {status === "PENDING" && <Button variant="outline" size="sm" className="border-blue-500/40 text-blue-300 hover:bg-transparent hover:text-blue-200" onClick={() => openEdit(sale, "DELIVERING")}>Saiu para entrega</Button>}
                      {status !== "DELIVERED" && <Button variant="outline" size="sm" className="border-emerald-500/40 text-emerald-300 hover:bg-transparent hover:text-emerald-200" onClick={() => openEdit(sale, "DELIVERED")}>Marcar entregue</Button>}
                      <Button variant="outline" size="sm" className="hover:bg-transparent hover:text-gray-300" onClick={() => openEdit(sale)}>Editar</Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filtered.length === 0 && <div className="rounded-xl border border-dashed border-gray-800 p-10 text-center text-gray-500">Nenhuma entrega encontrada.</div>}
        </CardContent>
      </Card>

      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title="Atualizar entrega">
        <div className="space-y-3">
          {editing?.paymentStatus !== "PAID" && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              Esta venda ainda não está paga. Admin/Master poderá decidir se deseja continuar ao salvar.
            </div>
          )}
          <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} className="w-full rounded-lg border border-gray-700 bg-brand-navylight px-3 py-2 text-white outline-none focus:border-brand-gold">
            <option value="PENDING">Aguardando entrega</option>
            <option value="DELIVERING">Saiu para entrega</option>
            <option value="DELIVERED">Entregue</option>
          </select>
          <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="w-full rounded-lg border border-gray-700 bg-brand-navylight px-3 py-2 text-white outline-none focus:border-brand-gold" />
          <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="Observações da entrega..." className="min-h-[90px] w-full resize-none rounded-lg border border-gray-700 bg-brand-navylight px-3 py-2 text-white outline-none focus:border-brand-gold" />
        </div>
        <div className="mt-4 flex justify-end gap-2 border-t border-gray-800 pt-4">
          <Button variant="outline" className="hover:bg-transparent hover:text-gray-300" onClick={() => setEditing(null)}>Cancelar</Button>
          <Button onClick={saveEdit}><CheckCircle className="h-4 w-4" />Salvar</Button>
        </div>
      </Modal>
    </div>
  );
}
