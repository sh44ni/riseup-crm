import React from 'react';
import { Lead } from '@/types/leadTypes';
import { LeadInspectModal } from '@/components/leads/LeadInspectModal';
import { MarkLeadLostModal } from '@/components/leads/MarkLeadLostModal';
import { CreateLeadModal, CreateLeadPayload } from '@/components/pipeline/CreateLeadModal';
import { ClaimLeadModal } from '@/components/pipeline/ClaimLeadModal';
import { ReassignLeadModal } from '@/components/pipeline/ReassignLeadModal';

interface LeadModalsProps {
  inspectLead: Lead | null;
  setInspectLead: React.Dispatch<React.SetStateAction<Lead | null>>;
  lostModalLead: Lead | null;
  setLostModalLead: React.Dispatch<React.SetStateAction<Lead | null>>;
  showCreateModal: boolean;
  setShowCreateModal: React.Dispatch<React.SetStateAction<boolean>>;
  claimModalLead: Lead | null;
  setClaimModalLead: React.Dispatch<React.SetStateAction<Lead | null>>;
  reassignModalLead: Lead | null;
  setReassignModalLead: React.Dispatch<React.SetStateAction<Lead | null>>;
  handleMarkAsLost: (leadId: string | number, reason: string, notes?: string) => Promise<void>;
  handleReactivateLead: (leadId: string | number) => Promise<void>;
  handleAdvanceStage: (leadId: string | number, nextStage: Lead['status']) => Promise<void>;
  addNote: (leadId: string | number, note: string) => Promise<void>;
  updateLeadContact: (leadId: string | number, contactData: any) => Promise<void>;
  getServiceBadgeClass: (color: string) => string;
  handleCreateLead: (payload: CreateLeadPayload) => Promise<void>;
  handleConfirmClaimLead: () => Promise<void>;
  handleReassignSuccess: () => Promise<void>;
}

export function LeadModals({
  inspectLead,
  setInspectLead,
  lostModalLead,
  setLostModalLead,
  showCreateModal,
  setShowCreateModal,
  claimModalLead,
  setClaimModalLead,
  reassignModalLead,
  setReassignModalLead,
  handleMarkAsLost,
  handleReactivateLead,
  handleAdvanceStage,
  addNote,
  updateLeadContact,
  getServiceBadgeClass,
  handleCreateLead,
  handleConfirmClaimLead,
  handleReassignSuccess
}: LeadModalsProps) {
  return (
    <>
      {inspectLead && (
        <LeadInspectModal
          lead={inspectLead}
          onClose={() => setInspectLead(null)}
          onMarkLost={(reason, notes) => handleMarkAsLost(inspectLead.id, reason, notes)}
          onReactivate={() => handleReactivateLead(inspectLead.id)}
          onAdvance={(stage) => handleAdvanceStage(inspectLead.id, stage)}
          onAddNote={async (note) => {
            await addNote(inspectLead.id, note);
            setInspectLead((prev) => (prev ? { ...prev, notes: prev.notes ? `${prev.notes}\n\n${note}` : note } : null));
          }}
          onClaim={() => setClaimModalLead(inspectLead)}
          onReassign={() => setReassignModalLead(inspectLead)}
          onUpdateContact={async (contactData) => {
            await updateLeadContact(inspectLead.id, contactData);
            setInspectLead((prev) => (prev ? { ...prev, ...contactData } : null));
          }}
          getServiceBadgeClass={getServiceBadgeClass}
        />
      )}

      <MarkLeadLostModal
        lead={lostModalLead}
        onClose={() => setLostModalLead(null)}
        onConfirm={async (reason, notes) => {
          if (!lostModalLead) return;
          await handleMarkAsLost(lostModalLead.id, reason, notes);
          setLostModalLead(null);
        }}
      />

      {showCreateModal && (
        <CreateLeadModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSubmitLead={handleCreateLead}
          initialStageId="new_leads"
        />
      )}

      <ClaimLeadModal
        isOpen={Boolean(claimModalLead)}
        leadId={claimModalLead?.id}
        leadName={claimModalLead?.name || ''}
        service={claimModalLead?.service}
        value={claimModalLead?.value}
        location={claimModalLead ? `${claimModalLead.address}, ${claimModalLead.city}` : undefined}
        onClose={() => setClaimModalLead(null)}
        onConfirm={handleConfirmClaimLead}
      />

      {reassignModalLead && (
        <ReassignLeadModal
          isOpen={Boolean(reassignModalLead)}
          leadId={reassignModalLead.id}
          leadName={reassignModalLead.name}
          currentAssigneeName={reassignModalLead.assignedRep}
          onClose={() => setReassignModalLead(null)}
          onSuccess={handleReassignSuccess}
        />
      )}
    </>
  );
}
