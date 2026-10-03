'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { Icon } from '@/components/shared/Icon';
import { PHONE_HREF, PHONE_NUMBER, LICENSE_NUMBER } from '@/lib/utils';
import CustomSelect from '@/components/shared/CustomSelect';
import { Turnstile } from '@/components/shared/Turnstile';
import { useLeadModal } from '@/context/LeadModalContext';

const STORAGE_KEY_DISMISSED = 'riseup_storm_promo_dismissed';
const STORAGE_KEY_CLAIMED = 'riseup_storm_promo_claimed';
const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const PROMO_IMAGE = 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=900&q=80';

export function StormPromoModal() {
  const pathname = usePathname();
  const { openLeadModal } = useLeadModal();
  const [isOpen, setIsOpen] = useState(false);
  const [viewState, setViewState] = useState<'offer' | 'form' | 'success'>('offer');

  // Form state
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('San Diego');
  const [serviceType, setServiceType] = useState('Roof Replacement');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [formStartedAt, setFormStartedAt] = useState<number>(0);
  const [honeypotFax, setHoneypotFax] = useState('');
  const [honeypotWebsite, setHoneypotWebsite] = useState('');

  // Check if current route should suppress popup
  const isExcludedRoute = useCallback(() => {
    if (!pathname) return false;
    const excludedPrefixes = ['/admin', '/proposal', '/inspection', '/warranty'];
    return excludedPrefixes.some((prefix) => pathname.startsWith(prefix));
  }, [pathname]);

  const shouldSuppress = useCallback(() => {
    if (typeof window === 'undefined') return true;
    if (isExcludedRoute()) return true;

    // Already claimed? Never show again.
    if (localStorage.getItem(STORAGE_KEY_CLAIMED) === 'true') {
      return true;
    }

    // Dismissed recently? Check 7-day cooldown.
    const dismissedAt = localStorage.getItem(STORAGE_KEY_DISMISSED);
    if (dismissedAt) {
      const elapsed = Date.now() - parseInt(dismissedAt, 10);
      if (elapsed < COOLDOWN_MS) {
        return true;
      }
    }

    return false;
  }, [isExcludedRoute]);

  const triggerModal = useCallback(() => {
    if (!shouldSuppress()) {
      setIsOpen(true);
    }
  }, [shouldSuppress]);

  useEffect(() => {
    if (typeof window === 'undefined' || shouldSuppress()) return;

    let timer: NodeJS.Timeout;
    const isMobile = window.innerWidth < 768;
    const dwellTime = isMobile ? 30000 : 12000;
    const scrollThreshold = isMobile ? 0.65 : 0.35;

    // 1. Time-based trigger (30s on mobile, 12s on desktop)
    timer = setTimeout(() => {
      triggerModal();
    }, dwellTime);

    // 2. Scroll depth trigger (65% on mobile, 35% on desktop)
    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollHeight > 0) {
        const scrolledRatio = window.scrollY / scrollHeight;
        if (scrolledRatio >= scrollThreshold) {
          triggerModal();
          window.removeEventListener('scroll', handleScroll);
        }
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    // 3. Desktop Exit-intent trigger
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 10) {
        triggerModal();
        document.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [shouldSuppress, triggerModal]);

  // ESC key listener to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleDismiss = () => {
    setIsOpen(false);
    if (typeof window !== 'undefined' && viewState !== 'success') {
      localStorage.setItem(STORAGE_KEY_DISMISSED, Date.now().toString());
    }
  };

  const handleSubmitClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!fullName.trim() || !phone.trim()) {
      setErrorMessage('Please provide your name and a valid phone number.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          phone: phone.trim(),
          city: city.trim() || undefined,
          serviceType,
          formType: 'storm_promo',
          priority: 'hot',
          leadScore: 95,
          leadSource: 'storm_promo_popup',
          notes: `⚡ El Niño Storm Promo Claim: $1,000 Off voucher claimed for ${serviceType}${city.trim() ? ` in ${city.trim()}` : ''}. Free 21-point storm inspection requested.`,
          // Anti-Spam Defenses
          business_fax: honeypotFax,
          company_website: honeypotWebsite,
          formStartedAt: formStartedAt || Date.now() - 5000,
          turnstileToken,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Failed to submit claim');
      }

      // Mark as claimed permanently in local storage
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_CLAIMED, 'true');
      }

      setViewState('success');
    } catch (err: unknown) {
      const errObj = err as Error;
      setErrorMessage(errObj.message || 'Something went wrong. Please call us directly.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="promo-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-950/80 backdrop-blur-md animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleDismiss();
      }}
    >
      <div className="relative w-full max-w-4xl bg-[#0B1E33] border border-amber-500/30 rounded-2xl sm:rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8),0_0_40px_rgba(245,158,11,0.15)] overflow-hidden flex flex-col md:flex-row text-white max-h-[92vh] sm:max-h-none overflow-y-auto animate-scaleUp">
        {/* Close Button */}
        <button
          onClick={handleDismiss}
          aria-label="Close promotion dialog"
          className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-white/10 transition-colors cursor-pointer"
        >
          <Icon name="x" className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        {/* Left Column: Visual Photography & Trust Proof */}
        <div className="relative w-full md:w-5/12 h-28 sm:h-52 md:h-auto min-h-[110px] md:min-h-[460px] bg-slate-900 overflow-hidden flex-shrink-0">
          <Image
            src={PROMO_IMAGE}
            alt="San Diego residential roof under dramatic Pacific storm sky"
            fill
            priority
            sizes="(max-width: 768px) 100vw, 40vw"
            className="object-cover object-center transform scale-105 hover:scale-100 transition-transform duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B1E33] via-slate-950/40 to-transparent md:bg-gradient-to-r md:from-transparent md:via-[#0B1E33]/30 md:to-[#0B1E33]" />

          {/* Photo Badges */}
          <div className="absolute top-3 left-3 z-10">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider bg-amber-500/90 text-slate-950 shadow-md">
              <Icon name="sparkles" className="w-3 h-3" />
              Early Bird Special
            </span>
          </div>

          <div className="absolute bottom-3 left-3 right-3 z-10 hidden sm:block">
            <div className="p-2.5 rounded-xl bg-slate-950/75 backdrop-blur-md border border-white/10 text-xs">
              <div className="flex items-center gap-2 text-white font-semibold mb-1">
                <Icon name="shield-check" className="w-4 h-4 text-brand-blue flex-shrink-0" />
                <span>Owens Corning Preferred</span>
              </div>
              <div className="text-[11px] text-slate-300 flex items-center justify-between">
                <span>CA CSLB #{LICENSE_NUMBER}</span>
                <span className="text-amber-400 font-bold">★ 4.9 Rating</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Copy, Offer & Interactive Form */}
        <div className="flex-1 p-5 sm:p-7 md:p-8 flex flex-col justify-between relative bg-gradient-to-br from-[#0B1E33] to-[#081524]">
          {/* Top Pill Alert */}
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold tracking-wider uppercase bg-amber-500/15 border border-amber-500/30 text-amber-300 mb-3">
              <Icon name="cloud-rain" className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              <span>San Diego County · Storm Season Alert</span>
            </div>

            {/* Headline */}
            <h2 id="promo-modal-title" className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
              El Niño is coming.{' '}
              <span className="block sm:inline text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500">
                Is your roof ready?
              </span>
            </h2>

            {/* Body Copy */}
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed mt-2.5">
              Forecasters are calling for a wet winter across Southern California. Book your roof
              replacement or repair before October 31st and save $1,000 — before the storms decide for you.
            </p>
          </div>

          {/* VIEW STATE: Primary Offer Presentation */}
          {viewState === 'offer' && (
            <div className="mt-4 sm:mt-5 space-y-4">
              {/* Highlight Offer Box */}
              <div className="relative rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-slate-900 border border-amber-400/40 p-3.5 sm:p-4 shadow-inner">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="text-3xl sm:text-4xl font-black text-amber-400 tracking-tight flex items-baseline gap-1">
                      <span>$1,000</span>
                      <span className="text-lg sm:text-xl font-bold uppercase text-amber-200">OFF</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium mt-0.5">
                      <Icon name="calendar" className="w-3.5 h-3.5 text-amber-400/80" />
                      <span>Book by October 31st</span>
                    </div>
                  </div>

                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] sm:text-xs font-semibold self-start sm:self-center">
                    <Icon name="check-circle" className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    <span>Free 21-pt inspection included</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    openLeadModal({
                      source: 'storm_promo',
                      title: '⚡ El Niño $1,000 Off Voucher',
                      prefill: {
                        serviceType: 'Storm Repair & Inspection',
                        discountAmount: 1000,
                      },
                    });
                  }}
                  className="w-full inline-flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-xl font-bold text-sm sm:text-base uppercase tracking-wider bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:via-amber-400 hover:to-amber-500 text-slate-950 shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer group"
                >
                  <Icon name="sparkles" className="w-4 h-4 fill-current group-hover:rotate-12 transition-transform" />
                  <span>Lock In My $1,000 Off</span>
                  <Icon name="arrow-right" className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </button>

                <div className="flex items-center justify-center gap-1.5 text-xs sm:text-sm text-slate-400">
                  <span>or call</span>
                  <a
                    href={PHONE_HREF}
                    className="text-brand-blue hover:text-sky-300 font-semibold inline-flex items-center gap-1 transition-colors"
                  >
                    <Icon name="phone" className="w-3.5 h-3.5" />
                    <span>{PHONE_NUMBER}</span>
                  </a>
                </div>
              </div>

              {/* Decline Option */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="text-[11px] sm:text-xs text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                >
                  No thanks, I&apos;ll risk the storm
                </button>
              </div>
            </div>
          )}

          {/* FORM STATE: 2-Step Quick Lead Claim */}
          {viewState === 'form' && (
            <form onSubmit={handleSubmitClaim} className="mt-3.5 space-y-3">
              {errorMessage && (
                <div className="p-2.5 rounded-lg bg-red-500/15 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
                  <Icon name="alert-triangle" className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-slate-300 font-semibold mb-1">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Sarah Jenkins"
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg bg-slate-900/90 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-slate-300 font-semibold mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(760) 000-0000"
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg bg-slate-900/90 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-slate-300 font-semibold mb-1">
                    City / Area in SD
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Oceanside, Escondido"
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg bg-slate-900/90 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-slate-300 font-semibold mb-1">
                    Project Type
                  </label>
                  <CustomSelect
                    value={serviceType}
                    onChange={setServiceType}
                    variant="dark"
                    size="sm"
                    options={[
                      { value: 'Roof Replacement', label: 'Complete Roof Replacement' },
                      { value: 'Storm Repair & Inspection', label: 'Storm Damage Repair & Inspection' },
                      { value: 'Tile / Shingle Tune-Up', label: 'Tile / Shingle Tune-Up' },
                      { value: 'Commercial Roofing', label: 'Commercial Roofing' },
                    ]}
                  />
                </div>
              </div>

              {/* Invisible Multi-Decoy Honeypots */}
              <div className="opacity-0 absolute -left-[9999px] h-0 w-0 pointer-events-none overflow-hidden" aria-hidden="true" tabIndex={-1}>
                <input
                  type="text"
                  name="business_fax"
                  tabIndex={-1}
                  autoComplete="off"
                  value={honeypotFax}
                  onChange={(e) => setHoneypotFax(e.target.value)}
                />
                <input
                  type="text"
                  name="company_website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={honeypotWebsite}
                  onChange={(e) => setHoneypotWebsite(e.target.value)}
                />
              </div>

              {/* Cloudflare Turnstile (Managed / Invisible) */}
              <Turnstile
                onVerify={(token) => setTurnstileToken(token)}
                theme="dark"
              />

              <div className="pt-1.5 space-y-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl font-bold text-sm uppercase tracking-wider bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:via-amber-400 hover:to-amber-500 text-slate-950 shadow-lg shadow-amber-500/25 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Icon name="loader" className="w-4 h-4 animate-spin" />
                      <span>Locking In Voucher...</span>
                    </>
                  ) : (
                    <>
                      <Icon name="check-circle" className="w-4 h-4" />
                      <span>Claim $1,000 Voucher Now</span>
                    </>
                  )}
                </button>

                <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                  <button
                    type="button"
                    onClick={() => setViewState('offer')}
                    className="hover:text-slate-200 transition-colors cursor-pointer"
                  >
                    ← Back to offer
                  </button>
                  <span className="text-slate-500">🔒 100% Free · No Obligation</span>
                </div>
              </div>
            </form>
          )}

          {/* SUCCESS STATE: Confirmed Voucher & Direct Contact */}
          {viewState === 'success' && (
            <div className="mt-4 sm:mt-5 text-center space-y-3.5 py-2">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto animate-bounce">
                <Icon name="check-circle" className="w-6 h-6" />
              </div>

              <div>
                <div className="inline-block px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 mb-2">
                  VOUCHER #STORM-1000 RESERVED
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-white">
                  You&apos;re All Set For $1,000 Off!
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-md mx-auto">
                  We have reserved your promotional credit. A senior roofing specialist will call you within
                  15 minutes to confirm your complimentary 21-point storm inspection.
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
                <a
                  href={PHONE_HREF}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm uppercase tracking-wider bg-brand-blue hover:bg-sky-500 text-white shadow-lg transition-colors cursor-pointer"
                >
                  <Icon name="phone" className="w-4 h-4" />
                  <span>Call {PHONE_NUMBER} Now</span>
                </a>
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
