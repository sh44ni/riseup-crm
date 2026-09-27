import React from 'react';
import { Search } from 'lucide-react';

export function CrmTopBar() {
  return (
    <header className="h-12 charcoal-topbar px-5 flex items-center justify-between gap-4 shrink-0 select-none">
      {/* Search Input with Dual OS ⌘ / Win + K Badge */}
      <div className="flex-1 max-w-xl relative group">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#2F9FE3] transition-colors" />
        <input
          type="text"
          placeholder="Search leads, customers, jobs, addresses..."
          className="w-full pl-9 pr-28 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] focus:bg-white/[0.16] border border-white/[0.15] text-xs text-white placeholder:text-slate-400 font-medium focus:outline-none focus:border-[#2F9FE3] focus:ring-2 focus:ring-[#2F9FE3]/30 transition-all shadow-inner"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 select-none">
          <kbd className="px-1 py-0.5 rounded bg-white/[0.1] border border-white/[0.15] text-[10px] font-bold text-slate-300 font-mono">
            ⌘
          </kbd>
          <span className="text-[10px] text-slate-500 font-semibold">/</span>
          <kbd className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-white/[0.1] border border-white/[0.15] text-[9.5px] font-bold text-slate-300 font-mono">
            <svg className="w-2.5 h-2.5 fill-sky-400" viewBox="0 0 88 88">
              <path d="M0 12.402l35.687-4.86.016 34.423-35.67.203zm35.67 33.529l.028 34.453L.028 75.48.016 45.728zm4.326-39.043L87.914 0v41.527l-47.918.283zm47.929 41.258L88 88l-48.004-6.787V46.037z"/>
            </svg>
            <span>Win</span>
          </kbd>
          <span className="text-[10px] text-slate-500 font-semibold">+</span>
          <kbd className="px-1.5 py-0.5 rounded bg-sky-500/20 border border-sky-400/40 text-[10px] font-black text-sky-300 font-mono">
            K
          </kbd>
        </div>
      </div>
    </header>
  );
}
