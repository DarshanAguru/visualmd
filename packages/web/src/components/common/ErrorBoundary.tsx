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

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[VisualMD] Component Error caught by boundary:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
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
