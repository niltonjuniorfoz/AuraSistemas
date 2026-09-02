import React, { useEffect, useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { Loader2, Package } from "lucide-react";
import { storeApiFetch } from "../../../lib/storeApi";
import { useStorePrefs, formatPrice } from "../../../stores/storePrefs";

// Mesmas cores de status de src/pages/store/OrderStatus.tsx — cada pedido linca pra lá (detalhe
// completo, QR do PIX, comprovante) em vez de duplicar aquela tela aqui.
const statusClasses: Record<string, string> = {
  AWAITING_PAYMENT: "border-amber-300 bg-amber-50 text-amber-800",
  PROOF_SENT: "border-sky-300 bg-sky-50 text-sky-800",
  CONFIRMED: "border-emerald-300 bg-emerald-50 text-emerald-800",
  CANCELED: "border-red-300 bg-red-50 text-red-700",
};

export function MyOrders() {
  const { t } = useTranslation();
  const { currency, rates } = useStorePrefs();
  const [orders, setOrders] = useState<any[] | null>(null);

  useEffect(() => {
    storeApiFetch("/api/store/account/orders").then((r) => r.json()).then(setOrders).catch(() => setOrders([]));
  }, []);

  const statusLabel = (s: string) => t(`orderStatus.status${s === "AWAITING_PAYMENT" ? "Awaiting" : s === "PROOF_SENT" ? "Proof" : s === "CONFIRMED" ? "Confirmed" : "Canceled"}`);

  if (!orders) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-stone-400" /></div>;

  if (orders.length === 0) {
    return (
      <div className="rounded-sm border border-stone-200 bg-white p-10 text-center">
        <Package className="mx-auto mb-3 h-8 w-8 text-stone-300" />
        <p className="text-sm text-stone-500">{t("account.semPedidos")}</p>
        <Link to="/loja/catalogo" className="mt-3 inline-block text-sm font-semibold text-amber-700 hover:underline">{t("account.irParaLoja")}</Link>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {orders.map((o) => (
        <Link key={o.id} to={`/loja/pedido/${o.code}`}
          className="flex items-center justify-between rounded-sm border border-stone-200 bg-white p-4 transition hover:border-stone-400">
          <div>
            <div className="font-mono text-xs text-stone-400">{o.code}</div>
            <div className="text-sm text-stone-600">{new Date(o.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}</div>
          </div>
          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusClasses[o.status] || statusClasses.AWAITING_PAYMENT}`}>
            {statusLabel(o.status)}
          </span>
          <span className="text-sm font-bold text-stone-900">{formatPrice(o.totalAmount, currency, rates)}</span>
        </Link>
      ))}
    </div>
  );
}
