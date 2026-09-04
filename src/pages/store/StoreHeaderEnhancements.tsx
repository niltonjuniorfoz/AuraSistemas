import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useStorePrefs } from "../../stores/storePrefs";
import { CodeFlag } from "./flagIcons";
import { StoreAutoTranslate } from "./StoreAutoTranslate";

type StoreLanguage = "pt" | "es" | "en";
type StoreCurrency = "BRL" | "PYG" | "USD";

type Mounts = {
  actions: HTMLElement | null;
  topbar: HTMLElement | null;
  mobileFx: HTMLElement | null;
};

type PriceMount = {
  id: string;
  mount: HTMLElement;
  primaryText: string;
};

const LANGUAGE_OPTIONS: Array<{ code: StoreLanguage; label: string; short: string }> = [
  { code: "pt", label: "Português", short: "PT" },
  { code: "es", label: "Español", short: "ES" },
  { code: "en", label: "English", short: "EN" },
];

const CURRENCY_SYMBOLS: Record<string, string> = { BRL: "R$", PYG: "Gs", USD: "US$" };
const CURRENCY_NAMES: Record<StoreLanguage, Record<string, string>> = {
  pt: { BRL: "Real", PYG: "Guarani", USD: "Dólar" },
  es: { BRL: "Real", PYG: "Guaraní", USD: "Dólar" },
  en: { BRL: "Brazilian Real", PYG: "Paraguayan Guarani", USD: "US Dollar" },
};

const COPY: Record<StoreLanguage, { language: string; currency: string; exchange: string; usdt: string; ratesTitle: string }> = {
  pt: { language: "Idioma", currency: "Moeda", exchange: "Câmbio", usdt: "Aceitamos USDT", ratesTitle: "Cotações da loja" },
  es: { language: "Idioma", currency: "Moneda", exchange: "Cambio", usdt: "Aceptamos USDT", ratesTitle: "Cotizaciones de la tienda" },
  en: { language: "Language", currency: "Currency", exchange: "Rates", usdt: "USDT accepted", ratesTitle: "Store exchange rates" },
};

function normalizeLanguage(value: string | undefined): StoreLanguage {
  const code = String(value || "pt").toLowerCase().split("-")[0];
  return code === "es" || code === "en" ? code : "pt";
}

function formatBrlRate(value: number) {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

function formatPygRate(value: number) {
  return Math.round(value).toLocaleString("es-PY");
}

function HeaderLocaleCurrencyMenu() {
  const { i18n } = useTranslation();
  const { currency, setCurrency, allowedCurrencies } = useStorePrefs();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const language = normalizeLanguage(i18n.resolvedLanguage || i18n.language);
  const copy = COPY[language];
  const selectedLanguage = LANGUAGE_OPTIONS.find((option) => option.code === language) || LANGUAGE_OPTIONS[0];
  const currencies = useMemo(() => {
    const valid = (allowedCurrencies || []).filter((code) => CURRENCY_SYMBOLS[code]);
    return valid.length ? valid : ["BRL", "PYG", "USD"];
  }, [allowedCurrencies]);
  const selectedCurrency = currencies.includes(currency) ? currency : currencies[0];

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const chooseLanguage = async (nextLanguage: StoreLanguage) => {
    try { localStorage.setItem("storeLang", nextLanguage); } catch {}
    await i18n.changeLanguage(nextLanguage);
    setOpen(false);
  };

  const chooseCurrency = (nextCurrency: string) => {
    setCurrency(nextCurrency);
    setOpen(false);
  };

  return (
    <div ref={rootRef} data-no-store-translate className="relative flex items-center">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex h-9 items-center gap-1.5 rounded-full border border-stone-200 bg-white px-2 text-[10px] font-semibold text-stone-600 shadow-sm transition hover:border-[var(--store-accent,#d46a86)]/45 hover:text-[var(--store-accent,#d46a86)] md:px-2.5"
      >
        <CodeFlag code={language} className="h-3 w-[17px] shrink-0 rounded-[2px]" />
        <span className="hidden lg:inline">{selectedLanguage.short}</span>
        <span className="hidden text-stone-300 lg:inline">·</span>
        <span className="hidden lg:inline">{CURRENCY_SYMBOLS[selectedCurrency] || selectedCurrency}</span>
        <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div role="menu" className="absolute right-0 top-[calc(100%+.5rem)] z-[10020] w-[224px] overflow-hidden rounded-xl border border-stone-200 bg-white py-1.5 text-stone-600 shadow-[0_18px_45px_rgba(70,45,55,.16)]">
          <div className="px-3 pb-1 pt-1 text-[9px] font-bold uppercase tracking-[0.13em] text-stone-400">{copy.language}</div>
          {LANGUAGE_OPTIONS.map((option) => (
            <button key={option.code} type="button" role="menuitemradio" aria-checked={language === option.code} onClick={() => chooseLanguage(option.code)} className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs transition hover:bg-stone-50 ${language === option.code ? "bg-[var(--store-accent,#d46a86)]/7 text-stone-800" : ""}`}>
              <CodeFlag code={option.code} className="h-3 w-[18px] shrink-0 rounded-[2px]" />
              <span className="flex-1">{option.label}</span>
              {language === option.code && <Check className="h-3.5 w-3.5 text-[var(--store-accent,#d46a86)]" />}
            </button>
          ))}

          <div className="mx-3 my-1 border-t border-stone-100" />
          <div className="px-3 pb-1 pt-1 text-[9px] font-bold uppercase tracking-[0.13em] text-stone-400">{copy.currency}</div>
          {currencies.map((code) => (
            <button key={code} type="button" role="menuitemradio" aria-checked={selectedCurrency === code} onClick={() => chooseCurrency(code)} className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs transition hover:bg-stone-50 ${selectedCurrency === code ? "bg-[var(--store-accent,#d46a86)]/7 text-stone-800" : ""}`}>
              <CodeFlag code={code} className="h-3 w-[18px] shrink-0 rounded-[2px]" />
              <span className="flex-1">{CURRENCY_NAMES[language][code] || code}</span>
              <span className="text-[10px] font-semibold text-stone-400">{CURRENCY_SYMBOLS[code]}</span>
              {selectedCurrency === code && <Check className="h-3.5 w-3.5 text-[var(--store-accent,#d46a86)]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function HeaderFxStrip() {
  const { i18n } = useTranslation();
  const { rates } = useStorePrefs();
  const language = normalizeLanguage(i18n.resolvedLanguage || i18n.language);
  const copy = COPY[language];
  const brl = Number(rates.BRL || 0) || 5.5;
  const pyg = Number(rates.PYG || 0) || 7300;

  return (
    <div data-no-store-translate className="hidden items-center gap-1.5 whitespace-nowrap text-[9px] font-medium text-stone-500 lg:flex">
      <span className="text-stone-400">{copy.exchange}</span>
      <span className="inline-flex items-center gap-1">
        <CodeFlag code="PYG" className="h-2.5 w-4 rounded-[1px]" />
        <span>US$ 1 = Gs {formatPygRate(pyg)}</span>
      </span>
      <span className="text-stone-300">·</span>
      <span className="inline-flex items-center gap-1">
        <CodeFlag code="BRL" className="h-2.5 w-4 rounded-[1px]" />
        <span>US$ 1 = R$ {formatBrlRate(brl)}</span>
      </span>
      <span className="ml-1 rounded-full border border-[var(--store-accent,#d46a86)]/25 bg-white/70 px-2 py-0.5 text-[8px] font-semibold tracking-wide text-[var(--store-accent,#d46a86)]">
        {copy.usdt}
      </span>
    </div>
  );
}

function MobileFxPanel() {
  const { i18n } = useTranslation();
  const { rates } = useStorePrefs();
  const language = normalizeLanguage(i18n.resolvedLanguage || i18n.language);
  const copy = COPY[language];
  const brl = Number(rates.BRL || 0) || 5.5;
  const pyg = Number(rates.PYG || 0) || 7300;

  return (
    <div data-no-store-translate className="mx-1 mt-4 overflow-hidden rounded-xl border border-rose-100 bg-[var(--store-accent,#d46a86)]/[0.035]">
      <div className="border-b border-rose-100 px-3 py-2 text-[9px] font-bold uppercase tracking-[0.14em] text-stone-400">{copy.ratesTitle}</div>
      <div className="grid grid-cols-2 gap-2 px-3 py-3">
        <div className="rounded-lg border border-stone-100 bg-white px-2.5 py-2">
          <div className="mb-1 flex items-center gap-1 text-[9px] font-semibold text-stone-400"><CodeFlag code="BRL" className="h-2.5 w-4 rounded-[1px]" /> BRL</div>
          <div className="text-[11px] font-bold text-stone-700">US$ 1 = R$ {formatBrlRate(brl)}</div>
        </div>
        <div className="rounded-lg border border-stone-100 bg-white px-2.5 py-2">
          <div className="mb-1 flex items-center gap-1 text-[9px] font-semibold text-stone-400"><CodeFlag code="PYG" className="h-2.5 w-4 rounded-[1px]" /> PYG</div>
          <div className="text-[11px] font-bold text-stone-700">US$ 1 = Gs {formatPygRate(pyg)}</div>
        </div>
      </div>
      <div className="border-t border-rose-100 px-3 py-2 text-center text-[10px] font-semibold text-[var(--store-accent,#d46a86)]">{copy.usdt}</div>
    </div>
  );
}

function directText(element: HTMLElement) {
  return Array.from(element.childNodes)
    .filter((node) => node.nodeType === Node.TEXT_NODE)
    .map((node) => node.textContent || "")
    .join("")
    .trim();
}

function detectCurrency(text: string): StoreCurrency | null {
  const value = text.trim();
  if (/^R\$/i.test(value)) return "BRL";
  if (/^(?:Gs\.?|₲)/i.test(value)) return "PYG";
  if (/^(?:US\$|U\$)/i.test(value)) return "USD";
  return null;
}

function parseAmount(text: string, code: StoreCurrency) {
  const raw = text.replace(/[^\d.,-]/g, "").trim();
  if (!raw) return NaN;
  if (code === "PYG" || code === "BRL") {
    return Number(raw.replace(/\./g, "").replace(",", "."));
  }
  if (raw.includes(",") && !raw.includes(".")) return Number(raw.replace(",", "."));
  return Number(raw.replace(/,/g, ""));
}

function convertAmount(amount: number, from: StoreCurrency, to: StoreCurrency, rates: Record<string, number>, baseCurrency: "BRL" | "USD") {
  if (from === to) return amount;
  const fromRate = from === "USD" ? 1 : Number(rates[from]) || (from === "BRL" ? 5.5 : 7300);
  const toRate = to === "USD" ? 1 : Number(rates[to]) || (to === "BRL" ? 5.5 : 7300);
  const usd = from === "USD" ? amount : amount / fromRate;
  const converted = to === "USD" ? usd : usd * toRate;
  if (to === "BRL" && baseCurrency === "USD") return Math.ceil(converted - 1e-6);
  return converted;
}

function formatCurrencyAmount(code: StoreCurrency, value: number) {
  if (code === "PYG") return `Gs. ${Math.round(value).toLocaleString("es-PY")}`;
  if (code === "BRL") return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `US$ ${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function chooseSecondary(primary: StoreCurrency, allowedCurrencies: string[]): StoreCurrency | null {
  const allowed = allowedCurrencies.filter((code): code is StoreCurrency => code === "BRL" || code === "PYG" || code === "USD");
  if (allowed.length <= 1) return null;
  if (primary !== "BRL" && allowed.includes("BRL")) return "BRL";
  if (primary === "BRL" && allowed.includes("USD")) return "USD";
  return allowed.find((code) => code !== primary) || null;
}

function ProductPricePairs({ active }: { active: boolean }) {
  const { currency, rates, allowedCurrencies, baseCurrency } = useStorePrefs();
  const [mounts, setMounts] = useState<PriceMount[]>([]);
  const allowedKey = allowedCurrencies.join("|");

  useEffect(() => {
    if (!active || !window.location.pathname.startsWith("/loja/produto/")) {
      setMounts([]);
      return;
    }

    let disposed = false;
    let frame = 0;

    const sync = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (disposed) return;
        const candidates = Array.from(document.querySelectorAll<HTMLElement>("main div.font-black"));
        const next: PriceMount[] = [];

        candidates.forEach((element, index) => {
          const primaryText = directText(element);
          if (!detectCurrency(primaryText)) return;

          element.setAttribute("data-no-store-translate", "true");
          let mount = element.querySelector<HTMLElement>(":scope > .store-secondary-price-mount");
          if (!mount) {
            mount = document.createElement("span");
            mount.className = "store-secondary-price-mount block";
            mount.setAttribute("data-no-store-translate", "true");
            element.appendChild(mount);
          }
          next.push({ id: `${index}-${element.className}`, mount, primaryText });
        });

        setMounts((previous) => {
          if (previous.length === next.length && previous.every((item, index) => item.mount === next[index]?.mount && item.primaryText === next[index]?.primaryText)) return previous;
          return next;
        });
      });
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    window.addEventListener("resize", sync);

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", sync);
      document.querySelectorAll<HTMLElement>(".store-secondary-price-mount").forEach((mount) => mount.remove());
      setMounts([]);
    };
  }, [active, currency, allowedKey, rates.BRL, rates.PYG, baseCurrency]);

  return (
    <>
      {mounts.map((item) => {
        const primaryCode = detectCurrency(item.primaryText) || (currency as StoreCurrency);
        const secondaryCode = chooseSecondary(primaryCode, allowedCurrencies);
        const primaryAmount = parseAmount(item.primaryText, primaryCode);
        if (!secondaryCode || !Number.isFinite(primaryAmount)) return null;
        const secondaryAmount = convertAmount(primaryAmount, primaryCode, secondaryCode, rates, baseCurrency);

        return createPortal(
          <span data-no-store-translate className="mt-1 flex items-center gap-1 text-[10px] font-semibold leading-none text-stone-400 sm:text-[11px]">
            <CodeFlag code={secondaryCode} className="h-2.5 w-4 shrink-0 rounded-[1px]" />
            <span>{formatCurrencyAmount(secondaryCode, secondaryAmount)}</span>
          </span>,
          item.mount,
          item.id,
        );
      })}
    </>
  );
}

export function StoreHeaderEnhancements({ active }: { active: boolean }) {
  const [mounts, setMounts] = useState<Mounts>({ actions: null, topbar: null, mobileFx: null });
  const setCurrencyConfig = useStorePrefs((state) => state.setCurrencyConfig);

  useEffect(() => {
    if (!active) return;
    let alive = true;
    const load = () => {
      fetch("/api/currency-config/public", { cache: "no-store" })
        .then((response) => response.ok ? response.json() : null)
        .then((data) => {
          if (!alive || !data) return;
          setCurrencyConfig({
            codes: Array.isArray(data.enabledCurrencies) ? data.enabledCurrencies : ["BRL", "PYG", "USD"],
            rates: { USD: 1, BRL: Number(data.rates?.BRL) || 5.5, PYG: Number(data.rates?.PYG) || 7300 },
            baseCurrency: data.defaultCurrency === "BRL" ? "BRL" : "USD",
          });
        })
        .catch(() => {});
    };
    load();
    window.addEventListener("origin:currency-config-change", load);
    return () => {
      alive = false;
      window.removeEventListener("origin:currency-config-change", load);
    };
  }, [active, setCurrencyConfig]);

  useEffect(() => {
    if (!active) {
      setMounts({ actions: null, topbar: null, mobileFx: null });
      return;
    }

    let disposed = false;
    let hiddenSupport: HTMLElement | null = null;

    const ensureMounts = () => {
      if (disposed) return;
      let actionsMount = document.getElementById("store-locale-currency-mount");
      let topbarMount = document.getElementById("store-fx-strip-mount");
      let mobileFxMount = document.getElementById("store-mobile-fx-mount");

      if (actionsMount && !document.body.contains(actionsMount)) actionsMount = null;
      if (topbarMount && !document.body.contains(topbarMount)) topbarMount = null;
      if (mobileFxMount && !document.body.contains(mobileFxMount)) mobileFxMount = null;

      if (!actionsMount) {
        const favorite = document.querySelector<HTMLAnchorElement>('a[href="/loja/conta/favoritos"]');
        if (favorite?.parentElement) {
          actionsMount = document.createElement("div");
          actionsMount.id = "store-locale-currency-mount";
          actionsMount.className = "relative flex shrink-0 items-center";
          favorite.insertAdjacentElement("afterend", actionsMount);
        }
      }

      const support = document.querySelector<HTMLAnchorElement>('a[href="#atendimento"]');
      const orders = document.querySelector<HTMLAnchorElement>('a[href="/loja/conta/pedidos"]');
      const topbarParent = support?.parentElement || orders?.parentElement || null;
      if (support) {
        support.style.display = "none";
        hiddenSupport = support;
      }

      if (!topbarMount && topbarParent) {
        topbarMount = document.createElement("div");
        topbarMount.id = "store-fx-strip-mount";
        topbarMount.className = "flex shrink-0 items-center";
        topbarParent.prepend(topbarMount);
      }

      if (!mobileFxMount) {
        const mobileMenuBody = document.querySelector<HTMLElement>("#mobile-store-menu aside .flex-1");
        if (mobileMenuBody) {
          mobileFxMount = document.createElement("div");
          mobileFxMount.id = "store-mobile-fx-mount";
          mobileFxMount.className = "pb-3";
          mobileMenuBody.appendChild(mobileFxMount);
        }
      }

      setMounts((previous) => (
        previous.actions === actionsMount && previous.topbar === topbarMount && previous.mobileFx === mobileFxMount
          ? previous
          : { actions: actionsMount, topbar: topbarMount, mobileFx: mobileFxMount }
      ));
    };

    ensureMounts();
    const observer = new MutationObserver(ensureMounts);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      disposed = true;
      observer.disconnect();
      if (hiddenSupport) hiddenSupport.style.display = "";
      document.getElementById("store-locale-currency-mount")?.remove();
      document.getElementById("store-fx-strip-mount")?.remove();
      document.getElementById("store-mobile-fx-mount")?.remove();
      setMounts({ actions: null, topbar: null, mobileFx: null });
    };
  }, [active]);

  if (!active) return null;

  return (
    <>
      <StoreAutoTranslate />
      <ProductPricePairs active={active} />
      {mounts.actions ? createPortal(<HeaderLocaleCurrencyMenu />, mounts.actions) : null}
      {mounts.topbar ? createPortal(<HeaderFxStrip />, mounts.topbar) : null}
      {mounts.mobileFx ? createPortal(<MobileFxPanel />, mounts.mobileFx) : null}
    </>
  );
}
