import React, { useState } from 'react';
import {
  UserPlus,
  Phone,
  Calendar,
  Camera,
  FileText,
  MessageSquare,
  MessageCircle,
  Users,
  Clock,
  Repeat,
  Award,
  ChevronRight,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  DollarSign,
  MapPin,
  Sparkles,
  Info,
  CalendarClock,
  XCircle,
  ShieldCheck,
  Send,
  UploadCloud,
} from 'lucide-react';
import {
  StageDefinition,
  PIPELINE_STAGES,
  PipelineDealItem,
  PipelineStageId,
  THREE_OUTCOMES,
} from './pipelineTypes';

interface PipelineProcessTimelineProps {
  deals: PipelineDealItem[];
  onSelectDeal: (deal: PipelineDealItem) => void;
  onAdvanceDeal: (dealId: string, nextStage: PipelineStageId) => void;
  onMarkOutcome: (dealId: string, outcome: 'closed_won' | 'closed_lost' | 'future_followup') => void;
}

const STEP_ICONS: Record<string, React.ElementType> = {
  'user-plus': UserPlus,
  'phone': Phone,
  'calendar': Calendar,
  'camera': Camera,
  'file-text': FileText,
  'message-square': MessageSquare,
  'message-circle': MessageCircle,
  'users': Users,
  'clock': Clock,
  'repeat': Repeat,
  'award': Award,
};

export function PipelineProcessTimeline({
  deals,
  onSelectDeal,
  onAdvanceDeal,
  onMarkOutcome,
}: PipelineProcessTimelineProps) {
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  // Group deals by stageId
  const dealsByStage = deals.reduce<Record<string, PipelineDealItem[]>>((acc, deal) => {
    if (!acc[deal.stageId]) acc[deal.stageId] = [];
    acc[deal.stageId].push(deal);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      {/* Brand SOP Header Card */}
      <div className="p-4 rounded-2xl light-glass-panel glossy-sheen border border-white/85 dark:border-white/10 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/60 text-[#0284c7] dark:text-sky-400 border border-sky-200 dark:border-sky-500/30">
              Standard Operating Procedure
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">• 11-Step Estimate Sending Process</span>
          </div>
          <h2 className="text-base font-black text-[#1F1F1F] dark:text-slate-100 tracking-tight mt-1">
            Estimate Sending Cadence &amp; SLA Milestones
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
            People | Properties | A Stronger Tomorrow — &quot;Leads Today. Lifelong Customers Tomorrow.&quot;
          </p>
        </div>

        {/* Three Outcomes Mandate Callout */}
        <div className="flex items-center gap-2.5 p-2.5 rounded-xl liquid-glass-tile border border-white/90 dark:border-white/10 shadow-2xs">
          <div className="w-7 h-7 rounded-lg bg-sky-100/90 dark:bg-sky-950/70 text-[#1878B8] dark:text-sky-400 flex items-center justify-center shrink-0">
            <Sparkles size={14} />
          </div>
          <div className="text-xs">
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500 dark:text-slate-400">Core Mandate</div>
            <div className="font-bold text-[#1F1F1F] dark:text-slate-100">
              Every lead ends in: <span className="text-emerald-700 dark:text-emerald-400 font-black">Won</span>, <span className="text-rose-700 dark:text-rose-400 font-black">Lost</span>, or <span className="text-amber-700 dark:text-amber-400 font-black">Future Follow-Up</span>
            </div>
          </div>
        </div>
      </div>

      {/* Vertical Interactive SOP Timeline */}
      <div className="relative pl-6 md:pl-10 space-y-5 before:absolute before:left-3 md:before:left-5 before:top-4 before:bottom-6 before:w-1 before:bg-gradient-to-b before:from-[#1878B8] before:via-sky-400 before:to-emerald-500 before:rounded-full">
        {PIPELINE_STAGES.map((stage, idx) => {
          const IconComponent = STEP_ICONS[stage.iconType] || Clock;
          const stageDeals = dealsByStage[stage.id] || [];
          const totalVal = stageDeals.reduce((sum, d) => sum + d.value, 0);
          const nextStage = PIPELINE_STAGES[idx + 1]?.id;
          const isExpanded = expandedStep === stage.stepNumber || (expandedStep === null && stageDeals.length > 0);

          return (
            <div key={stage.id} className="relative group">
              {/* Step Number Disc on Conduit */}
              <div
                style={{ backgroundColor: stage.accentColor }}
                className="absolute -left-[30px] md:-left-[38px] top-4 w-8 h-8 md:w-9 md:h-9 rounded-full text-white font-black text-xs md:text-sm flex items-center justify-center shadow-[0_0_16px_rgba(24,120,184,0.40)] ring-4 ring-white dark:ring-[#070C15] z-10 transition-transform group-hover:scale-110"
              >
                {stage.stepNumber}
              </div>

              {/* Step Card Container */}
              <div className="rounded-2xl light-glass-card glossy-sheen border border-white/85 dark:border-white/10 p-4 md:p-5 shadow-xs hover:shadow-md transition-all">
                {/* Milestone Bar */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-200/70 dark:border-white/10">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <div
                      style={{ backgroundColor: `${stage.accentColor}18`, color: stage.accentColor }}
                      className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-2xs font-bold"
                    >
                      <IconComponent size={16} />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Step {stage.stepNumber}
                        </span>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border shadow-2xs ${stage.pillBg} ${stage.pillText}`}>
                          {stage.timingLabel}
                        </span>
                        {stage.stepNumber === 5 && (
                          <span className="text-[9.5px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-amber-500 text-white shadow-xs animate-pulse">
                            Priority Goal
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm md:text-base font-black text-[#1F1F1F] dark:text-slate-100 tracking-tight mt-0.5">
                        {stage.title}
                      </h3>
                    </div>
                  </div>

                  {/* Deals Count & Value Badge */}
                  <div className="flex items-center gap-3 self-end lg:self-center">
                    <div className="text-right">
                      <div className="text-xs font-black text-[#1F1F1F] dark:text-slate-100">
                        {stageDeals.length} Active {stageDeals.length === 1 ? 'Deal' : 'Deals'}
                      </div>
                      <div className="text-[10.5px] text-emerald-700 dark:text-emerald-400 font-black">
                        ${totalVal.toLocaleString()} Pipeline Value
                      </div>
                    </div>

                    <button
                      onClick={() => setExpandedStep(expandedStep === stage.stepNumber ? -1 : stage.stepNumber)}
                      className="px-2.5 py-1 rounded-xl liquid-glass-btn text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
                    >
                      {isExpanded ? 'Collapse' : `View (${stageDeals.length})`}
                    </button>
                  </div>
                </div>

                {/* SOP Playbook Instruction Callout */}
                <div className="mt-2.5 p-2.5 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-white/80 dark:border-white/10 shadow-2xs flex items-start gap-2">
                  <div className="mt-0.5 text-[#1878B8] shrink-0">
                    <Info size={14} />
                  </div>
                  <div className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                    <strong className="text-[#1F1F1F] dark:text-slate-100 font-bold">Standard Playbook: </strong>
                    {stage.sopGoal}
                  </div>
                </div>

                {/* Active Deals List for this step */}
                {isExpanded && (
                  <div className="mt-3.5 pt-3 border-t border-slate-200/50 dark:border-white/10 space-y-2.5">
                    {stageDeals.length === 0 ? (
                      <div className="py-4 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 bg-white/40 dark:bg-slate-900/40 rounded-xl border border-dashed border-slate-300/80 dark:border-white/10">
                        No deals currently waiting at Step {stage.stepNumber}. Ready for next inbound inquiry.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {stageDeals.map((deal) => {
                          const isSlaBreached = deal.slaStatus === 'overdue';
                          const isSlaDue = deal.slaStatus === 'due_today';

                          return (
                            <div
                              key={deal.id}
                              onClick={() => onSelectDeal(deal)}
                              style={{
                                borderLeftWidth: '3.5px',
                                borderLeftColor: stage.accentColor,
                              }}
                              className="group/card p-3 rounded-xl liquid-glass-tile hover:border-sky-300 dark:hover:border-sky-400 shadow-2xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                            >
                              <div className="space-y-1.5">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <div className="font-bold text-xs text-[#1F1F1F] dark:text-slate-100 group-hover/card:text-[#1878B8] dark:group-hover/card:text-sky-400 transition-colors leading-snug">
                                      {deal.name}
                                    </div>
                                    <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                                      <MapPin size={9} className="text-[#1878B8]" />
                                      <span className="truncate">{deal.address}, {deal.city}</span>
                                    </div>
                                  </div>
                                  {deal.leadSource === 'website' ? (
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-500/30">
                                      Website
                                    </span>
                                  ) : (
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 truncate max-w-[90px]" title={deal.createdByName || deal.leadSourceDetail || 'Manual'}>
                                      {deal.createdByName || deal.leadSourceDetail || 'Manual'}
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center justify-between text-[10.5px]">
                                  <span className="font-semibold text-slate-600 dark:text-slate-300 truncate max-w-[170px]">
                                    {deal.service}
                                  </span>
                                  <span className="font-black text-[#1F1F1F] dark:text-slate-100">
                                    ${deal.value.toLocaleString()}
                                  </span>
                                </div>

                                {/* SLA / Status Badge */}
                                <div className="flex items-center justify-between gap-1.5 pt-0.5">
                                  <span
                                    className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1 ${
                                      isSlaBreached
                                        ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30'
                                        : isSlaDue
                                        ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                    }`}
                                  >
                                    <Clock size={9} />
                                    <span>{deal.slaText}</span>
                                  </span>

                                  {deal.photosCount > 0 && (
                                    <span className="text-[9.5px] font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-1">
                                      <Camera size={9} />
                                      <span>{deal.photosCount}</span>
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Footer Action Strip */}
                              <div className="mt-2 pt-2 border-t border-slate-200/50 dark:border-white/10 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5">
                                  <img
                                    src={deal.estimator.avatar}
                                    alt={deal.estimator.name}
                                    className="w-4 h-4 rounded-full object-cover border border-white dark:border-slate-800"
                                  />
                                  <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                                    {deal.estimator.name.split(' ')[0]}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                  {nextStage && (
                                    <button
                                      onClick={() => onAdvanceDeal(deal.id, nextStage)}
                                      className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg bg-sky-100 dark:bg-sky-950/60 text-[#0284c7] dark:text-sky-400 hover:bg-[#1878B8] hover:text-white dark:hover:bg-sky-600 dark:border dark:border-sky-500/30 transition-all cursor-pointer"
                                      title="Advance to next process step"
                                    >
                                      <span>Next Step</span>
                                      <ArrowRight size={10} />
                                    </button>
                                  )}

                                  {stage.stepNumber >= 8 && (
                                    <button
                                      onClick={() => onMarkOutcome(deal.id, 'closed_won')}
                                      className="p-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600 dark:border dark:border-emerald-500/30 transition-all cursor-pointer"
                                      title="Mark Closed Won"
                                    >
                                      <Award size={12} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Outcome Finalization Bar at Bottom of Process */}
      <div className="p-4 rounded-2xl light-glass-panel glossy-sheen border border-white/85 dark:border-white/10 shadow-xs space-y-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-[#1878B8] dark:text-sky-400">
              Pipeline Destination Mandate
            </span>
          </div>
          <h3 className="text-sm font-black text-[#1F1F1F] dark:text-slate-100 tracking-tight mt-0.5">
            Every Deal Resolves in One of Three Definite Outcomes
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
            No lead is left adrift. Maintain high velocity and clear accountability across sales operations.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          {/* Closed Won */}
          <div className="p-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/90 dark:border-emerald-500/20 shadow-2xs space-y-1">
            <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 font-black text-xs">
              <Award size={14} />
              <span>1. Closed Won / Job Sold</span>
            </div>
            <p className="text-[10.5px] text-emerald-700 dark:text-emerald-400 font-medium leading-relaxed">
              Collect approval &amp; initial payment, finalize material/colors, and transition directly to Project Management.
            </p>
          </div>

          {/* Closed Lost */}
          <div className="p-3 rounded-xl bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200/90 dark:border-rose-500/20 shadow-2xs space-y-1">
            <div className="flex items-center gap-1.5 text-rose-800 dark:text-rose-300 font-black text-xs">
              <XCircle size={14} />
              <span>2. Closed Lost (Root Cause)</span>
            </div>
            <p className="text-[10.5px] text-rose-700 dark:text-rose-400 font-medium leading-relaxed">
              Mandatory autopsy attribution: Competitor price, ghosted, DIY, insurance denied, or out of area.
            </p>
          </div>

          {/* Future Follow-Up Date */}
          <div className="p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/90 dark:border-amber-500/20 shadow-2xs space-y-1">
            <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 font-black text-xs">
              <CalendarClock size={14} />
              <span>3. Future Follow-Up Date</span>
            </div>
            <p className="text-[10.5px] text-amber-700 dark:text-amber-400 font-medium leading-relaxed">
              Move undecided deals into structured follow-up buckets: 30-day, 60-day, 90-day, insurance, or HOA review.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
