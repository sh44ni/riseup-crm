import React from 'react';
import { PhoneCall, PhoneForwarded, MousePointerClick, Clock } from 'lucide-react';
import type { CallsByPageItem, HourlyCountItem, TopButtonItem } from '@/types/marketingTypes';

interface MarketingCallsCardProps {
  totalCalls: number;
  callConversionRate: number;
  callsByPage: CallsByPageItem[];
  callsByHour: HourlyCountItem[];
  topButtons: TopButtonItem[];
}

export const MarketingCallsCard: React.FC<MarketingCallsCardProps> = ({
  totalCalls,
  callConversionRate,
  callsByPage,
  callsByHour,
  topButtons,
}) => {
  let peakHourStr = 'No calls recorded';
  if (totalCalls > 0 && callsByHour && callsByHour.length > 0) {
    const sorted = [...callsByHour].sort((a, b) => b.count - a.count);
    if (sorted[0] && sorted[0].count > 0) {
      const topH = sorted[0].hour;
      const ampm = topH >= 12 ? 'PM' : 'AM';
      const displayH = topH % 12 === 0 ? 12 : topH % 12;
      peakHourStr = `${displayH}:00 ${ampm} (${sorted[0].count} call${sorted[0].count > 1 ? 's' : ''})`;
    }
  }

  const ctaButtons = topButtons.filter((b) => {
    const l = b.label.toLowerCase();
    return (
      l.includes('call') ||
      l.includes('estimate') ||
      l.includes('quote') ||
      l.includes('contact') ||
      l.includes('phone') ||
      l.includes('858')
    );
  });
  const displayButtons = ctaButtons.length > 0 ? ctaButtons.slice(0, 5) : topButtons.slice(0, 5);

  return (
    <div className="light-glass-panel dark:bg-slate-900/60 rounded-2xl border border-white/85 dark:border-white/10 shadow-sm backdrop-blur-2xl p-4 md:p-5 flex flex-col justify-between select-none">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#059669] to-[#34d399] flex items-center justify-center text-white shadow-xs">
              <PhoneCall size={14} className="stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
                Phone Calls & High-Intent Dials
              </h3>
              <p className="text-[10.5px] text-slate-500 dark:text-slate-400">Direct phone links & call now telemetry</p>
            </div>
          </div>
          <span className="text-[10.5px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50/90 dark:bg-emerald-950/60 border border-emerald-200/90 dark:border-emerald-800/60 px-2 py-0.5 rounded-full shadow-2xs">
            {callConversionRate}% Conv
          </span>
        </div>

        {/* Quick Metric Strip */}
        <div className="grid grid-cols-2 gap-2.5 mb-4">
          <div className="p-2.5 rounded-xl bg-white/60 dark:bg-slate-800/60 border border-slate-200/60 dark:border-white/10 shadow-2xs">
            <span className="text-[9.5px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Inbound Phone Taps
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                {totalCalls.toLocaleString()}
              </span>
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">dials</span>
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-white/60 dark:bg-slate-800/60 border border-slate-200/60 dark:border-white/10 shadow-2xs">
            <span className="text-[9.5px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Peak Calling Time
            </span>
            <div className="flex items-center gap-1.5 mt-1 text-slate-900 dark:text-white font-bold text-xs">
              <Clock size={13} className="text-emerald-600 dark:text-emerald-400" />
              <span>{peakHourStr}</span>
            </div>
          </div>
        </div>

        {/* Top Calling Origin Pages */}
        <div className="mb-4">
          <h4 className="text-[10.5px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
            <PhoneForwarded size={11} className="text-slate-400 dark:text-slate-500" />
            Calls Initiated by Page
          </h4>
          <div className="space-y-1.5">
            {callsByPage.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-500 italic py-2">No page-specific call events yet</p>
            ) : (
              callsByPage.slice(0, 4).map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between text-xs py-1 px-2.5 rounded-lg bg-white/60 dark:bg-slate-800/60 border border-emerald-200/50 dark:border-emerald-800/50"
                >
                  <span className="text-slate-800 dark:text-slate-200 font-mono font-medium truncate max-w-[200px] text-[11px]">
                    {item.page_path}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 text-[11px]">
                      {item.count}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">calls</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Top CTA Buttons Clicked */}
      <div className="border-t border-slate-200/50 dark:border-white/10 pt-3">
        <h4 className="text-[10.5px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
          <MousePointerClick size={11} className="text-slate-400 dark:text-slate-500" />
          Top CTA Buttons Clicked
        </h4>
        <div className="space-y-1">
          {displayButtons.length === 0 ? (
            <p className="text-xs text-slate-400 dark:text-slate-500 italic py-1">No button interactions recorded</p>
          ) : (
            displayButtons.map((btn, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-xs py-1 px-2 rounded-lg hover:bg-white/70 hover:dark:bg-slate-800/60 transition-colors"
              >
                <span className="text-slate-700 dark:text-slate-300 font-medium truncate max-w-[210px] text-[11px]">
                  {btn.label}
                </span>
                <span className="text-slate-900 dark:text-white font-bold font-mono bg-white/80 dark:bg-slate-800/80 border border-slate-200/70 dark:border-white/10 px-1.5 py-0.2 rounded text-[10px]">
                  {btn.count.toLocaleString()} clicks
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
