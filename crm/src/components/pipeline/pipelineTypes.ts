export interface DealCard {
  id: string;
  clientId?: number | string | null;
  name: string;
  location: string;
  address?: string;
  city?: string;
  zip?: string;
  service: string;
  serviceColor: 'sky' | 'amber' | 'emerald' | 'purple' | 'coral' | 'indigo' | 'blue';
  time: string;
  phone?: string;
  email?: string;
  value?: number;
  notes?: string;
  isFollowupOverdue?: boolean;
  hoursUntilAutoMove?: number | null;
  followupDaysRemaining?: number;
  followupHoursRemaining?: number;
  followUpAt?: string | null;
  leadSource?: string;
  leadSourceDetail?: string;
  sourceType?: string;
  assignedToUserId?: number | null;
  assignedToName?: string | null;
  createdByUserId?: number | null;
  createdByName?: string | null;
  contractSignedAt?: string | null;
  contractStatus?: string | null;
  isContractSigned?: boolean;
  granularStage?: string;
  pipelineStage?: string;
}

export interface ColumnData {
  id: string;
  title: string;
  count: number;
  bgColor: string;
  borderColor: string;
  accentColor: string;
  pillClass: string;
  badgeClass: string;
  iconType: 'users' | 'phone' | 'calendar' | 'file-text' | 'clock' | 'bell' | 'shield' | 'trophy' | 'briefcase';
  cards: DealCard[];
}

export interface EnrichedDeal extends DealCard {
  stageId: string;
  stageTitle: string;
  stageAccent: string;
  stageBgColor: string;
  stageBorderColor: string;
  stagePillClass: string;
  stageBadgeClass: string;
  iconType: ColumnData['iconType'];
  phone: string;
  email: string;
  value: number;
  scheduledDay: number; // Day in March 2026 (1-31)
  timeSlot: string;
  dateFormatted: string;
  notes?: string;
}

// Deterministic metadata for rich display across List and Calendar views
const DEAL_METADATA: Record<
  string,
  { phone: string; email: string; value: number; scheduledDay: number; timeSlot: string; dateFormatted: string }
> = {
  'nl-1': { phone: '(760) 555-0142', email: 'commercial@pacificauto.com', value: 42500, scheduledDay: 10, timeSlot: '08:30 AM', dateFormatted: 'Tue, Mar 10' },
  'nl-2': { phone: '(760) 555-0188', email: 'alicia.brooks@gmail.com', value: 18900, scheduledDay: 10, timeSlot: '11:00 AM', dateFormatted: 'Tue, Mar 10' },
  'nl-3': { phone: '(760) 555-0193', email: 'jwilson@encinitas.net', value: 14200, scheduledDay: 9, timeSlot: '01:15 PM', dateFormatted: 'Mon, Mar 9' },
  'nl-4': { phone: '(760) 555-0164', email: 'rking@carlsbad.org', value: 6800, scheduledDay: 9, timeSlot: '03:45 PM', dateFormatted: 'Mon, Mar 9' },

  'lc-1': { phone: '(760) 555-0211', email: 'mthompson@vista.com', value: 16400, scheduledDay: 10, timeSlot: '09:30 AM', dateFormatted: 'Tue, Mar 10' },
  'lc-2': { phone: '(760) 555-0245', email: 'leah.j@oceanside.com', value: 12500, scheduledDay: 10, timeSlot: '02:00 PM', dateFormatted: 'Tue, Mar 10' },
  'lc-3': { phone: '(760) 555-0289', email: 'tnguyen@socal.rr.com', value: 21000, scheduledDay: 9, timeSlot: '10:15 AM', dateFormatted: 'Mon, Mar 9' },
  'lc-4': { phone: '(760) 555-0276', email: 'sdavis@cox.net', value: 19800, scheduledDay: 9, timeSlot: '04:00 PM', dateFormatted: 'Mon, Mar 9' },

  'es-1': { phone: '(858) 555-0312', email: 'rmiller@poway.gov', value: 26870, scheduledDay: 10, timeSlot: '10:00 AM', dateFormatted: 'Tue, Mar 10' },
  'es-2': { phone: '(760) 555-0344', email: 'kmartin@oceanside.org', value: 9400, scheduledDay: 9, timeSlot: '01:30 PM', dateFormatted: 'Mon, Mar 9' },
  'es-3': { phone: '(760) 555-0382', email: 'nadams@vista.net', value: 34200, scheduledDay: 8, timeSlot: '11:30 AM', dateFormatted: 'Sun, Mar 8' },
  'es-4': { phone: '(760) 555-0399', email: 'capistrano.hoa@gmail.com', value: 22100, scheduledDay: 7, timeSlot: '03:00 PM', dateFormatted: 'Sat, Mar 7' },

  'st-1': { phone: '(858) 555-0421', email: 'mpatel@rsf.com', value: 58000, scheduledDay: 10, timeSlot: '11:45 AM', dateFormatted: 'Tue, Mar 10' },
  'st-2': { phone: '(760) 555-0453', email: 'jwilliams@escondido.com', value: 31500, scheduledDay: 9, timeSlot: '02:30 PM', dateFormatted: 'Mon, Mar 9' },
  'st-3': { phone: '(760) 555-0487', email: 'board@strandhoa.com', value: 74000, scheduledDay: 8, timeSlot: '09:00 AM', dateFormatted: 'Sun, Mar 8' },
  'st-4': { phone: '(760) 555-0491', email: 'skim@carlsbad.net', value: 17600, scheduledDay: 7, timeSlot: '01:00 PM', dateFormatted: 'Sat, Mar 7' },

  'f1-1': { phone: '(760) 555-0514', email: 'martinez.family@gmail.com', value: 18400, scheduledDay: 11, timeSlot: '10:30 AM', dateFormatted: 'Wed, Mar 11' },
  'f1-2': { phone: '(760) 555-0539', email: 'dwilson@property.com', value: 24800, scheduledDay: 9, timeSlot: '03:15 PM', dateFormatted: 'Mon, Mar 9' },
  'f1-3': { phone: '(760) 555-0572', email: 'elena.t@oside.k12.ca.us', value: 15200, scheduledDay: 8, timeSlot: '12:00 PM', dateFormatted: 'Sun, Mar 8' },
  'f1-4': { phone: '(760) 555-0599', email: 'vc.estate@yahoo.com', value: 13900, scheduledDay: 7, timeSlot: '04:30 PM', dateFormatted: 'Sat, Mar 7' },

  'f2-1': { phone: '(760) 555-0623', email: 'oside.res@gmail.com', value: 8700, scheduledDay: 12, timeSlot: '09:15 AM', dateFormatted: 'Thu, Mar 12' },
  'f2-2': { phone: '(760) 555-0648', email: 'patio.oside@gmail.com', value: 11300, scheduledDay: 9, timeSlot: '02:00 PM', dateFormatted: 'Mon, Mar 9' },
  'f2-3': { phone: '(760) 555-0671', email: 'gutters.carlsbad@gmail.com', value: 2400, scheduledDay: 8, timeSlot: '01:30 PM', dateFormatted: 'Sun, Mar 8' },
  'f2-4': { phone: '(760) 555-0694', email: 'skylights.vista@gmail.com', value: 6500, scheduledDay: 7, timeSlot: '11:00 AM', dateFormatted: 'Sat, Mar 7' },

  'cs-1': { phone: '(760) 555-0715', email: 'beach.bath@gmail.com', value: 28900, scheduledDay: 13, timeSlot: '08:00 AM', dateFormatted: 'Fri, Mar 13' },
  'cs-2': { phone: '(760) 555-0738', email: 'house3@encinitas.com', value: 46500, scheduledDay: 16, timeSlot: '10:00 AM', dateFormatted: 'Mon, Mar 16' },
  'cs-3': { phone: '(760) 555-0761', email: 'mgmt@400nstrand.com', value: 82000, scheduledDay: 17, timeSlot: '02:30 PM', dateFormatted: 'Tue, Mar 17' },
  'cs-4': { phone: '(949) 555-0784', email: 'mhalter@sanclemente.com', value: 36200, scheduledDay: 18, timeSlot: '04:00 PM', dateFormatted: 'Wed, Mar 18' },

  'jc-1': { phone: '(760) 555-0812', email: 'nichole.v@gmail.com', value: 12400, scheduledDay: 14, timeSlot: '09:00 AM', dateFormatted: 'Sat, Mar 14' },
  'jc-2': { phone: '(760) 555-0835', email: 'hillyer@oceanside.org', value: 8900, scheduledDay: 19, timeSlot: '11:00 AM', dateFormatted: 'Thu, Mar 19' },
  'jc-3': { phone: '(760) 555-0867', email: 'adu.project@gmail.com', value: 19500, scheduledDay: 20, timeSlot: '01:00 PM', dateFormatted: 'Fri, Mar 20' },
  'jc-4': { phone: '(760) 555-0899', email: 'canyonview@carlsbad.org', value: 27800, scheduledDay: 21, timeSlot: '03:30 PM', dateFormatted: 'Sat, Mar 21' },
};

export function enrichDeals(columns: ColumnData[]): EnrichedDeal[] {
  const result: EnrichedDeal[] = [];

  columns.forEach((col) => {
    col.cards.forEach((card) => {
      const meta = DEAL_METADATA[card.id] || {
        phone: '(760) 555-0100',
        email: `${String(card.name || 'homeowner').toLowerCase().replace(/[^a-z]/g, '')}@gmail.com`,
        value: 15000,
        scheduledDay: 10,
        timeSlot: '10:00 AM',
        dateFormatted: 'Tue, Mar 10',
      };

      result.push({
        ...card,
        stageId: col.id,
        stageTitle: col.title,
        stageAccent: col.accentColor,
        stageBgColor: col.bgColor,
        stageBorderColor: col.borderColor,
        stagePillClass: col.pillClass,
        stageBadgeClass: col.badgeClass,
        iconType: col.iconType,
        phone: card.phone || meta.phone,
        email: card.email || meta.email,
        value: (card.value !== undefined && card.value > 0) ? card.value : meta.value,
        scheduledDay: meta.scheduledDay,
        timeSlot: meta.timeSlot,
        dateFormatted: meta.dateFormatted,
        notes: card.notes,
      });
    });
  });

  return result;
}

// ============================================================================
// RISE UP ESTIMATE SENDING PROCESS TIMELINE — 11-STEP DOMAIN MODEL
// Direct implementation of Rise Up Roofing & Construction Process Infographic
// ============================================================================

export type PipelineStageId =
  | 'cold_lead'
  | 'initial_call'
  | 'estimate_scheduled'
  | 'estimate_sent'
  | 'follow_up'
  | 'contract_sent'
  | 'contract_signed'
  | 'active_jobs'
  | 'closed_lost';

export interface StageDefinition {
  stepNumber: number; // 1 to 11
  id: PipelineStageId;
  title: string; // e.g. "Day 0 — Cold Lead Comes In"
  shortTitle: string; // "Cold Lead"
  timingLabel: string; // "Day 0", "Same Day", "Appointment Day", etc.
  sopGoal: string; // Exact text from infographic
  iconType: 'user-plus' | 'phone' | 'calendar' | 'camera' | 'file-text' | 'message-square' | 'message-circle' | 'users' | 'clock' | 'repeat' | 'award';
  accentColor: string;
  pillBg: string;
  pillText: string;
  dotColor: string;
}

export const PIPELINE_STAGES: StageDefinition[] = [
  {
    stepNumber: 1,
    id: 'cold_lead',
    title: 'Day 0 — Lead Comes In',
    shortTitle: 'Cold Lead',
    timingLabel: 'Day 0',
    sopGoal: 'Lead enters the CRM from website, ads, referral, cold outreach, Yelp, Google, or other sources.',
    iconType: 'user-plus',
    accentColor: '#0284C7',
    pillBg: 'bg-sky-500/15 border-sky-500/30',
    pillText: 'text-sky-700',
    dotColor: 'bg-sky-500',
  },
  {
    stepNumber: 2,
    id: 'initial_call',
    title: 'Same Day — Contacted',
    shortTitle: 'Contacted',
    timingLabel: 'Same Day',
    sopGoal: 'Call the lead, introduce Rise Up, understand their needs, confirm property address, and schedule estimate appointment.',
    iconType: 'phone',
    accentColor: '#0EA5E9',
    pillBg: 'bg-cyan-500/15 border-cyan-500/30',
    pillText: 'text-cyan-700',
    dotColor: 'bg-cyan-500',
  },
  {
    stepNumber: 3,
    id: 'estimate_scheduled',
    title: 'Appointment Day — Estimate Scheduled',
    shortTitle: 'Estimate Scheduled',
    timingLabel: 'Appt Day',
    sopGoal: 'Estimator arrives at the property, meets the client, measures the roof, and builds the estimate same day.',
    iconType: 'calendar',
    accentColor: '#8B5CF6',
    pillBg: 'bg-purple-500/15 border-purple-500/30',
    pillText: 'text-purple-700',
    dotColor: 'bg-purple-500',
  },
  {
    stepNumber: 4,
    id: 'estimate_sent',
    title: 'Proposal Delivered — 48h Review Window',
    shortTitle: 'Estimate Sent',
    timingLabel: '48h Review Window',
    sopGoal: 'Text or call client to let them know proposal was sent. 48-hour review buffer before auto-moving to active Follow-Up.',
    iconType: 'file-text',
    accentColor: '#10B981',
    pillBg: 'bg-emerald-500/15 border-emerald-500/30',
    pillText: 'text-emerald-700',
    dotColor: 'bg-emerald-500',
  },
  {
    stepNumber: 5,
    id: 'follow_up',
    title: 'Active Follow-Up — 7-Day Automated Cadence',
    shortTitle: 'Follow-Up',
    timingLabel: '7-Day Reset Cycle',
    sopGoal: 'Automated 7-day follow-up cycle. Log contact to reset 7-day timer. Turns bold red if untouched for 7+ days.',
    iconType: 'repeat',
    accentColor: '#7C3AED',
    pillBg: 'bg-purple-500/15 border-purple-500/30',
    pillText: 'text-purple-700',
    dotColor: 'bg-purple-500',
  },
  {
    stepNumber: 6,
    id: 'contract_sent',
    title: 'Contract Sent — Awaiting Client Signature',
    shortTitle: 'Contract Sent',
    timingLabel: 'Awaiting Signature',
    sopGoal: 'Contract has been sent to the client. Follow up to confirm receipt and answer any questions before signing.',
    iconType: 'message-square',
    accentColor: '#F59E0B',
    pillBg: 'bg-amber-500/15 border-amber-500/30',
    pillText: 'text-amber-700',
    dotColor: 'bg-amber-500',
  },
  {
    stepNumber: 7,
    id: 'contract_signed',
    title: 'Contract Signed — Job Sold',
    shortTitle: 'Contract Signed',
    timingLabel: 'Job Sold 🎉',
    sopGoal: 'Client signed the contract. Collect deposit, schedule the project, finalize materials and colors, and hand off to project management.',
    iconType: 'award',
    accentColor: '#059669',
    pillBg: 'bg-emerald-600/15 border-emerald-600/35',
    pillText: 'text-emerald-800',
    dotColor: 'bg-emerald-600',
  },
  {
    stepNumber: 8,
    id: 'active_jobs',
    title: 'Active Job — In Progress',
    shortTitle: 'Active Job',
    timingLabel: 'In Production',
    sopGoal: 'Job is actively being worked on by the crew. Monitor progress, communicate with client, and ensure quality completion.',
    iconType: 'users',
    accentColor: '#0891B2',
    pillBg: 'bg-cyan-600/15 border-cyan-600/35',
    pillText: 'text-cyan-800',
    dotColor: 'bg-cyan-600',
  },
];

export const THREE_OUTCOMES = [
  { id: 'closed_lost', label: 'Mark Lost', icon: 'x-circle', color: 'rose', description: 'Document root-cause loss reason & autopsy notes.' },
] as const;

export const LOSS_REASONS = [
  'Competitor Price (Low Bidder)',
  'Ghosted / Unresponsive (3+ Follow-ups)',
  'Project Postponed / No Budget',
  'DIY / Handyman Alternative',
  'Financing Denied',
  'Out of Service Area',
] as const;


export interface PipelineDealItem {
  id: string;
  clientId?: number | null;
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  service: string;
  serviceColor: 'sky' | 'amber' | 'emerald' | 'purple' | 'coral' | 'indigo' | 'blue';
  value: number;
  stageId: PipelineStageId;
  daysInStage: number;
  score?: number;
  leadSource?: string;
  leadSourceDetail?: string;
  sourceType?: string;
  assignedToUserId?: number | null;
  assignedToName?: string | null;
  createdByName?: string | null;
  estimator: {
    name: string;
    avatar: string;
    role: string;
  };
  slaStatus: 'on_track' | 'due_today' | 'overdue';
  slaText: string;
  photosCount: number;
  proposalSentDate?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  notes: string;
  lossReason?: string;
  lossNotes?: string;
  futureBucket?: string;
  futureFollowUpDate?: string;
  isFollowupOverdue?: boolean;
  followupDaysRemaining?: number;
  followupHoursRemaining?: number;
  hoursUntilAutoMove?: number | null;
  lastContactAt?: string | null;
  followUpAt?: string | null;
  checklist: { id: string; label: string; done: boolean }[];
}

export const INITIAL_PIPELINE_DEALS: PipelineDealItem[] = [
  // 1. Cold Lead Comes In (Day 0)
  {
    id: 'dl-101',
    name: 'Dr. Gregory Hayes',
    phone: '(760) 555-4921',
    email: 'ghayes@scrippshealth.org',
    address: '2840 Hidden Valley Rd',
    city: 'Carlsbad',
    service: 'Spanish S-Tile Restoration',
    serviceColor: 'coral',
    value: 38500,
    stageId: 'cold_lead',
    daysInStage: 0,
    score: 95,
    estimator: { name: 'Jake Miller', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100', role: 'Senior Estimator' },
    slaStatus: 'due_today',
    slaText: 'Initial Call SLA: 12m remaining',
    photosCount: 0,
    notes: 'Inbound Google Lead. Homeowner reported damp drywall under second-story barrel tile ridge after weekend storm.',
    checklist: [
      { id: 'c1', label: 'Call lead within 15 minutes', done: false },
      { id: 'c2', label: 'Confirm property address & satellite pitch', done: false },
      { id: 'c3', label: 'Schedule inspection appointment', done: false },
    ],
  },
  {
    id: 'dl-102',
    name: 'Stephanie Lin-Bauer',
    phone: '(858) 555-8120',
    email: 'slin.bauer@qualcomm.com',
    address: '6124 Paseo Delicias',
    city: 'Rancho Santa Fe',
    service: 'Standing Seam Metal',
    serviceColor: 'sky',
    value: 64000,
    stageId: 'cold_lead',
    daysInStage: 0,
    score: 98,
    estimator: { name: 'Sarah Lin', avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100', role: 'Architectural Specialist' },
    slaStatus: 'due_today',
    slaText: 'Initial Call SLA: 34m remaining',
    photosCount: 0,
    notes: 'Architectural referral. Replacing 22-year-old concrete tile with matte black standing seam metal.',
    checklist: [
      { id: 'c1', label: 'Call lead within 15 minutes', done: false },
      { id: 'c2', label: 'Confirm property address & satellite pitch', done: false },
      { id: 'c3', label: 'Schedule inspection appointment', done: false },
    ],
  },

  // 2. Same Day Initial Call
  {
    id: 'dl-103',
    name: 'Arthur Pendelton',
    phone: '(760) 555-3914',
    email: 'art.pendelton@cox.net',
    address: '3340 Lake Blvd',
    city: 'Oceanside',
    service: 'Architectural Shingle',
    serviceColor: 'emerald',
    value: 24500,
    stageId: 'initial_call',
    daysInStage: 0,
    score: 89,
    estimator: { name: 'Carlos Ramirez', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100', role: 'Field Estimator' },
    slaStatus: 'due_today',
    slaText: 'Inspection Booking Pending',
    photosCount: 0,
    notes: 'Phone answered by Arthur. Needs full tear-off and replacement. Requested afternoon inspection slot.',
    checklist: [
      { id: 'c1', label: 'Spoke with homeowner', done: true },
      { id: 'c2', label: 'Confirmed address & roof age (21 yrs)', done: true },
      { id: 'c3', label: 'Lock inspection date on calendar', done: false },
    ],
  },

  // 3. Appointment Day — Estimate Scheduled
  {
    id: 'dl-104',
    name: 'Elena Rostova',
    phone: '(760) 555-1204',
    email: 'erostova@delmarenterprises.com',
    address: '812 Mission Ave',
    city: 'Oceanside',
    service: 'Flat TPO Commercial',
    serviceColor: 'indigo',
    value: 48000,
    stageId: 'estimate_scheduled',
    daysInStage: 1,
    score: 94,
    estimator: { name: 'Jake Miller', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100', role: 'Senior Estimator' },
    slaStatus: 'due_today',
    slaText: 'Inspection Today at 2:00 PM',
    photosCount: 0,
    scheduledDate: 'Today',
    scheduledTime: '2:00 PM',
    notes: '2-story commercial strip with rooftop HVAC units. Meeting on-site property manager Dan.',
    checklist: [
      { id: 'c1', label: 'Pre-inspection confirmation SMS sent', done: true },
      { id: 'c2', label: 'Inspect roof & HVAC flashing', done: false },
      { id: 'c3', label: 'Document problem areas with minimum 15 photos', done: false },
    ],
  },

  // 4. Same Visit — Estimate Building
  {
    id: 'dl-105',
    name: 'Marcus & Beverly Vance',
    phone: '(760) 555-8821',
    email: 'mvance@carlsbadlaw.com',
    address: '428 Carlsbad Village Dr',
    city: 'Carlsbad',
    service: 'Tile Relay & Underlayment',
    serviceColor: 'coral',
    value: 32000,
    stageId: 'estimate_scheduled',
    daysInStage: 1,
    score: 91,
    estimator: { name: 'Carlos Ramirez', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100', role: 'Field Estimator' },
    slaStatus: 'on_track',
    slaText: 'Photos Uploaded (18/18)',
    photosCount: 18,
    notes: 'Completed full drone and pitch inspection. Underlayment paper degraded, batten rot in western valleys.',
    checklist: [
      { id: 'c1', label: 'Measurements calculated: 36 squares', done: true },
      { id: 'c2', label: '18 high-res inspection photos attached', done: true },
      { id: 'c3', label: 'Hand off scope to estimate builder', done: false },
    ],
  },

  // 5. Proposal Delivered — Estimate Sent
  {
    id: 'dl-106',
    name: 'Robert & Clara Sterling',
    phone: '(760) 555-9011',
    email: 'robert.sterling@encinitas.org',
    address: '1420 Twin Oaks Valley',
    city: 'San Marcos',
    service: 'Architectural Shingle',
    serviceColor: 'emerald',
    value: 26800,
    stageId: 'estimate_sent',
    daysInStage: 0,
    score: 93,
    estimator: { name: 'Sarah Lin', avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100', role: 'Architectural Specialist' },
    slaStatus: 'due_today',
    slaText: 'Same-Day Goal: 2h 45m left',
    photosCount: 22,
    notes: 'Proposal drafted in Roofr: GAF Timberline HDZ with Golden Pledge 50-year warranty options.',
    checklist: [
      { id: 'c1', label: 'Scope of work & options created', done: true },
      { id: 'c2', label: 'Pricing & warranty packages verified', done: true },
      { id: 'c3', label: 'Deliver proposal to homeowner via email/SMS', done: false },
    ],
  },

  // 6. Immediately After Sending — Estimate Sent Follow-Up
  {
    id: 'dl-107',
    name: 'Harrison Brooks',
    phone: '(760) 555-7744',
    email: 'hbrooks@vistaunified.org',
    address: '904 Foothill Dr',
    city: 'Vista',
    service: 'Spanish S-Tile Restoration',
    serviceColor: 'coral',
    value: 34500,
    stageId: 'estimate_sent',
    daysInStage: 0,
    score: 87,
    estimator: { name: 'Jake Miller', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100', role: 'Senior Estimator' },
    slaStatus: 'due_today',
    slaText: 'Send Immediate Receipt Ping',
    photosCount: 16,
    proposalSentDate: 'Today 11:20 AM',
    notes: 'Proposal sent via client portal 45m ago. Need to text homeowner confirming delivery and invite questions.',
    checklist: [
      { id: 'c1', label: 'Estimate PDF delivered to client', done: true },
      { id: 'c2', label: 'Send immediate follow-up SMS receipt prompt', done: false },
      { id: 'c3', label: 'Schedule 48-hour follow-up task', done: false },
    ],
  },

  // 7. +2 Days — Follow-Up #1
  {
    id: 'dl-108',
    name: 'David Kim',
    phone: '(858) 555-3091',
    email: 'dkim.architect@gmail.com',
    address: '710 Neptune Ave',
    city: 'Encinitas',
    service: 'Standing Seam Metal',
    serviceColor: 'sky',
    value: 52000,
    stageId: 'follow_up',
    daysInStage: 2,
    score: 96,
    estimator: { name: 'Sarah Lin', avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100', role: 'Architectural Specialist' },
    slaStatus: 'due_today',
    slaText: '+2 Day Call Due Today',
    photosCount: 24,
    proposalSentDate: '2 Days Ago',
    notes: 'Homeowner reviewed estimate on portal twice yesterday. Check in regarding standing seam color choice and underlayment options.',
    checklist: [
      { id: 'c1', label: 'Call client to review estimate breakdown', done: false },
      { id: 'c2', label: 'Answer questions on material warranties', done: false },
      { id: 'c3', label: 'Determine decision timeline', done: false },
    ],
  },
  {
    id: 'dl-109',
    name: 'Alicia & Mark Torres',
    phone: '(760) 555-6129',
    email: 'mark.torres@gmail.com',
    address: '1552 Hummingbird Ln',
    city: 'Carlsbad',
    service: 'Architectural Shingle',
    serviceColor: 'emerald',
    value: 21500,
    stageId: 'follow_up',
    daysInStage: 2,
    score: 88,
    estimator: { name: 'Carlos Ramirez', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100', role: 'Field Estimator' },
    slaStatus: 'on_track',
    slaText: '+2 Day Call Scheduled 3:30 PM',
    photosCount: 14,
    proposalSentDate: '2 Days Ago',
    notes: 'Requested financing comparison between 12-month same-as-cash vs 7-year fixed term.',
    checklist: [
      { id: 'c1', label: 'Call client with monthly financing breakdown', done: false },
      { id: 'c2', label: 'Offer solar coordination discount', done: false },
    ],
  },

  // 8. +5-7 Days — Follow-Up #2
  {
    id: 'dl-110',
    name: 'Capt. Thomas Weatherly',
    phone: '(760) 555-8833',
    email: 'tweatherly@usmc.mil',
    address: '2214 S Coast Hwy',
    city: 'Oceanside',
    service: 'Tile Relay & Underlayment',
    serviceColor: 'coral',
    value: 29800,
    stageId: 'follow_up',
    daysInStage: 6,
    score: 84,
    estimator: { name: 'Jake Miller', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100', role: 'Senior Estimator' },
    slaStatus: 'due_today',
    slaText: 'Day 6 Follow-Up: Contractor Check',
    photosCount: 19,
    proposalSentDate: '6 Days Ago',
    notes: 'Homeowner mentioned getting 2 bids from local contractors. Follow up on contractor comparison and Rise Up certified installer warranty.',
    checklist: [
      { id: 'c1', label: 'Check if reviewing competing contractor bids', done: false },
      { id: 'c2', label: 'Address price vs workmanship / certified crew guarantee', done: false },
      { id: 'c3', label: 'Ask if HOA approval is needed', done: false },
    ],
  },

  // 9. +10-14 Days — Decision Follow-Up
  {
    id: 'dl-111',
    name: 'Evelyn Montgomery',
    phone: '(858) 555-0988',
    email: 'montgomery.estates@cox.net',
    address: '4920 Highland Dr',
    city: 'Del Mar',
    service: 'Spanish S-Tile Restoration',
    serviceColor: 'coral',
    value: 46000,
    stageId: 'follow_up',
    daysInStage: 12,
    score: 82,
    estimator: { name: 'Sarah Lin', avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100', role: 'Architectural Specialist' },
    slaStatus: 'overdue',
    slaText: '12 Days Out: Definite Next Step Needed',
    photosCount: 20,
    proposalSentDate: '12 Days Ago',
    notes: 'Client likes Rise Up but was discussing timing with family trustee. Need clear answer: this month, next month, or move to Future Follow-Up bucket.',
    checklist: [
      { id: 'c1', label: 'Finalize project start month or target quarter', done: false },
      { id: 'c2', label: 'Confirm if ready to sign or requires long-term nurture', done: false },
    ],
  },

  // 10. Ongoing — Long-Term Follow-Up
  {
    id: 'dl-112',
    name: 'Douglas Fairbanks',
    phone: '(760) 555-4309',
    email: 'dfairbanks@osidehoa.com',
    address: '1108 Pacific St',
    city: 'Oceanside',
    service: 'Tile Relay & Underlayment',
    serviceColor: 'coral',
    value: 74000,
    stageId: 'follow_up',
    daysInStage: 28,
    score: 78,
    estimator: { name: 'Jake Miller', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100', role: 'Senior Estimator' },
    slaStatus: 'on_track',
    slaText: 'Scheduled 60-Day Touchpoint: Apr 15',
    photosCount: 30,
    futureBucket: 'HOA Architectural Committee Review',
    futureFollowUpDate: 'Apr 15, 2026',
    notes: 'HOA board meets bi-monthly to review exterior tile color changes. Placed in HOA committee review bucket.',
    checklist: [
      { id: 'c1', label: 'Submit tile spec sheet to HOA board', done: true },
      { id: 'c2', label: 'Calendar callback on Apr 15 after board vote', done: true },
    ],
  },
  {
    id: 'dl-113',
    name: 'Karen & Brian Cole',
    phone: '(760) 555-5511',
    email: 'brian.cole@socal.rr.com',
    address: '3815 Vista Way',
    city: 'Vista',
    service: 'Architectural Shingle',
    serviceColor: 'emerald',
    value: 19400,
    stageId: 'follow_up',
    daysInStage: 42,
    score: 75,
    estimator: { name: 'Carlos Ramirez', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100', role: 'Field Estimator' },
    slaStatus: 'on_track',
    slaText: 'Scheduled 30-Day Check: Mar 30',
    photosCount: 15,
    futureBucket: 'Insurance Claim Pending Adjuster',
    futureFollowUpDate: 'Mar 30, 2026',
    notes: 'Awaiting State Farm secondary adjuster re-inspection for hail/wind damage scope.',
    checklist: [
      { id: 'c1', label: 'Send drone photos to insurance adjuster', done: true },
      { id: 'c2', label: 'Follow up post-adjuster report', done: false },
    ],
  },

  // 11. Closed / Job Sold
  {
    id: 'dl-114',
    name: 'Patricia Gomez',
    phone: '(760) 555-4422',
    email: 'pgomez@carlsbadproperties.com',
    address: '508 Tamarack Ave',
    city: 'Carlsbad',
    service: 'Spanish S-Tile Restoration',
    serviceColor: 'coral',
    value: 31000,
    stageId: 'contract_signed',
    daysInStage: 14,
    score: 99,
    estimator: { name: 'Jake Miller', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100', role: 'Senior Estimator' },
    slaStatus: 'on_track',
    slaText: 'Deposit Collected • PM Handoff Complete',
    photosCount: 26,
    notes: 'E-sign contract executed! $10,000 deposit paid. Eagle Roofing tile color selected: terracotta blend. Crew #2 assigned for installation.',
    checklist: [
      { id: 'c1', label: 'Contract signed via DocuSign', done: true },
      { id: 'c2', label: 'Deposit payment received ($10k)', done: true },
      { id: 'c3', label: 'Materials & color selections signed off', done: true },
      { id: 'c4', label: 'Handoff to Project Manager & Crew #2', done: true },
    ],
  },
  {
    id: 'dl-115',
    name: 'Miramar Industrial Center',
    phone: '(858) 555-7800',
    email: 'facilities@miramarcenter.com',
    address: '9420 Miramar Rd',
    city: 'San Diego',
    service: 'Flat TPO Commercial',
    serviceColor: 'indigo',
    value: 82500,
    stageId: 'contract_signed',
    daysInStage: 18,
    score: 100,
    estimator: { name: 'Sarah Lin', avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100', role: 'Architectural Specialist' },
    slaStatus: 'on_track',
    slaText: 'Signed Contract • Scheduled Build',
    photosCount: 38,
    notes: 'Won 80-mil Carlisle TPO re-roof contract. Commercial deposit received, staging permit approved by city.',
    checklist: [
      { id: 'c1', label: 'Commercial master agreement executed', done: true },
      { id: 'c2', label: 'Deposit wire cleared', done: true },
      { id: 'c3', label: 'City permit issued', done: true },
      { id: 'c4', label: 'Safety plan approved by PM', done: true },
    ],
  },

  // 12. Closed Lost (Root-Cause Tracking)
  {
    id: 'dl-116',
    name: 'Vincent Moretti',
    phone: '(760) 555-2299',
    email: 'vmoretti@socalhomes.com',
    address: '1844 Crest Dr',
    city: 'Encinitas',
    service: 'Tile Relay & Underlayment',
    serviceColor: 'coral',
    value: 28000,
    stageId: 'closed_lost',
    daysInStage: 19,
    score: 62,
    estimator: { name: 'Carlos Ramirez', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100', role: 'Field Estimator' },
    slaStatus: 'on_track',
    slaText: 'Archived • Lost to Competitor',
    photosCount: 16,
    lossReason: 'Competitor Price (Low Bidder)',
    lossNotes: 'Homeowner went with unlicensed subcontractor offering $19,500 cash without manufacturer warranty.',
    notes: 'Keep on contact list for re-quote in 12 months if contractor fails inspection.',
    checklist: [
      { id: 'c1', label: 'Loss reason logged in CRM', done: true },
      { id: 'c2', label: 'Autopsy notes documented', done: true },
    ],
  },
];
