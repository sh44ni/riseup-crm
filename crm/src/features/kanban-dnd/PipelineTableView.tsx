import React from 'react';
import { Clock, ArrowRight, UserCheck } from 'lucide-react';
import {
  PipelineDealItem,
  PipelineStageId,
  PIPELINE_STAGES,
} from '@/components/pipeline/pipelineTypes';
import { DealValueBadge } from '@/components/shared/DealValueBadge';

export interface PipelineTableViewProps {
  filteredDeals: PipelineDealItem[];
  canViewFinances: boolean;
  canAdvanceStage: boolean;
  canClaimLead: boolean;
  getServiceBadgeClass: (color: string) => string;
  onSelectDeal: (deal: PipelineDealItem) => void;
  onAdvanceDeal: (dealId: string, nextStage: PipelineStageId) => void;
  onClaimDeal: (deal: PipelineDealItem) => void;
}

export function PipelineTableView({
  filteredDeals,
  canViewFinances,
  canAdvanceStage,
  canClaimLead,
  getServiceBadgeClass,
  onSelectDeal,
  onAdvanceDeal,
  onClaimDeal,
}: PipelineTableViewProps) {
  return (
    <div className="rounded-2xl light-glass-panel glossy-sheen border border-white/85 dark:border-white/10 shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200/70 dark:border-white/10 bg-white/60 dark:bg-slate-900/70 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <th className="py-3 px-4">Deal / Homeowner</th>
              <th className="py-3 px-4">Property Address</th>
              <th className="py-3 px-4">Service Scope</th>
              <th className="py-3 px-4">Current Milestone</th>
              <th className="py-3 px-4 text-right">Value</th>
              <th className="py-3 px-4">SLA / Timing</th>
              <th className="py-3 px-4">Estimator</th>
              <th className="py-3 px-4 text-right">Quick Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-xs">
            {filteredDeals.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-10 text-center text-slate-400 font-semibold">
                  No deals match current filter criteria.
                </td>
              </tr>
            ) : (
              filteredDeals.map((deal) => {
                const stageIndex = PIPELINE_STAGES.findIndex((s) => s.id === deal.stageId);
                const stageDef = stageIndex >= 0 ? PIPELINE_STAGES[stageIndex] : null;
                const nextStage = PIPELINE_STAGES[stageIndex + 1]?.id;

                return (
                  <tr
                    key={deal.id}
                    onClick={() => onSelectDeal(deal)}
                    className="hover:bg-white/80 dark:hover:bg-slate-800/60 transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-[#1878B8] dark:group-hover:text-sky-400 transition-colors">
                        {deal.name}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        {deal.phone}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800 dark:text-slate-200">{deal.address}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">{deal.city}, CA</div>
                    </td>

                    <td className="py-3 px-4">
                      <span className={`text-[10px] px-2 py-0.5 rounded-md ${getServiceBadgeClass(deal.serviceColor)}`}>
                        {deal.service}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 font-bold">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: stageDef?.accentColor || '#64748b' }} />
                        <span className="text-slate-800 dark:text-slate-200">{stageDef?.title || deal.stageId}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right">
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
                      />
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                        <Clock size={11} className="text-slate-400 shrink-0" />
                        <span>{deal.slaText || `${deal.daysInStage}d in stage`}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {deal.estimator.name}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        {(!deal.assignedToUserId || deal.estimator.name === 'Unassigned') && canClaimLead && (
                          <button
                            type="button"
                            onClick={() => onClaimDeal(deal)}
                            className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <UserCheck size={11} />
                            <span>Claim</span>
                          </button>
                        )}
                        {canAdvanceStage && nextStage && (
                          <button
                            type="button"
                            onClick={() => onAdvanceDeal(deal.id, nextStage)}
                            className="px-2 py-1 rounded-lg bg-[#1878B8] hover:bg-[#14649a] text-white font-bold text-[10px] flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <span>Advance</span>
                            <ArrowRight size={10} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
