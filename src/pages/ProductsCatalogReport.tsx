import React, { useState, useEffect } from "react";
import { LogOut, ArrowLeft, Download, FileText, Check, Eye } from "lucide-react";
import { useNavigate } from "react-router";
import { useAuthStore } from "../stores/authStore";
import { apiFetch } from "../lib/api";
import { Button } from "../components/ui/button";

const ProductsCatalogReport = () => {
  const navigate = useNavigate();
  const logout = useAuthStore(state => state.logout);
  const [groups, setGroups] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [previewData, setPreviewData] = useState<{total: number, items: any[]}|null>(null);

  const [formData, setFormData] = useState<{
    groupIds: string[],
    subgroupIds: string[],
    onlyActive: boolean,
    onlyWithPhoto: boolean,
    showPrice: boolean,
    priceTable: string,
    showSku: boolean,
    showPhoto: boolean
  }>({
    groupIds: [],
    subgroupIds: [],
    onlyActive: true,
    onlyWithPhoto: false,
    showPrice: false,
    priceTable: "A",
    showSku: true,
    showPhoto: true
  });

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const res = await apiFetch("/api/groups");
      if (res.ok) {
        const data = await res.json();
        setGroups(data.data);
      }
    } catch {}
  };

  const handleGeneratePreview = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPreviewLoading(true);
    setErrorMsg("");
    setPreviewData(null);
    try {
      const res = await apiFetch("/api/reports/products-catalog/preview", {
        method: "POST",
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        const data = await res.json();
        setPreviewData(data);
      } else {
        const err = await res.json().catch(()=>({}));
        setErrorMsg(err.error || "Erro ao gerar prévia");
      }
    } catch (e: any) {
      setErrorMsg(`Erro: ${e.message}`);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    setIsLoading(true);
    setErrorMsg("");
    try {
      const res = await apiFetch("/api/reports/products-catalog/pdf", {
        method: "POST",
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", "catalogo_produtos.pdf");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        const err = await res.json().catch(()=>({}));
        setErrorMsg(err.error || "Erro ao gerar PDF");
      }
    } catch (e: any) {
      setErrorMsg(`Erro: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleGroup = (id: string) => {
    setFormData(prev => {
      const isSelected = prev.groupIds.includes(id);
      const newGroups = isSelected ? prev.groupIds.filter(g => g !== id) : [...prev.groupIds, id];
      // reset subgroups that don't belong to selected groups
      return { ...prev, groupIds: newGroups, subgroupIds: [] };
    });
  };

  const toggleSubgroup = (id: string) => {
    setFormData(prev => {
      const isSelected = prev.subgroupIds.includes(id);
      const newSubgroups = isSelected ? prev.subgroupIds.filter(g => g !== id) : [...prev.subgroupIds, id];
      return { ...prev, subgroupIds: newSubgroups };
    });
  };

  const availableSubgroups = groups
    .filter(g => formData.groupIds.length === 0 || formData.groupIds.includes(g.id))
    .flatMap(g => g.subgroups || []);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon-sm" onClick={() => navigate("/reports")} className="rounded-lg bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white dark:hover:bg-gray-700">
            <ArrowLeft className="size-5" />
          </Button>
          <h2 className="text-2xl font-semibold text-white">Catálogo PDF de Produtos</h2>
        </div>
        <Button variant="ghost" onClick={logout} className="h-auto gap-2 p-0 text-gray-400 hover:bg-transparent hover:text-white dark:hover:bg-transparent">
           <LogOut className="size-[18px]" />
           <span className="text-sm font-medium">Sair</span>
         </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-brand-navylight border border-gray-800 rounded-xl p-6">
          <form onSubmit={handleGeneratePreview} className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
               <div>
                 <label className="block text-sm font-medium text-gray-400 mb-2">Filtrar por Grupos (vazio = todos)</label>
                 <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                    {groups.map(g => (
                      <label key={g.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-800 p-1 rounded">
                        <input 
                          type="checkbox" 
                          checked={formData.groupIds.includes(g.id)} 
                          onChange={() => toggleGroup(g.id)}
                          className="w-4 h-4 rounded border-gray-700 text-brand-gold focus:ring-brand-gold bg-gray-800" 
                        />
                        <span className="text-white text-sm">{g.name}</span>
                      </label>
                    ))}
                    {groups.length === 0 && <p className="text-sm text-gray-500">Nenhum grupo encontrado.</p>}
                 </div>
               </div>
               <div>
                 <label className="block text-sm font-medium text-gray-400 mb-2">Filtrar por Subgrupos (vazio = todos)</label>
                 <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                    {availableSubgroups.map((s:any) => (
                      <label key={s.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-800 p-1 rounded">
                        <input 
                          type="checkbox" 
                          checked={formData.subgroupIds.includes(s.id)} 
                          onChange={() => toggleSubgroup(s.id)}
                          className="w-4 h-4 rounded border-gray-700 text-brand-gold focus:ring-brand-gold bg-gray-800" 
                        />
                        <span className="text-white text-sm">{s.name}</span>
                      </label>
                    ))}
                    {availableSubgroups.length === 0 && <p className="text-sm text-gray-500">Nenhum subgrupo para selecionar.</p>}
                 </div>
               </div>
            </div>

            <div className="flex flex-col gap-4 border-t border-gray-800 pt-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={formData.onlyActive} onChange={e => setFormData({...formData, onlyActive: e.target.checked})} className="w-5 h-5 rounded border-gray-700 text-brand-gold focus:ring-brand-gold focus:ring-offset-gray-900 bg-gray-800" />
                <span className="text-white font-medium text-sm">Apenas produtos ativos (não arquivados)</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={formData.onlyWithPhoto} onChange={e => setFormData({...formData, onlyWithPhoto: e.target.checked})} className="w-5 h-5 rounded border-gray-700 text-brand-gold focus:ring-brand-gold focus:ring-offset-gray-900 bg-gray-800" />
                <span className="text-white font-medium text-sm">Apenas produtos que possuem foto</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={formData.showSku} onChange={e => setFormData({...formData, showSku: e.target.checked})} className="w-5 h-5 rounded border-gray-700 text-brand-gold focus:ring-brand-gold focus:ring-offset-gray-900 bg-gray-800" />
                <span className="text-white font-medium text-sm">Mostrar SKU do produto no catálogo</span>
              </label>
              
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={formData.showPhoto} onChange={e => setFormData({...formData, showPhoto: e.target.checked})} className="w-5 h-5 rounded border-gray-700 text-brand-gold focus:ring-brand-gold focus:ring-offset-gray-900 bg-gray-800" />
                <span className="text-white font-medium text-sm">Mostrar Imagem do produto</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={formData.showPrice} onChange={e => setFormData({...formData, showPrice: e.target.checked})} className="w-5 h-5 rounded border-gray-700 text-brand-gold focus:ring-brand-gold focus:ring-offset-gray-900 bg-gray-800" />
                <span className="text-white font-medium text-sm">Mostrar Preço no catálogo</span>
              </label>
              
              {formData.showPrice && (
                <div className="pl-8">
                  <label className="block text-sm font-medium text-gray-400 mb-1">Qual Preço de Venda exibir?</label>
                  <select value={formData.priceTable} onChange={e => setFormData({...formData, priceTable: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white outline-none focus:border-brand-gold text-sm">
                    <option value="A">Preço A (Varejo)</option>
                    <option value="B">Preço B (Atacado)</option>
                  </select>
                </div>
              )}
            </div>

            <div className="pt-6 border-t border-gray-800 flex flex-col gap-3">
              {errorMsg && <div className="text-red-400 text-sm bg-red-400/10 p-3 rounded">{errorMsg}</div>}
              
              <Button type="submit" variant="ghost" disabled={isPreviewLoading || isLoading} className="w-full gap-2 rounded-lg border border-gray-700 bg-gray-800 px-6 py-3 text-base font-bold text-white hover:bg-gray-700 hover:text-white dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700">
                <Eye className="size-5" />
                {isPreviewLoading ? "Carregando..." : "Gerar Prévia"}
              </Button>
            </div>
          </form>
        </div>

        {/* Preview Panel */}
        <div className="bg-brand-navylight border border-gray-800 rounded-xl p-6 flex flex-col min-h-[400px]">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brand-gold"></span>
            Prévia do Catálogo
          </h3>

          {!previewData && !isPreviewLoading && (
            <div className="flex-1 flex items-center justify-center text-gray-500 border border-dashed border-gray-700 rounded-lg">
              Clique em "Gerar Prévia" para visualizar os dados.
            </div>
          )}

          {isPreviewLoading && (
            <div className="flex-1 flex items-center justify-center text-brand-gold">
               Carregando dados...
            </div>
          )}

          {previewData && (
            <div className="flex flex-col h-full">
               <div className="mb-4 p-3 bg-gray-800/50 rounded-lg flex justify-between items-center text-sm">
                 <span className="text-gray-400">Total de produtos encontrados:</span>
                 <span className="text-brand-gold font-bold text-lg">{previewData.total}</span>
               </div>

               <div className="flex-1 overflow-auto border border-gray-800 rounded-lg">
                 <table className="w-full text-sm text-left">
                   <thead className="text-xs text-gray-400 uppercase bg-gray-900 sticky top-0">
                     <tr>
                       <th className="px-4 py-3 font-medium">SKU</th>
                       <th className="px-4 py-3 font-medium">Grupo / Subgrupo</th>
                       <th className="px-4 py-3 font-medium">Produto</th>
                     </tr>
                   </thead>
                   <tbody>
                     {previewData.items.map(item => (
                       <tr key={item.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                         <td className="px-4 py-3 text-gray-300 font-mono">{item.sku || '-'}</td>
                         <td className="px-4 py-3">
                           <div className="text-white">{item.groupName || '-'}</div>
                           <div className="text-xs text-gray-500">{item.subgroupName || '-'}</div>
                         </td>
                         <td className="px-4 py-3 text-white">{item.name}</td>
                       </tr>
                     ))}
                     {previewData.items.length === 0 && (
                       <tr>
                         <td colSpan={3} className="px-4 py-8 text-center text-gray-500">Nenhum produto encontrado com estes filtros.</td>
                       </tr>
                     )}
                   </tbody>
                 </table>
               </div>
               
               {previewData.total > previewData.items.length && (
                 <p className="text-xs text-gray-500 mt-2 text-center">Mostrando os primeiros 20 produtos de {previewData.total}.</p>
               )}

               <div className="mt-6 pt-6 border-t border-gray-800">
                  <Button
                    onClick={handleDownloadPdf}
                    disabled={isLoading || previewData.total === 0}
                    className="w-full gap-2 rounded-lg bg-brand-gold px-6 py-3 text-base font-bold text-brand-navydark hover:bg-brand-goldhover"
                  >
                    <Download className="size-5" />
                    {isLoading ? "Gerando PDF..." : "Baixar PDF Completo"}
                  </Button>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductsCatalogReport;
