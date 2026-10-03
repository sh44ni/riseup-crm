import React from 'react';

export interface KanbanColumnSkeletonProps {
  cardCount?: number;
}

export function KanbanColumnSkeleton({ cardCount = 3 }: KanbanColumnSkeletonProps) {
  return (
    <div className="flex flex-col h-full rounded-xl bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 p-2.5 animate-pulse min-w-[200px]">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="h-4 w-24 bg-slate-300 dark:bg-slate-700 rounded-md" />
        <div className="h-4 w-6 bg-slate-300 dark:bg-slate-700 rounded-full" />
      </div>
      <div className="space-y-2 flex-1">
        {Array.from({ length: cardCount }).map((_, idx) => (
          <div
            key={idx}
            className="rounded-lg bg-white/60 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60 p-3 space-y-2"
          >
            <div className="h-3.5 w-3/4 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-2.5 w-1/2 bg-slate-200/70 dark:bg-slate-700/70 rounded" />
            <div className="flex justify-between items-center pt-1">
              <div className="h-2.5 w-1/3 bg-slate-200/70 dark:bg-slate-700/70 rounded" />
              <div className="h-3 w-12 bg-slate-200 dark:bg-slate-700 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
