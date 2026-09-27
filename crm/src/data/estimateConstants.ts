import {
  EstimatePlan,
  EstimateAddon,
  EstimatePricing,
  EstimateTemplateDef,
  WizardStepDef,
} from '@/types/estimateContractTypes';

export const ESTIMATE_FIELD_CAPS = {
  planName: 28,
  planSubtitle: 30,
  priceBadgeLabel: 24,
  priceMax: 999999,
  priceMin: 0,
  scopeItemText: 85,
  scopeItemsMin: 5,
  scopeItemsMax: 11,
  warrantyChip: 28,
  addonTitle: 60,
  addonDescription: 240,
  addonPriceMax: 999999,
  importantNote: 200,
  lockInDaysMin: 1,
  lockInDaysMax: 90,
  clientEmail: 45,
} as const;

export const ESTIMATE_DESIGN_TOKENS = {
  colors: {
    navy: '#091b36',
    navyDark: '#061425',
    midBlue: '#1a5ba5',
    brightBlue: '#00b0ed',
    lightBlue: '#e8f4fd',
    accentBlue: '#2F9FE3',
    white: '#ffffff',
    textDark: '#0f172a',
    textMuted: '#64748b',
    gradientBlueStart: '#1a5ba5',
    gradientBlueEnd: '#00b0ed',
  },
  fonts: {
    display: 'Montserrat',
    body: 'Inter',
  },
  page: {
    widthPx: 816,
    heightPx: 1056,
    widthIn: '8.5in',
    heightIn: '11in',
  },
} as const;

export const DEFAULT_PLAN_A: EstimatePlan = {
  name: 'TILE ROOF LIFT & RELAY',
  subtitle: 'REUSE EXISTING TILES',
  priceBadgeLabel: 'INCLUDED UNDERLAYMENT',
  price: 26870,
  scopeItems: [
    'Remove and carefully stage existing roof tiles for reuse.',
    'Remove and dispose of existing underlayment.',
    'Inspect decking and replace up to 3 sheets of plywood as needed.',
    'Install new tile roof underlayment.',
    'Install new flashings, drip edge metal, valley metals, and other necessary metals.',
    'Reinstall existing roof tiles.',
    'Replace broken or unusable tiles up to 10% of existing tiles.',
    'Reseal all roof vents and penetrations.',
    'Paint vent components to match existing tile color.',
    'Clean up and remove all debris.',
    'Final inspection and quality walkthrough.',
  ],
  warrantyChips: ['10 YEAR WORKMANSHIP', '30 YEAR MANUFACTURER'],
};

export const DEFAULT_PLAN_B: EstimatePlan = {
  name: 'COMPLETE NEW TILE ROOF SYSTEM',
  subtitle: '100% NEW TILE INSTALLATION',
  priceBadgeLabel: 'INCLUDED UNDERLAYMENT',
  price: 32410,
  scopeItems: [
    'Remove and dispose of 100% of existing roof tiles.',
    'Remove and dispose of existing underlayment.',
    'Inspect decking and replace up to 4 sheets of plywood as needed.',
    'Install new tile roof underlayment.',
    'Install new flashings, drip edge metal, valley metals, and other necessary metals.',
    'Install 100% brand-new roof tiles (homeowner to select style & color).',
    'Properly install and secure new tile roofing system.',
    'Reseal all roof vents and penetrations.',
    'Paint vent components to match new tile color.',
    'Clean up and remove all debris.',
    'Final inspection and quality walkthrough.',
  ],
  warrantyChips: ['10 YEAR WORKMANSHIP', '30 YEAR MANUFACTURER'],
};

export const DEFAULT_ADDON_1: EstimateAddon = {
  iconMode: 'builtin',
  builtinIconId: 'underlayment',
  title: 'PREMIUM PSU / PEEL-AND-STICK (TILESEAL) UNDERLAYMENT UPGRADE',
  description: 'Upgrade the standard underlayment to a premium self-adhered peel-and-stick system, such as TileSeal or approved equivalent. Provides a fully adhered secondary water-resistant barrier and improved sealing around fastener penetrations.',
  price: 2000,
  pricePrefix: '+',
};

export const DEFAULT_ADDON_2: EstimateAddon = {
  iconMode: 'builtin',
  builtinIconId: 'pressure_washer',
  title: 'PRESSURE WASHING ADD-ON',
  description: 'Professional soft wash of roof tiles, exterior surfaces, walkways, and driveway to remove dirt, mold, mildew, and algae.',
  price: 3500,
  pricePrefix: '',
};

export const DEFAULT_IMPORTANT_NOTE = 'These special "Lock-In" prices are valid when you schedule within {N} days from the date of this proposal. Work does not need to be completed within the {N}-day period.';

export const DEFAULT_PRICING: EstimatePricing = {
  lockInDays: 20,
  standardPrices: [31500, 37200],
  importantNote: DEFAULT_IMPORTANT_NOTE,
};

export const WIZARD_STEPS: WizardStepDef[] = [
  { id: 'template', label: 'Choose Template', previewPage: 1 },
  { id: 'details', label: 'Client & Details', previewPage: 1 },
  { id: 'photo2', label: 'Page 2 Photo', previewPage: 2 },
  { id: 'plans', label: 'Plan Options', previewPage: 2 },
  { id: 'addons', label: 'Add-Ons', previewPage: 2 },
  { id: 'pricing', label: 'Special Pricing', previewPage: 2 },
  { id: 'review', label: 'Review & Send', previewPage: 2 },
];

export const TEMPLATE_REGISTRY: EstimateTemplateDef[] = [
  {
    id: 'two-options',
    label: '2 Options',
    status: 'active',
    pageCount: 2,
    description: 'Present two clear choices (e.g., Lift & Relay vs New Roof) to the customer.',
    steps: WIZARD_STEPS,
  },
  {
    id: 'good-better-best',
    label: 'Good, Better, Best',
    status: 'soon',
    pageCount: 3,
    description: 'Three-tiered options for maximum upsell potential.',
    steps: [],
  },
  {
    id: 'single-option',
    label: 'Single Option',
    status: 'soon',
    pageCount: 1,
    description: 'A traditional straight-forward single estimate.',
    steps: [],
  },
  {
    id: 'custom',
    label: 'Custom Multi-Page',
    status: 'soon',
    pageCount: 4,
    description: 'Fully custom estimate with multiple sections.',
    steps: [],
  },
];

export function formatEstimatePrice(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}
