import React, { useState, useEffect } from 'react';
import { User, AppInfo, AuditLog } from './types';
import { Navbar } from './components/Navbar';
import { LoginForm } from './components/LoginForm';
import { AppLauncher } from './components/AppLauncher';
import { AdminUsers } from './components/AdminUsers';
import { AdminApps } from './components/AdminApps';
import { AdminPermissions } from './components/AdminPermissions';
import { AdminAuditLogs } from './components/AdminAuditLogs';
import { CpanelSetupGuide } from './components/CpanelSetupGuide';
import { SsoPlayground } from './components/SsoPlayground';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Users, AppWindow, ShieldCheck, FileText, Server, RefreshCw } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [jwtToken, setJwtToken] = useState<string | undefined>(undefined);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('theme') === 'dark' || true; // Default dark/modern
  });

  const [activeView, setActiveView] = useState<'login' | 'launcher' | 'admin' | 'playground'>('login');
  const [adminTab, setAdminTab] = useState<string>('users');

  const [appsList, setAppsList] = useState<AppInfo[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Apply dark mode class to root HTML
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // Load current auth state
  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
        setJwtToken(data.token);
        // If coming with redirect_url or app_id params, keep on login view to show banner, otherwise launcher
        const search = window.location.search;
        if (!search.includes('redirect_url') && !search.includes('app_id')) {
          setActiveView('launcher');
        }
      }
    } catch (err) {
      // Not logged in
    } finally {
      setLoadingInitial(false);
    }
  };

  const loadApps = async () => {
    try {
      const res = await fetch('/api/admin/apps');
      if (res.ok) {
        const data = await res.json();
        setAppsList(data);
      }
    } catch (e) {}
  };

  const loadUsers = async () => {
    if (currentUser?.role !== 'admin') return;
    try {
      const res = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${jwtToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUsersList(data);
      }
    } catch (e) {}
  };

  const loadAuditLogs = async () => {
    if (currentUser?.role !== 'admin') return;
    try {
      const res = await fetch('/api/admin/audit-logs', {
        headers: { Authorization: `Bearer ${jwtToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data);
      }
    } catch (e) {}
  };

  useEffect(() => {
    checkAuth();
    loadApps();
  }, []);

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      loadUsers();
      loadAuditLogs();
    }
  }, [currentUser]);

  const handleLoginSuccess = (data: { user: User; token: string; redirectUrl?: string | null }) => {
    setCurrentUser(data.user);
    setJwtToken(data.token);
    loadApps();

    if (data.redirectUrl) {
      // Execute SSO redirect
      window.location.href = data.redirectUrl;
    } else {
      setActiveView('launcher');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {}
    setCurrentUser(null);
    setJwtToken(undefined);
    setActiveView('login');
  };

  if (loadingInitial) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="text-center space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin text-orange-500 mx-auto" />
          <p className="text-xs font-semibold text-slate-400">Iniciando Portal Central SSO...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {activeView !== 'login' && (
        <Navbar
          user={currentUser}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          activeView={activeView}
          setActiveView={setActiveView}
          adminTab={adminTab}
          setAdminTab={setAdminTab}
          onLogout={handleLogout}
        />
      )}

      <main className={activeView === 'login' ? '' : 'pb-16'}>
        {activeView === 'login' && (
          <LoginForm
            currentUser={currentUser}
            onLoginSuccess={handleLoginSuccess}
            onContinueSession={() => setActiveView('launcher')}
            onLogout={handleLogout}
            appsList={appsList}
            darkMode={darkMode}
            setDarkMode={setDarkMode}
            logoUrl="/logo.png"
          />
        )}

        {activeView === 'launcher' && currentUser && (
          <ErrorBoundary fallbackTitle="Erro ao carregar o Lançador de Aplicações">
            <AppLauncher user={currentUser} appsList={appsList} jwtToken={jwtToken} />
          </ErrorBoundary>
        )}

        {activeView === 'playground' && currentUser?.role === 'admin' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <SsoPlayground
              currentUser={currentUser}
              jwtToken={jwtToken}
              onBack={() => setActiveView('admin')}
            />
          </div>
        )}

        {activeView === 'admin' && currentUser?.role === 'admin' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
            {/* Admin Tabs Bar */}
            <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
              <button
                onClick={() => setAdminTab('users')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  adminTab === 'users'
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Usuários SSO</span>
              </button>

              <button
                onClick={() => setAdminTab('apps')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  adminTab === 'apps'
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                <AppWindow className="w-4 h-4" />
                <span>Aplicações Conectadas</span>
              </button>

              <button
                onClick={() => setAdminTab('permissions')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  adminTab === 'permissions'
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Matriz de Permissões</span>
              </button>

              <button
                onClick={() => setAdminTab('audit')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  adminTab === 'audit'
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Logs de Auditoria</span>
              </button>

              <button
                onClick={() => setAdminTab('cpanel')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  adminTab === 'cpanel'
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                <Server className="w-4 h-4" />
                <span>Guia cPanel & MySQL</span>
              </button>
            </div>

            {/* Tab Contents */}
            <ErrorBoundary fallbackTitle="Erro ao exibir módulo de administração">
              {adminTab === 'users' && (
                <AdminUsers
                  users={usersList}
                  apps={appsList}
                  onRefresh={() => {
                    loadUsers();
                    loadApps();
                  }}
                  jwtToken={jwtToken}
                />
              )}

              {adminTab === 'apps' && (
                <AdminApps
                  apps={appsList}
                  onRefresh={() => {
                    loadApps();
                    loadUsers();
                  }}
                  jwtToken={jwtToken}
                />
              )}

              {adminTab === 'permissions' && (
                <AdminPermissions
                  users={usersList}
                  apps={appsList}
                  onRefresh={() => {
                    loadUsers();
                  }}
                  jwtToken={jwtToken}
                />
              )}

              {adminTab === 'audit' && (
                <AdminAuditLogs logs={auditLogs} onRefresh={loadAuditLogs} />
              )}

              {adminTab === 'cpanel' && <CpanelSetupGuide />}
            </ErrorBoundary>
          </div>
        )}
      </main>
    </div>
  );
}
