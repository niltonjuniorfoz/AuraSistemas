import React, { useState, useEffect, useRef } from 'react';
import { Keyboard, Save, RotateCcw, AlertTriangle, Edit2, X } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { cn } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { badgeVariants } from '../../components/ui/badge';
import { Card } from '../../components/ui/card';

const defaultShortcuts = {
  focusProductSearch: "F2",
  focusCustomerSearch: "F3",
  togglePriceTable: "F4",
  focusQuantity: "F6",
  finishSale: "F8",
  clearCart: "F9",
  cancelAction: "Escape",
  confirmAction: "Enter",
  removeCartItem: "Delete",
  increaseQuantity: "+",
  decreaseQuantity: "-",
  navigateUp: "ArrowUp",
  navigateDown: "ArrowDown"
};

const actionDescriptions: Record<string, string> = {
  focusProductSearch: "Focar busca de produto",
  focusCustomerSearch: "Focar busca de cliente",
  togglePriceTable: "Alternar tabela A/B",
  focusQuantity: "Editar quantidade do item selecionado",
  finishSale: "Finalizar venda",
  clearCart: "Limpar carrinho",
  cancelAction: "Cancelar / Fechar modal",
  confirmAction: "Confirmar / Selecionar",
  removeCartItem: "Remover item do carrinho",
  increaseQuantity: "Aumentar quantidade",
  decreaseQuantity: "Diminuir quantidade",
  navigateUp: "Navegar acima",
  navigateDown: "Navegar abaixo"
};

const reservedKeys = [
  "Ctrl+R", "Ctrl+W", "Alt+F4", "F5", "Ctrl+L"
];

export function Shortcuts() {
  const [shortcuts, setShortcuts] = useState<Record<string, string>>(defaultShortcuts);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [editingAction, setEditingAction] = useState<string | null>(null);
  const [tempKey, setTempKey] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadShortcuts();
  }, []);

  const loadShortcuts = async () => {
    setLoading(true);
    try {
      // Stub until backend is ready if needed, or if we want to add an endpoint we will fetch it
      const res = await apiFetch('/api/settings/shortcuts');
      if (res.ok) {
        const data = await res.json();
        if (data.shortcuts && Object.keys(data.shortcuts).length > 0) {
           setShortcuts({ ...defaultShortcuts, ...data.shortcuts });
        }
      }
    } catch (error) {
      console.log('Using default shortcuts');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      const res = await apiFetch('/api/settings/shortcuts', {
        method: "PUT",
        body: JSON.stringify({ shortcuts })
      });
      if (res.ok) {
        alert("Atalhos salvos com sucesso.");
      } else {
        alert("Erro ao salvar.");
      }
    } catch (error) {
      console.error(error);
      alert("Erro ao conectar.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm("Tem certeza que deseja restaurar os atalhos para o padrão?")) return;
    setShortcuts(defaultShortcuts);
    setIsSaving(true);
    try {
      await apiFetch('/api/settings/shortcuts/reset', { method: "POST" });
      alert("Atalhos restaurados.");
    } catch (error) {
    } finally {
      setIsSaving(false);
    }
  };

  const startEdit = (action: string, evt: React.MouseEvent) => {
    evt.preventDefault();
    setEditingAction(action);
    setTempKey("");
    setTimeout(() => {
      if (inputRef.current) inputRef.current.focus();
    }, 50);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.key === 'Escape') {
      setEditingAction(null);
      return;
    }

    if (e.key === 'Tab' || e.key === 'Shift') return; // ignore lone modifiers

    let keyStr = e.key;
    if (e.ctrlKey && e.key !== 'Control') keyStr = `Ctrl+${e.key.toUpperCase()}`;
    if (e.altKey && e.key !== 'Alt') keyStr = `Alt+${e.key.toUpperCase()}`;
    if (e.shiftKey && e.key !== 'Shift') keyStr = `Shift+${e.key.toUpperCase()}`;

    // Standardize some names
    if (keyStr === ' ') keyStr = 'Space';
    if (keyStr.length === 1 && keyStr === keyStr.toLowerCase()) keyStr = keyStr.toUpperCase(); // F8, F2 etc are already > 1 char

    if (reservedKeys.includes(keyStr)) {
      alert("Este atalho é reservado pelo navegador/sistema e não pode ser usado.");
      return;
    }

    // Check duplicates
    const conflict = Object.entries(shortcuts).find(([k, v]) => v === keyStr && k !== editingAction);
    if (conflict) {
      alert(`Este atalho já está sendo usado por: ${actionDescriptions[conflict[0]]}`);
      return;
    }

    setShortcuts(prev => ({ ...prev, [editingAction as string]: keyStr }));
    setEditingAction(null);
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
          <Keyboard className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-white">Atalhos do Sistema</h2>
          <p className="text-gray-400 text-sm">Personalize os comandos de teclado do Ponto de Venda e do sistema.</p>
        </div>
      </div>

      <Card className="gap-0 overflow-hidden rounded-xl border-gray-800 bg-[#171717] py-0 shadow-md">
         <div className="p-4 bg-[#171717] border-b border-gray-800 flex justify-between items-center">
            <h3 className="font-semibold text-white text-lg">Ponto de Venda (PDV)</h3>
            <div className="flex gap-3">
               <Button
                 type="button"
                 variant="outline"
                 onClick={handleReset}
                 className="h-auto gap-2 rounded border-gray-800 bg-[#171717] px-3 py-1.5 text-sm text-gray-400 shadow-none transition hover:bg-[#171717] hover:text-white dark:border-gray-800 dark:bg-[#171717] dark:hover:bg-[#171717] dark:hover:text-white"
               >
                 <RotateCcw className="size-4" /> Restaurar Padrão
               </Button>
               <Button
                 type="button"
                 onClick={handleSaveAll}
                 disabled={isSaving}
                 className="h-auto gap-2 rounded bg-brand-gold px-4 py-1.5 has-[>svg]:px-4 text-sm font-bold text-brand-navydark hover:bg-brand-goldhover"
               >
                 <Save className="size-4" /> {isSaving ? "Salvando..." : "Salvar Configurações"}
               </Button>
            </div>
         </div>

         {loading ? (
           <div className="h-64 flex items-center justify-center text-gray-500">Carregando atalhos...</div>
         ) : (
           <div className="divide-y divide-gray-800">
             <div className="grid grid-cols-12 px-6 py-3 bg-brand-navydark/50 text-xs font-semibold uppercase tracking-wider text-gray-400">
                <div className="col-span-6">Ação</div>
                <div className="col-span-4">Atalho Atual</div>
                <div className="col-span-2 text-right">Editar</div>
             </div>
             
             {Object.keys(defaultShortcuts).map((actionKey) => {
               const desc = actionDescriptions[actionKey] || actionKey;
               const currentKey = shortcuts[actionKey];
               const isEditing = editingAction === actionKey;

               return (
                 <div key={actionKey} className="grid grid-cols-12 px-6 py-4 items-center hover:bg-brand-navy transition">
                    <div className="col-span-6 text-gray-300 font-medium">{desc}</div>
                    <div className="col-span-4">
                      {isEditing ? (
                        <div className="relative inline-block">
                           <input 
                             ref={inputRef}
                             type="text" 
                             readOnly
                             onKeyDown={handleKeyDown}
                             onBlur={() => setEditingAction(null)}
                             placeholder="Pressione a tecla..."
                             className="bg-[#171717] border border-brand-gold rounded px-3 py-1.5 text-brand-gold font-mono text-sm shadow-[0_0_10px_rgba(212,175,55,0.2)] focus:outline-none w-48"
                           />
                           <div className="absolute right-2 top-2">
                             <span className="flex h-2 w-2 relative">
                               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-gold opacity-75"></span>
                               <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-gold"></span>
                             </span>
                           </div>
                        </div>
                      ) : (
                        <kbd className={cn(badgeVariants({ variant: "outline" }), "rounded border-gray-700 bg-[#171717] px-2.5 py-1 text-sm font-mono font-normal text-white shadow-sm")}>{currentKey}</kbd>
                      )}
                    </div>
                    <div className="col-span-2 text-right">
                       {!isEditing ? (
                         <Button
                           type="button"
                           variant="ghost"
                           size="icon-sm"
                           onClick={(e) => startEdit(actionKey, e)}
                           className="rounded text-gray-400 hover:bg-brand-gold/10 hover:text-brand-gold dark:hover:bg-brand-gold/10 dark:hover:text-brand-gold"
                         >
                           <Edit2 className="size-4" />
                         </Button>
                       ) : (
                         <Button
                           type="button"
                           variant="ghost"
                           size="icon-sm"
                           onClick={() => setEditingAction(null)}
                           className="rounded text-gray-400 hover:bg-red-400/10 hover:text-red-400 dark:hover:bg-red-400/10 dark:hover:text-red-400"
                         >
                           <X className="size-4" />
                         </Button>
                       )}
                    </div>
                 </div>
               );
             })}
           </div>
         )}
      </Card>

      <div className="border border-brand-gold/20 rounded-xl p-4 flex gap-3 text-brand-gold/80 bg-brand-gold/5">
        <AlertTriangle className="w-5 h-5 shrink-0" />
        <div className="text-sm">
           <strong className="font-semibold block mb-1">Importante:</strong>
           Alguns atalhos (como F5, Ctrl+R, ou Alt+F4) são bloqueados por padrão pois interferem diretamente com a navegação do sistema operacional ou do navegador.
        </div>
      </div>
    </div>
  );
}
