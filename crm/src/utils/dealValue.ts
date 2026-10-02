/**
 * Shared deal value resolution utility.
 *
 * The value displayed for a pipeline lead/deal follows this strict hierarchy:
 *
 *  1. Contract signed  → show contract_value (the locked final price)
 *  2. Estimate sent    → show estimate_total  (the formal estimate document amount)
 *  3. Sq ft recorded   → show sqft-derived estimate (calculated from roof_sqf)
 *  4. Nothing          → show "Unavailable" with tooltip
 *
 * Use `resolveDisplayValue()` to get a structured result, then render
 * with `<DealValueBadge>` or the helper components below.
 */

/** Average installed cost per sq ft used for the quick-quote estimate. */
const AVG_COST_PER_SQFT = 6.5; // USD per sq ft

/** Minimum sq ft threshold — below this we treat it as "no data". */
const MIN_SQFT = 1;

export type ValueSource = 'contract' | 'estimate_sent' | 'sqft_estimate' | 'unavailable';

export interface ResolvedValue {
  /** The dollar amount to display (undefined when source = 'unavailable'). */
  amount: number | undefined;
  /** What data was used to arrive at this value. */
  source: ValueSource;
  /** Short human-readable label for the value type (e.g. "Contract Value"). */
  label: string;
  /** Tooltip shown when the value or badge is hovered. */
  tooltip: string;
}

/**
 * Resolve the best available value for a pipeline deal.
 *
 * @param contractValue        Raw contract_value from backend (null/0 = not signed)
 * @param estimateTotal        Raw estimate_total from backend (null/0 = no formal in-app estimate)
 * @param estimatedValue       Raw estimated_value / quick-quote amount (null/0 = not set)
 * @param roofSqf              Roof sq ft (null/0 = not measured)
 * @param proposalSentAt       ISO string if estimate/proposal has been sent
 * @param isContractSigned     Whether the contract is fully signed
 * @param isUploadedEstimate   Whether the estimate was an uploaded PDF (manual upload option)
 * @param estimateTemplateKey  Template key of the estimate (e.g. 'uploaded')
 */
export interface DealValueParams {
  contractValue?: number | null;
  contract_value?: number | null;
  estimateTotal?: number | null;
  estimate_total?: number | null;
  estimatedValue?: number | null;
  estimated_value?: number | null;
  raw_estimated_value?: number | null;
  roofSqf?: number | null;
  roof_sqf?: number | null;
  proposalSentAt?: string | null;
  proposalSentDate?: string | null;
  proposal_sent_at?: string | null;
  isContractSigned?: boolean;
  contract_signed_at?: string | null;
  isUploadedEstimate?: boolean;
  is_uploaded_estimate?: boolean;
  estimateTemplateKey?: string | null;
  estimate_template_key?: string | null;
  stageId?: string | null;
  stage_id?: string | null;
  granular_stage?: string | null;
  pipeline_stage?: string | null;
}

/** Pre-estimate pipeline stages where an estimate document has not been sent yet */
const PRE_ESTIMATE_STAGES = new Set([
  'cold_lead',
  'stage_1_lead_gen',
  'new_leads',
  'new',
  'initial_call',
  'stage_2_initial_contact',
  'contacted',
  'estimate_scheduled',
  'est_scheduled',
  'inspection_scheduled',
  'inspection_completed',
  'estimate_building',
  'stage_3_site_visit_estimate',
]);

/**
 * Resolve the best available value for a pipeline deal.
 *
 * Implements the 4-tier lifecycle:
 *  1. Contract signed  → show contract_value (locked final price)
 *  2. Pre-estimate     → if sq ft added, derive estimate from sq ft; else Unknown
 *  3. Estimate sent    → formal in-app estimate total, or Unknown if manual upload
 *  4. No size          → Unknown
 */
export function resolveDisplayValue(params: DealValueParams): ResolvedValue {
  const cv = Number(params.contractValue ?? params.contract_value ?? 0);
  const et = Number(params.estimateTotal ?? params.estimate_total ?? 0);
  const sqf = Number(params.roofSqf ?? params.roof_sqf ?? 0);
  const ev = Number(params.estimatedValue ?? params.raw_estimated_value ?? params.estimated_value ?? 0);
  const sentAt = params.proposalSentAt ?? params.proposalSentDate ?? params.proposal_sent_at ?? null;
  const isSigned = Boolean(params.isContractSigned || params.contract_signed_at);
  const isUploaded = Boolean(
    params.isUploadedEstimate ||
    params.is_uploaded_estimate ||
    params.estimateTemplateKey === 'uploaded' ||
    params.estimate_template_key === 'uploaded'
  );
  const stage = (params.stageId ?? params.stage_id ?? params.granular_stage ?? params.pipeline_stage ?? '').toLowerCase().trim();
  const isPreEstimateStage = Boolean(stage && PRE_ESTIMATE_STAGES.has(stage));

  // 1. Contract signed → show locked contract value
  if (isSigned && cv > 0) {
    return {
      amount: cv,
      source: 'contract',
      label: 'Contract Value',
      tooltip: 'Final signed contract amount.',
    };
  }

  // 2. Pre-estimate stages (New Leads, Initial Contact, Estimate Scheduled):
  // An estimate has NOT been sent for this stage. If size was added manually, reflect it immediately!
  if (isPreEstimateStage) {
    if (sqf >= MIN_SQFT) {
      const sqftEstimate = ev > 0 ? ev : Math.round(sqf * AVG_COST_PER_SQFT);
      return {
        amount: sqftEstimate,
        source: 'sqft_estimate',
        label: 'Est. from Sq Ft',
        tooltip: `Estimated from ${sqf.toLocaleString()} sq ft. Send an estimate to lock in the real amount.`,
      };
    }
    return {
      amount: undefined,
      source: 'unavailable',
      label: 'Unknown',
      tooltip: 'Roof size not specified yet. Add sq ft to calculate estimated value.',
    };
  }

  // 3. Estimate Sent / Follow-Up / Contract Sent stages:
  // If an estimate was sent with the manual upload option (external PDF) or is missing an in-app total:
  // User requirement: "however we have manual estimate upload so if an estimate is sent with upload option the value should stay unkown"
  if (sentAt && (isUploaded || et <= 0)) {
    return {
      amount: undefined,
      source: 'unavailable',
      label: 'Unknown',
      tooltip: 'Estimate was sent via manual upload. Amount is unknown in CRM.',
    };
  }

  // If a formal in-CRM estimate was sent with a known total:
  if (sentAt && et > 0) {
    return {
      amount: et,
      source: 'estimate_sent',
      label: 'Estimate Amount',
      tooltip: `Estimate of $${et.toLocaleString()} sent on ${new Date(sentAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}.`,
    };
  }

  // 4. Sq ft recorded manually → derive estimate (recalculated live from sq ft)
  if (sqf >= MIN_SQFT) {
    const sqftEstimate = ev > 0 ? ev : Math.round(sqf * AVG_COST_PER_SQFT);
    return {
      amount: sqftEstimate,
      source: 'sqft_estimate',
      label: 'Est. from Sq Ft',
      tooltip: `Estimated from ${sqf.toLocaleString()} sq ft. Send an estimate to lock in the real amount.`,
    };
  }

  // 5. Nothing available (lead enters without size) → Unknown
  return {
    amount: undefined,
    source: 'unavailable',
    label: 'Unknown',
    tooltip: 'Roof size not specified yet. Add sq ft to calculate estimated value.',
  };
}
