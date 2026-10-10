import React from 'react';
import { DealCard as UnifiedDealCard } from '@/features/kanban-dnd/DealCard';
import { DealCard, ColumnData } from './dashboardTypes';
import { PipelineDealItem, StageDefinition, PipelineStageId, PIPELINE_STAGES } from '@/components/pipeline/pipelineTypes';

export interface DashboardDealCardProps {
  card: DealCard;
  col: ColumnData;
  canAdvanceStage: boolean;
  canViewFinances: boolean;
  canClaimLead: boolean;
  canReassignLead: boolean;
  isDark: boolean;
  onDragStart: (cardId: string, colId: string) => void;
  onDragEnd: () => void;
  onClick: () => void;
  onClaimLead: (card: DealCard) => void;
  onReassignLead: (card: DealCard) => void;
  onFollowUp: (card: DealCard) => void;
  getServiceBadgeClass: (color?: string) => string;
}

function DashboardDealCardComponent({
  card,
  col,
  canAdvanceStage,
  canViewFinances,
  canClaimLead,
  canReassignLead,
  isDark,
  onDragStart,
  onDragEnd,
  onClick,
  onClaimLead,
  onReassignLead,
  onFollowUp,
  getServiceBadgeClass,
}: DashboardDealCardProps) {
  // Adapt Dashboard DealCard to PipelineDealItem
  const dealItem: PipelineDealItem = {
    id: card.id,
    name: card.name || 'Unnamed Lead',
    address: card.address || (card.location ? card.location : ''),
    city: card.city || '',
    service: card.service || 'Roofing',
    serviceColor: card.serviceColor || 'blue',
    phone: card.phone || '',
    email: card.email || '',
    value: card.value || 0,
    stageId: (col.id as PipelineStageId) || 'cold_lead',
    daysInStage: 0,
    slaStatus: (card.isFollowupOverdue ? 'overdue' : 'on_track') as 'overdue' | 'on_track',
    slaText: card.isFollowupOverdue ? 'Overdue Contact' : '',
    estimator: {
      name: card.assignedToName || 'Unassigned',
      avatar: '',
      role: 'Estimator',
    },
    assignedToUserId: card.assignedToUserId,
    isFollowupOverdue: card.isFollowupOverdue,
    followupHoursRemaining: card.followupHoursRemaining,
    followupDaysRemaining: card.followupDaysRemaining,
    siteVisitScheduledAt: card.siteVisitScheduledAt,
    proposalSentDate: card.proposalSentAt || undefined,
    contractValue: card.contractValue,
    estimateTotal: card.estimateTotal,
    estimatedValue: card.estimatedValue,
    roofSqf: card.roofSqf,
    photosCount: 0,
    notes: card.notes || '',
    checklist: [],
    isUploadedEstimate: card.isUploadedEstimate,
    estimateTemplateKey: card.estimateTemplateKey,
    isContractSigned: card.isContractSigned,
    leadSource: card.leadSource,
    hoursUntilAutoMove: card.hoursUntilAutoMove,
  };

  const stageDef: StageDefinition = PIPELINE_STAGES.find((s) => s.id === (col.id as PipelineStageId)) || {
    stepNumber: 1,
    id: (col.id as PipelineStageId) || 'cold_lead',
    title: col.title,
    shortTitle: col.title,
    timingLabel: 'Active',
    sopGoal: col.title,
    iconType: 'users',
    accentColor: col.accentColor,
    pillBg: 'bg-sky-500/15 border-sky-500/30',
    pillText: 'text-sky-700',
    dotColor: 'bg-sky-500',
  };

  return (
    <UnifiedDealCard
      deal={dealItem}
      stage={stageDef}
      canViewFinances={canViewFinances}
      canAdvanceStage={canAdvanceStage}
      canClaimLead={canClaimLead}
      canReassignLead={canReassignLead}
      isDark={isDark}
      onSelectDeal={() => onClick()}
      onDragStart={(id, stageId) => onDragStart(id, stageId)}
      onDragEnd={onDragEnd}
      onClaimDeal={() => onClaimLead(card)}
      onReassignDeal={() => onReassignLead(card)}
      onFollowUpDeal={() => onFollowUp(card)}
      getServiceBadgeClass={getServiceBadgeClass}
    />
  );
}

function areDashboardDealCardPropsEqual(
  prev: DashboardDealCardProps,
  next: DashboardDealCardProps
): boolean {
  if (prev.card.id !== next.card.id) return false;
  if (prev.card.name !== next.card.name) return false;
  if (prev.card.value !== next.card.value) return false;
  if (prev.card.contractValue !== next.card.contractValue) return false;
  if (prev.card.estimateTotal !== next.card.estimateTotal) return false;
  if (prev.card.estimatedValue !== next.card.estimatedValue) return false;
  if (prev.card.isFollowupOverdue !== next.card.isFollowupOverdue) return false;
  if (prev.card.hoursUntilAutoMove !== next.card.hoursUntilAutoMove) return false;
  if (prev.card.followupHoursRemaining !== next.card.followupHoursRemaining) return false;
  if (prev.card.followupDaysRemaining !== next.card.followupDaysRemaining) return false;
  if (prev.card.siteVisitScheduledAt !== next.card.siteVisitScheduledAt) return false;
  if (prev.card.address !== next.card.address) return false;
  if (prev.card.location !== next.card.location) return false;
  if (prev.card.city !== next.card.city) return false;
  if (prev.card.service !== next.card.service) return false;
  if (prev.card.serviceColor !== next.card.serviceColor) return false;
  if (prev.card.roofSqf !== next.card.roofSqf) return false;
  if (prev.card.assignedToUserId !== next.card.assignedToUserId) return false;
  if (prev.card.assignedToName !== next.card.assignedToName) return false;
  if (prev.card.leadSource !== next.card.leadSource) return false;
  if (prev.canAdvanceStage !== next.canAdvanceStage) return false;
  if (prev.canViewFinances !== next.canViewFinances) return false;
  if (prev.canClaimLead !== next.canClaimLead) return false;
  if (prev.canReassignLead !== next.canReassignLead) return false;
  if (prev.isDark !== next.isDark) return false;
  if (prev.col.id !== next.col.id) return false;
  if (prev.col.accentColor !== next.col.accentColor) return false;
  return true;
}

export const DashboardDealCard = React.memo(DashboardDealCardComponent, areDashboardDealCardPropsEqual);
export default DashboardDealCard;
