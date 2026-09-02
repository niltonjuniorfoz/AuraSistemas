import React, { useEffect, useMemo, useRef, useState } from "react";
import { Outlet, Link, useNavigate, useLocation } from "react-router";
import {
  ShoppingBag, Search, Plus, Minus, Trash2, X, Package, Loader2, ArrowRight, MessageCircle, ShieldCheck, Store, User, Sparkles, ArrowLeftRight, Check,
  Truck, Heart, Home, LayoutGrid, Tag,
} from "lucide-react";
import { useShopCart, cartTotal, cartCount } from "../../stores/shopCart";
import { useCustomerAuthStore } from "../../stores/customerAuth";
import { useWishlistStore } from "../../stores/wishlist";
import { storeApiFetch } from "../../lib/storeApi";
import { isValidCpf, formatCpf, isFullName, onlyDigits } from "../../lib/cpf";
import { APP_VERSION } from "../../lib/version";
import { toast } from "../../components/Toast";
import { AccountAuth } from "./account/AccountAuth";
import { AssistantWidget } from "./AssistantWidget";
import { PremiumCta } from "./PremiumCta";
import { useTranslation } from "react-i18next";
import i18nInstance, { translateCategoryName } from "./i18n";
import { useStorePrefs, formatPrice, CURRENCIES, defaultRates } from "../../stores/storePrefs";
import { calcOrderTotal } from "../../lib/money";
import { useEditMode } from "./editor/EditModeContext";
import { Editable } from "./editor/Editable";
import { effectiveHomeSections } from "./editor/elementCatalog";
import { TextPanel } from "./editor/panels/TextPanel";
import { ColorsPanel } from "./editor/panels/ColorsPanel";
import { FontsPanel } from "./editor/panels/FontsPanel";
import { applyStoreColors } from "./editor/storeTheme";
import { applyStoreFonts } from "./editor/applyStoreFonts";
import { BrazilFlag, ParaguayFlag, CodeFlag } from "./flagIcons";

// Casca da loja pública: visual PRÓPRIO claro (separado do ERP), carrinho e
// checkout disponíveis em todas as páginas da vitrine.
const LANGS = [
  { code: "es", flag: "🇵🇾", label: "Español" },
  { code: "pt", flag: "🇧🇷", label: "Português" },
  { code: "en", flag: "🇺🇸", label: "English" },
];

// Idioma escolhido já define a moeda principal (pedido do usuário: um seletor
// só, não dois) — Espanhol→Guarani, Português→Real, Inglês→Dólar. O cliente
// ainda pode sobrescrever a moeda manualmente pelas opções secundárias do
// mesmo seletor; só a troca de IDIOMA reseta pra este padrão.
const LANG_DEFAULT_CURRENCY: Record<string, string> = { es: "PYG", pt: "BRL", en: "USD" };

const CURRENCY_SYMBOL: Record<string, string> = { BRL: "R$", PYG: "G$", USD: "$" };

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
  const [selectorOpen, setSelectorOpen] = useState(false);
  const currentLang = LANGS.find((l) => l.code === i18nInstance.language) || LANGS[0];
  const { currency, setCurrency, rates, setRates } = useStorePrefs();
  const changeLang = (lng: string) => {
    i18nInstance.changeLanguage(lng);
    localStorage.setItem("storeLang", lng);
    if (LANG_DEFAULT_CURRENCY[lng]) setCurrency(LANG_DEFAULT_CURRENCY[lng]);
    setSelectorOpen(false);
  };
  const navigate = useNavigate();
  // Dentro do editor, navegação programática também precisa ficar sob
  // /store-settings/editor/... — links <a> são tratados pelo interceptador
  // do StoreEditor, mas navigate() não passa por clique.
  const storePath = (p: string) => (editCtx ? p.replace(/^\/loja/, "/store-settings/editor") : p);
  const location = useLocation();
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
      info.currencies.forEach((c: any) => newRates[c.code] = Number(c.rateToUsd));
      setRates(newRates);
    }
  }, [info]);
  const [categories, setCategories] = useState<any[]>([]);
  const [ofertaOutlet, setOfertaOutlet] = useState({ hasOferta: false, hasOutlet: false });
  const { items, open, setOpen, setQty, clear } = useShopCart();
  const customer = useCustomerAuthStore((s) => s.customer);
  const logoutCustomer = useCustomerAuthStore((s) => s.logout);
  const setWishlistIds = useWishlistStore((s) => s.setIds);
  const resetWishlist = useWishlistStore((s) => s.reset);
  useEffect(() => {
    if (!customer) { resetWishlist(); return; }
    storeApiFetch("/api/store/account/wishlist").then((r) => r.json())
      .then((rows) => setWishlistIds(Array.isArray(rows) ? rows.map((r: any) => r.productId) : []))
      .catch(() => {});
  }, [customer?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const [checkout, setCheckout] = useState(false);
  const [form, setForm] = useState({ deliveryType: "PICKUP", cep: "", street: "", number: "", neighborhood: "", city: "", state: "", address: "", notes: "" });
  const [shippingOptions, setShippingOptions] = useState([]);
  const [selectedShippingId, setSelectedShippingId] = useState("");
  const [loadingShipping, setLoadingShipping] = useState(false);
  const [cepError, setCepError] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [announcement, setAnnouncement] = useState("");
  const [footerText, setFooterText] = useState("");
  const [themeColorsFromInfo, setThemeColorsFromInfo] = useState<Record<string, string>>({});
  const [themeFontsFromInfo, setThemeFontsFromInfo] = useState<{ heading?: { url: string; family: string }; body?: { url: string; family: string } }>({});
  const [pagesFromInfo, setPagesFromInfo] = useState<any>(null);
  const [precisaAtualizar, setPrecisaAtualizar] = useState(false);
  const [terms, setTerms] = useState<{ termsText: string; termsVersion: string }>({ termsText: "", termsVersion: "" });
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [payerIsBuyer, setPayerIsBuyer] = useState(true);
  const [payer, setPayer] = useState({ name: "", cpf: "" });
  const [termsOpen, setTermsOpen] = useState(false);
  const [zones, setZones] = useState<any[]>([]);
  const [zoneId, setZoneId] = useState("");
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [couponMsg, setCouponMsg] = useState("");
  const [checkingCoupon, setCheckingCoupon] = useState(false);


  const handleCepChange = async (cepValue) => {
    const rawCep = cepValue.replace(/\D/g, "");
    setForm(prev => ({ ...prev, cep: cepValue }));
    if (rawCep.length === 8) {
      setLoadingShipping(true);
      setCepError("");
      try {
        const res = await fetch(`https://viacep.com.br/ws/${rawCep}/json/`);
        const data = await res.json();
        if (data.erro) {
          setCepError(t("checkout.cepNaoEncontrado", "CEP não encontrado."));
          setShippingOptions([]);
          setSelectedShippingId("");
        } else {
          setForm(prev => ({ ...prev, street: data.logradouro || "", neighborhood: data.bairro || "", city: data.localidade || "", state: data.uf || "" }));
          const shipRes = await fetch('/api/store/shipping/calculate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cep: rawCep, items })
          });
          if (shipRes.ok) {
            const shipData = await shipRes.json();
            setShippingOptions(shipData.options || []);
            if (shipData.options?.length > 0) {
              setSelectedShippingId(shipData.options[0].id);
            }
          }
        }
      } catch (e) {
        setCepError("Erro ao buscar CEP.");
      } finally {
        setLoadingShipping(false);
      }
    } else {
      setShippingOptions([]);
      setSelectedShippingId("");
    }
  };

  useEffect(() => {
    fetch("/api/store/info").then((r) => r.json()).then((j) => {
      setInfo(j);
      // Página aberta antes de uma atualização: o formulário daqui pode não ter
      // campos que o servidor já exige. Avisa em vez de deixar o cliente travado.
      if (j?.appVersion && j.appVersion !== APP_VERSION) setPrecisaAtualizar(true);
    }).catch(() => {}).finally(() => setInfoLoading(false));
    fetch("/api/store/config").then((r) => r.json()).then((c) => {
      setAnnouncement(String(c?.announcement || ""));
      setFooterText(String(c?.footerText || ""));
      setTerms({ termsText: String(c?.termsText || ""), termsVersion: String(c?.termsVersion || "") });
      setThemeColorsFromInfo(c?.theme?.colors || {});
      setThemeFontsFromInfo(c?.theme?.fonts || {});
      setPagesFromInfo(c?.pages || null);
    }).catch(() => {});
    fetch("/api/store/categories").then((r) => r.json()).then((j) => setCategories(j.data || [])).catch(() => {});
    fetch("/api/store/shipping-zones").then((r) => r.json()).then((j) => setZones(j.data || [])).catch(() => {});
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
  const selectedZone = zones.find((z) => z.id === zoneId) || null;
  const shippingFee = form.deliveryType === "DELIVERY" && selectedZone ? Number(selectedZone.feeBrl) : 0;
  const discount = coupon ? coupon.discount : 0;
  const total = calcOrderTotal(subtotal, discount, shippingFee);

  // Chamada única do /coupon/preview — antes o efeito de revalidação e o
  // botão "Aplicar" montavam/tratavam essa mesma requisição cada um do seu
  // jeito, e já tinham divergido em como reagiam a erro.
  const previewCoupon = async (code: string, subtotalValue: number) => {
    const r = await fetch("/api/store/coupon/preview", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, subtotal: subtotalValue }),
    });
    const j = await r.json();
    return { ok: r.ok, code: j.code, discount: j.discount, error: j.error };
  };

  // Cupom perde validade se o subtotal muda (item removido etc.) — revalida silenciosamente.
  // Guarda "alive" evita que uma resposta atrasada de um subtotal antigo
  // sobrescreva o resultado (já correto) de uma checagem mais nova.
  useEffect(() => {
    if (!coupon) return;
    let alive = true;
    (async () => {
      try {
        const j = await previewCoupon(coupon.code, subtotal);
        if (!alive) return;
        if (j.ok) setCoupon({ code: j.code, discount: j.discount });
        else { setCoupon(null); setCouponMsg(j.error || t("checkout.cupomExpirado", "Cupom deixou de valer pra esse carrinho.")); }
      } catch { /* mantém como está */ }
    })();
    return () => { alive = false; };
  }, [subtotal]); // eslint-disable-line react-hooks/exhaustive-deps

  const applyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    setCheckingCoupon(true); setCouponMsg("");
    try {
      const j = await previewCoupon(code, subtotal);
      if (!j.ok) { setCoupon(null); setCouponMsg(j.error || t("checkout.cupomInvalido", "Cupom inválido.")); }
      else { setCoupon({ code: j.code, discount: j.discount }); setCouponMsg(""); setCouponInput(""); }
    } catch { setCouponMsg(t("checkout.cupomErroValidar", "Não consegui validar o cupom. Tenta de novo.")); }
    finally { setCheckingCoupon(false); }
  };

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(storePath(`/loja/catalogo${searchTerm.trim() ? `?busca=${encodeURIComponent(searchTerm.trim())}` : ""}`));
  };

  const submitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    // O editor NUNCA cria pedido de verdade — admin visualizando não é cliente.
    if (editCtx) { toast.error("Finalização de pedido desativada dentro do editor."); return; }
    setError("");
    if (items.length === 0) { setError(t("checkout.erroCarrinhoVazio")); return; }
    if (!customer) { setError(t("account.precisaEntrar")); return; }
    if (!payerIsBuyer && (!isFullName(payer.name) || !isValidCpf(payer.cpf))) {
      setError(t("checkout.erroPagador"));
      return;
    }
    if (!acceptedTerms) { setError(t("checkout.erroTermos")); return; }
    if (form.deliveryType === "DELIVERY" && zones.length > 0 && !zoneId) { setError(t("checkout.erroRegiao")); return; }
    setSending(true);
    try {
      const r = await storeApiFetch("/api/store/orders", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          acceptedTerms: true,
          payerIsBuyer,
          payerDeclaredName: payerIsBuyer ? undefined : payer.name,
          payerDeclaredCpf: payerIsBuyer ? undefined : onlyDigits(payer.cpf),
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          couponCode: coupon?.code || undefined,
          shippingZoneId: form.deliveryType === "DELIVERY" && zoneId ? zoneId : undefined,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || t("checkout.erroPedido"));
      clear();
      setOpen(false);
      setCheckout(false);
      navigate(`/loja/pedido/${j.code}`);
    } catch (err: any) { setError(err.message); }
    finally { setSending(false); }
  };

  const wa = info?.whatsapp ? `https://wa.me/${String(info.whatsapp).replace(/\D/g, "")}` : null;

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

      {/* Fecha o seletor ao clicar fora. PRECISA ter z-index MENOR que o do
          <header> (z-30) — o header cria seu próprio contexto de empilhamento
          (sticky + z-index), então um irmão do header com z maior "ganha" do
          header inteiro, inclusive do painel z-50 lá dentro, mesmo o painel
          aparecendo por cima visualmente (esse overlay é transparente). Isso
          deixava o menu impossível de clicar de verdade (só funcionava
          chamando o onClick direto por código) — bug real, não achado antes
          porque só aparece em clique de ponteiro de verdade, não em teste
          automatizado que invoca o handler direto. */}
      {selectorOpen && (
        <div className="fixed inset-0 z-20" onClick={() => setSelectorOpen(false)} />
      )}

      {/* Topo — tudo numa linha só (pedido explícito: nada acima da logo).
          Cotações + Falar com Vendas ficam discretos colados na logo; busca
          continua sendo a prioridade visual, com o selo de aviso ao lado;
          moeda/idioma (antes numa barra separada) entram discretos perto dos
          ícones da direita. Dúvidas/Sobre nós mudou pro rodapé (pedido do
          usuário), junto dos outros links de rodapé. */}
      <header className="sticky top-0 z-30 bg-[var(--store-header-bg,#ffffff)]/95 shadow-sm backdrop-blur">
        <div className="border-b border-rose-100 bg-[var(--store-accent,#e96f95)]/12">
          <div className="mx-auto flex min-h-8 w-[95%] max-w-[1600px] items-center justify-center gap-4 px-4 sm:justify-between">
            <EditableAnnouncementBar announcement={announcement} pages={pagesFromInfo} />
            <div className="hidden items-center gap-4 text-[10px] font-semibold text-[var(--store-header-text,#2f2729)] md:flex">
              {wa && <a href={wa} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-[var(--store-accent,#e96f95)]"><MessageCircle className="h-3 w-3" /> WhatsApp</a>}
              <Link to="/loja/conta/pedidos" className="hover:text-[var(--store-accent,#e96f95)]">Meus pedidos</Link>
              <Link to="/loja/conta" className="hover:text-[var(--store-accent,#e96f95)]">Minha conta</Link>
            </div>
          </div>
        </div>
        <div className="border-b border-stone-200">
          <div className="mx-auto flex w-[95%] max-w-[1600px] items-center gap-3 px-4 py-3 lg:gap-6">
          <Link to="/loja" className="flex shrink-0 items-center gap-2.5">
            {infoLoading ? (
              <span className="h-14 w-32 shrink-0 animate-pulse rounded-xl bg-rose-100" />
            ) : (
              <img
                src={info?.logoUrl || "/branding/db-cosmetics-logo.png"}
                alt={info?.storeName || "Cosmetics by Jessica Ferreira"}
                className="h-16 w-28 shrink-0 object-contain sm:h-20 sm:w-36"
              />
            )}
          </Link>

          {/* Cotações + Falar com Vendas — discretos, colados na logo.
              Bandeira sozinha, sem fundo dourado atrás (pedido do usuário:
              o círculo dourado só faz sentido pros ícones da Categorias/
              Entrar/Carrito, na bandeira ele sobrava). Espaçamento maior
              entre os grupos pra não ficar tudo colado (outro pedido). */}
          <div className="hidden shrink-0 items-center gap-5 border-l border-stone-200 pl-4 xl:flex">
            {/* Caixa única "Cotação do dia" (pedido do usuário) - rótulo
                traduzido por idioma, cada moeda na sua caixinha por dentro. */}
            <div className="flex flex-col items-center gap-1.5 rounded-lg border border-stone-200 bg-stone-50/60 px-2.5 py-1.5">
              <span className="text-[9px] font-bold uppercase tracking-wider text-stone-400">{t("header.cotacaoDoDia")}</span>
              <div className="flex items-center gap-2">
                <div className="flex w-[86px] flex-col items-center gap-1 rounded-md border border-stone-200 bg-white px-2 py-1 text-stone-600">
                  <ParaguayFlag className="h-6 w-9 rounded-[3px] shadow-[0_0_0_1px_rgba(0,0,0,0.08)]" />
                  <span className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-wide">G$ {rates.PYG ? rates.PYG.toLocaleString('es-PY') : '---'}</span>
                </div>
                <div className="flex w-[86px] flex-col items-center gap-1 rounded-md border border-stone-200 bg-white px-2 py-1 text-stone-600">
                  <BrazilFlag className="h-6 w-9 rounded-[3px] shadow-[0_0_0_1px_rgba(0,0,0,0.08)]" />
                  <span className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-wide">R$ {rates.BRL ? rates.BRL.toFixed(2) : '---'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="hidden flex-1 items-center justify-center gap-2 sm:flex">
            <form onSubmit={submitSearch} className="relative w-full max-w-xs lg:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder={t("header.buscarPlaceholder")}
                className="h-10 w-full rounded-full border border-stone-200 bg-stone-100 pl-10 pr-4 text-sm outline-none transition focus:border-[var(--store-accent,#C99C5A)] focus:bg-white" />
            </form>
          </div>

          <div className="ml-auto flex items-center gap-3 sm:ml-0 sm:gap-[25px]">

            {/* Idioma + moeda num seletor só (pedido do usuário): o idioma já
                define a moeda principal (es→PYG, pt→BRL, en→USD); a seção
                "Outras moedas", menor e embaixo, deixa trocar a moeda na mão
                sem mexer no idioma. Badge fechado mostra bandeira da moeda
                atual (o que o cliente vai ver nos preços) + o código. */}
            <div className="relative flex h-11 items-center">
              {/* Ícone sozinho no fluxo (h-11, igual aos vizinhos) e o rótulo
                  posicionado absoluto embaixo — antes o rótulo dentro do fluxo
                  empurrava esse botão pra ~11px acima da linha da busca/logo,
                  os 4 ícones da direita ficavam desalinhados com o resto do
                  header (achado real, não só a bandeira). */}
              <button type="button" onClick={() => setSelectorOpen((v) => !v)} aria-expanded={selectorOpen} aria-haspopup="menu" aria-label={t("header.idiomaMoeda", "Idioma e moeda")}
                className="relative flex h-11 items-center text-stone-600 hover:text-stone-900">
                <span className={`relative flex h-11 w-11 items-center justify-center rounded-full transition ${selectorOpen ? "ring-2 ring-[var(--store-accent,#C99C5A)] ring-offset-2" : ""}`}>
                  <CodeFlag code={currency} className="h-11 w-11 rounded-full shadow-[0_0_0_1px_rgba(0,0,0,0.08)]" />
                  <ArrowLeftRight className="absolute -bottom-1.5 -right-1.5 h-4 w-4 rounded-full border border-stone-200 bg-white p-0.5 text-[var(--store-accent,#C99C5A)] shadow-sm" />
                </span>
                <span className="absolute left-1/2 top-full mt-1.5 hidden -translate-x-1/2 whitespace-nowrap text-[10px] font-semibold uppercase tracking-wide sm:block">{currency} / {CURRENCY_SYMBOL[currency]}</span>
              </button>
              {selectorOpen && (
                <div className="absolute right-0 top-[64px] z-50 w-48 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xl">
                  <div className="flex flex-col py-1.5">
                    {LANGS.map((l) => (
                      <button key={l.code} onClick={() => changeLang(l.code)} className={`flex items-center gap-2 px-3 py-2 text-left text-sm font-medium transition ${l.code === currentLang.code ? "bg-[var(--store-accent,#C99C5A)]/10 text-stone-900" : "text-stone-600 hover:bg-stone-50"}`}>
                        <CodeFlag code={l.code} className="h-3.5 w-5 shrink-0 rounded-[1px]" />
                        <span className="flex-1">{l.label}</span>
                        {l.code === currentLang.code && <Check className="h-3.5 w-3.5 text-[var(--store-accent,#C99C5A)]" />}
                      </button>
                    ))}
                  </div>
                  <div className="border-t border-stone-100 bg-stone-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-stone-400">{t("header.outrasMoedas", "Outras moedas")}</div>
                  <div className="flex flex-col py-1.5">
                    {CURRENCIES.map((c) => (
                      <button key={c.code} onClick={() => { setCurrency(c.code); setSelectorOpen(false); }} className={`flex items-center gap-2 px-3 py-1.5 text-left text-xs font-medium transition ${c.code === currency ? "bg-[var(--store-accent,#C99C5A)]/10 text-stone-900" : "text-stone-500 hover:bg-stone-50"}`}>
                        <CodeFlag code={c.code} className="h-3 w-[18px] shrink-0 rounded-[1px]" />
                        <span className="flex-1 tracking-wide">{c.code} <span className="text-stone-400">({CURRENCY_SYMBOL[c.code]})</span></span>
                        {c.code === currency && <Check className="h-3 w-3 text-[var(--store-accent,#C99C5A)]" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <Link to="/loja/catalogo" className="relative hidden h-11 items-center text-stone-600 hover:text-stone-900 sm:flex">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--store-accent,#C99C5A)] text-[var(--store-accent-text,#ffffff)] shadow-sm transition hover:brightness-95">
                <Package className="h-5 w-5" />
              </span>
              <span className="absolute left-1/2 top-full mt-1.5 -translate-x-1/2 whitespace-nowrap text-[10px] font-semibold uppercase tracking-wide">{t("header.categorias")}</span>
            </Link>
            <Link to="/loja/conta" className="relative hidden h-11 items-center text-stone-600 hover:text-stone-900 sm:flex">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--store-accent,#C99C5A)] text-[var(--store-accent-text,#ffffff)] shadow-sm transition hover:brightness-95">
                <User className="h-5 w-5" />
              </span>
              <span className="absolute left-1/2 top-full mt-1.5 max-w-[70px] -translate-x-1/2 truncate whitespace-nowrap text-[10px] font-semibold uppercase tracking-wide">{customer ? customer.name.split(" ")[0] : t("account.entrar")}</span>
            </Link>
            <Link to="/loja/conta/favoritos" className="relative hidden h-11 items-center text-stone-600 hover:text-stone-900 lg:flex">
              <span className="flex h-11 w-11 items-center justify-center rounded-full border border-rose-100 bg-white text-[var(--store-accent,#e96f95)] shadow-sm transition hover:bg-rose-50">
                <Heart className="h-5 w-5" />
              </span>
              <span className="absolute left-1/2 top-full mt-1.5 -translate-x-1/2 whitespace-nowrap text-[10px] font-semibold uppercase tracking-wide">Favoritos</span>
            </Link>
            <button onClick={() => setOpen(true)} className="relative flex h-11 items-center text-stone-600 hover:text-stone-900">
              <span className="relative flex h-11 w-11 items-center justify-center rounded-full bg-[var(--store-accent,#C99C5A)] text-[var(--store-accent-text,#ffffff)] shadow-sm transition hover:brightness-95">
                <ShoppingBag className="h-5 w-5" />
                {count > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-stone-900 px-1 text-[10px] font-black text-white">
                    {count}
                  </span>
                )}
              </span>
              <span className="absolute left-1/2 top-full mt-1.5 hidden -translate-x-1/2 whitespace-nowrap text-[10px] font-semibold uppercase tracking-wide sm:block">{t("header.carrinho")}</span>
            </button>
          </div>
          </div>
        </div>
        <form onSubmit={submitSearch} className="px-4 pb-3 sm:hidden">
          <div className="relative border-b border-stone-200">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder={t("header.buscarPlaceholder")}
              className="h-10 w-full rounded-sm border border-stone-200 bg-stone-100 pl-9 pr-4 text-sm outline-none focus:border-[var(--store-accent,#C99C5A)] focus:bg-white" />
          </div>
        </form>

        {/* Sub-header Categorias — barra dourada. Editorial, não SaaS: sem
            caixa/fundo nenhum no item — só o texto, e no hover uma linha
            fina desliza da esquerda pra direita por baixo (scale-x-0 →
            scale-x-100 com origin-left), com o texto ganhando leve
            letter-spacing extra. */}
        <div className="hidden bg-[var(--store-accent,#e96f95)] md:block">
          <div className="mx-auto flex w-[95%] max-w-[1600px] items-center gap-6 overflow-x-auto whitespace-nowrap px-4 py-3 text-[0.825rem] font-bold uppercase tracking-wider text-[var(--store-accent-text,#ffffff)] scrollbar-hide">
            <Link to="/loja/catalogo" className="group relative inline-block pb-1">
              <span className="transition-all duration-300 group-hover:tracking-[0.15em]">{t("header.categorias")}</span>
              <span className="absolute bottom-0 left-0 h-px w-full origin-left scale-x-0 bg-white transition-transform duration-300 ease-out group-hover:scale-x-100" />
            </Link>
            <div className="h-4 w-px shrink-0 bg-white/30"></div>
            {[...categories]
              .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0) || translateCategoryName(a.name, i18nInstance.language).localeCompare(translateCategoryName(b.name, i18nInstance.language)))
              .slice(0, 8).map(c => (
              <Link key={c.id} to={`/loja/catalogo?cat=${c.id}`} className="group relative inline-block pb-1">
                <span className="transition-all duration-300 group-hover:tracking-[0.15em]">{translateCategoryName(c.name, i18nInstance.language)}</span>
                <span className="absolute bottom-0 left-0 h-px w-full origin-left scale-x-0 bg-white transition-transform duration-300 ease-out group-hover:scale-x-100" />
              </Link>
            ))}
            {categories.length > 8 && (
              <Link to="/loja/catalogo" className="group relative inline-block pb-1">
                <span className="transition-all duration-300 group-hover:tracking-[0.15em]">{t("header.verTodas")}</span>
                <span className="absolute bottom-0 left-0 h-px w-full origin-left scale-x-0 bg-white transition-transform duration-300 ease-out group-hover:scale-x-100" />
              </Link>
            )}
            {ofertaOutlet.hasOferta && (
              <Link to="/loja/catalogo?canal=oferta" className="group relative inline-block pb-1">
                <span className="transition-all duration-300 group-hover:tracking-[0.15em]">🔥 Ofertas</span>
                <span className="absolute bottom-0 left-0 h-px w-full origin-left scale-x-0 bg-white transition-transform duration-300 ease-out group-hover:scale-x-100" />
              </Link>
            )}
            {ofertaOutlet.hasOutlet && (
              <Link to="/loja/catalogo?canal=outlet" className="group relative inline-block pb-1">
                <span className="transition-all duration-300 group-hover:tracking-[0.15em]">📦 Outlet</span>
                <span className="absolute bottom-0 left-0 h-px w-full origin-left scale-x-0 bg-white transition-transform duration-300 ease-out group-hover:scale-x-100" />
              </Link>
            )}
          </div>
        </div>
      </header>

      <Outlet context={{ info }} />
      <ColorsPanel />
      <FontsPanel />
      <TextPanel panelKey="footer" title="Rodapé" fieldKey="footerText" maxLength={200} placeholder="© Nome da loja. Todos os direitos reservados." />





      {/* Carrinho / Checkout */}
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end bg-stone-900/40 backdrop-blur-sm" onClick={() => !sending && setOpen(false)}>
          <aside className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-stone-200 p-4">
              <h2 className="flex items-center gap-2 text-lg font-bold" style={{ fontFamily: "var(--store-font-heading, 'Barlow Condensed'), sans-serif", textTransform: "uppercase" }}>
                <ShoppingBag className="h-5 w-5 text-stone-900" /> {checkout ? t("cart.finalizarPedidoTitulo") : t("cart.titulo")}
              </h2>
              <button onClick={() => setOpen(false)} className="rounded-sm p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700"><X className="h-4 w-4" /></button>
            </div>

            {items.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center text-stone-500">
                <ShoppingBag className="h-12 w-12 text-stone-300" />
                <p className="text-sm">{t("cart.vazio")}</p>
                <button onClick={() => { setOpen(false); navigate(storePath("/loja/catalogo")); }} className="rounded-sm border border-stone-300 px-4 py-2 text-sm font-medium hover:border-stone-500">{t("cart.verProdutos")}</button>
              </div>
            ) : !checkout ? (
              <>
                <div className="flex-1 space-y-2 overflow-y-auto p-4">
                  {items.map((i) => (
                    <div key={i.productId} className="flex gap-3 rounded-sm border border-stone-200 bg-stone-50 p-2.5">
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-sm bg-white">
                        {i.imageUrl ? <img src={i.imageUrl} alt="" className="h-full w-full object-cover" />
                          : <div className="flex h-full items-center justify-center"><Package className="h-5 w-5 text-stone-300" /></div>}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="line-clamp-2 text-xs font-medium">{i.name}</div>
                        <div className="mt-0.5 text-sm font-bold text-stone-900">{formatPrice(i.price * i.quantity, currency, rates)}</div>
                        <div className="mt-1 flex items-center gap-1">
                          <button onClick={() => setQty(i.productId, i.quantity - 1)} className="flex h-6 w-6 items-center justify-center rounded-sm border border-stone-300 hover:border-stone-500"><Minus className="h-3 w-3" /></button>
                          <span className="w-7 text-center text-xs font-bold">{i.quantity}</span>
                          <button onClick={() => setQty(i.productId, i.quantity + 1)} disabled={i.quantity >= i.maxQty} className="flex h-6 w-6 items-center justify-center rounded-sm border border-stone-300 hover:border-stone-500 disabled:opacity-40"><Plus className="h-3 w-3" /></button>
                          <button onClick={() => setQty(i.productId, 0)} className="ml-auto flex h-6 w-6 items-center justify-center rounded-sm text-red-500 hover:bg-red-50"><Trash2 className="h-3 w-3" /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-stone-200 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm text-stone-500">{t("cart.subtotal")}</span>
                    <span className="text-2xl font-black text-stone-900">{formatPrice(subtotal, currency, rates)}</span>
                  </div>
                  <button onClick={() => setCheckout(true)} className="flex w-full items-center justify-center gap-2 rounded-sm bg-stone-900 py-3 text-sm font-bold text-white transition hover:bg-stone-800">
                    {t("cart.finalizar")} <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </>
            ) : (
              !customer ? (
                <div className="flex flex-1 flex-col overflow-hidden">
                  <div className="flex-1 overflow-y-auto p-4">
                    {/* Nunca um <form> aqui dentro: isso é irmão do <form> de baixo, não filho —
                        um <form> dentro de outro <form> é HTML inválido e quebra o React (o
                        AccountAuth tem os próprios <form> por etapa, reaproveitados também
                        sozinho em /loja/conta). */}
                    <AccountAuth title={t("account.identifiqueSe")} onSuccess={() => {}} />
                  </div>
                  <div className="border-t border-stone-200 p-4">
                    <div className="mb-3 flex items-center justify-between text-sm">
                      <span className="text-stone-500">{t("checkout.total")}</span>
                      <span className="text-2xl font-black text-stone-900">{formatPrice(total, currency, rates)}</span>
                    </div>
                    <button type="button" onClick={() => setCheckout(false)} className="w-full rounded-sm border border-stone-300 px-4 py-3 text-sm font-semibold text-stone-600 hover:border-stone-500">{t("checkout.voltarBtn")}</button>
                  </div>
                </div>
              ) : (
              <form onSubmit={submitOrder} className="flex flex-1 flex-col overflow-hidden">
                <div className="flex-1 space-y-3 overflow-y-auto p-4">
                  <div className="flex items-center justify-between rounded-sm border border-emerald-300 bg-emerald-50 px-3 py-2.5">
                    <span className="text-sm text-stone-700">{t("account.comprandoComo", { name: customer.name.split(" ")[0] })} <span className="text-emerald-700">✓</span></span>
                    <button type="button" onClick={logoutCustomer} className="text-xs font-semibold text-stone-500 hover:underline">{t("account.sair")}</button>
                  </div>

                  {/* Quem paga o PIX — se for outra pessoa, registramos a autorização */}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-stone-500">{t("checkout.quemPaga")}</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[[true, t("checkout.euMesmo")], [false, t("checkout.outraPessoa")]].map(([v, l]: any) => (
                        <button key={String(v)} type="button" onClick={() => setPayerIsBuyer(v)}
                          className={`rounded-sm border px-3 py-2.5 text-sm font-semibold transition ${payerIsBuyer === v ? "border-amber-600 bg-stone-100 text-amber-800" : "border-stone-300 text-stone-500 hover:border-stone-400"}`}>
                          {l}
                        </button>
                      ))}
                    </div>
                    {!payerIsBuyer && (
                      <div className="mt-2 space-y-2 rounded-sm border border-stone-300 bg-stone-50 p-3">
                        <p className="text-[11px] text-stone-500">
                          {t("checkout.outraPessoaAjuda")}
                        </p>
                        <input value={payer.name} onChange={(e) => setPayer({ ...payer, name: e.target.value })}
                          placeholder={t("checkout.nomePagadorPlaceholder")} required
                          className="h-10 w-full rounded-sm border border-stone-300 bg-white px-3 text-sm outline-none focus:border-amber-600" />
                        <input value={payer.cpf} onChange={(e) => setPayer({ ...payer, cpf: formatCpf(e.target.value) })}
                          placeholder={t("checkout.cpfPagadorPlaceholder")} inputMode="numeric" required
                          className={`h-10 w-full rounded-sm border bg-white px-3 text-sm outline-none focus:border-amber-600 ${payer.cpf && !isValidCpf(payer.cpf) ? "border-red-400" : "border-stone-300"}`} />
                        {payer.cpf && !isValidCpf(payer.cpf) && <p className="text-[11px] text-red-500">{t("checkout.cpfInvalido")}</p>}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-stone-500">{t("checkout.comoReceber")}</label>
                    {/* Sem nenhuma zona de frete cadastrada, "Entrega" nem aparece —
                        senão o pedido passa pelo formulário todo e falha só no final. */}
                    <div className={`grid gap-2 ${zones.length > 0 ? "grid-cols-2" : "grid-cols-1"}`}>
                      {(zones.length > 0 ? [["PICKUP", t("checkout.retirar")], ["DELIVERY", t("checkout.entrega")]] : [["PICKUP", t("checkout.retirar")]]).map(([v, l]) => (
                        <button key={v} type="button" onClick={() => setForm({ ...form, deliveryType: v })}
                          className={`rounded-sm border px-3 py-2.5 text-sm font-semibold transition ${form.deliveryType === v ? "border-amber-600 bg-stone-100 text-amber-800" : "border-stone-300 text-stone-500 hover:border-stone-400"}`}>
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                  {form.deliveryType === "DELIVERY" && (
                    <>
                      {zones.length > 0 && (
                        <div>
                          <label className="mb-1 block text-xs font-medium text-stone-500">{t("checkout.regiaoLabel")}</label>
                          <select value={zoneId} onChange={(e) => setZoneId(e.target.value)} required
                            className="h-10 w-full rounded-sm border border-stone-300 bg-white px-3 text-sm outline-none focus:border-amber-600">
                            <option value="">{t("checkout.escolherRegiao")}</option>
                            {zones.map((z) => (
                              <option key={z.id} value={z.id}>{z.name} — {Number(z.feeBrl) === 0 ? t("checkout.freteGratisOpcao") : formatPrice(z.feeBrl, currency, rates)}</option>
                            ))}
                          </select>
                        </div>
                      )}
                      <div>
                        <label className="mb-1 block text-xs font-medium text-stone-500">{t("checkout.enderecoLabel")}</label>
                        <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder={t("checkout.enderecoPlaceholder")} required
                          className="h-10 w-full rounded-sm border border-stone-300 bg-white px-3 text-sm outline-none focus:border-amber-600" />
                      </div>
                    </>
                  )}

                  {/* Cupom */}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-stone-500">{t("checkout.cupomLabel")}</label>
                    {coupon ? (
                      <div className="flex items-center justify-between rounded-sm border border-emerald-300 bg-emerald-50 px-3 py-2.5">
                        <span className="text-sm font-bold text-emerald-800">{coupon.code} <span className="font-normal">(−{formatPrice(coupon.discount, currency, rates)})</span></span>
                        <button type="button" onClick={() => { setCoupon(null); setCouponMsg(""); }} className="text-xs font-semibold text-red-500 hover:underline">{t("checkout.remover")}</button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input value={couponInput} onChange={(e) => setCouponInput(e.target.value.toUpperCase())} placeholder={t("checkout.cupomPlaceholder")}
                          className="h-10 min-w-0 flex-1 rounded-sm border border-stone-300 bg-white px-3 text-sm font-mono uppercase outline-none focus:border-amber-600" />
                        <button type="button" onClick={applyCoupon} disabled={checkingCoupon || !couponInput.trim()}
                          className="rounded-sm border border-stone-900 px-4 text-sm font-bold text-stone-900 hover:bg-stone-900 hover:text-white disabled:opacity-40">
                          {checkingCoupon ? "..." : t("checkout.aplicar")}
                        </button>
                      </div>
                    )}
                    {couponMsg && <p className="mt-1 text-xs text-red-500">{couponMsg}</p>}
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-stone-500">{t("checkout.obs")}</label>
                    <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder={t("checkout.obsPlaceholder")}
                      className="h-10 w-full rounded-sm border border-stone-300 bg-white px-3 text-sm outline-none focus:border-amber-600" />
                  </div>

                  <div className="space-y-1 border-t border-stone-200 pt-3 text-xs text-stone-500">
                    {items.map((i) => (
                      <div key={i.productId} className="flex justify-between"><span className="truncate pr-2">{i.quantity}× {i.name}</span><span>{formatPrice(i.price * i.quantity, currency, rates)}</span></div>
                    ))}
                  </div>
                  <div className="flex items-start gap-2 rounded-sm border border-stone-200 bg-stone-100 p-3 text-[11px] text-stone-600">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-stone-900" />
                    {t("checkout.proximaTelaNota")}
                  </div>

                  {/* Aceite dos termos — fica gravado no pedido com data, IP e aparelho */}
                  <label className={`flex cursor-pointer items-start gap-2.5 rounded-sm border p-3 transition ${acceptedTerms ? "border-emerald-300 bg-emerald-50" : "border-stone-300 bg-white"}`}>
                    <input type="checkbox" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-600" />
                    <span className="text-[11px] leading-relaxed text-stone-600">
                      {payerIsBuyer
                        ? t("checkout.termosEuMesmo")
                        : t("checkout.termosOutraPessoa", { nome: payer.name || t("checkout.pessoaInformadaAcima") })}{" "}
                      <button type="button" onClick={(e) => { e.preventDefault(); setTermsOpen(true); }} className="font-semibold text-stone-900 underline">{t("checkout.lerTermos")}</button>
                    </span>
                  </label>
                  {error && <div className="rounded-sm border border-red-200 bg-red-50 p-3 text-xs text-red-600">{error}</div>}
                </div>
                <div className="border-t border-stone-200 p-4">
                  <div className="mb-3 space-y-1 text-sm">
                    <div className="flex justify-between text-stone-500"><span>{t("cart.subtotal")}</span><span>{formatPrice(subtotal, currency, rates)}</span></div>
                    {discount > 0 && <div className="flex justify-between font-medium text-emerald-700"><span>{t("checkout.cupomCodigo", { code: coupon?.code })}</span><span>−{formatPrice(discount, currency, rates)}</span></div>}
                    {form.deliveryType === "DELIVERY" && selectedZone && (
                      <div className="flex justify-between text-stone-500"><span>{t("checkout.freteZona", { zona: selectedZone.name })}</span><span>{shippingFee === 0 ? t("checkout.gratis") : `+${formatPrice(shippingFee, currency, rates)}`}</span></div>
                    )}
                    <div className="flex items-center justify-between border-t border-stone-200 pt-2">
                      <span className="text-stone-500">{t("checkout.total")}</span>
                      <span className="text-2xl font-black text-stone-900">{formatPrice(total, currency, rates)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setCheckout(false)} disabled={sending} className="rounded-sm border border-stone-300 px-4 py-3 text-sm font-semibold text-stone-600 hover:border-stone-500 disabled:opacity-50">{t("checkout.voltarBtn")}</button>
                    <PremiumCta type="submit" size="md" className="flex-1" disabled={sending || !acceptedTerms}>
                      {sending ? <><Loader2 className="h-4 w-4 animate-spin" /> {t("checkout.enviando")}</> : <>{t("checkout.gerarPix")} <ArrowRight className="h-4 w-4" /></>}
                    </PremiumCta>
                  </div>
                </div>
              </form>
              )
            )}
          </aside>
        </div>
      )}

      {/* Termos do pedido */}
      {termsOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-stone-900/50 p-4" onClick={() => setTermsOpen(false)}>
          <div className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-sm bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-stone-200 p-4">
              <h3 className="text-lg font-bold" style={{ fontFamily: "var(--store-font-heading, 'Barlow Condensed'), sans-serif", textTransform: "uppercase" }}>{t("checkout.termosModalTitulo")}</h3>
              <button onClick={() => setTermsOpen(false)} className="rounded-sm p-2 text-stone-400 hover:bg-stone-100"><X className="h-4 w-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <p className="whitespace-pre-line text-sm leading-relaxed text-stone-600">{terms.termsText || t("checkout.termosIndisponivel")}</p>
            </div>
            <div className="border-t border-stone-200 p-4">
              <button onClick={() => { setAcceptedTerms(true); setTermsOpen(false); }} className="w-full rounded-sm bg-stone-900 py-2.5 text-sm font-bold text-white hover:bg-stone-900">
                {t("checkout.liConcordo")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rodapé / Footer */}
      <footer className="mt-auto border-t border-white/10 bg-[var(--store-footer-bg,#2f2729)] py-6 text-[var(--store-footer-text,#fff7f9)]">
        <div className="mx-auto w-[95%] max-w-[1600px] px-4">
          
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            
            {/* Trust Badges Minimal */}
            <div className="flex flex-wrap justify-center gap-6 text-[10px] uppercase tracking-wider text-[var(--store-footer-text,#fff7f9)]/75 sm:justify-start">
              <div className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-[var(--store-accent,#e96f95)]" /> {t("footer.compraSegura")}</div>
              <div className="flex items-center gap-1.5"><Package className="h-4 w-4 text-[var(--store-accent,#e96f95)]" /> {t("footer.entregaRapida")}</div>
              <div className="flex items-center gap-1.5"><Store className="h-4 w-4 text-[var(--store-accent,#e96f95)]" /> {t("footer.qualidadeGarantida")}</div>
            </div>

            {/* Links */}
            <div className="flex flex-wrap justify-center gap-4 text-xs font-medium text-[var(--store-footer-text,#fff7f9)]/70">
              <Link to="/loja" className="hover:text-stone-900 transition">{t("header.dudas")}</Link>
              <Link to="/loja" className="hover:text-stone-900 transition">{t("header.sobre")}</Link>
              <Link to="/loja/catalogo" className="hover:text-stone-900 transition">{t("footer.comoComprar")}</Link>
              <Link to="/loja/catalogo" className="hover:text-stone-900 transition">{t("footer.metodosPagamento")}</Link>
              <Link to="/loja/catalogo" className="hover:text-stone-900 transition">{t("footer.enviosDevolucoes")}</Link>
              <Link to="/loja/catalogo" className="hover:text-stone-900 transition">{t("footer.perguntas")}</Link>
            </div>

          </div>

          <div className="mt-6 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-4 sm:flex-row">
            <EditableFooterText footerText={footerText} storeName={info?.storeName} />

            <div className="flex items-center gap-4 opacity-75 grayscale transition hover:grayscale-0">
              <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600"><span className="text-sm italic">pix</span></div>
              <div className="h-3 w-px bg-stone-300"></div>
              <div className="text-[10px] text-stone-500 flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> SSL 256-bit</div>
            </div>
          </div>
          
        </div>
      </footer>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-rose-100 bg-white/95 px-2 pb-[max(.35rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-8px_30px_rgba(80,35,50,.08)] backdrop-blur md:hidden">
        {[
          ["Início", "/loja", Home],
          ["Categorias", "/loja/catalogo", LayoutGrid],
          ["Ofertas", "/loja/catalogo?canal=oferta", Tag],
          ["Conta", "/loja/conta", User],
        ].map(([label, path, Icon]: any) => (
          <Link key={label} to={path} className="flex flex-col items-center gap-0.5 py-1 text-[10px] font-semibold text-stone-500 hover:text-[var(--store-accent,#e96f95)]">
            <Icon className="h-5 w-5" /> {label}
          </Link>
        ))}
      </nav>

      <AssistantWidget wa={wa} />
    </div>
  );
}
