import React from 'react';
import { Globe } from 'lucide-react';
import { Lead } from '@/types/leadTypes';
import { DealValueText } from '@/components/shared/DealValueBadge';
import { LeadSourceBadge } from '@/components/shared/LeadSourceBadge';

interface LeadSpecsGridProps {
  lead: Lead;
  canViewFinances: boolean;
}

export function LeadSpecsGrid({ lead, canViewFinances }: LeadSpecsGridProps) {
  const raw = lead as unknown as Record<string, unknown>;
  const contractValue =
    lead.contractValue ?? (typeof raw.contract_value === 'number' ? raw.contract_value : undefined);
  const estimateTotal =
    lead.estimateTotal ?? (typeof raw.estimate_total === 'number' ? raw.estimate_total : undefined);
  const estimatedValue =
    lead.estimatedValue ??
    (lead.value > 0 ? lead.value : null) ??
    (typeof raw.raw_estimated_value === 'number' ? raw.raw_estimated_value : null) ??
    (typeof raw.estimated_value === 'number' ? raw.estimated_value : null);
  const roofSqf =
    lead.roofSqf ??
    (typeof raw.roof_sqf === 'number' ? raw.roof_sqf : null) ??
    (lead.squares && lead.squares > 0 ? lead.squares * 100 : null);
  const proposalSentAt =
    lead.proposalSentAt ??
    (typeof raw.proposalSentDate === 'string' ? raw.proposalSentDate : undefined) ??
    (typeof raw.proposal_sent_at === 'string' ? raw.proposal_sent_at : undefined);
  const isUploadedEstimate =
    lead.isUploadedEstimate ??
    (typeof raw.is_uploaded_estimate === 'boolean' ? raw.is_uploaded_estimate : undefined);
  const estimateTemplateKey =
    lead.estimateTemplateKey ??
    (typeof raw.estimate_template_key === 'string' ? raw.estimate_template_key : undefined);
  const stageId =
    lead.stageId ||
    lead.pipelineStage ||
    (typeof raw.stage === 'string' ? raw.stage : undefined) ||
    lead.status;

  return (
    <div className="space-y-2.5">
      {/* Specifications Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/70 dark:border-white/10">
        <div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold">
            Deal Value
          </div>
          <div className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
            <DealValueText
              contractValue={contractValue}
              estimateTotal={estimateTotal}
              estimatedValue={estimatedValue}
              roofSqf={roofSqf}
              proposalSentAt={proposalSentAt}
              isUploadedEstimate={isUploadedEstimate}
              estimateTemplateKey={estimateTemplateKey}
              isContractSigned={lead.isContractSigned}
              stageId={stageId}
              canViewFinances={canViewFinances}
              className="text-sm"
            />
          </div>
        </div>
        <div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold">
            Roof Size
          </div>
          <div className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
            {lead.roofSqf && lead.roofSqf > 0 ? (
              `${lead.roofSqf.toLocaleString()} sq ft`
            ) : lead.squares && lead.squares > 0 ? (
              `${(lead.squares * 100).toLocaleString()} sq ft`
            ) : (
              <span className="text-slate-400 dark:text-slate-500 font-medium">—</span>
            )}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold">
            Pitch Slope
          </div>
          <div className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
            {lead.pitch ? `${lead.pitch} Pitch` : <span className="text-slate-400 dark:text-slate-500 font-medium">—</span>}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold">
            Assigned Rep
          </div>
          <div className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
            {lead.assignedRep}
          </div>
        </div>
      </div>

      {/* Lead Attribution */}
      <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/70 dark:border-white/10 text-xs">
        <span className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider flex items-center gap-1.5">
          <Globe size={12} className="text-slate-400 dark:text-slate-500" />
          <span>Lead Source Attribution</span>
        </span>
        <div className="flex items-center gap-2">
          <LeadSourceBadge dealOrLead={lead} size="sm" />
          {lead.leadSourceDetail && (
            <span
              className="text-slate-600 dark:text-slate-300 font-semibold bg-slate-200/70 dark:bg-white/10 px-2 py-0.5 rounded-md text-[10px] max-w-[200px] truncate"
              title={lead.leadSourceDetail}
            >
              {lead.leadSourceDetail}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
