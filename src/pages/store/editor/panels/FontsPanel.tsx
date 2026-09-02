import React, { useEffect, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { useEditMode } from "../EditModeContext";
import { PanelShell } from "./PanelShell";
import { readFontFile } from "../applyStoreFonts";
import { toast } from "../../../../components/Toast";

type FontValue = { url: string; family: string };
const EMPTY_FONT: FontValue = { url: "", family: "" };

// Um slot de upload de fonte (título ou corpo): botão de envio, preview com a
// própria fonte aplicada e botão "usar padrão" pra voltar ao fallback do CSS.
function FontSlot({ label, value, onChange }: { label: string; value: FontValue; onChange: (v: FontValue) => void }) {
  const [uploading, setUploading] = useState(false);
  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const url = await readFontFile(file);
      // Sanitiza o nome do arquivo pra virar o font-family: só letras, dígitos
      // e espaços sobrevivem, então nunca pode conter aspas ou qualquer coisa
      // capaz de "escapar" da regra @font-face montada em applyStoreFonts.ts.
      const family = file.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9]/g, " ").trim() || "Fonte Personalizada";
      onChange({ url, family });
    } catch (e: any) {
      toast.error(e.message || "Erro ao processar a fonte.");
    } finally {
      setUploading(false);
    }
  };
  return (
    <div className="rounded-lg border border-stone-200 p-3">
      <div className="mb-1.5 text-xs font-bold uppercase text-stone-500">{label}</div>
      {value.family && <div className="mb-2 text-sm" style={{ fontFamily: `"${value.family}"` }}>{value.family} — Aa Bb Cc 123</div>}
      <label className="flex w-fit cursor-pointer items-center gap-1.5 rounded-md border border-stone-300 px-2.5 py-1.5 text-xs font-semibold hover:border-amber-500">
        {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} {value.family ? "Trocar fonte" : "Enviar fonte"}
        <input type="file" accept=".ttf,.otf,.woff,.woff2" className="hidden" disabled={uploading} onChange={(e) => handleFile(e.target.files?.[0])} />
      </label>
      {value.family && <button onClick={() => onChange({ url: "", family: "" })} className="ml-2 text-[10px] text-stone-400 hover:text-stone-600">usar padrão</button>}
    </div>
  );
}

// Painel de fontes da loja: 2 slots (título/heading e corpo/body), cada um
// com {url, family} vindo de upload real (readFontFile converte pra data:
// URL no navegador, ver applyStoreFonts.ts). Mesmo padrão do ColorsPanel:
// PanelShell + resync no open + fecha só se patchDraft confirmar.
export function FontsPanel() {
  const ctx = useEditMode();
  const [heading, setHeading] = useState<FontValue>(ctx?.draft?.theme?.fonts?.heading || EMPTY_FONT);
  const [body, setBody] = useState<FontValue>(ctx?.draft?.theme?.fonts?.body || EMPTY_FONT);
  const [saving, setSaving] = useState(false);

  // Resincroniza com o draft toda vez que ESTE painel abre (o componente fica
  // montado o tempo todo, só retorna null quando inativo) — sem isso, fontes
  // editadas e descartadas (fechar sem salvar) continuariam aparecendo se o
  // painel fosse reaberto depois. Dispara só na transição pra activePanel ===
  // "fonts", resincronizando os dois slots (heading e body) juntos.
  useEffect(() => {
    if (ctx?.activePanel === "fonts") {
      setHeading(ctx?.draft?.theme?.fonts?.heading || EMPTY_FONT);
      setBody(ctx?.draft?.theme?.fonts?.body || EMPTY_FONT);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx?.activePanel]);

  if (!ctx || ctx.activePanel !== "fonts") return null;

  // Só fecha o painel se o patchDraft realmente salvou — se falhar (patchDraft
  // já mostrou o toast de erro), mantém o painel aberto com as edições feitas
  // pra não perder o trabalho do usuário sem chance de tentar de novo.
  const save = async () => {
    setSaving(true);
    try {
      const ok = await ctx.patchDraft({ theme: { fonts: { heading, body } } });
      if (ok) ctx.closePanel();
    } finally {
      setSaving(false);
    }
  };

  return (
    <PanelShell title="Fontes da loja" onClose={ctx.closePanel} onSave={save} saving={saving} wide>
      <div className="space-y-3">
        <FontSlot label="Fonte de título" value={heading} onChange={setHeading} />
        <FontSlot label="Fonte de texto" value={body} onChange={setBody} />
      </div>
    </PanelShell>
  );
}
