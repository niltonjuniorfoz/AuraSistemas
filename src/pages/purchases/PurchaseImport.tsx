import React, { useState, useEffect } from 'react';
import { PackagePlus, X, Upload, Save, Check } from 'lucide-react';
import { apiFetch, loadList, extractList } from '../../lib/api';
import { useNavigate } from 'react-router';
import { PurchaseItemRow } from '../../components/PurchaseItemRow';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';

export function PurchaseImport() {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [subgroups, setSubgroups] = useState<any[]>([]);
  const [shelves, setShelves] = useState<any[]>([]);
  const [supplierId, setSupplierId] = useState('');
  
  const [file, setFile] = useState<File | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<any>({});

  const [loadError, setLoadError] = useState("");

  useEffect(() => {
     async function loadAll() {
        try {
           const [s, g, sg, sh] = await Promise.all([
               loadList('/api/suppliers?includeInactive=false&page=1&limit=500'),
               loadList('/api/groups'),
               loadList('/api/groups/subgroups'),
               loadList('/api/shelves')
           ]);
           setSuppliers(s);
           setGroups(g);
           setSubgroups(sg);
           setShelves(sh);
        } catch (err: any) {
           setLoadError("Erro ao carregar dados da entrada: fornecedores/grupos/prateleiras.");
        }
     }
     loadAll();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          setFile(e.target.files[0]);
      }
  };

  const parseFile = async () => {
      if (!file) return;
      setLoading(true);
      setError("");
      setFieldErrors({});
      try {
          const fd = new FormData();
          fd.append('file', file);
          const res = await apiFetch('/api/purchases/import/spreadsheet', {
              method: 'POST',
              body: fd
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Erro ao ler arquivo");
          
          // First fetch products to match existing ones
          const products = await loadList('/api/products');

          let parsedData = extractList(data);
          parsedData = parsedData.map((item: any) => {
             const existingProd = products.find((p: any) => p.sku === item.sku || (item.upc && p.upc === item.upc));
             if (existingProd) {
                 return { 
                    ...item, 
                    productId: existingProd.id, 
                    productName: existingProd.name, 
                    hasSerialNumber: existingProd.hasSerialNumber,
                    updateCost: true,
                    updatePriceA: true,
                    updatePriceB: false,
                    _stock: existingProd.physicalStock || 0,
                    _isNew: false 
                 };
             } else {
                 let groupId = ''; let subgroupId = ''; let shelfId = '';
                 const foundGroup = groups.find(g => g.name.toUpperCase() === String(item.group).toUpperCase());
                 if (foundGroup) groupId = foundGroup.id;
                 const foundSubgroup = subgroups.find(sg => sg.name.toUpperCase() === String(item.subgroup).toUpperCase());
                 if (foundSubgroup) subgroupId = foundSubgroup.id;
                 const foundShelf = shelves.find(s => s.name.toUpperCase() === String(item.shelf).toUpperCase());
                 if (foundShelf) shelfId = foundShelf.id;
                 return { 
                    ...item, 
                    productId: '', 
                    groupId, 
                    subgroupId, 
                    shelfId,
                    updateCost: true,
                    updatePriceA: true,
                    updatePriceB: false,
                    _stock: 0,
                    _isNew: true 
                 };
             }
          });
          setItems(parsedData);
      } catch(e: any) {
          setError(e.message);
      } finally {
          setLoading(false);
      }
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

  const generateMissingSkus = async () => {
      setLoading(true);
      setError("");
      try {
          const newItems = [...items];
          const itemsNeedSku = newItems.filter(item => item._isNew && !item.sku && item.groupId);
          if (itemsNeedSku.length === 0) {
              alert("Nenhum produto novo sem SKU com grupo selecionado foi encontrado.");
              return;
          }

          const prefixCache: Record<string, string> = {};
          const latestSeqCache: Record<string, number> = {};

          for (const item of itemsNeedSku) {
              const groupId = item.groupId;
              const subgroupId = item.subgroupId;
              const cacheKey = `${groupId}-${subgroupId || ''}`;
              
              let prefix = prefixCache[cacheKey];
              if (!prefix) {
                  const url = `/api/products/next-sku?groupId=${groupId}${subgroupId ? '&subgroupId=' + subgroupId : ''}`;
                  const res = await apiFetch(url);
                  if (res.ok) {
                      const data = await res.json();
                      const sku = data.sku;
                      const parts = sku.split("-");
                      prefix = parts[0];
                      const seq = parseInt(parts[1], 10);
                      prefixCache[cacheKey] = prefix;
                      latestSeqCache[prefix] = seq;
                  } else {
                      const grp = groups.find(g => g.id === groupId);
                      const grpName = grp ? grp.name : 'ZWW';
                      prefix = grpName.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3);
                      while (prefix.length < 3) prefix += 'X';
                      prefixCache[cacheKey] = prefix;
                      latestSeqCache[prefix] = 1;
                  }
              } else {
                  latestSeqCache[prefix] = (latestSeqCache[prefix] || 0) + 1;
              }

              const nextSeqStr = String(latestSeqCache[prefix]).padStart(4, "0");
              item.sku = `${prefix}-${nextSeqStr}`;
          }

          setItems(newItems);
          alert(`${itemsNeedSku.length} SKUs gerados com sucesso!`);
      } catch (err: any) {
          setError("Erro ao gerar SKUs faltantes: " + err.message);
      } finally {
          setLoading(false);
      }
  };

  const confirmImport = async (autoApprove: boolean) => {
      if (!supplierId) return setError("Selecione um fornecedor");
      if (items.length === 0) return setError("Nenhum item na planilha");
      
      setLoading(true);
      setError("");
      setFieldErrors({});
      try {
          const res = await apiFetch('/api/purchases/import/confirm', {
             method: 'POST',
             body: JSON.stringify({
                 supplierId,
                 items,
                 autoApprove
             })
          });
          const data = await res.json();
          if (!res.ok) {
              if (data.fields) setFieldErrors(data.fields);
              throw new Error(data.error || "Erro na importação");
          }

          if (autoApprove) {
              alert("Importação aprovada e estoque atualizado!");
          } else {
              alert("Importação salva como rascunho com sucesso!");
          }
          navigate('/purchases');
      } catch(e: any) {
          setError(e.message);
      } finally {
          setLoading(false);
      }
  };

  return (
    <div className="pb-32">
       <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Upload className="w-8 h-8 text-brand-gold" />
            Importar Planilha
          </h1>
          <p className="text-gray-400">Envie arquivo CSV ou XLSX com itens da compra</p>
        </div>
        <div className="flex gap-3">
             <Button variant="ghost" className="hover:bg-transparent hover:text-white dark:hover:bg-transparent" onClick={() => navigate('/purchases')}>Cancelar</Button>
             {items.length > 0 && (
                <>
                   <Button variant="outline" className="rounded-lg border-primary/30 bg-primary/10 px-4 py-2 font-medium text-primary shadow-none hover:bg-primary/20 hover:text-primary dark:border-primary/30 dark:bg-primary/10 dark:hover:bg-primary/20" disabled={loading || items.filter(item => item._isNew && !item.sku && item.groupId).length === 0} onClick={generateMissingSkus}>
                     Gerar SKUs faltantes
                   </Button>
                   <Button variant="secondary" className="rounded-lg px-4 py-2 has-[>svg]:px-4 font-medium" disabled={loading} onClick={() => confirmImport(false)}>
                     <Save className="h-4 w-4" />
                     Salvar como Rascunho
                   </Button>
                   <Button className="rounded-lg px-4 py-2 has-[>svg]:px-4 font-medium" disabled={loading} onClick={() => confirmImport(true)}>
                     <Check className="size-5" />
                     Aprovar e Dar Entrada
                   </Button>
                </>
             )}
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

      {items.length === 0 ? (
          <Card className="mb-8 rounded-xl border-gray-800 shadow-md py-0">
          <CardContent className="flex flex-col items-center justify-center p-6 py-24">
             <Upload className="w-16 h-16 text-gray-700 mb-4" />
             <h2 className="text-xl font-bold text-white mb-2">Selecione a planilha (.csv, .xlsx)</h2>
             <p className="text-gray-400 mb-6 text-center max-w-sm">Colunas suportadas: SKU, UPC, PRODUTO, MARCA, MODELO, GRUPO, SUBGRUPO, PRATELEIRA, QUANTIDADE, CUSTO, PRECO_A, PRECO_B, CONTROLA_SN, SERIAIS</p>
             <input type="file" accept=".csv,.xlsx" onChange={handleFileChange} className="mb-4 text-gray-300 file:bg-gray-800 file:text-white file:border-0 file:px-4 file:py-2 file:rounded-lg file:cursor-pointer file:hover:bg-gray-700" />
             <Button className="rounded-lg px-6 py-2 font-medium" disabled={!file || loading} onClick={parseFile}>
               {loading ? 'Lendo...' : 'Ler Planilha'}
             </Button>
          </CardContent>
          </Card>
      ) : (
          <Card className="rounded-xl border-gray-800 shadow-md py-0">
          <CardContent className="p-6">
             <div className="mb-6 flex gap-4 items-end">
                <div className="flex-1">
                   <label className="block text-sm font-medium text-gray-400 mb-1">Selecione o Fornecedor para esta Entrada *</label>
                   <select value={supplierId} onChange={e => setSupplierId(e.target.value)} className="w-full bg-[#171717] border border-gray-800 rounded-lg px-3 py-2 text-white outline-none focus:border-brand-gold">
                      <option value="">Selecione o Fornecedor...</option>
                      {Array.isArray(suppliers) && suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                   </select>
                </div>
                <div className="pb-1 text-gray-400 font-medium">
                   Total de itens identificados: <span className="text-brand-gold">{items.length}</span>
                </div>
             </div>

             <div className="space-y-6">
                 {items.map((item, idx) => (
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
                     />
                 ))}
             </div>
          </CardContent>
          </Card>
      )}
    </div>
  );
}
