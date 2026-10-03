import React from 'react';
import { ShieldAlert, ShieldCheck, Zap, PhoneOff, Filter } from 'lucide-react';
import type { SpamShieldData } from '@/types/marketingTypes';
import { UniversalStatCard } from '@/components/common/UniversalStatCard';

interface MarketingSpamShieldKpisProps {
  data: SpamShieldData | null;
  loading?: boolean;
}

export const MarketingSpamShieldKpis: React.FC<MarketingSpamShieldKpisProps> = ({ data, loading }) => {
  if (loading || !data) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="light-glass-card dark:bg-slate-900/60 dark:border-white/10 glossy-sheen rounded-xl p-2.5 flex flex-col justify-between h-[104px]"
          >
            <div className="flex items-center justify-between">
              <div className="w-7 h-7 rounded-lg bg-slate-200/70 dark:bg-slate-800/70 animate-pulse" />
              <div className="w-10 h-4 rounded-full bg-slate-200/50 dark:bg-slate-800/50 animate-pulse" />
            </div>
            <div className="space-y-1 mt-2">
              <div className="w-12 h-6 rounded bg-slate-200/80 dark:bg-slate-800/80 animate-pulse" />
              <div className="w-16 h-3 rounded bg-slate-200/50 dark:bg-slate-800/50 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const {
    totalBlocked,
    honeypotCaught,
    speedTrapCaught,
    invalidPhoneCaught,
    spamContentCaught,
    turnstileCaught,
    timeline,
  } = data;

  const sparklineData = timeline?.map((t) => t.count) || [];
  const honeypotShare = totalBlocked > 0 ? Math.round((honeypotCaught / totalBlocked) * 100) : 0;
  const speedTrapShare = totalBlocked > 0 ? Math.round((speedTrapCaught / totalBlocked) * 100) : 0;
  const phoneShare = totalBlocked > 0 ? Math.round((invalidPhoneCaught / totalBlocked) * 100) : 0;
  const contentTurnstileTotal = spamContentCaught + turnstileCaught;
  const contentShare = totalBlocked > 0 ? Math.round((contentTurnstileTotal / totalBlocked) * 100) : 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
      {/* 1. Total Junk Blocked */}
      <UniversalStatCard
        label="Total Junk Blocked"
        value={totalBlocked.toLocaleString()}
        icon={ShieldAlert}
        iconGradient="from-rose-500 to-rose-600"
        color="#e11d48"
        hoverBorderColor="hover:border-rose-400"
        blurColor="bg-rose-500/15 group-hover:bg-rose-500/25"
        deltaLabel="100% Tarpitted"
        footnoteLeft="Zero CRM Pollution"
        footnoteRight="Silent Drop"
        stageLabel="Automated Bot Defense Tarpit"
        thisPeriodText={`${totalBlocked.toLocaleString()} blocked`}
        sharePct={100}
        shareLabel="Shield Coverage"
        sparklineData={sparklineData}
      />

      {/* 2. Honeypot Decoys */}
      <UniversalStatCard
        label="Honeypot Decoys"
        value={honeypotCaught.toLocaleString()}
        icon={ShieldAlert}
        iconGradient="from-amber-500 to-amber-600"
        color="#d97706"
        hoverBorderColor="hover:border-amber-400"
        blurColor="bg-amber-500/15 group-hover:bg-amber-500/25"
        deltaLabel={`${honeypotShare}% share`}
        footnoteLeft="Hidden Form Fields"
        footnoteRight="Decoys"
        stageLabel="Invisible Fax & Web Decoys"
        thisPeriodText={`${honeypotCaught.toLocaleString()} caught`}
        sharePct={honeypotShare}
        shareLabel="Bot Share"
      />

      {/* 3. Speed Traps (<2.5s) */}
      <UniversalStatCard
        label="Speed Trap Catch"
        value={speedTrapCaught.toLocaleString()}
        icon={Zap}
        iconGradient="from-sky-500 to-sky-600"
        color="#0284c7"
        hoverBorderColor="hover:border-sky-400"
        blurColor="bg-sky-500/15 group-hover:bg-sky-500/25"
        deltaLabel={`${speedTrapShare}% share`}
        footnoteLeft="< 2.5s Submissions"
        footnoteRight="Headless"
        stageLabel="Sub-2.5s Script Submissions"
        thisPeriodText={`${speedTrapCaught.toLocaleString()} caught`}
        sharePct={speedTrapShare}
        shareLabel="Speed Share"
      />

      {/* 4. Invalid NANP Phones */}
      <UniversalStatCard
        label="Invalid Area Codes"
        value={invalidPhoneCaught.toLocaleString()}
        icon={PhoneOff}
        iconGradient="from-indigo-500 to-indigo-600"
        color="#4f46e5"
        hoverBorderColor="hover:border-indigo-400"
        blurColor="bg-indigo-500/15 group-hover:bg-indigo-500/25"
        deltaLabel={`${phoneShare}% share`}
        footnoteLeft="Impossible Numbers"
        footnoteRight="Fake Area"
        stageLabel="Fake North American Area Codes"
        thisPeriodText={`${invalidPhoneCaught.toLocaleString()} caught`}
        sharePct={phoneShare}
        shareLabel="Phone Share"
      />

      {/* 5. Turnstile & Content Filters */}
      <UniversalStatCard
        label="Turnstile & Content"
        value={contentTurnstileTotal.toLocaleString()}
        icon={Filter}
        iconGradient="from-emerald-500 to-emerald-600"
        color="#059669"
        hoverBorderColor="hover:border-emerald-400"
        blurColor="bg-emerald-500/15 group-hover:bg-emerald-500/25"
        deltaLabel={`${contentShare}% share`}
        footnoteLeft="Cold B2B & Captcha"
        footnoteRight="Verified"
        stageLabel="Turnstile Failures & B2B Pitch Words"
        thisPeriodText={`${contentTurnstileTotal.toLocaleString()} caught`}
        sharePct={contentShare}
        shareLabel="Content Share"
      />
    </div>
  );
};
