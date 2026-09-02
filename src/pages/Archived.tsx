import React, { useEffect, useState } from "react";
import { Archive, RefreshCcw, Trash2 } from "lucide-react";
import { apiFetch, extractList } from "../lib/api";
import { HardDeleteModal } from "../components/HardDeleteModal";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";

import { useAuthStore } from "../stores/authStore";

type ArchiveType = "products" | "customers" | "users" | "groups" | "subgroups" | "shelves";

export function Archived() {
  const { user } = useAuthStore();
  const isAdmin = ["admin", "master"].includes(user?.role?.toLowerCase() || "");
  
  const [tab, setTab] = useState<ArchiveType>("products");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  const [hardDeleteModalOpen, setHardDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchArchived();
  }, [tab]);

  const fetchArchived = async () => {
    setLoading(true);
    setActionError("");
    try {
      const res = await apiFetch(`/api/archived/${tab}`);
      if (res.ok) {
        const data = await res.json();
        setItems(extractList(data));
      } else {
        const errData = await res.json().catch(() => ({}));
        setActionError(`Erro ${res.status}: ${errData.error || "Não foi possível carregar arquivados"}`);
        console.error("Erro ao carregar arquivados", {
          type: tab,
          status: res.status,
          response: errData
        });
        setItems([]);
      }
    } catch (err: any) {
      console.error(err);
      setActionError(`Erro: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (id: string) => {
    setIsProcessing(true);
    setActionError("");
    setActionSuccess("");
    try {
      let endpoint = `/api/${tab}/${id}/restore`;
      if (tab === "subgroups") endpoint = `/api/groups/subgroups/${id}/restore`;

      const res = await apiFetch(endpoint, { method: "PATCH" });
      if (res.ok) {
        setActionSuccess("Registro restaurado com sucesso!");
        setItems(prev => prev.filter(i => i.id !== id));
        setTimeout(() => setActionSuccess(""), 3000);
      } else {
        const errorData = await res.json().catch(() => ({}));
        setActionError(`Erro: ${errorData.error || "Desconhecido"}`);
        setTimeout(() => setActionError(""), 5000);
      }
    } catch(err: any) {
      setActionError(`Erro: ${err.message}`);
      setTimeout(() => setActionError(""), 5000);
    } finally {
      setIsProcessing(false);
    }
  };

  const initHardDelete = (id: string) => {
    setItemToDelete(id);
    setHardDeleteModalOpen(true);
  };

  const handleConfirmHardDelete = async () => {
    if (!itemToDelete) return;
    setIsProcessing(true);
    setHardDeleteModalOpen(false);
    setActionError("");
    setActionSuccess("");
    try {
      let endpoint = `/api/${tab}/${itemToDelete}/hard-delete`;
      if (tab === "subgroups") endpoint = `/api/groups/subgroups/${itemToDelete}/hard-delete`;

      const res = await apiFetch(endpoint, { method: "DELETE" });
      if (res.ok) {
        setActionSuccess("Registro excluído definitivamente com sucesso.");
        setItems(prev => prev.filter(i => i.id !== itemToDelete));
        setTimeout(() => setActionSuccess(""), 3000);
      } else {
        const data = await res.json().catch(() => ({}));
        setActionError(data.error || "Erro ao excluir definitivamente.");
        setTimeout(() => setActionError(""), 7000);
      }
    } catch (err: any) {
      setActionError(`Erro: ${err.message}`);
      setTimeout(() => setActionError(""), 5000);
    } finally {
      setIsProcessing(false);
      setItemToDelete(null);
    }
  };

  const renderTabs = () => {
    const tabs: {id: ArchiveType, label: string}[] = [
      { id: "products", label: "Produtos" },
      { id: "customers", label: "Clientes" },
      { id: "users", label: "Usuários" },
      { id: "groups", label: "Grupos" },
      { id: "subgroups", label: "Subgrupos" },
      { id: "shelves", label: "Prateleiras" }
    ];

    return (
      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map(t => (
          <Button
            key={t.id}
            variant="ghost"
            onClick={() => setTab(t.id)}
            className={`rounded-lg text-sm font-medium transition ${tab === t.id ? 'bg-brand-gold text-brand-navydark hover:bg-brand-gold hover:text-brand-navydark dark:bg-brand-gold dark:hover:bg-brand-gold' : 'bg-brand-navydark text-gray-400 hover:bg-gray-800 hover:text-white dark:bg-brand-navydark dark:hover:bg-gray-800'}`}
          >
            {t.label}
          </Button>
        ))}
      </div>
    );
  };

  if (!isAdmin) {
    return <div className="p-8 text-center text-red-400">Acesso negado. Apenas administradores podem ver os arquivos.</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center text-yellow-400">
          <Archive className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-white">Arquivados</h2>
          <p className="text-gray-400 text-sm">Consulte e restaure registros desativados do sistema.</p>
        </div>
      </div>

      {actionError && <div className="text-sm text-red-400 bg-red-400/10 p-3 rounded border border-red-400/20">{actionError}</div>}
      {actionSuccess && <div className="text-sm text-green-400 bg-green-400/10 p-3 rounded border border-green-400/20">{actionSuccess}</div>}

      {renderTabs()}

      <Card className="gap-0 py-0 p-0 rounded-xl border-gray-800 bg-brand-navylight overflow-hidden shadow-md">
        <table className="w-full text-left text-sm">
           <thead className="bg-[#171717] border-b border-gray-800 text-gray-400">
             <tr>
               <th className="px-6 py-3 font-medium">Nome / Identificação</th>
               <th className="px-6 py-3 font-medium">Data do Arquivamento</th>
               <th className="px-6 py-3 font-medium text-right">Ações</th>
             </tr>
           </thead>
           <tbody className="divide-y divide-gray-800/50">
             {loading ? (
                <tr><td colSpan={3} className="px-6 py-8 text-center text-gray-500">Carregando...</td></tr>
             ) : items.length === 0 ? (
                <tr><td colSpan={3} className="px-6 py-8 text-center text-gray-500">Nenhum registro arquivado nesta categoria.</td></tr>
             ) : items.map(item => (
                <tr key={item.id} className="hover:bg-brand-navy/50 transition">
                  <td className="px-6 py-4 font-medium text-gray-200">
                    {item.name}
                    {item.document && <span className="block text-xs font-mono text-gray-500 font-normal">{item.document}</span>}
                    {item.email && <span className="block text-xs text-gray-500 font-normal">{item.email}</span>}
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-xs">
                    {item.deletedAt ? new Date(item.deletedAt).toLocaleString() : '-'}
                  </td>
                  <td className="px-6 py-4 text-right flex justify-end gap-2">
                     <Button
                       variant="ghost"
                       title="Restaurar"
                       onClick={() => handleRestore(item.id)}
                       disabled={isProcessing}
                       className="h-auto px-3 py-1.5 has-[>svg]:px-3 text-xs font-medium text-blue-400 bg-blue-500/10 dark:bg-blue-500/10 hover:bg-blue-500/20 hover:text-blue-400 dark:hover:bg-blue-500/20 rounded transition"
                     >
                       <RefreshCcw className="size-3.5" />
                       Restaurar
                     </Button>
                     <Button
                       variant="ghost"
                       size="icon-sm"
                       title="Excluir Definitivamente"
                       aria-label="Excluir definitivamente"
                       onClick={() => initHardDelete(item.id)}
                       disabled={isProcessing}
                       className="size-auto p-1.5 text-gray-400 hover:text-red-400 transition rounded bg-gray-800/50 dark:bg-gray-800/50 hover:bg-gray-800/50 dark:hover:bg-gray-800/50 gap-1"
                     >
                        <Trash2 className="size-4" />
                     </Button>
                  </td>
                </tr>
             ))}
           </tbody>
        </table>
      </Card>

      <HardDeleteModal
        isOpen={hardDeleteModalOpen}
        onClose={() => setHardDeleteModalOpen(false)}
        onConfirm={handleConfirmHardDelete}
      />
    </div>
  );
}
