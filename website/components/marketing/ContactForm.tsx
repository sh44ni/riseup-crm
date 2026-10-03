'use client';

import { useState, useEffect } from 'react';
import { Icon } from '@/components/shared/Icon';
import { PHONE_HREF, PHONE_NUMBER } from '@/lib/utils';
import CustomSelect from '@/components/shared/CustomSelect';
import { Turnstile } from '@/components/shared/Turnstile';

export function ContactForm() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serviceType, setServiceType] = useState('residential');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [formStartedAt, setFormStartedAt] = useState<number>(0);

  useEffect(() => {
    setFormStartedAt(Date.now());
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const fd = new FormData(e.currentTarget);
      const body = {
        fullName: fd.get('fullName'),
        phone: fd.get('phone'),
        email: fd.get('email'),
        serviceType: fd.get('serviceType'),
        address: fd.get('address'),
        message: fd.get('message'),
        // Anti-Spam Defenses
        business_fax: fd.get('business_fax') || '',
        company_website: fd.get('company_website') || '',
        formStartedAt,
        turnstileToken,
      };
      await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      setSubmitted(true);
    } catch {
      setSubmitted(true); // still show success to user
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="glass-card-hero rounded-3xl p-6 sm:p-8 md:p-10 border border-slate-200/80 shadow-lg">
      {submitted ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon name="check-circle" className="w-9 h-9" />
          </div>
          <h3 className="text-2xl font-extrabold text-[var(--text-primary)] mb-2">
            Request Confirmed!
          </h3>
          <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto mb-6 leading-relaxed">
            Thank you! Your inspection request has been routed to our San Diego project team. A licensed specialist will contact you shortly.
          </p>
          <div className="glass-chip rounded-2xl p-4 mb-6 text-left max-w-md mx-auto">
            <p className="text-[11px] text-[var(--text-muted)] font-bold uppercase tracking-wider mb-1">
              Need Same-Day Emergency Response?
            </p>
            <a
              href={PHONE_HREF}
              className="inline-flex items-center gap-2 text-sm font-bold text-brand-blue hover:text-[#1C88DD] transition-colors"
            >
              <Icon name="phone" className="w-4 h-4" />
              <span>Call our dispatch desk at {PHONE_NUMBER}</span>
            </a>
          </div>
          <button
            type="button"
            onClick={() => setSubmitted(false)}
            className="text-xs text-[var(--text-muted)] hover:text-brand-blue underline cursor-pointer"
          >
            ← Submit Another Inquiry
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="fullName" className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5 block">
                Full Name *
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                required
                placeholder="e.g. Sarah Jenkins"
                className="glass-input w-full px-4 py-3 rounded-xl text-sm font-medium"
              />
            </div>
            <div>
              <label htmlFor="phone" className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5 block">
                Phone Number *
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                required
                placeholder="(760) 000-0000"
                className="glass-input w-full px-4 py-3 rounded-xl text-sm font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5 block">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="you@domain.com"
                className="glass-input w-full px-4 py-3 rounded-xl text-sm font-medium"
              />
            </div>
            <div>
              <label htmlFor="serviceType" className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5 block">
                Roofing Service Needed
              </label>
              <CustomSelect
                id="serviceType"
                name="serviceType"
                value={serviceType}
                onChange={setServiceType}
                options={[
                  { value: 'residential', label: 'Residential Tile / Shingle' },
                  { value: 'repair', label: 'Leak Diagnostic & Repair' },
                  { value: 'commercial', label: 'Commercial Flat / TPO' },
                  { value: 'solar', label: 'Solar Roofing Integration' },
                  { value: 'construction', label: 'General Construction / Dry Rot' },
                  { value: 'other', label: 'Other Inquiry' },
                ]}
                triggerClassName="glass-input rounded-xl text-sm font-medium py-2.5"
              />
            </div>
          </div>

          <div>
            <label htmlFor="address" className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5 block">
              Property Address or City
            </label>
            <input
              id="address"
              name="address"
              type="text"
              placeholder="e.g. 1234 Coast Hwy, Oceanside, CA"
              className="glass-input w-full px-4 py-3 rounded-xl text-sm font-medium"
            />
          </div>

          <div>
            <label htmlFor="message" className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5 block">
              Project Details or Specific Concerns
            </label>
            <textarea
              id="message"
              name="message"
              rows={3}
              placeholder="Describe leak location, roof age, or project goals..."
              className="glass-input w-full px-4 py-3 rounded-xl text-sm font-medium resize-none"
            />
          </div>

          {/* Invisible Multi-Decoy Honeypots */}
          <div className="opacity-0 absolute -left-[9999px] h-0 w-0 pointer-events-none overflow-hidden" aria-hidden="true" tabIndex={-1}>
            <input type="text" name="business_fax" tabIndex={-1} autoComplete="off" defaultValue="" />
            <input type="text" name="company_website" tabIndex={-1} autoComplete="off" defaultValue="" />
          </div>

          {/* Cloudflare Turnstile (Managed/Invisible) */}
          <Turnstile onVerify={(token) => setTurnstileToken(token)} />

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#2E9BF0] hover:bg-[#1C88DD] text-white font-bold text-xs uppercase tracking-wider py-4 px-8 rounded-xl shadow-xl shadow-brand-blue/30 transition-all flex items-center justify-center gap-2 cursor-pointer hover:brightness-110 disabled:opacity-75"
          >
            <span>{submitting ? 'Submitting Request...' : 'Send Free Estimate Request'}</span>
            <Icon name="arrow-right" className="w-4 h-4" />
          </button>

          <div className="pt-2 flex items-center justify-center gap-4 text-[11px] text-[var(--text-muted)]">
            <span>✓ 100% Itemized Proposal</span>
            <span>•</span>
            <span>✓ No Obligation</span>
            <span>•</span>
            <span>✓ Licensed &amp; Bonded</span>
          </div>
        </form>
      )}
    </div>
  );
}
