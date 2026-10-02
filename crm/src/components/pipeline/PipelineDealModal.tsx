import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Phone,
  Mail,
  MapPin,
  Clock,
  Calendar,
  DollarSign,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  Copy,
  Check,
  MoveRight,
  Plus,
  Loader2,
  Send,
  ExternalLink,
  User,
  UserCheck,
  UserCog,
  FileText,
  Edit3,
  Ruler,
} from 'lucide-react';
import { ContractBuilderModal } from './ContractBuilderModal';
import { ClaimLeadModal } from './ClaimLeadModal';
import { ReassignLeadModal } from './ReassignLeadModal';
import { EnrichedDeal } from './pipelineTypes';
import { ProfileNotesFeed } from '@/components/common/ProfileNotesFeed';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { formatTimestamp12h, cleanseAuthor, serializeProfileNote } from '@/lib/noteUtils';
import { getTelUrl, getMailtoUrl, getSmsUrl } from '@/utils/contactValidation';
import { ClientEditContactModal, ClientContactData } from '@/components/clients/ClientEditContactModal';
import { broadcastContactUpdated } from '@/utils/syncEventBus';
import { DealValueBadge } from '@/components/shared/DealValueBadge';


export interface GenericDealItem {
  id: string | number;
  name: string;
  location?: string;
  address?: string;
  city?: string;
  service?: string;
  serviceColor?: string;
  time?: string;
  phone?: string;
  email?: string;
  value?: number;
  stageTitle?: string;
  stagePillClass?: string;
  stageId?: string;
  dateFormatted?: string;
  timeSlot?: string;
  notes?: string;
  daysInStage?: number;
  score?: number;
}

interface PipelineDealModalProps {
  deal: GenericDealItem | EnrichedDeal | any | null;
  isOpen: boolean;
  onClose: () => void;
  getServiceBadgeClass?: (color: string) => string;
  onAdvanceStage?: (dealId: string, nextStage: any) => void;
  onUpdateDeal?: (updatedDeal: any) => void;
}

const DEFAULT_BADGE_CLASS = (color?: string) => {
  switch (color) {
    case 'amber':
      return 'bg-amber-100/90 text-amber-800 border border-amber-200';
    case 'blue':
      return 'bg-blue-100/90 text-blue-800 border border-blue-200';
    case 'sky':
      return 'bg-sky-100/90 text-sky-800 border border-sky-200';
    case 'coral':
      return 'bg-rose-100/90 text-rose-800 border border-rose-200';
    case 'indigo':
      return 'bg-indigo-100/90 text-indigo-800 border border-indigo-200';
    case 'purple':
      return 'bg-purple-100/90 text-purple-800 border border-purple-200';
    default:
      return 'bg-emerald-100/90 text-emerald-800 border border-emerald-200';
  }
};

const STAGE_TITLES: Record<string, string> = {
  stage_1_lead_gen: 'New Lead',
  stage_2_initial_contact: 'Initial Contact',
  stage_3_site_visit_estimate: 'Estimate Scheduled',
  stage_4_closing: 'Closing & Follow-Up',
  stage_5_completion_followup: 'Active Job & Fulfillment',
  cold_lead: 'Cold Lead',
  new_leads: 'New Lead',
  initial_call: 'Contacted / Initial Call',
  contacted: 'Contacted',
  inspection_scheduled: 'Inspection Scheduled',
  est_scheduled: 'Estimate Scheduled',
  inspection_completed: 'Inspection Completed',
  estimate_building: 'Drafting Estimate',
  estimate_sent: 'Estimate Sent',
  est_sent: 'Estimate Sent',
  follow_up: 'Follow-Up',
  followup_2day: '48h Follow-Up',
  followup_7day: '7-Day Follow-Up',
  contract_signed: 'Contract Signed',
  active_jobs: 'Active Job',
  job_completed: 'Job Completed',
  completed: 'Job Completed',
  closed_won: 'Closed Won',
  closed_lost: 'Closed Lost',
  future_followup: 'Future Follow-Up',
};

function formatRelativeTime(dateStr?: string | null): string {
  if (!dateStr) return 'Recently';
  const diff = Date.now() - new Date(dateStr).getTime();
  if (isNaN(diff)) return 'Recently';
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return '1d ago';
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function PipelineDealModal({
  deal,
  isOpen,
  onClose,
  getServiceBadgeClass = DEFAULT_BADGE_CLASS,
  onAdvanceStage,
  onUpdateDeal,
}: PipelineDealModalProps) {
  const { user, can, isOwner } = useAuth();
  const { toast } = useToast();
  const canViewFinances = can('finances.view');
  const canClaimLead = isOwner || can('leads.claim');
  const canReassignLead = isOwner || can('leads.reassign');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'timeline' | 'notes'>('timeline');
  const [notes, setNotes] = useState('');
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);

  // Live PostgreSQL data hydration
  const [leadDetail, setLeadDetail] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Quick activity log drawer state
  const [showLogDrawer, setShowLogDrawer] = useState(false);
  const [logMethod, setLogMethod] = useState<'call' | 'sms' | 'email' | 'meeting' | 'note'>('call');
  const [logNotes, setLogNotes] = useState('');
  const [isLogging, setIsLogging] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [showContractBuilder, setShowContractBuilder] = useState(false);

  // Appointment scheduling state
  const [showScheduler, setShowScheduler] = useState(false);
  const [sqftEditOpen, setSqftEditOpen] = useState(false);
  const [sqftInput, setSqftInput] = useState('');

  const [scheduleInput, setScheduleInput] = useState('');
  const [isScheduling, setIsScheduling] = useState(false);

  // Resolved author
  const cleanAuthor = cleanseAuthor(user?.name, user?.role);
  const authorName = cleanAuthor.name;
  const authorRole = cleanAuthor.role || 'Owner';

  const fetchLeadData = useCallback(async (dealId: string | number) => {
    if (!dealId) return;
    setIsLoadingDetails(true);

    try {
      const leadRes = await api.getLead(dealId);
      if (leadRes?.lead) {
        setLeadDetail(leadRes.lead);
        if (leadRes.lead.notes) {
          setNotes(leadRes.lead.notes);
        } else if (deal?.notes) {
          setNotes(deal.notes);
        } else {
          setNotes(`Initial inspection scope for ${leadRes.lead.full_name || deal?.name}: ${leadRes.lead.service_type || deal?.service || 'Roofing'} requested.`);
        }
      } else if (deal?.notes) {
        setNotes(deal.notes);
      }
    } catch (e) {
      console.warn('Could not fetch lead details from API:', e);
      if (deal?.notes) setNotes(deal.notes);
    }

    try {
      const actRes = await api.getLeadActivities(dealId);
      if (actRes?.activities && Array.isArray(actRes.activities)) {
        setActivities(actRes.activities);
      }
    } catch (e) {
      console.warn('Could not fetch lead activities:', e);
    } finally {
      setIsLoadingDetails(false);
    }
  }, [deal]);

  useEffect(() => {
    if (isOpen && deal?.id) {
      fetchLeadData(deal.id);
    } else {
      setLeadDetail(null);
      setActivities([]);
      setShowLogDrawer(false);
      setLogNotes('');
    }
  }, [isOpen, deal?.id, fetchLeadData]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const [isEditContactOpen, setIsEditContactOpen] = useState(false);
  const [localContact, setLocalContact] = useState<{
    name?: string;
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    zip?: string;
  }>({});

  if (!isOpen || !deal) return null;

  const handleSaveContact = async (data: ClientContactData) => {
    if (!deal) return;
    try {
      await api.updateLead(deal.id, {
        full_name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        city: data.city,
        zip: data.zip,
      });

      broadcastContactUpdated({
        leadId: deal.id,
        clientId: (deal as any).clientId || (deal as any).client_id || leadDetail?.client_id,
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        city: data.city,
        zip: data.zip,
      });

      setLocalContact({
        name: data.name,
        phone: data.phone,
        email: data.email,
        address: data.address,
        city: data.city,
        zip: data.zip,
      });

      if (onUpdateDeal) {
        onUpdateDeal({
          ...deal,
          name: data.name,
          phone: data.phone,
          email: data.email,
          address: data.address,
          city: data.city,
        });
      }
    } catch (err: any) {
      console.error('Failed to update contact info in Pipeline:', err);
      throw err;
    }
  };

  const handleCopy = (text?: string, field?: string) => {
    if (!text || !field) return;
    navigator.clipboard?.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const displayId = String(deal.id);
  const displayName = localContact.name || leadDetail?.full_name || deal.name;
  const displayPhone = localContact.phone || leadDetail?.phone || deal.phone || '';
  const displayEmail = localContact.email || leadDetail?.email || deal.email || '';
  const displayService = leadDetail?.service_type || deal.service || 'Commercial Flat';
  const displayValue = Number(leadDetail?.contract_value || leadDetail?.estimated_value || deal.value || 42000);
  // Value resolution for display — uses the full hierarchy
  const resolvedContractValue = leadDetail?.contract_value ? Number(leadDetail.contract_value) : ((deal as any).contractValue ?? null);
  const resolvedEstimateTotal = leadDetail?.estimate_total ? Number(leadDetail.estimate_total) : ((deal as any).estimateTotal ?? null);
  const resolvedRoofSqf = leadDetail?.roof_sqf ? Number(leadDetail.roof_sqf) : ((deal as any).roofSqf ?? null);
  // Expose estimatedValue whenever roof_sqf is genuinely present (> 0)
  const resolvedEstimatedValue = (resolvedRoofSqf && resolvedRoofSqf > 0)
    ? (leadDetail?.raw_estimated_value != null
        ? Number(leadDetail.raw_estimated_value)
        : ((deal as any).estimatedValue != null
            ? Number((deal as any).estimatedValue)
            : (leadDetail?.estimated_value != null ? Number(leadDetail.estimated_value) : null)))
    : null;
  const resolvedProposalSentAt = leadDetail?.proposal_sent_at || (deal as any).proposalSentDate || (deal as any).proposalSentAt || null;
  const resolvedIsContractSigned = Boolean(leadDetail?.contract_signed_at || leadDetail?.contract_status === 'fully_executed' || leadDetail?.contract_status === 'client_signed' || (deal as any).isContractSigned);
  const resolvedIsUploadedEstimate = Boolean(
    leadDetail?.is_uploaded_estimate ||
    leadDetail?.estimate_template_key === 'uploaded' ||
    (deal as any).isUploadedEstimate ||
    (deal as any).estimateTemplateKey === 'uploaded'
  );
  const resolvedEstimateTemplateKey = leadDetail?.estimate_template_key || (deal as any).estimateTemplateKey || null;


  const displayAddress = localContact.address || leadDetail?.address || deal.address || deal.location || '';
  const displayCity = localContact.city || leadDetail?.city || deal.city || 'Oceanside';
  const displayZip = localContact.zip || leadDetail?.zip || deal.zip || '';
  const displayLocation = `${displayCity}, CA`;
  const displayStageKey = leadDetail?.pipeline_stage || deal.stageId || 'estimate_sent';
  const displayStageTitle = STAGE_TITLES[displayStageKey] || deal.stageTitle || 'Estimate Sent';

  const stagePillClass =
    deal.stagePillClass ||
    'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-900 font-extrabold border border-amber-300 shadow-2xs';

  const displayDate = deal.dateFormatted || 'Tue, Mar 10';
  const displayTimeSlot = deal.timeSlot || '10:00 AM';
  const displayRelativeTime = deal.time || formatRelativeTime(leadDetail?.updated_at || leadDetail?.created_at);

  // Real appointment from backend
  const rawScheduledAt = leadDetail?.site_visit_scheduled_at || (deal as any).siteVisitScheduledAt || null;
  const scheduledDt = rawScheduledAt ? new Date(rawScheduledAt) : null;
  const realAppointmentDate = scheduledDt
    ? scheduledDt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    : null;
  const realAppointmentTime = scheduledDt
    ? scheduledDt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    : null;

  const latestMoveActivity = activities.find((a) => a.activity_type === 'stage_changed');

  const handleLogTouchpoint = async () => {
    if (!logNotes.trim() || isLogging) return;
    setIsLogging(true);

    const typeIcons: Record<string, string> = {
      call: '📞 Call',
      sms: '💬 SMS',
      email: '✉️ Email',
      meeting: '🤝 Meeting',
      note: '📝 Note',
    };
    const typeLabel = typeIcons[logMethod] || logMethod.toUpperCase();
    const title = `Follow-Up: ${typeLabel}`;
    const serialized = serializeProfileNote(
      `${typeLabel}: ${logNotes.trim()}`,
      authorName,
      authorRole
    );

    try {
      await api.addLeadActivity(deal.id, {
        title,
        description: logNotes.trim(),
        activityType: logMethod === 'note' ? 'note' : 'communication',
      });

      const updatedNotes = notes ? `${notes}\n\n${serialized}` : serialized;
      setNotes(updatedNotes);
      await api.updateLead(deal.id, { notes: updatedNotes });

      setLogNotes('');
      setShowLogDrawer(false);
      await fetchLeadData(deal.id);
    } catch (err) {
      console.error('Failed to log touchpoint:', err);
    } finally {
      setIsLogging(false);
    }
  };

  const isUnassigned = !deal?.assignedToUserId || (deal as any)?.estimator?.name === 'Unassigned' || (leadDetail && !leadDetail.assigned_to_user_id);

  const handleClaim = async () => {
    if (isClaiming || !deal?.id) return;
    setIsClaiming(true);
    try {
      await api.claimLead(deal.id);
      await fetchLeadData(deal.id);
      if (onUpdateDeal) {
        onUpdateDeal({
          ...deal,
          assignedToUserId: user?.id,
          assignedToName: user?.name,
          estimator: {
            name: user?.name || 'Assigned',
            avatar: (user as any)?.avatar_url || (user as any)?.avatar || '',
            role: 'Estimator',
          },
        });
      }
    } catch (err) {
      console.error('Failed to claim lead:', err);
    } finally {
      setIsClaiming(false);
    }
  };

  const handleScheduleAppointment = async () => {
    if (!scheduleInput || isScheduling || !deal?.id) return;
    setIsScheduling(true);
    try {
      const isoDatetime = new Date(scheduleInput).toISOString();
      await api.updateLead(deal.id, { site_visit_scheduled_at: isoDatetime } as any);
      // Auto-advance to estimate_scheduled stage if not already past it
      const currentStage = leadDetail?.pipeline_stage || (deal as any).stageId || '';
      const preScheduleStages = ['stage_1_lead_gen', 'stage_2_initial_contact', 'new_leads', 'contacted', 'initial_call', 'cold_lead'];
      if (preScheduleStages.some(s => currentStage.includes(s) || currentStage === s)) {
        await api.updateLead(deal.id, { pipeline_stage: 'stage_3_site_visit_estimate' } as any);
      }
      setShowScheduler(false);
      setScheduleInput('');
      await fetchLeadData(deal.id);
      if (onUpdateDeal) onUpdateDeal({ ...deal, siteVisitScheduledAt: isoDatetime });
    } catch (err) {
      console.error('Failed to schedule appointment:', err);
    } finally {
      setIsScheduling(false);
    }
  };

  const handleCancelAppointment = async () => {
    if (isScheduling || !deal?.id) return;
    if (!window.confirm('Cancel this appointment? The lead will remain in its current stage.')) return;
    setIsScheduling(true);
    try {
      await api.updateLead(deal.id, { site_visit_scheduled_at: null } as any);
      setShowScheduler(false);
      setScheduleInput('');
      await fetchLeadData(deal.id);
      if (onUpdateDeal) onUpdateDeal({ ...deal, siteVisitScheduledAt: null });
    } catch (err) {
      console.error('Failed to cancel appointment:', err);
    } finally {
      setIsScheduling(false);
    }
  };

  const portal = createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xl animate-in fade-in duration-200"
    >
      <div
        className="relative w-full max-w-xl rounded-3xl bg-white/94 dark:bg-[#0B1320]/95 backdrop-blur-3xl border border-white/95 dark:border-white/10 shadow-[0_25px_90px_rgba(0,0,0,0.40),0_0_0_1px_rgba(255,255,255,0.9)_inset] dark:shadow-[0_25px_90px_rgba(0,0,0,0.85)] p-6 space-y-5 animate-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Specular top highlight bevel */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white dark:via-white/20 to-transparent" />

        {/* Header Strip */}
        <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-200/70 dark:border-white/10 shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span
                className={`text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-2xs ${stagePillClass}`}
              >
                {displayStageTitle}
              </span>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">ID: #{displayId.toUpperCase()}</span>
              {isLoadingDetails && (
                <Loader2 size={11} className="animate-spin text-sky-500" />
              )}
            </div>
            <h2 className="text-xl font-black text-[#1F1F1F] dark:text-white tracking-tight">{displayName}</h2>
            <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              <MapPin size={12} className="text-[#1878B8]" />
              <span>{displayLocation}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isUnassigned && canClaimLead && (
              <button
                type="button"
                onClick={() => setIsClaimModalOpen(true)}
                disabled={isClaiming}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {isClaiming ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <UserCheck size={13} />
                )}
                <span>Claim Lead</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsEditContactOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              title="Edit Contact Info (Name, Phone, Email, Address)"
            >
              <Edit3 size={13} />
              <span>Edit Info</span>
            </button>

            {!isUnassigned && canReassignLead && (
              <button
                type="button"
                onClick={() => setIsReassignModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                title="Reassign lead to another staff member"
              >
                <UserCog size={13} />
                <span>Reassign</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl liquid-glass-btn text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
              title="Close modal"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Tab Navigation Segmented Control */}
        <div className="flex items-center gap-1.5 bg-white/50 dark:bg-white/5 p-1 rounded-xl border border-white/80 dark:border-white/10 backdrop-blur-md text-xs font-bold shrink-0">
          <button
            onClick={() => setActiveTab('details')}
            className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'details'
                ? 'bg-gradient-to-r from-[#1878B8] to-[#55C4F5] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/10'
            }`}
          >
            Lead Overview
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'timeline'
                ? 'bg-gradient-to-r from-[#1878B8] to-[#55C4F5] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/10'
            }`}
          >
            Schedule &amp; Activity
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'notes'
                ? 'bg-gradient-to-r from-[#1878B8] to-[#55C4F5] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/10'
            }`}
          >
            Field Notes
          </button>
        </div>

        {/* Scrollable Tab Body */}
        <div className="overflow-y-auto pr-1 flex-1 space-y-4">
          {/* ============================================================== */}
          {/* TAB 1: LEAD OVERVIEW                                          */}
          {/* ============================================================== */}
          {activeTab === 'details' && (
            <div className="space-y-4">
              {/* Quick Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div className="p-3 rounded-2xl liquid-glass-tile space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">
                      Deal Value
                    </span>
                    {canViewFinances && !resolvedRoofSqf && !resolvedEstimateTotal && !resolvedContractValue && (
                      <button
                        type="button"
                        onClick={() => setSqftEditOpen(v => !v)}
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 hover:bg-amber-100 transition-colors cursor-pointer"
                      >
                        + Add Sq Ft
                      </button>
                    )}
                    {canViewFinances && resolvedRoofSqf && !resolvedEstimateTotal && !resolvedContractValue && (
                      <button
                        type="button"
                        onClick={() => { setSqftInput(String(resolvedRoofSqf || '')); setSqftEditOpen(v => !v); }}
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10 hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        Edit Sq Ft
                      </button>
                    )}
                  </div>
                  <div className="text-base font-black text-slate-800 dark:text-white flex items-center gap-0.5">
                    <DealValueBadge
                      contractValue={resolvedContractValue}
                      estimateTotal={resolvedEstimateTotal}
                      estimatedValue={resolvedEstimatedValue}
                      roofSqf={resolvedRoofSqf}
                      proposalSentAt={resolvedProposalSentAt}
                      isUploadedEstimate={resolvedIsUploadedEstimate}
                      estimateTemplateKey={resolvedEstimateTemplateKey}
                      isContractSigned={resolvedIsContractSigned}
                      stageId={displayStageKey}
                      canViewFinances={canViewFinances}
                      size="base"
                    />
                  </div>
                  {resolvedRoofSqf && resolvedRoofSqf > 0 ? (
                    <div className="text-[10.5px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                      <Ruler size={10} className="text-amber-500 shrink-0" />
                      <span>{resolvedRoofSqf.toLocaleString()} sq ft</span>
                    </div>
                  ) : null}
                  {sqftEditOpen && canViewFinances && (
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const sqf = parseInt(sqftInput);
                        if (!sqf || sqf <= 0) return;
                        try {
                          const res = await api.updateLead(deal.id, { roof_sqf: sqf });
                          const newEstVal = res?.lead?.estimated_value != null ? Number(res.lead.estimated_value) : Math.round(sqf * 6.5);
                          const newSquares = res?.lead?.roof_squares != null ? Number(res.lead.roof_squares) : Math.round((sqf / 100) * 10) / 10;
                          setLeadDetail((prev: any) => ({
                            ...(prev || {}),
                            roof_sqf: sqf,
                            roof_squares: newSquares,
                            estimated_value: newEstVal,
                            raw_estimated_value: newEstVal,
                          }));
                          if (onUpdateDeal && deal) {
                            onUpdateDeal({
                              ...deal,
                              roofSqf: sqf,
                              value: newEstVal,
                              estimatedValue: newEstVal,
                            });
                          }
                          toast.success(`Roof size updated: ${sqf.toLocaleString()} sq ft ($${newEstVal.toLocaleString()})`);
                          setSqftEditOpen(false);
                        } catch (err) {
                          console.error('Failed to update sq ft:', err);
                          toast.error('Failed to update roof sq ft.');
                        }
                      }}
                      className="flex items-center gap-1.5 mt-1"
                    >
                      <input
                        type="number"
                        min={1}
                        max={50000}
                        step={25}
                        value={sqftInput}
                        onChange={e => setSqftInput(e.target.value)}
                        placeholder="e.g. 2500"
                        className="flex-1 text-xs px-2 py-1 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                        autoFocus
                      />
                      <button type="submit" className="text-[10px] font-bold px-2 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition-colors cursor-pointer">Save</button>
                      <button type="button" onClick={() => setSqftEditOpen(false)} className="text-[10px] font-bold px-2 py-1 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer">✕</button>
                    </form>
                  )}
                </div>

                <div className="p-3 rounded-2xl liquid-glass-tile space-y-1">
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">
                    Requested Service
                  </span>
                  <div>
                    <span
                      className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md ${getServiceBadgeClass(
                        deal.serviceColor
                      )}`}
                    >
                      {displayService}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-2xl liquid-glass-tile space-y-1 col-span-2 sm:col-span-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">
                      Appointment
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (rawScheduledAt) {
                          // Pre-fill picker with existing datetime (convert to local datetime-local format)
                          const dt = new Date(rawScheduledAt);
                          const pad = (n: number) => String(n).padStart(2, '0');
                          setScheduleInput(`${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`);
                        }
                        setShowScheduler(s => !s);
                      }}
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60 hover:bg-sky-100 dark:hover:bg-sky-900/50 transition-colors cursor-pointer"
                    >
                      {rawScheduledAt ? 'Reschedule' : '+ Schedule'}
                    </button>
                  </div>
                  {realAppointmentDate ? (
                    <>
                      <div className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                        <Calendar size={12} className="text-[#1878B8]" />
                        <span>{realAppointmentDate}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-[10px] text-slate-400 font-medium">{realAppointmentTime}</div>
                        <button
                          type="button"
                          onClick={handleCancelAppointment}
                          disabled={isScheduling}
                          className="text-[9px] font-bold text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          Cancel appt
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="text-xs text-slate-400 font-medium flex items-center gap-1">
                      <Calendar size={12} className="text-slate-300" />
                      <span>Not scheduled yet</span>
                    </div>
                  )}
                  {/* Inline datetime picker */}
                  {showScheduler && (
                    <div className="mt-1.5 space-y-1.5 pt-1.5 border-t border-slate-200/70 dark:border-white/10">
                      <input
                        type="datetime-local"
                        value={scheduleInput}
                        onChange={e => setScheduleInput(e.target.value)}
                        className="w-full text-[11px] px-2 py-1 rounded-lg border border-slate-300 dark:border-white/20 bg-white/80 dark:bg-white/5 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-400"
                      />
                      <button
                        type="button"
                        onClick={handleScheduleAppointment}
                        disabled={!scheduleInput || isScheduling}
                        className="w-full text-[10px] font-bold py-1 rounded-lg bg-[#1878B8] text-white hover:bg-[#1568a3] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center justify-center gap-1"
                      >
                        {isScheduling ? <Loader2 size={10} className="animate-spin" /> : <Calendar size={10} />}
                        {isScheduling ? 'Saving…' : (rawScheduledAt ? 'Update Appointment' : 'Confirm Appointment')}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Contact Channels */}
              <div className="p-3.5 rounded-2xl liquid-glass-tile space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10.5px] uppercase tracking-wider font-extrabold text-slate-500 dark:text-slate-400">
                    Contact Channels
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsEditContactOpen(true)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/80 dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/20 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-white/10 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                    title="Edit Contact Information"
                  >
                    <Edit3 size={11} />
                    <span>Edit Contact</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {/* Phone */}
                  <div className="flex items-center justify-between p-2 rounded-xl bg-white/70 dark:bg-white/5 border border-white/80 dark:border-white/10 shadow-2xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-sky-100/90 dark:bg-sky-950/50 text-[#0284c7] dark:text-sky-300 flex items-center justify-center shrink-0">
                        <Phone size={13} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] text-slate-400 font-medium">Direct Phone</div>
                        <div className="text-xs font-bold text-slate-800 dark:text-white truncate">{displayPhone || 'No Phone'}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {displayPhone && (
                        <button
                          onClick={() => handleCopy(displayPhone, 'phone')}
                          title="Copy phone"
                          className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
                        >
                          {copiedField === 'phone' ? (
                            <Check size={12} className="text-emerald-500" />
                          ) : (
                            <Copy size={12} />
                          )}
                        </button>
                      )}
                      {displayPhone && (
                        <a
                          href={getTelUrl(displayPhone)}
                          className="p-1 rounded-md hover:bg-sky-100 dark:hover:bg-sky-950/50 text-[#0284c7] dark:text-sky-300 transition-colors"
                          title="Dial now"
                        >
                          <ChevronRight size={14} />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Email */}
                  <div className="flex items-center justify-between p-2 rounded-xl bg-white/70 dark:bg-white/5 border border-white/80 dark:border-white/10 shadow-2xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-indigo-100/90 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 flex items-center justify-center shrink-0">
                        <Mail size={13} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] text-slate-400 font-medium">Email Address</div>
                        <div className="text-xs font-bold text-slate-800 dark:text-white truncate">{displayEmail || 'No Email'}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {displayEmail && (
                        <button
                          onClick={() => handleCopy(displayEmail, 'email')}
                          title="Copy email"
                          className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
                        >
                          {copiedField === 'email' ? (
                            <Check size={12} className="text-emerald-500" />
                          ) : (
                            <Copy size={12} />
                          )}
                        </button>
                      )}
                      {displayEmail && (
                        <a
                          href={getMailtoUrl(displayEmail)}
                          className="p-1 rounded-md hover:bg-indigo-100 dark:hover:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 transition-colors"
                          title="Compose email"
                        >
                          <ChevronRight size={14} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Property Location */}
              <div className="p-3.5 rounded-2xl liquid-glass-tile space-y-1.5">
                <span className="text-[10.5px] uppercase tracking-wider font-extrabold text-slate-500 dark:text-slate-400">
                  Property Site Address
                </span>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-white">
                    <MapPin size={13} className="text-[#1878B8] shrink-0" />
                    <span>{displayAddress}, {displayLocation}</span>
                  </div>
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(`${displayAddress}, ${displayLocation}`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:text-sky-800 dark:hover:text-sky-300 flex items-center gap-1"
                  >
                    <span>View Map</span>
                    <ExternalLink size={11} />
                  </a>
                </div>
              </div>

              {/* Latest Move Note Highlight Card */}
              {latestMoveActivity && (
                <div className="p-3.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200/90 dark:border-amber-800/40 shadow-2xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="p-1 rounded-md bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300">
                        <MoveRight size={12} />
                      </span>
                      <span className="text-[11px] font-extrabold text-amber-900 dark:text-amber-200">
                        Latest Pipeline Move Note
                      </span>
                    </div>
                    <span className="text-[10px] font-medium text-amber-700 dark:text-amber-300">
                      {formatRelativeTime(latestMoveActivity.created_at)}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-slate-800 dark:text-white">
                    {latestMoveActivity.title}
                  </div>
                  {latestMoveActivity.description && (
                    <p className="text-xs text-slate-700 dark:text-slate-300 italic bg-white/70 dark:bg-white/5 p-2 rounded-xl border border-amber-200/60 dark:border-amber-800/30">
                      "{latestMoveActivity.description}"
                    </p>
                  )}
                  <div className="text-[10.5px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                    <User size={10} className="text-slate-400" />
                    <span>Logged by {latestMoveActivity.performed_by || latestMoveActivity.user_name || 'Owner'}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 2: SCHEDULE & ACTIVITY (Real Database Timeline)            */}
          {/* ============================================================== */}
          {activeTab === 'timeline' && (
            <div className="space-y-4 p-1">
              {/* Timeline Header & Quick Log Trigger */}
              <div className="flex items-center justify-between pb-1">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Touchpoint &amp; Stage Movement Stream
                </span>
                <button
                  onClick={() => setShowLogDrawer(!showLogDrawer)}
                  className="text-xs font-bold text-[#1878B8] hover:text-sky-700 dark:hover:text-sky-300 flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={13} />
                  <span>{showLogDrawer ? 'Cancel' : 'Log Touchpoint'}</span>
                </button>
              </div>

              {/* Quick Log Inline Box */}
              {showLogDrawer && (
                <div className="p-3.5 rounded-2xl bg-sky-50/90 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/40 shadow-sm space-y-2.5 animate-in fade-in duration-150">
                  <div className="flex items-center gap-1 text-xs">
                    {(['call', 'sms', 'email', 'meeting', 'note'] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setLogMethod(m)}
                        className={`px-2 py-1 rounded-lg font-bold text-[11px] capitalize transition-all cursor-pointer ${
                          logMethod === m
                            ? 'bg-[#1878B8] text-white shadow-2xs'
                            : 'bg-white dark:bg-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/20'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                  <textarea
                    rows={2}
                    value={logNotes}
                    onChange={(e) => setLogNotes(e.target.value)}
                    placeholder="Enter touchpoint details or follow-up note..."
                    className="w-full text-xs p-2.5 rounded-xl border border-sky-300 dark:border-sky-700/50 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold placeholder:text-slate-400 dark:placeholder:text-slate-500 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all shadow-2xs"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setShowLogDrawer(false)}
                      className="px-3 py-1 rounded-lg text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleLogTouchpoint}
                      disabled={!logNotes.trim() || isLogging}
                      className="px-3 py-1 rounded-lg bg-[#1878B8] hover:bg-[#14649a] text-white text-xs font-bold flex items-center gap-1 disabled:opacity-50 cursor-pointer shadow-xs"
                    >
                      {isLogging ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                      <span>Save Touchpoint</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Continuous Vertical Timeline */}
              <div className="space-y-4 relative pl-5 border-l-2 border-sky-300/60 dark:border-sky-700/40 ml-2.5">
                {/* 1. Real Database Activities (Newest first) */}
                {activities.map((act) => {
                  const isStageMove = act.activity_type === 'stage_changed';
                  const isNote = act.activity_type === 'note';
                  const isComm = act.activity_type === 'communication';

                  const dotColor = isStageMove
                    ? 'bg-amber-500 ring-amber-100 dark:ring-amber-950'
                    : isNote
                    ? 'bg-purple-500 ring-purple-100 dark:ring-purple-950'
                    : isComm
                    ? 'bg-sky-500 ring-sky-100 dark:ring-sky-950'
                    : 'bg-[#1878B8] ring-sky-100 dark:ring-sky-950';

                  return (
                    <div key={act.id} className="relative group">
                      {/* Node circle */}
                      <div
                        className={`absolute -left-[27px] top-0.5 w-3.5 h-3.5 rounded-full ring-4 ${dotColor}`}
                      />
                      <div className="flex items-baseline justify-between gap-2">
                        <div className="text-xs font-bold text-slate-800 dark:text-white">
                          {act.title}
                        </div>
                        <span className="text-[10px] font-medium text-slate-400 shrink-0">
                          {formatRelativeTime(act.created_at)}
                        </span>
                      </div>

                      {/* Author / Attribution */}
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                        <User size={10} className="text-slate-400" />
                        <span>By {act.performed_by || act.user_name || 'Staff Member'}</span>
                      </div>

                      {/* Move Note / Body Description */}
                      {act.description && (
                        <div
                          className={`mt-1.5 text-[11.5px] p-2.5 rounded-xl border leading-relaxed ${
                            isStageMove
                              ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/40 text-amber-950 dark:text-amber-200 font-medium'
                              : isNote
                              ? 'bg-purple-50/70 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800/40 text-purple-950 dark:text-purple-200 font-medium'
                              : 'bg-white/80 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {act.description}
                        </div>
                      )}
                    </div>
                  );
                })}

                {activities.length === 0 && (
                  <div className="py-6 text-center text-xs text-slate-400 font-medium">
                    No touchpoints or stage movements recorded yet.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 3: FIELD NOTES (Profile Attributed & Synced to DB)          */}
          {/* ============================================================== */}
          {activeTab === 'notes' && (
            <ProfileNotesFeed
              rawNotes={notes}
              title="Roofer &amp; Estimator Field Notes"
              subtitle="Profile-attributed field observations, tile specifications, and project updates."
              onAddNote={async (serializedNote, plainContent) => {
                const updated = notes ? `${notes}\n\n${serializedNote}` : serializedNote;
                setNotes(updated);
                if (deal?.id) {
                  try {
                    // 1. Persist updated notes directly to DB leads table
                    await api.updateLead(deal.id, { notes: updated });
                    // 2. Persist audit activity row in activities table
                    await api.addLeadActivity(deal.id, {
                      title: 'Estimator Note',
                      description: plainContent || serializedNote,
                      activityType: 'note',
                    });
                    // 3. Refresh activities list
                    await fetchLeadData(deal.id);
                  } catch (e) {
                    console.warn('API sync deferred for deal note:', e);
                  }
                }
              }}
              maxHeight="280px"
            />
          )}
        </div>

        {/* Contract Sent awaiting signature status indicator */}
        {displayStageKey === 'contract_sent' && (
          <div className="px-0 pt-0 pb-1 shrink-0">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-700/40">
              <FileText size={13} className="text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300">
                Contract Sent — Awaiting Client Signature
              </span>
            </div>
          </div>
        )}

        {/* Contract Studio Action — strictly allowed only when lead is in estimate_sent stage */}
        {displayStageKey === 'estimate_sent' && (
          <div className="px-0 pt-0 pb-1 space-y-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                onClose();
                window.location.href = `/contracts?mode=studio&leadId=${deal.id}&name=${encodeURIComponent(deal.customerName)}&address=${encodeURIComponent(deal.address || '')}&phone=${encodeURIComponent(deal.phone || '')}&email=${encodeURIComponent(deal.email || '')}&value=${deal.value || ''}`;
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-[#1a5ba5] hover:bg-[#154a87] text-white font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
            >
              <FileText size={15} />
              <span>Open Contract Studio</span>
            </button>
          </div>
        )}

        {/* Footer Quick Controls */}
        <div className="pt-3 border-t border-slate-200/70 dark:border-white/10 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-400 font-medium">
            Last modified: <strong className="text-slate-600 dark:text-slate-300">{displayRelativeTime}</strong>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl liquid-glass-btn text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white shadow-2xs transition-all cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  );

  return (
    <>
      {portal}
      {showContractBuilder && (
        <ContractBuilderModal
          deal={deal}
          isOpen={showContractBuilder}
          onClose={() => setShowContractBuilder(false)}
          onContractSent={() => {
            setShowContractBuilder(false);
            if (onUpdateDeal) onUpdateDeal(deal);
          }}
        />
      )}
      <ClaimLeadModal
        isOpen={isClaimModalOpen}
        leadId={deal.id}
        leadName={displayName}
        service={displayService}
        value={displayValue}
        location={`${displayAddress}, ${displayLocation}`}
        onClose={() => setIsClaimModalOpen(false)}
        onConfirm={handleClaim}
      />
      {deal && (
        <ReassignLeadModal
          isOpen={isReassignModalOpen}
          leadId={deal.id}
          leadName={displayName}
          currentAssigneeId={deal.assignedToUserId || leadDetail?.assigned_to_user_id}
          currentAssigneeName={deal.assignedToName || (deal as any).estimator?.name || leadDetail?.assigned_to_name}
          onClose={() => setIsReassignModalOpen(false)}
          onSuccess={async () => {
            await fetchLeadData(deal.id);
            if (onUpdateDeal) onUpdateDeal(deal);
          }}
        />
      )}
      {/* Client 360 Source of Truth Edit Contact Modal */}
      {isEditContactOpen && (
        <ClientEditContactModal
          isOpen={isEditContactOpen}
          onClose={() => setIsEditContactOpen(false)}
          clientName={displayName}
          clientId={(deal as any).clientId || (deal as any).client_id || leadDetail?.client_id}
          initialData={{
            name: displayName,
            email: displayEmail,
            phone: displayPhone,
            address: displayAddress,
            city: displayCity,
            zip: displayZip,
          }}
          onSave={handleSaveContact}
        />
      )}
    </>
  );
}
