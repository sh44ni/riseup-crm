import { describe, it, expect } from 'vitest';
import { serviceToColor, relativeTime, normalizeStageId, normalizeSlaStatus, classifyToDashboardColumn } from '../pipelineUtils';

describe('serviceToColor', () => {
  it('returns a color class for residential service', () => {
    const color = serviceToColor('shingle');
    expect(typeof color).toBe('string');
    expect(color.length).toBeGreaterThan(0);
    expect(color).toBe('blue');
  });

  it('returns a fallback color for unknown service', () => {
    const color = serviceToColor('unknown_service_xyz');
    expect(typeof color).toBe('string');
    expect(color).toBe('emerald');
  });
});

describe('relativeTime', () => {
  it('returns Recently for no input', () => {
    expect(relativeTime()).toBe('Recently');
  });

  it('handles valid dates', () => {
    const past = new Date(Date.now() - 5 * 60000).toISOString();
    expect(relativeTime(past)).toBe('5m ago');
  });
});

describe('normalizeStageId', () => {
  it('normalizes legacy stages to current ones', () => {
    expect(normalizeStageId('followup_2day')).toBe('follow_up');
    expect(normalizeStageId('inspection_scheduled')).toBe('estimate_scheduled');
  });

  it('passes through valid current stages', () => {
    expect(normalizeStageId('active_jobs')).toBe('active_jobs');
  });

  it('defaults to cold_lead for unknown stages', () => {
    expect(normalizeStageId('made_up_stage')).toBe('cold_lead');
  });
});

describe('normalizeSlaStatus', () => {
  it('maps correctly', () => {
    expect(normalizeSlaStatus('warning')).toBe('overdue');
    expect(normalizeSlaStatus('due_soon')).toBe('due_today');
    expect(normalizeSlaStatus('anything_else')).toBe('on_track');
  });
});

describe('classifyToDashboardColumn and COLUMN_CONFIG', () => {
  it('routes contract_sent to follow_up column on dashboard', () => {
    const lead: any = { id: 1, full_name: 'Test', status: 'new', granular_stage: 'contract_sent' };
    expect(classifyToDashboardColumn(lead)).toBe('follow_up');
  });

  it('routes contract_signed (with contract_signed_at) to contract_signed column', () => {
    const lead: any = { id: 2, full_name: 'Test', status: 'new', granular_stage: 'contract_signed', contract_signed_at: '2026-09-27' };
    expect(classifyToDashboardColumn(lead)).toBe('contract_signed');
  });

  it('has contract_signed in COLUMN_ORDER and contract_sent only in COLUMN_CONFIG', async () => {
    const { COLUMN_CONFIG, COLUMN_ORDER } = await import('../pipelineUtils');
    expect(COLUMN_ORDER).toContain('contract_signed');
    expect(COLUMN_ORDER).not.toContain('contract_sent');
    expect(COLUMN_CONFIG.contract_signed).toBeDefined();
    expect(COLUMN_CONFIG.contract_signed.title).toBe('Contract Signed');
    expect(COLUMN_CONFIG.contract_sent).toBeDefined();
    expect(COLUMN_CONFIG.contract_sent.title).toBe('Contract Sent');
  });
});
