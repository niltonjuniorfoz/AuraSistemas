export type StoreHeaderMode = "glass" | "solid";

export type StorefrontDesignSettings = {
  headerMode: StoreHeaderMode;
  headerLogoImage: string;
  featuredEyebrow: string;
  featuredDescription: string;
  featuredPanelColor: string;
  featuredTextColor: string;
  featuredButtonLabel: string;
  whatsappBannerVisible: boolean;
  whatsappBannerImage: string;
  whatsappBannerLink: string;
};

// `quickLinks` é um campo legado que continua sendo persistido/publicado pela
// API da loja sem normalização destrutiva e hoje não é renderizado na vitrine.
// Reservamos UMA entrada invisível para preferências visuais novas sem exigir
// migração de banco nem quebrar configs antigas. Links reais, caso existam,
// são preservados integralmente pelo upsert abaixo.
const DESIGN_ENTRY_ID = "__aura_storefront_design__";

export const DEFAULT_STOREFRONT_DESIGN: StorefrontDesignSettings = {
  headerMode: "glass",
  headerLogoImage: "/branding/db-cosmetics-header.svg",
  featuredEyebrow: "#produto em destaque",
  featuredDescription: "Uma escolha especial da nossa curadoria para você.",
  featuredPanelColor: "#d46a86",
  featuredTextColor: "#ffffff",
  featuredButtonLabel: "ver produto",
  whatsappBannerVisible: true,
  whatsappBannerImage: "/banners/db-whatsapp-group.webp",
  whatsappBannerLink: "",
};

const isHex = (value: unknown) => typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
const cleanRequired = (value: unknown, fallback: string, max: number) => {
  const text = typeof value === "string" ? value.trim().slice(0, max) : "";
  return text || fallback;
};
const cleanEditable = (value: unknown, fallback: string, max: number) => (
  typeof value === "string" ? value.trim().slice(0, max) : fallback
);
const cleanMedia = (value: unknown, fallback: string) => {
  const text = typeof value === "string" ? value.trim().slice(0, 900000) : "";
  return text || fallback;
};
const cleanLink = (value: unknown) => typeof value === "string" ? value.trim().slice(0, 1200) : "";

export function readStorefrontDesign(quickLinks: unknown): StorefrontDesignSettings {
  const list = Array.isArray(quickLinks) ? quickLinks : [];
  const raw = list.find((item: any) => item && typeof item === "object" && item.id === DESIGN_ENTRY_ID) as any;

  return {
    headerMode: raw?.headerMode === "solid" ? "solid" : "glass",
    headerLogoImage: cleanMedia(raw?.headerLogoImage, DEFAULT_STOREFRONT_DESIGN.headerLogoImage),
    // Título curto e descrição podem ser apagados deliberadamente no editor.
    featuredEyebrow: cleanEditable(raw?.featuredEyebrow, DEFAULT_STOREFRONT_DESIGN.featuredEyebrow, 70),
    featuredDescription: cleanEditable(raw?.featuredDescription, DEFAULT_STOREFRONT_DESIGN.featuredDescription, 220),
    featuredPanelColor: isHex(raw?.featuredPanelColor) ? raw.featuredPanelColor : DEFAULT_STOREFRONT_DESIGN.featuredPanelColor,
    featuredTextColor: isHex(raw?.featuredTextColor) ? raw.featuredTextColor : DEFAULT_STOREFRONT_DESIGN.featuredTextColor,
    featuredButtonLabel: cleanRequired(raw?.featuredButtonLabel, DEFAULT_STOREFRONT_DESIGN.featuredButtonLabel, 36),
    whatsappBannerVisible: raw?.whatsappBannerVisible !== false,
    whatsappBannerImage: cleanMedia(raw?.whatsappBannerImage, DEFAULT_STOREFRONT_DESIGN.whatsappBannerImage),
    whatsappBannerLink: cleanLink(raw?.whatsappBannerLink),
  };
}

export function upsertStorefrontDesign(
  quickLinks: unknown,
  patch: Partial<StorefrontDesignSettings>,
): any[] {
  const list = Array.isArray(quickLinks) ? quickLinks : [];
  const current = readStorefrontDesign(list);
  const merged = readStorefrontDesign([
    {
      id: DESIGN_ENTRY_ID,
      ...current,
      ...patch,
    },
  ]);

  return [
    ...list.filter((item: any) => !(item && typeof item === "object" && item.id === DESIGN_ENTRY_ID)),
    {
      id: DESIGN_ENTRY_ID,
      kind: "storefrontDesign",
      hidden: true,
      ...merged,
    },
  ];
}
