import React, { useState } from 'react';
import { Terminal, Play, Key, ShieldCheck, CheckCircle, AlertCircle, RefreshCw, Send } from 'lucide-react';
import { User } from '../types';

interface SsoPlaygroundProps {
  currentUser: User | null;
  jwtToken?: string;
  onBack?: () => void;
}

export const SsoPlayground: React.FC<SsoPlaygroundProps> = ({ currentUser, jwtToken, onBack }) => {
  const [testAppId, setTestAppId] = useState('expedicao');
  const [customToken, setCustomToken] = useState(jwtToken || '');
  const [loading, setLoading] = useState(false);
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [httpStatus, setHttpStatus] = useState<number | null>(null);

  const handleTestValidate = async () => {
    setLoading(true);
    setApiResponse(null);
    setHttpStatus(null);

    const tokenToUse = customToken || jwtToken;

    try {
      const res = await fetch(`/api/auth/validate?app_id=${encodeURIComponent(testAppId)}`, {
        method: 'GET',
        headers: {
          Authorization: tokenToUse ? `Bearer ${tokenToUse}` : '',
          'Content-Type': 'application/json',
        },
      });

      setHttpStatus(res.status);
      const data = await res.json();
      setApiResponse(data);
    } catch (err) {
      setApiResponse({ error: 'Erro ao conectar ao endpoint /api/auth/validate' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-slate-900 rounded-2xl p-6 sm:p-8 text-white border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 text-orange-400">
            <Terminal className="w-8 h-8" />
            <div>
              <h2 className="text-xl font-bold">Simulador / Testador de API SSO</h2>
              <p className="text-xs text-slate-400">
                Teste o endpoint <code className="text-orange-300 font-mono">GET /api/auth/validate</code> em tempo real.
              </p>
            </div>
          </div>
          {onBack && (
            <button
              onClick={onBack}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-all"
            >
              Voltar ao Painel Admin
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2">
          <div>
            <label className="block font-semibold text-slate-300 mb-1">App ID a Validar (Subdomínio)</label>
            <select
              value={testAppId}
              onChange={(e) => setTestAppId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-white font-mono text-xs focus:ring-2 focus:ring-orange-500"
            >
              <option value="expedicao">expedicao (Sistema de Expedição)</option>
              <option value="vendas">vendas (Portal de Vendas)</option>
              <option value="financeiro">financeiro (Gestão Financeira)</option>
              <option value="rh">rh (Portal RH)</option>
              <option value="app_inexistente">app_inexistente (Testar Erro)</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Token JWT / Bearer</label>
            <input
              type="text"
              value={customToken}
              onChange={(e) => setCustomToken(e.target.value)}
              placeholder="Deixe em branco para usar o Cookie SSO atual"
              className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-white font-mono text-xs focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={handleTestValidate}
            disabled={loading}
            className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold rounded-xl text-xs shadow-lg flex items-center space-x-2 transition-all disabled:opacity-50"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            <span>Executar Requisição GET /api/auth/validate</span>
          </button>
        </div>
      </div>

      {/* API Response Output */}
      {apiResponse && (
        <div className="bg-slate-950 rounded-2xl p-6 border border-slate-800 space-y-3 shadow-xl">
          <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-3">
            <span className="font-mono text-slate-400">Resposta HTTP da API:</span>
            <div className="flex items-center space-x-2">
              <span className="text-slate-400 font-mono">Status:</span>
              <span
                className={`px-2 py-0.5 rounded font-mono font-bold ${
                  httpStatus === 200
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    : 'bg-red-950 text-red-400 border border-red-800'
                }`}
              >
                {httpStatus} {httpStatus === 200 ? 'OK' : 'ERROR'}
              </span>
            </div>
          </div>

          <pre className="p-4 bg-slate-900 rounded-xl text-emerald-400 font-mono text-xs overflow-x-auto leading-relaxed">
            {JSON.stringify(apiResponse, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};
