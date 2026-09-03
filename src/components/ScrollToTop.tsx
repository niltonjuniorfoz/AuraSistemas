import { useEffect } from "react";
import { useLocation } from "react-router";

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

// A SPA mantém a posição de rolagem por padrão entre algumas navegações.
// Para a loja isso fazia um produto/categoria abrir no meio ou no fim da
// página quando o cliente vinha de uma vitrine mais abaixo. O componente fica
// dentro do BrowserRouter e zera a rolagem em toda mudança de rota/query.
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
      // Fallback para Safari/iOS e documentos em que o scrollingElement é
      // exposto por html/body de forma diferente.
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    reset();
    // Repete no frame seguinte: em rotas lazy o novo conteúdo pode entrar
    // depois do primeiro efeito e o Safari pode tentar restaurar a posição.
    const frame = window.requestAnimationFrame(reset);
    return () => window.cancelAnimationFrame(frame);
  }, [location.pathname, location.search]);

  // OrderStatus fica fora do ShopLayout. Mantemos o documento destravado e,
  // além disso, marcamos a rota para ela usar um scroller próprio de 100dvh —
  // o mesmo modelo da vitrine normal. Isso evita o caso em que a barra do
  // documento aparece, mas a roda do mouse não move o conteúdo do pedido.
  // A cor de destaque publicada da loja é carregada aqui porque esta rota não
  // herda as CSS vars do ShopLayout; assim a scrollbar também acompanha o
  // Editor Visual mesmo quando o cliente abre o link do pedido diretamente.
  useEffect(() => {
    if (!location.pathname.startsWith("/loja/pedido/")) return;

    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById("root");
    const previousStoreAccent = html.style.getPropertyValue("--store-accent");
    const previous = {
      htmlOverflowY: html.style.overflowY,
      bodyOverflowY: body.style.overflowY,
      bodyHeight: body.style.height,
      bodyTouchAction: body.style.touchAction,
      rootHeight: root?.style.height || "",
      rootMinHeight: root?.style.minHeight || "",
      rootOverflow: root?.style.overflow || "",
    };
    let active = true;

    body.classList.add("store-order-route");
    html.style.setProperty("--store-accent", "#d46a86");
    html.style.overflowY = "auto";
    body.style.overflowY = "auto";
    body.style.height = "auto";
    body.style.touchAction = "pan-y";
    if (root) {
      root.style.height = "auto";
      root.style.minHeight = "100%";
      root.style.overflow = "visible";
    }

    fetch("/api/store/config")
      .then((r) => r.ok ? r.json() : null)
      .then((config) => {
        if (!active) return;
        const accent = String(config?.theme?.colors?.accent || "");
        if (/^#[0-9a-fA-F]{6}$/.test(accent)) html.style.setProperty("--store-accent", accent);
      })
      .catch(() => {});

    return () => {
      active = false;
      body.classList.remove("store-order-route");
      if (previousStoreAccent) html.style.setProperty("--store-accent", previousStoreAccent);
      else html.style.removeProperty("--store-accent");
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

  // O ERP rola dentro de `.app-content`, não no window. Quando o usuário
  // aciona um botão "Salvar", volta esse container ao topo para a mensagem de
  // sucesso/erro ficar imediatamente visível mesmo que o formulário estivesse
  // no fim da página. O listener é central para funcionar em todas as telas.
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
