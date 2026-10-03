import React from 'react';
import { RotateCcw } from 'lucide-react';
import { Lead } from '@/types/leadTypes';
import { LOSS_REASONS } from '@/components/leads/MarkLeadLostModal';

interface LeadLostBannerProps {
  lead: Lead;
  onReactivate: () => void;
}

export function LeadLostBanner({ lead, onReactivate }: LeadLostBannerProps) {
  if (lead.status !== 'lost' || !lead.lossReason) return null;

  const reasonInfo = LOSS_REASONS[lead.lossReason];

  return (
    <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-900 dark:text-rose-200 space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-black text-xs text-rose-800 dark:text-rose-300">
          <span className="text-base">{reasonInfo?.icon}</span>
          <span>Reason for Loss: {reasonInfo?.label || lead.lossReason}</span>
        </div>
        {lead.lostDate && (
          <span className="text-[10px] font-semibold text-rose-600 dark:text-rose-400">
            Marked Lost: {lead.lostDate}
          </span>
        )}
      </div>
      <p className="text-xs text-rose-700 dark:text-rose-300 leading-relaxed font-medium">
        {lead.lossNotes || reasonInfo?.desc}
      </p>
      <div className="pt-2 flex justify-end">
        <button
          type="button"
          onClick={onReactivate}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-xs transition-all cursor-pointer text-xs"
        >
          <RotateCcw size={12} />
          <span>Reactivate Lead / Return to Active Pipeline</span>
        </button>
      </div>
    </div>
  );
}
