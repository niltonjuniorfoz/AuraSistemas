import React, { useCallback, useEffect, useState, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useOutletContext } from "react-router";
import { ArrowRight, BadgeCheck, Headphones, Mail, MessageCircle, Loader2, Plus, ShieldCheck, ChevronLeft, ChevronRight, Trash2, Tags, Truck } from "lucide-react";
import { ShopProductCard } from "./ShopProductCard";
import { Particles } from "../../components/ui/particles";
import { Marquee } from "../../components/ui/marquee";
import { PremiumCta } from "./PremiumCta";
import { categoryIcon } from "./categoryIcons";
import { translateCategoryName } from "./i18n";
import { Editable } from "./editor/Editable";
import { useEditMode } from "./editor/EditModeContext";
import { ResizeHandle } from "./editor/ResizeHandle";
import { effectiveHomeSections, SecaoPagina, Tamanho } from "./editor/elementCatalog";
import { TextPanel } from "./editor/panels/TextPanel";
import { HowToBuyPanel } from "./editor/panels/HowToBuyPanel";
import { BannerPanel } from "./editor/panels/BannerPanel";
import { SideBannerPanel } from "./editor/panels/SideBannerPanel";
import { CategoriesPanel } from "./editor/panels/CategoriesPanel";
import { VitrinesPanel } from "./editor/panels/VitrinesPanel";
import { apiFetch } from "../../lib/api";
import { toast } from "../../components/Toast";

// Estado de rolagem (pode ir pra esquerda/direita?) reaproveitado tanto pela
// seta flutuante (ScrollArrows, carrossel do banner lateral) quanto pela seta
// embutida na faixa colorida da vitrine (ProductSection) — mesma lógica,
// dois jeitos de desenhar o botão.
function useScrollState(scrollRef: React.RefObject<HTMLDivElement>) {
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => {
      setCanLeft(el.scrollLeft > 4);
      setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => { el.removeEventListener("scroll", update); ro.disconnect(); window.removeEventListener("resize", update); };
  }, [scrollRef]);
  const scrollBy = (dir: number) => scrollRef.current?.scrollBy({ left: dir * 280, behavior: "smooth" });
  return { canLeft, canRight, scrollBy };
}

// Seta flutuante por cima da imagem — usada só no carrossel do banner lateral
// (escuro, sobre foto). A vitrine (ProductSection) usa seta embutida própria,
// dentro da faixa colorida do título, não flutuando sobre o produto.
function ScrollArrows({ scrollRef, dark, alwaysVisible }: { scrollRef: React.RefObject<HTMLDivElement>; dark?: boolean; alwaysVisible?: boolean }) {
  const { canLeft, canRight, scrollBy } = useScrollState(scrollRef);
  // group-hover/vitrine (nomeado): o ancestral é o box da vitrine (também
  // nomeado), não pode ser "group" sem nome — cada ShopProductCard aqui
  // dentro TAMBÉM usa "group" sem nome pro próprio hover, e um "group" sem
  // nome no box externo vazaria pros cards de novo (mesmo bug já corrigido
  // uma vez no header colorido da vitrine).
  // alwaysVisible: carrossel com autoplay (banner lateral) — a seta some no
  // hover-only some junto com o autoplay pausando, então some bem na hora
  // que o cliente ia querer clicar nela. Fica sempre visível nesse caso.
  const base = `absolute top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full shadow-md transition ${alwaysVisible ? "opacity-100" : "opacity-0 group-hover/vitrine:opacity-100"}`;
  const skin = dark
    ? "bg-stone-900/60 text-white backdrop-blur-sm hover:bg-stone-900/80"
    : "border border-stone-200 bg-white text-stone-600 hover:text-[var(--store-accent,#C99C5A)]";
  return (
    <>
      {canLeft && (
        <button type="button" onClick={() => scrollBy(-1)} className={`${base} left-1 ${skin}`} aria-label="Anterior">
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}
      {canRight && (
        <button type="button" onClick={() => scrollBy(1)} className={`${base} right-1 ${skin}`} aria-label="Próximo">
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </>
  );
}

function ProductSection({ title, link, products }: { title: string, link: string, products: any[] }) {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const { canLeft, canRight, scrollBy } = useScrollState(scrollRef);

  // Vitrine avança sozinha a cada 10s, loop infinito (volta pro começo ao
  // chegar no fim) — mesmo esquema do carrossel do banner lateral
  // (Selecionado pra você), só que aqui embutido no próprio componente pra
  // valer em toda vitrine da home de uma vez, sem repetir em cada chamada.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !products || products.length <= 1) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    let paused = false;
    const onEnter = () => { paused = true; };
    const onLeave = () => { paused = false; };
    el.addEventListener("mouseenter", onEnter);
    el.addEventListener("mouseleave", onLeave);
    const id = setInterval(() => {
      if (paused || !el) return;
      const atEnd = el.scrollLeft >= el.scrollWidth - el.clientWidth - 4;
      el.scrollTo({ left: atEnd ? 0 : el.scrollLeft + 280, behavior: "smooth" });
    }, 6250);
    return () => {
      clearInterval(id);
      el.removeEventListener("mouseenter", onEnter);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, [products?.length]);

  if (!products || products.length === 0) return null;
  return (
    <section className="mx-auto w-[95%] max-w-[1600px] px-4 py-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-extrabold uppercase tracking-[0.08em] text-[var(--store-accent,#d46a86)]" style={{ fontFamily: "var(--store-font-heading, 'Barlow Condensed'), sans-serif" }}>{title}</h2>
        <div className="flex shrink-0 items-center gap-2">
          <Link to={link} className="text-xs font-semibold text-[var(--store-accent,#d46a86)] transition hover:opacity-70">{t("home.verTodos")}</Link>
          <button type="button" onClick={() => scrollBy(-1)} disabled={!canLeft} aria-label="Anterior" className="hidden h-7 w-7 items-center justify-center rounded-full border border-rose-100 bg-white text-[var(--store-accent,#d46a86)] disabled:opacity-30 sm:flex"><ChevronLeft className="h-4 w-4" /></button>
          <button type="button" onClick={() => scrollBy(1)} disabled={!canRight} aria-label="Próximo" className="hidden h-7 w-7 items-center justify-center rounded-full border border-rose-100 bg-white text-[var(--store-accent,#d46a86)] disabled:opacity-30 sm:flex"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>
      <div ref={scrollRef} className="flex gap-3 overflow-x-auto pb-2 pt-1 snap-x snap-mandatory scrollbar-hide">
        {products.map((p) => (
          <div key={p.id} className="w-[62vw] max-w-56 shrink-0 snap-start sm:w-52 lg:w-[calc((100%_-_3.75rem)/6)]">
            <ShopProductCard p={p} />
          </div>
        ))}
      </div>
    </section>
  );
}

function NewsletterBanner() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim() || sending) return;
    setSending(true);
    try {
      const response = await fetch("/api/store/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Não foi possível cadastrar agora.");
      setDone(true);
      setEmail("");
    } catch (error: any) {
      toast.error(error.message || "Não foi possível cadastrar agora.");
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="mx-auto w-[95%] max-w-[1600px] px-4 py-5">
      <div className="relative overflow-hidden rounded-2xl border border-rose-100 bg-[#f8dde5] shadow-sm">
        <img src="/banners/db-first-order.png" alt="" className="absolute inset-0 h-full w-full object-cover" aria-hidden="true" />
        <div className="relative grid min-h-36 items-center gap-4 bg-white/20 px-6 py-6 backdrop-blur-[1px] md:grid-cols-[0.8fr_1.2fr] md:px-12">
          <div className="text-center md:text-left">
            <div className="font-serif text-4xl leading-none text-[var(--store-accent,#d46a86)] sm:text-5xl"><strong>5%</strong> OFF</div>
            <p className="mt-1 text-sm font-semibold text-[#6b5b5a]">na primeira compra</p>
          </div>
          {done ? (
            <div className="flex items-center justify-center gap-2 rounded-xl bg-white/80 px-4 py-3 text-sm font-bold text-[#6b5b5a]"><BadgeCheck className="h-5 w-5 text-[var(--store-accent,#d46a86)]" /> E-mail cadastrado. Suas novidades estão a caminho!</div>
          ) : (
            <form onSubmit={submit} className="mx-auto w-full max-w-xl">
              <label htmlFor="newsletter-email" className="mb-2 block text-center text-xs font-semibold text-[#6b5b5a] md:text-left">Cadastre seu melhor e-mail e receba ofertas exclusivas!</label>
              <div className="flex overflow-hidden rounded-xl border border-white bg-white/90 shadow-sm focus-within:ring-2 focus-within:ring-[var(--store-accent,#d46a86)]/30">
                <Mail className="ml-3 h-5 w-5 shrink-0 self-center text-rose-300" />
                <input id="newsletter-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Seu melhor e-mail" className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm text-[#6b5b5a] outline-none" />
                <button type="submit" disabled={sending} className="bg-[var(--store-accent,#d46a86)] px-5 text-xs font-bold text-white transition hover:brightness-95 disabled:opacity-60">{sending ? "Enviando..." : "Quero aproveitar"}</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

// Faixa de logos de marca — mesma moldura/faixa de título da vitrine
// (ProductSection acima), só troca o conteúdo por uma esteira infinita via
// o componente Marquee (MagicUI), que já duplica o conteúdo internamente
// (prop repeat) e pausa sozinho no hover (pauseOnHover).
function MarcasSection({ brands }: { brands: { name: string; logoUrl: string }[] }) {
  const { t } = useTranslation();
  if (!brands || brands.length === 0) return null;
  return (
    <section className="mx-auto w-[95%] max-w-[1600px] px-4 py-6">
      <div className="group/vitrine overflow-hidden rounded-2xl border border-stone-200">
        <div className="flex items-center justify-between gap-3 rounded-t-2xl bg-transparent px-4 py-3 transition-colors duration-300 group-hover/vitrine:bg-[var(--store-accent,#C99C5A)] sm:px-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-black/10 text-stone-900 transition-colors duration-300 group-hover/vitrine:bg-white/20 group-hover/vitrine:text-white">
              <Tags className="h-4 w-4" />
            </span>
            <h2 className="truncate text-base font-bold uppercase tracking-wide text-stone-900 transition-colors duration-300 group-hover/vitrine:text-white" style={{ fontFamily: "var(--store-font-heading, 'Barlow Condensed'), sans-serif" }}>{t("home.marcas", "Marcas")}</h2>
          </div>
          <Link to="/loja/catalogo" className="shrink-0 text-sm font-semibold text-stone-700 transition-colors duration-300 hover:text-stone-900 group-hover/vitrine:text-white/85 group-hover/vitrine:hover:text-white">
            {t("home.verTodos")}
          </Link>
        </div>
        <div className="overflow-hidden bg-white p-6" style={{ WebkitMaskImage: "linear-gradient(to right, transparent 0, black 4%, black 96%, transparent 100%)", maskImage: "linear-gradient(to right, transparent 0, black 4%, black 96%, transparent 100%)" }}>
          {/* Marquee repete os links (prop repeat) só para o efeito visual —
              é puramente decorativo, então fica oculto de leitor de tela/Tab
              (aria-hidden + tabIndex=-1 nos links); a lista real e navegável
              fica na <ul className="sr-only"> logo abaixo, uma cópia só. */}
          <ul className="sr-only">
            {brands.map((b) => (
              <li key={b.name}>
                <Link to={`/loja/catalogo?marca=${encodeURIComponent(b.name)}`}>{b.name}</Link>
              </li>
            ))}
          </ul>
          <Marquee pauseOnHover className="[--gap:1.5rem]" aria-hidden="true">
            {brands.map((b) => (
              <Link key={b.name} to={`/loja/catalogo?marca=${encodeURIComponent(b.name)}`} tabIndex={-1}
                className="relative flex h-28 w-52 shrink-0 items-center justify-center rounded-xl border border-stone-200 bg-white p-5 transition duration-300 hover:z-10 hover:scale-110 hover:shadow-lg">
                <img src={b.logoUrl} alt={b.name} className="max-h-full max-w-full object-contain" />
              </Link>
            ))}
          </Marquee>
        </div>
      </div>
    </section>
  );
}

// Passos de tamanho → classes responsivas FIXAS (spec: enum P|M|G|GG mapeado
// a classes no componente, nunca px salvos). "M" reproduz EXATAMENTE o visual
// de hoje (aspect-[5/2] max-h-[420px] era o valor fixo do carrossel).
const BANNER_SIZE_CLASSES: Record<string, string> = {
  // Frame fixo por tamanho: qualquer imagem enviada ocupa exatamente a mesma
  // altura visual. A arte principal usa object-contain (não corta) e o fundo
  // desfocado preenche eventuais diferenças de proporção sem criar borda vazia.
  P: "h-[118px] sm:h-[165px] md:h-[205px]",
  M: "h-[138px] sm:h-[195px] md:h-[245px]",
  G: "h-[162px] sm:h-[225px] md:h-[285px]",
  GG: "h-[188px] sm:h-[255px] md:h-[325px]",
};
// Banner lateral: "M" (padrão) = sem classe extra, altura natural de hoje.
const SIDEBANNER_SIZE_CLASSES: Record<string, string> = {
  P: "md:min-h-[200px]",
  M: "",
  G: "md:min-h-[380px]",
  GG: "md:min-h-[500px]",
};

// Botões CTA do hero: "M" = px-8 py-3 text-sm (o valor fixo de hoje).
const CTA_SIZE_CLASSES: Record<string, string> = {
  P: "px-5 py-2 text-xs",
  M: "px-8 py-3 text-sm",
  G: "px-10 py-3.5 text-base",
  GG: "px-12 py-4 text-lg",
};

// Id de SEÇÃO no catálogo de elementos / chave de preview ("secao-banners");
// os helpers de mover/ocultar/redimensionar seguem usando o id cru ("banners").
const SECAO = (id: string) => `secao-${id}`;

// Home da loja: hero editorial, categorias, novidades e destaques.
export function StoreHome() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { info } = useOutletContext<any>() || {};
  const editCtx = useEditMode();
  // O objeto de editCtx é recriado a cada render do EditModeProvider (ele
  // muda draft/dirty/activePanel), então usar `editCtx` direto como
  // dependência de efeito/callback faria eles recriar/refirar a cada clique
  // de abrir/fechar painel ou a cada patchDraft — inclusive reexecutando o
  // efeito de carga inicial (produtos, vitrines, config) inteiro. Só a
  // PRESENÇA do editor importa aqui (dentro vs fora do editor), não a
  // identidade do objeto, então guarda isso num booleano estável.
  const inEditor = !!editCtx;
  useEffect(() => { if (editCtx?.draft) setCfg(editCtx.draft); }, [editCtx?.draft]);
  const [categories, setCategories] = useState<any[]>([]);
  // Busca as categorias — dentro do editor, do endpoint de rascunho
  // (mesclado: publicadas + criadas/editadas no rascunho ainda não publicado)
  // via apiFetch (precisa do Authorization Bearer, é rota admin protegida por
  // requireAuth; um fetch cru aqui daria 401 e a grade de categorias
  // apareceria vazia dentro do editor). Fora do editor, do endpoint público
  // de sempre. Extraída pra função nomeada porque tanto o efeito de carga
  // inicial quanto o CategoriesPanel (onChanged, depois de criar/editar/
  // apagar/reordenar uma categoria) precisam recarregar essa lista.
  const loadCategories = useCallback(async (): Promise<any[]> => {
    try {
      const res = inEditor ? await apiFetch("/api/store/admin/categories/draft") : await fetch("/api/store/categories");
      const j = res.ok ? await res.json() : { data: [] };
      const cats = Array.isArray(j.data) ? j.data : [];
      setCategories(cats);
      return cats;
    } catch (e) {
      console.error("StoreHome erro ao carregar categorias", e);
      setCategories([]);
      return [];
    }
  }, [inEditor]);
  const [newest, setNewest] = useState<any[]>([]);
  const [allInStock, setAllInStock] = useState<any[]>([]);
  const [brands, setBrands] = useState<{ name: string; logoUrl: string }[]>([]);
  const [vitrineProducts, setVitrineProducts] = useState<Record<string, any[]>>({});
  // Cache produto-por-id compartilhado entre o load inicial (vitrines da
  // config PUBLICADA) e o efeito de hidratação do rascunho abaixo — evita
  // buscar de novo um id que já apareceu em qualquer vitrine já resolvida
  // (publicada OU do rascunho), mesmo que ele se repita em várias vitrines.
  const vitrineProductCacheRef = useRef<Record<string, any>>({});
  const [cfg, setCfg] = useState<any>({});
  const [loading, setLoading] = useState(true);
  // Preview ao vivo do resize (chave = id do elemento sendo arrastado; o
  // valor sobrepõe o tamanho salvo SÓ enquanto a alça está sendo arrastada).
  const [sizePreview, setSizePreview] = useState<Record<string, Tamanho | null>>({});

  // Ações de seção (mover/ocultar/tamanho): o payload é uma FUNÇÃO — o
  // patchDraft roda ela dentro da fila de patches, contra o draft fresco
  // daquele momento (não o do clique; duas ações rápidas em seções diferentes
  // regravam pages.home.sections completo, e a segunda partir do draft velho
  // desfazia a primeira). Mesma classe de bug de stale closure corrigida 2x no
  // v1. O PATCH do servidor faz merge POR PÁGINA, então mandar só `home` não
  // apaga o rascunho de `catalogo` (Task 1). `mutate` devolve null = no-op
  // (ex.: mover além da borda): não manda PATCH nem marca dirty.
  const patchHomeSections = (mutate: (sections: SecaoPagina[]) => SecaoPagina[] | null) => {
    if (!editCtx) return Promise.resolve(false);
    return editCtx.patchDraft((draft: any) => {
      const sections = mutate(effectiveHomeSections(draft).map((s) => ({ ...s })));
      if (!sections) return null;
      return { pages: { home: { sections: sections.map((s, i) => ({ ...s, ordem: i })) } } };
    });
  };
  const moveSection = (id: string, dir: -1 | 1) => patchHomeSections((sections) => {
    const i = sections.findIndex((s) => s.id === id);
    if (i < 0) return null;
    // Troca com o vizinho VISÍVEL mais próximo na direção — pula ocultas e a
    // announcement (renderiza no ShopLayout, fora do fluxo visual da home);
    // trocar com uma dessas seria um clique visualmente sem efeito.
    let j = i + dir;
    while (j >= 0 && j < sections.length && (sections[j].visivel === false || sections[j].id === "announcement")) j += dir;
    if (j < 0 || j >= sections.length) return null;
    [sections[i], sections[j]] = [sections[j], sections[i]];
    return sections;
  });
  const hideSection = (id: string) => patchHomeSections((sections) => {
    const s = sections.find((x) => x.id === id);
    if (!s || s.visivel === false) return null;
    s.visivel = false; // cópia rasa feita no patchHomeSections — mutar aqui é seguro
    return sections;
  });
  const resizeSection = (id: string, tamanho: Tamanho) => patchHomeSections((sections) => {
    const s = sections.find((x) => x.id === id);
    if (!s || s.tamanho === tamanho) return null;
    s.tamanho = tamanho;
    return sections;
  });
  // Ações inline de ITEM DE LISTA (vitrine/banner): patcheiam o array direto
  // no rascunho, sem abrir painel. `vitrines`/`banners` são arrays TOP-LEVEL
  // da config (mandados inteiros no PATCH), e o payload é sempre FUNÇÃO — o
  // patchDraft roda ela na fila, contra o draft fresco daquele momento (mesma
  // proteção de stale closure do patchHomeSections acima; devolver null =
  // no-op, nada gravado). Apagar item = remove do rascunho; Descartar recupera
  // até publicar (spec, Escopo item 7).
  const moveVitrine = (id: string, dir: -1 | 1) => {
    if (!editCtx) return Promise.resolve(false);
    return editCtx.patchDraft((draft: any) => {
      const list = Array.isArray(draft?.vitrines) ? [...draft.vitrines] : [];
      const i = list.findIndex((v: any) => v.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= list.length) return null;
      [list[i], list[j]] = [list[j], list[i]];
      return { vitrines: list };
    });
  };
  const deleteVitrine = (id: string) => {
    if (!editCtx) return Promise.resolve(false);
    return editCtx.patchDraft((draft: any) => {
      const list = Array.isArray(draft?.vitrines) ? draft.vitrines : [];
      if (!list.some((v: any) => v.id === id)) return null;
      return { vitrines: list.filter((v: any) => v.id !== id) };
    });
  };
  const duplicateVitrine = (id: string) => {
    if (!editCtx) return Promise.resolve(false);
    // O id novo nasce FORA do payload-função (não depende do draft) pra poder
    // clonar também a lista local de produtos depois que o patch assentar —
    // sem isso a cópia renderizaria vazia até recarregar (vitrineProducts é
    // indexado por id e só é montado no load inicial).
    const novoId = crypto.randomUUID();
    const patched = editCtx.patchDraft((draft: any) => {
      const list = Array.isArray(draft?.vitrines) ? draft.vitrines : [];
      const i = list.findIndex((v: any) => v.id === id);
      if (i < 0) return null;
      if (list.length >= 20) { toast.error("Máximo de 20 vitrines."); return null; }
      // Item duplicado ganha id NOVO (spec, Casos de borda) — os productIds são copiados.
      const copia = { ...list[i], id: novoId, title: `${list[i].title || "Vitrine"} (cópia)` };
      return { vitrines: [...list.slice(0, i + 1), copia, ...list.slice(i + 1)] };
    });
    return patched.then((ok) => {
      if (ok) setVitrineProducts((prev) => (prev[id] ? { ...prev, [novoId]: prev[id] } : prev));
      return ok;
    });
  };
  // Apagar banner: banners não têm id, então o índice do clique pode ficar
  // VELHO se dois deletes rápidos entrarem na fila (o segundo rodaria contra a
  // lista já encurtada e apagaria o banner errado). O clique captura também a
  // URL e o payload confere a identidade: índice ainda bate → usa ele; lista
  // mudou → reacha pela URL; banner sumiu (já apagado) → no-op.
  const deleteBanner = (idx: number, url: string) => {
    if (!editCtx) return Promise.resolve(false);
    return editCtx.patchDraft((draft: any) => {
      const list = Array.isArray(draft?.banners) ? draft.banners : [];
      const i = idx >= 0 && idx < list.length && list[idx]?.url === url
        ? idx
        : list.findIndex((b: any) => b?.url === url);
      if (i < 0) return null;
      return { banners: list.filter((_: any, k: number) => k !== i) };
    });
  };
  // Confirmação inline no chip (convenção do projeto: apagar item de lista =
  // confirmar no lugar): 1º clique vira "Confirma?", 2º apaga. Chaveada por
  // URL (não índice) e resetada no blur (clicar em qualquer outro lugar).
  const [confirmingBannerUrl, setConfirmingBannerUrl] = useState<string | null>(null);
  const catScrollRef = useRef<HTMLDivElement>(null);
  const sideBannerScrollRef = useRef<HTMLDivElement>(null);

  // Carousel
  const [currentBanner, setCurrentBanner] = useState(0);
  const banners = useMemo(() => {
    return Array.isArray(cfg?.banners) && cfg.banners.length > 0
      ? cfg.banners
      : [
          { url: "/banners/db-realce-beleza.png", link: "/loja/catalogo" },
          { url: "/banners/db-body-splash.png", link: "/loja/catalogo?busca=body%20splash" },
        ];
  }, [cfg?.banners]);

  // Pausa o autoplay com o mouse em cima — ref (não state) pra não recriar o
  // timer a cada hover, só o tick seguinte já respeita.
  const bannerHoverRef = useRef(false);
  // `Particles` pinta num <canvas> via JS — não entende `var(--store-accent)`
  // como o CSS entende, precisa do hex já resolvido a partir do elemento que
  // carrega a custom property.
  const heroRef = useRef<HTMLDivElement | null>(null);
  const [heroAccentColor, setHeroAccentColor] = useState("#C99C5A");
  useEffect(() => {
    if (!heroRef.current) return;
    const resolved = getComputedStyle(heroRef.current).getPropertyValue("--store-accent").trim();
    if (resolved) setHeroAccentColor(resolved);
  }, [loading]);
  useEffect(() => {
    // Apagar um banner inline pode deixar o índice atual além do fim da lista
    // nova — sem o clamp o carrossel ficaria num slide vazio até o timer girar.
    setCurrentBanner((c) => (c >= banners.length ? 0 : c));
    const timer = setInterval(() => {
      if (!bannerHoverRef.current) setCurrentBanner((c) => (c + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [banners.length]);

  useEffect(() => {
    (async () => {
      try {
        // Busca uma lista de produtos, ou [] em qualquer falha — evita repetir
        // o mesmo if(ok){parse;set} pra cada vitrine da home.
        const fetchList = async (url: string): Promise<any[]> => {
          const r = await fetch(url);
          if (!r.ok) return [];
          const j = await r.json();
          return Array.isArray(j.data) ? j.data : [];
        };

        const [, newestList, brandsList, allInStockList] = await Promise.all([
          loadCategories(),
          fetchList("/api/store/products?limit=8&sort=newest"),
          fetch("/api/store/brands").then((r) => (r.ok ? r.json() : { data: [] })).then((j) => j.data || []).catch(() => []),
          // "Selecionado pra você": TODO produto com estoque, não só os mais
          // novos — 120 é o teto que a própria API já aplica (mesmo limite
          // do catálogo completo).
          fetchList("/api/store/products?limit=120"),
        ]);
        setNewest(newestList);
        setBrands(brandsList);
        setAllInStock(allInStockList);

        // Config da vitrine (banners, hero, destaques) fica em /api/store/config —
        // NÃO em /api/store/info (esse só tem dados da empresa/PIX).
        const cfgRes = await fetch("/api/store/config");
        if (cfgRes.ok) {
          const c = await cfgRes.json();
          // Dentro do editor o draft já é a fonte da verdade pra `cfg` (ver
          // efeito de sincronização acima) — não sobrescreve com a config
          // publicada, senão a tela pisca pro conteúdo publicado assim que
          // esse fetch resolve. featuredProductIds/vitrines abaixo seguem
          // vindo da config publicada mesmo assim (mesmo comportamento de
          // antes), só o setCfg direto é que fica de fora.
          if (!inEditor) setCfg(c || {});
          // Vitrines manuais: busca todo produto usado em qualquer vitrine numa
          // chamada só, depois agrupa por vitrine mantendo a ordem escolhida.
          if (Array.isArray(c.vitrines) && c.vitrines.length > 0) {
            const allIds = [...new Set(c.vitrines.flatMap((v: any) => v.productIds || []))];
            if (allIds.length > 0) {
              const vpRes = await fetch(`/api/store/products?ids=${allIds.join(",")}`);
              if (vpRes.ok) {
                const vp = await vpRes.json();
                const byId: Record<string, any> = {};
                for (const p of (vp.data || [])) { byId[p.id] = p; vitrineProductCacheRef.current[p.id] = p; }
                const grouped: Record<string, any[]> = {};
                for (const v of c.vitrines) grouped[v.id] = (v.productIds || []).map((id: string) => byId[id]).filter(Boolean);
                setVitrineProducts(grouped);
              }
            }
          }
        }
      } catch (e) {
        console.error("StoreHome erro ao carregar", e);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inEditor]);

  // Chave estável derivada só dos ids que importam pro render (vitrine +
  // produtos escolhidos, em ordem) — NÃO a identidade de editCtx.draft.vitrines:
  // draft é substituído por inteiro a cada patch (ver EditModeContext), então
  // até um patch em heroTitle trocaria a referência do array sem mudar seu
  // conteúdo. Usar a referência crua como dependência do efeito abaixo faria
  // ele reprocessar (e o fetch de baixo rodar) a cada patch de QUALQUER campo
  // do editor, não só quando uma vitrine/produto muda de verdade.
  const draftVitrinesKey = useMemo(() => {
    const list = Array.isArray(editCtx?.draft?.vitrines) ? editCtx.draft.vitrines : [];
    return list.map((v: any) => `${v.id}:${(v.productIds || []).join(",")}`).join("|");
  }, [editCtx?.draft?.vitrines]);

  // Hidrata produtos de vitrines DENTRO DO EDITOR. O mount effect acima só
  // resolve produtos das vitrines da config PUBLICADA (c.vitrines) — uma
  // vitrine criada ou duplicada nesta sessão só existe em editCtx.draft.vitrines
  // e nunca ganhava entrada em vitrineProducts, então
  // (v.productIds||[]).map(id=>byId[id]).filter(Boolean) no render dava [] e
  // ProductSection retornava null (só a barrinha de hover no hover aparecia,
  // a vitrine em si ficava invisível). Roda só dentro do editor — fora dele
  // cfg.vitrines já é a config publicada, hidratada pelo mount effect.
  useEffect(() => {
    if (!inEditor || !editCtx) return;
    const draftVitrines: any[] = Array.isArray(editCtx.draft?.vitrines) ? editCtx.draft.vitrines : [];
    if (draftVitrines.length === 0) return;
    // Só busca o que ainda não está no cache (populado aqui e pelo load
    // inicial acima) — um id repetido em várias vitrines do rascunho só é
    // buscado uma vez, e reabrir o mesmo id depois de já resolvido não refaz
    // a chamada.
    const missingIds = [...new Set(draftVitrines.flatMap((v: any) => v.productIds || []))]
      .filter((id: string) => !vitrineProductCacheRef.current[id]);

    // Reconstrói vitrineProducts a partir do cache atual — chamada tanto
    // depois do fetch quanto quando não falta nada buscar (ex.: vitrine
    // duplicada, cujos productIds já foram resolvidos pela vitrine original).
    const applyFromCache = () => {
      setVitrineProducts((prev) => {
        const next: Record<string, any[]> = { ...prev };
        for (const v of draftVitrines) {
          next[v.id] = (v.productIds || []).map((id: string) => vitrineProductCacheRef.current[id]).filter(Boolean);
        }
        return next;
      });
    };

    if (missingIds.length === 0) { applyFromCache(); return; }

    let cancelled = false;
    (async () => {
      try {
        // Mesmo endpoint público em lote que o load inicial já usa pras
        // vitrines publicadas (grep acima) — garante a mesma forma de objeto
        // que ProductSection/ShopProductCard já sabem consumir (imageUrl,
        // hasVariants, price, groupName...), sem precisar mapear campos de
        // um endpoint de forma diferente.
        const r = await fetch(`/api/store/products?ids=${missingIds.join(",")}`);
        if (!r.ok || cancelled) return;
        const j = await r.json();
        for (const p of (Array.isArray(j.data) ? j.data : [])) vitrineProductCacheRef.current[p.id] = p;
      } catch (e) {
        // Produto apagado/ocultado do catálogo: convenção do projeto (ver
        // VitrinesPanel.hydrate) é falha silenciosa, sem toast — o
        // .filter(Boolean) em applyFromCache já tolera o buraco.
        console.error("StoreHome erro ao hidratar produtos de vitrines do rascunho", e);
      } finally {
        if (!cancelled) applyFromCache();
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inEditor, draftVitrinesKey]);

  // "featured" existia pra permitir uma lista de destaques escolhida à mão
  // (featuredProductIds), mas essa lista não tem UI nenhuma no editor visual
  // atual pra ser vista/trocada — se uma loja tivesse algo salvo aí de antes,
  // ficava travada pra sempre e nunca caía pro automático. Removido: agora é
  // sempre os produtos mais novos, sem exceção.
  const featured = newest;

  // Carrossel automático da fileira de produtos do banner "Selecionado pra
  // você": avança um produto a cada 5s, sozinho, em loop infinito (volta pro
  // começo ao chegar no fim) — sem precisar de clique nem hover. Pausa
  // enquanto o mouse estiver em cima (cliente navegando não briga com o
  // timer) e não roda se o sistema pedir menos movimento na tela.
  useEffect(() => {
    const el = sideBannerScrollRef.current;
    if (!el || allInStock.length <= 1) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    let paused = false;
    const onEnter = () => { paused = true; };
    const onLeave = () => { paused = false; };
    el.addEventListener("mouseenter", onEnter);
    el.addEventListener("mouseleave", onLeave);
    const id = setInterval(() => {
      if (paused || !el) return;
      const atEnd = el.scrollLeft >= el.scrollWidth - el.clientWidth - 4;
      el.scrollTo({ left: atEnd ? 0 : el.scrollLeft + 280, behavior: "smooth" });
    }, 5000);
    return () => {
      clearInterval(id);
      el.removeEventListener("mouseenter", onEnter);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, [allInStock.length]);

  // Ordem/visibilidade efetivas: config `pages.home.sections` quando existir,
  // senão o layout fixo de hoje (DEFAULT_HOME_SECTIONS). Recalcula quando o
  // cfg muda (dentro do editor, cfg = draft — ver efeito de sincronização).
  const homeSections = useMemo(() => effectiveHomeSections(cfg), [cfg]);

  const renderBanners = (s: SecaoPagina) => {
    if (loading) return null; // mesmo guard de hoje: não pisca o banner padrão antes do config carregar
    const tamanho = sizePreview[SECAO("banners")] || s.tamanho || "M";
    return (
      <Editable elementId={SECAO("banners")} panelKey="banners" label="Banners do topo"
        onMove={(dir) => moveSection("banners", dir)} onHide={() => hideSection("banners")}>
        <section className="mx-auto w-[95%] max-w-[1600px] px-1 py-2 sm:px-4">
          {/* Largura sempre acompanha a seção (igual ao header/categorias/produtos).
              A altura agora vem do passo de tamanho (P/M/G/GG) — "M" é o valor
              fixo antigo (aspect-[5/2] max-h-[420px]). */}
          <div
            ref={heroRef}
            className={`group relative ${BANNER_SIZE_CLASSES[tamanho] || BANNER_SIZE_CLASSES.M} w-full overflow-hidden rounded-xl bg-[#fff7f8] shadow-sm`}
            onMouseEnter={() => { bannerHoverRef.current = true; }}
            onMouseLeave={() => { bannerHoverRef.current = false; }}
          >
            {/* Sem z-index explícito de propósito: um z positivo (ex.: z-[1])
                sempre pinta ACIMA de qualquer elemento com stacking level
                "auto/0" (caso da faixa do carrossel abaixo, que ganha
                contexto de empilhamento próprio só por causa do `transform`
                — regra do CSS pra elementos transformados), não importa a
                ordem no JSX. Sem z-index, as partículas caem no mesmo grupo
                de empilhamento da faixa e então a ordem no JSX decide — como
                elas vêm ANTES da faixa aqui embaixo, ficam atrás dela (atrás
                do título/CTA/dots), que é o efeito visual pretendido.

                LIMITAÇÃO CONHECIDA (prefers-reduced-motion): `Particles` é um
                componente vendorizado (src/components/ui/particles.tsx) que
                anima via requestAnimationFrame direto num <canvas>, não via
                `animation` do CSS — não lê `window.matchMedia("(prefers-reduced-motion: reduce)")`
                internamente, então não há como pausá-lo só com o bloco CSS
                de src/index.css. Não foi alterado por ser componente
                de terceiro vendorizado; se isso virar requisito de
                acessibilidade, a correção é ler o matchMedia dentro do
                próprio particles.tsx e pular o rAF quando reduzido. */}
            <Particles className="pointer-events-none absolute inset-0" quantity={60} color={heroAccentColor} ease={70} size={0.5} />
            <div className="flex h-full transition-transform duration-700 ease-out" style={{ transform: `translateX(-${currentBanner * 100}%)` }}>
              {banners.map((b: any, i: number) => (
                <Link key={i} to={b.link || "/loja/catalogo"} className="relative h-full w-full shrink-0">
                  <div className="absolute inset-0 overflow-hidden bg-[#fff7f8]">
                    {/* Fundo preenchido com a própria arte desfocada: elimina
                        barras vazias quando o upload tem outra proporção, mas
                        a imagem principal continua inteira (sem crop). */}
                    <img
                      src={b.url}
                      alt=""
                      aria-hidden="true"
                      style={{ objectPosition: `${b.posX ?? 50}% 50%` }}
                      className="absolute inset-0 h-full w-full scale-110 object-cover opacity-20 blur-2xl"
                    />
                    <img
                      src={b.url}
                      alt={`Banner ${i + 1}`}
                      style={{ objectPosition: `${b.posX ?? 50}% 50%` }}
                      className="relative z-[1] h-full w-full object-contain"
                    />
                  </div>
                  {b.title && (
                    // Título melhor combina com banner "M"/"G"/"GG" — em "P"
                    // (o tamanho mais baixo) o overlay pode ficar visualmente
                    // apertado num celular estreito, já que o container tem
                    // overflow-hidden (não estoura o layout, só fica cramped).
                    <div
                      className="absolute inset-y-0 left-0 z-[2] flex w-[64%] flex-col justify-center bg-gradient-to-r from-white/95 via-white/75 to-transparent p-5 sm:w-[52%] sm:p-10"
                    >
                      <div className="mb-2 h-px w-12 bg-[#d4af37]" />
                      <h1 className="font-serif text-2xl leading-[0.95] text-[#6b3f49] sm:text-4xl lg:text-5xl">{b.title}</h1>
                      {b.subtitle && <p className="mt-3 max-w-xs text-[10px] font-semibold uppercase tracking-[0.08em] text-[#6b5b5a] sm:text-sm">{b.subtitle}</p>}
                      <div className="mt-4">
                        <PremiumCta
                          size="sm"
                          className="!w-fit"
                          onClick={(e) => {
                            e.preventDefault(); e.stopPropagation();
                            // Botão dentro de <Link> escapa do interceptador de clique do
                            // StoreEditor (ele ignora o alvo mais próximo quando é <button> —
                            // mesmo motivo do ⤷/➕ do ShopProductCard precisarem do próprio
                            // editCtx). Dentro do editor não existe sub-página de banner pra
                            // abrir, então o CTA fica só visual (fidelidade de preview) — não
                            // navega pra fora do editor, mesmo padrão do toggleFavorite do
                            // ShopProductCard.
                            if (editCtx) return;
                            navigate(b.link || "/loja/catalogo");
                          }}
                        >
                          Conheça agora <ArrowRight className="h-4 w-4" />
                        </PremiumCta>
                      </div>
                    </div>
                  )}
                </Link>
              ))}
            </div>
            {banners.length > 1 && (
              <>
                {/* opacity-0 + group-hover: setas só aparecem com o mouse em cima
                    do banner — mesmo pedido aplicado em todo carrossel da loja
                    (esse e o do banner lateral, abaixo). */}
                <button
                  type="button"
                  onClick={() => setCurrentBanner((currentBanner - 1 + banners.length) % banners.length)}
                  className="absolute left-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-stone-900/60 text-white opacity-0 shadow-md backdrop-blur-sm transition group-hover:opacity-100 hover:bg-stone-900/80"
                  aria-label="Banner anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentBanner((currentBanner + 1) % banners.length)}
                  className="absolute right-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-stone-900/60 text-white opacity-0 shadow-md backdrop-blur-sm transition group-hover:opacity-100 hover:bg-stone-900/80"
                  aria-label="Próximo banner"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </>
            )}
            <div className="absolute bottom-3 left-1/2 z-[3] flex -translate-x-1/2 gap-2">
              {banners.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentBanner(i)}
                  className={`h-2 rounded-sm transition-all shadow-sm ${i === currentBanner ? "w-6 bg-stone-900" : "w-2 bg-stone-300 hover:bg-stone-400"}`}
                  aria-label={`Ir para banner ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </section>
        {editCtx && (
          <div className="mx-auto flex w-[95%] flex-wrap items-center gap-2 px-4 pb-2 md:w-[70%]" onClick={(e) => e.stopPropagation()}>
            {/* A faixa lista só banners REAIS do rascunho (cfg.banners) — o
                banner-padrão de fallback do memo `banners` não aparece nela. */}
            {(Array.isArray(cfg.banners) ? cfg.banners : []).map((b: any, i: number) => (
              <span key={i} className="flex items-center gap-1.5 rounded border border-stone-300 bg-white px-2 py-1 text-[10px] font-semibold text-stone-600">
                <img src={b.url} alt="" className="h-4 w-8 rounded-sm object-cover" /> Banner {i + 1}
                <button
                  onClick={() => {
                    if (confirmingBannerUrl === b.url) { setConfirmingBannerUrl(null); deleteBanner(i, b.url); }
                    else setConfirmingBannerUrl(b.url);
                  }}
                  onBlur={() => setConfirmingBannerUrl(null)}
                  title="Apagar este banner"
                  aria-label="Apagar banner"
                  className="font-bold text-red-500 hover:text-red-700"
                >
                  {confirmingBannerUrl === b.url ? "Confirma?" : <Trash2 className="h-3 w-3" />}
                </button>
              </span>
            ))}
            <button onClick={() => editCtx.openPanel("banners")} className="flex items-center gap-1 rounded border border-dashed border-stone-400 px-2 py-1 text-[10px] font-bold text-stone-600 hover:border-amber-500 hover:text-amber-600">
              <Plus className="h-3 w-3" /> Adicionar banner
            </button>
          </div>
        )}
        {editCtx && (
          <ResizeHandle current={(s.tamanho as Tamanho) || "M"} elementId={SECAO("banners")}
            onPreview={(t) => setSizePreview((prev) => ({ ...prev, [SECAO("banners")]: t }))}
            onCommit={(t) => resizeSection("banners", t)} />
        )}
      </Editable>
    );
  };

  const renderHowToBuy = () => {
    if (cfg.howToBuyVisible === false) return null; // toggle legado do painel continua valendo, além do visivel da seção
    return (
      <Editable elementId={SECAO("howToBuy")} panelKey="howToBuy" label="Como comprar"
        onMove={(dir) => moveSection("howToBuy", dir)} onHide={() => hideSection("howToBuy")}>
        <section className="mx-auto w-[95%] max-w-[1600px] px-1 pb-3 sm:px-4">
          <div className="grid w-full grid-cols-4 divide-x divide-rose-200/70 overflow-hidden rounded-xl border border-rose-100 bg-gradient-to-r from-[#fff5f7] to-[#f8dde5]">
            {[
              [BadgeCheck, "Produtos Originais", "Selo de garantia"],
              [Truck, "Entrega Rápida", "Para todo o Brasil"],
              [ShieldCheck, "Compra Segura", "Seus dados protegidos"],
              [Headphones, "Suporte Especializado", "Atendimento humanizado"],
            ].map(([Icon, title, desc]: any) => (
              <div key={title} className="flex min-w-0 flex-col items-center justify-center gap-1.5 px-1 py-3 text-center sm:flex-row sm:gap-3 sm:px-3 sm:py-4 sm:text-left">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--store-accent,#d46a86)]/30 bg-white/70 text-[var(--store-accent,#d46a86)] sm:h-10 sm:w-10"><Icon className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={1.5} /></span>
                <div className="min-w-0"><div className="text-[8px] font-bold leading-tight text-[#6b5b5a] min-[390px]:text-[9px] sm:text-[11px]">{title}</div><div className="mt-0.5 text-[7px] leading-tight text-[#8a797c] min-[390px]:text-[8px] sm:text-[10px]">{desc}</div></div>
              </div>
            ))}
          </div>
        </section>
      </Editable>
    );
  };

  const renderCategories = () => {
    if (categories.length === 0) return null;
    return (
      <Editable elementId={SECAO("categories")} panelKey="categories" label="Categorias"
        onMove={(dir) => moveSection("categories", dir)} onHide={() => hideSection("categories")}>
        <section className="mx-auto w-[96%] max-w-[1440px] px-3 py-5">
          <div className="relative mb-3 flex items-center justify-center">
            <h2 className="text-sm font-extrabold uppercase tracking-[0.08em] text-[var(--store-accent,#d46a86)]">Categorias em destaque</h2>
            <Link to="/loja/catalogo" className="absolute right-0 text-xs font-semibold text-[var(--store-accent,#d46a86)]">Ver todas</Link>
          </div>
          <div className="relative">
            <div ref={catScrollRef} className="flex gap-3 overflow-x-auto pb-2 pt-1 scrollbar-hide md:justify-center">
              {[...categories]
                .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0) || translateCategoryName(a.name, i18n.language).localeCompare(translateCategoryName(b.name, i18n.language)))
                .map((c) => {
                const Icon = categoryIcon(c.name, c.icon);
                return (
                  <Link key={c.id} to={`/loja/catalogo?cat=${c.id}`}
                    className="group relative flex w-28 shrink-0 flex-col items-center gap-2 overflow-hidden rounded-xl border border-rose-100 bg-gradient-to-b from-white to-[#fff5f7] px-3 py-4 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[var(--store-accent,#d46a86)] hover:shadow-[0_10px_25px_-12px_rgba(212,106,134,0.55)] sm:w-32">
                    <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-[var(--store-accent,#C99C5A)]/30 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full" />
                    <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-[#f8dde5]/70 text-[var(--store-accent,#d46a86)]"><Icon className="h-7 w-7" strokeWidth={1.35} /></span>
                    <span className="relative line-clamp-2 text-[10px] font-semibold leading-tight text-[#6b5b5a]">{translateCategoryName(c.name, i18n.language)}</span>
                  </Link>
                );
              })}
            </div>
            {categories.length > 6 && (
              <button
                onClick={() => catScrollRef.current?.scrollBy({ left: 240, behavior: "smooth" })}
                className="absolute -right-3 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-600 shadow-md transition hover:text-[var(--store-accent,#C99C5A)] sm:flex lg:hidden"
                aria-label={t("home.proximasCategorias")}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </section>
      </Editable>
    );
  };

  const renderMarcas = () => {
    if (brands.length === 0) return null; // sem logo cadastrado ainda: nada pra mostrar
    return <MarcasSection brands={brands} />;
  };

  const categoryShowcases = useMemo(() => (
    categories
      .map((category: any) => ({
        category,
        products: allInStock.filter((product: any) => product.groupId === category.id).slice(0, 12),
      }))
      .filter((entry) => entry.products.length > 0)
      .slice(0, 5)
  ), [categories, allInStock]);

  const renderVitrines = () => {
    if (loading) {
      return <div className="flex items-center justify-center py-16 text-stone-400"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> {t("home.carregandoVitrine")}</div>;
    }
    let inner: React.ReactNode;
    if (Array.isArray(cfg.vitrines) && cfg.vitrines.length > 0) {
      inner = (
        <div className="flex flex-col gap-2">
          <ProductSection title="Produtos mais amados" link="/loja/catalogo?ord=popular" products={allInStock.slice(0, 12)} />
          <NewsletterBanner />
          {/* Cada vitrine configurada tem a própria barrinha (🗑️ ↑↓ ⧉ ✏️) — o
              🗑️ confirma inline na barrinha, nada de modal. As 4 vitrines
              padrão do fallback abaixo NÃO ganham barrinha própria: não
              existem no rascunho, não há o que apagar/mover — o hover delas
              continua caindo na seção secao-vitrines. */}
          {cfg.vitrines.map((v: any) => (
            <Editable key={v.id} elementId={`vitrine-${v.id}`} panelKey="vitrines" label={`Vitrine: ${v.title || t("home.vitrineEyebrow")}`}
              onMove={(dir) => moveVitrine(v.id, dir)} onDelete={() => deleteVitrine(v.id)} onDuplicate={() => duplicateVitrine(v.id)}>
              <ProductSection title={v.title || t("home.vitrineEyebrow")} link="/loja/catalogo" products={vitrineProducts[v.id] || []} />
            </Editable>
          ))}
        </div>
      );
    } else {
      const popularProducts = allInStock.length > 0 ? allInStock.slice(0, 12) : featured;
      inner = popularProducts.length === 0 ? (
        <><div className="py-12 text-center text-stone-400">{t("home.vitrinePreparando")}</div><NewsletterBanner /></>
      ) : (
        <div className="flex flex-col gap-2">
          <ProductSection title="Produtos mais amados" link="/loja/catalogo?ord=popular" products={popularProducts} />
          <NewsletterBanner />
          {categoryShowcases.map(({ category, products }) => (
            <ProductSection
              key={category.id}
              title={translateCategoryName(category.name, i18n.language)}
              link={`/loja/catalogo?cat=${category.id}`}
              products={products}
            />
          ))}
          <ProductSection title={t("home.novidades")} link="/loja/catalogo?ord=newest" products={newest.length > 0 ? newest : popularProducts.slice().reverse()} />
        </div>
      );
    }
    return (
      <Editable elementId={SECAO("vitrines")} panelKey="vitrines" label="Vitrines"
        onMove={(dir) => moveSection("vitrines", dir)} onHide={() => hideSection("vitrines")}>
        {inner}
      </Editable>
    );
  };

  const renderHero = () => (
    <Editable elementId={SECAO("hero")} label="Bloco de marca"
      onMove={(dir) => moveSection("hero", dir)} onHide={() => hideSection("hero")}>
      <section className="bg-white">
        <div className="mx-auto max-w-4xl px-4 py-10 text-center md:py-16">
          <Editable panelKey="heroTitle" label="Título do topo">
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-stone-900 md:text-5xl" style={{ fontFamily: "var(--store-font-heading, 'Barlow Condensed'), sans-serif", textTransform: "uppercase" }}>
              {loading
                ? <span className="inline-block h-10 w-64 max-w-full animate-pulse rounded-md bg-stone-200 align-middle md:h-12 md:w-96" />
                : cfg.heroTitle ? cfg.heroTitle : (<>{info?.storeName || t("home.heroFallbackTitulo")},<br /><em className="text-stone-900">{t("home.heroFallbackTituloEm")}</em></>)}
            </h1>
          </Editable>
          <Editable panelKey="heroSubtitle" label="Subtítulo">
            <p className="mx-auto mt-6 max-w-xl text-stone-500">
              {loading
                ? <span className="inline-block h-4 w-72 max-w-full animate-pulse rounded-sm bg-stone-200" />
                : (cfg.heroSubtitle || t("home.heroFallbackSubtitulo"))}
            </p>
          </Editable>
          {/* Ordem vem de heroCtaOrder, tamanho de heroCtaSize (top-level da
              config, Task 1) com preview da alça; os ↑↓ da barrinha trocam a
              ordem dos 2 botões entre si (payload em função: lê o draft fresco
              na fila, nunca o cfg do render). */}
          <Editable elementId="hero-ctas" label="Botões de ação"
            onMove={() => editCtx ? editCtx.patchDraft((draft: any) => ({ heroCtaOrder: draft?.heroCtaOrder === "invertida" ? "" : "invertida" })) : Promise.resolve(false)}>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {(cfg.heroCtaOrder === "invertida" ? ["whatsapp", "catalogo"] : ["catalogo", "whatsapp"]).map((cta) => {
                const ctaSize = CTA_SIZE_CLASSES[sizePreview["hero-ctas"] || cfg.heroCtaSize || "M"] || CTA_SIZE_CLASSES.M;
                if (cta === "catalogo") {
                  return (
                    <Link key="catalogo" to="/loja/catalogo" className={`inline-flex items-center gap-2 rounded-full bg-stone-900 font-bold text-white transition hover:scale-105 hover:bg-stone-900 ${ctaSize}`}>
                      {t("home.verProdutos")} <ArrowRight className="h-4 w-4" />
                    </Link>
                  );
                }
                if (!info?.whatsapp) return null;
                return (
                  <a key="whatsapp" href={`https://wa.me/${String(info.whatsapp).replace(/\D/g, "")}`} target="_blank" rel="noreferrer"
                    className={`inline-flex items-center gap-2 rounded-full border border-stone-300 font-bold text-stone-700 transition hover:scale-105 hover:border-emerald-500 hover:text-emerald-700 ${ctaSize}`}>
                    <MessageCircle className="h-4 w-4" /> {t("home.chamarWhatsapp")}
                  </a>
                );
              })}
            </div>
            {editCtx && (
              <ResizeHandle current={(cfg.heroCtaSize as Tamanho) || "M"} elementId="hero-ctas"
                onPreview={(t) => setSizePreview((prev) => ({ ...prev, "hero-ctas": t }))}
                onCommit={(t) => editCtx.patchDraft((draft: any) => (draft?.heroCtaSize === t ? null : { heroCtaSize: t }))} />
            )}
          </Editable>
        </div>
      </section>
    </Editable>
  );

  const renderSideBanner = (s: SecaoPagina) => {
    if (allInStock.length === 0) return null;
    const tamanho = sizePreview[SECAO("sideBanner")] || s.tamanho || "M";
    return (
      <Editable elementId={SECAO("sideBanner")} label="Destaque com banner lateral"
        onMove={(dir) => moveSection("sideBanner", dir)} onHide={() => hideSection("sideBanner")}>
        <section className="mx-auto w-[95%] max-w-[1600px] px-4 py-6">
          {/* Mesma moldura das vitrines (ProductSection): box arredondado com
              borda, group/vitrine pro hover — aqui não tem faixa colorida
              própria (o painel escuro já é o "destaque" visual), mas o box
              como um todo segue o mesmo padrão de enquadramento da página. */}
          {/* group/vitrine nomeado (não "group" sem nome) — cada
              ShopProductCard aqui dentro também usa "group" sem nome pro
              próprio hover; um "group" sem nome aqui vazaria pra eles (mesmo
              bug já corrigido antes no header colorido da vitrine). Setas do
              carrossel (ScrollArrows) já escutam group-hover/vitrine. */}
          <div className="group/vitrine overflow-hidden rounded-2xl border border-stone-200 bg-white p-4">
            <div className="grid gap-6 md:grid-cols-[280px_1fr]">
              <Editable panelKey="sideBanner" label="Banner lateral">
              <div className={`flex flex-col justify-between rounded-xl bg-stone-900 p-6 text-white ${SIDEBANNER_SIZE_CLASSES[tamanho] || ""}`}>
                <div>
                  <div className="text-[11px] font-extrabold uppercase tracking-widest text-[var(--store-accent,#C99C5A)]">{t("home.selecionadoPraVoce")}</div>
                  <h3 className="mt-2 text-2xl font-bold leading-tight" style={{ fontFamily: "var(--store-font-heading, 'Barlow Condensed'), sans-serif", textTransform: "uppercase" }}>
                    {loading ? <span className="inline-block h-7 w-40 animate-pulse rounded-sm bg-white/20" /> : (cfg.sideBannerTitle || t("home.achadosDaSemana"))}
                  </h3>
                  <p className="mt-3 text-sm text-stone-300">
                    {loading ? <span className="inline-block h-4 w-56 animate-pulse rounded-sm bg-white/10" /> : (cfg.sideBannerSubtitle || t("home.achadosDaSemanaDesc"))}
                  </p>
                </div>
                <PremiumCta
                  size="sm"
                  className="!w-fit self-start"
                  onClick={() => {
                    // ShimmerButton renderiza <button>, e o interceptador de clique do
                    // StoreEditor (StoreEditor.tsx: interceptNav) ignora o alvo mais
                    // próximo quando é <button> (mesmo motivo do ➕/⤷ do
                    // ShopProductCard e do CTA do hero banner acima) — sem essa guarda,
                    // navigate("/loja/catalogo") escaparia do editor pra loja pública.
                    // Dentro do editor a rota existe (StoreCatalog está montada em
                    // /store-settings/editor/catalogo), então navega pra lá em vez de
                    // só bloquear o clique.
                    if (editCtx) { navigate("/store-settings/editor/catalogo"); return; }
                    navigate("/loja/catalogo");
                  }}
                >
                  {t("home.verTodos")} <ArrowRight className="h-4 w-4" />
                </PremiumCta>
              </div>
              </Editable>
              {/* min-w-0: sem isso a coluna 1fr do grid pai cresce junto com o
                  conteúdo do carrossel em vez de deixar o overflow-x-auto rolar
                  por dentro (comportamento padrão de item de grid/flex). */}
              <div className="relative min-w-0">
                {/* Sem slice: TODO produto com estoque entra na fileira — o
                    w-52/56 é só o que cabe visível de cada vez (~5 no
                    desktop), o resto rola por trás via scroll manual (seta)
                    ou pelo autoplay de 5s ali em cima. */}
                <div ref={sideBannerScrollRef} className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide">
                  {allInStock.map((p) => (
                    <div key={p.id} className="w-52 shrink-0 snap-start sm:w-56">
                      <ShopProductCard p={p} />
                    </div>
                  ))}
                </div>
                <ScrollArrows scrollRef={sideBannerScrollRef} alwaysVisible />
              </div>
            </div>
          </div>
        </section>
        {editCtx && (
          <ResizeHandle current={(s.tamanho as Tamanho) || "M"} elementId={SECAO("sideBanner")}
            onPreview={(t) => setSizePreview((prev) => ({ ...prev, [SECAO("sideBanner")]: t }))}
            onCommit={(t) => resizeSection("sideBanner", t)} />
        )}
      </Editable>
    );
  };

  // announcement NÃO renderiza aqui (vive no ShopLayout, acima do header) —
  // só a visibilidade dele é respeitada lá. Ver EditableAnnouncementBar.
  const sectionNode = (s: SecaoPagina): React.ReactNode => {
    switch (s.id) {
      case "banners": return renderBanners(s);
      case "howToBuy": return renderHowToBuy();
      case "categories": return renderCategories();
      case "marcas": return renderMarcas();
      case "vitrines": return renderVitrines();
      case "hero": return renderHero();
      case "sideBanner": return renderSideBanner(s);
      default: return null;
    }
  };

  return (
    <main className="flex flex-col bg-[var(--store-bg,#fff5f7)] pb-20 md:pb-0">
      {/* Seções na ordem da config (pages.home.sections), pulando as ocultas.
          Seção oculta some TAMBÉM dentro do editor (spec) — o caminho de
          recuperação é o painel Seções da toolbar (Task 8). */}
      {homeSections
        .filter((s) => s.id !== "announcement" && s.visivel !== false)
        .map((s) => <React.Fragment key={s.id}>{sectionNode(s)}</React.Fragment>)}

      <TextPanel panelKey="heroTitle" title="Título do topo" fieldKey="heroTitle" maxLength={120} />
      <TextPanel panelKey="heroSubtitle" title="Subtítulo" fieldKey="heroSubtitle" maxLength={300} />
      <HowToBuyPanel />
      <BannerPanel />
      <SideBannerPanel />
      <CategoriesPanel onChanged={loadCategories} />
      <VitrinesPanel />

    </main>
  );
}
