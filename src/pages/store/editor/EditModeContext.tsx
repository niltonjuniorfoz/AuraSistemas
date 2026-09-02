import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { apiFetch } from "../../../lib/api";
import { toast } from "../../../components/Toast";

type EditModeValue = {
  active: boolean;
  draft: any;
  dirty: boolean;
  openPanel: (key: string) => void;
  activePanel: string | null;
  closePanel: () => void;
  // Aceita o objeto do patch direto OU uma função (draft) => patch, avaliada
  // só na hora de RODAR na fila — ver comentário do patchDraft abaixo.
  // Função que retorna null/undefined = no-op: não manda PATCH, não marca dirty.
  patchDraft: (partial: any | ((draft: any) => any)) => Promise<boolean>;
  reload: () => Promise<void>;
};

const EditModeContext = createContext<EditModeValue | null>(null);

export function useEditMode() {
  return useContext(EditModeContext); // null fora do editor — <Editable> trata isso como passthrough
}

export function EditModeProvider({ children }: { children: React.ReactNode }) {
  const [draft, setDraft] = useState<any>(null);
  const [dirty, setDirty] = useState(false);
  const [activePanel, setActivePanel] = useState<string | null>(null);
  // Espelho SÍNCRONO do draft: atualizado junto de cada setDraft (não dá pra
  // esperar o re-render — um job da fila pode rodar antes do React flushar) e
  // reforçado pelo efeito abaixo. É daqui que payloads em função leem o draft
  // fresco na hora de rodar na fila.
  const draftRef = useRef<any>(null);
  useEffect(() => { draftRef.current = draft; }, [draft]);

  const reload = useCallback(async () => {
    try {
      const res = await apiFetch("/api/store/admin/config/draft");
      if (res.ok) {
        const j = await res.json();
        draftRef.current = j; setDraft(j); setDirty(false);
        return;
      }
      toast.error("Erro ao carregar rascunho da loja.");
    } catch (e: any) {
      toast.error(e.message || "Erro ao carregar rascunho da loja.");
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const sendPatch = useCallback(async (partial: any) => {
    try {
      const res = await apiFetch("/api/store/admin/config/draft", { method: "PATCH", body: JSON.stringify(partial) });
      if (res.ok) {
        const j = await res.json();
        draftRef.current = j; setDraft(j); setDirty(true);
        return true;
      }
      toast.error("Erro ao salvar alteração do rascunho.");
      return false;
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar alteração do rascunho.");
      return false;
    }
  }, []);

  // Todo PATCH passa por UMA fila: cada envio só dispara depois do anterior
  // assentar. Sem isso, duas ações inline em elementos DIFERENTES em sequência
  // (cada toolbar tem seu próprio busy) liam o draft pré-patch e mandavam
  // `pages.home.sections` completo — a segunda revertia a primeira em silêncio
  // (o servidor troca o array inteiro). Serializar o envio não basta: o
  // payload calculado no CLIQUE já nasceria velho — por isso payload em função
  // é avaliado aqui dentro, contra draftRef.current, na hora de rodar.
  const queueRef = useRef<Promise<unknown>>(Promise.resolve());
  const patchDraft = useCallback((partialOrFn: any | ((draft: any) => any)) => {
    const p = queueRef.current.then(() => {
      const partial = typeof partialOrFn === "function" ? partialOrFn(draftRef.current) : partialOrFn;
      if (partial == null) return false; // no-op sinalizado pelo caller — nada a salvar
      return sendPatch(partial);
    });
    queueRef.current = p.catch(() => {});
    return p;
  }, [sendPatch]);

  if (!draft) return <div className="flex min-h-screen items-center justify-center text-stone-400">Carregando rascunho...</div>;

  return (
    <EditModeContext.Provider value={{
      active: true, draft, dirty,
      openPanel: setActivePanel, activePanel, closePanel: () => setActivePanel(null),
      patchDraft, reload,
    }}>
      {children}
    </EditModeContext.Provider>
  );
}
