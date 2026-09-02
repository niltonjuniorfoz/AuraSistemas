import React, { useState } from 'react';
import { Settings, Save, Server, Shield } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useAdminTranslation, Language } from '../../lib/i18n';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';

export function SystemSettings() {
  const { user } = useAuthStore();
  const { language, setLanguage } = useAdminTranslation();
  const isAdmin = ['admin', 'master'].includes(user?.role?.toLowerCase() || '');
  const [localLang, setLocalLang] = useState<Language>(language);

  if (!isAdmin) {
    return <div className="p-8 text-center text-red-400">Acesso negado.</div>;
  }

  const handleSave = () => {
    setLanguage(localLang);
    alert('Configurações salvas!');
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-slate-500/10 flex items-center justify-center text-slate-400">
          <Settings className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-white">Configurações do Sistema</h2>
          <p className="text-gray-400 text-sm">Parâmetros essenciais e status da operação.</p>
        </div>
      </div>

      <Card className="rounded-xl gap-0 border-gray-800 bg-brand-navylight p-6 shadow-md">
      <CardContent className="p-0 space-y-8">
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Idioma</label>
              <select value={localLang} onChange={e => setLocalLang(e.target.value as Language)} className="w-full bg-[#171717] border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-brand-gold transition-colors">
                <option value="pt-BR">Português (Brasil)</option>
                <option value="es-PY">Español (Paraguay)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Fuso Horário (Timezone)</label>
              <select className="w-full bg-[#171717] border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-brand-gold transition-colors">
                <option value="America/Asuncion">America/Asuncion (Paraguai)</option>
                <option value="America/Sao_Paulo">America/Sao_Paulo (Brasil)</option>
              </select>
            </div>

            <div className="space-y-2">
               <label className="text-sm font-medium text-gray-300">Modo Estrito de Permissões</label>
               <div className="flex items-center gap-3 mt-2 h-10">
                 <Shield className="text-brand-gold w-5 h-5" />
                 <span className="text-gray-400 text-sm">Ocultar totalmente menus sem permissão</span>
                 <label className="relative inline-flex items-center cursor-pointer ml-auto">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-gold"></div>
                 </label>
               </div>
            </div>
         </div>

         <div className="flex justify-end pt-4 border-t border-gray-800">
            <Button
              type="button"
              onClick={handleSave}
              className="h-auto gap-2 rounded-lg bg-brand-gold px-6 py-2.5 has-[>svg]:px-6 text-base font-medium text-brand-navydark transition hover:bg-brand-goldhover"
            >
              <Save className="size-5" />
              Salvar Configurações
            </Button>
         </div>
      </CardContent>
      </Card>

      {/* Maintenance */}
      <Card className="rounded-xl gap-0 border-gray-800 bg-brand-navylight p-6 shadow-md">
      <CardContent className="p-0 space-y-4">
         <h3 className="text-lg font-semibold text-white">Manutenção do Sistema</h3>
         <p className="text-sm text-gray-400">Rotinas executadas automaticamente, mas que podem ser disparadas manualmente.</p>
         <div className="flex gap-4">
            {/* Ação destrutiva (apaga vendas canceladas permanentemente) sem confirmação — decisão explícita desta task: só troca visual (Button compartilhado), NÃO adicionar ConfirmModal aqui. Fica sinalizado como candidato a melhoria de segurança em task futura. */}
            <Button
              variant="secondary"
              onClick={async () => {
               try {
                  const token = useAuthStore.getState().token;
                  const res = await fetch("/api/maintenance/purge-canceled-sales", {
                     method: "POST",
                     headers: { "Authorization": `Bearer ${token}` }
                  });
                  const data = await res.json();
                  if (res.ok) alert(`Sucesso! ${data.count} vendas apagadas.`);
                  else alert("Erro: " + data.error);
               } catch(err:any) { alert("Erro de rede: " + err.message); }
            }}
              className="h-auto rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm text-gray-200 transition hover:bg-gray-700"
            >
               Executar limpeza de vendas canceladas
            </Button>
         </div>
      </CardContent>
      </Card>

      {/* System info */}
      <Card className="rounded-2xl gap-0 border-gray-800 bg-brand-navylight p-6 shadow-md">
      <CardContent className="p-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="flex-row items-center gap-4 rounded-xl border-gray-800 bg-[#171717] p-5 shadow-none">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 shrink-0">
               <Server className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-white text-sm font-medium">Status do Banco de Dados</h4>
              <p className="text-green-400 text-xs mt-0.5">Online e Responsivo</p>
            </div>
          </Card>

          <Card className="flex-row items-center gap-4 rounded-xl border-gray-800 bg-[#171717] p-5 shadow-none">
            <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400 shrink-0">
               <div className="font-mono font-bold">V</div>
            </div>
            <div>
              <h4 className="text-white text-sm font-medium">Versão da Aplicação</h4>
              <p className="text-gray-400 text-xs mt-0.5">v1.2.4 (Build 2026.06.01)</p>
            </div>
          </Card>
        </div>
      </CardContent>
      </Card>
    </div>
  );
}
