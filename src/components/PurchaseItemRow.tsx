import React, { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api';
import { X, Search, Camera } from 'lucide-react';

import { QuickGroupModal } from './QuickGroupModal';
import { QuickSubgroupModal } from './QuickSubgroupModal';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { formatCurrency, moneyFieldLabel } from '../lib/i18n';
import { Money } from './Money';

function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export function PurchaseItemRow({ 
    item, 
    idx, 
    updateItem, 
    removeItem, 
    fieldErrors, 
    setFieldErrors, 
    groups, 
    subgroups, 
    shelves,
    selectProduct,
    onReloadGroups
}: any) {
    const [searchTerm, setSearchTerm] = useState("");
    const debouncedSearch = useDebounce(searchTerm, 300);
    const [results, setResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);

    const [showGroupModal, setShowGroupModal] = useState(false);
    const [showSubgroupModal, setShowSubgroupModal] = useState(false);

    const handleGenerateSku = async () => {
        if (!item.groupId) {
            alert("Selecione um grupo antes de gerar o SKU.");
            return;
        }
        try {
            const url = `/api/products/next-sku?groupId=${item.groupId}${item.subgroupId ? '&subgroupId=' + item.subgroupId : ''}`;
            const res = await apiFetch(url);
            if (res.ok) {
                const data = await res.json();
                updateItem(idx, 'sku', data.sku);
            } else {
                alert("Falha ao gerar SKU.");
            }
        } catch (err) {
            console.error(err);
        }
    };
    
    useEffect(() => {
        if (!debouncedSearch) {
            setResults([]);
            return;
        }
        setIsSearching(true);
        apiFetch(`/api/products/search?q=${encodeURIComponent(debouncedSearch)}&limit=10`)
           .then(r => r.json())
           .then(d => {
               setResults(Array.isArray(d.data) ? d.data : []);
               setShowResults(true);
           })
           .catch(() => setResults([]))
           .finally(() => setIsSearching(false));
    }, [debouncedSearch]);

    const handleSerialKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && e.currentTarget.value) {
           e.preventDefault();
           const val = e.currentTarget.value.trim().toUpperCase();
           const currentSerials = item.serials || [];
           if (currentSerials.length >= item.quantity) {
              alert('Quantidade máxima de seriais atingida.');
              e.currentTarget.value = '';
              return;
           }
           if (currentSerials.includes(val)) {
              alert('Serial já adicionado.');
              e.currentTarget.value = '';
              return;
           }
           updateItem(idx, 'serials', [...currentSerials, val]);
           e.currentTarget.value = '';
        }
    };

    const hasGlobalErr = fieldErrors && fieldErrors[`items.${idx}`];

    return (
        <div className={`border ${hasGlobalErr ? 'border-red-500' : 'border-gray-800'} rounded-lg p-4 bg-[#171717] relative`}>
             <button onClick={() => removeItem(idx)} className="absolute top-4 right-4 text-gray-500 hover:text-red-400 z-10">
                <X className="w-5 h-5" />
             </button>
             
             <div className="mb-4 pr-8">
                 {!item.productId && item._isNew === false ? (
                     <div className="relative">
                         <div className="flex flex-col sm:flex-row sm:items-end gap-2">
                             <div className="flex-1 w-full relative">
                                 <label className="block text-xs font-medium text-gray-400 mb-1">Buscar Produto</label>
                                 <div className="relative">
                                   <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                                   <input 
                                      type="text" 
                                      placeholder="Digite SKU, UPC ou Nome..."
                                      value={searchTerm}
                                      onChange={e => { setSearchTerm(e.target.value); setShowResults(true); }}
                                      onFocus={() => setShowResults(true)}
                                      className="w-full bg-brand-navylight border border-gray-700 rounded-lg pl-9 pr-12 py-2 text-sm text-white outline-none focus:border-brand-gold" 
                                   />
                                   <button
                                      type="button"
                                      onClick={() => setShowBarcodeScanner(true)}
                                      className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md border border-gray-700 bg-[#171717] text-brand-gold md:hidden"
                                      title="Ler código pela câmera"
                                   >
                                      <Camera className="h-4 w-4" />
                                   </button>
                                 </div>
                             </div>
                             <button type="button" onClick={() => { selectProduct(idx, null); setShowResults(false); setSearchTerm(''); }} className="w-full sm:w-auto px-4 py-2 bg-brand-gold/10 hover:bg-brand-gold/20 text-brand-gold border border-brand-gold/30 font-medium rounded-lg whitespace-nowrap transition-colors mt-2 sm:mt-0">
                                 + Criar Novo Produto
                             </button>
                         </div>
                         {showResults && (searchTerm.length > 0 || results.length > 0) && (
                             <div className="absolute z-50 w-full mt-1 bg-brand-navylight border border-gray-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                                 {isSearching && <div className="p-2 text-sm text-gray-500 text-center">Buscando...</div>}
                                 {!isSearching && results.length === 0 && <div className="p-2 text-sm text-gray-500 text-center">Nenhum produto encontrado.</div>}
                                 {!isSearching && results.map((p: any) => (
                                     <div key={p.id} onClick={() => { selectProduct(idx, p); setShowResults(false); setSearchTerm(''); }} className="p-2 border-b border-gray-800 hover:bg-gray-800 cursor-pointer flex justify-between">
                                         <div>
                                            <div className="text-sm text-white font-medium">{p.sku} - {p.name}</div>
                                            <div className="text-xs text-gray-500">Estoque: {p.physicalStock || 0} | Custo: <Money value={p.costPrice} lang="pt-BR" /> | A: <Money value={p.salePriceA} lang="pt-BR" /></div>
                                         </div>
                                     </div>
                                 ))}
                                 <div onClick={() => { selectProduct(idx, null); setShowResults(false); setSearchTerm(''); }} className="p-2 border-t border-gray-700 bg-[#171717] hover:bg-gray-800 cursor-pointer text-center text-sm text-brand-gold font-medium">
                                     + Criar Novo Produto
                                 </div>
                             </div>
                         )}
                     </div>
                 ) : (
                     <div className="flex justify-between items-center bg-gray-800/50 p-3 rounded-lg">
                        <div>
                           <div className="text-sm font-bold text-white">
                                {item._isNew ? <span className="text-brand-gold mr-2">[NOVO]</span> : null}
                                {item.sku || 'SKU'} - {item.productName || 'Novo Produto'}
                           </div>
                           {!item._isNew && (
                               <div className="text-xs text-gray-400 mt-1">Estoque atual: {item._stock || 0}</div>
                           )}
                        </div>
                        <button onClick={() => selectProduct(idx, undefined)} className="text-xs text-gray-400 hover:text-white underline">
                            Alterar Produto
                        </button>
                     </div>
                 )}
                 {hasGlobalErr && <p className="text-red-400 text-xs mt-2 font-medium">{hasGlobalErr}</p>}
             </div>

             {item.productId || item._isNew ? (
                 <>
                 <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-4">
                     {item._isNew && (
                         <>
                         <div className="md:col-span-6">
                             <label className="block text-xs font-medium text-gray-400 mb-1">Nome do produto *</label>
                             <input value={item.productName} onChange={e => updateItem(idx, 'productName', e.target.value.toUpperCase())} className="w-full bg-brand-navylight border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-brand-gold" />
                             {fieldErrors && fieldErrors[`items.${idx}.productName`] && <p className="text-red-400 text-xs mt-1">{fieldErrors[`items.${idx}.productName`]}</p>}
                         </div>

                         <div className="md:col-span-3">
                             <label className="block text-xs font-medium text-gray-400 mb-1">Grupo *</label>
                             <select value={item.groupId || ''} onChange={e => { 
                                 if (e.target.value === 'NEW') { setShowGroupModal(true); return; }
                                 updateItem(idx, 'groupId', e.target.value); 
                                 setFieldErrors && setFieldErrors({...fieldErrors, [`items.${idx}.groupId`]: null}); 
                             }} className="w-full bg-brand-navylight border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-brand-gold">
                                 <option value="">Selecione...</option>
                                 <option value="NEW" className="font-bold text-brand-gold">+ Criar Novo Grupo</option>
                                 {Array.isArray(groups) && groups.map((g: any) => <option key={g.id} value={g.id}>{g.name}</option>)}
                             </select>
                             {fieldErrors && fieldErrors[`items.${idx}.groupId`] && <p className="text-red-400 text-xs mt-1">{fieldErrors[`items.${idx}.groupId`]}</p>}
                         </div>

                         <div className="md:col-span-3">
                             <label className="block text-xs font-medium text-gray-400 mb-1">Subgrupo</label>
                             <select disabled={!item.groupId} value={item.subgroupId || ''} onChange={e => { 
                                 if (e.target.value === 'NEW') { setShowSubgroupModal(true); return; }
                                 updateItem(idx, 'subgroupId', e.target.value); 
                                 setFieldErrors && setFieldErrors({...fieldErrors, [`items.${idx}.subgroupId`]: null}); 
                             }} className="w-full bg-brand-navylight border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-brand-gold disabled:opacity-50">
                                 <option value="">Nenhum</option>
                                 <option value="NEW" className="font-bold text-brand-gold">+ Criar Novo Subgrupo</option>
                                 {Array.isArray(subgroups) && subgroups.filter((sg: any) => sg.groupId === item.groupId).map((sg: any) => <option key={sg.id} value={sg.id}>{sg.name}</option>)}
                             </select>
                             {fieldErrors && fieldErrors[`items.${idx}.subgroupId`] && <p className="text-red-400 text-xs mt-1">{fieldErrors[`items.${idx}.subgroupId`]}</p>}
                         </div>

                         <div className="md:col-span-3">
                             <label className="block text-xs font-medium text-gray-400 mb-1">SKU *</label>
                             <div className="flex gap-1">
                                 <input value={item.sku} onChange={e => updateItem(idx, 'sku', e.target.value.toUpperCase())} className="w-full bg-brand-navylight border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-brand-gold" />
                                 <button type="button" onClick={handleGenerateSku} className="bg-brand-gold/10 text-brand-gold hover:bg-brand-gold/20 px-2 py-2 rounded-lg text-xs font-medium whitespace-nowrap">Gerar SKU</button>
                             </div>
                             {fieldErrors && fieldErrors[`items.${idx}.sku`] && <p className="text-red-400 text-xs mt-1">{fieldErrors[`items.${idx}.sku`]}</p>}
                         </div>

                         <div className="md:col-span-3">
                             <label className="block text-xs font-medium text-gray-400 mb-1">UPC</label>
                             <input value={item.upc || ''} onChange={e => updateItem(idx, 'upc', e.target.value.toUpperCase())} className="w-full bg-brand-navylight border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-brand-gold" />
                         </div>

                         <div className="md:col-span-3">
                             <label className="block text-xs font-medium text-gray-400 mb-1">Marca</label>
                             <input value={item.brand || ''} onChange={e => updateItem(idx, 'brand', e.target.value.toUpperCase())} className="w-full bg-brand-navylight border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-brand-gold" />
                         </div>

                         <div className="md:col-span-3">
                             <label className="block text-xs font-medium text-gray-400 mb-1">Modelo</label>
                             <input value={item.model || ''} onChange={e => updateItem(idx, 'model', e.target.value.toUpperCase())} className="w-full bg-brand-navylight border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-brand-gold" />
                         </div>
                         
                         <div className="md:col-span-3">
                             <label className="block text-xs font-medium text-gray-400 mb-1">Quantidade *</label>
                             <input type="number" min="1" value={item.quantity} onChange={e => updateItem(idx, 'quantity', Number(e.target.value))} className="w-full bg-brand-navylight border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-brand-gold" />
                         </div>

                         <div className="md:col-span-3">
                             <label className="block text-xs font-medium text-gray-400 mb-1">Prateleira (opcional)</label>
                             <select value={item.shelfId || ''} onChange={e => { updateItem(idx, 'shelfId', e.target.value); setFieldErrors && setFieldErrors({...fieldErrors, [`items.${idx}.shelfId`]: null}); }} className="w-full bg-brand-navylight border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-brand-gold">
                                 <option value="">Selecione...</option>
                                 {Array.isArray(shelves) && shelves.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                             </select>
                             {fieldErrors && fieldErrors[`items.${idx}.shelfId`] && <p className="text-red-400 text-xs mt-1">{fieldErrors[`items.${idx}.shelfId`]}</p>}
                         </div>
                         </>
                     )}
                 </div>

                 {!item._isNew && (
                     <div className="mb-4">
                         <label className="block text-xs font-medium text-gray-400 mb-1">Quantidade *</label>
                         <input type="number" min="1" value={item.quantity} onChange={e => updateItem(idx, 'quantity', Number(e.target.value))} className="w-1/3 bg-brand-navylight border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-brand-gold" />
                     </div>
                 )}

                 <div className="grid grid-cols-2 md:grid-cols-2 gap-4 mb-4">
                     <div>
                         <label className="block text-xs font-medium text-gray-400 mb-1">{moneyFieldLabel("Custo")} *</label>
                         <input type="number" step="0.01" min="0" value={item.costPrice} onChange={e => updateItem(idx, 'costPrice', Number(e.target.value))} className="w-full bg-brand-navylight border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-brand-gold" />
                     </div>
                     <div>
                         <label className="block text-xs font-medium text-gray-400 mb-1">{moneyFieldLabel("Preço A (Varejo)")} {item._isNew && '*'}</label>
                         <input type="number" step="0.01" min="0" value={item.salePriceA} onChange={e => updateItem(idx, 'salePriceA', Number(e.target.value))} className="w-full bg-brand-navylight border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-brand-gold" />
                     </div>
                     <div className="md:col-span-2">
                         <label className="block text-xs font-medium text-gray-400 mb-1">{moneyFieldLabel("Preço B (Atacado)")}</label>
                         <input type="number" step="0.01" min="0" value={item.salePriceB} onChange={e => updateItem(idx, 'salePriceB', Number(e.target.value))} className="w-full bg-brand-navylight border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-brand-gold" />
                     </div>
                     <div>
                         <label className="block text-xs font-medium text-gray-400 mb-1">Lote {item.requiresLot && <span className="text-brand-gold">*</span>}</label>
                         <input type="text" value={item.lotNumber || ''} onChange={e => updateItem(idx, 'lotNumber', e.target.value.toUpperCase())} className="w-full bg-brand-navylight border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-brand-gold" placeholder="Nº do lote" />
                     </div>
                     <div>
                         <label className="block text-xs font-medium text-gray-400 mb-1">Validade</label>
                         <input type="date" value={item.expiryDate || ''} onChange={e => updateItem(idx, 'expiryDate', e.target.value)} className="w-full bg-brand-navylight border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-brand-gold" />
                     </div>
                 </div>

                 {!item._isNew && (
                     <div className="flex flex-wrap items-center gap-4 mb-4 bg-black/20 p-3 rounded-lg border border-gray-800">
                         <span className="text-xs font-medium text-gray-400">Ao aprovar:</span>
                         <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={item.updateCost} onChange={e => updateItem(idx, 'updateCost', e.target.checked)} className="w-4 h-4 bg-brand-navylight border-gray-700 rounded text-brand-gold focus:ring-brand-gold" />
                            <span className="text-sm font-medium text-gray-300">Atualizar Custo</span>
                         </label>
                         <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={item.updatePriceA} onChange={e => updateItem(idx, 'updatePriceA', e.target.checked)} className="w-4 h-4 bg-brand-navylight border-gray-700 rounded text-brand-gold focus:ring-brand-gold" />
                            <span className="text-sm font-medium text-gray-300">Atualizar Preço A</span>
                         </label>
                         <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={item.updatePriceB} onChange={e => updateItem(idx, 'updatePriceB', e.target.checked)} className="w-4 h-4 bg-brand-navylight border-gray-700 rounded text-brand-gold focus:ring-brand-gold" />
                            <span className="text-sm font-medium text-gray-300">Atualizar Preço B</span>
                         </label>
                     </div>
                 )}

                 <div className="flex items-center gap-2 mb-4">
                     <input type="checkbox" id={`sn_${idx}`} checked={item.hasSerialNumber} onChange={e => updateItem(idx, 'hasSerialNumber', e.target.checked)} disabled={!item._isNew && item.hasSerialNumber} className="w-4 h-4 bg-brand-navylight border-gray-700 rounded text-brand-gold focus:ring-brand-gold" />
                     <label htmlFor={`sn_${idx}`} className="text-sm font-medium text-gray-300">Controla S/N?</label>
                 </div>

                 {item.hasSerialNumber && (
                    <div className="mt-4 pt-4 border-t border-gray-800">
                       <div className="flex justify-between text-xs mb-2 text-gray-400">
                          <span>Seriais Bipados</span>
                          <span className={(item.serials || []).length === item.quantity ? "text-green-400 font-bold" : "text-amber-400"}>S/N: {(item.serials || []).length} / {item.quantity}</span>
                       </div>
                       <input 
                          type="text" 
                          placeholder="Foco aqui e bipe o código de barras (Enter automático)" 
                          onKeyDown={handleSerialKey} 
                          className="w-full bg-brand-navylight border border-gray-700 rounded-lg px-3 py-3 text-sm text-white outline-none focus:border-blue-500 shadow-inner mb-4"
                       />
                       <div className="flex flex-wrap gap-2">
                           {Array.isArray(item.serials) && item.serials.map((s: string, sIdx: number) => (
                              <div key={sIdx} className="bg-gray-800 text-gray-300 text-xs px-2 py-1 rounded flex items-center gap-1">
                                 {s}
                                 <button onClick={() => {
                                    const nS = [...item.serials];
                                    nS.splice(sIdx, 1);
                                    updateItem(idx, 'serials', nS);
                                 }} className="text-red-400 hover:text-red-300 ml-1"><X className="w-3 h-3" /></button>
                              </div>
                           ))}
                       </div>
                       {fieldErrors && fieldErrors[`items.${idx}.serials`] && <p className="text-red-400 text-sm mt-2">{fieldErrors[`items.${idx}.serials`]}</p>}
                    </div>
                 )}
                 </>
             ) : null}

             <BarcodeScannerModal
                isOpen={showBarcodeScanner}
                onClose={() => setShowBarcodeScanner(false)}
                onDetected={(code) => {
                   setShowBarcodeScanner(false);
                   setSearchTerm(code);
                   setShowResults(true);
                }}
                title="Ler código de barras"
             />

             <QuickGroupModal
                 isOpen={showGroupModal}
                 onClose={() => setShowGroupModal(false)}
                 onSuccess={async (newId) => {
                     if (onReloadGroups) await onReloadGroups();
                     updateItem(idx, 'groupId', newId);
                     updateItem(idx, 'subgroupId', '');
                 }}
             />

             <QuickSubgroupModal
                 isOpen={showSubgroupModal}
                 onClose={() => setShowSubgroupModal(false)}
                 groupId={item.groupId || ''}
                 groupName={groups?.find((g: any) => g.id === item.groupId)?.name || ''}
                 onSuccess={async (newId) => {
                     if (onReloadGroups) await onReloadGroups();
                     updateItem(idx, 'subgroupId', newId);
                 }}
             />
        </div>
    );
}
