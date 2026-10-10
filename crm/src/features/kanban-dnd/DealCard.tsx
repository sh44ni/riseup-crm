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
} from 'lucide-react';
import {
  PipelineDealItem,
  StageDefinition,
  PipelineStageId,
} from '@/components/pipeline/pipelineTypes';
import { DealValueBadge } from '@/components/shared/DealValueBadge';
import { LeadSourceBadge } from '@/components/shared/LeadSourceBadge';
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

function formatCompactService(service?: string): string {
  if (!service) return 'Roofing';
  const trimmed = service.trim();
  const lower = trimmed.toLowerCase();
  if (lower.includes('residential')) return 'Residential';
  if (lower.includes('commercial')) return 'Commercial';
  if (lower.includes('shingle')) return 'Shingle';
  if (lower.includes('tile')) return 'Tile Roof';
  if (lower.includes('torch')) return 'Torch Down';
  if (lower.includes('repair')) return 'Repair';
  if (lower.includes('maintenance')) return 'Maintenance';
  if (lower.includes('gutter')) return 'Gutters';
  return trimmed.replace(/\s+Roofing$/i, '').replace(/\s+Roof$/i, '');
}

function DealCardComponent({
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
}: DealCardComponentProps) {
  const isOverdue = Boolean(deal.isFollowupOverdue);
  const isEstimateSent = deal.stageId === 'estimate_sent';
  const isFollowUpStage = deal.stageId === 'follow_up';

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
      className={`rounded-xl p-2 space-y-1.5 ${
        canAdvanceStage
          ? 'cursor-grab active:cursor-grabbing active:opacity-50 active:scale-95'
          : 'cursor-pointer'
      } group shadow-2xs hover:shadow-md transition-all select-none transform-gpu ${
        isOverdue
          ? 'bg-red-50/85 dark:bg-red-950/40 border-2 border-red-500 ring-2 ring-red-400/25 shadow-red-100/50'
          : 'liquid-glass-tile'
      }`}
    >
      {/* Overdue Alert Banner */}
      {isOverdue && (
        <div className="flex items-center justify-between px-1.5 py-0.5 rounded-md bg-red-600 text-white font-black text-[8.5px] tracking-wide animate-pulse shadow-2xs">
          <span className="flex items-center gap-1">
            <AlertTriangle size={9} className="shrink-0" />
            <span>OVERDUE &bull; Follow-Up Past Due</span>
          </span>
          <span className="bg-white/25 px-1 py-0.2 rounded text-[7px]">URGENT</span>
        </div>
      )}

      {/* 24-Hour Review Countdown for Estimate Sent */}
      {isEstimateSent && (
        <div className="flex items-center justify-between text-[8.5px] px-1.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/50 border border-amber-200/90 dark:border-amber-800/60 text-amber-900 dark:text-amber-300 font-bold">
          <span className="flex items-center gap-1">
            <Clock size={8.5} className="text-amber-600 dark:text-amber-400 animate-pulse shrink-0" />
            <span>24h Review:</span>
          </span>
          <span className="font-extrabold text-amber-700 dark:text-amber-400">
            {deal.hoursUntilAutoMove !== null && deal.hoursUntilAutoMove !== undefined
              ? deal.hoursUntilAutoMove > 0
                ? `${deal.hoursUntilAutoMove}h left`
                : 'Auto-moving'
              : '24h window'}
          </span>
        </div>
      )}

      {/* Follow-Up Cadence SLA Info */}
      {isFollowUpStage && !isOverdue && (
        <div className="flex items-center justify-between text-[8.5px] px-1.5 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/50 border border-purple-200/90 dark:border-purple-800/60 text-purple-900 dark:text-purple-300 font-bold">
          <span className="flex items-center gap-1">
            <Clock size={8.5} className="text-purple-600 dark:text-purple-400 shrink-0" />
            <span>Next Follow-Up:</span>
          </span>
          <span className="font-extrabold text-purple-700 dark:text-purple-300">
            {deal.followupHoursRemaining !== undefined && deal.followupHoursRemaining <= 48
              ? `${deal.followupHoursRemaining}h left`
              : deal.followupDaysRemaining !== undefined && deal.followupDaysRemaining > 0
              ? `${deal.followupDaysRemaining}d left`
              : '48h SLA'}
          </span>
        </div>
      )}

      {/* Estimate Appointment Badge */}
      {deal.stageId === 'estimate_scheduled' && (
        <div
          className={`flex items-center justify-between text-[8.5px] px-1.5 py-0.5 rounded-md font-bold ${
            deal.siteVisitScheduledAt
              ? 'bg-sky-50 dark:bg-sky-950/50 border border-sky-200/90 dark:border-sky-800/60 text-sky-900 dark:text-sky-300'
              : 'bg-amber-50 dark:bg-amber-950/50 border border-amber-200/90 dark:border-amber-800/60 text-amber-900 dark:text-amber-300'
          }`}
        >
          <span className="flex items-center gap-1">
            <Calendar
              size={8.5}
              className={deal.siteVisitScheduledAt ? 'text-sky-600 dark:text-sky-400 shrink-0' : 'text-amber-500 shrink-0 animate-pulse'}
            />
            <span>{deal.siteVisitScheduledAt ? 'Appt:' : 'No appt set'}</span>
          </span>
          {deal.siteVisitScheduledAt && (
            <span className="font-extrabold text-sky-700 dark:text-sky-300 truncate max-w-[120px]">
              {new Date(deal.siteVisitScheduledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}{' '}
              {new Date(deal.siteVisitScheduledAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
            </span>
          )}
        </div>
      )}

      {/* Row 1: Customer Name (Left) & Deal Value (Right) */}
      <div className="flex items-center justify-between gap-1.5 min-w-0">
        <div className="font-bold text-[11.5px] leading-tight text-slate-900 dark:text-slate-100 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors truncate min-w-0 flex-1">
          {deal.name}
        </div>
        <div className="shrink-0">
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
      </div>

      {/* Row 2: Location */}
      <div className="flex items-center gap-1 text-[9px] text-slate-500 dark:text-slate-400 font-medium truncate">
        <MapPin size={8.5} className="text-slate-400 shrink-0" />
        <span className="truncate">
          {deal.address ? `${deal.address}, ${deal.city}` : deal.city || 'No address set'}
        </span>
      </div>

      {/* Row 3: Service Badge, Roof Sq Ft & Lead Source Micro-Badges */}
      <div className="flex items-center gap-1 flex-wrap min-w-0">
        <span
          className={`text-[8.5px] px-1.5 py-0.2 rounded font-semibold tracking-tight truncate max-w-[95px] ${getServiceBadgeClass(
            deal.serviceColor
          )}`}
          title={deal.service}
        >
          {formatCompactService(deal.service)}
        </span>
        {Number(deal.roofSqf || 0) > 0 && (
          <span className="text-[8.5px] px-1 py-0.2 rounded bg-slate-100/90 dark:bg-white/5 text-slate-600 dark:text-slate-400 font-medium shrink-0 border border-slate-200/60 dark:border-white/5">
            {Number(deal.roofSqf).toLocaleString()} sq ft
          </span>
        )}
        <LeadSourceBadge dealOrLead={deal} size="xs" />
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
          <div className="flex items-center justify-between text-[9px] pt-1 border-t border-slate-200/50 dark:border-white/10">
            {showSlaBadge ? (
              <span
                className={`font-bold px-1.5 py-0.2 rounded flex items-center gap-1 truncate max-w-[150px] ${
                  isOverdue || deal.slaStatus === 'overdue'
                    ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60'
                    : deal.slaStatus === 'due_today'
                    ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                <Clock size={8} className="shrink-0" />
                <span className="truncate">{isOverdue ? 'Overdue Contact' : deal.slaText || (deal.slaStatus === 'due_today' ? 'Due today' : '')}</span>
              </span>
            ) : <span />}

            {deal.photosCount > 0 && (
              <span className="text-indigo-700 dark:text-indigo-400 font-bold flex items-center gap-0.5 shrink-0 text-[8.5px]">
                <Camera size={8.5} />
                <span>{deal.photosCount}</span>
              </span>
            )}
          </div>
        );
      })()}

      {/* Row 4: Assignee & Action Row */}
      {(!deal.assignedToUserId || !deal.estimator?.name || deal.estimator.name === 'Unassigned') ? (
        canClaimLead && onClaimDeal ? (
          <div onClick={(e) => e.stopPropagation()} className="pt-0.5">
            <button
              type="button"
              onClick={() => onClaimDeal(deal)}
              className="w-full py-0.5 px-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[9px] flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-2xs"
            >
              <UserCheck size={9.5} />
              <span>Claim Lead</span>
            </button>
          </div>
        ) : null
      ) : (
        <div
          onClick={(e) => e.stopPropagation()}
          className="flex items-center justify-between text-[9px] pt-1 border-t border-slate-200/50 dark:border-white/5"
        >
          <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400 min-w-0">
            <span className="w-3.5 h-3.5 rounded-full bg-slate-200/80 dark:bg-slate-700/80 text-slate-700 dark:text-slate-300 font-bold text-[7.5px] flex items-center justify-center shrink-0">
              {(deal.estimator?.name || 'A').charAt(0).toUpperCase()}
            </span>
            <span className="truncate max-w-[85px] font-medium" title={deal.estimator?.name || 'Assigned'}>
              {deal.estimator?.name?.split(' ')[0] || 'Assigned'}
            </span>
          </div>

          {canReassignLead && onReassignDeal && (
            <button
              type="button"
              onClick={() => onReassignDeal(deal)}
              className="text-[8px] font-bold px-1.5 py-0.2 rounded bg-slate-100/90 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center gap-0.5 transition-colors cursor-pointer"
              title="Reassign to another staff member"
              aria-label="Reassign lead"
            >
              <UserCog size={8.5} />
              <span>Reassign</span>
            </button>
          )}
        </div>
      )}

      {/* Follow-Up Action */}
      {isFollowUpStage && onFollowUpDeal && (
        <div onClick={(e) => e.stopPropagation()} className="pt-0.5">
          <button
            type="button"
            onClick={() => onFollowUpDeal(deal)}
            className="w-full py-0.5 px-2 rounded-md bg-purple-600 hover:bg-purple-700 text-white font-bold text-[9px] flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-2xs"
          >
            <PhoneCall size={9.5} />
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
            className="w-full py-0.5 px-1.5 rounded-md bg-slate-100 hover:bg-sky-50 dark:bg-white/5 dark:hover:bg-sky-950/30 text-slate-600 hover:text-sky-700 dark:text-slate-400 dark:hover:text-sky-300 text-[8px] font-semibold flex items-center justify-center gap-1 transition-colors border border-slate-200/60 dark:border-white/5"
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

function areDealCardPropsEqual(
  prev: DealCardComponentProps,
  next: DealCardComponentProps
): boolean {
  if (prev.deal.id !== next.deal.id) return false;
  if (prev.deal.stageId !== next.deal.stageId) return false;
  if (prev.deal.name !== next.deal.name) return false;
  if (prev.deal.value !== next.deal.value) return false;
  if (prev.deal.contractValue !== next.deal.contractValue) return false;
  if (prev.deal.estimateTotal !== next.deal.estimateTotal) return false;
  if (prev.deal.estimatedValue !== next.deal.estimatedValue) return false;
  if (prev.deal.isFollowupOverdue !== next.deal.isFollowupOverdue) return false;
  if (prev.deal.hoursUntilAutoMove !== next.deal.hoursUntilAutoMove) return false;
  if (prev.deal.followupHoursRemaining !== next.deal.followupHoursRemaining) return false;
  if (prev.deal.followupDaysRemaining !== next.deal.followupDaysRemaining) return false;
  if (prev.deal.siteVisitScheduledAt !== next.deal.siteVisitScheduledAt) return false;
  if (prev.deal.address !== next.deal.address) return false;
  if (prev.deal.city !== next.deal.city) return false;
  if (prev.deal.service !== next.deal.service) return false;
  if (prev.deal.serviceColor !== next.deal.serviceColor) return false;
  if (prev.deal.roofSqf !== next.deal.roofSqf) return false;
  if (prev.deal.assignedToUserId !== next.deal.assignedToUserId) return false;
  if (prev.deal.estimator?.name !== next.deal.estimator?.name) return false;
  if (prev.deal.photosCount !== next.deal.photosCount) return false;
  if (prev.canAdvanceStage !== next.canAdvanceStage) return false;
  if (prev.canViewFinances !== next.canViewFinances) return false;
  if (prev.canClaimLead !== next.canClaimLead) return false;
  if (prev.canReassignLead !== next.canReassignLead) return false;
  if (prev.isDark !== next.isDark) return false;
  if (prev.stage.id !== next.stage.id) return false;
  if (prev.stage.accentColor !== next.stage.accentColor) return false;
  if (prev.nextStageDef?.id !== next.nextStageDef?.id) return false;
  return true;
}

export const DealCard = React.memo(DealCardComponent, areDealCardPropsEqual);
export default DealCard;
