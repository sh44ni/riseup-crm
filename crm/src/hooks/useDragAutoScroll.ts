import { useEffect, useRef } from 'react';

export interface UseDragAutoScrollOptions {
  /** The scrollable kanban container ref (scrolls horizontally) */
  containerRef: React.RefObject<HTMLElement | null>;
  /** Whether a drag operation is currently in progress */
  isDragging: boolean;
  /** Distance in pixels from the edge where auto-scrolling begins (default: 160px) */
  edgeThreshold?: number;
  /** Maximum scroll velocity in pixels per frame (default: 26px) */
  maxSpeed?: number;
  /** Minimum scroll velocity in pixels per frame (default: 4px) */
  minSpeed?: number;
  /** Optional callback fired when the container scrolls (e.g. to update scroll position indicators) */
  onScroll?: () => void;
  /** Whether to also auto-scroll the window vertically when dragging near top/bottom (default: true) */
  enableVerticalWindowScroll?: boolean;
}

/**
 * High-performance edge auto-scroll hook for HTML5 Drag-and-Drop kanban boards.
 *
 * Runs a 60fps requestAnimationFrame loop when a drag is active.
 * Accelerates scrolling the closer the pointer gets to the container/screen edges.
 * Continues scrolling even when the pointer is stationary at the edge.
 */
export function useDragAutoScroll({
  containerRef,
  isDragging,
  edgeThreshold = 160,
  maxSpeed = 26,
  minSpeed = 4,
  onScroll,
  enableVerticalWindowScroll = true,
}: UseDragAutoScrollOptions) {
  const pointerPosRef = useRef<{ x: number; y: number } | null>(null);
  const activeColRef = useRef<HTMLElement | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const prevScrollBehaviorRef = useRef<string>('');

  useEffect(() => {
    if (!isDragging) {
      pointerPosRef.current = null;
      activeColRef.current = null;
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      // Restore container scroll-behavior if temporarily overridden
      if (containerRef.current) {
        containerRef.current.style.scrollBehavior = prevScrollBehaviorRef.current;
      }
      return;
    }

    const container = containerRef.current;
    if (container) {
      prevScrollBehaviorRef.current = container.style.scrollBehavior;
      // Force instantaneous scroll during drag so rAF velocity updates don't stutter
      container.style.scrollBehavior = 'auto';
    }

    // ── Global DragOver Listener ─────────────────────────────────────────────
    const handleDragOver = (e: DragEvent) => {
      // Must preventDefault to allow dropping and guarantee continuous event stream
      e.preventDefault();
      pointerPosRef.current = { x: e.clientX, y: e.clientY };

      // Check if pointer is currently over a vertically-scrollable column cards list
      const target = e.target as HTMLElement | null;
      if (target) {
        const scrollableCol = target.closest('.overflow-y-auto') as HTMLElement | null;
        if (scrollableCol && scrollableCol.scrollHeight > scrollableCol.clientHeight) {
          activeColRef.current = scrollableCol;
        } else {
          activeColRef.current = null;
        }
      }
    };

    const handleDragEnd = () => {
      pointerPosRef.current = null;
      activeColRef.current = null;
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      if (containerRef.current) {
        containerRef.current.style.scrollBehavior = prevScrollBehaviorRef.current;
      }
    };

    const handleWindowMouseLeave = (e: MouseEvent) => {
      if (!e.relatedTarget) {
        pointerPosRef.current = null;
      }
    };

    window.addEventListener('dragover', handleDragOver, { passive: false });
    window.addEventListener('dragend', handleDragEnd);
    window.addEventListener('drop', handleDragEnd);
    window.addEventListener('mouseleave', handleWindowMouseLeave);

    // ── 60 FPS Auto-Scroll Animation Loop ───────────────────────────────────
    const tick = () => {
      if (pointerPosRef.current) {
        const { x, y } = pointerPosRef.current;
        const currentContainer = containerRef.current;

        // 1. Horizontal container scrolling (11-Step Board)
        if (currentContainer && currentContainer.scrollWidth > currentContainer.clientWidth) {
          const rect = currentContainer.getBoundingClientRect();

          // Check if cursor is within vertical bounds of the kanban board (with 80px margin)
          if (y >= rect.top - 80 && y <= rect.bottom + 80) {
            const leftBoundary = Math.max(rect.left, 0);
            const rightBoundary = Math.min(rect.right, window.innerWidth);

            const leftThreshold = leftBoundary + edgeThreshold;
            const rightThreshold = rightBoundary - edgeThreshold;

            let hSpeed = 0;

            if (x > rightThreshold && x <= rightBoundary + 60) {
              // Dragging towards the right edge: scroll right to reveal later stages
              const distIntoZone = x - rightThreshold;
              const ratio = Math.min(1, Math.max(0, distIntoZone / edgeThreshold));
              // Non-linear easing for smooth gentle start and fast top speed
              hSpeed = Math.round(minSpeed + Math.pow(ratio, 1.2) * (maxSpeed - minSpeed));
            } else if (x < leftThreshold && x >= leftBoundary - 60) {
              // Dragging towards the left edge: scroll left to reveal earlier stages
              const distIntoZone = leftThreshold - x;
              const ratio = Math.min(1, Math.max(0, distIntoZone / edgeThreshold));
              hSpeed = -Math.round(minSpeed + Math.pow(ratio, 1.2) * (maxSpeed - minSpeed));
            }

            if (hSpeed !== 0) {
              const prevScroll = currentContainer.scrollLeft;
              currentContainer.scrollLeft += hSpeed;
              if (currentContainer.scrollLeft !== prevScroll && onScroll) {
                onScroll();
              }
            }
          }
        }

        // 2. Vertical column scrolling (for columns with many cards)
        const activeCol = activeColRef.current;
        if (activeCol && activeCol.scrollHeight > activeCol.clientHeight) {
          const colRect = activeCol.getBoundingClientRect();
          const colEdgeThreshold = Math.min(70, colRect.height * 0.25);
          let colSpeed = 0;

          if (y < colRect.top + colEdgeThreshold && y >= colRect.top - 20) {
            const dist = (colRect.top + colEdgeThreshold) - y;
            const ratio = Math.min(1, Math.max(0, dist / colEdgeThreshold));
            colSpeed = -Math.round(minSpeed + ratio * 14);
          } else if (y > colRect.bottom - colEdgeThreshold && y <= colRect.bottom + 20) {
            const dist = y - (colRect.bottom - colEdgeThreshold);
            const ratio = Math.min(1, Math.max(0, dist / colEdgeThreshold));
            colSpeed = Math.round(minSpeed + ratio * 14);
          }

          if (colSpeed !== 0) {
            activeCol.scrollTop += colSpeed;
          }
        }

        // 3. Vertical window scrolling (if dragging near viewport top/bottom)
        if (enableVerticalWindowScroll) {
          const winThreshold = 80;
          let vSpeed = 0;

          if (y < winThreshold && y >= 0) {
            const ratio = Math.min(1, Math.max(0, (winThreshold - y) / winThreshold));
            vSpeed = -Math.round(3 + ratio * 16);
          } else if (y > window.innerHeight - winThreshold && y <= window.innerHeight + 20) {
            const ratio = Math.min(1, Math.max(0, (y - (window.innerHeight - winThreshold)) / winThreshold));
            vSpeed = Math.round(3 + ratio * 16);
          }

          if (vSpeed !== 0) {
            window.scrollBy({ top: vSpeed });
          }
        }
      }

      rafIdRef.current = requestAnimationFrame(tick);
    };

    rafIdRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragend', handleDragEnd);
      window.removeEventListener('drop', handleDragEnd);
      window.removeEventListener('mouseleave', handleWindowMouseLeave);
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      if (containerRef.current) {
        containerRef.current.style.scrollBehavior = prevScrollBehaviorRef.current;
      }
    };
  }, [
    isDragging,
    containerRef,
    edgeThreshold,
    maxSpeed,
    minSpeed,
    onScroll,
    enableVerticalWindowScroll,
  ]);
}
