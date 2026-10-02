import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  CheckCircle2,
  MapPin,
  UserCheck,
  UserCog,
  X,
  RotateCcw,
  Phone,
  Mail,
  Zap,
  Globe,
  Lock,
  FileText,
  Send,
  Loader2,
  AlertTriangle,
  ArrowUpRight,
  Edit3,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { LOSS_REASONS } from '@/components/leads/MarkLeadLostModal';
import { Lead } from '@/types/leadTypes';
import { getTelUrl, getMailtoUrl, getSmsUrl } from '@/utils/contactValidation';
import { ClientEditContactModal, ClientContactData } from '@/components/clients/ClientEditContactModal';
import { leadsApi } from '@/api/leadsApi';
import { broadcastContactUpdated } from '@/utils/syncEventBus';
import { DealValueText } from '@/components/shared/DealValueBadge';


export interface LeadInspectModalProps {
  lead: Lead;
  onClose: () => void;
  onMarkLost: (reason: string, notes?: string) => void;
  onReactivate: () => void;
  onAdvance?: (stage: Lead['status']) => void;
  onAddNote?: (note: string) => Promise<void> | void;
  onClaim?: (lead: Lead) => void;
  onReassign?: (lead: Lead) => void;
  onUpdateContact?: (data: {
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    zip: string;
  }) => Promise<void>;
  getServiceBadgeClass: (color: string) => string;
}

function getSourceBadges(lead: Lead): {
  type: 'website' | 'manual';
  mainLabel: string;
  detailLabel: string | null;
} {
  const isWeb = lead.source === 'website';
  return {
    type: isWeb ? 'website' : 'manual',
    mainLabel: isWeb ? 'Website Lead' : 'Manual Intake',
    detailLabel: lead.leadSourceDetail || null,
  };
}

export function LeadInspectModal({
  lead,
  onClose,
  onMarkLost,
  onReactivate,
  onAddNote,
  onClaim,
  onReassign,
  onUpdateContact,
  getServiceBadgeClass,
}: LeadInspectModalProps) {
  const { can, isOwner } = useAuth();
  const canViewFinances = isOwner || can('finances.view');
  const canClaimLead = isOwner || can('leads.claim');
  const canReassignLead = isOwner || can('leads.reassign');

  const [currentLead, setCurrentLead] = useState<Lead>(lead);
  const [isEditContactOpen, setIsEditContactOpen] = useState(false);

  useEffect(() => {
    setCurrentLead(lead);
  }, [lead]);

  const [showLostPicker, setShowLostPicker] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string>('competitor_price');
  const [customReasonText, setCustomReasonText] = useState('');
  const [lossNoteInput, setLossNoteInput] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [generalNoteText, setGeneralNoteText] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);

  const handleSaveContact = async (data: ClientContactData) => {
    try {
      if (onUpdateContact) {
        await onUpdateContact(data);
      } else {
        await leadsApi.updateLead(currentLead.id, {
          full_name: data.name,
          email: data.email,
          phone: data.phone,
          address: data.address,
          city: data.city,
          zip: data.zip,
        });
        broadcastContactUpdated({
          leadId: currentLead.id,
          clientId: (currentLead as any).clientId || (currentLead as any).client_id,
          name: data.name,
          email: data.email,
          phone: data.phone,
          address: data.address,
          city: data.city,
          zip: data.zip,
        });
      }

      setCurrentLead((prev) => ({
        ...prev,
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        city: data.city,
        zip: data.zip,
      }));
      triggerToast('Contact details saved to Client 360 source of truth!');
    } catch (err: any) {
      triggerToast(err?.message || 'Failed to update contact details.');
      throw err;
    }
  };

  const handleSaveGeneralNote = async () => {
    const trimmed = generalNoteText.trim();
    if (!trimmed || isSavingNote) return;
    setIsSavingNote(true);
    try {
      if (onAddNote) {
        await onAddNote(trimmed);
        triggerToast('Note saved');
      }
      setGeneralNoteText('');
    } catch (err) {
      console.error('Failed to save note:', err);
    } finally {
      setIsSavingNote(false);
    }
  };

  const isLost = lead.status === 'lost';
  const isCustomReason = selectedReason === 'custom';
  const canConfirmLost = !isCustomReason || customReasonText.trim().length > 0;

  // Prevent background scrolling while modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleConfirmLost = () => {
    if (!canConfirmLost) return;
    const finalReason = (isCustomReason ? customReasonText.trim() : selectedReason) || 'other';
    onMarkLost(finalReason, lossNoteInput);
    setShowLostPicker(false);
    triggerToast('Lead successfully marked as Lost opportunity');
  };

  const handleConfirmReactivate = () => {
    onReactivate();
    triggerToast('Lead reactivated! Moved to Contacted stage');
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] bg-slate-950/65 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl bg-white/95 dark:bg-[#0B1320]/95 backdrop-blur-3xl rounded-3xl border border-white/95 dark:border-white/10 shadow-[0_25px_90px_rgba(0,0,0,0.40)] dark:shadow-[0_25px_90px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col max-h-[90vh] text-slate-800 dark:text-slate-100 relative animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Toast Alert */}
        {toastMsg && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-xs font-bold shadow-xl flex items-center gap-2 animate-in slide-in-from-top duration-200 border border-white/10" role="status" aria-live="polite">
            <CheckCircle2 size={14} className="text-emerald-400" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200/80 dark:border-white/10 bg-slate-50/80 dark:bg-white/5 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-white text-sm shadow-sm shrink-0 ${
                isLost ? 'bg-slate-400 dark:bg-slate-700' : 'bg-gradient-to-tr from-[#1878B8] to-[#55C4F5]'
              }`}
            >
              {currentLead.name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-black text-slate-900 dark:text-white leading-tight truncate">{currentLead.name}</h2>
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${getServiceBadgeClass(
                    currentLead.serviceColor
                  )}`}
                >
                  {currentLead.service}
                </span>
                {isLost && (
                  <span className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 text-[10px] font-bold">
                    ❌ Lost Lead
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                {currentLead.phone && (
                  <a
                    href={getTelUrl(currentLead.phone)}
                    className="flex items-center gap-1 hover:text-[#1878B8] dark:hover:text-sky-400 transition-colors"
                    title={`Call ${currentLead.phone}`}
                  >
                    <Phone size={11} className="text-slate-400 dark:text-slate-500 shrink-0" />
                    <span>{currentLead.phone}</span>
                  </a>
                )}
                {currentLead.email && (
                  <a
                    href={getMailtoUrl(currentLead.email)}
                    className="flex items-center gap-1 hover:text-[#1878B8] dark:hover:text-sky-400 transition-colors"
                    title={`Email ${currentLead.email}`}
                  >
                    <Mail size={11} className="text-slate-400 dark:text-slate-500 shrink-0" />
                    <span className="truncate max-w-[180px]">{currentLead.email}</span>
                  </a>
                )}
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(
                    `${currentLead.address}, ${currentLead.city} CA ${currentLead.zip}`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 hover:text-[#1878B8] dark:hover:text-sky-400 transition-colors"
                  title="View on Google Maps"
                >
                  <MapPin size={11} className="text-slate-400 dark:text-slate-500 shrink-0" />
                  <span>{currentLead.address}, {currentLead.city}, CA {currentLead.zip}</span>
                </a>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsEditContactOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              title="Edit contact info (Name, Phone, Email, Address)"
            >
              <Edit3 size={12} />
              <span>Edit Info</span>
            </button>

            {(!currentLead.isClaimed && (!currentLead.assignedRep || currentLead.assignedRep === 'Unassigned')) && canClaimLead && onClaim && (
              <button
                type="button"
                onClick={() => onClaim(currentLead)}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <UserCheck size={12} />
                <span>Claim Lead</span>
              </button>
            )}

            {(currentLead.isClaimed || (currentLead.assignedRep && currentLead.assignedRep !== 'Unassigned')) && canReassignLead && onReassign && (
              <button
                type="button"
                onClick={() => onReassign(currentLead)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                title="Reassign lead"
                aria-label="Reassign lead"
              >
                <UserCog size={12} />
                <span>Reassign</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-200/80 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
              aria-label="Close modal"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 overflow-y-auto no-scrollbar space-y-4 text-xs">
          {/* LOST LEAD BANNER */}
          {isLost && currentLead.lossReason && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-900 dark:text-rose-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-black text-xs text-rose-800 dark:text-rose-300">
                  <span className="text-base">{LOSS_REASONS[currentLead.lossReason]?.icon}</span>
                  <span>Reason for Loss: {LOSS_REASONS[currentLead.lossReason]?.label}</span>
                </div>
                {currentLead.lostDate && (
                  <span className="text-[10px] font-semibold text-rose-600 dark:text-rose-400">Marked Lost: {currentLead.lostDate}</span>
                )}
              </div>
              <p className="text-xs text-rose-700 dark:text-rose-300 leading-relaxed font-medium">
                {currentLead.lossNotes || LOSS_REASONS[currentLead.lossReason]?.desc}
              </p>
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleConfirmReactivate}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-xs transition-all cursor-pointer text-xs"
                >
                  <RotateCcw size={12} />
                  <span>Reactivate Lead / Return to Active Pipeline</span>
                </button>
              </div>
            </div>
          )}

          {/* Quick Communication Actions (Native Clickable URLs) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {currentLead.phone ? (
              <a
                href={getTelUrl(currentLead.phone)}
                className="p-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/50 border border-sky-200/80 dark:border-sky-800/60 text-[#1878B8] dark:text-sky-400 flex items-center justify-center gap-2 font-bold transition-colors text-center"
                title={`Call ${currentLead.phone}`}
              >
                <Phone size={14} />
                <span>Call ({currentLead.phone})</span>
              </a>
            ) : (
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-slate-400 dark:text-slate-500 flex items-center justify-center gap-2 font-bold text-center opacity-60 cursor-not-allowed">
                <Phone size={14} />
                <span>No Phone</span>
              </div>
            )}
            {currentLead.phone ? (
              <a
                href={getSmsUrl(currentLead.phone)}
                className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200/80 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 flex items-center justify-center gap-2 font-bold transition-colors text-center"
                title={`Text ${currentLead.phone}`}
              >
                <Zap size={14} />
                <span>Quick SMS</span>
              </a>
            ) : (
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-slate-400 dark:text-slate-500 flex items-center justify-center gap-2 font-bold text-center opacity-60 cursor-not-allowed">
                <Zap size={14} />
                <span>No SMS</span>
              </div>
            )}
            {currentLead.email ? (
              <a
                href={getMailtoUrl(currentLead.email)}
                className="p-2.5 rounded-xl bg-violet-50 dark:bg-violet-950/40 hover:bg-violet-100 dark:hover:bg-violet-900/50 border border-violet-200/80 dark:border-violet-800/60 text-violet-800 dark:text-violet-300 flex items-center justify-center gap-2 font-bold transition-colors text-center"
                title={`Email ${currentLead.email}`}
              >
                <Mail size={14} />
                <span>Send Email</span>
              </a>
            ) : (
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-slate-400 dark:text-slate-500 flex items-center justify-center gap-2 font-bold text-center opacity-60 cursor-not-allowed">
                <Mail size={14} />
                <span>No Email</span>
              </div>
            )}
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(
                `${currentLead.address}, ${currentLead.city} CA ${currentLead.zip}`
              )}`}
              target="_blank"
              rel="noreferrer"
              className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-200 flex items-center justify-center gap-2 font-bold transition-colors text-center"
              title="Open directions in Google Maps"
            >
              <MapPin size={14} />
              <span>Directions</span>
            </a>
          </div>

          {/* Specifications Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/70 dark:border-white/10">
            <div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold">Deal Value</div>
              <div className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
                <DealValueText
                  contractValue={lead.contractValue ?? (lead as any).contract_value}
                  estimateTotal={lead.estimateTotal ?? (lead as any).estimate_total}
                  estimatedValue={lead.estimatedValue ?? (lead.value > 0 ? lead.value : null) ?? (lead as any).raw_estimated_value ?? (lead as any).estimated_value}
                  roofSqf={lead.roofSqf ?? (lead as any).roof_sqf ?? (lead.squares && lead.squares > 0 ? lead.squares * 100 : null)}
                  proposalSentAt={lead.proposalSentAt ?? (lead as any).proposalSentDate ?? (lead as any).proposal_sent_at}
                  isUploadedEstimate={lead.isUploadedEstimate ?? (lead as any).is_uploaded_estimate}
                  estimateTemplateKey={lead.estimateTemplateKey ?? (lead as any).estimate_template_key}
                  isContractSigned={lead.isContractSigned}
                  stageId={lead.stageId || lead.pipelineStage || (lead as any).stage || lead.status}
                  canViewFinances={canViewFinances}
                  className="text-sm"
                />
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold">Roof Size</div>
              <div className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
                {(lead.roofSqf && lead.roofSqf > 0)
                  ? `${lead.roofSqf.toLocaleString()} sq ft`
                  : (lead.squares && lead.squares > 0
                      ? `${(lead.squares * 100).toLocaleString()} sq ft`
                      : <span className="text-slate-400 dark:text-slate-500 font-medium">—</span>)}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold">Pitch Slope</div>
              <div className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
                {lead.pitch ? `${lead.pitch} Pitch` : <span className="text-slate-400 dark:text-slate-500 font-medium">—</span>}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold">Assigned Rep</div>
              <div className="text-sm font-black text-slate-900 dark:text-white mt-0.5">{lead.assignedRep}</div>
            </div>
          </div>

          {/* Lead Attribution */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/70 dark:border-white/10 text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider flex items-center gap-1.5">
              <Globe size={12} className="text-slate-400 dark:text-slate-500" />
              <span>Lead Source Attribution</span>
            </span>
            <div className="flex items-center gap-2">
              {lead.source === 'website' ? (
                (() => {
                  const src = getSourceBadges(lead);
                  return (
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 font-bold text-[10.5px] border border-sky-200/80 dark:border-sky-800/60 shadow-2xs">
                        <Globe size={11} className="text-sky-600 dark:text-sky-400" />
                        <span>Website Lead</span>
                      </span>
                      {src.detailLabel && (
                        <span className="text-slate-600 dark:text-slate-300 font-semibold bg-slate-200/70 dark:bg-white/10 px-2 py-0.5 rounded-md text-[10px]">
                          {src.detailLabel}
                        </span>
                      )}
                    </div>
                  );
                })()
              ) : (
                <span className="text-slate-700 dark:text-slate-300 font-bold bg-slate-100 dark:bg-white/10 px-2.5 py-0.5 rounded-md border border-slate-200 dark:border-white/10">
                  {lead.sourceLabel}
                </span>
              )}
            </div>
          </div>

          {/* Stage Progression Stepper — Locked & Auto-Synced with Pipeline */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Lock size={11} className="text-slate-400 dark:text-slate-500" />
                <span>Pipeline Stage Progression</span>
              </div>
              <span className="text-[9.5px] font-bold text-slate-500 dark:text-slate-400 bg-slate-200/70 dark:bg-white/10 border border-slate-300/60 dark:border-white/10 px-2 py-0.5 rounded-md flex items-center gap-1">
                <Lock size={9} />
                <span>Auto-Synced with Pipeline (Read-Only)</span>
              </span>
            </div>
            <div className="grid grid-cols-5 gap-1 bg-slate-100 dark:bg-white/5 p-1 rounded-xl">
              {[
                { id: 'new_lead', label: '1. New' },
                { id: 'contacted', label: '2. Contacted' },
                { id: 'inspection_scheduled', label: '3. Inspection' },
                { id: 'proposal_sent', label: '4. Proposal' },
                { id: 'contract_won', label: '5. Won' },
              ].map((step) => {
                const isCurrent = lead.status === step.id;
                return (
                  <div
                    key={step.id}
                    className={`py-1.5 px-1 text-center rounded-lg font-bold text-[10px] select-none transition-all cursor-default ${
                      isCurrent
                        ? 'bg-[#1878B8] text-white shadow-xs font-black'
                        : 'text-slate-400 dark:text-slate-500 bg-transparent font-medium'
                    }`}
                    title={isCurrent ? `Current Stage: ${step.label} (Synced from Pipeline)` : `Stage: ${step.label} (Locked)`}
                  >
                    {step.label}
                  </div>
                );
              })}
            </div>
            <div className="mt-1 text-[9.5px] text-slate-400 dark:text-slate-500 font-medium text-right italic">
              Stage progression is locked here • Update stages by moving leads in the Pipeline or Dashboard
            </div>
          </div>

          {/* General Notes Section */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText size={13} className="text-[#1878B8] dark:text-sky-400" />
                <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  General Notes
                </span>
              </div>
            </div>

            {/* Note Composer */}
            <div className="rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-white/5 p-3 shadow-2xs space-y-2.5">
              <textarea
                rows={3}
                value={generalNoteText}
                onChange={(e) => setGeneralNoteText(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                    e.preventDefault();
                    handleSaveGeneralNote();
                  }
                }}
                placeholder="Add a general note for this lead..."
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/40 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 focus:bg-white dark:focus:bg-slate-900 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#1878B8] dark:focus:border-sky-500 focus:ring-2 focus:ring-sky-400/20 resize-none transition-all font-medium leading-relaxed"
              />

              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                  Press <kbd className="px-1 py-0.5 rounded bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/10 text-[9px] font-mono text-slate-600 dark:text-slate-300">⌘/Ctrl+Enter</kbd> to save
                </span>

                <button
                  type="button"
                  onClick={handleSaveGeneralNote}
                  disabled={!generalNoteText.trim() || isSavingNote}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#1878B8] hover:bg-sky-600 active:scale-[0.98] disabled:opacity-40 text-white text-xs font-bold shadow-2xs transition-all cursor-pointer"
                >
                  {isSavingNote ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Send size={12} className="stroke-[2.5]" />
                      <span>Save Note</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Existing Notes Display */}
            {lead.notes && lead.notes.trim() ? (
              <div className="p-3.5 rounded-2xl bg-slate-50/90 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line font-medium shadow-2xs max-h-48 overflow-y-auto">
                {lead.notes}
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-slate-50/60 dark:bg-white/5 border border-dashed border-slate-200 dark:border-white/10 text-center text-xs text-slate-400 dark:text-slate-500 font-medium">
                No general notes recorded yet
              </div>
            )}
          </div>

          {/* MARK AS LOST DRAWER / PICKER */}
          {!isLost && (
            <div className="border-t border-slate-200/80 dark:border-white/10 pt-3">
              {!showLostPicker ? (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Lead no longer pursuing proposal?</span>
                  <button
                    type="button"
                    onClick={() => setShowLostPicker(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/60 font-bold transition-colors cursor-pointer"
                  >
                    <AlertTriangle size={12} />
                    <span>Mark as Lost / Inactive</span>
                  </button>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-rose-900 dark:text-rose-200 text-xs flex items-center gap-1.5">
                      <AlertTriangle size={13} className="text-rose-600 dark:text-rose-400" />
                      <span>Select Reason for Lost Opportunity</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowLostPicker(false)}
                      className="text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-white font-bold cursor-pointer transition-colors"
                      aria-label="Close lost picker"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    {Object.entries(LOSS_REASONS).map(([key, item]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setSelectedReason(key)}
                        className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                          selectedReason === key
                            ? 'bg-white dark:bg-slate-900 border-rose-400 dark:border-rose-500 shadow-2xs font-bold text-rose-900 dark:text-rose-200'
                            : 'bg-white/60 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-white/10'
                        } ${key === 'custom' ? 'col-span-2' : ''}`}
                      >
                        <div className="flex items-center gap-1.5 text-xs">
                          <span>{item.icon}</span>
                          <span className="truncate">{item.label}</span>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Custom reason field */}
                  {isCustomReason && (
                    <div className="animate-in fade-in slide-in-from-top-1 duration-150">
                      <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                        Custom Reason <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={customReasonText}
                        onChange={(e) => setCustomReasonText(e.target.value)}
                        placeholder="e.g. HOA restrictions prevented the project"
                        autoFocus
                        className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-white/5 border border-rose-300 dark:border-rose-800 text-xs text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-300/50 transition-all"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                      Loss Explanation Notes <span className="text-slate-400 dark:text-slate-500 font-normal normal-case">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={lossNoteInput}
                      onChange={(e) => setLossNoteInput(e.target.value)}
                      placeholder="e.g. Customer selected competitor who bid $3k lower on underlayment"
                      className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 text-xs text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-rose-400 focus:bg-white dark:focus:bg-slate-900 transition-all"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowLostPicker(false)}
                      className="px-3 py-1 rounded-lg text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmLost}
                      disabled={!canConfirmLost}
                      className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold transition-colors cursor-pointer shadow-xs"
                    >
                      Confirm Mark Lost
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 border-t border-slate-200/80 dark:border-white/10 bg-slate-50/80 dark:bg-white/5 flex items-center justify-between gap-3">
          <div className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
            Source: <strong className="text-slate-700 dark:text-slate-300">{lead.sourceLabel}</strong> • ID: {lead.id}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-200/80 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-bold text-xs transition-colors cursor-pointer"
            >
              Close
            </button>
            <a
              href="/pipeline"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#1878B8] to-[#55C4F5] hover:opacity-95 text-white font-bold text-xs shadow-md shadow-sky-500/20 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>Manage in Pipeline</span>
              <ArrowUpRight size={13} />
            </a>
          </div>
        </div>
      </div>

      {/* Client 360 Source of Truth Edit Contact Modal */}
      {isEditContactOpen && (
        <ClientEditContactModal
          isOpen={isEditContactOpen}
          onClose={() => setIsEditContactOpen(false)}
          clientName={currentLead.name}
          clientId={(currentLead as any).clientId || (currentLead as any).client_id}
          initialData={{
            name: currentLead.name,
            email: currentLead.email,
            phone: currentLead.phone,
            address: currentLead.address,
            city: currentLead.city,
            zip: currentLead.zip,
          }}
          onSave={handleSaveContact}
        />
      )}
    </div>,
    document.body
  );
}
