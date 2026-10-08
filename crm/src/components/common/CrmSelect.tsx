import React, { useState, useRef, useEffect, useId } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface CrmSelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string;
  badgeClass?: string;
}

export type CrmSelectOptionItem = CrmSelectOption | string;

export interface CrmSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: CrmSelectOptionItem[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  menuClassName?: string;
  prefix?: React.ReactNode;
  icon?: React.ReactNode;
  name?: string;
  id?: string;
  label?: string;
  size?: 'xs' | 'sm' | 'md';
}

export function CrmSelect({
  value,
  onChange,
  options,
  placeholder = 'Select option...',
  disabled = false,
  className = '',
  triggerClassName = '',
  menuClassName = '',
  prefix,
  icon,
  name,
  id,
  label,
  size = 'sm',
}: CrmSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const generatedId = useId();
  const selectId = id || generatedId;

  // Normalize options to CrmSelectOption objects
  const normalizedOptions: CrmSelectOption[] = options.map((opt) => {
    if (typeof opt === 'string') {
      return { value: opt, label: opt };
    }
    return opt;
  });

  const selectedOption = normalizedOptions.find((o) => o.value === value);

  // Outside click dismiss
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const sizeClasses = {
    xs: 'px-2 py-1 text-[11px] rounded-lg',
    sm: 'px-3 py-1.5 text-xs rounded-xl',
    md: 'px-3.5 py-2 text-xs font-semibold rounded-xl',
  }[size];

  return (
    <div ref={containerRef} className={`relative inline-block w-full select-none ${className}`}>
      {label && (
        <label htmlFor={selectId} className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
          {label}
        </label>
      )}
      {/* Hidden native input for form compatibility */}
      {name && <input type="hidden" name={name} value={value} />}

      <button
        type="button"
        id={selectId}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full flex items-center justify-between gap-2 border transition-all text-slate-800 dark:text-slate-100 shadow-2xs cursor-pointer ${sizeClasses} ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        } ${
          isOpen
            ? 'border-[#1878B8] ring-2 ring-[#1878B8]/20 bg-white dark:bg-slate-900 shadow-sm'
            : 'border-slate-200/90 dark:border-white/10 bg-white/90 dark:bg-white/5 hover:border-sky-400 hover:bg-white dark:hover:bg-slate-900'
        } ${triggerClassName}`}
      >
        <div className="flex items-center gap-1.5 truncate">
          {prefix && <span className="text-slate-400 font-normal shrink-0">{prefix}</span>}
          {icon && <span className="shrink-0 text-slate-400">{icon}</span>}
          {selectedOption?.icon && <span className="shrink-0">{selectedOption.icon}</span>}
          <span className={`truncate ${selectedOption ? 'font-bold' : 'font-normal text-slate-400 dark:text-slate-500'}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {selectedOption?.badge && (
            <span
              className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded-md ${
                selectedOption.badgeClass || 'bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300'
              }`}
            >
              {selectedOption.badge}
            </span>
          )}
        </div>

        <ChevronDown
          size={13}
          className={`text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[#1878B8]' : ''
          }`}
        />
      </button>

      {/* Floating Glassmorphic Dropdown Menu */}
      {isOpen && (
        <div
          role="listbox"
          className={`absolute left-0 top-full mt-1.5 z-[99999] w-full min-w-[180px] max-h-60 overflow-y-auto rounded-2xl bg-white/95 dark:bg-[#0B1320]/96 backdrop-blur-2xl border border-white/90 dark:border-white/10 shadow-[0_12px_36px_rgba(0,0,0,0.18)] dark:shadow-[0_12px_36px_rgba(0,0,0,0.6)] p-1.5 space-y-0.5 animate-in fade-in zoom-in-95 duration-150 no-scrollbar ${menuClassName}`}
        >
          {normalizedOptions.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold text-left transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-sky-50 dark:bg-sky-950/70 text-[#1878B8] dark:text-sky-300 font-bold'
                    : 'hover:bg-slate-100/80 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                  <span className="truncate">{opt.label}</span>
                  {opt.badge && (
                    <span
                      className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded-md ${
                        opt.badgeClass || 'bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300'
                      }`}
                    >
                      {opt.badge}
                    </span>
                  )}
                </div>
                {isSelected && (
                  <Check size={13} className="text-[#1878B8] dark:text-sky-400 shrink-0 ml-1.5" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default CrmSelect;
