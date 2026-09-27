import { describe, it, expect } from 'vitest';
import { getSourceBadges } from '../leadHelpers';
import { Lead } from '@/types/leadTypes';

describe('getSourceBadges', () => {
  it('handles website source type', () => {
    const lead = { source: 'website', leadSourceDetail: 'Google Ads' } as Lead;
    const result = getSourceBadges(lead);
    expect(result.type).toBe('website');
    expect(result.mainLabel).toBe('Website Lead');
    expect(result.detailLabel).toBe('Google Ads');
  });

  it('handles manual/referral source type', () => {
    const lead = { source: 'manual', sourceLabel: 'Referral', leadSourceDetail: 'Referral' } as Lead;
    const result = getSourceBadges(lead);
    expect(result.type).toBe('manual');
    expect(result.mainLabel).toBe('Referral');
    expect(result.detailLabel).toBeNull();
  });

  it('handles missing leadSourceDetail gracefully', () => {
    const lead = { source: 'website' } as Lead;
    const result = getSourceBadges(lead);
    expect(result.type).toBe('website');
    expect(result.detailLabel).toBeNull();
  });

  it('never throws for empty input', () => {
    const lead = {} as Lead;
    const result = getSourceBadges(lead);
    expect(result.type).toBe('manual');
    expect(result.mainLabel).toBe('Manual Entry');
  });
});
