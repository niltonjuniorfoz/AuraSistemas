import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { Package, Plus, Heart, ExternalLink, Copy, Check } from "lucide-react";
import { useShopCart } from "../../stores/shopCart";
import { useStorePrefs, formatPrice } from "../../stores/storePrefs";
import { useCustomerAuthStore } from "../../stores/customerAuth";
import { useWishlistStore } from "../../stores/wishlist";
import { storeApiFetch } from "../../lib/storeApi";
import { translateCategoryName, translateStockStatus } from "./i18n";
import { useEditMode } from "./editor/EditModeContext";
import { BorderBeam } from "../../components/ui/border-beam";
import { PremiumCta } from "./PremiumCta";
import { CodeFlag } from "./flagIcons";

type PromotionType = "oferta" | "outlet";

// O endpoint publico ja sabe quais produtos pertencem aos canais Oferta e
// Outlet, mas a resposta do catalogo normal nao carrega essa informacao. Para
// nao fazer 2 requisicoes POR card, todos os cards compartilham um unico mapa
// carregado em lote e renovado depois de alguns segundos. Assim o selo aparece
// tambem nas vitrines normais sem alterar preco/estoque do produto.
let promotionMapPromise: Promise<Map<string, PromotionType>> | null = null;
let promotionMapCache: Map<string, PromotionType> | null = null;
let promotionMapFetchedAt = 0;
const PROMOTION_CACHE_MS = 15_000;

function loadPromotionMap(): Promise<Map<string, PromotionType>> {
  const now = Date.now();
  if (promotionMapCache && now - promotionMapFetchedAt < PROMOTION_CACHE_MS) {
    return Promise.resolve(promotionMapCache);
  }
  if (promotionMapPromise) return promotionMapPromise;

  const load = async (canal: PromotionType) => {
    try {
      const res = await fetch(`/api/store/products?canal=${canal}&limit=120`, { cache: "no-store" });
      if (!res.ok) return [] as any[];
      const json = await res.json();
      return Array.isArray(json?.data) ? json.data : [];
    } catch {
      return [] as any[];
    }
  };

  promotionMapPromise = Promise.all([load("outlet"), load("oferta")])
    .then(([outletRows, ofertaRows]) => {
      const map = new Map<string, PromotionType>();
      // Oferta tem prioridade visual se o mesmo produto tiver unidades nos
      // dois canais ao mesmo tempo.
      for (const item of outletRows) if (item?.id) map.set(String(item.id), "outlet");
      for (const item of ofertaRows) if (item?.id) map.set(String(item.id), "oferta");
      promotionMapCache = map;
      promotionMapFetchedAt = Date.now();
      return map;
    })
    .finally(() => {
      promotionMapPromise = null;
    });

  return promotionMapPromise;
}

// Card de vitrine (home, catálogo e relacionados). Clique abre a página do
// produto; o botão + adiciona direto na sacola.
export const ShopProductCard: React.FC<{ p: any }> = ({ p }) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  // null fora do editor — o ⤷ "abrir esta página no editor" só existe lá.
  const editCtx = useEditMode();
  const { currency, rates, allowedCurrencies } = useStorePrefs();
  const { items, add, setOpen } = useShopCart();
  const inCart = items.find((i) => i.productId === p.id);
  // Sem isso, um produto esgotado que ainda não está no carrinho (inCart
  // undefined) escapava da checagem e virava item fantasma de quantidade 0.
  const soldOutForMe = (inCart?.quantity || 0) >= p.maxQty;

  const customer = useCustomerAuthStore((s) => s.customer);
  const favorited = useWishlistStore((s) => s.ids.has(p.id));
  const { add: favAdd, remove: favRemove } = useWishlistStore();
  const toggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    // Dentro do editor o coração é só visual (fidelidade de preview): admin
    // não é cliente — não navega pra /conta nem mexe numa wishlist de verdade.
    if (editCtx) return;
    if (!customer) { navigate("/loja/conta"); return; }
    if (favorited) {
      favRemove(p.id);
      storeApiFetch(`/api/store/account/wishlist/${p.id}`, { method: "DELETE" }).catch(() => favAdd(p.id));
    } else {
      favAdd(p.id);
      storeApiFetch("/api/store/account/wishlist", { method: "POST", body: JSON.stringify({ productId: p.id }) }).catch(() => favRemove(p.id));
    }
  };

  const [promotionType, setPromotionType] = useState<PromotionType | null>(null);
  const [promotionChecked, setPromotionChecked] = useState(false);
  useEffect(() => {
    let alive = true;
    setPromotionChecked(false);
    loadPromotionMap().then((map) => {
      if (!alive) return;
      setPromotionType(map.get(String(p.id)) || null);
      setPromotionChecked(true);
    });
    return () => { alive = false; };
  }, [p.id]);

  // Troca automática de foto no hover: mostra a 2ª foto assim que o mouse
  // entra, segura 2s, vai pra 3ª (segura 3s), pra 4ª (segura 3s) e volta pra
  // 1ª — em loop enquanto o mouse ficar em cima. Sai do hover = volta pra
  // foto principal na hora, sem esperar o timer da vez terminar.
  const images: string[] = Array.isArray(p.images) && p.images.length > 0 ? p.images : (p.imageUrl ? [p.imageUrl] : []);
  const HOLD_MS = [2000, 2000, 3000, 3000];
  const [photoIdx, setPhotoIdx] = useState(0);
  const cycleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (cycleTimer.current) clearTimeout(cycleTimer.current); }, []);
  const scheduleNext = (fromIdx: number) => {
    if (images.length <= 1) return;
    cycleTimer.current = setTimeout(() => {
      const next = (fromIdx + 1) % images.length;
      setPhotoIdx(next);
      scheduleNext(next);
    }, HOLD_MS[fromIdx % HOLD_MS.length]);
  };
  const startPhotoCycle = () => {
    if (images.length <= 1) return;
    const next = 1 % images.length;
    setPhotoIdx(next);
    scheduleNext(next);
  };
  const stopPhotoCycle = () => {
    if (cycleTimer.current) { clearTimeout(cycleTimer.current); cycleTimer.current = null; }
    setPhotoIdx(0);
  };

  const [copied, setCopied] = useState(false);
  const copySku = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!p.sku) return;
    navigator.clipboard?.writeText(p.sku).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    }).catch(() => {});
  };

  // Segunda linha de preço só existe quando a loja realmente disponibiliza
  // mais de uma moeda. Se BRL for a unica moeda, alem de esconder a segunda
  // linha tambem nao faz sentido repetir a bandeira do Brasil no preco.
  const secondaryCurrency = allowedCurrencies.length > 1 ? (currency === "BRL" ? allowedCurrencies.find((code) => code !== "BRL") || null : "BRL") : null;
  const hidePrimaryFlag = allowedCurrencies.length === 1 && currency === "BRL";

  const stockQty = Number(p.stockQty || 0);
  const isOutOfStock = p.stockStatus === "out" || Number(p.maxQty || 0) <= 0;
  const showLastUnits = !p.hasVariants && !isOutOfStock && promotionChecked && !promotionType && stockQty > 0 && stockQty <= 3;

  return (
    <Link to={`/loja/produto/${p.id}`} onMouseEnter={startPhotoCycle} onMouseLeave={stopPhotoCycle}
      className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-[var(--store-accent,#C99C5A)]/20 bg-white transition duration-200 hover:-translate-y-0.5 hover:border-[var(--store-accent,#C99C5A)]/60 hover:shadow-md hover:shadow-stone-200/50">
      <div className="pointer-events-none absolute inset-0 z-10 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <BorderBeam colorFrom="var(--store-accent, #C99C5A)" colorTo="var(--store-accent, #C99C5A)" duration={4} size={80} />
      </div>
      <div className="relative aspect-square overflow-hidden bg-white p-3 sm:p-4">
        {images.length > 0
          ? <img src={images[photoIdx] || images[0]} alt={p.name} loading="lazy" className="h-full w-full object-contain transition duration-500 group-hover:scale-105" />
          : <div className="flex h-full items-center justify-center"><Package className="h-10 w-10 text-stone-300" /></div>}
        {p.hasVariants ? (
          <span className="absolute left-2 top-2 rounded-full bg-stone-900 px-2.5 py-1 text-[10px] font-bold text-white">{t("product.opcoes")}</span>
        ) : isOutOfStock ? (
          <span className="absolute left-2 top-2 rounded-full bg-red-600 px-2.5 py-1 text-[10px] font-bold text-white">{translateStockStatus(t, "out", undefined)}</span>
        ) : promotionChecked && promotionType ? (
          <span className={`absolute left-2 top-2 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white ${promotionType === "oferta" ? "bg-rose-500" : "bg-slate-700"}`}>
            {promotionType === "oferta" ? "Oferta" : "Outlet"}
          </span>
        ) : showLastUnits ? (
          <span className="absolute left-2 top-2 rounded-full bg-red-600 px-2.5 py-1 text-[10px] font-bold text-white">{translateStockStatus(t, "low", stockQty)}</span>
        ) : null}
        {/* Coração só aparece no hover/foco (como no card ativo da referência) —
            exceto se já favoritado, aí fica sempre visível pro cliente gerenciar. */}
        <button onClick={toggleFavorite} aria-label={t("account.favoritar")}
          className={`absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-stone-500 shadow-sm transition hover:text-red-500 ${favorited ? "" : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100 max-md:opacity-100"}`}>
          <Heart className={`h-4 w-4 ${favorited ? "fill-red-500 text-red-500" : ""}`} />
        </button>
        {editCtx && (
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate(`/store-settings/editor/produto/${p.id}`); }}
            title="Abrir esta página de produto no editor"
            className="absolute right-2 top-12 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-amber-500 text-stone-900 shadow-sm transition hover:bg-amber-400">
            <ExternalLink className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="flex flex-1 flex-col items-center px-2.5 pb-2.5 text-center sm:px-3 sm:pb-3">
        <div className="min-h-[12px] text-[8px] font-semibold uppercase tracking-[0.12em] text-stone-400 sm:min-h-[14px] sm:text-[9px]">
          {p.groupName ? translateCategoryName(p.groupName, i18n.language) : null}
        </div>
        <div className="mt-1 line-clamp-2 min-h-[2.2rem] text-[11px] font-bold leading-[1.15] text-stone-800 sm:min-h-[2.35rem] sm:text-xs" style={{ fontFamily: "var(--store-font-heading, 'Barlow Condensed'), sans-serif" }}>{p.name}</div>
        <div className="mt-1.5 flex min-h-[2.2rem] flex-col items-center justify-start gap-0.5 sm:min-h-[2.5rem]">
          <div className="flex items-center gap-1 text-sm font-black text-[var(--store-accent,#C99C5A)] sm:text-base">
            {p.hasVariants && <span className="text-xs font-semibold text-stone-500">{t("product.aPartirDe")}</span>}
            {!hidePrimaryFlag && <CodeFlag code={currency} className="h-3 w-[18px] shrink-0 rounded-[1px]" />}
            {formatPrice(p.price, currency, rates)}
          </div>
          {secondaryCurrency && (
            <div className="flex items-center gap-1 text-[10px] font-semibold text-stone-400">
              <CodeFlag code={secondaryCurrency} className="h-2.5 w-4 shrink-0 rounded-[1px]" />
              {formatPrice(p.price, secondaryCurrency, rates)}
            </div>
          )}
        </div>
        <div className="mt-0.5 min-h-[14px] text-[10px] font-bold text-[var(--store-accent,#C99C5A)]">
          {!p.hasVariants && inCart ? <>{t("product.naSacola")} ({inCart.quantity})</> : null}
        </div>

        {/* SKU não agrega valor no card mobile e o Safari pode inflar textos
            muito pequenos. Mantemos o código somente no desktop, onde também
            continua disponível para copiar. */}
        <div className="mt-1 hidden min-h-[12px] w-full items-center justify-center sm:flex">
          {p.sku ? (
            <button
              onClick={copySku}
              title={t("product.copiarCodigo", "Copiar código")}
              className="flex max-w-full items-center justify-center gap-0.5 truncate text-[7px] leading-none tracking-[0.02em] text-stone-300 transition hover:text-stone-500"
            >
              {p.sku} {copied ? <Check className="h-2.5 w-2.5 text-emerald-600" /> : <Copy className="h-2.5 w-2.5" />}
            </button>
          ) : null}
        </div>

        {/* Botão de sacola: CTA premium compartilhado (preenchido + shimmer),
            coerente com o resto da loja. */}
        <div className="mt-auto w-full pt-1.5">
          <PremiumCta
            size="sm"
            className="!gap-1 !px-1.5 !text-[9px] whitespace-nowrap sm:!gap-1.5 sm:!px-3 sm:!text-[11px]"
            onClick={(e) => {
              if (p.hasVariants) {
                // Se tem opções, o link já vai pra página de detalhes. No editor
                // o interceptador ignora cliques em botão, então navega explícito
                // pra rota do editor em vez de deixar o Link escapar pra /loja.
                if (editCtx) { e.preventDefault(); e.stopPropagation(); navigate(`/store-settings/editor/produto/${p.id}`); }
                return;
              }
              e.preventDefault(); e.stopPropagation(); add(p); setOpen(true);
            }}
            disabled={soldOutForMe && !p.hasVariants}
          >
            <Plus className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
            {t("product.adicionarSacola")}
          </PremiumCta>
        </div>
      </div>
    </Link>
  );
};
