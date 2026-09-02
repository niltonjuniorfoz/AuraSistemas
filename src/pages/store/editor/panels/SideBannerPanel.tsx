import React, { useEffect, useState } from "react";
import { useEditMode } from "../EditModeContext";
import { PanelShell } from "./PanelShell";

// Título/subtítulo do bloco preto ao lado da vitrine "Selecionado pra você".
export function SideBannerPanel() {
  const ctx = useEditMode();
  const [title, setTitle] = useState(String(ctx?.draft?.sideBannerTitle || ""));
  const [subtitle, setSubtitle] = useState(String(ctx?.draft?.sideBannerSubtitle || ""));
  const [saving, setSaving] = useState(false);
  // Resincroniza com o draft toda vez que ESTE painel abre — mesmo motivo
  // dos demais painéis (ver BannerPanel/TextPanel): sem isso, uma edição
  // digitada e descartada (fechar sem salvar) reaparecia na reabertura.
  // Dispara só na transição pra activePanel === "sideBanner".
  useEffect(() => {
    if (ctx?.activePanel === "sideBanner") {
      setTitle(String(ctx?.draft?.sideBannerTitle || ""));
      setSubtitle(String(ctx?.draft?.sideBannerSubtitle || ""));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx?.activePanel]);
  if (!ctx || ctx.activePanel !== "sideBanner") return null;

  // Só fecha o painel se o patchDraft realmente salvou — se falhar (patchDraft
  // já mostrou o toast de erro), mantém o painel aberto com o texto digitado
  // pra não perder a edição do usuário sem chance de tentar de novo.
  const save = async () => {
    setSaving(true);
    try {
      const ok = await ctx.patchDraft({ sideBannerTitle: title, sideBannerSubtitle: subtitle });
      if (ok) ctx.closePanel();
    } finally {
      setSaving(false);
    }
  };

  return (
    <PanelShell title="Banner lateral" onClose={ctx.closePanel} onSave={save} saving={saving}>
      <input value={title} onChange={(e) => setTitle(e.target.value.slice(0, 120))} placeholder="Título" className="mb-2 w-full rounded-lg border border-stone-300 p-2.5 text-sm outline-none focus:border-amber-500" />
      <textarea value={subtitle} onChange={(e) => setSubtitle(e.target.value.slice(0, 300))} rows={2} placeholder="Subtítulo" className="w-full rounded-lg border border-stone-300 p-2.5 text-sm outline-none focus:border-amber-500" />
    </PanelShell>
  );
}
