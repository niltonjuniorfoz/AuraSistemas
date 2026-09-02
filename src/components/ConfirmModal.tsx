import React from "react";
import { Modal } from "./Modal";
import { AlertTriangle } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmAsDeleting?: boolean;
}

export function ConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Confirmar arquivamento", 
  message = "Tem certeza que deseja arquivar este registro?",
  confirmAsDeleting = false,
  confirmText = "Arquivar",
  confirmingText = "Arquivando..."
}: ConfirmModalProps & { confirmText?: string; confirmingText?: string; }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 text-gray-300">
          <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
          </div>
          <p>{message}</p>
        </div>
        <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-800">
          <button 
            type="button" 
            onClick={onClose} 
            className="px-4 py-2 text-gray-400 hover:text-white transition"
          >
            Cancelar
          </button>
          <button 
            type="button"
            onClick={onConfirm}
            disabled={confirmAsDeleting}
            className="bg-yellow-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-yellow-700 transition disabled:opacity-50"
          >
            {confirmAsDeleting ? confirmingText : confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}
