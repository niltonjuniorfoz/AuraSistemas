import { useCustomerAuthStore } from "../stores/customerAuth";

// Fetch da loja pública — NUNCA reaproveitar src/lib/api.ts (apiFetch) aqui: aquele é do admin e,
// sem token, desloga o admin e redireciona pra /login (a tela de login do ERP). Um visitante
// anônimo da /loja cairia lá, o que não faz sentido nenhum. Aqui: manda o token do cliente se
// tiver (a maioria das rotas da loja é pública mesmo, só /account/* exige), e em 401 só limpa a
// sessão do cliente — quem decide o que mostrar depois é a tela que chamou.
export async function storeApiFetch(url: string, options: RequestInit = {}) {
  const { token, logout } = useCustomerAuthStore.getState();
  const headers = new Headers(options.headers || {});

  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (options.body && typeof options.body === 'string' && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, { ...options, headers });
  if (response.status === 401) logout();
  return response;
}
