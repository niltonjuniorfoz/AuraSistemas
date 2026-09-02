import { useEffect } from "react";
import { useLocation } from "react-router";

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

  return null;
}
