import React, { useState, useEffect, useMemo } from 'react';
import { Truck, Plus, Search, Edit2, Archive, Trash2, X, FileImage, UploadCloud, Eye, Save, Download } from 'lucide-react';
import { DataTable } from '../components/DataTable';
import type { ColumnDef } from '@tanstack/react-table';
import { apiFetch, extractList } from '../lib/api';
import { ConfirmModal } from '../components/ConfirmModal';
import { Modal } from '../components/Modal';
import { HardDeleteModal } from '../components/HardDeleteModal';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';

export function Suppliers() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 50;
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '', document: '', phone: '', email: '',
    address: '', city: '', country: 'PY', observations: ''
  });

  const [confirmArchive, setConfirmArchive] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const [invoiceSupplier, setInvoiceSupplier] = useState<any>(null);
  const [supplierInvoices, setSupplierInvoices] = useState<any[]>([]);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceSaving, setInvoiceSaving] = useState(false);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [previewInvoice, setPreviewInvoice] = useState<any>(null);
  const [invoiceForm, setInvoiceForm] = useState({
    invoiceNumber: '',
    invoiceDate: new Date().toISOString().slice(0, 10),
    observations: ''
  });

  const loadSuppliers = async (targetPage = page, signal?: AbortSignal) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search,
        page: String(targetPage),
        limit: String(limit)
      });
      const res = await apiFetch(`/api/suppliers?${params.toString()}`, { signal });
      const data = await res.json();
      const list = extractList(data);
      setSuppliers(list);
      setTotal(Number(data?.total ?? list.length));
      setPage(Number(data?.page ?? targetPage));
    } catch (e: any) {
      if (e?.name === 'AbortError') return;
      console.error(e);
      setSuppliers([]);
      setTotal(0);
    } finally {
      if (signal?.aborted) return;
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    const delayDebounceFn = setTimeout(() => {
      loadSuppliers(page, controller.signal);
    }, 500);
    return () => { clearTimeout(delayDebounceFn); controller.abort(); };
  }, [search, page]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const formatInvoiceDate = (value: any) => {
    if (!value) return '-';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '-' : d.toLocaleDateString('pt-BR');
  };


  const isImageInvoice = (invoice: any) => String(invoice?.fileType || '').startsWith('image/');
  const isPdfInvoice = (invoice: any) => String(invoice?.fileType || '').includes('pdf');

  const getInvoiceLabel = (invoice: any, idx?: number) => {
    return invoice?.invoiceNumber || invoice?.fileName || `Nota ${(idx ?? 0) + 1}`;
  };

  const downloadInvoiceFile = (invoice: any) => {
    if (!invoice?.filePath) return;
    const link = document.createElement('a');
    link.href = invoice.filePath;
    link.download = invoice.fileName || invoice.invoiceNumber || 'nota-fornecedor';
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const openInvoices = async (supplier: any) => {
    setInvoiceSupplier(supplier);
    setInvoiceForm({ invoiceNumber: '', invoiceDate: new Date().toISOString().slice(0, 10), observations: '' });
    setInvoiceFile(null);
    setSupplierInvoices([]);
    setInvoiceLoading(true);
    try {
      const res = await apiFetch(`/api/suppliers/${supplier.id}/invoices`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao carregar notas');
      setSupplierInvoices(extractList(data));
    } catch (e: any) {
      alert(e.message || 'Erro ao carregar notas do fornecedor.');
    } finally {
      setInvoiceLoading(false);
    }
  };

  const reloadInvoices = async () => {
    if (!invoiceSupplier) return;
    const res = await apiFetch(`/api/suppliers/${invoiceSupplier.id}/invoices`);
    const data = await res.json();
    if (res.ok) setSupplierInvoices(extractList(data));
  };

  const handleUploadInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceSupplier) return;
    if (!invoiceFile) {
      alert('Selecione uma foto ou PDF da nota.');
      return;
    }
    const payload = new FormData();
    payload.append('file', invoiceFile);
    payload.append('invoiceNumber', invoiceForm.invoiceNumber);
    payload.append('invoiceDate', invoiceForm.invoiceDate);
    payload.append('observations', invoiceForm.observations);

    setInvoiceSaving(true);
    try {
      const res = await apiFetch(`/api/suppliers/${invoiceSupplier.id}/invoices`, { method: 'POST', body: payload });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar nota');
      setInvoiceFile(null);
      setInvoiceForm({ invoiceNumber: '', invoiceDate: new Date().toISOString().slice(0, 10), observations: '' });
      await reloadInvoices();
    } catch (e: any) {
      alert(e.message || 'Erro ao salvar nota do fornecedor.');
    } finally {
      setInvoiceSaving(false);
    }
  };

  const handleUpdateInvoice = async (invoice: any) => {
    if (!invoiceSupplier) return;
    setInvoiceSaving(true);
    try {
      const res = await apiFetch(`/api/suppliers/${invoiceSupplier.id}/invoices/${invoice.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          invoiceNumber: invoice.invoiceNumber || '',
          invoiceDate: invoice.invoiceDate ? String(invoice.invoiceDate).slice(0, 10) : '',
          observations: invoice.observations || ''
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao atualizar nota');
      await reloadInvoices();
    } catch (e: any) {
      alert(e.message || 'Erro ao atualizar nota.');
    } finally {
      setInvoiceSaving(false);
    }
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!invoiceSupplier) return;
    if (!confirm('Deseja excluir esta nota do fornecedor?')) return;
    try {
      const res = await apiFetch(`/api/suppliers/${invoiceSupplier.id}/invoices/${invoiceId}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Erro ao excluir nota');
      await reloadInvoices();
    } catch (e: any) {
      alert(e.message || 'Erro ao excluir nota.');
    }
  };

  const openNew = () => {
    setEditingSupplier(null);
    setFormData({
       name: '', document: '', phone: '', email: '',
       address: '', city: '', country: 'PY', observations: ''
    });
    setIsModalOpen(true);
  };

  const openEdit = (supplier: any) => {
    setEditingSupplier(supplier);
    setFormData({
       name: supplier.name || '',
       document: supplier.document || '',
       phone: supplier.phone || '',
       email: supplier.email || '',
       address: supplier.address || '',
       city: supplier.city || '',
       country: supplier.country || '',
       observations: supplier.observations || ''
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
       const url = editingSupplier ? `/api/suppliers/${editingSupplier.id}` : '/api/suppliers';
       const method = editingSupplier ? 'PUT' : 'POST';
       
       const res = await apiFetch(url, {
          method,
          body: JSON.stringify(formData)
       });
       
       if (res.ok) {
          setIsModalOpen(false);
          loadSuppliers(page);
       } else {
          alert('Erro ao salvar');
       }
    } catch (e) {
       alert('Erro ao salvar');
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await apiFetch(`/api/suppliers/${id}/archive`, { method: 'PATCH' });
      loadSuppliers(page);
    } catch (e) {
      alert('Erro ao arquivar');
    } finally {
      setConfirmArchive(null);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await apiFetch(`/api/suppliers/${id}/hard-delete`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
         alert(data.error || 'Erro ao excluir');
      } else {
         loadSuppliers(page);
      }
    } catch (e) {
      alert('Erro ao excluir');
    } finally {
      setConfirmDelete(null);
    }
  };

  // Colunas de fornecedores (TanStack): ordenar/filtrar; clique na linha edita.
  const supplierColumns = useMemo<ColumnDef<any>[]>(() => [
    {
      accessorKey: 'name',
      header: 'Nome',
      cell: ({ getValue }) => <span className="font-medium text-white">{String(getValue() || '')}</span>,
    },
    {
      accessorKey: 'document',
      header: 'Documento',
      cell: ({ getValue }) => <span className="font-mono text-xs text-gray-300">{String(getValue() || '-')}</span>,
    },
    {
      id: 'contato',
      header: 'Contato',
      accessorFn: (r: any) => `${r.phone || ''} ${r.email || ''}`.trim() || '-',
      cell: ({ row }) => (
        <div>
          {row.original.phone && <div className="text-gray-300">{row.original.phone}</div>}
          {row.original.email && <div className="text-xs text-gray-500">{row.original.email}</div>}
          {!row.original.phone && !row.original.email && <span className="text-gray-600">-</span>}
        </div>
      ),
    },
    {
      id: 'local',
      header: 'Local',
      accessorFn: (r: any) => `${r.city || ''} ${r.country || ''}`.trim() || '-',
      cell: ({ row }) => <span className="text-gray-400">{row.original.city} {row.original.country && `- ${row.original.country}`}</span>,
    },
    {
      id: 'acoes',
      header: () => <div className="text-right">Ações</div>,
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => {
        const r = row.original;
        return (
          <div className="space-x-2 text-right" onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon-sm" onClick={() => openEdit(r)} title="Editar fornecedor" className="rounded-lg bg-gray-800 text-blue-400 hover:bg-gray-700 hover:text-blue-400 dark:hover:bg-gray-700">
              <Edit2 className="size-4" />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={() => openInvoices(r)} title="Notas de compra" className="rounded-lg bg-gray-800 text-emerald-300 hover:bg-gray-700 hover:text-emerald-300 dark:hover:bg-gray-700">
              <FileImage className="size-4" />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={() => setConfirmArchive(r.id)} title="Arquivar fornecedor" className="rounded-lg bg-gray-800 text-amber-400 hover:bg-gray-700 hover:text-amber-400 dark:hover:bg-gray-700">
              <Archive className="size-4" />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={() => setConfirmDelete(r.id)} className="rounded-lg bg-gray-800 text-red-500 hover:bg-gray-700 hover:text-red-500 dark:hover:bg-gray-700">
              <Trash2 className="size-4" />
            </Button>
          </div>
        );
      },
    },
  ], []);

  return (
    <div className="suppliers-page">
      <div className="suppliers-header flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Truck className="w-8 h-8 text-brand-gold" />
            Fornecedores
          </h1>
          <p className="text-gray-400">Gerencie seus fornecedores</p>
        </div>
        <Button onClick={openNew} className="supplier-new-button md:hidden bg-brand-gold hover:bg-brand-goldhover text-brand-navydark text-base h-auto px-4 py-2 has-[>svg]:px-4 rounded-lg">
          <Plus className="size-5" />
          Novo Fornecedor
        </Button>
      </div>

      <Card className="suppliers-table-card bg-brand-navylight border-gray-800 shadow-md gap-0 p-0">
        <div className="mobile-card-list suppliers-mobile-list">
          {suppliers.map(row => (
            <div key={row.id} className="mobile-data-card">
              <div className="mobile-card-main">
                <div>
                  <div className="mobile-card-title">{row.name}</div>
                  <div className="mobile-card-muted">Documento: {row.document || '-'}</div>
                </div>
                <div className="mobile-card-actions">
                  <Button variant="ghost" size="icon-sm" onClick={() => openEdit(row)} aria-label="Editar fornecedor" className="mobile-icon-button text-blue-400 hover:bg-[rgba(2,12,27,0.55)] hover:text-blue-400 dark:hover:bg-[rgba(2,12,27,0.55)]">
                    <Edit2 className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => openInvoices(row)} aria-label="Notas do fornecedor" className="mobile-icon-button text-emerald-300 hover:bg-[rgba(2,12,27,0.55)] hover:text-emerald-300 dark:hover:bg-[rgba(2,12,27,0.55)]">
                    <FileImage className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => setConfirmArchive(row.id)} aria-label="Arquivar fornecedor" className="mobile-icon-button text-amber-400 hover:bg-[rgba(2,12,27,0.55)] hover:text-amber-400 dark:hover:bg-[rgba(2,12,27,0.55)]">
                    <Archive className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => setConfirmDelete(row.id)} aria-label="Excluir fornecedor" className="mobile-icon-button text-red-500 hover:bg-[rgba(2,12,27,0.55)] hover:text-red-500 dark:hover:bg-[rgba(2,12,27,0.55)]">
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
              <div className="mobile-card-grid">
                <div>
                  <span>Contato</span>
                  <strong>{row.phone || '-'}</strong>
                  {row.email && <small>{row.email}</small>}
                </div>
                <div>
                  <span>Local</span>
                  <strong>{row.city || '-'} {row.country && `- ${row.country}`}</strong>
                </div>
              </div>
            </div>
          ))}
          {suppliers.length === 0 && !loading && (
            <Card className="mobile-empty-card gap-0 p-0 shadow-none">Nenhum fornecedor encontrado.</Card>
          )}
        </div>
        {/* Tabela TanStack (desktop). Paginação continua no SERVIDOR (page/limit abaixo);
            pageSize=50 acompanha o limit pra não paginar duas vezes. */}
        <div className="desktop-data-table p-4">
          <DataTable
            columns={supplierColumns}
            data={suppliers}
            loading={loading}
            pageSize={50}
            searchPlaceholder="Filtrar nesta página..."
            emptyText="Nenhum fornecedor encontrado."
            onRowClick={(row: any) => openEdit(row)}
            toolbar={
              <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  placeholder="Buscar por nome ou documento..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="h-9 w-full rounded-md border border-gray-800 bg-[#171717] pl-8 pr-3 text-sm text-white outline-none focus:border-brand-gold"
                />
              </div>
            }
            headerEnd={
              <Button onClick={openNew} className="supplier-new-button gap-1.5 border-transparent bg-brand-gold font-bold text-brand-navydark hover:bg-brand-goldhover shrink-0">
                <Plus className="size-4" />
                Novo Fornecedor
              </Button>
            }
          />
        </div>
        {total > limit && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-800 text-sm text-gray-400">
            <span>Página {page} de {totalPages} • {total} fornecedores</span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={page <= 1 || loading}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="rounded bg-[#171717] border-gray-700 dark:bg-[#171717] dark:border-gray-700 px-3 py-1.5 h-auto shadow-none hover:border-brand-gold hover:bg-[#171717] hover:text-gray-400 dark:hover:bg-[#171717]"
              >
                Anterior
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={page >= totalPages || loading}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="rounded bg-[#171717] border-gray-700 dark:bg-[#171717] dark:border-gray-700 px-3 py-1.5 h-auto shadow-none hover:border-brand-gold hover:bg-[#171717] hover:text-gray-400 dark:hover:bg-[#171717]"
              >
                Próxima
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingSupplier ? "Editar Fornecedor" : "Novo Fornecedor"}>
         <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Nome/Empresa *</label>
                  <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value.toUpperCase()})} className="w-full bg-[#171717] border border-gray-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-brand-gold" />
               </div>
               <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Documento (RUC/CPF)</label>
                  <input value={formData.document} onChange={e => setFormData({...formData, document: e.target.value.toUpperCase()})} className="w-full bg-[#171717] border border-gray-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-brand-gold" />
               </div>
               <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Telefone</label>
                  <input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-[#171717] border border-gray-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-brand-gold" />
               </div>
               <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">E-mail</label>
                  <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value.toLowerCase()})} className="w-full bg-[#171717] border border-gray-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-brand-gold" />
               </div>
               <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-400 mb-1">Endereço</label>
                  <input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value.toUpperCase()})} className="w-full bg-[#171717] border border-gray-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-brand-gold" />
               </div>
               <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Cidade</label>
                  <input value={formData.city} onChange={e => setFormData({...formData, city: e.target.value.toUpperCase()})} className="w-full bg-[#171717] border border-gray-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-brand-gold" />
               </div>
               <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">País</label>
                  <input value={formData.country} onChange={e => setFormData({...formData, country: e.target.value.toUpperCase()})} className="w-full bg-[#171717] border border-gray-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-brand-gold" />
               </div>
               <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-400 mb-1">Observações</label>
                  <textarea value={formData.observations} onChange={e => setFormData({...formData, observations: e.target.value.toUpperCase()})} className="w-full bg-[#171717] border border-gray-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-brand-gold h-20" />
               </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
               <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} className="text-base text-gray-400 hover:text-white hover:bg-transparent dark:hover:bg-transparent">Cancelar</Button>
               <Button type="submit" className="rounded-lg bg-brand-gold px-6 text-base text-brand-navydark hover:bg-brand-goldhover">
                  Salvar
               </Button>
            </div>
         </form>
      </Modal>

      {invoiceSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-6xl max-h-[92vh] overflow-hidden rounded-2xl border border-gray-800 bg-brand-navylight shadow-2xl flex flex-col">
            <div className="flex items-start justify-between gap-3 border-b border-gray-800 p-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2"><FileImage className="w-5 h-5 text-brand-gold" /> Notas do fornecedor</h3>
                <p className="text-xs text-gray-400 mt-0.5">{invoiceSupplier.name}</p>
              </div>
              <Button variant="ghost" size="icon-sm" onClick={() => setInvoiceSupplier(null)} className="rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white dark:hover:bg-gray-800">
                <X className="size-5" />
              </Button>
            </div>

            <div className="overflow-y-auto p-4 space-y-4">
              <form onSubmit={handleUploadInvoice} className="rounded-xl border border-gray-800 bg-brand-navydark/50 p-3">
                <div className="grid grid-cols-1 md:grid-cols-[1.2fr_0.7fr_1.3fr_auto] gap-3 items-end">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Foto/PDF da nota</label>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      onChange={(e) => setInvoiceFile(e.target.files?.[0] || null)}
                      className="block w-full text-xs text-gray-300 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-gold file:px-3 file:py-2 file:text-xs file:font-bold file:text-brand-navydark hover:file:bg-brand-goldhover"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Data</label>
                    <input type="date" value={invoiceForm.invoiceDate} onChange={(e) => setInvoiceForm({...invoiceForm, invoiceDate: e.target.value})} className="w-full rounded-lg border border-gray-700 bg-[#171717] px-3 py-2 text-sm text-white outline-none focus:border-brand-gold" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Observação</label>
                    <input value={invoiceForm.observations} onChange={(e) => setInvoiceForm({...invoiceForm, observations: e.target.value.toUpperCase()})} placeholder="Ex.: compra de estoque, valor, conferência..." className="w-full rounded-lg border border-gray-700 bg-[#171717] px-3 py-2 text-sm text-white outline-none focus:border-brand-gold" />
                  </div>
                  <Button type="submit" disabled={invoiceSaving} className="bg-brand-gold font-bold text-brand-navydark hover:bg-brand-goldhover has-[>svg]:px-4 justify-center">
                    <UploadCloud className="size-4" /> Anexar
                  </Button>
                </div>
                <div className="mt-3 max-w-xs">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Número da nota</label>
                  <input value={invoiceForm.invoiceNumber} onChange={(e) => setInvoiceForm({...invoiceForm, invoiceNumber: e.target.value.toUpperCase()})} placeholder="Opcional" className="w-full rounded-lg border border-gray-700 bg-[#171717] px-3 py-2 text-sm text-white outline-none focus:border-brand-gold" />
                </div>
              </form>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold uppercase tracking-wide text-gray-300">Histórico de notas</h4>
                  <span className="text-xs text-gray-500">{supplierInvoices.length} registro(s)</span>
                </div>
                {invoiceLoading ? (
                  <Card className="border-gray-800 bg-[#171717] p-6 text-center text-sm text-gray-400 gap-0 shadow-none">
                    <CardContent className="p-0">Carregando notas...</CardContent>
                  </Card>
                ) : supplierInvoices.length === 0 ? (
                  <Card className="border-gray-800 bg-[#171717] p-6 text-center text-sm text-gray-500 gap-0 shadow-none">
                    <CardContent className="p-0">Nenhuma nota anexada para este fornecedor.</CardContent>
                  </Card>
                ) : (
                  <div className="supplier-invoices-grid grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
                    {supplierInvoices.map((invoice, idx) => (
                      <Card key={invoice.id} className="supplier-invoice-card rounded-xl border-gray-800 bg-brand-navydark/95 p-2 gap-0 shadow-none">
                        <CardContent className="p-0">
                        <div className="supplier-invoice-card-top flex gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setPreviewInvoice(invoice)}
                            className="supplier-invoice-thumb shrink-0 overflow-hidden rounded-lg border border-gray-800 bg-black/25 text-xs font-bold text-gray-300 hover:border-brand-gold hover:text-white hover:bg-black/25 dark:hover:bg-black/25 p-0 h-auto"
                            title="Visualizar nota"
                          >
                            {isImageInvoice(invoice) ? (
                              <img src={invoice.filePath} alt="Nota do fornecedor" className="h-full w-full object-cover opacity-90 transition hover:opacity-100" />
                            ) : isPdfInvoice(invoice) ? (
                              <span>PDF</span>
                            ) : (
                              <span>ARQ.</span>
                            )}
                          </Button>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="truncate text-sm font-bold text-white">{getInvoiceLabel(invoice, idx)}</div>
                                <div className="text-[11px] text-gray-400">{formatInvoiceDate(invoice.invoiceDate || invoice.createdAt)} • {invoice.source === 'OCR' ? 'OCR automático' : 'Manual'}</div>
                              </div>
                              <div className="flex shrink-0 items-center gap-1">
                                <Button type="button" variant="ghost" onClick={() => setPreviewInvoice(invoice)} className="rounded-lg bg-blue-500/10 p-1.5 h-auto w-auto text-blue-300 hover:bg-blue-500/20 dark:hover:bg-blue-500/20" title="Visualizar nota"><Eye className="size-3.5" /></Button>
                                <Button type="button" variant="ghost" onClick={() => downloadInvoiceFile(invoice)} className="rounded-lg bg-sky-500/10 p-1.5 h-auto w-auto text-sky-300 hover:bg-sky-500/20 dark:hover:bg-sky-500/20" title="Baixar arquivo"><Download className="size-3.5" /></Button>
                                <Button type="button" variant="ghost" onClick={() => handleUpdateInvoice(invoice)} className="rounded-lg bg-emerald-500/10 p-1.5 h-auto w-auto text-emerald-300 hover:bg-emerald-500/20 dark:hover:bg-emerald-500/20" title="Salvar observação"><Save className="size-3.5" /></Button>
                                <Button type="button" variant="ghost" onClick={() => handleDeleteInvoice(invoice.id)} className="rounded-lg bg-red-500/10 p-1.5 h-auto w-auto text-red-400 hover:bg-red-500/20 dark:hover:bg-red-500/20" title="Excluir nota"><Trash2 className="size-3.5" /></Button>
                              </div>
                            </div>

                            <div className="mt-1.5 grid grid-cols-[1fr_7.1rem] gap-1.5">
                              <input value={invoice.invoiceNumber || ''} onChange={(e) => setSupplierInvoices(list => list.map(item => item.id === invoice.id ? { ...item, invoiceNumber: e.target.value.toUpperCase() } : item))} placeholder="Nº nota" className="min-w-0 rounded-lg border border-gray-700 bg-[#171717] px-2 py-1.5 text-xs text-white outline-none focus:border-brand-gold" />
                              <input type="date" value={invoice.invoiceDate ? String(invoice.invoiceDate).slice(0, 10) : ''} onChange={(e) => setSupplierInvoices(list => list.map(item => item.id === invoice.id ? { ...item, invoiceDate: e.target.value } : item))} className="min-w-0 rounded-lg border border-gray-700 bg-[#171717] px-2 py-1.5 text-xs text-white outline-none focus:border-brand-gold" />
                            </div>
                            <textarea value={invoice.observations || ''} onChange={(e) => setSupplierInvoices(list => list.map(item => item.id === invoice.id ? { ...item, observations: e.target.value.toUpperCase() } : item))} placeholder="Observação da nota..." className="mt-1.5 min-h-[34px] w-full resize-none rounded-lg border border-gray-700 bg-[#171717] px-2 py-1.5 text-xs text-white outline-none focus:border-brand-gold" />
                          </div>
                        </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}


      {previewInvoice && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm">
          <div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-gray-800 bg-brand-navylight shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-gray-800 px-4 py-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-bold text-white">{getInvoiceLabel(previewInvoice)}</div>
                <div className="text-xs text-gray-400">{formatInvoiceDate(previewInvoice.invoiceDate || previewInvoice.createdAt)}</div>
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" onClick={() => downloadInvoiceFile(previewInvoice)} className="rounded-lg bg-[#171717] border-gray-700 dark:bg-[#171717] dark:border-gray-700 px-3 py-2 h-auto shadow-none text-xs font-bold text-gray-200 hover:border-brand-gold hover:bg-[#171717] hover:text-brand-gold dark:hover:bg-[#171717]">Baixar</Button>
                <Button type="button" variant="ghost" size="icon-sm" onClick={() => setPreviewInvoice(null)} className="rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white dark:hover:bg-gray-800">
                  <X className="size-5" />
                </Button>
              </div>
            </div>
            <div className="supplier-invoice-preview flex-1 overflow-auto bg-brand-navydark p-3">
              {isImageInvoice(previewInvoice) ? (
                <img src={previewInvoice.filePath} alt="Nota do fornecedor" className="mx-auto max-h-[78vh] max-w-full rounded-lg bg-white object-contain" />
              ) : isPdfInvoice(previewInvoice) ? (
                <iframe title="Nota do fornecedor" src={previewInvoice.filePath} className="h-[78vh] w-full rounded-lg border border-gray-800 bg-white" />
              ) : (
                <Card className="flex min-h-[45vh] items-center justify-center rounded-lg border-gray-800 bg-black/20 py-0 gap-0 shadow-none text-sm text-gray-300">
                  <CardContent className="p-0">
                    Visualização indisponível para este tipo de arquivo. Use o botão Baixar.
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
         isOpen={!!confirmArchive}
         title="Arquivar Fornecedor"
         message="Tem certeza que deseja arquivar este fornecedor? Ele não aparecerá nas buscas, mas o histórico será mantido."
         onConfirm={() => handleArchive(confirmArchive!)}
         onClose={() => setConfirmArchive(null)}
      />
      
      <HardDeleteModal
         isOpen={!!confirmDelete}
         title="Exclusão Definitiva"
         onConfirm={() => handleDelete(confirmDelete!)}
         onClose={() => setConfirmDelete(null)}
      />
    </div>
  );
}
