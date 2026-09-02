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

  // Segunda linha de preço: BRL como referência (ou USD, se a moeda ativa já
  // for BRL) — sempre as DUAS moedas juntas, uma embaixo da outra.
  const secondaryCurrency = allowedCurrencies.length > 1 ? (currency === "BRL" ? allowedCurrencies.find((code) => code !== "BRL") || null : "BRL") : null;

  return (
    <Link to={`/loja/produto/${p.id}`} onMouseEnter={startPhotoCycle} onMouseLeave={stopPhotoCycle}
      className="group relative flex flex-col overflow-hidden rounded-xl border border-[var(--store-accent,#C99C5A)]/20 bg-white transition duration-200 hover:-translate-y-0.5 hover:border-[var(--store-accent,#C99C5A)]/60 hover:shadow-md hover:shadow-stone-200/50">
      <div className="pointer-events-none absolute inset-0 z-10 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <BorderBeam colorFrom="var(--store-accent, #C99C5A)" colorTo="var(--store-accent, #C99C5A)" duration={4} size={80} />
      </div>
      <div className="relative aspect-square overflow-hidden bg-white p-3 sm:p-4">
        {images.length > 0
          ? <img src={images[photoIdx] || images[0]} alt={p.name} loading="lazy" className="h-full w-full object-contain transition duration-500 group-hover:scale-105" />
          : <div className="flex h-full items-center justify-center"><Package className="h-10 w-10 text-stone-300" /></div>}
        {p.hasVariants ? (
          <span className="absolute left-2 top-2 rounded-full bg-stone-900 px-2.5 py-1 text-[10px] font-bold text-white">{t("product.opcoes")}</span>
        ) : p.stockStatus && p.stockStatus !== "available" ? (
          <span className="absolute left-2 top-2 rounded-full bg-red-600 px-2.5 py-1 text-[10px] font-bold text-white">{translateStockStatus(t, p.stockStatus, p.stockQty)}</span>
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
        {p.groupName && <div className="text-[8px] font-semibold uppercase tracking-[0.12em] text-stone-400 sm:text-[9px]">{translateCategoryName(p.groupName, i18n.language)}</div>}
        <div className="mt-1 line-clamp-2 min-h-[2rem] text-[11px] font-bold leading-[1.15] text-stone-800 sm:text-xs" style={{ fontFamily: "var(--store-font-heading, 'Barlow Condensed'), sans-serif" }}>{p.name}</div>
        <div className="mt-1.5 flex flex-col items-center gap-0.5">
          <div className="flex items-center gap-1 text-sm font-black text-[var(--store-accent,#C99C5A)] sm:text-base">
            {p.hasVariants && <span className="text-xs font-semibold text-stone-500">{t("product.aPartirDe")}</span>}
            <CodeFlag code={currency} className="h-3 w-[18px] shrink-0 rounded-[1px]" />
            {formatPrice(p.price, currency, rates)}
          </div>
          {secondaryCurrency && (
            <div className="flex items-center gap-1 text-[10px] font-semibold text-stone-400">
              <CodeFlag code={secondaryCurrency} className="h-2.5 w-4 shrink-0 rounded-[1px]" />
              {formatPrice(p.price, secondaryCurrency, rates)}
            </div>
          )}
        </div>
        {!p.hasVariants && inCart && <span className="mt-1 text-[10px] font-bold text-[var(--store-accent,#C99C5A)]">{t("product.naSacola")} ({inCart.quantity})</span>}
        <div className="mt-3 flex w-full flex-col items-center gap-1.5">
          {p.sku && (
            <button onClick={copySku} title={t("product.copiarCodigo", "Copiar código")} className="max-w-full truncate text-[7px] tracking-[0.04em] text-stone-300 transition hover:text-stone-500 sm:text-[8px]">
              {p.sku} {copied ? <Check className="h-2.5 w-2.5 text-emerald-600" /> : <Copy className="h-2.5 w-2.5" />}
            </button>
          )}
          {/* Botão de sacola: CTA premium compartilhado (preenchido + shimmer),
              coerente com o resto da loja. */}
          <PremiumCta
            size="sm"
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
            <Plus className="h-4 w-4" />
            {t("product.adicionarSacola")}
          </PremiumCta>
        </div>
      </div>
    </Link>
  );
};
