import React, { useEffect, useState } from "react";
import { useEditMode } from "../EditModeContext";
import { PanelShell } from "./PanelShell";

// Painel simples reaproveitado por vários campos de texto (hero, aviso,
// rodapé). Pra campos com mais de um input (ex.: como-comprar), usar um
// painel próprio em vez deste.
// `placeholder` é opcional e só usado quando o campo precisa de um texto de
// exemplo pra orientar o preenchimento (ex.: rodapé).
export function TextPanel({ panelKey, title, fieldKey, multiline, maxLength, placeholder }: { panelKey: string; title: string; fieldKey: string; multiline?: boolean; maxLength: number; placeholder?: string }) {
  const ctx = useEditMode();
  const [value, setValue] = useState(String(ctx?.draft?.[fieldKey] || ""));
  const [saving, setSaving] = useState(false);
  // Resincroniza `value` com o draft toda vez que ESTE painel abre — o
  // componente fica montado o tempo todo (só retorna null quando inativo),
  // então sem isso um texto digitado e descartado (fechar sem salvar)
  // continuava aparecendo se o painel fosse reaberto depois. Dispara só na
  // transição pra activePanel === panelKey (não a cada render com o painel
  // já aberto), senão um re-render por outro motivo enquanto o usuário
  // digita (ex.: draft mudando por causa de outro painel) apagaria o texto
  // em andamento.
  useEffect(() => {
    if (ctx?.activePanel === panelKey) setValue(String(ctx?.draft?.[fieldKey] || ""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx?.activePanel, panelKey, fieldKey]);
  if (!ctx || ctx.activePanel !== panelKey) return null;
  // Só fecha o painel se o patchDraft realmente salvou — se falhar (patchDraft
  // já mostrou o toast de erro), mantém o painel aberto com o texto digitado
  // pra não perder a edição do usuário sem chance de tentar de novo.
  const save = async () => {
    setSaving(true);
    try {
      const ok = await ctx.patchDraft({ [fieldKey]: value });
      if (ok) ctx.closePanel();
    } finally {
      setSaving(false);
    }
  };
  return (
    <PanelShell title={title} onClose={ctx.closePanel} onSave={save} saving={saving}>
      {multiline ? (
        <textarea value={value} onChange={(e) => setValue(e.target.value.slice(0, maxLength))} rows={3}
          placeholder={placeholder}
          className="w-full rounded-lg border border-stone-300 p-2.5 text-sm outline-none focus:border-amber-500" />
      ) : (
        <input value={value} onChange={(e) => setValue(e.target.value.slice(0, maxLength))}
          placeholder={placeholder}
          className="w-full rounded-lg border border-stone-300 p-2.5 text-sm outline-none focus:border-amber-500" />
      )}
      <div className="mt-1 text-right text-[10px] text-stone-400">{value.length}/{maxLength}</div>
    </PanelShell>
  );
}
