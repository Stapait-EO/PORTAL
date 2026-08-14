import React, { useState } from 'react';
import { AppInfo } from '../types';
import { AppWindow, Plus, Edit2, Trash2, Copy, Check, ExternalLink, RefreshCw, Sparkles } from 'lucide-react';
import { IconPickerModal } from './IconPickerModal';
import { renderDynamicAppIcon } from '../utils/iconGallery';

interface AdminAppsProps {
  apps: AppInfo[];
  onRefresh: () => void;
  jwtToken?: string;
}

export const AdminApps: React.FC<AdminAppsProps> = ({ apps, onRefresh, jwtToken }) => {
  const [showModal, setShowModal] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [editingApp, setEditingApp] = useState<AppInfo | null>(null);
  const [appToDelete, setAppToDelete] = useState<AppInfo | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form State
  const [appId, setAppId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [callbackUrl, setCallbackUrl] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [icon, setIcon] = useState('AppWindow');
  const [category, setCategory] = useState('Geral');
  const [active, setActive] = useState(true);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateSecret = () => {
    const random = Math.random().toString(36).substring(2, 12) + Date.now().toString().slice(-4);
    setSecretKey(`sec_${appId || 'app'}_${random}`);
  };

  const openCreateModal = () => {
    setEditingApp(null);
    setAppId('');
    setName('');
    setDescription('');
    setCallbackUrl('');
    setSecretKey(`sec_app_${Math.random().toString(36).substring(2, 10)}`);
    setIcon('AppWindow');
    setCategory('Geral');
    setActive(true);
    setError(null);
    setShowModal(true);
  };

  const openEditModal = (app: AppInfo) => {
    setEditingApp(app);
    setAppId(app.appId);
    setName(app.name);
    setDescription(app.description);
    setCallbackUrl(app.callbackUrl);
    setSecretKey(app.secretKey);
    setIcon(app.icon);
    setCategory(app.category || 'Geral');
    setActive(app.active);
    setError(null);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const endpoint = editingApp ? `/api/admin/apps/${editingApp.id}` : '/api/admin/apps';
    const method = editingApp ? 'PUT' : 'POST';

    try {
      const res = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwtToken}`,
        },
        body: JSON.stringify({
          appId,
          name,
          description,
          callbackUrl,
          secretKey,
          icon,
          category,
          active,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Erro ao salvar aplicação.');
        return;
      }

      setShowModal(false);
      onRefresh();
    } catch (err) {
      setError('Erro de conexão ao salvar aplicação.');
    }
  };

  const openDeleteModal = (app: AppInfo) => {
    setAppToDelete(app);
    setError(null);
  };

  const confirmDelete = async () => {
    if (!appToDelete) return;
    setIsDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/apps/${appToDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${jwtToken}` },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setAppToDelete(null);
        onRefresh();
      } else {
        setError(data.message || 'Erro ao excluir aplicação.');
      }
    } catch (err) {
      setError('Erro de conexão ao excluir aplicação.');
    } finally {
      setIsDeleting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Aplicações Conectadas ao SSO</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Cadastre novos subdomínios e obtenha as chaves secretas de integração backend.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center space-x-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl text-xs shadow-md shadow-orange-500/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Aplicação</span>
        </button>
      </div>

      {/* Applications Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="py-3 px-4">Aplicação</th>
                <th className="py-3 px-4">App ID</th>
                <th className="py-3 px-4">URL do Callback</th>
                <th className="py-3 px-4">Chave Secreta de Integração</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {apps.map((app) => (
                <tr key={app.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold">
                        {renderDynamicAppIcon(app.icon, 'w-5 h-5 text-orange-600 dark:text-orange-400')}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                          <span>{app.name}</span>
                          <span className="px-2 py-0.5 rounded-full text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {app.category || 'Geral'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-1">{app.description}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <code className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-orange-600 dark:text-orange-400 font-mono font-bold text-[11px]">
                      {app.appId}
                    </code>
                  </td>
                  <td className="py-3 px-4">
                    <a
                      href={app.callbackUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center space-x-1 text-slate-600 dark:text-slate-300 hover:text-orange-500 font-mono text-[11px]"
                    >
                      <span className="truncate max-w-[200px]">{app.callbackUrl}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-2">
                      <code className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono text-[10px] rounded border border-slate-200 dark:border-slate-700">
                        {app.secretKey}
                      </code>
                      <button
                        onClick={() => copyToClipboard(app.secretKey)}
                        className="p-1 text-slate-400 hover:text-orange-500"
                        title="Copiar Chave Secreta"
                      >
                        {copiedKey === app.secretKey ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right space-x-1">
                    <button
                      onClick={() => openEditModal(app)}
                      className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => openDeleteModal(app)}
                      title="Excluir Aplicação"
                      className="p-1.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {editingApp ? `Editar App: ${editingApp.name}` : 'Registrar Nova Aplicação'}
            </h3>

            {error && <div className="p-2.5 bg-red-50 text-xs text-red-600 rounded-xl">{error}</div>}

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">App ID (Identificador do Subdomínio)</label>
                <input
                  type="text"
                  required
                  value={appId}
                  onChange={(e) => setAppId(e.target.value.toLowerCase().trim())}
                  placeholder="ex: expedicao ou vendas"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Nome do Sistema</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ex: Sistema de Expedição & Logística"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Descrição Curta</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Finalidade deste módulo..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">URL do Callback SSO</label>
                <input
                  type="url"
                  required
                  value={callbackUrl}
                  onChange={(e) => setCallbackUrl(e.target.value)}
                  placeholder="https://expedicao.mifireapp.com.br/callback"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Chave Secreta de Integração</label>
                  <button
                    type="button"
                    onClick={generateSecret}
                    className="text-[11px] text-orange-600 hover:underline flex items-center space-x-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Gerar Nova</span>
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-[11px]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Ícone da Aplicação
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowIconPicker(true)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:border-orange-400 dark:hover:border-orange-500 transition-all text-left group"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
                        {renderDynamicAppIcon(icon, 'w-4 h-4 text-orange-600 dark:text-orange-400')}
                      </div>
                      <span className="font-mono text-xs text-slate-800 dark:text-slate-200 truncate">
                        {icon || 'AppWindow'}
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold text-orange-600 dark:text-orange-400 group-hover:underline flex items-center space-x-1 shrink-0">
                      <Sparkles className="w-3 h-3" />
                      <span>Galeria...</span>
                    </span>
                  </button>
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Categoria</label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Logística, Financeiro, Vendas, RH..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                  {/* Quick suggestions */}
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {['Logística', 'Vendas', 'Financeiro', 'RH', 'Produção', 'TI'].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCategory(c)}
                        className={`px-1.5 py-0.5 rounded text-[10px] transition-colors ${
                          category === c
                            ? 'bg-orange-500 text-white font-bold'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl shadow-md"
                >
                  Salvar Aplicação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ICON PICKER MODAL */}
      {showIconPicker && (
        <IconPickerModal
          currentIcon={icon}
          onSelectIcon={(newIcon) => setIcon(newIcon)}
          onClose={() => setShowIconPicker(false)}
        />
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {appToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Excluir Aplicação
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tem certeza que deseja remover a aplicação <strong className="text-slate-800 dark:text-slate-200 font-semibold">"{appToDelete.name}"</strong> (<code className="text-orange-500 font-mono">{appToDelete.appId}</code>)?
              </p>
              <p className="text-[11px] text-red-500/90 pt-1">
                Isso também revogará o acesso a este sistema de todos os usuários vinculados.
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
                onClick={() => setAppToDelete(null)}
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
