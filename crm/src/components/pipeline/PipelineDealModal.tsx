import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { FileText } from 'lucide-react';
import { ContractWizardShell } from '@/components/contracts/wizard/ContractWizardShell';
import { ClaimLeadModal } from './ClaimLeadModal';
import { ReassignLeadModal } from './ReassignLeadModal';
import { ClientEditContactModal } from '@/components/clients/ClientEditContactModal';
import { useAuth } from '@/context/AuthContext';
import { DealModalHeader } from './deal-modal/DealModalHeader';
import { DealSummaryTab } from './deal-modal/DealSummaryTab';
import { DealTimelineTab } from './deal-modal/DealTimelineTab';
import { DealNotesTab } from './deal-modal/DealNotesTab';
import { usePipelineDealData } from './deal-modal/usePipelineDealData';
import {
  ModalDeal,
  STAGE_TITLES,
  DEFAULT_BADGE_CLASS,
  formatRelativeTime,
} from './deal-modal/types';

export interface PipelineDealModalProps {
  deal: ModalDeal | null;
  isOpen: boolean;
  onClose: () => void;
  getServiceBadgeClass?: (color?: string) => string;
  onAdvanceStage?: (dealId: string, nextStage: any) => void;
  onUpdateDeal?: (updatedDeal: any) => void;
}

export function PipelineDealModal({
  deal,
  isOpen,
  onClose,
  getServiceBadgeClass = DEFAULT_BADGE_CLASS,
  onAdvanceStage: _onAdvanceStage,
  onUpdateDeal,
}: PipelineDealModalProps) {
  const { can, isOwner } = useAuth();
  const canViewFinances = can('finances.view');
  const canClaimLead = isOwner || can('leads.claim');
  const canReassignLead = isOwner || can('leads.reassign');

  const [activeTab, setActiveTab] = useState<'details' | 'timeline' | 'notes'>('timeline');
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [isEditContactOpen, setIsEditContactOpen] = useState(false);
  const [showContractBuilder, setShowContractBuilder] = useState(false);

  const {
    leadDetail,
    activities,
    isLoadingDetails,
    notes,
    isClaiming,
    localContact,
    fetchLeadData,
    handleClaim,
    handleSaveContact,
    handleUpdateSqft,
    handleScheduleAppointment,
    handleCancelAppointment,
    handleLogTouchpoint,
    handleAddNote,
    handleEditNote,
  } = usePipelineDealData(deal, isOpen, onUpdateDeal);

  if (!isOpen || !deal) return null;

  const displayName = localContact.name || leadDetail?.full_name || ('customerName' in deal ? deal.customerName : undefined) || deal.name;
  const displayPhone = localContact.phone || leadDetail?.phone || deal.phone || '';
  const displayEmail = localContact.email || leadDetail?.email || deal.email || '';
  const displayAddress = localContact.address || leadDetail?.address || deal.address || '';
  const displayCity = localContact.city || leadDetail?.city || deal.city || 'Oceanside';
  const displayZip = localContact.zip || leadDetail?.zip || ('zip' in deal ? deal.zip : undefined) || '';
  const displayLocation = displayCity ? `${displayCity}, CA` : ('location' in deal ? deal.location : undefined) || 'Oceanside, CA';
  const displayService = leadDetail?.service_type || deal.service || 'Roofing';
  const displayId = String(deal.id);

  const displayStageKey = (leadDetail?.granular_stage || leadDetail?.pipeline_stage || (deal as any).stageId || 'cold_lead').toLowerCase();
  const displayStageTitle = STAGE_TITLES[displayStageKey] || STAGE_TITLES[leadDetail?.pipeline_stage || ''] || (deal as any).stageTitle || 'Active Deal';
  const stagePillClass = (deal as any).stagePillClass || 'bg-sky-500/15 border-sky-500/30 text-sky-700';

  const rawScheduledAt = leadDetail?.site_visit_scheduled_at || deal.siteVisitScheduledAt;
  const scheduledDateObj = rawScheduledAt ? new Date(rawScheduledAt) : null;
  const realAppointmentDate = scheduledDateObj && !isNaN(scheduledDateObj.getTime())
    ? scheduledDateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    : null;
  const realAppointmentTime = scheduledDateObj && !isNaN(scheduledDateObj.getTime())
    ? scheduledDateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    : null;

  const isUnassigned = !deal.assignedToUserId || (deal as any)?.estimator?.name === 'Unassigned' || (leadDetail && !leadDetail.assigned_to_user_id);
  const latestMoveActivity = activities.find((a) => a.activity_type === 'stage_changed');
  const displayRelativeTime = formatRelativeTime(leadDetail?.updated_at || leadDetail?.created_at);

  return (
    <>
      {createPortal(
        <div
          onClick={onClose}
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xl animate-in fade-in duration-200"
        >
          <div
            className="relative w-full max-w-xl rounded-3xl bg-white/94 dark:bg-[#0B1320]/95 backdrop-blur-3xl border border-white/95 dark:border-white/10 shadow-[0_25px_90px_rgba(0,0,0,0.40),0_0_0_1px_rgba(255,255,255,0.9)_inset] dark:shadow-[0_25px_90px_rgba(0,0,0,0.85)] p-6 space-y-5 animate-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top highlight line */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white dark:via-white/20 to-transparent" />

            {/* Modal Header */}
            <DealModalHeader
              displayName={displayName}
              displayLocation={displayLocation}
              displayStageTitle={displayStageTitle}
              stagePillClass={stagePillClass}
              displayId={displayId}
              isLoadingDetails={isLoadingDetails}
              isUnassigned={Boolean(isUnassigned)}
              canClaimLead={canClaimLead}
              isClaiming={isClaiming}
              canReassignLead={canReassignLead}
              onOpenClaimModal={() => setIsClaimModalOpen(true)}
              onOpenEditContact={() => setIsEditContactOpen(true)}
              onOpenReassignModal={() => setIsReassignModalOpen(true)}
              onClose={onClose}
            />

            {/* Tab navigation */}
            <div className="flex items-center gap-1.5 bg-white/50 dark:bg-white/5 p-1 rounded-xl border border-white/80 dark:border-white/10 backdrop-blur-md text-xs font-bold shrink-0">
              <button
                type="button"
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
                type="button"
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
                type="button"
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
              {activeTab === 'details' && (
                <DealSummaryTab
                  dealId={deal.id}
                  dealName={displayName}
                  canViewFinances={canViewFinances}
                  resolvedRoofSqf={leadDetail?.roof_sqf ?? deal.roofSqf ?? (deal as any).roof_sqf}
                  resolvedEstimateTotal={leadDetail?.estimate_total ?? deal.estimateTotal}
                  resolvedContractValue={leadDetail?.contract_value ?? deal.contractValue}
                  resolvedEstimatedValue={leadDetail?.estimated_value ?? deal.estimatedValue}
                  resolvedProposalSentAt={leadDetail?.proposal_sent_at ?? deal.proposalSentAt}
                  resolvedIsUploadedEstimate={leadDetail?.is_uploaded_estimate ?? deal.isUploadedEstimate}
                  resolvedEstimateTemplateKey={leadDetail?.estimate_template_key ?? deal.estimateTemplateKey}
                  resolvedIsContractSigned={leadDetail?.is_contract_signed ?? deal.isContractSigned}
                  displayStageKey={displayStageKey}
                  displayService={displayService}
                  displayPhone={displayPhone}
                  displayEmail={displayEmail}
                  displayAddress={displayAddress}
                  displayLocation={displayLocation}
                  rawScheduledAt={rawScheduledAt}
                  realAppointmentDate={realAppointmentDate}
                  realAppointmentTime={realAppointmentTime}
                  latestMoveActivity={latestMoveActivity}
                  getServiceBadgeClass={getServiceBadgeClass}
                  serviceColor={deal.serviceColor}
                  onOpenEditContact={() => setIsEditContactOpen(true)}
                  onUpdateSqft={handleUpdateSqft}
                  onScheduleAppointment={handleScheduleAppointment}
                  onCancelAppointment={handleCancelAppointment}
                />
              )}

              {activeTab === 'timeline' && (
                <DealTimelineTab
                  activities={activities}
                  onLogTouchpoint={handleLogTouchpoint}
                />
              )}

              {activeTab === 'notes' && (
                <DealNotesTab
                  notes={notes}
                  onAddNote={handleAddNote}
                  onEditNote={handleEditNote}
                />
              )}
            </div>

            {/* Stage-specific footer banner */}
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

            {/* Footer Done action */}
            <div className="pt-3 border-t border-slate-200/70 dark:border-white/10 flex items-center justify-between shrink-0">
              <div className="text-[11px] text-slate-400 font-medium">
                Last modified: <strong className="text-slate-600 dark:text-slate-300">{displayRelativeTime}</strong>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 rounded-xl liquid-glass-btn text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white shadow-2xs transition-all cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showContractBuilder && deal && (
        <ContractWizardShell
          contractId={null}
          onBack={() => setShowContractBuilder(false)}
          onSuccess={() => {
            setShowContractBuilder(false);
            if (onUpdateDeal) onUpdateDeal(deal);
          }}
          prefill={{
            leadId: String(deal.id),
            clientId: 'clientId' in deal && deal.clientId ? String(deal.clientId) : ('client_id' in (deal as any) ? String((deal as any).client_id) : undefined),
            clientName: displayName,
            phone: displayPhone,
            email: displayEmail,
            address: displayAddress,
            city: displayCity,
            service: displayService,
            value: typeof deal.value === 'number' ? deal.value : undefined,
          }}
        />
      )}

      <ClaimLeadModal
        isOpen={isClaimModalOpen}
        leadId={deal.id}
        leadName={displayName}
        service={displayService}
        value={deal.value}
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

export default PipelineDealModal;
