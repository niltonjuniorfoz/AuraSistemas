import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { Check, Copy, ExternalLink, Heart, Package, Plus } from "lucide-react";
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
type StoreMode = "BRL" | "USD" | "DUAL";

let promotionMapPromise: Promise<Map<string, PromotionType>> | null = null;
let promotionMapCache: Map<string, PromotionType> | null = null;
let promotionMapFetchedAt = 0;
const PROMOTION_CACHE_MS = 15_000;

let storeModePromise: Promise<StoreMode> | null = null;
let storeModeCache: StoreMode | null = null;

function loadStoreMode(): Promise<StoreMode> {
  if (storeModeCache) return Promise.resolve(storeModeCache);
  if (storeModePromise) return storeModePromise;
  storeModePromise = fetch("/api/store/info", { cache: "no-store" })
    .then((response) => response.ok ? response.json() : null)
    .then((info) => {
      const raw = String(info?.defaultCurrency || "BRL").toUpperCase();
      const mode: StoreMode = raw === "DUAL" ? "DUAL" : raw === "USD" ? "USD" : "BRL";
      storeModeCache = mode;
      return mode;
    })
    .catch(() => "BRL" as StoreMode)
    .finally(() => { storeModePromise = null; });
  return storeModePromise;
}

function loadPromotionMap(): Promise<Map<string, PromotionType>> {
  const now = Date.now();
  if (promotionMapCache && now - promotionMapFetchedAt < PROMOTION_CACHE_MS) return Promise.resolve(promotionMapCache);
  if (promotionMapPromise) return promotionMapPromise;

  const load = async (canal: PromotionType) => {
    try {
      const response = await fetch(`/api/store/products?canal=${canal}&limit=120`, { cache: "no-store" });
      if (!response.ok) return [] as any[];
      const json = await response.json();
      return Array.isArray(json?.data) ? json.data : [];
    } catch {
      return [] as any[];
    }
  };

  promotionMapPromise = Promise.all([load("outlet"), load("oferta")])
    .then(([outletRows, ofertaRows]) => {
      const map = new Map<string, PromotionType>();
      for (const item of outletRows) if (item?.id) map.set(String(item.id), "outlet");
      for (const item of ofertaRows) if (item?.id) map.set(String(item.id), "oferta");
      promotionMapCache = map;
      promotionMapFetchedAt = Date.now();
      return map;
    })
    .finally(() => { promotionMapPromise = null; });
  return promotionMapPromise;
}

export const ShopProductCard: React.FC<{ p: any }> = ({ p }) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const editCtx = useEditMode();
  const { currency, rates } = useStorePrefs();
  const { items, add, setOpen } = useShopCart();
  const inCart = items.find((item) => item.productId === p.id);
  const soldOutForMe = (inCart?.quantity || 0) >= p.maxQty;

  const customer = useCustomerAuthStore((state) => state.customer);
  const favorited = useWishlistStore((state) => state.ids.has(p.id));
  const { add: favAdd, remove: favRemove } = useWishlistStore();
  const [storeMode, setStoreMode] = useState<StoreMode | null>(storeModeCache);

  useEffect(() => {
    let alive = true;
    loadStoreMode().then((mode) => {
      if (!alive) return;
      setStoreMode(mode);
      const prefs = useStorePrefs.getState();
      if (mode === "DUAL") {
        prefs.setAllowedCurrencies(["USD", "BRL"]);
        prefs.setCurrency("USD");
      } else {
        prefs.setAllowedCurrencies([mode]);
        prefs.setCurrency(mode);
      }
    });
    return () => { alive = false; };
  }, []);

  const toggleFavorite = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
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
  const copySku = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!p.sku) return;
    navigator.clipboard?.writeText(p.sku).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    }).catch(() => {});
  };

  const stockQty = Number(p.stockQty || 0);
  const isOutOfStock = p.stockStatus === "out" || Number(p.maxQty || 0) <= 0;
  const showLastUnits = !p.hasVariants && !isOutOfStock && promotionChecked && !promotionType && stockQty > 0 && stockQty <= 3;
  const dualMode = storeMode === "DUAL";
  const singleCurrency = storeMode === "USD" ? "USD" : storeMode === "BRL" ? "BRL" : currency;

  return (
    <Link
      to={`/loja/produto/${p.id}`}
      onMouseEnter={startPhotoCycle}
      onMouseLeave={stopPhotoCycle}
      className="group relative flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-[var(--store-accent,#D46A86)]/20 bg-white transition duration-200 hover:-translate-y-0.5 hover:border-[var(--store-accent,#D46A86)]/55 hover:shadow-md hover:shadow-stone-200/50"
    >
      <div className="pointer-events-none absolute inset-0 z-10 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <BorderBeam colorFrom="var(--store-accent, #D46A86)" colorTo="var(--store-accent, #D46A86)" duration={4} size={80} />
      </div>

      <div className="relative aspect-square overflow-hidden bg-white p-3 sm:p-4">
        {images.length > 0
          ? <img src={images[photoIdx] || images[0]} alt={p.name} loading="lazy" className="h-full w-full object-contain transition duration-500 group-hover:scale-105" />
          : <div className="flex h-full items-center justify-center"><Package className="h-9 w-9 text-stone-300" /></div>}

        {p.hasVariants ? (
          <span className="absolute left-2 top-2 rounded-full bg-stone-900 px-2 py-1 text-[9px] font-bold text-white">{t("product.opcoes")}</span>
        ) : isOutOfStock ? (
          <span className="absolute left-2 top-2 rounded-full bg-red-600 px-2 py-1 text-[9px] font-bold text-white">{translateStockStatus(t, "out", undefined)}</span>
        ) : promotionChecked && promotionType ? (
          <span className={`absolute left-2 top-2 rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-white ${promotionType === "oferta" ? "bg-rose-500" : "bg-slate-700"}`}>
            {promotionType === "oferta" ? "Oferta" : "Outlet"}
          </span>
        ) : showLastUnits ? (
          <span className="absolute left-2 top-2 rounded-full bg-red-600 px-2 py-1 text-[9px] font-bold text-white">{translateStockStatus(t, "low", stockQty)}</span>
        ) : null}

        <button
          onClick={toggleFavorite}
          aria-label={t("account.favoritar")}
          className={`absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-stone-500 shadow-sm transition hover:text-red-500 ${favorited ? "" : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100 max-md:opacity-100"}`}
        >
          <Heart className={`h-4 w-4 ${favorited ? "fill-red-500 text-red-500" : ""}`} />
        </button>

        {editCtx && (
          <button
            onClick={(event) => { event.preventDefault(); event.stopPropagation(); navigate(`/store-settings/editor/produto/${p.id}`); }}
            title="Abrir esta página de produto no editor"
            className="absolute right-2 top-12 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-amber-500 text-stone-900 shadow-sm transition hover:bg-amber-400"
          >
            <ExternalLink className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col items-center px-2.5 pb-2.5 text-center sm:px-3 sm:pb-3">
        <div className="min-h-[12px] text-[8px] font-semibold uppercase tracking-[0.12em] text-[var(--store-accent,#D46A86)]/75 sm:text-[8px]">
          {p.groupName ? translateCategoryName(p.groupName, i18n.language) : null}
        </div>

        <div
          className="mt-1 line-clamp-2 min-h-[2rem] text-[10px] font-bold leading-[1.16] text-stone-800 sm:min-h-[2.15rem] sm:text-[11px]"
          style={{ fontFamily: "var(--store-font-heading, 'Barlow Condensed'), sans-serif" }}
        >
          {p.name}
        </div>

        <div className="mt-1.5 flex min-h-[2.45rem] flex-col items-center justify-start gap-0.5">
          {dualMode ? (
            <>
              <div className="flex items-center gap-1 text-[12px] font-bold leading-none text-[var(--store-accent,#D46A86)] sm:text-[13px]">
                {p.hasVariants && <span className="text-[9px] font-medium text-stone-400">{t("product.aPartirDe")}</span>}
                <CodeFlag code="USD" className="h-2.5 w-4 shrink-0 rounded-[1px]" />
                {formatPrice(p.price, "USD", rates)}
              </div>
              <div className="flex items-center gap-1 text-[10px] font-semibold leading-none text-stone-500 sm:text-[11px]">
                <CodeFlag code="BRL" className="h-2.5 w-4 shrink-0 rounded-[1px]" />
                {formatPrice(p.price, "BRL", rates)}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-1 text-[12px] font-bold leading-none text-[var(--store-accent,#D46A86)] sm:text-[13px]">
              {p.hasVariants && <span className="text-[9px] font-medium text-stone-400">{t("product.aPartirDe")}</span>}
              {formatPrice(p.price, singleCurrency, rates)}
            </div>
          )}
        </div>

        <div className="mt-0.5 min-h-[12px] text-[9px] font-semibold text-[var(--store-accent,#D46A86)]">
          {!p.hasVariants && inCart ? <>{t("product.naSacola")} ({inCart.quantity})</> : null}
        </div>

        <div className="mt-0.5 hidden min-h-[11px] w-full items-center justify-center sm:flex">
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

        <div className="mt-auto w-full pt-1.5">
          <PremiumCta
            size="sm"
            className="!gap-1 !px-1.5 !text-[9px] whitespace-nowrap sm:!gap-1.5 sm:!px-3 sm:!text-[10px]"
            onClick={(event) => {
              if (p.hasVariants) {
                if (editCtx) {
                  event.preventDefault();
                  event.stopPropagation();
                  navigate(`/store-settings/editor/produto/${p.id}`);
                }
                return;
              }
              event.preventDefault();
              event.stopPropagation();
              add(p);
              setOpen(true);
            }}
            disabled={soldOutForMe && !p.hasVariants}
          >
            <Plus className="h-3 w-3 shrink-0" />
            {t("product.adicionarSacola")}
          </PremiumCta>
        </div>
      </div>
    </Link>
  );
};
