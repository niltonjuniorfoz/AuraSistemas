import { useEffect } from "react";
import { readStorefrontDesign } from "./storefrontDesign";

type BannerFramingDetail = {
  kind: "hero" | "promo" | "whatsapp";
  index?: number;
  posX?: number;
  posY?: number;
};

const clampPosition = (value: unknown, fallback = 50) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : fallback;
};

function applyImagePosition(image: HTMLImageElement | null, posX: unknown, posY: unknown, fallbackY = 50) {
  if (!image) return;
  const x = clampPosition(posX, 50);
  const y = clampPosition(posY, fallbackY);
  image.style.setProperty("--banner-object-position", `${x}% ${y}%`);
  image.style.objectPosition = `${x}% ${y}%`;
}

function applyDetail(detail: BannerFramingDetail) {
  if (detail.kind === "hero") {
    const images = document.querySelectorAll<HTMLImageElement>('main img[alt^="Banner "]');
    applyImagePosition(images.item(detail.index || 0), detail.posX, detail.posY);
    return;
  }
  if (detail.kind === "promo") {
    const images = document.querySelectorAll<HTMLImageElement>('main img[alt^="Destaque "]');
    applyImagePosition(images.item(detail.index || 0), detail.posX, detail.posY);
    return;
  }
  applyImagePosition(document.querySelector<HTMLImageElement>('img[alt="Convite para o grupo do WhatsApp"]'), detail.posX, detail.posY, 42);
}

export function StorefrontBannerFramingBehavior() {
  useEffect(() => {
    let disposed = false;
    let publishedConfig: any = null;
    let frame = 0;

    const applyPublished = () => {
      if (!publishedConfig || disposed) return;
      const hero = Array.isArray(publishedConfig.banners) ? publishedConfig.banners : [];
      const promo = Array.isArray(publishedConfig.promoBanners) ? publishedConfig.promoBanners : [];
      hero.forEach((item: any, index: number) => applyDetail({ kind: "hero", index, posX: item?.posX, posY: item?.posY }));
      promo.forEach((item: any, index: number) => applyDetail({ kind: "promo", index, posX: item?.posX, posY: item?.posY }));
      const design = readStorefrontDesign(publishedConfig.quickLinks);
      applyDetail({ kind: "whatsapp", posX: design.whatsappBannerPosX, posY: design.whatsappBannerPosY });
    };

    const scheduleApply = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(applyPublished);
    };

    const onFraming = (event: Event) => {
      const detail = (event as CustomEvent<BannerFramingDetail>).detail;
      if (detail?.kind) applyDetail(detail);
    };
    window.addEventListener("aura-banner-framing", onFraming as EventListener);

    const isEditor = window.location.pathname.startsWith("/store-settings/editor");
    const isStore = window.location.pathname.startsWith("/loja");
    let observer: MutationObserver | null = null;

    if (isStore && !isEditor) {
      fetch("/api/store/config")
        .then((response) => response.ok ? response.json() : null)
        .then((config) => {
          if (!disposed && config) {
            publishedConfig = config;
            applyPublished();
          }
        })
        .catch(() => {});

      const root = document.getElementById("root");
      if (root) {
        observer = new MutationObserver(scheduleApply);
        observer.observe(root, { childList: true, subtree: true });
      }
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("aura-banner-framing", onFraming as EventListener);
    };
  }, []);

  return null;
}
