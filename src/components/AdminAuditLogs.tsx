import React, { useState } from 'react';
import { AuditLog } from '../types';
import { Search, ShieldAlert, CheckCircle2, XCircle, AlertTriangle, RefreshCw, FileText } from 'lucide-react';

interface AdminAuditLogsProps {
  logs: AuditLog[];
  onRefresh: () => void;
}

export const AdminAuditLogs: React.FC<AdminAuditLogsProps> = ({ logs, onRefresh }) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.username.toLowerCase().includes(search.toLowerCase()) ||
      (log.appName && log.appName.toLowerCase().includes(search.toLowerCase())) ||
      (log.details && log.details.toLowerCase().includes(search.toLowerCase())) ||
      log.ip.includes(search);
    const matchesStatus = statusFilter === 'ALL' || log.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Logs de Auditoria de Acessos SSO</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Histórico completo de autenticação, acessos concedidos e tentativas negadas.
          </p>
        </div>

        <button
          onClick={onRefresh}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Atualizar Logs</span>
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por usuário, app, detalhes ou IP..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <div className="flex items-center space-x-2">
          {['ALL', 'SUCCESS', 'FAILURE', 'WARNING'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all ${
                statusFilter === status
                  ? status === 'SUCCESS'
                    ? 'bg-emerald-500 text-white'
                    : status === 'FAILURE'
                    ? 'bg-red-500 text-white'
                    : status === 'WARNING'
                    ? 'bg-amber-500 text-white'
                    : 'bg-orange-500 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              {status === 'ALL' ? 'Todos' : status}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="py-3 px-4">Data / Hora</th>
                <th className="py-3 px-4">Usuário</th>
                <th className="py-3 px-4">Aplicação</th>
                <th className="py-3 px-4">Ação</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">IP & Detalhes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString('pt-BR')}
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                    @{log.username}
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {log.appName || log.appId || 'Portal SSO'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px] font-bold text-slate-600 dark:text-slate-300">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {log.status === 'SUCCESS' ? (
                      <span className="inline-flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>SUCESSO</span>
                      </span>
                    ) : log.status === 'FAILURE' ? (
                      <span className="inline-flex items-center space-x-1 text-red-600 dark:text-red-400 font-bold text-[11px]">
                        <XCircle className="w-3.5 h-3.5" />
                        <span>FALHA</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 text-amber-600 dark:text-amber-400 font-bold text-[11px]">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>ALERTA</span>
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-mono text-orange-600 dark:text-orange-400 font-semibold block">
                        IP: {log.ip}
                      </span>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                        {log.details}
                      </p>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
