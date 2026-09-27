import React from 'react';
import { FileText, ExternalLink } from 'lucide-react';
import type { TopPageItem } from '@/types/marketingTypes';

interface MarketingPagesTableProps {
  topPages: TopPageItem[];
  totalPageviews: number;
}

export const MarketingPagesTable: React.FC<MarketingPagesTableProps> = ({
  topPages,
  totalPageviews,
}) => {
  return (
    <div className="light-glass-panel dark:bg-slate-900/60 rounded-2xl border border-white/85 dark:border-white/10 shadow-sm backdrop-blur-2xl p-4 md:p-5 select-none flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#1878B8] to-[#55C4F5] flex items-center justify-center text-white shadow-xs">
              <FileText size={14} className="stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
                Top Visited Website Pages
              </h3>
              <p className="text-[10.5px] text-slate-500 dark:text-slate-400">Highest performing landing & service pages</p>
            </div>
          </div>
          <span className="text-[10.5px] font-bold text-slate-600 dark:text-slate-400 bg-white/70 dark:bg-slate-800/70 border border-slate-200/70 dark:border-white/10 px-2 py-0.5 rounded-full">
            {topPages.length} Pages Active
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/60 dark:border-white/10 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                <th className="pb-2.5 pl-1.5 w-8">#</th>
                <th className="pb-2.5">Page Path</th>
                <th className="pb-2.5 text-right">Views</th>
                <th className="pb-2.5 pl-5 pr-3">Traffic Share</th>
                <th className="pb-2.5 text-right">Unique</th>
                <th className="pb-2.5 text-right pr-1">Views/Sess</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/40 dark:divide-white/5 text-xs">
              {topPages.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 dark:text-slate-500 font-medium">
                    No pageview records found in this timeframe
                  </td>
                </tr>
              ) : (
                topPages.map((page, idx) => {
                  const sharePct =
                    totalPageviews > 0
                      ? Math.round((page.views / totalPageviews) * 100)
                      : 0;
                  const viewsPerSession =
                    page.sessions > 0
                      ? (page.views / page.sessions).toFixed(1)
                      : '1.0';

                  return (
                    <tr
                      key={idx}
                      className="hover:bg-white/60 hover:dark:bg-slate-800/40 transition-colors group"
                    >
                      <td className="py-2.5 pl-1.5 text-slate-400 dark:text-slate-500 font-mono font-bold text-[10.5px]">
                        {idx + 1}
                      </td>
                      <td className="py-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-medium text-slate-800 dark:text-slate-200 text-[11px] bg-white/60 dark:bg-slate-800/60 px-1.5 py-0.2 rounded border border-slate-200/60 dark:border-white/10 group-hover:border-sky-300 dark:group-hover:border-sky-500 transition-colors">
                            {page.page_path}
                          </span>
                          <a
                            href={`https://riseuprac.com${page.page_path}`}
                            target="_blank"
                            rel="noreferrer"
                            className="opacity-0 group-hover:opacity-100 text-sky-600 dark:text-sky-400 hover:text-sky-800 hover:dark:text-sky-300 transition-opacity p-0.5"
                            title="Open on live site"
                          >
                            <ExternalLink size={11} />
                          </a>
                        </div>
                      </td>
                      <td className="py-2.5 text-right font-mono font-bold text-slate-900 dark:text-white text-[11px]">
                        {page.views.toLocaleString()}
                      </td>
                      <td className="py-2.5 pl-5 pr-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 bg-slate-200/50 dark:bg-slate-700/50 rounded-full overflow-hidden shrink-0">
                            <div
                              className="h-full bg-gradient-to-r from-[#1878B8] to-[#55C4F5] rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(100, sharePct)}%` }}
                            />
                          </div>
                          <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                            {sharePct}%
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 text-right font-mono text-slate-700 dark:text-slate-300 text-[11px]">
                        {page.sessions.toLocaleString()}
                      </td>
                      <td className="py-2.5 text-right pr-1 font-mono text-slate-500 dark:text-slate-400 text-[11px]">
                        {viewsPerSession}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
