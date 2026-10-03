import React from 'react';
import { Shield, Globe, Terminal, Layers } from 'lucide-react';
import type { SpamBlockReasonItem, SpamFormTypeItem, SpamTopIpItem } from '@/types/marketingTypes';

interface MarketingSpamBreakdownProps {
  reasons: SpamBlockReasonItem[];
  formTypes: SpamFormTypeItem[];
  topIps: SpamTopIpItem[];
  totalBlocked: number;
}

const REASON_METADATA: Record<string, { label: string; color: string; desc: string }> = {
  honeypot: {
    label: '🪤 Honeypot Decoys',
    color: 'bg-amber-500',
    desc: 'Filled invisible business fax or company website fields',
  },
  speed_trap: {
    label: '⚡ Speed Trap (<2.5s)',
    color: 'bg-sky-500',
    desc: 'Submitted form faster than humanly possible',
  },
  invalid_phone: {
    label: '📵 Invalid Phone / Area Code',
    color: 'bg-indigo-500',
    desc: 'Impossible NANP area codes or dummy sequences',
  },
  spam_content: {
    label: '🔍 B2B Spam & Link Patterns',
    color: 'bg-rose-500',
    desc: 'Cold sales pitches, SEO backlinks, Zoom call keywords',
  },
  turnstile: {
    label: '🛡️ Cloudflare Turnstile',
    color: 'bg-emerald-500',
    desc: 'Failed or missing managed challenge token',
  },
};

export const MarketingSpamBreakdown: React.FC<MarketingSpamBreakdownProps> = ({
  reasons,
  formTypes,
  topIps,
  totalBlocked,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
      {/* 1. Attack Vectors / Reason Breakdown Card */}
      <div className="light-glass-card dark:bg-slate-900/60 dark:border dark:border-white/10 glossy-sheen rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200/70 dark:border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-sky-500/10 text-[#1878B8] dark:text-sky-400 flex items-center justify-center">
              <Shield size={15} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
                Defense Vectors Breakdown
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Distribution of which shield layer caught the bot
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-slate-400">
            {reasons.length} Active Filters
          </span>
        </div>

        <div className="space-y-3 pt-1">
          {reasons.length === 0 ? (
            <div className="py-6 text-center text-slate-400 text-xs font-medium">
              No blocked attempts in this window
            </div>
          ) : (
            reasons.map((r) => {
              const meta = REASON_METADATA[r.reason] || {
                label: r.reason,
                color: 'bg-slate-500',
                desc: 'Shield trigger',
              };
              return (
                <div key={r.reason} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                      <span>{meta.label}</span>
                    </span>
                    <span className="font-mono font-extrabold text-slate-700 dark:text-slate-300">
                      {r.count.toLocaleString()} <span className="text-[10px] text-slate-400">({r.pct}%)</span>
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-white/5 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${meta.color} transition-all duration-500`}
                      style={{ width: `${Math.max(r.pct, 2)}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500">
                    {meta.desc}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 2. Targeted Forms & Top Offending IPs */}
      <div className="space-y-2.5 flex flex-col justify-between">
        {/* Form Types Card */}
        <div className="light-glass-card dark:bg-slate-900/60 dark:border dark:border-white/10 glossy-sheen rounded-2xl p-4 shadow-sm space-y-2.5">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-200/70 dark:border-white/10">
            <div className="w-6 h-6 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Layers size={13} />
            </div>
            <h4 className="text-xs font-extrabold text-slate-800 dark:text-white">
              Targeted Website Entrypoints
            </h4>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {formTypes.map((ft) => (
              <div
                key={ft.form_type}
                className="p-2.5 rounded-xl bg-white/60 dark:bg-slate-800/40 border border-slate-200/60 dark:border-white/5 space-y-0.5"
              >
                <div className="text-[10px] uppercase font-bold text-slate-400 truncate">
                  {ft.form_type}
                </div>
                <div className="text-base font-black text-slate-800 dark:text-white">
                  {ft.count.toLocaleString()}
                </div>
                <div className="text-[9.5px] text-slate-500">
                  {totalBlocked > 0 ? `${Math.round((ft.count / totalBlocked) * 100)}% of attacks` : '0%'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Offender IPs Card */}
        <div className="light-glass-card dark:bg-slate-900/60 dark:border dark:border-white/10 glossy-sheen rounded-2xl p-4 shadow-sm space-y-2.5 flex-1">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/70 dark:border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <Terminal size={13} />
              </div>
              <h4 className="text-xs font-extrabold text-slate-800 dark:text-white">
                Top Offending Bot Subnets
              </h4>
            </div>
            <span className="text-[10px] text-slate-400 font-bold">100% Shielded</span>
          </div>

          <div className="space-y-1.5 overflow-y-auto max-h-[140px] no-scrollbar pr-1">
            {topIps.length === 0 ? (
              <div className="py-4 text-center text-slate-400 text-xs">
                No repeat offending IPs detected
              </div>
            ) : (
              topIps.map((item, idx) => (
                <div
                  key={item.ip}
                  className="flex items-center justify-between py-1 px-2 rounded-lg bg-white/40 dark:bg-slate-800/30 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-[10px] text-slate-400 w-4">
                      #{idx + 1}
                    </span>
                    <span className="font-mono font-bold text-slate-700 dark:text-slate-300 truncate">
                      {item.ip}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 text-[10px] font-black border border-rose-200/60 dark:border-rose-900/50 shrink-0">
                    {item.count} attacks
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
