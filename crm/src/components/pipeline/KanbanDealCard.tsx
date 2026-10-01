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

export interface KanbanDealCardProps {
  deal: PipelineDealItem;
  stage: StageDefinition;
  nextStageDef?: StageDefinition;
  canViewFinances: boolean;
  canAdvanceStage: boolean;
  canClaimLead: boolean;
  canReassignLead: boolean;
  onSelectDeal: (deal: PipelineDealItem) => void;
  onAdvanceDeal: (dealId: string, nextStageId: PipelineStageId) => void;
  onDragStart?: (dealId: string, stageId: PipelineStageId) => void;
  onDragEnd?: () => void;
  onClaimDeal?: (deal: PipelineDealItem) => void;
  onReassignDeal?: (deal: PipelineDealItem) => void;
  onFollowUpDeal?: (deal: PipelineDealItem) => void;
  getServiceBadgeClass: (color: string) => string;
}

export function KanbanDealCard({
  deal,
  stage,
  nextStageDef,
  canViewFinances,
  canAdvanceStage,
  canClaimLead,
  canReassignLead,
  onSelectDeal,
  onAdvanceDeal,
  onDragStart,
  onDragEnd,
  onClaimDeal,
  onReassignDeal,
  onFollowUpDeal,
  getServiceBadgeClass,
}: KanbanDealCardProps) {
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
        onDragStart?.(deal.id, stage.id);
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
      {/* Overdue Urgent Alert Banner */}
      {isOverdue && (
        <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-red-600 text-white font-black text-[9px] tracking-wide animate-pulse shadow-2xs">
          <span className="flex items-center gap-1">
            <AlertTriangle size={10} className="shrink-0" />
            <span>OVERDUE • Follow-Up Past Due</span>
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
        <div className={`flex items-center justify-between text-[9px] px-2 py-0.5 rounded-md font-bold ${
          deal.siteVisitScheduledAt
            ? 'bg-sky-50 dark:bg-sky-950/50 border border-sky-200/90 dark:border-sky-800/60 text-sky-900 dark:text-sky-300'
            : 'bg-amber-50 dark:bg-amber-950/50 border border-amber-200/90 dark:border-amber-800/60 text-amber-900 dark:text-amber-300'
        }`}>
          <span className="flex items-center gap-1">
            <Calendar size={9} className={deal.siteVisitScheduledAt ? 'text-sky-600 dark:text-sky-400 shrink-0' : 'text-amber-500 shrink-0 animate-pulse'} />
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

      {/* Name & Source Badge */}
      <div className="flex items-start justify-between gap-1.5">
        <div className="min-w-0">
          <div className="font-bold text-xs text-[#1F1F1F] dark:text-slate-100 group-hover:text-[#1878B8] dark:group-hover:text-sky-400 transition-colors leading-snug truncate">
            {deal.name}
          </div>
          <div className="flex items-center gap-1 text-[9.5px] text-slate-500 dark:text-slate-400 font-medium mt-0.5 truncate">
            <MapPin size={8.5} className="text-slate-400 shrink-0" />
            <span className="truncate">
              {deal.address}, {deal.city}
            </span>
          </div>
        </div>
        {deal.leadSource === 'website' ? (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60 shrink-0">
            Website
          </span>
        ) : (
          <span
            className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 shrink-0 truncate max-w-[100px]"
            title={deal.createdByName || deal.leadSourceDetail || 'Manual'}
          >
            {deal.createdByName || deal.leadSourceDetail || 'Manual'}
          </span>
        )}
      </div>

      {/* Service Badge & Deal Value */}
      <div className="flex items-center justify-between gap-1">
        <span
          className={`text-[9px] px-1.5 py-0.5 rounded-md truncate max-w-[170px] ${getServiceBadgeClass(
            deal.serviceColor
          )}`}
        >
          {deal.service}
        </span>
        <span className="text-xs font-black text-[#1F1F1F] dark:text-white shrink-0">
          {!canViewFinances ? (
            <span className="text-slate-400 font-bold text-[10px]">🔒 $•••</span>
          ) : deal.value > 0 ? (
            `$${deal.value.toLocaleString()}`
          ) : (
            <span className="text-slate-400 font-medium text-[10px]">TBD</span>
          )}
        </span>
      </div>

      {/* SLA Status & Photos */}
      <div className="flex items-center justify-between text-[9.5px] pt-1 border-t border-slate-200/50 dark:border-white/10">
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
          <span className="truncate">{isOverdue ? 'Overdue Contact' : deal.slaText}</span>
        </span>

        {deal.photosCount > 0 && (
          <span className="text-indigo-700 dark:text-indigo-400 font-bold flex items-center gap-0.5 shrink-0">
            <Camera size={9} />
            <span>{deal.photosCount}</span>
          </span>
        )}
      </div>

      {/* Claim Lead CTA for unassigned leads */}
      {(!deal.assignedToUserId || !deal.estimator?.name || deal.estimator.name === 'Unassigned') &&
        canClaimLead && (
          <div onClick={(e) => e.stopPropagation()} className="pt-1">
            <button
              type="button"
              onClick={() => onClaimDeal?.(deal)}
              className="w-full py-1 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[9.5px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <UserCheck size={11} />
              <span>Claim Lead</span>
            </button>
          </div>
        )}

      {/* Reassign CTA for assigned leads */}
      {deal.assignedToUserId && canReassignLead && (
        <div onClick={(e) => e.stopPropagation()} className="pt-1">
          <button
            type="button"
            onClick={() => onReassignDeal?.(deal)}
            className="w-full py-0.5 px-2 rounded-lg bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-slate-300 font-bold text-[8.5px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
            title="Reassign to another staff member"
            aria-label="Reassign lead"
          >
            <UserCog size={10} />
            <span>Reassign</span>
          </button>
        </div>
      )}

      {/* Follow-Up Action CTA */}
      {isFollowUpStage && (
        <div onClick={(e) => e.stopPropagation()}>
          {isOverdue ? (
            <button
              type="button"
              onClick={() => onFollowUpDeal?.(deal)}
              className="w-full mt-0.5 py-1.5 px-2 rounded-lg bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-extrabold text-[10px] flex items-center justify-center gap-1.5 shadow-xs hover:shadow transition-all cursor-pointer"
            >
              <PhoneCall size={11} className="animate-bounce shrink-0" />
              <span>Follow Up Now (Reset SLA)</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onFollowUpDeal?.(deal)}
              className="w-full mt-0.5 py-1 px-2 rounded-lg bg-purple-100/90 dark:bg-purple-950/60 hover:bg-purple-200 dark:hover:bg-purple-900/60 border border-purple-300 dark:border-purple-800/60 text-purple-900 dark:text-purple-300 font-bold text-[9.5px] flex items-center justify-center gap-1 transition-all cursor-pointer"
            >
              <PhoneCall size={10} className="shrink-0 text-purple-700 dark:text-purple-400" />
              <span>Log Contact (+7d SLA)</span>
            </button>
          )}
        </div>
      )}

      {/* Footer: Estimator + Advance Button */}
      <div
        className="flex items-center justify-between pt-1 text-[10px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-1.5">
          {deal.estimator.avatar ? (
            <img
              src={deal.estimator.avatar}
              alt={deal.estimator.name}
              className="w-4 h-4 rounded-full object-cover border border-white dark:border-slate-800"
            />
          ) : (
            <div className="w-4 h-4 rounded-full bg-gradient-to-br from-[#1878B8] to-[#55C4F5] flex items-center justify-center text-white font-black text-[7px] border border-white dark:border-slate-800 shrink-0">
              {deal.estimator.name
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase()}
            </div>
          )}
          <span className="text-[9.5px] font-semibold text-slate-500 dark:text-slate-400">
            {deal.estimator.name !== 'Unassigned'
              ? `Claimed: ${deal.estimator.name.split(' ')[0]}`
              : 'Unassigned'}
          </span>
        </div>

        {nextStageDef && canAdvanceStage && (
          <button
            type="button"
            onClick={() => onAdvanceDeal(deal.id, nextStageDef.id)}
            className="flex items-center gap-1 text-[9.5px] font-bold px-2 py-0.5 rounded-md bg-sky-100 text-[#0284c7] hover:bg-[#1878B8] hover:text-white dark:bg-sky-950/60 dark:text-sky-300 dark:hover:bg-sky-600 dark:hover:text-white transition-all cursor-pointer"
            title={`Advance to Step ${nextStageDef.stepNumber}: ${nextStageDef.shortTitle}`}
            aria-label={`Advance to ${nextStageDef.shortTitle}`}
          >
            <span>Next</span>
            <ArrowRight size={9} />
          </button>
        )}
      </div>
    </div>
  );
}
