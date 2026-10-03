import React from 'react';
import { MapPin, Phone, ArrowRight } from 'lucide-react';
import { PipelineDealItem, PipelineStageId, PIPELINE_STAGES } from '@/components/pipeline/pipelineTypes';

export interface PipelineScheduleViewProps {
  filteredDeals: PipelineDealItem[];
  canAdvanceStage: boolean;
  getServiceBadgeClass: (color: string) => string;
  onSelectDeal: (deal: PipelineDealItem) => void;
  onAdvanceDeal: (dealId: string, nextStage: PipelineStageId) => void;
}

export function PipelineScheduleView({
  filteredDeals,
  canAdvanceStage,
  getServiceBadgeClass,
  onSelectDeal,
  onAdvanceDeal,
}: PipelineScheduleViewProps) {
  return (
    <div className="rounded-2xl light-glass-panel glossy-sheen border border-white/85 dark:border-white/10 p-5 shadow-xs space-y-3.5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/70 dark:border-white/10">
        <div>
          <h2 className="text-base font-black text-[#1F1F1F] dark:text-white tracking-tight">
            Inspection &amp; Follow-Up Schedule
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
            Live schedule calculated from on-site visit dates and follow-up deadlines.
          </p>
        </div>
        <div className="text-xs font-black text-[#1878B8] dark:text-sky-300 px-3 py-1 rounded-xl bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800/60">
          Active Timeline
        </div>
      </div>

      <div className="space-y-2.5">
        {filteredDeals.length === 0 ? (
          <div className="py-8 text-center text-xs font-semibold text-slate-400">
            No scheduled inspections or callbacks found.
          </div>
        ) : (
          filteredDeals.slice(0, 10).map((deal) => {
            const stageIndex = PIPELINE_STAGES.findIndex((s) => s.id === deal.stageId);
            const nextStage = PIPELINE_STAGES[stageIndex + 1]?.id;

            return (
              <div
                key={deal.id}
                onClick={() => onSelectDeal(deal)}
                className="p-3.5 rounded-xl liquid-glass-tile hover:border-sky-300 shadow-2xs hover:shadow-md transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start sm:items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-100/90 dark:bg-sky-950/60 text-[#1878B8] dark:text-sky-300 flex flex-col items-center justify-center shrink-0 font-black shadow-2xs">
                    <span className="text-[9.5px] uppercase leading-tight">Day</span>
                    <span className="text-sm leading-none">{deal.daysInStage}d</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-[#1F1F1F] dark:text-white">{deal.name}</span>
                      <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-md ${getServiceBadgeClass(deal.serviceColor)}`}>
                        {deal.service}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                      <MapPin size={10} className="text-[#1878B8] dark:text-sky-400" />
                      <span>{deal.address}, {deal.city}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center" onClick={(e) => e.stopPropagation()}>
                  <a
                    href={`tel:${deal.phone}`}
                    className="p-2 rounded-xl bg-sky-100 hover:bg-sky-200 dark:bg-sky-950/60 dark:hover:bg-sky-900/60 text-[#1878B8] dark:text-sky-300 transition-colors"
                  >
                    <Phone size={14} />
                  </a>
                  {canAdvanceStage && nextStage && (
                    <button
                      type="button"
                      onClick={() => onAdvanceDeal(deal.id, nextStage)}
                      className="px-3 py-1.5 rounded-xl bg-[#1878B8] hover:bg-[#14649a] text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>Advance</span>
                      <ArrowRight size={12} />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
