import React, { useEffect, useState, useMemo } from "react";
import { Plus, Search, User as UserIcon, Edit, Trash2, Archive } from "lucide-react";
import { useAuthStore } from "../stores/authStore";
import { Modal } from "../components/Modal";
import { ConfirmModal } from "../components/ConfirmModal";
import { HardDeleteModal } from "../components/HardDeleteModal";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card, CardContent } from "../components/ui/card";
import { apiFetch, parseApiError } from "../lib/api";
import { DataTable } from "../components/DataTable";
import type { ColumnDef } from "@tanstack/react-table";
import { CompositionDonut } from "../components/charts";

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export function Customers() {
  const { user } = useAuthStore();
  const isAdmin = ["admin", "master"].includes(user?.role?.toLowerCase() || "");
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const defaultFormData = { 
    name: '', documentType: 'CPF', document: '', phone: '', email: '', 
    type: 'PERSON', nationality: 'FOREIGN', address: '', country: 'Brasil', priceTable: 'A' 
  };
  const [formData, setFormData] = useState(defaultFormData);

  useEffect(() => {
    const controller = new AbortController();
    fetchCustomers(debouncedSearch, controller.signal);
    return () => controller.abort();
  }, [debouncedSearch]);

  const fetchCustomers = async (q: string = "", signal?: AbortSignal) => {
    try {
      const res = await apiFetch(`/api/customers?q=${q}&page=1&limit=50`, { signal });
      const resData = await res.json();
      if(resData.data && Array.isArray(resData.data)) setCustomers(resData.data);
    } catch(err: any) {
      if (err?.name !== 'AbortError') console.error(err);
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
      const url = editingId ? `/api/customers/${editingId}` : "/api/customers";
      const method = editingId ? "PUT" : "POST";

      const res = await apiFetch(url, {
        method,
        body: JSON.stringify(formData)
      });
      
      const parsed = await parseApiError(res);
      
      if (res.ok) {
        setSuccessMsg(editingId ? "Cliente atualizado com sucesso!" : "Cliente salvo com sucesso!");
        setTimeout(() => {
          handleClose();
          fetchCustomers(debouncedSearch);
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

  const handleEdit = (customer: any) => {
    setFormData({
      name: customer.name || '',
      documentType: customer.documentType || 'CPF',
      document: customer.document || '',
      phone: customer.phone || '',
      email: customer.email || '',
      type: customer.type || 'PERSON',
      nationality: customer.nationality || 'FOREIGN',
      address: customer.address || '',
      country: customer.country || 'Brasil',
      priceTable: customer.priceTable || 'A'
    });
    setEditingId(customer.id);
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
      const res = await apiFetch(`/api/customers/${itemToDelete}`, { method: "DELETE" });
      if (res.ok) {
        setActionSuccess("Registro arquivado com sucesso.");
        setCustomers((prev) => prev.filter((c) => c.id !== itemToDelete));
        setTimeout(() => setActionSuccess(""), 3000);
        fetchCustomers(debouncedSearch);
      } else {
        const data = await res.json().catch(() => ({}));
        setActionError(`Erro ${res.status}: ${data.error || "Erro ao arquivar registro"}`);
        setTimeout(() => setActionError(""), 5000);
      }
    } catch (error: any) {
      console.error(error);
      setActionError(`Erro: ${error.message}`);
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
      const res = await apiFetch(`/api/customers/${itemToDelete}/hard-delete`, { method: "DELETE" });
      if (res.ok) {
        setActionSuccess("Registro excluído definitivamente com sucesso.");
        setCustomers((prev) => prev.filter((c) => c.id !== itemToDelete));
        setTimeout(() => setActionSuccess(""), 3000);
        fetchCustomers(debouncedSearch);
      } else {
        const data = await res.json().catch(() => ({}));
        setActionError(data.error || "Erro ao excluir definitivamente o registro.");
        setTimeout(() => setActionError(""), 7000);
      }
    } catch (error: any) {
      console.error(error);
      setActionError(`Erro: ${error.message}`);
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

  // Colunas da tabela de clientes (TanStack): ordenação, busca instantânea e paginação no DataTable.
  const customerColumns = useMemo<ColumnDef<any>[]>(() => [
    {
      accessorKey: "name",
      header: "Nome",
      cell: ({ row }) => (
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-700 bg-[#171717] text-[11px] font-black text-brand-gold">
            {String(row.original.name || "?").trim().slice(0, 1).toUpperCase()}
          </span>
          <span className="font-medium text-gray-200">{row.original.name}</span>
        </div>
      ),
    },
    {
      id: "tipo",
      header: "Tipo / Nacionalidade",
      accessorFn: (c: any) => `${c.type || ""} ${c.nationality || ""}`,
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <Badge variant="secondary" className="rounded border-gray-700/50 bg-gray-800/50 px-1.5 text-[10px] font-normal uppercase text-gray-300">{row.original.type}</Badge>
          <Badge variant="secondary" className="rounded border-gray-700/50 bg-gray-800/50 px-1.5 text-[10px] font-normal uppercase text-gray-400">{row.original.nationality}</Badge>
        </div>
      ),
    },
    {
      accessorKey: "document",
      header: "Documento",
      cell: ({ getValue }) => <span className="font-mono text-xs text-gray-300">{String(getValue() || "-")}</span>,
    },
    {
      accessorKey: "phone",
      header: "Telefone",
      cell: ({ getValue }) => <span className="text-gray-400">{String(getValue() || "-")}</span>,
    },
    {
      id: "acoes",
      header: () => <div className="text-right">Ações</div>,
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => {
        const c = row.original;
        return (
          <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon-sm" title="Editar" onClick={() => handleEdit(c)} className="rounded bg-gray-800/50 text-gray-400 hover:bg-gray-800/50 hover:text-brand-gold dark:hover:bg-gray-800/50">
              <Edit className="size-4" />
            </Button>
            <Button variant="ghost" size="icon-sm" title="Arquivar" onClick={() => initArchive(c.id)} disabled={isDeletingId === c.id} className="rounded bg-gray-800/50 text-gray-400 hover:bg-gray-800/50 hover:text-yellow-400 dark:hover:bg-gray-800/50">
              <Archive className="size-4" />
            </Button>
            {isAdmin && (
              <Button variant="ghost" size="icon-sm" title="Excluir Definitivamente" onClick={() => initHardDelete(c.id)} disabled={isDeletingId === c.id} className="rounded bg-gray-800/50 text-gray-400 hover:bg-gray-800/50 hover:text-red-400 dark:hover:bg-gray-800/50">
                <Trash2 className="size-4" />
              </Button>
            )}
          </div>
        );
      },
    },
  ], [isAdmin, isDeletingId]);

  // Infográfico da carteira de clientes (vivo: tooltip no donut).
  const customerStats = useMemo(() => {
    let withDoc = 0, withPhone = 0;
    const byType = new Map<string, number>();
    for (const c of customers) {
      if (c.document) withDoc += 1;
      if (c.phone) withPhone += 1;
      const t = String(c.type || "OUTRO").toUpperCase();
      byType.set(t, (byType.get(t) || 0) + 1);
    }
    const COLORS = ["#ffd700", "#34d399", "#60a5fa", "#a78bfa"];
    const donut = [...byType.entries()].sort((a, b) => b[1] - a[1])
      .map(([label, value], i) => ({ label, value, color: COLORS[i % COLORS.length] }));
    return { count: customers.length, withDoc, withPhone, donut };
  }, [customers]);


  return (
    <div className="customers-page space-y-4 md:space-y-6">
      <div className="customers-header flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 md:gap-4">
        <h2 className="text-2xl font-semibold text-white">Clientes</h2>
      </div>

      {actionError && <div className="text-sm text-red-400 bg-red-400/10 p-3 rounded border border-red-400/20">{actionError}</div>}
      {actionSuccess && <div className="text-sm text-green-400 bg-green-400/10 p-3 rounded border border-green-400/20">{actionSuccess}</div>}

      <Card className="overflow-hidden rounded-xl border-gray-800 bg-[#171717] p-3 gap-0 shadow-none">
      <CardContent className="p-0">
      <div className="customers-search flex flex-col sm:flex-row gap-3 md:gap-4 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="w-5 h-5 absolute left-3 top-3 sm:top-2.5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar clientes por nome, documento..."
            className="w-full bg-[#171717] border border-gray-700 rounded-lg pl-10 pr-4 py-3 sm:py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-brand-gold"
          />
        </div>
        <Button
          onClick={() => { setEditingId(null); setFormData(defaultFormData); setIsModalOpen(true); }}
          className="w-full sm:w-auto rounded-lg bg-brand-gold text-base text-brand-navydark hover:bg-brand-goldhover py-3 sm:py-2.5 has-[>svg]:px-4 h-auto shrink-0"
        >
          <Plus className="size-4 shrink-0" />
          Novo Cliente
        </Button>
      </div>

      {/* Infográfico da carteira (vivo: tooltip no donut ao passar o mouse) */}
      <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
        <Card className="border-gray-700 bg-brand-navylight p-4 gap-0 shadow-none">
          <CardContent className="p-0">
            <div className="text-[11px] text-gray-400">Clientes listados</div>
            <div className="text-2xl font-black text-white">{customerStats.count}</div>
          </CardContent>
        </Card>
        <Card className="border-gray-700 bg-brand-navylight p-4 gap-0 shadow-none">
          <CardContent className="p-0">
            <div className="text-[11px] text-gray-400">Com documento</div>
            <div className="text-2xl font-black text-emerald-300">{customerStats.withDoc}</div>
            <div className="text-[10px] text-gray-500">{customerStats.count > 0 ? Math.round((customerStats.withDoc / customerStats.count) * 100) : 0}% da carteira</div>
          </CardContent>
        </Card>
        <Card className="border-gray-700 bg-brand-navylight p-4 gap-0 shadow-none">
          <CardContent className="p-0">
            <div className="text-[11px] text-gray-400">Com telefone</div>
            <div className="text-2xl font-black text-blue-300">{customerStats.withPhone}</div>
            <div className="text-[10px] text-gray-500">contato direto no WhatsApp</div>
          </CardContent>
        </Card>
        <Card className="border-gray-700 bg-brand-navylight p-3 gap-0 shadow-none">
          <CardContent className="p-0">
            <div className="mb-1 text-[11px] text-gray-400">Por tipo</div>
            {customerStats.donut.length > 0 ? <CompositionDonut items={customerStats.donut} height={110} format={(v) => `${v} cliente(s)`} /> : <div className="py-4 text-center text-xs text-gray-600">sem dados</div>}
          </CardContent>
        </Card>
      </div>

      {/* Tabela desktop (TanStack): ordenar, buscar e paginar. Cards do celular seguem abaixo. */}
      <div className="hidden md:block mt-3 border-t border-gray-800 pt-3">
        <DataTable
          columns={customerColumns}
          data={customers}
          pageSize={15}
          searchPlaceholder="Buscar nos clientes carregados..."
          emptyText="Nenhum cliente cadastrado."
          onRowClick={(c: any) => handleEdit(c)}
        />
      </div>


      <div className="customer-mobile-list md:hidden space-y-2.5">
        {customers.length === 0 ? (
          <Card className="border-gray-700 bg-brand-navylight p-8 text-center text-gray-500 shadow-md gap-0">
            <CardContent className="p-0">
              Nenhum cliente cadastrado.
            </CardContent>
          </Card>
        ) : customers.map(c => (
          <Card key={c.id} className="customer-mobile-card border-gray-700 bg-brand-navylight p-3 shadow-md gap-0">
          <CardContent className="flex gap-3 p-0">
            <div className="customer-mobile-avatar w-8 h-8 rounded-full bg-[#171717] border border-gray-700 flex items-center justify-center text-brand-gold shrink-0">
              <UserIcon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="customer-mobile-name font-semibold text-gray-200 truncate mb-1">{c.name}</div>
              <div className="customer-mobile-tags flex items-center gap-1.5 mb-1">
                <Badge variant="secondary" className="customer-mobile-tag rounded bg-gray-800/50 border-gray-700/50 px-1.5 text-gray-400 text-[9px] font-normal uppercase">{c.type}</Badge>
                <Badge variant="secondary" className="customer-mobile-tag rounded bg-gray-800/50 border-gray-700/50 px-1.5 text-gray-400 text-[9px] font-normal uppercase">{c.nationality}</Badge>
              </div>
              <div className="customer-mobile-meta flex justify-between items-center text-xs">
                <span className="text-gray-400 font-mono text-[11px] truncate">{c.document || 'Sem doc'}</span>
                <span className="text-gray-400 truncate ml-2 text-[11px]">{c.phone || '-'}</span>
              </div>
              <div className="customer-mobile-actions flex justify-end gap-1 mt-2 pt-2 border-t border-gray-700/50">
                  <Button variant="ghost" size="icon-xs" title="Editar" onClick={() => handleEdit(c)} className="customer-mobile-action text-gray-400 hover:text-brand-gold hover:bg-gray-800/50 dark:hover:bg-gray-800/50 bg-gray-800/50 rounded">
                    <Edit className="size-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon-xs" title="Arquivar" onClick={() => initArchive(c.id)} disabled={isDeletingId === c.id} className="customer-mobile-action text-gray-400 hover:text-yellow-400 hover:bg-gray-800/50 dark:hover:bg-gray-800/50 bg-gray-800/50 rounded gap-1">
                    <Archive className="size-3.5" />
                  </Button>
                  {isAdmin && (
                    <Button variant="ghost" size="icon-xs" title="Excluir Definitivamente" onClick={() => initHardDelete(c.id)} disabled={isDeletingId === c.id} className="customer-mobile-action text-gray-400 hover:text-red-400 hover:bg-gray-800/50 dark:hover:bg-gray-800/50 bg-gray-800/50 rounded gap-1">
                      <Trash2 className="size-3.5" />
                      {isDeletingId === c.id && <span className="text-[10px]">Excluindo...</span>}
                    </Button>
                  )}
              </div>
            </div>
          </CardContent>
          </Card>
        ))}
      </div>
      </CardContent>
      </Card>

      <Modal isOpen={isModalOpen} onClose={handleClose} title={editingId ? "Editar Cliente" : "Novo Cliente"}>
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Tipo de Cliente</label>
              <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full bg-[#171717] border border-gray-700 rounded-lg px-4 py-2 text-white outline-none focus:border-brand-gold">
                <option value="PERSON">Física</option>
                <option value="COMPANY">Jurídica</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Nacionalidade</label>
              <select value={formData.nationality} onChange={e => setFormData({...formData, nationality: e.target.value})} className="w-full bg-[#171717] border border-gray-700 rounded-lg px-4 py-2 text-white outline-none focus:border-brand-gold">
                <option value="PY">Nacional (Paraguai)</option>
                <option value="FOREIGN">Estrangeiro</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Nome Completo / Razão Social</label>
            <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-[#171717] border border-gray-700 rounded-lg px-4 py-2 text-white outline-none focus:border-brand-gold" />
            {fieldErrors.name && <p className="text-red-400 text-xs mt-1">{fieldErrors.name}</p>}
          </div>

          <div className="grid grid-cols-3 gap-4">
             <div>
               <label className="block text-sm font-medium text-gray-400 mb-1">Tipo Doc.</label>
               <select value={formData.documentType} onChange={e => setFormData({...formData, documentType: e.target.value})} className="w-full bg-[#171717] border border-gray-700 rounded-lg px-4 py-2 text-white outline-none focus:border-brand-gold">
                 <option value="CI">CI (Cédula de Identidade)</option>
                 <option value="RUC">RUC</option>
                 <option value="CPF">CPF</option>
                 <option value="DNI">DNI (Argentina)</option>
                 <option value="PASSPORT">Passaporte</option>
                 <option value="OTHER">Outro</option>
               </select>
               {fieldErrors.documentType && <p className="text-red-400 text-xs mt-1">{fieldErrors.documentType}</p>}
             </div>
             <div className="col-span-2">
               <label className="block text-sm font-medium text-gray-400 mb-1">Número do Documento</label>
               <input type="text" value={formData.document} onChange={e => setFormData({...formData, document: e.target.value})} className="w-full bg-[#171717] border border-gray-700 rounded-lg px-4 py-2 text-white outline-none focus:border-brand-gold" />
               {fieldErrors.document && <p className="text-red-400 text-xs mt-1">{fieldErrors.document}</p>}
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Telefone / WhatsApp</label>
              <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-[#171717] border border-gray-700 rounded-lg px-4 py-2 text-white outline-none focus:border-brand-gold" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">E-mail</label>
              <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-[#171717] border border-gray-700 rounded-lg px-4 py-2 text-white outline-none focus:border-brand-gold" />
              {fieldErrors.email && <p className="text-red-400 text-xs mt-1">{fieldErrors.email}</p>}
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
               <label className="block text-sm font-medium text-gray-400 mb-1">Endereço</label>
               <input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full bg-[#171717] border border-gray-700 rounded-lg px-4 py-2 text-white outline-none focus:border-brand-gold" />
            </div>
            <div>
               <label className="block text-sm font-medium text-gray-400 mb-1">País</label>
               <input type="text" value={formData.country} onChange={e => setFormData({...formData, country: e.target.value})} className="w-full bg-[#171717] border border-gray-700 rounded-lg px-4 py-2 text-white outline-none focus:border-brand-gold" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-800/50">
             <div>
               <label className="block text-sm font-medium text-gray-400 mb-1">Preço de Venda Padrão</label>
               <select value={formData.priceTable} onChange={e => setFormData({...formData, priceTable: e.target.value})} className="w-full bg-[#171717] border border-gray-700 rounded-lg px-4 py-2 text-white outline-none focus:border-brand-gold">
                 <option value="A">Preço A (Varejo)</option>
                 <option value="B">Preço B (Atacado)</option>
               </select>
             </div>
          </div>

          <div className="pt-4 flex flex-col gap-3 border-t border-gray-800">
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
