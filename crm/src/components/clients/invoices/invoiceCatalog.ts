import type { InvoiceItemType } from '@/types/client360Types';

export interface CatalogItem {
  description: string;
  unit_price: number;
  unit: string;
  item_type: InvoiceItemType;
  taxable?: boolean;
}

export const INVOICE_UNITS = ['ea', 'sq', 'sq ft', 'ln ft', 'hr', 'sheet', 'lump sum'] as const;

export const INVOICE_ITEM_TYPES: { value: InvoiceItemType; label: string }[] = [
  { value: 'service', label: 'Service' },
  { value: 'material', label: 'Material' },
  { value: 'labor', label: 'Labor' },
  { value: 'fee', label: 'Fee' },
  { value: 'discount', label: 'Discount / Credit' },
];

export interface PaymentFieldDef {
  label: string;
  placeholder?: string;
  defaultValue?: string;
  multiline?: boolean;
}

export interface PaymentMethodDef {
  label: string;
  fields: PaymentFieldDef[];
}

/** Detail fields offered for each payment method. Values stay fully editable per invoice. */
export const PAYMENT_METHOD_DEFS: Record<string, PaymentMethodDef> = {
  check: {
    label: 'Check',
    fields: [
      { label: 'Payable to', defaultValue: 'Rise Up Roofing and Construction, Inc.' },
      { label: 'Mail to', defaultValue: '1111 W El Norte Pkwy, Escondido, CA 92026' },
    ],
  },
  ach_wire: {
    label: 'Bank Transfer / ACH',
    fields: [
      { label: 'Bank name', placeholder: 'e.g. Wells Fargo' },
      { label: 'Account name', defaultValue: 'Rise Up Roofing and Construction, Inc.' },
      { label: 'Routing number', placeholder: '9 digits' },
      { label: 'Account number', placeholder: 'Account number' },
    ],
  },
  credit_card: {
    label: 'Credit Card',
    fields: [
      { label: 'Pay by phone', defaultValue: '(760) 622-1230' },
      { label: 'Payment link', placeholder: 'https://…' },
    ],
  },
  zelle: {
    label: 'Zelle',
    fields: [
      { label: 'Send to (email or phone)', defaultValue: 'billing@riseuprac.com' },
      { label: 'Name on account', defaultValue: 'Rise Up Roofing and Construction, Inc.' },
    ],
  },
  cash: {
    label: 'Cash',
    fields: [{ label: 'Instructions', defaultValue: 'Pay at our office or to your crew lead — a receipt will be provided.', multiline: true }],
  },
  financing: {
    label: 'Financing',
    fields: [
      { label: 'Lender / program', placeholder: 'e.g. GreenSky, Hearth' },
      { label: 'Contact or link', placeholder: 'Phone, email or application link' },
    ],
  },
  insurance_check: {
    label: 'Insurance Check',
    fields: [
      { label: 'Claim number', placeholder: 'Claim #' },
      { label: 'Make payable to', defaultValue: 'Rise Up Roofing and Construction, Inc.' },
    ],
  },
  other: {
    label: 'Other…',
    fields: [{ label: 'Details', placeholder: 'How should the customer pay?', multiline: true }],
  },
};

export const PAYMENT_METHOD_OPTIONS: { value: string; label: string }[] = Object.entries(
  PAYMENT_METHOD_DEFS
).map(([value, def]) => ({ value, label: def.label }));

export interface PaymentMethodEntry {
  id: string;
  type: string;
  /** Custom display name (only used when type === 'other'). */
  name?: string;
  fields: { label: string; value: string }[];
}

let methodSeq = 0;
export function newMethodEntry(type: string): PaymentMethodEntry {
  const def = PAYMENT_METHOD_DEFS[type] || PAYMENT_METHOD_DEFS.other;
  methodSeq += 1;
  return {
    id: `pm-${Date.now()}-${methodSeq}`,
    type,
    name: type === 'other' ? '' : undefined,
    fields: def.fields.map((f) => ({ label: f.label, value: f.defaultValue || '' })),
  };
}

const METHODS_KEY = 'riseup.invoice.paymentMethods.v1';

/** Last-used payment methods (with their details) so staff don't retype bank info every time. */
export function loadSavedMethods(): PaymentMethodEntry[] {
  try {
    const raw = localStorage.getItem(METHODS_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed) && parsed.length) {
      return parsed
        .filter((m: any) => m && PAYMENT_METHOD_DEFS[m.type])
        .map((m: any) => ({ ...newMethodEntry(m.type), name: m.name, fields: m.fields }));
    }
  } catch {
    /* ignore corrupt storage */
  }
  return ['check', 'ach_wire', 'credit_card'].map(newMethodEntry);
}

export function saveMethods(methods: PaymentMethodEntry[]) {
  try {
    localStorage.setItem(
      METHODS_KEY,
      JSON.stringify(methods.map(({ type, name, fields }) => ({ type, name, fields })))
    );
  } catch {
    /* storage unavailable — non-fatal */
  }
}

/** Shape sent to the API: drop empty detail lines. */
export function methodsToPayload(methods: PaymentMethodEntry[]) {
  return methods.map((m) => ({
    type: m.type,
    ...(m.type === 'other' && m.name?.trim() ? { name: m.name.trim() } : {}),
    fields: m.fields.filter((f) => f.value.trim()).map((f) => ({ label: f.label, value: f.value.trim() })),
  }));
}

export const PAYMENT_TERMS_OPTIONS = [
  'Due Upon Receipt',
  'Net 7 Days',
  'Net 15 Days',
  'Net 30 Days',
  'Due on Completion',
];

export const SEED_CATALOG: CatalogItem[] = [
  { description: 'Architectural Shingle Roof Replacement (Materials & Labor)', unit_price: 12500, unit: 'lump sum', item_type: 'service' },
  { description: 'Premium Synthetic Underlayment & Ice/Water Shield Barrier', unit_price: 1850, unit: 'lump sum', item_type: 'material', taxable: true },
  { description: 'Tear-Off Existing Roofing Layers, Disposal & Magnetic Sweep', unit_price: 2400, unit: 'lump sum', item_type: 'labor' },
  { description: 'Drip Edge, Chimney Step/Counter Flashing & Pipe Boots', unit_price: 1200, unit: 'lump sum', item_type: 'material', taxable: true },
  { description: 'Continuous Ridge Vent & Intake Ventilation', unit_price: 950, unit: 'lump sum', item_type: 'material', taxable: true },
  { description: 'Seamless 6" Aluminum Gutters & Downspouts', unit_price: 2200, unit: 'lump sum', item_type: 'service' },
  { description: 'Plywood Decking Replacement (per 4x8 sheet)', unit_price: 95, unit: 'sheet', item_type: 'material', taxable: true },
  { description: 'Tile Roof Lift & Relay', unit_price: 26870, unit: 'lump sum', item_type: 'service' },
  { description: 'Flat Roof Modified Bitumen / TPO System', unit_price: 8500, unit: 'lump sum', item_type: 'service' },
  { description: 'Emergency Roof Repair & Tarping', unit_price: 650, unit: 'lump sum', item_type: 'service' },
  { description: 'Permit & Inspection Fees', unit_price: 350, unit: 'ea', item_type: 'fee' },
  { description: 'Dumpster / Debris Haul-Off', unit_price: 450, unit: 'ea', item_type: 'fee' },
  { description: 'Early Payment / Loyalty Discount', unit_price: 250, unit: 'ea', item_type: 'discount' },
];

const RECENT_KEY = 'riseup.invoice.recentItems.v1';

export function loadRecentItems(): CatalogItem[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.slice(0, 8) : [];
  } catch {
    return [];
  }
}

/** Remember items the user actually invoiced so they appear first in the catalog next time. */
export function rememberItems(items: CatalogItem[]) {
  try {
    const existing = loadRecentItems();
    const merged = [...items, ...existing].filter(
      (it, idx, arr) =>
        it.description.trim() &&
        arr.findIndex((o) => o.description.trim().toLowerCase() === it.description.trim().toLowerCase()) === idx
    );
    localStorage.setItem(RECENT_KEY, JSON.stringify(merged.slice(0, 8)));
  } catch {
    /* storage unavailable — non-fatal */
  }
}
