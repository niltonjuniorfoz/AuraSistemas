import React, { useState } from 'react';
import { X, Printer, FileText, Mail, Loader2, MessageCircle } from 'lucide-react';
import { apiFetch } from '../lib/api';

function onlyDigits(v: string) {
  return String(v || '').replace(/\D/g, '');
}

// Monta o número no formato internacional para o wa.me. Assume Brasil (55) quando
// o número vier sem código do país.
function toWhatsAppNumber(phone: string) {
  let d = onlyDigits(phone);
  if (!d) return '';
  if (d.length <= 11) d = '55' + d; // DDD + número, sem país
  return d;
}

function money(v: any) {
  const n = Number(v) || 0;
  return `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface ReceiptModalProps {
  saleId: string | null;
  saleNumber?: string;
  onClose: () => void;
}

export function ReceiptModal({ saleId, saleNumber, onClose }: ReceiptModalProps) {
  const [loading, setLoading] = useState(false);
  const [printHelper, setPrintHelper] = useState('');
  const [emailTo, setEmailTo] = useState("");
  const [emailMsg, setEmailMsg] = useState("");
  const [showEmailState, setShowEmailState] = useState(false);
  const [sending, setSending] = useState(false);
  const [waLoading, setWaLoading] = useState(false);

  if (!saleId) return null;

  const handleWhatsApp = async () => {
    setWaLoading(true);
    try {
      const [saleRes, companyRes] = await Promise.all([
        apiFetch(`/api/sales/${saleId}`),
        apiFetch(`/api/settings/company-public`),
      ]);
      if (!saleRes.ok) throw new Error('Não foi possível carregar a venda.');
      const sale = await saleRes.json();
      const company = companyRes.ok ? await companyRes.json() : {};
      const empresa = company.tradeName || company.companyName || 'Sua loja';

      const numero = `${sale.series || '001'}-${String(sale.number).padStart(6, '0')}`;
      const data = sale.createdAt ? new Date(sale.createdAt).toLocaleDateString('pt-BR') : '';
      const itens = (sale.items || [])
        .map((it: any) => `• ${it.productName} x${it.quantity} — ${money(it.totalPrice)}`)
        .join('\n');
      const pago = sale.paymentStatus === 'PAID' ? '✅ Pago' : sale.paymentStatus === 'PARTIAL' ? '🔸 Pagamento parcial' : '⏳ Pagamento pendente';

      const linhas = [
        `*${empresa}*`,
        `Recibo da compra ${numero}${data ? ` — ${data}` : ''}`,
        '',
        itens,
        '',
        `*Total: ${money(sale.totalAmount)}*`,
        pago,
        '',
        'Obrigada pela preferência! 💛',
      ];
      const text = linhas.filter((l) => l !== undefined).join('\n');

      const waNumber = toWhatsAppNumber(sale.customerPhone || '');
      const url = waNumber
        ? `https://wa.me/${waNumber}?text=${encodeURIComponent(text)}`
        : `https://wa.me/?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank');
    } catch (e: any) {
      alert(e.message || 'Erro ao preparar o WhatsApp.');
    } finally {
      setWaLoading(false);
    }
  };

  const handleDownload = async (format: 'a4' | 'thermal') => {
    setLoading(true);
    setPrintHelper('');
    try {
       const res = await apiFetch(`/api/sales/${saleId}/receipt/pdf?format=${format}&action=download`);
       if (!res.ok) {
         const errData = await res.json().catch(() => ({}));
         throw new Error(errData.details || errData.error || "Erro ao gerar PDF");
       }
       const blob = await res.blob();
       const url = window.URL.createObjectURL(blob);
       const a = document.createElement('a');
       a.href = url;
       a.download = `recibo-${saleNumber || saleId}-${format}.pdf`;
       document.body.appendChild(a);
       a.click();
       a.remove();
       window.URL.revokeObjectURL(url);
    } catch(e: any) {
       alert(e.message);
    } finally {
       setLoading(false);
    }
  };

  const handlePrint = async (format: 'a4' | 'thermal') => {
    setLoading(true);
    setPrintHelper('');
    try {
       const res = await apiFetch(`/api/sales/${saleId}/receipt/pdf?format=${format}&action=print`);
       if (!res.ok) {
         const errData = await res.json().catch(() => ({}));
         throw new Error(errData.details || errData.error || "Erro ao gerar PDF");
       }
       const blob = await res.blob();
       const url = window.URL.createObjectURL(blob);
       const iframe = document.createElement('iframe');
       iframe.style.display = 'none';
       iframe.src = url;
       
       let printed = false;
       iframe.onload = () => {
          printed = true;
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
       };
       
       document.body.appendChild(iframe);
       
       setTimeout(() => {
          if (!printed) {
              setPrintHelper("Se a janela de impressão não abrir, use a opção Baixar PDF e imprima manualmente pelo navegador.");
          }
          setTimeout(() => {
             if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
             }
             window.URL.revokeObjectURL(url);
          }, 10000);
       }, 3000);
    } catch(e: any) {
       alert(e.message);
    } finally {
       setLoading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!emailTo) return;
    setSending(true);
    setEmailMsg("");
    try {
       const res = await apiFetch(`/api/sales/${saleId}/receipt/email`, {
          method: "POST",
          body: JSON.stringify({ email: emailTo })
       });
       if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Erro no envio");
       }
       setEmailMsg("E-mail enviado com sucesso!");
       setTimeout(() => {
          setShowEmailState(false);
          setEmailMsg("");
       }, 3000);
    } catch(e: any) {
       setEmailMsg(`Erro: ${e.message}`);
    } finally {
       setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-brand-navylight border border-gray-800 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden relative flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-gray-800">
          <h3 className="text-xl font-bold text-white">Opções de Recibo</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-4">
           {printHelper && (
              <div className="p-3 rounded bg-blue-500/10 border border-blue-500/30 text-blue-400 text-sm flex items-center gap-2">
                  <span>{printHelper}</span>
              </div>
           )}

           {loading && (
              <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center z-10 rounded-2xl">
                 <Loader2 className="w-8 h-8 text-brand-gold animate-spin" />
                 <span className="text-sm text-gray-300 mt-2">Gerando...</span>
              </div>
           )}
           
           <div className="flex flex-col gap-3">
             <button onClick={() => handlePrint('thermal')} className="w-full flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-4 py-3 rounded-lg font-medium transition">
               <Printer className="w-5 h-5" />
               Imprimir Térmica
             </button>
             <button onClick={() => handleDownload('thermal')} className="w-full flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-4 py-3 rounded-lg font-medium transition">
               <FileText className="w-5 h-5" />
               Baixar PDF Térmico
             </button>
             
             <div className="h-px bg-gray-800 my-2" />
             
             <button onClick={() => handlePrint('a4')} className="w-full flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-4 py-3 rounded-lg font-medium transition">
               <Printer className="w-5 h-5" />
               Imprimir A4
             </button>
             <button onClick={() => handleDownload('a4')} className="w-full flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-4 py-3 rounded-lg font-medium transition">
               <FileText className="w-5 h-5" />
               Baixar PDF A4
             </button>

             <div className="h-px bg-gray-800 my-2" />

             <button onClick={handleWhatsApp} disabled={waLoading} className="w-full flex items-center justify-center gap-2 bg-green-600/90 hover:bg-green-600 text-white px-4 py-3 rounded-lg font-medium transition disabled:opacity-50">
               {waLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <MessageCircle className="w-5 h-5" />}
               Enviar por WhatsApp
             </button>

             {!showEmailState ? (
                <button onClick={() => setShowEmailState(true)} className="w-full flex items-center justify-center gap-2 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 px-4 py-3 rounded-lg font-medium transition">
                  <Mail className="w-5 h-5" />
                  Enviar por E-mail
                </button>
             ) : (
                <div className="space-y-3 bg-gray-800/30 p-3 rounded-lg border border-gray-700">
                   <p className="text-sm font-medium text-gray-300">Enviar E-mail</p>
                   <input 
                     type="email" 
                     placeholder="email@cliente.com" 
                     value={emailTo}
                     onChange={e => setEmailTo(e.target.value)}
                     className="w-full bg-[#171717] border border-gray-700 rounded px-3 py-2 text-white outline-none focus:border-brand-gold text-sm"
                   />
                   <div className="flex gap-2">
                     <button onClick={() => setShowEmailState(false)} className="flex-1 py-2 text-xs text-gray-400 hover:text-white transition">Cancelar</button>
                     <button onClick={handleSendEmail} disabled={sending || !emailTo} className="flex-1 bg-brand-gold text-brand-navydark py-2 rounded font-medium text-xs hover:bg-brand-goldhover transition disabled:opacity-50">
                       {sending ? 'Enviando...' : 'Enviar'}
                     </button>
                   </div>
                   {emailMsg && <p className={`text-xs text-center font-medium ${emailMsg.includes('Erro') ? 'text-red-400' : 'text-green-400'}`}>{emailMsg}</p>}
                </div>
             )}
           </div>
        </div>
      </div>
    </div>
  );
}
