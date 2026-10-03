import React, { Suspense } from 'react';
import { useQueryErrorResetBoundary } from '@tanstack/react-query';
import { AlertTriangle, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../lib/cn';

interface ErrorBoundaryProps {
  onReset: () => void;
  fallback?: React.ReactNode | ((props: { error: Error; resetErrorBoundary: () => void }) => React.ReactNode);
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class QueryErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    if (process.env.NODE_ENV !== 'test') {
      console.error('QueryErrorBoundary caught error:', error, info);
    }
  }

  reset = (): void => {
    this.props.onReset();
    this.setState({ hasError: false, error: null });
  };

  render(): React.ReactNode {
    if (this.state.hasError && this.state.error) {
      if (typeof this.props.fallback === 'function') {
        return this.props.fallback({ error: this.state.error, resetErrorBoundary: this.reset });
      }
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div
          role="alert"
          className="p-6 rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/60 dark:bg-rose-950/20 text-center flex flex-col items-center justify-center my-4"
        >
          <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-3">
            <AlertTriangle size={20} />
          </div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
            Unable to load data
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mb-4">
            {this.state.error.message || 'An unexpected error occurred while fetching information.'}
          </p>
          <Button variant="outline" size="sm" icon={<RefreshCw size={14} />} onClick={this.reset}>
            Try again
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

export interface QueryBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode | ((props: { error: Error; resetErrorBoundary: () => void }) => React.ReactNode);
  loadingFallback?: React.ReactNode;
  className?: string;
}

export function QueryBoundary({
  children,
  fallback,
  loadingFallback,
  className,
}: QueryBoundaryProps) {
  const { reset } = useQueryErrorResetBoundary();

  const defaultLoading = (
    <div className={cn('flex items-center justify-center p-8 text-slate-400', className)}>
      <Loader2 className="animate-spin" size={24} />
    </div>
  );

  return (
    <QueryErrorBoundary onReset={reset} fallback={fallback}>
      <Suspense fallback={loadingFallback ?? defaultLoading}>
        {children}
      </Suspense>
    </QueryErrorBoundary>
  );
}

export default QueryBoundary;
