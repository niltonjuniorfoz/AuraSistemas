import React, { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Loader2, Plus, Search, Star, Trash2, X } from "lucide-react";
import { toast } from "../../../../components/Toast";
import { useEditMode } from "../EditModeContext";
import { PanelShell } from "./PanelShell";
import { readStorefrontDesign, upsertStorefrontDesign } from "../../storefrontDesign";

const brl = (v: any) => `R$ ${(Number(v) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

type Vitrine = { id: string; title: string; productIds: string[] };

// Vitrines (prateleiras de produtos escolhidos a dedo) da home da loja — até
// 12 produtos por vitrine, título livre. O mesmo painel também controla o
// único produto editorial em destaque exibido após as duas primeiras
// prateleiras de categoria da home.
export function VitrinesPanel() {
  const ctx = useEditMode();
  const initialDesign = readStorefrontDesign(ctx?.draft?.quickLinks);
  const [vitrines, setVitrines] = useState<Vitrine[]>(Array.isArray(ctx?.draft?.vitrines) ? ctx!.draft.vitrines : []);
  const [saving, setSaving] = useState(false);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [productInfo, setProductInfo] = useState<Record<string, any>>({});
  const hydratedIds = useRef<Set<string>>(new Set());

  const [featuredProductId, setFeaturedProductId] = useState<string>(String(ctx?.draft?.featuredProductIds?.[0] || ""));
  const [featuredSearch, setFeaturedSearch] = useState("");
  const [featuredResults, setFeaturedResults] = useState<any[]>([]);
  const [featuredSearching, setFeaturedSearching] = useState(false);
  const [featuredEyebrow, setFeaturedEyebrow] = useState(initialDesign.featuredEyebrow);
  const [featuredDescription, setFeaturedDescription] = useState(initialDesign.featuredDescription);
  const [featuredPanelColor, setFeaturedPanelColor] = useState(initialDesign.featuredPanelColor);
  const [featuredTextColor, setFeaturedTextColor] = useState(initialDesign.featuredTextColor);
  const [featuredButtonLabel, setFeaturedButtonLabel] = useState(initialDesign.featuredButtonLabel);

  // Nome/foto de um produto já escolhido (a config guarda só o id).
  const hydrate = useCallback((id: string) => {
    if (!id || hydratedIds.current.has(id)) return;
    hydratedIds.current.add(id);
    (async () => {
      try {
        const r = await fetch(`/api/store/product/${id}`);
        if (r.ok) { const j = await r.json(); setProductInfo((cur) => ({ ...cur, [id]: j })); return; }
        setProductInfo((cur) => ({ ...cur, [id]: { name: "(produto indisponível na loja)", missing: true } }));
      } catch {
        setProductInfo((cur) => ({ ...cur, [id]: { name: "(produto indisponível na loja)", missing: true } }));
      }
    })();
  }, []);

  // Resincroniza tudo que é persistido toda vez que o painel abre; alterações
  // locais descartadas não reaparecem numa reabertura.
  useEffect(() => {
    if (ctx?.activePanel === "vitrines") {
      const design = readStorefrontDesign(ctx?.draft?.quickLinks);
      setVitrines(Array.isArray(ctx?.draft?.vitrines) ? ctx!.draft.vitrines : []);
      setFeaturedProductId(String(ctx?.draft?.featuredProductIds?.[0] || ""));
      setFeaturedEyebrow(design.featuredEyebrow);
      setFeaturedDescription(design.featuredDescription);
      setFeaturedPanelColor(design.featuredPanelColor);
      setFeaturedTextColor(design.featuredTextColor);
      setFeaturedButtonLabel(design.featuredButtonLabel);
      setEditingIdx(null);
      setSearch("");
      setResults([]);
      setFeaturedSearch("");
      setFeaturedResults([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx?.activePanel]);

  useEffect(() => {
    if (ctx?.activePanel !== "vitrines") return;
    for (const v of vitrines) for (const id of v.productIds) hydrate(id);
    if (featuredProductId) hydrate(featuredProductId);
  }, [ctx?.activePanel, vitrines, featuredProductId, hydrate]);

  // Busca das vitrines manuais, protegida contra resposta stale quando o
  // usuário troca rapidamente de prateleira ou termo.
  const editingIdxRef = useRef<number | null>(editingIdx);
  useEffect(() => { editingIdxRef.current = editingIdx; }, [editingIdx]);
  const searchRef = useRef(search);
  useEffect(() => { searchRef.current = search; }, [search]);

  useEffect(() => {
    if (!search.trim()) { setResults([]); setSearching(false); return; }
    setSearching(true);
    const requestIdx = editingIdx;
    const requestQuery = search;
    const stale = () => editingIdxRef.current !== requestIdx || searchRef.current !== requestQuery;
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/store/products?search=${encodeURIComponent(search.trim())}`);
        if (!r.ok) throw new Error("Erro ao buscar produtos.");
        const j = await r.json();
        if (stale()) return;
        setResults((j.data || []).slice(0, 6));
      } catch (e: any) {
        if (stale()) return;
        setResults([]);
        toast.error(e.message || "Erro ao buscar produtos.");
      } finally {
        if (!stale()) setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  // Busca independente para o produto editorial em destaque. É seleção única:
  // clicar na estrela troca o produto atual, e clicar na estrela do selecionado
  // remove o destaque da página pública.
  const featuredSearchRef = useRef(featuredSearch);
  useEffect(() => { featuredSearchRef.current = featuredSearch; }, [featuredSearch]);
  useEffect(() => {
    if (ctx?.activePanel !== "vitrines") return;
    if (!featuredSearch.trim()) { setFeaturedResults([]); setFeaturedSearching(false); return; }
    const requestQuery = featuredSearch;
    setFeaturedSearching(true);
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/store/products?search=${encodeURIComponent(requestQuery.trim())}`);
        if (!r.ok) throw new Error("Erro ao buscar produtos.");
        const j = await r.json();
        if (featuredSearchRef.current !== requestQuery) return;
        setFeaturedResults((j.data || []).slice(0, 8));
      } catch (e: any) {
        if (featuredSearchRef.current !== requestQuery) return;
        setFeaturedResults([]);
        toast.error(e.message || "Erro ao buscar produtos.");
      } finally {
        if (featuredSearchRef.current === requestQuery) setFeaturedSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [ctx?.activePanel, featuredSearch]);

  if (!ctx || ctx.activePanel !== "vitrines") return null;

  // Um único patch salva prateleiras + destaque + aparência. A atualização de
  // quickLinks é funcional para nunca apagar metadata concorrente do draft.
  const save = async () => {
    setSaving(true);
    try {
      const ok = await ctx.patchDraft((draft: any) => ({
        vitrines,
        featuredProductIds: featuredProductId ? [featuredProductId] : [],
        quickLinks: upsertStorefrontDesign(draft?.quickLinks, {
          featuredEyebrow,
          featuredDescription,
          featuredPanelColor,
          featuredTextColor,
          featuredButtonLabel,
        }),
      }));
      if (ok) ctx.closePanel();
    } finally {
      setSaving(false);
    }
  };

  const chooseFeatured = (p: any) => {
    const id = String(p?.id || "");
    if (!id) return;
    setProductInfo((cur) => ({ ...cur, [id]: { ...p, images: p.images || (p.imageUrl ? [p.imageUrl] : []) } }));
    setFeaturedProductId(id);
    setFeaturedSearch("");
    setFeaturedResults([]);
  };

  const addVitrine = () => setVitrines((prev) => [...prev, { id: crypto.randomUUID(), title: "Nova vitrine", productIds: [] }]);
  const removeVitrine = (i: number) => {
    setVitrines((prev) => prev.filter((_, idx) => idx !== i));
    setEditingIdx((cur) => {
      if (cur === i) { setSearch(""); setResults([]); return null; }
      if (cur != null && cur > i) { setSearch(""); setResults([]); return cur - 1; }
      return cur;
    });
  };
  const move = (i: number, dir: -1 | 1) => {
    setVitrines((prev) => {
      const target = i + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[target]] = [next[target], next[i]];
      return next;
    });
    setEditingIdx((cur) => {
      if (cur === i) { setSearch(""); setResults([]); return i + dir; }
      if (cur === i + dir) { setSearch(""); setResults([]); return i; }
      return cur;
    });
  };
  const updateTitle = (i: number, title: string) => setVitrines((prev) => prev.map((v, idx) => (idx === i ? { ...v, title } : v)));
  const toggleProduct = (i: number, productId: string) => {
    setVitrines((prev) => prev.map((v, idx) => {
      if (idx !== i) return v;
      const has = v.productIds.includes(productId);
      if (has) return { ...v, productIds: v.productIds.filter((id) => id !== productId) };
      if (v.productIds.length >= 12) { toast.error("Máximo de 12 produtos por vitrine."); return v; }
      return { ...v, productIds: [...v.productIds, productId] };
    }));
  };

  const selectedFeatured = featuredProductId ? productInfo[featuredProductId] : null;
  const safePanelColor = /^#[0-9a-fA-F]{6}$/.test(featuredPanelColor) ? featuredPanelColor : "#d46a86";
  const safeTextColor = /^#[0-9a-fA-F]{6}$/.test(featuredTextColor) ? featuredTextColor : "#ffffff";

  return (
    <PanelShell title="Vitrines de produtos" onClose={ctx.closePanel} onSave={save} saving={saving} wide>
      <section className="mb-5 overflow-hidden rounded-xl border border-rose-200 bg-gradient-to-br from-white to-rose-50/40">
        <div className="flex items-start gap-3 border-b border-rose-100 p-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--store-accent,#d46a86)]/10 text-[var(--store-accent,#d46a86)]">
            <Star className="h-4 w-4 fill-current" />
          </span>
          <div className="min-w-0">
            <div className="text-xs font-bold text-stone-800">Produto em destaque</div>
            <p className="mt-0.5 text-[11px] leading-relaxed text-stone-500">A estrela escolhe um único produto para o bloco editorial depois das duas primeiras vitrines de categoria. Nome e preço são puxados automaticamente do produto.</p>
          </div>
        </div>

        <div className="space-y-3 p-3">
          {featuredProductId ? (
            <div className="flex items-center gap-2.5 rounded-lg border border-[var(--store-accent,#d46a86)]/25 bg-white p-2 shadow-sm">
              <span className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-stone-100">
                {(selectedFeatured?.images?.[0] || selectedFeatured?.imageUrl) && <img src={selectedFeatured.images?.[0] || selectedFeatured.imageUrl} className="h-full w-full object-contain" alt="" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className={`truncate text-xs font-semibold ${selectedFeatured?.missing ? "text-amber-600" : "text-stone-700"}`}>{selectedFeatured?.name || "carregando produto..."}</div>
                {!selectedFeatured?.missing && selectedFeatured?.price != null && <div className="mt-0.5 text-[11px] font-bold text-[var(--store-accent,#d46a86)]">{brl(selectedFeatured.price)}</div>}
              </div>
              <button type="button" onClick={() => setFeaturedProductId("")} title="Remover produto em destaque" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--store-accent,#d46a86)] text-white shadow-sm transition hover:scale-105">
                <Star className="h-4 w-4 fill-current" />
              </button>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-stone-300 bg-white/70 px-3 py-3 text-center text-[11px] text-stone-400">Nenhum produto destacado. Busque abaixo e clique na estrela.</div>
          )}

          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
            <input value={featuredSearch} onChange={(e) => setFeaturedSearch(e.target.value)} placeholder="Buscar produto para destacar..." className="w-full rounded-lg border border-stone-300 bg-white py-2 pl-8 pr-3 text-xs outline-none focus:border-[var(--store-accent,#d46a86)]" />
          </div>
          {featuredSearching && <div className="flex items-center gap-1 text-[11px] text-stone-400"><Loader2 className="h-3 w-3 animate-spin" /> Buscando...</div>}
          {!featuredSearching && featuredResults.length > 0 && (
            <div className="max-h-48 overflow-y-auto rounded-lg border border-stone-200 bg-white">
              {featuredResults.map((p) => {
                const selected = featuredProductId === String(p.id);
                return (
                  <button key={p.id} type="button" onClick={() => selected ? setFeaturedProductId("") : chooseFeatured(p)} className="flex w-full items-center gap-2 border-b border-stone-100 px-2 py-2 text-left last:border-b-0 hover:bg-rose-50/40">
                    <span className="h-8 w-8 shrink-0 overflow-hidden rounded bg-stone-100">{(p.imageUrl || p.images?.[0]) && <img src={p.imageUrl || p.images?.[0]} className="h-full w-full object-contain" alt="" />}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-semibold text-stone-700">{p.name}</span>
                      <span className="block text-[10px] text-stone-400">{brl(p.price)}</span>
                    </span>
                    <Star className={`h-4 w-4 shrink-0 ${selected ? "fill-[var(--store-accent,#d46a86)] text-[var(--store-accent,#d46a86)]" : "text-stone-300"}`} />
                  </button>
                );
              })}
            </div>
          )}

          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-stone-500">Título curto / hashtag</span>
              <input value={featuredEyebrow} onChange={(e) => setFeaturedEyebrow(e.target.value.slice(0, 70))} className="w-full rounded-md border border-stone-300 p-2 text-xs outline-none focus:border-[var(--store-accent,#d46a86)]" />
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-stone-500">Texto do botão</span>
              <input value={featuredButtonLabel} onChange={(e) => setFeaturedButtonLabel(e.target.value.slice(0, 36))} className="w-full rounded-md border border-stone-300 p-2 text-xs outline-none focus:border-[var(--store-accent,#d46a86)]" />
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-stone-500">Descrição</span>
            <textarea value={featuredDescription} onChange={(e) => setFeaturedDescription(e.target.value.slice(0, 220))} rows={3} className="w-full resize-none rounded-md border border-stone-300 p-2 text-xs outline-none focus:border-[var(--store-accent,#d46a86)]" />
          </label>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="flex items-center gap-2 rounded-lg border border-stone-200 bg-white p-2">
              <input type="color" value={safePanelColor} onChange={(e) => setFeaturedPanelColor(e.target.value)} className="h-8 w-8 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0" />
              <span className="min-w-0"><span className="block text-[10px] font-bold uppercase tracking-wide text-stone-500">Cor do painel</span><span className="block text-[10px] font-mono text-stone-400">{safePanelColor}</span></span>
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-stone-200 bg-white p-2">
              <input type="color" value={safeTextColor} onChange={(e) => setFeaturedTextColor(e.target.value)} className="h-8 w-8 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0" />
              <span className="min-w-0"><span className="block text-[10px] font-bold uppercase tracking-wide text-stone-500">Cor do texto</span><span className="block text-[10px] font-mono text-stone-400">{safeTextColor}</span></span>
            </label>
          </div>
        </div>
      </section>

      <p className="mb-3 text-[11px] text-stone-500">Prateleiras de produtos escolhidos a dedo pra home da loja — até 12 produtos cada. Sem nenhuma vitrine aqui, a home usa as vitrines automáticas.</p>
      <div className="space-y-3">
        {vitrines.length === 0 && <div className="py-4 text-center text-xs text-stone-400">Nenhuma vitrine criada ainda.</div>}
        {vitrines.map((v, i) => (
          <div key={v.id} className="rounded-lg border border-stone-200 p-2.5">
            <div className="mb-2 flex items-center gap-2">
              <div className="flex flex-col">
                <button onClick={() => move(i, -1)} disabled={i === 0} className="p-0.5 text-stone-400 hover:text-stone-700 disabled:opacity-30"><ChevronUp className="h-3.5 w-3.5" /></button>
                <button onClick={() => move(i, 1)} disabled={i === vitrines.length - 1} className="p-0.5 text-stone-400 hover:text-stone-700 disabled:opacity-30"><ChevronDown className="h-3.5 w-3.5" /></button>
              </div>
              <input value={v.title} onChange={(e) => updateTitle(i, e.target.value.slice(0, 60))} placeholder="Nome da vitrine (ex: Mais Vendidos)" className="min-w-0 flex-1 rounded-md border border-stone-300 p-1.5 text-sm outline-none focus:border-amber-500" />
              <button onClick={() => removeVitrine(i)} className="shrink-0 text-red-500 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
            </div>

            <div className="mb-2 space-y-1.5">
              {v.productIds.length === 0 && <div className="py-1.5 text-center text-[11px] text-stone-400">Nenhum produto nessa vitrine ainda.</div>}
              {v.productIds.map((id) => {
                const p = productInfo[id];
                return (
                  <div key={id} className="flex items-center gap-2 rounded-md border border-stone-200 p-1.5">
                    <span className="h-7 w-7 shrink-0 overflow-hidden rounded bg-stone-100">{(p?.images?.[0] || p?.imageUrl) && <img src={p.images?.[0] || p.imageUrl} className="h-full w-full object-cover" alt="" />}</span>
                    <span className={`truncate text-xs ${p?.missing ? "text-amber-600" : "text-stone-700"}`}>{p?.name || "carregando..."}</span>
                    <button onClick={() => toggleProduct(i, id)} className="ml-auto shrink-0 text-red-500 hover:text-red-700"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                );
              })}
            </div>

            {editingIdx === i ? (
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
                <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar produto pra essa vitrine..." className="w-full rounded-md border border-stone-300 py-1.5 pl-8 pr-7 text-xs outline-none focus:border-amber-500" />
                <button onClick={() => { setEditingIdx(null); setSearch(""); setResults([]); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"><X className="h-3.5 w-3.5" /></button>
                {searching && <div className="mt-1 flex items-center gap-1 text-[11px] text-stone-400"><Loader2 className="h-3 w-3 animate-spin" /> Buscando...</div>}
                {!searching && results.length > 0 && (
                  <div className="mt-1 max-h-40 overflow-y-auto rounded-md border border-stone-200">
                    {results.map((p) => {
                      const already = v.productIds.includes(p.id);
                      return (
                        <button key={p.id} onClick={() => toggleProduct(i, p.id)} className={`flex w-full items-center gap-2 px-2 py-1.5 text-left text-xs hover:bg-stone-50 ${already ? "opacity-50" : ""}`}>
                          <span className="h-6 w-6 shrink-0 overflow-hidden rounded bg-stone-100">{p.imageUrl && <img src={p.imageUrl} className="h-full w-full object-cover" alt="" />}</span>
                          <span className="truncate">{p.name}</span>
                          <span className="ml-auto shrink-0 text-amber-600">{already ? "já incluso" : brl(p.price)}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <button onClick={() => { setEditingIdx(i); setSearch(""); setResults([]); }} className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-stone-300 py-1.5 text-xs font-semibold text-stone-500 hover:border-amber-500 hover:text-amber-600">
                <Plus className="h-3.5 w-3.5" /> Adicionar produtos
              </button>
            )}
          </div>
        ))}
        <button onClick={addVitrine} className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-stone-300 py-2 text-sm font-semibold text-stone-500 hover:border-amber-500 hover:text-amber-600">
          <Plus className="h-4 w-4" /> Nova vitrine
        </button>
      </div>
    </PanelShell>
  );
}
