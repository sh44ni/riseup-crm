import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  Briefcase,
  Users,
  Phone,
  Calendar,
  FileText,
  Clock,
  Bell,
  ShieldCheck,
  Trophy,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useCompany } from '@/context/CompanyContext';
import { useTheme } from '@/context/ThemeContext';
import { useDashboardStats } from '@/lib/dashboardStatsStore';
import { usePipelineKanban } from '@/lib/pipelineStore';
import { updatePipelineDealStage, claimLead, logDealFollowUp } from '@/api/pipelineApi';
import { getContracts, ContractRow } from '@/api/contractApi';
import { api } from '@/lib/api';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { CrmPageHero } from '@/components/common/CrmPageHero';
import { DashboardToolbar } from '@/components/dashboard/DashboardToolbar';
import { DashboardKpiGrid } from '@/components/dashboard/DashboardKpiGrid';
import { DashboardPendingContracts } from '@/components/dashboard/DashboardPendingContracts';
import { DashboardKanbanSection } from '@/components/dashboard/DashboardKanbanSection';
import { DashboardModalsSection } from '@/components/dashboard/DashboardModalsSection';
import { computeActiveStats, computeRepOptions } from '@/components/dashboard/dashboardSelectors';
import { useHotkey } from '@/shared/lib/useHotkey';
import { DealCard, ColumnData } from '@/components/dashboard/dashboardTypes';
import { PipelineDealItem, PipelineStageId, enrichDeals, EnrichedDeal } from '@/components/pipeline/pipelineTypes';
import { GatedLeadCard } from '@/components/pipeline/EstimateSentGatedModal';
import { BackwardMoveWarning } from '@/components/pipeline/BackwardMoveModal';
import { CreateLeadPayload } from '@/components/pipeline/CreateLeadModal';

const STAGE_MAP: Record<string, { granularStage: PipelineStageId; pipelineStage: string }> = {
  new_leads: { granularStage: 'cold_lead', pipelineStage: 'stage_1_lead_gen' },
  cold_lead: { granularStage: 'cold_lead', pipelineStage: 'stage_1_lead_gen' },
  contacted: { granularStage: 'initial_call', pipelineStage: 'stage_2_initial_contact' },
  initial_call: { granularStage: 'initial_call', pipelineStage: 'stage_2_initial_contact' },
  est_scheduled: { granularStage: 'estimate_scheduled', pipelineStage: 'stage_3_site_visit_estimate' },
  estimate_scheduled: { granularStage: 'estimate_scheduled', pipelineStage: 'stage_3_site_visit_estimate' },
  est_sent: { granularStage: 'estimate_sent', pipelineStage: 'stage_3_site_visit_estimate' },
  estimate_sent: { granularStage: 'estimate_sent', pipelineStage: 'stage_3_site_visit_estimate' },
  follow_up: { granularStage: 'follow_up', pipelineStage: 'stage_4_closing' },
  contract_sent: { granularStage: 'contract_sent', pipelineStage: 'stage_4_closing' },
  contract_signed: { granularStage: 'contract_signed', pipelineStage: 'stage_4_closing' },
  active_jobs: { granularStage: 'active_jobs', pipelineStage: 'stage_5_completion_followup' },
  closed_lost: { granularStage: 'closed_lost', pipelineStage: 'stage_1_lead_gen' },
};

export function DashboardPage() {
  const { user, can, isOwner } = useAuth();
  const { companyName, licenseNumber, city } = useCompany();
  const canViewFinances = can('finances.view');
  const canAdvanceStage = can('pipeline.advance_stage');
  const canCreateLead = can('leads.create');
  const canClaimLead = isOwner || can('leads.claim');
  const canReassignLead = isOwner || can('leads.reassign');
  const canCounterSign = can('contracts.counter_sign');

  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const { stats, isLoading: statsLoading, refresh: refreshStats } = useDashboardStats();
  const {
    columns,
    summary,
    isLoading: pipelineLoading,
    refresh: refreshPipeline,
    moveCardOptimistically,
  } = usePipelineKanban();

  const [omniSearch, setOmniSearch] = useState('');
  const [pipelineSearch, setPipelineSearch] = useState('');
  const [viewMode, setViewMode] = useState<'kanban' | 'list' | 'calendar'>('kanban');
  const [selectedSource, setSelectedSource] = useState('All Sources');
  const [selectedRep, setSelectedRep] = useState('All Reps');
  const [selectedService, setSelectedService] = useState('All Services');

  const [selectedDeal, setSelectedDeal] = useState<PipelineDealItem | EnrichedDeal | null>(null);
  const [isCreateLeadOpen, setIsCreateLeadOpen] = useState(false);
  const [createLeadStage, setCreateLeadStage] = useState('new_leads');

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [teamUsers, setTeamUsers] = useState<Array<{ id: string; name: string; role?: string }>>([]);
  const [pendingCounterSignContracts, setPendingCounterSignContracts] = useState<ContractRow[]>([]);
  const [selectedCounterSignContract, setSelectedCounterSignContract] = useState<ContractRow | null>(null);

  const [claimModalCard, setClaimModalCard] = useState<DealCard | null>(null);
  const [reassignModalCard, setReassignModalCard] = useState<DealCard | null>(null);

  // DnD state
  const dragCardRef = useRef<{ cardId: string; fromColId: string } | null>(null);
  const kanbanContainerRef = useRef<HTMLDivElement>(null);
  const [dropIntent, setDropIntent] = useState<{ card: DealCard; fromCol: ColumnData; toCol: ColumnData } | null>(null);
  const [dragOverColId, setDragOverColId] = useState<string | null>(null);
  const [isMoving, setIsMoving] = useState(false);
  const [backwardMoveWarning, setBackwardMoveWarning] = useState<BackwardMoveWarning | null>(null);
  const [followUpModalCard, setFollowUpModalCard] = useState<DealCard | null>(null);
  const [isLoggingFollowUp, setIsLoggingFollowUp] = useState(false);
  const [gatedEstimateCard, setGatedEstimateCard] = useState<GatedLeadCard | null>(null);

  const [pendingScheduleMove, setPendingScheduleMove] = useState<{ card: DealCard; fromCol: ColumnData; toCol: ColumnData } | null>(null);
  const [scheduleDateTime, setScheduleDateTime] = useState('');
  const [isSchedulingMove, setIsSchedulingMove] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  useHotkey('k', () => searchInputRef.current?.focus(), { metaOrCtrl: true });

  const showToast = useCallback((msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => setToastMessage(null), 3500);
  }, []);

  const fetchPendingContracts = useCallback(async () => {
    if (!canCounterSign) return;
    try {
      const res = await getContracts({ status: 'client_signed' });
      setPendingCounterSignContracts(res.contracts || []);
    } catch {
      // Handled silently
    }
  }, [canCounterSign]);

  useEffect(() => {
    fetchPendingContracts();
  }, [fetchPendingContracts]);

  useEffect(() => {
    api.getUsers().then((res) => {
      if (res?.users && Array.isArray(res.users)) {
        setTeamUsers(res.users);
      }
    }).catch(() => {});
  }, []);

  const repOptions = useMemo(() => computeRepOptions(teamUsers, columns), [teamUsers, columns]);
  const activeStats = useMemo(() => computeActiveStats(columns, summary, stats), [columns, summary, stats]);
  const isStatsLoadingInitial = Boolean((statsLoading && !stats) || (pipelineLoading && columns.length === 0));

  const DASHBOARD_STAGE_ORDER: Record<string, number> = {
    new_leads: 1, contacted: 2, est_scheduled: 3, est_sent: 4, follow_up: 5, contract_sent: 6, active_jobs: 7, job_completed: 7,
  };

  const handleDrop = (e: React.DragEvent, toCol: ColumnData) => {
    e.preventDefault();
    setDragOverColId(null);
    if (!canAdvanceStage) return;
    const drag = dragCardRef.current;
    dragCardRef.current = null;
    if (!drag || drag.fromColId === toCol.id) return;
    const fromCol = columns.find((c: ColumnData) => c.id === drag.fromColId);
    const card = fromCol?.cards.find((c: DealCard) => c.id === drag.cardId);
    if (!fromCol || !card) return;

    const fromOrder = DASHBOARD_STAGE_ORDER[fromCol.id] || 1;
    const toOrder = DASHBOARD_STAGE_ORDER[toCol.id] || 1;
    if (toCol.id !== 'closed_lost' && toOrder < fromOrder) {
      setBackwardMoveWarning({ dealName: card.name, fromTitle: fromCol.title, toTitle: toCol.title, fromStep: fromOrder, toStep: toOrder });
      return;
    }
    const isUnclaimed = !card.assignedToUserId || !card.assignedToName || card.assignedToName.toLowerCase() === 'unassigned';
    if (isUnclaimed && toCol.id !== 'new_leads') {
      showToast('Please claim the lead first before advancing its stage.');
      return;
    }
    if (toCol.id === 'est_sent' || toCol.id === 'estimate_sent') {
      setGatedEstimateCard({ id: card.id, name: card.name, location: card.location, address: card.address || card.location, city: card.city, service: card.service, serviceColor: card.serviceColor, phone: card.phone, email: card.email, value: card.value, currentStageName: fromCol.title });
      return;
    }
    if (toCol.id === 'est_scheduled') {
      setScheduleDateTime('');
      setPendingScheduleMove({ card, fromCol, toCol });
      return;
    }
    setDropIntent({ card, fromCol, toCol });
  };

  const handleConfirmMove = async (notes: string) => {
    if (!dropIntent) return;
    const { card, fromCol, toCol } = dropIntent;
    moveCardOptimistically(card.id, fromCol.id, toCol.id);
    setDropIntent(null);
    setIsMoving(true);
    const mapping = STAGE_MAP[toCol.id] || { granularStage: 'cold_lead', pipelineStage: 'stage_1_lead_gen' };
    try {
      await updatePipelineDealStage(card.id, mapping.granularStage, notes.trim() || undefined);
      showToast(`Moved ${card.name} to ${toCol.title}`);
    } catch {
      moveCardOptimistically(card.id, toCol.id, fromCol.id);
      showToast('Move not permitted. Card returned to original column.');
    } finally {
      setIsMoving(false);
      refreshPipeline(true);
      refreshStats(true);
    }
  };

  const handleConfirmScheduleMove = async (skipDate = false) => {
    if (!pendingScheduleMove || isSchedulingMove) return;
    const { card, fromCol, toCol } = pendingScheduleMove;
    const mapping = STAGE_MAP[toCol.id] || { granularStage: 'cold_lead', pipelineStage: 'stage_1_lead_gen' };
    setIsSchedulingMove(true);
    moveCardOptimistically(card.id, fromCol.id, toCol.id);
    try {
      await updatePipelineDealStage(card.id, mapping.granularStage);
      if (!skipDate && scheduleDateTime) {
        await api.updateLead(card.id, { site_visit_scheduled_at: new Date(scheduleDateTime).toISOString() } as unknown as Parameters<typeof api.updateLead>[1]);
      }
      showToast(`Moved ${card.name} to ${toCol.title}${!skipDate && scheduleDateTime ? ' — appointment set' : ''}`);
    } catch {
      moveCardOptimistically(card.id, toCol.id, fromCol.id);
      showToast('Move failed. Card returned.');
    } finally {
      setIsSchedulingMove(false);
      setPendingScheduleMove(null);
      setScheduleDateTime('');
      refreshPipeline(true);
      refreshStats(true);
    }
  };

  const filteredColumns = useMemo(() => {
    return columns.map((col: ColumnData) => ({
      ...col,
      cards: col.cards.filter((c: DealCard) => {
        if (selectedService !== 'All Services') {
          const svcWord = selectedService.toLowerCase().replace(' residential', '').replace(' roofing', '').replace(' roof', '');
          if (!c.service.toLowerCase().includes(svcWord)) return false;
        }
        if (selectedSource !== 'All Sources') {
          if (selectedSource === 'Website' && c.leadSource !== 'website') return false;
          if (selectedSource === 'Manual' && c.leadSource !== 'manual') return false;
        }
        if (selectedRep !== 'All Reps') {
          const repName = selectedRep.split(' (')[0].toLowerCase();
          const assigned = (c.assignedToName || '').toLowerCase();
          const creator = (c.createdByName || '').toLowerCase();
          if (!assigned.includes(repName) && !creator.includes(repName)) return false;
        }
        return true;
      }),
    }));
  }, [columns, selectedService, selectedSource, selectedRep]);

  const renderColumnIcon = (type: string) => {
    switch (type) {
      case 'users': return <Users size={11} className="shrink-0 stroke-[2.5]" />;
      case 'phone': return <Phone size={11} className="shrink-0 stroke-[2.5]" />;
      case 'calendar': return <Calendar size={11} className="shrink-0 stroke-[2.5]" />;
      case 'file-text': return <FileText size={11} className="shrink-0 stroke-[2.5]" />;
      case 'clock': return <Clock size={11} className="shrink-0 stroke-[2.5]" />;
      case 'bell': return <Bell size={11} className="shrink-0 stroke-[2.5]" />;
      case 'shield': return <ShieldCheck size={11} className="shrink-0 stroke-[2.5]" />;
      case 'trophy': return <Trophy size={11} className="shrink-0 stroke-[2.5]" />;
      default: return <Briefcase size={11} className="shrink-0 stroke-[2.5]" />;
    }
  };

  return (
    <div className="h-full flex flex-col justify-between min-h-0 w-full select-none gap-2">
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 px-4 py-2.5 rounded-2xl bg-slate-900 dark:bg-slate-800 text-white text-xs font-semibold shadow-2xl border border-white/20 flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      <CrmPageHero
        compact={true}
        pageId="dashboard"
        defaultEyebrow="Discipline Builds Freedom • North County San Diego"
        defaultTitle={`${companyName || 'RISE UP ROOFING'} COMMAND CENTER`}
        defaultSubtitle={`Master Operations & Revenue Hub • Oceanside, CA • CSLB #${licenseNumber || '1119561'}`}
        showSearch={true}
        searchValue={omniSearch}
        onSearchChange={setOmniSearch}
        searchPlaceholder="Quick find client, proposal #, job site or phone (⌘K)..."
        bottomRightBadges={
          <>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50/90 dark:bg-emerald-950/60 border border-emerald-200/90 dark:border-emerald-800/60 text-[10px] font-bold text-emerald-800 dark:text-emerald-300 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live Database Pipeline</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50/90 dark:bg-sky-950/60 border border-sky-200/90 dark:border-sky-800/60 text-[10px] font-bold text-sky-800 dark:text-sky-300 shadow-2xs">
              <span>{city || 'Oceanside'}, CA</span>
            </div>
          </>
        }
      />

      <ErrorBoundary fallbackTitle="Executive Statistics Temporarily Unavailable">
        <DashboardKpiGrid isLoading={isStatsLoadingInitial} activeStats={activeStats} stats={stats} />
      </ErrorBoundary>

      <ErrorBoundary fallbackTitle="Pending Contracts Feed Unavailable">
        <DashboardPendingContracts pendingContracts={pendingCounterSignContracts} onSelectContract={setSelectedCounterSignContract} />
      </ErrorBoundary>

      <div className="rounded-2xl light-glass-panel glossy-sheen border border-white/85 dark:border-white/10 shadow-md p-2.5 lg:p-3 relative flex-1 min-h-0 flex flex-col">
        <DashboardToolbar
          statsLoading={statsLoading}
          totalDeals={stats?.totalLeads ?? 0}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          selectedSource={selectedSource}
          onSelectSource={setSelectedSource}
          selectedRep={selectedRep}
          onSelectRep={setSelectedRep}
          selectedService={selectedService}
          onSelectService={setSelectedService}
          pipelineSearch={pipelineSearch}
          onSearchChange={setPipelineSearch}
          canCreateLead={canCreateLead}
          onCreateLead={() => { setCreateLeadStage('new_leads'); setIsCreateLeadOpen(true); }}
          repOptions={repOptions}
        />

        <DashboardKanbanSection
          viewMode={viewMode}
          onSelectDeal={(deal) => setSelectedDeal(deal)}
          pipelineLoading={pipelineLoading}
          filteredColumns={filteredColumns}
          pipelineSearch={pipelineSearch}
          isDark={isDark}
          dragOverColId={dragOverColId}
          canAdvanceStage={canAdvanceStage}
          canViewFinances={canViewFinances}
          canClaimLead={canClaimLead}
          canReassignLead={canReassignLead}
          onDragStart={(id, colId) => { if (canAdvanceStage) { dragCardRef.current = { cardId: id, fromColId: colId }; } }}
          onDragEnd={() => { dragCardRef.current = null; setDragOverColId(null); }}
          onDragOver={(e, colId) => { e.preventDefault(); setDragOverColId(colId); }}
          onDragLeave={() => setDragOverColId(null)}
          onDrop={handleDrop}
          onSelectCard={(card) => {
            const allEnriched = enrichDeals(columns);
            const found = allEnriched.find((d: EnrichedDeal) => String(d.id) === String(card.id));
            if (found) setSelectedDeal(found);
          }}
          onClaimLead={(card) => setClaimModalCard(card)}
          onReassignLead={(card) => setReassignModalCard(card)}
          onFollowUp={(card) => setFollowUpModalCard(card)}
          renderColumnIcon={renderColumnIcon}
          getServiceBadgeClass={() => 'bg-blue-100/90 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-300/80 font-bold shadow-2xs'}
          kanbanContainerRef={kanbanContainerRef}
        />
      </div>

      <DashboardModalsSection
        selectedDeal={selectedDeal}
        onCloseDealModal={() => setSelectedDeal(null)}
        canAdvanceStage={canAdvanceStage}
        onAdvanceDeal={async (dealId, nextStage) => {
          try {
            await updatePipelineDealStage(dealId, nextStage, 'Quick advance');
            refreshPipeline(true);
            refreshStats(true);
          } catch {
            showToast('Stage advance not permitted.');
          }
        }}
        onUpdateDeal={() => refreshPipeline(true)}
        isCreateLeadOpen={isCreateLeadOpen}
        createLeadStage={createLeadStage}
        onCloseCreateLead={() => setIsCreateLeadOpen(false)}
        onCreateLead={async (_lead: CreateLeadPayload) => {
          setIsCreateLeadOpen(false);
          refreshStats();
          refreshPipeline();
        }}
        dropIntent={dropIntent}
        isMoving={isMoving}
        onConfirmMove={handleConfirmMove}
        onCancelMove={() => setDropIntent(null)}
        followUpModalCard={followUpModalCard}
        isLoggingFollowUp={isLoggingFollowUp}
        onCloseFollowUp={() => setFollowUpModalCard(null)}
        onSubmitFollowUp={async (payload) => {
          if (!followUpModalCard) return;
          setIsLoggingFollowUp(true);
          try {
            await logDealFollowUp(followUpModalCard.id, payload);
            setFollowUpModalCard(null);
            refreshPipeline();
            refreshStats();
          } catch {
            showToast('Failed to log follow-up.');
          } finally {
            setIsLoggingFollowUp(false);
          }
        }}
        gatedEstimateCard={gatedEstimateCard}
        onCloseGatedEstimate={() => setGatedEstimateCard(null)}
        selectedCounterSignContract={selectedCounterSignContract}
        onCloseCounterSign={() => setSelectedCounterSignContract(null)}
        onSuccessCounterSign={() => {
          setSelectedCounterSignContract(null);
          fetchPendingContracts();
          refreshStats();
          refreshPipeline();
        }}
        claimModalCard={claimModalCard}
        onCloseClaim={() => setClaimModalCard(null)}
        onConfirmClaim={async () => {
          if (!claimModalCard) return;
          await claimLead(claimModalCard.id);
          refreshPipeline(true);
          refreshStats(true);
          showToast(`Claimed lead "${claimModalCard.name}"`);
        }}
        reassignModalCard={reassignModalCard}
        onCloseReassign={() => setReassignModalCard(null)}
        onSuccessReassign={() => {
          refreshPipeline(true);
          refreshStats(true);
          showToast('Lead reassigned successfully');
        }}
        backwardMoveWarning={backwardMoveWarning}
        onCloseBackwardMoveWarning={() => setBackwardMoveWarning(null)}
        pendingScheduleMove={pendingScheduleMove}
        scheduleDateTime={scheduleDateTime}
        onScheduleDateTimeChange={setScheduleDateTime}
        isSchedulingMove={isSchedulingMove}
        onConfirmScheduleMove={handleConfirmScheduleMove}
        onCancelScheduleMove={() => { setPendingScheduleMove(null); setScheduleDateTime(''); }}
      />
    </div>
  );
}

export default DashboardPage;
