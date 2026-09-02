import React from "react";
import { Bot, Copy, Loader2, X } from "lucide-react";

interface AiReportModalProps {
  isOpen: boolean;
  title: string;
  loading: boolean;
  content: string;
  error?: string;
  onClose: () => void;
}

export function AiReportModal({ isOpen, title, loading, content, error, onClose }: AiReportModalProps) {
  if (!isOpen) return null;

  const copy = async () => {
    if (!content) return;
    await navigator.clipboard?.writeText(content);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-gray-700 bg-brand-navylight shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-800 bg-brand-navydark/70 px-5 py-4">
          <h3 className="flex items-center gap-2 text-lg font-bold text-white">
            <Bot className="h-5 w-5 text-brand-gold" />
            {title}
          </h3>
          <button onClick={onClose} className="rounded-lg p-2 text-gray-400 transition hover:bg-white/10 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex min-h-[16rem] flex-col items-center justify-center gap-3 text-brand-gold">
              <Loader2 className="h-9 w-9 animate-spin" />
              <p className="text-sm font-semibold">Gerando análise com IA...</p>
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">{error}</div>
          ) : (
            <pre className="whitespace-pre-wrap rounded-xl border border-gray-800 bg-brand-navydark/70 p-4 text-sm leading-relaxed text-gray-100">
              {content || "Nenhuma análise gerada."}
            </pre>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-800 bg-brand-navydark/40 p-4">
          <button onClick={copy} disabled={!content || loading} className="flex items-center gap-2 rounded-lg border border-gray-700 px-4 py-2 text-sm font-semibold text-gray-200 transition hover:border-brand-gold hover:text-brand-gold disabled:opacity-50">
            <Copy className="h-4 w-4" /> Copiar
          </button>
          <button onClick={onClose} className="rounded-lg bg-brand-gold px-5 py-2 text-sm font-bold text-brand-navydark transition hover:bg-brand-goldhover">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
