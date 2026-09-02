import React, { useEffect, useState } from "react";
import { PackageSearch, Check, AlertCircle, CheckCircle, Package, XCircle, RefreshCw } from "lucide-react";
import { useAuthStore } from "../stores/authStore";
import { apiFetch } from "../lib/api";
import { ConfirmModal } from "../components/ConfirmModal";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { cn } from "../lib/utils";

export function Separation() {
  const { user } = useAuthStore();
  const [queue, setQueue] = useState<any[]>([]);
  const [activeTask, setActiveTask] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [divergenceData, setDivergenceData] = useState<{itemId: string, quantity: number, notes: string} | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [openingTaskId, setOpeningTaskId] = useState<string | null>(null);

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchQueue = async () => {
    try {
      const res = await apiFetch("/api/separation/queue");
      if(res.ok) {
         setQueue(await res.json());
      }
    } catch(err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartTask = async (saleId: string) => {
     try {
       setErrorMsg("");
       setOpeningTaskId(saleId);
       const res = await apiFetch(`/api/separation/sales/${saleId}/start`, { method: "POST" });
       if (res.ok) {
          const { taskId } = await res.json();
          await fetchTaskDetails(taskId);
       } else {
          const e = await res.json().catch(()=>({}));
          setErrorMsg(e.error || "Erro ao iniciar separação");
       }
     } catch(err) {
       console.error(err);
       setErrorMsg("Erro ao conectar com o servidor.");
     } finally {
       setOpeningTaskId(null);
     }
  };

  const fetchTaskDetails = async (taskId: string) => {
     try {
       setOpeningTaskId(taskId);
       const res = await apiFetch(`/api/separation/tasks/${taskId}`);
       if (res.ok) {
          setActiveTask(await res.json());
       }
     } catch(err) {
       console.error(err);
       setErrorMsg("Erro ao abrir a separação.");
     } finally {
       setOpeningTaskId(null);
     }
  };

  const confirmItem = async (itemId: string, quantityExpected: number) => {
      try {
        const res = await apiFetch(`/api/separation/tasks/${activeTask.id}/items/${itemId}/confirm`, {
           method: "POST",
           body: JSON.stringify({ quantity: quantityExpected })
        });
        if (res.ok) {
           fetchTaskDetails(activeTask.id);
        }
      } catch(err) { console.error(err); }
  };

  const markDivergence = async () => {
     if(!divergenceData) return;
     try {
       const res = await apiFetch(`/api/separation/tasks/${activeTask.id}/items/${divergenceData.itemId}/divergence`, {
          method: "POST",
          body: JSON.stringify({ quantity: divergenceData.quantity, notes: divergenceData.notes })
       });
       if(res.ok) {
          setDivergenceData(null);
          fetchTaskDetails(activeTask.id);
       }
     } catch(err) { console.error(err); }
  };

  const completeTask = async () => {
     try {
        const res = await apiFetch(`/api/separation/tasks/${activeTask.id}/complete`, { method: "POST" });
        if(res.ok) {
           setActiveTask(null);
           fetchQueue();
        } else {
           const e = await res.json().catch(()=>({}));
           setErrorMsg(e.error || "Erro ao finalizar separação");
        }
     } catch(err) { console.error(err); }
  };

  const cancelTask = async () => {
     if (!activeTask || isCanceling) return;

     try {
        setIsCanceling(true);
        setErrorMsg("");
        const res = await apiFetch(`/api/separation/tasks/${activeTask.id}/cancel`, { method: "POST" });
        if (res.ok) {
           setShowCancelConfirm(false);
           setActiveTask(null);
           fetchQueue();
        } else {
           const e = await res.json().catch(() => ({}));
           setErrorMsg(e.error || "Erro ao cancelar separação");
        }
     } catch (err) {
        console.error(err);
        setErrorMsg("Erro ao conectar com o servidor.");
     } finally {
        setIsCanceling(false);
     }
  };

  if (activeTask) {
     const hasPending = activeTask.items.some((i: any) => i.status === "PENDING");
     
     return (
       <div className="space-y-6">
         <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-2xl font-semibold text-white flex items-center gap-2">
               <PackageSearch className="text-brand-gold" />
               Separando Pedido
            </h2>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <Button variant="outline" className="border-red-800/60 bg-red-950/50 text-red-300 hover:bg-red-950/50 hover:text-white dark:border-red-800/60 dark:bg-red-950/50 dark:hover:bg-red-950/50" onClick={() => setShowCancelConfirm(true)}>
                <XCircle className="w-4 h-4" /> Cancelar Separação
              </Button>
              <Button variant="ghost" className="bg-gray-800 text-gray-400 hover:bg-gray-800 hover:text-white dark:hover:bg-gray-800" onClick={() => {setActiveTask(null); fetchQueue();}}>Voltar à Fila</Button>
            </div>
         </div>

         {errorMsg && <div className="text-sm text-red-400 bg-red-400/10 p-4 rounded-lg">{errorMsg}</div>}

         <div className="grid gap-4">
            {activeTask.items.map((i: any) => (
               <Card key={i.id} className={cn("flex flex-col items-center gap-4 py-0 transition-all sm:flex-row", i.status === "SEPARATED" ? "border-green-800/50 bg-green-900/20" : i.status === "DIVERGENT" ? "border-red-800/50 bg-red-900/20" : "")}>
                 <CardContent className="flex w-full flex-col items-center gap-4 p-4 sm:flex-row">
                  <div className="w-16 h-16 rounded bg-[#171717] flex items-center justify-center shrink-0">
                     <span className="text-2xl font-bold text-gray-300">{i.quantityExpected}</span>
                  </div>
                  <div className="flex-1 w-full text-center sm:text-left">
                     <p className="font-semibold text-white text-lg">{i.productName}</p>
                     <div className="text-sm text-gray-400 flex flex-wrap gap-x-4 items-center justify-center sm:justify-start">
                        <span>SKU: <strong className="text-brand-gold">{i.sku}</strong></span>
                        {i.upc && <span>UPC: <strong className="text-gray-200">{i.upc}</strong></span>}
                     </div>
                     <div className="mt-2 flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                        <Badge variant="outline" className="border-primary/30 text-primary uppercase">
                           Prateleira: {i.shelfName || "N/A"}
                        </Badge>
                        {i.reservedStock !== undefined && (
                           <Badge variant="info" className="uppercase">
                              Reservado: {i.reservedStock}
                           </Badge>
                        )}
                        <Badge variant="secondary" className="uppercase">
                           Qtd Vendida: {i.quantityExpected}
                        </Badge>
                     </div>
                  </div>

                  <div className="w-full sm:w-auto flex flex-col gap-2 shrink-0">
                     {i.status === "PENDING" && (
                        <>
                           <Button className="h-auto bg-green-600 px-6 py-3 has-[>svg]:px-6 font-bold text-white hover:bg-green-500" onClick={() => confirmItem(i.id, i.quantityExpected)}>
                              <CheckCircle className="size-5" /> Confirmar
                           </Button>
                           <Button variant="link" className="h-auto gap-1 p-0 py-2 has-[>svg]:p-0 text-xs text-red-400 underline hover:text-red-300" onClick={() => setDivergenceData({itemId: i.id, quantity: 0, notes: ''})}>
                              <AlertCircle className="size-3" /> Informar Falta / Divergência
                           </Button>
                        </>
                     )}
                     {i.status === "SEPARATED" && (
                        <Card className="border-green-500/20 bg-green-500/10 py-0 font-bold text-green-400"><CardContent className="flex items-center gap-2 px-6 py-3"><Check className="w-5 h-5" /> Separado</CardContent></Card>
                     )}
                     {i.status === "DIVERGENT" && (
                        <Card className="border-red-500/20 bg-red-500/10 py-0 font-bold text-red-400"><CardContent className="flex items-center gap-2 px-6 py-3"><AlertCircle className="w-5 h-5" /> Divergência</CardContent></Card>
                     )}
                  </div>
                 </CardContent>
               </Card>
            ))}
         </div>
         
         <div className="mt-8 flex justify-end">
            <Button
              className="h-auto rounded-xl px-8 py-4 text-lg font-bold shadow-lg shadow-primary/20"
              disabled={hasPending}
              onClick={completeTask}
            >
              Finalizar Separação
            </Button>
         </div>

         {/* Divergence Modal */}
         {divergenceData && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
               <div className="bg-brand-navylight w-full max-w-sm rounded-2xl shadow-xl overflow-hidden border border-gray-800">
                  <div className="p-6">
                     <h3 className="text-xl font-semibold text-white mb-4">Reportar Divergência</h3>
                     <div className="space-y-4">
                        <div>
                           <label className="block text-sm text-gray-400 mb-1">Qtd Encontrada (Real)</label>
                           <input type="number" value={divergenceData.quantity} onChange={e => setDivergenceData({...divergenceData, quantity: Number(e.target.value)})} className="w-full bg-[#171717] border border-gray-700 rounded-lg px-4 py-2 text-white outline-none focus:border-brand-gold" />
                        </div>
                        <div>
                           <label className="block text-sm text-gray-400 mb-1">Motivo / Notas</label>
                           <input type="text" value={divergenceData.notes} onChange={e => setDivergenceData({...divergenceData, notes: e.target.value})} className="w-full bg-[#171717] border border-gray-700 rounded-lg px-4 py-2 text-white outline-none focus:border-brand-gold" placeholder="Ex: Produto não está na prateleira" />
                        </div>
                        <div className="flex gap-3 pt-4 border-t border-gray-800 mt-6">
                           <Button variant="secondary" className="flex-1" onClick={() => setDivergenceData(null)}>Cancelar</Button>
                           <Button variant="destructive" className="flex-1" onClick={markDivergence}>Confirmar</Button>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         )}

         <ConfirmModal
           isOpen={showCancelConfirm}
           onClose={() => !isCanceling && setShowCancelConfirm(false)}
           onConfirm={cancelTask}
           title="Cancelar separação"
           message="A venda voltará para a fila como pendente e poderá ser separada depois."
           confirmText="Cancelar Separação"
           confirmingText="Cancelando..."
           confirmAsDeleting={isCanceling}
         />
       </div>
     );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
         <h2 className="text-2xl font-semibold text-white flex items-center gap-2">
            <PackageSearch className="text-brand-gold" />
            Fila de Separação
         </h2>
         <Button variant="outline" className="border-gray-700 bg-[#171717] text-sm text-gray-300 hover:bg-[#171717] hover:text-white dark:border-gray-700 dark:bg-[#171717] dark:hover:bg-[#171717]" onClick={fetchQueue}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Atualizar Fila
         </Button>
      </div>

      {loading ? (
         <div className="text-center py-10 text-gray-500">Carregando fila...</div>
      ) : queue.length === 0 ? (
         <Card className="py-0 text-center shadow-lg">
           <CardContent className="p-16">
            <div className="w-20 h-20 bg-[#171717] rounded-full flex items-center justify-center mx-auto mb-6 border border-gray-700">
               <Package className="w-10 h-10 text-brand-gold opacity-50" />
            </div>
            <h3 className="text-xl font-medium text-gray-300 mb-2">Fila Vazia</h3>
            <p className="text-gray-500">Não há pedidos aguardando separação neste momento.</p>
           </CardContent>
         </Card>
      ) : (
         <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {queue.map(s => (
               <Card
                 key={s.id}
                 className="group cursor-pointer border-gray-700 py-0 shadow-md transition hover:border-primary/50"
                 onClick={() => openingTaskId ? null : (s.taskId ? fetchTaskDetails(s.taskId) : handleStartTask(s.id))}
               >
                 <CardContent className="flex flex-col gap-5 p-5">
                  <div className="flex items-start justify-between">
                     <div>
                        <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Venda #{s.number}</div>
                        <div className="text-sm font-medium text-white">{new Date(s.createdAt).toLocaleString()}</div>
                     </div>
                     <Badge variant={s.taskStatus === 'IN_PROGRESS' ? 'info' : 'warning'} className="uppercase">
                        {s.taskStatus === 'IN_PROGRESS' ? 'Em Separação' : 'Aguardando'}
                     </Badge>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full border-gray-600 bg-[#171717] font-medium text-gray-300 group-hover:border-primary/50 group-hover:text-primary hover:bg-[#171717] hover:text-gray-300 dark:border-gray-600 dark:bg-[#171717] dark:hover:bg-[#171717]"
                    onClick={(e) => { e.stopPropagation(); openingTaskId ? null : (s.taskId ? fetchTaskDetails(s.taskId) : handleStartTask(s.id)); }}
                  >
                     {openingTaskId === s.id || openingTaskId === s.taskId ? 'Abrindo...' : (s.taskId ? 'Continuar Separação' : 'Iniciar Separação')}
                  </Button>
                 </CardContent>
               </Card>
            ))}
         </div>
      )}
    </div>
  );
}
