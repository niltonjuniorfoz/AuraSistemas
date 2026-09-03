// src/pages/store/editor/panels/SectionsPanel.tsx
import React, { useState } from "react";
import { ChevronDown, ChevronUp, Eye, EyeOff, Loader2, RotateCcw } from "lucide-react";
import { useLocation } from "react-router";
import { useEditMode } from "../EditModeContext";
import { PanelShell } from "./PanelShell";
import { SECTION_LABELS, SecaoPagina, effectiveCatalogoSections, effectiveHomeSections } from "../elementCatalog";

// O painel Seções é também o ponto de recuperação de conteúdo oculto.
// As seções ocultas nunca somem desta lista: ficam em um bloco próprio com
// ação explícita "Mostrar novamente", para não depender de um ícone pouco
// óbvio. Cada mudança persiste imediatamente no rascunho.
export function SectionsPanel() {
  const ctx = useEditMode();
  const location = useLocation();
  const [busyId, setBusyId] = useState<string | null>(null);
  const atCatalogo = location.pathname.includes("/catalogo");
  const atProduto = location.pathname.includes("/produto/");
  const pagina = atCatalogo ? "catalogo" : "home";
  if (!ctx || ctx.activePanel !== "sections") return null;

  if (atProduto) {
    return (
      <PanelShell title="Seções" onClose={ctx.closePanel}>
        <p className="py-4 text-center text-xs text-stone-400">As seções editáveis por enquanto são as da Home e do Catálogo.</p>
      </PanelShell>
    );
  }

  const sections = pagina === "catalogo" ? effectiveCatalogoSections(ctx.draft) : effectiveHomeSections(ctx.draft);
  const hiddenSections = sections.filter((s) => s.visivel === false);
  const visibleSections = sections.filter((s) => s.visivel !== false);

  // Preserva TODAS as demais propriedades da página ao atualizar sections.
  // Antes o catálogo era reconstruído só com titulo + sections, o que podia
  // apagar configurações adicionadas depois, como tituloCor.
  const patchSections = (mutate: (sections: SecaoPagina[]) => SecaoPagina[] | null) =>
    ctx.patchDraft((draft: any) => {
      const fresh = (pagina === "catalogo" ? effectiveCatalogoSections(draft) : effectiveHomeSections(draft)).map((s) => ({ ...s }));
      const next = mutate(fresh);
      if (!next) return null;
      const withOrder = next.map((s, i) => ({ ...s, ordem: i }));
      return pagina === "catalogo"
        ? { pages: { catalogo: { ...(draft?.pages?.catalogo || {}), sections: withOrder } } }
        : { pages: { home: { ...(draft?.pages?.home || {}), sections: withOrder } } };
    });

  const move = async (id: string, dir: -1 | 1) => {
    if (busyId) return;
    setBusyId(id);
    try {
      await patchSections((prev) => {
        const i = prev.findIndex((s) => s.id === id);
        const j = i + dir;
        if (i < 0 || j < 0 || j >= prev.length) return null;
        [prev[i], prev[j]] = [prev[j], prev[i]];
        return prev;
      });
    } finally { setBusyId(null); }
  };

  const setVisibility = async (id: string, visible: boolean) => {
    if (busyId) return;
    setBusyId(id);
    try {
      await patchSections((prev) => {
        const s = prev.find((x) => x.id === id);
        if (!s || s.visivel === visible) return null;
        s.visivel = visible;
        return prev;
      });
    } finally { setBusyId(null); }
  };

  const restoreAll = async () => {
    if (busyId || hiddenSections.length === 0) return;
    setBusyId("__restore_all__");
    try {
      await patchSections((prev) => {
        let changed = false;
        for (const s of prev) {
          if (s.visivel === false) {
            s.visivel = true;
            changed = true;
          }
        }
        return changed ? prev : null;
      });
    } finally { setBusyId(null); }
  };

  const originalIndex = (id: string) => sections.findIndex((s) => s.id === id);

  return (
    <PanelShell title={`Seções — ${pagina === "catalogo" ? "Catálogo" : "Home"}`} onClose={ctx.closePanel}>
      <p className="mb-4 text-[11px] leading-relaxed text-stone-500">
        O que você ocultar continua salvo no rascunho. Use <strong>Mostrar novamente</strong> abaixo para recuperar a qualquer momento.
      </p>

      {hiddenSections.length > 0 && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50/70 p-3">
          <div className="mb-2.5 flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800">
                <EyeOff className="h-4 w-4 text-amber-600" /> Itens ocultos
              </div>
              <div className="mt-0.5 text-[10px] text-stone-500">{hiddenSections.length} {hiddenSections.length === 1 ? "seção oculta" : "seções ocultas"}</div>
            </div>
            {hiddenSections.length > 1 && (
              <button
                type="button"
                onClick={restoreAll}
                disabled={!!busyId}
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-2.5 py-1.5 text-[10px] font-bold text-amber-700 transition hover:bg-amber-100 disabled:opacity-50"
              >
                {busyId === "__restore_all__" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                Mostrar todos
              </button>
            )}
          </div>

          <div className="space-y-2">
            {hiddenSections.map((s) => (
              <div key={s.id} className="flex items-center gap-2 rounded-lg border border-amber-200 bg-white p-2.5">
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-stone-700">{SECTION_LABELS[s.id] || s.id}</span>
                <button
                  type="button"
                  onClick={() => setVisibility(s.id, true)}
                  disabled={!!busyId}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-stone-900 px-3 py-1.5 text-[10px] font-bold text-white transition hover:bg-stone-700 disabled:opacity-50"
                >
                  {busyId === s.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
                  Mostrar novamente
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs font-bold text-stone-700">Seções visíveis</div>
        <div className="text-[10px] text-stone-400">↑↓ altera a ordem</div>
      </div>

      <div className="space-y-1.5">
        {visibleSections.map((s) => {
          const i = originalIndex(s.id);
          return (
            <div key={s.id} className="flex items-center gap-2 rounded-lg border border-stone-200 bg-white p-2.5">
              <div className="flex flex-col">
                <button onClick={() => move(s.id, -1)} disabled={i === 0 || !!busyId} className="p-0.5 text-stone-400 hover:text-stone-700 disabled:opacity-30"><ChevronUp className="h-3.5 w-3.5" /></button>
                <button onClick={() => move(s.id, 1)} disabled={i === sections.length - 1 || !!busyId} className="p-0.5 text-stone-400 hover:text-stone-700 disabled:opacity-30"><ChevronDown className="h-3.5 w-3.5" /></button>
              </div>
              <span className="min-w-0 flex-1 truncate text-sm text-stone-700">{SECTION_LABELS[s.id] || s.id}</span>
              <button
                type="button"
                onClick={() => setVisibility(s.id, false)}
                disabled={!!busyId}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-stone-200 px-2.5 py-1.5 text-[10px] font-semibold text-stone-500 transition hover:border-stone-300 hover:bg-stone-50 hover:text-stone-700 disabled:opacity-50"
              >
                {busyId === s.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <EyeOff className="h-3.5 w-3.5" />}
                Ocultar
              </button>
            </div>
          );
        })}
      </div>

      {hiddenSections.length === 0 && (
        <div className="mt-4 rounded-lg border border-dashed border-stone-200 px-3 py-2.5 text-center text-[10px] text-stone-400">
          Nenhuma seção está oculta nesta página.
        </div>
      )}
    </PanelShell>
  );
}
