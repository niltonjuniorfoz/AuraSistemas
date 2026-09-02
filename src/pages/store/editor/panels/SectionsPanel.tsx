// src/pages/store/editor/panels/SectionsPanel.tsx
import React, { useState } from "react";
import { ChevronDown, ChevronUp, Eye, EyeOff, Loader2 } from "lucide-react";
import { useLocation } from "react-router";
import { useEditMode } from "../EditModeContext";
import { PanelShell } from "./PanelShell";
import { SECTION_LABELS, SecaoPagina, effectiveCatalogoSections, effectiveHomeSections } from "../elementCatalog";

// Lista TODAS as seções da página atual, INCLUINDO as ocultas — é o caminho
// de recuperação de seção escondida (spec: "reativável pelo painel de
// seções"). Reordenar (↑↓) e alternar visibilidade também funcionam por aqui.
//
// Diferente dos painéis de rascunho local + Salvar, este é CRUD ao vivo (como
// o CategoriesPanel): cada ↑↓/👁️ já persiste na hora via ctx.patchDraft, então
// o PanelShell fica SEM `onSave` (sem rodapé). E não há estado local de lista
// nenhum: a lista renderiza direto de ctx.draft via effective*Sections a cada
// render — o draft atualizado re-renderiza sozinho, sem resync possível de
// quebrar. Só um guard por linha (busyId) contra clique duplo.
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
        <p className="py-4 text-center text-xs text-stone-400">O template da página de produto chega na Fase 2 — por enquanto as seções editáveis são as da Home e do Catálogo.</p>
      </PanelShell>
    );
  }

  const sections = pagina === "catalogo" ? effectiveCatalogoSections(ctx.draft) : effectiveHomeSections(ctx.draft);

  // Payload em FUNÇÃO: o patchDraft roda ela na fila, contra o draft fresco
  // daquele momento (não o do clique) — mesma proteção de stale closure do
  // patchCatalogoSections da StoreCatalog. O merge do servidor é POR PÁGINA e
  // substitui a página inteira (Task 1): no catálogo, titulo + sections vão
  // SEMPRE juntos. `mutate` devolve null = no-op (nada gravado, nada dirty).
  const patchSections = (mutate: (sections: SecaoPagina[]) => SecaoPagina[] | null) =>
    ctx.patchDraft((draft: any) => {
      const fresh = (pagina === "catalogo" ? effectiveCatalogoSections(draft) : effectiveHomeSections(draft)).map((s) => ({ ...s }));
      const next = mutate(fresh);
      if (!next) return null;
      const withOrder = next.map((s, i) => ({ ...s, ordem: i }));
      return pagina === "catalogo"
        ? { pages: { catalogo: { titulo: String(draft?.pages?.catalogo?.titulo || ""), sections: withOrder } } }
        : { pages: { home: { sections: withOrder } } };
    });

  // Aqui as ocultas aparecem na lista, então trocar com o vizinho DIRETO é o
  // certo (na página, os helpers pulam ocultas porque lá elas não renderizam).
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
  const toggle = async (id: string) => {
    if (busyId) return;
    setBusyId(id);
    try {
      await patchSections((prev) => {
        const s = prev.find((x) => x.id === id);
        if (!s) return null;
        s.visivel = s.visivel === false; // cópia rasa feita no patchSections — mutar aqui é seguro
        return prev;
      });
    } finally { setBusyId(null); }
  };

  return (
    <PanelShell title={`Seções — ${pagina === "catalogo" ? "Catálogo" : "Home"}`} onClose={ctx.closePanel}>
      <p className="mb-3 text-[11px] text-stone-500">Use ↑↓ pra reordenar e o olho pra ocultar/mostrar — cada mudança já vale no rascunho na hora. Seção oculta some da loja (desktop e mobile) mas fica listada aqui pra reativar quando quiser.</p>
      <div className="space-y-1.5">
        {sections.map((s, i) => (
          <div key={s.id} className={`flex items-center gap-2 rounded-lg border p-2 ${s.visivel === false ? "border-stone-200 bg-stone-50 opacity-60" : "border-stone-200"}`}>
            <div className="flex flex-col">
              <button onClick={() => move(s.id, -1)} disabled={i === 0 || !!busyId} className="p-0.5 text-stone-400 hover:text-stone-700 disabled:opacity-30"><ChevronUp className="h-3.5 w-3.5" /></button>
              <button onClick={() => move(s.id, 1)} disabled={i === sections.length - 1 || !!busyId} className="p-0.5 text-stone-400 hover:text-stone-700 disabled:opacity-30"><ChevronDown className="h-3.5 w-3.5" /></button>
            </div>
            <span className="min-w-0 flex-1 truncate text-sm text-stone-700">{SECTION_LABELS[s.id] || s.id}</span>
            {s.visivel === false && <span className="shrink-0 rounded bg-stone-200 px-1.5 py-0.5 text-[10px] font-bold text-stone-500">oculta</span>}
            <button onClick={() => toggle(s.id)} disabled={!!busyId} title={s.visivel === false ? "Mostrar seção" : "Ocultar seção"} className="shrink-0 text-stone-500 hover:text-stone-800 disabled:opacity-50">
              {busyId === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : s.visivel === false ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        ))}
      </div>
    </PanelShell>
  );
}
