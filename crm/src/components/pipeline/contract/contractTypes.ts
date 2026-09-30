export interface ScopeSection {
  heading: string;
  text: string;
}

export interface PaymentRow {
  number: string;
  description: string;
  amount: string;
}

export interface ContractFormState {
  // Step 1 — Project Info
  clientName: string;
  projectAddress: string;
  contractDate: string;
  contractDateShort: string;
  startDate: string;
  commencementDate: string;
  completionDate: string;
  salespersonName: string;
  contractorName: string;
  contractorTitle: string;
  licenseNumber: string;
  cancellationDeadline: string;
  // Step 2 — Scope
  scopeTitle: string;
  scopeSections: ScopeSection[];
  contractPrice: string;
  downpayment: string;
  financeCharge: string;
  // Step 3 — Payment Schedule
  paymentRows: PaymentRow[];
}

export function formatMoney(val: string | number): string {
  const n = parseFloat(String(val).replace(/[^0-9.]/g, ''));
  if (isNaN(n)) return '$0.00';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

export function sumPayments(rows: PaymentRow[]): number {
  return rows.reduce((acc, r) => {
    const n = parseFloat(r.amount.replace(/[^0-9.]/g, ''));
    return acc + (isNaN(n) ? 0 : n);
  }, 0);
}

export function autoSplitPayments(priceStr: string): PaymentRow[] {
  const price = parseFloat(priceStr.replace(/[^0-9.]/g, ''));
  if (isNaN(price) || price <= 0) return [];

  const pct = (p: number) => Math.round(price * p * 100) / 100;

  // Payment 1: $1 000 or 10% if price < $10k
  const p1 = price < 10000 ? pct(0.1) : 1000;
  const rem = price - p1;
  const p2 = Math.round(rem * 0.35 * 100) / 100;
  const p3 = Math.round(rem * 0.35 * 100) / 100;
  const p4 = Math.round((price - p1 - p2 - p3) * 100) / 100;

  return [
    { number: '1', description: 'Contract Execution / Deposit', amount: String(p1) },
    { number: '2', description: 'Materials Delivered to Site', amount: String(p2) },
    { number: '3', description: 'Completion of Roofing Work', amount: String(p3) },
    { number: '4', description: 'Final Inspection & Punch-List', amount: String(p4) },
  ];
}

export const DEFAULT_SCOPE_SECTIONS: ScopeSection[] = [
  {
    heading: 'Scope of Work',
    text: 'Contractor shall furnish all materials, labor, equipment, and permits required for the complete roofing project as described herein.',
  },
  {
    heading: 'Roofing Materials',
    text: 'Supply and install new roofing materials per manufacturer specifications. All materials shall meet or exceed local building codes and carry manufacturer warranties.',
  },
  {
    heading: 'Underlayment',
    text: 'Install new synthetic or felt underlayment over entire decking surface, lapped and fastened per manufacturer instructions and applicable code.',
  },
  {
    heading: 'Flashings & Sheet Metal',
    text: 'Install or replace all step flashings, counter flashings, valley metal, drip edge, and pipe boots as needed to ensure a watertight assembly.',
  },
  {
    heading: 'Labor & Equipment',
    text: 'All work performed by licensed and insured Rise Up Roofing & Construction crew members. Equipment including safety systems, lifts, and scaffolding supplied by contractor.',
  },
  {
    heading: 'Dump, Disposal & Cleanup',
    text: 'Contractor to remove all debris, old roofing materials, and waste from the property. Site to be cleaned and left in broom-swept condition at project completion.',
  },
];

export const labelCls =
  'block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1';
export const inputCls =
  'w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-sm text-slate-900 dark:text-white font-medium placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition-all';
export const textareaCls =
  'w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-sm text-slate-900 dark:text-white font-medium placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition-all resize-none';
