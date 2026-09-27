import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  private isChunkError(error: Error | null): boolean {
    if (!error?.message) return false;
    return (
      /Failed to fetch dynamically imported module/i.test(error.message) ||
      /Loading chunk .* failed/i.test(error.message) ||
      /Importing a module script failed/i.test(error.message) ||
      /error loading dynamically imported module/i.test(error.message)
    );
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught CRM runtime error caught by boundary:', error, errorInfo);

    if (this.isChunkError(error)) {
      const now = Date.now();
      const lastReload = parseInt(sessionStorage.getItem('last_chunk_reload') || '0', 10);
      if (now - lastReload > 8000) {
        sessionStorage.setItem('last_chunk_reload', String(now));
        window.location.reload();
      }
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      const isChunk = this.isChunkError(this.state.error);

      if (isChunk) {
        return (
          <div className="min-h-[400px] w-full flex items-center justify-center p-6 select-none">
            <div className="max-w-md w-full p-6 rounded-3xl bg-white/95 backdrop-blur-2xl border border-sky-200 shadow-[0_20px_60px_rgba(24,120,184,0.12)] text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-12 h-12 rounded-2xl bg-sky-100 text-[#1a5ba5] flex items-center justify-center mx-auto shadow-inner">
                <RefreshCw size={24} className="stroke-[2.5] animate-spin text-[#1a5ba5]" />
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-black text-slate-900 tracking-tight">
                  Updating to Latest Version
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  A new platform update has been deployed. Refreshing your application automatically...
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={this.handleReload}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#1878B8] to-[#55C4F5] text-white text-xs font-bold shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <RefreshCw size={13} />
                  <span>Refresh Now</span>
                </button>
              </div>
            </div>
          </div>
        );
      }
      return (
        <div className="min-h-[400px] w-full flex items-center justify-center p-6 select-none">
          <div className="max-w-md w-full p-6 rounded-3xl bg-white/95 backdrop-blur-2xl border border-rose-200/90 shadow-[0_20px_60px_rgba(225,29,72,0.12)] text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
              <AlertTriangle size={24} className="stroke-[2.5]" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-black text-slate-900 tracking-tight">
                {this.props.fallbackTitle || 'Component Recovered Safely'}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                A non-critical UI error occurred while rendering this section. Your data is secure and saved in the database.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="p-2.5 rounded-xl bg-rose-50/70 border border-rose-200/60 text-[11px] font-mono text-rose-800 text-left truncate">
                {this.state.error.message}
              </div>
            )}

            <div className="flex items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={this.handleReset}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>Try Again</span>
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#1878B8] to-[#55C4F5] text-white text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw size={12} />
                <span>Reload Page</span>
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-all cursor-pointer"
                title="Return to Dashboard"
              >
                <Home size={13} />
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
