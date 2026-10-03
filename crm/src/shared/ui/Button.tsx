import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../lib/cn';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
}

const VARIANT_STYLES: Record<string, string> = {
  primary: 'bg-brand-600 hover:bg-brand-700 text-white shadow-xs focus-visible:ring-brand-500',
  secondary: 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white focus-visible:ring-slate-400',
  outline: 'border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 focus-visible:ring-brand-500',
  danger: 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs focus-visible:ring-rose-500',
  ghost: 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 focus-visible:ring-slate-400',
};

const SIZE_STYLES: Record<string, string> = {
  sm: 'text-xs h-8 px-2.5 gap-1.5 rounded-lg',
  md: 'text-sm h-9 px-3.5 gap-2 rounded-xl',
  lg: 'text-base h-11 px-5 gap-2.5 rounded-xl',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    isLoading = false,
    disabled = false,
    icon,
    iconRight,
    children,
    className,
    type = 'button',
    ...props
  },
  ref
) {
  const isDisabled = disabled || isLoading;

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={isLoading}
      className={cn(
        'inline-flex items-center justify-center font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none select-none active:scale-[0.98]',
        VARIANT_STYLES[variant],
        SIZE_STYLES[size],
        className
      )}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="animate-spin shrink-0" size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} />
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      {children}
      {!isLoading && iconRight && <span className="shrink-0">{iconRight}</span>}
    </button>
  );
});

export default Button;
