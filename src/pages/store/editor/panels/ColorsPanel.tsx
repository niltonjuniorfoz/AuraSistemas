import React, { useEffect, useState } from "react";
import { AlertTriangle, Layers3, Square } from "lucide-react";
import { useEditMode } from "../EditModeContext";
import { PanelShell } from "./PanelShell";
import { DEFAULT_STORE_COLORS, STORE_COLOR_TOKENS, contrastRatio } from "../storeTheme";
import { readStorefrontDesign, StoreHeaderMode, upsertStorefrontDesign } from "../../storefrontDesign";

const MIN_CONTRAST = 4.5; // WCAG AA pra texto normal

// O ShopLayout já monta este painel em todas as rotas públicas da loja, mesmo
// quando não existe editor ativo. Aproveitamos esse ponto global para aplicar
// a superfície do cabeçalho sem acoplar regra visual ao markup do header.
// O seletor é propositalmente restrito ao header sticky/z-30 da loja.
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
`;

// Painel de cores da loja: 10 tokens (ver STORE_COLOR_TOKENS) mapeados 1:1
// com as chaves normalizadas em src/server/store.ts (normalizeStoreThemeColors).
// Cada campo tem um seletor de cor + botão "Padrão" (limpa o valor, volta a
// herdar o fallback do CSS). Mostra aviso de contraste WCAG pros dois pares
// mais sensíveis (texto/fundo e destaque/texto-do-destaque).
export function ColorsPanel() {
  const ctx = useEditMode();
  const initialDesign = readStorefrontDesign(ctx?.draft?.quickLinks);
  const [colors, setColors] = useState<Record<string, string>>(ctx?.draft?.theme?.colors || {});
  const [headerMode, setHeaderMode] = useState<StoreHeaderMode>(initialDesign.headerMode);
  const [publishedHeaderMode, setPublishedHeaderMode] = useState<StoreHeaderMode>("glass");
  const [saving, setSaving] = useState(false);

  // Fora do editor, lê a mesma config pública usada pela vitrine. Dentro do
  // editor o draft é a fonte da verdade e a troca de modo vira preview ao vivo.
  useEffect(() => {
    if (ctx) return;
    let cancelled = false;
    fetch("/api/store/config")
      .then((r) => (r.ok ? r.json() : null))
      .then((config) => {
        if (!cancelled && config) setPublishedHeaderMode(readStorefrontDesign(config.quickLinks).headerMode);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [ctx]);

  // Resincroniza com o draft toda vez que ESTE painel abre (o componente fica
  // montado o tempo todo, só o painel visual some quando inativo).
  useEffect(() => {
    if (ctx?.activePanel === "colors") {
      setColors(ctx?.draft?.theme?.colors || {});
      setHeaderMode(readStorefrontDesign(ctx?.draft?.quickLinks).headerMode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx?.activePanel]);

  const draftHeaderMode = ctx ? readStorefrontDesign(ctx?.draft?.quickLinks).headerMode : publishedHeaderMode;
  const effectiveHeaderMode = ctx?.activePanel === "colors" ? headerMode : draftHeaderMode;

  useEffect(() => {
    const header = document.querySelector<HTMLElement>("header.sticky.top-0.z-30");
    if (!header) return;
    header.dataset.storeHeaderMode = effectiveHeaderMode;
    return () => { delete header.dataset.storeHeaderMode; };
  }, [effectiveHeaderMode]);

  const surfaceStyle = <style data-store-header-surface>{HEADER_SURFACE_CSS}</style>;
  if (!ctx || ctx.activePanel !== "colors") return surfaceStyle;

  const set = (key: string, value: string) => setColors((c) => ({ ...c, [key]: value }));
  const reset = (key: string) => setColors((c) => ({ ...c, [key]: "" }));

  // Só fecha o painel se o patchDraft realmente salvou. quickLinks é
  // atualizado de forma funcional pra preservar qualquer metadata/link que
  // tenha mudado enquanto o painel estava aberto.
  const save = async () => {
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

  const textContrast = colors.text && colors.bg ? contrastRatio(colors.text, colors.bg) : null;
  const accentContrast = colors.accent && colors.accentText ? contrastRatio(colors.accent, colors.accentText) : null;
  const warnings = [
    textContrast != null && textContrast < MIN_CONTRAST ? `Texto principal x Fundo da página: contraste ${textContrast.toFixed(2)}:1 (mínimo recomendado ${MIN_CONTRAST}:1).` : null,
    accentContrast != null && accentContrast < MIN_CONTRAST ? `Destaque x Texto do destaque: contraste ${accentContrast.toFixed(2)}:1 (mínimo recomendado ${MIN_CONTRAST}:1).` : null,
  ].filter(Boolean) as string[];

  return (
    <>
      {surfaceStyle}
      <PanelShell title="Cores da loja" onClose={ctx.closePanel} onSave={save} saving={saving} wide>
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
            <div className="space-y-1">
              {warnings.map((w) => <p key={w}>{w}</p>)}
            </div>
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
              {colors[key] && (
                <button onClick={() => reset(key)} className="shrink-0 text-[11px] font-semibold text-stone-400 hover:text-stone-700">
                  Padrão
                </button>
              )}
            </div>
          ))}
        </div>
      </PanelShell>
    </>
  );
}
