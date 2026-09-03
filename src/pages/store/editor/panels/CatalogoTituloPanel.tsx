import React, { useEffect, useState } from "react";
import { useEditMode } from "../EditModeContext";
import { PanelShell } from "./PanelShell";

const DEFAULT_CATALOG_TITLE_COLOR = "#D46A86";

function normalizeColor(value: unknown) {
  const raw = String(value || "").trim();
  return /^#[0-9a-f]{6}$/i.test(raw) ? raw.toUpperCase() : DEFAULT_CATALOG_TITLE_COLOR;
}

function applyCatalogTitleColor(value: unknown) {
  document.documentElement.style.setProperty("--store-catalog-title-color", normalizeColor(value));
}

// Painel dedicado pro título do catálogo: o TextPanel patcheia
// { [fieldKey]: value } no TOPO do draft, mas o título vive ANINHADO em
// pages.catalogo.titulo — e o merge do servidor substitui a página `catalogo`
// INTEIRA (Task 1), então o patch precisa mandar titulo + sections juntos.
// A cor acompanha o mesmo objeto para persistir tanto no preview quanto na
// loja publicada. O padrão rosa mantém o catálogo coerente com a identidade
// visual da vitrine mesmo em lojas que ainda não salvaram uma cor própria.
export function CatalogoTituloPanel() {
  const ctx = useEditMode();
  const draftColor = normalizeColor(ctx?.draft?.pages?.catalogo?.tituloCor);
  const [value, setValue] = useState(String(ctx?.draft?.pages?.catalogo?.titulo || ""));
  const [color, setColor] = useState(draftColor);
  const [saving, setSaving] = useState(false);

  // No editor, acompanha a cor salva no rascunho mesmo antes de abrir o painel
  // (ex.: ao trocar da Home para Catálogo). Fora do editor, busca a config
  // publicada para aplicar a personalização também na loja pública.
  useEffect(() => {
    if (ctx) {
      applyCatalogTitleColor(draftColor);
      return;
    }

    let alive = true;
    fetch("/api/store/config")
      .then((r) => (r.ok ? r.json() : null))
      .then((config) => {
        if (!alive) return;
        applyCatalogTitleColor(config?.pages?.catalogo?.tituloCor);
      })
      .catch(() => {
        if (alive) applyCatalogTitleColor(DEFAULT_CATALOG_TITLE_COLOR);
      });
    return () => { alive = false; };
  }, [!!ctx, draftColor]); // eslint-disable-line react-hooks/exhaustive-deps

  // Resync apenas quando o painel abre; mudanças locais de texto/cor não são
  // sobrescritas por renders intermediários do contexto.
  useEffect(() => {
    if (ctx?.activePanel !== "catalogoTitulo") return;
    setValue(String(ctx?.draft?.pages?.catalogo?.titulo || ""));
    const nextColor = normalizeColor(ctx?.draft?.pages?.catalogo?.tituloCor);
    setColor(nextColor);
    applyCatalogTitleColor(nextColor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx?.activePanel]);

  if (!ctx || ctx.activePanel !== "catalogoTitulo") return null;

  const close = () => {
    // Se fechar sem salvar, desfaz somente a prévia local da cor.
    applyCatalogTitleColor(ctx?.draft?.pages?.catalogo?.tituloCor);
    ctx.closePanel();
  };

  const save = async () => {
    setSaving(true);
    try {
      // Payload em FUNÇÃO: o patchDraft roda ela na fila, contra o draft
      // fresco daquele momento. Manda o objeto catalogo COMPLETO para preservar
      // sections e qualquer outra configuração da página.
      const ok = await ctx.patchDraft((draft: any) => ({
        pages: {
          catalogo: {
            ...(draft?.pages?.catalogo || {}),
            titulo: value,
            tituloCor: normalizeColor(color),
          },
        },
      }));
      if (ok) ctx.closePanel();
    } finally {
      setSaving(false);
    }
  };

  const changeColor = (next: string) => {
    const normalized = normalizeColor(next);
    setColor(normalized);
    applyCatalogTitleColor(normalized);
  };

  return (
    <PanelShell title="Título do catálogo" onClose={close} onSave={save} saving={saving}>
      <p className="mb-2 text-[11px] text-stone-500">O texto personalizado aparece quando o catálogo abre sem busca nem categoria. Vazio = "Todas as categorias".</p>
      <input value={value} onChange={(e) => setValue(e.target.value.slice(0, 80))} placeholder="Todas as categorias"
        className="w-full rounded-lg border border-stone-300 p-2.5 text-sm outline-none focus:border-amber-500" />
      <div className="mt-1 text-right text-[10px] text-stone-400">{value.length}/80</div>

      <div className="mt-5 border-t border-stone-200 pt-4">
        <label className="mb-2 block text-xs font-bold text-stone-700">Cor do título</label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={color}
            onChange={(e) => changeColor(e.target.value)}
            className="h-10 w-12 cursor-pointer rounded-lg border border-stone-300 bg-white p-1"
            aria-label="Escolher cor do título do catálogo"
          />
          <div className="min-w-0 flex-1 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 font-mono text-xs font-semibold text-stone-600">
            {color}
          </div>
          <button
            type="button"
            onClick={() => changeColor(DEFAULT_CATALOG_TITLE_COLOR)}
            className="rounded-lg border border-rose-200 px-3 py-2 text-[11px] font-semibold text-[#D46A86] transition hover:bg-rose-50"
          >
            Rosa padrão
          </button>
        </div>
        <p className="mt-2 text-[10px] leading-relaxed text-stone-400">Essa cor é aplicada ao título grande de todas as categorias, como MAQUIAGEM, PERFUMES e SKINCARE.</p>
      </div>
    </PanelShell>
  );
}
