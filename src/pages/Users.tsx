import React, { useEffect, useMemo, useState } from "react";
import { Plus, Users as UsersIcon, Edit, Trash2, Archive } from "lucide-react";
import { DataTable } from "../components/DataTable";
import type { ColumnDef } from "@tanstack/react-table";
import { CompositionDonut } from "../components/charts";
import { useAuthStore } from "../stores/authStore";
import { Modal } from "../components/Modal";
import { ConfirmModal } from "../components/ConfirmModal";
import { HardDeleteModal } from "../components/HardDeleteModal";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card, CardContent } from "../components/ui/card";
import { apiFetch, parseApiError } from "../lib/api";

export function Users() {
  const { user } = useAuthStore();
  const isAdmin = ["admin", "master"].includes(user?.role?.toLowerCase() || "");
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const defaultFormData = { name: '', username: '', email: '', password: '', roleId: '', commissionPercent: '' };
  const [formData, setFormData] = useState(defaultFormData);

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await apiFetch("/api/users?page=1&limit=50");
      const resData = await res.json();
      if(resData.data && Array.isArray(resData.data)) setUsers(resData.data);
    } catch(err) {
      console.error(err);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await apiFetch("/api/users/roles");
      const resData = await res.json();
      if(resData.data && Array.isArray(resData.data)) {
        setRoles(resData.data);
        if (resData.data.length > 0) {
          setFormData(f => ({ ...f, roleId: resData.data[0].id }));
        }
      }
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
      
      const url = editingId ? `/api/users/${editingId}` : "/api/users";
      const method = editingId ? "PUT" : "POST";

      const res = await apiFetch(url, {
        method,
        body: JSON.stringify(formData)
      });
      
      const parsed = await parseApiError(res);
      
      if (res.ok) {
        setSuccessMsg(editingId ? "Usuário salvo com sucesso!" : "Usuário criado com sucesso!");
        setTimeout(() => {
          handleClose();
          fetchUsers();
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

  const handleEdit = (u: any) => {
    setFormData({
      name: u.name || '',
      username: u.username || '',
      email: u.email || '',
      password: '', // do not show password
      roleId: u.roleId || '',
      commissionPercent: u.commissionPercent != null ? String(u.commissionPercent) : ''
    });
    setEditingId(u.id);
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
      const res = await apiFetch(`/api/users/${itemToDelete}`, { method: "DELETE" });
      if (res.ok) {
        setActionSuccess("Registro arquivado com sucesso.");
        setUsers(prev => prev.filter(u => u.id !== itemToDelete));
        setTimeout(() => setActionSuccess(""), 3000);
        fetchUsers();
      } else {
        const data = await res.json().catch(() => ({}));
        setActionError(`Erro ${res.status}: ${data.error || "Erro ao arquivar"}`);
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
      const res = await apiFetch(`/api/users/${itemToDelete}/hard-delete`, { method: "DELETE" });
      if (res.ok) {
        setActionSuccess("Registro excluído definitivamente com sucesso.");
        setUsers(prev => prev.filter(u => u.id !== itemToDelete));
        setTimeout(() => setActionSuccess(""), 3000);
        fetchUsers();
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
    if (roles.length > 0) {
      setFormData(f => ({ ...f, roleId: roles[0].id }));
    }
    setErrorMsg("");
    setSuccessMsg("");
    setFieldErrors({});
  };

  // Colunas da equipe (TanStack) + infográfico por perfil.
  const userColumns = useMemo<ColumnDef<any>[]>(() => [
    {
      accessorKey: "name",
      header: "Nome / Usuário",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-700 bg-brand-navy text-brand-gold"><UsersIcon className="h-4 w-4" /></div>
          <div className="flex min-w-0 flex-col">
            <div className="truncate font-medium text-gray-200">{row.original.name}</div>
            {row.original.username && <div className="truncate text-xs text-brand-gold">@{row.original.username}</div>}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "email",
      header: "E-mail",
      cell: ({ getValue }) => getValue() ? <span className="text-gray-400">{String(getValue())}</span> : <span className="text-gray-600">-</span>,
    },
    {
      accessorKey: "roleName",
      header: "Perfil",
      cell: ({ getValue }) => <span className="text-gray-300">{String(getValue() || "")}</span>,
    },
    {
      accessorKey: "isActive",
      header: () => <div className="text-center">Status</div>,
      cell: ({ getValue }) => (
        <div className="text-center">
          {getValue()
            ? <Badge variant="outline" className="rounded border-green-800/50 bg-green-900/30 px-2 py-1 text-xs font-normal text-green-400">Ativo</Badge>
            : <Badge variant="outline" className="rounded border-red-800/50 bg-red-900/30 px-2 py-1 text-xs font-normal text-red-400">Inativo</Badge>}
        </div>
      ),
    },
    {
      id: "acoes",
      header: () => <div className="text-right">Ações</div>,
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => {
        const u = row.original;
        return (
          <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon-sm" title="Editar" onClick={() => handleEdit(u)} className="rounded bg-gray-800/50 text-gray-400 hover:bg-gray-800/50 hover:text-brand-gold dark:hover:bg-gray-800/50">
              <Edit className="size-4" />
            </Button>
            <Button variant="ghost" size="icon-sm" title="Arquivar" onClick={() => initArchive(u.id)} disabled={isDeletingId === u.id} className="rounded bg-gray-800/50 text-gray-400 hover:bg-gray-800/50 hover:text-yellow-400 dark:hover:bg-gray-800/50">
              <Archive className="size-4" />
            </Button>
            {isAdmin && (
              <Button variant="ghost" size="icon-sm" title="Excluir Definitivamente" onClick={() => initHardDelete(u.id)} disabled={isDeletingId === u.id} className="rounded bg-gray-800/50 text-gray-400 hover:bg-gray-800/50 hover:text-red-400 dark:hover:bg-gray-800/50">
                <Trash2 className="size-4" />
              </Button>
            )}
          </div>
        );
      },
    },
  ], [isAdmin, isDeletingId]);

  const userStats = useMemo(() => {
    let active = 0, withEmail = 0;
    const byRole = new Map<string, number>();
    for (const u of users) {
      if (u.isActive) active += 1;
      if (u.email) withEmail += 1;
      const r = String(u.roleName || "Sem perfil");
      byRole.set(r, (byRole.get(r) || 0) + 1);
    }
    const COLORS = ["#ffd700", "#34d399", "#60a5fa", "#a78bfa", "#fbbf24"];
    const donut = [...byRole.entries()].sort((a, b) => b[1] - a[1])
      .map(([label, value], i) => ({ label, value, color: COLORS[i % COLORS.length] }));
    return { count: users.length, active, withEmail, donut };
  }, [users]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-semibold text-white">Usuários & Permissões</h2>
        <Button
          onClick={() => { setEditingId(null); setFormData(defaultFormData); if (roles.length > 0) setFormData(f => ({ ...f, roleId: roles[0].id })); setIsModalOpen(true); }}
          className="md:hidden w-full sm:w-auto bg-brand-gold text-brand-navydark hover:bg-brand-goldhover text-sm h-auto px-4 py-2.5 sm:py-2 has-[>svg]:px-4 rounded-lg shrink-0"
        >
          <Plus className="size-4 shrink-0" />
          Novo Usuário
        </Button>
      </div>

      {actionError && <div className="text-sm text-red-400 bg-red-400/10 p-3 rounded border border-red-400/20">{actionError}</div>}
      {actionSuccess && <div className="text-sm text-green-400 bg-green-400/10 p-3 rounded border border-green-400/20">{actionSuccess}</div>}

      <Card className="overflow-hidden rounded-xl border-gray-800 bg-[#171717] p-3 gap-0 shadow-none">
      <CardContent className="p-0">
      {/* Infográfico da equipe (vivo: tooltip no donut) */}
      <div className="hidden md:grid grid-cols-3 gap-3">
        <Card className="border-gray-700 bg-brand-navylight p-4 gap-0 shadow-none">
          <CardContent className="p-0">
            <div className="text-[11px] text-gray-400">Usuários</div>
            <div className="text-2xl font-black text-white">{userStats.count}</div>
            <div className="text-[10px] text-gray-500">{userStats.active} ativo(s) · {userStats.count - userStats.active} inativo(s)</div>
          </CardContent>
        </Card>
        <Card className="border-gray-700 bg-brand-navylight p-4 gap-0 shadow-none">
          <CardContent className="p-0">
            <div className="text-[11px] text-gray-400">Com e-mail cadastrado</div>
            <div className="text-2xl font-black text-blue-300">{userStats.withEmail}</div>
          </CardContent>
        </Card>
        <Card className="border-gray-700 bg-brand-navylight p-3 gap-0 shadow-none">
          <CardContent className="p-0">
            <div className="mb-1 text-[11px] text-gray-400">Por perfil</div>
            {userStats.donut.length > 0 ? <CompositionDonut items={userStats.donut} height={100} format={(v) => `${v} usuário(s)`} /> : <div className="py-4 text-center text-xs text-gray-600">sem dados</div>}
          </CardContent>
        </Card>
      </div>

      {/* Tabela TanStack (desktop). Cards do celular seguem abaixo. */}
      <div className="hidden md:block mt-3 border-t border-gray-800 pt-3">
        <DataTable
          columns={userColumns}
          data={users}
          pageSize={15}
          searchPlaceholder="Buscar por nome, usuário ou e-mail..."
          emptyText="Nenhum encontrado"
          onRowClick={(u: any) => handleEdit(u)}
          headerEnd={
            <Button
              onClick={() => { setEditingId(null); setFormData(defaultFormData); if (roles.length > 0) setFormData(f => ({ ...f, roleId: roles[0].id })); setIsModalOpen(true); }}
              className="gap-1.5 border-transparent bg-brand-gold text-sm font-bold text-brand-navydark hover:bg-brand-goldhover shrink-0"
            >
              <Plus className="size-4" />
              Novo Usuário
            </Button>
          }
        />
      </div>

      <div className="md:hidden space-y-4">
        {users.length === 0 ? (
          <Card className="border-gray-700 bg-brand-navylight p-8 text-center text-gray-500 shadow-md gap-0">
            <CardContent className="p-0">
              Nenhum encontrado
            </CardContent>
          </Card>
        ) : users.map(u => (
          <Card key={u.id} className="border-gray-700 bg-brand-navylight p-4 shadow-md gap-0">
          <CardContent className="flex flex-col gap-3 p-0">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-[#171717] border border-gray-700 flex items-center justify-center text-brand-gold shrink-0">
                <UsersIcon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-2 mb-1">
                  <div className="font-medium text-gray-200 truncate">{u.name}</div>
                  {u.isActive ? (
                    <Badge variant="outline" className="rounded bg-green-900/30 text-green-400 border-green-800/50 px-2 py-0.5 text-[10px] font-normal uppercase shrink-0">Ativo</Badge>
                  ) : (
                    <Badge variant="outline" className="rounded bg-red-900/30 text-red-400 border-red-800/50 px-2 py-0.5 text-[10px] font-normal uppercase shrink-0">Inativo</Badge>
                  )}
                </div>
                {u.username && <div className="text-xs text-brand-gold truncate mb-1">@{u.username}</div>}
                {u.email && <div className="text-sm text-gray-400 truncate mb-1">{u.email}</div>}
                <div className="text-xs text-brand-gold truncate">{u.roleName}</div>
              </div>
            </div>
            <div className="flex justify-end gap-1 mt-2 pt-2 border-t border-gray-700/50">
              <Button variant="ghost" size="icon-sm" title="Editar" onClick={() => handleEdit(u)} className="rounded bg-gray-800/50 text-gray-400 hover:bg-gray-800/50 hover:text-brand-gold dark:hover:bg-gray-800/50">
                <Edit className="size-4" />
              </Button>
              <Button variant="ghost" size="icon-sm" title="Arquivar" onClick={() => initArchive(u.id)} disabled={isDeletingId === u.id} className="rounded bg-gray-800/50 text-gray-400 hover:bg-gray-800/50 hover:text-yellow-400 dark:hover:bg-gray-800/50">
                <Archive className="size-4" />
              </Button>
              {isAdmin && (
                <Button variant="ghost" size="sm" title="Excluir Definitivamente" onClick={() => initHardDelete(u.id)} disabled={isDeletingId === u.id} className="rounded bg-gray-800/50 px-2 text-gray-400 hover:bg-gray-800/50 hover:text-red-400 dark:hover:bg-gray-800/50 has-[>svg]:px-2 gap-1">
                  <Trash2 className="size-4" />
                  {isDeletingId === u.id && <span className="text-[10px]">Excluindo...</span>}
                </Button>
              )}
            </div>
          </CardContent>
          </Card>
        ))}
      </div>
      </CardContent>
      </Card>

      <Modal isOpen={isModalOpen} onClose={handleClose} title={editingId ? "Editar Usuário" : "Novo Usuário"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Nome Completo</label>
            <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-[#171717] border border-gray-700 rounded-lg px-4 py-2 text-white outline-none focus:border-brand-gold" />
            {fieldErrors.name && <p className="text-red-400 text-xs mt-1">{fieldErrors.name}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Nome de Usuário (Login)</label>
            <input required type="text" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full bg-[#171717] border border-gray-700 rounded-lg px-4 py-2 text-white outline-none focus:border-brand-gold" />
            {fieldErrors.username && <p className="text-red-400 text-xs mt-1">{fieldErrors.username}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">E-mail (Opcional)</label>
            <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-[#171717] border border-gray-700 rounded-lg px-4 py-2 text-white outline-none focus:border-brand-gold" />
            {fieldErrors.email && <p className="text-red-400 text-xs mt-1">{fieldErrors.email}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Perfil (Role)</label>
            <select required value={formData.roleId} onChange={e => setFormData({...formData, roleId: e.target.value})} className="w-full bg-[#171717] border border-gray-700 rounded-lg px-4 py-2 text-white outline-none focus:border-brand-gold">
               <option value="" disabled>Selecione um perfil...</option>
               {roles.map(r => (
                 <option key={r.id} value={r.id}>{r.name}</option>
               ))}
            </select>
            {fieldErrors.roleId && <p className="text-red-400 text-xs mt-1">{fieldErrors.roleId}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">{editingId ? "Nova Senha (deixe em branco para manter)" : "Senha Provisória"}</label>
            <input type="password" required={!editingId} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full bg-[#171717] border border-gray-700 rounded-lg px-4 py-2 text-white outline-none focus:border-brand-gold" />
            {fieldErrors.password && <p className="text-red-400 text-xs mt-1">{fieldErrors.password}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Comissão (%)</label>
            <input type="number" step="0.01" min="0" max="100" value={formData.commissionPercent} onChange={e => setFormData({...formData, commissionPercent: e.target.value})} className="w-full bg-[#171717] border border-gray-700 rounded-lg px-4 py-2 text-white outline-none focus:border-brand-gold" placeholder="0" />
            <p className="text-[11px] text-gray-500 mt-1">% sobre o faturamento das vendas deste vendedor. Deixe 0 se não recebe comissão.</p>
          </div>
          <div className="pt-4 flex flex-col gap-3">
            {errorMsg && <div className="text-sm text-red-400 bg-red-400/10 p-3 rounded">{errorMsg}</div>}
            {successMsg && <div className="text-sm text-green-400 bg-green-400/10 p-3 rounded">{successMsg}</div>}
            <div className="flex justify-end gap-3 mt-2">
               <Button type="button" variant="ghost" onClick={handleClose} className="text-base text-gray-400 hover:text-white hover:bg-transparent dark:hover:bg-transparent">Cancelar</Button>
               <Button disabled={isSaving} type="submit" className="rounded-lg bg-brand-gold text-base text-brand-navydark hover:bg-brand-goldhover">
                 {isSaving ? "Salvando..." : "Salvar"}
               </Button>
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
