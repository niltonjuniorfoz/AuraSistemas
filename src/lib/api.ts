import { useAuthStore } from "../stores/authStore";

export function extractList<T = any>(json: any): T[] {
  if (Array.isArray(json)) return json;
  if (Array.isArray(json?.data)) return json.data;
  return [];
}

export async function parseApiError(res: Response) {
  const data = await res.json().catch(() => ({}));
  return {
    status: res.status,
    message: data.error || data.message || "Erro desconhecido.",
    fields: data.fields || {}
  };
}

export async function loadList(endpoint: string) {
  const res = await apiFetch(endpoint);
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `Erro ao carregar ${endpoint}`);
  }

  return Array.isArray(data) ? data : data.data || [];
}

const PUBLIC_API_ENDPOINTS = [
  "/api/auth/login",
  "/api/settings/company-public",
  "/api/ping",
];

function isPublicApi(url: string) {
  return PUBLIC_API_ENDPOINTS.some((endpoint) => url.startsWith(endpoint));
}

function redirectToLogin() {
  if (typeof window === "undefined") return;
  const currentPath = window.location.pathname;
  if (currentPath !== "/login") {
    window.location.assign("/login");
  }
}

export async function apiFetch(url: string, options: RequestInit = {}) {
  const { token, logout } = useAuthStore.getState();
  const publicRequest = isPublicApi(url);

  const headers = new Headers(options.headers || {});

  // Add auth token if available and valid
  if (token && token !== "null" && token !== "undefined") {
    headers.set("Authorization", `Bearer ${token}`);
  } else if (!publicRequest) {
    logout();
    redirectToLogin();
    throw new Error("Unauthorized");
  }

  // Set default content type for JSON bodies
  if (options.body && typeof options.body === 'string' && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Handle 401 globally
  if (response.status === 401 && !publicRequest) {
    logout();
    if (typeof window !== "undefined" && window.location.pathname !== "/login") {
      alert("Sua sessão expirou ou ficou inválida. Faça login novamente.");
    }
    redirectToLogin();
    throw new Error("Unauthorized");
  }

  return response;
}
