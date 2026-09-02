import React, { useEffect, useRef, useState } from "react";
import { ArrowLeft, Eye, Loader2, Save, Trash2 } from "lucide-react";
import { Route, Routes, useLocation, useNavigate } from "react-router";
import { apiFetch } from "../../../lib/api";
import { toast } from "../../../components/Toast";
import { ConfirmModal } from "../../../components/ConfirmModal";
import { EditModeProvider, useEditMode } from "./EditModeContext";
import { SectionsPanel } from "./panels/SectionsPanel";
import { ShopLayout } from "../ShopLayout";
import { StoreHome } from "../StoreHome";
import { StoreCatalog } from "../StoreCatalog";
import { StoreProduct } from "../StoreProduct";

function EditorToolbar() {
  const ctx = useEditMode();
  const navigate = useNavigate();
  const [publishing, setPublishing] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [discarding, setDiscarding] = useState(false);

  const publish = async () => {
    setPublishing(true);
    try {
      const res = await apiFetch("/api/store/admin/config/publish", { method: "POST" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(j.error || "Erro ao publicar."); return; }
      toast.success("Loja publicada.");
      await ctx?.reload();
    } catch (e: any) {
      toast.error(e.message || "Erro ao publicar.");
    } finally { setPublishing(false); }
  };

  const discard = async () => {
    setDiscarding(true);
    try {
      const res = await apiFetch("/api/store/admin/config/discard-draft", { method: "POST" });
      if (res.ok) { toast.success("Rascunho descartado."); await ctx?.reload(); }
      else toast.error("Erro ao descartar rascunho.");
    } catch (e: any) {
      toast.error(e.message || "Erro ao descartar rascunho.");
    } finally { setDiscarding(false); setDiscardOpen(false); }
  };

  return (
    <div className="sticky top-0 z-[70] flex items-center gap-3 border-b border-amber-500/40 bg-stone-900 px-4 py-2.5 text-white">
      <button onClick={() => navigate("/store-settings")} className="flex items-center gap-1.5 text-sm text-stone-300 hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Sair do editor
      </button>
      <PageSelector />
      <div className="ml-auto flex items-center gap-2">
        {ctx?.dirty && <span className="text-xs font-semibold text-amber-400">Você tem alterações não publicadas</span>}
        <a href="/loja" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-lg border border-stone-600 px-3 py-1.5 text-xs font-semibold hover:border-stone-400">
          <Eye className="h-3.5 w-3.5" /> Ver loja publicada
        </a>
        <button onClick={() => setDiscardOpen(true)} className="flex items-center gap-1.5 rounded-lg border border-red-500/40 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/10">
          <Trash2 className="h-3.5 w-3.5" /> Descartar rascunho
        </button>
        <button onClick={() => ctx?.openPanel("sections")} className="rounded-lg border border-stone-600 px-3 py-1.5 text-xs font-semibold hover:border-stone-400">
          Seções
        </button>
        <button onClick={() => ctx?.openPanel("colors")} className="rounded-lg border border-stone-600 px-3 py-1.5 text-xs font-semibold hover:border-stone-400">
          Cores
        </button>
        <button onClick={() => ctx?.openPanel("fonts")} className="rounded-lg border border-stone-600 px-3 py-1.5 text-xs font-semibold hover:border-stone-400">
          Fontes
        </button>
        <button onClick={publish} disabled={publishing} className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-1.5 text-xs font-bold text-stone-900 hover:bg-amber-400 disabled:opacity-50">
          {publishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Publicar
        </button>
      </div>
      <ConfirmModal
        isOpen={discardOpen}
        onClose={() => setDiscardOpen(false)}
        onConfirm={discard}
        confirmAsDeleting={discarding}
        title="Descartar rascunho?"
        message="Todas as edições não publicadas (cores, fontes, banners, categorias criadas) somem. A loja publicada não muda."
        confirmText="Descartar"
        confirmingText="Descartando..."
      />
    </div>
  );
}

// Seletor "Página: Home / Catálogo / Produto (escolher produto-modelo)".
// O produto-modelo é só um produto qualquer usado pra visualizar a página de
// produto — o template em si é Fase 2.
function PageSelector() {
  const navigate = useNavigate();
  const location = useLocation();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const base = "/store-settings/editor";
  const atCatalogo = location.pathname.startsWith(`${base}/catalogo`);
  const atProduto = location.pathname.startsWith(`${base}/produto`);
  const selectorRef = useRef<HTMLDivElement>(null);
  // Clique fora / Escape fecham o dropdown do produto-modelo — ativo só
  // enquanto aberto, pra não pendurar listener global à toa.
  useEffect(() => {
    if (!pickerOpen) return;
    const onPointerDown = (ev: PointerEvent) => {
      if (selectorRef.current && !selectorRef.current.contains(ev.target as Node)) setPickerOpen(false);
    };
    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") setPickerOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [pickerOpen]);
  useEffect(() => {
    if (!pickerOpen || !search.trim()) { setResults([]); setSearching(false); return; }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/store/products?search=${encodeURIComponent(search.trim())}`);
        if (!r.ok) throw new Error("Erro ao buscar produtos.");
        const j = await r.json();
        setResults((j.data || []).slice(0, 6));
      } catch (e: any) {
        setResults([]);
        toast.error(e.message || "Erro ao buscar produtos.");
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [search, pickerOpen]);
  const tab = (active: boolean) => `rounded-md px-2.5 py-1 text-xs font-semibold ${active ? "bg-amber-500 text-stone-900" : "text-stone-300 hover:text-white"}`;
  return (
    <div ref={selectorRef} className="relative flex items-center gap-1 rounded-lg border border-stone-700 p-0.5">
      <span className="pl-1.5 text-[10px] font-bold uppercase text-stone-500">Página:</span>
      <button className={tab(!atCatalogo && !atProduto)} onClick={() => { setPickerOpen(false); navigate(base); }}>Home</button>
      <button className={tab(atCatalogo)} onClick={() => { setPickerOpen(false); navigate(`${base}/catalogo`); }}>Catálogo</button>
      <button className={tab(atProduto)} onClick={() => { setPickerOpen((v) => !v); setSearch(""); setResults([]); }}>Produto…</button>
      {pickerOpen && (
        <div className="absolute left-0 top-full z-[110] mt-1 w-72 rounded-lg border border-stone-700 bg-stone-900 p-2 shadow-xl">
          <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar produto-modelo..."
            className="w-full rounded-md border border-stone-600 bg-stone-800 px-2 py-1.5 text-xs text-white outline-none focus:border-amber-500" />
          {searching && <div className="mt-1 flex items-center gap-1 text-[11px] text-stone-400"><Loader2 className="h-3 w-3 animate-spin" /> Buscando...</div>}
          {!searching && results.map((p) => (
            <button key={p.id} onClick={() => { setPickerOpen(false); navigate(`${base}/produto/${p.id}`); }}
              className="mt-1 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-stone-200 hover:bg-stone-800">
              <span className="h-6 w-6 shrink-0 overflow-hidden rounded bg-stone-700">{p.imageUrl && <img src={p.imageUrl} className="h-full w-full object-cover" alt="" />}</span>
              <span className="truncate">{p.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Fallback do catch-all: só Home/Catálogo/Produto existem dentro do editor.
function EditorPaginaIndisponivel() {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 p-8 text-center">
      <p className="text-sm font-medium text-stone-500">Página não disponível no editor</p>
      <button onClick={() => navigate("/store-settings/editor")}
        className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-700">
        Voltar pra Home do editor
      </button>
    </div>
  );
}

// Roteador local (só pra este ramo da árvore): monta ShopLayout de verdade
// (cabeçalho, rodapé, aplicação de cor/fonte no elemento raiz — Tasks 12/13)
// com StoreHome como conteúdo do Outlet, exatamente como a rota pública /loja
// já faz — sem isso o editor mostraria só o miolo da Home, sem cabeçalho/
// rodapé/cores aplicadas.
export function StoreEditor() {
  const navigate = useNavigate();
  // TODOS os links internos da loja são absolutos pra /loja/... (ShopLayout,
  // StoreHome, ShopProductCard, StoreCatalog — conferido no código; não
  // existe basePath). Em vez de reescrever dezenas de <Link>, um
  // interceptador de clique em capture reescreve a navegação pra permanecer
  // sob /store-settings/editor/... (o Link do react-router ignora cliques com
  // defaultPrevented, então preventDefault + navigate próprio basta). Âncoras
  // com target="_blank" (ex.: "Ver loja publicada") passam direto, assim como
  // cliques com modificador (ctrl/cmd/shift/alt — abrir em aba/janela nova é
  // comportamento nativo que o editor não deve engolir).
  const interceptNav = (e: React.MouseEvent) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    // Botão é dono do próprio clique (➕ adiciona na sacola, ⤷ já navega com
    // navigate() próprio) — se o elemento clicável mais próximo é <button>, o
    // interceptador não mexe. Sem isso o clique no ➕ também "vazava" pro
    // <Link> do card (adicionava E navegava) e o ⤷ navegava duas vezes.
    const el = (e.target as HTMLElement).closest("button, a");
    if (el && el.tagName === "BUTTON") return;
    const a = el as HTMLAnchorElement | null;
    if (!a) return;
    const href = a.getAttribute("href") || "";
    // Só caminhos da loja mesmo: "/loja" exato ou "/loja/..." (não "/lojaX").
    const isStorePath = href === "/loja" || href.startsWith("/loja/") || href.startsWith("/loja?") || href.startsWith("/loja#");
    if (a.getAttribute("target") === "_blank" || !isStorePath) return;
    // A árvore do editor só tem Home/Catálogo/Produto — qualquer outra rota da
    // loja (/loja/conta, /loja/pedido/... etc.) viraria canvas em branco.
    // Bloqueia com aviso em vez de deixar escapar do editor.
    const path = href.slice("/loja".length).split(/[?#]/)[0];
    const supported = path === "" || path === "/" || path === "/catalogo" || path === "/catalogo/" || /^\/produto\/[^/]+$/.test(path);
    if (!supported) {
      e.preventDefault();
      toast.error("Essa página não está disponível dentro do editor.");
      return;
    }
    e.preventDefault();
    navigate(href.replace(/^\/loja/, "/store-settings/editor"));
  };
  return (
    <EditModeProvider>
      <div className="min-h-screen">
        <EditorToolbar />
        <div onClickCapture={interceptNav}>
          <Routes>
            <Route element={<ShopLayout />}>
              <Route index element={<StoreHome />} />
              <Route path="catalogo" element={<StoreCatalog />} />
              <Route path="produto/:id" element={<StoreProduct />} />
              {/* Rede de segurança pra URL digitada direto (ou /produto/ sem id):
                  o interceptador já barra os cliques, mas a barra de endereço não
                  passa por ele. */}
              <Route path="*" element={<EditorPaginaIndisponivel />} />
            </Route>
          </Routes>
          <SectionsPanel />
        </div>
      </div>
    </EditModeProvider>
  );
}
