import React, { useState } from "react";
import { Modal } from "./Modal";
import { AlertCircle } from "lucide-react";

interface HardDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  isDeleting?: boolean;
}

export function HardDeleteModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Excluir definitivamente", 
  isDeleting = false
}: HardDeleteModalProps) {
  const [confirmText, setConfirmText] = useState("");

  const handleClose = () => {
    setConfirmText("");
    onClose();
  };

  const handleConfirm = () => {
    if (confirmText === "EXCLUIR") {
      onConfirm();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title}>
      <div className="flex flex-col gap-4">
        <div className="flex gap-3 text-red-300 bg-red-500/10 p-4 rounded-xl border border-red-500/20">
          <AlertCircle className="w-6 h-6 shrink-0 text-red-500" />
          <div className="text-sm">
            <p className="font-medium text-red-400 mb-1">Essa ação não poderá ser desfeita.</p>
            <p className="text-red-300/80">O registro será removido permanentemente do banco de dados. Se houver vínculos importantes, a exclusão será bloqueada.</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">
            Digite <span className="font-bold text-white">EXCLUIR</span> para confirmar
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="w-full bg-brand-navydark border border-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-red-500 transition-colors"
            placeholder="EXCLUIR"
          />
        </div>

        <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-800">
          <button 
            type="button" 
            onClick={handleClose} 
            className="px-4 py-2 text-gray-400 hover:text-white transition"
          >
            Cancelar
          </button>
          <button 
            type="button"
            onClick={handleConfirm}
            disabled={confirmText !== "EXCLUIR" || isDeleting}
            className="bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition disabled:opacity-50"
          >
            {isDeleting ? "Excluindo..." : "Excluir Definitivamente"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
