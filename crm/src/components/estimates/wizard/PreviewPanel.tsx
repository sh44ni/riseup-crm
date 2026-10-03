import React, { useEffect, useRef, useState, useCallback } from 'react';
import { TwoOptionsEstimate } from '@/types/estimateContractTypes';
import { openapiClient } from '@/shared/api/client';

interface PreviewPanelProps {
  estimateId: string | null;
  data: TwoOptionsEstimate;
  currentStep: number;
  previewPage: 1 | 2;
  lastSaved: Date | null;
  initError?: string | null;
}

// Estimate Page dimensions at 96 DPI: 8.5in x 11in ≈ 816px x 1056px
const PAGE_WIDTH_PX = 816;
const PAGE_HEIGHT_PX = 1056;

export function PreviewPanel({ estimateId, data, currentStep, previewPage, lastSaved, initError }: PreviewPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [scale, setScale] = useState(0.5);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const initialLoadRef = useRef(false);

  // Immediate live sync of photo transforms inside preview iframe (0ms lag while dragging/zooming)
  useEffect(() => {
    try {
      const doc = iframeRef.current?.contentDocument;
      if (!doc) return;

      // Cover photo (Page 1)
      const coverImg = doc.querySelector<HTMLImageElement>('.c-photo .photo-rendered');
      if (coverImg && data.photo1) {
        const x = data.photo1.x ?? data.photo1.position?.x ?? 0;
        const y = data.photo1.y ?? data.photo1.position?.y ?? 0;
        const zoom = data.photo1.zoom ?? 1;
        coverImg.style.transform = `translate(${x}%, ${y}%) scale(${zoom})`;
      }

      // Page 2 overview photo
      const p2Img = doc.querySelector<HTMLImageElement>('.p-photo .photo-rendered');
      if (p2Img) {
        const p2Asset = data.photo2?.mode === 'upload' ? data.photo2.asset : data.photo1;
        if (p2Asset) {
          const x = p2Asset.x ?? p2Asset.position?.x ?? 0;
          const y = p2Asset.y ?? p2Asset.position?.y ?? 0;
          const zoom = p2Asset.zoom ?? 1;
          p2Img.style.transform = `translate(${x}%, ${y}%) scale(${zoom})`;
        }
      }
    } catch {
      // Cross-origin / silent handle
    }
  }, [data.photo1, data.photo2]);

  const fetchPreview = useCallback(async () => {
    if (!estimateId) return;
    setLoading(true);
    setRenderError(null);
    try {
      const { data: html, error, response } = await openapiClient.GET(
        '/api/admin/estimates/{estimate_id}/render-html',
        {
          params: {
            path: { estimate_id: Number(estimateId) },
            query: { page: previewPage },
          },
          parseAs: 'text',
        }
      );
      if (response?.ok && html) {
        setPreviewHtml(html);
      } else {
        const errText = error ? JSON.stringify(error) : '';
        setRenderError(`Preview failed (${response?.status || 'Error'})${errText ? `: ${errText.slice(0, 120)}` : ''}`);
      }
    } catch (err: any) {
      console.error('Preview fetch failed', err);
      setRenderError(err?.message || 'Could not load preview.');
    } finally {
      setLoading(false);
    }
  }, [estimateId, previewPage]);

  // Initial fetch as soon as estimateId is available or page changes
  useEffect(() => {
    if (estimateId) {
      fetchPreview();
      initialLoadRef.current = true;
    }
  }, [estimateId, previewPage, fetchPreview]);

  // Refresh preview after autosave completes (lastSaved updates)
  useEffect(() => {
    if (!estimateId || !lastSaved || !initialLoadRef.current) return;
    fetchPreview();
  }, [lastSaved, estimateId, previewPage]);

  // Scale calculation to fit container cleanly
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
    <div className="w-full h-full bg-slate-200/70 flex flex-col items-center justify-center relative overflow-hidden select-none" ref={containerRef}>
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
          {previewHtml ? (
            <iframe 
              ref={iframeRef}
              srcDoc={previewHtml}
              className="w-full h-full border-0 overflow-hidden bg-white"
              title="Estimate PDF Preview"
              scrolling="no"
              sandbox="allow-same-origin"
            />
          ) : estimateId ? (
            <div className="w-full h-full flex items-center justify-center border border-slate-200 text-slate-400 bg-white">
              {renderError ? (
                <div className="text-center p-8 max-w-xs">
                  <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-amber-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                  </div>
                  <p className="font-semibold text-sm mb-1 text-amber-700">Preview unavailable</p>
                  <p className="text-xs text-slate-500 leading-relaxed">{renderError}</p>
                </div>
              ) : (
                <div className="text-center p-8">
                  <div className="w-8 h-8 mx-auto mb-3 rounded-full border-2 border-[#1878B8] border-t-transparent animate-spin" />
                  <p className="text-sm font-medium text-slate-600">Rendering Preview...</p>
                </div>
              )}
            </div>
          ) : initError ? (
            <div className="w-full h-full flex items-center justify-center border-2 border-dashed border-red-200 text-slate-400 bg-white">
              <div className="text-center p-8 max-w-xs">
                <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-red-50 flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                </div>
                <p className="font-semibold text-sm mb-1 text-red-600">Failed to initialize draft</p>
                <p className="text-xs text-slate-500 leading-relaxed">{initError}</p>
              </div>
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center border-2 border-dashed border-slate-200 text-slate-400 bg-white">
              <div className="text-center p-8">
                <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-slate-50 flex items-center justify-center">
                  <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                </div>
                <p className="font-semibold text-sm mb-1 text-slate-600">Preview will appear here</p>
                <p className="text-xs text-slate-400">Fill in client details to generate the estimate draft</p>
              </div>
            </div>
          )}
        </div>
      </div>
      {loading && previewHtml && (
        <div className="absolute top-3 right-3 px-3 py-1.5 rounded-full bg-white/95 shadow-md text-[11px] font-bold text-[#1a5ba5] flex items-center gap-1.5 backdrop-blur-sm border border-slate-100">
          <div className="w-2 h-2 rounded-full bg-[#1a5ba5] animate-ping" />
          Updating preview...
        </div>
      )}
      <div className="absolute bottom-3 bg-white/90 backdrop-blur-xs px-3 py-0.5 rounded-full shadow-xs text-[10px] text-slate-600 font-bold tracking-wider uppercase border border-slate-200/80">
        Page {previewPage} of 2 &bull; Estimate
      </div>
    </div>
  );
}
