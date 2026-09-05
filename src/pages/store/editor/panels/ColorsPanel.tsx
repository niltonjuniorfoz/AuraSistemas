import React, { useEffect, useState } from "react";
import { useLocation } from "react-router";
import { AlertTriangle, Eye, EyeOff, Layers3, Loader2, MessageCircle, Pencil, RotateCcw, Square, Upload } from "lucide-react";
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
import { compressImage, BANNER_COMPRESS_OPTS } from "../../../../lib/imageUpload";
import { toast } from "../../../../components/Toast";

const MIN_CONTRAST = 4.5; // WCAG AA pra texto normal

// O ShopLayout já monta este componente em todas as rotas públicas da loja.
// Isso nos permite manter a superfície do header e o banner final da Home no
// mesmo nível do layout sem alterar o fluxo do carrinho/rodapé.
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

/* Identidade específica DB Cosmetics: versão horizontal, transparente e mais
   legível sobre o vidro. O seletor por alt impede trocar logos de outras lojas
   que usem a mesma aplicação Aura. */
header.sticky.top-0.z-30 a[href="/loja"] img[alt*="Cosmetics" i] {
  content: url('/branding/db-cosmetics-header.svg') !important;
  width: 245px !important;
  height: 82px !important;
  max-width: 245px !important;
  transform: none !important;
  scale: 1 !important;
  object-fit: contain !important;
  filter: drop-shadow(0 3px 8px rgba(115,82,13,.10));
}
@media (max-width: 767px) {
  header.sticky.top-0.z-30 a[href="/loja"] img[alt*="Cosmetics" i] {
    width: 174px !important;
    height: 58px !important;
    max-width: 174px !important;
  }
}
`;

export function ColorsPanel() {
  const ctx = useEditMode();
  const location = useLocation();
  const initialDesign = readStorefrontDesign(ctx?.draft?.quickLinks);
  const [colors, setColors] = useState<Record<string, string>>(ctx?.draft?.theme?.colors || {});
  const [headerMode, setHeaderMode] = useState<StoreHeaderMode>(initialDesign.headerMode);
  const [publishedDesign, setPublishedDesign] = useState<StorefrontDesignSettings>(DEFAULT_STOREFRONT_DESIGN);
  const [publishedLoaded, setPublishedLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  // Estado do editor do banner do grupo. Fica aqui porque este componente já
  // está montado exatamente entre a página (<Outlet>) e o rodapé no ShopLayout.
  const [waVisible, setWaVisible] = useState(initialDesign.whatsappBannerVisible);
  const [waImage, setWaImage] = useState(initialDesign.whatsappBannerImage);
  const [waLink, setWaLink] = useState(initialDesign.whatsappBannerLink);
  const [waUploading, setWaUploading] = useState(false);
  const [waSaving, setWaSaving] = useState(false);

  // Fora do editor, lê uma vez a config pública para header + banner final.
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

  // Resincroniza os painéis com o draft quando são abertos.
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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx?.activePanel]);

  const draftDesign = ctx ? readStorefrontDesign(ctx?.draft?.quickLinks) : publishedDesign;
  const effectiveHeaderMode = ctx?.activePanel === "colors" ? headerMode : draftDesign.headerMode;
  const effectiveDesign: StorefrontDesignSettings = ctx?.activePanel === "whatsappBanner"
    ? { ...draftDesign, whatsappBannerVisible: waVisible, whatsappBannerImage: waImage, whatsappBannerLink: waLink }
    : draftDesign;

  useEffect(() => {
    const header = document.querySelector<HTMLElement>("header.sticky.top-0.z-30");
    if (!header) return;
    header.dataset.storeHeaderMode = effectiveHeaderMode;
    return () => { delete header.dataset.storeHeaderMode; };
  }, [effectiveHeaderMode]);

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
    <div className="relative h-[145px] overflow-hidden rounded-2xl border border-rose-100 bg-[#fff7f8] shadow-[0_18px_45px_-34px_rgba(100,55,70,.42)] sm:h-[185px] lg:h-[225px]">
      <img src={effectiveDesign.whatsappBannerImage} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-20 blur-2xl" />
      <div className="absolute inset-0 bg-gradient-to-r from-white/20 via-transparent to-white/20" aria-hidden="true" />
      <img src={effectiveDesign.whatsappBannerImage} alt="Convite para o grupo do WhatsApp" className="relative z-[1] h-full w-full object-contain transition duration-500 group-hover:scale-[1.006]" />
      <div className="pointer-events-none absolute inset-x-8 top-0 z-[2] h-px bg-white/70" aria-hidden="true" />
    </div>
  ) : null;

  return (
    <>
      <style data-store-header-surface>{HEADER_SURFACE_CSS}</style>

      {/* Fica depois de todo o conteúdo da Home e imediatamente antes do
          rodapé porque ColorsPanel é montado logo após o Outlet no ShopLayout. */}
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
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); ctx.openPanel("whatsappBanner"); }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/75 bg-white/90 px-3 py-2 text-[11px] font-bold text-stone-700 shadow-md backdrop-blur transition hover:text-[var(--store-accent,#d46a86)]"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setWhatsappVisibility(false); }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/75 bg-white/90 px-3 py-2 text-[11px] font-bold text-stone-600 shadow-md backdrop-blur transition hover:text-red-500"
                  >
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
              <button
                type="button"
                onClick={() => setHeaderMode("glass")}
                className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition ${headerMode === "glass" ? "border-[var(--store-accent,#d46a86)] bg-white text-[var(--store-accent,#d46a86)] shadow-sm" : "border-stone-200 bg-white/60 text-stone-500 hover:border-stone-300"}`}
              >
                <Layers3 className="h-4 w-4" /> Translúcido
              </button>
              <button
                type="button"
                onClick={() => setHeaderMode("solid")}
                className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition ${headerMode === "solid" ? "border-[var(--store-accent,#d46a86)] bg-white text-[var(--store-accent,#d46a86)] shadow-sm" : "border-stone-200 bg-white/60 text-stone-500 hover:border-stone-300"}`}
              >
                <Square className="h-4 w-4" /> Sólido
              </button>
            </div>
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
                <input
                  type="color"
                  value={/^#[0-9a-fA-F]{6}$/.test(colors[key] || "") ? colors[key] : DEFAULT_STORE_COLORS[key]}
                  onChange={(e) => set(key, e.target.value)}
                  className="h-8 w-8 shrink-0 cursor-pointer rounded border border-stone-300 bg-transparent p-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-semibold text-stone-700">{label}</div>
                  <input
                    value={colors[key] || ""}
                    onChange={(e) => set(key, e.target.value)}
                    placeholder={`Padrão ${DEFAULT_STORE_COLORS[key]}`}
                    className="w-full rounded-md border border-stone-300 p-1.5 text-xs font-mono outline-none focus:border-amber-500"
                  />
                </div>
                {colors[key] && <button onClick={() => reset(key)} className="shrink-0 text-[11px] font-semibold text-stone-400 hover:text-stone-700">Padrão</button>}
              </div>
            ))}
          </div>
        </PanelShell>
      )}

      {ctx?.activePanel === "whatsappBanner" && (
        <PanelShell title="Banner Grupo WhatsApp" onClose={ctx.closePanel} onSave={saveWhatsapp} saving={waSaving} wide>
          <div className="space-y-4">
            <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-3 text-[11px] leading-relaxed text-stone-600">
              Este banner aparece no fim da Home, depois do último conteúdo e antes do rodapé. A altura é reduzida automaticamente para manter o visual minimalista.
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

            <div className="overflow-hidden rounded-xl border border-stone-200 bg-[#fff7f8]">
              <div className="relative h-40">
                {waImage && <img src={waImage} alt="Prévia do banner do WhatsApp" className="h-full w-full object-contain" />}
              </div>
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
