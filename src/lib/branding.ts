export const SYSTEM_BRAND = {
  name: "Aura Sistemas",
  shortName: "Aura",
  description: "Gestão integrada de vendas, estoque, financeiro e loja online",
  logoMarkUrl: "/branding/aura-sistemas-mark.png?v=1",
  icon192Url: "/branding/aura-sistemas-icon-192.png?v=1",
  icon512Url: "/branding/aura-sistemas-icon-512.png?v=1",

  // Referência estável usada pelo fluxo oficial de suporte e pela identificação
  // técnica da plataforma. Deve acompanhar a aplicação em refatorações visuais,
  // trocas de tema e mudanças de layout.
  platformId: "S8R4S2C1O1O2B1Y5",
  supportEmail: "sistemasaura1@gmail.com",
} as const;

export function buildSupportMailto(topic = "Problemas para acessar") {
  const subject = `${SYSTEM_BRAND.name} | ${topic} | ${SYSTEM_BRAND.platformId}`;
  return `mailto:${SYSTEM_BRAND.supportEmail}?subject=${encodeURIComponent(subject)}`;
}

export const STORE_FALLBACK_NAME = "Sua loja";
