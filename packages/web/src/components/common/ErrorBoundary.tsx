import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, RotateCcw, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import { VisualMDLogo } from '../brand/VisualMDLogo';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  isRoot?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isDetailsOpen: boolean;
  isCopied: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    isDetailsOpen: false,
    isCopied: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[VisualMD] Application Error caught by boundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleClearStorageAndReload = () => {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('visualmd-')) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
      sessionStorage.clear();
    } catch {}
    window.location.href = '/';
  };

  private handleCopyError = () => {
    const errorText = `[VisualMD Error Report]\nMessage: ${this.state.error?.message || 'Unknown'}\nStack: ${
      this.state.error?.stack || 'No stack'
    }\nComponent Stack: ${this.state.errorInfo?.componentStack || 'No component stack'}`;
    navigator.clipboard.writeText(errorText);
    this.setState({ isCopied: true });
    setTimeout(() => this.setState({ isCopied: false }), 2000);
  };

  public render() {
    if (this.state.hasError) {
      // 1. Root Level Full-Screen Error Recovery Page
      if (this.props.isRoot) {
        return (
          <div className="min-h-screen w-screen bg-[var(--bg-primary,#09090b)] text-[var(--text-primary,#f4f4f5)] flex items-center justify-center p-6 selection:bg-blue-500/20 font-sans">
            <div className="w-full max-w-xl bg-[var(--bg-card,#18181b)] border border-[var(--border-color,#27272a)] rounded-3xl p-8 sm:p-10 shadow-2xl relative overflow-hidden flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-200">
              {/* Subtle top ambient glow */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-rose-500 to-transparent" />

              {/* Logo with alert indicator */}
              <div className="relative mb-6">
                <VisualMDLogo size={52} />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-rose-500 border-2 border-[var(--bg-card,#18181b)] flex items-center justify-center text-white shadow-sm">
                  <AlertTriangle className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Header */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold mb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                <span>Runtime Application Exception</span>
              </div>

              <h1 className="text-xl sm:text-2xl font-bold tracking-tight mb-2 text-[var(--text-primary,#ffffff)]">
                Something went wrong in VisualMD
              </h1>
              <p className="text-xs sm:text-sm text-[var(--text-muted,#a1a1aa)] max-w-md mb-6 leading-relaxed">
                An unexpected exception interrupted the application. Your markdown files on disk and SQLite data remain completely safe and untouched.
              </p>

              {/* Error Details Box */}
              <div className="w-full bg-[var(--bg-secondary,#0d1117)] border border-[var(--border-color,#27272a)] rounded-2xl p-4 text-left mb-6 font-mono">
                <div className="flex items-center justify-between text-xs text-rose-400 font-semibold mb-2">
                  <span className="truncate pr-2">{this.state.error?.name || 'Error'}: {this.state.error?.message || 'Unexpected exception'}</span>
                  <button
                    onClick={this.handleCopyError}
                    className="p-1 rounded hover:bg-white/10 text-[var(--text-muted,#a1a1aa)] hover:text-white transition-colors shrink-0"
                    title="Copy error details"
                  >
                    {this.state.isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <button
                  onClick={() => this.setState((prev) => ({ isDetailsOpen: !prev.isDetailsOpen }))}
                  className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted,#71717a)] hover:text-white transition-colors cursor-pointer"
                >
                  {this.state.isDetailsOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  <span>{this.state.isDetailsOpen ? 'Hide Stack Trace' : 'View Stack Trace'}</span>
                </button>

                {this.state.isDetailsOpen && (
                  <pre className="mt-3 text-[10px] text-[var(--text-muted,#71717a)] overflow-x-auto p-2 rounded bg-black/30 border border-white/5 max-h-48 whitespace-pre-wrap break-all leading-normal">
                    {this.state.error?.stack || this.state.errorInfo?.componentStack || 'No stack trace available.'}
                  </pre>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3 w-full">
                <button
                  onClick={this.handleReload}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--accent,#3b82f6)] text-white text-xs font-semibold hover:opacity-90 transition-opacity shadow-sm cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reload Workspace</span>
                </button>

                <button
                  onClick={this.handleClearStorageAndReload}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--bg-secondary,#27272a)] hover:bg-[var(--bg-tertiary,#3f3f46)] border border-[var(--border-color,#3f3f46)] text-xs font-medium text-[var(--text-secondary,#d4d4d8)] hover:text-white transition-colors cursor-pointer shadow-xs"
                  title="Clear saved preferences (themes, font scale, drawer states) and reload"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Preferences & Reload</span>
                </button>

                <a
                  href="/"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-transparent hover:bg-white/5 border border-transparent hover:border-white/10 text-xs font-medium text-[var(--text-muted,#a1a1aa)] hover:text-white transition-colors"
                >
                  <Home className="w-3.5 h-3.5" />
                  <span>Return to Home</span>
                </a>
              </div>
            </div>
          </div>
        );
      }

      // 2. Compact Inline Block Error Fallback (for widgets inside documents)
      return (
        <div className="my-4 p-4 rounded-xl border border-rose-500/30 bg-rose-500/5 text-[var(--text-primary)] text-xs flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold text-rose-500">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{this.props.fallbackTitle || 'Unable to render component block'}</span>
            </div>
            <button
              onClick={this.handleReset}
              className="flex items-center gap-1 px-2 py-1 rounded bg-[var(--bg-card)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[10px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              title="Try re-rendering this block"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Retry</span>
            </button>
          </div>
          {this.state.error?.message && (
            <p className="text-[11px] font-mono text-[var(--text-muted)] line-clamp-2">
              {this.state.error.message}
            </p>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
