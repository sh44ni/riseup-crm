import React, { useRef, useEffect } from 'react';
import { MapPin, X, Loader2, Check, AlertCircle } from 'lucide-react';
import { DealCard } from '@/components/pipeline/pipelineTypes';

export interface LeadAddressEditorProps {
  card: DealCard;
  street: string;
  city: string;
  zip: string;
  isSaving: boolean;
  errorMessage?: string | null;
  onStreetChange: (val: string) => void;
  onCityChange: (val: string) => void;
  onZipChange: (val: string) => void;
  onSave: (card: DealCard, e: React.SyntheticEvent) => void;
  onCancel: (e?: React.SyntheticEvent) => void;
}

export function LeadAddressEditor({
  card,
  street,
  city,
  zip,
  isSaving,
  errorMessage,
  onStreetChange,
  onCityChange,
  onZipChange,
  onSave,
  onCancel,
}: LeadAddressEditorProps) {
  const streetInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    streetInputRef.current?.focus();
  }, []);

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      className="p-2 rounded-xl bg-white/95 dark:bg-slate-900/95 border border-[#1878B8]/40 shadow-lg space-y-1.5 animate-in fade-in zoom-in-95 duration-150 my-1 cursor-default"
    >
      <div className="flex items-center justify-between text-[10px] font-bold text-slate-700 dark:text-slate-200">
        <span className="flex items-center gap-1 text-[#1878B8]">
          <MapPin size={11} className="shrink-0" />
          <span>Client 360 Address</span>
        </span>
        <button
          type="button"
          onClick={onCancel}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded cursor-pointer"
          aria-label="Cancel editing address"
        >
          <X size={11} />
        </button>
      </div>

      {errorMessage && (
        <div className="flex items-start gap-1.5 p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/50 text-[9px] font-semibold text-rose-700 dark:text-rose-300">
          <AlertCircle size={11} className="shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
          <span className="leading-tight">{errorMessage}</span>
        </div>
      )}

      <input
        ref={streetInputRef}
        type="text"
        placeholder="Street Address (e.g. 123 Main St)"
        value={street}
        onChange={(e) => onStreetChange(e.target.value)}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Enter') onSave(card, e);
          if (e.key === 'Escape') onCancel(e);
        }}
        className="w-full px-2 py-1 text-[10px] rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-[#1878B8]"
      />

      <div className="flex items-center gap-1">
        <input
          type="text"
          placeholder="City"
          value={city}
          onChange={(e) => onCityChange(e.target.value)}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Enter') onSave(card, e);
            if (e.key === 'Escape') onCancel(e);
          }}
          className="w-2/3 px-2 py-1 text-[10px] rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-[#1878B8]"
        />
        <input
          type="text"
          placeholder="ZIP"
          value={zip}
          onChange={(e) => onZipChange(e.target.value)}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Enter') onSave(card, e);
            if (e.key === 'Escape') onCancel(e);
          }}
          className="w-1/3 px-2 py-1 text-[10px] rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-[#1878B8]"
        />
      </div>

      <div className="flex items-center justify-between pt-0.5">
        <span className="text-[8px] text-slate-400 dark:text-slate-500">
          Press <kbd className="px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 border text-[7.5px] font-mono">↵</kbd> to save
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={isSaving}
            onClick={onCancel}
            className="px-2 py-0.5 text-[9px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={(e) => onSave(card, e)}
            className="px-2.5 py-0.5 text-[9px] font-bold bg-[#1878B8] hover:bg-[#146399] text-white rounded flex items-center gap-1 shadow-2xs cursor-pointer transition-colors"
          >
            {isSaving ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />}
            <span>Save</span>
          </button>
        </div>
      </div>
    </div>
  );
}
