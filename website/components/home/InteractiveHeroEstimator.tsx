'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { Icon, type IconName } from '@/components/shared/Icon';
import { cn, PHONE_HREF, PHONE_NUMBER } from '@/lib/utils';
import { calculateEstimate, type EstimatorService, type EstimatorPricingRule } from '@/lib/estimator';

type ServiceId = 'residential' | 'repair' | 'commercial' | 'solar';

// Initial fallback values match Phase 0 lossless seed verbatim
const INITIAL_SERVICES: EstimatorService[] = [
  {
    id: 1,
    slug: 'residential',
    name: 'Tile / Shingle Roof',
    shortLabel: 'Tile / Shingle',
    iconKey: 'home',
    badgeLabel: 'Popular',
    sortOrder: 1,
    isActive: true,
    pricing: {
      pricePerSqftLow: 4.00,
      pricePerSqftHigh: 6.20,
      baseFeeLow: 500,
      baseFeeHigh: 950,
      minSqft: 800,
      maxSqft: 8000,
      aprAvailable: true,
      financingApr: 0,
      financingTermMonths: 60,
    },
    presets: [
      { id: 1, label: '< 2,000 sq ft', sqftValue: 1750, sortOrder: 1 },
      { id: 2, label: '2,000 – 3,500 sq ft', sqftValue: 2750, sortOrder: 2 },
      { id: 3, label: '3,500+ sq ft', sqftValue: 4250, sortOrder: 3 },
    ],
  },
  {
    id: 2,
    slug: 'repair',
    name: 'Leak & Tile Repair',
    shortLabel: 'Leak & Repair',
    iconKey: 'wrench',
    badgeLabel: 'Same-Day',
    sortOrder: 2,
    isActive: true,
    pricing: {
      pricePerSqftLow: 0.40,
      pricePerSqftHigh: 0.80,
      baseFeeLow: 100,
      baseFeeHigh: 600,
      minSqft: 500,
      maxSqft: 8000,
      aprAvailable: true,
      financingApr: 0,
      financingTermMonths: 18,
    },
    presets: [
      { id: 1, label: '< 2,000 sq ft', sqftValue: 1750, sortOrder: 1 },
      { id: 2, label: '2,000 – 3,500 sq ft', sqftValue: 2750, sortOrder: 2 },
      { id: 3, label: '3,500+ sq ft', sqftValue: 4250, sortOrder: 3 },
    ],
  },
  {
    id: 3,
    slug: 'commercial',
    name: 'Commercial Flat Roof',
    shortLabel: 'Commercial Flat',
    iconKey: 'building',
    badgeLabel: 'TPO / BUR',
    sortOrder: 3,
    isActive: true,
    pricing: {
      pricePerSqftLow: 5.00,
      pricePerSqftHigh: 8.00,
      baseFeeLow: 2250,
      baseFeeHigh: 4000,
      minSqft: 1000,
      maxSqft: 15000,
      aprAvailable: true,
      financingApr: 0,
      financingTermMonths: 60,
    },
    presets: [
      { id: 1, label: '< 2,000 sq ft', sqftValue: 1750, sortOrder: 1 },
      { id: 2, label: '2,000 – 3,500 sq ft', sqftValue: 2750, sortOrder: 2 },
      { id: 3, label: '3,500+ sq ft', sqftValue: 4250, sortOrder: 3 },
    ],
  },
  {
    id: 4,
    slug: 'solar',
    name: 'Solar + Roofing',
    shortLabel: 'Solar + Roof',
    iconKey: 'sun',
    badgeLabel: 'Save 30%',
    sortOrder: 4,
    isActive: true,
    pricing: {
      pricePerSqftLow: 7.00,
      pricePerSqftHigh: 10.00,
      baseFeeLow: 2750,
      baseFeeHigh: 4500,
      minSqft: 800,
      maxSqft: 8000,
      aprAvailable: true,
      financingApr: 0,
      financingTermMonths: 120,
    },
    presets: [
      { id: 1, label: '< 2,000 sq ft', sqftValue: 1750, sortOrder: 1 },
      { id: 2, label: '2,000 – 3,500 sq ft', sqftValue: 2750, sortOrder: 2 },
      { id: 3, label: '3,500+ sq ft', sqftValue: 4250, sortOrder: 3 },
    ],
  },
];

const SERVICE_STYLING: Record<string, { light: string; dark: string }> = {
  residential: {
    light: 'bg-sky-50 text-sky-600 border border-sky-100',
    dark: 'bg-sky-500/20 text-sky-300 border border-sky-500/30',
  },
  repair: {
    light: 'bg-amber-50 text-amber-600 border border-amber-100',
    dark: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
  },
  commercial: {
    light: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
    dark: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
  },
  solar: {
    light: 'bg-indigo-50 text-indigo-600 border border-indigo-100',
    dark: 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30',
  },
};

// ── Protected Trust Badges (Non-negotiable) ──────────────────────────────────
const TRUST_BADGES = [
  {
    title: 'Licensed & Insured',
    subtitle: 'CA Lic #1096492',
    iconSrc: '/badges/cslb.webp',
  },
  {
    title: 'Owens Corning',
    subtitle: 'Preferred Contractor',
    iconSrc: '/badges/owens-corning.webp',
  },
  {
    title: 'A+ Rated Reliability',
    subtitle: '100% Itemized Pricing',
    iconSrc: '/badges/satisfaction.webp',
  },
  {
    title: 'San Diego Chamber',
    subtitle: '25+ Years Verified',
    iconSrc: '/badges/escondido-chamber.png',
  },
];

/**
 * High-performance smooth numeric tween hook for scroll-stopping live prices
 */
function useAnimatedNumber(target: number, duration = 280): number {
  const [current, setCurrent] = useState(target);
  const targetRef = useRef(target);
  targetRef.current = target;

  useEffect(() => {
    let start = current;
    let startTime: number | null = null;
    let animFrame: number;

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Cubic ease-out
      const ease = 1 - Math.pow(1 - progress, 3);
      const nextVal = Math.round(start + (targetRef.current - start) * ease);
      setCurrent(nextVal);

      if (progress < 1) {
        animFrame = requestAnimationFrame(step);
      }
    };

    animFrame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animFrame);
  }, [target, duration]);

  return current;
}

export function InteractiveHeroEstimator() {
  const [servicesData, setServicesData] = useState<EstimatorService[]>(INITIAL_SERVICES);
  const [step, setStep] = useState<1 | 2>(1);
  const [serviceSlug, setServiceSlug] = useState<string>('residential');
  const [sqft, setSqft] = useState<number>(2750);
  const [customSqftInput, setCustomSqftInput] = useState<string>('2,750');
  const [activePresetIndex, setActivePresetIndex] = useState<number>(1); // default medium
  const [isHighlightPulsing, setIsHighlightPulsing] = useState<boolean>(false);

  const [contactData, setContactData] = useState({
    name: '',
    phone: '',
    address: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const isLight = true;

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Hydrate with latest dynamic config from DB (cached with ISR)
  useEffect(() => {
    fetch('/api/estimator/config')
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && Array.isArray(data.services) && data.services.length > 0) {
          setServicesData(data.services);
        }
      })
      .catch(() => {
        // Fallback already pre-hydrated
      });
  }, []);

  const activeService = useMemo(() => {
    return servicesData.find((s) => s.slug === serviceSlug) || servicesData[0];
  }, [servicesData, serviceSlug]);

  const presets = useMemo(() => {
    return activeService.presets && activeService.presets.length > 0
      ? activeService.presets
      : INITIAL_SERVICES[0].presets;
  }, [activeService]);

  // Instant zero-lag client calculation
  const rawEstimate = useMemo(() => {
    return calculateEstimate(activeService.pricing, sqft);
  }, [activeService.pricing, sqft]);

  // Animated numbers for scroll-stopping UX
  const animatedLow = useAnimatedNumber(rawEstimate.low);
  const animatedHigh = useAnimatedNumber(rawEstimate.high);
  const animatedMonthly = useAnimatedNumber(rawEstimate.monthlyEstimate);

  // Trigger brief highlight pulse on estimate change
  const triggerPulse = useCallback(() => {
    setIsHighlightPulsing(true);
    const t = setTimeout(() => setIsHighlightPulsing(false), 300);
    return () => clearTimeout(t);
  }, []);

  // Debounced server sync & lead telemetry logging
  const syncWithServer = useCallback((slug: string, currentSqft: number, source: 'preset' | 'custom') => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      fetch('/api/estimator/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: slug,
          sqft: currentSqft,
          source,
        }),
      }).catch(() => {});
    }, 250);
  }, []);

  const handleSelectService = (slug: string) => {
    setServiceSlug(slug);
    triggerPulse();
    const service = servicesData.find((s) => s.slug === slug);
    if (service) {
      // Keep sqft within bounds of new service
      const clamped = Math.min(Math.max(sqft, service.pricing.minSqft || 500), service.pricing.maxSqft || 25000);
      setSqft(clamped);
      setCustomSqftInput(clamped.toLocaleString());
      syncWithServer(slug, clamped, activePresetIndex >= 0 ? 'preset' : 'custom');
    }
  };

  const handleSelectPreset = (preset: { sqftValue: number }, index: number) => {
    setActivePresetIndex(index);
    setSqft(preset.sqftValue);
    setCustomSqftInput(preset.sqftValue.toLocaleString());
    triggerPulse();
    syncWithServer(serviceSlug, preset.sqftValue, 'preset');
  };

  const handleCustomSqftChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawDigits = e.target.value.replace(/[^0-9]/g, '');
    if (!rawDigits) {
      setCustomSqftInput('');
      setActivePresetIndex(-1);
      return;
    }
    const num = parseInt(rawDigits, 10);
    setCustomSqftInput(num.toLocaleString());
    
    // Check if matches a preset
    const matchIdx = presets.findIndex((p) => p.sqftValue === num);
    setActivePresetIndex(matchIdx);

    setSqft(num);
    triggerPulse();
    syncWithServer(serviceSlug, num, 'custom');
  };

  const handleCustomSqftBlur = () => {
    const min = activeService.pricing.minSqft || 500;
    const max = activeService.pricing.maxSqft || 25000;
    let num = parseInt(customSqftInput.replace(/[^0-9]/g, ''), 10);
    if (isNaN(num) || num < min) {
      num = min;
    } else if (num > max) {
      num = max;
    }
    setSqft(num);
    setCustomSqftInput(num.toLocaleString());
    const matchIdx = presets.findIndex((p) => p.sqftValue === num);
    setActivePresetIndex(matchIdx);
  };

  const adjustSqft = (delta: number) => {
    const min = activeService.pricing.minSqft || 500;
    const max = activeService.pricing.maxSqft || 25000;
    const nextVal = Math.min(Math.max(sqft + delta, min), max);
    setSqft(nextVal);
    setCustomSqftInput(nextVal.toLocaleString());
    const matchIdx = presets.findIndex((p) => p.sqftValue === nextVal);
    setActivePresetIndex(matchIdx);
    triggerPulse();
    syncWithServer(serviceSlug, nextVal, 'custom');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactData.name || !contactData.phone) return;
    setSubmitting(true);
    try {
      await fetch('/api/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: contactData.name.trim(),
          phone: contactData.phone.trim(),
          address: contactData.address.trim() || undefined,
          serviceType: activeService.name,
          notes: `Dynamic Ballpark: $${rawEstimate.low.toLocaleString()} – $${rawEstimate.high.toLocaleString()} (${sqft} sq ft, ${activePresetIndex === -1 ? 'custom sq ft' : 'preset'})`,
        }),
      });
    } catch {
      // still show success
    } finally {
      setSubmitting(false);
      setSubmitted(true);
    }
  };

  if (submitted) {
    return (
      <div
        className={cn(
          'rounded-3xl p-6 sm:p-8 w-full max-w-[920px] text-center animate-in fade-in zoom-in-95 duration-200 transition-all border backdrop-blur-xl',
          isLight
            ? 'bg-white/98 text-[#0B1E33] border-slate-100 shadow-[0_20px_50px_-12px_rgba(11,30,51,0.12)]'
            : 'bg-[#0B1B2B]/95 text-white border-white/15 shadow-2xl'
        )}
      >
        <div className="w-12 h-12 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full flex items-center justify-center mx-auto mb-3 shadow-xs">
          <Icon name="check-circle" className="w-6 h-6" />
        </div>
        <span className="text-[10.5px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-0.5 rounded-full border border-emerald-200 inline-block mb-2">
          Estimate Confirmed
        </span>
        <h3 className={cn('text-xl sm:text-2xl font-bold mb-1.5', isLight ? 'text-[#0B1E33]' : 'text-white')}>
          Thank you, {contactData.name}!
        </h3>
        <p className={cn('text-xs sm:text-sm leading-relaxed mb-5 max-w-[540px] mx-auto', isLight ? 'text-[#5D7287]' : 'text-white/80')}>
          Your estimate request for <span className="font-bold text-brand-blue">{activeService.name}</span> ({sqft.toLocaleString()} sq ft) has been received. A licensed San Diego specialist will review your property satellite data and reach out within 15 minutes.
        </p>

        <div
          className={cn(
            'rounded-2xl p-4 mb-4 max-w-[500px] mx-auto text-left flex items-center justify-between border',
            isLight
              ? 'bg-slate-50/80 border-slate-200 text-[#0B1E33]'
              : 'bg-white/10 border-white/20 text-white'
          )}
        >
          <div>
            <p className={cn('text-[10px] uppercase font-bold tracking-wider', isLight ? 'text-[#64748B]' : 'text-white/60')}>
              Need Instant Assistance?
            </p>
            <a
              href={PHONE_HREF}
              className="inline-flex items-center gap-1.5 text-sm sm:text-base font-bold text-brand-blue hover:underline transition-all mt-0.5"
            >
              <Icon name="phone" className="w-4 h-4" />
              <span>Call {PHONE_NUMBER}</span>
            </a>
          </div>
          <button
            type="button"
            onClick={() => {
              setSubmitted(false);
              setStep(1);
            }}
            className="text-xs font-semibold text-brand-blue hover:underline cursor-pointer"
          >
            Start Over
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-3xl overflow-hidden w-full max-w-[920px] transition-all duration-300 backdrop-blur-xl border animate-hero-5 relative',
        isLight
          ? 'bg-white text-[#0B1E33] border-slate-100 shadow-[0_20px_50px_-12px_rgba(11,30,51,0.12)]'
          : 'bg-[#0B1B2B] text-white border-white/15 shadow-2xl'
      )}
    >
      {/* Main Interactive Container */}
      <div className="p-5 sm:p-7">
        {/* Header Bar — Preserved exactly as required */}
        <div
          className={cn(
            'flex items-center justify-between gap-3 mb-5 pb-4 border-b',
            isLight ? 'border-slate-100' : 'border-white/10'
          )}
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'w-10 h-10 rounded-2xl flex items-center justify-center shadow-xs flex-shrink-0',
                isLight
                  ? 'bg-blue-50 text-brand-blue border border-blue-100'
                  : 'bg-white/10 text-brand-blue border border-white/15'
              )}
            >
              <Icon name="calculator" className="w-5 h-5" />
            </div>
            <div>
              <h3 className={cn('text-base sm:text-lg font-bold tracking-tight leading-tight', isLight ? 'text-[#0B1E33]' : 'text-white')}>
                Fast Project Estimate
              </h3>
              <p className={cn('text-xs mt-0.5 font-normal', isLight ? 'text-[#64748B]' : 'text-white/65')}>
                100% Free • Interactive Ballpark &amp; Itemized Proposal
              </p>
            </div>
          </div>

          {/* Step Pill */}
          <div
            className={cn(
              'flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-semibold shadow-2xs',
              isLight
                ? 'bg-slate-50 text-[#475569] border-slate-200/80'
                : 'bg-white/10 text-white/90 border-white/15'
            )}
          >
            <span>Step {step} of 2</span>
            <div className="flex items-center gap-1.5">
              <div
                className={cn(
                  'w-1.5 h-1.5 rounded-full transition-colors',
                  step >= 1 ? 'bg-brand-blue' : isLight ? 'bg-slate-300' : 'bg-white/30'
                )}
              />
              <div
                className={cn(
                  'w-1.5 h-1.5 rounded-full transition-colors',
                  step >= 2 ? 'bg-brand-blue' : isLight ? 'bg-slate-300' : 'bg-white/30'
                )}
              />
            </div>
          </div>
        </div>

        {/* STEP 1: SERVICE & DYNAMIC SIZE WITH LIVE SCROLL-STOPPER FORMULA */}
        {step === 1 && (
          <div className="space-y-5 animate-in fade-in duration-150">
            {/* 1. Dynamic Service Selector */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span
                  className={cn(
                    'text-xs font-bold uppercase tracking-wider',
                    isLight ? 'text-[#475569]' : 'text-white/70'
                  )}
                >
                  1. Select Roofing Service
                </span>
                <span className="text-xs text-brand-blue font-bold">
                  {activeService.name}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                {servicesData.map((item) => {
                  const isSelected = serviceSlug === item.slug;
                  const styling = SERVICE_STYLING[item.slug] || {
                    light: 'bg-sky-50 text-sky-600 border border-sky-100',
                    dark: 'bg-sky-500/20 text-sky-300 border border-sky-500/30',
                  };

                  return (
                    <button
                      type="button"
                      key={item.slug}
                      onClick={() => handleSelectService(item.slug)}
                      className={cn(
                        'flex flex-col items-center justify-center p-3 sm:p-3.5 rounded-2xl cursor-pointer text-center group transition-all relative border active:scale-95 duration-150',
                        isSelected
                          ? isLight
                            ? 'bg-sky-50/70 border-2 border-brand-blue text-[#0B1E33] shadow-xs'
                            : 'bg-brand-blue/20 border-2 border-brand-blue text-white shadow-sm'
                          : isLight
                          ? 'bg-white hover:bg-slate-50/70 border border-slate-200/80 hover:border-slate-300 text-[#1E293B] shadow-2xs'
                          : 'bg-white/10 hover:bg-white/15 border-white/15 text-white'
                      )}
                    >
                      {/* Top Badge */}
                      {item.badgeLabel && (
                        <span
                          className={cn(
                            'absolute top-2 right-2 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md transition-colors',
                            isSelected
                              ? 'bg-brand-blue text-white'
                              : isLight
                              ? 'bg-slate-100 text-[#64748B]'
                              : 'bg-white/10 text-white/60'
                          )}
                        >
                          {item.badgeLabel}
                        </span>
                      )}

                      {/* Icon Container */}
                      <div
                        className={cn(
                          'w-9 h-9 rounded-xl flex items-center justify-center transition-all mb-2 shadow-2xs',
                          isSelected
                            ? 'bg-brand-blue text-white'
                            : isLight
                            ? styling.light
                            : styling.dark
                        )}
                      >
                        <Icon name={item.iconKey as IconName} className="w-4 h-4" />
                      </div>

                      <span className={cn('text-xs sm:text-[13px] font-bold leading-snug', isLight ? 'text-[#0B1E33]' : 'text-white')}>
                        {item.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Property Size: Quick Presets + Direct Custom Square Footage Input */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span
                  className={cn(
                    'text-xs font-bold uppercase tracking-wider',
                    isLight ? 'text-[#475569]' : 'text-white/70'
                  )}
                >
                  2. Estimated Property Size
                </span>
                <span className={cn('text-xs font-extrabold text-brand-blue flex items-center gap-1')}>
                  <span className="font-mono">{sqft.toLocaleString()}</span> sq ft
                  {activePresetIndex === -1 && <span className="text-[10px] font-normal text-slate-500">(Custom)</span>}
                </span>
              </div>

              {/* Quick Presets Row */}
              <div className="grid grid-cols-3 gap-2 sm:gap-2.5 mb-3">
                {presets.map((sz, idx) => {
                  const isSelected = activePresetIndex === idx;
                  return (
                    <button
                      type="button"
                      key={sz.id || idx}
                      onClick={() => handleSelectPreset(sz, idx)}
                      className={cn(
                        'py-2.5 px-2 rounded-xl text-center cursor-pointer transition-all border text-xs sm:text-sm active:scale-95 duration-150',
                        isSelected
                          ? 'bg-brand-blue text-white border-brand-blue font-bold shadow-xs'
                          : isLight
                          ? 'bg-white hover:bg-slate-50/80 border border-slate-200/80 text-[#334155] hover:text-[#0B1E33] shadow-2xs font-semibold'
                          : 'bg-white/10 hover:bg-white/15 border-white/15 text-white font-semibold'
                      )}
                    >
                      <span className="block leading-tight truncate">{sz.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Direct Custom Square Footage Input Console */}
              <div className="bg-slate-50/90 rounded-2xl p-3 sm:p-4 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-brand-blue border border-blue-100 flex items-center justify-center shrink-0 shadow-2xs">
                    <Icon name="calculator" className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#0B1E33] block leading-tight">
                      Or Enter Exact Square Footage
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      Type your property sq ft or adjust with - / + buttons
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 self-stretch sm:self-auto justify-end">
                  <button
                    type="button"
                    onClick={() => adjustSqft(-100)}
                    className="w-8 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-[#0B1E33] font-bold text-sm flex items-center justify-center cursor-pointer transition-all shadow-2xs active:scale-95 select-none"
                    title="Decrease 100 sq ft"
                  >
                    -
                  </button>

                  <div className="relative flex items-center">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={customSqftInput}
                      onChange={handleCustomSqftChange}
                      onBlur={handleCustomSqftBlur}
                      placeholder="e.g. 2,500"
                      className="w-28 sm:w-32 px-3 py-2 text-right pr-11 font-mono font-extrabold text-sm sm:text-base rounded-xl border border-slate-300 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 bg-white text-[#0B1E33] outline-none shadow-2xs transition-all"
                      aria-label="Roof square footage input"
                    />
                    <span className="absolute right-2.5 text-[11px] font-bold text-slate-400 pointer-events-none select-none">
                      sq ft
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => adjustSqft(100)}
                    className="w-8 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-[#0B1E33] font-bold text-sm flex items-center justify-center cursor-pointer transition-all shadow-2xs active:scale-95 select-none"
                    title="Increase 100 sq ft"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Soft, Seamless Architectural Estimate Console with Animated Counter */}
            <div
              className={cn(
                'rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border transition-all duration-300',
                isHighlightPulsing
                  ? 'ring-2 ring-brand-blue/30 border-brand-blue/50 scale-[1.005]'
                  : '',
                isLight
                  ? 'bg-slate-50/90 border-slate-200/80 text-[#0B1E33]'
                  : 'bg-white/5 border-white/15 text-white'
              )}
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={cn(
                      'text-xs font-bold uppercase tracking-wider',
                      isLight ? 'text-[#64748B]' : 'text-white/70'
                    )}
                  >
                    Estimated Ballpark Range
                  </span>
                  {activeService.pricing.aprAvailable && (
                    <span
                      className={cn(
                        'text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border',
                        isLight
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
                      )}
                    >
                      0% APR Available
                    </span>
                  )}
                </div>

                <div className="flex items-baseline gap-2.5 mt-0.5">
                  <span className={cn('text-2xl sm:text-3xl font-extrabold tracking-tight', isLight ? 'text-[#0B1E33]' : 'text-white')}>
                    ${animatedLow.toLocaleString()} – ${animatedHigh.toLocaleString()}
                  </span>
                  <span className={cn('text-xs sm:text-sm font-medium', isLight ? 'text-[#64748B]' : 'text-white/75')}>
                    (or as low as{' '}
                    <strong className={cn('font-bold', isLight ? 'text-amber-700' : 'text-amber-300')}>
                      ${animatedMonthly}/mo
                    </strong>
                    )
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setStep(2)}
                className="bg-brand-blue hover:bg-[#1C88DD] text-white font-bold text-xs sm:text-sm uppercase tracking-wider py-3.5 px-6 rounded-xl shadow-md shadow-brand-blue/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer flex-shrink-0 active:scale-95"
              >
                <span>Get Itemized Quote</span>
                <Icon name="arrow-right" className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: CONTACT & PROPOSAL DELIVERY */}
        {step === 2 && (
          <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in duration-150">
            <div
              className={cn(
                'rounded-xl px-4 py-2.5 flex items-center justify-between border',
                isLight
                  ? 'bg-slate-50 border-slate-200 text-[#0B1E33]'
                  : 'bg-white/10 border-white/20 text-white'
              )}
            >
              <div className="flex items-center gap-2 text-xs sm:text-sm">
                <span className={cn('font-bold', isLight ? 'text-[#0B1E33]' : 'text-white')}>
                  {activeService.name} ({sqft.toLocaleString()} sq ft)
                </span>
                <span className="opacity-40">•</span>
                <span className="text-brand-blue font-bold">
                  ${rawEstimate.low.toLocaleString()} – ${rawEstimate.high.toLocaleString()}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs font-bold text-brand-blue hover:underline transition-all cursor-pointer"
              >
                Edit Options
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  className={cn(
                    'text-xs font-bold uppercase tracking-wider mb-1.5 block',
                    isLight ? 'text-[#475569]' : 'text-white/70'
                  )}
                >
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Smith"
                  value={contactData.name}
                  onChange={(e) => setContactData({ ...contactData, name: e.target.value })}
                  className={cn(
                    'w-full px-3.5 py-2.5 rounded-xl text-xs font-medium border transition-all focus:outline-none focus:ring-2 focus:ring-brand-blue/20',
                    isLight
                      ? 'bg-slate-50/70 border-slate-200 text-[#0B1E33] placeholder:text-slate-400 focus:bg-white focus:border-brand-blue'
                      : 'bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:bg-white/15 focus:border-brand-blue'
                  )}
                />
              </div>

              <div>
                <label
                  className={cn(
                    'text-xs font-bold uppercase tracking-wider mb-1.5 block',
                    isLight ? 'text-[#475569]' : 'text-white/70'
                  )}
                >
                  Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. (760) 000-0000"
                  value={contactData.phone}
                  onChange={(e) => setContactData({ ...contactData, phone: e.target.value })}
                  className={cn(
                    'w-full px-3.5 py-2.5 rounded-xl text-xs font-medium border transition-all focus:outline-none focus:ring-2 focus:ring-brand-blue/20',
                    isLight
                      ? 'bg-slate-50/70 border-slate-200 text-[#0B1E33] placeholder:text-slate-400 focus:bg-white focus:border-brand-blue'
                      : 'bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:bg-white/15 focus:border-brand-blue'
                  )}
                />
              </div>
            </div>

            <div>
              <label
                className={cn(
                  'text-xs font-bold uppercase tracking-wider mb-1.5 block',
                  isLight ? 'text-[#475569]' : 'text-white/70'
                )}
              >
                Property City / Address (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Carlsbad, Oceanside, or San Diego"
                value={contactData.address}
                onChange={(e) => setContactData({ ...contactData, address: e.target.value })}
                className={cn(
                  'w-full px-3.5 py-2.5 rounded-xl text-xs font-medium border transition-all focus:outline-none focus:ring-2 focus:ring-brand-blue/20',
                  isLight
                    ? 'bg-slate-50/70 border-slate-200 text-[#0B1E33] placeholder:text-slate-400 focus:bg-white focus:border-brand-blue'
                    : 'bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:bg-white/15 focus:border-brand-blue'
                )}
              />
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => setStep(1)}
                className={cn(
                  'p-3 rounded-xl border transition-colors flex items-center justify-center cursor-pointer',
                  isLight
                    ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-[#0B1E33]'
                    : 'bg-white/10 hover:bg-white/20 border-white/15 text-white/80 hover:text-white'
                )}
                aria-label="Back to step 1"
              >
                <Icon name="arrow-left" className="w-4 h-4" />
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-brand-blue hover:bg-[#1C88DD] text-white font-bold text-xs sm:text-sm uppercase tracking-wider py-3.5 px-6 rounded-xl shadow-md shadow-brand-blue/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
              >
                <Icon name="shield-check" className="w-4 h-4 text-white" />
                <span>{submitting ? 'Generating Proposal...' : 'Calculate My Proposal'}</span>
                <Icon name="arrow-right" className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Connected Trust Shelf at bottom — 100% untouched non-negotiable copy */}
      <div
        className={cn(
          'border-t px-4 sm:px-7 py-3.5',
          isLight
            ? 'border-slate-100 bg-slate-50/60'
            : 'border-white/10 bg-white/[0.03]'
        )}
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {TRUST_BADGES.map((item, idx) => (
            <div
              key={idx}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-all',
                isLight
                  ? 'bg-white border-slate-200/70 shadow-2xs hover:border-slate-300'
                  : 'bg-white/[0.04] border-white/10 hover:border-white/20'
              )}
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center p-0.5 bg-white border border-slate-100 shadow-2xs flex-shrink-0">
                <Image
                  src={item.iconSrc}
                  alt={item.title}
                  width={32}
                  height={32}
                  className="w-full h-full object-contain"
                  loading="lazy"
                />
              </div>
              <div className="min-w-0 flex-1">
                <h4
                  className={cn(
                    'font-bold text-[11px] sm:text-xs leading-tight truncate',
                    isLight ? 'text-[#0B1E33]' : 'text-white'
                  )}
                >
                  {item.title}
                </h4>
                <p
                  className={cn(
                    'text-[9.5px] sm:text-[10px] font-medium leading-tight mt-0.5 truncate',
                    isLight ? 'text-[#64748B]' : 'text-white/65'
                  )}
                >
                  {item.subtitle}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
