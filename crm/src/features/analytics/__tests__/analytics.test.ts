import { describe, expect, it } from 'vitest';
import { ANALYTICS_TABS, findTab, isLive, visibleTabs } from '../registry';
import { summarize, actorLabel } from '../tabs/activity/summary';
import type { ActivityEntry } from '../tabs/activity/types';

const base: ActivityEntry = {
  id: 1,
  occurred_at: '2026-01-01T00:00:00Z',
  source: 'data',
  action: 'update',
  actor: { user_id: 1, name: 'Ana', email: 'a@x.io', role: 'owner', type: 'user', ip_address: null },
  record: { type: 'clients', id: '5', label: 'Bob', client_id: 5, deleted: false },
  changed_fields: ['phone', 'status'],
  categories: ['contact'],
  changes: { phone: { old: '1', new: '2' }, status: { old: 'lead', new: 'won' } },
};

describe('analytics registry', () => {
  it('has unique ids and starts with the activity tab', () => {
    const ids = ANALYTICS_TABS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids[0]).toBe('activity');
  });

  it('filters tabs by permission', () => {
    expect(visibleTabs(() => false)).toEqual([]);
    expect(visibleTabs((p) => p === 'activity.view').map((t) => t.id)).toContain('activity');
    expect(visibleTabs((p) => p === 'activity.view').filter(isLive).map((t) => t.id)).toEqual(['activity']);
  });

  it('finds tabs by id', () => {
    expect(findTab('activity')?.label).toBe('Activity');
    expect(findTab('nope')).toBeUndefined();
    expect(findTab('lead-sources')).toBeUndefined();
  });
});

describe('activity summary', () => {
  it('summarizes updates with first change and remainder count', () => {
    expect(summarize(base)).toBe('Phone: 1 → 2 (+1 more)');
  });
  it('summarizes create/delete', () => {
    expect(summarize({ ...base, action: 'create' })).toBe('Created');
    expect(summarize({ ...base, action: 'delete' })).toBe('Deleted');
  });
  it('falls back for actor label', () => {
    expect(actorLabel(base)).toBe('Ana');
    expect(actorLabel({ ...base, actor: { ...base.actor, name: null, email: null, type: 'system' } })).toBe('System');
  });
});
