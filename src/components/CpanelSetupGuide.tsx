import React, { useState, useEffect } from 'react';
import { Database, Folder, Key, Copy, Check, Server, Terminal, Code2, Globe, AlertTriangle, CheckCircle2, Info, RefreshCw, Play, ShieldAlert, UserCheck } from 'lucide-react';

export const CpanelSetupGuide: React.FC = () => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [systemInfo, setSystemInfo] = useState<any>(null);
  const [loadingInfo, setLoadingInfo] = useState(true);

  // Diagnostic state
  const [runningDiag, setRunningDiag] = useState(false);
  const [diagResult, setDiagResult] = useState<any>(null);
  const [newAdminPassInput, setNewAdminPassInput] = useState('Admin@123');

  const fetchSysInfo = () => {
    fetch('/api/system/info')
      .then((res) => res.json())
      .then((data) => {
        setSystemInfo(data);
      })
      .catch(() => {})
      .finally(() => setLoadingInfo(false));
  };

  useEffect(() => {
    fetchSysInfo();
  }, []);

  const handleRunDiagnostic = async () => {
    setRunningDiag(true);
    setDiagResult(null);
    try {
      const res = await fetch('/api/system/test-mysql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newAdminPassword: newAdminPassInput }),
      });
      const data = await res.json();
      setDiagResult(data);
      fetchSysInfo();
    } catch (e) {
      setDiagResult({ error: 'Erro ao executar teste de conexão com o servidor.' });
    } finally {
      setRunningDiag(false);
    }
  };

  const sqlSchema = `-- ============================================================
-- SCRIPT DE CRIAÇÃO DO BANCO DE DADOS MYSQL CPANEL - SSO MIFIRE
-- Instalação no cPanel: /home/mifireco/portal
-- Domínio: .mifireapp.com.br
-- ============================================================

-- 1. Tabela de Usuários (RBAC)
CREATE TABLE IF NOT EXISTS \`users\` (
  \`id\` VARCHAR(64) PRIMARY KEY,
  \`name\` VARCHAR(120) NOT NULL,
  \`email\` VARCHAR(120) NOT NULL UNIQUE,
  \`username\` VARCHAR(60) NOT NULL UNIQUE,
  \`password_hash\` VARCHAR(255) NOT NULL,
  \`role\` ENUM('admin', 'user', 'manager') DEFAULT 'user',
  \`active\` TINYINT(1) DEFAULT 1,
  \`must_change_password\` TINYINT(1) DEFAULT 0,
  \`allowed_apps\` JSON DEFAULT NULL,
  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  \`last_login\` DATETIME DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Tabela de Aplicações Autorizadas (Subdomínios)
CREATE TABLE IF NOT EXISTS \`applications\` (
  \`id\` VARCHAR(64) PRIMARY KEY,
  \`app_id\` VARCHAR(60) NOT NULL UNIQUE,
  \`name\` VARCHAR(120) NOT NULL,
  \`description\` TEXT,
  \`callback_url\` VARCHAR(255) NOT NULL,
  \`secret_key\` VARCHAR(120) NOT NULL,
  \`icon\` VARCHAR(60) DEFAULT 'AppWindow',
  \`active\` TINYINT(1) DEFAULT 1,
  \`category\` VARCHAR(60) DEFAULT 'Geral',
  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Tabela de Logs de Auditoria de Acesso
CREATE TABLE IF NOT EXISTS \`audit_logs\` (
  \`id\` VARCHAR(64) PRIMARY KEY,
  \`timestamp\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  \`user_id\` VARCHAR(64) DEFAULT NULL,
  \`username\` VARCHAR(60) NOT NULL,
  \`app_id\` VARCHAR(60) DEFAULT NULL,
  \`app_name\` VARCHAR(120) DEFAULT NULL,
  \`ip\` VARCHAR(45) NOT NULL,
  \`user_agent\` TEXT DEFAULT NULL,
  \`status\` ENUM('SUCCESS', 'FAILURE', 'WARNING') DEFAULT 'SUCCESS',
  \`action\` VARCHAR(60) NOT NULL,
  \`details\` TEXT,
  FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Inserção de Dados Iniciais de Teste
INSERT INTO \`applications\` (\`id\`, \`app_id\`, \`name\`, \`description\`, \`callback_url\`, \`secret_key\`, \`icon\`, \`category\`) VALUES
('app-1', 'expedicao', 'Sistema de Expedição & Logística', 'Controle de romaneios e entregas.', 'https://expedicao.mifireapp.com.br/callback', 'sec_expedicao_mifire_9876543210', 'Truck', 'Operacional'),
('app-2', 'vendas', 'Portal de Vendas & CRM', 'Gestão de orçamentos e clientes.', 'https://vendas.mifireapp.com.br/callback', 'sec_vendas_mifire_1234567890', 'ShoppingCart', 'Comercial'),
('app-3', 'financeiro', 'Gestão Financeira & DRE', 'Contas a pagar e fluxo de caixa.', 'https://financeiro.mifireapp.com.br/callback', 'sec_financeiro_mifire_5544332211', 'DollarSign', 'Gestão');

-- Admin Padrão (Senha: Admin@123)
INSERT INTO \`users\` (\`id\`, \`name\`, \`email\`, \`username\`, \`password_hash\`, \`role\`, \`allowed_apps\`) VALUES
('usr-admin', 'Administrador SSO', 'admin@mifireapp.com.br', 'admin', '$2a$10$wT8K8U1S7uS8m/B4z9M9x.1eJqQkF1u3L2b0R6v9e0W9x7y5z1a2b', 'admin', '["expedicao","vendas","financeiro"]');
`;

  const nodeSdkExample = `// ============================================================
// VALIDAÇÃO DE SSO NO NODE.JS (EXPRESS CLIENT APP: expedicao.mifireapp.com.br)
// ============================================================
import express from 'express';
import fetch from 'node-fetch';

const app = express();

// Middleware de Proteção SSO nas outras aplicações Node.js
async function verifySsoSession(req, res, next) {
  // Captura o token via Cookie HttpOnly corporativo ou Query Param ?sso_token=...
  const token = req.cookies?.mifire_sso_token || req.query.sso_token;

  if (!token) {
    // Redireciona o usuário para o Portal SSO com os parâmetros de callback
    const returnUrl = encodeURIComponent(\`https://\${req.get('host')}\${req.originalUrl}\`);
    return res.redirect(\`https://portal.mifireapp.com.br/?app_id=expedicao&redirect_url=\${returnUrl}\`);
  }

  try {
    // Valida o token e as permissões diretamente na API do Portal SSO
    const response = await fetch(\`https://portal.mifireapp.com.br/api/auth/validate?app_id=expedicao\`, {
      headers: {
        'Cookie': \`mifire_sso_token=\${token}\`,
        'Authorization': \`Bearer \${token}\`
      }
    });

    const data = await response.json();

    if (!data.valid || !data.authorizedForApp) {
      return res.status(403).send('Acesso Negado: Usuário sem permissão para o módulo de Expedição.');
    }

    // Injeta o perfil do usuário autenticado no request
    req.user = data.user;
    next();
  } catch (err) {
    return res.status(500).send('Erro de comunicação com o servidor SSO.');
  }
}

app.get('/dashboard', verifySsoSession, (req, res) => {
  res.send(\`Bem-vindo ao Sistema de Expedição, \${req.user.name}!\`);
});
`;

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(label);
    setTimeout(() => setCopiedSection(null), 2500);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Intro */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-600 rounded-2xl p-6 sm:p-8 text-white shadow-xl space-y-3">
        <div className="flex items-center space-x-3">
          <Server className="w-8 h-8 shrink-0" />
          <h2 className="text-xl sm:text-2xl font-extrabold">Guia de Implantação cPanel (mifireapp.com.br)</h2>
        </div>
        <p className="text-xs sm:text-sm text-orange-100 leading-relaxed">
          Instruções passo a passo para deploy na pasta <code className="bg-black/20 px-2 py-0.5 rounded font-mono text-white">/home/mifireco/portal</code>, configuração do Node.js Application Manager, executável MySQL e script de integração cliente.
        </p>
      </div>

      {/* Real-time Connection Status & Explanation */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center space-x-2.5">
            <Database className="w-5 h-5 text-orange-500" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Status da Conexão com o Banco de Dados MySQL</h3>
          </div>

          {systemInfo?.database?.connected ? (
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold rounded-full text-xs">
              <CheckCircle2 className="w-4 h-4" />
              <span>Conectado ao MySQL (cPanel)</span>
            </span>
          ) : (
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-bold rounded-full text-xs">
              <AlertTriangle className="w-4 h-4" />
              <span>Modo Desenvolvimento (Fallback Memória/Mock)</span>
            </span>
          )}
        </div>

        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 text-xs space-y-2">
          <div className="flex items-center space-x-2 font-bold text-amber-700 dark:text-amber-400">
            <Info className="w-4 h-4 shrink-0 text-amber-500" />
            <span>Por que a alteração de e-mail/usuário não refletiu no banco MySQL do cPanel?</span>
          </div>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            Esta interface de preview está sendo executada temporariamente num <strong>container em nuvem (sandbox isolada)</strong>.
            A aplicação possui um mecanismo inteligente de fallback: quando executada no container de testes e sem conexão direta com o MySQL do cPanel, ela utiliza armazenamento em memória de alta fidelidade para não bloquear o seu uso.
          </p>

          <div className="pt-2 border-t border-amber-500/20 space-y-1 text-slate-700 dark:text-slate-300">
            <span className="font-bold text-slate-900 dark:text-white block">Quais os critérios para a aplicação gravar diretamente no MySQL?</span>
            <ul className="list-disc list-inside space-y-1 pl-1 text-[11px] text-slate-600 dark:text-slate-400">
              <li>
                <strong>Opção 1 (Deploy Real no cPanel):</strong> Após enviar os arquivos para <code className="text-orange-600 dark:text-orange-400">/home/mifireco/portal</code> e configurar o aplicativo no <em>"Setup Node.js App"</em> do cPanel, o Node.js rodará no mesmo servidor do MySQL (<code className="text-orange-600 dark:text-orange-400">DB_HOST=localhost</code>). Nesse cenário local, a conexão ocorre <strong>instantaneamente</strong> e todas as alterações gravam direto no MySQL.
              </li>
              <li>
                <strong>Opção 2 (Conectar o Preview ao cPanel Remoto):</strong> Para que este container de preview acesse seu MySQL no cPanel, você precisa liberar o IP do container ou <code className="text-orange-600 dark:text-orange-400">%</code> no menu <strong>"Remote MySQL" (MySQL Remoto)</strong> do cPanel e configurar o Host público do seu servidor (ex: IP público ou subdomínio direto do cPanel) nas variáveis do ambiente.
              </li>
            </ul>
          </div>
        </div>

        {/* Interactive Diagnostic & Admin Password Reset Tool */}
        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-5 border border-slate-200 dark:border-slate-700/80 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <Play className="w-4 h-4 text-orange-500 fill-orange-500" />
                <span>Teste de Conexão MySQL, Verificação de Tabelas e Reset do Admin</span>
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Testa a conexão MySQL, valida as tabelas <code className="text-orange-600 dark:text-orange-400 font-mono">users</code>, <code className="text-orange-600 dark:text-orange-400 font-mono">applications</code> e <code className="text-orange-600 dark:text-orange-400 font-mono">audit_logs</code>, e redefini a senha do <code className="text-orange-600 dark:text-orange-400 font-mono">admin</code>.
              </p>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <div className="flex flex-col">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Nova Senha do Admin</label>
                <input
                  type="text"
                  value={newAdminPassInput}
                  onChange={(e) => setNewAdminPassInput(e.target.value)}
                  className="px-2.5 py-1 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  placeholder="Admin@123"
                />
              </div>

              <button
                type="button"
                disabled={runningDiag}
                onClick={handleRunDiagnostic}
                className="mt-3 sm:mt-0 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold rounded-xl text-xs shadow hover:from-orange-600 hover:to-amber-700 flex items-center space-x-2 transition-all disabled:opacity-50"
              >
                {runningDiag ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-white" />}
                <span>Executar Teste Agora</span>
              </button>
            </div>
          </div>

          {/* Diagnostic Results Display */}
          {diagResult && (
            <div className="mt-3 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="font-bold text-slate-800 dark:text-slate-200">Resultado do Diagnóstico MySQL</span>
                <span className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] ${diagResult.connected ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
                  {diagResult.connected ? 'Conexão OK!' : 'Falha na Conexão'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-[11px]">
                <div className="bg-slate-50 dark:bg-slate-800 p-2.5 rounded-lg space-y-1">
                  <div className="text-slate-500 font-sans font-bold">1. Parâmetros de Conexão:</div>
                  <div>Host: <span className="text-orange-600 dark:text-orange-400">{diagResult.config?.host}:{diagResult.config?.port}</span></div>
                  <div>Usuário: <span className="text-slate-700 dark:text-slate-300">{diagResult.config?.user}</span></div>
                  <div>Banco: <span className="text-slate-700 dark:text-slate-300">{diagResult.config?.database}</span></div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800 p-2.5 rounded-lg space-y-1">
                  <div className="text-slate-500 font-sans font-bold">2. Checagem de Tabelas Requeridas:</div>
                  <div className="flex items-center space-x-2">
                    <span>users:</span>
                    {diagResult.tablesRequirement?.users ? <span className="text-emerald-600 font-bold">✓ Encontrada</span> : <span className="text-rose-500 font-bold">✕ Ausente</span>}
                  </div>
                  <div className="flex items-center space-x-2">
                    <span>applications:</span>
                    {diagResult.tablesRequirement?.applications ? <span className="text-emerald-600 font-bold">✓ Encontrada</span> : <span className="text-rose-500 font-bold">✕ Ausente</span>}
                  </div>
                  <div className="flex items-center space-x-2">
                    <span>audit_logs:</span>
                    {diagResult.tablesRequirement?.audit_logs ? <span className="text-emerald-600 font-bold">✓ Encontrada</span> : <span className="text-rose-500 font-bold">✕ Ausente</span>}
                  </div>
                </div>
              </div>

              {/* Message Banner */}
              <div className={`p-3 rounded-lg flex items-start space-x-2 font-sans ${diagResult.connected ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-800 dark:text-rose-300 border border-rose-500/20'}`}>
                {diagResult.connected ? <UserCheck className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" /> : <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />}
                <div className="space-y-1">
                  <p className="font-semibold">{diagResult.message || diagResult.error}</p>
                  {diagResult.passwordUpdated && (
                    <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                      🔑 Senha do Admin atualizada no MySQL para: <code className="bg-emerald-200 dark:bg-emerald-900/60 px-1.5 py-0.5 rounded">{diagResult.newPasswordApplied}</code>
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Directory & Domain Architecture */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
          <Folder className="w-5 h-5 text-orange-500" />
          <span>1. Estrutura de Pastas & Subdomínios no cPanel</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-2 border border-slate-200 dark:border-slate-700">
            <span className="font-bold text-slate-900 dark:text-white block">📁 Pasta de Instalação no Servidor:</span>
            <code className="block p-2 bg-slate-200 dark:bg-slate-900 rounded text-orange-600 dark:text-orange-400 font-mono font-bold">
              /home/mifireco/portal
            </code>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              Fora do diretório public_html para impedir exposição direta de arquivos Node.js e módulos internos.
            </p>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-2 border border-slate-200 dark:border-slate-700">
            <span className="font-bold text-slate-900 dark:text-white block">🌐 Domínio & Cookie Scope:</span>
            <code className="block p-2 bg-slate-200 dark:bg-slate-900 rounded text-emerald-600 dark:text-emerald-400 font-mono font-bold">
              COOKIE_DOMAIN=.mifireapp.com.br
            </code>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              Permite que o Cookie HttpOnly de autenticação seja compartilhado com expedicao.mifireapp.com.br, vendas.mifireapp.com.br, etc.
            </p>
          </div>
        </div>
      </div>

      {/* cPanel Environment Variables */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
          <Key className="w-5 h-5 text-amber-500" />
          <span>2. Variáveis de Ambiente no cPanel ("Setup Node.js App")</span>
        </h3>

        <p className="text-xs text-slate-600 dark:text-slate-400">
          No cPanel, acesse o menu <strong>"Setup Node.js App"</strong>, selecione a pasta <code>/home/mifireco/portal</code>, defina o arquivo inicial para <code>dist/server.cjs</code> e adicione as variáveis de ambiente abaixo:
        </p>

        <div className="bg-slate-950 text-slate-100 p-4 rounded-xl font-mono text-xs space-y-1.5 overflow-x-auto">
          <div><span className="text-slate-500"># Segredo de assinatura dos tokens JWT</span></div>
          <div><span className="text-orange-400">JWT_SECRET</span>=sso_mifire_super_secret_key_prod_2026</div>
          <div><span className="text-slate-500"># Escopo do Cookie para todos os subdomínios</span></div>
          <div><span className="text-orange-400">COOKIE_DOMAIN</span>=.mifireapp.com.br</div>
          <div><span className="text-slate-500"># Conexão com o Banco MySQL do cPanel</span></div>
          <div><span className="text-orange-400">DB_HOST</span>=localhost</div>
          <div><span className="text-orange-400">DB_USER</span>=mifireco_sso_user</div>
          <div><span className="text-orange-400">DB_PASSWORD</span>=SuaSenhaForteAqui123!</div>
          <div><span className="text-orange-400">DB_NAME</span>=mifireco_sso_db</div>
          <div><span className="text-orange-400">DB_PORT</span>=3306</div>
        </div>
      </div>

      {/* MySQL SQL Schema */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <Database className="w-5 h-5 text-blue-500" />
            <span>3. Script SQL para phpMyAdmin (Tabelas cPanel)</span>
          </h3>

          <button
            onClick={() => copyText(sqlSchema, 'sql')}
            className="flex items-center space-x-1 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-all"
          >
            {copiedSection === 'sql' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            <span>{copiedSection === 'sql' ? 'Copiado!' : 'Copiar Script SQL'}</span>
          </button>
        </div>

        <pre className="p-4 bg-slate-950 text-emerald-400 rounded-xl font-mono text-[11px] overflow-x-auto max-h-80 leading-relaxed">
          {sqlSchema}
        </pre>
      </div>

      {/* Node.js Integration SDK Example */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <Code2 className="w-5 h-5 text-purple-500" />
            <span>4. Exemplo de Middleware de Validação SSO para Outras Apps Node.js</span>
          </h3>

          <button
            onClick={() => copyText(nodeSdkExample, 'node')}
            className="flex items-center space-x-1 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-all"
          >
            {copiedSection === 'node' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            <span>{copiedSection === 'node' ? 'Copiado!' : 'Copiar Exemplo Node.js'}</span>
          </button>
        </div>

        <pre className="p-4 bg-slate-950 text-blue-300 rounded-xl font-mono text-[11px] overflow-x-auto max-h-80 leading-relaxed">
          {nodeSdkExample}
        </pre>
      </div>
    </div>
  );
};
