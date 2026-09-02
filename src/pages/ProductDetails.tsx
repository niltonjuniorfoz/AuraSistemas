import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Edit, Image as ImageIcon, Package, FileText, Tag, CheckCircle, Activity, Archive, BarChart2, Loader2 } from "lucide-react";
import { apiFetch } from "../lib/api";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Money } from "../components/Money";

export function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [activeTab, setActiveTab] = useState("resumo");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [costHistory, setCostHistory] = useState<any>(null);
  const [costHistoryLoading, setCostHistoryLoading] = useState(false);

  useEffect(() => {
    fetchProduct();
    setCostHistory(null);
    setActiveTab('resumo');
  }, [id]);

  // Histórico de compras (camadas de custo FIFO) — carrega só quando a aba é
  // aberta, não junto com o resto do produto (a maioria nem chega a olhar).
  useEffect(() => {
    if (activeTab !== 'costHistory' || !id || costHistory) return;
    setCostHistoryLoading(true);
    apiFetch(`/api/products/${id}/cost-history`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setCostHistory)
      .catch(() => setCostHistory({ layers: [], avgCostBrl: null, totalQtyRemaining: 0 }))
      .finally(() => setCostHistoryLoading(false));
  }, [activeTab, id, costHistory]);

  const fetchProduct = async () => {
    try {
      const res = await apiFetch(`/api/products/${id}`);
      if (res.ok) {
        const data = await res.json();
        setProduct(data);
        setSelectedImage(data.imageUrl || data.images?.[0]?.imageUrl || null);
      } else if (res.status === 404) {
        setErrorMsg("Produto não encontrado.");
      } else {
        setErrorMsg("Erro ao carregar produto.");
      }
    } catch(err) {
      console.error(err);
      setErrorMsg("Erro ao carregar produto.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Carregando detalhes...</div>;
  if (errorMsg) return (
    <div className="p-8 flex flex-col items-center justify-center space-y-4">
      <div className="text-red-400 text-lg font-medium">{errorMsg}</div>
      <Button variant="outline" className="border-gray-700 bg-brand-navylight text-gray-300 hover:bg-gray-800 hover:text-gray-300" onClick={() => navigate("/products")}>
        Voltar para Produtos
      </Button>
    </div>
  );
  if (!product) return null;

  const qty = (typeof product.physicalStock === 'string' ? parseFloat(product.physicalStock) : (product.physicalStock || 0)) - (typeof product.reservedStock === 'string' ? parseFloat(product.reservedStock) : (product.reservedStock || 0));

  return (
    <div className="max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/products")} title="Voltar" className="bg-brand-navylight text-gray-400 hover:bg-brand-navylight hover:text-white">
            <ArrowLeft className="size-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-semibold text-white">{product.name}</h2>
            <div className="flex gap-2 items-center text-sm font-mono text-brand-gold mt-1">
              <span>SKU: {product.sku}</span>
              {product.upc && <span>• UPC: {product.upc}</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6 items-start">
        {/* Left Column (Images) */}
        <div className="space-y-4">
          <Card className="aspect-square overflow-hidden py-0">
            <CardContent className="flex h-full items-center justify-center p-4">
             {selectedImage ? (
                <img src={selectedImage} alt={product.name} className="max-w-full max-h-full object-contain rounded" />
             ) : (
                <div className="text-gray-500 flex flex-col items-center gap-2">
                   <ImageIcon className="w-12 h-12 opacity-50" />
                   <span className="text-sm font-medium">Sem Foto</span>
                </div>
             )}
            </CardContent>
          </Card>
          {(() => {
             const gallery = [...(product.imageUrl ? [product.imageUrl] : []), ...(product.images?.map((i: any) => i.imageUrl) || [])];
             const uniqueGallery = Array.from(new Set(gallery));
             if (uniqueGallery.length > 0) {
               return (
                  <div className="flex gap-2 overflow-x-auto mt-4 pb-2 custom-scrollbar">
                     {uniqueGallery.map((url: string, idx: number) => (
                        <Button key={idx} type="button" variant="ghost" className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 p-0 hover:bg-transparent ${selectedImage === url ? 'border-primary hover:text-primary' : 'border-transparent text-gray-400 hover:border-gray-600 hover:text-gray-400'}`} onClick={() => setSelectedImage(url)}>
                           <img src={url} className="h-full w-full object-cover bg-gray-800" />
                        </Button>
                     ))}
                  </div>
               );
             }
             return null;
          })()}
        </div>

        {/* Right Column (Tabs & Info) */}
        <Card className="overflow-hidden py-0">
          <CardContent className="p-0">
           <div className="flex overflow-x-auto border-b border-gray-800 custom-scrollbar">
              <Button variant="ghost" className={`h-auto rounded-none border-b-2 px-6 py-3 font-medium hover:bg-transparent ${activeTab === 'resumo' ? 'border-primary text-primary hover:text-primary' : 'border-transparent text-gray-400 hover:text-white'}`} onClick={() => setActiveTab('resumo')}>Resumo</Button>
              <Button variant="ghost" className={`h-auto rounded-none border-b-2 px-6 py-3 font-medium hover:bg-transparent ${activeTab === 'specs' ? 'border-primary text-primary hover:text-primary' : 'border-transparent text-gray-400 hover:text-white'}`} onClick={() => setActiveTab('specs')}>Especificações</Button>
              <Button variant="ghost" className={`h-auto rounded-none border-b-2 px-6 py-3 font-medium hover:bg-transparent ${activeTab === 'stock' ? 'border-primary text-primary hover:text-primary' : 'border-transparent text-gray-400 hover:text-white'}`} onClick={() => setActiveTab('stock')}>Estoque</Button>
              <Button variant="ghost" className={`h-auto rounded-none border-b-2 px-6 py-3 font-medium hover:bg-transparent ${activeTab === 'costHistory' ? 'border-primary text-primary hover:text-primary' : 'border-transparent text-gray-400 hover:text-white'}`} onClick={() => setActiveTab('costHistory')}>Histórico de Compra</Button>
           </div>

           <div className="p-6">
              {activeTab === 'resumo' && (
                 <div className="space-y-6">
                    <div>
                       <h3 className="text-lg font-semibold text-white mb-2">Descrição</h3>
                       <p className="text-gray-300 whitespace-pre-line leading-relaxed text-sm">
                          {product.description || <span className="text-gray-500 italic">Nenhuma descrição informada.</span>}
                       </p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-800/50">
                       <div className="space-y-1">
                          <span className="text-xs text-gray-500 block uppercase">Grupo</span>
                          <span className="text-sm font-medium text-white">{product.groupName || '-'}</span>
                       </div>
                       <div className="space-y-1">
                          <span className="text-xs text-gray-500 block uppercase">Prateleira</span>
                          <span className="text-sm font-medium text-white">{product.shelfName || '-'}</span>
                       </div>
                    </div>
                 </div>
              )}

              {activeTab === 'specs' && (
                 <div className="space-y-4">
                    {product.technicalSpecs && product.technicalSpecs.length > 0 ? (
                       <table className="w-full text-left text-sm border-collapse">
                          <thead className="bg-[#171717] text-gray-400">
                             <tr>
                                <th className="px-4 py-2 font-medium w-1/3 border border-gray-800">Característica</th>
                                <th className="px-4 py-2 font-medium border border-gray-800">Detalhes</th>
                             </tr>
                          </thead>
                          <tbody className="bg-[#171717]">
                             {product.technicalSpecs.map((spec: any, idx: number) => (
                                <tr key={idx} className="border-b border-gray-800 last:border-0 hover:bg-gray-800/30">
                                   <td className="px-4 py-3 font-semibold text-gray-300 border border-gray-800">{spec.label}</td>
                                   <td className="px-4 py-3 text-white border border-gray-800">{spec.value}</td>
                                </tr>
                             ))}
                          </tbody>
                       </table>
                    ) : (
                       <div className="text-center py-8 text-gray-500 italic">Nenhuma especificação técnica documentada para este produto.</div>
                    )}
                 </div>
              )}

              {activeTab === 'stock' && (
                 <div className="space-y-6">
                    <div className="grid grid-cols-3 gap-4">
                       <Card className="py-0">
                         <CardContent className="space-y-1 p-4 text-center">
                          <span className="text-xs text-gray-500 block uppercase font-medium">Estoque Físico</span>
                          <span className="text-2xl font-mono font-bold text-white">{product.physicalStock || 0}</span>
                         </CardContent>
                       </Card>
                       <Card className="py-0">
                         <CardContent className="space-y-1 p-4 text-center">
                          <span className="text-xs text-gray-500 block uppercase font-medium">Reservado</span>
                          <span className="text-2xl font-mono font-bold text-red-400">{product.reservedStock || 0}</span>
                         </CardContent>
                       </Card>
                       <Card className="py-0">
                         <CardContent className="space-y-1 p-4 text-center">
                          <span className="text-xs text-gray-500 block uppercase font-medium">Disponível</span>
                          <span className={`text-2xl font-mono font-bold ${qty <= 0 ? 'text-red-400' : qty <= 5 ? 'text-amber-300' : 'text-green-400'}`}>{qty}</span>
                         </CardContent>
                       </Card>
                    </div>

                    {product.hasSerialNumber && (
                       <Card className="border-purple-500/20 bg-purple-500/10 py-0">
                         <CardContent className="p-4">
                          <div className="mb-2 flex items-center gap-2 text-purple-400">
                             <CheckCircle className="w-5 h-5" />
                             <span className="text-sm font-semibold">Controle de Número de Série Ativado</span>
                          </div>
                          <p className="text-xs text-purple-300/70">Este item requer a verificação individual de S/N durante as entradas e saídas de estoque.</p>
                         </CardContent>
                       </Card>
                    )}
                 </div>
              )}

              {activeTab === 'costHistory' && (() => {
                 const curSym = (v: any, code: string) => {
                    const n = Number(v) || 0;
                    if (code === 'USD') return `US$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                    if (code === 'PYG') return `₲ ${n.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`;
                    return `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                 };
                 return (
                    <div className="space-y-4">
                       {costHistoryLoading ? (
                          <div className="flex items-center justify-center py-10 text-gray-400"><Loader2 className="size-5 animate-spin mr-2" /> Carregando histórico...</div>
                       ) : !costHistory?.layers?.length ? (
                          <div className="rounded-xl border border-gray-800 bg-brand-navy/40 p-6 text-center text-sm text-gray-500">
                             Nenhuma compra registrada ainda para este produto.<br />
                             <span className="text-[11px]">O histórico é gravado automaticamente a cada compra aprovada.</span>
                          </div>
                       ) : (
                          <>
                             <div className="grid grid-cols-2 gap-4">
                                <Card className="py-0">
                                   <CardContent className="space-y-1 p-4 text-center">
                                      <span className="text-xs text-gray-500 block uppercase font-medium">Custo médio do estoque atual</span>
                                      <span className="text-2xl font-mono font-bold text-brand-gold">
                                         {costHistory.avgCostBrl != null ? <Money value={costHistory.avgCostBrl} lang="pt-BR" /> : "—"}
                                      </span>
                                   </CardContent>
                                </Card>
                                <Card className="py-0">
                                   <CardContent className="space-y-1 p-4 text-center">
                                      <span className="text-xs text-gray-500 block uppercase font-medium">Qtd. com custo rastreado</span>
                                      <span className="text-2xl font-mono font-bold text-white">{costHistory.totalQtyRemaining}</span>
                                   </CardContent>
                                </Card>
                             </div>

                             <div className="overflow-x-auto rounded-xl border border-gray-800">
                                <table className="w-full text-left text-sm border-collapse">
                                   <thead className="bg-[#171717] text-gray-400">
                                      <tr>
                                         <th className="px-4 py-2 font-medium border border-gray-800">Data</th>
                                         <th className="px-4 py-2 font-medium border border-gray-800">Origem</th>
                                         <th className="px-4 py-2 font-medium border border-gray-800 text-right">Qtd (rest./total)</th>
                                         <th className="px-4 py-2 font-medium border border-gray-800 text-right">Custo original</th>
                                         <th className="px-4 py-2 font-medium border border-gray-800 text-right">Câmbio</th>
                                         <th className="px-4 py-2 font-medium border border-gray-800 text-right">Custo (landed)</th>
                                      </tr>
                                   </thead>
                                   <tbody className="bg-[#171717]">
                                      {costHistory.layers.map((l: any) => (
                                         <tr key={l.id} className="border-b border-gray-800 last:border-0 hover:bg-gray-800/30">
                                            <td className="px-4 py-3 text-gray-300 border border-gray-800">{new Date(l.invoiceDate || l.createdAt).toLocaleDateString('pt-BR')}</td>
                                            <td className="px-4 py-3 text-gray-300 border border-gray-800">
                                               {l.supplierName || l.note || '—'}
                                               {l.invoiceNumber && <span className="block text-[11px] text-gray-500">NF {l.invoiceNumber}</span>}
                                            </td>
                                            <td className="px-4 py-3 text-right tabular-nums text-gray-300 border border-gray-800">{l.qtyRemaining} / {l.qtyOriginal}</td>
                                            <td className="px-4 py-3 text-right tabular-nums text-gray-300 border border-gray-800">
                                               {l.originalUnitCost != null ? curSym(l.originalUnitCost, l.sourceCurrency) : '—'}
                                            </td>
                                            <td className="px-4 py-3 text-right tabular-nums text-gray-500 border border-gray-800">
                                               {l.fxRate ? Number(l.fxRate).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : '—'}
                                            </td>
                                            <td className="px-4 py-3 text-right tabular-nums font-medium text-brand-gold border border-gray-800"><Money value={l.unitCostBrl} lang="pt-BR" /></td>
                                         </tr>
                                      ))}
                                   </tbody>
                                </table>
                             </div>
                          </>
                       )}
                    </div>
                 );
              })()}
           </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
