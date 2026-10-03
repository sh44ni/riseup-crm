import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { PipelineKpiGrid } from '@/components/pipeline/PipelineKpiGrid';
import {
  PipelineStageId,
  PIPELINE_STAGES,
  PipelineDealItem,
} from '@/components/pipeline/pipelineTypes';
import { CreateLeadPayload } from '@/components/pipeline/CreateLeadModal';
import {
  updatePipelineDealStage,
  setDealOutcome,
  logDealFollowUp,
  claimLead,
} from '@/api/pipelineApi';
import { api } from '@/lib/api';
import { useDragAutoScroll } from '@/hooks/useDragAutoScroll';
import { useDashboardStats } from '@/lib/dashboardStatsStore';
import { usePipelineData } from '@/hooks/usePipelineData';
import { PipelineToolbar } from '@/components/pipeline/PipelineToolbar';
import { PipelineModals } from '@/components/pipeline/PipelineModals';
import { useHotkey } from '@/shared/lib/useHotkey';
import { useKanbanDnD } from '@/features/kanban-dnd/useKanbanDnD';
import { PipelineSopBar } from '@/features/kanban-dnd/PipelineSopBar';
import { PipelineBoardView } from '@/features/kanban-dnd/PipelineBoardView';
import { ScheduleAppointmentModal } from '@/features/kanban-dnd/ScheduleAppointmentModal';
import { exportPipelineCSV } from '@/features/kanban-dnd/exportPipelineCsv';
import { KanbanCard, KanbanColumn } from '@/features/kanban-dnd/types';

export function PipelinePage() {
  const { user, can, isOwner, getScope } = useAuth();
  const canViewFinances = can('finances.view');
  const canAdvanceStage = can('pipeline.advance_stage');
  const canCreateLead = can('leads.create');
  const canClaimLead = isOwner || can('leads.claim');
  const canReassignLead = isOwner || can('leads.reassign');
  const isOwnOnly = getScope('leads.view') === 'own';

  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { stats } = useDashboardStats();
  const { toast } = useToast();

  const { deals, summary, isLoading, isRefreshing, analytics, setDeals, refresh } = usePipelineData();

  const [searchParams] = useSearchParams();
  const stageParam = searchParams.get('stage') as PipelineStageId | null;

  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'kanban' | 'timeline' | 'table' | 'calendar'>('kanban');
  const [highlightedStage, setHighlightedStage] = useState<PipelineStageId | null>(stageParam || null);

  const [selectedEstimator, setSelectedEstimator] = useState<string>('all');
  const [selectedService, setSelectedService] = useState<string>('all');
  const [selectedSlaFilter, setSelectedSlaFilter] = useState<string>('all');

  const [activeDealModal, setActiveDealModal] = useState<PipelineDealItem | null>(null);
  const [showCreateLeadModal, setShowCreateLeadModal] = useState(false);
  const [followUpModalDeal, setFollowUpModalDeal] = useState<PipelineDealItem | null>(null);
  const [isSavingFollowUp, setIsSavingFollowUp] = useState<boolean>(false);
  const [claimModalDeal, setClaimModalDeal] = useState<PipelineDealItem | null>(null);
  const [reassignModalDeal, setReassignModalDeal] = useState<PipelineDealItem | null>(null);

  const [pendingScheduleDeal, setPendingScheduleDeal] = useState<PipelineDealItem | null>(null);
  const [pipelineScheduleDateTime, setPipelineScheduleDateTime] = useState('');
  const [isSchedulingPipeline, setIsSchedulingPipeline] = useState(false);

  const kanbanScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [visibleRange, setVisibleRange] = useState<[number, number]>([1, 5]);
  const [scrollProgress, setScrollProgress] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useHotkey('k', () => searchInputRef.current?.focus(), { metaOrCtrl: true });

  const handleKanbanScroll = () => {
    if (!kanbanScrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = kanbanScrollRef.current;
    setCanScrollLeft(scrollLeft > 25);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 25);
    const maxScroll = scrollWidth - clientWidth;
    setScrollProgress(maxScroll > 0 ? scrollLeft / maxScroll : 0);
    const colWidth = 315;
    const firstVisible = Math.min(8, Math.max(1, Math.floor(scrollLeft / colWidth) + 1));
    const countVisible = Math.min(8, Math.ceil(clientWidth / colWidth));
    const lastVisible = Math.min(8, firstVisible + countVisible - 1);
    setVisibleRange([firstVisible, lastVisible]);
  };

  useEffect(() => {
    handleKanbanScroll();
  }, [deals]);

  const scrollBoard = (direction: 'left' | 'right') => {
    if (kanbanScrollRef.current) {
      const scrollDelta = direction === 'left' ? -620 : 620;
      kanbanScrollRef.current.scrollBy({ left: scrollDelta, behavior: 'smooth' });
    }
  };

  const scrollToStage = (stageId: PipelineStageId) => {
    const targetStage = PIPELINE_STAGES.find((s) => s.id === stageId);
    if (!targetStage) return;

    const el = document.getElementById(`stage-col-${stageId}`);
    if (el && kanbanScrollRef.current) {
      el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      setHighlightedStage(stageId);
      const timer = setTimeout(() => setHighlightedStage(null), 2200);
      return () => clearTimeout(timer);
    }
  };

  useEffect(() => {
    if (stageParam) {
      const timer = setTimeout(() => {
        scrollToStage(stageParam);
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [stageParam]);

  const filteredDeals = useMemo(() => {
    return deals.filter((deal) => {
      if (selectedEstimator !== 'all' && deal.estimator.name !== selectedEstimator) return false;
      if (selectedService !== 'all' && !deal.service.toLowerCase().includes(selectedService.toLowerCase())) return false;
      if (selectedSlaFilter === 'due_today' && deal.slaStatus !== 'due_today') return false;
      if (selectedSlaFilter === 'overdue' && deal.slaStatus !== 'overdue') return false;
      if (selectedSlaFilter === 'high_value' && deal.value < 25000) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = deal.name.toLowerCase().includes(q);
        const matchAddress = deal.address.toLowerCase().includes(q) || deal.city.toLowerCase().includes(q);
        const matchPhone = deal.phone.includes(q);
        const matchService = deal.service.toLowerCase().includes(q);
        const matchEstimator = deal.estimator.name.toLowerCase().includes(q);
        if (!matchName && !matchAddress && !matchPhone && !matchService && !matchEstimator) {
          return false;
        }
      }
      return true;
    });
  }, [deals, selectedEstimator, selectedService, selectedSlaFilter, searchQuery]);

  const availableEstimators = useMemo(() => {
    const set = new Set<string>();
    deals.forEach((d) => {
      if (d.estimator?.name) set.add(d.estimator.name);
    });
    return Array.from(set);
  }, [deals]);

  const kanbanCards: KanbanCard[] = useMemo(() => deals.map((d) => ({
    id: d.id,
    name: d.name,
    stageId: d.stageId,
    value: d.value,
    address: d.address,
    city: d.city,
    service: d.service,
    serviceColor: d.serviceColor,
    phone: d.phone,
    email: d.email,
    assignedToUserId: d.assignedToUserId,
    estimator: d.estimator,
  })), [deals]);

  const kanbanColumns: KanbanColumn[] = useMemo(() => PIPELINE_STAGES.map((s) => ({
    id: s.id,
    title: s.title,
    shortTitle: s.shortTitle,
    stepNumber: s.stepNumber,
    accentColor: s.accentColor,
    pillBg: s.pillBg,
    pillText: s.pillText,
  })), []);

  const dnd = useKanbanDnD({
    cards: kanbanCards,
    columns: kanbanColumns,
    canAdvanceStage,
    onMoveCard: async (cardId, targetStageId, notes) => {
      await updatePipelineDealStage(cardId, targetStageId as PipelineStageId, notes, {
        authorName: user?.name,
        authorRole: user?.role,
      });
      await refresh(true);
    },
    notifyWarning: (msg) => toast.warning(msg),
    notifySuccess: (msg) => toast.success(msg),
    notifyError: (msg) => toast.error(msg),
  });

  useDragAutoScroll({
    containerRef: kanbanScrollRef,
    isDragging: dnd.isDragging,
    edgeThreshold: 180,
    maxSpeed: 28,
    minSpeed: 4,
    onScroll: handleKanbanScroll,
  });

  const handleAdvanceDeal = async (dealId: string, nextStage: PipelineStageId) => {
    if (!canAdvanceStage) return;
    const deal = deals.find((d) => d.id === dealId);
    if (!deal) return;

    if (nextStage === 'estimate_scheduled') {
      setPipelineScheduleDateTime('');
      setPendingScheduleDeal(deal);
      return;
    }

    try {
      await updatePipelineDealStage(dealId, nextStage, 'Quick advance', {
        authorName: user?.name,
        authorRole: user?.role,
      });
      toast.success(`Advanced to ${nextStage}`);
      await refresh(true);
    } catch {
      toast.error('Stage advance not permitted.');
    }
  };

  const handleConfirmPipelineSchedule = async (skipDate = false) => {
    if (!pendingScheduleDeal || isSchedulingPipeline) return;
    const deal = pendingScheduleDeal;
    const nextStage: PipelineStageId = 'estimate_scheduled';
    setIsSchedulingPipeline(true);
    try {
      await updatePipelineDealStage(deal.id, nextStage, 'Advanced to Estimate Scheduled', {
        authorName: user?.name,
        authorRole: user?.role,
      });
      if (!skipDate && pipelineScheduleDateTime) {
        await api.updateLead(deal.id, {
          site_visit_scheduled_at: new Date(pipelineScheduleDateTime).toISOString(),
        } as unknown as Parameters<typeof api.updateLead>[1]);
      }
      toast.success(`Advanced to Estimate Scheduled${!skipDate && pipelineScheduleDateTime ? ' — appointment set' : ''}`);
    } catch {
      toast.error('Stage advance not permitted.');
    } finally {
      setIsSchedulingPipeline(false);
      setPendingScheduleDeal(null);
      setPipelineScheduleDateTime('');
      refresh(true);
    }
  };

  const totalPipelineVal = summary?.totalPipelineValue ?? deals.filter((d) => d.stageId !== 'closed_lost').reduce((sum, d) => sum + d.value, 0);

  const weightedForecastVal = Math.round(
    deals.reduce((sum, d) => {
      if (d.stageId === 'contract_signed') return sum + d.value;
      if (d.stageId === 'closed_lost') return sum;
      const prob = analytics?.probabilities?.[d.stageId] ?? 0.2;
      return sum + d.value * prob;
    }, 0)
  );

  return (
    <div className="space-y-3 max-w-[1600px] mx-auto select-none pb-14 animate-in fade-in duration-200">
      <PipelineToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchInputRef={searchInputRef}
        isRefreshing={isRefreshing}
        onRefresh={() => refresh(true)}
        onExportCSV={() => exportPipelineCSV(filteredDeals, canViewFinances)}
        canCreateLead={canCreateLead}
        onCreateLead={() => setShowCreateLeadModal(true)}
        isOwnOnly={isOwnOnly}
        summary={summary}
        dealsCount={deals.length}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        filteredDealsCount={filteredDeals.length}
        selectedEstimator={selectedEstimator}
        onEstimatorChange={setSelectedEstimator}
        availableEstimators={availableEstimators}
        selectedService={selectedService}
        onServiceChange={setSelectedService}
        selectedSlaFilter={selectedSlaFilter}
        onSlaFilterChange={setSelectedSlaFilter}
      />

      <PipelineKpiGrid
        canViewFinances={canViewFinances}
        totalPipelineVal={totalPipelineVal}
        weightedForecastVal={weightedForecastVal}
        summary={summary}
        deals={deals}
        closedWonDeals={deals.filter((d) => d.stageId === 'contract_signed')}
        stats={stats}
      />

      <PipelineSopBar
        deals={deals}
        dragOverStageId={dnd.dragOverColId}
        onScrollToStage={scrollToStage}
        onDragOver={(e, stageId) => dnd.handleDragOver(e, stageId)}
        onDragLeave={(stageId) => dnd.handleDragLeave(stageId)}
        onDropOnStage={(e, stageId) => dnd.handleDropOnColumn(e, stageId)}
      />

      <PipelineBoardView
        viewMode={viewMode}
        isLoading={isLoading}
        deals={deals}
        filteredDeals={filteredDeals}
        isDark={isDark}
        canViewFinances={canViewFinances}
        canAdvanceStage={canAdvanceStage}
        canClaimLead={canClaimLead}
        canReassignLead={canReassignLead}
        highlightedStage={highlightedStage}
        onSelectDeal={(deal) => setActiveDealModal(deal)}
        onAdvanceDeal={handleAdvanceDeal}
        onDropDealOnStage={(dealId, targetStageId) => dnd.executeDropIntent(dealId, targetStageId)}
        onClaimDeal={(deal) => setClaimModalDeal(deal)}
        onReassignDeal={(deal) => setReassignModalDeal(deal)}
        onFollowUpDeal={(deal) => setFollowUpModalDeal(deal)}
        onMarkOutcome={async (id, outcome) => {
          await setDealOutcome(id, outcome, { notes: `Marked as ${outcome}` });
          await refresh(true);
        }}
        kanbanScrollRef={kanbanScrollRef}
        onKanbanScroll={handleKanbanScroll}
        canScrollLeft={canScrollLeft}
        canScrollRight={canScrollRight}
        visibleRange={visibleRange}
        scrollProgress={scrollProgress}
        onScrollBoard={scrollBoard}
        onScrollToStage={scrollToStage}
      />

      <PipelineModals
        activeDealModal={activeDealModal}
        setActiveDealModal={setActiveDealModal}
        handleAdvanceDeal={handleAdvanceDeal}
        handleUpdateDeal={(updated) => setDeals((prev) => prev.map((d) => (d.id === updated.id ? updated : d)))}
        showCreateLeadModal={showCreateLeadModal}
        setShowCreateLeadModal={setShowCreateLeadModal}
        handleCreateLead={async (_lead: CreateLeadPayload) => { setShowCreateLeadModal(false); refresh(true); }}
        dropIntent={dnd.dropIntent}
        isMoving={dnd.isMoving}
        handleConfirmMove={dnd.handleConfirmMove}
        handleCancelMove={dnd.handleCancelMove}
        backwardMoveWarning={dnd.backwardMoveWarning}
        setBackwardMoveWarning={dnd.setBackwardMoveWarning}
        followUpModalDeal={followUpModalDeal}
        setFollowUpModalDeal={setFollowUpModalDeal}
        isSavingFollowUp={isSavingFollowUp}
        handleLogFollowUpSubmit={async (payload) => {
          if (!followUpModalDeal) return;
          setIsSavingFollowUp(true);
          try {
            await logDealFollowUp(followUpModalDeal.id, payload);
            setFollowUpModalDeal(null);
            await refresh(true);
          } catch {
            toast.error('Failed to log follow-up.');
          } finally {
            setIsSavingFollowUp(false);
          }
        }}
        gatedEstimateDeal={dnd.gatedEstimateCard}
        setGatedEstimateDeal={dnd.setGatedEstimateCard}
        claimModalDeal={claimModalDeal}
        setClaimModalDeal={setClaimModalDeal}
        handleConfirmClaimDeal={async () => {
          if (!claimModalDeal) return;
          await claimLead(claimModalDeal.id);
          await refresh(true);
        }}
        reassignModalDeal={reassignModalDeal}
        setReassignModalDeal={setReassignModalDeal}
        handleReassignSuccess={() => refresh(true)}
      />

      <ScheduleAppointmentModal
        isOpen={Boolean(pendingScheduleDeal)}
        dealName={pendingScheduleDeal?.name || ''}
        dateTime={pipelineScheduleDateTime}
        onDateTimeChange={setPipelineScheduleDateTime}
        isScheduling={isSchedulingPipeline}
        onConfirm={handleConfirmPipelineSchedule}
        onCancel={() => { setPendingScheduleDeal(null); setPipelineScheduleDateTime(''); }}
      />
    </div>
  );
}

export default PipelinePage;
