import React, { useState } from 'react';
import {
  FileDown,
  ExternalLink,
  Send,
  Sparkles,
  CheckCircle2,
  Shield,
  Clock,
  ZoomIn,
  ZoomOut,
  Maximize2,
  FileText,
  Layers,
  MapPin,
  Phone,
  Mail,
  Home,
} from 'lucide-react';
import { MultiOptionProposalData, TemplateKey } from '@/types/estimateTypes';
import { api, API_ORIGIN } from '@/lib/api';
import { BrandLogo } from '@/components/common/BrandLogo';
import { useToast } from '@/context/ToastContext';

interface EstimateProposalPreviewProps {
  proposalData: MultiOptionProposalData;
  templateKey?: TemplateKey;
  initialZoom?: number;
  compactToolbar?: boolean;
  pageView?: 'page1' | 'page2';
  onPageViewChange?: (page: 'page1' | 'page2') => void;
  onGenerateSuccess?: (url: string) => void;
  onSendToClient?: () => void;
  className?: string;
}

export function EstimateProposalPreview({
  proposalData,
  templateKey = 'multi_option_proposal',
  initialZoom = 0.70,
  compactToolbar = false,
  pageView,
  onPageViewChange,
  onGenerateSuccess,
  onSendToClient,
  className,
}: EstimateProposalPreviewProps) {
  const { toast } = useToast();
  const [internalPageView, setInternalPageView] = useState<'page1' | 'page2'>('page1');
  const activePageView = pageView !== undefined ? pageView : internalPageView;

  const handleSetPage = (page: 'page1' | 'page2') => {
    setInternalPageView(page);
    if (onPageViewChange) onPageViewChange(page);
  };

  const [generating, setGenerating] = useState(false);
  const [lastPdfUrl, setLastPdfUrl] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(initialZoom);

  const handleGeneratePdf = async () => {
    try {
      setGenerating(true);
      const res = await api.generateEstimatePdf({
        templateKey,
        proposalData: {
          proposal_date: proposalData.proposalDate,
          customer_name: proposalData.customerName,
          customer_phone: proposalData.customerPhone,
          customer_email: proposalData.customerEmail,
          customer_address: proposalData.customerAddress,
          customer_city: proposalData.customerCity,
          roof_squares: proposalData.roofSquares,
          roof_pitch: proposalData.roofPitch,
          stories: proposalData.stories,
          hero_photo_url: proposalData.heroPhotoUrl,
          option_a: {
            title: proposalData.optionA.title,
            subtitle: proposalData.optionA.subtitle,
            lock_in_price: proposalData.optionA.lockInPrice,
            standard_price: proposalData.optionA.standardPrice,
            warranty: proposalData.optionA.warranty,
            scope_items: proposalData.optionA.scopeItems,
          },
          option_b: {
            title: proposalData.optionB.title,
            subtitle: proposalData.optionB.subtitle,
            lock_in_price: proposalData.optionB.lockInPrice,
            standard_price: proposalData.optionB.standardPrice,
            warranty: proposalData.optionB.warranty,
            scope_items: proposalData.optionB.scopeItems,
          },
          addon_1: {
            title: proposalData.addon1.title,
            description: proposalData.addon1.description,
            price: proposalData.addon1.price,
          },
          addon_2: {
            title: proposalData.addon2.title,
            description: proposalData.addon2.description,
            price: proposalData.addon2.price,
          },
          lock_in_days: proposalData.lockInDays || 20,
        },
      });

      if (res && res.pdfUrl) {
        const fullUrl = res.pdfUrl.startsWith('http') ? res.pdfUrl : `${API_ORIGIN}${res.pdfUrl}`;
        setLastPdfUrl(fullUrl);
        if (onGenerateSuccess) onGenerateSuccess(fullUrl);

        // Trigger automatic browser download
        const a = document.createElement('a');
        a.href = fullUrl;
        a.download = res.filename || 'RiseUp_Roofing_2Page_Proposal.pdf';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast.success('Proposal PDF generated and downloading');
      }
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      toast.error('PDF generation error. Please ensure backend server is reachable.');
    } finally {
      setGenerating(false);
    }
  };

  // Reusable Page Header
  const renderHeader = (dateLabel: string) => (
    <>
      {/* Top Navy Strip */}
      <div className="bg-[#091b36] text-white text-center text-[8.5px] font-extrabold tracking-[0.22em] uppercase py-1 rounded mb-2.5">
        ROOFING &nbsp;|&nbsp; SOLAR &nbsp;|&nbsp; GENERAL CONSTRUCTION
      </div>

      {/* Header Row */}
      <div className="flex items-center justify-between gap-3 mb-2.5">
        {/* Logo */}
        <div className="w-[195px] shrink-0">
          <BrandLogo size="custom" className="h-9 w-auto" themeMode="light" showTagline={true} />
        </div>

        {/* Oceanside Company Info */}
        <div className="text-left text-[8px] text-slate-600 leading-tight border-l-2 border-slate-200 pl-3 flex-1">
          <div className="font-black text-[11px] text-[#091b36] mb-0.5">
            Rise Up Roofing &amp; Construction
          </div>
          <div>2182 S El Camino Real, Ste 202, Oceanside, CA 92054</div>
          <div>(760) 622 - 1230 &bull; marc@riseuprac.com &bull; https://riseuprac.com</div>
        </div>

        {/* Date Ribbon */}
        <div className="shrink-0">
          <div
            style={{ transform: 'skewX(-14deg)' }}
            className="bg-gradient-to-br from-sky-600 to-sky-800 rounded px-4 py-1.5 shadow-md border border-white/40 text-center"
          >
            <div style={{ transform: 'skewX(14deg)' }} className="text-white">
              <div className="text-[7.5px] font-extrabold tracking-widest uppercase opacity-95">
                {dateLabel}
              </div>
              <div className="text-sm font-black tracking-tight">{proposalData.proposalDate}</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  // Reusable Page Footer
  const renderFooter = (showLegalText = false) => (
    <div className="mt-auto pt-2">
      <div className="border-1.5 border-[#091b36] rounded-lg overflow-hidden">
        <div className="bg-[#091b36] text-white p-2 text-center">
          <div className="text-[7.5px] font-black tracking-widest uppercase mb-1">
            WHY CHOOSE <span className="text-sky-400">RISE UP?</span>
          </div>
          <div className="flex justify-around items-center text-[6.5px] font-black uppercase tracking-wider text-slate-200">
            <span>&bull; Licensed &amp; Insured</span>
            <span>&bull; Quality Workmanship</span>
            <span>&bull; Trusted by Neighbors</span>
            <span>&bull; On Time &amp; On Budget</span>
          </div>
        </div>

        <div className="bg-white px-3 py-1.5 flex items-center justify-between text-[7.5px] font-extrabold text-slate-800 border-t border-slate-200">
          <span className="text-rose-600 font-black flex items-center gap-1">
            <span className="w-2 h-2 bg-rose-600 rounded-xs inline-block" />
            Owens Corning Preferred Contractor
          </span>
          <span className="text-amber-700 font-black">Veteran Owned</span>
          <span className="text-slate-900 font-black flex items-center gap-1">
            <span className="px-1 py-0.2 rounded bg-slate-900 text-white text-[6px]">BBB</span>
            A+ Accredited
          </span>
          <span className="font-black text-[#091b36]">LICENSE #1096492 B/C39/C46</span>
        </div>
      </div>

      {showLegalText && (
        <div className="text-center text-[6px] text-slate-500 font-semibold mt-1">
          Pricing valid for 30 days. Any additional work outside the scope above will be discussed and approved before proceeding.
        </div>
      )}
    </div>
  );

  return (
    <div className={`flex flex-col h-full min-h-0 ${className || ''}`}>
      {/* ── Toolbar ── */}
      <div className="light-glass-panel dark:bg-slate-900/60 dark:border-white/10 rounded-2xl px-4 py-2 flex items-center justify-between gap-3 shadow-xs border border-white/85 shrink-0 mb-2.5">
        <div className="flex items-center gap-2">
          {/* Minimal Page Switcher / Indicator */}
          <div className="flex items-center gap-1 bg-white/90 dark:bg-slate-800/80 p-0.5 rounded-xl border border-slate-200 dark:border-white/10 shadow-2xs">
            <button
              type="button"
              onClick={() => handleSetPage('page1')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activePageView === 'page1'
                  ? 'bg-slate-900 dark:bg-[#1878B8] text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:dark:text-white hover:bg-slate-100 hover:dark:bg-slate-700/60'
              }`}
            >
              <FileText size={12} className={activePageView === 'page1' ? 'text-amber-400 dark:text-amber-300' : ''} />
              <span>Page 1: Cover</span>
            </button>
            <button
              type="button"
              onClick={() => handleSetPage('page2')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activePageView === 'page2'
                  ? 'bg-slate-900 dark:bg-[#1878B8] text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:dark:text-white hover:bg-slate-100 hover:dark:bg-slate-700/60'
              }`}
            >
              <FileText size={12} className={activePageView === 'page2' ? 'text-amber-400 dark:text-amber-300' : ''} />
              <span>Page 2: Options &amp; Pricing</span>
            </button>
          </div>

          <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-[10px] font-bold text-slate-500 dark:text-slate-400">
            Real-Time PDF Canvas
          </span>
        </div>

        {/* Minimal Zoom Controls Only */}
        <div className="flex items-center gap-1 bg-white/80 dark:bg-slate-800/80 p-0.5 rounded-xl border border-slate-200 dark:border-white/10">
          <button
            type="button"
            onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.1))}
            className="p-1 rounded-lg hover:bg-slate-100 hover:dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-pointer"
            title="Zoom out"
          >
            <ZoomOut size={12} />
          </button>
          <span className="text-[10px] font-black text-slate-700 dark:text-slate-200 px-1">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoomLevel((z) => Math.min(1.2, z + 0.1))}
            className="p-1 rounded-lg hover:bg-slate-100 hover:dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-pointer"
            title="Zoom in"
          >
            <ZoomIn size={12} />
          </button>
        </div>
      </div>

      {/* ── Document Canvas ── */}
      <div className="flex-1 min-h-0 flex flex-col items-center overflow-y-auto overflow-x-hidden p-4 bg-slate-200/70 dark:bg-slate-950/80 rounded-3xl border border-slate-300/70 dark:border-white/10 shadow-inner custom-scrollbar">
        {/* ========================================================
            PAGE 1: COVER PAGE (Exact match to media_1789808978236.png)
            ======================================================== */}
        {activePageView === 'page1' && (
          <div className="flex flex-col items-center">
            <div className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sky-500" />
              <span>Page 1: Official Proposal Cover</span>
            </div>

            <div
              style={{
                width: '816px',
                height: '1056px',
                transform: `scale(${zoomLevel})`,
                transformOrigin: 'top center',
                marginBottom: `${(zoomLevel - 1) * 1056}px`,
              }}
              className="bg-white rounded shadow-2xl p-7 select-none transition-transform duration-150 border border-slate-200 text-slate-800 flex flex-col justify-between"
            >
              <div>
                {renderHeader('ESTIMATE DATE')}

                {/* Hero House Photo */}
                <div className="w-full h-80 rounded-lg overflow-hidden border-2 border-slate-300 shadow-md mb-4 bg-slate-100">
                  <img
                    src={proposalData.heroPhotoUrl}
                    alt="Featured Property"
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Title Block */}
                <div className="text-center mb-4">
                  <div className="text-4xl font-black text-[#091b36] tracking-tight uppercase leading-none">
                    ROOFING <span className="text-sky-600">ESTIMATE</span>
                  </div>
                  <div className="flex items-center justify-center gap-3 mt-1.5">
                    <span className="h-0.5 w-12 bg-sky-400" />
                    <span className="text-[9.5px] font-bold italic tracking-[0.28em] text-slate-500 uppercase">
                      LABOR &amp; MATERIAL ESTIMATE
                    </span>
                    <span className="h-0.5 w-12 bg-sky-400" />
                  </div>
                </div>

                {/* Floating Specs Card alongside Tagline */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  {/* Floating Card */}
                  <div className="w-[340px] bg-white rounded-lg p-3.5 shadow-lg border-1.5 border-slate-200 border-l-4 border-l-sky-600 space-y-2">
                    <div className="flex items-center gap-2.5 pb-1.5 border-b border-slate-100">
                      <div className="w-6 h-6 rounded bg-[#091b36] text-white flex items-center justify-center shrink-0">
                        <MapPin size={12} />
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-[8px] font-black text-[#091b36] uppercase tracking-wide">
                          PROPERTY:
                        </span>
                        <span className="text-[9px] font-bold text-slate-700">
                          {[proposalData.customerAddress, proposalData.customerCity].filter(Boolean).join(', ') || 'Address not provided'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 pb-1.5 border-b border-slate-100">
                      <div className="w-6 h-6 rounded bg-[#091b36] text-white flex items-center justify-center shrink-0">
                        <Phone size={12} />
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-[8px] font-black text-[#091b36] uppercase tracking-wide">
                          PHONE:
                        </span>
                        <span className="text-[9px] font-bold text-slate-700">
                          {proposalData.customerPhone || 'No phone on file'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 pb-1.5 border-b border-slate-100">
                      <div className="w-6 h-6 rounded bg-[#091b36] text-white flex items-center justify-center shrink-0">
                        <Mail size={12} />
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-[8px] font-black text-[#091b36] uppercase tracking-wide">
                          EMAIL:
                        </span>
                        <span className="text-[9px] font-bold text-slate-700">
                          {proposalData.customerEmail || 'No email on file'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded bg-[#091b36] text-white flex items-center justify-center shrink-0">
                        <Home size={12} />
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-[8px] font-black text-[#091b36] uppercase tracking-wide">
                          SPECS:
                        </span>
                        <span className="text-[9px] font-bold text-slate-700">
                          {proposalData.roofSquares} SQ ({proposalData.roofPitch}) &bull; {proposalData.stories}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Tagline Column */}
                  <div className="flex-1 flex flex-col justify-center py-2 px-1">
                    <div className="text-xs font-black italic text-sky-700 uppercase tracking-wider leading-snug">
                      /// BUILDING STRONGER, SAFER &amp; LONGER LASTING ROOFS
                    </div>
                    <div className="text-[8.5px] text-slate-600 mt-1.5 leading-relaxed">
                      Prepared exclusively for <strong>{proposalData.customerName}</strong>. Comprehensive specifications, scope of work, warranty coverage, and dual-tier investment options detailed on Page 2.
                    </div>
                  </div>
                </div>
              </div>

              {renderFooter(false)}
            </div>
          </div>
        )}

        {/* ========================================================
            PAGE 2: OPTIONS & PRICING (Exact match to media_1789808889729.png)
            ======================================================== */}
        {activePageView === 'page2' && (
          <div className="flex flex-col items-center">
            <div className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Page 2: Dual Options, Add-Ons &amp; Pricing Lock-In</span>
            </div>

            <div
              style={{
                width: '816px',
                height: '1056px',
                transform: `scale(${zoomLevel})`,
                transformOrigin: 'top center',
                marginBottom: `${(zoomLevel - 1) * 1056}px`,
              }}
              className="bg-white rounded shadow-2xl p-6 select-none transition-transform duration-150 border border-slate-200 text-slate-800 flex flex-col justify-between"
            >
              <div>
                {renderHeader('PROPOSAL DATE')}

                {/* Hero Overview Row */}
                <div className="flex gap-3 mb-2.5">
                  <div className="flex-[1.2] border-1.5 border-sky-400 bg-gradient-to-b from-sky-50/70 to-white rounded-lg p-2.5 flex flex-col justify-between">
                    <div>
                      <div className="text-base font-black text-[#091b36] tracking-tight uppercase leading-tight">
                        ROOFING <span className="text-sky-600">ESTIMATE OPTIONS</span>
                      </div>
                      <div className="text-[8px] font-bold italic tracking-widest text-sky-700 uppercase mb-1">
                        LABOR &amp; MATERIAL ESTIMATE
                      </div>
                      <div className="text-[7.5px] text-slate-600 leading-snug">
                        Thank you for considering Rise Up Roofing &amp; Construction. We are pleased to provide the following roofing solutions tailored to your property.
                      </div>
                    </div>
                    <div className="mt-1.5 inline-flex flex-wrap items-center gap-1.5 bg-sky-500/10 border border-sky-500/30 px-2 py-0.5 rounded text-[7.5px] font-bold text-sky-800">
                      <span><strong>Homeowner:</strong> {proposalData.customerName}</span>
                      <span>&bull;</span>
                      <span>{proposalData.customerAddress}, {proposalData.customerCity}</span>
                      <span>&bull;</span>
                      <span>{proposalData.roofSquares} SQ ({proposalData.roofPitch})</span>
                    </div>
                  </div>

                  <div className="flex-[0.8] rounded-lg overflow-hidden border border-slate-300 max-h-24 bg-slate-100">
                    <img
                      src={proposalData.heroPhotoUrl}
                      alt="House"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                {/* Dual Options Grid */}
                <div className="grid grid-cols-2 gap-2.5 mb-2.5">
                  {/* OPTION A */}
                  <div className="border-2 border-sky-600 rounded-lg overflow-hidden bg-white shadow-xs flex flex-col">
                    <div className="bg-[#091b36] text-white p-2 flex items-center justify-between border-b-2 border-sky-600">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded bg-sky-600 text-white font-black text-xs flex items-center justify-center">
                          A
                        </div>
                        <div>
                          <div className="text-[9px] font-black uppercase leading-tight">
                            {proposalData.optionA.title}
                          </div>
                          <div className="text-[6.5px] font-bold text-sky-300 uppercase tracking-wider">
                            {proposalData.optionA.subtitle}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[6px] font-extrabold text-sky-400 uppercase block">
                          INCLUDED UNDERLAYMENT
                        </span>
                        <span className="bg-sky-600 text-white px-2 py-0.5 rounded text-sm font-black">
                          ${proposalData.optionA.lockInPrice.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="p-2 flex-grow">
                      <div className="text-[7.5px] font-black uppercase text-[#091b36] border-b border-slate-200 pb-0.5 mb-1.5">
                        SCOPE OF WORK
                      </div>
                      <div className="space-y-1">
                        {proposalData.optionA.scopeItems.slice(0, 10).map((item, idx) => (
                          <div key={idx} className="flex items-start gap-1.5 text-[7px] text-slate-700 leading-tight">
                            <CheckCircle2 size={8.5} className="text-sky-600 shrink-0 mt-0.5" />
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-slate-50 border-t border-slate-200 px-2 py-1 flex items-center gap-1.5 text-[6.5px] font-extrabold text-sky-800 uppercase tracking-wide">
                      <Shield size={9} className="text-sky-600" />
                      <span>WARRANTY: &nbsp; {proposalData.optionA.warranty}</span>
                    </div>
                  </div>

                  {/* OPTION B */}
                  <div className="border-2 border-sky-600 rounded-lg overflow-hidden bg-white shadow-xs flex flex-col">
                    <div className="bg-[#091b36] text-white p-2 flex items-center justify-between border-b-2 border-sky-600">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded bg-sky-600 text-white font-black text-xs flex items-center justify-center">
                          B
                        </div>
                        <div>
                          <div className="text-[9px] font-black uppercase leading-tight">
                            {proposalData.optionB.title}
                          </div>
                          <div className="text-[6.5px] font-bold text-sky-300 uppercase tracking-wider">
                            {proposalData.optionB.subtitle}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[6px] font-extrabold text-sky-400 uppercase block">
                          INCLUDED UNDERLAYMENT
                        </span>
                        <span className="bg-sky-600 text-white px-2 py-0.5 rounded text-sm font-black">
                          ${proposalData.optionB.lockInPrice.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="p-2 flex-grow">
                      <div className="text-[7.5px] font-black uppercase text-[#091b36] border-b border-slate-200 pb-0.5 mb-1.5">
                        SCOPE OF WORK
                      </div>
                      <div className="space-y-1">
                        {proposalData.optionB.scopeItems.slice(0, 10).map((item, idx) => (
                          <div key={idx} className="flex items-start gap-1.5 text-[7px] text-slate-700 leading-tight">
                            <CheckCircle2 size={8.5} className="text-sky-600 shrink-0 mt-0.5" />
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-slate-50 border-t border-slate-200 px-2 py-1 flex items-center gap-1.5 text-[6.5px] font-extrabold text-sky-800 uppercase tracking-wide">
                      <Shield size={9} className="text-sky-600" />
                      <span>WARRANTY: &nbsp; {proposalData.optionB.warranty}</span>
                    </div>
                  </div>
                </div>

                {/* ADD-ON 1 (Photo 2) */}
                <div className="border-1.5 border-sky-600 rounded-lg p-2 bg-sky-50/50 flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2.5 flex-1">
                    <div className="w-13 h-10 rounded-md overflow-hidden border border-slate-300 bg-white flex items-center justify-center shrink-0 shadow-2xs">
                      <img
                        src={proposalData.addon1.imageUrl || '/images/estimates/underlayment_roll.jpg'}
                        alt="Photo 2: TileSeal Underlayment Roll"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <div className="text-[8px] font-black text-sky-800 uppercase leading-tight">
                        {proposalData.addon1.title}
                      </div>
                      <div className="text-[6.8px] text-slate-600 leading-snug">
                        {proposalData.addon1.description}
                      </div>
                    </div>
                  </div>
                  <div
                    style={{ transform: 'skewX(-14deg)' }}
                    className="bg-gradient-to-r from-sky-600 to-sky-800 px-3 py-1 rounded text-white text-center shadow-xs"
                  >
                    <div style={{ transform: 'skewX(14deg)' }}>
                      <div className="text-[6px] font-extrabold uppercase">ADD-ON PRICE</div>
                      <div className="text-xs font-black">+${proposalData.addon1.price.toLocaleString()}</div>
                    </div>
                  </div>
                </div>

                {/* SPECIAL PRICING LOCK-IN TABLE */}
                <div className="border-1.5 border-sky-600 rounded-lg overflow-hidden bg-white mb-2">
                  <div className="bg-[#091b36] text-white text-center text-[8.5px] font-black tracking-wider uppercase py-1">
                    SPECIAL PRICING &mdash; LOCK IN YOUR SAVINGS!
                  </div>
                  <div className="grid grid-cols-2 gap-3 p-2 bg-slate-50">
                    <div>
                      <div className="text-[6.8px] font-black text-sky-800 text-center uppercase mb-1">
                        OPTION A &mdash; {proposalData.optionA.title}
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        <div className="bg-sky-50 border border-sky-400 rounded p-1.5 text-center flex-1">
                          <div className="text-[5.8px] font-extrabold text-slate-600 uppercase">LOCK IN PRICE</div>
                          <div className="text-[5.5px] font-bold text-sky-700 uppercase">SCHEDULE WITHIN 20 DAYS</div>
                          <div className="text-[11.5px] font-black text-sky-700 mt-0.5">
                            ${proposalData.optionA.lockInPrice.toLocaleString()}
                          </div>
                        </div>
                        <span className="font-black text-slate-700">&rarr;</span>
                        <div className="bg-white border border-slate-300 rounded p-1.5 text-center flex-1">
                          <div className="text-[5.8px] font-extrabold text-slate-500 uppercase">STANDARD PRICE</div>
                          <div className="text-[5.5px] font-bold text-slate-400 uppercase">AFTER 20 DAY LOCK-IN</div>
                          <div className="text-[11.5px] font-black text-slate-700 mt-0.5">
                            ${proposalData.optionA.standardPrice.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="text-[6.8px] font-black text-sky-800 text-center uppercase mb-1">
                        OPTION B &mdash; {proposalData.optionB.title}
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        <div className="bg-sky-50 border border-sky-400 rounded p-1.5 text-center flex-1">
                          <div className="text-[5.8px] font-extrabold text-slate-600 uppercase">LOCK IN PRICE</div>
                          <div className="text-[5.5px] font-bold text-sky-700 uppercase">SCHEDULE WITHIN 20 DAYS</div>
                          <div className="text-[11.5px] font-black text-sky-700 mt-0.5">
                            ${proposalData.optionB.lockInPrice.toLocaleString()}
                          </div>
                        </div>
                        <span className="font-black text-slate-700">&rarr;</span>
                        <div className="bg-white border border-slate-300 rounded p-1.5 text-center flex-1">
                          <div className="text-[5.8px] font-extrabold text-slate-500 uppercase">STANDARD PRICE</div>
                          <div className="text-[5.5px] font-bold text-slate-400 uppercase">AFTER 20 DAY LOCK-IN</div>
                          <div className="text-[11.5px] font-black text-slate-700 mt-0.5">
                            ${proposalData.optionB.standardPrice.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border-t border-slate-200 px-3 py-1 flex items-center gap-1.5 text-[6.5px] text-slate-600 font-semibold">
                    <Clock size={8.5} className="text-sky-600" />
                    <span>
                      <strong>IMPORTANT:</strong> These special &quot;Lock-In&quot; prices are valid when you schedule within {proposalData.lockInDays || 20} days from the date of this proposal. Work does not need to be completed within the 20-day period.
                    </span>
                  </div>
                </div>

                {/* ADD-ON 2 (Photo 3) */}
                <div className="border-1.5 border-sky-600 rounded-lg p-2 bg-sky-50/50 flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2.5 flex-1">
                    <div className="w-13 h-10 rounded-md overflow-hidden border border-slate-300 bg-white flex items-center justify-center shrink-0 shadow-2xs">
                      <img
                        src={proposalData.addon2.imageUrl || '/images/estimates/pressure_washer.jpg'}
                        alt="Photo 3: Pressure Washing Equipment"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <div className="text-[8px] font-black text-sky-800 uppercase leading-tight">
                        {proposalData.addon2.title}
                      </div>
                      <div className="text-[6.8px] text-slate-600 leading-snug">
                        {proposalData.addon2.description}
                      </div>
                    </div>
                  </div>
                  <div
                    style={{ transform: 'skewX(-14deg)' }}
                    className="bg-gradient-to-r from-sky-600 to-sky-800 px-3 py-1 rounded text-white text-center shadow-xs"
                  >
                    <div style={{ transform: 'skewX(14deg)' }}>
                      <div className="text-[6px] font-extrabold uppercase">ADD-ON PRICE</div>
                      <div className="text-xs font-black">+${proposalData.addon2.price.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              </div>

              {renderFooter(true)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
