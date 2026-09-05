export const SYSTEM_BRAND = {
  name: "Aura Sistemas",
  shortName: "Aura",
  description: "Gestão integrada de vendas, estoque, financeiro e loja online",
  logoMarkUrl: "/branding/aura-sistemas-mark.png?v=1",
  icon192Url: "/branding/aura-sistemas-icon-192.png?v=1",
  icon512Url: "/branding/aura-sistemas-icon-512.png?v=1",

  // Identidade operacional estável da plataforma. Em rebrandings, clones de
  // layout ou mudanças do nome exibido, somente o displayName/nome da loja é
  // variável. platformId, copyrightSuffix, publicIdentityPath e os contatos de
  // suporte pertencem ao núcleo da plataforma e não devem ser derivados da
  // identidade visual da loja.
  platformId: "S8R4S2C1O1O2B1Y5",
  supportEmail: "sistemasaura1@gmail.com",
  supportWhatsApp: "595995661934",
  copyrightSuffix: "Todos os direitos reservados.",
  publicIdentityPath: "/identificacao",
} as const;

function cleanDisplayName(displayName: unknown) {
  const value = String(displayName || "").trim();
  return value || SYSTEM_BRAND.name;
}

/**
 * Regra de copyright da plataforma.
 *
 * Em qualquer troca de nome/rebranding, ALTERE SOMENTE `displayName`.
 * O sufixo legal e a referência técnica são constantes da plataforma.
 */
export function buildPlatformCopyrightBase(displayName: unknown) {
  return `© ${cleanDisplayName(displayName)}. ${SYSTEM_BRAND.copyrightSuffix}`;
}

export function buildPlatformCopyright(displayName: unknown) {
  return `${buildPlatformCopyrightBase(displayName)} ${SYSTEM_BRAND.platformId}`;
}

export function buildSupportMessage(details?: { name?: string; contact?: string; message?: string }) {
  const name = String(details?.name || "").trim();
  const contact = String(details?.contact || "").trim();
  const message = String(details?.message || "").trim();
  return [
    `Olá, preciso de suporte no ${SYSTEM_BRAND.name}.`,
    name ? `Nome: ${name}` : "",
    contact ? `Contato: ${contact}` : "",
    message ? `Mensagem: ${message}` : "",
    `Referência técnica: ${SYSTEM_BRAND.platformId}`,
  ].filter(Boolean).join("\n");
}

export function buildSupportMailto(topic = "Problemas para acessar", body = "") {
  const subject = `${SYSTEM_BRAND.name} | ${topic} | ${SYSTEM_BRAND.platformId}`;
  const params = new URLSearchParams({ subject });
  if (body) params.set("body", body);
  return `mailto:${SYSTEM_BRAND.supportEmail}?${params.toString()}`;
}

export function buildSupportGmailUrl(topic = "Problemas para acessar", body = "") {
  const subject = `${SYSTEM_BRAND.name} | ${topic} | ${SYSTEM_BRAND.platformId}`;
  const params = new URLSearchParams({
    view: "cm",
    fs: "1",
    to: SYSTEM_BRAND.supportEmail,
    su: subject,
  });
  if (body) params.set("body", body);
  return `https://mail.google.com/mail/?${params.toString()}`;
}

export function buildSupportWhatsAppUrl(message = buildSupportMessage()) {
  return `https://wa.me/${SYSTEM_BRAND.supportWhatsApp}?text=${encodeURIComponent(message)}`;
}

export const STORE_FALLBACK_NAME = "Sua loja";
