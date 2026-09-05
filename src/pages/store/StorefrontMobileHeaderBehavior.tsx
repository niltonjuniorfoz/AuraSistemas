import { useEffect } from "react";

/**
 * Faz o cabeçalho mobile se comportar como navegação nativa:
 * - rolando para baixo, libera espaço e esconde o header;
 * - no primeiro gesto de rolagem para cima, mostra novamente;
 * - perto do topo, permanece sempre visível.
 *
 * O ShopLayout usa um scroller interno (o div raiz com overflow-y-auto), então
 * ouvir window.scroll não funciona de forma confiável. Este componente localiza
 * o header montado e escuta exatamente o parentElement que contém a rolagem.
 */
export function StorefrontMobileHeaderBehavior() {
  useEffect(() => {
    let activeHeader: HTMLElement | null = null;
    let activeScroller: HTMLElement | null = null;
    let lastTop = 0;
    let cleanupScroll: (() => void) | null = null;

    const show = (header: HTMLElement) => {
      header.dataset.mobileScrollState = "visible";
    };

    const bind = () => {
      const header = document.querySelector<HTMLElement>("header.sticky.top-0.z-30");
      if (!header || header === activeHeader) return;

      cleanupScroll?.();
      activeHeader = header;
      activeScroller = header.parentElement as HTMLElement | null;
      lastTop = activeScroller?.scrollTop || 0;
      show(header);

      if (!activeScroller) return;

      const onScroll = () => {
        if (!activeHeader || !activeScroller) return;

        if (window.innerWidth >= 768) {
          show(activeHeader);
          lastTop = activeScroller.scrollTop;
          return;
        }

        const top = Math.max(0, activeScroller.scrollTop);
        const delta = top - lastTop;

        if (top <= 24) {
          show(activeHeader);
        } else if (delta > 7) {
          activeHeader.dataset.mobileScrollState = "hidden";
        } else if (delta < -3) {
          // Qualquer gesto real para cima reapresenta o cabeçalho imediatamente.
          show(activeHeader);
        }

        lastTop = top;
      };

      const onResize = () => {
        if (!activeHeader || !activeScroller) return;
        if (window.innerWidth >= 768) show(activeHeader);
        lastTop = activeScroller.scrollTop;
      };

      activeScroller.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onResize, { passive: true });
      cleanupScroll = () => {
        activeScroller?.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onResize);
      };
    };

    bind();

    // A navegação entre ERP/editor/loja desmonta e recria o ShopLayout sem
    // remontar main.tsx. Observamos apenas a estrutura para religar no header
    // novo quando necessário.
    const observer = new MutationObserver(() => bind());
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      cleanupScroll?.();
      if (activeHeader) delete activeHeader.dataset.mobileScrollState;
    };
  }, []);

  return null;
}
