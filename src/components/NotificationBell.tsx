import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Bell } from "lucide-react";
import { apiFetch } from "../lib/api";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

// Sino de notificações do cabeçalho — mesmo padrão de dropdown âncorado (relative + fixed
// backdrop + absolute panel) já usado no seletor de período do Painel e nos dropdowns da loja.
export function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadCount = async () => {
    try {
      const res = await apiFetch("/api/notifications/unread-count");
      if (res.ok) { const j = await res.json(); setUnreadCount(j.count || 0); }
    } catch { /* silencioso — não deixa o sino quebrar o resto do cabeçalho */ }
  };

  useEffect(() => {
    loadCount();
    const interval = setInterval(() => { if (document.visibilityState === "visible") loadCount(); }, 30000);
    return () => clearInterval(interval);
  }, []);

  const openPanel = async () => {
    const next = !open;
    setOpen(next);
    if (next) {
      try {
        const res = await apiFetch("/api/notifications?filter=all&limit=6");
        if (res.ok) { const j = await res.json(); setRows(j.data || []); setUnreadCount(j.unreadCount || 0); }
      } catch { /* painel abre vazio, contador do sino segue valendo */ }
    }
  };

  const openNotification = async (n: any) => {
    setOpen(false);
    if (!n.read) { await apiFetch(`/api/notifications/${n.id}/read`, { method: "POST" }); loadCount(); }
    if (n.link) navigate(n.link);
  };

  return (
    <div className="relative">
      <button onClick={openPanel} aria-label="Notificações"
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-gray-800 bg-brand-navylight text-gray-300 transition hover:border-brand-gold hover:text-white">
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-2 w-80 max-w-[90vw] overflow-hidden rounded-xl border border-gray-800 bg-brand-navylight shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-800 p-3">
              <span className="text-sm font-semibold text-white">Notificações</span>
              <button onClick={() => { setOpen(false); navigate("/notifications"); }} className="text-[11px] font-bold text-brand-gold hover:underline">ver todas</button>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {rows.length === 0 ? (
                <div className="py-8 text-center text-sm text-gray-500">Nenhuma notificação.</div>
              ) : rows.map((n) => (
                <button key={n.id} onClick={() => openNotification(n)}
                  className={`flex w-full flex-col gap-0.5 border-b border-gray-800/60 p-3 text-left transition hover:bg-brand-navy/60 last:border-0 ${!n.read ? "bg-brand-navy/30" : ""}`}>
                  <div className="flex items-center gap-1.5">
                    {!n.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-gold" />}
                    <span className="text-xs font-semibold text-white">{n.title}</span>
                  </div>
                  <span className="line-clamp-2 text-[11px] text-gray-400">{n.message}</span>
                  <span className="text-[10px] text-gray-600">
                    {n.createdAt ? formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: ptBR }) : ""}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
