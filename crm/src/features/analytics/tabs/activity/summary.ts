import type { ActivityEntry } from './types';

export function humanize(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value as string | number | boolean);
}

/** One-line description of what happened, used in the table row. */
export function summarize(entry: ActivityEntry): string {
  if (entry.action === 'create') return 'Created';
  if (entry.action === 'delete') return 'Deleted';
  if (entry.source === 'security') return humanize(entry.action.replace(/[.:]/g, ' '));
  const changes = entry.changes ?? {};
  const keys = entry.changed_fields.length ? entry.changed_fields : Object.keys(changes);
  if (keys.length === 0) return 'Updated';
  const first = keys[0];
  const change = changes[first];
  const head = change
    ? `${humanize(first)}: ${formatValue(change.old)} → ${formatValue(change.new)}`
    : humanize(first);
  return keys.length > 1 ? `${head} (+${keys.length - 1} more)` : head;
}

export function actorLabel(entry: ActivityEntry): string {
  const { actor } = entry;
  if (actor.name) return actor.name;
  if (actor.email) return actor.email;
  return actor.type === 'api_key' ? 'API key' : 'System';
}
