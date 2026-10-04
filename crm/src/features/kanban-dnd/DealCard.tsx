import React from 'react';
import {
  AlertTriangle,
  Clock,
  MapPin,
  Camera,
  Calendar,
  UserCheck,
  UserCog,
  PhoneCall,
  ArrowRight,
  Pencil,
} from 'lucide-react';
import {
  PipelineDealItem,
  StageDefinition,
  PipelineStageId,
  DealCard as PipelineDealCard,
} from '@/components/pipeline/pipelineTypes';
import { DealValueBadge } from '@/components/shared/DealValueBadge';
import { LeadSourceBadge } from '@/components/shared/LeadSourceBadge';
import { LeadAddressEditor } from '@/components/pipeline/LeadAddressEditor';
import { KanbanColumn } from './types';

export interface DealCardComponentProps {
  deal: PipelineDealItem;
  stage: StageDefinition | KanbanColumn;
  nextStageDef?: StageDefinition;
  canViewFinances: boolean;
  canAdvanceStage: boolean;
  canClaimLead?: boolean;
  canReassignLead?: boolean;
  isDark?: boolean;
  onSelectDeal: (deal: PipelineDealItem) => void;
  onAdvanceDeal?: (dealId: string, nextStageId: PipelineStageId) => void;
  onDragStart?: (dealId: string, stageId: PipelineStageId) => void;
  onDragEnd?: () => void;
  onClaimDeal?: (deal: PipelineDealItem) => void;
  onReassignDeal?: (deal: PipelineDealItem) => void;
  onFollowUpDeal?: (deal: PipelineDealItem) => void;
  getServiceBadgeClass?: (color?: string) => string;
  editingAddressCardId?: string | null;
  addressFormStreet?: string;
  addressFormCity?: string;
  addressFormZip?: string;
  isSavingAddress?: boolean;
  onStartEditAddress?: (card: PipelineDealItem, e: React.SyntheticEvent) => void;
  onSaveAddress?: (card: PipelineDealItem, e: React.SyntheticEvent) => void;
  onCancelEditAddress?: (e?: React.SyntheticEvent) => void;
  onStreetChange?: (v: string) => void;
  onCityChange?: (v: string) => void;
  onZipChange?: (v: string) => void;
}

const defaultBadgeClass = (color?: string) => {
  switch (color) {
    case 'blue':
      return 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800/40';
    case 'emerald':
      return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40';
    case 'purple':
      return 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800/40';
    case 'amber':
      return 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800/40';
    default:
      return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
  }
};

export function DealCard({
  deal,
  stage,
  nextStageDef,
  canViewFinances,
  canAdvanceStage,
  canClaimLead = false,
  canReassignLead = false,
  isDark = false,
  onSelectDeal,
  onAdvanceDeal,
  onDragStart,
  onDragEnd,
  onClaimDeal,
  onReassignDeal,
  onFollowUpDeal,
  getServiceBadgeClass = defaultBadgeClass,
  editingAddressCardId,
  addressFormStreet = '',
  addressFormCity = '',
  addressFormZip = '',
  isSavingAddress = false,
  onStartEditAddress,
  onSaveAddress,
  onCancelEditAddress,
  onStreetChange,
  onCityChange,
  onZipChange,
}: DealCardComponentProps) {
  const isOverdue = Boolean(deal.isFollowupOverdue);
  const isEstimateSent = deal.stageId === 'estimate_sent';
  const isFollowUpStage = deal.stageId === 'follow_up';
  const isEditingAddress = editingAddressCardId === deal.id;

  return (
    <div
      key={deal.id}
      draggable={canAdvanceStage}
      onDragStart={(e) => {
        if (!canAdvanceStage) return;
        e.dataTransfer.effectAllowed = 'move';
        onDragStart?.(deal.id, stage.id as PipelineStageId);
      }}
      onDragEnd={onDragEnd}
      onClick={() => onSelectDeal(deal)}
      style={{
        borderLeftWidth: isOverdue ? '4px' : '3.5px',
        borderLeftColor: isOverdue ? '#ef4444' : stage.accentColor,
      }}
      className={`rounded-xl p-2.5 space-y-1.5 ${
        canAdvanceStage
          ? 'cursor-grab active:cursor-grabbing active:opacity-50 active:scale-95'
          : 'cursor-pointer'
      } group shadow-2xs hover:shadow-md transition-all select-none ${
        isOverdue
          ? 'bg-red-50/85 border-2 border-red-500 ring-2 ring-red-400/25 shadow-red-100/50'
          : 'liquid-glass-tile'
      }`}
    >
      {/* Overdue Alert Banner */}
      {isOverdue && (
        <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-red-600 text-white font-black text-[9px] tracking-wide animate-pulse shadow-2xs">
          <span className="flex items-center gap-1">
            <AlertTriangle size={10} className="shrink-0" />
            <span>OVERDUE &bull; Follow-Up Past Due</span>
          </span>
          <span className="bg-white/25 px-1 py-0.2 rounded text-[7.5px]">URGENT</span>
        </div>
      )}

      {/* 24-Hour Review Countdown for Estimate Sent */}
      {isEstimateSent && (
        <div className="flex items-center justify-between text-[9px] px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/50 border border-amber-200/90 dark:border-amber-800/60 text-amber-900 dark:text-amber-300 font-bold">
          <span className="flex items-center gap-1">
            <Clock size={9} className="text-amber-600 dark:text-amber-400 animate-pulse shrink-0" />
            <span>24h Review:</span>
          </span>
          <span className="font-extrabold text-amber-700 dark:text-amber-400">
            {deal.hoursUntilAutoMove !== null && deal.hoursUntilAutoMove !== undefined
              ? deal.hoursUntilAutoMove > 0
                ? `${deal.hoursUntilAutoMove}h until Follow-Up`
                : 'Auto-moving to Follow-Up'
              : '24h window active'}
          </span>
        </div>
      )}

      {/* Follow-Up Cadence SLA Info */}
      {isFollowUpStage && !isOverdue && (
        <div className="flex items-center justify-between text-[9px] px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/50 border border-purple-200/90 dark:border-purple-800/60 text-purple-900 dark:text-purple-300 font-bold">
          <span className="flex items-center gap-1">
            <Clock size={9} className="text-purple-600 dark:text-purple-400 shrink-0" />
            <span>Next Follow-Up:</span>
          </span>
          <span className="font-extrabold text-purple-700 dark:text-purple-300">
            {deal.followupHoursRemaining !== undefined && deal.followupHoursRemaining <= 48
              ? `${deal.followupHoursRemaining}h remaining`
              : deal.followupDaysRemaining !== undefined && deal.followupDaysRemaining > 0
              ? `${deal.followupDaysRemaining}d remaining`
              : '48h SLA'}
          </span>
        </div>
      )}

      {/* Estimate Appointment Badge */}
      {deal.stageId === 'estimate_scheduled' && (
        <div
          className={`flex items-center justify-between text-[9px] px-2 py-0.5 rounded-md font-bold ${
            deal.siteVisitScheduledAt
              ? 'bg-sky-50 dark:bg-sky-950/50 border border-sky-200/90 dark:border-sky-800/60 text-sky-900 dark:text-sky-300'
              : 'bg-amber-50 dark:bg-amber-950/50 border border-amber-200/90 dark:border-amber-800/60 text-amber-900 dark:text-amber-300'
          }`}
        >
          <span className="flex items-center gap-1">
            <Calendar
              size={9}
              className={deal.siteVisitScheduledAt ? 'text-sky-600 dark:text-sky-400 shrink-0' : 'text-amber-500 shrink-0 animate-pulse'}
            />
            <span>{deal.siteVisitScheduledAt ? 'Appt:' : 'No appt set'}</span>
          </span>
          {deal.siteVisitScheduledAt && (
            <span className="font-extrabold text-sky-700 dark:text-sky-300 truncate max-w-[140px]">
              {new Date(deal.siteVisitScheduledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}{' '}
              {new Date(deal.siteVisitScheduledAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
            </span>
          )}
        </div>
      )}

      {/* Customer Name & Source Badge */}
      <div className="flex items-start justify-between gap-1.5">
        <div className="min-w-0">
          <div className="font-bold text-xs text-[#1F1F1F] dark:text-slate-100 group-hover:text-[#1878B8] dark:group-hover:text-sky-400 transition-colors leading-snug truncate">
            {deal.name}
          </div>
          {isEditingAddress && onSaveAddress && onCancelEditAddress && onStreetChange && onCityChange && onZipChange ? (
            <div onClick={(e) => e.stopPropagation()}>
              <LeadAddressEditor
                card={deal as unknown as PipelineDealCard}
                street={addressFormStreet}
                city={addressFormCity}
                zip={addressFormZip}
                isSaving={isSavingAddress}
                onStreetChange={onStreetChange}
                onCityChange={onCityChange}
                onZipChange={onZipChange}
                onSave={(_c, e) => onSaveAddress(deal, e)}
                onCancel={onCancelEditAddress}
              />
            </div>
          ) : (
            <div className="flex items-center gap-1 text-[9.5px] text-slate-500 dark:text-slate-400 font-medium mt-0.5 truncate">
              <MapPin size={8.5} className="text-slate-400 shrink-0" />
              <span className="truncate">
                {deal.address ? `${deal.address}, ${deal.city}` : deal.city || 'No address set'}
              </span>
              {onStartEditAddress && (
                <button
                  type="button"
                  aria-label="Edit address"
                  onClick={(e) => onStartEditAddress(deal, e)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:text-sky-600 dark:hover:text-sky-400"
                >
                  <Pencil size={8.5} />
                </button>
              )}
            </div>
          )}
        </div>
        <LeadSourceBadge dealOrLead={deal} />
      </div>

      {/* Service Badge & Deal Value */}
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1 min-w-0">
          <span
            className={`text-[9px] px-1.5 py-0.5 rounded-md truncate max-w-[120px] ${getServiceBadgeClass(
              deal.serviceColor
            )}`}
          >
            {deal.service}
          </span>
          {Number(deal.roofSqf || 0) > 0 && (
            <span className="text-[9px] text-slate-400 dark:text-slate-500 font-medium shrink-0">
              {Number(deal.roofSqf).toLocaleString()} sq ft
            </span>
          )}
        </div>
        <DealValueBadge
          contractValue={deal.contractValue}
          estimateTotal={deal.estimateTotal}
          estimatedValue={deal.estimatedValue}
          roofSqf={deal.roofSqf}
          proposalSentAt={deal.proposalSentDate}
          isUploadedEstimate={deal.isUploadedEstimate}
          estimateTemplateKey={deal.estimateTemplateKey}
          isContractSigned={deal.isContractSigned}
          stageId={deal.stageId}
          canViewFinances={canViewFinances}
          size="xs"
        />
      </div>

      {/* SLA Status & Photos */}
      {(() => {
        const isSlaGeneric =
          !deal.slaText ||
          deal.slaText.trim().toLowerCase() === 'active in stage' ||
          deal.slaText.trim().toLowerCase().includes('in stage') ||
          deal.slaText.trim().toLowerCase() === 'on track';
        const hasSpecificSlaText = Boolean(deal.slaText && !isSlaGeneric);
        const showSlaBadge = isOverdue || deal.slaStatus === 'overdue' || deal.slaStatus === 'due_today' || hasSpecificSlaText;
        const showFooterRow = showSlaBadge || deal.photosCount > 0;

        if (!showFooterRow) return null;

        return (
          <div className="flex items-center justify-between text-[9.5px] pt-1 border-t border-slate-200/50 dark:border-white/10">
            {showSlaBadge ? (
              <span
                className={`font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1 truncate max-w-[170px] ${
                  isOverdue || deal.slaStatus === 'overdue'
                    ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60'
                    : deal.slaStatus === 'due_today'
                    ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                <Clock size={8.5} className="shrink-0" />
                <span className="truncate">{isOverdue ? 'Overdue Contact' : deal.slaText || (deal.slaStatus === 'due_today' ? 'Due today' : '')}</span>
              </span>
            ) : <span />}

            {deal.photosCount > 0 && (
              <span className="text-indigo-700 dark:text-indigo-400 font-bold flex items-center gap-0.5 shrink-0">
                <Camera size={9} />
                <span>{deal.photosCount}</span>
              </span>
            )}
          </div>
        );
      })()}

      {/* Claim Lead CTA */}
      {(!deal.assignedToUserId || !deal.estimator?.name || deal.estimator.name === 'Unassigned') &&
        canClaimLead && onClaimDeal && (
          <div onClick={(e) => e.stopPropagation()} className="pt-1">
            <button
              type="button"
              onClick={() => onClaimDeal(deal)}
              className="w-full py-1 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[9.5px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <UserCheck size={11} />
              <span>Claim Lead</span>
            </button>
          </div>
        )}

      {/* Reassign CTA */}
      {deal.assignedToUserId && canReassignLead && onReassignDeal && (
        <div onClick={(e) => e.stopPropagation()} className="pt-1">
          <button
            type="button"
            onClick={() => onReassignDeal(deal)}
            className="w-full py-0.5 px-2 rounded-lg bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-slate-300 font-bold text-[8.5px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
            title="Reassign to another staff member"
            aria-label="Reassign lead"
          >
            <UserCog size={10} />
            <span>Reassign</span>
          </button>
        </div>
      )}

      {/* Follow-Up Action */}
      {isFollowUpStage && onFollowUpDeal && (
        <div onClick={(e) => e.stopPropagation()} className="pt-1">
          <button
            type="button"
            onClick={() => onFollowUpDeal(deal)}
            className="w-full py-1 px-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-[9.5px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <PhoneCall size={10} />
            <span>Log Follow-Up Call</span>
          </button>
        </div>
      )}

      {/* Quick Advance Button */}
      {canAdvanceStage && nextStageDef && onAdvanceDeal && (
        <div onClick={(e) => e.stopPropagation()} className="pt-0.5">
          <button
            type="button"
            onClick={() => onAdvanceDeal(deal.id, nextStageDef.id)}
            className="w-full py-0.5 px-1.5 rounded-md bg-slate-100 hover:bg-sky-50 dark:bg-white/5 dark:hover:bg-sky-950/30 text-slate-600 hover:text-sky-700 dark:text-slate-400 dark:hover:text-sky-300 text-[8.5px] font-semibold flex items-center justify-center gap-1 transition-colors border border-slate-200/60 dark:border-white/5"
            title={`Advance to ${nextStageDef.shortTitle}`}
            aria-label={`Advance to ${nextStageDef.shortTitle}`}
          >
            <span>Advance to {nextStageDef.shortTitle}</span>
            <ArrowRight size={8} />
          </button>
        </div>
      )}
    </div>
  );
}
export default DealCard;
