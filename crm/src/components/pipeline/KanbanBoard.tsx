import React, { useState, useRef, useMemo, useCallback } from 'react';
import {
  PipelineDealItem,
  StageDefinition,
  PipelineStageId,
} from '@/components/pipeline/pipelineTypes';
import { KanbanDealCard } from '@/components/pipeline/KanbanDealCard';

export interface KanbanBoardProps {
  stages: StageDefinition[];
  deals: PipelineDealItem[];
  filteredDeals: PipelineDealItem[];
  pillGradients: Record<number, string>;
  isDark: boolean;
  canViewFinances: boolean;
  canAdvanceStage: boolean;
  canClaimLead: boolean;
  canReassignLead: boolean;
  highlightedStage?: PipelineStageId | null;
  onSelectDeal: (deal: PipelineDealItem) => void;
  onAdvanceDeal: (dealId: string, nextStageId: PipelineStageId) => void;
  onDropDealOnStage: (dealId: string, stageId: PipelineStageId) => void;
  onClaimDeal?: (deal: PipelineDealItem) => void;
  onReassignDeal?: (deal: PipelineDealItem) => void;
  onFollowUpDeal?: (deal: PipelineDealItem) => void;
  getServiceBadgeClass: (color?: string) => string;
  scrollRef?: React.RefObject<HTMLDivElement | null> | React.RefObject<HTMLDivElement>;
  onScroll?: () => void;
}

export function KanbanBoard({
  stages,
  filteredDeals,
  pillGradients,
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
  getServiceBadgeClass,
  scrollRef,
  onScroll,
}: KanbanBoardProps) {
  const [draggedDealId, setDraggedDealId] = useState<string | null>(null);
  const [dragOverStageId, setDragOverStageId] = useState<PipelineStageId | null>(null);
  const localScrollRef = useRef<HTMLDivElement>(null);
  const activeScrollRef = (scrollRef as React.RefObject<HTMLDivElement>) || localScrollRef;

  // Single-pass stage grouping with memoization to eliminate per-render array allocations
  const dealsByStage = useMemo(() => {
    const map: Record<string, PipelineDealItem[]> = {};
    for (const stage of stages) {
      map[stage.id] = [];
    }
    for (const deal of filteredDeals) {
      if (map[deal.stageId]) {
        map[deal.stageId].push(deal);
      }
    }
    if (map['follow_up']) {
      map['follow_up'].sort((a, b) => {
        if (a.isFollowupOverdue && !b.isFollowupOverdue) return -1;
        if (!a.isFollowupOverdue && b.isFollowupOverdue) return 1;
        const remA = a.followupDaysRemaining ?? 7;
        const remB = b.followupDaysRemaining ?? 7;
        return remA - remB;
      });
    }
    return map;
  }, [stages, filteredDeals]);

  // Memoized stage totals
  const stageTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const stage of stages) {
      const stageDeals = dealsByStage[stage.id] || [];
      totals[stage.id] = stageDeals.reduce((sum, d) => sum + d.value, 0);
    }
    return totals;
  }, [stages, dealsByStage]);

  const handleDragStart = useCallback((dealId: string, _sourceStageId: PipelineStageId) => {
    setDraggedDealId(dealId);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedDealId(null);
    setDragOverStageId(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, stageId: PipelineStageId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverStageId((prev) => (prev !== stageId ? stageId : prev));
  }, []);

  const handleDragLeave = useCallback((stageId: PipelineStageId) => {
    setDragOverStageId((prev) => (prev === stageId ? null : prev));
  }, []);

  const handleDropOnStage = useCallback((e: React.DragEvent, targetStageId: PipelineStageId) => {
    e.preventDefault();
    if (draggedDealId) {
      onDropDealOnStage(draggedDealId, targetStageId);
    }
    setDraggedDealId(null);
    setDragOverStageId(null);
  }, [draggedDealId, onDropDealOnStage]);

  return (
    <div className="relative">
      <div
        ref={activeScrollRef}
        onScroll={onScroll}
        className="grid grid-flow-col auto-cols-[300px] gap-3.5 overflow-x-auto pb-4 pt-1 transition-all kanban-horizontal-scroll"
      >
        {stages.map((stage, stageIdx) => {
          const stageDeals = dealsByStage[stage.id] || [];
          const totalVal = stageTotals[stage.id] || 0;
          const nextStage = stages[stageIdx + 1];
          const isColHighlighted = highlightedStage === stage.id;
          const isHovered = dragOverStageId === stage.id;
          const headerGradient =
            pillGradients[stage.stepNumber] || 'bg-gradient-to-r from-[#1878B8] to-[#55C4F5]';

          return (
            <div
              id={`stage-col-${stage.id}`}
              key={stage.id}
              onDragOver={(e) => handleDragOver(e, stage.id)}
              onDragLeave={() => handleDragLeave(stage.id)}
              onDrop={(e) => handleDropOnStage(e, stage.id)}
              style={{
                backgroundColor: isDark ? 'rgba(10, 16, 28, 0.65)' : undefined,
                boxShadow: isHovered
                  ? `0 0 0 2.5px ${stage.accentColor}, inset 0 1.5px 1px 0 rgba(255,255,255,0.75), 0 4px 24px -2px ${stage.accentColor}33`
                  : isDark
                  ? '0 4px 20px -2px rgba(0, 0, 0, 0.5)'
                  : undefined,
                transform: isHovered ? 'scale(1.015)' : 'scale(1)',
                transition: 'all 180ms cubic-bezier(0.16, 1, 0.3, 1)',
              }}
              className={`liquid-column-channel rounded-2xl p-2 flex flex-col space-y-2 border transition-all duration-300 shadow-xs bg-white/50 dark:bg-[#0A101C]/65 min-h-[560px] max-h-[calc(100vh-270px)] overflow-hidden ${
                isHovered
                  ? 'ring-4 ring-sky-400/80 border-sky-400'
                  : isColHighlighted
                  ? 'ring-4 ring-sky-400/80 border-sky-400 scale-[1.01]'
                  : 'border-slate-200/80 dark:border-white/10'
              }`}
            >
              {/* Column Header Pill */}
              <div
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl shadow-xs text-white ${headerGradient}`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-4 h-4 rounded-full bg-white/25 text-[10px] flex items-center justify-center font-black shrink-0">
                    {stage.stepNumber}
                  </span>
                  <span className="text-[11px] font-black truncate">{stage.shortTitle}</span>
                </div>
                <span className="text-[9.5px] font-black px-1.5 py-0.2 rounded-md bg-black/20 text-white shrink-0 ml-1">
                  {stageDeals.length}
                </span>
              </div>

              {/* Timing & Total Value Subhead */}
              <div className="flex items-center justify-between px-1 text-[10.5px] text-slate-500 dark:text-slate-400 font-medium">
                <span className="font-semibold text-slate-600 dark:text-slate-300 truncate">
                  {stage.timingLabel}
                </span>
                <span className="font-bold text-[#1F1F1F] dark:text-white">
                  {!canViewFinances ? '🔒 $•••' : `$${totalVal.toLocaleString()}`}
                </span>
              </div>

              {/* Cards List in Column */}
              <div className="space-y-2 flex-1 overflow-y-auto kanban-column-scroll min-h-0 pt-1 pr-0.5">
                {stageDeals.length === 0 ? (
                  <div className="py-8 text-center text-xs font-semibold text-slate-400 dark:text-slate-500 bg-white/30 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-white/10">
                    Drag deal here
                  </div>
                ) : (
                  stageDeals.map((deal) => (
                    <KanbanDealCard
                      key={deal.id}
                      deal={deal}
                      stage={stage}
                      nextStageDef={nextStage}
                      canViewFinances={canViewFinances}
                      canAdvanceStage={canAdvanceStage}
                      canClaimLead={canClaimLead}
                      canReassignLead={canReassignLead}
                      onSelectDeal={onSelectDeal}
                      onAdvanceDeal={onAdvanceDeal}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                      onClaimDeal={onClaimDeal}
                      onReassignDeal={onReassignDeal}
                      onFollowUpDeal={onFollowUpDeal}
                      getServiceBadgeClass={getServiceBadgeClass}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
