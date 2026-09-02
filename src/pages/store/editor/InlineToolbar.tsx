// src/pages/store/editor/InlineToolbar.tsx
import React, { useState } from "react";
import { ArrowDown, ArrowUp, Copy, ExternalLink, Eye, Loader2, Pencil, Trash2 } from "lucide-react";
import { useNavigate } from "react-router";
import { useEditMode } from "./EditModeContext";
import type { Capacidade, ElementoCatalogo } from "./elementCatalog";

// Callbacks que o call site fornece; um botão só aparece se a capacidade
// existir NO CATÁLOGO **e** o callback correspondente foi passado. Todos os
// callbacks de escrita devolvem o Promise<boolean> do patchDraft (que já
// serializa a gravação e toasta erro — nenhum alert() aqui).
//
// `onHide` × `onDelete`: os dois renderizam sob a MESMA capacidade "apagar" do
// catálogo e são MUTUAMENTE EXCLUSIVOS por call site — SEÇÃO passa `onHide`
// (👁️ ocultar: visivel:false, reversível pelo painel Seções, sem confirmação);
// ITEM DE LISTA (vitrine/banner) passa `onDelete` (🗑️ remove do rascunho,
// destrutivo — confirmação inline "Apagar? Sim/Não"; o Descartar recupera até
// publicar). Nunca passe os dois no mesmo call site.
export type InlineActions = {
  onMove?: (dir: -1 | 1) => Promise<boolean> | void;   // ↑↓ (ou trocar ordem de grupo)
  onDelete?: () => Promise<boolean>;                    // 🗑️ item de lista, com confirmação inline
  onHide?: () => Promise<boolean>;                      // 👁️ ocultar seção (reversível, sem confirmação)
  onDuplicate?: () => Promise<boolean>;                 // ⧉ duplicar item de lista
  openHref?: string;                                    // ⤷ abrir página dentro do editor
};

// Deve ser filho DIRETO de um <Editable> — a visibilidade vem da variante
// [[data-editable][data-hovered]>&] (padrão de hover documentado em
// Editable.tsx), que mantém a barrinha MONTADA fora do hover (display:none):
// o guard de busy/confirming sobrevive ao mouse sair no meio de uma gravação.
export function InlineToolbar({ elemento, label, panelKey, onMove, onDelete, onHide, onDuplicate, openHref }: {
  elemento: ElementoCatalogo;
  label: string;
  panelKey?: string;
} & InlineActions) {
  const ctx = useEditMode();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  // Guard de `busy`: enquanto uma ação inline grava, as outras ficam
  // bloqueadas e um spinner aparece — mesmo papel do `saving` dos painéis
  // (3 fixes estabelecidos no v1). O resultado do patchDraft já fecha o
  // ciclo: sucesso atualiza o draft (a página re-renderiza), falha toasta.
  const [busy, setBusy] = useState(false);
  if (!ctx) return null;
  const can = (c: Capacidade) => elemento.capacidades.includes(c);
  const run = async (fn?: () => Promise<boolean> | void) => {
    if (!fn || busy) return;
    setBusy(true);
    try { await fn(); } finally { setBusy(false); setConfirming(false); }
  };
  const btn = "flex h-6 w-6 items-center justify-center rounded hover:bg-stone-700 disabled:opacity-40";
  return (
    <div
      className="absolute -top-7 right-0 z-[35] hidden items-center gap-0.5 rounded-md bg-stone-900/95 px-1.5 py-1 text-white shadow-lg [[data-editable][data-hovered]>&]:flex"
      onClick={(e) => e.stopPropagation()}
    >
      <span className="mr-1 max-w-[9rem] truncate text-[10px] font-bold text-amber-400">{label}</span>
      {busy && <Loader2 className="h-3.5 w-3.5 animate-spin text-stone-300" />}
      {can("editar") && panelKey && (
        <button title="Editar" disabled={busy} className={btn} onClick={() => ctx.openPanel(panelKey)}><Pencil className="h-3.5 w-3.5" /></button>
      )}
      {can("mover") && onMove && (
        <>
          <button title="Mover pra cima / trocar ordem" disabled={busy} className={btn} onClick={() => run(() => onMove(-1))}><ArrowUp className="h-3.5 w-3.5" /></button>
          <button title="Mover pra baixo / trocar ordem" disabled={busy} className={btn} onClick={() => run(() => onMove(1))}><ArrowDown className="h-3.5 w-3.5" /></button>
        </>
      )}
      {can("apagar") && onHide && (
        <button title="Ocultar seção (reative no painel Seções)" disabled={busy} className={btn} onClick={() => run(onHide)}><Eye className="h-3.5 w-3.5" /></button>
      )}
      {can("duplicar") && onDuplicate && (
        <button title="Duplicar" disabled={busy} className={btn} onClick={() => run(onDuplicate)}><Copy className="h-3.5 w-3.5" /></button>
      )}
      {can("abrirPagina") && openHref && (
        <button title="Abrir página no editor" disabled={busy} className={btn} onClick={() => navigate(openHref)}><ExternalLink className="h-3.5 w-3.5" /></button>
      )}
      {can("apagar") && onDelete && (confirming ? (
        <span className="ml-1 flex items-center gap-1.5 rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-bold">
          Apagar?
          <button disabled={busy} className="text-red-300 hover:text-red-100 disabled:opacity-40" onClick={() => run(onDelete)}>Sim</button>
          <button disabled={busy} className="text-stone-300 hover:text-white disabled:opacity-40" onClick={() => setConfirming(false)}>Não</button>
        </span>
      ) : (
        <button title="Apagar (o Descartar recupera até publicar)" disabled={busy} className={`${btn} text-red-300 hover:text-red-100`} onClick={() => setConfirming(true)}><Trash2 className="h-3.5 w-3.5" /></button>
      ))}
    </div>
  );
}
