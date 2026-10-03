import React, { useState } from 'react';
import {
  ShieldAlert,
  Clock,
  Terminal,
  Globe,
  FileCode,
  X,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from 'lucide-react';
import type { SpamAttemptItem } from '@/types/marketingTypes';

interface MarketingSpamFeedProps {
  recentAttempts: SpamAttemptItem[];
  loading?: boolean;
  onRefresh?: () => void;
}

function formatTimeAgo(isoString: string): string {
  try {
    const d = new Date(isoString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);

    if (diffSec < 10) return 'Just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;

    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return 'Recently';
  }
}

const REASON_BADGES: Record<string, { label: string; badgeClass: string }> = {
  honeypot: {
    label: '🪤 Honeypot Decoy',
    badgeClass: 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700/60',
  },
  speed_trap: {
    label: '⚡ Speed Trap',
    badgeClass: 'bg-sky-100 dark:bg-sky-950/70 text-sky-800 dark:text-sky-300 border-sky-300 dark:border-sky-700/60',
  },
  invalid_phone: {
    label: '📵 Invalid Phone',
    badgeClass: 'bg-indigo-100 dark:bg-indigo-950/70 text-indigo-800 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700/60',
  },
  spam_content: {
    label: '🔍 B2B Solicitation',
    badgeClass: 'bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-700/60',
  },
  turnstile: {
    label: '🛡️ Turnstile Fail',
    badgeClass: 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700/60',
  },
};

export const MarketingSpamFeed: React.FC<MarketingSpamFeedProps> = ({
  recentAttempts,
  loading,
  onRefresh,
}) => {
  const [selectedSnapshot, setSelectedSnapshot] = useState<Record<string, any> | null>(null);
  const [filterReason, setFilterReason] = useState<string>('all');

  const filtered = recentAttempts.filter((item) => {
    if (filterReason === 'all') return true;
    return item.block_reason === filterReason;
  });

  return (
    <div className="light-glass-card dark:bg-slate-900/60 dark:border dark:border-white/10 glossy-sheen rounded-2xl p-4 shadow-sm space-y-3">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200/70 dark:border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <ShieldAlert size={15} />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
              Real-time Bot Catch Log
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Inspect caught submissions in quarantine — safe and isolated from CRM database
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {['all', 'honeypot', 'speed_trap', 'invalid_phone', 'spam_content', 'turnstile'].map((key) => {
            const active = filterReason === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setFilterReason(key)}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                  active
                    ? 'bg-slate-800 dark:bg-white text-white dark:text-slate-900 shadow-2xs'
                    : 'bg-white/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700'
                }`}
              >
                {key === 'all' ? 'All Catches' : key.replace('_', ' ')}
              </button>
            );
          })}
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="p-1 rounded-lg bg-white/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-colors"
              title="Refresh log"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            </button>
          )}
        </div>
      </div>

      {/* Attempts List */}
      <div className="divide-y divide-slate-100 dark:divide-white/5 overflow-y-auto max-h-[380px] no-scrollbar pr-1">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs font-medium space-y-1">
            <ShieldAlert size={20} className="mx-auto text-slate-300 dark:text-slate-600" />
            <div>No bot attacks recorded under this filter</div>
          </div>
        ) : (
          filtered.map((item) => {
            const badge = REASON_BADGES[item.block_reason] || {
              label: item.block_reason,
              badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
            };

            return (
              <div
                key={item.id}
                className="py-2.5 px-2 hover:bg-white/60 dark:hover:bg-slate-800/40 rounded-xl transition-colors flex items-start justify-between gap-3 text-xs"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${badge.badgeClass}`}
                    >
                      {badge.label}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/5 text-[9.5px] font-bold text-slate-600 dark:text-slate-400 uppercase">
                      {item.form_type || 'form'}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                      {formatTimeAgo(item.submitted_at)}
                    </span>
                  </div>

                  <div className="font-mono text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">
                    {item.block_detail || 'Blocked by security policy'}
                  </div>

                  <div className="flex items-center gap-3 text-[10px] text-slate-400 dark:text-slate-500">
                    {item.ip_address && (
                      <span className="font-mono flex items-center gap-1">
                        <Terminal size={10} />
                        <span>IP: {item.ip_address}</span>
                      </span>
                    )}
                    {item.page_referer && (
                      <span className="truncate max-w-[200px] flex items-center gap-1">
                        <Globe size={10} />
                        <span>{item.page_referer}</span>
                      </span>
                    )}
                  </div>
                </div>

                {item.payload_snapshot && (
                  <button
                    type="button"
                    onClick={() => setSelectedSnapshot(item.payload_snapshot || null)}
                    className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-bold shrink-0 transition-colors flex items-center gap-1 cursor-pointer"
                    title="Inspect intercepted payload snapshot"
                  >
                    <FileCode size={11} />
                    <span>Payload</span>
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Snapshot Modal */}
      {selectedSnapshot && (
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setSelectedSnapshot(null)}
        >
          <div
            className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-2xl p-5 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2">
                <FileCode size={15} className="text-[#1878B8]" />
                <h4 className="text-sm font-black text-slate-900 dark:text-white">
                  Quarantined Bot Payload Snapshot
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSnapshot(null)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X size={15} />
              </button>
            </div>

            <p className="text-[11px] text-slate-500">
              This data was intercepted and quarantined. It was never written to the leads table or client database.
            </p>

            <pre className="p-3 rounded-xl bg-slate-950 text-emerald-400 font-mono text-xs overflow-x-auto max-h-[300px] no-scrollbar">
              {JSON.stringify(selectedSnapshot, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
