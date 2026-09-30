/**
 * PageLoadingFallback
 *
 * Renders immediately as the Suspense fallback when a lazy page chunk is loading.
 * Shows the full app shell (sidebar silhouette + animated content skeleton)
 * so the user has instant visual feedback on click, eliminating the ~400-800ms
 * blank-screen dead zone that was causing the perceived lag.
 */
import React from 'react';

// ---------------------------------------------------------------------------
// Shimmer skeleton primitive — GPU-composited, avoids layout thrashing
// ---------------------------------------------------------------------------
function Shimmer({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-white/[0.07] dark:bg-slate-800/60 ${className}`}
      style={style}
      aria-hidden="true"
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sidebar silhouette — matches CrmSidebar dimensions exactly
// ---------------------------------------------------------------------------
function SidebarSkeleton() {
  const navItems = [3, 5, 3]; // items per section

  return (
    <aside className="w-64 h-screen flex flex-col bg-[#070C15] border-r border-white/[0.08] shrink-0">
      {/* Logo area */}
      <div className="p-4 border-b border-white/[0.08]">
        <Shimmer className="h-8 w-36" />
      </div>

      {/* Nav sections */}
      <nav className="flex-1 px-3 py-3 space-y-5">
        {navItems.map((count, sIdx) => (
          <div key={sIdx} className="space-y-1">
            {/* Section label */}
            <div className="px-3 pt-2 pb-1 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-sky-400/40" />
              <Shimmer className="h-2.5 w-20 rounded-full" />
            </div>
            {/* Nav items */}
            <div className="space-y-0.5">
              {Array.from({ length: count }).map((_, i) => (
                <Shimmer key={i} className="h-8 mx-0.5 rounded-xl" />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 pb-5 pt-2.5 border-t border-white/[0.08] space-y-3">
        <Shimmer className="h-7 rounded-xl" />
        <div className="space-y-1">
          <Shimmer className="h-5 w-28 rounded-lg" />
          <Shimmer className="h-5 w-20 rounded-lg" />
        </div>
        <div className="flex gap-2 pt-1">
          {[0, 1, 2, 3].map((i) => (
            <Shimmer key={i} className="w-8 h-8 rounded-xl" />
          ))}
        </div>
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Content area skeleton — generic hero + stat cards + table rows
// ---------------------------------------------------------------------------
function ContentSkeleton() {
  return (
    <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden light-glass-canvas">
      {/* Ambient orbs (match CrmLayout) */}
      <div className="absolute -top-24 left-[10%] w-[520px] h-[520px] bg-gradient-to-br from-sky-400/20 to-transparent rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-[22%] -right-12 w-[420px] h-[420px] bg-gradient-to-bl from-amber-300/15 to-transparent rounded-full blur-[90px] pointer-events-none" />

      <main className="flex-1 min-w-0 px-4 py-2.5 relative z-10 space-y-4 overflow-hidden">
        {/* Hero banner */}
        <Shimmer className="h-28 w-full rounded-2xl mt-1" />

        {/* Stat cards row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Shimmer key={i} className="h-20 rounded-2xl" />
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2">
          <Shimmer className="h-9 w-56 rounded-xl" />
          <Shimmer className="h-9 w-28 rounded-xl" />
          <Shimmer className="h-9 w-28 rounded-xl" />
          <div className="flex-1" />
          <Shimmer className="h-9 w-24 rounded-xl" />
        </div>

        {/* Table rows */}
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Shimmer key={i} className="h-12 w-full rounded-xl" style={{ opacity: 1 - i * 0.09 }} />
          ))}
        </div>
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Exported fallback — full layout shell
// ---------------------------------------------------------------------------
export function PageLoadingFallback() {
  return (
    <div className="h-screen w-full flex bg-[#070B12] text-slate-100 antialiased overflow-hidden">
      <SidebarSkeleton />
      <ContentSkeleton />
    </div>
  );
}
