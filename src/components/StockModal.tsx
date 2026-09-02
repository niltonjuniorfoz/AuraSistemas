import React, { useState, useEffect } from "react";
import { Modal } from "./Modal";
import { apiFetch } from "../lib/api";
import { moneyFieldLabel } from "../lib/i18n";
import { PackagePlus, PackageMinus, Settings2, History, Zap } from "lucide-react";

interface StockModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  hasSerialNumber?: boolean;
  requiresLot?: boolean;
  onSuccess: () => void;
}

export function StockModal({ isOpen, onClose, productId, productName, hasSerialNumber, requiresLot, onSuccess }: StockModalProps) {
  const [tab, setTab] = useState<"add" | "remove" | "adjust" | "move" | "history" | "serials">("add");
  const [quantity, setQuantity] = useState<number | "">("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [costPrice, setCostPrice] = useState<number | "">("");
  const [lotNumber, setLotNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  
  const [history, setHistory] = useState<any[]>([]);
  const [serials, setSerials] = useState<any[]>([]);
  const [searchSerial, setSearchSerial] = useState("");
  const [addSerialsList, setAddSerialsList] = useState<string[]>([]);
  const [addSerialInput, setAddSerialInput] = useState("");
  
  const [balance, setBalance] = useState<{physicalStock: number, availableStock: number, reservedStock: number} | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  const deleteSerial = async (serialId: string) => {
     if(!confirm("Deseja realmente excluir este número de série?")) return;
     try {
        const res = await apiFetch(`/api/serials/${productId}/${serialId}`, { method: "DELETE" });
        if(res.ok) {
           setSuccess("S/N excluído com sucesso.");
           fetchSerials();
           setTimeout(() => setSuccess(""), 3000);
        } else {
           const e = await res.json().catch(()=>({}));
           setError(e.error || "Erro ao excluir S/N");
        }
     } catch(err:any) { setError(err.message); }
  };
  const [newSerialsText, setNewSerialsText] = useState("");

  useEffect(() => {
    if (isOpen) {
      fetchBalance();
      if (tab === "history") fetchHistory();
      if (tab === "serials") fetchSerials();
    }
  }, [isOpen, tab, productId]);

  const fetchSerials = async () => {
    try {
      const res = await apiFetch(`/api/serials/${productId}`);
      if (res.ok) {
        const data = await res.json();
        setSerials(data);
      }
    } catch(err) {
      console.error(err);
    }
  };

  const fetchBalance = async () => {
    try {
      const res = await apiFetch(`/api/products/${productId}/stock/balance`);
      if (res.ok) {
        const data = await res.json();
        setBalance(data);
      }
    } catch(err) {
      console.error(err);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await apiFetch(`/api/products/${productId}/stock/history`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch(err) {
      console.error(err);
    }
  };

  const handleAddSerialKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = addSerialInput.trim().toUpperCase();
      if (!val) return;
      if (addSerialsList.includes(val)) {
        setError("Número de série já bipado na lista atual.");
        return;
      }
      setAddSerialsList([...addSerialsList, val]);
      setAddSerialInput("");
      setError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (tab === "add" && hasSerialNumber && quantity !== "") {
      if (addSerialsList.length !== quantity) {
        setError(`Para adicionar este estoque, você deve bipar exatamente ${quantity} números de série.`);
        return;
      }
    }

    if (tab === "add" && requiresLot && !lotNumber.trim()) {
      setError("Este produto é controlado por lote. Informe o número do lote.");
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccess("");
    try {
      let endpoint = `/api/products/${productId}/stock/${tab}`;
      let body: any = { reason, notes };
      if (tab === "add" || tab === "remove" || tab === "move") {
        body.quantity = quantity;
        if (tab === "add" && costPrice !== "") body.costPrice = costPrice;
        if (tab === "add" && hasSerialNumber) body.serials = addSerialsList;
        if (tab === "add" && lotNumber.trim()) { body.lotNumber = lotNumber.trim().toUpperCase(); if (expiryDate) body.expiryDate = expiryDate; }
      } else if (tab === "adjust") {
        body.newQty = quantity;
      }

      const res = await apiFetch(endpoint, {
        method: "POST",
        body: JSON.stringify(body)
      });

      if (res.ok) {
        setSuccess("Estoque atualizado com sucesso!");
        fetchBalance(); 
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1500);
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(`Erro ${res.status}: ${errData.error || "Erro desconhecido ao movimentar estoque"}`);
        console.error("Erro estoque", { endpoint, status: res.status, response: errData });
      }
    } catch (err: any) {
      setError(`Erro: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Estoque: ${productName}`}>
      {balance && (
        <div className="flex gap-4 mb-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
          <div className="flex-1">
            <div className="text-xs text-gray-400 mb-1">Estoque físico</div>
            <div className="text-xl font-semibold text-white">{balance.physicalStock}</div>
          </div>
          <div className="flex-1 border-l border-gray-700 pl-4">
            <div className="text-xs text-gray-400 mb-1">Reservado</div>
            <div className="text-xl font-semibold text-yellow-400">{balance.reservedStock}</div>
          </div>
          <div className="flex-1 border-l border-gray-700 pl-4">
            <div className="text-xs text-brand-gold mb-1">Disponível</div>
            <div className="text-xl font-semibold text-brand-gold">{balance.availableStock}</div>
          </div>
        </div>
      )}

      <div className="flex bg-[#171717] border-b border-gray-800 mb-4 rounded-lg overflow-hidden shrink-0 overflow-x-auto custom-scrollbar">
        <button type="button" onClick={() => {setTab('add'); setError(""); setSuccess("");}} className={`flex-1 min-w-[80px] flex flex-col items-center gap-1 p-3 text-xs font-medium transition ${tab === 'add' ? 'bg-brand-gold/10 text-brand-gold border-b-2 border-brand-gold' : 'text-gray-400 hover:bg-gray-800'}`}>
          <PackagePlus className="w-4 h-4" />
          <span className="truncate w-full text-center">Adicionar</span>
        </button>
        <button type="button" onClick={() => {setTab('remove'); setError(""); setSuccess("");}} className={`flex-1 min-w-[80px] flex flex-col items-center gap-1 p-3 text-xs font-medium transition ${tab === 'remove' ? 'bg-red-500/10 text-red-400 border-b-2 border-red-500' : 'text-gray-400 hover:bg-gray-800'}`}>
          <PackageMinus className="w-4 h-4" />
          <span className="truncate w-full text-center">Remover</span>
        </button>
        <button type="button" onClick={() => {setTab('adjust'); setError(""); setSuccess("");}} className={`flex-1 min-w-[80px] flex flex-col items-center gap-1 p-3 text-xs font-medium transition ${tab === 'adjust' ? 'bg-yellow-500/10 text-yellow-400 border-b-2 border-yellow-500' : 'text-gray-400 hover:bg-gray-800'}`}>
          <Settings2 className="w-4 h-4" />
          <span className="truncate w-full text-center">Ajustar</span>
        </button>
        <button type="button" onClick={() => {setTab('move'); setError(""); setSuccess(""); setQuantity("");}} className={`flex-1 min-w-[70px] flex flex-col items-center gap-1 p-3 text-xs font-medium transition ${tab === 'move' ? 'bg-blue-500/10 text-blue-400 border-b-2 border-blue-500' : 'text-gray-400 hover:bg-gray-800'}`}>
          <Zap className="w-4 h-4" />
          <span className="truncate w-full text-center">(+/-)</span>
        </button>
        <button type="button" onClick={() => {setTab('history'); setError(""); setSuccess("");}} className={`flex-1 min-w-[80px] flex flex-col items-center gap-1 p-3 text-xs font-medium transition ${tab === 'history' ? 'bg-gray-700 text-white border-b-2 border-gray-400' : 'text-gray-400 hover:bg-gray-800'}`}>
          <History className="w-4 h-4" />
          <span className="truncate w-full text-center">Histórico</span>
        </button>
        {hasSerialNumber && (
          <button type="button" onClick={() => {setTab('serials'); setError(""); setSuccess("");}} className={`flex-1 min-w-[80px] flex flex-col items-center gap-1 p-3 text-xs font-medium transition ${tab === 'serials' ? 'bg-purple-500/10 text-purple-400 border-b-2 border-purple-500' : 'text-gray-400 hover:bg-gray-800'}`}>
            <span className="font-mono text-sm leading-4">01</span>
            <span className="truncate w-full text-center">S/N</span>
          </button>
        )}
      </div>

      {error && <div className="text-sm text-red-400 bg-red-400/10 p-3 rounded mb-4">{error}</div>}
      {success && <div className="text-sm text-green-400 bg-green-400/10 p-3 rounded mb-4">{success}</div>}

      {tab === 'serials' ? (
        <div className="space-y-6">
           <div className="grid grid-cols-3 gap-2">
              <div className="bg-[#171717] p-3 rounded-lg border border-gray-700 text-center">
                 <div className="text-xl font-bold text-gray-300">{serials.length}</div>
                 <div className="text-[10px] uppercase text-gray-500 font-semibold tracking-wider">Total</div>
              </div>
              <div className="bg-[#171717] p-3 rounded-lg border border-green-500/20 text-center">
                 <div className="text-xl font-bold text-green-400">{serials.filter(s => s.status === 'AVAILABLE').length}</div>
                 <div className="text-[10px] uppercase text-gray-500 font-semibold tracking-wider">Disponíveis</div>
              </div>
              <div className="bg-[#171717] p-3 rounded-lg border border-red-500/20 text-center">
                 <div className="text-xl font-bold text-red-400">{serials.filter(s => s.status === 'SOLD').length}</div>
                 <div className="text-[10px] uppercase text-gray-500 font-semibold tracking-wider">Vendidos</div>
              </div>
           </div>

           <div>
             <label className="block text-sm font-medium text-gray-400 mb-1">Adicionar e-ou Bipar em Lote (um por linha)</label>
             <textarea 
               value={newSerialsText}
               onChange={(e) => setNewSerialsText(e.target.value)}
               className="w-full bg-[#171717] border border-purple-500/30 rounded-lg px-4 py-2 text-white outline-none focus:border-purple-400 min-h-[100px] font-mono"
               placeholder="S/N 1&#10;S/N 2&#10;S/N 3"
             ></textarea>
           </div>
           <div className="flex justify-end">
              <button 
                type="button" 
                onClick={async () => {
                  if (!newSerialsText.trim()) return;
                  setIsLoading(true);
                  setError(""); setSuccess("");
                  try {
                    const sns = newSerialsText.split('\n').filter(s => s.trim() !== '');
                    const res = await apiFetch(`/api/serials/${productId}/bulk`, {
                      method: "POST", body: JSON.stringify({ serialNumbers: sns })
                    });
                    if (res.ok) {
                      setSuccess("Números de série adicionados com sucesso.");
                      setNewSerialsText("");
                      fetchSerials();
                    } else {
                      const data = await res.json().catch(()=>({}));
                      setError(data.error || "Erro ao adicionar");
                    }
                  } catch (err:any) { setError(err.message); } finally { setIsLoading(false); }
                }}
                disabled={isLoading}
                className="bg-brand-gold text-brand-navydark px-4 py-2 rounded-lg font-bold hover:bg-brand-goldhover transition disabled:opacity-50"
              >
                {isLoading ? "Processando..." : "Salvar Números de Série"}
              </button>
           </div>
           
           <div className="mt-6 border-t border-gray-800 pt-6">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4">
                 <h4 className="text-sm font-medium text-gray-400">Gerenciamento de S/N</h4>
                 <input 
                   type="text"
                   value={searchSerial}
                   onChange={e => setSearchSerial(e.target.value)}
                   placeholder="Buscar S/N..."
                   className="bg-[#171717] border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-brand-gold w-full sm:w-48"
                 />
              </div>
              <div className="max-h-[250px] overflow-y-auto custom-scrollbar pr-2">
                 {serials.length === 0 && <p className="text-gray-500 text-sm">Nenhum cadastrado.</p>}
                 {serials.filter(s => s.serialNumber.toLowerCase().includes(searchSerial.toLowerCase())).map(s => (
                   <div key={s.id} className="flex justify-between items-center py-3 border-b border-gray-800">
                     <div>
                       <span className="text-white font-mono text-sm">{s.serialNumber}</span>
                       <span className={`ml-3 text-[10px] font-bold px-2 py-0.5 rounded ${s.status === 'AVAILABLE' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                         {s.status}
                       </span>
                     </div>
                     {s.status === 'AVAILABLE' && (
                        <button type="button" onClick={() => deleteSerial(s.id)} className="text-red-400 hover:text-red-300 text-xs px-2 py-1 font-bold">
                           Excluir
                        </button>
                     )}
                   </div>
                 ))}
              </div>
           </div>
        </div>
      ) : tab !== 'history' ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          {tab === 'add' && hasSerialNumber && (
             <div className="bg-purple-500/10 border border-purple-500/20 text-purple-400 p-3 rounded-lg text-sm mb-4">
                Este produto controla número de série. Ao adicionar estoque, informe os S/N correspondentes.
             </div>
          )}
          <div className="grid grid-cols-2 gap-4">
             <div>
               <label className="block text-sm font-medium text-gray-400 mb-1">
                 {tab === 'adjust' ? 'Nova Quantidade Real' : tab === 'move' ? "Quantidade (+ para Entrar, - para Sair)" : 'Quantidade'}
               </label>
               <input required type="number" min={tab === "move" ? undefined : "0"} value={quantity} onChange={(e) => setQuantity(e.target.value ? Number(e.target.value) : "")} className="w-full bg-[#171717] border border-gray-700 rounded-lg px-4 py-2 text-white outline-none focus:border-brand-gold" placeholder={tab === "move" ? "+5 ou -4" : "0"} />
             </div>
             {tab === 'add' && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">{moneyFieldLabel("Custo Unitário")} (Opcional)</label>
                  <input type="number" step="0.01" min="0" value={costPrice} onChange={(e) => setCostPrice(e.target.value ? Number(e.target.value) : "")} className="w-full bg-[#171717] border border-gray-700 rounded-lg px-4 py-2 text-white outline-none focus:border-brand-gold" />
                </div>
             )}
          </div>
          {tab === 'add' && (
             <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Lote {requiresLot && <span className="text-brand-gold">*</span>}</label>
                  <input type="text" value={lotNumber} onChange={(e) => setLotNumber(e.target.value.toUpperCase())} className="w-full bg-[#171717] border border-gray-700 rounded-lg px-4 py-2 text-white outline-none focus:border-brand-gold" placeholder="Nº do lote" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Validade</label>
                  <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="w-full bg-[#171717] border border-gray-700 rounded-lg px-4 py-2 text-white outline-none focus:border-brand-gold" />
                </div>
             </div>
          )}
          <div>
             <label className="block text-sm font-medium text-gray-400 mb-1">Motivo</label>
             <input required type="text" value={reason} onChange={(e) => setReason(e.target.value)} className="w-full bg-[#171717] border border-gray-700 rounded-lg px-4 py-2 text-white outline-none focus:border-brand-gold" placeholder="Motivo da movimentação" />
          </div>
          <div>
             <label className="block text-sm font-medium text-gray-400 mb-1">Observações (Opcional)</label>
             <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full bg-[#171717] border border-gray-700 rounded-lg px-4 py-2 text-white outline-none focus:border-brand-gold" />
          </div>

          {tab === 'add' && hasSerialNumber && quantity !== "" && Number(quantity) > 0 && (
            <div className="mt-4 p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl space-y-4">
               <div className="flex justify-between items-center">
                 <h4 className="font-bold text-purple-400">Escaneie os {quantity} Números de Série</h4>
                 <span className="text-xl font-mono text-purple-400 font-bold">{addSerialsList.length} / {quantity}</span>
               </div>
               
               {addSerialsList.length < Number(quantity) ? (
                 <input 
                   autoFocus 
                   type="text" 
                   value={addSerialInput} 
                   onChange={e => setAddSerialInput(e.target.value)} 
                   onKeyDown={handleAddSerialKeyDown}
                   className="w-full bg-[#171717] border-2 border-purple-500/50 rounded-xl px-4 py-3 text-lg font-mono text-white outline-none focus:border-purple-400 transition"
                   placeholder="Bipe ou digite o S/N e aperte Enter..." 
                 />
               ) : (
                 <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-3 rounded-lg text-center font-bold">
                    Todos os S/N registrados.
                 </div>
               )}

               {addSerialsList.length > 0 && (
                 <div className="max-h-[120px] overflow-y-auto custom-scrollbar flex flex-col gap-2">
                   {addSerialsList.map((s, idx) => (
                     <div key={idx} className="flex justify-between items-center bg-gray-800/50 p-2 rounded border border-gray-700/50">
                        <span className="font-mono text-sm text-gray-200">{s}</span>
                        <button type="button" onClick={() => setAddSerialsList(addSerialsList.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-300 text-xs font-bold px-2 py-1">Remover</button>
                     </div>
                   ))}
                 </div>
               )}
            </div>
          )}

          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-800">
             <button type="button" onClick={onClose} className="px-4 py-2 text-gray-400 hover:text-white transition">Cancelar</button>
             <button type="submit" disabled={isLoading || quantity === "" || (tab === "add" && hasSerialNumber && addSerialsList.length !== Number(quantity))} className="bg-brand-gold text-brand-navydark px-6 py-2 rounded-lg font-bold hover:bg-brand-goldhover transition disabled:opacity-50">
               Confirmar
             </button>
          </div>
        </form>
      ) : (
        <div className="space-y-4 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
          {history.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Nenhum histórico encontrado.</p>
          ) : history.map((item, i) => (
            <div key={i} className="bg-brand-navylight p-3 rounded-lg border border-gray-800 text-sm">
              <div className="flex justify-between items-start mb-2">
                <span className="font-semibold text-brand-gold">{item.movementType}</span>
                <span className="text-gray-500 text-xs">{new Date(item.createdAt).toLocaleString()}</span>
              </div>
              <div className="text-gray-300">
                <p><span className="text-gray-500">Qtd:</span> {item.quantity}</p>
                <p><span className="text-gray-500">Físico:</span> {item.beforePhysical} → {item.afterPhysical}</p>
                {item.reason && <p><span className="text-gray-500">Motivo:</span> {item.reason}</p>}
                {item.notes && <p><span className="text-gray-500">Obs:</span> {item.notes}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
