import { useEffect } from "react";
import { SYSTEM_BRAND } from "../lib/branding";

function ensureMeta(name: string, content: string) {
  let meta = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = name;
    document.head.appendChild(meta);
  }
  if (meta.content !== content) meta.content = content;
}

function attachStoreFooterReference() {
  const footer = document.querySelector<HTMLElement>("footer#atendimento");
  if (!footer || footer.querySelector('[data-platform-reference="true"]')) return;

  // O copyright do rodapé é o único parágrafo text-xs dessa área. Mantemos a
  // referência junto dele para continuar vinculada ao rodapé mesmo quando o
  // nome, tema ou texto da loja forem personalizados pelo editor visual.
  const copyright = Array.from(footer.querySelectorAll<HTMLParagraphElement>("p"))
    .find((element) => element.classList.contains("text-xs"));
  if (!copyright) return;

  const reference = document.createElement("span");
  reference.dataset.platformReference = "true";
  reference.textContent = SYSTEM_BRAND.platformId;
  reference.title = "Referência técnica da plataforma";
  reference.setAttribute("aria-label", `Referência técnica da plataforma ${SYSTEM_BRAND.platformId}`);
  reference.style.marginLeft = "8px";
  reference.style.fontSize = "7px";
  reference.style.lineHeight = "1";
  reference.style.letterSpacing = ".08em";
  reference.style.opacity = ".28";
  reference.style.whiteSpace = "nowrap";
  copyright.appendChild(reference);
}

/**
 * Identidade operacional da plataforma.
 *
 * A referência é usada pelo suporte de acesso, pelos metadados técnicos e pelo
 * rodapé da loja. Por isso ela deve permanecer estável em refatorações de UI,
 * mudanças de tema, rebranding de lojas e reorganizações de layout.
 */
export function PlatformIdentity() {
  useEffect(() => {
    document.documentElement.dataset.platformReference = SYSTEM_BRAND.platformId;
    ensureMeta("platform-reference", SYSTEM_BRAND.platformId);
    ensureMeta("support-email", SYSTEM_BRAND.supportEmail);

    let frame = 0;
    const scheduleFooterReference = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(attachStoreFooterReference);
    };

    attachStoreFooterReference();

    // A loja pode ser aberta depois do login sem recarregar o documento. O
    // observer acompanha somente criação/remoção de nós; a própria inclusão da
    // referência não causa ciclo porque attachStoreFooterReference é idempotente.
    const observer = new MutationObserver(scheduleFooterReference);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  return null;
}
