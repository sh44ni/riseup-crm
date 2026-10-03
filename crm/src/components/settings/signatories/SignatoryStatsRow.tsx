import React from 'react';
import { Building2, CheckCircle2, Clock, Users } from 'lucide-react';

interface SignatoryStatsRowProps {
  signatoriesCount: number;
  configuredCount: number;
}

export function SignatoryStatsRow({
  signatoriesCount,
  configuredCount,
}: SignatoryStatsRowProps) {
  const pendingCount = Math.max(0, signatoriesCount - configuredCount);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      <div className="bg-white dark:bg-slate-900/60 border border-slate-200/90 dark:border-white/10 rounded-2xl p-4 shadow-2xs backdrop-blur-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Authorized Signatories
          </span>
          <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/60 flex items-center justify-center text-purple-700 dark:text-purple-300">
            <Users size={16} />
          </div>
        </div>
        <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
          {signatoriesCount}
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
          Active staff with Signatory Authority
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900/60 border border-slate-200/90 dark:border-white/10 rounded-2xl p-4 shadow-2xs backdrop-blur-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Signatures Ready
          </span>
          <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 size={16} />
          </div>
        </div>
        <div className="mt-2 text-2xl font-black text-emerald-700 dark:text-emerald-400">
          {configuredCount}
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
          Fully configured for counter-signing
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900/60 border border-slate-200/90 dark:border-white/10 rounded-2xl p-4 shadow-2xs backdrop-blur-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            Pending Setup
          </span>
          <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center text-amber-700 dark:text-amber-300">
            <Clock size={16} />
          </div>
        </div>
        <div className="mt-2 text-2xl font-black text-amber-600 dark:text-amber-400">
          {pendingCount}
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
          Require signature configuration
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900/60 border border-slate-200/90 dark:border-white/10 rounded-2xl p-4 shadow-2xs backdrop-blur-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
            CSLB Licensure
          </span>
          <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800/60 flex items-center justify-center text-sky-700 dark:text-sky-300">
            <Building2 size={16} />
          </div>
        </div>
        <div className="mt-2 text-base font-black text-slate-900 dark:text-white">
          Lic #1096492
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
          B / C39 / C46 Classifications
        </p>
      </div>
    </div>
  );
}
