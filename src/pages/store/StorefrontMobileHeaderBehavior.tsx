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
 * No iOS/Safari também acompanhamos o gesto de toque, porque o evento `scroll`
 * pode chegar atrasado durante a rolagem inercial.
 */
export function StorefrontMobileHeaderBehavior() {
  useEffect(() => {
    let activeHeader: HTMLElement | null = null;
    let activeScroller: HTMLElement | null = null;
    let lastTop = 0;
    let lastTouchY: number | null = null;
    let cleanupScroll: (() => void) | null = null;

    const show = (header: HTMLElement) => {
      header.dataset.mobileScrollState = "visible";
    };

    const hide = (header: HTMLElement) => {
      header.dataset.mobileScrollState = "hidden";
    };

    const bind = () => {
      const header = document.querySelector<HTMLElement>("header.sticky.top-0.z-30");
      if (!header || header === activeHeader) return;

      cleanupScroll?.();
      activeHeader = header;
      activeScroller = header.parentElement as HTMLElement | null;
      lastTop = activeScroller?.scrollTop || 0;
      lastTouchY = null;
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
          hide(activeHeader);
        } else if (delta < -3) {
          // Qualquer gesto real para cima reapresenta o cabeçalho imediatamente.
          show(activeHeader);
        }

        lastTop = top;
      };

      const onTouchStart = (event: TouchEvent) => {
        lastTouchY = event.touches[0]?.clientY ?? null;
      };

      const onTouchMove = (event: TouchEvent) => {
        if (!activeHeader || !activeScroller || window.innerWidth >= 768) return;
        const y = event.touches[0]?.clientY;
        if (y == null || lastTouchY == null) {
          lastTouchY = y ?? null;
          return;
        }

        const fingerDelta = y - lastTouchY;
        const top = Math.max(0, activeScroller.scrollTop);

        // Dedo descendo = conteúdo voltando para cima. Mostra já no primeiro
        // movimento perceptível, antes mesmo do Safari disparar `scroll`.
        if (fingerDelta > 4 || top <= 24) {
          show(activeHeader);
        } else if (fingerDelta < -8 && top > 24) {
          hide(activeHeader);
        }

        lastTouchY = y;
      };

      const onTouchEnd = () => {
        lastTouchY = null;
      };

      const onResize = () => {
        if (!activeHeader || !activeScroller) return;
        if (window.innerWidth >= 768) show(activeHeader);
        lastTop = activeScroller.scrollTop;
        lastTouchY = null;
      };

      activeScroller.addEventListener("scroll", onScroll, { passive: true });
      activeScroller.addEventListener("touchstart", onTouchStart, { passive: true });
      activeScroller.addEventListener("touchmove", onTouchMove, { passive: true });
      activeScroller.addEventListener("touchend", onTouchEnd, { passive: true });
      activeScroller.addEventListener("touchcancel", onTouchEnd, { passive: true });
      window.addEventListener("resize", onResize, { passive: true });

      cleanupScroll = () => {
        activeScroller?.removeEventListener("scroll", onScroll);
        activeScroller?.removeEventListener("touchstart", onTouchStart);
        activeScroller?.removeEventListener("touchmove", onTouchMove);
        activeScroller?.removeEventListener("touchend", onTouchEnd);
        activeScroller?.removeEventListener("touchcancel", onTouchEnd);
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
