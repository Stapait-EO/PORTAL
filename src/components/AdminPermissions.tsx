import React, { useState } from 'react';
import { User, AppInfo } from '../types';
import { ShieldCheck, Check, X, Save, RefreshCw, UserCheck } from 'lucide-react';

interface AdminPermissionsProps {
  users: User[];
  apps: AppInfo[];
  onRefresh: () => void;
  jwtToken?: string;
}

export const AdminPermissions: React.FC<AdminPermissionsProps> = ({ users, apps, onRefresh, jwtToken }) => {
  // Local state map of permissions: userId -> array of allowedAppIds
  const [permissionState, setPermissionState] = useState<{ [userId: string]: string[] }>(() => {
    const map: { [userId: string]: string[] } = {};
    (users || []).forEach((u) => {
      let appsArr: string[] = [];
      if (Array.isArray(u.allowedApps)) {
        appsArr = u.allowedApps;
      } else if (typeof u.allowedApps === 'string') {
        try {
          const parsed = JSON.parse(u.allowedApps);
          if (Array.isArray(parsed)) appsArr = parsed;
        } catch (e) {}
      }
      map[u.id] = appsArr;
    });
    return map;
  });

  const [savingId, setSavingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const togglePermission = (userId: string, appId: string) => {
    const cleanApp = appId.toLowerCase();
    setPermissionState((prev) => {
      const current = prev[userId] || [];
      const updated = current.includes(cleanApp)
        ? current.filter((a) => a !== cleanApp)
        : [...current, cleanApp];
      return { ...prev, [userId]: updated };
    });
  };

  const saveUserPermissions = async (user: User) => {
    setSavingId(user.id);
    setSuccessMsg(null);

    const newApps = permissionState[user.id] || [];

    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwtToken}`,
        },
        body: JSON.stringify({
          allowedApps: newApps,
        }),
      });

      if (res.ok) {
        setSuccessMsg(`Permissões do usuário "${user.name}" atualizadas com sucesso!`);
        setTimeout(() => setSuccessMsg(null), 3000);
        onRefresh();
      } else {
        alert('Erro ao salvar permissões.');
      }
    } catch (err) {
      alert('Falha de conexão.');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Matriz de Permissões (User x App)</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Marque ou desmarque quais usuários possuem acesso a cada aplicação corporativa.
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center space-x-2">
          <Check className="w-4 h-4 text-emerald-500" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="py-3.5 px-4 min-w-[200px]">Usuário</th>
                {apps.map((app) => (
                  <th key={app.id} className="py-3.5 px-4 text-center min-w-[130px]">
                    <div className="font-bold text-slate-900 dark:text-white">{app.name}</div>
                    <div className="text-[10px] text-orange-600 dark:text-orange-400 font-mono lowercase">
                      {app.appId}
                    </div>
                  </th>
                ))}
                <th className="py-3.5 px-4 text-right min-w-[120px]">Salvar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {users.map((u) => {
                const isAdmin = u.role === 'admin';
                const currentApps = permissionState[u.id] || u.allowedApps || [];

                return (
                  <tr key={u.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                      <div className="flex items-center space-x-2">
                        <span>{u.name}</span>
                        {isAdmin && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-purple-100 dark:bg-purple-950 text-purple-600">
                            Admin
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">@{u.username}</div>
                    </td>

                    {apps.map((app) => {
                      const isAllowed = isAdmin || currentApps.includes(app.appId.toLowerCase());

                      return (
                        <td key={app.id} className="py-3.5 px-4 text-center">
                          {isAdmin ? (
                            <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400">
                              Acesso Total
                            </span>
                          ) : (
                            <button
                              onClick={() => togglePermission(u.id, app.appId)}
                              className={`w-8 h-8 rounded-xl inline-flex items-center justify-center transition-all ${
                                isAllowed
                                  ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500/30'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                              }`}
                            >
                              {isAllowed ? <Check className="w-4 h-4 font-extrabold" /> : <X className="w-4 h-4" />}
                            </button>
                          )}
                        </td>
                      );
                    })}

                    <td className="py-3.5 px-4 text-right">
                      {!isAdmin && (
                        <button
                          onClick={() => saveUserPermissions(u)}
                          disabled={savingId === u.id}
                          className="px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-sm flex items-center space-x-1 ml-auto disabled:opacity-50"
                        >
                          {savingId === u.id ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Save className="w-3.5 h-3.5" />
                          )}
                          <span>Salvar</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
