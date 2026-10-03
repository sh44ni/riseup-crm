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
  editingAddressCardId: string | null;
  addressFormStreet: string;
  addressFormCity: string;
  addressFormZip: string;
  isSavingAddress: boolean;
  onDragStart: (cardId: string, colId: string) => void;
  onDragEnd: () => void;
  onClick: () => void;
  onStartEditAddress: (card: DealCard, e: React.SyntheticEvent) => void;
  onSaveAddress: (card: DealCard, e: React.SyntheticEvent) => void;
  onCancelEditAddress: (e?: React.SyntheticEvent) => void;
  onStreetChange: (v: string) => void;
  onCityChange: (v: string) => void;
  onZipChange: (v: string) => void;
  onClaimLead: (card: DealCard) => void;
  onReassignLead: (card: DealCard) => void;
  onFollowUp: (card: DealCard) => void;
  getServiceBadgeClass: (color?: string) => string;
}

export function DashboardDealCard({
  card,
  col,
  canAdvanceStage,
  canViewFinances,
  canClaimLead,
  canReassignLead,
  isDark,
  editingAddressCardId,
  addressFormStreet,
  addressFormCity,
  addressFormZip,
  isSavingAddress,
  onDragStart,
  onDragEnd,
  onClick,
  onStartEditAddress,
  onSaveAddress,
  onCancelEditAddress,
  onStreetChange,
  onCityChange,
  onZipChange,
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
    slaText: card.isFollowupOverdue ? 'Overdue Contact' : 'Active in stage',
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
      editingAddressCardId={editingAddressCardId}
      addressFormStreet={addressFormStreet}
      addressFormCity={addressFormCity}
      addressFormZip={addressFormZip}
      isSavingAddress={isSavingAddress}
      onStartEditAddress={(_item, e) => onStartEditAddress(card, e)}
      onSaveAddress={(_item, e) => onSaveAddress(card, e)}
      onCancelEditAddress={onCancelEditAddress}
      onStreetChange={onStreetChange}
      onCityChange={onCityChange}
      onZipChange={onZipChange}
    />
  );
}

export default DashboardDealCard;
