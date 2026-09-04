import { useEffect } from "react";
import { useLocation } from "react-router";

const MOBILE_DRAWER_CLOSE_MS = 190;

function saveActionLabel(target: EventTarget | null): string {
  if (!(target instanceof Element)) return "";
  const control = target.closest("button, input[type='submit'], [role='button']");
  if (!control) return "";
  if (control instanceof HTMLInputElement) return control.value || "";
  return [control.textContent, control.getAttribute("aria-label"), control.getAttribute("title")]
    .filter(Boolean)
    .join(" ");
}

function scrollDashboardContentToTop() {
  const content = document.querySelector<HTMLElement>(".app-content");
  if (!content) return;
  window.requestAnimationFrame(() => {
    content.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  });
}

function isStorefrontPath(pathname: string) {
  return pathname.startsWith("/loja") || pathname.startsWith("/store-settings/editor");
}

function resetStoreScroller() {
  const candidates = Array.from(document.querySelectorAll<HTMLElement>("#root > div"));
  for (const element of candidates) {
    const overflowY = window.getComputedStyle(element).overflowY;
    if (overflowY === "auto" || overflowY === "scroll") {
      element.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }
  }
}

function findSmoothMobileDrawer(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) return null;
  return target.closest<HTMLElement>(
    "#mobile-store-menu, [role='dialog'][aria-label='Filtros do catálogo']",
  );
}

function drawerCloseControl(target: EventTarget | null, drawer: HTMLElement): HTMLElement | null {
  if (!(target instanceof Element)) return null;
  const control = target.closest<HTMLElement>("a, button");
  if (!control || !drawer.contains(control)) return null;

  const aria = String(control.getAttribute("aria-label") || "").toLowerCase();
  const text = String(control.textContent || "").trim().toLowerCase();

  if (drawer.id === "mobile-store-menu") {
    if (control.tagName === "A" || aria.startsWith("fechar")) return control;
    return null;
  }

  if (drawer.getAttribute("aria-label") === "Filtros do catálogo") {
    if (aria.startsWith("fechar") || text.includes("aplicar filtros")) return control;
  }

  return null;
}

// Centraliza as regras de rolagem da SPA. A loja usa um scroller próprio e o
// ERP usa `.app-content`, então zerar apenas window não é suficiente.
export function ScrollToTop() {
  const location = useLocation();

  useEffect(() => {
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    return () => {
      window.history.scrollRestoration = previous;
    };
  }, []);

  useEffect(() => {
    const reset = () => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      if (isStorefrontPath(location.pathname)) resetStoreScroller();
    };

    reset();
    const frame = window.requestAnimationFrame(reset);
    const timer = window.setTimeout(reset, 80);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [location.pathname, location.search]);

  // Enquanto estivermos em qualquer rota pública da loja (ou no preview do
  // editor), o documento recebe explicitamente o fundo e a cor de destaque da
  // vitrine. Isso impede o fundo escuro do ERP de vazar entre cards/rotas no
  // celular. A mesma cor alimenta a scrollbar da loja.
  useEffect(() => {
    if (!isStorefrontPath(location.pathname)) return;

    const html = document.documentElement;
    const body = document.body;
    const previous = {
      htmlBg: html.style.getPropertyValue("--store-route-bg"),
      htmlAccent: html.style.getPropertyValue("--store-accent"),
      bodyBg: body.style.backgroundColor,
    };
    let active = true;

    html.classList.add("storefront-route-active");
    body.classList.add("storefront-route-active");
    html.style.setProperty("--store-route-bg", "#fff5f7");
    html.style.setProperty("--store-accent", "#d46a86");
    body.style.backgroundColor = "#fff5f7";

    fetch("/api/store/config", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((config) => {
        if (!active) return;
        const bg = String(config?.theme?.colors?.bg || "");
        const accent = String(config?.theme?.colors?.accent || "");
        if (/^#[0-9a-fA-F]{6}$/.test(bg)) {
          html.style.setProperty("--store-route-bg", bg);
          body.style.backgroundColor = bg;
        }
        if (/^#[0-9a-fA-F]{6}$/.test(accent)) html.style.setProperty("--store-accent", accent);
      })
      .catch(() => {});

    return () => {
      active = false;
      html.classList.remove("storefront-route-active");
      body.classList.remove("storefront-route-active");
      if (previous.htmlBg) html.style.setProperty("--store-route-bg", previous.htmlBg);
      else html.style.removeProperty("--store-route-bg");
      if (previous.htmlAccent) html.style.setProperty("--store-accent", previous.htmlAccent);
      else html.style.removeProperty("--store-accent");
      body.style.backgroundColor = previous.bodyBg;
    };
  }, [location.pathname]);

  // OrderStatus fica fora do ShopLayout. Usa um frame próprio de 100dvh para
  // mouse wheel, trackpad e toque rolarem o MESMO elemento que exibe a barra.
  useEffect(() => {
    if (!location.pathname.startsWith("/loja/pedido/")) return;

    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById("root");
    const previous = {
      htmlOverflowY: html.style.overflowY,
      bodyOverflowY: body.style.overflowY,
      bodyHeight: body.style.height,
      bodyTouchAction: body.style.touchAction,
      rootHeight: root?.style.height || "",
      rootMinHeight: root?.style.minHeight || "",
      rootOverflow: root?.style.overflow || "",
    };

    body.classList.add("store-order-route");
    html.style.overflowY = "hidden";
    body.style.overflowY = "hidden";
    body.style.height = "100dvh";
    body.style.touchAction = "pan-y";
    if (root) {
      root.style.height = "100dvh";
      root.style.minHeight = "0";
      root.style.overflow = "hidden";
    }

    return () => {
      body.classList.remove("store-order-route");
      html.style.overflowY = previous.htmlOverflowY;
      body.style.overflowY = previous.bodyOverflowY;
      body.style.height = previous.bodyHeight;
      body.style.touchAction = previous.bodyTouchAction;
      if (root) {
        root.style.height = previous.rootHeight;
        root.style.minHeight = previous.rootMinHeight;
        root.style.overflow = previous.rootOverflow;
      }
    };
  }, [location.pathname]);

  // Categorias e filtros eram desmontados imediatamente no clique de fechar,
  // então somente a entrada podia ser animada por CSS. Interceptamos apenas as
  // ações que realmente fecham o drawer, tocamos a animação de saída e, após
  // 190 ms, repetimos o clique para o React executar a ação original.
  useEffect(() => {
    const timers = new Set<number>();

    const onDrawerClick = (event: MouseEvent) => {
      const drawer = findSmoothMobileDrawer(event.target);
      if (!drawer) return;
      const control = drawerCloseControl(event.target, drawer);
      if (!control) return;

      if (drawer.dataset.smoothCloseBypass === "1") {
        delete drawer.dataset.smoothCloseBypass;
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      drawer.dataset.smoothClosing = "true";

      const timer = window.setTimeout(() => {
        timers.delete(timer);
        if (!document.contains(control)) return;
        drawer.dataset.smoothCloseBypass = "1";
        control.click();
      }, MOBILE_DRAWER_CLOSE_MS);
      timers.add(timer);
    };

    document.addEventListener("click", onDrawerClick, true);
    return () => {
      document.removeEventListener("click", onDrawerClick, true);
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  // O ERP rola dentro de `.app-content`. Ao acionar Salvar/Guardar, volta ao
  // topo para a mensagem de sucesso/erro ficar visível imediatamente.
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const label = saveActionLabel(event.target);
      if (!/(^|\s)(salvar|save|guardar)(\s|$)/i.test(label)) return;
      scrollDashboardContentToTop();
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}
