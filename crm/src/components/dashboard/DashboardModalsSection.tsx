import { PipelineDealItem, PipelineStageId, EnrichedDeal } from '@/components/pipeline/pipelineTypes';
import { PipelineDealModal } from '@/components/pipeline/PipelineDealModal';
import { CreateLeadModal, CreateLeadPayload } from '@/components/pipeline/CreateLeadModal';
import { MoveLeadModal } from '@/components/pipeline/MoveLeadModal';
import { LogFollowUpModal } from '@/components/pipeline/LogFollowUpModal';
import { EstimateSentGatedModal, GatedLeadCard } from '@/components/pipeline/EstimateSentGatedModal';
import { CounterSignModal } from '@/components/contracts/CounterSignModal';
import { ClaimLeadModal } from '@/components/pipeline/ClaimLeadModal';
import { ReassignLeadModal } from '@/components/pipeline/ReassignLeadModal';
import { BackwardMoveModal, BackwardMoveWarning } from '@/components/pipeline/BackwardMoveModal';
import { ScheduleAppointmentModal } from '@/features/kanban-dnd/ScheduleAppointmentModal';
import { DealCard, ColumnData } from './dashboardTypes';
import { ContractRow } from '@/api/contractApi';

export interface DashboardModalsSectionProps {
  selectedDeal: PipelineDealItem | EnrichedDeal | null;
  onCloseDealModal: () => void;
  canAdvanceStage: boolean;
  onAdvanceDeal: (dealId: string, nextStage: PipelineStageId) => void;
  onUpdateDeal: (updated?: PipelineDealItem | EnrichedDeal | unknown) => void;
  isCreateLeadOpen: boolean;
  createLeadStage: string;
  onCloseCreateLead: () => void;
  onCreateLead: (lead: CreateLeadPayload) => void;
  dropIntent: { card: DealCard; fromCol: ColumnData; toCol: ColumnData } | null;
  isMoving: boolean;
  onConfirmMove: (notes: string) => void;
  onCancelMove: () => void;
  followUpModalCard: DealCard | null;
  isLoggingFollowUp: boolean;
  onCloseFollowUp: () => void;
  onSubmitFollowUp: (payload: { method: 'call' | 'sms' | 'email' | 'in_person'; notes: string; outcome?: string }) => Promise<void>;
  gatedEstimateCard: GatedLeadCard | null;
  onCloseGatedEstimate: () => void;
  selectedCounterSignContract: ContractRow | null;
  onCloseCounterSign: () => void;
  onSuccessCounterSign: () => void;
  claimModalCard: DealCard | null;
  onCloseClaim: () => void;
  onConfirmClaim: () => Promise<void>;
  reassignModalCard: DealCard | null;
  onCloseReassign: () => void;
  onSuccessReassign: () => void;
  backwardMoveWarning: BackwardMoveWarning | null;
  onCloseBackwardMoveWarning: () => void;
  pendingScheduleMove: { card: DealCard; fromCol: ColumnData; toCol: ColumnData } | null;
  scheduleDateTime: string;
  onScheduleDateTimeChange: (val: string) => void;
  isSchedulingMove: boolean;
  onConfirmScheduleMove: (skipDate?: boolean) => void;
  onCancelScheduleMove: () => void;
}

export function DashboardModalsSection({
  selectedDeal,
  onCloseDealModal,
  canAdvanceStage: _canAdvanceStage,
  onAdvanceDeal,
  onUpdateDeal,
  isCreateLeadOpen,
  createLeadStage,
  onCloseCreateLead,
  onCreateLead,
  dropIntent,
  isMoving,
  onConfirmMove,
  onCancelMove,
  followUpModalCard,
  isLoggingFollowUp,
  onCloseFollowUp,
  onSubmitFollowUp,
  gatedEstimateCard,
  onCloseGatedEstimate,
  selectedCounterSignContract,
  onCloseCounterSign,
  onSuccessCounterSign,
  claimModalCard,
  onCloseClaim,
  onConfirmClaim,
  reassignModalCard,
  onCloseReassign,
  onSuccessReassign,
  backwardMoveWarning,
  onCloseBackwardMoveWarning,
  pendingScheduleMove,
  scheduleDateTime,
  onScheduleDateTimeChange,
  isSchedulingMove,
  onConfirmScheduleMove,
  onCancelScheduleMove,
}: DashboardModalsSectionProps) {
  return (
    <>
      <PipelineDealModal
        deal={selectedDeal}
        isOpen={Boolean(selectedDeal)}
        onClose={onCloseDealModal}
        onAdvanceStage={onAdvanceDeal}
        onUpdateDeal={onUpdateDeal}
      />

      <CreateLeadModal
        isOpen={isCreateLeadOpen}
        initialStageId={createLeadStage}
        onClose={onCloseCreateLead}
        onSubmitLead={onCreateLead}
      />

      <MoveLeadModal
        intent={dropIntent}
        isMoving={isMoving}
        onConfirm={onConfirmMove}
        onCancel={onCancelMove}
      />

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
        onClose={onCloseFollowUp}
        onSubmitFollowUp={onSubmitFollowUp}
      />

      <EstimateSentGatedModal
        deal={gatedEstimateCard}
        isOpen={Boolean(gatedEstimateCard)}
        onClose={onCloseGatedEstimate}
      />

      <CounterSignModal
        contract={selectedCounterSignContract}
        isOpen={Boolean(selectedCounterSignContract)}
        onClose={onCloseCounterSign}
        onSuccess={onSuccessCounterSign}
      />

      <ClaimLeadModal
        isOpen={Boolean(claimModalCard)}
        leadId={claimModalCard?.id}
        leadName={claimModalCard?.name || ''}
        service={claimModalCard?.service}
        value={claimModalCard?.value}
        location={claimModalCard?.address || claimModalCard?.location}
        onClose={onCloseClaim}
        onConfirm={onConfirmClaim}
      />

      {reassignModalCard && (
        <ReassignLeadModal
          isOpen={Boolean(reassignModalCard)}
          leadId={reassignModalCard.id}
          leadName={reassignModalCard.name}
          currentAssigneeId={reassignModalCard.assignedToUserId}
          currentAssigneeName={reassignModalCard.assignedToName || undefined}
          onClose={onCloseReassign}
          onSuccess={onSuccessReassign}
        />
      )}

      <BackwardMoveModal
        warning={backwardMoveWarning}
        onClose={onCloseBackwardMoveWarning}
      />

      <ScheduleAppointmentModal
        isOpen={Boolean(pendingScheduleMove)}
        dealName={pendingScheduleMove?.card.name || ''}
        dateTime={scheduleDateTime}
        onDateTimeChange={onScheduleDateTimeChange}
        isScheduling={isSchedulingMove}
        onConfirm={onConfirmScheduleMove}
        onCancel={onCancelScheduleMove}
      />
    </>
  );
}
