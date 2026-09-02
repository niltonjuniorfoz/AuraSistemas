import React, { useEffect, useState } from "react";
import { useEditMode } from "../EditModeContext";
import { PanelShell } from "./PanelShell";

// Painel dedicado pro título do catálogo: o TextPanel patcheia
// { [fieldKey]: value } no TOPO do draft, mas o título vive ANINHADO em
// pages.catalogo.titulo — e o merge do servidor substitui a página `catalogo`
// INTEIRA (Task 1), então o patch precisa mandar titulo + sections juntos.
// Mesmos 3 fixes do TextPanel: resync na abertura (transição de activePanel,
// NUNCA ctx?.draft nas dependências), fechar só com patchDraft OK e guard de
// saving.
export function CatalogoTituloPanel() {
  const ctx = useEditMode();
  const [value, setValue] = useState(String(ctx?.draft?.pages?.catalogo?.titulo || ""));
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (ctx?.activePanel === "catalogoTitulo") setValue(String(ctx?.draft?.pages?.catalogo?.titulo || ""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx?.activePanel]);
  if (!ctx || ctx.activePanel !== "catalogoTitulo") return null;
  const save = async () => {
    setSaving(true);
    try {
      // Payload em FUNÇÃO: o patchDraft roda ela na fila, contra o draft
      // fresco daquele momento (não o do clique). Manda o objeto catalogo
      // COMPLETO (spread carrega `sections` junto): o merge do servidor é por
      // página — mandar só `titulo` normalizaria sections pra [] e descartaria
      // uma reordenação recém-salva das seções.
      const ok = await ctx.patchDraft((draft: any) => ({
        pages: { catalogo: { ...(draft?.pages?.catalogo || {}), titulo: value } },
      }));
      if (ok) ctx.closePanel();
    } finally {
      setSaving(false);
    }
  };
  return (
    <PanelShell title="Título do catálogo" onClose={ctx.closePanel} onSave={save} saving={saving}>
      <p className="mb-2 text-[11px] text-stone-500">Aparece quando o catálogo abre sem busca nem categoria. Vazio = "Todas as categorias" (padrão).</p>
      <input value={value} onChange={(e) => setValue(e.target.value.slice(0, 80))} placeholder="Todas as categorias"
        className="w-full rounded-lg border border-stone-300 p-2.5 text-sm outline-none focus:border-amber-500" />
      <div className="mt-1 text-right text-[10px] text-stone-400">{value.length}/80</div>
    </PanelShell>
  );
}
