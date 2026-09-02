import React, { useEffect, useRef, useState } from "react";
import { Paperclip, Send, X, FileText, ImageIcon } from "lucide-react";
import { toast } from "./Toast";

interface PaymentProofProps {
  saleLabel: string;      // ex.: "Venda 001-000015"
  amountLabel: string;    // ex.: "R$ 100,00"
  gatewayNumber?: string; // WhatsApp fixo do gateway (só dígitos ou com máscara)
}

const ACCEPT = "image/*,application/pdf";

function onlyDigits(v: string) { return String(v || "").replace(/\D/g, ""); }
function toWa(num: string) { let d = onlyDigits(num); if (!d) return ""; if (d.length <= 11) d = "55" + d; return d; }

export function PaymentProof({ saleLabel, amountLabel, gatewayNumber }: PaymentProofProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const applyFile = (f: File | null | undefined) => {
    if (!f) return;
    const okType = f.type.startsWith("image/") || f.type === "application/pdf";
    if (!okType) { toast.error("Formato não suportado. Use imagem (JPG/PNG) ou PDF."); return; }
    if (f.size > 20 * 1024 * 1024) { toast.error("Arquivo muito grande (máx. 20 MB)."); return; }
    setFile(f);
    setPreviewUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return f.type.startsWith("image/") ? URL.createObjectURL(f) : ""; });
  };

  const clear = () => { setPreviewUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return ""; }); setFile(null); if (inputRef.current) inputRef.current.value = ""; };

  // Colar com Ctrl+V (imagem ou PDF do clipboard).
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const it of Array.from(items)) {
        if (it.kind === "file" && (it.type.startsWith("image/") || it.type === "application/pdf")) {
          const f = it.getAsFile();
          if (f) { applyFile(f); e.preventDefault(); toast.success("Comprovante colado."); return; }
        }
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const share = async () => {
    if (!file) { toast.info("Anexe o comprovante primeiro."); return; }
    const text = `Comprovante ${saleLabel} — ${amountLabel}`;
    const navAny = navigator as any;
    // Celular / PWA: compartilha o arquivo pelo menu nativo (ela escolhe o WhatsApp/contato).
    if (navAny.canShare && navAny.canShare({ files: [file] })) {
      try { await navAny.share({ files: [file], text, title: text }); return; } catch { /* cancelado */ return; }
    }
    // Desktop: baixa o arquivo e abre o WhatsApp já no número do gateway para anexar.
    const url = URL.createObjectURL(file);
    const a = document.createElement("a"); a.href = url; a.download = file.name || "comprovante"; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    const num = toWa(gatewayNumber || "");
    const wa = num ? `https://wa.me/${num}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(wa, "_blank");
    toast.info("Comprovante baixado. Anexe no WhatsApp que abriu.");
  };

  return (
    <div>
      <label className="block text-xs font-medium text-gray-400 mb-1">Comprovante do cliente (opcional)</label>
      {!file ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); applyFile(e.dataTransfer.files?.[0]); }}
          onClick={() => inputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed px-4 py-4 text-center transition ${dragOver ? "border-brand-gold bg-brand-gold/5" : "border-gray-700 bg-[#171717] hover:border-brand-gold/50"}`}
        >
          <Paperclip className="h-5 w-5 text-gray-500" />
          <div className="text-sm text-gray-300">Cole (Ctrl+V), arraste ou clique para anexar</div>
          <div className="text-[11px] text-gray-500">Imagem (JPG/PNG) ou PDF</div>
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-lg border border-gray-700 bg-[#171717] p-2.5">
          {previewUrl ? (
            <img src={previewUrl} alt="Comprovante" className="h-14 w-14 rounded object-cover border border-gray-700" />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded bg-[#171717] border border-gray-700">
              {file.type === "application/pdf" ? <FileText className="h-6 w-6 text-red-300" /> : <ImageIcon className="h-6 w-6 text-gray-400" />}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm text-gray-200">{file.name || "comprovante"}</div>
            <div className="text-[11px] text-gray-500">{(file.size / 1024).toFixed(0)} KB</div>
          </div>
          <button type="button" onClick={clear} title="Remover" className="text-gray-500 hover:text-red-300 p-1"><X className="h-4 w-4" /></button>
        </div>
      )}

      <input ref={inputRef} type="file" accept={ACCEPT} className="hidden" onChange={(e) => applyFile(e.target.files?.[0])} />

      <button
        type="button"
        onClick={share}
        disabled={!file}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-green-600/90 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-green-600 disabled:cursor-not-allowed disabled:bg-gray-800 disabled:text-gray-500"
      >
        <Send className="h-4 w-4" /> Enviar comprovante por WhatsApp
      </button>
      {gatewayNumber && <p className="mt-1 text-[11px] text-gray-500">Enviar para o gateway: {gatewayNumber}</p>}
    </div>
  );
}
