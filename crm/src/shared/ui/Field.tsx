import React, { useId } from 'react';
import { cn } from '../lib/cn';

export interface FieldProps {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  id?: string;
  className?: string;
  labelClassName?: string;
  children:
    | React.ReactElement<React.HTMLAttributes<HTMLElement>>
    | ((props: { id: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean; required?: boolean }) => React.ReactNode);
}

export function Field({
  label,
  error,
  hint,
  required,
  id: customId,
  className,
  labelClassName,
  children,
}: FieldProps) {
  const generatedId = useId();
  const fieldId = customId || generatedId;
  const errorId = error ? `${fieldId}-error` : undefined;
  const hintId = hint ? `${fieldId}-hint` : undefined;

  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  const childProps = {
    id: fieldId,
    'aria-describedby': describedBy,
    'aria-invalid': Boolean(error),
    required,
  };

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label
        htmlFor={fieldId}
        className={cn(
          'text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center justify-between',
          labelClassName
        )}
      >
        <span>
          {label}
          {required && <span className="text-rose-500 ml-1" aria-hidden="true">*</span>}
        </span>
      </label>

      {typeof children === 'function'
        ? children(childProps)
        : React.isValidElement(children)
          ? React.cloneElement(children, childProps)
          : children}

      {error && (
        <p id={errorId} role="alert" className="text-xs font-medium text-rose-600 dark:text-rose-400">
          {error}
        </p>
      )}

      {hint && !error && (
        <p id={hintId} className="text-xs text-slate-500 dark:text-slate-400">
          {hint}
        </p>
      )}
    </div>
  );
}

export default Field;
