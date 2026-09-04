import React, { useEffect, useMemo, useRef, useState } from "react";
import { Outlet, Link, useNavigate, useLocation } from "react-router";
import {
  ShoppingBag, Search, Plus, Minus, Trash2, X, Package, ArrowRight, MessageCircle, ShieldCheck, Store, User, Sparkles,
  Truck, Heart, Home, LayoutGrid, Tag, Instagram, Headphones, Menu, Gift, Award, Mail,
} from "lucide-react";
import { useShopCart, cartTotal, cartCount } from "../../stores/shopCart";
import { useCustomerAuthStore } from "../../stores/customerAuth";
import { useWishlistStore } from "../../stores/wishlist";
import { storeApiFetch } from "../../lib/storeApi";
import { APP_VERSION } from "../../lib/version";
import { toast } from "../../components/Toast";
import { AssistantWidget } from "./AssistantWidget";
import { useTranslation } from "react-i18next";
import i18nInstance, { translateCategoryName } from "./i18n";
import { useStorePrefs, formatPrice, defaultRates } from "../../stores/storePrefs";
import { useEditMode } from "./editor/EditModeContext";
import { Editable } from "./editor/Editable";
import { effectiveHomeSections } from "./editor/elementCatalog";
import { TextPanel } from "./editor/panels/TextPanel";
import { ColorsPanel } from "./editor/panels/ColorsPanel";
import { FontsPanel } from "./editor/panels/FontsPanel";
import { applyStoreColors } from "./editor/storeTheme";
import { applyStoreFonts } from "./editor/applyStoreFonts";

function normalizeInstagramUrl(value: unknown): string | null {
  const raw = String(value || "").trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  const handle = raw.replace(/^@/, "").replace(/^instagram\.com\//i, "").replace(/[^a-zA-Z0-9._]/g, "");
  return handle ? `https://instagram.com/${handle}` : null;
}

// Casca da loja pública: visual PRÓPRIO claro (separado do ERP), carrinho e
// carrinho disponível em todas as páginas da vitrine.
// ID anônimo por navegador (aba Análises: visitante único/taxa de rejeição/sessão) — só um
// UUID aleatório salvo no aparelho, nunca ligado a nome/CPF/telefone do comprador.
function getVisitorId(): string {
  try {
    const key = "store_visitor_id";
    let id = localStorage.getItem(key);
    if (!id) {
      id = (crypto as any).randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(key, id);
    }
    return id;
  } catch {
    return "";
  }
}

function EditableAnnouncementBar({ announcement, pages }: { announcement: string; pages: any }) {
  const ctx = useEditMode();
  const text = ctx ? String(ctx.draft?.announcement || "") : announcement;
  // Visibilidade da seção "announcement" (pages.home.sections): oculta some
  // nas duas telas e também fora do editor quando publicada assim; reativável
  // pelo painel Seções. Virou um selo discreto dentro do header (ao lado da
  // busca) em vez de uma faixa preta cheia acima de tudo — mesma seção, novo
  // formato visual, sem perder a edição pelo painel.
  const secoes = effectiveHomeSections(ctx ? ctx.draft : { pages });
  const secao = secoes.find((s) => s.id === "announcement");
  if (secao?.visivel === false) return null;
  const displayText = text || "Atendimento rápido, compra segura e entrega acompanhada";
  const bar = (
    <span className="inline-flex min-h-7 items-center gap-1.5 text-[10px] font-semibold tracking-wide text-[var(--store-header-text,#2f2729)] sm:text-[11px]">
      <Truck className="h-3.5 w-3.5 text-[var(--store-accent,#e96f95)]" /> {displayText}
    </span>
  );
  if (!ctx) return bar;
  return (
    <>
      <Editable panelKey="announcement" label="Aviso do topo" elementId="secao-announcement"
        onHide={() => ctx.patchDraft((draft: any) => {
          // Payload em FUNÇÃO (mesmo padrão do patchHomeSections do StoreHome):
          // recalcula sections do draft FRESCO na hora de rodar na fila — payload
          // objeto montado no clique nascia do draft velho e desfazia um
          // mover-seção em voo. null = já oculta, no-op (não manda PATCH).
          const sections = effectiveHomeSections(draft).map((s) => ({ ...s }));
          const alvo = sections.find((s) => s.id === "announcement");
          if (!alvo || alvo.visivel === false) return null;
          alvo.visivel = false;
          return { pages: { home: { sections: sections.map((s, i) => ({ ...s, ordem: i })) } } };
        })}>
        {bar}
      </Editable>
      <TextPanel panelKey="announcement" title="Aviso do topo" fieldKey="announcement" maxLength={200} />
    </>
  );
}

// Fora do editor usa o footerText publicado (já vem junto na mesma resposta
// de /api/store/config que ShopLayout já buscava pro aviso do topo e pro
// tema — não precisa de requisição extra), com o texto fixo como último
// fallback se a loja nunca configurou nada. Dentro do editor mostra o
// rascunho ao vivo, igual aos outros campos editáveis.
function EditableFooterText({ footerText, storeName }: { footerText: string; storeName?: string }) {
  const ctx = useEditMode();
  const fallback = `© ${new Date().getFullYear()} ${storeName || "Sua loja"}. Todos os direitos reservados.`;
  const text = ctx ? String(ctx.draft?.footerText || "") : footerText;
  const p = <p className="text-xs text-stone-400">{text || fallback}</p>;
  if (!ctx) return p;
  return <Editable panelKey="footer" label="Rodapé">{p}</Editable>;
}

export function ShopLayout() {
  const { t } = useTranslation();
  // null fora do editor (ver useEditMode) — usado só pra saber quais cores
  // aplicar no elemento raiz (rascunho ao vivo dentro do editor, cores
  // publicadas em /loja normal).
  const editCtx = useEditMode();
  const rootRef = useRef<HTMLDivElement>(null);
  const { currency, rates, setRates, setCurrency, setAllowedCurrencies } = useStorePrefs();
  const navigate = useNavigate();
  // Dentro do editor, navegação programática também precisa ficar sob
  // /store-settings/editor/... — links <a> são tratados pelo interceptador
  // do StoreEditor, mas navigate() não passa por clique.
  const storePath = (p: string) => (editCtx ? p.replace(/^\/loja/, "/store-settings/editor") : p);
  const location = useLocation();
  const normalizedStorePath = location.pathname.replace(/\/+$/, "") || "/";
  const [info, setInfo] = useState<any>(null);
  const [infoLoading, setInfoLoading] = useState(true);
  useEffect(() => {
    // Fire-and-forget: alimenta o card "Visualizações de página" do Painel. Nunca deve
    // atrapalhar a navegação do cliente — por isso sem await/loading/erro visível nenhum.
    fetch("/api/store/pageview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: location.pathname, visitorId: getVisitorId() }),
    }).catch(() => {});
  }, [location.pathname]);
  useEffect(() => {
    // Conserta quem já visitou com o bug antigo salvo no navegador (rates
    // sobrescrito com só {USD:1}, sem BRL/PYG — por isso o "---" nunca sumia).
    if (!rates.BRL || !rates.PYG) setRates({ ...defaultRates(), ...rates });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    // Sempre parte de defaultRates(): se a loja ainda não configurou câmbio
    // (currencies vazio), nunca deixa BRL/PYG sem valor (mostraria "---").
    if (info?.currencies?.length) {
      const newRates = defaultRates();
      const allowed = info.currencies.map((c: any) => String(c.code || "").toUpperCase()).filter(Boolean);
      info.currencies.forEach((c: any) => newRates[c.code] = Number(c.rateToUsd));
      setRates(newRates);
      setAllowedCurrencies(allowed);
      const current = useStorePrefs.getState().currency;
      if (!allowed.includes(current)) setCurrency(allowed[0] || "BRL");
    } else if (info?.defaultCurrency === "BRL") {
      setAllowedCurrencies(["BRL"]);
      setCurrency("BRL");
    }
  }, [info]);
  const [categories, setCategories] = useState<any[]>([]);
  const [ofertaOutlet, setOfertaOutlet] = useState({ hasOferta: false, hasOutlet: false });
  const { items, open, setOpen, setQty } = useShopCart();
  const customer = useCustomerAuthStore((s) => s.customer);
  const setWishlistIds = useWishlistStore((s) => s.setIds);
  const resetWishlist = useWishlistStore((s) => s.reset);
  useEffect(() => {
    if (!customer) { resetWishlist(); return; }
    storeApiFetch("/api/store/account/wishlist").then((r) => r.json())
      .then((rows) => setWishlistIds(Array.isArray(rows) ? rows.map((r: any) => r.productId) : []))
      .catch(() => {});
  }, [customer?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const [searchTerm, setSearchTerm] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [announcement, setAnnouncement] = useState("");
  const [footerText, setFooterText] = useState("");
  const [themeColorsFromInfo, setThemeColorsFromInfo] = useState<Record<string, string>>({});
  const [themeFontsFromInfo, setThemeFontsFromInfo] = useState<{ heading?: { url: string; family: string }; body?: { url: string; family: string } }>({});
  const [pagesFromInfo, setPagesFromInfo] = useState<any>(null);
  const [precisaAtualizar, setPrecisaAtualizar] = useState(false);
  useEffect(() => {
    fetch("/api/store/info").then((r) => r.json()).then((j) => {
      setInfo(j);
      if (j?.defaultCurrency === "BRL") setCurrency("BRL");
      // Página aberta antes de uma atualização: o formulário daqui pode não ter
      // campos que o servidor já exige. Avisa em vez de deixar o cliente travado.
      if (j?.appVersion && j.appVersion !== APP_VERSION) setPrecisaAtualizar(true);
    }).catch(() => {}).finally(() => setInfoLoading(false));
    fetch("/api/store/config").then((r) => r.json()).then((c) => {
      setAnnouncement(String(c?.announcement || ""));
      setFooterText(String(c?.footerText || ""));
      setThemeColorsFromInfo(c?.theme?.colors || {});
      setThemeFontsFromInfo(c?.theme?.fonts || {});
      setPagesFromInfo(c?.pages || null);
    }).catch(() => {});
    fetch("/api/store/categories").then((r) => r.json()).then((j) => setCategories(j.data || [])).catch(() => {});
    fetch("/api/store/filters").then((r) => r.json())
      .then((j) => setOfertaOutlet({ hasOferta: !!j.hasOferta, hasOutlet: !!j.hasOutlet }))
      .catch(() => {});
  }, []);

  // A loja pública pertence ao cliente do Aura Sistemas. Título, ícone e
  // metadados acompanham a identidade cadastrada da loja; ao sair de /loja,
  // o shell do ERP volta a usar a marca do sistema pelo carregamento normal.
  useEffect(() => {
    if (!info?.storeName) return;
    document.title = info.storeName;
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (description) description.content = `${info.storeName} — loja online`;
    const appName = document.querySelector<HTMLMetaElement>('meta[name="application-name"]');
    if (appName) appName.content = info.storeName;
    const appleTitle = document.querySelector<HTMLMetaElement>('meta[name="apple-mobile-web-app-title"]');
    if (appleTitle) appleTitle.content = info.storeName;
    const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (icon) icon.href = "/api/store/icon/192";
    const appleIcon = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
    if (appleIcon) appleIcon.href = "/api/store/icon/192";
  }, [info?.storeName]);

  // Aplica os 9 tokens de cor como CSS custom properties no elemento raiz da
  // loja — dentro do editor usa o rascunho ao vivo (editCtx.draft), fora dele
  // usa as cores publicadas vindas de /api/store/config.
  useEffect(() => {
    if (!rootRef.current) return;
    const colors = editCtx ? editCtx.draft?.theme?.colors : themeColorsFromInfo;
    applyStoreColors(rootRef.current, colors || {});
  }, [editCtx?.draft?.theme?.colors, themeColorsFromInfo]);

  // Mesmo padrão acima, mas pras 2 fontes customizadas (título/corpo) — injeta
  // o @font-face e seta --store-font-heading/--store-font-body.
  useEffect(() => {
    if (!rootRef.current) return;
    const fonts = editCtx ? editCtx.draft?.theme?.fonts : themeFontsFromInfo;
    applyStoreFonts(rootRef.current, fonts || {});
  }, [editCtx?.draft?.theme?.fonts, themeFontsFromInfo]);

  const subtotal = useMemo(() => cartTotal(items), [items]);
  const count = useMemo(() => cartCount(items), [items]);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(storePath(`/loja/catalogo${searchTerm.trim() ? `?busca=${encodeURIComponent(searchTerm.trim())}` : ""}`));
  };

  const wa = info?.whatsapp ? `https://wa.me/${String(info.whatsapp).replace(/\D/g, "")}` : null;
  const instagram = normalizeInstagramUrl(info?.instagramUrl);

  return (
    <div ref={rootRef} className="h-[100dvh] overflow-y-auto bg-[var(--store-bg,#fff9fa)] pb-16 text-[var(--store-text,#2f2729)] md:pb-0" style={{ fontFamily: "var(--store-font-body, 'Inter'), system-ui, sans-serif" }}>
      {/* Loja aberta desde antes de uma atualização — recarregar evita erro no checkout */}
      {precisaAtualizar && (
        <div className="flex flex-wrap items-center justify-center gap-3 bg-stone-900 text-white px-4 py-2 text-center text-xs font-semibold text-stone-900">
          {t("header.paginaDesatualizada")}
          <button onClick={() => window.location.reload()} className="rounded-sm bg-stone-900 px-3 py-1 text-[11px] font-bold text-white hover:bg-stone-700">
            {t("header.atualizarAgora")}
          </button>
        </div>
      )}

      <header className="sticky top-0 z-30 bg-[var(--store-header-bg,#ffffff)]/95 shadow-sm backdrop-blur">
        <div className="hidden border-b border-rose-100 bg-[var(--store-accent,#e96f95)]/12 md:block">
          <div className="mx-auto flex min-h-8 w-[96%] max-w-[1440px] items-center justify-center gap-4 px-3 sm:justify-between">
            <EditableAnnouncementBar announcement={announcement} pages={pagesFromInfo} />
            <div className="hidden items-center gap-5 text-[10px] font-semibold text-[var(--store-header-text,#2f2729)] md:flex">
              <a href="#atendimento" className="inline-flex items-center gap-1 hover:text-[var(--store-accent,#e96f95)]"><Headphones className="h-3 w-3" /> Atendimento</a>
              {wa && <a href={wa} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-[var(--store-accent,#e96f95)]"><MessageCircle className="h-3 w-3" /> WhatsApp</a>}
              {instagram && <a href={instagram} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-[var(--store-accent,#e96f95)]"><Instagram className="h-3 w-3" /> Instagram</a>}
              <Link to="/loja/conta/pedidos" className="hover:text-[var(--store-accent,#e96f95)]">Meus pedidos</Link>
              <Link to="/loja/conta" className="hover:text-[var(--store-accent,#e96f95)]">Minha conta</Link>
            </div>
          </div>
        </div>
        <div className="border-b border-stone-100 bg-white">
          <div className="relative mx-auto flex min-h-[58px] w-[95%] max-w-[1600px] items-center gap-2 px-1 py-0.5 md:min-h-[70px] md:px-3 lg:gap-8">
          <button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); setMobileMenuOpen((open) => !open); }} className="relative z-20 flex h-11 w-11 shrink-0 items-center justify-center text-[#6b5b5a] md:hidden" aria-label="Abrir categorias" aria-controls="mobile-store-menu" aria-expanded={mobileMenuOpen}>
            <Menu className="h-6 w-6" />
          </button>
          <Link to="/loja" className="absolute left-1/2 flex -translate-x-1/2 items-center md:static md:translate-x-0">
            {infoLoading ? (
              <span className="h-16 w-44 shrink-0 animate-pulse rounded-xl bg-rose-100 md:h-28 md:w-44" />
            ) : (
              <img
                src={info?.logoUrl || "/branding/db-cosmetics-logo.png"}
                alt={info?.storeName || "Cosmetics by Jessica Ferreira"}
                className="h-14 w-40 shrink-0 scale-[1.12] object-contain md:h-24 md:w-44 md:scale-100"
              />
            )}
          </Link>
          <div className="hidden flex-1 items-center justify-center sm:flex">
            <form onSubmit={submitSearch} className="relative flex w-full max-w-3xl overflow-hidden rounded-lg border border-rose-100 bg-white shadow-sm focus-within:border-[var(--store-accent,#e96f95)]">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder={t("header.buscarPlaceholder")}
                className="h-12 min-w-0 flex-1 bg-white pl-11 pr-4 text-sm outline-none" />
              <button type="submit" className="w-24 shrink-0 bg-[var(--store-accent,#e96f95)] text-sm font-semibold text-white transition hover:brightness-95">Buscar</button>
            </form>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-4 md:gap-6">
            <Link to="/loja/conta/favoritos" className="hidden items-center gap-2 text-sm font-semibold text-[#6b5b5a] transition hover:text-[var(--store-accent,#e96f95)] md:flex">
              <Heart className="h-6 w-6" />
              <span>Favoritos</span>
            </Link>
            <button onClick={() => setOpen(true)} className="flex items-center gap-2 text-sm font-semibold text-[#6b5b5a] transition hover:text-[var(--store-accent,#e96f95)]">
              <span className="relative">
                <ShoppingBag className="h-6 w-6" />
                {count > 0 && (
                  <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--store-accent,#e96f95)] px-1 text-[9px] font-bold text-white">
                    {count}
                  </span>
                )}
              </span>
              <span className="hidden md:inline">{t("header.carrinho")}</span>
            </button>
          </div>
          </div>
        </div>
        <form onSubmit={submitSearch} className="mx-auto w-[95%] max-w-[1600px] bg-white px-1 pb-1.5 sm:hidden">
          <div className="relative flex overflow-hidden rounded-md border border-rose-100">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder={t("header.buscarPlaceholder")}
              className="h-10 min-w-0 flex-1 bg-white pl-9 pr-3 text-sm outline-none" />
            <button type="submit" className="w-12 bg-[var(--store-accent,#e96f95)] text-white" aria-label="Buscar"><Search className="mx-auto h-4 w-4" /></button>
          </div>
        </form>
        <div className="hidden border-y border-rose-100 bg-white md:block">
          <div className="mx-auto flex w-[96%] max-w-[1440px] items-center justify-center gap-2 overflow-x-auto whitespace-nowrap px-3 py-2 text-[11px] font-semibold text-[#4f4544] scrollbar-hide lg:gap-5">
            <Link to="/loja/catalogo" className="inline-flex items-center gap-1.5 rounded-md bg-[var(--store-accent,#e96f95)] px-4 py-2 font-semibold text-white transition hover:brightness-95">
              <LayoutGrid className="h-4 w-4" /> Todas categorias
            </Link>
            {[...categories]
              .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0) || translateCategoryName(a.name, i18nInstance.language).localeCompare(translateCategoryName(b.name, i18nInstance.language)))
              .slice(0, 8).map(c => (
              <Link key={c.id} to={`/loja/catalogo?cat=${c.id}`} className="rounded-md px-2 py-2 transition hover:bg-rose-50 hover:text-[var(--store-accent,#e96f95)]">
                {translateCategoryName(c.name, i18nInstance.language)}
              </Link>
            ))}
            {ofertaOutlet.hasOferta && (
              <Link to="/loja/catalogo?canal=oferta" className="rounded-md px-2 py-2 transition hover:bg-rose-50 hover:text-[var(--store-accent,#e96f95)]">Ofertas</Link>
            )}
          </div>
        </div>
      </header>

      {mobileMenuOpen && (
        <div id="mobile-store-menu" className="fixed inset-0 z-[9999] md:hidden" role="dialog" aria-modal="true" aria-label="Categorias">
          <button type="button" className="absolute inset-0 bg-stone-900/35 backdrop-blur-[1px]" onClick={() => setMobileMenuOpen(false)} aria-label="Fechar menu" />
          <aside className="absolute inset-y-0 left-0 flex w-[86%] max-w-sm flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-rose-100 px-4 py-4">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--store-accent,#e96f95)]">Menu</div>
                <div className="mt-0.5 text-lg font-bold text-[#463c3b]">Categorias</div>
              </div>
              <button type="button" onClick={() => setMobileMenuOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-full border border-rose-100 text-stone-500" aria-label="Fechar">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              <Link to="/loja/catalogo" onClick={() => setMobileMenuOpen(false)} className="mb-2 flex items-center gap-3 rounded-xl bg-[var(--store-accent,#e96f95)] px-4 py-3 text-sm font-bold text-white">
                <LayoutGrid className="h-5 w-5" /> Todas as categorias
              </Link>
              <div className="grid grid-cols-1 gap-1">
                {[...categories]
                  .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0) || translateCategoryName(a.name, i18nInstance.language).localeCompare(translateCategoryName(b.name, i18nInstance.language)))
                  .map((category) => (
                    <Link key={category.id} to={`/loja/catalogo?cat=${category.id}`} onClick={() => setMobileMenuOpen(false)} className="flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold text-[#6b5b5a] transition active:bg-rose-50">
                      <span>{translateCategoryName(category.name, i18nInstance.language)}</span>
                      <ArrowRight className="h-4 w-4 text-[var(--store-accent,#e96f95)]" />
                    </Link>
                  ))}
              </div>
              {ofertaOutlet.hasOferta && (
                <Link to="/loja/catalogo?canal=oferta" onClick={() => setMobileMenuOpen(false)} className="mt-2 flex items-center gap-3 rounded-xl border border-rose-100 px-4 py-3 text-sm font-bold text-[var(--store-accent,#e96f95)]">
                  <Tag className="h-5 w-5" /> Ofertas
                </Link>
              )}
            </div>
          </aside>
        </div>
      )}

      <Outlet context={{ info }} />
      <ColorsPanel />
      <FontsPanel />
      <TextPanel panelKey="footer" title="Rodapé" fieldKey="footerText" maxLength={200} placeholder="© Nome da loja. Todos os direitos reservados." />





      {/* O painel lateral é somente o carrinho. Identificação, entrega e pagamento
          ficam na página dedicada para reduzir ruído e evitar perda de dados. */}
      {open && (
        <div className="store-cart-overlay fixed inset-0 z-50 flex justify-end bg-stone-900/40 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <aside className="store-cart-drawer flex h-full w-full max-w-md flex-col bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-stone-200 p-4">
              <h2 className="flex items-center gap-2 text-lg font-bold" style={{ fontFamily: "var(--store-font-heading, 'Barlow Condensed'), sans-serif", textTransform: "uppercase" }}>
                <ShoppingBag className="h-5 w-5 text-stone-900" /> {t("cart.titulo")}
              </h2>
              <button type="button" onClick={() => setOpen(false)} aria-label={t("cart.fechar")} className="rounded-sm p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700">
                <X className="h-4 w-4" />
              </button>
            </div>

            {items.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center text-stone-500">
                <ShoppingBag className="h-12 w-12 text-stone-300" />
                <p className="text-sm">{t("cart.vazio")}</p>
                <button type="button" onClick={() => { setOpen(false); navigate(storePath("/loja/catalogo")); }} className="rounded-sm border border-stone-300 px-4 py-2 text-sm font-medium hover:border-stone-500">
                  {t("cart.verProdutos")}
                </button>
              </div>
            ) : (
              <>
                <div className="flex-1 space-y-2 overflow-y-auto p-4">
                  {items.map((item) => (
                    <div key={item.productId} className="flex gap-3 rounded-sm border border-stone-200 bg-stone-50 p-2.5">
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-sm bg-white">
                        {item.imageUrl
                          ? <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
                          : <div className="flex h-full items-center justify-center"><Package className="h-5 w-5 text-stone-300" /></div>}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="line-clamp-2 text-xs font-medium">{item.name}</div>
                        <div className="mt-0.5 text-sm font-bold text-stone-900">{formatPrice(item.price * item.quantity, currency, rates)}</div>
                        <div className="mt-1 flex items-center gap-1">
                          <button type="button" onClick={() => setQty(item.productId, item.quantity - 1)} aria-label={t("cart.diminuirQuantidade")} className="flex h-7 w-7 items-center justify-center rounded-sm border border-stone-300 hover:border-stone-500"><Minus className="h-3 w-3" /></button>
                          <span className="w-7 text-center text-xs font-bold">{item.quantity}</span>
                          <button type="button" onClick={() => setQty(item.productId, item.quantity + 1)} disabled={item.quantity >= item.maxQty} aria-label={t("cart.aumentarQuantidade")} className="flex h-7 w-7 items-center justify-center rounded-sm border border-stone-300 hover:border-stone-500 disabled:opacity-40"><Plus className="h-3 w-3" /></button>
                          <button type="button" onClick={() => setQty(item.productId, 0)} aria-label={t("cart.remover")} className="ml-auto flex h-7 w-7 items-center justify-center rounded-sm text-red-500 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-stone-200 bg-white p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-sm text-stone-500">{t("cart.subtotal")}</span>
                    <span className="text-2xl font-black text-stone-900">{formatPrice(subtotal, currency, rates)}</span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <button type="button" onClick={() => { setOpen(false); navigate(storePath("/loja/catalogo")); }} className="rounded-full border border-stone-300 px-4 py-3 text-sm font-semibold text-stone-700 transition hover:border-stone-500">
                      {t("cart.continuarComprando")}
                    </button>
                    <button type="button" onClick={() => {
                      if (editCtx) {
                        toast.error("Finalização de pedido desativada dentro do editor.");
                        return;
                      }
                      setOpen(false);
                      navigate("/loja/finalizar");
                    }} className="flex items-center justify-center gap-2 rounded-full bg-[var(--store-accent,#e96f95)] px-4 py-3 text-sm font-bold text-[var(--store-accent-text,#fff)] transition hover:brightness-95">
                      {t("cart.irPagamento")} <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </aside>
        </div>
      )}

      {/* Rodapé editorial inspirado na organização da DroidStore, com a identidade da loja. */}
      {normalizedStorePath !== "/loja/finalizar" && <footer id="atendimento" className="relative mt-auto overflow-hidden border-t border-rose-100 bg-white py-10 text-[#6b5b5a]">
        <div className="pointer-events-none absolute inset-x-0 -bottom-3 select-none whitespace-nowrap text-center text-[6.5rem] font-black leading-none tracking-[0.02em] text-[#f8dde5]/35 sm:-bottom-20 sm:text-[15rem]">DB</div>
        <div className="relative mx-auto w-[94%] max-w-[1440px] px-4">
          <div className="hidden gap-9 md:grid md:grid-cols-[1.25fr_.8fr_1fr_1fr]">
            <div>
              <img src={info?.logoUrl || "/branding/db-cosmetics-logo.png"} alt={info?.storeName || "Logo da loja"} className="h-28 w-44 object-contain object-left" />
              <p className="mt-3 max-w-sm text-sm leading-6 text-[#6b5b5a]/75">Beleza, cuidado e fragrâncias selecionadas para valorizar cada momento.</p>
            </div>
            <div>
              <h3 className="mb-4 text-sm font-bold text-[#463c3b]">Categorias</h3>
              <div className="space-y-2 text-sm text-[#6b5b5a]/80">
                {categories.slice(0, 6).map((category) => (
                  <Link key={category.id} to={`/loja/catalogo?cat=${category.id}`} className="block transition hover:text-[var(--store-accent,#e96f95)]">{translateCategoryName(category.name, i18nInstance.language)}</Link>
                ))}
              </div>
            </div>
            <div>
              <h3 className="mb-4 text-sm font-bold text-[#463c3b]">Pagamento seguro</h3>
              <p className="mb-4 text-sm text-[#6b5b5a]/75">Ambiente protegido para suas compras.</p>
              <div className="flex flex-wrap gap-2">
                {["VISA", "MASTER", "PIX", "AMEX"].map((method) => <span key={method} className="rounded-md border border-stone-200 bg-white px-3 py-2 text-[10px] font-extrabold text-[#6b5b5a] shadow-sm">{method}</span>)}
              </div>
            </div>
            <div>
              <h3 className="mb-4 text-sm font-bold text-[#463c3b]">Atendimento</h3>
              <p className="mb-4 text-sm text-[#6b5b5a]/75">Fale com a {info?.storeName || "nossa loja"}.</p>
              <div className="flex gap-2">
                {wa && <a href={wa} target="_blank" rel="noreferrer" aria-label="WhatsApp" className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--store-accent,#e96f95)] text-[var(--store-accent,#e96f95)] transition hover:bg-rose-50"><MessageCircle className="h-5 w-5" /></a>}
                {instagram && <a href={instagram} target="_blank" rel="noreferrer" aria-label="Instagram" className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--store-accent,#e96f95)] text-[var(--store-accent,#e96f95)] transition hover:bg-rose-50"><Instagram className="h-5 w-5" /></a>}
                {info?.email && <a href={`mailto:${info.email}`} aria-label="E-mail" className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--store-accent,#e96f95)] text-[var(--store-accent,#e96f95)] transition hover:bg-rose-50"><Mail className="h-5 w-5" /></a>}
              </div>
            </div>
          </div>

          <div className="mt-7 grid grid-cols-4 divide-x divide-rose-100 border-y border-rose-100 py-3">
            {[
              [ShieldCheck, "Compra 100% segura", "Seus dados protegidos"],
              [Award, "Produtos de qualidade", "Seleção e procedência"],
              [Truck, "Envio para todo o Brasil", "Entrega rápida e rastreada"],
              [Headphones, "Atendimento especializado", "Antes e depois da compra"],
            ].map(([Icon, title, description]: any) => (
              <div key={title} className="flex min-w-0 flex-col items-center gap-1 px-1 py-2 text-center sm:flex-row sm:gap-3 sm:px-5 sm:text-left">
                <Icon className="h-5 w-5 shrink-0 text-[var(--store-accent,#e96f95)] sm:h-6 sm:w-6" />
                <div className="min-w-0"><div className="text-[7px] font-bold leading-tight text-[#463c3b] min-[390px]:text-[8px] sm:text-xs">{title}</div><div className="mt-0.5 hidden text-[10px] text-[#6b5b5a]/65 sm:block">{description}</div></div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-col items-center justify-between gap-3 text-center sm:flex-row sm:text-left">
            <EditableFooterText footerText={footerText} storeName={info?.storeName} />
            <div className="flex items-center gap-2 text-[10px] text-[#6b5b5a]/60"><ShieldCheck className="h-3.5 w-3.5" /> Compra protegida por SSL</div>
          </div>
        </div>
      </footer>}

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-rose-100 bg-white/95 px-2 pb-[max(.35rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-8px_30px_rgba(80,35,50,.08)] backdrop-blur md:hidden">
        {[
          ["Início", "/loja", Home, normalizedStorePath === "/loja"],
          ["Categorias", "/loja/catalogo", LayoutGrid, normalizedStorePath === "/loja/catalogo" && !new URLSearchParams(location.search).get("canal")],
          ["Ofertas", "/loja/catalogo?canal=oferta", Tag, normalizedStorePath === "/loja/catalogo" && new URLSearchParams(location.search).get("canal") === "oferta"],
          ["Conta", "/loja/conta", User, normalizedStorePath.startsWith("/loja/conta")],
        ].map(([label, path, Icon, active]: any) => (
          <Link
            key={label}
            to={path}
            aria-current={active ? "page" : undefined}
            className={`flex flex-col items-center gap-0.5 py-1 text-[10px] font-semibold transition ${active ? "text-[var(--store-accent,#e96f95)]" : "text-stone-500 hover:text-[var(--store-accent,#e96f95)]"}`}
          >
            <Icon className={`h-5 w-5 ${active ? "fill-[var(--store-accent,#e96f95)]/12" : ""}`} /> {label}
          </Link>
        ))}
      </nav>

      <AssistantWidget wa={wa} />
    </div>
  );
}
