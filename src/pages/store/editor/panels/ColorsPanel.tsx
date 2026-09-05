import React, { useEffect, useState } from "react";
import { useLocation } from "react-router";
import { AlertTriangle, Eye, EyeOff, Image as ImageIcon, Layers3, Loader2, MessageCircle, Pencil, RotateCcw, Square, Upload } from "lucide-react";
import { useEditMode } from "../EditModeContext";
import { PanelShell } from "./PanelShell";
import { DEFAULT_STORE_COLORS, STORE_COLOR_TOKENS, contrastRatio } from "../storeTheme";
import {
  DEFAULT_STOREFRONT_DESIGN,
  readStorefrontDesign,
  StoreHeaderMode,
  StorefrontDesignSettings,
  upsertStorefrontDesign,
} from "../../storefrontDesign";
import {
  BANNER_COMPRESS_OPTS,
  LOGO_COMPRESS_OPTS,
  compressImage,
  compressTransparentImage,
} from "../../../../lib/imageUpload";
import { toast } from "../../../../components/Toast";

const MIN_CONTRAST = 4.5;

const HEADER_SURFACE_CSS = `
header.sticky.top-0.z-30:not([data-store-header-mode="solid"]),
header[data-store-header-mode="glass"] {
  background-color: rgba(255,255,255,.68) !important;
  background-color: color-mix(in srgb, var(--store-header-bg,#ffffff) 70%, transparent) !important;
  -webkit-backdrop-filter: blur(18px) saturate(135%) !important;
  backdrop-filter: blur(18px) saturate(135%) !important;
  box-shadow: 0 10px 34px rgba(74,44,56,.09) !important;
}
header[data-store-header-mode="glass"] > .bg-white,
header[data-store-header-mode="glass"] > form.bg-white,
header.sticky.top-0.z-30:not([data-store-header-mode="solid"]) > .bg-white,
header.sticky.top-0.z-30:not([data-store-header-mode="solid"]) > form.bg-white {
  background-color: transparent !important;
}
header[data-store-header-mode="solid"] {
  background-color: var(--store-header-bg,#ffffff) !important;
  -webkit-backdrop-filter: none !important;
  backdrop-filter: none !important;
  box-shadow: 0 2px 12px rgba(74,44,56,.07) !important;
}
header[data-store-header-mode="solid"] > .bg-white,
header[data-store-header-mode="solid"] > form.bg-white {
  background-color: var(--store-header-bg,#ffffff) !important;
}
header.sticky.top-0.z-30 img[data-aura-header-logo="true"] {
  width: 300px !important;
  height: 82px !important;
  max-width: 300px !important;
  transform: none !important;
  scale: 1 !important;
  object-fit: contain !important;
  filter: none !important;
  image-rendering: auto !important;
}
@media (max-width: 767px) {
  header.sticky.top-0.z-30 img[data-aura-header-logo="true"] {
    width: 205px !important;
    height: 64px !important;
    max-width: 205px !important;
  }
}
`;

const emitWhatsappFraming = (posX: number, posY: number) => {
  window.dispatchEvent(new CustomEvent("aura-banner-framing", {
    detail: { kind: "whatsapp", posX, posY },
  }));
};

export function ColorsPanel() {
  const ctx = useEditMode();
  const location = useLocation();
  const initialDesign = readStorefrontDesign(ctx?.draft?.quickLinks);
  const [colors, setColors] = useState<Record<string, string>>(ctx?.draft?.theme?.colors || {});
  const [headerMode, setHeaderMode] = useState<StoreHeaderMode>(initialDesign.headerMode);
  const [publishedDesign, setPublishedDesign] = useState<StorefrontDesignSettings>(DEFAULT_STOREFRONT_DESIGN);
  const [publishedLoaded, setPublishedLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  const [waVisible, setWaVisible] = useState(initialDesign.whatsappBannerVisible);
  const [waImage, setWaImage] = useState(initialDesign.whatsappBannerImage);
  const [waLink, setWaLink] = useState(initialDesign.whatsappBannerLink);
  const [waPosX, setWaPosX] = useState(initialDesign.whatsappBannerPosX);
  const [waPosY, setWaPosY] = useState(initialDesign.whatsappBannerPosY);
  const [waUploading, setWaUploading] = useState(false);
  const [waSaving, setWaSaving] = useState(false);

  const [headerLogoImage, setHeaderLogoImage] = useState(initialDesign.headerLogoImage);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoSaving, setLogoSaving] = useState(false);

  useEffect(() => {
    if (ctx) return;
    let cancelled = false;
    fetch("/api/store/config")
      .then((r) => (r.ok ? r.json() : null))
      .then((config) => {
        if (!cancelled && config) setPublishedDesign(readStorefrontDesign(config.quickLinks));
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setPublishedLoaded(true); });
    return () => { cancelled = true; };
  }, [ctx]);

  useEffect(() => {
    if (ctx?.activePanel === "colors") {
      setColors(ctx?.draft?.theme?.colors || {});
      setHeaderMode(readStorefrontDesign(ctx?.draft?.quickLinks).headerMode);
    }
    if (ctx?.activePanel === "whatsappBanner") {
      const d = readStorefrontDesign(ctx?.draft?.quickLinks);
      setWaVisible(d.whatsappBannerVisible);
      setWaImage(d.whatsappBannerImage);
      setWaLink(d.whatsappBannerLink);
      setWaPosX(d.whatsappBannerPosX);
      setWaPosY(d.whatsappBannerPosY);
      requestAnimationFrame(() => emitWhatsappFraming(d.whatsappBannerPosX, d.whatsappBannerPosY));
    }
    if (ctx?.activePanel === "brand") {
      setHeaderLogoImage(readStorefrontDesign(ctx?.draft?.quickLinks).headerLogoImage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx?.activePanel]);

  const draftDesign = ctx ? readStorefrontDesign(ctx?.draft?.quickLinks) : publishedDesign;
  const effectiveHeaderMode = ctx?.activePanel === "colors" ? headerMode : draftDesign.headerMode;
  let effectiveDesign: StorefrontDesignSettings = draftDesign;

  if (ctx?.activePanel === "whatsappBanner") {
    effectiveDesign = {
      ...effectiveDesign,
      whatsappBannerVisible: waVisible,
      whatsappBannerImage: waImage,
      whatsappBannerLink: waLink,
      whatsappBannerPosX: waPosX,
      whatsappBannerPosY: waPosY,
    };
  }
  if (ctx?.activePanel === "brand") {
    effectiveDesign = { ...effectiveDesign, headerLogoImage };
  }

  useEffect(() => {
    const header = document.querySelector<HTMLElement>("header.sticky.top-0.z-30");
    if (!header) return;
    header.dataset.storeHeaderMode = effectiveHeaderMode;
    return () => { delete header.dataset.storeHeaderMode; };
  }, [effectiveHeaderMode]);

  useEffect(() => {
    const header = document.querySelector<HTMLElement>("header.sticky.top-0.z-30");
    if (!header) return;

    const desiredSrc = effectiveDesign.headerLogoImage || DEFAULT_STOREFRONT_DESIGN.headerLogoImage;
    const boundImages = new WeakSet<HTMLImageElement>();

    const onEditLogo = (event: Event) => {
      if (!ctx) return;
      event.preventDefault();
      event.stopPropagation();
      ctx.openPanel("brand");
    };

    const applyLogo = () => {
      const image = header.querySelector<HTMLImageElement>('a[href="/loja"] img');
      if (!image) return;
      if (image.getAttribute("src") !== desiredSrc) image.setAttribute("src", desiredSrc);
      image.dataset.auraHeaderLogo = "true";
      image.setAttribute("decoding", "sync");

      if (ctx) {
        image.title = "Clique para editar a logo do cabeçalho";
        image.style.cursor = "pointer";
        if (!boundImages.has(image)) {
          image.addEventListener("click", onEditLogo, true);
          boundImages.add(image);
        }
      } else {
        image.removeAttribute("title");
        image.style.removeProperty("cursor");
      }
    };

    applyLogo();
    const observer = new MutationObserver(applyLogo);
    observer.observe(header, { childList: true, subtree: true, attributes: true, attributeFilter: ["src"] });

    return () => {
      observer.disconnect();
      const image = header.querySelector<HTMLImageElement>('a[href="/loja"] img');
      if (image && boundImages.has(image)) image.removeEventListener("click", onEditLogo, true);
    };
  }, [ctx, effectiveDesign.headerLogoImage]);

  const set = (key: string, value: string) => setColors((c) => ({ ...c, [key]: value }));
  const reset = (key: string) => setColors((c) => ({ ...c, [key]: "" }));

  const saveColors = async () => {
    if (!ctx) return;
    setSaving(true);
    try {
      const ok = await ctx.patchDraft((draft: any) => ({
        theme: { colors },
        quickLinks: upsertStorefrontDesign(draft?.quickLinks, { headerMode }),
      }));
      if (ok) ctx.closePanel();
    } finally {
      setSaving(false);
    }
  };

  const handleWhatsappFile = async (file: File | undefined) => {
    if (!file) return;
    setWaUploading(true);
    try {
      setWaImage(await compressImage(file, BANNER_COMPRESS_OPTS));
    } catch (e: any) {
      toast.error(e.message || "Erro ao processar imagem.");
    } finally {
      setWaUploading(false);
    }
  };

  const saveWhatsapp = async () => {
    if (!ctx) return;
    setWaSaving(true);
    try {
      const ok = await ctx.patchDraft((draft: any) => ({
        quickLinks: upsertStorefrontDesign(draft?.quickLinks, {
          whatsappBannerVisible: waVisible,
          whatsappBannerImage: waImage,
          whatsappBannerLink: waLink,
          whatsappBannerPosX: waPosX,
          whatsappBannerPosY: waPosY,
        }),
      }));
      if (ok) ctx.closePanel();
    } finally {
      setWaSaving(false);
    }
  };

  const setWhatsappVisibility = async (visible: boolean) => {
    if (!ctx) return;
    await ctx.patchDraft((draft: any) => ({
      quickLinks: upsertStorefrontDesign(draft?.quickLinks, { whatsappBannerVisible: visible }),
    }));
  };

  const handleLogoFile = async (file: File | undefined) => {
    if (!file) return;
    setLogoUploading(true);
    try {
      setHeaderLogoImage(await compressTransparentImage(file, LOGO_COMPRESS_OPTS));
    } catch (e: any) {
      toast.error(e.message || "Erro ao processar a logo.");
    } finally {
      setLogoUploading(false);
    }
  };

  const saveLogo = async () => {
    if (!ctx) return;
    setLogoSaving(true);
    try {
      const ok = await ctx.patchDraft((draft: any) => ({
        quickLinks: upsertStorefrontDesign(draft?.quickLinks, { headerLogoImage }),
      }));
      if (ok) ctx.closePanel();
    } finally {
      setLogoSaving(false);
    }
  };

  const textContrast = colors.text && colors.bg ? contrastRatio(colors.text, colors.bg) : null;
  const accentContrast = colors.accent && colors.accentText ? contrastRatio(colors.accent, colors.accentText) : null;
  const warnings = [
    textContrast != null && textContrast < MIN_CONTRAST ? `Texto principal x Fundo da página: contraste ${textContrast.toFixed(2)}:1 (mínimo recomendado ${MIN_CONTRAST}:1).` : null,
    accentContrast != null && accentContrast < MIN_CONTRAST ? `Destaque x Texto do destaque: contraste ${accentContrast.toFixed(2)}:1 (mínimo recomendado ${MIN_CONTRAST}:1).` : null,
  ].filter(Boolean) as string[];

  const normalizedPath = location.pathname.replace(/\/+$/, "") || "/";
  const publicHome = normalizedPath === "/loja";
  const editorHome = normalizedPath === "/store-settings/editor" || normalizedPath === "/store-settings/editor/home";
  const renderHomeBanner = publicHome || editorHome;
  const canRenderPublished = !!ctx || publishedLoaded;

  const bannerContent = effectiveDesign.whatsappBannerImage ? (
    <div className="relative aspect-[3/1] w-full overflow-hidden rounded-2xl border border-rose-100 bg-[#fff7f8] shadow-[0_18px_45px_-34px_rgba(100,55,70,.42)] sm:aspect-[4/1] lg:aspect-[90/19]">
      <img
        src={effectiveDesign.whatsappBannerImage}
        alt="Convite para o grupo do WhatsApp"
        className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.003]"
        style={{ objectPosition: `${effectiveDesign.whatsappBannerPosX}% ${effectiveDesign.whatsappBannerPosY}%` }}
      />
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-white/70" aria-hidden="true" />
    </div>
  ) : null;

  return (
    <>
      <style data-store-header-surface>{HEADER_SURFACE_CSS}</style>

      {renderHomeBanner && canRenderPublished && (
        <section className="mx-auto w-[95%] max-w-[1600px] px-1 py-5 sm:px-4">
          {effectiveDesign.whatsappBannerVisible ? (
            <div className="group relative">
              {ctx ? (
                bannerContent
              ) : effectiveDesign.whatsappBannerLink ? (
                <a href={effectiveDesign.whatsappBannerLink} target="_blank" rel="noreferrer" className="block" aria-label="Entrar no grupo do WhatsApp">
                  {bannerContent}
                </a>
              ) : bannerContent}

              {ctx && (
                <div className="absolute right-3 top-3 z-20 flex gap-2">
                  <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); ctx.openPanel("whatsappBanner"); }} className="inline-flex items-center gap-1.5 rounded-lg border border-white/75 bg-white/90 px-3 py-2 text-[11px] font-bold text-stone-700 shadow-md backdrop-blur transition hover:text-[var(--store-accent,#d46a86)]">
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </button>
                  <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setWhatsappVisibility(false); }} className="inline-flex items-center gap-1.5 rounded-lg border border-white/75 bg-white/90 px-3 py-2 text-[11px] font-bold text-stone-600 shadow-md backdrop-blur transition hover:text-red-500">
                    <EyeOff className="h-3.5 w-3.5" /> Ocultar
                  </button>
                </div>
              )}
            </div>
          ) : ctx ? (
            <div className="flex min-h-24 items-center justify-center rounded-2xl border border-dashed border-rose-200 bg-white/50 px-5 text-center">
              <div>
                <MessageCircle className="mx-auto h-5 w-5 text-[var(--store-accent,#d46a86)]" />
                <p className="mt-2 text-xs font-bold text-stone-600">Banner do grupo do WhatsApp oculto</p>
                <div className="mt-2 flex justify-center gap-2">
                  <button type="button" onClick={() => ctx.openPanel("whatsappBanner")} className="inline-flex items-center gap-1 rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-stone-600"><Pencil className="h-3 w-3" /> Editar</button>
                  <button type="button" onClick={() => setWhatsappVisibility(true)} className="inline-flex items-center gap-1 rounded-md bg-[var(--store-accent,#d46a86)] px-2.5 py-1.5 text-[11px] font-bold text-white"><Eye className="h-3 w-3" /> Mostrar</button>
                </div>
              </div>
            </div>
          ) : null}
        </section>
      )}

      {ctx?.activePanel === "colors" && (
        <PanelShell title="Cores da loja" onClose={ctx.closePanel} onSave={saveColors} saving={saving} wide>
          <div className="mb-4 rounded-xl border border-stone-200 bg-stone-50/70 p-3">
            <div className="mb-2">
              <div className="text-xs font-bold text-stone-700">Cabeçalho da loja</div>
              <p className="mt-0.5 text-[11px] leading-relaxed text-stone-500">Translúcido deixa o conteúdo passar por trás com efeito de vidro. Sólido usa a cor configurada em “Fundo do cabeçalho”.</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setHeaderMode("glass")} className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition ${headerMode === "glass" ? "border-[var(--store-accent,#d46a86)] bg-white text-[var(--store-accent,#d46a86)] shadow-sm" : "border-stone-200 bg-white/60 text-stone-500 hover:border-stone-300"}`}>
                <Layers3 className="h-4 w-4" /> Translúcido
              </button>
              <button type="button" onClick={() => setHeaderMode("solid")} className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition ${headerMode === "solid" ? "border-[var(--store-accent,#d46a86)] bg-white text-[var(--store-accent,#d46a86)] shadow-sm" : "border-stone-200 bg-white/60 text-stone-500 hover:border-stone-300"}`}>
                <Square className="h-4 w-4" /> Sólido
              </button>
            </div>
            <button type="button" onClick={() => ctx.openPanel("brand")} className="mt-3 flex w-full items-center justify-between rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-left transition hover:border-[var(--store-accent,#d46a86)]">
              <span>
                <span className="block text-xs font-bold text-stone-700">Logo do cabeçalho</span>
                <span className="mt-0.5 block text-[10px] text-stone-400">Ideal: SVG vetorial ou 1200 × 400 px com fundo transparente.</span>
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--store-accent,#d46a86)]"><Pencil className="h-3.5 w-3.5" /> Editar</span>
            </button>
          </div>

          {warnings.length > 0 && (
            <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="space-y-1">{warnings.map((w) => <p key={w}>{w}</p>)}</div>
            </div>
          )}
          <div className="space-y-2">
            {STORE_COLOR_TOKENS.map(({ key, label }) => (
              <div key={key} className="flex items-center gap-2 rounded-lg border border-stone-200 p-2">
                <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(colors[key] || "") ? colors[key] : DEFAULT_STORE_COLORS[key]} onChange={(e) => set(key, e.target.value)} className="h-8 w-8 shrink-0 cursor-pointer rounded border border-stone-300 bg-transparent p-0" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-semibold text-stone-700">{label}</div>
                  <input value={colors[key] || ""} onChange={(e) => set(key, e.target.value)} placeholder={`Padrão ${DEFAULT_STORE_COLORS[key]}`} className="w-full rounded-md border border-stone-300 p-1.5 text-xs font-mono outline-none focus:border-amber-500" />
                </div>
                {colors[key] && <button onClick={() => reset(key)} className="shrink-0 text-[11px] font-semibold text-stone-400 hover:text-stone-700">Padrão</button>}
              </div>
            ))}
          </div>
        </PanelShell>
      )}

      {ctx?.activePanel === "brand" && (
        <PanelShell title="Logo do cabeçalho" onClose={ctx.closePanel} onSave={saveLogo} saving={logoSaving} wide>
          <div className="space-y-4">
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-[11px] leading-relaxed text-stone-600">
              <strong className="text-stone-800">Melhor qualidade: SVG vetorial. Alternativa: 1200 × 400 px (3:1).</strong><br />
              SVG permanece nítido em qualquer tela. Para PNG/WebP, use fundo transparente e evite arquivos já comprimidos por WhatsApp ou redes sociais.
            </div>
            <div className="overflow-hidden rounded-xl border border-stone-200 bg-[linear-gradient(45deg,#f7f7f7_25%,transparent_25%),linear-gradient(-45deg,#f7f7f7_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f7f7f7_75%),linear-gradient(-45deg,transparent_75%,#f7f7f7_75%)] bg-[length:18px_18px] bg-[position:0_0,0_9px,9px_-9px,-9px_0px] p-5">
              <div className="flex min-h-36 items-center justify-center rounded-lg bg-white/55 p-3">
                {headerLogoImage ? <img src={headerLogoImage} alt="Prévia da logo" className="max-h-36 w-full max-w-xl object-contain" /> : <ImageIcon className="h-8 w-8 text-stone-300" />}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-600 transition hover:border-[var(--store-accent,#d46a86)]">
                {logoUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} Trocar logo
                <input type="file" accept="image/png,image/webp,image/svg+xml" className="hidden" disabled={logoUploading} onChange={(e) => handleLogoFile(e.target.files?.[0])} />
              </label>
              <button type="button" onClick={() => setHeaderLogoImage(DEFAULT_STOREFRONT_DESIGN.headerLogoImage)} className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-500 transition hover:text-stone-800">
                <RotateCcw className="h-3.5 w-3.5" /> Usar logo padrão
              </button>
            </div>
          </div>
        </PanelShell>
      )}

      {ctx?.activePanel === "whatsappBanner" && (
        <PanelShell title="Banner Grupo WhatsApp" onClose={ctx.closePanel} onSave={saveWhatsapp} saving={waSaving} wide>
          <div className="space-y-4">
            <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-3 text-[11px] leading-relaxed text-stone-600">
              <strong className="text-stone-800">Tamanho ideal: 1800 × 380 px (aprox. 4,7:1).</strong><br />
              O card mantém a altura atual. Use os dois controles abaixo para reposicionar a arte dentro dele.
            </div>

            <label className="flex items-center justify-between gap-4 rounded-xl border border-stone-200 bg-white p-3">
              <div>
                <div className="text-xs font-bold text-stone-700">Exibir banner</div>
                <div className="mt-0.5 text-[11px] text-stone-400">Você pode ocultar e reativar quando quiser.</div>
              </div>
              <button type="button" onClick={() => setWaVisible((v) => !v)} className={`relative h-7 w-12 rounded-full transition ${waVisible ? "bg-[var(--store-accent,#d46a86)]" : "bg-stone-300"}`} aria-pressed={waVisible}>
                <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${waVisible ? "left-6" : "left-1"}`} />
              </button>
            </label>

            <div className="relative aspect-[90/19] overflow-hidden rounded-xl border border-stone-200 bg-[#fff7f8]">
              {waImage ? (
                <img src={waImage} alt="Prévia do banner do WhatsApp" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: `${waPosX}% ${waPosY}%` }} />
              ) : (
                <div className="flex h-full min-h-32 items-center justify-center text-xs text-stone-400">Nenhuma imagem selecionada.</div>
              )}
            </div>

            <div className="space-y-2 rounded-xl border border-stone-200 bg-stone-50/60 p-3">
              <label className="block text-[10px] font-semibold text-stone-500">
                Enquadramento horizontal: {Math.round(waPosX)}%
                <input type="range" min="0" max="100" value={waPosX} onChange={(e) => { const value = Number(e.target.value); setWaPosX(value); emitWhatsappFraming(value, waPosY); }} className="mt-1 w-full accent-rose-400" />
              </label>
              <label className="block text-[10px] font-semibold text-stone-500">
                Enquadramento vertical: {Math.round(waPosY)}%
                <input type="range" min="0" max="100" value={waPosY} onChange={(e) => { const value = Number(e.target.value); setWaPosY(value); emitWhatsappFraming(waPosX, value); }} className="mt-1 w-full accent-rose-400" />
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-600 transition hover:border-[var(--store-accent,#d46a86)]">
                {waUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} Trocar imagem
                <input type="file" accept="image/*" className="hidden" disabled={waUploading} onChange={(e) => handleWhatsappFile(e.target.files?.[0])} />
              </label>
              <button type="button" onClick={() => setWaImage(DEFAULT_STOREFRONT_DESIGN.whatsappBannerImage)} className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-500 transition hover:text-stone-800">
                <RotateCcw className="h-3.5 w-3.5" /> Usar arte padrão
              </button>
            </div>

            <label className="block">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-stone-500">Link do grupo</span>
              <input value={waLink} onChange={(e) => setWaLink(e.target.value.slice(0, 1200))} placeholder="https://chat.whatsapp.com/..." className="w-full rounded-lg border border-stone-300 bg-white p-2.5 text-sm outline-none focus:border-[var(--store-accent,#d46a86)]" />
              <span className="mt-1 block text-[10px] text-stone-400">Cole o link completo do convite. Ao clicar no banner, o cliente abre o grupo em uma nova aba.</span>
            </label>
          </div>
        </PanelShell>
      )}
    </>
  );
}
