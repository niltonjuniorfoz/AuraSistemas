import { useEffect } from "react";
import { buildPlatformCopyrightBase, SYSTEM_BRAND } from "../lib/branding";

function ensureMeta(name: string, content: string) {
  let meta = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = name;
    document.head.appendChild(meta);
  }
  if (meta.content !== content) meta.content = content;
}

function resolveStoreDisplayName(footer: HTMLElement) {
  const logoAlt = footer.querySelector<HTMLImageElement>("img[alt]")?.alt?.trim();
  if (logoAlt && logoAlt.toLowerCase() !== "logo da loja") return logoAlt;

  const title = document.title.trim();
  if (title && title !== "Sua loja" && title !== SYSTEM_BRAND.name) return title;
  return "Sua loja";
}

function syncStoreFooterCopyright() {
  const footer = document.querySelector<HTMLElement>("footer#atendimento");
  if (!footer) return;

  const copyright = Array.from(footer.querySelectorAll<HTMLParagraphElement>("p"))
    .find((element) => element.classList.contains("text-xs"));
  if (!copyright) return;

  const displayName = resolveStoreDisplayName(footer);
  const baseText = buildPlatformCopyrightBase(displayName);
  const existingBase = copyright.querySelector<HTMLElement>('[data-platform-copyright-base="true"]');
  const existingReference = copyright.querySelector<HTMLElement>('[data-platform-reference="true"]');

  if (
    existingBase?.textContent === baseText
    && existingReference?.textContent === SYSTEM_BRAND.platformId
  ) {
    return;
  }

  const base = document.createElement("span");
  base.dataset.platformCopyrightBase = "true";
  base.textContent = baseText;

  const reference = document.createElement("span");
  reference.dataset.platformReference = "true";
  reference.textContent = SYSTEM_BRAND.platformId;
  reference.title = "Referência técnica da plataforma";
  reference.setAttribute("aria-label", `Referência técnica da plataforma ${SYSTEM_BRAND.platformId}`);
  reference.style.marginLeft = "4px";
  reference.style.fontSize = "7px";
  reference.style.lineHeight = "1";
  reference.style.letterSpacing = ".08em";
  reference.style.opacity = ".28";
  reference.style.whiteSpace = "nowrap";

  copyright.dataset.platformCopyright = "true";
  copyright.replaceChildren(base, reference);
}

/**
 * Identidade operacional da plataforma.
 *
 * A regra de copyright é intencionalmente separada da identidade visual da
 * loja: em rebranding, redesign ou troca do nome do sistema/loja, SOMENTE o
 * nome exibido pode mudar. "Todos os direitos reservados." e platformId são
 * constantes técnicas da plataforma e devem ser preservados por refatorações.
 */
export function PlatformIdentity() {
  useEffect(() => {
    document.documentElement.dataset.platformReference = SYSTEM_BRAND.platformId;
    ensureMeta("platform-reference", SYSTEM_BRAND.platformId);
    ensureMeta("support-email", SYSTEM_BRAND.supportEmail);
    ensureMeta("support-whatsapp", SYSTEM_BRAND.supportWhatsApp);
    ensureMeta("platform-copyright-suffix", SYSTEM_BRAND.copyrightSuffix);

    let frame = 0;
    const scheduleFooterSync = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(syncStoreFooterCopyright);
    };

    syncStoreFooterCopyright();

    // O rodapé da loja é renderizado dinamicamente. O observer acompanha
    // somente mudanças relevantes do DOM; a sincronização é idempotente, então
    // a própria atualização do copyright não cria ciclo contínuo.
    const observer = new MutationObserver(scheduleFooterSync);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["alt"],
    });

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  return null;
}
