import React, { useEffect, useState } from 'react';
import { DatabaseBackup, Download, Clock, Loader2, RotateCcw, Cloud } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { apiFetch } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';

type BackupSettings = {
  enabled: boolean;
  time: string;
  lastRunAt?: string | null;
  lastRunStatus?: 'SUCCESS' | 'FAILED' | 'NEVER' | string;
  lastRunMessage?: string | null;
  dropbox?: boolean;
  googleDrive?: boolean;
};

const defaultBackup: BackupSettings = {
  enabled: false,
  time: '02:00',
  lastRunAt: null,
  lastRunStatus: 'NEVER',
  lastRunMessage: null,
  dropbox: true,
};

function formatBackupDate(value?: string | null) {
  if (!value) return 'Nunca executado';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Data inválida';
  return date.toLocaleString('pt-BR');
}

export function Backup() {
  const { user } = useAuthStore();
  const userRole = user?.role?.toLowerCase() || '';
  const isMaster = userRole === 'master';
  const isAdmin = ['admin', 'master'].includes(userRole);
  const [backup, setBackup] = useState<BackupSettings>(defaultBackup);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadBackupStatus() {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch('/api/settings/backup-status');
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Erro ao carregar status do backup.');
      setBackup({ ...defaultBackup, ...(json.backup || {}) });
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar status do backup.');
    } finally {
      setLoading(false);
    }
  }

  async function generateManualBackup() {
    setGenerating(true);
    setMessage('');
    setError('');
    try {
      const res = await apiFetch('/api/settings/backup-now', { method: 'POST' });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'Erro ao gerar backup manual.');
      }

      const blob = await res.blob();
      const encodedName = res.headers.get('X-Backup-Filename') || '';
      const filename = encodedName ? decodeURIComponent(encodedName) : `origin-backup-${Date.now()}.json.gz`;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      const cloudMessage = res.headers.get('X-Backup-Cloud-Message');
      const decodedCloudMessage = cloudMessage ? decodeURIComponent(cloudMessage) : '';
      setMessage(`Backup manual gerado: ${filename}${decodedCloudMessage ? `. ${decodedCloudMessage}` : ''}`);
      await loadBackupStatus();
    } catch (err: any) {
      setError(err.message || 'Erro ao gerar backup manual.');
    } finally {
      setGenerating(false);
    }
  }

  useEffect(() => {
    if (isAdmin) loadBackupStatus();
  }, [isAdmin]);

  if (!isAdmin) {
    return <div className="p-8 text-center text-red-400">Acesso negado.</div>;
  }

  const statusLabel = backup.enabled ? 'Ativo' : 'Desativado';
  const statusDot = backup.enabled ? 'bg-green-500' : 'bg-red-500';
  const lastBackupLabel = formatBackupDate(backup.lastRunAt);

  return (
    <div className="backup-settings-page max-w-4xl space-y-4 md:space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-400">
          <DatabaseBackup className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-white">Backup do Sistema</h2>
          <p className="text-gray-400 text-sm">
            {isMaster
              ? 'Status real do backup configurado no Painel Master e envio para Dropbox.'
              : 'Status do backup automático e envio para Dropbox.'}
          </p>
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}
      {message && <div className="rounded-lg border border-green-500/25 bg-green-500/10 p-3 text-sm text-green-300">{message}</div>}

      <Card className="rounded-xl gap-0 border-gray-800 bg-brand-navylight p-4 md:p-6 shadow-md">
      <CardContent className="p-0 space-y-4 md:space-y-6">
        {loading ? (
          <div className="flex items-center justify-center gap-2 rounded-lg border border-gray-800 bg-[#171717] p-5 text-sm text-gray-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando status do backup...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="rounded-lg gap-0 border-gray-800 bg-[#171717] p-4 shadow-none">
            <CardContent className="p-0">
              <p className="text-sm text-gray-400 mb-1">Status do Backup Automático</p>
              <p className="text-white font-medium flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${statusDot}`}></span> {statusLabel}
              </p>
              <p className="mt-2 text-xs text-gray-500">Horário configurado: {backup.time || '02:00'}</p>
            </CardContent>
            </Card>

            <Card className="rounded-lg gap-0 border-gray-800 bg-[#171717] p-4 shadow-none">
            <CardContent className="p-0">
              <p className="text-sm text-gray-400 mb-1">Último Backup Realizado</p>
              <p className="text-white font-medium flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500" />
                {lastBackupLabel}
              </p>
              {backup.lastRunStatus && backup.lastRunStatus !== 'NEVER' && (
                <p className="mt-2 text-xs text-gray-500">Resultado: {backup.lastRunStatus === 'SUCCESS' ? 'Sucesso' : backup.lastRunStatus === 'FAILED' ? 'Falhou' : backup.lastRunStatus}</p>
              )}
              <p className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                <Cloud className="w-3 h-3" /> Dropbox: {backup.dropbox ? 'Ativado' : 'Desativado'}
              </p>
            </CardContent>
            </Card>
          </div>
        )}

        <Card className="rounded-lg gap-0 border-gray-800 bg-[#171717] p-5 md:p-6 text-center shadow-none">
        <CardContent className="p-0 space-y-4">
          <DatabaseBackup className="w-10 h-10 md:w-12 md:h-12 text-gray-600 mx-auto" />
          <div>
            <h3 className="text-white font-medium text-lg">Download Manual do Backup</h3>
            <p className="text-sm text-gray-400 max-w-md mx-auto mt-2">
              Gere e baixe uma cópia pontual completa do banco. Se o Dropbox estiver configurado, o arquivo também será enviado para a pasta definida no Render.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              type="button"
              onClick={generateManualBackup}
              disabled={generating}
              className="h-auto gap-2 rounded-lg bg-brand-gold px-5 py-2.5 has-[>svg]:px-5 text-base font-medium text-brand-navydark transition hover:bg-brand-goldhover disabled:opacity-60 disabled:cursor-wait"
            >
              {generating ? <Loader2 className="size-5 animate-spin" /> : <Download className="size-5" />}
              {generating ? 'Gerando...' : 'Gerar Backup Manual'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setMessage(isMaster
                ? 'Recuperação de backup deve ser feita pelo Painel Master/VPS para evitar sobrescrever dados por acidente.'
                : 'A recuperação de backup deve ser feita por um usuário autorizado para evitar sobrescrever dados por acidente.'
              )}
              className="h-auto gap-2 rounded-lg border-gray-700 bg-[#171717] px-5 py-2.5 has-[>svg]:px-5 text-base font-medium text-gray-200 shadow-none transition hover:bg-gray-800 hover:text-gray-200 dark:border-gray-700 dark:bg-[#171717] dark:hover:bg-gray-800 dark:hover:text-gray-200"
            >
              <RotateCcw className="size-5" />
              Recuperar Backup
            </Button>
          </div>
        </CardContent>
        </Card>

        <Card className="block rounded-lg border-blue-500/20 bg-blue-500/10 p-4 text-sm text-blue-400/90 leading-relaxed shadow-none">
          <strong>Instrução técnica:</strong> É altamente recomendado manter o backup em nível de volume (Docker/VPS) operando juntamente com este processo da aplicação. O gerenciamento de Point-in-Time Recovery é feito na infraestrutura.
        </Card>
      </CardContent>
      </Card>
    </div>
  );
}
