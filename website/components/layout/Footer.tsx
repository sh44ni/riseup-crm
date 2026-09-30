'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Icon, GoogleIcon, YelpIcon } from '@/components/shared/Icon';
import {
  PHONE_HREF,
  PHONE_NUMBER,
  COMPANY_NAME,
  LICENSE_NUMBER,
  cn,
  GOOGLE_REVIEWS_URL,
  YELP_REVIEWS_URL,
} from '@/lib/utils';
import { Container } from '@/components/shared/Container';
import { TOP_CITIES } from '@/lib/data/navigation';
import { Tooltip } from '@/components/shared/Tooltip';
import type { ReviewStats } from '@/lib/reviews-server';

const SERVICES = [
  { label: 'Roof Inspection & Diagnostics', href: '/services/roof-inspection' },
  { label: 'Residential Roofing', href: '/services/residential' },
  { label: 'Roof Leak Repair', href: '/services/roof-repair' },
  { label: 'Tile Roofing & Relay', href: '/services/tile-roofing' },
  { label: 'Standing Seam Metal', href: '/services/metal-roofing' },
  { label: 'Siding Installation & Repair', href: '/services/siding' },
  { label: 'Home & Room Additions', href: '/services/home-additions' },
  { label: 'ADU Construction Contractors', href: '/services/adu-construction' },
  { label: 'Commercial Roofing', href: '/services/commercial-roofing' },
  { label: 'Commercial Roof Inspection', href: '/services/commercial-roof-inspection' },
  { label: 'Industrial Roofing Contractors', href: '/services/industrial-roofing' },
  { label: 'Modified Bitumen & BUR', href: '/services/modified-bitumen' },
  { label: 'Silicone Roof Coatings', href: '/services/roof-coating' },
  { label: 'Solar Roofing Integration', href: '/services/solar-roofing' },
  { label: 'Custom Deck Builder', href: '/services/deck-builder' },
  { label: 'General Construction & Framing', href: '/services/construction' },
  { label: 'Roof Financing San Diego', href: '/roof-financing-san-diego' },
];


const COMPANY_LINKS = [
  { label: 'About Us', href: '/about' },
  { label: 'Knowledge Hub & Guides', href: '/guides' },
  { label: 'Roof Tear-Off Guide', href: '/about/roof-tear-off-process' },
  { label: 'Featured Projects', href: '/projects' },
  { label: 'Client Reviews', href: '/reviews' },
  { label: 'Warranties & Certifications', href: '/#certifications' },
  { label: 'Careers', href: '/careers' },
  { label: 'Contact Us', href: '/contact' },
];

const ESCONDIDO_CHAMBER_URL =
  'https://business.escondidochamber.org/list/member/rise-up-roofing-and-construction-inc-9925';

export function Footer({ stats }: { stats?: ReviewStats } = {}) {
  const [capabilitiesOpen, setCapabilitiesOpen] = useState(false);
  const [areasOpen, setAreasOpen] = useState(false);
  const [companyOpen, setCompanyOpen] = useState(false);
  return (
    <footer className="always-dark relative bg-[#03080E] text-white border-t border-white/10 overflow-hidden select-none">
      {/* Subtle Ambient Radial Lighting */}
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-brand-blue/10 rounded-full blur-3xl pointer-events-none" />

      {/* Background Watermark Signature */}
      <div className="absolute -bottom-20 right-0 opacity-[0.02] pointer-events-none select-none">
        <span className="text-[180px] lg:text-[240px] font-black tracking-tighter text-white font-mono">
          RISE UP
        </span>
      </div>
      <div className="py-14 lg:py-16 relative z-10">
        <Container>
          {/* Top Quick Status & Contact Header Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-8 mb-10 border-b border-white/10">
            {/* Live Dispatch Pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>24/7 San Diego Storm &amp; Leak Dispatch Active</span>
            </div>

            {/* Quick Contact Buttons */}
            <div className="flex items-center gap-3">
              <Tooltip content="Direct phone hotline">
                <a
                  href={PHONE_HREF}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/[0.06] hover:bg-brand-blue hover:border-brand-blue text-white font-bold text-xs border border-white/15 transition-all"
                >
                  <Icon name="phone" className="w-3.5 h-3.5 text-brand-blue group-hover:text-white" />
                  <span>{PHONE_NUMBER}</span>
                </a>
              </Tooltip>

              <Tooltip content="Direct client email">
                <a
                  href="mailto:info@riseuprac.com"
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white/80 hover:text-white text-xs border border-white/15 transition-all"
                >
                  <Icon name="mail" className="w-3.5 h-3.5 text-brand-blue" />
                  <span>info@riseuprac.com</span>
                </a>
              </Tooltip>
            </div>
          </div>

          {/* Main Grid: 5-col Brand & Dock + 7-col 3-Column Navigation */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-12 pb-12 border-b border-white/10">
            {/* Left: Brand Bio & Platform Dock (5 cols) */}
            <div className="lg:col-span-5 flex flex-col justify-between">
              <div>
                <Link href="/" className="inline-block mb-4">
                  <Image
                    src="/logo-white.svg"
                    alt={COMPANY_NAME}
                    width={180}
                    height={50}
                    className="h-9 w-auto object-contain"
                  />
                </Link>

                <p className="text-xs sm:text-[13px] text-white/65 leading-relaxed max-w-sm mb-6">
                  Master roofing and architectural construction contractor serving San Diego County. Owens Corning non-prorated warranties up to 50 years.
                </p>

                {/* Frosted Floating Platform Dock */}
                <div className="inline-flex items-center gap-1.5 p-1.5 rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/10 shadow-lg">
                  {/* Google */}
                  <Tooltip content={`Google Business Profile & ${stats?.googleRating ? stats.googleRating.toFixed(1) : '5.0'}★ Reviews`}>
                    <a
                      href={GOOGLE_REVIEWS_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Google Business Profile"
                      className="w-8 h-8 rounded-xl bg-white/[0.06] hover:bg-white/20 border border-white/10 flex items-center justify-center text-white/80 hover:text-white transition-all hover:scale-105"
                    >
                      <GoogleIcon className="w-4 h-4" />
                    </a>
                  </Tooltip>

                  {/* Yelp */}
                  <Tooltip content={`${stats?.yelpRating ? stats.yelpRating.toFixed(1) : '5.0'}★ Verified Reviews on Yelp`}>
                    <a
                      href={YELP_REVIEWS_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Yelp Reviews"
                      className="w-8 h-8 rounded-xl bg-white/[0.06] hover:bg-white/20 border border-white/10 flex items-center justify-center text-white/80 hover:text-white transition-all hover:scale-105"
                    >
                      <YelpIcon className="w-4 h-4" />
                    </a>
                  </Tooltip>

                  {/* Instagram */}
                  <Tooltip content="Follow Rise Up on Instagram">
                    <a
                      href="https://www.instagram.com/riseuproofingandconstruction/"
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Instagram"
                      className="w-8 h-8 rounded-xl bg-white/[0.06] hover:bg-white/20 border border-white/10 flex items-center justify-center text-white/80 hover:text-white transition-all hover:scale-105"
                    >
                      <Icon name="instagram" className="w-4 h-4" />
                    </a>
                  </Tooltip>

                  {/* Facebook */}
                  <Tooltip content="Connect on Facebook">
                    <a
                      href="https://www.facebook.com/profile.php?id=61551393216836"
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Facebook"
                      className="w-8 h-8 rounded-xl bg-white/[0.06] hover:bg-white/20 border border-white/10 flex items-center justify-center text-white/80 hover:text-white transition-all hover:scale-105"
                    >
                      <Icon name="facebook" className="w-4 h-4" />
                    </a>
                  </Tooltip>

                  {/* Owens Corning Official Contractor Profile */}
                  <Tooltip content="Owens Corning Preferred Contractor (#247226)">
                    <a
                      href="https://www.owenscorning.com/en-us/roofing/contractors/contractor-profile/247226"
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Owens Corning Preferred Contractor Profile"
                      className="w-8 h-8 rounded-xl bg-white/[0.06] hover:bg-white/20 border border-white/10 flex items-center justify-center p-1 transition-all hover:scale-105"
                    >
                      <Image
                        src="/badges/owens_corning_icon_org.png"
                        alt="Owens Corning"
                        width={22}
                        height={22}
                        className="w-full h-full object-contain rounded-sm"
                      />
                    </a>
                  </Tooltip>

                  {/* Escondido Chamber of Commerce */}
                  <Tooltip content="Escondido Chamber of Commerce Member">
                    <a
                      href={ESCONDIDO_CHAMBER_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Escondido Chamber of Commerce Verified Member"
                      className="w-8 h-8 rounded-xl bg-white/[0.06] hover:bg-white/20 border border-white/10 flex items-center justify-center p-1 transition-all hover:scale-105"
                    >
                      <Image
                        src="/badges/escondido-chamber.png"
                        alt="Escondido Chamber of Commerce"
                        width={22}
                        height={22}
                        className="w-full h-full object-contain"
                      />
                    </a>
                  </Tooltip>
                </div>
              </div>

              {/* License & Credential Pill */}
              <div className="mt-8 flex items-center gap-2 text-xs text-white/50">
                <Tooltip content="Verified active with California Contractors State License Board">
                  <span className="inline-flex items-center gap-2 cursor-help">
                    <Icon name="shield-check" className="w-4 h-4 text-brand-gold flex-shrink-0" />
                    <span>CA Lic #{LICENSE_NUMBER} • Class B &amp; C-39 Bonded &amp; Insured</span>
                  </span>
                </Tooltip>
              </div>
            </div>

            {/* Desktop Navigation Columns (100% untouched on md+) */}
            {/* Col 2: Services (3 cols) */}
            <div className="hidden md:block lg:col-span-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-4">
                Capabilities
              </h4>
              <ul className="space-y-2.5">
                {SERVICES.map((s) => (
                  <li key={s.label}>
                    <Link
                      href={s.href}
                      className="text-xs text-white/60 hover:text-white transition-colors inline-block"
                    >
                      {s.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Col 3: Service Areas (2 cols) */}
            <div className="hidden md:block lg:col-span-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-4">
                Service Areas
              </h4>
              <ul className="space-y-2.5">
                {TOP_CITIES.slice(0, 5).map((city) => (
                  <li key={city.slug}>
                    <Link
                      href={`/service-area/${city.slug}`}
                      className="text-xs text-white/60 hover:text-white transition-colors inline-block"
                    >
                      {city.name}, CA
                    </Link>
                  </li>
                ))}
                <li>
                  <Link
                    href="/service-area"
                    className="text-xs font-bold text-brand-blue hover:text-white transition-colors inline-flex items-center gap-1"
                  >
                    <span>All 30+ Cities</span>
                    <Icon name="arrow-up-right" className="w-3 h-3" />
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 4: Company (2 cols) */}
            <div className="hidden md:block lg:col-span-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-4">
                Company
              </h4>
              <ul className="space-y-2.5">
                {COMPANY_LINKS.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-xs text-white/60 hover:text-white transition-colors inline-block"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Mobile Accordions — Collapsible on mobile only (Eliminates mobile scroll trap) */}
            <div className="col-span-1 md:hidden space-y-2 pt-2 border-t border-white/10">
              {/* Capabilities Accordion */}
              <div className="border border-white/10 rounded-xl overflow-hidden bg-white/[0.02]">
                <button
                  type="button"
                  onClick={() => setCapabilitiesOpen(!capabilitiesOpen)}
                  className="w-full flex items-center justify-between p-3.5 text-xs font-bold uppercase tracking-wider text-white hover:text-brand-blue transition-colors cursor-pointer"
                  aria-expanded={capabilitiesOpen}
                >
                  <span>Capabilities &amp; Services</span>
                  <Icon name="chevron-down" className={cn('w-4 h-4 text-white/60 transition-transform duration-200', capabilitiesOpen && 'rotate-180 text-brand-blue')} />
                </button>
                {capabilitiesOpen && (
                  <ul className="px-3.5 pb-3.5 pt-1 space-y-2.5 border-t border-white/5">
                    {SERVICES.map((s) => (
                      <li key={s.label}>
                        <Link href={s.href} className="text-xs text-white/70 hover:text-white transition-colors block py-1">
                          {s.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Service Areas Accordion */}
              <div className="border border-white/10 rounded-xl overflow-hidden bg-white/[0.02]">
                <button
                  type="button"
                  onClick={() => setAreasOpen(!areasOpen)}
                  className="w-full flex items-center justify-between p-3.5 text-xs font-bold uppercase tracking-wider text-white hover:text-brand-blue transition-colors cursor-pointer"
                  aria-expanded={areasOpen}
                >
                  <span>Service Areas</span>
                  <Icon name="chevron-down" className={cn('w-4 h-4 text-white/60 transition-transform duration-200', areasOpen && 'rotate-180 text-brand-blue')} />
                </button>
                {areasOpen && (
                  <ul className="px-3.5 pb-3.5 pt-1 space-y-2.5 border-t border-white/5">
                    {TOP_CITIES.slice(0, 8).map((city) => (
                      <li key={city.slug}>
                        <Link href={`/service-area/${city.slug}`} className="text-xs text-white/70 hover:text-white transition-colors block py-1">
                          {city.name}, CA
                        </Link>
                      </li>
                    ))}
                    <li className="pt-1">
                      <Link href="/service-area" className="text-xs font-bold text-brand-blue hover:text-white transition-colors inline-flex items-center gap-1">
                        <span>All 30+ San Diego Cities</span>
                        <Icon name="arrow-up-right" className="w-3 h-3" />
                      </Link>
                    </li>
                  </ul>
                )}
              </div>

              {/* Company Accordion */}
              <div className="border border-white/10 rounded-xl overflow-hidden bg-white/[0.02]">
                <button
                  type="button"
                  onClick={() => setCompanyOpen(!companyOpen)}
                  className="w-full flex items-center justify-between p-3.5 text-xs font-bold uppercase tracking-wider text-white hover:text-brand-blue transition-colors cursor-pointer"
                  aria-expanded={companyOpen}
                >
                  <span>Company</span>
                  <Icon name="chevron-down" className={cn('w-4 h-4 text-white/60 transition-transform duration-200', companyOpen && 'rotate-180 text-brand-blue')} />
                </button>
                {companyOpen && (
                  <ul className="px-3.5 pb-3.5 pt-1 space-y-2.5 border-t border-white/5">
                    {COMPANY_LINKS.map((link) => (
                      <li key={link.label}>
                        <Link href={link.href} className="text-xs text-white/70 hover:text-white transition-colors block py-1">
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Bar — with pb-20 on mobile to clear bottom tab bar */}
          <div className="pt-8 pb-20 md:pb-0 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/45">
            <p>
              &copy; {new Date().getFullYear()} {COMPANY_NAME} Inc. All rights reserved.
            </p>

            {/* Powered By PROJEKTS */}
            <div className="flex items-center gap-2 text-xs text-white/55">
              <span>Powered by</span>
              <a
                href="https://projektsvision.com"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.10] border border-white/10 hover:border-brand-blue/40 text-white hover:text-brand-blue font-extrabold tracking-wider transition-all duration-200 shadow-2xs"
              >
                <span>PROJEKTS</span>
                <Icon name="arrow-up-right" className="w-3 h-3 text-brand-blue transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </a>
            </div>

            {/* Legal Links */}
            <div className="flex items-center gap-5">
              <Link href="/privacy" className="hover:text-white transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="hover:text-white transition-colors">
                Terms of Service
              </Link>
              <Link href="/contact" className="hover:text-white transition-colors">
                Support
              </Link>
            </div>
          </div>
        </Container>
      </div>
    </footer>
  );
}




