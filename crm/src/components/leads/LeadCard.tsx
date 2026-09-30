import React from 'react';
import { MapPin, Globe, UserCog, UserCheck, Phone, Zap, Mail, RotateCcw } from 'lucide-react';
import { Lead } from '@/types/leadTypes';
import { getServiceBadgeClass, getSourceBadges } from '@/utils/leadHelpers';
import { getTelUrl, getSmsUrl, getMailtoUrl } from '@/utils/contactValidation';
import { LOSS_REASONS } from '@/components/leads/MarkLeadLostModal';

interface LeadCardProps {
  lead: Lead;
  canViewFinances: boolean;
  canClaimLead: boolean;
  canReassignLead: boolean;
  setInspectLead: (lead: Lead) => void;
  setClaimModalLead: (lead: Lead) => void;
  setReassignModalLead: (lead: Lead) => void;
  handleReactivateLead: (leadId: string | number) => void;
}

export function LeadCard({
  lead,
  canViewFinances,
  canClaimLead,
  canReassignLead,
  setInspectLead,
  setClaimModalLead,
  setReassignModalLead,
  handleReactivateLead
}: LeadCardProps) {
  const isLost = lead.status === 'lost';
  return (
    <div
      onClick={() => setInspectLead(lead)}
      className={`light-glass-card rounded-2xl p-4 border border-white/85 dark:border-white/10 shadow-sm hover:shadow-md hover:border-sky-300 dark:hover:border-sky-500/50 transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-3 ${
        isLost ? 'bg-rose-50/20 dark:bg-rose-950/20 border-rose-200/60 dark:border-rose-900/40' : ''
      }`}
    >
      {/* Card Top: Avatar, Name, Status & Value */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-xs shrink-0 shadow-2xs ${
              isLost ? 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400' : 'bg-gradient-to-tr from-[#1878B8] to-[#55C4F5] text-white'
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
            <div className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate flex items-center gap-1.5">
              <span>{lead.name}</span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate flex items-center gap-1">
              <MapPin size={10} className="text-slate-400 shrink-0" />
              <span>{lead.address}, {lead.city}</span>
            </div>
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="text-sm font-black text-slate-900 dark:text-slate-100">
            {canViewFinances ? `$${lead.value.toLocaleString()}` : '—'}
          </div>
          <div className="text-[10px] text-slate-400 font-semibold">{lead.squares || 30} squares</div>
        </div>
      </div>

      {/* Card Middle: Service Badge & Source / Loss Reason */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10.5px] font-bold ${getServiceBadgeClass(
            lead.serviceColor
          )}`}
        >
          <span>{lead.service}</span>
        </span>

        {isLost && lead.lossReason ? (
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${
              LOSS_REASONS[lead.lossReason]?.badgeClass || 'bg-rose-50 text-rose-700 border-rose-200'
            }`}
          >
            <span>{LOSS_REASONS[lead.lossReason]?.icon}</span>
            <span>{LOSS_REASONS[lead.lossReason]?.label}</span>
          </span>
        ) : lead.source === 'website' ? (
          (() => {
            const src = getSourceBadges(lead);
            return (
              <div className="flex items-center gap-1 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-bold text-[10px] border border-sky-200/80 dark:border-sky-800/60 shadow-2xs">
                  <Globe size={10} className="text-sky-600" />
                  <span>Website Lead</span>
                </span>
                {src.detailLabel && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium text-[9.5px]">
                    {src.detailLabel}
                  </span>
                )}
                {(lead.isClaimed || (lead.assignedRep && lead.assignedRep !== 'Unassigned')) ? (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold text-[9.5px] border border-emerald-200/80 dark:border-emerald-800/60">
                    <span>Claimed: {lead.assignedRep}</span>
                    {canReassignLead && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setReassignModalLead(lead);
                        }}
                        className="p-0.5 rounded hover:bg-emerald-200 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 transition-colors cursor-pointer"
                        title="Reassign lead"
                        aria-label={`Reassign lead ${lead.name}`}
                      >
                        <UserCog size={10} />
                      </button>
                    )}
                  </span>
                ) : canClaimLead ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setClaimModalLead(lead);
                    }}
                    aria-label={`Claim lead ${lead.name}`}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[9.5px] shadow-2xs transition-colors cursor-pointer"
                  >
                    <UserCheck size={10} />
                    <span>Claim Lead</span>
                  </button>
                ) : (
                  <span className="text-slate-400 dark:text-slate-500 font-medium text-[10px]">Unassigned</span>
                )}
              </div>
            );
          })()
        ) : (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[10px] border border-slate-200/60 dark:border-white/10">
            {lead.sourceLabel}
          </span>
        )}
      </div>

      {/* Notes Preview */}
      {lead.notes && (
        <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed bg-white/50 dark:bg-white/5 p-2 rounded-xl border border-slate-200/50 dark:border-white/10">
          {lead.notes}
        </p>
      )}

      {/* Card Bottom: Contact triggers & Rep */}
      <div
        className="pt-2 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between text-xs"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-1.5">
          {lead.phone ? (
            <a
              href={getTelUrl(lead.phone)}
              className="w-7 h-7 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-[#1878B8] dark:text-sky-300 hover:bg-[#1878B8] hover:text-white transition-colors flex items-center justify-center border border-sky-200/60 dark:border-sky-800/60 shadow-2xs"
              title="Call"
              aria-label={`Call ${lead.name}`}
            >
              <Phone size={12} />
            </a>
          ) : null}
          {lead.phone ? (
            <a
              href={getSmsUrl(lead.phone)}
              className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-600 hover:text-white transition-colors flex items-center justify-center border border-emerald-200/60 dark:border-emerald-800/60 shadow-2xs"
              title="SMS"
              aria-label={`SMS ${lead.name}`}
            >
              <Zap size={12} />
            </a>
          ) : null}
          {lead.email ? (
            <a
              href={getMailtoUrl(lead.email)}
              className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-700 hover:text-white transition-colors flex items-center justify-center border border-slate-200 dark:border-white/10 shadow-2xs"
              title="Email"
              aria-label={`Email ${lead.name}`}
            >
              <Mail size={12} />
            </a>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {isLost ? (
            <button
              type="button"
              onClick={() => handleReactivateLead(lead.id)}
              aria-label={`Reactivate lead ${lead.name}`}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-600 hover:text-white border border-emerald-200 dark:border-emerald-800/60 font-bold text-[10.5px] cursor-pointer transition-all"
            >
              <RotateCcw size={11} />
              <span>Reactivate</span>
            </button>
          ) : (
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Rep: <strong className="text-slate-800 dark:text-slate-200">{lead.assignedRep}</strong>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
