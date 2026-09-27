import React, { useState } from 'react';
import { ClipboardCheck, ExternalLink, ShieldCheck, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { DevelopmentInProgressBanner } from '@/components/common/DevelopmentInProgressBanner';
import { CrmPageHero } from '@/components/common/CrmPageHero';

export function InspectionsPage() {
  const [search, setSearch] = useState('');
  const INSPECTIONS = [
    { id: 'INSP-2041', homeowner: 'David Kim', address: '1420 Twin Oaks Valley, San Marcos', score: 62, urgent: true, inspector: 'Dave M.', date: 'Mar 13, 2026' },
    { id: 'INSP-2040', homeowner: 'Elena Rostova', address: '812 Mission Ave, Oceanside', score: 84, urgent: false, inspector: 'Carlos M.', date: 'Mar 12, 2026' },
    { id: 'INSP-2039', homeowner: 'Arthur Pendelton', address: '3340 Lake Blvd, Oceanside', score: 48, urgent: true, inspector: 'Dave M.', date: 'Mar 11, 2026' },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto select-none pb-16">
      <CrmPageHero
        pageId="inspections"
        defaultEyebrow="Field Diagnostics & Quality"
        defaultTitle="Field Roof Inspections"
        defaultSubtitle="21-point digital roof health assessments, condition grades, and homeowner diagnostic reports"
        searchValue={search}
        onSearchChange={setSearch}
        onSearchClear={() => setSearch('')}
        searchPlaceholder="Search inspection reports, inspectors, addresses..."
        bottomRightBadges={
          <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-700">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>3 Completed Today</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs">
              <span>2 Urgent Actions</span>
            </span>
          </div>
        }
      />

      <DevelopmentInProgressBanner
        moduleName="21-Point Roof Health Inspections"
        expectedVersion="v3.2 Quality Sprint"
        description="This field inspection module is currently undergoing active engineering. Drone photo AI analysis, customer PDF report dispatch, and storm condition scoring are arriving shortly."
      />

      <div className="light-glass-panel border border-white/80 dark:border-white/10 rounded-3xl overflow-hidden shadow-xl">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50/90 dark:bg-slate-900/80 border-b border-slate-200/80 dark:border-white/10 text-slate-500 dark:text-slate-400 font-bold">
            <tr>
              <th className="px-6 py-3.5">Report #</th>
              <th className="px-6 py-3.5">Homeowner & Property</th>
              <th className="px-6 py-3.5">Roof Health Score</th>
              <th className="px-6 py-3.5">Urgency</th>
              <th className="px-6 py-3.5">Inspector</th>
              <th className="px-6 py-3.5 text-right">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {INSPECTIONS.map((insp) => (
              <tr key={insp.id} className="hover:bg-slate-50/80 dark:hover:bg-white/5 transition-colors">
                <td className="px-6 py-4 font-bold text-[#0284C7] dark:text-sky-400">{insp.id}</td>
                <td className="px-6 py-4">
                  <div className="font-semibold text-slate-900 dark:text-white">{insp.homeowner}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">{insp.address}</div>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`font-black text-xs px-2.5 py-1 rounded-full ${
                      insp.score >= 80
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30'
                        : insp.score >= 60
                        ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30'
                        : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60'
                    }`}
                  >
                    {insp.score} / 100
                  </span>
                </td>
                <td className="px-6 py-4">
                  {insp.urgent ? (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400">
                      <AlertTriangle size={13} />
                      <span>Urgent Replacement</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 size={13} />
                      <span>Maintenance OK</span>
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{insp.inspector}</td>
                <td className="px-6 py-4 text-right text-slate-400 dark:text-slate-500 text-[11px]">{insp.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
