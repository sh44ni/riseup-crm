import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../lib/cn';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  'aria-label': string; // Strictly required for accessibility!
  icon: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

const VARIANT_STYLES: Record<string, string> = {
  primary: 'bg-brand-600 hover:bg-brand-700 text-white shadow-xs focus-visible:ring-brand-500',
  secondary: 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white focus-visible:ring-slate-400',
  outline: 'border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 focus-visible:ring-brand-500',
  danger: 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs focus-visible:ring-rose-500',
  ghost: 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 focus-visible:ring-slate-400',
};

const SIZE_STYLES: Record<string, string> = {
  sm: 'w-7 h-7 rounded-lg',
  md: 'w-9 h-9 rounded-xl',
  lg: 'w-11 h-11 rounded-xl',
};

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  {
    'aria-label': ariaLabel,
    icon,
    variant = 'ghost',
    size = 'md',
    isLoading = false,
    disabled = false,
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
      aria-label={ariaLabel}
      disabled={isDisabled}
      aria-busy={isLoading}
      className={cn(
        'inline-flex items-center justify-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none select-none active:scale-[0.96] shrink-0',
        VARIANT_STYLES[variant],
        SIZE_STYLES[size],
        className
      )}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="animate-spin" size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} />
      ) : (
        icon
      )}
    </button>
  );
});

export default IconButton;
