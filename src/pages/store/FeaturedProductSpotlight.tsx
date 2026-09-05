import React, { useEffect, useMemo, useState } from "react";
import { ArrowRight, Loader2, Pencil, Star, Trash2 } from "lucide-react";
import { Link } from "react-router";
import { BorderBeam } from "../../components/ui/border-beam";
import { formatPrice, useStorePrefs } from "../../stores/storePrefs";
import { Editable } from "./editor/Editable";
import { useEditMode } from "./editor/EditModeContext";
import { readStorefrontDesign } from "./storefrontDesign";

export function FeaturedProductSpotlight({ config }: { config: any }) {
  const editCtx = useEditMode();
  const { currency, rates, allowedCurrencies } = useStorePrefs();
  const productId = String(config?.featuredProductIds?.[0] || "");
  const design = useMemo(() => readStorefrontDesign(config?.quickLinks), [config?.quickLinks]);
  const [product, setProduct] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    if (!productId) { setProduct(null); setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/store/products?ids=${encodeURIComponent(productId)}`)
      .then(async (r) => (r.ok ? r.json() : { data: [] }))
      .then((j) => {
        if (cancelled) return;
        const list = Array.isArray(j?.data) ? j.data : [];
        setProduct(list.find((p: any) => String(p.id) === productId) || list[0] || null);
      })
      .catch(() => { if (!cancelled) setProduct(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [productId]);

  const removeFeatured = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!editCtx || removing) return;
    setRemoving(true);
    try {
      await editCtx.patchDraft({ featuredProductIds: [] });
    } finally {
      setRemoving(false);
    }
  };

  if (!productId) {
    if (!editCtx) return null;
    return (
      <Editable panelKey="vitrines" label="Produto em destaque">
        <section className="mx-auto w-[95%] max-w-[1600px] px-1 py-5 sm:px-4">
          <div className="flex min-h-36 items-center justify-center rounded-2xl border border-dashed border-[var(--store-accent,#d46a86)]/35 bg-white/65 px-6 text-center shadow-[0_12px_35px_-28px_rgba(110,65,78,.3)]">
            <div>
              <Star className="mx-auto h-5 w-5 text-[var(--store-accent,#d46a86)]" />
              <p className="mt-2 text-xs font-bold text-stone-600">Escolha o produto em destaque</p>
              <p className="mt-1 text-[11px] text-stone-400">Clique aqui para selecionar o produto e personalizar este bloco.</p>
            </div>
          </div>
        </section>
      </Editable>
    );
  }

  if (loading && !product) {
    return (
      <section className="mx-auto w-[95%] max-w-[1600px] px-1 py-5 sm:px-4">
        <div className="flex min-h-48 items-center justify-center rounded-2xl border border-rose-100 bg-white/70 text-xs text-stone-400">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando destaque...
        </div>
      </section>
    );
  }

  if (!product) return null;

  const imageUrl = product.images?.[0] || product.imageUrl || "";
  const primaryCurrency = allowedCurrencies.includes(currency) ? currency : (allowedCurrencies[0] || "BRL");
  const href = `/loja/produto/${product.id}`;
  const price = formatPrice(product.price, primaryCurrency, rates);

  return (
    <Editable panelKey="vitrines" label="Produto em destaque">
      <section className="mx-auto w-[95%] max-w-[1600px] px-1 py-5 sm:px-4">
        <div className="relative grid overflow-hidden rounded-2xl border border-rose-100 bg-white shadow-[0_22px_55px_-34px_rgba(110,65,78,.48)] md:grid-cols-[1.08fr_.92fr]">
          {editCtx && (
            <div className="absolute right-3 top-3 z-30 flex gap-2" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); editCtx.openPanel("vitrines"); }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/70 bg-white/90 px-3 py-2 text-[11px] font-bold text-stone-700 shadow-md backdrop-blur transition hover:text-[var(--store-accent,#d46a86)]"
              >
                <Pencil className="h-3.5 w-3.5" /> Editar
              </button>
              <button
                type="button"
                disabled={removing}
                onClick={removeFeatured}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/70 bg-white/90 px-3 py-2 text-[11px] font-bold text-red-500 shadow-md backdrop-blur transition hover:bg-red-50 disabled:opacity-60"
              >
                {removing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />} Apagar
              </button>
            </div>
          )}

          <Link
            to={href}
            aria-label={`Ver ${product.name}`}
            className="group relative flex min-h-[240px] items-stretch justify-center overflow-hidden bg-white sm:min-h-[285px] md:h-[330px] md:min-h-0"
          >
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={product.name}
                className="relative z-[1] h-full w-full object-contain transition duration-500 group-hover:scale-[1.015]"
              />
            ) : (
              <div className="relative z-[1] flex h-full w-full items-center justify-center text-xs text-stone-400">Imagem indisponível</div>
            )}
            <BorderBeam
              colorFrom="var(--store-accent, #D46A86)"
              colorTo="var(--store-accent, #D46A86)"
              duration={4}
              size={105}
              borderWidth={1.35}
            />
          </Link>

          <div
            className="relative flex min-h-[240px] flex-col justify-center overflow-hidden px-7 py-8 sm:min-h-[285px] sm:px-9 md:h-[330px] md:min-h-0 md:px-11 md:py-7"
            style={{ backgroundColor: design.featuredPanelColor, color: design.featuredTextColor }}
          >
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(145deg,rgba(255,255,255,.22)_0%,rgba(255,255,255,.05)_32%,rgba(70,25,45,.10)_100%)]" aria-hidden="true" />
            <div className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full bg-white/20 blur-3xl" aria-hidden="true" />
            <div className="pointer-events-none absolute -bottom-24 left-[15%] h-60 w-60 rounded-full bg-black/10 blur-3xl" aria-hidden="true" />
            <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-white/40" aria-hidden="true" />

            <div className="relative z-[1] text-[11px] font-extrabold uppercase tracking-[0.12em] opacity-95 sm:text-xs">{design.featuredEyebrow}</div>
            <h2 className="relative z-[1] mt-3 max-w-xl text-2xl font-extrabold leading-[1.05] drop-shadow-[0_1px_1px_rgba(0,0,0,.06)] sm:text-[28px] lg:text-[31px]" style={{ fontFamily: "var(--store-font-heading, 'Barlow Condensed'), sans-serif", textTransform: "uppercase" }}>
              {product.name}
            </h2>
            {design.featuredDescription && <p className="relative z-[1] mt-3 max-w-md text-sm leading-relaxed opacity-90">{design.featuredDescription}</p>}
            <div className="relative z-[1] mt-4 text-xl font-black tracking-tight sm:text-2xl">{product.hasVariants ? <span className="mr-1 text-xs font-semibold uppercase tracking-wide opacity-70">a partir de</span> : null}{price}</div>
            <Link
              to={href}
              className="relative z-[1] mt-4 inline-flex w-fit items-center gap-2 rounded-lg border border-white/60 bg-white/10 px-5 py-2.5 text-xs font-bold uppercase tracking-[0.08em] shadow-sm backdrop-blur-sm transition hover:bg-white hover:text-stone-800"
              style={{ color: "inherit" }}
            >
              {design.featuredButtonLabel} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>
    </Editable>
  );
}
