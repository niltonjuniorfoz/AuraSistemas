import React from "react";
import { Loader2, X } from "lucide-react";

// Casca comum de todo painel de edição (backdrop + card + cabeçalho com X +
// botão Salvar com spinner). Extraído depois que o 3º/4º painel (banners e
// banner lateral) repetiriam o mesmo bloco de ~15 linhas que já existia em
// TextPanel e HowToBuyPanel — cada painel continua dono do próprio estado e
// da própria lógica de salvar/resincronizar, só a moldura visual é comum.
//
// `onSave` é opcional: painéis que salvam tudo de uma vez (rascunho local +
// botão Salvar) passam ele e ganham o rodapé. Painéis de CRUD ao vivo (ex.
// CategoriesPanel) não têm nada pra "salvar em lote" — cada ação já persiste
// na hora — então omitem `onSave` e ficam sem rodapé, sem forçar um botão
// Salvar que não corresponde a nenhuma ação real.
export function PanelShell({
  title,
  onClose,
  onSave,
  saving,
  wide,
  children,
}: {
  title: string;
  onClose: () => void;
  onSave?: () => void;
  saving?: boolean;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-stone-900/50 p-4" onClick={onClose}>
      <div
        className={`max-h-[85vh] w-full ${wide ? "max-w-lg" : "max-w-md"} overflow-y-auto rounded-xl bg-white p-4 shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold text-stone-900">{title}</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700"><X className="h-4 w-4" /></button>
        </div>
        {children}
        {onSave && (
          <button
            onClick={onSave}
            disabled={saving}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 py-2 text-sm font-bold text-stone-900 hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Salvar
          </button>
        )}
      </div>
    </div>
  );
}
