import React, { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Loader2, Plus, Search, Trash2, X } from "lucide-react";
import { toast } from "../../../../components/Toast";
import { useEditMode } from "../EditModeContext";
import { PanelShell } from "./PanelShell";

const brl = (v: any) => `R$ ${(Number(v) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

type Vitrine = { id: string; title: string; productIds: string[] };

// Vitrines (prateleiras de produtos escolhidos a dedo) da home da loja — até
// 12 produtos por vitrine, título livre. Usa os MESMOS endpoints públicos de
// busca/consulta de produto que src/pages/StoreSettings.tsx já usa pra essa
// mesma finalidade (função VitrineCard + hydrateVitrineProduct):
//   - GET /api/store/products?search=... — busca (sem parâmetro de limite;
//     o resultado é cortado pra 6 no cliente, igual lá)
//   - GET /api/store/product/:id — info de um produto já escolhido, pra
//     mostrar nome/foto na lista
// São rotas públicas do catálogo da loja (fetch cru, sem apiFetch/Bearer) —
// só o que aparece pra loja pode virar destaque de vitrine.
export function VitrinesPanel() {
  const ctx = useEditMode();
  const [vitrines, setVitrines] = useState<Vitrine[]>(Array.isArray(ctx?.draft?.vitrines) ? ctx!.draft.vitrines : []);
  const [saving, setSaving] = useState(false);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [productInfo, setProductInfo] = useState<Record<string, any>>({});
  const hydratedIds = useRef<Set<string>>(new Set());

  // Nome/foto de um produto já escolhido (a vitrine só guarda o id) —
  // hidrata sob demanda, uma vez por id (dedup via ref, não estado, pra não
  // disparar re-render/relance a cada chamada repetida). Igual ao padrão de
  // StoreSettings.hydrateVitrineProduct: falha aqui NÃO gera toast — um
  // produto que sumiu do catálogo não é um erro de ação do usuário, só
  // aparece marcado como indisponível na lista.
  const hydrate = useCallback((id: string) => {
    if (hydratedIds.current.has(id)) return;
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

  // Resincroniza `vitrines` com o draft toda vez que ESTE painel abre — mesmo
  // motivo dos demais painéis (ver BannerPanel/SideBannerPanel): o componente
  // fica montado o tempo todo (só retorna null quando inativo), então sem
  // isso uma edição feita e descartada (fechar sem salvar) reapareceria na
  // reabertura. Dispara só na transição pra activePanel === "vitrines", não a
  // cada render com o painel já aberto.
  // `editingIdx`/`search`/`results` são estado de UI local — não vêm do
  // draft — mas TAMBÉM precisam resetar aqui, não por "resync" (não há nada
  // pra ressincronizar, eles não têm equivalente no draft), e sim porque
  // `editingIdx` é um ÍNDICE dentro de `vitrines`: como `vitrines` é
  // resincronizado nessa mesma transição, um `editingIdx` velho continuaria
  // apontando pra uma posição que pode não existir mais (ou ser outra
  // vitrine) no rascunho recarregado. `search`/`results` resetam junto só
  // por higiene, pra não reabrir o painel com uma busca antiga pendurada.
  useEffect(() => {
    if (ctx?.activePanel === "vitrines") {
      setVitrines(Array.isArray(ctx?.draft?.vitrines) ? ctx!.draft.vitrines : []);
      setEditingIdx(null);
      setSearch("");
      setResults([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx?.activePanel]);

  // Hidrata nome/foto de todo produto já escolhido em qualquer vitrine,
  // sempre que a lista de vitrines muda (inclusive ao reabrir o painel).
  // `hydrate` já deduplica por id via ref, então rodar de novo a cada edição
  // é barato (produtos já hidratados só fazem no-op).
  useEffect(() => {
    if (ctx?.activePanel !== "vitrines") return;
    for (const v of vitrines) for (const id of v.productIds) hydrate(id);
  }, [ctx?.activePanel, vitrines, hydrate]);

  // Refs que sempre refletem o editingIdx/search MAIS RECENTE (não o do
  // closure em que a busca foi disparada) — usadas pra detectar resposta
  // stale abaixo. Um simples `if (search)` dentro do closure do setTimeout
  // não serviria: aquele `search` é a variável capturada no momento em que
  // o efeito rodou, congelada, não o valor atual do estado.
  const editingIdxRef = useRef<number | null>(editingIdx);
  useEffect(() => { editingIdxRef.current = editingIdx; }, [editingIdx]);
  const searchRef = useRef(search);
  useEffect(() => { searchRef.current = search; }, [search]);

  // Busca com debounce (300ms) — mesmo padrão de StoreSettings.tsx
  // (VitrineCard/prodSearch). Ao contrário do padrão existente lá (que
  // engolia erro de rede em silêncio, só limpando os resultados), aqui avisa
  // com toast: silêncio faria a busca parecer "não achou nada" sem nenhuma
  // pista de que foi falha de rede, não ausência de resultado.
  //
  // Guarda contra resposta stale (Task 14 review fix): `results` não é
  // "keyed" por vitrine — é um único estado compartilhado, renderizado só
  // dentro da vitrine com editingIdx === i. Se o usuário disparar uma busca
  // na vitrine A (debounce agendado, fetch a caminho) e, antes dela resolver,
  // clicar "editar produtos" em outra vitrine B (editingIdx muda, search/
  // results resetam pra B), a resposta de A ainda chega mais tarde. Sem essa
  // guarda, `setResults(...)` sobrescreveria incondicionalmente os
  // resultados — que nesse momento já são os de B — fazendo produtos da
  // busca de A aparecerem (e serem clicáveis/adicionáveis) dentro da caixa
  // de B. `requestIdx`/`requestQuery` capturam o "de onde veio" desta busca
  // específica; na resolução, comparamos contra os refs (valor atual) — se
  // não bater mais (trocou de vitrine, ou a mesma vitrine já tem uma busca
  // mais nova em andamento), a resposta é descartada em silêncio.
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
        // Erro de uma busca stale também é descartado (sem toast): se o
        // usuário já trocou de vitrine (ou já digitou algo novo), um toast
        // de erro sobre uma busca que ele não está mais olhando só confunde
        // — ele pode nem lembrar do que buscou lá, e a vitrine atual pode
        // estar funcionando normalmente nesse exato momento.
        if (stale()) return;
        setResults([]);
        toast.error(e.message || "Erro ao buscar produtos.");
      } finally {
        if (!stale()) setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  if (!ctx || ctx.activePanel !== "vitrines") return null;

  // Só fecha o painel se o patchDraft realmente salvou — se falhar
  // (patchDraft já mostrou o toast de erro), mantém o painel aberto com as
  // edições feitas pra não perder o trabalho do usuário sem chance de tentar
  // de novo.
  const save = async () => {
    setSaving(true);
    try {
      const ok = await ctx.patchDraft({ vitrines });
      if (ok) ctx.closePanel();
    } finally {
      setSaving(false);
    }
  };

  // Formas funcionais de setState (prev => ...) em vez de fechar sobre a
  // variável `vitrines` do render em que a função foi criada — mesmo
  // raciocínio do BannerPanel (Task 10, bug de closure obsoleto):
  // `toggleProduct` é disparado a partir de um clique num resultado de busca
  // que já rodou de forma assíncrona (debounce), e o usuário pode clicar
  // rápido em mais de um resultado ou trocar de vitrine sendo editada
  // enquanto isso — se essas funções lessem `vitrines` direto do closure,
  // qualquer atualização concorrente (outra chamada a addVitrine/move/
  // toggleProduct/etc que já tenha resolvido nesse meio tempo) seria
  // sobrescrita/revertida. Partindo sempre de `prev`, cada atualização usa o
  // estado mais recente no momento em que roda de fato.
  const addVitrine = () => setVitrines((prev) => [...prev, { id: crypto.randomUUID(), title: "Nova vitrine", productIds: [] }]);
  // `removeVitrine`/`move` seguem a MESMA vitrine (objeto) quando ela muda de
  // índice sob o `editingIdx` aberto — por isso mexem em `editingIdx` mesmo
  // sem o usuário ter clicado em nada relacionado à busca. Igual aos outros
  // dois lugares que mudam `editingIdx` neste arquivo (fechar a busca, abrir
  // "Adicionar produtos" em outra vitrine — ambos linhas ~230/248), qualquer
  // mudança de `editingIdx` precisa resetar `search`/`results` junto: senão
  // uma busca em voo pra vitrine A, iniciada antes do reorder/remoção,
  // resolve depois com `editingIdxRef.current` já apontando (corretamente)
  // pra A na nova posição — o guard de stale acima acha que só a POSIÇÃO
  // mudou (achando que trocou de vitrine) e descarta a resposta, mas o
  // `finally` que zera `searching` também é pulado (mesma condição `stale()`),
  // deixando o spinner "Buscando..." preso pra sempre numa vitrine que o
  // usuário nunca saiu de fato, só reordenou/outra foi removida antes dela.
  // Resetar aqui zera `search`, o que faz o efeito de busca cair no
  // early-return (`!search.trim()`) e chamar `setSearching(false)` de
  // imediato — sem depender do fetch em voo pra limpar o spinner.
  // Só reseta quando `editingIdx` de fato muda (a busca aberta É a vitrine
  // afetada) — reordenar/remover uma vitrine que não é a que está com a
  // busca aberta não deve mexer em `search`/`results` à toa.
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

  return (
    <PanelShell title="Vitrines de produtos" onClose={ctx.closePanel} onSave={save} saving={saving} wide>
      <p className="mb-3 text-[11px] text-stone-500">Prateleiras de produtos escolhidos a dedo pra home da loja — até 12 produtos cada. Sem nenhuma vitrine aqui, a home mostra 4 padrão automáticas.</p>
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
