import React, { useEffect, useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { Loader2, Heart, X } from "lucide-react";
import { storeApiFetch } from "../../../lib/storeApi";
import { useStorePrefs, formatPrice } from "../../../stores/storePrefs";

export function MyWishlist() {
  const { t } = useTranslation();
  const { currency, rates } = useStorePrefs();
  const [items, setItems] = useState<any[] | null>(null);

  const load = () => storeApiFetch("/api/store/account/wishlist").then((r) => r.json()).then(setItems).catch(() => setItems([]));
  useEffect(() => { load(); }, []);

  async function remove(productId: string) {
    setItems((cur) => cur?.filter((i) => i.productId !== productId) || cur);
    await storeApiFetch(`/api/store/account/wishlist/${productId}`, { method: "DELETE" });
  }

  if (!items) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-stone-400" /></div>;

  if (items.length === 0) {
    return (
      <div className="rounded-sm border border-stone-200 bg-white p-10 text-center">
        <Heart className="mx-auto mb-3 h-8 w-8 text-stone-300" />
        <p className="text-sm text-stone-500">{t("account.semFavoritos")}</p>
        <Link to="/loja/catalogo" className="mt-3 inline-block text-sm font-semibold text-amber-700 hover:underline">{t("account.irParaLoja")}</Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {items.map((p) => (
        <div key={p.id} className="group relative rounded-sm border border-stone-200 bg-white p-3">
          <button onClick={() => remove(p.productId)} title={t("account.remover")}
            className="absolute right-2 top-2 z-10 rounded-full bg-white/90 p-1.5 text-stone-400 shadow-sm hover:text-red-500">
            <X className="h-3.5 w-3.5" />
          </button>
          <Link to={`/loja/produto/${p.productId}`}>
            <div className="mb-2 flex aspect-square items-center justify-center overflow-hidden rounded-sm bg-stone-100">
              {p.imageUrl ? <img src={p.imageUrl} className="h-full w-full object-cover" /> : <Heart className="h-6 w-6 text-stone-300" />}
            </div>
            <p className="line-clamp-2 text-xs text-stone-700">{p.name}</p>
            <p className="mt-1 text-sm font-bold text-stone-900">{formatPrice(p.salePriceA, currency, rates)}</p>
            {(!p.isActive || !p.storeVisible) && <p className="mt-0.5 text-[10px] text-red-500">{t("account.produtoIndisponivel")}</p>}
          </Link>
        </div>
      ))}
    </div>
  );
}
