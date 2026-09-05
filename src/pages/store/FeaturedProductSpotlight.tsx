import React, { useEffect, useMemo, useState } from "react";
import { ArrowRight, Loader2, Star } from "lucide-react";
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

  if (!productId) {
    if (!editCtx) return null;
    return (
      <Editable panelKey="vitrines" label="Produto em destaque">
        <section className="mx-auto w-[95%] max-w-[1600px] px-1 py-5 sm:px-4">
          <div className="flex min-h-36 items-center justify-center rounded-2xl border border-dashed border-[var(--store-accent,#d46a86)]/35 bg-white/65 px-6 text-center">
            <div>
              <Star className="mx-auto h-5 w-5 text-[var(--store-accent,#d46a86)]" />
              <p className="mt-2 text-xs font-bold text-stone-600">Escolha o produto em destaque</p>
              <p className="mt-1 text-[11px] text-stone-400">Clique aqui e use a estrela no painel de Vitrines.</p>
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

  if (!product) {
    // Produto removido/ocultado depois de ser marcado: não deixa um bloco
    // quebrado na loja pública. No editor, o usuário ainda consegue abrir o
    // painel pelo restante da seção de vitrines e trocar a estrela.
    return null;
  }

  const imageUrl = product.images?.[0] || product.imageUrl || "";
  const primaryCurrency = allowedCurrencies.includes(currency) ? currency : (allowedCurrencies[0] || "BRL");
  const href = `/loja/produto/${product.id}`;
  const price = formatPrice(product.price, primaryCurrency, rates);

  return (
    <Editable panelKey="vitrines" label="Produto em destaque">
      <section className="mx-auto w-[95%] max-w-[1600px] px-1 py-5 sm:px-4">
        <div className="grid overflow-hidden rounded-2xl border border-rose-100 bg-white shadow-[0_16px_45px_-28px_rgba(110,65,78,.38)] md:grid-cols-[1.08fr_.92fr]">
          <Link
            to={href}
            aria-label={`Ver ${product.name}`}
            className="group relative flex min-h-[280px] items-center justify-center overflow-hidden bg-white p-7 sm:min-h-[340px] sm:p-10 md:min-h-[390px]"
          >
            <div className="absolute inset-6 rounded-2xl bg-[radial-gradient(circle_at_center,rgba(248,221,229,.34),transparent_70%)]" aria-hidden="true" />
            {imageUrl ? (
              <img src={imageUrl} alt={product.name} className="relative z-[1] max-h-[320px] max-w-[88%] object-contain transition duration-500 group-hover:scale-[1.025] md:max-h-[350px]" />
            ) : (
              <div className="relative z-[1] text-xs text-stone-400">Imagem indisponível</div>
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
            className="flex min-h-[280px] flex-col justify-center px-7 py-9 sm:px-10 md:min-h-[390px] md:px-12"
            style={{ backgroundColor: design.featuredPanelColor, color: design.featuredTextColor }}
          >
            <div className="text-[11px] font-extrabold uppercase tracking-[0.12em] opacity-95 sm:text-xs">{design.featuredEyebrow}</div>
            <h2 className="mt-4 max-w-xl text-2xl font-extrabold leading-[1.05] sm:text-3xl lg:text-[34px]" style={{ fontFamily: "var(--store-font-heading, 'Barlow Condensed'), sans-serif", textTransform: "uppercase" }}>
              {product.name}
            </h2>
            {design.featuredDescription && <p className="mt-4 max-w-md text-sm leading-relaxed opacity-85">{design.featuredDescription}</p>}
            <div className="mt-6 text-xl font-black tracking-tight sm:text-2xl">{product.hasVariants ? <span className="mr-1 text-xs font-semibold uppercase tracking-wide opacity-70">a partir de</span> : null}{price}</div>
            <Link
              to={href}
              className="mt-6 inline-flex w-fit items-center gap-2 rounded-lg border border-white/80 bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-[0.08em] text-stone-800 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              {design.featuredButtonLabel} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>
    </Editable>
  );
}
