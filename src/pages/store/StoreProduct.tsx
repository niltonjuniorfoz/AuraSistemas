import React, { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, Loader2, Minus, Package, Plus, ShieldCheck, ShoppingBag, Truck } from "lucide-react";
import { useShopCart } from "../../stores/shopCart";
import { useStorePrefs, formatPrice } from "../../stores/storePrefs";
import { ShopProductCard } from "./ShopProductCard";
import { PremiumCta } from "./PremiumCta";
import { translateCategoryName, translateStockStatus } from "./i18n";

function shuffleProducts(items: any[]) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Recomendações da página de produto: primeiro tenta mostrar categorias
// diferentes e depois completa a faixa com outros itens aleatórios. Assim a
// seção não fica presa à categoria do produto aberto (que às vezes só tinha
// um item relacionado) e continua útil mesmo em catálogos pequenos.
function pickVariedRecommendations(items: any[], currentId: string | undefined, limit = 10) {
  const unique = new Map<string, any>();
  for (const item of items || []) {
    if (!item?.id || item.id === currentId || Number(item.maxQty || 0) <= 0) continue;
    if (!unique.has(item.id)) unique.set(item.id, item);
  }

  const pool = shuffleProducts([...unique.values()]);
  const selected: any[] = [];
  const usedIds = new Set<string>();
  const usedGroups = new Set<string>();

  // Uma opção de cada categoria primeiro.
  for (const item of pool) {
    const groupKey = item.groupId ? String(item.groupId) : `produto:${item.id}`;
    if (usedGroups.has(groupKey)) continue;
    selected.push(item);
    usedIds.add(item.id);
    usedGroups.add(groupKey);
    if (selected.length >= limit) return selected;
  }

  // Se houver menos categorias que o limite, completa com outros produtos.
  for (const item of pool) {
    if (usedIds.has(item.id)) continue;
    selected.push(item);
    usedIds.add(item.id);
    if (selected.length >= limit) break;
  }
  return selected;
}

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
  const pageRef = useRef<HTMLElement>(null);
  const relatedRef = useRef<HTMLDivElement>(null);

  // O ERP global usa body escuro. No iOS/Safari o rubber-band/viewport dinâmico
  // pode expor esse body por trás da rota pública e transformar a página em uma
  // tela preta. Enquanto a página de produto estiver montada, sincroniza html e
  // body com o fundo herdado da própria loja e força color-scheme claro.
  useEffect(() => {
    const body = document.body;
    const html = document.documentElement;
    const previous = {
      bodyBackground: body.style.backgroundColor,
      htmlBackground: html.style.backgroundColor,
      colorScheme: html.style.colorScheme,
    };
    const inheritedStoreBg = pageRef.current
      ? getComputedStyle(pageRef.current).getPropertyValue("--store-bg").trim()
      : "";
    const background = inheritedStoreBg || "#fff5f7";
    body.style.backgroundColor = background;
    html.style.backgroundColor = background;
    html.style.colorScheme = "light";
    return () => {
      body.style.backgroundColor = previous.bodyBackground;
      html.style.backgroundColor = previous.htmlBackground;
      html.style.colorScheme = previous.colorScheme;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true); setNotFound(false); setImgIdx(0); setQty(1); setSelectedVariant(null);

    const detailRequest = fetch(`/api/store/product/${id}`)
      .then(async (r) => { if (!r.ok) throw new Error(); return r.json(); });
    const catalogRequest = fetch("/api/store/products?limit=120")
      .then(async (r) => (r.ok ? r.json() : { data: [] }))
      .catch(() => ({ data: [] }));

    Promise.all([detailRequest, catalogRequest])
      .then(([detail, catalog]) => {
        if (!alive) return;
        const catalogItems = Array.isArray(catalog?.data) ? catalog.data : [];
        const legacyRelated = Array.isArray(detail?.related) ? detail.related : [];
        const recommendations = pickVariedRecommendations(
          [...catalogItems, ...legacyRelated],
          detail?.id || id,
          10,
        );
        const hydratedProduct = { ...detail, related: recommendations };
        setP(hydratedProduct);
        if (detail.hasVariants && detail.variants.length > 0) {
          const firstAvailable = detail.variants.find((v: any) => v.maxQty > 0) || detail.variants[0];
          setSelectedVariant(firstAvailable);
        }
      })
      .catch(() => { if (alive) setNotFound(true); })
      .finally(() => { if (alive) setLoading(false); });
    window.scrollTo({ top: 0 });
    return () => { alive = false; };
  }, [id]);

  if (loading) return <main ref={pageRef} className="flex min-h-[70dvh] items-center justify-center bg-[var(--store-bg,#fff5f7)] text-stone-400" style={{ colorScheme: "light" }}><Loader2 className="mr-2 h-5 w-5 animate-spin" /> {t("product.carregando")}</main>;
  if (notFound || !p) return (
    <main ref={pageRef} className="flex min-h-[70dvh] flex-col items-center justify-center gap-3 bg-[var(--store-bg,#fff5f7)] text-stone-400" style={{ colorScheme: "light" }}>
      <Package className="h-12 w-12 text-stone-300" />
      {t("product.naoDisponivel")}
      <Link to="/loja/catalogo" className="text-sm font-semibold text-amber-700 hover:underline">{t("product.voltarCatalogo")}</Link>
    </main>
  );

  const currentProduct = selectedVariant || p;
  const inCart = items.find((i) => i.productId === currentProduct.id);
  const remaining = currentProduct.maxQty - (inCart?.quantity || 0);
  const img = p.images[imgIdx] || null;

  const addCurrentToCart = () => {
    if (remaining <= 0 || (p.hasVariants && !selectedVariant)) return;
    add({
      ...currentProduct,
      name: p.name + (p.hasVariants ? ` (${currentProduct.variantName})` : ""),
      imageUrl: p.imageUrl,
    }, Math.min(qty, remaining));
    setQty(1);
    setOpen(true);
  };

  return (
    <main ref={pageRef} className="mx-auto min-h-[100dvh] w-[95%] max-w-[1600px] bg-[var(--store-bg,#fff5f7)] px-3 pt-5 pb-36 text-[var(--store-text,#6b5b5a)] sm:px-4 md:py-8" style={{ colorScheme: "light" }}>
      {/* Migalha */}
      <nav className="mb-5 flex items-center gap-1 text-xs uppercase tracking-wide text-stone-400">
        <Link to="/loja" className="hover:text-stone-700">{t("product.inicio")}</Link>
        <ChevronRight className="h-3 w-3" />
        <Link to="/loja/catalogo" className="hover:text-stone-700">{t("product.produtos")}</Link>
        {p.groupName && (<><ChevronRight className="h-3 w-3" /><Link to={`/loja/catalogo?cat=${p.groupId}`} className="hover:text-stone-700">{translateCategoryName(p.groupName, i18n.language)}</Link></>)}
      </nav>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,430px)_minmax(0,1fr)] lg:justify-center lg:gap-10">
        {/* Galeria */}
        <div className="mx-auto w-full max-w-[430px] lg:mx-0">
          <div className="flex h-[230px] items-center justify-center overflow-hidden rounded-xl border border-stone-200 bg-white p-3 sm:h-[320px] lg:h-[400px]">
            {img
              ? <img src={img} alt={p.name} className="h-full w-full object-contain" />
              : <div className="flex h-full items-center justify-center"><Package className="h-16 w-16 text-stone-200" /></div>}
          </div>
          {p.images.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {p.images.map((u: string, i: number) => (
                <button key={i} onClick={() => setImgIdx(i)}
                  className={`h-12 w-12 shrink-0 overflow-hidden rounded-lg border transition ${i === imgIdx ? "border-[var(--store-accent,#e96f95)]" : "border-stone-200 hover:border-stone-400"}`}>
                  <img src={u} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          {p.groupName && <div className="text-[11px] font-bold uppercase tracking-widest text-amber-700">{translateCategoryName(p.groupName, i18n.language)}</div>}
          <h1 className="mt-1 text-2xl font-bold leading-[1.05] text-stone-900 sm:text-3xl" style={{ fontFamily: "var(--store-font-heading, 'Barlow Condensed'), sans-serif" }}>{p.name}</h1>
          {(p.brand || p.model) && (
            <div className="mt-1 text-sm text-stone-500">{[p.brand, p.model].filter(Boolean).join(" · ")}</div>
          )}

          <div className="mt-5 flex items-end gap-3">
            <div className="text-3xl font-black text-stone-900 sm:text-4xl">{formatPrice(currentProduct.price, currency, rates)}</div>
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
              onClick={addCurrentToCart}
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

      {/* Recomendações variadas */}
      {p.related?.length > 0 && (
        <section className="mt-12">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="h-px w-7 shrink-0 bg-[var(--store-accent,#e96f95)]/45" />
              <h2 className="font-serif text-base font-medium tracking-[0.035em] text-[var(--store-accent,#d46a86)] sm:text-lg">{t("product.vocejaGostar")}</h2>
            </div>
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={() => relatedRef.current?.scrollBy({ left: -360, behavior: "smooth" })} className="flex h-8 w-8 items-center justify-center rounded-full border border-rose-100 bg-white text-[var(--store-accent,#e96f95)] transition hover:border-[var(--store-accent,#e96f95)]"><ChevronLeft className="h-4 w-4" /></button>
              <button type="button" onClick={() => relatedRef.current?.scrollBy({ left: 360, behavior: "smooth" })} className="flex h-8 w-8 items-center justify-center rounded-full border border-rose-100 bg-white text-[var(--store-accent,#e96f95)] transition hover:border-[var(--store-accent,#e96f95)]"><ChevronRight className="h-4 w-4" /></button>
              <Link to="/loja/catalogo" className="ml-1 shrink-0 text-[10px] font-semibold text-[var(--store-accent,#e96f95)]">Ver mais</Link>
            </div>
          </div>
          <div ref={relatedRef} className="flex snap-x snap-mandatory gap-2.5 overflow-x-auto pb-3 scrollbar-hide">
            {p.related.map((r: any) => (
              <div key={r.id} className="w-[44vw] min-w-[148px] max-w-[190px] shrink-0 snap-start sm:w-[180px] lg:w-[calc((100%_-_4rem)/7)]">
                <ShopProductCard p={r} />
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="fixed inset-x-0 bottom-[3.45rem] z-30 border-t border-rose-100 bg-white/96 px-3 py-1.5 shadow-[0_-8px_24px_rgba(80,50,60,0.08)] backdrop-blur md:hidden">
        <div className="mx-auto flex w-full max-w-lg items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="truncate text-[10px] font-semibold text-stone-500">{p.name}</div>
            <div className="text-lg font-black text-stone-900">{formatPrice(currentProduct.price, currency, rates)}</div>
          </div>
          <button
            type="button"
            onClick={addCurrentToCart}
            disabled={remaining <= 0 || (p.hasVariants && !selectedVariant)}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--store-accent,#e96f95)] px-5 text-sm font-bold text-white shadow-sm transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
          >
            <ShoppingBag className="h-4 w-4" />
            {remaining <= 0 ? t("product.esgotado") : t("product.adicionarSacola")}
          </button>
        </div>
      </div>
    </main>
  );
}
