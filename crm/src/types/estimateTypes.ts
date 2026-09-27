export type TemplateKey =
  | 'multi_option_proposal'
  | 'standard_roofing_estimate'
  | 'premium_4page_proposal'
  | 'skylight_estimate'
  | 'solar_rr_addon'
  | 'fascia_wood_repair'
  | 'rain_gutter_addon'
  | 'pressure_washing_addon'
  | 'emergency_leak_prep'
  | 'roof_inspection_report'
  | 'hoa_property_program'
  | 'commercial_roofing_proposal';

export interface EstimateTemplateMeta {
  key: TemplateKey;
  numberPrefix: string;
  name: string;
  category: 'Proposal' | 'Estimate' | 'Add-On' | 'Report' | 'Commercial';
  pages: string;
  badge?: string;
  description: string;
  calculatorType: 'universal_margin' | 'per_unit' | 'flat_or_sqft';
}

export interface UniversalCostInputs {
  roofSquares: number;
  subcontractorLabor: number;
  roofingMaterials: number;
  disposalFees: number;
  permitFees: number;
  plywoodAllowance: number;
  otherCosts: number;
  salesCommission: number;
  commissionIsPct: boolean;
  selectedMarginPct: number;
}

export interface PricingTierResult {
  sellingPrice: number;
  grossProfit: number;
  marginPct: number;
  commission: number;
}

export interface OptionDetails {
  title: string;
  subtitle: string;
  lockInPrice: number;
  standardPrice: number;
  warranty: string;
  scopeItems: string[];
}

export interface AddonDetails {
  title: string;
  description: string;
  price: number;
  imageUrl?: string;
}

export interface MultiOptionProposalData {
  proposalDate: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: string;
  customerCity: string;
  roofSquares: number;
  roofPitch: string;
  stories: string;
  heroPhotoUrl: string;
  optionA: OptionDetails;
  optionB: OptionDetails;
  addon1: AddonDetails;
  addon2: AddonDetails;
  lockInDays: number;
}

export interface HomeownerSpecs {
  customerName: string;
  phone: string;
  streetAddress: string;
  city: string;
  squares: number;
  pitch: string;
  pitchMultiplier: number;
  stories: string;
  storyMultiplier: number;
  tearOff: '1_layer' | '2_layers' | 'overlay';
  tearOffCostPerSq: number;
}

export interface RoofingMaterial {
  id: string;
  name: string;
  brand: string;
  type: 'shingle' | 'concrete_tile' | 'clay_tile' | 'metal' | 'tpo';
  baseCostPerSq: number;
  warranty: string;
  colors: string[];
  popular?: boolean;
  image?: string;
  description: string;
}

export interface MaterialSelection {
  materialId: string;
  materialName: string;
  costPerSq: number;
  warranty: string;
  selectedColor: string;
  underlayment: 'standard_felt' | 'premium_synthetic' | 'ice_and_water';
  underlaymentCostPerSq: number;
}

export interface ScopeItem {
  id: string;
  name: string;
  description: string;
  unit: string;
  unitPrice: number;
  quantity: number;
  includedInBase: boolean;
  selected: boolean;
}

export interface PricingTier {
  id: 'good' | 'better' | 'best';
  title: string;
  name: string;
  badge?: string;
  total: number;
  monthlyFinancing: number;
  warrantyText: string;
  underlaymentType: string;
  features: string[];
  recommended?: boolean;
}

export interface EstimateRecord {
  id: string;
  estimateNumber: string;
  date: string;
  specs: HomeownerSpecs;
  material: MaterialSelection;
  scope: ScopeItem[];
  tiers: {
    good: PricingTier;
    better: PricingTier;
    best: PricingTier;
  };
  selectedTierId: 'good' | 'better' | 'best';
  status: 'Draft' | 'Sent' | 'Accepted' | 'Declined';
  estimatorName: string;
  templateKey?: TemplateKey;
  proposalData?: MultiOptionProposalData;
  pdfUrl?: string;
}
