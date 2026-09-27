import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ChevronRight,
  ChevronLeft,
  Phone,
  MapPin,
  AlertTriangle,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { PipelineKpiGrid } from '@/components/pipeline/PipelineKpiGrid';
import { KanbanBoard } from '@/components/pipeline/KanbanBoard';
import {
  PipelineStageId,
  PIPELINE_STAGES,
  PipelineDealItem,
} from '@/components/pipeline/pipelineTypes';
import { PipelineProcessTimeline } from '@/components/pipeline/PipelineProcessTimeline';
import { CreateLeadPayload } from '@/components/pipeline/CreateLeadModal';
import {
  updatePipelineDealStage,
  setDealOutcome,
  logDealFollowUp,
  claimLead,
} from '@/api/pipelineApi';
import { useDragAutoScroll } from '@/hooks/useDragAutoScroll';
import { useDashboardStats } from '@/lib/dashboardStatsStore';
import { usePipelineData } from '@/hooks/usePipelineData';
import { PipelineToolbar } from '@/components/pipeline/PipelineToolbar';
import { PipelineModals, DropIntent } from '@/components/pipeline/PipelineModals';
import { GatedLeadCard } from '@/components/pipeline/EstimateSentGatedModal';

export function PipelinePage() {
  const { user, can, isOwner, getScope } = useAuth();
  const canViewFinances = can('finances.view');
  const canAdvanceStage = can('pipeline.advance_stage');
  const canCreateLead = can('leads.create');
  const canClaimLead = isOwner || can('leads.claim');
  const canReassignLead = isOwner || can('leads.reassign');
  const leadsScope = getScope('leads.view');
  const isOwnOnly = leadsScope === 'own';

  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { stats } = useDashboardStats();
  const { toast } = useToast();

  const { deals, summary, isLoading, isRefreshing, loadError, analytics, setDeals, refresh } = usePipelineData();

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
  const [gatedEstimateDeal, setGatedEstimateDeal] = useState<GatedLeadCard | null>(null);
  const [isSavingFollowUp, setIsSavingFollowUp] = useState<boolean>(false);
  const [claimModalDeal, setClaimModalDeal] = useState<PipelineDealItem | null>(null);
  const [reassignModalDeal, setReassignModalDeal] = useState<PipelineDealItem | null>(null);

  const kanbanScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [visibleStepsText, setVisibleStepsText] = useState('Steps 1–5 of 8');
  const [visibleRange, setVisibleRange] = useState<[number, number]>([1, 5]);
  const [scrollProgress, setScrollProgress] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const thumbDragRef = useRef<{ startX: number; startScrollLeft: number } | null>(null);
  const scrollbarTrackRef = useRef<HTMLDivElement>(null);
  const dragListenersRef = useRef<{ onMouseMove: (e: MouseEvent) => void; onMouseUp: () => void } | null>(null);

  useEffect(() => {
    return () => {
      if (dragListenersRef.current) {
        window.removeEventListener('mousemove', dragListenersRef.current.onMouseMove);
        window.removeEventListener('mouseup', dragListenersRef.current.onMouseUp);
        dragListenersRef.current = null;
      }
    };
  }, []);

  const dragCardRef = useRef<{ dealId: string; fromStageId: string } | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null);
  const [dropIntent, setDropIntent] = useState<DropIntent | null>(null);
  const [isMoving, setIsMoving] = useState<boolean>(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
    setVisibleStepsText(`Steps ${firstVisible}–${lastVisible} of 8`);
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

  useDragAutoScroll({
    containerRef: kanbanScrollRef,
    isDragging,
    edgeThreshold: 180,
    maxSpeed: 28,
    minSpeed: 4,
    onScroll: handleKanbanScroll,
  });

  const scrollToStage = (stageId: PipelineStageId) => {
    const targetStage = PIPELINE_STAGES.find((s) => s.id === stageId);
    if (!targetStage) return;

    const el = document.getElementById(`stage-col-${stageId}`);
    if (el && kanbanScrollRef.current) {
      el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      setHighlightedStage(stageId);
      setTimeout(() => setHighlightedStage(null), 2200);
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

  const handleDragOver = (e: React.DragEvent, stageId: string) => {
    if (!canAdvanceStage) return;
    e.preventDefault();
    setDragOverStageId(stageId);
  };

  const handleDragLeave = (stageId: string) => {
    setDragOverStageId((prev) => (prev === stageId ? null : prev));
  };

  const executeDropIntent = (dealId: string, targetStageId: PipelineStageId) => {
    if (!canAdvanceStage) return;
    const deal = deals.find((d) => d.id === dealId);
    if (!deal || deal.stageId === targetStageId) return;

    const isUnclaimed = !deal.assignedToUserId || !deal.estimator?.name || deal.estimator.name.toLowerCase() === 'unassigned';
    if (isUnclaimed && targetStageId !== 'cold_lead') {
      toast.warning('Please claim the lead first before advancing its stage.');
      return;
    }

    const fromDef = PIPELINE_STAGES.find((s) => s.id === deal.stageId) || {
      id: deal.stageId as PipelineStageId,
      shortTitle: deal.stageId.replace(/_/g, ' ').toUpperCase(),
      title: deal.stageId,
      accentColor: '#0284c7',
      pillBg: 'bg-sky-500/15 border-sky-500/30',
      pillText: 'text-sky-700',
    };

    const toDef = PIPELINE_STAGES.find((s) => s.id === targetStageId) || {
      id: targetStageId,
      shortTitle: targetStageId.replace(/_/g, ' ').toUpperCase(),
      title: targetStageId,
      accentColor: '#10b981',
      pillBg: 'bg-emerald-500/15 border-emerald-500/30',
      pillText: 'text-emerald-700',
    };

    if (targetStageId === 'estimate_sent' || targetStageId === 'contract_sent') {
      setGatedEstimateDeal({
        id: deal.id,
        name: deal.name,
        location: `${deal.address}, ${deal.city}`,
        address: deal.address,
        city: deal.city,
        service: deal.service,
        serviceColor: deal.serviceColor,
        phone: deal.phone,
        email: deal.email,
        value: deal.value,
        currentStageName: fromDef.shortTitle,
      });
      return;
    }

    setDropIntent({
      card: {
        id: deal.id,
        name: deal.name,
        location: `${deal.address}, ${deal.city}`,
        service: deal.service,
        serviceColor: deal.serviceColor,
        phone: deal.phone,
        email: deal.email,
      },
      fromCol: {
        id: fromDef.id,
        title: fromDef.shortTitle,
        accentColor: fromDef.accentColor,
        pillClass: `${fromDef.pillBg} ${fromDef.pillText} font-black border`,
      },
      toCol: {
        id: toDef.id,
        title: toDef.shortTitle,
        accentColor: toDef.accentColor,
        pillClass: `${toDef.pillBg} ${toDef.pillText} font-black border`,
      },
      targetStageId,
    });
  };

  const handleDropOnStage = (e: React.DragEvent, targetStageId: PipelineStageId) => {
    e.preventDefault();
    setIsDragging(false);
    setDragOverStageId(null);
    const drag = dragCardRef.current;
    dragCardRef.current = null;
    if (!drag) return;
    executeDropIntent(drag.dealId, targetStageId);
  };

  const handleConfirmMove = async (notes: string) => {
    if (!dropIntent) return;
    const { card, targetStageId } = dropIntent;

    const deal = deals.find((d) => d.id === card.id);
    const isUnclaimed = deal && (!deal.assignedToUserId || !deal.estimator?.name || deal.estimator.name.toLowerCase() === 'unassigned');
    if (isUnclaimed && targetStageId !== 'cold_lead') {
      toast.warning('Please claim the lead first before advancing its stage.');
      setDropIntent(null);
      return;
    }

    setIsMoving(true);

    setDeals((prev) =>
      prev.map((d) =>
        d.id === card.id
          ? {
              ...d,
              stageId: targetStageId,
              daysInStage: 0,
              slaStatus: 'on_track',
              slaText: 'Active in stage',
            }
          : d
      )
    );

    try {
      await updatePipelineDealStage(card.id, targetStageId, notes, {
        authorName: user?.name,
        authorRole: user?.role,
      });
    } catch (err) {
      console.error('Failed to move stage on server:', err);
    } finally {
      setIsMoving(false);
      setDropIntent(null);
      refresh(true);
    }
  };

  const handleCancelMove = () => {
    setDropIntent(null);
  };

  const handleAdvanceDeal = async (dealId: string, nextStage: PipelineStageId) => {
    if (!canAdvanceStage) return;
    const deal = deals.find((d) => d.id === dealId);
    if (!deal) return;

    const isUnclaimed = !deal.assignedToUserId || !deal.estimator?.name || deal.estimator.name.toLowerCase() === 'unassigned';
    if (isUnclaimed && nextStage !== 'cold_lead') {
      toast.warning('Please claim the lead first before advancing its stage.');
      return;
    }

    if (nextStage === 'estimate_sent' || nextStage === 'contract_sent') {
      setGatedEstimateDeal({
        id: deal.id,
        name: deal.name,
        location: `${deal.address}, ${deal.city}`,
        address: deal.address,
        city: deal.city,
        service: deal.service,
        serviceColor: deal.serviceColor,
        phone: deal.phone,
        email: deal.email,
        value: deal.value,
      });
      return;
    }

    const stageIndex = PIPELINE_STAGES.findIndex((s) => s.id === nextStage);
    const nextStageDef = stageIndex >= 0 ? PIPELINE_STAGES[stageIndex] : null;

    setDeals((prev) =>
      prev.map((d) =>
        d.id !== dealId
          ? d
          : {
              ...d,
              stageId: nextStage,
              daysInStage: 0,
              slaStatus: 'on_track',
              slaText: nextStageDef ? `${nextStageDef.shortTitle} in progress` : 'Active',
            }
      )
    );

    try {
      await updatePipelineDealStage(dealId, nextStage, 'Quick advance via arrow button', {
        authorName: user?.name,
        authorRole: user?.role,
      });
    } catch (err) {
      console.error('Failed to advance deal:', err);
    } finally {
      refresh(true);
    }
  };

  const handleUpdateDeal = (updated: PipelineDealItem) => {
    setDeals((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
  };

  const handleMarkOutcome = async (
    dealId: string,
    outcome: 'closed_lost' | 'closed_won' | 'future_followup'
  ) => {
    setDeals((prev) =>
      prev.map((d) => {
        if (d.id !== dealId) return d;
        if (outcome === 'closed_lost') {
          return { ...d, stageId: 'closed_lost', slaStatus: 'on_track', slaText: 'Archived • Lost' };
        }
        if (outcome === 'closed_won') {
          return { ...d, stageId: 'contract_signed', slaStatus: 'on_track', slaText: 'Closed Won' };
        }
        return d;
      })
    );

    try {
      await setDealOutcome(dealId, outcome, {
        notes: `Marked as ${outcome} from deal actions`,
      });
    } catch (err) {
      console.error('Failed to update deal outcome:', err);
    } finally {
      refresh(true);
    }
  };

  const handleCreateLead = async (_lead: CreateLeadPayload) => {
    setShowCreateLeadModal(false);
    refresh(true);
  };

  const handleLogFollowUpSubmit = async (payload: {
    method: 'call' | 'sms' | 'email' | 'in_person';
    notes: string;
    outcome?: string;
  }) => {
    if (!followUpModalDeal) return;
    setIsSavingFollowUp(true);
    try {
      await logDealFollowUp(followUpModalDeal.id, payload);
      setFollowUpModalDeal(null);
      await refresh(true);
    } catch (err) {
      console.error('Failed to log follow up:', err);
      toast.error('Failed to log follow-up. Please try again.');
    } finally {
      setIsSavingFollowUp(false);
    }
  };

  const handleConfirmClaimDeal = async () => {
    if (!claimModalDeal) return;
    try {
      await claimLead(claimModalDeal.id);
      await refresh(true);
    } catch (err: any) {
      console.error('Failed to claim lead:', err);
      throw err;
    }
  };

  const handleReassignSuccess = () => {
    refresh(true);
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'Homeowner', 'Phone', 'Email', 'Address', 'City', 'Service', 'Value', 'Stage', 'Estimator', 'SLA Status'];
    const rows = filteredDeals.map((d) => [
      d.id,
      `"${d.name}"`,
      `"${d.phone}"`,
      `"${d.email}"`,
      `"${d.address}"`,
      `"${d.city}"`,
      `"${d.service}"`,
      canViewFinances ? d.value : '[Protected]',
      d.stageId,
      `"${d.estimator.name}"`,
      d.slaStatus,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `rise_up_pipeline_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getServiceBadgeClass = (color: string) => {
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

  const pillGradients: Record<number, string> = {
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

  const totalPipelineVal = summary?.totalPipelineValue ?? deals.filter((d) => d.stageId !== 'closed_lost').reduce((sum, d) => sum + d.value, 0);

  const weightedForecastVal = Math.round(
    deals.reduce((sum, d) => {
      if (d.stageId === 'contract_signed') return sum + d.value;
      if (d.stageId === 'closed_lost') return sum;
      
      let prob = 0.2;
      if (analytics?.probabilities && analytics.probabilities[d.stageId] !== undefined) {
        prob = analytics.probabilities[d.stageId];
      } else {
        const stageIdx = PIPELINE_STAGES.findIndex((s) => s.id === d.stageId);
        prob = stageIdx >= 0 ? (stageIdx + 1) / 12 : 0.2;
      }
      return sum + d.value * prob;
    }, 0)
  );

  const closedWonDeals = deals.filter((d) => d.stageId === 'contract_signed');

  const handleDropDealOnStage = (dealId: string, targetStageId: PipelineStageId) => {
    executeDropIntent(dealId, targetStageId);
  };

  return (
    <div className="space-y-3 max-w-[1600px] mx-auto select-none pb-14 animate-in fade-in duration-200">
      <PipelineToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchInputRef={searchInputRef}
        isRefreshing={isRefreshing}
        onRefresh={() => refresh(true)}
        onExportCSV={handleExportCSV}
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
        closedWonDeals={closedWonDeals}
        stats={stats}
      />

      <div className="p-2 rounded-2xl light-glass-panel glossy-sheen border border-white/85 dark:border-white/10 shadow-xs overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1.5 min-w-max">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 px-2 flex items-center gap-1">
            <Sparkles size={12} className="text-[#1878B8] dark:text-sky-400" />
            <span>SOP Steps:</span>
          </span>

          {PIPELINE_STAGES.map((stage, idx) => {
            const count = deals.filter((d) => d.stageId === stage.id).length;
            const isHovered = dragOverStageId === stage.id;
            return (
              <React.Fragment key={stage.id}>
                <button
                  type="button"
                  onClick={() => scrollToStage(stage.id)}
                  onDragOver={(e) => handleDragOver(e, stage.id)}
                  onDragLeave={() => handleDragLeave(stage.id)}
                  onDrop={(e) => handleDropOnStage(e, stage.id)}
                  style={
                    isHovered
                      ? {
                          boxShadow: `0 0 0 2px ${stage.accentColor}, 0 4px 12px -2px ${stage.accentColor}40`,
                          transform: 'scale(1.05)',
                        }
                      : undefined
                  }
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                    highlightedStage === stage.id
                      ? 'bg-sky-100 dark:bg-sky-950/60 text-[#0284c7] dark:text-sky-300 border-sky-300 dark:border-sky-700 ring-2 ring-sky-400 shadow-xs'
                      : isHovered
                      ? 'bg-sky-50 dark:bg-sky-950/40 text-[#0284c7] dark:text-sky-300 border-sky-400'
                      : 'bg-white/60 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 border-slate-200/80 dark:border-white/10 hover:bg-white dark:hover:bg-slate-700 shadow-2xs'
                  }`}
                  title={`${stage.title} — ${stage.sopGoal}`}
                >
                  <span
                    style={{ backgroundColor: stage.accentColor }}
                    className="w-2 h-2 rounded-full shrink-0"
                  />
                  <span className="text-[11px] font-extrabold">{stage.stepNumber}. {stage.shortTitle}</span>
                  <span
                    className={`text-[9.5px] px-1.5 py-0.2 rounded-md font-black ${
                      count > 0 ? 'bg-sky-100 dark:bg-sky-900/60 text-[#0284c7] dark:text-sky-300' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300'
                    }`}
                  >
                    {count}
                  </span>
                </button>
                {idx < PIPELINE_STAGES.length - 1 && (
                  <ChevronRight size={12} className="text-slate-300 dark:text-slate-600 shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {loadError && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between text-xs text-rose-800 font-semibold shadow-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle size={15} className="text-rose-500 shrink-0" />
            <span>{loadError}</span>
          </div>
          <button
            type="button"
            onClick={() => refresh()}
            className="px-2.5 py-1 rounded-lg bg-rose-200/80 hover:bg-rose-300 text-rose-900 font-bold transition-all cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {isLoading ? (
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
      ) : (
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
              onSelectDeal={(deal) => setActiveDealModal(deal)}
              onAdvanceDeal={handleAdvanceDeal}
              onDropDealOnStage={handleDropDealOnStage}
              onClaimDeal={(deal) => setClaimModalDeal(deal)}
              onReassignDeal={(deal) => setReassignModalDeal(deal)}
              onFollowUpDeal={(deal) => setFollowUpModalDeal(deal)}
              getServiceBadgeClass={getServiceBadgeClass}
              scrollRef={kanbanScrollRef}
              onScroll={handleKanbanScroll}
            />
          )}

          {viewMode === 'timeline' && (
            <PipelineProcessTimeline
              deals={filteredDeals}
              onSelectDeal={(deal) => setActiveDealModal(deal)}
              onAdvanceDeal={handleAdvanceDeal}
              onMarkOutcome={handleMarkOutcome}
            />
          )}

          {viewMode === 'table' && (
            <div className="rounded-2xl light-glass-panel glossy-sheen border border-white/85 dark:border-white/10 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200/70 dark:border-white/10 bg-white/60 dark:bg-slate-900/70 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      <th className="py-3 px-4">Deal / Homeowner</th>
                      <th className="py-3 px-4">Property Address</th>
                      <th className="py-3 px-4">Service Scope</th>
                      <th className="py-3 px-4">Current Milestone</th>
                      <th className="py-3 px-4 text-right">Value</th>
                      <th className="py-3 px-4">SLA / Timing</th>
                      <th className="py-3 px-4">Estimator</th>
                      <th className="py-3 px-4 text-right">Quick Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-xs">
                    {filteredDeals.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-10 text-center text-slate-400 font-semibold">
                          No deals match current filter criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredDeals.map((deal) => {
                        const stageIndex = PIPELINE_STAGES.findIndex((s) => s.id === deal.stageId);
                        const stageDef = stageIndex >= 0 ? PIPELINE_STAGES[stageIndex] : null;
                        const nextStage = PIPELINE_STAGES[stageIndex + 1]?.id;

                        return (
                          <tr
                            key={deal.id}
                            onClick={() => setActiveDealModal(deal)}
                            className="hover:bg-white/80 dark:hover:bg-slate-800/60 transition-colors cursor-pointer group"
                          >
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-[#1878B8] dark:group-hover:text-sky-400 transition-colors">
                                {deal.name}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                                {deal.phone}
                              </div>
                            </td>

                            <td className="py-3 px-4">
                              <div className="font-medium text-slate-800 dark:text-slate-200">{deal.address}</div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400">{deal.city}, CA</div>
                            </td>

                            <td className="py-3 px-4">
                              <span className={`inline-block text-[10px] px-2 py-0.5 rounded-md ${getServiceBadgeClass(deal.serviceColor)}`}>
                                {deal.service}
                              </span>
                            </td>

                            <td className="py-3 px-4">
                              {stageDef ? (
                                <span className={`inline-block text-[10.5px] font-black px-2.5 py-0.5 rounded-full border shadow-2xs ${stageDef.pillBg} ${stageDef.pillText}`}>
                                  {stageDef.shortTitle}
                                </span>
                              ) : (
                                <span className="text-slate-600 dark:text-slate-300 font-bold">{deal.stageId}</span>
                              )}
                            </td>

                            <td className="py-3 px-4 text-right font-black text-slate-900 dark:text-white">
                              {!canViewFinances ? (
                                <span className="text-slate-400 font-bold">🔒 $•••</span>
                              ) : (
                                `$${deal.value.toLocaleString()}`
                              )}
                            </td>

                            <td className="py-3 px-4">
                              <span
                                className={`text-[9.5px] font-bold px-2 py-0.5 rounded-md ${
                                  deal.slaStatus === 'overdue'
                                    ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60'
                                    : deal.slaStatus === 'due_today'
                                    ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                }`}
                              >
                                {deal.slaText}
                              </span>
                            </td>

                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1.5">
                                <img
                                  src={deal.estimator.avatar}
                                  alt={deal.estimator.name}
                                  className="w-5 h-5 rounded-full object-cover"
                                />
                                <span className="font-semibold text-slate-800 dark:text-slate-200">{deal.estimator.name}</span>
                              </div>
                            </td>

                            <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1.5">
                                <a
                                  href={`tel:${deal.phone}`}
                                  className="p-1 rounded-lg bg-sky-100 dark:bg-sky-950/60 text-[#0284c7] dark:text-sky-300 hover:bg-[#1878B8] hover:text-white transition-colors"
                                  title="Call Homeowner"
                                >
                                  <Phone size={12} />
                                </a>

                                {nextStage && canAdvanceStage && (
                                  <button
                                    type="button"
                                    onClick={() => handleAdvanceDeal(deal.id, nextStage)}
                                    className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg bg-sky-100 dark:bg-sky-950/60 text-[#0284c7] dark:text-sky-300 hover:bg-[#1878B8] hover:text-white transition-all cursor-pointer"
                                    title="Advance to Next Stage"
                                  >
                                    <span>Next</span>
                                    <ArrowRight size={10} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {viewMode === 'calendar' && (
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
                  filteredDeals.slice(0, 10).map((deal, idx) => (
                    <div
                      key={deal.id}
                      onClick={() => setActiveDealModal(deal)}
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

                      <div className="flex items-center gap-4 self-end sm:self-center">
                        <div className="text-right">
                          <div className="text-xs font-black text-[#1F1F1F] dark:text-white">
                            {!canViewFinances ? (
                              <span className="text-slate-400 font-bold text-[10px]">🔒 $•••</span>
                            ) : (
                              `$${deal.value.toLocaleString()}`
                            )}
                          </div>
                          <div className="text-[10px] font-bold text-[#0284c7] dark:text-sky-400">{deal.slaText}</div>
                        </div>
                        <ChevronRight size={14} className="text-slate-400 dark:text-slate-500" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </>
      )}

      {viewMode === 'kanban' && !isLoading && (
        <div className="sticky bottom-0 left-0 right-0 z-30 mt-2 pb-3 pointer-events-none">
          <div className="pointer-events-auto mx-auto max-w-[900px] bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.10)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.7)] px-4 py-2.5 flex items-center gap-3">
            <button
              type="button"
              onClick={() => scrollBoard('left')}
              disabled={!canScrollLeft}
              className={`shrink-0 w-7 h-7 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                canScrollLeft
                  ? 'text-[#1878B8] dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/40 active:scale-90'
                  : 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
              }`}
              title="Scroll Left"
            >
              <ChevronLeft size={15} />
            </button>

            <div className="flex-1 flex flex-col gap-1.5 min-w-0">
              <div className="flex items-center justify-between px-0.5">
                {PIPELINE_STAGES.map((stage) => {
                  const isVisible = stage.stepNumber >= visibleRange[0] && stage.stepNumber <= visibleRange[1];
                  const isHighlighted = highlightedStage === stage.id;
                  return (
                    <button
                      key={stage.id}
                      type="button"
                      onClick={() => scrollToStage(stage.id)}
                      title={`Step ${stage.stepNumber}: ${stage.shortTitle}`}
                      className="flex flex-col items-center gap-0.5 cursor-pointer group"
                    >
                      <span className={`text-[9px] font-bold leading-none transition-colors whitespace-nowrap hidden sm:block ${
                        isHighlighted ? 'text-amber-500 dark:text-amber-400' : isVisible ? 'text-[#1878B8] dark:text-sky-400' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                      }`}>
                        {stage.stepNumber}
                      </span>
                      <span className={`w-1.5 h-1.5 rounded-full transition-all ${
                        isHighlighted
                          ? 'bg-amber-400 scale-150'
                          : isVisible
                          ? 'bg-[#1878B8] dark:bg-sky-400 scale-125'
                          : 'bg-slate-300 dark:bg-slate-700 group-hover:bg-slate-400 dark:group-hover:bg-slate-500'
                      }`} />
                    </button>
                  );
                })}
              </div>

              <div
                ref={scrollbarTrackRef}
                className="relative h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full cursor-pointer"
                onClick={(e) => {
                  if (!scrollbarTrackRef.current || !kanbanScrollRef.current) return;
                  const rect = scrollbarTrackRef.current.getBoundingClientRect();
                  const ratio = (e.clientX - rect.left) / rect.width;
                  const maxScroll = kanbanScrollRef.current.scrollWidth - kanbanScrollRef.current.clientWidth;
                  kanbanScrollRef.current.scrollTo({ left: ratio * maxScroll, behavior: 'smooth' });
                }}
              >
                <div
                  className="absolute top-0 h-full bg-gradient-to-r from-[#1878B8] to-[#55C4F5] rounded-full cursor-grab active:cursor-grabbing transition-[left] duration-75 hover:opacity-90"
                  style={{
                    width: `${Math.max(10, (1 / 8) * 100)}%`,
                    left: `${scrollProgress * (100 - Math.max(10, (1 / 8) * 100))}%`,
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    if (!kanbanScrollRef.current) return;
                    thumbDragRef.current = {
                      startX: e.clientX,
                      startScrollLeft: kanbanScrollRef.current.scrollLeft,
                    };

                    if (dragListenersRef.current) {
                      window.removeEventListener('mousemove', dragListenersRef.current.onMouseMove);
                      window.removeEventListener('mouseup', dragListenersRef.current.onMouseUp);
                    }

                    const onMouseMove = (ev: MouseEvent) => {
                      if (!thumbDragRef.current || !kanbanScrollRef.current || !scrollbarTrackRef.current) return;
                      const trackWidth = scrollbarTrackRef.current.clientWidth;
                      const thumbWidth = trackWidth * Math.max(0.1, 1 / 8);
                      const movableTrack = trackWidth - thumbWidth;
                      const dx = ev.clientX - thumbDragRef.current.startX;
                      const ratio = dx / movableTrack;
                      const maxScroll = kanbanScrollRef.current.scrollWidth - kanbanScrollRef.current.clientWidth;
                      kanbanScrollRef.current.scrollLeft = Math.max(0, Math.min(maxScroll,
                        thumbDragRef.current.startScrollLeft + ratio * maxScroll
                      ));
                    };

                    const onMouseUp = () => {
                      thumbDragRef.current = null;
                      window.removeEventListener('mousemove', onMouseMove);
                      window.removeEventListener('mouseup', onMouseUp);
                      dragListenersRef.current = null;
                    };

                    dragListenersRef.current = { onMouseMove, onMouseUp };
                    window.addEventListener('mousemove', onMouseMove);
                    window.addEventListener('mouseup', onMouseUp);
                  }}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => scrollBoard('right')}
              disabled={!canScrollRight}
              className={`shrink-0 w-7 h-7 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                canScrollRight
                  ? 'text-[#1878B8] dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/40 active:scale-90'
                  : 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
              }`}
              title="Scroll Right"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}

      <PipelineModals
        activeDealModal={activeDealModal}
        setActiveDealModal={setActiveDealModal}
        handleAdvanceDeal={handleAdvanceDeal}
        handleUpdateDeal={handleUpdateDeal}
        showCreateLeadModal={showCreateLeadModal}
        setShowCreateLeadModal={setShowCreateLeadModal}
        handleCreateLead={handleCreateLead}
        dropIntent={dropIntent}
        isMoving={isMoving}
        handleConfirmMove={handleConfirmMove}
        handleCancelMove={handleCancelMove}
        followUpModalDeal={followUpModalDeal}
        setFollowUpModalDeal={setFollowUpModalDeal}
        isSavingFollowUp={isSavingFollowUp}
        handleLogFollowUpSubmit={handleLogFollowUpSubmit}
        gatedEstimateDeal={gatedEstimateDeal}
        setGatedEstimateDeal={setGatedEstimateDeal}
        claimModalDeal={claimModalDeal}
        setClaimModalDeal={setClaimModalDeal}
        handleConfirmClaimDeal={handleConfirmClaimDeal}
        reassignModalDeal={reassignModalDeal}
        setReassignModalDeal={setReassignModalDeal}
        handleReassignSuccess={handleReassignSuccess}
      />
    </div>
  );
}
