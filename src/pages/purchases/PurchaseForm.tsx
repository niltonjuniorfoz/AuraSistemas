import React, { useState, useEffect } from 'react';
import { PackagePlus, Search, Check, Save } from 'lucide-react';
import { apiFetch, loadList } from '../../lib/api';
import { useNavigate, useParams } from 'react-router';
import { PurchaseItemRow } from '../../components/PurchaseItemRow';
import { getBaseCurrency } from '../../lib/i18n';
import { CURRENCY_SYMBOL, type Currency } from '../../lib/currency';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';

export function PurchaseForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [subgroups, setSubgroups] = useState<any[]>([]);
  const [shelves, setShelves] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
     supplierId: '',
     invoiceNumber: '',
     invoiceDate: '',
     currency: getBaseCurrency() as Currency,
     fxRateToBrl: '',
     freightAmount: '',
     notes: ''
  });
  const [fxToday, setFxToday] = useState<Record<string, { rate: number; source: string }>>({});

  // Cotação do dia pro par da moeda escolhida (USD→USDBRL; PYG→1/BRLPYG). BRL = 1.
  const fxSuggestion = (cur: string): number | null => {
     if (cur === 'BRL') return 1;
     if (cur === 'USD') return fxToday.USDBRL ? fxToday.USDBRL.rate : null;
     if (cur === 'PYG') return fxToday.BRLPYG ? 1 / fxToday.BRLPYG.rate : null;
     if (cur === 'USDT') return fxToday.USDTBRL ? fxToday.USDTBRL.rate : null;
     return null;
  };
  const changeCurrency = (cur: Currency) => {
     const sug = fxSuggestion(cur);
     setFormData(f => ({ ...f, currency: cur, fxRateToBrl: cur === 'BRL' ? '' : (sug ? String(Number(sug.toFixed(6))) : f.fxRateToBrl) }));
  };

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<any>({});

  const [loadError, setLoadError] = useState("");

  const loadGroupsData = async () => {
     try {
       const [g, sg] = await Promise.all([
           loadList('/api/groups'),
           loadList('/api/groups/subgroups')
       ]);
       setGroups(g);
       setSubgroups(sg);
     } catch (e) {
       console.error("Failed to reload groups", e);
     }
  };

  useEffect(() => {
     async function loadAll() {
        try {
           const [s, sh] = await Promise.all([
               loadList('/api/suppliers?includeInactive=false&page=1&limit=500'),
               loadList('/api/shelves')
           ]);
           setSuppliers(s);
           setShelves(sh);
           await loadGroupsData();
           apiFetch('/api/fx/today').then(async (r) => { if (r.ok) { const j = await r.json(); setFxToday(j.rates || {}); } }).catch(() => {});
           
           if (id) {
               const res = await apiFetch(`/api/purchases/${id}`);
               if (res.ok) {
                   const d = await res.json();
                   setFormData({
                      supplierId: d.purchase.supplierId || '',
                      invoiceNumber: d.purchase.invoiceNumber || '',
                      invoiceDate: d.purchase.invoiceDate ? d.purchase.invoiceDate.split('T')[0] : '',
                      currency: d.purchase.currency || getBaseCurrency(),
                      fxRateToBrl: d.purchase.fxRateToBrl ? String(Number(d.purchase.fxRateToBrl)) : '',
                      freightAmount: d.purchase.freightAmount && Number(d.purchase.freightAmount) > 0 ? String(Number(d.purchase.freightAmount)) : '',
                      notes: d.purchase.notes || ''
                   });
                   const loadedItems = d.items.map((i: any) => ({
                       productId: i.productId,
                       sku: i.sku || '',
                       upc: i.upc || '',
                       productName: i.productName || '',
                       brand: i.brand || '',
                       model: i.model || '',
                       groupId: i.groupId || '',
                       subgroupId: i.subgroupId || '',
                       shelfId: i.shelfId || '',
                       quantity: Number(i.quantity) || 1,
                       costPrice: Number(i.costPrice) || 0,
                       salePriceA: Number(i.salePriceA) || 0,
                       salePriceB: Number(i.salePriceB) || 0,
                       hasSerialNumber: i.hasSerialNumber || false,
                       updateCost: i.updateCost ?? true,
                       updatePriceA: i.updatePriceA ?? true,
                       updatePriceB: i.updatePriceB ?? false,
                       serials: i.serials.map((s: any) => s.serialNumber),
                       _isNew: !i.productId,
                       _stock: 0
                   }));
                   setItems(loadedItems);
               }
           }
        } catch (err: any) {
           setLoadError("Erro ao carregar dados da entrada: fornecedores/grupos/prateleiras.");
        }
     }
     loadAll();
  }, [id]);

  const addItem = () => {
    setItems([...items, {
       productId: '',
       sku: '',
       productName: '',
       quantity: 1,
       costPrice: 0,
       salePriceA: 0,
       salePriceB: 0,
       hasSerialNumber: false,
       serials: [],
       _isNew: false
    }]);
  };

  const updateItem = (index: number, key: string, val: any) => {
    const newItems = [...items];
    newItems[index][key] = val;
    setItems(newItems);
  };

  const selectProduct = (index: number, p: any) => {
     if (!p) {
         updateItem(index, 'productId', '');
         updateItem(index, 'sku', '');
         updateItem(index, 'productName', '');
         updateItem(index, 'upc', '');
         updateItem(index, 'brand', '');
         updateItem(index, 'model', '');
         updateItem(index, 'costPrice', 0);
         updateItem(index, 'salePriceA', 0);
         updateItem(index, 'salePriceB', 0);
         updateItem(index, 'hasSerialNumber', false);
         updateItem(index, 'updateCost', true);
         updateItem(index, 'updatePriceA', true);
         updateItem(index, 'updatePriceB', false);
         updateItem(index, '_stock', 0);
         updateItem(index, '_isNew', true);
         return;
     }
     const newItems = [...items];
     newItems[index].productId = p.id;
     newItems[index].sku = p.sku;
     newItems[index].productName = p.name;
     newItems[index].hasSerialNumber = p.hasSerialNumber;
     newItems[index].costPrice = p.costPrice || 0;
     newItems[index].salePriceA = p.salePriceA || 0;
     newItems[index].salePriceB = p.salePriceB || 0;
     newItems[index].updateCost = true;
     newItems[index].updatePriceA = true;
     newItems[index].updatePriceB = false;
     newItems[index]._stock = p.physicalStock || 0;
     newItems[index]._isNew = false;
     setItems(newItems);
  };

  const removeItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const handleSerialKey = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Enter' && e.currentTarget.value) {
       e.preventDefault();
       const val = e.currentTarget.value.trim().toUpperCase();
       
       const currentItem = items[index];
       if (currentItem.serials.length >= currentItem.quantity) {
          alert('Quantidade máxima de seriais atingida.');
          e.currentTarget.value = '';
          return;
       }
       if (currentItem.serials.includes(val)) {
          alert('Serial já adicionado.');
          e.currentTarget.value = '';
          return;
       }

       const newItems = [...items];
       newItems[index].serials.push(val);
       setItems(newItems);
       e.currentTarget.value = '';
    }
  };

  const validate = () => {
    if (!formData.supplierId) return "Fornecedor obrigatório";
    if (items.length === 0) return "Adicione pelo menos 1 item";
    for(const item of items) {
       if (item.quantity <= 0) return "Quantidade do item deve ser maior que 0";
       if (item.costPrice < 0) return "Custo não pode ser negativo";
       if (item.salePriceA <= 0) return "Preço A deve ser maior que zero";
       if (item.hasSerialNumber && item.serials.length !== item.quantity) {
           return `O item ${item.productName || item.sku} exige ${item.quantity} seriais (${item.serials.length} bipados)`;
       }
       if (item._isNew) {
           if (!item.sku || !item.productName) return "SKU e Nome são obrigatórios para novo produto";
           if (!item.groupId) return "Grupo é obrigatório para novo produto";

       }
    }
    return null;
  };

  const saveDraft = async () => {
    const err = validate();
    if (err) return setError(err);
    setError("");

    setLoading(true);
    try {
        const payload = { ...formData, items };
        const res = await apiFetch(id ? `/api/purchases/${id}` : '/api/purchases', {
            method: id ? 'PUT' : 'POST',
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) {
            if (data.fields) setFieldErrors(data.fields);
            throw new Error(data.error || "Erro as salvar rascunho");
        }
        alert('Rascunho salvo!');
        navigate('/purchases');
    } catch(e: any) {
        setError(e.message || 'Erro ao salvar rascunho');
    } finally {
        setLoading(false);
    }
  };

  const approve = async () => {
    const err = validate();
    if (err) return setError(err);
    setError("");

    setLoading(true);
    try {
        const payload = { ...formData, items };
        // first create or update draft
        const res = await apiFetch(id ? `/api/purchases/${id}` : '/api/purchases', {
            method: id ? 'PUT' : 'POST',
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) {
            if (data.fields) setFieldErrors(data.fields);
            throw new Error(data.error || "Erro ao salvar compra");
        }

        // then approve it
        const resApp = await apiFetch(`/api/purchases/${id || data.id}/approve`, {
            method: 'POST'
        });
        if (!resApp.ok) {
           const datApp = await resApp.json();
           throw new Error(datApp.error || "Erro ao aprovar");
        }

        alert('Entrada aprovada e estoque atualizado!');
        navigate('/purchases');
    } catch(e: any) {
        setError(e.message || 'Erro ao aprovar entrada');
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="purchase-form-page pb-32">
       <div className="purchase-form-header flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <PackagePlus className="w-8 h-8 text-brand-gold" />
            Nova Entrada de Mercadoria
          </h1>
          <p className="text-gray-400">Preencha os dados e itens para dar entrada no estoque</p>
        </div>
        <div className="purchase-form-actions flex gap-3">
             <Button variant="ghost" className="hover:bg-transparent hover:text-white dark:hover:bg-transparent" onClick={() => navigate('/purchases')}>Voltar</Button>
             <Button variant="secondary" className="rounded-lg px-4 py-2 has-[>svg]:px-4 font-medium" onClick={saveDraft} disabled={loading}>
               <Save className="h-4 w-4" />
               Salvar Rascunho
             </Button>
             <Button className="rounded-lg px-4 py-2 has-[>svg]:px-4 font-medium" onClick={approve} disabled={loading}>
               <Check className="size-5" />
               Aprovar Entrada
             </Button>
        </div>
      </div>

      {loadError && (
         <Card className="mb-6 rounded-xl border-red-500/20 bg-red-500/10 py-0 text-red-400 shadow-none">
            <CardContent className="p-4">
               {loadError}
            </CardContent>
         </Card>
      )}

      {error && (
         <Card className="mb-6 rounded-xl border-red-500/20 bg-red-500/10 py-0 text-red-400 shadow-none">
            <CardContent className="p-4">
               {error}
            </CardContent>
         </Card>
      )}

      <Card className="purchase-form-section mb-8 rounded-xl border-gray-800 shadow-md py-0">
      <CardContent className="p-6">
          <h2 className="text-lg font-bold text-white mb-4">Dados da Nota / Documento</h2>
          <div className="purchase-form-grid grid grid-cols-2 md:grid-cols-4 gap-4">
             <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-400 mb-1">Fornecedor *</label>
                <select value={formData.supplierId} onChange={e => setFormData({...formData, supplierId: e.target.value})} className="w-full bg-[#171717] border border-gray-800 rounded-lg px-3 py-2 text-white outline-none focus:border-brand-gold">
                   <option value="">Selecione o Fornecedor...</option>
                   {Array.isArray(suppliers) && suppliers.map(s => <option key={s.id} value={s.id}>{s.name} {s.document ? `(${s.document})` : ''}</option>)}
                </select>
             </div>
             <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Nota Fiscal</label>
                <input value={formData.invoiceNumber} onChange={e => setFormData({...formData, invoiceNumber: e.target.value})} className="w-full bg-[#171717] border border-gray-800 rounded-lg px-3 py-2 text-white outline-none focus:border-brand-gold" />
             </div>
             <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Data</label>
                <input type="date" value={formData.invoiceDate} onChange={e => setFormData({...formData, invoiceDate: e.target.value})} className="w-full bg-[#171717] border border-gray-800 rounded-lg px-3 py-2 text-white outline-none focus:border-brand-gold" />
             </div>
             {/* Multimoeda: moeda da compra + câmbio congelado + frete/despesas */}
             <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Moeda da compra</label>
                <select value={formData.currency} onChange={e => changeCurrency(e.target.value as Currency)} className="w-full bg-[#171717] border border-gray-800 rounded-lg px-3 py-2 text-white outline-none focus:border-brand-gold">
                   <option value="USD">US$ Dólar</option>
                   <option value="BRL">R$ Real</option>
                   <option value="PYG">₲ Guarani</option>
                   <option value="USDT">USDT (Tether)</option>
                </select>
             </div>
             {formData.currency !== 'BRL' && (
               <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Câmbio → R$ {fxSuggestion(formData.currency) ? <span className="text-[10px] text-gray-500">(hoje: {Number(fxSuggestion(formData.currency)).toLocaleString('pt-BR', { maximumFractionDigits: 6 })})</span> : null}</label>
                  <input type="number" step="0.000001" min="0" value={formData.fxRateToBrl} onChange={e => setFormData({...formData, fxRateToBrl: e.target.value})} placeholder={fxSuggestion(formData.currency) ? String(Number(fxSuggestion(formData.currency)!.toFixed(6))) : 'ex.: 5.16'} className="w-full bg-[#171717] border border-gray-800 rounded-lg px-3 py-2 text-white font-mono outline-none focus:border-brand-gold" />
               </div>
             )}
             <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Frete/Despesas ({CURRENCY_SYMBOL[formData.currency as keyof typeof CURRENCY_SYMBOL] || 'R$'})</label>
                <input type="number" step="0.01" min="0" value={formData.freightAmount} onChange={e => setFormData({...formData, freightAmount: e.target.value})} placeholder="0" className="w-full bg-[#171717] border border-gray-800 rounded-lg px-3 py-2 text-white font-mono outline-none focus:border-brand-gold" />
                <p className="mt-0.5 text-[10px] text-gray-500">Rateado por unidade no custo</p>
             </div>
             <div className="md:col-span-4">
                <label className="block text-sm font-medium text-gray-400 mb-1">Observações</label>
                <input value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full bg-[#171717] border border-gray-800 rounded-lg px-3 py-2 text-white outline-none focus:border-brand-gold" />
             </div>
          </div>
          {(() => {
             const sym = CURRENCY_SYMBOL[formData.currency as keyof typeof CURRENCY_SYMBOL] || 'R$';
             const itemsTotal = items.reduce((s, i) => s + (Number(i.costPrice) || 0) * (Number(i.quantity) || 0), 0);
             const freight = Number(formData.freightAmount) || 0;
             const fx = formData.currency === 'BRL' ? 1 : (Number(formData.fxRateToBrl) || fxSuggestion(formData.currency) || 0);
             const totalNative = itemsTotal + freight;
             if (totalNative <= 0) return null;
             return (
               <Card className="mt-4 rounded-xl border-primary/25 bg-primary/5 py-0 text-sm shadow-none">
               <CardContent className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                  <span className="text-gray-300">Custo da compra: <b className="text-white">{sym} {totalNative.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</b>{freight > 0 && <span className="text-gray-500"> (itens {sym} {itemsTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} + frete {sym} {freight.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})</span>}</span>
                  {formData.currency !== 'BRL' && (fx > 0
                    ? <span className="font-bold text-brand-gold">≈ R$ {(totalNative * fx).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} <span className="text-[10px] text-gray-500 font-normal">câmbio {fx.toLocaleString('pt-BR', { maximumFractionDigits: 6 })}</span></span>
                    : <span className="text-amber-300 text-xs">informe o câmbio pra ver o custo em R$</span>)}
               </CardContent>
               </Card>
             );
          })()}
      </CardContent>
      </Card>

      <Card className="purchase-form-section rounded-xl border-gray-800 shadow-md py-0">
      <CardContent className="p-6">
          <div className="flex justify-between items-center mb-4">
             <h2 className="text-lg font-bold text-white">Itens da Entrada</h2>
             <Button variant="ghost" className="rounded-lg bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-400 hover:bg-blue-500/20 hover:text-blue-400 dark:hover:bg-blue-500/20" onClick={addItem}>
                + Adicionar Item
             </Button>
          </div>

          <div className="space-y-6">
             {Array.isArray(items) && items.map((item, idx) => (
                 <PurchaseItemRow
                     key={idx}
                     item={item}
                     idx={idx}
                     updateItem={updateItem}
                     removeItem={removeItem}
                     fieldErrors={fieldErrors}
                     setFieldErrors={setFieldErrors}
                     groups={groups}
                     subgroups={subgroups}
                     shelves={shelves}
                     selectProduct={selectProduct}
                     onReloadGroups={loadGroupsData}
                 />
             ))}
             
             {items.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                   Nenhum item adicionado. Clicar em "+ Adicionar Item".
                </div>
             )}
          </div>
      </CardContent>
      </Card>
    </div>
  );
}
