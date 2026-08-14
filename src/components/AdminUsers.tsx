import React, { useState } from 'react';
import { User, AppInfo } from '../types';
import { UserPlus, Edit2, Trash2, CheckCircle2, XCircle, Search, Shield, Key, RefreshCw } from 'lucide-react';

interface AdminUsersProps {
  users: User[];
  apps: AppInfo[];
  onRefresh: () => void;
  jwtToken?: string;
}

export const AdminUsers: React.FC<AdminUsersProps> = ({ users, apps, onRefresh, jwtToken }) => {
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'user' | 'manager'>('user');
  const [active, setActive] = useState(true);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [allowedApps, setAllowedApps] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const openCreateModal = () => {
    setEditingUser(null);
    setName('');
    setEmail('');
    setUsername('');
    setPassword('');
    setRole('user');
    setActive(true);
    setMustChangePassword(false);
    setAllowedApps([]);
    setError(null);
    setShowModal(true);
  };

  const openEditModal = (u: User) => {
    setEditingUser(u);
    setName(u.name || '');
    setEmail(u.email || '');
    setUsername(u.username || '');
    setPassword(''); // leave blank if unchanged
    setRole(u.role || 'user');
    setActive(Boolean(u.active));
    setMustChangePassword(Boolean(u.mustChangePassword));

    let parsedApps: string[] = [];
    if (Array.isArray(u.allowedApps)) {
      parsedApps = u.allowedApps;
    } else if (typeof u.allowedApps === 'string') {
      try {
        const json = JSON.parse(u.allowedApps);
        if (Array.isArray(json)) parsedApps = json;
      } catch (e) {}
    }
    setAllowedApps(parsedApps);
    setError(null);
    setShowModal(true);
  };

  const toggleAppPermission = (appId: string) => {
    if (!appId) return;
    const clean = appId.toLowerCase();
    setAllowedApps((prev) => {
      const current = Array.isArray(prev) ? prev : [];
      const isPresent = current.some((a) => String(a).toLowerCase() === clean);
      return isPresent
        ? current.filter((a) => String(a).toLowerCase() !== clean)
        : [...current, clean];
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const endpoint = editingUser ? `/api/admin/users/${editingUser.id}` : '/api/admin/users';
    const method = editingUser ? 'PUT' : 'POST';

    try {
      const res = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwtToken}`,
        },
        body: JSON.stringify({
          name,
          email,
          username,
          password: password || undefined,
          role,
          active,
          mustChangePassword,
          allowedApps,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Erro ao salvar usuário.');
        return;
      }

      setShowModal(false);
      onRefresh();
    } catch (err) {
      setError('Falha de comunicação com o servidor.');
    }
  };

  const openDeleteModal = (user: User) => {
    setUserToDelete(user);
    setError(null);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/users/${userToDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${jwtToken}` },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setUserToDelete(null);
        onRefresh();
      } else {
        setError(data.message || 'Erro ao excluir usuário.');
      }
    } catch (err) {
      setError('Erro ao excluir usuário.');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredUsers = (users || []).filter(
    (u) =>
      u &&
      ((u.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (u.username || '').toLowerCase().includes(search.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Gestão de Usuários SSO</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Cadastre, edite e controle o status ativo e permissões de acesso às aplicações corporativas.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center space-x-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl text-xs shadow-md shadow-orange-500/20 transition-all"
        >
          <UserPlus className="w-4 h-4" />
          <span>Cadastrar Usuário</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative w-full max-w-md">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filtrar por nome, usuário ou e-mail..."
          className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="py-3 px-4">Usuário / E-mail</th>
                <th className="py-3 px-4">Função (RBAC)</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Aplicações Autorizadas</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-700 dark:text-slate-200">
                        {(u.name || u.username || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">{u.name || u.username}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                          @{u.username} • {u.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        u.role === 'admin'
                          ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300'
                          : u.role === 'manager'
                          ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {u.role || 'user'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {u.active ? (
                      <span className="inline-flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Ativo</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 text-red-500 font-semibold text-[11px]">
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Inativo</span>
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {u.role === 'admin' ? (
                      <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400">
                        Acesso Total (Admin)
                      </span>
                    ) : Array.isArray(u.allowedApps) && u.allowedApps.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {u.allowedApps.map((appId) => (
                          <span
                            key={appId}
                            className="px-2 py-0.5 bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 rounded-md font-mono text-[10px] font-bold"
                          >
                            {appId}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">Nenhuma aplicação vinculada</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right space-x-1">
                    <button
                      onClick={() => openEditModal(u)}
                      className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                      title="Editar Usuário"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {u.username !== 'admin' && (
                      <button
                        type="button"
                        onClick={() => openDeleteModal(u)}
                        className="p-1.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                        title="Excluir Usuário"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {editingUser ? `Editar Usuário: ${editingUser.name}` : 'Cadastrar Novo Usuário SSO'}
            </h3>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 text-xs text-red-600 rounded-xl">
                {error}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nome Completo
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: João Silva"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    E-mail Corporativo
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="joao@mifireapp.com.br"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nome de Usuário (Login)
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="ex: joao.vendas"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Senha {editingUser && '(Deixe em branco p/ manter)'}
                  </label>
                  <input
                    type="password"
                    required={!editingUser}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Perfil / Função (RBAC)
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  >
                    <option value="user">Usuário Padrão</option>
                    <option value="manager">Gerente de Módulo</option>
                    <option value="admin">Administrador Geral</option>
                  </select>
                </div>

                <div className="flex flex-col justify-end space-y-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={(e) => setActive(e.target.checked)}
                      className="rounded text-orange-500"
                    />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Conta Ativa
                    </span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={mustChangePassword}
                      onChange={(e) => setMustChangePassword(e.target.checked)}
                      className="rounded text-orange-500"
                    />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Forçar troca de senha no 1º acesso
                    </span>
                  </label>
                </div>
              </div>

              {/* App Permission Checklist */}
              {role !== 'admin' && (
                <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                    Aplicações Autorizadas para este Usuário:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(apps || []).map((a) => {
                      if (!a || (!a.appId && !a.id)) return null;
                      const appIdClean = (a.appId || a.id || '').toLowerCase();
                      const isChecked = Array.isArray(allowedApps) && allowedApps.some(x => String(x).toLowerCase() === appIdClean);
                      return (
                        <label
                          key={a.id || a.appId}
                          className={`flex items-center space-x-2 p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                            isChecked
                              ? 'bg-orange-50 dark:bg-orange-950/40 border-orange-300 text-orange-900 dark:text-orange-200'
                              : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleAppPermission(a.appId || a.id)}
                            className="rounded text-orange-500"
                          />
                          <span className="font-semibold">{a.name || a.appId}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl shadow-md shadow-orange-500/20"
                >
                  Salvar Usuário
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE USER CONFIRMATION MODAL */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Excluir Usuário
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tem certeza que deseja excluir o usuário <strong className="text-slate-800 dark:text-slate-200 font-semibold">"{userToDelete.name}"</strong> (<code className="text-orange-500 font-mono">@{userToDelete.username}</code>)?
              </p>
              <p className="text-[11px] text-red-500/90 pt-1">
                Todas as sessões e permissões vinculadas a este usuário serão revogadas.
              </p>
            </div>

            {error && (
              <div className="p-2.5 bg-red-50 dark:bg-red-950/50 text-xs text-red-600 dark:text-red-400 rounded-xl border border-red-200 dark:border-red-800 text-center">
                {error}
              </div>
            )}

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDelete}
                className="flex items-center space-x-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-red-600/20 transition-all"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Excluindo...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirmar Exclusão</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
