import React from 'react';
import {
  PipelineStageId,
  PIPELINE_STAGES,
  PipelineDealItem,
} from '@/components/pipeline/pipelineTypes';
import { KanbanBoard } from '@/components/pipeline/KanbanBoard';
import { PipelineProcessTimeline } from '@/components/pipeline/PipelineProcessTimeline';
import { PipelineTableView } from './PipelineTableView';
import { PipelineScheduleView } from './PipelineScheduleView';
import { PipelineScrollbar } from './PipelineScrollbar';

export const DEFAULT_PILL_GRADIENTS: Record<number, string> = {
  1: 'bg-gradient-to-r from-[#0284c7] via-[#0ea5e9] to-[#38bdf8]',
  2: 'bg-gradient-to-r from-[#0891b2] via-[#06b6d4] to-[#22d3ee]',
  3: 'bg-gradient-to-r from-[#7c3aed] via-[#8b5cf6] to-[#a855f7]',
  4: 'bg-gradient-to-r from-[#4f46e5] via-[#6366f1] to-[#818cf8]',
  5: 'bg-gradient-to-r from-[#d97706] via-[#f59e0b] to-[#fbbf24]',
  6: 'bg-gradient-to-r from-[#059669] via-[#10b981] to-[#34d399]',
  7: 'bg-gradient-to-r from-[#0d9488] via-[#14b8a6] to-[#2dd4bf]',
  8: 'bg-gradient-to-r from-[#db2777] via-[#ec4899] to-[#f472b6]',
  9: 'bg-gradient-to-r from-[#ea580c] via-[#f97316] to-[#fb923c]',
  10: 'bg-gradient-to-r from-[#475569] via-[#64748b] to-[#94a3b8]',
  11: 'bg-gradient-to-r from-[#15803d] via-[#16a34a] to-[#22c55e]',
};

export const defaultGetServiceBadgeClass = (color?: string) => {
  switch (color) {
    case 'sky':
      return 'bg-sky-100/90 text-[#0284c7] border border-sky-300/80 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800/60 font-bold shadow-2xs backdrop-blur-xs';
    case 'amber':
      return 'bg-amber-100/90 text-amber-900 border border-[#F9C500]/70 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60 font-bold shadow-2xs backdrop-blur-xs';
    case 'blue':
      return 'bg-blue-100/90 text-blue-900 border border-blue-300/80 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/60 font-bold shadow-2xs backdrop-blur-xs';
    case 'coral':
      return 'bg-rose-100/90 text-rose-900 border border-rose-300/80 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/60 font-bold shadow-2xs backdrop-blur-xs';
    case 'purple':
      return 'bg-purple-100/90 text-purple-900 border border-purple-300/80 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800/60 font-bold shadow-2xs backdrop-blur-xs';
    case 'emerald':
      return 'bg-emerald-100/90 text-emerald-900 border border-emerald-300/80 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60 font-bold shadow-2xs backdrop-blur-xs';
    default:
      return 'bg-slate-100 text-slate-800 border border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-white/10 font-bold shadow-2xs';
  }
};

export interface PipelineBoardViewProps {
  viewMode: 'kanban' | 'timeline' | 'table' | 'calendar';
  isLoading: boolean;
  deals: PipelineDealItem[];
  filteredDeals: PipelineDealItem[];
  pillGradients?: Record<number, string>;
  isDark: boolean;
  canViewFinances: boolean;
  canAdvanceStage: boolean;
  canClaimLead: boolean;
  canReassignLead: boolean;
  highlightedStage: PipelineStageId | null;
  onSelectDeal: (deal: PipelineDealItem) => void;
  onAdvanceDeal: (dealId: string, nextStage: PipelineStageId) => void;
  onDropDealOnStage: (dealId: string, targetStageId: PipelineStageId) => void;
  onClaimDeal: (deal: PipelineDealItem) => void;
  onReassignDeal: (deal: PipelineDealItem) => void;
  onFollowUpDeal: (deal: PipelineDealItem) => void;
  onMarkOutcome: (dealId: string, outcome: 'closed_lost' | 'closed_won' | 'future_followup') => void;
  getServiceBadgeClass?: (color?: string) => string;
  kanbanScrollRef: React.RefObject<HTMLDivElement | null>;
  onKanbanScroll: () => void;
  canScrollLeft: boolean;
  canScrollRight: boolean;
  visibleRange: [number, number];
  scrollProgress: number;
  onScrollBoard: (direction: 'left' | 'right') => void;
  onScrollToStage: (stageId: PipelineStageId) => void;
}

export function PipelineBoardView({
  viewMode,
  isLoading,
  deals,
  filteredDeals,
  pillGradients = DEFAULT_PILL_GRADIENTS,
  isDark,
  canViewFinances,
  canAdvanceStage,
  canClaimLead,
  canReassignLead,
  highlightedStage,
  onSelectDeal,
  onAdvanceDeal,
  onDropDealOnStage,
  onClaimDeal,
  onReassignDeal,
  onFollowUpDeal,
  onMarkOutcome,
  getServiceBadgeClass = defaultGetServiceBadgeClass,
  kanbanScrollRef,
  onKanbanScroll,
  canScrollLeft,
  canScrollRight,
  visibleRange,
  scrollProgress,
  onScrollBoard,
  onScrollToStage,
}: PipelineBoardViewProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3.5 items-start">
        {[1, 2, 3, 4].map((ph) => (
          <div
            key={ph}
            className="rounded-2xl p-3 flex flex-col space-y-3 border border-slate-200/70 dark:border-white/10 bg-white/40 dark:bg-slate-900/40 min-h-[580px] animate-pulse"
          >
            <div className="h-10 rounded-xl bg-slate-200/80 dark:bg-slate-800" />
            <div className="space-y-3 flex-1">
              {[1, 2, 3].map((st) => (
                <div key={st} className="space-y-2 rounded-xl p-2.5 bg-slate-100/60 dark:bg-slate-800/60">
                  <div className="h-4 rounded bg-slate-200 dark:bg-slate-700 w-1/2" />
                  <div className="h-20 rounded-xl bg-slate-200/60 dark:bg-slate-700/60" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      {viewMode === 'kanban' && (
        <KanbanBoard
          stages={PIPELINE_STAGES}
          deals={deals}
          filteredDeals={filteredDeals}
          pillGradients={pillGradients}
          isDark={isDark}
          canViewFinances={canViewFinances}
          canAdvanceStage={canAdvanceStage}
          canClaimLead={canClaimLead}
          canReassignLead={canReassignLead}
          highlightedStage={highlightedStage}
          onSelectDeal={onSelectDeal}
          onAdvanceDeal={onAdvanceDeal}
          onDropDealOnStage={onDropDealOnStage}
          onClaimDeal={onClaimDeal}
          onReassignDeal={onReassignDeal}
          onFollowUpDeal={onFollowUpDeal}
          getServiceBadgeClass={getServiceBadgeClass}
          scrollRef={kanbanScrollRef}
          onScroll={onKanbanScroll}
        />
      )}

      {viewMode === 'timeline' && (
        <PipelineProcessTimeline
          deals={filteredDeals}
          onSelectDeal={onSelectDeal}
          onAdvanceDeal={onAdvanceDeal}
          onMarkOutcome={onMarkOutcome}
        />
      )}

      {viewMode === 'table' && (
        <PipelineTableView
          filteredDeals={filteredDeals}
          canViewFinances={canViewFinances}
          canAdvanceStage={canAdvanceStage}
          canClaimLead={canClaimLead}
          getServiceBadgeClass={getServiceBadgeClass}
          onSelectDeal={onSelectDeal}
          onAdvanceDeal={onAdvanceDeal}
          onClaimDeal={onClaimDeal}
        />
      )}

      {viewMode === 'calendar' && (
        <PipelineScheduleView
          filteredDeals={filteredDeals}
          canAdvanceStage={canAdvanceStage}
          getServiceBadgeClass={getServiceBadgeClass}
          onSelectDeal={onSelectDeal}
          onAdvanceDeal={onAdvanceDeal}
        />
      )}

      {viewMode === 'kanban' && (
        <PipelineScrollbar
          canScrollLeft={canScrollLeft}
          canScrollRight={canScrollRight}
          visibleRange={visibleRange}
          highlightedStage={highlightedStage}
          scrollProgress={scrollProgress}
          kanbanScrollRef={kanbanScrollRef}
          onScrollBoard={onScrollBoard}
          onScrollToStage={onScrollToStage}
        />
      )}
    </>
  );
}
