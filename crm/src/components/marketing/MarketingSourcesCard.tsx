import React from 'react';
import { Compass, Smartphone, Monitor, Tablet, Globe } from 'lucide-react';
import type { UtmSourceItem, ReferrerCountItem, DeviceCountItem } from '@/types/marketingTypes';

interface MarketingSourcesCardProps {
  sources: UtmSourceItem[];
  referrers: ReferrerCountItem[];
  devices: DeviceCountItem[];
  totalSessions: number;
}

export const MarketingSourcesCard: React.FC<MarketingSourcesCardProps> = ({
  sources,
  referrers,
  devices,
  totalSessions,
}) => {
  const deviceMap = devices.reduce(
    (acc, d) => {
      acc[d.device_type.toLowerCase()] = d.count;
      return acc;
    },
    {} as Record<string, number>
  );

  const desktopCount = deviceMap['desktop'] || 0;
  const mobileCount = deviceMap['mobile'] || 0;
  const tabletCount = deviceMap['tablet'] || 0;
  const totalDev = desktopCount + mobileCount + tabletCount || 1;

  const desktopPct = Math.round((desktopCount / totalDev) * 100);
  const mobilePct = Math.round((mobileCount / totalDev) * 100);
  const tabletPct = Math.round((tabletCount / totalDev) * 100);

  const channelColors: Record<string, { bar: string; text: string; bg: string }> = {
    organic: { bar: 'bg-[#059669]', text: 'text-emerald-800 dark:text-emerald-300', bg: 'bg-emerald-50/90 dark:bg-emerald-950/60 border-emerald-200/90 dark:border-emerald-800/60' },
    direct: { bar: 'bg-[#1878B8]', text: 'text-sky-800 dark:text-sky-300', bg: 'bg-sky-50/90 dark:bg-sky-950/60 border-sky-200/90 dark:border-sky-800/60' },
    google: { bar: 'bg-[#0284C7]', text: 'text-blue-800 dark:text-blue-300', bg: 'bg-blue-50/90 dark:bg-blue-950/60 border-blue-200/90 dark:border-blue-800/60' },
    facebook: { bar: 'bg-[#6366f1]', text: 'text-indigo-800 dark:text-indigo-300', bg: 'bg-indigo-50/90 dark:bg-indigo-950/60 border-indigo-200/90 dark:border-indigo-800/60' },
    instagram: { bar: 'bg-[#e11d48]', text: 'text-rose-800 dark:text-rose-300', bg: 'bg-rose-50/90 dark:bg-rose-950/60 border-rose-200/90 dark:border-rose-800/60' },
    yelp: { bar: 'bg-[#d97706]', text: 'text-amber-800 dark:text-amber-300', bg: 'bg-amber-50/90 dark:bg-amber-950/60 border-amber-200/90 dark:border-amber-800/60' },
    social: { bar: 'bg-[#ec4899]', text: 'text-pink-800 dark:text-pink-300', bg: 'bg-pink-50/90 dark:bg-pink-950/60 border-pink-200/90 dark:border-pink-800/60' },
    vercel: { bar: 'bg-[#334155]', text: 'text-slate-800 dark:text-slate-200', bg: 'bg-slate-100/90 dark:bg-slate-800/80 border-slate-200/90 dark:border-white/10' },
    clickup: { bar: 'bg-[#7c3aed]', text: 'text-purple-800 dark:text-purple-300', bg: 'bg-purple-50/90 dark:bg-purple-950/60 border-purple-200/90 dark:border-purple-800/60' },
    referral: { bar: 'bg-[#0891b2]', text: 'text-cyan-800 dark:text-cyan-300', bg: 'bg-cyan-50/90 dark:bg-cyan-950/60 border-cyan-200/90 dark:border-cyan-800/60' },
  };

  return (
    <div className="light-glass-panel dark:bg-slate-900/60 rounded-2xl border border-white/85 dark:border-white/10 shadow-sm backdrop-blur-2xl p-4 md:p-5 flex flex-col justify-between select-none">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#d97706] to-[#fbbf24] flex items-center justify-center text-white shadow-xs">
              <Compass size={14} className="stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
                Traffic Sources & Channels
              </h3>
              <p className="text-[10.5px] text-slate-500 dark:text-slate-400">Inbound marketing origin breakdown</p>
            </div>
          </div>
          <span className="text-[10.5px] font-bold text-slate-600 dark:text-slate-400 bg-white/70 dark:bg-slate-800/70 border border-slate-200/70 dark:border-white/10 px-2 py-0.5 rounded-full">
            {sources.length} Channels
          </span>
        </div>

        {/* Traffic Channels Breakdown */}
        <div className="space-y-3 mb-5">
          {sources.length === 0 ? (
            <div className="text-center py-6 text-slate-400 dark:text-slate-500 text-xs font-medium">
              No channel data recorded
            </div>
          ) : (
            sources.slice(0, 5).map((item, idx) => {
              const srcKey = item.utm_source.toLowerCase();
              const styling = channelColors[srcKey] || {
                bar: 'bg-slate-500',
                text: 'text-slate-700 dark:text-slate-300',
                bg: 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-white/10',
              };
              const pct = totalSessions > 0 ? Math.min(100, Math.round((item.count / totalSessions) * 100)) : 0;

              return (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border shadow-2xs ${styling.bg} ${styling.text}`}>
                      {item.utm_source}
                    </span>
                    <div className="flex items-center gap-1.5 font-mono text-[11px]">
                      <span className="text-slate-900 dark:text-white font-bold">{item.count.toLocaleString()}</span>
                      <span className="text-slate-400 dark:text-slate-500">({pct}%)</span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200/50 dark:bg-slate-700/50 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${styling.bar} transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Top Referrers */}
        <div className="border-t border-slate-200/50 dark:border-white/10 pt-3.5 mb-4">
          <h4 className="text-[10.5px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
            <Globe size={11} className="text-slate-400 dark:text-slate-500" />
            Top Referring Domains
          </h4>
          <div className="space-y-1.5">
            {referrers.slice(0, 4).map((ref, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-xs py-1 px-2.5 rounded-lg bg-white/60 dark:bg-slate-800/60 border border-slate-200/60 dark:border-white/10"
              >
                <span className="text-slate-700 dark:text-slate-300 font-medium truncate max-w-[190px]">
                  {ref.referrer}
                </span>
                <span className="text-slate-900 dark:text-white font-bold font-mono text-[11px]">
                  {ref.count.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Device Split Bar */}
      <div className="border-t border-slate-200/50 dark:border-white/10 pt-3">
        <h4 className="text-[10.5px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
          Device Distribution
        </h4>
        <div className="w-full h-2 rounded-full overflow-hidden flex bg-slate-200/50 dark:bg-slate-700/50 gap-0.5 mb-2">
          <div style={{ width: `${desktopPct}%` }} className="bg-[#1878B8] h-full" title={`Desktop: ${desktopPct}%`} />
          <div style={{ width: `${mobilePct}%` }} className="bg-[#059669] h-full" title={`Mobile: ${mobilePct}%`} />
          <div style={{ width: `${tabletPct}%` }} className="bg-[#d97706] h-full" title={`Tablet: ${tabletPct}%`} />
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="p-1.5 rounded-lg bg-white/60 dark:bg-slate-800/60 border border-slate-200/60 dark:border-white/10">
            <div className="flex items-center justify-center gap-1 text-sky-800 dark:text-sky-300 font-bold text-[10px]">
              <Monitor size={10} /> Desktop
            </div>
            <div className="text-xs font-black text-slate-900 dark:text-white font-mono mt-0.5">{desktopPct}%</div>
          </div>
          <div className="p-1.5 rounded-lg bg-white/60 dark:bg-slate-800/60 border border-slate-200/60 dark:border-white/10">
            <div className="flex items-center justify-center gap-1 text-emerald-800 dark:text-emerald-300 font-bold text-[10px]">
              <Smartphone size={10} /> Mobile
            </div>
            <div className="text-xs font-black text-slate-900 dark:text-white font-mono mt-0.5">{mobilePct}%</div>
          </div>
          <div className="p-1.5 rounded-lg bg-white/60 dark:bg-slate-800/60 border border-slate-200/60 dark:border-white/10">
            <div className="flex items-center justify-center gap-1 text-amber-800 dark:text-amber-300 font-bold text-[10px]">
              <Tablet size={10} /> Tablet
            </div>
            <div className="text-xs font-black text-slate-900 dark:text-white font-mono mt-0.5">{tabletPct}%</div>
          </div>
        </div>
      </div>
    </div>
  );
};
