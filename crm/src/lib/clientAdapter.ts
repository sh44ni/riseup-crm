import type { BackendClient } from '@/types/backendTypes';
// Rise Up CRM — Client 360 Adapter
// Bridges backend PostgreSQL records with frontend Client360Record UI schema

import {
  Client360Record,
  ClientStatus,
  TimelineEvent,
  RoofSpecs,
  BillingSummary,
  WarrantySummary,
  ClientTask,
  ClientQuote,
  ActiveJob,
  CompletedJob,
  LossPostMortem,
} from '@/types/client360Types';
import { Client360ApiResponse } from '@/api/clientsApi';

export function normalizeClientStatus(
  status?: string | null,
  category?: string | null,
  hasCompletedJob?: boolean
): { status: ClientStatus; label: string } {
  const s = (status || '').toLowerCase();
  const c = (category || '').toLowerCase();

  if (c === 'lost_lead' || s === 'lost' || s === 'closed_lost') {
    return { status: 'closed_lost', label: 'Closed Lost • Win-Back Opportunity' };
  }

  if (s === 'active_job' || s === 'in_progress' || s === 'scheduled') {
    return { status: 'active_job', label: 'Existing Client • Active Jobsite' };
  }

  if (s === 'completed' || s === 'repeat' || c === 'existing_client' || hasCompletedJob) {
    return { status: 'completed', label: 'Lifetime Client • 50-Year Warranty' };
  }

  if (c === 'new_client') {
    return { status: 'active_job', label: 'Existing Client • Active Jobsite' };
  }

  return { status: 'lead_review', label: 'Pipeline Prospect' };
}

export function backendClientToClient360(
  raw: BackendClient, detail?: Partial<Client360ApiResponse>
): Client360Record {
  const warranties = detail?.warranties || [];
  const invoices = detail?.invoices || [];
  const jobs = detail?.jobs || [];
  const estimates = detail?.estimates || [];
  const activities = detail?.activities || [];
  const tasks = detail?.tasks || [];

  const hasCompletedJob =
    jobs.some((j: any) => j.status === 'completed') ||
    raw.status === 'completed' ||
    warranties.length > 0;

  const { status, label: statusLabel } = normalizeClientStatus(
    raw.status,
    raw.client_category,
    hasCompletedJob
  );

  const repName = raw.acquired_by_name || raw.assigned_to_name || 'Staff';
  const repRole = raw.acquired_by_role || 'Sales Rep';

  // Roof Specs
  const roofSpecs: RoofSpecs = {
    address: raw.address || 'Address pending',
    cityZip: `${raw.city || 'Oceanside'} ${raw.zip || raw.zip_code || '92054'}`.trim(),
    roofMaterial: raw.roof_type || 'Not Specified',
    roofAreaSqFt: raw.roof_sqf || 0,
    roofSquares: raw.roof_sqf ? Math.round(raw.roof_sqf / 100) : 0,
    stories: raw.stories ? `${raw.stories}-Story` : 'Not Specified',
    roofAgeYears: raw.roof_age || 0,
    hoaCommunity: raw.hoa ? 'Yes (HOA)' : 'No HOA',
    originRepName: repName,
  };

  // Active Job (if present)
  let activeJob: ActiveJob | undefined = undefined;
  const inProgressJob = jobs.find((j: any) => j.status !== 'completed' && j.status !== 'cancelled');
  if (inProgressJob) {
    activeJob = {
      jobId: inProgressJob.job_number || `JOB-${inProgressJob.id}`,
      title: inProgressJob.name || (raw.roof_type ? `${raw.roof_type} Installation` : 'Active Roofing Project'),
      stage: inProgressJob.status ? inProgressJob.status.replace(/_/g, ' ').toUpperCase() : 'In Progress',
      contractValue: Number(inProgressJob.contract_amount || raw.total_revenue || 0),
      crewLead: inProgressJob.foreman_name || 'Assigned Soon',
      scheduledStart: inProgressJob.start_date ? new Date(inProgressJob.start_date).toLocaleDateString() : 'Active',
      progressPct: inProgressJob.progress_pct ?? 0,
    };
  } else if (status === 'active_job' && (raw.total_revenue || raw.total_jobs_count)) {
    activeJob = {
      jobId: `JOB-${raw.id}`,
      title: raw.roof_type ? `${raw.roof_type} Installation` : 'Active Roofing Project',
      stage: 'ACTIVE',
      contractValue: Number(raw.total_revenue || 0),
      crewLead: repName,
      scheduledStart: 'Active',
      progressPct: 0,
    };
  }

  // Completed Job (if present)
  let completedJob: CompletedJob | undefined = undefined;
  const finishedJob = jobs.find((j: any) => j.status === 'completed');
  if (finishedJob || (status === 'completed' && (raw.total_paid || raw.total_revenue))) {
    completedJob = {
      jobId: finishedJob?.job_number || `JOB-${raw.id}`,
      title: finishedJob?.name || (raw.roof_type ? `Full ${raw.roof_type} Replacement` : 'Completed Roofing Project'),
      totalPaid: Number(raw.total_paid || raw.total_revenue || 0),
      installedDate: finishedJob?.completed_at ? new Date(finishedJob.completed_at).toLocaleDateString() : 'Completed',
      warrantyType: warranties[0]?.warranty_type || '50-Year Golden Pledge & Manufacturer Lifetime',
      warrantyCertNumber: warranties[0]?.certificate_number || `RUP-CERT-${raw.id}`,
      nextAnnualInspectionDate: 'Annual Routine',
    };
  }

  // Loss Post Mortem (if lost)
  let lossPostMortem: LossPostMortem | undefined = undefined;
  if (status === 'closed_lost') {
    const lostReason = raw.lost_reason || raw.lead_lost_reason || 'Lost Opportunity';
    const updatedDate = raw.updated_at ? new Date(raw.updated_at) : null;
    const daysAgo = updatedDate ? Math.max(0, Math.floor((Date.now() - updatedDate.getTime()) / (1000 * 60 * 60 * 24))) : 0;

    lossPostMortem = {
      opportunityId: `OPP-${raw.id}`,
      title: raw.roof_type ? `${raw.roof_type} Project Scope` : 'Roof Replacement Opportunity',
      proposedValue: Number(raw.latest_estimate_total || 0),
      lossReason: lostReason,
      lossReasonKey: 'competitor_price',
      lostDate: updatedDate ? updatedDate.toLocaleDateString() : 'Recently',
      daysAgo,
      autopsyNotes: raw.notes || 'Homeowner chose an alternate proposal or postponed work.',
      riskVulnerabilities: [lostReason],
      winBackDate: 'Next 30 Days',
      winBackStrategy: 'Re-engage homeowner with updated pricing or warranty incentives.',
      canReactivate: true,
    };
  }

  // Invoices & Billing Summary
  const invoiceList = invoices.map((inv: any) => ({
    id: String(inv.id),
    invoiceNumber: inv.invoice_number || `INV-${inv.id}`,
    date: inv.due_date ? new Date(inv.due_date).toLocaleDateString() : 'Recent',
    amount: Number(inv.amount || 0),
    status: (inv.status || 'paid') as 'paid' | 'pending' | 'overdue',
    description: inv.description || 'Roofing Materials & Labor',
  }));

  const totalBilled = raw.total_billed ?? invoiceList.reduce((sum: number, i: any) => sum + i.amount, 0);
  const totalPaid = raw.total_paid ?? raw.total_revenue ?? totalBilled;
  const balanceDue = raw.balance_due ?? Math.max(0, totalBilled - totalPaid);

  const billingSummary: BillingSummary = {
    totalBilled,
    collectedCash: totalPaid,
    pendingDeposit: balanceDue,
    invoicesOnFileCount: invoiceList.length,
    paymentHealthStatus: balanceDue > 0 ? 'deposit_pending' : invoiceList.length === 0 ? 'no_billing_archived' : 'current_and_paid',
    paymentHealthMessage: balanceDue > 0 ? `$${balanceDue.toLocaleString()} Balance Pending` : invoiceList.length === 0 ? 'No active invoices on file' : 'All Accounts Current & Settled',
    invoices: invoiceList,
  };

  // Warranty Summary
  const certificates = warranties.map((w: any) => ({
    id: String(w.id),
    type: w.warranty_type || 'Manufacturer Warranty',
    certNumber: w.certificate_number || `RUP-CERT-${raw.id}`,
    issuer: w.provider || 'Rise Up Roofing & Manufacturer',
    termYears: w.duration_years || 50,
    coverage: w.coverage_details || 'Labor & Materials Coverage',
    validUntil: w.expires_at ? new Date(w.expires_at).toLocaleDateString() : 'Active',
  }));

  const inspectionPhotos = (detail?.inspection_photos || []).map((p: any) => ({
    id: String(p.id),
    title: p.title || 'Inspection Photo',
    url: p.url,
    severity: p.severity || 'Inspected',
    createdAt: p.createdAt,
  }));

  const warrantySummary: WarrantySummary = {
    warrantiesCount: certificates.length,
    hasCertificate: certificates.length > 0,
    statusText: certificates.length > 0 ? 'Active Protection Certificate' : 'No warranty certificate issued yet',
    certificates,
    inspectionPhotos,
  };

  // Tasks
  const clientTasks: ClientTask[] = tasks.map((t: any) => ({
    id: String(t.id),
    title: t.title || 'Task Reminder',
    dueDate: t.due_at ? new Date(t.due_at).toLocaleDateString() : 'Upcoming',
    completed: Boolean(t.completed_at),
    assignedTo: t.assigned_to_name || t.assigned_to || repName,
    priority: (t.priority || 'medium') as 'high' | 'medium' | 'low',
  }));

  // Timeline Events
  const timeline: TimelineEvent[] = activities.map((act: any) => ({
    id: String(act.id),
    type: (act.activity_type || 'note') as any,
    title: act.title || 'Activity Logged',
    date: act.created_at ? new Date(act.created_at).toLocaleString() : 'Recently',
    author: act.user_name || act.performed_by || 'Staff',
    details: act.description || '',
    sentiment: act.metadata?.sentiment || 'neutral',
  }));

  // Estimates / Quotes
  const quotes: ClientQuote[] = estimates.map((est: any) => ({
    id: String(est.id),
    quoteNumber: est.estimate_number || `EST-${est.id}`,
    title: est.title || (est.service_type ? `${est.service_type} Estimate` : 'Roof Replacement Estimate'),
    amount: Number(est.total || 0),
    status: (est.status || 'sent') as any,
    date: est.created_at ? new Date(est.created_at).toLocaleDateString() : 'Recently',
  }));

  return {
    id: String(raw.id),
    name: raw.full_name || 'Homeowner',
    phone: raw.phone || 'No phone',
    email: raw.email || 'No email',
    address: raw.address || 'Address pending',
    city: raw.city || 'Oceanside',
    zip: raw.zip || raw.zip_code || '92054',
    status,
    statusLabel,
    assignedRep: {
      name: repName,
      role: repRole,
      badge: 'Certified',
      avatar: raw.acquired_by_avatar || undefined,
    },
    originSource: raw.lead_source_detail || (raw.source_type === 'team_member' ? 'Sales Rep Outreach' : 'Website Inbound'),
    roofSpecs,
    activeJob,
    completedJob,
    lossPostMortem,
    billingSummary,
    warrantySummary,
    inspectionPhotos,
    tasks: clientTasks,
    timeline,
    quotes,
  };
}

export function roofSpecsToBackendPayload(specs: Partial<RoofSpecs>): Record<string, any> {
  const payload: Record<string, any> = {};
  if (specs.address !== undefined) payload.address = specs.address;
  if (specs.roofMaterial !== undefined) payload.roof_type = specs.roofMaterial;
  if (specs.roofAreaSqFt !== undefined) payload.roof_sqf = specs.roofAreaSqFt;
  if (specs.roofAgeYears !== undefined) payload.roof_age = specs.roofAgeYears;
  if (specs.stories !== undefined) {
    const parsed = parseInt(String(specs.stories));
    if (!isNaN(parsed)) payload.stories = parsed;
  }
  if (specs.hoaCommunity !== undefined) {
    payload.hoa = specs.hoaCommunity.toLowerCase().includes('yes');
  }
  if (specs.cityZip) {
    const tokens = specs.cityZip.trim().split(/\s+/);
    const lastToken = tokens[tokens.length - 1];
    if (tokens.length > 1 && /^\d+/.test(lastToken)) {
      payload.zip = lastToken;
      payload.city = tokens.slice(0, -1).join(' ');
    } else {
      payload.city = specs.cityZip.trim();
    }
  }
  return payload;
}


