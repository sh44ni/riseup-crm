import React from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { PipelineStageId, PIPELINE_STAGES, PipelineDealItem } from '@/components/pipeline/pipelineTypes';

export interface PipelineSopBarProps {
  deals: PipelineDealItem[];
  dragOverStageId: string | null;
  onScrollToStage: (stageId: PipelineStageId) => void;
  onDragOver: (e: React.DragEvent, stageId: string) => void;
  onDragLeave: (stageId: string) => void;
  onDropOnStage: (e: React.DragEvent, stageId: PipelineStageId) => void;
}

const pillGradients: Record<number, string> = {
  1: 'bg-gradient-to-r from-[#0284c7] via-[#0ea5e9] to-[#38bdf8]',
  2: 'bg-gradient-to-r from-[#0891b2] via-[#06b6d4] to-[#22d3ee]',
  3: 'bg-gradient-to-r from-[#7c3aed] via-[#8b5cf6] to-[#a855f7]',
  4: 'bg-gradient-to-r from-[#4f46e5] via-[#6366f1] to-[#818cf8]',
  5: 'bg-gradient-to-r from-[#d97706] via-[#f59e0b] to-[#fbbf24]',
  6: 'bg-gradient-to-r from-[#059669] via-[#10b981] to-[#34d399]',
  7: 'bg-gradient-to-r from-[#0d9488] via-[#14b8a6] to-[#2dd4bf]',
  8: 'bg-gradient-to-r from-[#db2777] via-[#ec4899] to-[#f472b6]',
  9: 'bg-gradient-to-r from-[#ea580c] via-[#f97316] to-[#fb923c]',
  10: 'bg-gradient-to-r from-[#475569] via-[#64748b] to-[#94a3b8]',
  11: 'bg-gradient-to-r from-[#15803d] via-[#16a34a] to-[#22c55e]',
};

export function PipelineSopBar({
  deals,
  dragOverStageId,
  onScrollToStage,
  onDragOver,
  onDragLeave,
  onDropOnStage,
}: PipelineSopBarProps) {
  return (
    <div className="p-2 rounded-2xl light-glass-panel glossy-sheen border border-white/85 dark:border-white/10 shadow-xs overflow-x-auto no-scrollbar">
      <div className="flex items-center gap-1.5 min-w-max">
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 px-2 flex items-center gap-1">
          <Sparkles size={12} className="text-[#1878B8] dark:text-sky-400" />
          <span>SOP Steps:</span>
        </span>

        {PIPELINE_STAGES.map((stage, idx) => {
          const count = deals.filter((d) => d.stageId === stage.id).length;
          const isHovered = dragOverStageId === stage.id;
          return (
            <React.Fragment key={stage.id}>
              <button
                type="button"
                onClick={() => onScrollToStage(stage.id)}
                onDragOver={(e) => onDragOver(e, stage.id)}
                onDragLeave={() => onDragLeave(stage.id)}
                onDrop={(e) => onDropOnStage(e, stage.id)}
                style={
                  isHovered
                    ? {
                        boxShadow: `0 0 0 2px ${stage.accentColor}, 0 4px 12px -2px ${stage.accentColor}40`,
                        transform: 'scale(1.05)',
                      }
                    : undefined
                }
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10.5px] font-bold transition-all cursor-pointer select-none ${
                  isHovered
                    ? 'bg-sky-100 dark:bg-sky-900/40 text-sky-900 dark:text-sky-100 ring-2 ring-sky-400 ring-offset-1 ring-offset-slate-900 z-10'
                    : 'bg-white/70 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-white/10 hover:border-slate-300'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black text-white ${
                    pillGradients[stage.stepNumber] || 'bg-slate-500'
                  }`}
                >
                  {stage.stepNumber}
                </span>
                <span>{stage.shortTitle}</span>
                <span className="px-1.5 py-0.2 rounded-full bg-slate-200/80 dark:bg-white/10 text-[9px] font-mono text-slate-600 dark:text-slate-400">
                  {count}
                </span>
              </button>

              {idx < PIPELINE_STAGES.length - 1 && (
                <ArrowRight size={10} className="text-slate-300 dark:text-slate-600 shrink-0" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
