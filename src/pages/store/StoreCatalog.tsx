import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { Loader2, PackageSearch, SlidersHorizontal } from "lucide-react";
import { ShopProductCard } from "./ShopProductCard";
import { translateCategoryName } from "./i18n";
import { Editable } from "./editor/Editable";
import { useEditMode } from "./editor/EditModeContext";
import { CatalogoTituloPanel } from "./editor/panels/CatalogoTituloPanel";
import { effectiveCatalogoSections, SecaoPagina } from "./editor/elementCatalog";

// Id de SEÇÃO no catálogo de elementos ("secao-filtros"); os helpers de
// mover/ocultar seguem usando o id cru ("filtros") — mesmo padrão da StoreHome.
const SECAO = (id: string) => `secao-${id}`;

// Catálogo completo: busca (via ?busca=), categoria (?cat=) e ordenação (?ord=).
export function StoreCatalog() {
  const { t, i18n } = useTranslation();
  const SORTS: Array<[string, string]> = [
    ["name", t("catalog.ordenarNome", "Nome (A–Z)")],
    ["newest", t("home.novidades")],
    ["price_asc", t("catalog.menorPreco", "Menor preço")],
    ["price_desc", t("catalog.maiorPreco", "Maior preço")],
  ];
  const [params, setParams] = useSearchParams();
  const busca = params.get("busca") || "";
  const cat = params.get("cat") || "";
  const sub = params.get("sub") || "";
  const canal = params.get("canal") || ""; // '' | 'oferta' | 'outlet'
  const ord = params.get("ord") || "name";
  const marca = params.get("marca") || "";
  const modelo = params.get("modelo") || "";
  const precoMin = params.get("precoMin") || "";
  const precoMax = params.get("precoMax") || "";

  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Marcas disponíveis + faixa real de preço da loja (limites do slider) —
  // busca uma vez, não muda com o filtro aplicado (senão o slider encolheria
  // sozinho conforme o usuário filtra).
  const [filterMeta, setFilterMeta] = useState({ brands: [] as string[], priceMin: 0, priceMax: 0 });
  useEffect(() => {
    fetch("/api/store/filters").then((r) => r.json())
      .then((j) => setFilterMeta({ brands: Array.isArray(j.brands) ? j.brands : [], priceMin: Number(j.priceMin) || 0, priceMax: Number(j.priceMax) || 0 }))
      .catch(() => {});
  }, []);

  // Rascunho local dos campos "ao vivo" (busca/modelo/preço) — evita disparar
  // uma requisição por tecla digitada ou por pixel arrastado no slider; só
  // grava na URL (e por tabela dispara o fetch de produtos) 350ms depois da
  // última mudança. Marca/categoria/ordenação continuam imediatos (clique
  // discreto, não digitação contínua).
  const [draft, setDraft] = useState({ busca, modelo, marca, precoMin, precoMax });
  useEffect(() => {
    const timer = setTimeout(() => {
      setParams((prev) => {
        const next = new URLSearchParams(prev);
        Object.entries(draft).forEach(([k, v]) => { if (v) next.set(k, String(v)); else next.delete(k); });
        return next;
      }, { replace: true });
    }, 350);
    return () => clearTimeout(timer);
  }, [draft, setParams]);
  // Busca do header (submit do formulário lá em cima) navega direto pra URL
  // sem passar pelo rascunho — sem isso o campo daqui dentro ficaria com
  // texto velho enquanto os resultados já mudaram. Só puxa quando a URL
  // realmente diverge do rascunho (senão o próprio commit acima criaria loop).
  useEffect(() => {
    setDraft((d) => (d.busca === busca ? d : { ...d, busca }));
  }, [busca]);
  // Se o slider ainda não tem limites reais (filterMeta chegou depois do
  // primeiro render), inicializa o rascunho de preço só uma vez, sem
  // sobrescrever o que a URL já trazia (ex.: link compartilhado com filtro).
  useEffect(() => {
    if (filterMeta.priceMax > 0 && !precoMin && !precoMax) {
      setDraft((d) => ({ ...d, precoMin: String(filterMeta.priceMin), precoMax: String(filterMeta.priceMax) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterMeta.priceMax]);

  // Config (pages.catalogo): dentro do editor vem do rascunho ao vivo; fora,
  // do /api/store/config publicado — mesmo padrão do cfg da StoreHome. Só a
  // PRESENÇA do editor importa como dependência (booleano estável), não a
  // identidade do objeto de contexto, que muda a cada render do provider.
  const editCtx = useEditMode();
  const inEditor = !!editCtx;
  const [cfg, setCfg] = useState<any>({});
  useEffect(() => { if (editCtx?.draft) setCfg(editCtx.draft); }, [editCtx?.draft]);
  useEffect(() => {
    if (inEditor) return; // dentro do editor o draft é a fonte da verdade
    fetch("/api/store/config").then((r) => r.json()).then((c) => setCfg(c || {})).catch(() => {});
  }, [inEditor]);

  // Ordem/visibilidade efetivas: config `pages.catalogo.sections` quando
  // existir, senão o layout fixo de hoje (DEFAULT_CATALOGO_SECTIONS).
  const catalogoSections = useMemo(() => effectiveCatalogoSections(cfg), [cfg]);

  // Mover/ocultar seção: payload é FUNÇÃO — o patchDraft roda ela na fila,
  // contra o draft fresco daquele momento (não o do clique), mesma proteção
  // de stale closure do patchHomeSections da StoreHome. O merge do servidor é
  // POR PÁGINA e substitui `catalogo` inteira (Task 1): titulo + sections vão
  // SEMPRE juntos. `mutate` devolve null = no-op (nada gravado, nada dirty).
  const patchCatalogoSections = (mutate: (sections: SecaoPagina[]) => SecaoPagina[] | null) => {
    if (!editCtx) return Promise.resolve(false);
    return editCtx.patchDraft((draft: any) => {
      const sections = mutate(effectiveCatalogoSections(draft).map((s) => ({ ...s })));
      if (!sections) return null;
      return {
        pages: {
          catalogo: {
            titulo: String(draft?.pages?.catalogo?.titulo || ""),
            sections: sections.map((s, i) => ({ ...s, ordem: i })),
          },
        },
      };
    });
  };
  const moveCatalogoSection = (id: string, dir: -1 | 1) => patchCatalogoSections((sections) => {
    const i = sections.findIndex((s) => s.id === id);
    if (i < 0) return null;
    // Troca com o vizinho VISÍVEL mais próximo na direção — trocar com uma
    // oculta seria um clique visualmente sem efeito (mesma regra da home).
    let j = i + dir;
    while (j >= 0 && j < sections.length && sections[j].visivel === false) j += dir;
    if (j < 0 || j >= sections.length) return null;
    [sections[i], sections[j]] = [sections[j], sections[i]];
    return sections;
  });
  const hideCatalogoSection = (id: string) => patchCatalogoSections((sections) => {
    const s = sections.find((x) => x.id === id);
    if (!s || s.visivel === false) return null;
    s.visivel = false; // cópia rasa feita no patchCatalogoSections — mutar aqui é seguro
    return sections;
  });

  useEffect(() => {
    fetch("/api/store/categories").then((r) => r.json()).then((j) => setCategories(j.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    const q = new URLSearchParams();
    if (busca) q.set("search", busca);
    if (cat) q.set("group", cat);
    if (sub) q.set("subgroup", sub);
    if (canal) q.set("canal", canal);
    q.set("sort", ord);
    if (marca) q.set("brand", marca);
    if (modelo) q.set("model", modelo);
    // precoMin/Max só vai pro servidor quando é MENOS restritivo que "mostra
    // tudo" (ainda no valor padrão dos limites reais) — evita mandar min/max
    // exatamente iguais aos limites toda vez, sem mudar o resultado.
    if (precoMin && Number(precoMin) > filterMeta.priceMin) q.set("minPrice", precoMin);
    if (precoMax && Number(precoMax) < filterMeta.priceMax) q.set("maxPrice", precoMax);
    fetch(`/api/store/products?${q}`)
      .then((r) => r.json())
      .then((j) => { if (alive) setProducts(Array.isArray(j.data) ? j.data : []); })
      .catch(() => { if (alive) setProducts([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [busca, cat, sub, canal, ord, marca, modelo, precoMin, precoMax, filterMeta.priceMin, filterMeta.priceMax]);

  const patch = (key: string, value: string) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value); else next.delete(key);
      // Subcategoria só existe dentro de uma categoria — trocar/limpar a
      // categoria invalida qualquer subgrupo selecionado antes.
      if (key === "cat") next.delete("sub");
      return next;
    }, { replace: true });
  };

  const activeCat = categories.find((c) => c.id === cat);
  const filtrosVisible = catalogoSections.find((s) => s.id === "filtros")?.visivel !== false;
  const gradeVisible = catalogoSections.find((s) => s.id === "grade")?.visivel !== false;

  // Slider de preço: dois <input type="range"> sobrepostos (truque padrão de
  // range duplo sem lib nova) — cada um só recebe clique no próprio polegar
  // (pointer-events do trilho desligado), o trilho preenchido no meio é só
  // visual (dois divs absolutos). Não deixa o mínimo passar do máximo.
  const priceBoundsReady = filterMeta.priceMax > filterMeta.priceMin;
  const curMin = Number(draft.precoMin) || filterMeta.priceMin;
  const curMax = Number(draft.precoMax) || filterMeta.priceMax;
  const pct = (v: number) => filterMeta.priceMax > filterMeta.priceMin ? ((v - filterMeta.priceMin) / (filterMeta.priceMax - filterMeta.priceMin)) * 100 : 0;

  const renderFiltros = () => (
    <Editable elementId={SECAO("filtros")} label="Painel de filtros"
      onMove={(dir) => moveCatalogoSection("filtros", dir)} onHide={() => hideCatalogoSection("filtros")}>
      {/* pt-2 em vez de p-5 uniforme: o texto "FILTRAR" tem que alinhar com o
          texto da contagem de produtos do lado direito (que não tem padding
          nenhum acima) — com p-5 nos 4 lados, "FILTRAR" ficava visivelmente
          mais baixo que "N produto(s)", mesmo com os dois containers com o
          mesmo topo exato. */}
      <div className="rounded-md border border-stone-200 bg-white px-5 pb-5 pt-2">
        <div className="mb-5 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-stone-900">
          <SlidersHorizontal className="h-4 w-4 text-[var(--store-accent,#C99C5A)]" /> {t("catalog.filtrar", "Filtrar")}
        </div>

        <label className="mb-1 block text-xs font-bold uppercase text-stone-500">{t("catalog.buscar", "Buscar")}</label>
        <input value={draft.busca} onChange={(e) => setDraft((d) => ({ ...d, busca: e.target.value }))}
          placeholder={t("catalog.buscarPlaceholder", "Nome, marca ou modelo")}
          className="mb-4 w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-[var(--store-accent,#C99C5A)]" />

        {filterMeta.brands.length > 0 && (
          <>
            <label className="mb-1 block text-xs font-bold uppercase text-stone-500">{t("catalog.marca", "Marca")}</label>
            <select value={marca} onChange={(e) => patch("marca", e.target.value)}
              className="mb-4 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--store-accent,#C99C5A)]">
              <option value="">{t("catalog.todosMarca", "Todos")}</option>
              {filterMeta.brands.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </>
        )}

        <label className="mb-1 block text-xs font-bold uppercase text-stone-500">{t("catalog.categoria", "Categoria")}</label>
        <select value={cat} onChange={(e) => patch("cat", e.target.value)}
          className="mb-4 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm uppercase outline-none focus:border-[var(--store-accent,#C99C5A)]">
          <option value="">{t("catalog.todas")}</option>
          {[...categories]
            .sort((a, b) => translateCategoryName(a.name, i18n.language).localeCompare(translateCategoryName(b.name, i18n.language)))
            .map((c) => <option key={c.id} value={c.id}>{translateCategoryName(c.name, i18n.language)}</option>)}
        </select>

        {activeCat && activeCat.subgroups?.length > 0 && (
          <div className="mb-4">
            <label className="mb-1 block text-xs font-bold uppercase text-stone-500">{t("catalog.subcategoria")}</label>
            <div className="flex flex-wrap gap-1.5">
              {activeCat.subgroups.map((sg: any) => (
                <button key={sg.id} onClick={() => patch("sub", sg.id === sub ? "" : sg.id)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium uppercase transition ${sub === sg.id ? "border-stone-900 bg-stone-900 text-white" : "border-stone-300 bg-white text-stone-600 hover:border-stone-500"}`}>
                  {translateCategoryName(sg.name, i18n.language)}
                </button>
              ))}
            </div>
          </div>
        )}

        <label className="mb-1 block text-xs font-bold uppercase text-stone-500">{t("catalog.modelo", "Modelo")}</label>
        <input value={draft.modelo} onChange={(e) => setDraft((d) => ({ ...d, modelo: e.target.value }))}
          className="mb-4 w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-[var(--store-accent,#C99C5A)]" />

        {priceBoundsReady && (
          <>
            <hr className="mb-4 border-stone-200" />
            <label className="mb-1 block text-xs font-bold uppercase text-stone-500">{t("catalog.preco", "Preço")}</label>
            <div className="mb-1 flex justify-between text-xs text-stone-500">
              <span>R$ {filterMeta.priceMin.toFixed(2)}</span>
              <span>R$ {filterMeta.priceMax.toFixed(2)}</span>
            </div>
            <div className="relative mb-4 h-6">
              <div className="absolute top-1/2 h-1 w-full -translate-y-1/2 rounded-full bg-stone-200" />
              <div className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-[var(--store-accent,#C99C5A)]"
                style={{ left: `${pct(curMin)}%`, right: `${100 - pct(curMax)}%` }} />
              <input type="range" min={filterMeta.priceMin} max={filterMeta.priceMax} value={curMin}
                onChange={(e) => setDraft((d) => ({ ...d, precoMin: String(Math.min(Number(e.target.value), curMax)) }))}
                className="range-thumb-only absolute inset-x-0 top-0 h-6 w-full appearance-none bg-transparent" />
              <input type="range" min={filterMeta.priceMin} max={filterMeta.priceMax} value={curMax}
                onChange={(e) => setDraft((d) => ({ ...d, precoMax: String(Math.max(Number(e.target.value), curMin)) }))}
                className="range-thumb-only absolute inset-x-0 top-0 h-6 w-full appearance-none bg-transparent" />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="mb-1 block text-xs font-bold uppercase text-stone-500">{t("catalog.minimo", "Mínimo")}</label>
                <input type="number" value={draft.precoMin} min={filterMeta.priceMin} max={curMax}
                  onChange={(e) => setDraft((d) => ({ ...d, precoMin: e.target.value }))}
                  className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-[var(--store-accent,#C99C5A)]" />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-xs font-bold uppercase text-stone-500">{t("catalog.maximo", "Máximo")}</label>
                <input type="number" value={draft.precoMax} min={curMin} max={filterMeta.priceMax}
                  onChange={(e) => setDraft((d) => ({ ...d, precoMax: e.target.value }))}
                  className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-[var(--store-accent,#C99C5A)]" />
              </div>
            </div>
          </>
        )}
      </div>
    </Editable>
  );

  const renderGrade = () => (
    <Editable elementId={SECAO("grade")} label="Grade de produtos"
      onMove={(dir) => moveCatalogoSection("grade", dir)} onHide={() => hideCatalogoSection("grade")}>
      {loading ? (
        <div className="flex items-center justify-center py-24 text-stone-400"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> {t("catalog.carregando")}</div>
      ) : products.length === 0 ? (
        <div className="py-24 text-center text-stone-400">
          <PackageSearch className="mx-auto mb-3 h-12 w-12 text-stone-300" />
          {t("catalog.nenhum")}{busca ? t("catalog.nenhumBusca") : cat ? t("catalog.nenhumCategoria") : ""}.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => <ShopProductCard key={p.id} p={p} />)}
        </div>
      )}
    </Editable>
  );

  const tituloConfigurado = String(cfg?.pages?.catalogo?.titulo || "");
  const h1 = (
    <h1 className="text-3xl font-bold uppercase text-stone-900" style={{ fontFamily: "var(--store-font-heading, 'Barlow Condensed'), sans-serif" }}>
      {canal === "oferta" ? "🔥 Ofertas" : canal === "outlet" ? "📦 Outlet" :
        busca ? <>{t("catalog.resultados")} <em className="text-amber-700">"{busca}"</em></> : activeCat ? translateCategoryName(activeCat.name, i18n.language) : (tituloConfigurado || t("catalog.todas"))}
    </h1>
  );

  return (
    <main className="mx-auto w-[95%] max-w-[1600px] px-4 py-8">
      <div className="mb-0.5">
        {/* Editable já é passthrough fora do editor; o inEditor ? ... : h1 é
            redundância explícita porque o título também renderiza busca/
            categoria, que não são editáveis. */}
        {inEditor ? (
          <Editable elementId="catalogo-titulo" panelKey="catalogoTitulo" label="Título do catálogo">{h1}</Editable>
        ) : h1}
        {busca && <button onClick={() => patch("busca", "")} className="mt-1 text-sm text-amber-700 hover:underline">{t("catalog.limpar")}</button>}
      </div>

      {/* Contagem + ordenação FORA da coluna da grade, de propósito: se
          ficasse dentro, empurrava o topo do card do produto pra baixo do
          topo da caixa de filtros — o pedido era alinhar a BORDA de cima
          dos dois boxes, não o texto. Reusa o mesmo grid-cols da fileira de
          baixo só pra cair exatamente sobre a coluna da grade. */}
      {gradeVisible && (
        <div className="mb-3 grid gap-6 md:grid-cols-[280px_1fr]">
          <div className="hidden md:block" />
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs uppercase tracking-widest text-stone-400">
              {loading ? t("catalog.carregando") : `${products.length} ${t("catalog.produtos")}`}
            </div>
            {/* appearance-none + h-6: um <select> nativo tem uma altura mínima
                imposta pelo navegador que padding/line-height sozinhos não
                reduzem (testado — leading-none não tinha efeito nenhum aqui). */}
            <select value={ord} onChange={(e) => patch("ord", e.target.value)}
              className="h-6 appearance-none rounded-full border border-stone-300 bg-white px-3 text-xs text-stone-700 outline-none focus:border-amber-600">
              {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* Seção oculta some TAMBÉM dentro do editor (spec) — a recuperação é
          o painel Seções da toolbar (Task 8). Layout fixo (sidebar+grade) em
          vez de sequencial: com o filtro em painel lateral, a ordem entre as
          duas seções deixou de ter sentido espacial. Os dois boxes (filtros
          e primeiro card da grade) nascem juntos como primeiro filho de
          colunas irmãs do mesmo grid — por isso alinham na borda de cima
          sem precisar de nenhum ajuste fino de margem/padding. */}
      <div className="grid gap-6 md:grid-cols-[280px_1fr]">
        {filtrosVisible && <div className="min-w-0">{renderFiltros()}</div>}
        {gradeVisible && <div className="min-w-0">{renderGrade()}</div>}
      </div>

      <CatalogoTituloPanel />
    </main>
  );
}
