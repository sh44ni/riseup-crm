import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Phone,
  Calendar,
  FileText,
  Clock,
  Bell,
  ShieldCheck,
  Trophy,
  Briefcase,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PipelineListView } from '../components/pipeline/PipelineListView';
import { PipelineCalendarView } from '../components/pipeline/PipelineCalendarView';
import { ClaimLeadModal } from '../components/pipeline/ClaimLeadModal';
import { ReassignLeadModal } from '../components/pipeline/ReassignLeadModal';
import { useDashboardStats } from '../lib/dashboardStatsStore';
import { usePipelineKanban } from '../lib/pipelineStore';
import { getContracts, ContractRow } from '@/api/contractApi';
import { CounterSignModal } from '@/components/contracts/CounterSignModal';
import { PipelineDealModal } from '../components/pipeline/PipelineDealModal';
import { MoveLeadModal } from '../components/pipeline/MoveLeadModal';
import { CreateLeadModal, CreateLeadPayload } from '../components/pipeline/CreateLeadModal';
import { BackwardMoveModal, BackwardMoveWarning } from '../components/pipeline/BackwardMoveModal';
import { EnrichedDeal, enrichDeals, PipelineStageId } from '../components/pipeline/pipelineTypes';
import { updatePipelineDealStage, logDealFollowUp, claimLead } from '../api/pipelineApi';
import { leadsApi } from '@/api/leadsApi';
import { LogFollowUpModal } from '../components/pipeline/LogFollowUpModal';
import { api } from '@/lib/api';
import { EstimateSentGatedModal, GatedLeadCard } from '../components/pipeline/EstimateSentGatedModal';
import { CrmPageHero } from '@/components/common/CrmPageHero';
import { useCompany } from '@/context/CompanyContext';
import { useTheme } from '@/context/ThemeContext';
import { DealCard, ColumnData } from '@/components/dashboard/dashboardTypes';
import { DashboardKpiGrid } from '@/components/dashboard/DashboardKpiGrid';
import { DashboardRecentActivity } from '@/components/dashboard/DashboardRecentActivity';
import { DashboardPendingContracts } from '@/components/dashboard/DashboardPendingContracts';
import { DashboardDealCard } from '@/components/dashboard/DashboardDealCard';
import { DashboardToolbar } from '@/components/dashboard/DashboardToolbar';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

// Dashboard column -> backend pipeline_stage mapping
const STAGE_MAP: Record<string, { granularStage: PipelineStageId; pipelineStage: string }> = {
  new_leads:       { granularStage: 'cold_lead', pipelineStage: 'stage_1_lead_gen' },
  contacted:       { granularStage: 'initial_call', pipelineStage: 'stage_2_initial_contact' },
  est_scheduled:   { granularStage: 'estimate_scheduled', pipelineStage: 'stage_3_site_visit_estimate' },
  est_sent:        { granularStage: 'estimate_sent', pipelineStage: 'stage_3_site_visit_estimate' },
  follow_up:       { granularStage: 'follow_up', pipelineStage: 'stage_4_closing' },
  contract_sent:   { granularStage: 'contract_sent', pipelineStage: 'stage_4_closing' },
  contract_signed: { granularStage: 'contract_signed', pipelineStage: 'stage_4_closing' },
  active_jobs:     { granularStage: 'active_jobs', pipelineStage: 'stage_5_completion_followup' },
  job_completed:   { granularStage: 'active_jobs', pipelineStage: 'stage_5_completion_followup' },
};

function KanbanColumnSkeleton({ cardCount = 2 }: { cardCount?: number }) {
  const { isDark } = useTheme();
  return (
    <div
      className="liquid-column-channel rounded-2xl p-1.5 flex flex-col min-w-[130px] h-full"
      style={{
        backgroundColor: isDark ? 'rgba(10, 16, 28, 0.65)' : 'rgba(241,245,249,0.55)',
        boxShadow: isDark
          ? '0 0 0 1px rgba(255,255,255,0.06), inset 0 1px 1px 0 rgba(255,255,255,0.04), 0 4px 16px -2px rgba(0,0,0,0.35)'
          : '0 0 0 1.5px rgba(203,213,225,0.4), inset 0 1.5px 1px 0 rgba(255,255,255,0.75), 0 4px 16px -2px rgba(15,23,42,0.04)',
      }}
    >
      <div className="flex items-center justify-between px-1 py-1 mb-1.5">
        <div className="w-16 h-5 rounded-full bg-slate-200/60 dark:bg-slate-800/80 animate-pulse" />
        <div className="w-5 h-4 rounded bg-slate-200/40 dark:bg-slate-800/60 animate-pulse" />
      </div>
      <div className="flex-1 space-y-1.5">
        {Array.from({ length: cardCount }).map((_, i) => (
          <div key={i} className="rounded-xl bg-white/55 dark:bg-slate-900/60 backdrop-blur-sm p-2 space-y-2 border border-white/60 dark:border-white/10">
            <div className="flex items-center justify-between">
              <div className="w-20 h-3 rounded bg-slate-200/60 dark:bg-slate-800/70 animate-pulse" />
              <div className="w-6 h-3 rounded bg-slate-200/40 dark:bg-slate-800/50 animate-pulse" />
            </div>
            <div className="w-16 h-2.5 rounded bg-slate-200/45 dark:bg-slate-800/60 animate-pulse" />
            <div className="flex items-center gap-1.5">
              <div className="w-10 h-3.5 rounded-full bg-slate-200/50 dark:bg-slate-800/60 animate-pulse" />
              <div className="w-8 h-3.5 rounded-full bg-slate-200/40 dark:bg-slate-800/50 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { can, isOwner } = useAuth();
  const canViewFinances = can('finances.view');
  const canAdvanceStage = can('pipeline.advance_stage');
  const canCreateLead = can('leads.create');
  const canClaimLead = isOwner || can('leads.claim');
  const canReassignLead = isOwner || can('leads.reassign');

  const { isDark } = useTheme();
  const { company, licenseNumber, city, companyName } = useCompany();
  const { columns, summary, isLoading: pipelineLoading, refresh: refreshPipeline, moveCardOptimistically, updateCardAddress } = usePipelineKanban();
  const { stats, isLoading: statsLoading, refresh: refreshStats } = useDashboardStats();

  const [viewMode, setViewMode] = useState<'kanban' | 'list' | 'calendar'>('kanban');
  const [pipelineSearch, setPipelineSearch] = useState('');
  const [omniSearch, setOmniSearch] = useState('');
  const [selectedDeal, setSelectedDeal] = useState<EnrichedDeal | null>(null);
  const [isDealModalOpen, setIsDealModalOpen] = useState(false);
  const [isCreateLeadOpen, setIsCreateLeadOpen] = useState(false);
  const [createLeadStage, setCreateLeadStage] = useState('new_leads');

  const [selectedSource, setSelectedSource] = useState('All Sources');
  const [selectedRep, setSelectedRep] = useState('All Reps');
  const [selectedService, setSelectedService] = useState('All Services');
  const [teamUsers, setTeamUsers] = useState<any[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Claim and Reassign modal states
  const [claimModalCard, setClaimModalCard] = useState<DealCard | null>(null);
  const [reassignModalCard, setReassignModalCard] = useState<DealCard | null>(null);

  // Address editing inline states
  const [editingAddressCardId, setEditingAddressCardId] = useState<string | null>(null);
  const [addressFormStreet, setAddressFormStreet] = useState('');
  const [addressFormCity, setAddressFormCity] = useState('');
  const [addressFormZip, setAddressFormZip] = useState('');
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 3500);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // Contracts awaiting contractor counter-signature
  const [pendingCounterSignContracts, setPendingCounterSignContracts] = useState<ContractRow[]>([]);
  const [selectedCounterSignContract, setSelectedCounterSignContract] = useState<ContractRow | null>(null);

  const fetchPendingContracts = useCallback(async () => {
    try {
      const res = await getContracts({ status: 'client_signed' });
      setPendingCounterSignContracts(res.contracts || []);
    } catch (err) {
      console.error('Failed to load pending counter-sign contracts:', err);
    }
  }, []);

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

  const repOptions = useMemo(() => {
    const reps = new Set<string>();
    teamUsers.forEach((u: any) => {
      if (u.name) {
        reps.add(u.role ? `${u.name} (${u.role})` : u.name);
      }
    });
    columns.forEach((col) => {
      col.cards.forEach((c) => {
        if (c.assignedToName) reps.add(c.assignedToName);
        if (c.createdByName) reps.add(c.createdByName);
      });
    });
    return ['All Reps', ...Array.from(reps)];
  }, [teamUsers, columns]);

  // Reactive KPI Stats harmonized with live Kanban columns
  const activeStats = useMemo(() => {
    if (columns && columns.length > 0) {
      const newLeads = columns.find((c) => c.id === 'new_leads')?.cards.length ?? 0;
      const contacted = columns.find((c) => c.id === 'contacted')?.cards.length ?? 0;
      const estScheduled = columns.find((c) => c.id === 'est_scheduled')?.cards.length ?? 0;
      const estSent = (columns.find((c) => c.id === 'est_sent')?.cards.length ?? 0) +
                      (columns.find((c) => c.id === 'follow_up')?.cards.length ?? 0);
      const contractSent = columns.find((c) => c.id === 'contract_sent')?.cards.length ?? 0;
      const contractSignedCount = 0; // contract_signed is hidden from dashboard
      const activeJobsCount = columns.find((c) => c.id === 'active_jobs')?.cards.length ?? 0;
      const wonFromSummary = summary?.wonCount ?? 0;
      const jobsWon = Math.max(activeJobsCount, wonFromSummary, stats?.jobsWon ?? 0);
      const lostClosed = summary?.lostCount ?? stats?.lostClosed ?? 0;
      const totalLeads = Math.max(
        columns.reduce((sum, col) => sum + col.cards.length, 0) + lostClosed,
        summary?.totalLeads ?? 0,
        stats?.totalLeads ?? 0
      );

      return {
        newLeads,
        newLeadsDelta: stats?.newLeadsDelta ?? null,
        contacted,
        contactedDelta: stats?.contactedDelta ?? null,
        estScheduled,
        estScheduledDelta: stats?.estScheduledDelta ?? null,
        estSent,
        estSentDelta: stats?.estSentDelta ?? null,
        contractSent,
        jobsWon,
        jobsWonDelta: stats?.jobsWonDelta ?? null,
        lostClosed,
        lostClosedDelta: stats?.lostClosedDelta ?? null,
        totalLeads,
        ytdRevenue: stats?.ytdRevenue ?? 0,
        activeCrewCount: stats?.activeCrewCount ?? 0,
        totalPipelineValue: summary?.totalPipelineValue ?? stats?.totalPipelineValue ?? 0,
        sparklines: stats?.sparklines ?? null,
        recentActivities: stats?.recentActivities ?? [],
      };
    }
    return stats;
  }, [columns, summary, stats]);

  const isStatsLoadingInitial = Boolean((statsLoading && !stats) && (pipelineLoading && columns.length === 0));

  const dragCardRef = useRef<{ cardId: string; fromColId: string } | null>(null);
  const [, setIsDragging] = useState(false);
  const kanbanContainerRef = useRef<HTMLDivElement>(null);
  const [dropIntent, setDropIntent] = useState<{
    card: DealCard;
    fromCol: ColumnData;
    toCol: ColumnData;
  } | null>(null);
  const [dragOverColId, setDragOverColId] = useState<string | null>(null);
  const [isMoving, setIsMoving] = useState(false);
  const [backwardMoveWarning, setBackwardMoveWarning] = useState<BackwardMoveWarning | null>(null);
  const [followUpModalCard, setFollowUpModalCard] = useState<DealCard | null>(null);
  const [isLoggingFollowUp, setIsLoggingFollowUp] = useState(false);
  const [gatedEstimateCard, setGatedEstimateCard] = useState<GatedLeadCard | null>(null);

  // Appointment scheduling prompt state (shown when moving a card to est_scheduled)
  const [pendingScheduleMove, setPendingScheduleMove] = useState<{
    card: DealCard;
    fromCol: ColumnData;
    toCol: ColumnData;
  } | null>(null);
  const [scheduleDateTime, setScheduleDateTime] = useState('');
  const [isSchedulingMove, setIsSchedulingMove] = useState(false);

  const handleDragStart = (cardId: string, fromColId: string) => {
    if (!canAdvanceStage) return;
    dragCardRef.current = { cardId, fromColId };
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDragOverColId(null);
    dragCardRef.current = null;
  };

  const handleDragOver = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    setDragOverColId(colId);
  };

  const handleDragLeave = (colId: string) => {
    setDragOverColId((prev) => (prev === colId ? null : prev));
  };

  const DASHBOARD_STAGE_ORDER: Record<string, number> = {
    new_leads: 1,
    contacted: 2,
    est_scheduled: 3,
    est_sent: 4,
    follow_up: 5,
    contract_sent: 6,
    active_jobs: 7,
    job_completed: 7,
  };

  const handleDrop = (e: React.DragEvent, toCol: ColumnData) => {
    e.preventDefault();
    setIsDragging(false);
    setDragOverColId(null);
    if (!canAdvanceStage) return;
    const drag = dragCardRef.current;
    dragCardRef.current = null;
    if (!drag) return;
    if (drag.fromColId === toCol.id) return; // same column — no-op
    const fromCol = columns.find((c) => c.id === drag.fromColId);
    const card = fromCol?.cards.find((c) => c.id === drag.cardId);
    if (!fromCol || !card) return;

    // 1. Backward move check: leads cannot move backward
    const fromOrder = DASHBOARD_STAGE_ORDER[fromCol.id] || 1;
    const toOrder = DASHBOARD_STAGE_ORDER[toCol.id] || 1;
    if (toCol.id !== 'closed_lost' && toOrder < fromOrder) {
      setBackwardMoveWarning({
        dealName: card.name,
        fromTitle: fromCol.title,
        toTitle: toCol.title,
        fromStep: fromOrder,
        toStep: toOrder,
      });
      return;
    }

    // 2. Unclaimed Lead Stage Guard: Cannot advance unclaimed leads
    const isUnclaimed = !card.assignedToUserId || !card.assignedToName || card.assignedToName.toLowerCase() === 'unassigned';
    if (isUnclaimed && toCol.id !== 'new_leads') {
      setToastMessage('Please claim the lead first before advancing its stage.');
      return;
    }

    // 3. Gated stage check: Estimate Sent is automated and cannot be manually dropped into
    if (toCol.id === 'est_sent' || toCol.id === 'estimate_sent') {
      setGatedEstimateCard({
        id: card.id,
        name: card.name,
        location: card.location,
        address: card.address || card.location,
        city: card.city,
        service: card.service,
        serviceColor: card.serviceColor,
        phone: card.phone,
        email: card.email,
        value: card.value,
        currentStageName: fromCol.title,
      });
      return;
    }

    // 4. Estimate Scheduled: prompt for appointment date/time first
    if (toCol.id === 'est_scheduled') {
      setScheduleDateTime('');
      setPendingScheduleMove({ card, fromCol, toCol });
      return;
    }

    setDropIntent({ card, fromCol, toCol });
  };

  const handleConfirmMove = async (notes: string, authorInfo?: { plainNote?: string; authorName?: string; authorRole?: string }) => {
    if (!dropIntent) return;
    const { card, fromCol, toCol } = dropIntent;

    // Guard: Backward move
    const fromOrder = DASHBOARD_STAGE_ORDER[fromCol.id] || 1;
    const toOrder = DASHBOARD_STAGE_ORDER[toCol.id] || 1;
    if (toCol.id !== 'closed_lost' && toOrder < fromOrder) {
      setBackwardMoveWarning({
        dealName: card.name,
        fromTitle: fromCol.title,
        toTitle: toCol.title,
        fromStep: fromOrder,
        toStep: toOrder,
      });
      setDropIntent(null);
      return;
    }

    // Guard: Prevent advancing unclaimed lead
    const isUnclaimed = !card.assignedToUserId || !card.assignedToName || card.assignedToName.toLowerCase() === 'unassigned';
    if (isUnclaimed && toCol.id !== 'new_leads') {
      setToastMessage('Please claim the lead first before advancing its stage.');
      setDropIntent(null);
      return;
    }

    // Instantly move card in UI state for 0ms visual latency
    moveCardOptimistically(card.id, fromCol.id, toCol.id);
    setDropIntent(null);
    setIsMoving(true);

    const mapping = STAGE_MAP[toCol.id] || { granularStage: 'cold_lead', pipelineStage: 'stage_1_lead_gen' };
    try {
      await updatePipelineDealStage(card.id, mapping.granularStage, notes.trim() || undefined, authorInfo);
      setToastMessage(`Moved ${card.name} to ${toCol.title}`);
    } catch (err: any) {
      console.error('Failed to update stage:', err);
      // Immediately revert optimistic move
      moveCardOptimistically(card.id, toCol.id, fromCol.id);
      setToastMessage(err?.message || 'Move not permitted. Card returned to original column.');
    } finally {
      setIsMoving(false);
      refreshPipeline(true);
      refreshStats(true);
    }
  };

  const handleLogFollowUpSubmit = async (payload: {
    method: 'call' | 'sms' | 'email' | 'in_person';
    notes: string;
    outcome?: string;
  }) => {
    if (!followUpModalCard) return;
    setIsLoggingFollowUp(true);
    try {
      await logDealFollowUp(followUpModalCard.id, payload);
      setFollowUpModalCard(null);
      refreshPipeline();
      refreshStats();
    } catch (err) {
      console.error('Failed to log follow-up:', err);
    } finally {
      setIsLoggingFollowUp(false);
    }
  };

  const handleCancelMove = () => {
    setDropIntent(null);
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
        await api.updateLead(card.id, { site_visit_scheduled_at: new Date(scheduleDateTime).toISOString() } as any);
      }
      setToastMessage(`Moved ${card.name} to ${toCol.title}${!skipDate && scheduleDateTime ? ' — appointment set' : ''}`);
    } catch (err: any) {
      moveCardOptimistically(card.id, toCol.id, fromCol.id);
      setToastMessage(err?.message || 'Move failed. Card returned.');
    } finally {
      setIsSchedulingMove(false);
      setPendingScheduleMove(null);
      setScheduleDateTime('');
      refreshPipeline(true);
      refreshStats(true);
    }
  };

  const handleConfirmClaimLead = async () => {
    if (!claimModalCard) return;
    try {
      await claimLead(claimModalCard.id);
      refreshPipeline(true);
      refreshStats(true);
      setToastMessage(`Claimed lead "${claimModalCard.name}"`);
    } catch (err: any) {
      console.error('Failed to claim lead:', err);
      throw err;
    }
  };

  const handleReassignSuccess = () => {
    refreshPipeline(true);
    refreshStats(true);
    setToastMessage('Lead reassigned successfully');
  };

  const handleStartEditAddress = (card: DealCard, e: React.SyntheticEvent) => {
    e.stopPropagation();
    setEditingAddressCardId(card.id);
    setAddressFormStreet(card.address || '');
    setAddressFormCity(card.city || 'Oceanside');
    setAddressFormZip(card.zip || '');
  };

  const handleCancelEditAddress = (e?: React.SyntheticEvent) => {
    if (e) e.stopPropagation();
    setEditingAddressCardId(null);
    setAddressFormStreet('');
    setAddressFormCity('');
    setAddressFormZip('');
  };

  const handleSaveAddress = async (card: DealCard, e?: React.SyntheticEvent) => {
    if (e) e.stopPropagation();
    if (isSavingAddress) return;

    const cleanStreet = addressFormStreet.trim();
    const cleanCity = addressFormCity.trim();
    const cleanZip = addressFormZip.trim();

    setIsSavingAddress(true);
    try {
      await leadsApi.updateLead(card.id, {
        address: cleanStreet,
        city: cleanCity,
        zip: cleanZip,
      });

      updateCardAddress(card.id, cleanStreet, cleanCity, cleanZip);

      window.dispatchEvent(
        new CustomEvent('crm:lead-updated', {
          detail: { id: card.id, address: cleanStreet, city: cleanCity, zip: cleanZip },
        })
      );

      setToastMessage('Address saved to Client 360');
      setEditingAddressCardId(null);
      refreshPipeline(true);
    } catch (err: any) {
      console.error('Failed to update address:', err);
      setToastMessage(err?.message || 'Failed to update address');
    } finally {
      setIsSavingAddress(false);
    }
  };

  const filteredColumns = useMemo(() => {
    return columns.map((col) => ({
      ...col,
      cards: col.cards.filter((c) => {
        if (selectedService !== 'All Services') {
          const svcWord = selectedService.toLowerCase().replace(' residential', '').replace(' roofing', '').replace(' roof', '');
          if (!c.service.toLowerCase().includes(svcWord)) return false;
        }
        if (selectedSource !== 'All Sources') {
          if (selectedSource === 'Website') {
            if (c.leadSource !== 'website') return false;
          } else if (selectedSource === 'Manual') {
            if (c.leadSource !== 'manual') return false;
          }
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

  const handleCreateLead = async (_lead: CreateLeadPayload) => {
    refreshStats();
    refreshPipeline();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const renderColumnIcon = (type: string) => {
    switch (type) {
      case 'users':
        return <Users size={11} className="shrink-0 stroke-[2.5]" />;
      case 'phone':
        return <Phone size={11} className="shrink-0 stroke-[2.5]" />;
      case 'calendar':
        return <Calendar size={11} className="shrink-0 stroke-[2.5]" />;
      case 'file-text':
        return <FileText size={11} className="shrink-0 stroke-[2.5]" />;
      case 'clock':
        return <Clock size={11} className="shrink-0 stroke-[2.5]" />;
      case 'bell':
        return <Bell size={11} className="shrink-0 stroke-[2.5]" />;
      case 'shield':
        return <ShieldCheck size={11} className="shrink-0 stroke-[2.5]" />;
      case 'trophy':
        return <Trophy size={11} className="shrink-0 stroke-[2.5]" />;
      case 'briefcase':
      default:
        return <Briefcase size={11} className="shrink-0 stroke-[2.5]" />;
    }
  };

  const getServiceBadgeClass = (color: string) => {
    switch (color) {
      case 'sky':
        return 'bg-sky-100/90 dark:bg-sky-950/60 text-[#0284c7] dark:text-sky-300 border border-sky-300/80 dark:border-sky-800/60 font-bold shadow-2xs backdrop-blur-xs';
      case 'amber':
        return 'bg-amber-100/90 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-[#F9C500]/70 dark:border-amber-800/60 font-bold shadow-2xs backdrop-blur-xs';
      case 'emerald':
        return 'bg-emerald-100/90 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-800/60 font-bold shadow-2xs backdrop-blur-xs';
      case 'purple':
        return 'bg-purple-100/90 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-300/80 dark:border-purple-800/60 font-bold shadow-2xs backdrop-blur-xs';
      case 'coral':
        return 'bg-rose-100/90 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-[#E6392D]/40 dark:border-rose-800/60 font-bold shadow-2xs backdrop-blur-xs';
      case 'indigo':
        return 'bg-indigo-100/90 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-300/80 dark:border-indigo-800/60 font-bold shadow-2xs backdrop-blur-xs';
      case 'blue':
      default:
        return 'bg-blue-100/90 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-300/80 dark:border-blue-800/60 font-bold shadow-2xs backdrop-blur-xs';
    }
  };

  return (
    <div className="h-full flex flex-col justify-between min-h-0 w-full max-w-[1600px] mx-auto select-none gap-2">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 px-4 py-2.5 rounded-2xl bg-slate-900 dark:bg-slate-800 text-white text-xs font-semibold shadow-2xl border border-white/20 flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-200">
          <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. UNIFIED HERO BANNER WITH TOP SEARCH & BADGES */}
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

      {/* 2. EXECUTIVE STATISTICS ROW */}
      <ErrorBoundary fallbackTitle="Executive Statistics Temporarily Unavailable">
        <DashboardKpiGrid
          isLoading={isStatsLoadingInitial}
          activeStats={activeStats}
          stats={stats}
        />
      </ErrorBoundary>

      {/* 2.5 ACTION REQUIRED: CONTRACTS AWAITING COUNTER-SIGNATURE */}
      <ErrorBoundary fallbackTitle="Pending Contracts Feed Unavailable">
        <DashboardPendingContracts
          pendingContracts={pendingCounterSignContracts}
          onSelectContract={(c) => setSelectedCounterSignContract(c)}
        />
      </ErrorBoundary>

      {/* 3. SALES PIPELINE SECTION (Kanban Board & Controls) */}
      <div className="rounded-2xl light-glass-panel glossy-sheen border border-white/85 dark:border-white/10 shadow-md p-2.5 lg:p-3 relative flex-1 min-h-0 flex flex-col">
        {/* Pipeline Control Toolbar */}
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
          onCreateLead={() => {
            setCreateLeadStage('new_leads');
            setIsCreateLeadOpen(true);
          }}
          repOptions={repOptions}
        />

        {/* View Mode Switching: Kanban, List, or Calendar */}
        {viewMode === 'kanban' && pipelineLoading ? (
          <div className="grid grid-cols-7 gap-2 items-stretch pb-0.5 w-full flex-1 min-h-0">
            {Array.from({ length: 7 }).map((_, i) => (
              <KanbanColumnSkeleton key={i} cardCount={i < 3 ? 3 : 2} />
            ))}
          </div>
        ) : viewMode === 'kanban' && (
          <div
            ref={kanbanContainerRef}
            className="grid grid-cols-7 gap-2 items-stretch overflow-hidden pb-0.5 w-full flex-1 min-h-0"
          >
            {filteredColumns.map((col) => {
              const rawFilteredCards = pipelineSearch
                ? col.cards.filter(
                    (c) =>
                      c.name.toLowerCase().includes(pipelineSearch.toLowerCase()) ||
                      c.location.toLowerCase().includes(pipelineSearch.toLowerCase()) ||
                      c.service.toLowerCase().includes(pipelineSearch.toLowerCase())
                  )
                : col.cards;

              // Follow-up column: overdue leads stay at top; completed contacts sink to the end
              const filteredCards = col.id === 'follow_up'
                ? [...rawFilteredCards].sort((a, b) => {
                    if (a.isFollowupOverdue && !b.isFollowupOverdue) return -1;
                    if (!a.isFollowupOverdue && b.isFollowupOverdue) return 1;
                    const remA = a.followupDaysRemaining ?? 7;
                    const remB = b.followupDaysRemaining ?? 7;
                    return remA - remB;
                  })
                : rawFilteredCards;

              return (
                <div
                  key={col.id}
                  className="liquid-column-channel rounded-2xl p-1.5 flex flex-col min-w-0 min-h-0 max-h-full overflow-hidden transition-all duration-200 h-full border border-slate-200/70 dark:border-white/10"
                  style={{
                    backgroundColor: isDark ? 'rgba(10, 16, 28, 0.65)' : col.bgColor,
                    boxShadow: dragOverColId === col.id
                      ? `0 0 0 2.5px ${col.accentColor}, inset 0 1.5px 1px 0 rgba(255,255,255,${isDark ? '0.12' : '0.75'}), 0 4px 24px -2px ${col.accentColor}33`
                      : isDark
                      ? `0 0 0 1px rgba(255,255,255,0.06), inset 0 1px 1px 0 rgba(255,255,255,0.04), 0 4px 16px -2px rgba(0,0,0,0.35)`
                      : `0 0 0 1.5px ${col.borderColor}, inset 0 1.5px 1px 0 rgba(255,255,255,0.75), 0 4px 16px -2px rgba(15,23,42,0.04)`,
                    transform: dragOverColId === col.id ? 'scale(1.012)' : 'scale(1)',
                  }}
                  onDragOver={(e) => handleDragOver(e, col.id)}
                  onDragLeave={() => handleDragLeave(col.id)}
                  onDrop={(e) => handleDrop(e, col)}
                >
                  {/* Column Header Pill */}
                  <div
                    className={`flex items-center justify-between px-2 py-1 rounded-xl shadow-xs flex-shrink-0 ${col.pillClass} ${
                      col.id === 'contract_sent' ? 'cursor-pointer hover:opacity-95 hover:shadow-sm transition-all group/colheader' : ''
                    }`}
                    onClick={() => {
                      if (col.id === 'contract_sent') {
                        navigate('/pipeline?stage=contract_sent');
                      }
                    }}
                    title={col.id === 'contract_sent' ? 'View Sent Contracts in Pipeline' : undefined}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      {renderColumnIcon(col.iconType)}
                      <span className="text-[10px] font-black truncate">{col.title}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-1">
                      <span
                        className={`text-[9px] font-black px-1.5 py-0.2 rounded-md leading-normal ${col.badgeClass}`}
                      >
                        {col.count}
                      </span>
                      {col.id === 'contract_sent' && (
                        <span title="Open in Pipeline" className="text-white/80 group-hover/colheader:text-white group-hover/colheader:translate-x-0.5 transition-all">
                          <ChevronRight size={10} className="stroke-[2.5]" />
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Deal Cards Container */}
                  <div className="flex-1 overflow-y-auto kanban-column-scroll min-h-0 space-y-1.5 mt-1.5 pr-0.5">
                    {filteredCards.map((card) => (
                      <DashboardDealCard
                        key={card.id}
                        card={card}
                        col={col}
                        canAdvanceStage={canAdvanceStage}
                        canViewFinances={canViewFinances}
                        canClaimLead={canClaimLead}
                        canReassignLead={canReassignLead}
                        isDark={isDark}
                        editingAddressCardId={editingAddressCardId}
                        addressFormStreet={addressFormStreet}
                        addressFormCity={addressFormCity}
                        addressFormZip={addressFormZip}
                        isSavingAddress={isSavingAddress}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        onClick={() => {
                          const allEnriched = enrichDeals(columns);
                          const found = allEnriched.find((d) => String(d.id) === String(card.id));
                          setSelectedDeal(
                            found || {
                              ...card,
                              stageId: col.id,
                              stageTitle: col.title,
                              stageAccent: col.accentColor,
                              stageBgColor: col.bgColor,
                              stageBorderColor: col.borderColor,
                              stagePillClass: col.pillClass,
                              stageBadgeClass: col.badgeClass,
                              iconType: col.iconType,
                              phone: card.phone || '(760) 555-0100',
                              email: card.email || `${String(card.name || 'homeowner').toLowerCase().replace(/[^a-z]/g, '')}@gmail.com`,
                              value: card.value || 15000,
                              scheduledDay: 10,
                              timeSlot: '10:00 AM',
                              dateFormatted: 'Today',
                              notes: card.notes,
                            }
                          );
                          setIsDealModalOpen(true);
                        }}
                        onStartEditAddress={handleStartEditAddress}
                        onSaveAddress={handleSaveAddress}
                        onCancelEditAddress={handleCancelEditAddress}
                        onStreetChange={setAddressFormStreet}
                        onCityChange={setAddressFormCity}
                        onZipChange={setAddressFormZip}
                        onClaimLead={(c) => setClaimModalCard(c)}
                        onReassignLead={(c) => setReassignModalCard(c)}
                        onFollowUp={(c) => setFollowUpModalCard(c)}
                        getServiceBadgeClass={getServiceBadgeClass}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* List View Mode */}
        {viewMode === 'list' && (
          <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
            <PipelineListView
              columns={filteredColumns}
              pipelineSearch={pipelineSearch}
              onSelectDeal={(deal) => {
                setSelectedDeal(deal);
                setIsDealModalOpen(true);
              }}
              getServiceBadgeClass={getServiceBadgeClass}
            />
          </div>
        )}

        {/* Calendar View Mode */}
        {viewMode === 'calendar' && (
          <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
            <PipelineCalendarView
              columns={filteredColumns}
              pipelineSearch={pipelineSearch}
              onSelectDeal={(deal) => {
                setSelectedDeal(deal);
                setIsDealModalOpen(true);
              }}
              getServiceBadgeClass={getServiceBadgeClass}
            />
          </div>
        )}
      </div>

      {/* 4. RECENT ACTIVITY BAR */}
      <DashboardRecentActivity recentActivities={activeStats?.recentActivities} />

      {/* Interactive Deal Inspection & Field Notes Modal */}
      <PipelineDealModal
        deal={selectedDeal}
        isOpen={isDealModalOpen}
        onClose={() => {
          setIsDealModalOpen(false);
          setSelectedDeal(null);
        }}
        getServiceBadgeClass={getServiceBadgeClass}
      />

      {/* Create New Lead Optical Glass Modal */}
      <CreateLeadModal
        isOpen={isCreateLeadOpen}
        initialStageId={createLeadStage}
        onClose={() => setIsCreateLeadOpen(false)}
        onSubmitLead={handleCreateLead}
      />

      {/* Drag & Drop Move Confirmation Modal */}
      <MoveLeadModal
        intent={dropIntent}
        isMoving={isMoving}
        onConfirm={handleConfirmMove}
        onCancel={handleCancelMove}
      />

      {/* 48-Hour SLA Automated Follow-Up Modal */}
      <LogFollowUpModal
        isOpen={Boolean(followUpModalCard)}
        deal={
          followUpModalCard
            ? {
                id: followUpModalCard.id,
                name: followUpModalCard.name,
                phone: followUpModalCard.phone || 'No phone provided',
                email: followUpModalCard.email || 'No email provided',
                address: followUpModalCard.location,
                city: followUpModalCard.location.split(',')[0] || 'Oceanside',
                service: followUpModalCard.service,
                serviceColor: followUpModalCard.serviceColor,
                value: followUpModalCard.value ?? 15000,
                stageId: 'follow_up' as PipelineStageId,
                daysInStage: 0,
                estimator: {
                  name: 'Jake Miller',
                  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
                  role: 'Senior Estimator',
                },
                slaStatus: followUpModalCard.isFollowupOverdue ? 'overdue' : 'on_track',
                slaText: followUpModalCard.isFollowupOverdue ? 'Overdue 7d+' : 'On track',
                photosCount: 0,
                notes: '',
                isFollowupOverdue: followUpModalCard.isFollowupOverdue,
                followupDaysRemaining: followUpModalCard.followupDaysRemaining,
                hoursUntilAutoMove: followUpModalCard.hoursUntilAutoMove,
                checklist: [],
              }
            : null
        }
        isSaving={isLoggingFollowUp}
        onClose={() => setFollowUpModalCard(null)}
        onSubmitFollowUp={handleLogFollowUpSubmit}
      />

      {/* Estimate Sent Gated Modal */}
      <EstimateSentGatedModal
        deal={gatedEstimateCard}
        isOpen={Boolean(gatedEstimateCard)}
        onClose={() => setGatedEstimateCard(null)}
      />

      {/* Contract Counter-Sign Modal */}
      <CounterSignModal
        contract={selectedCounterSignContract}
        isOpen={Boolean(selectedCounterSignContract)}
        onClose={() => setSelectedCounterSignContract(null)}
        onSuccess={() => {
          setSelectedCounterSignContract(null);
          fetchPendingContracts();
          refreshStats();
          refreshPipeline();
        }}
      />

      {/* Claim Lead Confirmation Modal */}
      <ClaimLeadModal
        isOpen={Boolean(claimModalCard)}
        leadId={claimModalCard?.id}
        leadName={claimModalCard?.name || ''}
        service={claimModalCard?.service}
        value={claimModalCard?.value}
        location={claimModalCard?.address || claimModalCard?.location}
        onClose={() => setClaimModalCard(null)}
        onConfirm={handleConfirmClaimLead}
      />

      {/* Reassign Lead Modal */}
      {reassignModalCard && (
        <ReassignLeadModal
          isOpen={Boolean(reassignModalCard)}
          leadId={reassignModalCard.id}
          leadName={reassignModalCard.name}
          currentAssigneeId={reassignModalCard.assignedToUserId}
          currentAssigneeName={reassignModalCard.assignedToName || undefined}
          onClose={() => setReassignModalCard(null)}
          onSuccess={handleReassignSuccess}
        />
      )}

      {/* Backward Move Policy Modal */}
      <BackwardMoveModal
        warning={backwardMoveWarning}
        onClose={() => setBackwardMoveWarning(null)}
      />

      {/* Appointment Scheduling Modal — triggered when moving to Estimate Scheduled */}
      {pendingScheduleMove && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xl animate-in fade-in duration-200">
          <div
            className="relative w-full max-w-sm rounded-3xl bg-white/95 dark:bg-[#0B1320]/96 backdrop-blur-3xl border border-white/90 dark:border-white/10 shadow-[0_25px_80px_rgba(0,0,0,0.35)] p-6 space-y-4 animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-sky-100 dark:bg-sky-950/60 flex items-center justify-center shrink-0">
                <Calendar className="text-sky-600 dark:text-sky-400" size={20} />
              </div>
              <div>
                <div className="font-black text-sm text-slate-800 dark:text-slate-100">Schedule Estimate</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">{pendingScheduleMove.card.name}</div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Appointment Date &amp; Time
              </label>
              <input
                type="datetime-local"
                value={scheduleDateTime}
                onChange={e => setScheduleDateTime(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-xl border border-slate-300 dark:border-white/20 bg-white/80 dark:bg-white/5 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-400"
                autoFocus
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setPendingScheduleMove(null); setScheduleDateTime(''); }}
                disabled={isSchedulingMove}
                className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 text-xs font-bold hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleConfirmScheduleMove(true)}
                disabled={isSchedulingMove}
                className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 text-xs font-bold hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-50"
              >
                Move, no date
              </button>
              <button
                type="button"
                onClick={() => handleConfirmScheduleMove(false)}
                disabled={!scheduleDateTime || isSchedulingMove}
                className="flex-1 py-2 rounded-xl bg-[#1878B8] text-white text-xs font-bold hover:bg-[#1568a3] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                {isSchedulingMove ? 'Moving…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
