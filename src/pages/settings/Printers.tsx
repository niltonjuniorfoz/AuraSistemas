import React, { useState, useEffect } from 'react';
import { Printer, Printer as PrinterIcon, Save, Play, Info } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { apiFetch } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';

export function Printers() {
  const { user } = useAuthStore();
  const isAdmin = ['admin', 'master'].includes(user?.role?.toLowerCase() || '');

  const [formData, setFormData] = useState({
    receiptFormat: '80mm',
    adminFormat: 'A4',
    printMode: 'browser'
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (isAdmin) loadSettings();
  }, [isAdmin]);

  const loadSettings = async () => {
    try {
      const res = await apiFetch("/api/settings/printers");
      if (res.ok) {
         const data = await res.json();
         setFormData({
            receiptFormat: data.receiptFormat || '80mm',
            adminFormat: data.adminFormat || 'A4',
            printMode: data.printMode || 'browser'
         });
      }
    } catch(e) { } finally { setLoading(false); }
  };

  const handleSave = async () => {
     setSaving(true);
     setMessage('');
     try {
       const res = await apiFetch("/api/settings/printers", {
          method: "PUT",
          body: JSON.stringify(formData)
       });
       if (res.ok) {
          setMessage("Configurações salvas com sucesso!");
       } else {
          setMessage("Erro ao salvar.");
       }
     } catch(e) { setMessage("Erro de conexão."); } finally { setSaving(false); }
  };

  const handleTest = async (format: string, openOnly: boolean = false) => {
    try {
       const url = `/api/settings/printers/test?format=${format}`;
       const res = await apiFetch(url);
       if (!res.ok) {
          alert("Erro ao gerar teste de impressão.");
          return;
       }
       const blob = await res.blob();
       const objUrl = window.URL.createObjectURL(blob);

       if (openOnly) {
           const a = document.createElement('a');
           a.href = objUrl;
           a.download = `teste_${format}.pdf`;
           document.body.appendChild(a);
           a.click();
           a.remove();
           setTimeout(() => window.URL.revokeObjectURL(objUrl), 1000);
           return;
       }

       if (formData.printMode === 'browser') {
           const iframe = document.createElement('iframe');
           iframe.style.display = 'none';
           iframe.src = objUrl;
           iframe.onload = () => {
              iframe.contentWindow?.focus();
              iframe.contentWindow?.print();
           };
           document.body.appendChild(iframe);
           setTimeout(() => {
              if (document.body.contains(iframe)) document.body.removeChild(iframe);
              window.URL.revokeObjectURL(objUrl);
           }, 10000);
       } else {
          alert("A impressão direta (Agent) estará disponível em breve.");
       }
    } catch(e) {
       alert("Erro ao testar.");
    }
  };

  if (!isAdmin) {
    return <div className="p-8 text-center text-red-400">Acesso negado.</div>;
  }
  
  if (loading) return <div className="text-gray-400 text-center p-8">Carregando...</div>;

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gray-500/10 flex items-center justify-center text-gray-400">
          <PrinterIcon className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-white">Impressoras</h2>
          <p className="text-gray-400 text-sm">Configuração de tamanhos de papel e atalhos de impressão.</p>
        </div>
      </div>

      <Card className="rounded-xl border-gray-800 bg-brand-navylight p-6 shadow-md">

         <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-4 flex gap-3 text-sm text-indigo-200">
           <Info className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
           <div className="space-y-2">
              <p>A impressão é feita pelo navegador do computador que está acessando o sistema. Para imprimir, a impressora precisa estar instalada neste computador ou disponível na rede local.</p>
              <ul className="list-disc pl-4 space-y-1 text-indigo-300">
                <li><strong>Modo Navegador (Atual):</strong> Gera o PDF e abre a caixa de impressão do navegador para você escolher a impressora local.</li>
                <li><span className="text-gray-500 line-through">Modo Agente (Em breve):</span> <em>Para impressão direta sem janela do navegador será necessário instalar um Agente Local de Impressão no computador da loja.</em></li>
              </ul>
           </div>
         </div>

         {message && <div className="p-3 rounded bg-green-500/10 text-green-400 font-semibold border border-green-500/30 text-sm">{message}</div>}

         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="gap-4 rounded-xl border-gray-800 bg-[#171717] p-6 shadow-none">
               <div className="flex items-center gap-3 text-white">
                 <Printer className="w-5 h-5 text-gray-400" />
                 <h3 className="font-medium text-lg">Impressora de Cupons (PDV)</h3>
               </div>

               <div className="space-y-2">
                 <label className="text-sm font-medium text-gray-400">Formato Padrão</label>
                 <select value={formData.receiptFormat} onChange={e => setFormData({...formData, receiptFormat: e.target.value})} className="w-full bg-brand-navylight border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-brand-gold transition-colors">
                   <option value="80mm">Térmica 80mm</option>
                   <option value="58mm">Térmica 58mm</option>
                 </select>
               </div>

               <div className="flex gap-2 pt-2">
                 <Button onClick={() => handleTest(formData.receiptFormat)} variant="secondary" className="h-auto flex-1 gap-1 rounded-lg bg-gray-800 px-0 py-2 text-sm text-white hover:bg-gray-700 has-[>svg]:px-0">
                   <Play className="size-4" />
                   Imprimir Teste
                 </Button>
                 <Button onClick={() => handleTest(formData.receiptFormat, true)} variant="secondary" className="h-auto flex-1 gap-1 rounded-lg bg-gray-800 px-0 py-2 text-sm text-white hover:bg-gray-700 has-[>svg]:px-0">
                   <PrinterIcon className="size-4" />
                   Baixar PDF
                 </Button>
                 <Button onClick={handleSave} disabled={saving} className="h-auto flex-1 gap-1 rounded-lg bg-brand-gold px-0 py-2 text-sm font-medium text-brand-navydark hover:bg-brand-goldhover has-[>svg]:px-0">
                   <Save className="size-4" />
                   {saving ? 'O...' : 'Salvar'}
                 </Button>
               </div>
            </Card>

            <Card className="gap-4 rounded-xl border-gray-800 bg-[#171717] p-6 shadow-none">
               <div className="flex items-center gap-3 text-white">
                 <Printer className="w-5 h-5 text-gray-400" />
                 <h3 className="font-medium text-lg">Impressora Administrativa</h3>
               </div>

               <div className="space-y-2">
                 <label className="text-sm font-medium text-gray-400">Formato Padrão</label>
                 <select value={formData.adminFormat} onChange={e => setFormData({...formData, adminFormat: e.target.value})} className="w-full bg-brand-navylight border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-brand-gold transition-colors">
                   <option value="A4">A4 (Folha Inteira)</option>
                   <option value="A5">A5</option>
                 </select>
               </div>

               <div className="flex gap-2 pt-2">
                 <Button onClick={() => handleTest(formData.adminFormat)} variant="secondary" className="h-auto flex-1 gap-1 rounded-lg bg-gray-800 px-0 py-2 text-sm text-white hover:bg-gray-700 has-[>svg]:px-0">
                   <Play className="size-4" />
                   Imprimir Teste
                 </Button>
                 <Button onClick={() => handleTest(formData.adminFormat, true)} variant="secondary" className="h-auto flex-1 gap-1 rounded-lg bg-gray-800 px-0 py-2 text-sm text-white hover:bg-gray-700 has-[>svg]:px-0">
                   <PrinterIcon className="size-4" />
                   Baixar PDF
                 </Button>
                 <Button onClick={handleSave} disabled={saving} className="h-auto flex-1 gap-1 rounded-lg bg-brand-gold px-0 py-2 text-sm font-medium text-brand-navydark hover:bg-brand-goldhover has-[>svg]:px-0">
                   <Save className="size-4" />
                   {saving ? 'O...' : 'Salvar'}
                 </Button>
               </div>
            </Card>
         </div>
         
         <div className="pt-4 border-t border-gray-800/50">
           <label className="text-sm font-medium text-gray-400 block mb-2">Modo de Impressão Global</label>
           <select value={formData.printMode} onChange={e => setFormData({...formData, printMode: e.target.value})} className="w-full md:w-1/2 bg-[#171717] border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-brand-gold transition-colors">
             <option value="browser">Navegador (Abre janela de impressão)</option>
             <option value="agent" disabled>Agente Local (Em breve)</option>
           </select>
         </div>
      </Card>
    </div>
  );
}
