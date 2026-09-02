import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { ChevronRight, Loader2, Minus, Package, Plus, ShieldCheck, ShoppingBag, Truck } from "lucide-react";
import { useShopCart } from "../../stores/shopCart";
import { useStorePrefs, formatPrice } from "../../stores/storePrefs";
import { ShopProductCard } from "./ShopProductCard";
import { PremiumCta } from "./PremiumCta";
import { translateCategoryName, translateStockStatus } from "./i18n";

// Página individual do produto: galeria, descrição, quantidade e relacionados.
export function StoreProduct() {
  const { t, i18n } = useTranslation();
  const { currency, rates } = useStorePrefs();
  const { id } = useParams();
  const { items, add, setOpen } = useShopCart();
  const [p, setP] = useState<any>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [imgIdx, setImgIdx] = useState(0);
  const [qty, setQty] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true); setNotFound(false); setImgIdx(0); setQty(1); setSelectedVariant(null);
    fetch(`/api/store/product/${id}`)
      .then(async (r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((j) => {
        if (alive) {
          setP(j);
          if (j.hasVariants && j.variants.length > 0) {
             const firstAvailable = j.variants.find((v: any) => v.maxQty > 0) || j.variants[0];
             setSelectedVariant(firstAvailable);
          }
        }
      })
      .catch(() => { if (alive) setNotFound(true); })
      .finally(() => { if (alive) setLoading(false); });
    window.scrollTo({ top: 0 });
    return () => { alive = false; };
  }, [id]);

  if (loading) return <main className="flex min-h-[50vh] items-center justify-center text-stone-400"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> {t("product.carregando")}</main>;
  if (notFound || !p) return (
    <main className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-stone-400">
      <Package className="h-12 w-12 text-stone-300" />
      {t("product.naoDisponivel")}
      <Link to="/loja/catalogo" className="text-sm font-semibold text-amber-700 hover:underline">{t("product.voltarCatalogo")}</Link>
    </main>
  );

  const currentProduct = selectedVariant || p;
  const inCart = items.find((i) => i.productId === currentProduct.id);
  const remaining = currentProduct.maxQty - (inCart?.quantity || 0);
  const img = p.images[imgIdx] || null;

  return (
    <main className="mx-auto w-[95%] max-w-[1600px] px-4 py-8">
      {/* Migalha */}
      <nav className="mb-5 flex items-center gap-1 text-xs uppercase tracking-wide text-stone-400">
        <Link to="/loja" className="hover:text-stone-700">{t("product.inicio")}</Link>
        <ChevronRight className="h-3 w-3" />
        <Link to="/loja/catalogo" className="hover:text-stone-700">{t("product.produtos")}</Link>
        {p.groupName && (<><ChevronRight className="h-3 w-3" /><Link to={`/loja/catalogo?cat=${p.groupId}`} className="hover:text-stone-700">{translateCategoryName(p.groupName, i18n.language)}</Link></>)}
      </nav>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Galeria */}
        <div>
          <div className="aspect-square overflow-hidden rounded-3xl border border-stone-200 bg-white">
            {img
              ? <img src={img} alt={p.name} className="h-full w-full object-contain" />
              : <div className="flex h-full items-center justify-center"><Package className="h-16 w-16 text-stone-200" /></div>}
          </div>
          {p.images.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {p.images.map((u: string, i: number) => (
                <button key={i} onClick={() => setImgIdx(i)}
                  className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition ${i === imgIdx ? "border-amber-600" : "border-stone-200 hover:border-stone-400"}`}>
                  <img src={u} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          {p.groupName && <div className="text-[11px] font-bold uppercase tracking-widest text-amber-700">{translateCategoryName(p.groupName, i18n.language)}</div>}
          <h1 className="mt-1 text-3xl font-bold leading-tight text-stone-900" style={{ fontFamily: "var(--store-font-heading, 'Barlow Condensed'), sans-serif" }}>{p.name}</h1>
          {(p.brand || p.model) && (
            <div className="mt-1 text-sm text-stone-500">{[p.brand, p.model].filter(Boolean).join(" · ")}</div>
          )}

          <div className="mt-5 flex items-end gap-3">
            <div className="text-4xl font-black text-stone-900">{formatPrice(currentProduct.price, currency, rates)}</div>
            <span className={`mb-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${currentProduct.stockStatus === "available" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-700"}`}>
              {translateStockStatus(t, currentProduct.stockStatus, currentProduct.stockQty)}
            </span>
          </div>
          <div className="mt-1 text-xs text-stone-400">{t("product.semTaxa")}</div>

          {/* Variantes */}
          {p.hasVariants && (
            <div className="mt-6">
              <h3 className="mb-2 text-sm font-bold uppercase tracking-widest text-stone-900">{t("product.opcoes")}</h3>
              <div className="flex flex-wrap gap-2">
                {p.variants.map((v: any) => (
                  <button
                    key={v.id}
                    onClick={() => { setSelectedVariant(v); setQty(1); }}
                    className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                      selectedVariant?.id === v.id
                        ? "border-amber-600 bg-amber-50 text-amber-700"
                        : "border-stone-200 bg-white text-stone-600 hover:border-stone-400"
                    } ${v.maxQty === 0 ? "opacity-50" : ""}`}
                  >
                    {v.variantName}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantidade + sacola */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="flex items-center rounded-full border border-stone-300 bg-white">
              <button onClick={() => setQty(Math.max(1, qty - 1))} disabled={remaining <= 0} className="flex h-11 w-11 items-center justify-center rounded-l-full hover:bg-stone-100 disabled:opacity-40 disabled:hover:bg-transparent"><Minus className="h-4 w-4" /></button>
              <span className="w-10 text-center font-bold">{remaining <= 0 ? 0 : qty}</span>
              <button onClick={() => setQty(Math.min(remaining, qty + 1))} disabled={remaining <= 0} className="flex h-11 w-11 items-center justify-center rounded-r-full hover:bg-stone-100 disabled:opacity-40 disabled:hover:bg-transparent"><Plus className="h-4 w-4" /></button>
            </div>
            <PremiumCta
              size="md"
              className="!w-auto flex-1 sm:flex-none"
              onClick={() => {
                // Passar o name e imageUrl do pai se a variante não tiver
                add({ ...currentProduct, name: p.name + (p.hasVariants ? ` (${currentProduct.variantName})` : ''), imageUrl: p.imageUrl }, qty);
                setQty(1);
              }}
              disabled={remaining <= 0 || (p.hasVariants && !selectedVariant)}
            >
              <ShoppingBag className="h-4 w-4" /> {remaining <= 0 ? t("product.limiteSacola") : t("product.adicionarSacola")}
            </PremiumCta>
            {inCart && (
              <button onClick={() => setOpen(true)} className="text-sm font-semibold text-amber-700 hover:underline">
                {t("product.verSacola")} ({inCart.quantity})
              </button>
            )}
          </div>

          {/* Confiança */}
          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            <div className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white p-3 text-xs text-stone-600">
              <ShieldCheck className="h-4 w-4 shrink-0 text-amber-600" /> {t("product.pagamentoPix")}
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white p-3 text-xs text-stone-600">
              <Truck className="h-4 w-4 shrink-0 text-amber-600" /> {t("product.retiradaEntrega")}
            </div>
          </div>

          {/* Descrição */}
          {p.description && (
            <div className="mt-6">
              <h2 className="mb-2 text-sm font-bold uppercase tracking-widest text-stone-400">{t("product.sobreProduto")}</h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-stone-600">{p.description}</p>
            </div>
          )}
        </div>
      </div>

      {/* Relacionados */}
      {p.related?.length > 0 && (
        <section className="mt-14">
          <h2 className="mb-4 text-2xl font-bold text-stone-900" style={{ fontFamily: "var(--store-font-heading, 'Barlow Condensed'), sans-serif" }}>{t("product.vocejaGostar")}</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {p.related.map((r: any) => <ShopProductCard key={r.id} p={r} />)}
          </div>
        </section>
      )}
    </main>
  );
}
