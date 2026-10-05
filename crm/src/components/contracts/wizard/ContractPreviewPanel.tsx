import React, { useEffect, useRef, useState, useMemo } from 'react';
import { ContractStudioData, TOTAL_CONTRACT_PAGES } from '@/types/contractStudioTypes';
import { generateContractHtml } from './generateContractHtml';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ContractPreviewPanelProps {
  contractId: string | null;
  data: ContractStudioData;
  currentStep: number;
  previewPage?: number;
  lastSaved: Date | null;
}

// A4 Page dimensions at 96 DPI: 210mm x 297mm ≈ 794px x 1122px (matching final-contract-template.html)
const PAGE_WIDTH_PX = 794;
const PAGE_HEIGHT_PX = 1122;
const TOTAL_PAGES = TOTAL_CONTRACT_PAGES;

export function ContractPreviewPanel({
  contractId,
  data,
  currentStep,
  previewPage = 1,
  lastSaved,
}: ContractPreviewPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  const [activePage, setActivePage] = useState<number>(previewPage);

  // Automatically switch page when wizard step advances or previewPage prop changes
  useEffect(() => {
    if (previewPage && previewPage >= 1 && previewPage <= TOTAL_PAGES) {
      setActivePage(previewPage);
    }
  }, [previewPage]);

  // Generate live HTML string for the current active page
  const previewHtml = useMemo(() => {
    try {
      return generateContractHtml(data, activePage);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Please complete required project details to preview this contract.';
      return `<!DOCTYPE html>
<html>
<head><style>body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f8fafc; color: #475569; }</style></head>
<body>
  <div style="text-align: center; max-width: 400px; padding: 24px; background: white; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
    <div style="font-size: 28px; margin-bottom: 12px;">📋</div>
    <h3 style="margin: 0 0 8px 0; color: #0f172a; font-size: 16px; font-weight: 700;">Contract Draft In Progress</h3>
    <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #64748b;">${msg}</p>
  </div>
</body>
</html>`;
    }
  }, [data, activePage]);

  // Scale calculation to fit container cleanly (identical to Estimate Studio PreviewPanel)
  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        const availWidth = Math.max(100, width - 32);
        const availHeight = Math.max(100, height - 56);
        const newScale = Math.min(availWidth / PAGE_WIDTH_PX, availHeight / PAGE_HEIGHT_PX);
        setScale(newScale);
      }
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    window.addEventListener('resize', updateScale);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateScale);
    };
  }, []);

  return (
    <div
      className="w-full h-full bg-slate-200/70 flex flex-col items-center justify-center relative overflow-hidden select-none"
      ref={containerRef}
    >
      {/* Scaled Letter Canvas Sheet */}
      <div
        className="relative shadow-2xl rounded-sm bg-white overflow-hidden"
        style={{
          width: `${Math.round(PAGE_WIDTH_PX * scale)}px`,
          height: `${Math.round(PAGE_HEIGHT_PX * scale)}px`,
        }}
      >
        <div
          className="absolute top-0 left-0 bg-white"
          style={{
            width: `${PAGE_WIDTH_PX}px`,
            height: `${PAGE_HEIGHT_PX}px`,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
          <iframe
            srcDoc={previewHtml}
            className="w-full h-full border-0 overflow-hidden bg-white"
            title="Contract Document Preview"
            scrolling="no"
            sandbox=""
          />
        </div>
      </div>

      {/* Bottom pagination & navigation pill bar (clean 11-page selector) */}
      <div className="absolute bottom-3 flex items-center gap-1.5 bg-white/95 backdrop-blur-xs px-3 py-1 rounded-full shadow-md text-xs text-slate-700 font-medium border border-slate-200 max-w-[95%] overflow-x-auto">
        <button
          onClick={() => setActivePage((p) => Math.max(1, p - 1))}
          disabled={activePage <= 1}
          className="p-1 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Previous Page"
        >
          <ChevronLeft size={14} />
        </button>

        <span className="text-[11px] font-bold text-slate-600 tracking-wider uppercase whitespace-nowrap px-1">
          Page {activePage} of {TOTAL_PAGES}
        </span>

        <div className="flex items-center gap-1 mx-1">
          {Array.from({ length: TOTAL_PAGES }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setActivePage(p)}
              className={`w-5 h-5 rounded-full text-[10px] font-bold transition-all ${
                activePage === p
                  ? 'bg-[#1a5ba5] text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
              }`}
              title={`Jump to Page ${p}`}
            >
              {p}
            </button>
          ))}
        </div>

        <button
          onClick={() => setActivePage((p) => Math.min(TOTAL_PAGES, p + 1))}
          disabled={activePage >= TOTAL_PAGES}
          className="p-1 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Next Page"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

export default ContractPreviewPanel;
