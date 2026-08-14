import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  declare props: Props;
  declare state: State;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in component:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-2xl text-slate-800 dark:text-slate-100 space-y-3 my-4">
          <div className="flex items-center space-x-2 text-red-600 dark:text-red-400 font-bold text-sm">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>{this.props.fallbackTitle || 'Ocorreu um erro ao carregar este componente.'}</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 font-mono bg-white dark:bg-slate-900 p-3 rounded-xl border border-red-100 dark:border-red-900 overflow-x-auto">
            {this.state.error?.message || 'Erro desconhecido.'}
          </p>
          <button
            onClick={() => (this as any).setState({ hasError: false, error: null })}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl shadow-md flex items-center space-x-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Tentar Novamente</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
