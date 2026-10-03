import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { LOSS_REASONS } from '@/components/leads/MarkLeadLostModal';

interface LeadMarkLostDrawerProps {
  onMarkLost: (reason: string, notes?: string) => void;
  onCloseDrawer: () => void;
  onToast: (msg: string) => void;
}

export function LeadMarkLostDrawer({
  onMarkLost,
  onCloseDrawer,
  onToast,
}: LeadMarkLostDrawerProps) {
  const [selectedReason, setSelectedReason] = useState<string>('competitor_price');
  const [customReasonText, setCustomReasonText] = useState('');
  const [lossNoteInput, setLossNoteInput] = useState('');

  const isCustomReason = selectedReason === 'custom';
  const canConfirmLost = !isCustomReason || customReasonText.trim().length > 0;

  const handleConfirmLost = () => {
    if (!canConfirmLost) return;
    const finalReason = (isCustomReason ? customReasonText.trim() : selectedReason) || 'other';
    onMarkLost(finalReason, lossNoteInput);
    onCloseDrawer();
    onToast('Lead successfully marked as Lost opportunity');
  };

  return (
    <div className="p-3.5 rounded-2xl bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 space-y-3 animate-in fade-in duration-150">
      <div className="flex items-center justify-between">
        <span className="font-bold text-rose-900 dark:text-rose-200 text-xs flex items-center gap-1.5">
          <AlertTriangle size={13} className="text-rose-600 dark:text-rose-400" />
          <span>Select Reason for Lost Opportunity</span>
        </span>
        <button
          type="button"
          onClick={onCloseDrawer}
          className="text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-white font-bold cursor-pointer transition-colors"
          aria-label="Close lost picker"
        >
          ✕
        </button>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {Object.entries(LOSS_REASONS).map(([key, item]) => (
          <button
            key={key}
            type="button"
            onClick={() => setSelectedReason(key)}
            className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
              selectedReason === key
                ? 'bg-white dark:bg-slate-900 border-rose-400 dark:border-rose-500 shadow-2xs font-bold text-rose-900 dark:text-rose-200'
                : 'bg-white/60 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-white/10'
            } ${key === 'custom' ? 'col-span-2' : ''}`}
          >
            <div className="flex items-center gap-1.5 text-xs">
              <span>{item.icon}</span>
              <span className="truncate">{item.label}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Custom reason field */}
      {isCustomReason && (
        <div className="animate-in fade-in slide-in-from-top-1 duration-150">
          <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
            Custom Reason <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={customReasonText}
            onChange={(e) => setCustomReasonText(e.target.value)}
            placeholder="e.g. HOA restrictions prevented the project"
            autoFocus
            className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-white/5 border border-rose-300 dark:border-rose-800 text-xs text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-300/50 transition-all"
          />
        </div>
      )}

      <div>
        <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
          Loss Explanation Notes <span className="text-slate-400 dark:text-slate-500 font-normal normal-case">(optional)</span>
        </label>
        <input
          type="text"
          value={lossNoteInput}
          onChange={(e) => setLossNoteInput(e.target.value)}
          placeholder="e.g. Customer selected competitor who bid $3k lower on underlayment"
          className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 text-xs text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-rose-400 focus:bg-white dark:focus:bg-slate-900 transition-all"
        />
      </div>

      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCloseDrawer}
          className="px-3 py-1 rounded-lg text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirmLost}
          disabled={!canConfirmLost}
          className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold transition-colors cursor-pointer shadow-xs"
        >
          Confirm Mark Lost
        </button>
      </div>
    </div>
  );
}
