import React from 'react';
import { Shield, LayoutGrid, Users, LogOut, Moon, Sun, Terminal, KeyRound } from 'lucide-react';
import { User } from '../types';
import { MatIncendioLogo } from './MatIncendioLogo';

interface NavbarProps {
  user: User | null;
  darkMode: boolean;
  setDarkMode: (val: boolean | ((prev: boolean) => boolean)) => void;
  activeView: 'launcher' | 'admin' | 'playground' | 'login';
  setActiveView: (view: 'launcher' | 'admin' | 'playground' | 'login') => void;
  adminTab: string;
  setAdminTab: (tab: string) => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  darkMode,
  setDarkMode,
  activeView,
  setActiveView,
  setAdminTab,
  onLogout,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => user ? setActiveView('launcher') : setActiveView('login')}>
          <MatIncendioLogo height={42} className="h-10 w-auto" />
        </div>

        {/* Navigation Actions */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {user && (
            <>
              {/* App Launcher Button */}
              <button
                onClick={() => setActiveView('launcher')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  activeView === 'launcher'
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
                <span className="hidden md:inline">Lançador de Apps</span>
              </button>

              {/* Admin Panel Button */}
              {user.role === 'admin' && (
                <button
                  onClick={() => setActiveView('admin')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    activeView === 'admin'
                      ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Painel Admin</span>
                </button>
              )}
            </>
          )}

          {/* Playground / Simulator - Visível exclusivamente quando o Painel Admin está ativo */}
          {user?.role === 'admin' && (activeView === 'admin' || activeView === 'playground') && (
            <button
              id="btn-sso-playground-nav"
              onClick={() => setActiveView('playground')}
              title="Simulador / Testador de API SSO"
              className={`p-2 rounded-lg text-sm font-medium transition-all ${
                activeView === 'playground'
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Terminal className="w-4 h-4" />
            </button>
          )}

          {/* cPanel Guide Direct Link */}
          {user?.role === 'admin' && (
            <button
              onClick={() => {
                setActiveView('admin');
                setAdminTab('cpanel');
              }}
              title="Guia de Instalação no cPanel"
              className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
            >
              <KeyRound className="w-4 h-4" />
            </button>
          )}

          {/* Dark / Light Mode Toggle */}
          <button
            onClick={() => setDarkMode((prev) => !prev)}
            title="Alternar Tema"
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          {/* User Profile & Logout */}
          {user ? (
            <div className="flex items-center pl-2 border-l border-slate-200 dark:border-slate-800 space-x-2">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-semibold text-slate-900 dark:text-white leading-tight">
                  {user.name || user.username || 'Usuário'}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 capitalize">
                  {user.role === 'admin' ? 'Administrador' : user.role === 'manager' ? 'Gerente' : 'Usuário'}
                </span>
              </div>
              <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 flex items-center justify-center font-bold text-xs uppercase border border-slate-300 dark:border-slate-600">
                {(user.name || user.username || 'U').charAt(0).toUpperCase()}
              </div>
              <button
                onClick={onLogout}
                title="Sair do SSO"
                className="p-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-all"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setActiveView('login')}
              className="px-4 py-1.5 text-sm font-semibold rounded-lg bg-orange-500 hover:bg-orange-600 text-white transition-all shadow-sm"
            >
              Acessar SSO
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
