import React from 'react';
import { Shield, ShieldCheck, AlertOctagon, ExternalLink, ChevronRight, Award } from 'lucide-react';
import { WarrantySummary } from '@/types/client360Types';

interface ClientWarrantyCardProps {
  warranty: WarrantySummary;
  onViewAll?: () => void;
  onOpenHub?: () => void;
}

export function ClientWarrantyCard({ warranty, onViewAll, onOpenHub }: ClientWarrantyCardProps) {
  return (
    <div className="light-glass-card rounded-2xl p-5 flex flex-col justify-between">
      <div>
        {/* Header matching mockup */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-100 dark:border-teal-500/20 flex items-center justify-center text-teal-600 dark:text-teal-400">
              <Shield size={16} />
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white tracking-tight">Warranties & Health</h3>
          </div>

          <button
            onClick={onViewAll}
            className="text-xs font-semibold text-[#0284C7] dark:text-sky-400 hover:text-[#0369a1] dark:hover:text-sky-300 transition-colors flex items-center gap-0.5 cursor-pointer"
          >
            <span>View All</span>
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Certificate Display or Empty State (Exact Mockup Layout) */}
        <div className="mt-4">
          {warranty.hasCertificate && warranty.certificates.length > 0 ? (
            <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50/60 dark:from-emerald-950/40 dark:to-teal-950/30 border border-emerald-200/80 dark:border-emerald-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold">
                  <ShieldCheck size={13} className="text-emerald-700 dark:text-emerald-400" />
                  Active Certificate
                </span>
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  {warranty.certificates[0].termYears} Years
                </span>
              </div>
              <div className="font-bold text-xs text-slate-900 dark:text-white">
                {warranty.certificates[0].type}
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-300">
                Cert #{warranty.certificates[0].certNumber} • {warranty.certificates[0].issuer}
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-xl bg-slate-50/80 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-white/10 text-center flex flex-col items-center justify-center">
              <Shield size={22} className="text-slate-300 dark:text-slate-600 mb-1.5" />
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {warranty.statusText || 'No warranty certificate issued yet'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer matching mockup */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/10 flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
        <span>Warranties: {warranty.warrantiesCount || warranty.certificates?.length || 0}</span>
        <button
          onClick={onOpenHub}
          className="text-[#0284C7] dark:text-sky-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
        >
          <span>Open Warranties Hub</span>
          <ExternalLink size={12} />
        </button>
      </div>
    </div>
  );
}
