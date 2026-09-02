// src/pages/store/editor/ResizeHandle.tsx
import React, { useRef, useState } from "react";
import { useEditMode } from "./EditModeContext";
import { getElemento, TAMANHOS, Tamanho } from "./elementCatalog";

// Alça de redimensionar por PASSOS (P/M/G/GG — spec: proteção do mobile,
// nunca pixel livre). Arrastar pra baixo cresce um passo a cada ~70px de
// arrasto; o preview ao vivo é o PAI trocando a classe do passo candidato
// (onPreview) — não transform, que distorceria imagem/texto (desvio nº 2 do
// plano). Soltar encaixa no passo e salva (onCommit → patchDraft do pai, que
// já serializa e toasta erro). O preview fica ATIVO durante o round-trip do
// commit e só limpa no finally — limpar antes fazia o elemento voltar ao
// tamanho antigo enquanto o servidor respondia e pular pro novo depois
// (snap-back); se o commit falhar, limpar aí é o rollback correto (com toast).
// Enquanto o commit grava, novos arrastos são ignorados (guard de `busy`,
// mesmo papel do busy do InlineToolbar). Fora do editor não renderiza nada.
// Deve ser filho DIRETO de um <Editable> (usa o position:relative dele e a
// variante [[data-editable][data-hovered]>&] pra aparecer só no hover — padrão
// documentado em Editable.tsx).
// `elementId` (opcional, recomendado): id no catálogo de elementos — sem a
// capacidade "redimensionar" lá (ou id desconhecido), a alça nem renderiza.
export function ResizeHandle({ current, elementId, onPreview, onCommit }: {
  current: Tamanho;
  elementId?: string;
  onPreview: (t: Tamanho | null) => void;
  onCommit: (t: Tamanho) => Promise<boolean> | void;
}) {
  const ctx = useEditMode();
  const drag = useRef<{ startY: number; startIdx: number; lastStep: Tamanho } | null>(null);
  const [busy, setBusy] = useState(false);
  if (!ctx) return null;
  if (elementId && !getElemento(elementId, ctx.draft)?.capacidades.includes("redimensionar")) return null;
  const stepFromDelta = (dy: number, startIdx: number): Tamanho => {
    const idx = Math.min(TAMANHOS.length - 1, Math.max(0, startIdx + Math.round(dy / 70)));
    return TAMANHOS[idx];
  };
  return (
    <div
      className="absolute bottom-1 right-1 z-[35] hidden h-6 min-w-10 cursor-ns-resize select-none items-center justify-center gap-1 rounded bg-amber-500 px-1.5 text-[10px] font-black text-stone-900 shadow [[data-editable][data-hovered]>&]:flex"
      title="Arrastar pra redimensionar (P/M/G/GG)"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => {
        if (busy) return; // commit em andamento — ignora novo arrasto
        e.stopPropagation(); e.preventDefault();
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        drag.current = { startY: e.clientY, startIdx: Math.max(0, TAMANHOS.indexOf(current)), lastStep: current };
      }}
      onPointerMove={(e) => {
        if (!drag.current) return;
        const step = stepFromDelta(e.clientY - drag.current.startY, drag.current.startIdx);
        if (step !== drag.current.lastStep) { drag.current.lastStep = step; onPreview(step); }
      }}
      onPointerUp={async () => {
        if (!drag.current) return;
        const final = drag.current.lastStep;
        drag.current = null;
        if (final === current) { onPreview(null); return; }
        setBusy(true);
        try {
          await onCommit(final); // sucesso: o draft salvo já chega com o tamanho final
        } finally {
          setBusy(false);
          onPreview(null); // só agora — o que valer daqui em diante vem do draft
        }
      }}
      onPointerCancel={() => {
        // Arrasto abortado pelo navegador (ex.: gesto de scroll no touch roubou
        // o ponteiro) — mesma limpeza do fim de arrasto, só que sem commit.
        if (!drag.current) return;
        drag.current = null;
        onPreview(null);
      }}
    >
      ⇕ {current}
    </div>
  );
}
