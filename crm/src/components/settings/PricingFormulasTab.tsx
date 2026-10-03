import React from 'react';
import { PricingConfig, EstimatorPricingRuleItem } from '@/types/settingsTypes';
import { EstimatorServiceRulesSection } from './pricing/EstimatorServiceRulesSection';
import { MarginGuardrailsSection } from './pricing/MarginGuardrailsSection';
import { SlopeAndHeightMultipliersSection } from './pricing/SlopeAndHeightMultipliersSection';
import { TearOffAndPermitSection } from './pricing/TearOffAndPermitSection';

interface PricingFormulasTabProps {
  pricing: PricingConfig;
  onChange: (updated: PricingConfig) => void;
}

const DEFAULT_RULES: EstimatorPricingRuleItem[] = [
  {
    service_id: 1,
    slug: 'residential',
    name: 'Tile / Shingle Roof',
    price_per_sqft_low: 4.0,
    price_per_sqft_high: 6.2,
    base_fee_low: 500,
    base_fee_high: 950,
    min_sqft: 800,
    max_sqft: 8000,
    apr_available: true,
    financing_apr: 0.0,
    financing_term_months: 60,
  },
  {
    service_id: 2,
    slug: 'repair',
    name: 'Leak & Tile Repair',
    price_per_sqft_low: 0.4,
    price_per_sqft_high: 0.8,
    base_fee_low: 100,
    base_fee_high: 600,
    min_sqft: 500,
    max_sqft: 8000,
    apr_available: true,
    financing_apr: 0.0,
    financing_term_months: 18,
  },
  {
    service_id: 3,
    slug: 'commercial',
    name: 'Commercial Flat Roof',
    price_per_sqft_low: 5.0,
    price_per_sqft_high: 8.0,
    base_fee_low: 2250,
    base_fee_high: 4000,
    min_sqft: 1000,
    max_sqft: 15000,
    apr_available: true,
    financing_apr: 0.0,
    financing_term_months: 60,
  },
  {
    service_id: 4,
    slug: 'solar',
    name: 'Solar + Roofing',
    price_per_sqft_low: 7.5,
    price_per_sqft_high: 11.5,
    base_fee_low: 1500,
    base_fee_high: 3000,
    min_sqft: 1000,
    max_sqft: 10000,
    apr_available: true,
    financing_apr: 0.0,
    financing_term_months: 120,
  },
];

export function PricingFormulasTab({ pricing, onChange }: PricingFormulasTabProps) {
  const marginGuardrails = pricing?.marginGuardrails || {
    targetGrossMargin: 38.0,
    hardFloorMargin: 32.0,
    salesCommissionRate: 10.0,
  };

  const pitchMultipliers = pricing?.pitchMultipliers || {
    flatTo3_12: 1.0,
    fourTo6_12: 1.15,
    sevenTo9_12: 1.3,
    tenPlus_12: 1.55,
  };

  const storyMultipliers = pricing?.storyMultipliers || {
    oneStory: 1.0,
    twoStory: 1.18,
    threeStoryCoastal: 1.35,
  };

  const tearOffRates = pricing?.tearOffRates || {
    shingle1Layer: 45.0,
    shingle2Layer: 85.0,
    tileConcrete: 120.0,
    woodShake: 145.0,
  };

  const permitFees = pricing?.permitFees || {
    oceanside: 450,
    carlsbad: 485,
    encinitas: 525,
    vista: 420,
  };

  const rules = pricing?.pricingRules && pricing.pricingRules.length > 0 ? pricing.pricingRules : DEFAULT_RULES;

  const updatePricingRule = (
    serviceId: number,
    field: keyof EstimatorPricingRuleItem,
    val: number | string | boolean
  ) => {
    const updated = rules.map((r) => {
      if (r.service_id === serviceId) {
        return { ...r, [field]: val };
      }
      return r;
    });
    onChange({
      ...pricing,
      pricingRules: updated,
      marginGuardrails,
      pitchMultipliers,
      storyMultipliers,
      tearOffRates,
      permitFees,
    });
  };

  const updatePitch = (key: keyof PricingConfig['pitchMultipliers'], val: number) => {
    onChange({
      ...pricing,
      pitchMultipliers: {
        ...pitchMultipliers,
        [key]: val,
      },
    });
  };

  const updateStory = (key: keyof PricingConfig['storyMultipliers'], val: number) => {
    onChange({
      ...pricing,
      storyMultipliers: {
        ...storyMultipliers,
        [key]: val,
      },
    });
  };

  const updateTearOff = (key: keyof PricingConfig['tearOffRates'], val: number) => {
    onChange({
      ...pricing,
      tearOffRates: {
        ...tearOffRates,
        [key]: val,
      },
    });
  };

  const updateMargin = (key: keyof PricingConfig['marginGuardrails'], val: number) => {
    onChange({
      ...pricing,
      marginGuardrails: {
        ...marginGuardrails,
        [key]: val,
      },
    });
  };

  const updatePermit = (key: keyof PricingConfig['permitFees'], val: number) => {
    onChange({
      ...pricing,
      permitFees: {
        ...permitFees,
        [key]: val,
      },
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <EstimatorServiceRulesSection
        rules={rules}
        pitchMultipliers={pitchMultipliers}
        storyMultipliers={storyMultipliers}
        onUpdatePricingRule={updatePricingRule}
      />

      <MarginGuardrailsSection
        marginGuardrails={marginGuardrails}
        onUpdateMargin={updateMargin}
      />

      <SlopeAndHeightMultipliersSection
        pitchMultipliers={pitchMultipliers}
        storyMultipliers={storyMultipliers}
        onUpdatePitch={updatePitch}
        onUpdateStory={updateStory}
      />

      <TearOffAndPermitSection
        tearOffRates={tearOffRates}
        permitFees={permitFees}
        onUpdateTearOff={updateTearOff}
        onUpdatePermit={updatePermit}
      />
    </div>
  );
}
