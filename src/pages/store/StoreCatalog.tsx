import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { Check, Loader2, PackageSearch, RotateCcw, SlidersHorizontal, X } from "lucide-react";
import { ShopProductCard } from "./ShopProductCard";
import { translateCategoryName } from "./i18n";
import { Editable } from "./editor/Editable";
import { useEditMode } from "./editor/EditModeContext";
import { CatalogoTituloPanel } from "./editor/panels/CatalogoTituloPanel";
import { effectiveCatalogoSections, SecaoPagina } from "./editor/elementCatalog";

const SECAO = (id: string) => `secao-${id}`;
const CATALOGO_TITULO_COR_PADRAO = "#D46A86";

type FilterDraft = {
  busca: string;
  cat: string;
  sub: string;
  marca: string;
  modelo: string;
  precoMin: string;
  precoMax: string;
};

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
  const canal = params.get("canal") || "";
  const ord = params.get("ord") || "name";
  const marca = params.get("marca") || "";
  const modelo = params.get("modelo") || "";
  const precoMin = params.get("precoMin") || "";
  const precoMax = params.get("precoMax") || "";

  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [filterMeta, setFilterMeta] = useState({ brands: [] as string[], priceMin: 0, priceMax: 0 });
  const [draft, setDraft] = useState<FilterDraft>({ busca, cat, sub, marca, modelo, precoMin, precoMax });

  useEffect(() => {
    setDraft({ busca, cat, sub, marca, modelo, precoMin, precoMax });
  }, [busca, cat, sub, marca, modelo, precoMin, precoMax]);

  useEffect(() => {
    fetch("/api/store/filters")
      .then((r) => r.json())
      .then((j) => setFilterMeta({
        brands: Array.isArray(j.brands) ? j.brands : [],
        priceMin: Number(j.priceMin) || 0,
        priceMax: Number(j.priceMax) || 0,
      }))
      .catch(() => {});
    fetch("/api/store/categories")
      .then((r) => r.json())
      .then((j) => setCategories(j.data || []))
      .catch(() => {});
  }, []);

  const editCtx = useEditMode();
  const inEditor = !!editCtx;
  const [cfg, setCfg] = useState<any>({});
  useEffect(() => { if (editCtx?.draft) setCfg(editCtx.draft); }, [editCtx?.draft]);
  useEffect(() => {
    if (inEditor) return;
    fetch("/api/store/config").then((r) => r.json()).then((c) => setCfg(c || {})).catch(() => {});
  }, [inEditor]);

  const catalogoSections = useMemo(() => effectiveCatalogoSections(cfg), [cfg]);
  const patchCatalogoSections = (mutate: (sections: SecaoPagina[]) => SecaoPagina[] | null) => {
    if (!editCtx) return Promise.resolve(false);
    return editCtx.patchDraft((current: any) => {
      const sections = mutate(effectiveCatalogoSections(current).map((s) => ({ ...s })));
      if (!sections) return null;
      return {
        pages: {
          catalogo: {
            ...(current?.pages?.catalogo || {}),
            titulo: String(current?.pages?.catalogo?.titulo || ""),
            tituloCor: String(current?.pages?.catalogo?.tituloCor || ""),
            sections: sections.map((s, i) => ({ ...s, ordem: i })),
          },
        },
      };
    });
  };

  const moveCatalogoSection = (id: string, dir: -1 | 1) => patchCatalogoSections((sections) => {
    const i = sections.findIndex((s) => s.id === id);
    if (i < 0) return null;
    let j = i + dir;
    while (j >= 0 && j < sections.length && sections[j].visivel === false) j += dir;
    if (j < 0 || j >= sections.length) return null;
    [sections[i], sections[j]] = [sections[j], sections[i]];
    return sections;
  });

  const hideCatalogoSection = (id: string) => patchCatalogoSections((sections) => {
    const section = sections.find((item) => item.id === id);
    if (!section || section.visivel === false) return null;
    section.visivel = false;
    return sections;
  });

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
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      if (value) next.set(key, value); else next.delete(key);
      if (key === "cat") next.delete("sub");
      return next;
    }, { replace: true });
  };

  const applyFilters = () => {
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      const values: Record<string, string> = {
        busca: draft.busca.trim(),
        cat: draft.cat,
        sub: draft.sub,
        marca: draft.marca,
        modelo: draft.modelo.trim(),
        precoMin: draft.precoMin,
        precoMax: draft.precoMax,
      };
      Object.entries(values).forEach(([key, value]) => {
        if (value) next.set(key, value); else next.delete(key);
      });
      if (!draft.cat) next.delete("sub");
      return next;
    }, { replace: true });
    setMobileFiltersOpen(false);
  };

  const clearFilters = () => {
    setDraft({ busca: "", cat: "", sub: "", marca: "", modelo: "", precoMin: "", precoMax: "" });
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      ["busca", "cat", "sub", "marca", "modelo", "precoMin", "precoMax"].forEach((key) => next.delete(key));
      return next;
    }, { replace: true });
  };

  const activeCat = categories.find((c) => c.id === cat);
  const draftCat = categories.find((c) => c.id === draft.cat);
  const filtrosVisible = catalogoSections.find((s) => s.id === "filtros")?.visivel !== false;
  const gradeVisible = catalogoSections.find((s) => s.id === "grade")?.visivel !== false;
  const priceBoundsReady = filterMeta.priceMax > filterMeta.priceMin;
  const curMin = draft.precoMin === "" ? filterMeta.priceMin : Number(draft.precoMin);
  const curMax = draft.precoMax === "" ? filterMeta.priceMax : Number(draft.precoMax);
  const pct = (v: number) => filterMeta.priceMax > filterMeta.priceMin
    ? ((v - filterMeta.priceMin) / (filterMeta.priceMax - filterMeta.priceMin)) * 100
    : 0;
  const activeFilterCount = [busca, cat, sub, marca, modelo, precoMin, precoMax].filter(Boolean).length;

  const filterFields = (
    <div className="store-catalog-filter-fields space-y-3">
      <div>
        <label className="mb-1 block font-semibold uppercase text-stone-500">{t("catalog.buscar", "Buscar")}</label>
        <input
          value={draft.busca}
          onChange={(e) => setDraft((state) => ({ ...state, busca: e.target.value }))}
          placeholder={t("catalog.buscarPlaceholder", "Nome, marca ou modelo")}
          className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs text-stone-700 outline-none transition focus:border-[var(--store-accent,#D46A86)]"
        />
      </div>

      {filterMeta.brands.length > 0 && (
        <div>
          <label className="mb-1 block font-semibold uppercase text-stone-500">{t("catalog.marca", "Marca")}</label>
          <select
            value={draft.marca}
            onChange={(e) => setDraft((state) => ({ ...state, marca: e.target.value }))}
            className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs text-stone-700 outline-none focus:border-[var(--store-accent,#D46A86)]"
          >
            <option value="">{t("catalog.todosMarca", "Todos")}</option>
            {filterMeta.brands.map((brand) => <option key={brand} value={brand}>{brand}</option>)}
          </select>
        </div>
      )}

      <div>
        <label className="mb-1 block font-semibold uppercase text-stone-500">{t("catalog.categoria", "Categoria")}</label>
        <select
          value={draft.cat}
          onChange={(e) => setDraft((state) => ({ ...state, cat: e.target.value, sub: "" }))}
          className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs uppercase text-stone-700 outline-none focus:border-[var(--store-accent,#D46A86)]"
        >
          <option value="">{t("catalog.todas")}</option>
          {[...categories]
            .sort((a, b) => translateCategoryName(a.name, i18n.language).localeCompare(translateCategoryName(b.name, i18n.language)))
            .map((category) => <option key={category.id} value={category.id}>{translateCategoryName(category.name, i18n.language)}</option>)}
        </select>
      </div>

      {draftCat?.subgroups?.length > 0 && (
        <div>
          <label className="mb-1 block font-semibold uppercase text-stone-500">{t("catalog.subcategoria")}</label>
          <div className="flex flex-wrap gap-1.5">
            {draftCat.subgroups.map((sg: any) => (
              <button
                key={sg.id}
                type="button"
                onClick={() => setDraft((state) => ({ ...state, sub: state.sub === sg.id ? "" : sg.id }))}
                className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase transition ${draft.sub === sg.id ? "border-[var(--store-accent,#D46A86)] bg-[var(--store-accent,#D46A86)] text-white" : "border-stone-200 bg-white text-stone-500"}`}
              >
                {translateCategoryName(sg.name, i18n.language)}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="mb-1 block font-semibold uppercase text-stone-500">{t("catalog.modelo", "Modelo")}</label>
        <input
          value={draft.modelo}
          onChange={(e) => setDraft((state) => ({ ...state, modelo: e.target.value }))}
          className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs text-stone-700 outline-none focus:border-[var(--store-accent,#D46A86)]"
        />
      </div>

      {priceBoundsReady && (
        <div className="border-t border-stone-100 pt-3">
          <label className="mb-1 block font-semibold uppercase text-stone-500">{t("catalog.preco", "Preço")}</label>
          <div className="mb-1 flex justify-between text-[10px] text-stone-400">
            <span>R$ {filterMeta.priceMin.toFixed(0)}</span>
            <span>R$ {filterMeta.priceMax.toFixed(0)}</span>
          </div>
          <div className="relative mb-3 h-6">
            <div className="absolute top-1/2 h-1 w-full -translate-y-1/2 rounded-full bg-stone-200" />
            <div
              className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-[var(--store-accent,#D46A86)]"
              style={{ left: `${pct(curMin)}%`, right: `${100 - pct(curMax)}%` }}
            />
            <input
              type="range"
              min={filterMeta.priceMin}
              max={filterMeta.priceMax}
              value={curMin}
              onChange={(e) => setDraft((state) => ({ ...state, precoMin: String(Math.min(Number(e.target.value), curMax)) }))}
              className="range-thumb-only absolute inset-x-0 top-0 h-6 w-full appearance-none bg-transparent"
            />
            <input
              type="range"
              min={filterMeta.priceMin}
              max={filterMeta.priceMax}
              value={curMax}
              onChange={(e) => setDraft((state) => ({ ...state, precoMax: String(Math.max(Number(e.target.value), curMin)) }))}
              className="range-thumb-only absolute inset-x-0 top-0 h-6 w-full appearance-none bg-transparent"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block font-semibold uppercase text-stone-400">{t("catalog.minimo", "Mínimo")}</label>
              <input
                type="number"
                value={draft.precoMin}
                placeholder={String(filterMeta.priceMin)}
                onChange={(e) => setDraft((state) => ({ ...state, precoMin: e.target.value }))}
                className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs text-stone-700 outline-none focus:border-[var(--store-accent,#D46A86)]"
              />
            </div>
            <div>
              <label className="mb-1 block font-semibold uppercase text-stone-400">{t("catalog.maximo", "Máximo")}</label>
              <input
                type="number"
                value={draft.precoMax}
                placeholder={String(filterMeta.priceMax)}
                onChange={(e) => setDraft((state) => ({ ...state, precoMax: e.target.value }))}
                className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs text-stone-700 outline-none focus:border-[var(--store-accent,#D46A86)]"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderDesktopFilters = () => (
    <Editable
      elementId={SECAO("filtros")}
      label="Painel de filtros"
      onMove={(dir) => moveCatalogoSection("filtros", dir)}
      onHide={() => hideCatalogoSection("filtros")}
    >
      <aside className="rounded-xl border border-rose-100 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-stone-700">
          <SlidersHorizontal className="h-3.5 w-3.5 text-[var(--store-accent,#D46A86)]" />
          {t("catalog.filtrar", "Filtros")}
        </div>
        {filterFields}
        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-stone-100 pt-3">
          <button type="button" onClick={clearFilters} className="inline-flex items-center justify-center gap-1 rounded-lg border border-stone-200 px-3 py-2 text-[11px] font-semibold text-stone-500 hover:bg-stone-50">
            <RotateCcw className="h-3.5 w-3.5" /> Limpar
          </button>
          <button type="button" onClick={applyFilters} className="inline-flex items-center justify-center gap-1 rounded-lg bg-[var(--store-accent,#D46A86)] px-3 py-2 text-[11px] font-semibold text-white">
            <Check className="h-3.5 w-3.5" /> Aplicar
          </button>
        </div>
      </aside>
    </Editable>
  );

  const renderGrade = () => (
    <Editable
      elementId={SECAO("grade")}
      label="Grade de produtos"
      onMove={(dir) => moveCatalogoSection("grade", dir)}
      onHide={() => hideCatalogoSection("grade")}
    >
      {loading ? (
        <div className="flex items-center justify-center py-24 text-xs text-stone-400">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("catalog.carregando")}
        </div>
      ) : products.length === 0 ? (
        <div className="py-20 text-center">
          <PackageSearch className="mx-auto mb-3 h-10 w-10 text-rose-200" />
          <p className="mx-auto max-w-md text-xs leading-relaxed text-stone-500">
            {busca
              ? "Desculpe, não encontramos produtos com essa busca. Tente outro termo ou ajuste os filtros."
              : cat
                ? "Desculpe, nosso estoque dessa categoria acabou no momento. Estamos preparando novidades para você — explore outras categorias ou volte em breve. ✨"
                : "Desculpe, não temos produtos disponíveis com esses filtros no momento. Ajuste os filtros ou volte em breve. ✨"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => <ShopProductCard key={product.id} p={product} />)}
        </div>
      )}
    </Editable>
  );

  const configuredTitle = String(cfg?.pages?.catalogo?.titulo || "");
  const configuredTitleColor = String(cfg?.pages?.catalogo?.tituloCor || "");
  const titleColor = /^#[0-9a-fA-F]{6}$/.test(configuredTitleColor) ? configuredTitleColor : CATALOGO_TITULO_COR_PADRAO;
  const titleText = canal === "oferta"
    ? "Ofertas"
    : canal === "outlet"
      ? "Outlet"
      : busca
        ? `${t("catalog.resultados")} “${busca}”`
        : activeCat
          ? translateCategoryName(activeCat.name, i18n.language)
          : (configuredTitle || t("catalog.todas"));

  const h1 = (
    <h1
      className="text-[21px] font-bold uppercase leading-none tracking-[-0.01em] sm:text-2xl"
      style={{ fontFamily: "var(--store-font-heading, 'Barlow Condensed'), sans-serif", color: titleColor }}
    >
      {titleText}
    </h1>
  );

  return (
    <main className="store-catalog-page mx-auto w-full max-w-[1600px] px-4 py-5 sm:w-[95%] sm:py-8">
      <div className="mb-3">
        {inEditor ? (
          <Editable elementId="catalogo-titulo" panelKey="catalogoTitulo" label="Título do catálogo">{h1}</Editable>
        ) : h1}
      </div>

      {gradeVisible && (
        <div className="mb-3 flex items-center justify-between gap-2 border-b border-rose-100 pb-2.5 md:grid md:grid-cols-[250px_1fr] md:border-b-0 md:pb-0">
          <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-stone-400 md:hidden">
            {loading ? t("catalog.carregando") : `${products.length} ${t("catalog.produtos")}`}
          </div>
          <div className="hidden md:block" />
          <div className="flex flex-1 items-center justify-end gap-2 md:justify-between">
            <div className="hidden text-[10px] font-medium uppercase tracking-[0.14em] text-stone-400 md:block">
              {loading ? t("catalog.carregando") : `${products.length} ${t("catalog.produtos")}`}
            </div>
            <div className="flex items-center gap-1.5">
              {filtrosVisible && (
                <button
                  type="button"
                  onClick={() => setMobileFiltersOpen(true)}
                  className="inline-flex h-8 items-center gap-1.5 rounded-full border border-rose-200 bg-white px-3 text-[11px] font-semibold text-[var(--store-accent,#D46A86)] shadow-sm md:hidden"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  Filtros
                  {activeFilterCount > 0 && <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--store-accent,#D46A86)] px-1 text-[9px] text-white">{activeFilterCount}</span>}
                </button>
              )}
              <select
                value={ord}
                onChange={(e) => patch("ord", e.target.value)}
                aria-label="Ordenar produtos"
                className="h-8 appearance-none rounded-full border border-stone-200 bg-white px-3 text-[11px] text-stone-600 outline-none focus:border-[var(--store-accent,#D46A86)]"
              >
                {SORTS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

      <div className={`grid gap-5 ${filtrosVisible ? "md:grid-cols-[250px_1fr]" : "md:grid-cols-1"}`}>
        {filtrosVisible && <div className="hidden min-w-0 md:block">{renderDesktopFilters()}</div>}
        {gradeVisible && <div className="min-w-0">{renderGrade()}</div>}
      </div>

      {mobileFiltersOpen && filtrosVisible && (
        <div className="fixed inset-0 z-[9998] md:hidden" role="dialog" aria-modal="true" aria-label="Filtros do catálogo">
          <button type="button" className="absolute inset-0 bg-stone-900/30 backdrop-blur-[1px]" onClick={() => setMobileFiltersOpen(false)} aria-label="Fechar filtros" />
          <aside className="absolute inset-y-0 right-0 flex w-[88%] max-w-[360px] flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-rose-100 px-4 py-3.5">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--store-accent,#D46A86)]">Catálogo</div>
                <div className="mt-0.5 text-sm font-bold text-stone-700">Filtros</div>
              </div>
              <button type="button" onClick={() => setMobileFiltersOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-full border border-stone-200 text-stone-500" aria-label="Fechar">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              {filterFields}
            </div>
            <div className="grid grid-cols-[0.8fr_1.2fr] gap-2 border-t border-rose-100 bg-white p-4">
              <button type="button" onClick={clearFilters} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-stone-200 text-[11px] font-semibold text-stone-500">
                <RotateCcw className="h-3.5 w-3.5" /> Limpar
              </button>
              <button type="button" onClick={applyFilters} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[var(--store-accent,#D46A86)] text-[11px] font-semibold text-white shadow-sm">
                <Check className="h-3.5 w-3.5" /> Aplicar filtros
              </button>
            </div>
          </aside>
        </div>
      )}

      <CatalogoTituloPanel />
    </main>
  );
}
