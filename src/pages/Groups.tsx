import React, { useEffect, useState } from "react";
import { Plus, Archive, Layers, ListTree, Edit, Trash2 } from "lucide-react";
import { useAuthStore } from "../stores/authStore";
import { Modal } from "../components/Modal";
import { ConfirmModal } from "../components/ConfirmModal";
import { HardDeleteModal } from "../components/HardDeleteModal";
import { apiFetch, parseApiError } from "../lib/api";
import { ICON_OPTIONS } from "./store/categoryIcons";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";

export function Groups() {
  const { user } = useAuthStore();
  const isAdmin = ["admin", "master"].includes(user?.role?.toLowerCase() || "");
  const [tab, setTab] = useState<"groups" | "subgroups" | "shelves">("groups");
  const [items, setItems] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const defaultFormData = { name: '', description: '', groupId: '', storeVisible: true, icon: '' };
  const [formData, setFormData] = useState(defaultFormData);

  useEffect(() => {
    fetchData();
    if (tab === "subgroups") {
      fetchGroupsForDropdown();
    }
  }, [tab]);

  const fetchData = async () => {
    try {
      let endpoint = "/api/groups";
      if (tab === "shelves") endpoint = "/api/shelves";
      if (tab === "subgroups") endpoint = "/api/groups/subgroups";
      
      const res = await apiFetch(`${endpoint}?page=1&limit=50`);
      const resData = await res.json();
      if(resData.data) setItems(resData.data);
    } catch(err) {
      console.error(err);
    }
  };

  const fetchGroupsForDropdown = async () => {
    try {
      const res = await apiFetch(`/api/groups`);
      const resData = await res.json();
      if(resData.data) setGroups(resData.data);
    } catch(err) {
      console.error(err);
    }
  };

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setIsSaving(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      let endpoint = "/api/groups";
      if (tab === "shelves") endpoint = "/api/shelves";
      if (tab === "subgroups") endpoint = "/api/groups/subgroups";

      const url = editingId ? `${endpoint}/${editingId}` : endpoint;
      const method = editingId ? "PUT" : "POST";

      const res = await apiFetch(url, {
        method,
        body: JSON.stringify(formData)
      });
      
      const parsed = await parseApiError(res);
      
      if (res.ok) {
        setSuccessMsg(editingId ? "Atualizado com sucesso!" : "Criado com sucesso!");
        setTimeout(() => {
          handleClose();
          fetchData();
        }, 1500);
      } else {
        if (parsed.fields && Object.keys(parsed.fields).length > 0) {
           setFieldErrors(parsed.fields);
           setErrorMsg(`Corrija os campos destacados antes de salvar. ${parsed.message}`);
        } else {
           setErrorMsg(`Erro: ${parsed.message}`);
        }
      }
    } catch (error: any) {
      console.error(error);
      setErrorMsg(`Erro de conexão: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (item: any) => {
    setFormData({
      name: item.name || '',
      description: item.description || '',
      groupId: item.groupId || '',
      storeVisible: item.storeVisible !== false,
      icon: item.icon || ''
    });
    setEditingId(item.id);
    setIsModalOpen(true);
  };

  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [hardDeleteModalOpen, setHardDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const initArchive = (id: string) => {
    setItemToDelete(id);
    setConfirmModalOpen(true);
  };

  const initHardDelete = (id: string) => {
    setItemToDelete(id);
    setHardDeleteModalOpen(true);
  };

  const handleConfirmArchive = async () => {
    if (!itemToDelete) return;
    setIsDeletingId(itemToDelete);
    setConfirmModalOpen(false);
    setActionError("");
    setActionSuccess("");
    try {
      let endpoint = "/api/groups";
      if (tab === "shelves") endpoint = "/api/shelves";
      if (tab === "subgroups") endpoint = "/api/groups/subgroups";

      const res = await apiFetch(`${endpoint}/${itemToDelete}`, { method: "DELETE" });
      if (res.ok) {
        setActionSuccess("Registro arquivado com sucesso.");
        setItems(prev => prev.filter(i => i.id !== itemToDelete));
        setTimeout(() => setActionSuccess(""), 3000);
        fetchData();
      } else {
        const data = await res.json().catch(() => ({}));
        setActionError(`Erro ${res.status}: ${data.error || "Erro ao excluir"}`);
        setTimeout(() => setActionError(""), 5000);
      }
    } catch (err: any) {
      console.error(err);
      setActionError(`Erro: ${err.message}`);
      setTimeout(() => setActionError(""), 5000);
    } finally {
      setIsDeletingId(null);
      setItemToDelete(null);
    }
  };

  const handleConfirmHardDelete = async () => {
    if (!itemToDelete) return;
    setIsDeletingId(itemToDelete);
    setHardDeleteModalOpen(false);
    setActionError("");
    setActionSuccess("");
    try {
      let endpoint = "/api/groups";
      if (tab === "shelves") endpoint = "/api/shelves";
      if (tab === "subgroups") endpoint = "/api/groups/subgroups";

      const res = await apiFetch(`${endpoint}/${itemToDelete}/hard-delete`, { method: "DELETE" });
      if (res.ok) {
        setActionSuccess("Registro excluído definitivamente com sucesso.");
        setItems(prev => prev.filter(i => i.id !== itemToDelete));
        setTimeout(() => setActionSuccess(""), 3000);
        fetchData();
      } else {
        const data = await res.json().catch(() => ({}));
        setActionError(data.error || "Erro ao excluir definitivamente o registro.");
        setTimeout(() => setActionError(""), 7000);
      }
    } catch (err: any) {
      console.error(err);
      setActionError(`Erro: ${err.message}`);
      setTimeout(() => setActionError(""), 5000);
    } finally {
      setIsDeletingId(null);
      setItemToDelete(null);
    }
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData(defaultFormData);
    setErrorMsg("");
    setSuccessMsg("");
    setFieldErrors({});
  };

  const getTitle = () => {
    if (tab === "groups") return "Grupo";
    if (tab === "subgroups") return "Subgrupo";
    return "Prateleira";
  };

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden py-0">
      <CardContent className="p-0">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-800 p-3">
        <div className="flex gap-2 bg-brand-navylight p-1 rounded-lg border border-gray-800">
          <Button
            variant={tab === "groups" ? "default" : "ghost"}
            className={`gap-2 ${tab === "groups" ? "" : "hover:text-white"}`}
            onClick={() => setTab("groups")}
          >
            <Archive className="w-4 h-4" /> Grupos
          </Button>
          <Button
            variant={tab === "subgroups" ? "default" : "ghost"}
            className={`gap-2 ${tab === "subgroups" ? "" : "hover:text-white"}`}
            onClick={() => setTab("subgroups")}
          >
            <ListTree className="w-4 h-4" /> Subgrupos
          </Button>
          <Button
            variant={tab === "shelves" ? "default" : "ghost"}
            className={`gap-2 ${tab === "shelves" ? "" : "hover:text-white"}`}
            onClick={() => setTab("shelves")}
          >
            <Layers className="w-4 h-4" /> Prateleiras
          </Button>
        </div>
        <Button
          className="w-full sm:w-auto"
          onClick={() => {
            setEditingId(null);
            setFormData(defaultFormData);
            setIsModalOpen(true);
          }}
        >
          <Plus className="w-4 h-4" />
          Novo {getTitle()}
        </Button>
      </div>

      {actionError && <Card className="mx-3 mt-3 border-red-400/20 bg-red-400/10 py-0 text-sm text-red-400"><CardContent className="p-3">{actionError}</CardContent></Card>}
      {actionSuccess && <Card className="mx-3 mt-3 border-green-400/20 bg-green-400/10 py-0 text-sm text-green-400"><CardContent className="p-3">{actionSuccess}</CardContent></Card>}

      <div>
        <table className="w-full text-left text-sm text-gray-300">
          <thead className="bg-[#171717] text-gray-400 font-medium border-b border-gray-800">
            <tr>
              <th className="px-6 py-3">Nome</th>
              {tab === "subgroups" && <th className="px-6 py-3">Grupo Pai</th>}
              <th className="px-6 py-3">Descrição</th>
              {tab === "groups" && <th className="px-6 py-3">Vitrine</th>}
              <th className="px-6 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/70">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-brand-navy/60 transition">
                <td className="px-6 py-3 font-medium text-white">{item.name}</td>
                {tab === "subgroups" && <td className="px-6 py-3 text-gray-400">{item.groupName}</td>}
                <td className="px-6 py-3 text-gray-400">{item.description}</td>
                {tab === "groups" && (
                  <td className="px-6 py-3">
                    {item.storeVisible !== false ? (
                      <Badge variant="success">Exposto</Badge>
                    ) : (
                      <Badge variant="secondary">Oculto</Badge>
                    )}
                  </td>
                )}
                <td className="px-6 py-3 text-right flex justify-end gap-1">
                  <Button variant="ghost" size="icon-sm" onClick={() => handleEdit(item)} title="Editar" className="bg-gray-800/50 text-gray-400 hover:bg-gray-800/50 hover:text-brand-gold">
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => initArchive(item.id)} disabled={isDeletingId === item.id} title="Arquivar" className="gap-1 bg-gray-800/50 text-gray-400 hover:bg-gray-800/50 hover:text-yellow-400">
                    <Archive className="w-4 h-4" />
                  </Button>
                  {isAdmin && (
                    <Button variant="ghost" size="icon-sm" onClick={() => initHardDelete(item.id)} disabled={isDeletingId === item.id} title="Excluir Definitivamente" className="gap-1 bg-gray-800/50 text-gray-400 hover:bg-gray-800/50 hover:text-red-400">
                      <Trash2 className="w-4 h-4" />
                      {isDeletingId === item.id && <span className="text-[10px]">Excluindo...</span>}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={tab === "subgroups" ? 4 : 3} className="px-6 py-8 text-center text-gray-500">Nenhum registro encontrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      </CardContent>
      </Card>

      <Modal isOpen={isModalOpen} onClose={handleClose} title={editingId ? `Editar ${getTitle()}` : `Novo ${getTitle()}`}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {tab === "subgroups" && (
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Grupo Pai</label>
              <select required value={formData.groupId} onChange={e => setFormData({...formData, groupId: e.target.value})} className="w-full bg-[#171717] border border-gray-700 rounded-lg px-4 py-2 text-white outline-none focus:border-brand-gold">
                 <option value="" disabled>Selecione um grupo...</option>
                 {groups.map(g => (
                   <option key={g.id} value={g.id}>{g.name}</option>
                 ))}
              </select>
              {fieldErrors.groupId && <p className="text-red-400 text-xs mt-1">{fieldErrors.groupId}</p>}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Nome</label>
            <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-[#171717] border border-gray-700 rounded-lg px-4 py-2 text-white outline-none focus:border-brand-gold" />
            {fieldErrors.name && <p className="text-red-400 text-xs mt-1">{fieldErrors.name}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Descrição</label>
            <input type="text" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-[#171717] border border-gray-700 rounded-lg px-4 py-2 text-white outline-none focus:border-brand-gold" />
          </div>
          {tab === "groups" && (
            <Card className="cursor-pointer py-0">
              <CardContent className="flex items-start gap-2.5 p-3">
                <label className="flex cursor-pointer items-start gap-2.5">
                  <input type="checkbox" checked={formData.storeVisible} onChange={e => setFormData({...formData, storeVisible: e.target.checked})}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-brand-gold" />
                  <span className="text-sm text-gray-300">
                    <span className="font-medium text-white">Expor na vitrine da loja</span>
                    <br />
                    <span className="text-xs text-gray-500">Aparece como aba/categoria em /loja. Desmarcado = fica só no ERP, não aparece pro cliente.</span>
                  </span>
                </label>
              </CardContent>
            </Card>
          )}
          {tab === "groups" && (
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Ícone na loja</label>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
                <Button type="button" variant="outline" onClick={() => setFormData({ ...formData, icon: '' })} title="Automático (pelo nome)"
                  className={`h-auto flex-col gap-1 p-2 text-[10px] ${formData.icon === '' ? "border-primary bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary" : "text-gray-400 hover:border-gray-500 hover:bg-transparent hover:text-gray-400"}`}>
                  <span className="text-base leading-none">A</span>
                  Auto
                </Button>
                {ICON_OPTIONS.map(({ key, label, Icon }) => (
                  <Button key={key} type="button" variant="outline" onClick={() => setFormData({ ...formData, icon: key })} title={label}
                    className={`h-auto flex-col gap-1 p-2 text-[10px] ${formData.icon === key ? "border-primary bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary" : "text-gray-400 hover:border-gray-500 hover:bg-transparent hover:text-gray-400"}`}>
                    <Icon className="h-4 w-4" />
                    {label}
                  </Button>
                ))}
              </div>
              <p className="mt-1 text-xs text-gray-500">"Automático" adivinha pelo nome da categoria (comportamento de sempre). Escolha um ícone pra fixar manualmente.</p>
            </div>
          )}
          <div className="pt-4 flex flex-col gap-3">
            {errorMsg && <Card className="border-red-400/20 bg-red-400/10 py-0 text-sm text-red-400"><CardContent className="p-3">{errorMsg}</CardContent></Card>}
            {successMsg && <Card className="border-green-400/20 bg-green-400/10 py-0 text-sm text-green-400"><CardContent className="p-3">{successMsg}</CardContent></Card>}
            <div className="flex justify-end gap-3 mt-2">
               <Button type="button" variant="ghost" className="text-gray-400 hover:text-white" onClick={handleClose}>Cancelar</Button>
               <Button type="submit" disabled={isSaving}>{isSaving ? "Salvando..." : "Salvar"}</Button>
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={handleConfirmArchive}
      />
      <HardDeleteModal
        isOpen={hardDeleteModalOpen}
        onClose={() => setHardDeleteModalOpen(false)}
        onConfirm={handleConfirmHardDelete}
      />
    </div>
  );
}
