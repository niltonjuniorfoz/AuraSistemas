import React, { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useEditMode } from "../EditModeContext";
import { PanelShell } from "./PanelShell";
import { STORE_COLOR_TOKENS, contrastRatio } from "../storeTheme";

const MIN_CONTRAST = 4.5; // WCAG AA pra texto normal

// Painel de cores da loja: 10 tokens (ver STORE_COLOR_TOKENS) mapeados 1:1
// com as chaves normalizadas em src/server/store.ts (normalizeStoreThemeColors).
// Cada campo tem um seletor de cor + botão "Padrão" (limpa o valor, volta a
// herdar o fallback do CSS). Mostra aviso de contraste WCAG pros dois pares
// mais sensíveis (texto/fundo e destaque/texto-do-destaque).
export function ColorsPanel() {
  const ctx = useEditMode();
  const [colors, setColors] = useState<Record<string, string>>(ctx?.draft?.theme?.colors || {});
  const [saving, setSaving] = useState(false);

  // Resincroniza com o draft toda vez que ESTE painel abre (o componente fica
  // montado o tempo todo, só retorna null quando inativo) — sem isso, cores
  // editadas e descartadas (fechar sem salvar) continuariam aparecendo se o
  // painel fosse reaberto depois. Dispara só na transição pra activePanel ===
  // "colors" (não a cada render com o painel já aberto, nem quando ctx.draft
  // muda por outro motivo enquanto o usuário edita).
  useEffect(() => {
    if (ctx?.activePanel === "colors") {
      setColors(ctx?.draft?.theme?.colors || {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx?.activePanel]);

  if (!ctx || ctx.activePanel !== "colors") return null;

  const set = (key: string, value: string) => setColors((c) => ({ ...c, [key]: value }));
  const reset = (key: string) => setColors((c) => ({ ...c, [key]: "" }));

  // Só fecha o painel se o patchDraft realmente salvou — se falhar (patchDraft
  // já mostrou o toast de erro), mantém o painel aberto com as edições feitas
  // pra não perder o trabalho do usuário sem chance de tentar de novo.
  const save = async () => {
    setSaving(true);
    try {
      const ok = await ctx.patchDraft({ theme: { colors } });
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
    <PanelShell title="Cores da loja" onClose={ctx.closePanel} onSave={save} saving={saving} wide>
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
              value={/^#[0-9a-fA-F]{6}$/.test(colors[key] || "") ? colors[key] : "#ffffff"}
              onChange={(e) => set(key, e.target.value)}
              className="h-8 w-8 shrink-0 cursor-pointer rounded border border-stone-300 bg-transparent p-0"
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-semibold text-stone-700">{label}</div>
              <input
                value={colors[key] || ""}
                onChange={(e) => set(key, e.target.value)}
                placeholder="Padrão"
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
  );
}
