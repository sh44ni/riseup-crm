import React, { useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PipelineStageId, PIPELINE_STAGES } from '@/components/pipeline/pipelineTypes';

export interface PipelineScrollbarProps {
  canScrollLeft: boolean;
  canScrollRight: boolean;
  visibleRange: [number, number];
  highlightedStage: PipelineStageId | null;
  scrollProgress: number;
  kanbanScrollRef: React.RefObject<HTMLDivElement | null>;
  onScrollBoard: (direction: 'left' | 'right') => void;
  onScrollToStage: (stageId: PipelineStageId) => void;
}

export function PipelineScrollbar({
  canScrollLeft,
  canScrollRight,
  visibleRange,
  highlightedStage,
  scrollProgress,
  kanbanScrollRef,
  onScrollBoard,
  onScrollToStage,
}: PipelineScrollbarProps) {
  const scrollbarTrackRef = useRef<HTMLDivElement>(null);
  const thumbDragRef = useRef<{ startX: number; startScrollLeft: number } | null>(null);
  const dragListenersRef = useRef<{ onMouseMove: (e: MouseEvent) => void; onMouseUp: () => void } | null>(null);

  useEffect(() => {
    return () => {
      if (dragListenersRef.current) {
        window.removeEventListener('mousemove', dragListenersRef.current.onMouseMove);
        window.removeEventListener('mouseup', dragListenersRef.current.onMouseUp);
        dragListenersRef.current = null;
      }
    };
  }, []);

  return (
    <div className="sticky bottom-0 left-0 right-0 z-30 mt-2 pb-3 pointer-events-none">
      <div className="pointer-events-auto mx-auto max-w-[900px] bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.10)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.7)] px-4 py-2.5 flex items-center gap-3">
        <button
          type="button"
          onClick={() => onScrollBoard('left')}
          disabled={!canScrollLeft}
          className={`shrink-0 w-7 h-7 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
            canScrollLeft
              ? 'text-[#1878B8] dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/40 active:scale-90'
              : 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
          }`}
          title="Scroll Left"
        >
          <ChevronLeft size={15} />
        </button>

        <div className="flex-1 flex flex-col gap-1.5 min-w-0">
          <div className="flex items-center justify-between px-0.5">
            {PIPELINE_STAGES.map((stage) => {
              const isVisible = stage.stepNumber >= visibleRange[0] && stage.stepNumber <= visibleRange[1];
              const isHighlighted = highlightedStage === stage.id;
              return (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() => onScrollToStage(stage.id)}
                  title={`Step ${stage.stepNumber}: ${stage.shortTitle}`}
                  className="flex flex-col items-center gap-0.5 cursor-pointer group"
                >
                  <span
                    className={`text-[9px] font-bold leading-none transition-colors whitespace-nowrap hidden sm:block ${
                      isHighlighted
                        ? 'text-amber-500 dark:text-amber-400'
                        : isVisible
                        ? 'text-[#1878B8] dark:text-sky-400'
                        : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                    }`}
                  >
                    {stage.stepNumber}
                  </span>
                  <span
                    className={`w-1.5 h-1.5 rounded-full transition-all ${
                      isHighlighted
                        ? 'bg-amber-400 scale-150'
                        : isVisible
                        ? 'bg-[#1878B8] dark:bg-sky-400 scale-125'
                        : 'bg-slate-300 dark:bg-slate-700 group-hover:bg-slate-400 dark:group-hover:bg-slate-500'
                    }`}
                  />
                </button>
              );
            })}
          </div>

          <div
            ref={scrollbarTrackRef}
            className="relative h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full cursor-pointer"
            onClick={(e) => {
              if (!scrollbarTrackRef.current || !kanbanScrollRef.current) return;
              const rect = scrollbarTrackRef.current.getBoundingClientRect();
              const ratio = (e.clientX - rect.left) / rect.width;
              const maxScroll = kanbanScrollRef.current.scrollWidth - kanbanScrollRef.current.clientWidth;
              kanbanScrollRef.current.scrollTo({ left: ratio * maxScroll, behavior: 'smooth' });
            }}
          >
            <div
              className="absolute top-0 h-full bg-gradient-to-r from-[#1878B8] to-[#55C4F5] rounded-full cursor-grab active:cursor-grabbing transition-[left] duration-75 hover:opacity-90"
              style={{
                width: `${Math.max(10, (1 / 8) * 100)}%`,
                left: `${scrollProgress * (100 - Math.max(10, (1 / 8) * 100))}%`,
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                if (!kanbanScrollRef.current) return;
                thumbDragRef.current = {
                  startX: e.clientX,
                  startScrollLeft: kanbanScrollRef.current.scrollLeft,
                };

                if (dragListenersRef.current) {
                  window.removeEventListener('mousemove', dragListenersRef.current.onMouseMove);
                  window.removeEventListener('mouseup', dragListenersRef.current.onMouseUp);
                }

                const onMouseMove = (ev: MouseEvent) => {
                  if (!thumbDragRef.current || !kanbanScrollRef.current || !scrollbarTrackRef.current) return;
                  const trackWidth = scrollbarTrackRef.current.clientWidth;
                  const thumbWidth = trackWidth * Math.max(0.1, 1 / 8);
                  const movableTrack = trackWidth - thumbWidth;
                  const dx = ev.clientX - thumbDragRef.current.startX;
                  const ratio = dx / movableTrack;
                  const maxScroll = kanbanScrollRef.current.scrollWidth - kanbanScrollRef.current.clientWidth;
                  kanbanScrollRef.current.scrollLeft = Math.max(
                    0,
                    Math.min(maxScroll, thumbDragRef.current.startScrollLeft + ratio * maxScroll)
                  );
                };

                const onMouseUp = () => {
                  thumbDragRef.current = null;
                  window.removeEventListener('mousemove', onMouseMove);
                  window.removeEventListener('mouseup', onMouseUp);
                  dragListenersRef.current = null;
                };

                dragListenersRef.current = { onMouseMove, onMouseUp };
                window.addEventListener('mousemove', onMouseMove);
                window.addEventListener('mouseup', onMouseUp);
              }}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => onScrollBoard('right')}
          disabled={!canScrollRight}
          className={`shrink-0 w-7 h-7 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
            canScrollRight
              ? 'text-[#1878B8] dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/40 active:scale-90'
              : 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
          }`}
          title="Scroll Right"
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}
