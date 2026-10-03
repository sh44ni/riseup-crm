import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Clock,
  MapPin,
  Pencil,
  Plus,
  Phone,
  Mail,
  UserCheck,
  UserCog,
  Hammer,
  Calendar,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';
import { DealCard, ColumnData } from './dashboardTypes';
import { LeadAddressEditor } from '@/components/pipeline/LeadAddressEditor';
import { DealValueBadge } from '@/components/shared/DealValueBadge';
import { LeadSourceBadge } from '@/components/shared/LeadSourceBadge';

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
  getServiceBadgeClass: (color: string) => string;
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
  const navigate = useNavigate();

  return (
    <div
      draggable={canAdvanceStage}
      onDragStart={(e) => {
        if (!canAdvanceStage) return;
        e.dataTransfer.effectAllowed = 'move';
        onDragStart(card.id, col.id);
      }}
      onDragEnd={onDragEnd}
      onClick={onClick}
      style={{
        borderColor: card.isFollowupOverdue ? '#ef4444' : isDark ? 'rgba(255,255,255,0.10)' : col.borderColor,
        borderLeftColor: card.isFollowupOverdue ? '#dc2626' : col.accentColor,
        borderLeftWidth: card.isFollowupOverdue ? '4px' : '3.5px',
      }}
      className={`rounded-xl p-2 space-y-1 ${
        canAdvanceStage ? 'cursor-grab active:cursor-grabbing active:opacity-50 active:scale-95' : 'cursor-pointer'
      } group shadow-2xs transition-all duration-100 select-none ${
        card.isFollowupOverdue
          ? 'bg-red-50/90 dark:bg-red-950/60 border-2 border-red-500 ring-1 ring-red-400/30'
          : 'liquid-glass-tile'
      }`}
    >
      {/* Overdue Alert Banner if follow-up SLA elapsed */}
      {card.isFollowupOverdue && (
        <div className="flex items-center justify-between px-1.5 py-0.5 rounded bg-red-600 text-white font-black text-[8px] tracking-wide animate-pulse">
          <span className="flex items-center gap-1">
            <AlertCircle size={8.5} className="shrink-0" />
            <span>OVERDUE • PAST DUE</span>
          </span>
          <span className="bg-white/20 px-1 rounded text-[7px]">URGENT</span>
        </div>
      )}

      {/* 24h Review countdown banner for proposals sent */}
      {col.id === 'est_sent' && card.hoursUntilAutoMove !== null && card.hoursUntilAutoMove !== undefined && (
        <div className="flex items-center justify-between px-1.5 py-0.5 rounded bg-amber-100/90 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 font-extrabold text-[8px] border border-amber-300/80 dark:border-amber-800/60">
          <span className="flex items-center gap-1">
            <Clock size={8.5} className="shrink-0 text-amber-700 dark:text-amber-400 animate-pulse" />
            <span>24h Follow-Up:</span>
          </span>
          <span>{card.hoursUntilAutoMove > 0 ? `${card.hoursUntilAutoMove}h left` : 'Due now'}</span>
        </div>
      )}

      {/* Estimate Appointment Badge for est_scheduled column */}
      {col.id === 'est_scheduled' && (
        <div className={`flex items-center justify-between px-1.5 py-0.5 rounded font-extrabold text-[8px] border ${
          card.siteVisitScheduledAt
            ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-900 dark:text-sky-200 border-sky-200/80 dark:border-sky-800/60'
            : 'bg-amber-100/90 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border-amber-300/80 dark:border-amber-800/60'
        }`}>
          <span className="flex items-center gap-1">
            <Calendar size={8.5} className={card.siteVisitScheduledAt ? 'shrink-0 text-sky-600 dark:text-sky-400' : 'shrink-0 text-amber-600 animate-pulse'} />
            <span>{card.siteVisitScheduledAt ? 'Appt:' : 'No appt — click to set'}</span>
          </span>
          {card.siteVisitScheduledAt && (
            <span className="truncate max-w-[100px]">
              {new Date(card.siteVisitScheduledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}{' '}
              {new Date(card.siteVisitScheduledAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
            </span>
          )}
        </div>
      )}

      {/* Name & Value Header */}
      <div className="flex items-start justify-between gap-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="font-bold text-[11px] text-[#1F1F1F] dark:text-slate-100 group-hover:text-[#1878B8] dark:group-hover:text-sky-400 transition-colors leading-snug truncate">
            {card.name}
          </div>
          {card.isContractSigned && (
            <span
              className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[7.5px] font-black bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-700/60 shadow-2xs shrink-0 animate-in fade-in duration-200"
              title="Contract Fully Signed"
            >
              <CheckCircle2 size={8.5} className="stroke-[2.5] text-emerald-600 dark:text-emerald-400" />
              <span>Signed</span>
            </span>
          )}
        </div>
        <DealValueBadge
            contractValue={card.contractValue ?? (card as any).contract_value}
            estimateTotal={card.estimateTotal ?? (card as any).estimate_total}
            estimatedValue={card.estimatedValue ?? (card as any).raw_estimated_value ?? (card as any).estimated_value}
            roofSqf={card.roofSqf ?? (card as any).roof_sqf}
            proposalSentAt={card.proposalSentAt ?? (card as any).proposalSentDate ?? (card as any).proposal_sent_at}
            isUploadedEstimate={card.isUploadedEstimate ?? (card as any).is_uploaded_estimate}
            estimateTemplateKey={card.estimateTemplateKey ?? (card as any).estimate_template_key}
            isContractSigned={card.isContractSigned}
            stageId={card.granularStage || card.pipelineStage}
            canViewFinances={canViewFinances}
            size="xs"
          />

      </div>

      {/* Location & Micro Actions / Inline Address Editor */}
      {editingAddressCardId === card.id ? (
        <LeadAddressEditor
          card={card as any}
          street={addressFormStreet}
          city={addressFormCity}
          zip={addressFormZip}
          isSaving={isSavingAddress}
          onStreetChange={onStreetChange}
          onCityChange={onCityChange}
          onZipChange={onZipChange}
          onSave={onSaveAddress}
          onCancel={onCancelEditAddress}
        />
      ) : (
        <div className="flex items-center justify-between text-[9.5px] text-slate-500 dark:text-slate-400 min-h-[20px]">
          {card.address ? (
            <div
              onClick={(e) => onStartEditAddress(card, e)}
              title="Click to edit address in Client 360"
              className="flex items-center gap-0.5 truncate hover:text-[#1878B8] dark:hover:text-sky-400 cursor-pointer group/addr transition-colors"
            >
              <MapPin size={8.5} className="shrink-0 text-[#1878B8] dark:text-sky-400" />
              <span className="truncate font-medium">{card.location}</span>
              <Pencil size={8} className="shrink-0 opacity-0 group-hover/addr:opacity-100 text-slate-400 hover:text-[#1878B8] ml-0.5 transition-opacity" />
            </div>
          ) : (
            <button
              type="button"
              onClick={(e) => onStartEditAddress(card, e)}
              title="Add missing property address to Client 360"
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8.5px] font-bold text-amber-800 dark:text-amber-200 bg-amber-100/90 dark:bg-amber-950/70 border border-amber-300/90 dark:border-amber-700/70 hover:bg-amber-200/90 dark:hover:bg-amber-900/80 transition-colors cursor-pointer shadow-2xs"
            >
              <Plus size={8.5} className="shrink-0 text-amber-700 dark:text-amber-400" />
              <span>+ Add address</span>
            </button>
          )}

          <div className="flex items-center gap-0.5 shrink-0 ml-1 text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-200">
            <button
              type="button"
              title="Call"
              onClick={(e) => e.stopPropagation()}
              className="p-0.5 hover:text-[#1878B8] dark:hover:text-sky-400 hover:bg-sky-50/80 dark:hover:bg-slate-800 rounded transition-colors"
            >
              <Phone size={9} />
            </button>
            <button
              type="button"
              title="Email"
              onClick={(e) => e.stopPropagation()}
              className="p-0.5 hover:text-[#1878B8] dark:hover:text-sky-400 hover:bg-sky-50/80 dark:hover:bg-slate-800 rounded transition-colors"
            >
              <Mail size={9} />
            </button>
          </div>
        </div>
      )}

      {/* Source Badges */}
      <div className="flex items-center gap-1 flex-wrap pt-0.5">
        <LeadSourceBadge dealOrLead={card} />

        {card.assignedToName && card.assignedToName !== 'Unassigned' && (
          <span className="text-[8px] font-bold px-1.5 py-0.2 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 shrink-0 truncate max-w-[120px]">
            Claimed: {card.assignedToName.split(' ')[0]}
          </span>
        )}
      </div>

      {/* Claim Lead CTA for unassigned leads */}
      {(!card.assignedToUserId || !card.assignedToName || card.assignedToName === 'Unassigned') && canClaimLead && (
        <div onClick={(e) => e.stopPropagation()} className="pt-1">
          <button
            type="button"
            onClick={() => onClaimLead(card)}
            className="w-full py-1 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[9px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <UserCheck size={10} />
            <span>Claim Lead</span>
          </button>
        </div>
      )}

      {/* Reassign CTA for assigned leads (restricted to users with leads.reassign) */}
      {card.assignedToUserId && canReassignLead && (
        <div onClick={(e) => e.stopPropagation()} className="pt-1">
          <button
            type="button"
            onClick={() => onReassignLead(card)}
            className="w-full py-0.5 px-2 rounded-lg bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-slate-300 font-bold text-[8.5px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
            title="Reassign to another staff member"
          >
            <UserCog size={9} />
            <span>Reassign</span>
          </button>
        </div>
      )}

      {/* Bottom Service Pill Tag & Time */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 dark:border-white/10">
        <div className="flex items-center gap-1 min-w-0">
          <span
            className={`text-[8.5px] px-1.5 py-0.2 rounded-md truncate max-w-[110px] ${getServiceBadgeClass(
              card.serviceColor
            )}`}
          >
            {card.service}
          </span>
          {typeof card.roofSqf === 'number' && card.roofSqf > 0 && (
            <span className="text-[8.5px] text-slate-400 dark:text-slate-500 font-medium shrink-0">
              {card.roofSqf.toLocaleString()} sq ft
            </span>
          )}
        </div>
        <span className="text-[8.5px] text-slate-400 dark:text-slate-400 font-medium">
          {card.time}
        </span>
      </div>

      {/* Follow-Up Column Actions: 48-hour countdown & Log Contact button */}
      {col.id === 'follow_up' && (
        <div className="pt-1 space-y-1">
          {card.isFollowupOverdue ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onFollowUp(card);
              }}
              className="w-full px-2 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white font-black text-[9px] flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-xs"
            >
              <Phone size={9} />
              <span>Follow Up Now (Overdue)</span>
            </button>
          ) : (
            <>
              <div className="flex items-center justify-between text-[8px] font-bold text-purple-700 dark:text-purple-300 bg-purple-50/80 dark:bg-purple-950/60 px-1.5 py-0.5 rounded border border-purple-200/70 dark:border-purple-800/60">
                <span className="flex items-center gap-0.5">
                  <Clock size={8} />
                  <span>Next:</span>
                </span>
                <span>
                  {card.followupHoursRemaining !== undefined && card.followupHoursRemaining <= 48
                    ? `${card.followupHoursRemaining}h remaining`
                    : card.followupDaysRemaining != null
                      ? `${card.followupDaysRemaining}d remaining`
                      : '48h SLA'}
                </span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onFollowUp(card);
                }}
                className="w-full px-1.5 py-0.5 rounded-md bg-purple-100/90 dark:bg-purple-950/70 hover:bg-purple-200 dark:hover:bg-purple-900/80 text-purple-900 dark:text-purple-200 font-extrabold text-[8.5px] flex items-center justify-center gap-1 cursor-pointer transition-colors border border-purple-300/60 dark:border-purple-700/60"
              >
                <Phone size={8.5} />
                <span>Log Contact (+48h SLA)</span>
              </button>
            </>
          )}
        </div>
      )}

      {/* Contract Sent Column Actions & Live Status */}
      {(col.id === 'contract_sent' || col.id === 'contract_signed') && (
        <div className="pt-1 space-y-1">
          {card.isContractSigned ? (
            <div className="flex items-center justify-between px-1.5 py-0.5 rounded bg-emerald-50/90 dark:bg-emerald-950/70 text-emerald-900 dark:text-emerald-200 font-bold text-[8.5px] border border-emerald-300/80 dark:border-emerald-700/60 shadow-2xs">
              <span className="flex items-center gap-1">
                <CheckCircle2 size={9} className="shrink-0 text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />
                <span>Contract Fully Signed</span>
              </span>
              <span className="text-[7.5px] font-black uppercase px-1 rounded bg-emerald-200/70 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                ✓ Ready for Ops
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-between px-1.5 py-0.5 rounded bg-amber-50/90 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 font-bold text-[8.5px] border border-amber-300/70 dark:border-amber-800/50">
              <span className="flex items-center gap-1">
                <Clock size={8.5} className="shrink-0 text-amber-600 dark:text-amber-400 stroke-[2]" />
                <span>Contract Sent</span>
              </span>
              <span className="text-[7.5px] font-extrabold uppercase px-1 rounded bg-amber-200/60 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300">
                Awaiting Sign
              </span>
            </div>
          )}

          <div onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => navigate('/pipeline?stage=contract_sent')}
              className="w-full px-2 py-0.5 rounded-lg bg-amber-50 hover:bg-amber-100/80 dark:bg-white/5 dark:hover:bg-white/10 text-amber-800 dark:text-amber-300 font-bold text-[8.5px] flex items-center justify-center gap-1 cursor-pointer transition-colors border border-amber-200/80 dark:border-amber-900/40"
              title="Open sent contracts in Pipeline"
            >
              <span>View in Pipeline</span>
              <ChevronRight size={9} />
            </button>
          </div>
        </div>
      )}

      {/* Active Jobs Link to Production Work Orders */}
      {col.id === 'active_jobs' && (
        <div className="pt-1" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => navigate('/jobs')}
            className="w-full px-2 py-1 rounded-lg bg-gradient-to-r from-[#1878B8] to-[#55C4F5] hover:brightness-110 text-white font-extrabold text-[9px] flex items-center justify-center gap-1 cursor-pointer transition-all shadow-xs border border-sky-400/40 hover:scale-[1.01] active:scale-[0.99]"
          >
            <Hammer size={9.5} />
            <span>Track in Jobs</span>
            <ChevronRight size={10} />
          </button>
        </div>
      )}
    </div>
  );
}
