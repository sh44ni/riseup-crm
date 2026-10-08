import React from 'react';

// ---------------------------------------------------------------------------
// Base Shimmer Primitive — GPU-composited, zero layout thrashing
// ---------------------------------------------------------------------------
export function ShimmerBox({
  className = '',
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-slate-200/70 dark:bg-white/[0.06] ${className}`}
      style={style}
      aria-hidden="true"
    >
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/50 dark:via-white/[0.08] to-transparent pointer-events-none" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Table Skeleton — Generic and reusable across all registry tables
// ---------------------------------------------------------------------------
export interface TableSkeletonProps {
  rowCount?: number;
  colWidths?: string[];
  showActions?: boolean;
}

export function TableSkeleton({
  rowCount = 6,
  colWidths = ['w-24', 'w-48', 'w-36', 'w-28', 'w-24'],
  showActions = true,
}: TableSkeletonProps) {
  return (
    <div className="divide-y divide-slate-100/80 dark:divide-white/5">
      {Array.from({ length: rowCount }).map((_, rIdx) => (
        <div
          key={rIdx}
          className="flex items-center justify-between px-4 py-3.5 gap-4"
          style={{ opacity: 1 - rIdx * 0.1 }}
        >
          <div className="flex items-center gap-4 flex-1 min-w-0">
            {colWidths.map((w, cIdx) => (
              <ShimmerBox
                key={cIdx}
                className={`h-4 ${w} ${cIdx > 2 ? 'hidden sm:block' : ''}`}
              />
            ))}
          </div>
          {showActions && (
            <div className="flex items-center gap-2 shrink-0">
              <ShimmerBox className="h-7 w-16 rounded-xl" />
              <ShimmerBox className="h-7 w-20 rounded-xl" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Client Cards Skeleton — Matches ClientDirectoryCards layout exactly
// ---------------------------------------------------------------------------
export function ClientCardsSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3.5">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="light-glass-card rounded-2xl p-5 shadow-xs space-y-4 relative overflow-hidden"
          style={{ opacity: 1 - i * 0.08 }}
        >
          {/* Header: Avatar + Name + Address */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <ShimmerBox className="w-11 h-11 rounded-2xl shrink-0" />
              <div className="space-y-1.5">
                <ShimmerBox className="h-4 w-28 rounded-lg" />
                <ShimmerBox className="h-3 w-36 rounded-md" />
              </div>
            </div>
            <ShimmerBox className="w-7 h-7 rounded-lg" />
          </div>

          {/* Specs Tile */}
          <div className="liquid-glass-tile rounded-xl p-3 space-y-2 dark:bg-white/5 dark:border-white/10">
            <div className="flex justify-between items-center">
              <ShimmerBox className="h-2.5 w-16" />
              <ShimmerBox className="h-2.5 w-20" />
            </div>
            <div className="flex justify-between items-center">
              <ShimmerBox className="h-2.5 w-14" />
              <ShimmerBox className="h-2.5 w-16" />
            </div>
            <div className="flex justify-between items-center">
              <ShimmerBox className="h-2.5 w-18" />
              <ShimmerBox className="h-2.5 w-24" />
            </div>
          </div>

          {/* Contact Bar */}
          <div className="flex items-center gap-2 pt-0.5">
            <ShimmerBox className="h-6 w-24 rounded-lg" />
            <ShimmerBox className="h-6 w-20 rounded-lg" />
            <div className="flex-1" />
            <ShimmerBox className="h-6 w-16 rounded-lg" />
          </div>

          {/* Footer Badge + Link */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-100/70 dark:border-white/5">
            <ShimmerBox className="h-5 w-20 rounded-full" />
            <ShimmerBox className="h-3 w-16 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Estimates Table Skeleton — Matches EstimatesPage table
// ---------------------------------------------------------------------------
export function EstimatesTableSkeleton({ rowCount = 7 }: { rowCount?: number }) {
  return (
    <div className="w-full">
      <div className="border-b border-slate-200/70 dark:border-white/10 bg-slate-50/70 dark:bg-slate-900/80 px-4 py-3 flex items-center justify-between">
        <ShimmerBox className="h-3.5 w-24" />
        <ShimmerBox className="h-3.5 w-32" />
        <ShimmerBox className="h-3.5 w-20 hidden sm:block" />
        <ShimmerBox className="h-3.5 w-24 hidden md:block" />
        <ShimmerBox className="h-3.5 w-28 hidden lg:block" />
        <ShimmerBox className="h-3.5 w-24" />
      </div>
      <div className="divide-y divide-slate-100/70 dark:divide-white/5">
        {Array.from({ length: rowCount }).map((_, i) => (
          <div
            key={i}
            className="px-4 py-3.5 flex items-center justify-between gap-4"
            style={{ opacity: 1 - i * 0.1 }}
          >
            <div className="flex items-center gap-3">
              <ShimmerBox className="h-6 w-24 rounded-lg" />
              <div className="space-y-1 hidden sm:block">
                <ShimmerBox className="h-3.5 w-32" />
                <ShimmerBox className="h-2.5 w-24" />
              </div>
            </div>
            <ShimmerBox className="h-5 w-20 rounded-full hidden sm:block" />
            <ShimmerBox className="h-4 w-20 hidden md:block" />
            <ShimmerBox className="h-3.5 w-24 hidden lg:block" />
            <div className="flex items-center gap-1.5 shrink-0">
              <ShimmerBox className="h-7 w-16 rounded-xl" />
              <ShimmerBox className="h-7 w-8 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Contracts Table Skeleton — Matches ContractsTable
// ---------------------------------------------------------------------------
export function ContractsTableSkeleton({ rowCount = 7 }: { rowCount?: number }) {
  return (
    <div className="divide-y divide-slate-100 dark:divide-white/5">
      {Array.from({ length: rowCount }).map((_, i) => (
        <div
          key={i}
          className="px-4 py-3.5 flex items-center justify-between gap-4"
          style={{ opacity: 1 - i * 0.1 }}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <ShimmerBox className="h-6 w-24 rounded-lg shrink-0" />
            <div className="space-y-1 flex-1 min-w-0 max-w-[200px]">
              <ShimmerBox className="h-3.5 w-32" />
              <ShimmerBox className="h-2.5 w-24" />
            </div>
            <ShimmerBox className="h-3.5 w-40 hidden md:block" />
            <ShimmerBox className="h-5 w-24 rounded-full hidden lg:block" />
            <ShimmerBox className="h-4 w-20 hidden sm:block" />
            <ShimmerBox className="h-5 w-20 rounded-full hidden xl:block" />
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <ShimmerBox className="h-7 w-20 rounded-xl" />
            <ShimmerBox className="h-7 w-8 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Job Cards Skeleton — Matches JobsPage grid view
// ---------------------------------------------------------------------------
export function JobCardsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="light-glass-card rounded-2xl p-4 space-y-3.5 relative overflow-hidden"
          style={{ opacity: 1 - i * 0.1 }}
        >
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <ShimmerBox className="h-3 w-16 rounded" />
              <ShimmerBox className="h-4 w-32 rounded" />
              <ShimmerBox className="h-3 w-40 rounded" />
            </div>
            <ShimmerBox className="h-5 w-20 rounded-full" />
          </div>

          {/* Progress Bar */}
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between items-center">
              <ShimmerBox className="h-2.5 w-24" />
              <ShimmerBox className="h-2.5 w-10" />
            </div>
            <ShimmerBox className="h-2 w-full rounded-full" />
          </div>

          {/* Milestone Badges */}
          <div className="flex gap-1.5 pt-1">
            <ShimmerBox className="h-6 w-20 rounded-lg" />
            <ShimmerBox className="h-6 w-24 rounded-lg" />
            <ShimmerBox className="h-6 w-16 rounded-lg" />
          </div>

          {/* Footer: Rep + Action */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100/70 dark:border-white/5">
            <div className="flex items-center gap-2">
              <ShimmerBox className="w-6 h-6 rounded-full" />
              <ShimmerBox className="h-3 w-20 rounded" />
            </div>
            <ShimmerBox className="h-6 w-16 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Task Items Skeleton — Matches TasksPage operational tasks list
// ---------------------------------------------------------------------------
export function TaskItemsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="light-glass-panel rounded-2xl p-3.5 flex items-center justify-between gap-3 relative overflow-hidden"
          style={{ opacity: 1 - i * 0.1 }}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <ShimmerBox className="w-5 h-5 rounded-lg shrink-0" />
            <div className="space-y-1.5 flex-1 min-w-0">
              <ShimmerBox className="h-3.5 w-3/5 rounded-md" />
              <div className="flex items-center gap-2">
                <ShimmerBox className="h-2.5 w-24 rounded" />
                <ShimmerBox className="h-2.5 w-16 rounded" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <ShimmerBox className="h-5 w-16 rounded-full hidden sm:block" />
            <ShimmerBox className="h-5 w-20 rounded-full" />
            <ShimmerBox className="w-7 h-7 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stats Row Skeleton — 4 cards matching UniversalStatCard row
// ---------------------------------------------------------------------------
export function StatsRowSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className={`grid grid-cols-2 ${count >= 4 ? 'sm:grid-cols-4' : 'sm:grid-cols-3'} gap-3`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="light-glass-card rounded-2xl p-3.5 space-y-2 relative overflow-hidden"
          style={{ opacity: 1 - i * 0.08 }}
        >
          <div className="flex items-center justify-between">
            <ShimmerBox className="w-7 h-7 rounded-lg" />
            <ShimmerBox className="w-12 h-4 rounded-full" />
          </div>
          <div className="flex items-end justify-between pt-1">
            <div className="space-y-1">
              <ShimmerBox className="h-6 w-16 rounded-md" />
              <ShimmerBox className="h-3 w-24 rounded" />
            </div>
            <ShimmerBox className="h-6 w-14 rounded" />
          </div>
          <div className="flex items-center justify-between pt-1.5 border-t border-slate-100/60 dark:border-white/5">
            <ShimmerBox className="h-2.5 w-16 rounded" />
            <ShimmerBox className="h-2.5 w-14 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Calendar Day Schedule Skeleton — Matches CalendarDayInspector
// ---------------------------------------------------------------------------
export function CalendarDayScheduleSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-2 p-1">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl p-3 bg-white/40 dark:bg-white/[0.04] border border-slate-200/60 dark:border-white/10 space-y-2"
          style={{ opacity: 1 - i * 0.15 }}
        >
          <div className="flex items-center justify-between">
            <ShimmerBox className="h-4 w-20 rounded-md" />
            <ShimmerBox className="h-4 w-16 rounded-full" />
          </div>
          <ShimmerBox className="h-3.5 w-3/4 rounded-md" />
          <div className="flex items-center justify-between pt-1">
            <ShimmerBox className="h-3 w-28 rounded" />
            <ShimmerBox className="w-5 h-5 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
