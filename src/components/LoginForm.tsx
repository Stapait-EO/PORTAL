import React, { useState, useEffect } from 'react';
import {
  Shield,
  Lock,
  User as UserIcon,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Key,
  RefreshCw,
  X,
  Database,
  Server,
  Copy,
  Check,
  Globe,
  Settings,
  Info,
  Sun,
  Moon,
  Loader2,
} from 'lucide-react';
import { User, AppInfo } from '../types';
import { MatIncendioLogo } from './MatIncendioLogo';

interface LoginFormProps {
  currentUser: User | null;
  onLoginSuccess: (data: { user: User; token: string; redirectUrl?: string | null }) => void;
  onContinueSession: () => void;
  onLogout: () => void;
  appsList: AppInfo[];
  darkMode?: boolean;
  setDarkMode?: (val: boolean) => void;
  logoUrl?: string;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  currentUser,
  onLoginSuccess,
  onContinueSession,
  onLogout,
  appsList,
  darkMode,
  setDarkMode,
  logoUrl,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoError, setLogoError] = useState(false);

  // URL parameters for SSO callback / app redirect
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const [appId, setAppId] = useState<string | null>(null);
  const [targetApp, setTargetApp] = useState<AppInfo | null>(null);

  // System & Database Mode State
  const [sysInfo, setSysInfo] = useState<any>(null);
  const [switchingMode, setSwitchingMode] = useState(false);
  const [copiedIp, setCopiedIp] = useState(false);
  const [showDbModal, setShowDbModal] = useState(false);

  const [dbHostInput, setDbHostInput] = useState('');
  const [dbUserInput, setDbUserInput] = useState('');
  const [dbPassInput, setDbPassInput] = useState('');
  const [dbNameInput, setDbNameInput] = useState('');
  const [dbPortInput, setDbPortInput] = useState('3306');

  // Modals
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotInput, setForgotInput] = useState('');
  const [forgotMessage, setForgotMessage] = useState<string | null>(null);
  const [forgotMessageType, setForgotMessageType] = useState<'error' | 'success' | null>(null);
  const [forgotDemoCode, setForgotDemoCode] = useState<string | null>(null);
  const [forgotMustChangeFlag, setForgotMustChangeFlag] = useState<boolean>(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [resetCodeInput, setResetCodeInput] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);

  // First Login Password Change Modal
  const [mustChangeUser, setMustChangeUser] = useState<{ user: User; token: string } | null>(null);
  const [currentPassInput, setCurrentPassInput] = useState('');
  const [newPassInput, setNewPassInput] = useState('');
  const [changePassError, setChangePassError] = useState<string | null>(null);

  // Exibir painel de configuração/IP apenas em ambiente de desenvolvimento (AI Studio / localhost) ou se houver ?debug=true
  const isDevelopmentEnvironment =
    typeof window !== 'undefined' &&
    (window.location.hostname.includes('run.app') ||
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      new URLSearchParams(window.location.search).get('debug') === 'true');

  const fetchSysInfo = async () => {
    try {
      const res = await fetch('/api/system/info');
      if (res.ok) {
        const data = await res.json();
        setSysInfo(data);
        if (data.database) {
          setDbHostInput(data.database.host || '');
          setDbUserInput(data.database.user || '');
          setDbNameInput(data.database.database || '');
          setDbPortInput(String(data.database.port || 3306));
        }
      }
    } catch (e) {}
  };

  useEffect(() => {
    // Parse URL params like ?redirect_url=...&app_id=expedicao
    const searchParams = new URLSearchParams(window.location.search);
    const urlParam = searchParams.get('redirect_url');
    const appParam = searchParams.get('app_id');

    if (urlParam) setRedirectUrl(urlParam);
    if (appParam) {
      setAppId(appParam);
      const matched = appsList.find((a) => a.appId.toLowerCase() === appParam.toLowerCase());
      if (matched) setTargetApp(matched);
    }

    fetchSysInfo();
  }, [appsList]);

  const handleSwitchMode = async (targetMode: 'mysql' | 'development', customCreds?: any) => {
    setSwitchingMode(true);
    try {
      const res = await fetch('/api/system/mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: targetMode,
          ...customCreds,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSysInfo((prev: any) => ({
          ...prev,
          database: data.status,
          serverPublicIp: data.serverPublicIp || prev?.serverPublicIp,
        }));
        if (customCreds) setShowDbModal(false);
      }
    } catch (err) {
      alert('Erro ao alterar modo de banco de dados.');
    } finally {
      setSwitchingMode(false);
    }
  };

  const copyIp = (ip: string) => {
    navigator.clipboard.writeText(ip);
    setCopiedIp(true);
    setTimeout(() => setCopiedIp(false), 2500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          password,
          rememberMe,
          redirect_url: redirectUrl,
          app_id: appId,
        }),
      });

      let data: any = {};
      try {
        data = await res.json();
      } catch (e) {
        throw new Error('Servidor retornou uma resposta em formato inválido.');
      }

      if (!res.ok) {
        setError(data.message || 'Credenciais inválidas ou erro ao realizar login.');
        setLoading(false);
        return;
      }

      if (data.user?.mustChangePassword) {
        setMustChangeUser({ user: data.user, token: data.token });
        setLoading(false);
        return;
      }

      onLoginSuccess({
        user: data.user,
        token: data.token,
        redirectUrl: data.redirectUrl,
      });
    } catch (err: any) {
      setError(err?.message || 'Falha de conexão com o servidor de autenticação SSO.');
    } finally {
      setLoading(false);
    }
  };

  const handleFirstPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePassError(null);

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mustChangeUser?.token}`,
        },
        body: JSON.stringify({
          currentPassword: currentPassInput,
          newPassword: newPassInput,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setChangePassError(data.message || 'Erro ao alterar senha.');
        return;
      }

      const updatedUser = { ...mustChangeUser!.user, mustChangePassword: false };
      onLoginSuccess({
        user: updatedUser,
        token: mustChangeUser!.token,
        redirectUrl,
      });
      setMustChangeUser(null);
    } catch (err) {
      setChangePassError('Erro ao conectar ao servidor.');
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotMessage(null);
    setForgotMessageType(null);
    setForgotDemoCode(null);
    setForgotMustChangeFlag(false);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailOrUsername: forgotInput.trim() }),
      });

      const data = await res.json();

      if (!data.success || !data.allowed || !data.mustChangePassword) {
        setForgotMessageType('error');
        setForgotMessage(data.message || 'Usuário não liberado para reconfigurar sua senha');
        setForgotMustChangeFlag(false);
        setForgotDemoCode(null);
        return;
      }

      // Usuário válido e com must_change_password = 1
      setForgotMessageType('success');
      setForgotMessage(data.message || 'Usuário liberado para reconfigurar a senha.');
      setForgotMustChangeFlag(true);
      if (data.demoToken) {
        setForgotDemoCode(data.demoToken);
      }
    } catch (err: any) {
      setForgotMessageType('error');
      setForgotMessage('Erro ao conectar ao servidor para verificar a conta.');
      setForgotMustChangeFlag(false);
      setForgotDemoCode(null);
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setResetMessage(null);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: forgotInput.trim(),
          resetCode: resetCodeInput.trim(),
          newPassword: resetNewPassword,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setResetSuccess(true);
        setResetMessage(data.message || 'Senha redefinida com sucesso! Você já pode fazer login.');
        setTimeout(() => {
          setShowForgotModal(false);
          setForgotDemoCode(null);
          setResetCodeInput('');
          setResetNewPassword('');
          setForgotMustChangeFlag(false);
          setForgotMessage(null);
          setForgotMessageType(null);
          setResetSuccess(false);
          setResetMessage(null);
        }, 2000);
      } else {
        setResetMessage(data.message || 'Falha ao redefinir senha.');
      }
    } catch (err) {
      setResetMessage('Erro ao conectar ao servidor para redefinir senha.');
    } finally {
      setResetLoading(false);
    }
  };

  const quickLogin = (usr: string, pass: string) => {
    setUsername(usr);
    setPassword(pass);
    setError(null);
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      {setDarkMode && (
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="absolute top-4 right-4 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-sm"
          title="Alternar Tema"
        >
          {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-500" />}
        </button>
      )}
      <div className="w-full max-w-md">
        {/* Active Session Card if user already logged in */}
        {currentUser ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-xl border border-slate-200 dark:border-slate-800 text-center space-y-5 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto ring-4 ring-emerald-50 dark:ring-emerald-900/30">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Sessão SSO Ativa</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Você já está autenticado como <span className="font-semibold text-slate-900 dark:text-slate-200">{currentUser.name}</span> ({currentUser.username}).
              </p>
            </div>

            {targetApp && (
              <div className="p-3 bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 rounded-xl text-left text-xs space-y-1">
                <span className="font-semibold text-orange-800 dark:text-orange-300 flex items-center gap-1">
                  <ExternalLink className="w-3.5 h-3.5" /> Aplicação Solicitante:
                </span>
                <p className="text-slate-700 dark:text-slate-300 font-medium">{targetApp.name} ({targetApp.appId})</p>
              </div>
            )}

            <div className="space-y-2 pt-2">
              <button
                onClick={onContinueSession}
                className="w-full py-2.5 px-4 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-semibold text-sm shadow-md shadow-orange-500/20 flex items-center justify-center space-x-2 transition-all"
              >
                <span>Acessar Portal / Continuar</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={onLogout}
                className="w-full py-2 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium text-xs transition-all"
              >
                Entrar com Outra Conta
              </button>
            </div>
          </div>
        ) : (
          /* Centralized Login Box */
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 shadow-xl border border-slate-200 dark:border-slate-800 space-y-6">
            {/* Header / Target App Banner */}
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center mb-1">
                <MatIncendioLogo height={56} className="h-14 max-w-[280px] mx-auto" />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Autenticação Única Corporativa MAT INCÊNDIO
              </p>

              {/* Target App Callout if arriving from an app */}
              {targetApp ? (
                <div className="mt-3 p-3 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-slate-800 dark:to-slate-800/80 border border-orange-200 dark:border-slate-700 rounded-xl text-left flex items-start space-x-3">
                  <div className="p-2 bg-orange-500 text-white rounded-lg shrink-0 mt-0.5">
                    <ExternalLink className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                      Entrando em:
                    </span>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">{targetApp.name}</h2>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{targetApp.callbackUrl}</p>
                  </div>
                </div>
              ) : appId ? (
                <div className="mt-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300">
                  Solicitação de Acesso para: <span className="font-bold text-orange-600 dark:text-orange-400">{appId}</span>
                </div>
              ) : null}
            </div>

            {/* Error Banner */}
            {error && (
              <div className="p-3.5 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/80 rounded-xl flex items-start space-x-2.5 text-xs text-red-700 dark:text-red-300">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                <div className="leading-relaxed">{error}</div>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Usuário ou E-mail
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="ex: admin ou carlos.expedicao"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Senha de Acesso
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotModal(true);
                      setForgotInput(username);
                      setForgotMessage(null);
                      setForgotMessageType(null);
                      setForgotDemoCode(null);
                      setForgotMustChangeFlag(false);
                      setResetMessage(null);
                    }}
                    className="text-xs text-orange-600 hover:text-orange-700 dark:text-orange-400 font-medium"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded text-orange-500 border-slate-300 focus:ring-orange-500 dark:border-slate-700 dark:bg-slate-800"
                  />
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Lembrar neste navegador</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-orange-500/25 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Autenticando...</span>
                  </>
                ) : (
                  <>
                    <span>Entrar no Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Database Selector & Server IP Box (Aparece apenas em ambiente de teste/desenvolvimento ou ?debug=true) */}
            {isDevelopmentEnvironment && (
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center space-x-1.5">
                    <Database className="w-3.5 h-3.5 text-orange-500" />
                    <span>Ambiente / Banco de Dados</span>
                  </span>

                  <button
                    type="button"
                    onClick={() => setShowDbModal(true)}
                    className="text-[11px] font-semibold text-orange-600 hover:text-orange-700 dark:text-orange-400 flex items-center space-x-1"
                  >
                    <Settings className="w-3 h-3" />
                    <span>Configurar MySQL</span>
                  </button>
                </div>

                {/* Mode Toggle Buttons */}
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
                  <button
                    type="button"
                    disabled={switchingMode}
                    onClick={() => handleSwitchMode('mysql')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
                      sysInfo?.database?.mode === 'mysql'
                        ? sysInfo?.database?.connected
                          ? 'bg-emerald-500 text-white shadow-sm'
                          : 'bg-amber-500 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Server className="w-3.5 h-3.5 shrink-0" />
                    <span>MySQL Servidor</span>
                  </button>

                  <button
                    type="button"
                    disabled={switchingMode}
                    onClick={() => handleSwitchMode('development')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
                      sysInfo?.database?.mode === 'development' || !sysInfo?.database?.mode
                        ? 'bg-orange-500 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Database className="w-3.5 h-3.5 shrink-0" />
                    <span>Desenvolvimento</span>
                  </button>
                </div>

                {/* Server Public IP Badge & Helper */}
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-200 dark:border-slate-700/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 text-xs">
                      <Globe className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                      <span className="font-semibold text-slate-700 dark:text-slate-300">IP Atual do Servidor:</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => copyIp(sysInfo?.serverPublicIp || '34.138.192.84')}
                      className="flex items-center space-x-1 text-[11px] font-bold text-orange-600 dark:text-orange-400 hover:underline"
                    >
                      {copiedIp ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      <span>{sysInfo?.serverPublicIp || 'Carregando IP...'}</span>
                    </button>
                  </div>

                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                    💡 Adicione este IP (ou <code className="text-orange-600 dark:text-orange-400 font-bold">%</code>) no menu <strong>"Remote MySQL"</strong> do seu cPanel para liberar acesso direto do preview ao seu banco MySQL.
                  </p>

                  {/* Connection Status Text */}
                  {sysInfo?.database?.mode === 'mysql' ? (
                    sysInfo?.database?.connected ? (
                      <div className="pt-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center space-x-1">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>Conectado: {sysInfo.database.host} ({sysInfo.database.database})</span>
                      </div>
                    ) : (
                      <div className="pt-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400 space-y-1">
                        <div className="flex items-center space-x-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                          <span>Servidor MySQL inacessível diretamente (Fallback Ativo)</span>
                        </div>
                        <p className="text-[10px] text-slate-500">
                          {sysInfo?.database?.error || 'Verifique o Remote MySQL no cPanel ou use a opção Configurar MySQL.'}
                        </p>
                      </div>
                    )
                  ) : (
                    <div className="pt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center space-x-1">
                      <Info className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                      <span>Modo Desenvolvimento (Memória Local ativada)</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL: First Login Password Change Required */}
      {mustChangeUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center space-x-3 text-amber-600 dark:text-amber-400">
              <Key className="w-6 h-6 shrink-0" />
              <h2 className="text-lg font-bold">Alteração de Senha Obrigatória</h2>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Olá, <span className="font-semibold text-slate-900 dark:text-white">{mustChangeUser.user.name}</span>! Este é seu primeiro acesso ao Portal SSO. Por motivos de segurança, você deve definir uma nova senha pessoal antes de continuar.
            </p>

            {changePassError && (
              <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-300">
                {changePassError}
              </div>
            )}

            <form onSubmit={handleFirstPasswordChange} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Senha Atual (Mudar@123)</label>
                <input
                  type="password"
                  required
                  value={currentPassInput}
                  onChange={(e) => setCurrentPassInput(e.target.value)}
                  placeholder="Mudar@123"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Nova Senha Pessoal</label>
                <input
                  type="password"
                  required
                  value={newPassInput}
                  onChange={(e) => setNewPassInput(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setMustChangeUser(null)}
                  className="px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl shadow-md"
                >
                  Salvar Nova Senha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Forgot Password */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 relative">
            <button
              onClick={() => setShowForgotModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Redefinição de Senha SSO</h2>

            {!forgotDemoCode ? (
              <form onSubmit={handleForgotPassword} className="space-y-3">
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Informe seu nome de usuário ou e-mail cadastrado.
                </p>
                <input
                  type="text"
                  required
                  value={forgotInput}
                  onChange={(e) => {
                    setForgotInput(e.target.value);
                    if (forgotMessage) {
                      setForgotMessage(null);
                      setForgotMessageType(null);
                    }
                  }}
                  placeholder="ex: admin ou carlos.silva@mifireapp.com.br"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />

                {forgotMessage && (
                  <div
                    className={`p-3 rounded-xl text-xs space-y-1 ${
                      forgotMessageType === 'error'
                        ? 'bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
                        : 'bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                    }`}
                  >
                    <div className="flex items-start space-x-2">
                      {forgotMessageType === 'error' ? (
                        <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p className="font-semibold">{forgotMessage}</p>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white rounded-xl font-bold text-xs shadow-md flex items-center justify-center space-x-2"
                >
                  {forgotLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verificando...</span>
                    </>
                  ) : (
                    <span>Verificar Conta & Gerar Código</span>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-3">
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs space-y-1">
                  <span className="font-bold text-amber-800 dark:text-amber-300">Código de Validação Gerado:</span>
                  <p className="font-mono font-bold text-slate-900 dark:text-white text-sm">{forgotDemoCode}</p>
                </div>

                {forgotMustChangeFlag && (
                  <div className="p-2.5 bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700 rounded-xl text-xs text-amber-800 dark:text-amber-200 font-medium space-y-1">
                    <p className="font-bold">⚡ Campo must_change_password = 1 Ativo</p>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300">
                      Ao concluir a redefinição abaixo, a nova senha será gravada e o parâmetro <code className="font-bold text-orange-600 dark:text-orange-400">must_change_password</code> na tabela MySQL será redefinido para <code className="font-bold text-emerald-600 dark:text-emerald-400">0</code>.
                    </p>
                  </div>
                )}

                {resetMessage && (
                  <div
                    className={`p-3 rounded-xl text-xs flex items-center space-x-2 ${
                      resetSuccess
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                        : 'bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
                    }`}
                  >
                    {resetSuccess ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                    )}
                    <span className="font-semibold">{resetMessage}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Informe o Código</label>
                  <input
                    type="text"
                    required
                    value={resetCodeInput}
                    onChange={(e) => setResetCodeInput(e.target.value)}
                    placeholder="Insira o código acima"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Nova Senha</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={resetNewPassword}
                    onChange={(e) => setResetNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={resetLoading || resetSuccess}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl font-bold text-xs shadow-md flex items-center justify-center space-x-2"
                >
                  {resetLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Atualizando Senha...</span>
                    </>
                  ) : (
                    <span>Redefinir Senha e Atualizar MySQL (Set to 0)</span>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Configure Custom MySQL Connection */}
      {showDbModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 relative">
            <button
              type="button"
              onClick={() => setShowDbModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2 text-orange-500">
              <Database className="w-5 h-5" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Conexão MySQL do cPanel</h2>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Informe as credenciais do seu banco de dados MySQL hospedado no cPanel para conectar diretamente:
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSwitchMode('mysql', {
                  host: dbHostInput,
                  user: dbUserInput,
                  password: dbPassInput,
                  database: dbNameInput,
                  port: Number(dbPortInput) || 3306,
                });
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Host / IP do Servidor MySQL</label>
                <input
                  type="text"
                  required
                  value={dbHostInput}
                  onChange={(e) => setDbHostInput(e.target.value)}
                  placeholder="ex: mifireapp.com.br ou 189.xx.xx.xx"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Usuário MySQL</label>
                  <input
                    type="text"
                    required
                    value={dbUserInput}
                    onChange={(e) => setDbUserInput(e.target.value)}
                    placeholder="mifireco_sso_user"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Porta</label>
                  <input
                    type="number"
                    required
                    value={dbPortInput}
                    onChange={(e) => setDbPortInput(e.target.value)}
                    placeholder="3306"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Senha do Usuário MySQL</label>
                <input
                  type="password"
                  value={dbPassInput}
                  onChange={(e) => setDbPassInput(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Nome do Banco de Dados</label>
                <input
                  type="text"
                  required
                  value={dbNameInput}
                  onChange={(e) => setDbNameInput(e.target.value)}
                  placeholder="mifireco_sso_db"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowDbModal(false)}
                  className="px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={switchingMode}
                  className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold rounded-xl shadow-md text-xs flex items-center space-x-1.5"
                >
                  {switchingMode ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Database className="w-3.5 h-3.5" />
                  )}
                  <span>Testar e Conectar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
