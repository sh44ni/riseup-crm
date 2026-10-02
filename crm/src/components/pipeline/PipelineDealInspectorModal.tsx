import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Award,
  XCircle,
  CalendarClock,
  ArrowRight,
  Camera,
  FileText,
  User,
  ExternalLink,
  Copy,
  Check,
  Sparkles,
  Edit3,
} from 'lucide-react';
import {
  PipelineDealItem,
  PipelineStageId,
  PIPELINE_STAGES,
  LOSS_REASONS,
  THREE_OUTCOMES,
} from './pipelineTypes';
import { ProfileNotesFeed } from '@/components/common/ProfileNotesFeed';
import { api } from '@/lib/api';
import { updatePipelineDealStage, toggleChecklistItem } from '@/api/pipelineApi';
import { useAuth } from '@/context/AuthContext';
import { getTelUrl, getMailtoUrl, getSmsUrl } from '@/utils/contactValidation';
import { ClientEditContactModal, ClientContactData } from '@/components/clients/ClientEditContactModal';
import { broadcastContactUpdated } from '@/utils/syncEventBus';
import { DealValueBadge } from '@/components/shared/DealValueBadge';

interface PipelineDealInspectorModalProps {
  deal: PipelineDealItem | null;
  isOpen: boolean;
  onClose: () => void;
  onAdvanceStage: (dealId: string, nextStage: PipelineStageId) => void;
  onUpdateDeal: (updatedDeal: PipelineDealItem) => void;
  onOpenFollowUpModal?: (deal: PipelineDealItem) => void;
}

export function PipelineDealInspectorModal({
  deal,
  isOpen,
  onClose,
  onAdvanceStage,
  onUpdateDeal,
  onOpenFollowUpModal,
}: PipelineDealInspectorModalProps) {
  const { user } = useAuth();
  const canViewFinances = user?.role ? ['admin', 'manager', 'owner', 'super_admin', 'sales_rep', 'estimator', 'senior_estimator'].includes(user.role.toLowerCase()) : false;
  const [activeTab, setActiveTab] = useState<'workflow' | 'details' | 'outcome'>('workflow');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [selectedLossReason, setSelectedLossReason] = useState<string>(LOSS_REASONS[0]);
  const [lossNotesInput, setLossNotesInput] = useState<string>('');
  const [isEditContactOpen, setIsEditContactOpen] = useState(false);

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
        clientId: (deal as any).clientId || (deal as any).client_id,
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        city: data.city,
        zip: data.zip,
      });

      const updated: PipelineDealItem = {
        ...deal,
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        city: data.city,
      };
      onUpdateDeal(updated);
    } catch (err: any) {
      console.error('Failed to update contact in Pipeline:', err);
      throw err;
    }
  };

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

  if (!isOpen || !deal) return null;

  const currentStageIndex = PIPELINE_STAGES.findIndex((s) => s.id === deal.stageId);
  const currentStage = currentStageIndex >= 0 ? PIPELINE_STAGES[currentStageIndex] : null;
  const nextStage = currentStageIndex >= 0 && currentStageIndex < PIPELINE_STAGES.length - 1
    ? PIPELINE_STAGES[currentStageIndex + 1]
    : null;

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const toggleChecklist = async (checkId: string) => {
    const target = deal.checklist.find((item) => item.id === checkId);
    const nextDone = !target?.done;
    const updated = {
      ...deal,
      checklist: deal.checklist.map((item) =>
        item.id === checkId ? { ...item, done: nextDone } : item
      ),
    };
    onUpdateDeal(updated);
    try {
      await toggleChecklistItem(deal.id, checkId, nextDone, deal.stageId);
    } catch (e) {
      console.warn('Failed to persist checklist item toggle:', e);
    }
  };

  const handleAddNote = async (serializedNote: string, plainContent?: string) => {
    const updatedNotes = deal.notes ? `${deal.notes}\n\n${serializedNote}` : serializedNote;
    const updated: PipelineDealItem = {
      ...deal,
      notes: updatedNotes,
    };
    onUpdateDeal(updated);
    try {
      // 1. Permanently persist updated notes string to leads table in PostgreSQL
      await api.updateLead(deal.id, { notes: updatedNotes });
      // 2. Permanently record immutable activity log in activities table
      await api.addLeadActivity(deal.id, {
        title: 'Estimator Note',
        description: plainContent || serializedNote,
        activityType: 'note',
        authorName: user?.name || 'Staff',
        authorRole: user?.role || 'Estimator',
      });
    } catch (e) {
      console.warn('API sync deferred for inspector deal note:', e);
    }
  };

  const handleMarkOutcome = (outcome: 'closed_won' | 'closed_lost') => {
    let updated: PipelineDealItem = { ...deal };
    if (outcome === 'closed_won') {
      updated.stageId = 'contract_signed';
      updated.slaStatus = 'on_track';
      updated.slaText = 'Job Sold 🎉 • Handoff Complete';
    } else if (outcome === 'closed_lost') {
      updated.stageId = 'closed_lost';
      updated.lossReason = selectedLossReason;
      updated.lossNotes = lossNotesInput || 'Marked as lost during cadence follow-up.';
      updated.slaStatus = 'on_track';
      updated.slaText = 'Archived • Lost Lead';
    }
    onUpdateDeal(updated);
    onClose();
  };

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xl animate-in fade-in duration-200"
    >
      <div
        className="relative w-full max-w-2xl rounded-3xl bg-white/95 dark:bg-[#0B1320]/95 backdrop-blur-3xl border border-white/95 dark:border-white/10 shadow-[0_25px_90px_rgba(0,0,0,0.40),0_0_0_1px_rgba(255,255,255,0.9)_inset] dark:shadow-[0_25px_90px_rgba(0,0,0,0.85)] p-6 space-y-5 animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto no-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Strip */}
        <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-200/70 dark:border-white/10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/25">
                {currentStage ? currentStage.shortTitle : deal.stageId}
              </span>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">ID: #{deal.id.toUpperCase()}</span>
            </div>
            <h2 className="text-xl font-black text-[#1F1F1F] dark:text-white tracking-tight">{deal.name}</h2>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              <MapPin size={12} className="text-[#1878B8]" />
              <span>{deal.address}, {deal.city}, CA</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditContactOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              title="Edit contact info"
            >
              <Edit3 size={12} />
              <span>Edit Info</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl liquid-glass-btn text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 bg-white/50 dark:bg-white/5 p-1 rounded-xl border border-white/80 dark:border-white/10 backdrop-blur-md text-xs font-bold">
          <button
            onClick={() => setActiveTab('workflow')}
            className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'workflow'
                ? 'bg-gradient-to-r from-[#1878B8] to-[#55C4F5] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/10'
            }`}
          >
            SOP Cadence &amp; Checklist
          </button>
          <button
            onClick={() => setActiveTab('details')}
            className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'details'
                ? 'bg-gradient-to-r from-[#1878B8] to-[#55C4F5] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/10'
            }`}
          >
            Quote &amp; Contact Info
          </button>
          <button
            onClick={() => setActiveTab('outcome')}
            className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'outcome'
                ? 'bg-gradient-to-r from-[#1878B8] to-[#55C4F5] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/10'
            }`}
          >
            Mandatory Outcome
          </button>
        </div>

        {/* TAB 1: WORKFLOW & SOP CHECKLIST */}
        {activeTab === 'workflow' && (
          <div className="space-y-4">
            {/* 11-Step Progress Mini Stepper */}
            <div className="p-3.5 rounded-2xl liquid-glass-tile space-y-2">
              <div className="flex items-center justify-between text-[11px] font-extrabold text-slate-600 dark:text-slate-300">
                <span>Estimate Sending Progress</span>
                <span className="text-[#1878B8] dark:text-sky-400">
                  Step {currentStage ? currentStage.stepNumber : 1} of 11
                </span>
              </div>

              <div className="grid grid-cols-11 gap-1">
                {PIPELINE_STAGES.map((s, idx) => {
                  const isPassed = currentStageIndex > idx;
                  const isCurrent = currentStageIndex === idx;

                  return (
                    <div
                      key={s.id}
                      title={`${s.stepNumber}. ${s.shortTitle} (${s.timingLabel})`}
                      className={`h-2 rounded-full transition-all ${
                        isCurrent
                          ? 'bg-[#1878B8] ring-2 ring-sky-300 dark:ring-sky-700 ring-offset-1 dark:ring-offset-slate-900'
                          : isPassed
                          ? 'bg-emerald-500'
                          : 'bg-slate-200 dark:bg-white/10'
                      }`}
                    />
                  );
                })}
              </div>
            </div>

            {/* Current Step SOP Box */}
            {currentStage && (
              <div className="p-4 rounded-2xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200/80 dark:border-sky-800/40 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10.5px] font-black uppercase tracking-wider text-[#1878B8] dark:text-sky-400">
                    Current Step: {currentStage.title}
                  </span>
                  <span className="text-[10.5px] font-extrabold px-2 py-0.5 rounded-md bg-white dark:bg-white/10 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800/50">
                    {currentStage.timingLabel}
                  </span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                  {currentStage.sopGoal}
                </p>
              </div>
            )}

            {/* 24-Hour Review Window Alert for Estimate Sent */}
            {deal.stageId === 'estimate_sent' && (
              <div className="p-3.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 shadow-2xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                    <Clock size={13} className="text-amber-600 dark:text-amber-400 animate-pulse" />
                    <span>24-Hour Review Cadence</span>
                  </span>
                  <span className="text-[10.5px] font-extrabold px-2 py-0.5 rounded-md bg-amber-200/90 dark:bg-amber-900/50 text-amber-950 dark:text-amber-200">
                    {deal.hoursUntilAutoMove !== null && deal.hoursUntilAutoMove !== undefined
                      ? deal.hoursUntilAutoMove > 0
                        ? `${deal.hoursUntilAutoMove}h until Follow-Up`
                        : 'Follow-Up Due'
                      : '24h Window Active'}
                  </span>
                </div>
                <p className="text-xs text-amber-900/90 dark:text-amber-200/90 font-medium">
                  First follow-up reminder is scheduled for 24 hours after estimate dispatch to check in on proposal review.
                </p>
              </div>
            )}

            {/* Follow-Up SLA Box & Quick Contact Reset */}
            {deal.stageId === 'follow_up' && (
              <div
                className={`p-4 rounded-2xl border shadow-2xs space-y-2.5 ${
                  deal.isFollowupOverdue
                    ? 'bg-red-50/90 dark:bg-red-950/30 border-red-300 dark:border-red-800/50 ring-1 ring-red-400/30'
                    : 'bg-purple-50/80 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${
                      deal.isFollowupOverdue ? 'text-red-700 dark:text-red-400' : 'text-purple-800 dark:text-purple-300'
                    }`}
                  >
                    <Clock size={14} className={deal.isFollowupOverdue ? 'animate-pulse text-red-600' : 'text-purple-600'} />
                    <span>{deal.isFollowupOverdue ? '⚠️ Overdue Contact SLA' : '48-Hour Follow-Up Cadence Active'}</span>
                  </span>
                  <span
                    className={`text-[10.5px] font-black px-2 py-0.5 rounded-md ${
                      deal.isFollowupOverdue ? 'bg-red-600 text-white animate-pulse' : 'bg-purple-200 dark:bg-purple-900/50 text-purple-900 dark:text-purple-200'
                    }`}
                  >
                    {deal.followupHoursRemaining !== undefined
                      ? deal.followupHoursRemaining <= 48
                        ? `${deal.followupHoursRemaining}h remaining`
                        : `${deal.followupDaysRemaining ?? 0}d remaining`
                      : 'Active SLA'}
                  </span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300">
                  {deal.isFollowupOverdue
                    ? 'This deal has exceeded the follow-up window and requires immediate outreach to reset the SLA.'
                    : 'Log phone, SMS, email, or in-person outreach to document contact and automatically reset the 48-hour follow-up window.'}
                </p>
                {onOpenFollowUpModal && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenFollowUpModal(deal);
                      onClose();
                    }}
                    className={`w-full py-2.5 px-3 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs hover:shadow transition-all ${
                      deal.isFollowupOverdue
                        ? 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white'
                        : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white'
                    }`}
                  >
                    <Phone size={13} />
                    <span>Log Follow-Up Outreach (Reset Timer to +48 Hours)</span>
                  </button>
                )}
              </div>
            )}

            {/* Action Checklist */}
            <div className="p-4 rounded-2xl liquid-glass-tile space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Step Gate Checklist
                </span>
                <span className="text-[10px] font-bold text-slate-400">
                  {deal.checklist.filter((c) => c.done).length} / {deal.checklist.length} Completed
                </span>
              </div>

              <div className="space-y-1.5">
                {deal.checklist.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => toggleChecklist(item.id)}
                    className={`flex items-center gap-2.5 p-2 rounded-xl transition-all cursor-pointer border ${
                      item.done
                        ? 'bg-emerald-500/10 dark:bg-emerald-950/30 border-emerald-500/25 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300'
                        : 'bg-white/70 dark:bg-white/5 border-white/90 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-white/10'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-md flex items-center justify-center border transition-all ${
                        item.done
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'border-slate-300 dark:border-white/20 bg-white dark:bg-white/5'
                      }`}
                    >
                      {item.done && <Check size={11} />}
                    </div>
                    <span className={`text-xs font-semibold ${item.done ? 'line-through text-slate-400 dark:text-slate-500' : ''}`}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Advance to Next Stage CTA */}
            {nextStage && (
              <div className="flex items-center justify-between p-3 rounded-2xl bg-white/70 dark:bg-white/5 border border-white/90 dark:border-white/10 shadow-2xs">
                <div>
                  <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">Next Milestone</div>
                  <div className="text-xs font-black text-slate-800 dark:text-white">{nextStage.title}</div>
                </div>
                <button
                  onClick={() => {
                    onAdvanceStage(deal.id, nextStage.id);
                    onClose();
                  }}
                  className="flex items-center gap-1 text-xs font-black px-4 py-2 rounded-xl bg-gradient-to-r from-[#1878B8] to-[#55C4F5] text-white shadow-sm hover:opacity-95 transition-all cursor-pointer"
                >
                  <span>Advance Stage</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: QUOTE & CONTACT INFO */}
        {activeTab === 'details' && (
          <div className="space-y-4">
            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <div className="p-3 rounded-2xl liquid-glass-tile space-y-1">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">
                  Deal Value
                </span>
                <div className="text-base font-black text-slate-800 dark:text-white">
                  <DealValueBadge
                    contractValue={deal.contractValue ?? (deal as any).contract_value}
                    estimateTotal={deal.estimateTotal ?? (deal as any).estimate_total}
                    estimatedValue={deal.estimatedValue ?? (deal as any).raw_estimated_value ?? (deal as any).estimated_value}
                    roofSqf={deal.roofSqf ?? (deal as any).roof_sqf}
                    proposalSentAt={deal.proposalSentDate || (deal as any).proposalSentAt}
                    isUploadedEstimate={deal.isUploadedEstimate ?? (deal as any).is_uploaded_estimate}
                    estimateTemplateKey={deal.estimateTemplateKey ?? (deal as any).estimate_template_key}
                    isContractSigned={deal.isContractSigned}
                    stageId={deal.stageId}
                    canViewFinances={canViewFinances}
                    size="sm"
                  />
                </div>
              </div>

              <div className="p-3 rounded-2xl liquid-glass-tile space-y-1">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">
                  Roof Service
                </span>
                <div className="text-xs font-black text-slate-800 dark:text-white truncate">
                  {deal.service}
                </div>
              </div>

              <div className="p-3 rounded-2xl liquid-glass-tile space-y-1 col-span-2 sm:col-span-1">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">
                  Assigned Estimator
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <img
                    src={deal.estimator.avatar}
                    alt={deal.estimator.name}
                    className="w-5 h-5 rounded-full object-cover border border-white dark:border-white/10"
                  />
                  <span className="text-xs font-bold text-slate-800 dark:text-white">{deal.estimator.name}</span>
                </div>
              </div>
            </div>

            {/* Direct Channels */}
            <div className="p-3.5 rounded-2xl liquid-glass-tile space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10.5px] uppercase tracking-wider font-extrabold text-slate-500 dark:text-slate-400">
                  Direct Contact Triggers
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
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/70 dark:bg-white/5 border border-white/80 dark:border-white/10 shadow-2xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-sky-100/90 dark:bg-sky-950/50 text-[#0284c7] dark:text-sky-300 flex items-center justify-center shrink-0">
                      <Phone size={13} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] text-slate-400 font-medium">Direct Phone</div>
                      <div className="text-xs font-bold text-slate-800 dark:text-white truncate">{deal.phone}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleCopy(deal.phone, 'phone')}
                      className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                    >
                      {copiedField === 'phone' ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                    </button>
                    <a
                      href={getTelUrl(deal.phone)}
                      className="p-1.5 rounded-lg bg-sky-500/15 text-[#1878B8] dark:text-sky-400 hover:bg-[#1878B8] hover:text-white transition-colors"
                      title="Call Now"
                    >
                      <Phone size={12} />
                    </a>
                  </div>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/70 dark:bg-white/5 border border-white/80 dark:border-white/10 shadow-2xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-indigo-100/90 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 flex items-center justify-center shrink-0">
                      <Mail size={13} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] text-slate-400 font-medium">Email Address</div>
                      <div className="text-xs font-bold text-slate-800 dark:text-white truncate">{deal.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleCopy(deal.email, 'email')}
                      className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                    >
                      {copiedField === 'email' ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                    </button>
                    <a
                      href={getMailtoUrl(deal.email)}
                      className="p-1.5 rounded-lg bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-600 hover:text-white transition-colors"
                      title="Compose Email"
                    >
                      <Mail size={12} />
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Profile-Based Estimator Field Notes */}
            <div className="p-3.5 rounded-2xl liquid-glass-tile">
              <ProfileNotesFeed
                rawNotes={deal.notes}
                title="Estimator Field Notes"
                subtitle="Field measurements, roof scope requirements, and customer preferences."
                onAddNote={handleAddNote}
                maxHeight="220px"
              />
            </div>
          </div>
        )}

        {/* TAB 3: RESOLVE OUTCOME */}
        {activeTab === 'outcome' && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10">
              <div className="text-xs font-black text-slate-800 dark:text-white">
                Rise Up Pipeline Outcome Mandate
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                Every lead must end in one of these three outcomes. Select the outcome to finalize or reschedule this opportunity.
              </p>
            </div>

            {/* Option 1: Closed Won */}
            <div className="p-4 rounded-2xl border border-emerald-300 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-950/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-black text-sm">
                  <Award size={18} />
                  <span>1. Closed Won / Job Sold</span>
                </div>
                <button
                  onClick={() => handleMarkOutcome('closed_won')}
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-xs transition-all cursor-pointer"
                >
                  Mark Won 🎉
                </button>
              </div>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                Contract signed, deposit collected. Automatically transitions deal to Project Management.
              </p>
            </div>

            {/* Option 2: Closed Lost */}
            <div className="p-4 rounded-2xl border border-rose-300 dark:border-rose-800/50 bg-rose-50/50 dark:bg-rose-950/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300 font-black text-sm">
                  <XCircle size={18} />
                  <span>2. Closed Lost</span>
                </div>
                <button
                  onClick={() => handleMarkOutcome('closed_lost')}
                  className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-xs transition-all cursor-pointer"
                >
                  Confirm Loss
                </button>
              </div>
              <div className="space-y-2">
                <label className="text-[10.5px] font-bold text-slate-600 dark:text-slate-300">
                  Mandatory Root Cause Reason:
                </label>
                <select
                  value={selectedLossReason}
                  onChange={(e) => setSelectedLossReason(e.target.value)}
                  className="w-full text-xs font-semibold bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800/50 rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none"
                >
                  {LOSS_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Optional autopsy notes (e.g. competitor bid $19.5k)..."
                  value={lossNotesInput}
                  onChange={(e) => setLossNotesInput(e.target.value)}
                  className="w-full text-xs bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800/50 rounded-xl px-3 py-2 text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Client 360 Source of Truth Edit Contact Modal */}
      {isEditContactOpen && (
        <ClientEditContactModal
          isOpen={isEditContactOpen}
          onClose={() => setIsEditContactOpen(false)}
          clientName={deal.name}
          clientId={(deal as any).clientId || (deal as any).client_id}
          initialData={{
            name: deal.name,
            email: deal.email || '',
            phone: deal.phone || '',
            address: deal.address || '',
            city: deal.city || '',
            zip: (deal as any).zip || '',
          }}
          onSave={handleSaveContact}
        />
      )}
    </div>,
    document.body
  );
}
