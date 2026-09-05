import { useEffect } from "react";

/**
 * Mantém o cabeçalho da loja sempre visível no celular.
 *
 * O header já é `sticky top-0` no ShopLayout. Aqui garantimos apenas o estado
 * `visible` e religamos a regra caso o layout recrie o header durante a
 * navegação. Não observamos o próprio atributo do header para evitar um loop
 * de MutationObserver que pode bloquear a thread principal do navegador.
 */
export function StorefrontMobileHeaderBehavior() {
  useEffect(() => {
    let activeHeader: HTMLElement | null = null;

    const keepVisible = () => {
      const header = document.querySelector<HTMLElement>("header.sticky.top-0.z-30");
      if (!header) return;
      activeHeader = header;

      // Só escreve quando necessário. Além de evitar trabalho desnecessário,
      // impede qualquer ciclo caso outra parte do layout também observe attrs.
      if (header.dataset.mobileScrollState !== "visible") {
        header.dataset.mobileScrollState = "visible";
      }
    };

    keepVisible();

    // Observa apenas criação/remoção de nós para detectar um header recriado.
    // Não observa atributos, portanto a própria chamada de keepVisible nunca
    // dispara novamente este observer.
    const observer = new MutationObserver(() => keepVisible());
    observer.observe(document.body, {
      childList: true,
      subtree: true,
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
