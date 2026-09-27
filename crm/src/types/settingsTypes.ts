export type SettingsTab =
  | 'profile'
  | 'users'
  | 'signatories'
  | 'company'
  | 'pricing'
  | 'pipeline'
  | 'notifications'
  | 'integrations'
  | 'security';

export type RoleType =
  | 'owner'
  | 'senior_estimator'
  | 'production_manager'
  | 'field_foreman'
  | 'crew_lead'
  | 'office_admin';

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: RoleType;
  roleLabel: string;
  branch: string;
  avatarColor: string;
  initials: string;
  status: 'active' | 'suspended' | 'invited';
  twoFactorEnabled: boolean;
  lastActive: string;
  joinedDate: string;
  avatarUrl?: string;
  signature_data?: string;
  signature_type?: 'typed' | 'drawn';
  signature_title?: string;
  is_authorized_signatory?: boolean;
}

export interface UserRole {
  id: RoleType;
  title: string;
  description: string;
  memberCount: number;
  badgeColor: string;
  is_authorized_signatory?: boolean;
  permissions: {
    viewFinancials: boolean;
    editPricingFormulas: boolean;
    createEstimates: boolean;
    signContracts: boolean;
    dispatchCrews: boolean;
    deleteRecords: boolean;
    exportReports: boolean;
    manageUsers: boolean;
  };
}

export type PermissionKey = keyof UserRole['permissions'];

export interface CompanyProfile {
  legalName: string;
  dba: string;
  licenseNumber: string;
  licenseType: string;
  licenseExpiration: string;
  bondNumber: string;
  bondAmount: string;
  workersCompStatus: string;
  workersCompPolicy: string;
  epaLeadCert: string;
  hqAddress: string;
  yardAddress: string;
  publicPhone: string;
  dispatchHotline: string;
  primaryEmail: string;
  dispatchEmail: string;
  websiteUrl: string;
  taxRateDefault: number;
  taxRateOceanside: number;
  primaryColor: string;
  accentColor: string;
}

export interface PricingConfig {
  pitchMultipliers: {
    flatTo3_12: number;
    fourTo6_12: number;
    sevenTo9_12: number;
    tenPlus_12: number;
  };
  storyMultipliers: {
    oneStory: number;
    twoStory: number;
    threeStoryCoastal: number;
  };
  tearOffRates: {
    shingle1Layer: number;
    shingle2Layer: number;
    tileConcrete: number;
    woodShake: number;
  };
  marginGuardrails: {
    targetGrossMargin: number;
    hardFloorMargin: number;
    salesCommissionRate: number;
  };
  wasteFactors: {
    gableSimple: number;
    hipValleyComplex: number;
    mansardTurret: number;
  };
  permitFees: {
    oceanside: number;
    carlsbad: number;
    encinitas: number;
    vista: number;
  };
  services?: EstimatorServiceItem[];
  pricingRules?: EstimatorPricingRuleItem[];
}

export interface EstimatorPricingRuleItem {
  id?: number;
  service_id: number;
  slug: string;
  name: string;
  price_per_sqft_low: number;
  price_per_sqft_high: number;
  base_fee_low: number;
  base_fee_high: number;
  min_sqft: number;
  max_sqft: number;
  apr_available: boolean;
  financing_apr: number;
  financing_term_months: number;
}

export interface EstimatorServiceItem {
  id: number;
  slug: string;
  name: string;
  short_label: string;
  icon_key: string;
  badge_label?: string;
  sort_order: number;
  is_active: boolean;
}

export interface PipelineAutomation {
  speedToLeadEnabled: boolean;
  responseSlaMinutes: number;
  smsTemplate: string;
  afterHoursRouting: 'emergency_dispatcher' | 'queue_morning' | 'voicemail';
  autoAssignMode: 'round_robin' | 'territory_zip' | 'manual';
  lossReasons: string[];
  inboundWebhookLsa: string;
  zapierWebhookSecret: string;
}

export interface NotificationSettings {
  crewRolloutTime: string;
  crewMorningSmsActive: boolean;
  weatherWindAlertActive: boolean;
  windThresholdMph: number;
  weatherRainAlertActive: boolean;
  rainThresholdPct: number;
  clientMilestones: {
    inspectionScheduled: boolean;
    tearOffStarted: boolean;
    dryInCompleted: boolean;
    finalWalkthroughReady: boolean;
  };
}

export interface IntegrationItem {
  id: string;
  name: string;
  category: 'backend' | 'aerial' | 'communication' | 'payments' | 'manufacturer';
  status: 'connected' | 'disconnected' | 'degraded';
  latencyMs?: number;
  description: string;
  endpointUrl?: string;
  lastSync: string;
}

export interface SecuritySession {
  id: string;
  device: string;
  browser: string;
  ip: string;
  location: string;
  isCurrent: boolean;
  lastActive: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  user: string;
  userInitials: string;
  action: string;
  category: 'security' | 'pricing' | 'team' | 'billing' | 'compliance';
  ip: string;
}
