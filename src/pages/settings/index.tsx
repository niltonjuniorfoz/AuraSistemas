import React from 'react';
import { Link } from 'react-router';
import { Building2, Archive, Receipt, Printer, Mail, DatabaseBackup, Activity, Settings as SettingsIcon, Keyboard, Tags, CircleDollarSign } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';

export function SettingsDashboard() {
  const { user } = useAuthStore();
  const isAdmin = ['admin', 'master'].includes(user?.role?.toLowerCase() || '');

  if (!isAdmin) {
    return <div className="p-8 text-center text-red-400">Acesso negado. Apenas administradores podem ver configurações.</div>;
  }

  const settingsCards = [
    {
      title: 'Dados da empresa',
      description: 'Configure nome, logo, documento e dados da empresa.',
      icon: Building2,
      path: '/settings/company',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10'
    },
    {
      title: 'Moedas',
      description: 'Defina Real, Dólar e Guarani, cotações e moedas exibidas na loja.',
      icon: CircleDollarSign,
      path: '/settings/currencies',
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10'
    },
    {
      title: 'Arquivados',
      description: 'Consulte e restaure registros desativados do sistema.',
      icon: Archive,
      path: '/settings/archived',
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10'
    },
    {
      title: 'Fiscal',
      description: 'Configurações fiscais gerais e parâmetros internos.',
      icon: Receipt,
      path: '/settings/fiscal',
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10'
    },
    {
      title: 'Impressoras',
      description: 'Configuração de impressoras térmicas e A4 padrões.',
      icon: Printer,
      path: '/settings/printers',
      color: 'text-gray-400',
      bgColor: 'bg-gray-500/10'
    },
    {
      title: 'E-mail da empresa',
      description: 'Configuração SMTP para envio de relatórios e notas.',
      icon: Mail,
      path: '/settings/email',
      color: 'text-indigo-400',
      bgColor: 'bg-indigo-500/10'
    },
    {
      title: 'Backup',
      description: 'Status e geração manual de backups de segurança.',
      icon: DatabaseBackup,
      path: '/settings/backup',
      color: 'text-teal-400',
      bgColor: 'bg-teal-500/10'
    },
    {
      title: 'Auditoria / Logs',
      description: 'Histórico de ações dos usuários e rastreamento de uso.',
      icon: Activity,
      path: '/settings/audit',
      color: 'text-rose-400',
      bgColor: 'bg-rose-500/10'
    },
    {
      title: 'Sistema',
      description: 'Tema, idioma, timezone e permissões avançadas.',
      icon: SettingsIcon,
      path: '/settings/system',
      color: 'text-slate-400',
      bgColor: 'bg-slate-500/10'
    },
    {
      title: 'Atalhos do Sistema',
      description: 'Configure atalhos de teclado do PDV e Navegação.',
      icon: Keyboard,
      path: '/settings/shortcuts',
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10'
    },
    {
      title: 'Marcas',
      description: 'Logos de marca (Apple, Asus...) pra seção Marcas da loja.',
      icon: Tags,
      path: '/settings/brands',
      color: 'text-lime-400',
      bgColor: 'bg-lime-500/10'
    }
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-brand-gold/10 flex items-center justify-center text-brand-gold">
          <SettingsIcon className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-white">Configurações do Sistema</h2>
          <p className="text-gray-400 text-sm">Gerencie os parâmetros globais e a operação do sistema.</p>
        </div>
      </div>

      <Card className="rounded-2xl gap-0 border-gray-800 bg-brand-navylight p-6 shadow-md">
        <CardContent className="p-0">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {settingsCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card key={card.path} className="rounded-xl gap-0 border-gray-800 bg-[#171717] p-5 shadow-none transition hover:border-gray-700">
                <CardContent className="flex flex-1 flex-col p-0">
                <div className="flex items-start gap-4 mb-4 flex-1">
                  <div className={`w-10 h-10 rounded-lg ${card.bgColor} ${card.color} flex items-center justify-center shrink-0`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-white mb-1">{card.title}</h3>
                    <p className="text-sm text-gray-400 leading-relaxed">{card.description}</p>
                  </div>
                </div>
                <Button asChild variant="ghost" className="block h-auto w-full rounded-lg bg-brand-navylight px-4 py-2 text-center text-base font-medium text-brand-gold transition hover:bg-gray-800 hover:text-brand-gold dark:hover:bg-gray-800">
                  <Link to={card.path}>Abrir</Link>
                </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
        </CardContent>
      </Card>
    </div>
  );
}
