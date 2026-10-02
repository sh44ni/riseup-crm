import React from 'react';
import { MapPin, Phone, Zap, Mail, Globe, UserCog, UserCheck, Clock, RotateCcw, Eye, X } from 'lucide-react';
import { Lead } from '@/types/leadTypes';
import { getServiceBadgeClass, getSourceBadges } from '@/utils/leadHelpers';
import { getTelUrl, getSmsUrl, getMailtoUrl } from '@/utils/contactValidation';
import { LOSS_REASONS } from '@/components/leads/MarkLeadLostModal';
import { DealValueText } from '@/components/shared/DealValueBadge';


interface LeadTableRowProps {
  lead: Lead;
  activeStage: string;
  canViewFinances: boolean;
  canClaimLead: boolean;
  canReassignLead: boolean;
  setInspectLead: (lead: Lead) => void;
  setClaimModalLead: (lead: Lead) => void;
  setReassignModalLead: (lead: Lead) => void;
  setLostModalLead: (lead: Lead) => void;
  handleReactivateLead: (leadId: string | number) => void;
}

export function LeadTableRow({
  lead,
  activeStage,
  canViewFinances,
  canClaimLead,
  canReassignLead,
  setInspectLead,
  setClaimModalLead,
  setReassignModalLead,
  setLostModalLead,
  handleReactivateLead
}: LeadTableRowProps) {
  const isLost = lead.status === 'lost';
  return (
    <tr
      className={`hover:bg-white/80 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer ${
        isLost ? 'bg-rose-50/20 dark:bg-rose-950/20' : ''
      }`}
      onClick={() => setInspectLead(lead)}
    >
      {/* 1. Homeowner & Property */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs shrink-0 shadow-2xs ${
              isLost
                ? 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                : 'bg-gradient-to-br from-sky-500 to-sky-600 text-white shadow-sky-500/20'
            }`}
          >
            {lead.name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="font-bold text-[#1F1F1F] dark:text-slate-100 group-hover:text-[#1878B8] dark:group-hover:text-sky-400 transition-colors flex items-center gap-1.5">
              <span className="truncate">{lead.name}</span>
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate flex items-center gap-1">
              <MapPin size={9} className="text-slate-400 dark:text-slate-500 shrink-0" />
              <span>{lead.address}, {lead.city}</span>
            </div>
          </div>
        </div>
      </td>

      {/* 2. Direct Contact Buttons */}
      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-1.5">
          {lead.phone ? (
            <a
              href={getTelUrl(lead.phone)}
              title={`Call ${lead.name}`}
              aria-label={`Call ${lead.name}`}
              className="w-7 h-7 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-[#1878B8] dark:text-sky-300 hover:bg-[#1878B8] dark:hover:bg-sky-600 hover:text-white transition-colors flex items-center justify-center shadow-2xs border border-sky-200/60 dark:border-sky-800/60 cursor-pointer"
            >
              <Phone size={12} />
            </a>
          ) : null}
          {lead.phone ? (
            <a
              href={getSmsUrl(lead.phone)}
              title={`SMS ${lead.name}`}
              aria-label={`SMS ${lead.name}`}
              className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-600 hover:text-white transition-colors flex items-center justify-center shadow-2xs border border-emerald-200/60 dark:border-emerald-800/60 cursor-pointer"
            >
              <Zap size={12} />
            </a>
          ) : null}
          {lead.email ? (
            <a
              href={getMailtoUrl(lead.email)}
              title={`Email ${lead.email}`}
              aria-label={`Email ${lead.name}`}
              className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-700 hover:text-white transition-colors flex items-center justify-center shadow-2xs border border-slate-200 dark:border-white/10 cursor-pointer"
            >
              <Mail size={12} />
            </a>
          ) : null}
        </div>
      </td>

      {/* 3. Roofing Service */}
      <td className="px-3 py-3">
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${getServiceBadgeClass(
            lead.serviceColor
          )}`}
        >
          <span className="truncate">{lead.service}</span>
          {Boolean((lead.roofSqf && lead.roofSqf > 0) || (lead.squares && lead.squares > 0)) && (
            <span className="opacity-70 font-normal">({(lead.roofSqf || lead.squares! * 100).toLocaleString()} sq ft)</span>
          )}
        </span>
      </td>

      {/* 4. Loss Root Cause (Only displayed when on Lost tab) */}
      {activeStage === 'lost' && (
        <td className="px-3 py-3 text-center">
          {lead.lossReason ? (
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                LOSS_REASONS[lead.lossReason]?.badgeClass || 'bg-rose-50 text-rose-700 border-rose-200'
              }`}
            >
              <span>{LOSS_REASONS[lead.lossReason]?.icon}</span>
              <span className="truncate">{LOSS_REASONS[lead.lossReason]?.label}</span>
            </span>
          ) : (
            <span className="text-slate-400 dark:text-slate-500 font-medium text-[10px]">Unspecified</span>
          )}
        </td>
      )}

      {/* 5. Source Attribution */}
      <td className="px-3 py-3">
        {(() => {
          const src = getSourceBadges(lead);
          return (
            <div className="flex flex-wrap items-center gap-1">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-bold text-[10px] border border-sky-200/80 dark:border-sky-800/60 shadow-2xs">
                {src.type === 'website' && <Globe size={10} className="text-sky-600 dark:text-sky-400" />}
                <span>{src.mainLabel}</span>
              </span>
              {src.detailLabel && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium text-[9.5px] border border-transparent dark:border-white/10">
                  {src.detailLabel}
                </span>
              )}
              {(lead.isClaimed || (lead.assignedRep && lead.assignedRep !== 'Unassigned')) && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold text-[9.5px] border border-emerald-200/80 dark:border-emerald-800/60">
                  Claimed: {lead.assignedRep}
                </span>
              )}
            </div>
          );
        })()}
      </td>

      {/* 6. Estimator */}
      <td className="px-3 py-3">
        {lead.assignedRep && lead.assignedRep !== 'Unassigned' ? (
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-300 text-[9px] flex items-center justify-center shrink-0">
              {lead.repInitials}
            </span>
            <span className="text-slate-800 dark:text-slate-200 font-medium text-[11px] truncate">
              {lead.assignedRep}
            </span>
            {canReassignLead && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setReassignModalLead(lead);
                }}
                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
                title="Reassign lead"
                aria-label={`Reassign lead ${lead.name}`}
              >
                <UserCog size={11} />
              </button>
            )}
          </div>
        ) : canClaimLead ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setClaimModalLead(lead);
            }}
            aria-label={`Claim lead ${lead.name}`}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[9.5px] shadow-2xs transition-colors cursor-pointer"
          >
            <UserCheck size={11} />
            <span>Claim</span>
          </button>
        ) : (
          <span className="text-slate-400 dark:text-slate-500 font-medium text-[11px]">Unassigned</span>
        )}
      </td>

      {/* 7. Value */}
      <td className="px-3 py-3 text-right font-black text-slate-900 dark:text-slate-100 text-xs">
        <DealValueText
          contractValue={lead.contractValue ?? (lead as any).contract_value}
          estimateTotal={lead.estimateTotal ?? (lead as any).estimate_total}
          estimatedValue={lead.estimatedValue ?? (lead.value > 0 ? lead.value : null) ?? (lead as any).raw_estimated_value ?? (lead as any).estimated_value}
          roofSqf={lead.roofSqf ?? (lead as any).roof_sqf ?? (lead.squares && lead.squares > 0 ? lead.squares * 100 : null)}
          proposalSentAt={lead.proposalSentAt ?? (lead as any).proposalSentDate ?? (lead as any).proposal_sent_at}
          isUploadedEstimate={lead.isUploadedEstimate ?? (lead as any).is_uploaded_estimate}
          estimateTemplateKey={lead.estimateTemplateKey ?? (lead as any).estimate_template_key}
          isContractSigned={lead.isContractSigned}
          stageId={lead.stageId || lead.pipelineStage || (lead as any).stage || lead.status}
          canViewFinances={canViewFinances}
          className="text-xs"
        />
      </td>

      {/* 8. Stage Status */}
      <td className="px-3 py-3">
        <span
          className={`capitalize px-2 py-0.5 rounded-md text-[10px] font-bold inline-block ${
            lead.status === 'new_lead'
              ? 'bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60'
              : lead.status === 'contacted'
              ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60'
              : lead.status === 'inspection_scheduled'
              ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60'
              : lead.status === 'proposal_sent'
              ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60'
              : lead.status === 'contract_won'
              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
              : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60'
          }`}
        >
          {lead.status === 'lost' ? 'Lost / Dead' : lead.status.replace(/_/g, ' ')}
        </span>
      </td>

      {/* 9. Received / SLA */}
      <td className="px-3 py-3">
        <div className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 leading-tight">
          {lead.createdDate || lead.createdAt}
        </div>
        <div className="text-[9.5px] text-slate-400 dark:text-slate-500 font-medium flex items-center gap-0.5">
          <Clock size={8.5} />
          <span>{lead.speedToCall ? `Resp: ${lead.speedToCall}` : lead.createdAt}</span>
        </div>
      </td>

      {/* 10. Actions */}
      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1.5">
          {isLost ? (
            <button
              type="button"
              onClick={() => handleReactivateLead(lead.id)}
              title="Reactivate Lead"
              aria-label={`Reactivate lead ${lead.name}`}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-600 hover:text-white border border-emerald-200/80 dark:border-emerald-800/60 transition-all font-bold text-[10px] cursor-pointer shadow-2xs"
            >
              <RotateCcw size={10} />
              <span>Reactivate</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setInspectLead(lead)}
                title="Inspect Lead"
                aria-label={`Inspect lead ${lead.name}`}
                className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-800 dark:hover:bg-slate-700 hover:text-white transition-colors flex items-center justify-center cursor-pointer shadow-2xs border border-transparent dark:border-white/10"
              >
                <Eye size={12} />
              </button>
              <button
                type="button"
                onClick={() => setLostModalLead(lead)}
                title="Mark as Lost"
                aria-label={`Mark lead ${lead.name} as lost`}
                className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 hover:bg-rose-600 hover:text-white transition-colors flex items-center justify-center cursor-pointer shadow-2xs border border-rose-100 dark:border-rose-900/60"
              >
                <X size={12} />
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}
