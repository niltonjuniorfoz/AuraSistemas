import React, { useState, useEffect, useMemo } from 'react';
import { PackagePlus, Plus, Search, Eye, FileUp, X, Check, Edit, Trash2, Cpu } from 'lucide-react';
import { apiFetch, extractList } from '../lib/api';
import { useNavigate } from 'react-router';
import { useAdminTranslation, formatCurrency, formatDate } from '../lib/i18n';
import { Money } from '../components/Money';
import { useAuthStore } from '../stores/authStore';
import { DataTable } from '../components/DataTable';
import type { ColumnDef } from '@tanstack/react-table';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';

const CUR_SYMBOL: Record<string, string> = { BRL: 'R$', USD: 'US$', PYG: '₲' };
const fmtNative = (v: any, cur: string) => `${CUR_SYMBOL[cur] || cur} ${(Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: cur === 'PYG' ? 0 : 2, maximumFractionDigits: cur === 'PYG' ? 0 : 2 })}`;

function purchaseBadgeVariant(status: string): "success" | "warning" | "destructive" {
  switch (status) {
    case "APPROVED": return "success";
    case "CANCELED": return "destructive";
    default: return "warning"; // DRAFT
  }
}

export function Purchases() {
  const navigate = useNavigate();
  const { t, language } = useAdminTranslation();
  const user = useAuthStore(s => s.user);
  const canOcr = (user?.roleKey === 'admin' || user?.roleKey === 'master');
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedPurchase, setSelectedPurchase] = useState<any>(null);
  const [purchaseDetails, setPurchaseDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    loadPurchases();
  }, []);

  const loadPurchases = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await apiFetch('/api/purchases');
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 403) {
           setError("Erro 403: você não tem permissão para acessar Compras.");
        } else {
           setError(`Erro ${res.status}: ${data.error || "Erro ao carregar compras"}`);
        }
        setPurchases([]);
        return;
      }
      
      setPurchases(extractList(data));
    } catch (e: any) {
      setError(e.message || "Erro de rede ao carregar compras");
    } finally {
      setLoading(false);
    }
  };

  const openView = async (purchase: any) => {
      setSelectedPurchase(purchase);
      setPurchaseDetails(null);
      setLoadingDetails(true);
      try {
          const res = await apiFetch(`/api/purchases/${purchase.id}`);
          const data = await res.json();
          setPurchaseDetails(data);
      } catch(e) {
          setError("Erro ao carregar detalhes");
      } finally {
          setLoadingDetails(false);
      }
  };

  const approveDraft = async (id: string) => {
      if (!confirm('Tem certeza que deseja aprovar e dar entrada no estoque?')) return;
      try {
          const res = await apiFetch(`/api/purchases/${id}/approve`, { method: 'POST' });
          if (!res.ok) throw new Error("Erro");
          alert('Compra Aprovada!');
          setSelectedPurchase(null);
          loadPurchases();
      } catch(e) {
          alert("Erro ao aprovar");
      }
  };

  const cancelDraft = async (id: string) => {
      if (!confirm('Tem certeza que deseja cancelar esta entrada?')) return;
      try {
          const res = await apiFetch(`/api/purchases/${id}/cancel`, { method: 'POST' });
          if (!res.ok) throw new Error("Erro");
          alert('Compra Cancelada!');
          setSelectedPurchase(null);
          loadPurchases();
      } catch(e) {
          alert("Erro ao cancelar");
      }
  };

  // Total comprado por moeda (só APPROVED) — cada moeda no valor nativo dela.
  const byCurrency = useMemo(() => {
    const acc: Record<string, { total: number; count: number }> = {};
    for (const p of purchases) {
      if (p.status !== 'APPROVED') continue;
      const cur = String(p.currency || 'BRL');
      if (!acc[cur]) acc[cur] = { total: 0, count: 0 };
      acc[cur].total += Number(p.totalAmount) || 0;
      acc[cur].count += 1;
    }
    return Object.entries(acc).sort((a, b) => b[1].count - a[1].count);
  }, [purchases]);

  const purchaseColumns = useMemo<ColumnDef<any>[]>(() => [
    {
      id: 'nota', header: 'Data / Nota', accessorFn: (row) => `${row.invoiceNumber || 'S/N'} ${formatDate(row.invoiceDate || row.createdAt, language)}`,
      cell: ({ row }) => (
        <div>
          <div className="font-medium text-white">{row.original.invoiceNumber || 'S/N'}</div>
          <div className="text-gray-500 text-xs">{formatDate(row.original.invoiceDate || row.original.createdAt, language)}</div>
        </div>
      ),
    },
    { id: 'fornecedor', header: 'Fornecedor', accessorFn: (row) => row.supplier?.name || '-' },
    {
      id: 'total', header: 'Valor Total', accessorFn: (row) => Number(row.totalAmount) || 0,
      sortingFn: (a, b) => (Number(a.original.totalAmount) || 0) - (Number(b.original.totalAmount) || 0),
      cell: ({ row }) => (
        <span className="font-medium flex items-center gap-1.5">
          {fmtNative(row.original.totalAmount, String(row.original.currency || 'BRL'))}
          {row.original.currency && row.original.currency !== 'BRL' && (
            <Badge variant="outline" className={row.original.currency === 'USD' ? "border-emerald-500/40 text-emerald-300" : "border-red-400/40 text-red-300"}>{row.original.currency}</Badge>
          )}
        </span>
      ),
    },
    {
      id: 'status', header: 'Status', accessorFn: (row) => row.status,
      cell: ({ row }) => (
        <Badge variant={purchaseBadgeVariant(row.original.status)}>{t(`status.${row.original.status}`)}</Badge>
      ),
    },
    {
      id: 'acoes', header: () => <span className="block text-right">Ações</span>, enableSorting: false,
      cell: ({ row }) => (
        <div className="text-right">
          <Button variant="ghost" size="icon-sm" title="Ver" onClick={(e) => { e.stopPropagation(); openView(row.original); }} className="rounded-lg bg-gray-800 text-white hover:bg-gray-700 hover:text-brand-gold dark:hover:bg-gray-700">
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ], [language, t]);

  return (
    <div className="purchases-page">
       <div className="purchases-header flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <PackagePlus className="w-8 h-8 text-brand-gold" />
            Compras e Entrada
          </h1>
          <p className="text-gray-400">Registre nota fiscal, compras e importe produtos para o estoque</p>
        </div>
        <div className="purchases-actions md:hidden flex gap-3">
             {canOcr && (
               <Button variant="outline" onClick={() => navigate('/purchases/ocr')} className="rounded-lg border-primary/40 bg-brand-navylight font-medium text-primary shadow-none has-[>svg]:px-4 hover:border-primary hover:bg-brand-navydark/50 hover:text-primary dark:border-primary/40 dark:bg-brand-navylight dark:hover:bg-brand-navydark/50">
                 <Cpu className="size-5 animate-pulse text-primary" />
                 Importar por Foto / OCR
               </Button>
             )}
            <Button variant="ghost" onClick={() => navigate('/purchases/import')} className="rounded-lg border border-gray-700 bg-gray-800 font-medium text-white has-[>svg]:px-4 hover:bg-gray-700 hover:text-white dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700">
              <FileUp className="size-5" />
              Importar Planilha
            </Button>
            <Button onClick={() => navigate('/purchases/new')} className="rounded-lg font-medium bg-brand-gold text-brand-navydark has-[>svg]:px-4 hover:bg-brand-goldhover dark:bg-brand-gold dark:hover:bg-brand-goldhover">
              <Plus className="size-5" />
              Nova Entrada
            </Button>
        </div>
      </div>

      {byCurrency.length > 0 && (
        <Card className="rounded-2xl border-gray-800 bg-[#171717] py-0">
          <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {byCurrency.map(([cur, v]) => (
              <Card key={cur} className="border-gray-700 shadow-md py-0">
                <CardContent className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-gray-400">Comprado em {cur}</span>
                  <Badge variant="outline" className={cur === 'USD' ? "border-emerald-500/40 text-emerald-300" : cur === 'PYG' ? "border-red-400/40 text-red-300" : "border-gray-700 text-gray-400"}>{cur}</Badge>
                </div>
                <div className="text-xl font-black text-white font-mono">{fmtNative(v.total, cur)}</div>
                <div className="text-[10px] text-gray-500">{v.count} entrada(s) aprovada(s)</div>
                </CardContent>
              </Card>
            ))}
          </div>
          </CardContent>
        </Card>
      )}

      <Card className="purchases-table-card border-gray-800 shadow-md py-0">
        {loading ? (
            <div className="p-12 text-center text-gray-400">
               <div className="w-8 h-8 border-4 border-brand-gold border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
               <p>Carregando compras...</p>
            </div>
        ) : error ? (
           <Card className="m-4 border-red-500/20 bg-red-500/10 py-0 text-center text-red-400">
              <CardContent className="p-8">
              <p className="font-medium">{error}</p>
              </CardContent>
           </Card>
        ) : (
        <>
        <div className="mobile-card-list purchases-mobile-list">
          {purchases.map(row => (
            <div key={row.id} className="mobile-data-card">
              <div className="mobile-card-main">
                <div>
                  <div className="mobile-card-title">Nota {row.invoiceNumber || 'S/N'}</div>
                  <div className="mobile-card-muted">{formatDate(row.invoiceDate || row.createdAt, language)}</div>
                </div>
                <Button variant="ghost" size="icon-sm" onClick={() => openView(row)} className="mobile-icon-button text-brand-gold hover:bg-[rgba(2,12,27,0.55)] hover:text-brand-gold dark:hover:bg-[rgba(2,12,27,0.55)]" aria-label="Ver entrada">
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
              <div className="mobile-card-grid purchases-mobile-grid">
                <div>
                  <span>Fornecedor</span>
                  <strong>{row.supplier?.name || '-'}</strong>
                </div>
                <div>
                  <span>Valor</span>
                  <strong><Money value={row.totalAmount} lang={language} /></strong>
                </div>
                <div>
                  <span>Status</span>
                  <strong>
                    <Badge variant={purchaseBadgeVariant(row.status)} className={`mobile-status-pill ${row.status === 'APPROVED' ? 'ok' : row.status === 'CANCELED' ? 'danger' : 'draft'}`}>{t(`status.${row.status}`)}</Badge>
                  </strong>
                </div>
              </div>
            </div>
          ))}
          {purchases.length === 0 && !loading && (
            <div className="mobile-empty-card">Nenhuma entrada encontrada.</div>
          )}
        </div>
        <div className="desktop-data-table p-4">
          <DataTable columns={purchaseColumns} data={purchases} pageSize={10}
            searchPlaceholder="Buscar por nota ou fornecedor..." onRowClick={(row: any) => openView(row)}
            headerEnd={
              <div className="flex flex-wrap gap-2">
                {canOcr && (
                  <Button variant="outline" size="default" onClick={() => navigate('/purchases/ocr')} className="gap-1.5 rounded-md border-primary/40 bg-brand-navylight text-xs font-bold text-primary shadow-none hover:border-primary hover:bg-brand-navylight hover:text-primary dark:border-primary/40 dark:bg-brand-navylight dark:hover:bg-brand-navylight">
                    <Cpu className="size-3.5 animate-pulse" />
                    Importar por Foto / OCR
                  </Button>
                )}
                <Button variant="ghost" size="default" onClick={() => navigate('/purchases/import')} className="gap-1.5 rounded-md border border-gray-700 bg-gray-800 text-xs font-bold text-white hover:bg-gray-700 hover:text-white dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700">
                  <FileUp className="size-3.5" />
                  Importar Planilha
                </Button>
                <Button size="default" onClick={() => navigate('/purchases/new')} className="gap-1.5 rounded-md border border-transparent bg-brand-gold text-xs font-bold text-brand-navydark hover:bg-brand-goldhover dark:border-transparent dark:bg-brand-gold dark:hover:bg-brand-goldhover">
                  <Plus className="size-3.5" />
                  Nova Entrada
                </Button>
              </div>
            } />
        </div>
        </>
        )}
      </Card>

      {selectedPurchase && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-brand-navylight border border-gray-800 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col shadow-brand-gold/5">
               <div className="flex justify-between items-center p-6 border-b border-gray-800">
                  <h2 className="text-xl font-bold text-white flex items-center gap-3">
                     <PackagePlus className="w-6 h-6 text-brand-gold" />
                     Detalhes da Entrada <span className="text-gray-500">#{selectedPurchase.id.split('-')[0]}</span>
                  </h2>
                  <Button variant="ghost" size="icon" onClick={() => setSelectedPurchase(null)} className="text-gray-400 hover:bg-transparent hover:text-red-400 dark:hover:bg-transparent">
                     <X className="size-5" />
                  </Button>
               </div>
               
               <div className="p-6 overflow-y-auto flex-1">
                  {loadingDetails ? (
                     <div className="text-center py-20 text-gray-400 flex flex-col items-center">
                        <div className="w-10 h-10 border-4 border-brand-gold border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <span>Carregando detalhes...</span>
                     </div>
                  ) : purchaseDetails ? (
                     <div className="space-y-8">
                        <Card className="border-gray-800 py-0">
                          <CardContent className="grid grid-cols-2 gap-4 p-6 md:grid-cols-4">
                           <div>
                              <p className="text-xs text-brand-gold uppercase font-bold tracking-wider mb-1">Fornecedor</p>
                              <p className="font-medium text-white">{purchaseDetails.supplier?.name || "Desconhecido"}</p>
                           </div>
                           <div>
                              <p className="text-xs text-brand-gold uppercase font-bold tracking-wider mb-1">Nota Fiscal</p>
                              <p className="font-medium text-white">{purchaseDetails.purchase?.invoiceNumber || "N/A"}</p>
                           </div>
                           <div>
                              <p className="text-xs text-brand-gold uppercase font-bold tracking-wider mb-1">Total</p>
                              <p className="font-medium text-emerald-400 text-lg"><Money value={purchaseDetails.purchase?.totalAmount} lang={language} /></p>
                           </div>
                           <div>
                              <p className="text-xs text-brand-gold uppercase font-bold tracking-wider mb-1">Status</p>
                              <Badge variant={purchaseBadgeVariant(purchaseDetails.purchase?.status)}>{t(`status.${purchaseDetails.purchase?.status}`)}</Badge>
                           </div>
                          </CardContent>
                        </Card>

                        <div>
                           <h3 className="text-lg font-bold text-white mb-4 border-b border-gray-800 pb-2">Itens da Entrada ({purchaseDetails.items?.length || 0})</h3>
                           <div className="overflow-hidden rounded-xl border border-gray-800">
                           <table className="w-full text-left text-sm text-gray-300">
                              <thead className="bg-brand-navylight text-gray-400 font-medium">
                                 <tr>
                                    <th className="px-4 py-3">Produto / SKU</th>
                                    <th className="px-4 py-3 w-20 text-center">Qtd</th>
                                    <th className="px-4 py-3 text-right">Custo</th>
                                    <th className="px-4 py-3 text-right">Seriais</th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-800 bg-brand-navydark/30">
                                 {purchaseDetails.items?.map((item: any) => (
                                    <tr key={item.id} className="hover:bg-gray-800/50 transition">
                                       <td className="px-4 py-3">
                                          <p className="font-bold text-white">{item.productName || 'Novo'}</p>
                                          <p className="text-xs text-brand-gold mt-1">SKU: {item.sku}</p>
                                       </td>
                                       <td className="px-4 py-3 text-center">{item.quantity}</td>
                                       <td className="px-4 py-3 text-emerald-400 font-medium text-right"><Money value={item.costPrice} lang={language} /></td>
                                       <td className="px-4 py-3 text-right">
                                          {item.hasSerialNumber ? (
                                              <span className="inline-block text-xs bg-brand-navylight px-2 py-1 rounded text-brand-gold border border-brand-gold/30 cursor-help" title={item.serials?.map((s: any) => s.serialNumber).join(', ')}>
                                                 Ver {item.serials?.length} S/N
                                              </span>
                                          ) : <span className="text-gray-600">—</span>}
                                       </td>
                                    </tr>
                                 ))}
                              </tbody>
                           </table>
                           </div>
                        </div>
                     </div>
                  ) : (
                     <div className="text-center py-12 text-red-400">Erro ao carregar os dados desta entrada.</div>
                  )}
               </div>

               <div className="p-6 border-t border-gray-800 flex justify-between gap-3 bg-brand-navylight">
                  <Button variant="ghost" className="rounded-lg bg-gray-800 px-6 py-2 font-medium text-gray-400 hover:bg-gray-700 hover:text-white dark:bg-gray-800 dark:hover:bg-gray-700" onClick={() => setSelectedPurchase(null)}>Fechar</Button>
                  {selectedPurchase.status === 'DRAFT' && (
                     <div className="flex gap-2">
                         <Button variant="outline" className="rounded-lg border-red-500/50 bg-transparent px-4 py-2 has-[>svg]:px-4 font-medium text-red-400 shadow-none hover:bg-red-500/10 hover:text-red-300 dark:border-red-500/50 dark:bg-transparent dark:hover:bg-red-500/10" onClick={() => cancelDraft(selectedPurchase.id)}>
                            <Trash2 className="h-4 w-4" /> Cancelar Entrada
                         </Button>
                         <Button variant="outline" className="rounded-lg border-primary/30 bg-gray-800 px-4 py-2 has-[>svg]:px-4 font-medium text-primary shadow-none hover:bg-primary/10 hover:text-primary dark:border-primary/30 dark:bg-gray-800 dark:hover:bg-primary/10" onClick={() => navigate(`/purchases/${selectedPurchase.id}`)}>
                            <Edit className="h-4 w-4" /> Editar
                         </Button>
                         <Button className="rounded-lg px-6 py-2 has-[>svg]:px-6 font-bold shadow-[0_0_15px_rgba(212,175,55,0.4)] hover:shadow-[0_0_20px_rgba(212,175,55,0.6)]" onClick={() => approveDraft(selectedPurchase.id)}>
                            <Check className="size-5" /> Aprovar e Finalizar
                         </Button>
                     </div>
                  )}
               </div>
            </div>
         </div>
      )}
    </div>
  );
}
