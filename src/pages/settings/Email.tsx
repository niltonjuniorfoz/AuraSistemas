import React, { useState, useEffect } from 'react';
import { Mail, Save, Send } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { apiFetch } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';

export function Email() {
  const { user } = useAuthStore();
  const isAdmin = ['admin', 'master'].includes(user?.role?.toLowerCase() || '');

  const [formData, setFormData] = useState({
    host: '',
    port: 587,
    user: '',
    password: '',
    fromEmail: '',
    fromName: '',
    useTls: true
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
     if (isAdmin) loadSettings();
  }, [isAdmin]);

  const loadSettings = async () => {
    try {
       const res = await apiFetch("/api/settings/email");
       if (res.ok) {
          const data = await res.json();
          setFormData({
             host: data.host || '',
             port: data.port || 587,
             user: data.user || '',
             password: data.password || '',
             fromEmail: data.fromEmail || '',
             fromName: data.fromName || '',
             useTls: typeof data.useTls === 'boolean' ? data.useTls : true
          });
       }
    } catch(e) { } finally { setLoading(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    setMsg('');
    try {
      const res = await apiFetch("/api/settings/email", {
         method: "PUT",
         body: JSON.stringify(formData)
      });
      if (res.ok) {
         setMsg("Configurações salvas com sucesso!");
      } else {
         const data = await res.json();
         setMsg(`Erro: ${data.error}`);
      }
    } catch(e: any) {
      setMsg(`Erro: ${e.message}`);
    } finally { setSaving(false); }
  };

  const handleTest = async () => {
    setTesting(true);
    setMsg('Enviando teste...');
    try {
      const res = await apiFetch("/api/settings/email/test", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
         setMsg("E-mail de teste enviado! Verifique sua caixa de entrada.");
      } else {
         setMsg(`Erro no teste: ${data.error}`);
      }
    } catch(e: any) {
      setMsg(`Erro no teste: ${e.message}`);
    } finally { setTesting(false); }
  };

  if (!isAdmin) {
    return <div className="p-8 text-center text-red-400">Acesso negado.</div>;
  }

  if (loading) return <div className="text-gray-400">Carregando...</div>;

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
          <Mail className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-white">E-mail da Empresa</h2>
          <p className="text-gray-400 text-sm">Configuração de servidor SMTP para envios automáticos.</p>
        </div>
      </div>

      <Card className="rounded-xl gap-0 border-gray-800 bg-brand-navylight p-6 shadow-md">
      <CardContent className="p-0">
        {msg && <div className={`p-3 rounded mb-4 text-sm font-semibold ${msg.includes('Erro') ? 'bg-red-500/10 text-red-400 border border-red-500/30' : 'bg-green-500/10 text-green-400 border border-green-500/30'}`}>{msg}</div>}
        <form className="space-y-6" onSubmit={e => e.preventDefault()}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 col-span-1 md:col-span-2">
              <label className="text-sm font-medium text-gray-300">Host SMTP</label>
              <input value={formData.host} onChange={e => setFormData({...formData, host: e.target.value})} type="text" placeholder="smtp.gmail.com" className="w-full bg-[#171717] border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-brand-gold transition-colors" />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Porta</label>
              <input value={formData.port} onChange={e => setFormData({...formData, port: parseInt(e.target.value) || 587})} type="number" placeholder="587" className="w-full bg-[#171717] border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-brand-gold transition-colors" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Segurança (TLS/SSL)</label>
              <select value={formData.useTls ? 'tls' : 'none'} onChange={e => setFormData({...formData, useTls: e.target.value === 'tls'})} className="w-full bg-[#171717] border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-brand-gold transition-colors">
                <option value="tls">Usar TLS Start</option>
                <option value="none">Desabilitado</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Usuário de Autenticação</label>
              <input value={formData.user} onChange={e => setFormData({...formData, user: e.target.value})} type="text" placeholder="envios@sualoja.com.br" className="w-full bg-[#171717] border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-brand-gold transition-colors" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Senha</label>
              <input value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} type="password" placeholder="••••••••" className="w-full bg-[#171717] border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-brand-gold transition-colors" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">E-mail do Remetente (De:)</label>
              <input value={formData.fromEmail} onChange={e => setFormData({...formData, fromEmail: e.target.value})} type="email" placeholder="nao-responda@sualoja.com.br" className="w-full bg-[#171717] border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-brand-gold transition-colors" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Nome do Remetente</label>
              <input value={formData.fromName} onChange={e => setFormData({...formData, fromName: e.target.value})} type="text" placeholder="Nome da sua loja" className="w-full bg-[#171717] border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-brand-gold transition-colors" />
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-gray-800">
            <Button
              type="button"
              variant="outline"
              onClick={handleTest}
              disabled={testing}
              className="h-auto gap-2 rounded-lg border-gray-700 bg-[#171717] px-6 py-2.5 has-[>svg]:px-6 text-base font-medium text-white shadow-none transition hover:bg-gray-800 hover:text-white dark:border-gray-700 dark:bg-[#171717] dark:hover:bg-gray-800 dark:hover:text-white"
            >
              <Send className="size-4" />
              {testing ? 'Testando...' : 'Testar Envio'}
            </Button>

            <Button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="h-auto gap-2 rounded-lg bg-brand-gold px-6 py-2.5 has-[>svg]:px-6 text-base font-medium text-brand-navydark transition hover:bg-brand-goldhover"
            >
              <Save className="size-5" />
              {saving ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
          </div>
        </form>
      </CardContent>
      </Card>
    </div>
  );
}
