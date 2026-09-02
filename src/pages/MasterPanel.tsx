import React, { useEffect, useState } from 'react';
import { Shield, DatabaseBackup, RotateCcw, HardDrive, Cloud, Save, PlayCircle, AlertTriangle } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { ConfirmModal } from '../components/ConfirmModal';

type BackupSettings = {
  enabled: boolean;
  time: string;
  localServer: boolean;
  dropbox: boolean;
  googleDrive?: boolean;
  includeReports: boolean;
  retentionDays: number;
  lastRunAt?: string | null;
  lastRunStatus?: string;
  lastRunMessage?: string | null;
};

const defaultSettings: BackupSettings = {
  enabled: false,
  time: '02:00',
  localServer: true,
  dropbox: true,
  googleDrive: false,
  includeReports: true,
  retentionDays: 30,
};

export function MasterPanel() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const isMaster = user?.role?.toLowerCase() === 'master';
  const [settings, setSettings] = useState<BackupSettings>(defaultSettings);
  const [dropboxConfigured, setDropboxConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [restorePassword, setRestorePassword] = useState('');
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState(0);
  const [confirmRestoreOpen, setConfirmRestoreOpen] = useState(false);

  useEffect(() => {
    if (!isMaster) return;
    loadStatus();
  }, [isMaster]);

  async function loadStatus() {
    setLoading(true);
    try {
      const res = await apiFetch('/api/master/status');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao carregar painel master.');
      setSettings({ ...defaultSettings, ...(json.backup || {}) });
      setDropboxConfigured(Boolean(json.dropboxConfigured));
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings() {
    setSaving(true);
    setMessage('');
    try {
      const res = await apiFetch('/api/master/backup-settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao salvar.');
      setSettings({ ...defaultSettings, ...(json.backup || settings) });
      setMessage('Configurações Master salvas com sucesso.');
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function runBackupNow() {
    setSaving(true);
    setMessage('');
    try {
      const res = await apiFetch('/api/master/backup-now', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao gerar backup.');
      setMessage(`Backup gerado: ${json.filename}. ${json.cloudMessage || json.driveMessage || ''}`);
      await loadStatus();
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  }


  async function restoreBackup() {
    if (restoring) return;
    if (!restoreFile) {
      setMessage('Selecione um arquivo de backup .json.gz gerado pelo Origin.');
      return;
    }

    setSaving(true);
    setRestoring(true);
    setRestoreProgress(8);
    setMessage('');
    const progressTimer = window.setInterval(() => {
      setRestoreProgress((current) => Math.min(92, current + Math.max(1, Math.round((92 - current) * 0.12))));
    }, 700);

    try {
      const form = new FormData();
      form.append('backup', restoreFile);
      form.append('masterPassword', restorePassword);

      const res = await apiFetch('/api/master/backup-restore', {
        method: 'POST',
        body: form,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Erro ao restaurar backup.');

      setRestorePassword('');
      setRestoreFile(null);
      setRestoreProgress(100);
      setMessage(`Backup restaurado com sucesso. ${json.restoredRows || 0} registros em ${json.restoredTables || 0} tabelas. Backup de seguranca atual: ${json.safetyBackupFilename}. Faca logout e login novamente.`);
      window.setTimeout(() => {
        logout();
        window.location.assign('/login');
      }, 2500);
    } catch (error: any) {
      setMessage(error.message || 'Erro ao restaurar backup.');
    } finally {
      window.clearInterval(progressTimer);
      setSaving(false);
      window.setTimeout(() => {
        setRestoring(false);
        setRestoreProgress(0);
      }, 900);
    }
  }

  if (!isMaster) {
    return <div className="p-8 text-center text-red-400">Acesso restrito.</div>;
  }

  if (loading) {
    return <div className="p-8 text-center text-gray-400">Carregando painel Master...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-brand-gold/10 flex items-center justify-center text-brand-gold">
          <Shield className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-white">Painel Master</h2>
          <p className="text-gray-400 text-sm">Área oculta para manutenção crítica, backups e recuperação do Origin.</p>
        </div>
      </div>

      {message && (
        <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm text-blue-200">
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 rounded-xl gap-0 border-gray-800 bg-[#171717] p-5 shadow-none">
        <CardContent className="p-0 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <DatabaseBackup className="w-5 h-5 text-teal-400" />
              <div>
                <h3 className="text-white font-semibold">Backup automático</h3>
                <p className="text-xs text-gray-400">Preparado para executar diariamente às {settings.time || '02:00'} quando estiver ativo.</p>
              </div>
            </div>
            <label className="inline-flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <span>{settings.enabled ? 'Ativo' : 'Desativado'}</span>
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                className="sr-only peer"
              />
              <span className="relative w-11 h-6 bg-gray-700 rounded-full peer-checked:bg-brand-gold after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:w-5 after:h-5 after:bg-white after:rounded-full after:transition-all peer-checked:after:translate-x-full" />
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="space-y-2">
              <span className="text-xs text-gray-400">Horário diário</span>
              <input
                type="time"
                value={settings.time}
                onChange={(e) => setSettings({ ...settings, time: e.target.value || '02:00' })}
                className="w-full bg-[#171717] border border-gray-700 rounded-lg px-3 py-2 text-white"
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs text-gray-400">Retenção diária</span>
              <input
                type="number"
                min={1}
                value={settings.retentionDays}
                onChange={(e) => setSettings({ ...settings, retentionDays: Number(e.target.value || 30) })}
                className="w-full bg-[#171717] border border-gray-700 rounded-lg px-3 py-2 text-white"
              />
            </label>
            <div className="space-y-2">
              <span className="text-xs text-gray-400">Último backup</span>
              <div className="bg-[#171717] border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 min-h-[42px]">
                {settings.lastRunAt ? new Date(settings.lastRunAt).toLocaleString() : 'Nunca executado'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="bg-[#171717] border border-gray-800 rounded-lg p-3 flex items-center gap-3 text-sm text-gray-200">
              <input type="checkbox" checked={settings.localServer} onChange={(e) => setSettings({ ...settings, localServer: e.target.checked })} />
              <HardDrive className="w-4 h-4 text-gray-400" />
              Salvar no servidor
            </label>
            <label className="bg-[#171717] border border-gray-800 rounded-lg p-3 flex items-center gap-3 text-sm text-gray-200">
              <input type="checkbox" checked={settings.dropbox} onChange={(e) => setSettings({ ...settings, dropbox: e.target.checked })} />
              <Cloud className="w-4 h-4 text-gray-400" />
              Enviar ao Dropbox
            </label>
            <label className="bg-[#171717] border border-gray-800 rounded-lg p-3 flex items-center gap-3 text-sm text-gray-200">
              <input type="checkbox" checked={settings.includeReports} onChange={(e) => setSettings({ ...settings, includeReports: e.target.checked })} />
              <DatabaseBackup className="w-4 h-4 text-gray-400" />
              Incluir relatórios
            </label>
          </div>

          <div className="rounded-lg border border-yellow-500/25 bg-yellow-500/10 p-3 text-xs text-yellow-100 leading-relaxed">
            <strong>Atenção:</strong> no Render Free, o agendamento interno só roda se o serviço estiver acordado. Se o horário já passou, ele tenta executar ao abrir o sistema. Horário configurado: {settings.time || '02:00'}.
            {settings.dropbox && !dropboxConfigured && <div className="mt-1">Dropbox está ativado, mas ainda precisa da variável DROPBOX_ACCESS_TOKEN no Render.</div>}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-end border-t border-gray-800 pt-4">
            <Button
              onClick={runBackupNow}
              disabled={saving}
              variant="outline"
              className="h-auto gap-2 rounded-lg border-gray-700 bg-[#171717] px-4 py-2 has-[>svg]:px-4 text-sm font-normal text-gray-200 shadow-none hover:bg-gray-800 hover:text-gray-200 disabled:opacity-60 dark:border-gray-700 dark:bg-[#171717] dark:hover:bg-gray-800 dark:hover:text-gray-200"
            >
              <PlayCircle className="size-4" /> Gerar backup agora
            </Button>
            <Button
              onClick={saveSettings}
              disabled={saving}
              className="h-auto gap-2 rounded-lg bg-brand-gold px-4 py-2 has-[>svg]:px-4 text-sm font-semibold text-brand-navydark hover:bg-brand-goldhover disabled:opacity-60"
            >
              <Save className="size-4" /> Salvar configurações
            </Button>
          </div>
        </CardContent>
        </Card>

        <Card className="rounded-xl gap-0 border-red-900/40 bg-brand-navylight p-5 shadow-none">
        <CardContent className="p-0 space-y-4">
          <div className="flex items-center gap-3 text-red-300">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="font-semibold text-white">Reset / Recuperação</h3>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed">
            Esta área é exclusiva do Master. O reset definitivo fica protegido para evitar apagar a operação por acidente.
          </p>
          <Card className="rounded-lg gap-0 border-red-500/25 bg-red-500/5 p-3 shadow-none">
          <CardContent className="p-0 space-y-3">
            <p className="text-[11px] text-red-200 leading-relaxed">
              Restaurar troca os dados atuais pelo conteudo do arquivo. O sistema gera um backup de seguranca antes de iniciar.
            </p>
            {restoring && (
              <div className="flex items-center justify-center py-2">
                <div className="relative h-20 w-20 rounded-full bg-gray-800" style={{ background: `conic-gradient(#d4af37 ${restoreProgress * 3.6}deg, #262626 0deg)` }}>
                  <div className="absolute inset-2 flex items-center justify-center rounded-full bg-[#171717] text-sm font-bold text-brand-gold">
                    {restoreProgress}%
                  </div>
                </div>
              </div>
            )}
            <input
              type="file"
              accept=".gz,.json.gz,application/gzip"
              disabled={restoring}
              onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-gray-300 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-gold file:px-3 file:py-2 file:text-xs file:font-bold file:text-brand-navydark disabled:opacity-60"
            />
            <input
              type="password"
              placeholder="Senha Master para restaurar"
              value={restorePassword}
              disabled={restoring}
              onChange={(e) => setRestorePassword(e.target.value)}
              className="w-full bg-[#171717] border border-gray-800 rounded-lg px-3 py-2 text-white text-sm disabled:opacity-60"
            />
            <Button
              type="button"
              onClick={() => setConfirmRestoreOpen(true)}
              disabled={saving || restoring}
              variant="outline"
              className="h-auto w-full gap-2 rounded-lg border-red-500/40 bg-red-500/10 px-4 py-2 has-[>svg]:px-4 text-sm font-semibold text-red-200 shadow-none hover:bg-red-500/20 hover:text-red-200 disabled:opacity-60 dark:border-red-500/40 dark:bg-red-500/10 dark:hover:bg-red-500/20 dark:hover:text-red-200"
            >
              <RotateCcw className={`size-4 ${restoring ? 'animate-spin' : ''}`} /> {restoring ? 'Restaurando...' : 'Restaurar arquivo de backup'}
            </Button>
          </CardContent>
          </Card>
          <p className="text-[11px] text-gray-500">
            A restauracao aceita somente backup .json.gz gerado pelo Origin e exige senha Master.
          </p>
        </CardContent>
        </Card>
      </div>

      <ConfirmModal
        isOpen={confirmRestoreOpen}
        onClose={() => setConfirmRestoreOpen(false)}
        onConfirm={() => { setConfirmRestoreOpen(false); restoreBackup(); }}
        title="Restaurar Backup"
        message="Esta ação é IRREVERSÍVEL: todos os dados atuais serão substituídos pelo conteúdo do arquivo de backup, e todos os usuários (incluindo você) serão desconectados. Confirma?"
        confirmText="Restaurar"
      />
    </div>
  );
}
