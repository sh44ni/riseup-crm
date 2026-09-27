/**
 * Photo asset reference for estimate imagery
 */
export interface PhotoAsset {
  /** URL or data URI */
  url: string;
  filename: string;
  width?: number;
  height?: number;
  /** 0-1 range, default {x: 0.5, y: 0.5} */
  focalPoint?: { x: number; y: number };
  /** Horizontal pan offset percentage: -100 to 100 (default 0) */
  x?: number;
  /** Vertical pan offset percentage: -100 to 100 (default 0) */
  y?: number;
  /** Zoom scale factor (1.0 to 3.0, default 1.0) */
  zoom?: number;
  /** Optional nested position for flexibility */
  position?: { x: number; y: number };
}

/**
 * Plan A or Plan B details
 */
export interface EstimatePlan {
  /** e.g. "TILE ROOF LIFT & RELAY" */
  name: string;
  /** e.g. "REUSE EXISTING TILES" */
  subtitle: string;
  /** e.g. "INCLUDED UNDERLAYMENT" */
  priceBadgeLabel: string;
  /** Lock-in price (also shown in special pricing) */
  price: number;
  /** 5-11 items describing the scope of work */
  scopeItems: string[];
  /** e.g. ["10 YEAR WORKMANSHIP", "30 YEAR MANUFACTURER"] */
  warrantyChips: [string, string];
}

/**
 * Add-on row for optional upgrades
 */
export interface EstimateAddon {
  iconMode: 'builtin' | 'upload';
  builtinIconId?: string;
  uploadedImage?: PhotoAsset;
  title: string;
  description: string;
  price: number;
  /** "+$2,000" vs "$3,500" */
  pricePrefix: '+' | '';
}

/**
 * Client info (from lead)
 */
export interface EstimateClient {
  leadId: string;
  clientId?: string;
  /** read-only from lead */
  name: string;
  /** read-only from lead (address) */
  property: string;
  /** 'client_360' = verified from Client 360 profile, 'lead' = fallback from lead entry */
  addressSource?: 'client_360' | 'lead';
  /** read-only from lead */
  phone: string;
  /** editable, defaults from lead */
  email: string;
}

/**
 * Special pricing section configuration
 */
export interface EstimatePricing {
  /** default 20, range 1-90 */
  lockInDays: number;
  /** standard price for A and B */
  standardPrices: [number, number];
  /** editable, with {N} placeholder */
  importantNote: string;
}

/**
 * Full estimate data object
 */
export interface TwoOptionsEstimate {
  id?: string;
  estimateNumber?: string;
  templateId: 'two-options';
  status: 'draft' | 'sent';
  /** ISO date, default = today in company TZ */
  proposalDate: string;
  client: EstimateClient;
  photo1?: PhotoAsset;
  photo2: {
    mode: 'reuse-photo1' | 'upload';
    asset?: PhotoAsset;
  };
  plans: [EstimatePlan, EstimatePlan];
  addons: [EstimateAddon, EstimateAddon];
  pricing: EstimatePricing;
}

/**
 * Wizard step definition
 */
export interface WizardStepDef {
  id: string;
  label: string;
  previewPage: 1 | 2;
}

/**
 * Template registry definition
 */
export interface EstimateTemplateDef {
  id: string;
  label: string;
  status: 'active' | 'soon';
  pageCount: number;
  description: string;
  steps: WizardStepDef[];
}

/**
 * Built-in icon for add-ons
 */
export interface BuiltinIcon {
  id: string;
  label: string;
  /** inline SVG string */
  svg: string;
}
