import React, { useEffect, useState } from 'react';
import { Receipt, Save, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { apiFetch } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';

export function Fiscal() {
  const { user } = useAuthStore();
  const isAdmin = ['admin', 'master'].includes(user?.role?.toLowerCase() || '');

  const [formData, setFormData] = useState({
    ivaEnabled: true,
    defaultIvaPy: '10',
    defaultIvaForeign: '0'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (isAdmin) loadData();
  }, [isAdmin]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/settings/fiscal');
      if (res.ok) {
        const data = await res.json();
        setFormData({
          ivaEnabled: data.ivaEnabled ?? true,
          defaultIvaPy: data.defaultIvaPy ?? '10',
          defaultIvaForeign: data.defaultIvaForeign ?? '0',
        });
      }
    } catch {
       // ign
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const res = await apiFetch('/api/settings/fiscal', {
        method: 'PUT',
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Configurações fiscais salvas.' });
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || 'Erro' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Erro de conexão' });
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) {
    return <div className="p-8 text-center text-red-400">Acesso negado.</div>;
  }

  if (loading) return <div className="p-8 text-center text-gray-500">Carregando...</div>;

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
          <Receipt className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-white">Fiscal</h2>
          <p className="text-gray-400 text-sm">Configurações fiscais gerais e compatibilidade do sistema.</p>
        </div>
      </div>

      <Card className="flex-row items-start gap-3 rounded-xl border-yellow-500/20 bg-yellow-500/10 p-4 shadow-none">
        <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-yellow-500 font-medium">Módulo Fiscal</h4>
          <p className="text-sm text-yellow-500/80 mt-1">
            O PDV deste cliente usa Frete por produto. Esta tela fica apenas para parâmetros fiscais gerais e compatibilidade interna.
          </p>
        </div>
      </Card>

      <Card className="rounded-xl gap-0 border-gray-800 bg-brand-navylight p-6 shadow-md">
      <CardContent className="p-0 space-y-6">
         {message.text && (
           <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
              {message.text}
           </div>
         )}
         <div className="flex items-center justify-between border-b border-gray-800 pb-6">
           <div>
             <h3 className="text-white font-medium text-lg">Configuração fiscal legada</h3>
             <p className="text-sm text-gray-400">O PDV usa Frete por produto; este ajuste fica apenas para compatibilidade com versões anteriores.</p>
           </div>
           <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={formData.ivaEnabled} onChange={e => setFormData(prev => ({ ...prev, ivaEnabled: e.target.checked }))} />
              <div className="w-14 h-7 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-brand-gold"></div>
           </label>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Regra fiscal: Cliente Nacional (PY)</label>
              <select value={formData.defaultIvaPy} onChange={e => setFormData(prev => ({ ...prev, defaultIvaPy: e.target.value }))} className="w-full bg-[#171717] border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-brand-gold transition-colors">
                <option value="10">Padrão 10</option>
                <option value="5">Padrão 5</option>
                <option value="0">Isento</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Regra fiscal: Cliente Estrangeiro</label>
              <select value={formData.defaultIvaForeign} onChange={e => setFormData(prev => ({ ...prev, defaultIvaForeign: e.target.value }))} className="w-full bg-[#171717] border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-brand-gold transition-colors">
                <option value="0">Sem acréscimo</option>
                <option value="10">Padrão 10</option>
              </select>
            </div>
         </div>

         <div className="flex justify-end pt-4">
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
      </CardContent>
      </Card>
    </div>
  );
}
