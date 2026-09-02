import React, { useState } from "react";
import { useEditMode } from "./EditModeContext";
import { InlineToolbar, InlineActions } from "./InlineToolbar";
import { getElemento } from "./elementCatalog";

// Envolve qualquer trecho da loja pública. Fora do editor (contexto ausente),
// é 100% passthrough — zero custo, zero comportamento diferente pro cliente
// (invariante do v1, MANTIDA). Dentro do editor:
// - SEM `elementId` (call sites do v1, intocados até serem migrados):
//   contorno + etiqueta + clique abre `panelKey` — exatamente como hoje.
// - COM `elementId`: o hover mostra a barrinha flutuante (InlineToolbar) com
//   os botões que o catálogo de elementos permite pra esse id, no lugar da
//   etiqueta simples. Clique no conteúdo continua abrindo `panelKey` (quando
//   existir; sem panelKey o clique não faz nada — os filhos tratam o próprio).
//
// HOVER — padrão pra Editables ANINHADOS (Tasks 4-8): nada de group-hover.
// Cada wrapper marca [data-editable] e só se considera "hovered" quando o
// [data-editable] mais próximo do alvo do pointerover é ELE MESMO — hover num
// item aninhado NÃO acende contorno/toolbar da seção pai (group-hover acendia
// os dois, com risco de toolbars sobrepostas no canto da seção). O estado vira
// [data-hovered] no wrapper: o contorno sai da própria className, e
// InlineToolbar/ResizeHandle/etiqueta (filhos DIRETOS do wrapper) aparecem via
// variante CSS `[[data-editable][data-hovered]>&]` — escopada ao PAI DIRETO
// (um `group-data-*` casaria com qualquer ancestral e reintroduziria o bug) e
// sem desmontar a toolbar (preserva o estado busy/confirming dela).
export function Editable({ panelKey, label, children, className, elementId, onMove, onDelete, onHide, onDuplicate, openHref }: {
  panelKey?: string;
  label: string;
  children: React.ReactNode;
  className?: string;
  elementId?: string;
} & InlineActions) {
  const ctx = useEditMode();
  const [hovered, setHovered] = useState(false);
  if (!ctx) return <>{children}</>;
  const elemento = elementId ? getElemento(elementId, ctx.draft) : null;
  if (elementId && !elemento && import.meta.env.DEV) {
    console.warn(`Editable: elementId desconhecido no catálogo: ${elementId}`);
  }
  return (
    <div
      data-editable={elementId || panelKey || "1"}
      data-hovered={hovered || undefined}
      className={`relative outline-2 outline-offset-2 transition ${hovered ? "outline-dashed outline-amber-500" : "outline-transparent"} ${panelKey ? "cursor-pointer" : ""} ${className || ""}`}
      onClick={panelKey ? (e) => {
        // Botões/controles internos são donos do próprio clique. Antes, por
        // exemplo, "Editar 2 banners" abria sideBanner e o evento continuava
        // até este Editable da seção Vitrines, que imediatamente trocava o
        // painel para "vitrines". Ignorar controles internos evita que o pai
        // sobrescreva a ação escolhida pelo usuário.
        const target = e.target as Element;
        if (target.closest("button, input, select, textarea, label, [role='button']")) return;
        e.stopPropagation();
        ctx.openPanel(panelKey);
      } : undefined}
      onPointerOver={(e) => {
        // Hovered só se o alvo não estiver dentro de um [data-editable]
        // descendente (aninhamento). pointerover/pointerout borbulham — um
        // pointerenter simples no pai também dispararia sobre os filhos.
        const inner = (e.target as Element).closest("[data-editable]");
        setHovered(inner === e.currentTarget);
      }}
      onPointerOut={(e) => {
        // Saiu do wrapper inteiro? Limpa. (Se foi pra um Editable interno, o
        // pointerover seguinte do interno já corrige os dois estados.)
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHovered(false);
      }}
    >
      {elemento ? (
        <InlineToolbar elemento={elemento} label={label} panelKey={panelKey}
          onMove={onMove} onDelete={onDelete} onHide={onHide} onDuplicate={onDuplicate} openHref={openHref} />
      ) : (
        <span className="pointer-events-none absolute -top-6 left-0 z-[35] hidden rounded bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-stone-900 [[data-editable][data-hovered]>&]:block">
          {label}
        </span>
      )}
      {children}
    </div>
  );
}
