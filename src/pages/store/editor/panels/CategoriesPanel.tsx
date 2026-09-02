import React, { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { apiFetch } from "../../../../lib/api";
import { useEditMode } from "../EditModeContext";
import { toast } from "../../../../components/Toast";
import { PanelShell } from "./PanelShell";

type DraftCategory = { id: string; draftId: string | null; name: string; icon: string | null; storeVisible: boolean; sortOrder: number; isNew: boolean; hasPendingChanges: boolean };

// Painel de categorias — diferente dos outros painéis do editor (Tasks 8-10),
// este NÃO guarda rascunho local nem usa ctx.patchDraft: cada ação (criar,
// renomear, mostrar/esconder, reordenar, apagar) já persiste na hora, direto
// na tabela de categorias-rascunho (endpoints da Task 4). Por isso ele usa
// PanelShell sem `onSave` — não existe nenhum "salvar tudo de uma vez" aqui,
// só o X de fechar.
export function CategoriesPanel({ onChanged }: { onChanged: () => void }) {
  const ctx = useEditMode();
  const [items, setItems] = useState<DraftCategory[]>([]);
  const [newName, setNewName] = useState("");
  const active = ctx?.activePanel === "categories";

  const load = async () => {
    try {
      const res = await apiFetch("/api/store/admin/categories/draft");
      if (res.ok) { const j = await res.json(); setItems(j.data || []); return; }
      toast.error("Erro ao carregar categorias.");
    } catch (e: any) {
      toast.error(e.message || "Erro ao carregar categorias.");
    }
  };
  // Recarrega toda vez que ESTE painel abre — o componente fica montado o
  // tempo todo (só retorna null quando inativo). Dispara só na transição pra
  // activePanel === "categories", não a cada render com o painel já aberto.
  useEffect(() => {
    if (active) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
  if (!ctx || !active) return null;

  const createOne = async () => {
    const name = newName.trim();
    if (!name) return;
    try {
      const res = await apiFetch("/api/store/admin/categories/draft", { method: "POST", body: JSON.stringify({ name, sortOrder: items.length }) });
      if (res.ok) { setNewName(""); await load(); onChanged(); return; }
      const j = await res.json().catch(() => ({}));
      toast.error(j.error || "Erro ao criar categoria.");
    } catch (e: any) {
      toast.error(e.message || "Erro ao criar categoria.");
    }
  };
  const rename = async (item: DraftCategory, name: string) => {
    try {
      const res = await apiFetch(`/api/store/admin/categories/draft/${item.id}`, { method: "PUT", body: JSON.stringify({ name, icon: item.icon, storeVisible: item.storeVisible, sortOrder: item.sortOrder }) });
      if (res.ok) { await load(); onChanged(); return; }
      const j = await res.json().catch(() => ({}));
      toast.error(j.error || "Erro ao renomear categoria.");
    } catch (e: any) {
      toast.error(e.message || "Erro ao renomear categoria.");
    }
  };
  const toggleVisible = async (item: DraftCategory) => {
    try {
      const res = await apiFetch(`/api/store/admin/categories/draft/${item.id}`, { method: "PUT", body: JSON.stringify({ name: item.name, icon: item.icon, storeVisible: !item.storeVisible, sortOrder: item.sortOrder }) });
      if (res.ok) { await load(); onChanged(); return; }
      const j = await res.json().catch(() => ({}));
      toast.error(j.error || "Erro ao mudar visibilidade da categoria.");
    } catch (e: any) {
      toast.error(e.message || "Erro ao mudar visibilidade da categoria.");
    }
  };
  const move = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= items.length) return;
    const a = items[index], b = items[target];
    try {
      const [resA, resB] = await Promise.all([
        apiFetch(`/api/store/admin/categories/draft/${a.id}`, { method: "PUT", body: JSON.stringify({ name: a.name, icon: a.icon, storeVisible: a.storeVisible, sortOrder: b.sortOrder }) }),
        apiFetch(`/api/store/admin/categories/draft/${b.id}`, { method: "PUT", body: JSON.stringify({ name: b.name, icon: b.icon, storeVisible: b.storeVisible, sortOrder: a.sortOrder }) }),
      ]);
      if (!resA.ok || !resB.ok) { toast.error("Erro ao reordenar categorias."); return; }
      await load(); onChanged();
    } catch (e: any) {
      toast.error(e.message || "Erro ao reordenar categorias.");
    }
  };
  const remove = async (item: DraftCategory) => {
    try {
      const res = await apiFetch(`/api/store/admin/categories/draft/${item.id}`, { method: "DELETE" });
      if (res.ok) { await load(); onChanged(); return; }
      const j = await res.json().catch(() => ({}));
      toast.error(j.error || "Erro ao apagar categoria.");
    } catch (e: any) {
      toast.error(e.message || "Erro ao apagar categoria.");
    }
  };

  return (
    <PanelShell title="Categorias" onClose={ctx.closePanel} wide>
      <p className="mb-3 text-[11px] text-stone-500">Categorias criadas aqui só ficam disponíveis pra atribuir em Produtos depois de <strong>Publicar</strong>.</p>
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <div key={item.id} className={`flex items-center gap-2 rounded-lg border p-2 ${item.hasPendingChanges ? "border-amber-300 bg-amber-50" : "border-stone-200"}`}>
            <div className="flex flex-col">
              <button onClick={() => move(i, -1)} disabled={i === 0} className="text-stone-400 hover:text-stone-700 disabled:opacity-30"><ChevronUp className="h-3.5 w-3.5" /></button>
              <button onClick={() => move(i, 1)} disabled={i === items.length - 1} className="text-stone-400 hover:text-stone-700 disabled:opacity-30"><ChevronDown className="h-3.5 w-3.5" /></button>
            </div>
            <input key={`${item.id}:${item.name}`} defaultValue={item.name} onBlur={(e) => e.target.value.trim() && e.target.value !== item.name && rename(item, e.target.value.trim())} className="min-w-0 flex-1 rounded-md border border-stone-300 p-1.5 text-sm outline-none focus:border-amber-500" />
            {item.isNew && <span className="shrink-0 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">nova</span>}
            <button onClick={() => toggleVisible(item)} title={item.storeVisible ? "Visível na loja" : "Escondida da loja"} className="shrink-0 text-stone-500 hover:text-stone-800">
              {item.storeVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </button>
            <button onClick={() => remove(item)} className="shrink-0 text-red-500 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <input value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && createOne()} placeholder="Nome da nova categoria" className="min-w-0 flex-1 rounded-lg border border-stone-300 p-2.5 text-sm outline-none focus:border-amber-500" />
        <button onClick={createOne} className="flex items-center gap-1.5 rounded-lg bg-stone-900 px-3 text-sm font-bold text-white hover:bg-stone-700"><Plus className="h-4 w-4" /> Criar</button>
      </div>
    </PanelShell>
  );
}
