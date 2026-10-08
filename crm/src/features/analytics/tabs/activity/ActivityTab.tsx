import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Download, RotateCcw, X } from 'lucide-react';
import { activityApi } from './api';
import { ActivityStats } from './ActivityStats';
import { actorLabel, formatValue, humanize, summarize } from './summary';
import { CrmSelect } from '@/components/common/CrmSelect';
import { CrmDatePicker } from '@/components/common/CrmDatePicker';
import type {
  ActivityDetail,
  ActivityEntry,
  ActivityFilterOptions,
  ActivityFilters,
} from './types';

const FILTER_KEYS: (keyof ActivityFilters)[] = [
  'employee_id',
  'client',
  'action',
  'category',
  'record_type',
  'date_from',
  'date_to',
  'q',
];

const ACTION_STYLE: Record<string, string> = {
  create: 'bg-emerald-100 text-emerald-800',
  update: 'bg-sky-100 text-sky-800',
  delete: 'bg-red-100 text-red-800',
  security: 'bg-amber-100 text-amber-800',
};

const inputCls =
  'h-9 rounded-lg border border-slate-200 dark:border-white/12 bg-white/90 dark:bg-[#0B1320]/80 px-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#1878B8] focus:ring-2 focus:ring-sky-200/60 transition';

/** Converts the date-only inputs into an inclusive [from, to] range for the API. */
function toApiFilters(f: ActivityFilters): ActivityFilters {
  return {
    ...f,
    date_to: f.date_to ? `${f.date_to}T23:59:59` : undefined,
  };
}

export default function ActivityTab() {
  const [params, setParams] = useSearchParams();
  const filters = useMemo<ActivityFilters>(() => {
    const out: ActivityFilters = {};
    for (const key of FILTER_KEYS) {
      const value = params.get(key);
      if (value) out[key] = value;
    }
    const clientId = params.get('client_id');
    if (clientId) out.client_id = clientId;
    return out;
  }, [params]);
  const apiFilters = useMemo(() => toApiFilters(filters), [filters]);

  const [options, setOptions] = useState<ActivityFilterOptions | null>(null);
  const [items, setItems] = useState<ActivityEntry[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ActivityDetail | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    activityApi.filterOptions().then(setOptions).catch(() => setOptions(null));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    activityApi
      .list(apiFilters)
      .then((page) => {
        if (cancelled) return;
        setItems(page.items);
        setCursor(page.next_cursor);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load activity');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [apiFilters]);

  const loadMore = useCallback(async () => {
    if (!cursor) return;
    setLoading(true);
    try {
      const page = await activityApi.list(apiFilters, cursor);
      setItems((prev) => [...prev, ...page.items]);
      setCursor(page.next_cursor);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load more');
    } finally {
      setLoading(false);
    }
  }, [apiFilters, cursor]);

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key === 'client') next.delete('client_id');
    setParams(next, { replace: true });
  };

  const clearAll = () => setParams(new URLSearchParams(), { replace: true });
  const hasFilters = params.toString() !== '';

  const openDetail = async (entry: ActivityEntry) => {
    try {
      const res = await activityApi.detail(entry.id);
      setSelected(res.data);
    } catch {
      setSelected({ ...entry, old_values: null, new_values: null });
    }
  };

  const onExport = async () => {
    setExporting(true);
    try {
      await activityApi.exportCsv(apiFilters);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <section className="space-y-4" data-testid="activity-tab">
      <ActivityStats />

      <div
        className="light-glass-card rounded-xl p-3 flex flex-wrap items-end gap-2"
        role="search"
        aria-label="Activity filters"
      >
        <div className="w-44">
          <CrmSelect
            value={filters.employee_id ?? ''}
            onChange={(val) => setFilter('employee_id', val)}
            placeholder="All employees"
            options={[
              { value: '', label: 'All employees' },
              ...(options?.employees.map((emp) => ({
                value: String(emp.user_id),
                label: emp.name || emp.email || `Employee #${emp.user_id}`,
              })) ?? []),
            ]}
            size="sm"
            triggerClassName="h-9"
          />
        </div>
        <input
          aria-label="Client"
          className={`${inputCls} w-40`}
          placeholder="Client name…"
          value={filters.client ?? ''}
          onChange={(e) => setFilter('client', e.target.value)}
        />
        <div className="w-36">
          <CrmSelect
            value={filters.action ?? ''}
            onChange={(val) => setFilter('action', val)}
            placeholder="All actions"
            options={[
              { value: '', label: 'All actions' },
              ...(options?.actions ?? ['create', 'update', 'delete', 'security']).map((a) => ({
                value: a,
                label: humanize(a),
              })),
            ]}
            size="sm"
            triggerClassName="h-9"
          />
        </div>
        <div className="w-36">
          <CrmSelect
            value={filters.category ?? ''}
            onChange={(val) => setFilter('category', val)}
            placeholder="All changes"
            options={[
              { value: '', label: 'All changes' },
              ...(options?.categories ?? []).map((c) => ({
                value: c,
                label: humanize(c),
              })),
            ]}
            size="sm"
            triggerClassName="h-9"
          />
        </div>
        <div className="w-36">
          <CrmSelect
            value={filters.record_type ?? ''}
            onChange={(val) => setFilter('record_type', val)}
            placeholder="All records"
            options={[
              { value: '', label: 'All records' },
              ...(options?.record_types ?? []).map((t) => ({
                value: t,
                label: humanize(t),
              })),
            ]}
            size="sm"
            triggerClassName="h-9"
          />
        </div>
        <div className="w-36">
          <CrmDatePicker
            value={filters.date_from ?? ''}
            onChange={(val) => setFilter('date_from', val)}
            placeholder="From date"
          />
        </div>
        <div className="w-36">
          <CrmDatePicker
            value={filters.date_to ?? ''}
            onChange={(val) => setFilter('date_to', val)}
            placeholder="To date"
          />
        </div>
        <input
          aria-label="Search"
          className={`${inputCls} w-44`}
          placeholder="Search…"
          value={filters.q ?? ''}
          onChange={(e) => setFilter('q', e.target.value)}
        />
        {hasFilters && (
          <button type="button" onClick={clearAll} className={`${inputCls} flex items-center gap-1 font-semibold`}>
            <RotateCcw size={12} /> Reset
          </button>
        )}
        <button
          type="button"
          onClick={onExport}
          disabled={exporting}
          className="ml-auto h-9 rounded-lg bg-gradient-to-tr from-[#1878B8] to-[#55C4F5] px-3.5 text-xs font-bold text-white flex items-center gap-1.5 shadow-md hover:opacity-95 disabled:opacity-60"
        >
          <Download size={13} /> {exporting ? 'Exporting…' : 'Export CSV'}
        </button>
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          {error}
        </div>
      )}

      <div className="light-glass-card rounded-xl overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400 bg-slate-50/80 dark:bg-white/5">
            <tr>
              <th className="px-3 py-2">When</th>
              <th className="px-3 py-2">Employee</th>
              <th className="px-3 py-2">Action</th>
              <th className="px-3 py-2">Record</th>
              <th className="px-3 py-2">Change</th>
            </tr>
          </thead>
          <tbody>
            {items.map((entry) => (
              <tr
                key={entry.id}
                data-testid="activity-row"
                tabIndex={0}
                onClick={() => openDetail(entry)}
                onKeyDown={(e) => e.key === 'Enter' && openDetail(entry)}
                className="cursor-pointer border-t border-slate-100/80 dark:border-white/5 hover:bg-sky-50/60 dark:hover:bg-white/5 transition-colors"
              >
                <td className="whitespace-nowrap px-3 py-2 text-slate-600 dark:text-slate-300 font-medium">{new Date(entry.occurred_at).toLocaleString()}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#1878B8] to-[#55C4F5] text-white text-[11px] font-black flex items-center justify-center shrink-0">
                      {actorLabel(entry).charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 dark:text-white truncate">{actorLabel(entry)}</div>
                      <div className="text-[10px] text-slate-500 truncate">
                        {[entry.actor.role?.replace(/_/g, ' '), entry.actor.ip_address].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${ACTION_STYLE[entry.source === 'security' ? 'security' : entry.action] ?? ''}`}>
                    {entry.source === 'security' ? 'security' : entry.action}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <div className="font-semibold">{entry.record.label || `#${entry.record.id ?? '?'}`}</div>
                  <div className="text-[10px] text-slate-500">
                    {humanize(entry.record.type)}
                    {entry.record.deleted && (
                      <span className="ml-1 rounded bg-red-100 px-1 font-bold text-red-700">Deleted</span>
                    )}
                  </div>
                </td>
                <td className="max-w-xs truncate px-3 py-2" title={summarize(entry)}>
                  {summarize(entry)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && items.length === 0 && !error && (
          <div className="p-8 text-center text-xs text-slate-500">No activity matches these filters.</div>
        )}
        {loading && <div className="p-4 text-center text-xs text-slate-500">Loading…</div>}
      </div>

      {cursor && !loading && (
        <div className="text-center">
          <button type="button" onClick={loadMore} className={`${inputCls} px-4 font-semibold`}>
            Load more
          </button>
        </div>
      )}

      {selected && (
        <>
        <div
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-[2px]"
          onClick={() => setSelected(null)}
          aria-hidden="true"
        />
        <aside
          role="dialog"
          aria-label="Activity details"
          className="fixed inset-y-0 right-0 z-50 w-full max-w-md overflow-y-auto border-l border-white/85 bg-white/95 p-5 shadow-[0_20px_50px_rgba(15,23,42,0.25)] backdrop-blur-2xl dark:bg-[#0B1320]/95 dark:border-white/10"
        >
          <div className="mb-4 flex items-start justify-between gap-2 border-b border-slate-100 dark:border-white/10 pb-3">
            <div>
              <span className="text-[9.5px] font-extrabold uppercase tracking-[0.2em] text-[#1878B8]">
                {humanize(selected.record.type)}
              </span>
              <h2 className="text-base font-black tracking-tight text-slate-900 dark:text-white">
                {selected.record.label || humanize(selected.action)}
              </h2>
              <p className="text-[11px] text-slate-500">
                {humanize(selected.action)} by {actorLabel(selected)} · {new Date(selected.occurred_at).toLocaleString()}
              </p>
            </div>
            <button
              type="button"
              aria-label="Close details"
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"
              onClick={() => setSelected(null)}
            >
              <X size={16} />
            </button>
          </div>
          <div className="mb-3 flex flex-wrap gap-2 text-[11px]">
            {selected.record.client_id && (
              <button
                type="button"
                className="rounded-lg border border-slate-200 dark:border-white/12 bg-white/80 dark:bg-white/5 px-2.5 py-1.5 font-bold text-slate-700 dark:text-slate-200 hover:border-sky-400"
                onClick={() => {
                  const next = new URLSearchParams();
                  next.set('client_id', String(selected.record.client_id));
                  setParams(next, { replace: true });
                  setSelected(null);
                }}
              >
                All activity for this client
              </button>
            )}
            {selected.actor.user_id && (
              <button
                type="button"
                className="rounded-lg border border-slate-200 dark:border-white/12 bg-white/80 dark:bg-white/5 px-2.5 py-1.5 font-bold text-slate-700 dark:text-slate-200 hover:border-sky-400"
                onClick={() => {
                  setFilter('employee_id', String(selected.actor.user_id));
                  setSelected(null);
                }}
              >
                All activity by this employee
              </button>
            )}
          </div>
          <table className="w-full text-[11px]">
            <thead className="text-left uppercase text-slate-500">
              <tr>
                <th className="py-1">Field</th>
                <th className="py-1">Before</th>
                <th className="py-1">After</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(
                selected.changes ??
                  Object.fromEntries(
                    Object.keys({ ...selected.old_values, ...selected.new_values }).map((k) => [
                      k,
                      { old: selected.old_values?.[k], new: selected.new_values?.[k] },
                    ]),
                  ),
              ).map(([field, change]) => (
                <tr key={field} className="border-t border-slate-100 dark:border-white/5 align-top">
                  <td className="py-1 pr-2 font-semibold">{humanize(field)}</td>
                  <td className="py-1 pr-2 break-all text-red-700">{formatValue(change.old)}</td>
                  <td className="py-1 break-all text-emerald-700">{formatValue(change.new)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </aside>
        </>
      )}
    </section>
  );
}
