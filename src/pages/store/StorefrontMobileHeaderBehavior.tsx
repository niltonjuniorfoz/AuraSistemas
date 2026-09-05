import { useEffect } from "react";

/**
 * Mantém o cabeçalho da loja sempre visível no celular.
 *
 * O header já é `sticky top-0` no ShopLayout; aqui apenas garantimos que o
 * estado visual nunca volte para `hidden`, inclusive quando o layout é
 * recriado durante navegação entre editor/loja ou após mudanças no DOM.
 */
export function StorefrontMobileHeaderBehavior() {
  useEffect(() => {
    let activeHeader: HTMLElement | null = null;

    const keepVisible = () => {
      const header = document.querySelector<HTMLElement>("header.sticky.top-0.z-30");
      if (!header) return;
      activeHeader = header;
      header.dataset.mobileScrollState = "visible";
    };

    keepVisible();

    const observer = new MutationObserver(() => keepVisible());
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-mobile-scroll-state"],
    });

    window.addEventListener("resize", keepVisible, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", keepVisible);
      if (activeHeader) delete activeHeader.dataset.mobileScrollState;
    };
  }, []);

  return null;
}
