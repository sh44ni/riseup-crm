import React from 'react';
import { ExternalLink, RotateCcw, AlertTriangle, ShieldCheck, Calendar, DollarSign, UserCheck, Flame, ArrowUpRight } from 'lucide-react';
import { Client360Record } from '@/types/client360Types';

interface ClientHeroBannerProps {
  client: Client360Record;
  onManageJob?: () => void;
  onReactivate?: () => void;
  onOpenWinBack?: () => void;
}

export function ClientHeroBanner({
  client,
  onManageJob,
  onReactivate,
  onOpenWinBack,
}: ClientHeroBannerProps) {
  const { status, activeJob, lossPostMortem, completedJob } = client;

  // 1. ACTIVE ROOFING PROJECT UNDERWAY (Matching the mockup)
  if (status === 'active_job' && activeJob) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-[#0B1E33] border border-slate-800 p-5 md:p-6 text-white shadow-xl">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#2F9FE3]/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        {/* Top line: Status tag + Manage Job button */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-[11px] font-bold tracking-wider uppercase text-amber-300/90">
              ACTIVE ROOFING PROJECT UNDERWAY
            </span>
          </div>

          <button
            onClick={onManageJob}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-semibold text-white transition-all shadow-sm hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>Manage Job</span>
            <ExternalLink size={13} className="text-white/80" />
          </button>
        </div>

        {/* Job Title */}
        <h2 className="text-lg md:text-xl font-bold tracking-tight text-white mb-6">
          {activeJob.jobId} — {activeJob.title}
        </h2>

        {/* 4 Metric Columns (Exact Mockup Layout) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 pt-4 border-t border-slate-800/80">
          <div>
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Stage</div>
            <div className="text-sm md:text-base font-bold text-white mt-1">
              {activeJob.stage}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Contract Value</div>
            <div className="text-sm md:text-base font-bold text-white mt-1">
              ${activeJob.contractValue.toLocaleString()}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Crew Lead</div>
            <div className="text-sm md:text-base font-bold text-white mt-1">
              {activeJob.crewLead}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Scheduled Start</div>
            <div className="text-sm md:text-base font-bold text-white mt-1">
              {activeJob.scheduledStart}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. CLOSED LOST — ARCHIVED DEAL & WIN-BACK RADAR (Targeted for user request)
  if (status === 'closed_lost' && lossPostMortem) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1E1116] via-[#16121D] to-[#0D1524] border border-rose-900/40 p-5 md:p-6 text-white shadow-xl">
        {/* Subtle rose background glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        {/* Top line: Status tag + Reactivate Deal button */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
            <span className="text-[11px] font-bold tracking-wider uppercase text-rose-300">
              CLOSED LOST — ARCHIVED DEAL / WIN-BACK RADAR
            </span>
            <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
              {lossPostMortem.daysAgo} Days Ago
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onReactivate}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-xs font-semibold text-rose-200 transition-all shadow-sm hover:scale-[1.02] active:scale-[0.98]"
            >
              <RotateCcw size={13} className="text-rose-300" />
              <span>Reactivate Deal</span>
            </button>
            <button
              onClick={onOpenWinBack}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-xs font-semibold text-amber-200 transition-all shadow-sm hover:scale-[1.02] active:scale-[0.98]"
            >
              <Flame size={13} className="text-amber-300" />
              <span>Win-Back Cadence</span>
            </button>
          </div>
        </div>

        {/* Opportunity Title */}
        <h2 className="text-lg md:text-xl font-bold tracking-tight text-white mb-2">
          {lossPostMortem.opportunityId} — {lossPostMortem.title} (${lossPostMortem.proposedValue.toLocaleString()})
        </h2>

        {/* Autopsy snippet */}
        <p className="text-xs text-rose-200/80 mb-6 leading-relaxed max-w-4xl bg-rose-950/40 border border-rose-900/50 rounded-xl p-3">
          <strong className="text-rose-300">Loss Autopsy: </strong>
          {lossPostMortem.autopsyNotes}
        </p>

        {/* 4 Metric Columns for Lost Client */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 pt-4 border-t border-rose-900/30">
          <div>
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Lost Reason</div>
            <div className="inline-flex items-center gap-1.5 text-xs md:text-sm font-bold text-rose-300 mt-1">
              <span>📉</span>
              <span>{lossPostMortem.lossReason}</span>
            </div>
          </div>

          <div>
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Competitor / Low Bid</div>
            <div className="text-xs md:text-sm font-bold text-white mt-1 truncate" title={lossPostMortem.competitorName}>
              {lossPostMortem.competitorBid ? `$${lossPostMortem.competitorBid.toLocaleString()} Cash` : (lossPostMortem.competitorName || 'N/A')}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Archived Date</div>
            <div className="text-xs md:text-sm font-bold text-white mt-1">
              {lossPostMortem.lostDate}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Next Win-Back Touch</div>
            <div className="text-xs md:text-sm font-bold text-amber-300 mt-1 flex items-center gap-1">
              <Calendar size={13} />
              <span>{lossPostMortem.winBackDate}</span>
            </div>
          </div>
        </div>

        {/* Vulnerability alerts preview */}
        {lossPostMortem.riskVulnerabilities && lossPostMortem.riskVulnerabilities.length > 0 && (
          <div className="mt-4 pt-3 border-t border-rose-900/20 flex flex-wrap items-center gap-2 text-[11px] text-slate-300">
            <span className="font-semibold text-rose-400 flex items-center gap-1">
              <AlertTriangle size={12} />
              Identified Homeowner Vulnerabilities:
            </span>
            {lossPostMortem.riskVulnerabilities.slice(0, 2).map((vuln, i) => (
              <span key={i} className="px-2 py-0.5 rounded-lg bg-black/40 border border-white/10 text-slate-300">
                {vuln}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 3. COMPLETED LIFETIME CLIENT (50-Year Warranty Active)
  if (status === 'completed' && completedJob) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0B251B] via-[#0D1F2D] to-[#0A1826] border border-emerald-800/40 p-5 md:p-6 text-white shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span className="text-[11px] font-bold tracking-wider uppercase text-emerald-300">
              LIFETIME CLIENT — COMPLETED ROOFING PROJECT
            </span>
            <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Warranty Certificate Active
            </span>
          </div>

          <button
            onClick={onManageJob}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-xs font-semibold text-emerald-200 transition-all shadow-sm"
          >
            <span>View Certificate</span>
            <ArrowUpRight size={13} className="text-emerald-300" />
          </button>
        </div>

        <h2 className="text-lg md:text-xl font-bold tracking-tight text-white mb-6">
          {completedJob.jobId} — {completedJob.title}
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 pt-4 border-t border-emerald-800/30">
          <div>
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Installed Date</div>
            <div className="text-sm md:text-base font-bold text-white mt-1">
              {completedJob.installedDate}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Total Paid</div>
            <div className="text-sm md:text-base font-bold text-emerald-400 mt-1">
              ${completedJob.totalPaid.toLocaleString()}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">System Warranty</div>
            <div className="text-sm md:text-base font-bold text-white mt-1 truncate" title={completedJob.warrantyType}>
              {completedJob.warrantyType}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Next Checkup</div>
            <div className="text-sm md:text-base font-bold text-teal-300 mt-1">
              {completedJob.nextAnnualInspectionDate}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fallback banner for standard lead
  return (
    <div className="rounded-2xl bg-[#0B1E33] border border-slate-800 p-5 md:p-6 text-white shadow-xl">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-pulse" />
        <span className="text-[11px] font-bold tracking-wider uppercase text-sky-300">
          CLIENT PROFILE ARCHIVE
        </span>
      </div>
      <h2 className="text-lg font-bold text-white">
        Homeowner Record: {client.name}
      </h2>
    </div>
  );
}
