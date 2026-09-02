import React, { useEffect, useState } from 'react';
import { Activity } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { apiFetch, extractList } from '../../lib/api';
import { Badge } from '../../components/ui/badge';
import { Card } from '../../components/ui/card';

export function AuditLogs() {
  const { user } = useAuthStore();
  const isAdmin = ['admin', 'master'].includes(user?.role?.toLowerCase() || '');

  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      fetchLogs();
    }
  }, [isAdmin]);

  const [errorMsg, setErrorMsg] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await apiFetch('/api/audit/recent?limit=20');
      if (res.ok) {
        const data = await res.json();
        setLogs(extractList(data));
      } else {
        setErrorMsg('Erro ao carregar auditoria.');
      }
    } catch {
      setErrorMsg('Erro ao carregar auditoria.');
    } finally {
      setLoading(false);
    }
  };


  const formatLogDetails = (log: any) => {
    try {
      const values = log.newValues ? JSON.parse(log.newValues) : null;
      if (log.action === 'LOGIN' && values) {
        return [values.deviceLabel, values.ip, values.timezone].filter(Boolean).join(' • ') || log.recordId || '-';
      }
      if (log.action === 'RETURN_SALE' && values) {
        return `Devolução: ${values.notes || ''}`;
      }
      return values ? JSON.stringify(values).slice(0, 160) : (log.recordId || '-');
    } catch {
      return log.newValues || log.recordId || '-';
    }
  };

  if (!isAdmin) {
    return <div className="p-8 text-center text-red-400">Acesso negado.</div>;
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400">
          <Activity className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-white">Auditoria de Logs</h2>
          <p className="text-gray-400 text-sm">Acompanhe as ações recentes dos usuários no sistema.</p>
        </div>
      </div>

      <Card className="gap-0 border-gray-800 bg-brand-navylight py-0 shadow-md overflow-hidden">
        <table className="w-full text-left text-sm">
           <thead className="bg-[#171717] border-b border-gray-800 text-gray-400">
             <tr>
               <th className="px-6 py-3 font-medium">Usuário</th>
               <th className="px-6 py-3 font-medium">Data/Hora</th>
               <th className="px-6 py-3 font-medium">Ação</th>
               <th className="px-6 py-3 font-medium">Módulo</th>
               <th className="px-6 py-3 font-medium">Detalhes</th>
             </tr>
           </thead>
           <tbody className="divide-y divide-gray-800/50">
             {loading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Caregando logs...</td></tr>
             ) : errorMsg ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-red-500">{errorMsg}</td></tr>
             ) : logs.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Nenhum log encontrado.</td></tr>
             ) : logs.map(log => (
                <tr key={log.id} className="hover:bg-brand-navy/50 transition">
                  <td className="px-6 py-4 font-medium text-gray-200">
                    {log.userName}
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-xs">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 font-mono text-xs">
                    <Badge
                      variant="outline"
                      className={`min-w-[70px] justify-center rounded border-transparent py-1 font-normal ${
                        log.action === 'CREATE' ? 'bg-green-500/10 text-green-400' :
                        log.action === 'UPDATE' ? 'bg-blue-500/10 text-blue-400' :
                        log.action === 'DELETE' ? 'bg-red-500/10 text-red-400' :
                        'bg-gray-500/10 text-gray-400'
                      }`}
                    >
                      {log.action}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-gray-300">
                    {log.moduleName || log.tableName || '-'}
                  </td>
                  <td className="px-6 py-4 text-gray-400 truncate max-w-xs">
                    {formatLogDetails(log)}
                  </td>
                </tr>
             ))}
           </tbody>
        </table>
      </Card>
    </div>
  );
}
