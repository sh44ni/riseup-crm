import React from 'react';
import { PipelineDealItem, PipelineStageId } from '@/components/pipeline/pipelineTypes';
import { PipelineDealModal } from '@/components/pipeline/PipelineDealModal';
import { CreateLeadModal, CreateLeadPayload } from '@/components/pipeline/CreateLeadModal';
import { MoveLeadModal, MoveModalCard, MoveModalColumn } from '@/components/pipeline/MoveLeadModal';
import { LogFollowUpModal } from '@/components/pipeline/LogFollowUpModal';
import { EstimateSentGatedModal, GatedLeadCard } from '@/components/pipeline/EstimateSentGatedModal';
import { ClaimLeadModal } from '@/components/pipeline/ClaimLeadModal';
import { ReassignLeadModal } from '@/components/pipeline/ReassignLeadModal';

import { BackwardMoveModal, BackwardMoveWarning } from '@/components/pipeline/BackwardMoveModal';

export interface DropIntent {
  card: MoveModalCard;
  fromCol: MoveModalColumn;
  toCol: MoveModalColumn;
  targetStageId: PipelineStageId;
}

interface PipelineModalsProps {
  activeDealModal: PipelineDealItem | null;
  setActiveDealModal: (d: PipelineDealItem | null) => void;
  handleAdvanceDeal: (dealId: string, nextStage: PipelineStageId) => Promise<void>;
  handleUpdateDeal: (updated: PipelineDealItem) => void;
  
  showCreateLeadModal: boolean;
  setShowCreateLeadModal: (s: boolean) => void;
  handleCreateLead: (lead: CreateLeadPayload) => Promise<void>;
  
  dropIntent: DropIntent | null;
  isMoving: boolean;
  handleConfirmMove: (notes: string) => Promise<void>;
  handleCancelMove: () => void;

  backwardMoveWarning: BackwardMoveWarning | null;
  setBackwardMoveWarning: (w: BackwardMoveWarning | null) => void;
  
  followUpModalDeal: PipelineDealItem | null;
  setFollowUpModalDeal: (d: PipelineDealItem | null) => void;
  isSavingFollowUp: boolean;
  handleLogFollowUpSubmit: (payload: { method: 'call' | 'sms' | 'email' | 'in_person'; notes: string; outcome?: string; }) => Promise<void>;
  
  gatedEstimateDeal: GatedLeadCard | null;
  setGatedEstimateDeal: (d: GatedLeadCard | null) => void;
  
  claimModalDeal: PipelineDealItem | null;
  setClaimModalDeal: (d: PipelineDealItem | null) => void;
  handleConfirmClaimDeal: () => Promise<void>;
  
  reassignModalDeal: PipelineDealItem | null;
  setReassignModalDeal: (d: PipelineDealItem | null) => void;
  handleReassignSuccess: () => void;
}

export function PipelineModals({
  activeDealModal, setActiveDealModal, handleAdvanceDeal, handleUpdateDeal,
  showCreateLeadModal, setShowCreateLeadModal, handleCreateLead,
  dropIntent, isMoving, handleConfirmMove, handleCancelMove,
  backwardMoveWarning, setBackwardMoveWarning,
  followUpModalDeal, setFollowUpModalDeal, isSavingFollowUp, handleLogFollowUpSubmit,
  gatedEstimateDeal, setGatedEstimateDeal,
  claimModalDeal, setClaimModalDeal, handleConfirmClaimDeal,
  reassignModalDeal, setReassignModalDeal, handleReassignSuccess
}: PipelineModalsProps) {
  return (
    <>
      <PipelineDealModal
        deal={activeDealModal}
        isOpen={Boolean(activeDealModal)}
        onClose={() => setActiveDealModal(null)}
        onAdvanceStage={handleAdvanceDeal}
        onUpdateDeal={handleUpdateDeal}
      />

      <CreateLeadModal
        isOpen={showCreateLeadModal}
        onClose={() => setShowCreateLeadModal(false)}
        onSubmitLead={handleCreateLead}
      />

      <MoveLeadModal
        intent={dropIntent}
        isMoving={isMoving}
        onConfirm={handleConfirmMove}
        onCancel={handleCancelMove}
      />

      <BackwardMoveModal
        warning={backwardMoveWarning}
        onClose={() => setBackwardMoveWarning(null)}
      />

      <LogFollowUpModal
        deal={followUpModalDeal}
        isOpen={Boolean(followUpModalDeal)}
        isSaving={isSavingFollowUp}
        onClose={() => setFollowUpModalDeal(null)}
        onSubmitFollowUp={handleLogFollowUpSubmit}
      />

      <EstimateSentGatedModal
        deal={gatedEstimateDeal}
        isOpen={Boolean(gatedEstimateDeal)}
        onClose={() => setGatedEstimateDeal(null)}
      />

      <ClaimLeadModal
        isOpen={Boolean(claimModalDeal)}
        leadId={claimModalDeal?.id}
        leadName={claimModalDeal?.name || ''}
        service={claimModalDeal?.service}
        value={claimModalDeal?.value}
        location={claimModalDeal ? `${claimModalDeal.address}, ${claimModalDeal.city}` : undefined}
        onClose={() => setClaimModalDeal(null)}
        onConfirm={handleConfirmClaimDeal}
      />

      {reassignModalDeal && (
        <ReassignLeadModal
          isOpen={Boolean(reassignModalDeal)}
          leadId={reassignModalDeal.id}
          leadName={reassignModalDeal.name}
          currentAssigneeId={reassignModalDeal.assignedToUserId}
          currentAssigneeName={reassignModalDeal.estimator?.name}
          onClose={() => setReassignModalDeal(null)}
          onSuccess={handleReassignSuccess}
        />
      )}
    </>
  );
}
