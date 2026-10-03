import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  CheckCircle2,
  MapPin,
  UserCheck,
  UserCog,
  X,
  Phone,
  Mail,
  AlertTriangle,
  ArrowUpRight,
  Edit3,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Lead } from '@/types/leadTypes';
import { getTelUrl, getMailtoUrl } from '@/utils/contactValidation';
import { ClientEditContactModal, ClientContactData } from '@/components/clients/ClientEditContactModal';
import { leadsApi } from '@/api/leadsApi';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { LeadSourceBadge } from '@/components/shared/LeadSourceBadge';
import { LeadLostBanner } from './inspect/LeadLostBanner';
import { LeadQuickCommActions } from './inspect/LeadQuickCommActions';
import { LeadSpecsGrid } from './inspect/LeadSpecsGrid';
import { LeadStageProgression } from './inspect/LeadStageProgression';
import { LeadNotesSection } from './inspect/LeadNotesSection';
import { LeadMarkLostDrawer } from './inspect/LeadMarkLostDrawer';

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
  const queryClient = useQueryClient();
  const { can, isOwner } = useAuth();
  const canViewFinances = isOwner || can('finances.view');
  const canClaimLead = isOwner || can('leads.claim');
  const canReassignLead = isOwner || can('leads.reassign');

  const [currentLead, setCurrentLead] = useState<Lead>(lead);
  const [isEditContactOpen, setIsEditContactOpen] = useState(false);
  const [showLostPicker, setShowLostPicker] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    setCurrentLead(lead);
  }, [lead]);

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
        queryClient.invalidateQueries({ queryKey: queryKeys.leads.all() });
        queryClient.invalidateQueries({ queryKey: queryKeys.pipeline.all() });
        queryClient.invalidateQueries({ queryKey: queryKeys.clients.all() });
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update contact details.';
      triggerToast(msg);
      throw err;
    }
  };

  const handleConfirmReactivate = () => {
    onReactivate();
    triggerToast('Lead reactivated! Moved to Contacted stage');
  };

  const isLost = currentLead.status === 'lost';
  const rawLead = currentLead as unknown as Record<string, unknown>;
  const clientId =
    typeof rawLead.clientId === 'number'
      ? rawLead.clientId
      : typeof rawLead.client_id === 'number'
        ? rawLead.client_id
        : undefined;

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
          <div
            className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-xs font-bold shadow-xl flex items-center gap-2 animate-in slide-in-from-top duration-200 border border-white/10"
            role="status"
            aria-live="polite"
          >
            <CheckCircle2 size={14} className="text-emerald-400" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200/80 dark:border-white/10 bg-slate-50/80 dark:bg-white/5 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-white text-sm shadow-sm shrink-0 ${
                isLost
                  ? 'bg-slate-400 dark:bg-slate-700'
                  : 'bg-gradient-to-tr from-[#1878B8] to-[#55C4F5]'
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
                <h2 className="text-lg font-black text-slate-900 dark:text-white leading-tight truncate">
                  {currentLead.name}
                </h2>
                <LeadSourceBadge dealOrLead={currentLead} size="sm" />
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
                  <span>
                    {currentLead.address}, {currentLead.city}, CA {currentLead.zip}
                  </span>
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

            {!currentLead.isClaimed &&
              (!currentLead.assignedRep || currentLead.assignedRep === 'Unassigned') &&
              canClaimLead &&
              onClaim && (
                <button
                  type="button"
                  onClick={() => onClaim(currentLead)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <UserCheck size={12} />
                  <span>Claim Lead</span>
                </button>
              )}

            {(currentLead.isClaimed ||
              (currentLead.assignedRep && currentLead.assignedRep !== 'Unassigned')) &&
              canReassignLead &&
              onReassign && (
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
          <LeadLostBanner lead={currentLead} onReactivate={handleConfirmReactivate} />

          <LeadQuickCommActions
            phone={currentLead.phone}
            email={currentLead.email}
            address={currentLead.address}
            city={currentLead.city}
            zip={currentLead.zip}
          />

          <LeadSpecsGrid lead={currentLead} canViewFinances={canViewFinances} />

          <LeadStageProgression currentStatus={currentLead.status} />

          <LeadNotesSection
            notes={currentLead.notes}
            onAddNote={onAddNote}
            onToast={triggerToast}
          />

          {/* Mark As Lost Drawer Trigger & Drawer */}
          {!isLost && (
            <div className="border-t border-slate-200/80 dark:border-white/10 pt-3">
              {!showLostPicker ? (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">
                    Lead no longer pursuing proposal?
                  </span>
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
                <LeadMarkLostDrawer
                  onMarkLost={onMarkLost}
                  onCloseDrawer={() => setShowLostPicker(false)}
                  onToast={triggerToast}
                />
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
          clientId={clientId}
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
