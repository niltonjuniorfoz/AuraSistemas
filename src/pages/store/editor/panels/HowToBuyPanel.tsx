import React, { useEffect, useState } from "react";
import { useEditMode } from "../EditModeContext";
import { PanelShell } from "./PanelShell";

const DEFAULT_STEPS_KEYS = ["s1", "s2", "s3", "s4", "s5"]; // espelha a ordem fixa de ícones em StoreHome.tsx

function stepsFromDraft(ctx: ReturnType<typeof useEditMode>) {
  return Array.isArray(ctx?.draft?.howToBuySteps)
    ? ctx!.draft.howToBuySteps
    : DEFAULT_STEPS_KEYS.map(() => ({ title: "", desc: "" }));
}

export function HowToBuyPanel() {
  const ctx = useEditMode();
  const [steps, setSteps] = useState(() => stepsFromDraft(ctx));
  const [visible, setVisible] = useState(ctx?.draft?.howToBuyVisible !== false);
  const [saving, setSaving] = useState(false);
  // Resincroniza `steps`/`visible` com o draft toda vez que ESTE painel abre —
  // o componente fica montado o tempo todo (só retorna null quando inativo),
  // então sem isso edições digitadas e descartadas (fechar sem salvar)
  // continuavam aparecendo se o painel fosse reaberto depois. Dispara só na
  // transição pra activePanel === "howToBuy" (não a cada render com o painel
  // já aberto, nem quando `ctx.draft` muda por outro motivo), senão um
  // re-render enquanto o usuário digita apagaria a edição em andamento.
  useEffect(() => {
    if (ctx?.activePanel === "howToBuy") {
      setSteps(stepsFromDraft(ctx));
      setVisible(ctx?.draft?.howToBuyVisible !== false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx?.activePanel]);
  if (!ctx || ctx.activePanel !== "howToBuy") return null;

  // Só fecha o painel se o patchDraft realmente salvou — se falhar (patchDraft
  // já mostrou o toast de erro), mantém o painel aberto com as edições feitas
  // pra não perder o trabalho do usuário sem chance de tentar de novo.
  const save = async () => {
    setSaving(true);
    try {
      const ok = await ctx.patchDraft({ howToBuySteps: steps, howToBuyVisible: visible });
      if (ok) ctx.closePanel();
    } finally {
      setSaving(false);
    }
  };
  const update = (i: number, field: "title" | "desc", value: string) => {
    const next = [...steps];
    next[i] = { ...next[i], [field]: value.slice(0, field === "title" ? 60 : 120) };
    setSteps(next);
  };

  return (
    <PanelShell title="Como comprar" onClose={ctx.closePanel} onSave={save} saving={saving} wide>
      <label className="mb-3 flex items-center gap-2 text-sm text-stone-700">
        <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} /> Mostrar esta seção na loja
      </label>
      {visible && (
        <div className="space-y-3">
          {steps.map((s: any, i: number) => (
            <div key={i} className="rounded-lg border border-stone-200 p-2.5">
              <div className="mb-1 text-[10px] font-bold uppercase text-stone-400">Etapa {i + 1}</div>
              <input value={s.title} onChange={(e) => update(i, "title", e.target.value)} placeholder="Título" className="mb-1.5 w-full rounded-md border border-stone-300 p-2 text-sm outline-none focus:border-amber-500" />
              <input value={s.desc} onChange={(e) => update(i, "desc", e.target.value)} placeholder="Descrição curta" className="w-full rounded-md border border-stone-300 p-2 text-sm outline-none focus:border-amber-500" />
            </div>
          ))}
        </div>
      )}
    </PanelShell>
  );
}
