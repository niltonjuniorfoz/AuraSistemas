import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Bell, ShoppingCart, CreditCard, Users, RotateCcw, ShieldAlert, CheckCheck } from "lucide-react";
import { apiFetch } from "../lib/api";
import { toast } from "../components/Toast";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";

// Ícone + cor por tipo de notificação — mesma lógica de "eventos reais do negócio" descrita ao
// usuário (não copia conceitos de SaaS genérico tipo "assinatura renovada").
const TYPE_META: Record<string, { icon: any; cls: string }> = {
  ORDER_NEW: { icon: ShoppingCart, cls: "bg-orange-500/15 text-orange-300" },
  PAYMENT_CONFIRMED: { icon: CreditCard, cls: "bg-emerald-500/15 text-emerald-300" },
  PAYMENT_PROOF: { icon: CreditCard, cls: "bg-blue-500/15 text-blue-300" },
  PAYMENT_MISMATCH: { icon: CreditCard, cls: "bg-amber-500/15 text-amber-300" },
  CUSTOMER_NEW: { icon: Users, cls: "bg-purple-500/15 text-purple-300" },
  SALE_RETURNED: { icon: RotateCcw, cls: "bg-red-500/15 text-red-300" },
  MASTER_ACTION: { icon: ShieldAlert, cls: "bg-pink-500/15 text-pink-300" },
};

export function Notifications() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
  const [loading, setLoading] = useState(false);

  const load = async (f = filter) => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/notifications?filter=${f}`);
      if (res.ok) { const j = await res.json(); setRows(j.data || []); setUnreadCount(j.unreadCount || 0); }
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  const openNotification = async (n: any) => {
    if (!n.read) {
      await apiFetch(`/api/notifications/${n.id}/read`, { method: "POST" });
      load();
    }
    if (n.link) navigate(n.link);
  };

  const markAllRead = async () => {
    const res = await apiFetch("/api/notifications/mark-all-read", { method: "POST" });
    if (res.ok) { toast.success("Tudo marcado como lido."); load(); }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold text-white"><Bell className="h-6 w-6 text-brand-gold" /> Notificações</h2>
          <p className="text-sm text-gray-400">Mantenha-se atualizado com seus alertas e eventos mais recentes.</p>
        </div>
        <Button onClick={markAllRead} disabled={unreadCount === 0} variant="outline" size="default"
          className="px-3 has-[>svg]:px-3 rounded-lg border-gray-700 bg-brand-navylight text-white font-medium transition hover:border-brand-gold hover:bg-brand-navylight hover:text-white disabled:opacity-40 dark:border-gray-700 dark:bg-brand-navylight dark:hover:bg-brand-navylight dark:hover:border-brand-gold">
          <CheckCheck className="size-4" /> Marcar tudo como lido
        </Button>
      </div>

      <Card className="gap-0 py-0 rounded-2xl border-gray-800 bg-brand-navylight shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-800 p-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white">Todas as notificações</span>
            {unreadCount > 0 && <Badge variant="default" className="bg-brand-gold text-brand-navydark text-[11px] font-bold">{unreadCount} não lida{unreadCount > 1 ? "s" : ""}</Badge>}
          </div>
          <div className="flex rounded-lg border border-gray-800 bg-[#171717] p-1">
            {([["all", "Todas"], ["unread", "Não lidas"], ["read", "Lidas"]] as const).map(([val, label]) => (
              <Button key={val} onClick={() => setFilter(val)} variant="ghost"
                className={`h-auto rounded-md px-3 py-1.5 text-xs font-medium transition ${filter === val ? "bg-brand-gold text-brand-navydark hover:bg-brand-gold hover:text-brand-navydark dark:bg-brand-gold dark:hover:bg-brand-gold" : "text-gray-300 hover:bg-transparent hover:text-white dark:hover:bg-transparent"}`}>
                {label}
              </Button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="py-10 text-center text-sm text-gray-500">Carregando...</div>
        ) : rows.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-500">Nenhuma notificação {filter === "unread" ? "não lida" : filter === "read" ? "lida" : ""}.</div>
        ) : (
          <div className="divide-y divide-gray-800">
            {rows.map((n) => {
              const meta = TYPE_META[n.type] || { icon: Bell, cls: "bg-gray-700/40 text-gray-300" };
              const Icon = meta.icon;
              return (
                <button key={n.id} onClick={() => openNotification(n)}
                  className={`flex w-full items-start gap-3 p-4 text-left transition hover:bg-brand-navy/60 ${!n.read ? "bg-brand-navy/30" : ""}`}>
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${meta.cls}`}><Icon className="h-4 w-4" /></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">{n.title}</span>
                      {!n.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-gold" />}
                    </div>
                    <div className="mt-0.5 text-sm text-gray-400">{n.message}</div>
                    <div className="mt-1 text-[11px] text-gray-600">
                      {n.createdAt ? formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: ptBR }) : ""}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
