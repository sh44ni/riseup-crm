'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useLeadModal } from '@/context/LeadModalContext';
import { Icon } from '@/components/shared/Icon';
import CustomSelect from '@/components/shared/CustomSelect';
import { Turnstile } from '@/components/shared/Turnstile';
import { PHONE_HREF, PHONE_NUMBER } from '@/lib/utils';

const SERVICE_OPTIONS = [
  { value: 'Roof Replacement', label: 'Complete Roof Replacement (Tile / Shingle)' },
  { value: 'Storm Repair & Inspection', label: 'Storm Damage Repair & 21-Point Inspection' },
  { value: 'Leak Diagnostic & Repair', label: 'Leak Diagnostic & Emergency Repair' },
  { value: 'Commercial Roofing', label: 'Commercial Roofing (TPO / Flat)' },
  { value: 'Solar Roofing Integration', label: 'Solar Roofing Integration' },
  { value: 'Dry Rot & Construction', label: 'Fascia, Dry Rot & General Construction' },
];

function formatPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function UnifiedLeadModal() {
  const { isOpen, options, closeLeadModal } = useLeadModal();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [serviceType, setServiceType] = useState('Roof Replacement');
  const [address, setAddress] = useState('');
  const [sqft, setSqft] = useState<string>('');
  const [notes, setNotes] = useState('');

  // Anti-spam states
  const [turnstileToken, setTurnstileToken] = useState('');
  const [formStartedAt, setFormStartedAt] = useState<number>(0);
  const [honeypotFax, setHoneypotFax] = useState('');
  const [honeypotWebsite, setHoneypotWebsite] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const modalRef = useRef<HTMLDivElement>(null);

  // Initialize/reset form when opened
  useEffect(() => {
    if (isOpen) {
      setFormStartedAt(Date.now());
      setSubmitted(false);
      setErrorMessage('');
      setTurnstileToken('');
      setHoneypotFax('');
      setHoneypotWebsite('');

      const pre = options?.prefill;
      setFullName(pre?.fullName || '');
      setPhone(pre?.phone ? formatPhoneInput(pre.phone) : '');
      setEmail(pre?.email || '');
      setServiceType(pre?.serviceType || (options?.source === 'storm_promo' ? 'Storm Repair & Inspection' : 'Roof Replacement'));
      setAddress(pre?.address || (pre?.city ? `${pre.city}, CA` : ''));
      setSqft(pre?.sqft ? pre.sqft.toString() : '');
      setNotes(pre?.notes || '');
    }
  }, [isOpen, options]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closeLeadModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeLeadModal]);

  if (!isOpen) return null;

  const source = options?.source || 'contact';
  const isStorm = source === 'storm_promo';
  const isEstimator = source === 'estimator';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!fullName.trim() || !phone.trim()) {
      setErrorMessage('Please provide your name and phone number.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Determine lead labels
      let leadSource = 'website_lead_modal';
      let leadSourceDetail = 'Website Modal Request';
      let formType = 'estimate';

      if (isStorm) {
        leadSource = 'storm_promo_popup';
        leadSourceDetail = '⚡ $1,000 Off Storm Voucher';
        formType = 'storm_promo';
      } else if (isEstimator) {
        leadSource = 'website_estimator';
        leadSourceDetail = '📊 Instant Estimator';
        formType = 'estimator_full';
      } else if (source === 'service_area') {
        leadSource = 'website_landing';
        leadSourceDetail = `📍 Landing (${options?.prefill?.city || 'Local'})`;
      } else if (source === 'contact') {
        leadSource = 'website_contact';
        leadSourceDetail = '✉️ Website Contact Form';
        formType = 'contact';
      }

      // Compile notes
      let combinedNotes = notes.trim();
      if (isStorm) {
        const promoPrefix = '⚡ El Niño Storm Promo Claim: $1,000 Off voucher applied.';
        combinedNotes = combinedNotes ? `${promoPrefix} Customer notes: ${combinedNotes}` : promoPrefix;
      } else if (isEstimator && options?.prefill?.estimatedLow) {
        const estPrefix = `📊 Calculated Ballpark: $${options.prefill.estimatedLow.toLocaleString()} – $${options.prefill.estimatedHigh?.toLocaleString()} (${sqft || 2500} sq ft)`;
        combinedNotes = combinedNotes ? `${estPrefix} | Notes: ${combinedNotes}` : estPrefix;
      }

      const payload = {
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        serviceType,
        address: address.trim() || undefined,
        roof_sqf: sqft ? parseInt(sqft, 10) : undefined,
        notes: combinedNotes,
        formType,
        leadSource,
        leadSourceDetail,
        // Anti-spam defenses
        business_fax: honeypotFax,
        company_website: honeypotWebsite,
        formStartedAt: formStartedAt || Date.now() - 5000,
        turnstileToken,
      };

      const res = await fetch('/api/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok && !data.ok) {
        throw new Error(data.detail || data.error || 'Submission failed');
      }

      setSubmitted(true);
    } catch (err: unknown) {
      const errObj = err as Error;
      setErrorMessage(errObj.message || 'Something went wrong. Please call us directly.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        ref={modalRef}
        className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto text-white animate-in zoom-in-95 duration-200"
      >
        {/* Top Header Banner based on trigger source */}
        <div
          className={`px-6 py-5 border-b flex items-center justify-between ${
            isStorm
              ? 'bg-gradient-to-r from-amber-500/20 via-amber-600/10 to-transparent border-amber-500/30'
              : isEstimator
              ? 'bg-gradient-to-r from-cyan-500/20 via-blue-600/10 to-transparent border-cyan-500/30'
              : 'bg-gradient-to-r from-blue-600/20 via-slate-800 to-transparent border-slate-700/60'
          }`}
        >
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider mb-1.5 border">
              {isStorm && (
                <span className="bg-amber-400/20 text-amber-300 border-amber-400/40">
                  ⚡ $1,000 Off Voucher Applied
                </span>
              )}
              {isEstimator && (
                <span className="bg-cyan-400/20 text-cyan-300 border-cyan-400/40">
                  📊 Instant Estimate Ballpark
                </span>
              )}
              {!isStorm && !isEstimator && (
                <span className="bg-blue-400/20 text-blue-300 border-blue-400/40">
                  🛡️ Free Inspection &amp; Proposal
                </span>
              )}
            </div>

            <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
              {options?.title ||
                (isStorm
                  ? 'Claim Your $1,000 Storm Voucher'
                  : isEstimator
                  ? 'Receive Your Itemized Proposal'
                  : 'Request Free 21-Point Roof Inspection')}
            </h3>

            {isEstimator && options?.prefill?.estimatedLow && (
              <p className="text-xs text-cyan-300 font-semibold mt-0.5">
                Ballpark: ${options.prefill.estimatedLow.toLocaleString()} – $
                {options.prefill.estimatedHigh?.toLocaleString()} ({sqft || 2500} sq ft)
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={closeLeadModal}
            className="w-9 h-9 rounded-full bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <Icon name="x" className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {submitted ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
                <Icon name="check-circle" className="w-9 h-9" />
              </div>
              <h4 className="text-2xl font-black text-white">
                {isStorm ? 'Voucher Locked In!' : 'Request Received!'}
              </h4>
              <p className="text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
                Thank you, <span className="text-white font-bold">{fullName}</span>. Your request has been assigned to our San Diego dispatch desk. A licensed project specialist will contact you at <span className="text-brand-blue font-bold">{phone}</span> shortly.
              </p>
              <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700 text-left max-w-md mx-auto">
                <p className="text-[11px] uppercase tracking-wider text-slate-400 font-bold mb-1">
                  Need Immediate Emergency Response?
                </p>
                <a
                  href={PHONE_HREF}
                  className="inline-flex items-center gap-2 text-sm font-bold text-amber-400 hover:text-amber-300 transition-colors"
                >
                  <Icon name="phone" className="w-4 h-4" />
                  <span>Call our dispatch desk directly: {PHONE_NUMBER}</span>
                </a>
              </div>
              <button
                type="button"
                onClick={closeLeadModal}
                className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-bold text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                Close Window
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMessage && (
                <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
                  <Icon name="alert-triangle" className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Row 1: Name and Phone (Required) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1 block">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sarah Jenkins"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1 block">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="(760) 000-0000"
                    value={phone}
                    onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
                  />
                </div>
              </div>

              {/* Row 2: Email and Service */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1 block">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="sarah@domain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1 block">
                    Roofing Service
                  </label>
                  <CustomSelect
                    value={serviceType}
                    onChange={setServiceType}
                    options={SERVICE_OPTIONS}
                    variant="dark"
                    size="sm"
                    triggerClassName="bg-slate-950/70 border border-slate-700 rounded-xl text-sm py-2.5 text-white"
                  />
                </div>
              </div>

              {/* Row 3: 1-Line Full Address */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1 block">
                  Property Address (Optional — 1 clean line)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1234 Coast Hwy, Oceanside, CA 92054"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
                />
              </div>

              {/* Row 4: Roof Size and Specific Concerns */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="sm:col-span-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1 block">
                    Roof Size (Sq Ft)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 2500"
                    value={sqft}
                    onChange={(e) => setSqft(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1 block">
                    Project Goals / Specific Concerns
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Tile cracked, storm leak, solar ready..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
                  />
                </div>
              </div>

              {/* Hidden Anti-Spam Decoy Honeypots */}
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

              {/* Invisible Cloudflare Turnstile */}
              <Turnstile
                onVerify={(token) => setTurnstileToken(token)}
                theme="dark"
              />

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-3.5 px-6 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-xl cursor-pointer disabled:opacity-50 ${
                  isStorm
                    ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-slate-950 hover:brightness-110 shadow-amber-500/20'
                    : isEstimator
                    ? 'bg-gradient-to-r from-cyan-400 via-blue-500 to-blue-600 text-white hover:brightness-110 shadow-blue-500/20'
                    : 'bg-[#2E9BF0] hover:bg-[#1C88DD] text-white shadow-brand-blue/30'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Icon name="loader" className="w-4 h-4 animate-spin" />
                    <span>Processing Request...</span>
                  </>
                ) : (
                  <>
                    <Icon name="check-circle" className="w-4 h-4" />
                    <span>
                      {isStorm
                        ? 'Claim $1,000 Off Voucher Now'
                        : isEstimator
                        ? 'Generate My Itemized Proposal'
                        : 'Submit Free Inspection Request'}
                    </span>
                    <Icon name="arrow-right" className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-3 text-[11px] text-slate-400 pt-1">
                <span>✓ 100% Itemized Proposal</span>
                <span>•</span>
                <span>✓ No Obligation</span>
                <span>•</span>
                <span>✓ Licensed &amp; Bonded</span>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
export default UnifiedLeadModal;
