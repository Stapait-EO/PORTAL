import React, { useState } from 'react';
import { Search, ExternalLink, ShieldCheck } from 'lucide-react';
import { User, AppInfo } from '../types';
import { renderDynamicAppIcon } from '../utils/iconGallery';

interface AppLauncherProps {
  user: User;
  appsList: AppInfo[];
  jwtToken?: string;
}

export const AppLauncher: React.FC<AppLauncherProps> = ({ user, appsList, jwtToken }) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [launchingApp, setLaunchingApp] = useState<AppInfo | null>(null);

  // Helper icon renderer
  const renderAppIcon = (iconName: string) => {
    return renderDynamicAppIcon(iconName, 'w-6 h-6 text-orange-500');
  };

  // Safe helper to extract allowed apps array
  const userAllowedApps = Array.isArray(user?.allowedApps)
    ? user.allowedApps.map((a) => String(a).toLowerCase().trim())
    : [];

  const isAdmin = user?.role === 'admin';

  // Filter apps
  const authorizedApps = (appsList || []).filter((app) => {
    if (!app || !app.appId) return false;
    const isAllowed = isAdmin || userAllowedApps.includes(String(app.appId).toLowerCase().trim());
    const matchesSearch =
      (app.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (app.description || '').toLowerCase().includes(search.toLowerCase()) ||
      (app.appId || '').toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || (app.category || 'Geral') === selectedCategory;
    return isAllowed && matchesSearch && matchesCategory;
  });

  const categories = ['all', ...Array.from(new Set((appsList || []).map((a) => a.category || 'Geral')))];

  const handleLaunch = (app: AppInfo) => {
    setLaunchingApp(app);
  };

  const executeRedirect = (app: AppInfo) => {
    const tokenStr = jwtToken || 'token_sso_demo_active';
    let target = app.callbackUrl || '';
    const username = user?.username || user?.email || 'user';
    if (target.includes('?')) {
      target += `&sso_token=${encodeURIComponent(tokenStr)}&user=${encodeURIComponent(username)}`;
    } else {
      target += `?sso_token=${encodeURIComponent(tokenStr)}&user=${encodeURIComponent(username)}`;
    }
    window.open(target, '_blank');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* Filter & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar aplicação ou sistema..."
            className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium capitalize whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {cat === 'all' ? 'Todas as Categorias' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Authorized Apps Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
            <span>Sistemas Autorizados para Você</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
              {authorizedApps.length}
            </span>
          </h2>
        </div>

        {authorizedApps.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-2">
            <p className="text-slate-500 dark:text-slate-400 text-sm">Nenhuma aplicação localizada para sua busca ou permissões atuais.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {authorizedApps.map((app) => (
              <div
                key={app.id}
                className="group relative bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-md hover:shadow-xl hover:border-orange-300 dark:hover:border-orange-800 transition-all duration-200 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:scale-105 transition-transform">
                      {renderAppIcon(app.icon)}
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                      {app.category || 'Geral'}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                      {app.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed line-clamp-2">
                      {app.description}
                    </p>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                  <span className="text-[11px] font-mono text-slate-400 truncate max-w-[150px]">
                    {app.appId}.mifireapp.com.br
                  </span>
                  <button
                    onClick={() => handleLaunch(app)}
                    className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-md shadow-orange-500/20 transition-all"
                  >
                    <span>Entrar</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL: Launching SSO Confirmation */}
      {launchingApp && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 animate-fade-in">
            <div className="flex items-center space-x-3 text-orange-500">
              <ShieldCheck className="w-8 h-8" />
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Redirecionamento SSO Seguro</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Handshake de Autenticação em tempo real</p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-3 border border-slate-200 dark:border-slate-700">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Aplicação Alvo:</span>
                <span className="font-bold text-slate-900 dark:text-white">{launchingApp.name}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">URL Callback:</span>
                <span className="font-mono text-orange-600 dark:text-orange-400 truncate max-w-[240px]">{launchingApp.callbackUrl}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Usuário SSO:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{user.username} ({user.email})</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Cookie Domain:</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400">.mifireapp.com.br</span>
              </div>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300 space-y-1">
              <span className="font-bold block">Token JWT Injetado no Redirecionamento:</span>
              <p className="font-mono text-[10px] break-all opacity-80">{jwtToken || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'}</p>
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setLaunchingApp(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  executeRedirect(launchingApp);
                  setLaunchingApp(null);
                }}
                className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-md shadow-orange-500/20 flex items-center space-x-2"
              >
                <span>Acessar {launchingApp.name}</span>
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
