import React from 'react';
import { ShimmerBox } from '@/components/common/Skeletons';

export interface KanbanColumnSkeletonProps {
  cardCount?: number;
}

export function KanbanColumnSkeleton({ cardCount = 3 }: KanbanColumnSkeletonProps) {
  return (
    <div className="flex flex-col h-full rounded-2xl bg-white/40 dark:bg-slate-900/40 border border-slate-200/70 dark:border-white/10 p-2.5 min-w-[200px] space-y-2.5">
      <div className="flex items-center justify-between px-1">
        <ShimmerBox className="h-4 w-24 rounded-md" />
        <ShimmerBox className="h-4 w-6 rounded-full" />
      </div>
      <div className="space-y-2 flex-1">
        {Array.from({ length: cardCount }).map((_, idx) => (
          <div
            key={idx}
            className="rounded-xl light-glass-card p-3 space-y-2.5 shadow-2xs"
          >
            <div className="flex justify-between items-center">
              <ShimmerBox className="h-3 w-16 rounded" />
              <ShimmerBox className="h-4 w-12 rounded-full" />
            </div>
            <ShimmerBox className="h-3.5 w-3/4 rounded-md" />
            <ShimmerBox className="h-2.5 w-1/2 rounded" />
            <div className="flex justify-between items-center pt-1 border-t border-slate-100/60 dark:border-white/5">
              <ShimmerBox className="h-2.5 w-1/3 rounded" />
              <ShimmerBox className="w-5 h-5 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
