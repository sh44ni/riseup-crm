import React from 'react';
import { Hammer, Sparkles, Clock, AlertCircle } from 'lucide-react';

interface DevelopmentInProgressBannerProps {
  moduleName: string;
  expectedVersion?: string;
  description?: string;
}

export function DevelopmentInProgressBanner({
  moduleName,
  expectedVersion = 'v3.2 Sprint Release',
  description = 'This operational module is currently undergoing active engineering and live FastAPI backend integration. Full automated controls and real-time database feeds are scheduled for release shortly.',
}: DevelopmentInProgressBannerProps) {
  return (
    <div className="light-glass-card rounded-2xl p-4 border border-amber-300/60 bg-gradient-to-r from-amber-50/80 via-orange-50/50 to-amber-50/70 backdrop-blur-md shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 select-none animate-in fade-in duration-200">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-400/40 text-amber-700 flex items-center justify-center shrink-0 shadow-2xs">
          <Hammer size={19} className="animate-bounce-subtle" />
        </div>
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-black text-amber-950 uppercase tracking-wider">
              {moduleName}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-900 border border-amber-400/50 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              DIP • Development in Progress
            </span>
            <span className="text-[10px] font-bold text-amber-700 bg-white/70 px-2 py-0.5 rounded-md border border-amber-200">
              {expectedVersion}
            </span>
          </div>
          <p className="text-xs text-amber-900/80 font-medium leading-relaxed max-w-3xl">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

export default DevelopmentInProgressBanner;
