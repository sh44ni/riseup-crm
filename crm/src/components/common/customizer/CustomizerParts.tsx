import React from 'react';

/** Grouped block inside a customizer popup. */
export function CustomizerSection({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="p-4 rounded-2xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/10 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">{title}</h3>
          {description && <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function SliderField({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '%',
  onChange,
  hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
  hint?: [string, string];
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-slate-700 dark:text-slate-300">{label}</span>
        <span className="font-mono text-[#1878B8] dark:text-sky-400 font-bold">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[#1878B8] dark:accent-sky-400 cursor-pointer"
      />
      {hint && (
        <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500">
          <span>{hint[0]}</span>
          <span>{hint[1]}</span>
        </div>
      )}
    </div>
  );
}

export function ToggleField({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start justify-between gap-4 cursor-pointer">
      <div>
        <div className="text-xs font-bold text-slate-900 dark:text-white">{label}</div>
        {description && <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{description}</p>}
      </div>
      <span className="relative inline-flex items-center shrink-0 mt-0.5">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only peer" aria-label={label} />
        <span className="w-11 h-6 bg-slate-300 dark:bg-slate-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1878B8] dark:peer-checked:bg-sky-500" />
      </span>
    </label>
  );
}

export interface CustomizerTabDef<T extends string> {
  id: T;
  label: string;
  icon?: React.ReactNode;
}

export function CustomizerTabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: CustomizerTabDef<T>[];
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <div role="tablist" className="flex items-center gap-2 px-6 pt-3 border-b border-slate-200/80 dark:border-white/10 bg-slate-50/30 dark:bg-white/[0.01] shrink-0">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={active === t.id}
          onClick={() => onChange(t.id)}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            active === t.id
              ? 'border-[#1878B8] text-[#1878B8] dark:border-sky-400 dark:text-sky-300'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          {t.icon}
          <span>{t.label}</span>
        </button>
      ))}
    </div>
  );
}

/** Scrollable tab body used by every customizer popup. */
export function CustomizerBody({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-6 overflow-y-auto space-y-5 flex-1 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.15)_transparent]">
      {children}
    </div>
  );
}
