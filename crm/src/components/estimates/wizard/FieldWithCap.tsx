import React from 'react';

interface FieldWithCapProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  multiline?: boolean;
  rows?: number;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export function FieldWithCap({
  label,
  value,
  onChange,
  maxLength,
  multiline,
  rows = 3,
  placeholder,
  required,
  disabled,
  className = ''
}: FieldWithCapProps) {
  const charsLeft = maxLength - (value?.length || 0);
  const isNearLimit = charsLeft <= maxLength * 0.1;
  const isAtLimit = charsLeft === 0;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (val.length <= maxLength) {
      onChange(val);
    }
  };

  const baseClasses = `w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 transition-all shadow-sm ${className}`;

  return (
    <div className="w-full flex flex-col gap-1.5 relative">
      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider pl-1">
        {label}
        {required && <span className="text-amber-500 ml-1">*</span>}
      </label>
      <div className="relative">
        {multiline ? (
          <textarea
            value={value || ''}
            onChange={handleChange}
            maxLength={maxLength}
            rows={rows}
            placeholder={placeholder}
            disabled={disabled}
            className={`${baseClasses} resize-none`}
          />
        ) : (
          <input
            type="text"
            value={value || ''}
            onChange={handleChange}
            maxLength={maxLength}
            placeholder={placeholder}
            disabled={disabled}
            className={baseClasses}
          />
        )}
      </div>
      <div className={`text-[10px] font-bold text-right pr-1 -mt-0.5 ${isAtLimit ? 'text-red-500' : isNearLimit ? 'text-amber-600' : 'text-slate-400'}`}>
        {(value?.length || 0)} / {maxLength}
      </div>
    </div>
  );
}
