'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/shared/Icon';
import { cn, PHONE_HREF, PHONE_NUMBER, LICENSE_NUMBER } from '@/lib/utils';
import { SERVICES_NAV, TOP_CITIES } from '@/lib/data/navigation';
import type { ReviewStats } from '@/lib/reviews-server';

export function MobileNav({ stats }: { stats?: ReviewStats }) {
  const [open, setOpen] = useState(false);
  const [servicesExpanded, setServicesExpanded] = useState(false);
  const [areasExpanded, setAreasExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close drawer on path change
  useEffect(() => {
    setOpen(false);
    setServicesExpanded(false);
    setAreasExpanded(false);
  }, [pathname]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [open]);

  // Command Sheet Content rendered directly into document.body via Portal
  const sheetContent = open && mounted ? (
    <div className="fixed inset-0 z-[9999] lg:hidden flex justify-end">
      {/* Smooth Dark Backdrop */}
      <div
        className="fixed inset-0 bg-[#07131F]/80 backdrop-blur-md transition-opacity duration-300 animate-in fade-in"
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Slide-in Command Sheet Container */}
      <div className="relative w-full max-w-[420px] h-full bg-[#0A1624] text-white shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-300 ease-out border-l border-white/10 overflow-hidden">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-[#07131F]/90 backdrop-blur-xl flex-shrink-0">
          <Link href="/" onClick={() => setOpen(false)} className="flex items-center group">
            <Image
              src="/logo-white.svg"
              alt="Rise Up Roofing"
              width={160}
              height={44}
              priority
              className="h-8 w-auto object-contain transition-transform group-hover:scale-[1.02]"
            />
          </Link>

          <button
            onClick={() => setOpen(false)}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-white/80 hover:text-white transition-all cursor-pointer border border-white/10"
            aria-label="Close menu"
          >
            <Icon name="x" className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Scrollable Command Hub */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6 scrollbar-thin">
          {/* 1. Value Hub: Emergency Dispatch & Instant Estimate */}
          <div className="rounded-2xl p-4 bg-gradient-to-br from-[#112338] to-[#0d1c2d] border border-blue-500/25 shadow-lg relative overflow-hidden">
            <div className="flex items-center gap-2 mb-3">
              <span className="relative flex h-2 w-2">
                <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                24/7 San Diego Storm Dispatch Active
              </span>
            </div>

            {/* Direct Phone Call Button */}
            <a
              href={PHONE_HREF}
              className="flex items-center justify-between p-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] active:scale-[0.98] border border-white/15 transition-all mb-2.5 group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                  <Icon name="phone" className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/60">
                    Emergency Hotline
                  </p>
                  <p className="text-sm font-extrabold text-white group-hover:text-emerald-300 transition-colors">
                    {PHONE_NUMBER}
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/20 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                Call Now
              </span>
            </a>

            {/* Free Estimate CTA */}
            <Link
              href="/contact"
              onClick={() => setOpen(false)}
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-brand-blue to-[#1C88DD] hover:brightness-110 active:scale-[0.98] text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-brand-blue/30 transition-all cursor-pointer"
            >
              <Icon name="sparkles" className="w-4 h-4 text-white animate-pulse" />
              <span>Get Free Drone Estimate</span>
              <Icon name="arrow-right" className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* 2. Visual Service Quick-Launcher (4 Tiles) */}
          <div>
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-white/50">
                Quick Service Launch
              </span>
              <Link
                href="/services"
                onClick={() => setOpen(false)}
                className="text-[11px] font-semibold text-brand-blue hover:underline"
              >
                All Services →
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <Link
                href="/services/residential"
                onClick={() => setOpen(false)}
                className="p-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-brand-blue/40 transition-all flex flex-col gap-2 group cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-brand-blue flex items-center justify-center">
                  <Icon name="home" className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white group-hover:text-brand-blue transition-colors">
                    Roof Replacement
                  </h4>
                  <p className="text-[10px] text-white/50 mt-0.5">Owens Corning 50-Yr</p>
                </div>
              </Link>

              <Link
                href="/services/roof-repair"
                onClick={() => setOpen(false)}
                className="p-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-amber-400/40 transition-all flex flex-col gap-2 group cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Icon name="wrench" className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                    Leak Repair
                  </h4>
                  <p className="text-[10px] text-white/50 mt-0.5">Rapid Storm Dispatch</p>
                </div>
              </Link>

              <Link
                href="/services/commercial-roofing"
                onClick={() => setOpen(false)}
                className="p-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-cyan-400/40 transition-all flex flex-col gap-2 group cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                  <Icon name="building" className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                    Commercial TPO
                  </h4>
                  <p className="text-[10px] text-white/50 mt-0.5">Zero Disruption</p>
                </div>
              </Link>

              <Link
                href="/services/solar-roofing"
                onClick={() => setOpen(false)}
                className="p-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-yellow-400/40 transition-all flex flex-col gap-2 group cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-yellow-500/20 text-yellow-400 flex items-center justify-center">
                  <Icon name="sun" className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white group-hover:text-yellow-300 transition-colors">
                    Solar Detach
                  </h4>
                  <p className="text-[10px] text-white/50 mt-0.5">System Relay &amp; Re-Roof</p>
                </div>
              </Link>
            </div>
          </div>

          {/* 3. Navigation Links List */}
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-white/50 px-1 block mb-2">
              Navigation
            </span>

            <Link
              href="/"
              onClick={() => setOpen(false)}
              className={cn(
                'flex items-center justify-between py-2.5 px-3 rounded-xl text-xs font-bold transition-all',
                pathname === '/'
                  ? 'bg-brand-blue/20 text-brand-blue border border-brand-blue/30'
                  : 'text-white/80 hover:bg-white/[0.06] hover:text-white'
              )}
            >
              <span>Home</span>
              <Icon name="chevron-right" className="w-4 h-4 text-white/30" />
            </Link>

            {/* Services Accordion */}
            <div className="rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setServicesExpanded(!servicesExpanded)}
                className={cn(
                  'w-full flex items-center justify-between py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer',
                  pathname.startsWith('/services') || servicesExpanded
                    ? 'bg-white/[0.08] text-brand-blue'
                    : 'text-white/80 hover:bg-white/[0.06] hover:text-white'
                )}
              >
                <span>All Roofing Services</span>
                <Icon name="chevron-down"
                  className={cn(
                    'w-4 h-4 transition-transform duration-200 text-white/40',
                    servicesExpanded && 'rotate-180 text-brand-blue'
                  )}
                />
              </button>

              {servicesExpanded && (
                <div className="pl-3 pr-2 py-2 space-y-1 bg-white/[0.02] rounded-b-xl border border-white/5">
                  {SERVICES_NAV.map((s) => (
                    <Link
                      key={s.href}
                      href={s.href}
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-between p-2 rounded-lg text-xs text-white/70 hover:text-brand-blue hover:bg-white/[0.04] transition-colors"
                    >
                      <span>{s.label}</span>
                      <Icon name="chevron-right" className="w-3.5 h-3.5 text-white/20" />
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Projects */}
            <Link
              href="/projects"
              onClick={() => setOpen(false)}
              className={cn(
                'flex items-center justify-between py-2.5 px-3 rounded-xl text-xs font-bold transition-all',
                pathname.startsWith('/projects')
                  ? 'bg-brand-blue/20 text-brand-blue border border-brand-blue/30'
                  : 'text-white/80 hover:bg-white/[0.06] hover:text-white'
              )}
            >
              <div className="flex items-center gap-2">
                <span>Projects &amp; Case Studies</span>
                <span className="text-[10px] font-extrabold uppercase bg-brand-gold/20 text-amber-300 border border-brand-gold/30 px-1.5 py-0.5 rounded">
                  Photos
                </span>
              </div>
              <Icon name="chevron-right" className="w-4 h-4 text-white/30" />
            </Link>

            {/* Guides */}
            <Link
              href="/guides"
              onClick={() => setOpen(false)}
              className={cn(
                'flex items-center justify-between py-2.5 px-3 rounded-xl text-xs font-bold transition-all',
                pathname.startsWith('/guides')
                  ? 'bg-brand-blue/20 text-brand-blue border border-brand-blue/30'
                  : 'text-white/80 hover:bg-white/[0.06] hover:text-white'
              )}
            >
              <div className="flex items-center gap-2">
                <span>Knowledge Hub &amp; Guides</span>
                <span className="text-[10px] font-extrabold uppercase bg-brand-blue/20 text-blue-300 border border-brand-blue/30 px-1.5 py-0.5 rounded">
                  Library
                </span>
              </div>
              <Icon name="chevron-right" className="w-4 h-4 text-white/30" />
            </Link>

            {/* Roof Financing */}
            <Link
              href="/roof-financing-san-diego"
              onClick={() => setOpen(false)}
              className={cn(
                'flex items-center justify-between py-2.5 px-3 rounded-xl text-xs font-bold transition-all',
                pathname === '/roof-financing-san-diego'
                  ? 'bg-brand-blue/20 text-brand-blue border border-brand-blue/30'
                  : 'text-white/80 hover:bg-white/[0.06] hover:text-white'
              )}
            >
              <div className="flex items-center gap-2">
                <span>Roof Financing</span>
                <span className="text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                  $0 Down
                </span>
              </div>
              <Icon name="chevron-right" className="w-4 h-4 text-white/30" />
            </Link>

            {/* Service Areas Accordion */}
            <div className="rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setAreasExpanded(!areasExpanded)}
                className={cn(
                  'w-full flex items-center justify-between py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer',
                  pathname.startsWith('/service-area') || areasExpanded
                    ? 'bg-white/[0.08] text-brand-blue'
                    : 'text-white/80 hover:bg-white/[0.06] hover:text-white'
                )}
              >
                <div className="flex items-center gap-2">
                  <Icon name="map-pin" className="w-3.5 h-3.5 text-white/40" />
                  <span>Service Areas</span>
                </div>
                <Icon name="chevron-down"
                  className={cn(
                    'w-4 h-4 transition-transform duration-200 text-white/40',
                    areasExpanded && 'rotate-180 text-brand-blue'
                  )}
                />
              </button>

              {areasExpanded && (
                <div className="pl-3 pr-2 py-2 grid grid-cols-2 gap-1.5 bg-white/[0.02] rounded-b-xl border border-white/5">
                  {TOP_CITIES.map((city) => (
                    <Link
                      key={city.slug}
                      href={`/service-area/${city.slug}`}
                      onClick={() => setOpen(false)}
                      className="p-2 text-xs font-medium text-white/70 hover:text-brand-blue hover:bg-white/[0.04] rounded-lg transition-colors"
                    >
                      {city.name}
                    </Link>
                  ))}
                  <Link
                    href="/service-area"
                    onClick={() => setOpen(false)}
                    className="col-span-2 p-2 text-xs font-bold text-brand-blue hover:underline"
                  >
                    View All 30+ San Diego Cities →
                  </Link>
                </div>
              )}
            </div>

            {/* Reviews */}
            <Link
              href="/reviews"
              onClick={() => setOpen(false)}
              className={cn(
                'flex items-center justify-between py-2.5 px-3 rounded-xl text-xs font-bold transition-all',
                pathname === '/reviews'
                  ? 'bg-brand-blue/20 text-brand-blue border border-brand-blue/30'
                  : 'text-white/80 hover:bg-white/[0.06] hover:text-white'
              )}
            >
              <div className="flex items-center gap-2">
                <span>Client Reviews</span>
                <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-300 bg-amber-500/20 border border-amber-500/30 px-1.5 py-0.5 rounded">
                  <Icon name="star" className="w-2.5 h-2.5 text-amber-400 fill-amber-400" /> {stats?.averageRating ? stats.averageRating.toFixed(1) : '5.0'}★
                </span>
              </div>
              <Icon name="chevron-right" className="w-4 h-4 text-white/30" />
            </Link>

            {/* About */}
            <Link
              href="/about"
              onClick={() => setOpen(false)}
              className={cn(
                'flex items-center justify-between py-2.5 px-3 rounded-xl text-xs font-bold transition-all',
                pathname === '/about'
                  ? 'bg-brand-blue/20 text-brand-blue border border-brand-blue/30'
                  : 'text-white/80 hover:bg-white/[0.06] hover:text-white'
              )}
            >
              <span>About Rise Up</span>
              <Icon name="chevron-right" className="w-4 h-4 text-white/30" />
            </Link>

            {/* Careers */}
            <Link
              href="/careers"
              onClick={() => setOpen(false)}
              className={cn(
                'flex items-center justify-between py-2.5 px-3 rounded-xl text-xs font-bold transition-all',
                pathname.startsWith('/careers')
                  ? 'bg-brand-blue/20 text-brand-blue border border-brand-blue/30'
                  : 'text-white/80 hover:bg-white/[0.06] hover:text-white'
              )}
            >
              <div className="flex items-center gap-2">
                <span>Careers</span>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                  Hiring
                </span>
              </div>
              <Icon name="chevron-right" className="w-4 h-4 text-white/30" />
            </Link>

            {/* Contact */}
            <Link
              href="/contact"
              onClick={() => setOpen(false)}
              className={cn(
                'flex items-center justify-between py-2.5 px-3 rounded-xl text-xs font-bold transition-all',
                pathname === '/contact'
                  ? 'bg-brand-blue/20 text-brand-blue border border-brand-blue/30'
                  : 'text-white/80 hover:bg-white/[0.06] hover:text-white'
              )}
            >
              <span>Contact Us</span>
              <Icon name="chevron-right" className="w-4 h-4 text-white/30" />
            </Link>
          </div>

          {/* 4. Social Proof & Trust Badges */}
          <div className="pt-4 border-t border-white/10 grid grid-cols-2 gap-2 text-[11px] text-white/70">
            <div className="flex items-center gap-1.5 p-2 rounded-lg bg-white/[0.03] border border-white/5">
              <Icon name="shield-check" className="w-4 h-4 text-brand-gold flex-shrink-0" />
              <span className="truncate">CA Lic #{LICENSE_NUMBER}</span>
            </div>
            <div className="flex items-center gap-1.5 p-2 rounded-lg bg-white/[0.03] border border-white/5">
              <Icon name="check-circle" className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span className="truncate">Owens Corning Preferred</span>
            </div>
          </div>
        </div>

        {/* 5. Modern Bottom Attribution */}
        <div className="px-5 py-4 border-t border-white/10 bg-[#07131F] flex items-center justify-between text-xs text-white/50 flex-shrink-0">
          <span>&copy; {new Date().getFullYear()} Rise Up</span>

          {/* Powered by PROJEKTS link */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px]">Powered by</span>
            <a
              href="https://projektsvision.com"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 hover:border-brand-blue/40 text-white hover:text-brand-blue font-extrabold tracking-wider transition-all duration-200"
            >
              <span>PROJEKTS</span>
              <Icon name="arrow-up-right" className="w-3 h-3 text-brand-blue transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      {/* Tactile Mobile Menu Trigger Button */}
      <button
        type="button"
        className="lg:hidden inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-theme-primary bg-[var(--surface-overlay)] hover:border-[var(--border-emphasis)] border border-[var(--border-default)] transition-all active:scale-95 shadow-2xs cursor-pointer focus-visible:outline-brand-blue"
        onClick={() => setOpen(!open)}
        aria-label={open ? 'Close menu' : 'Open navigation menu'}
        aria-expanded={open}
      >
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-theme-primary">
          Menu
        </span>
        {open ? (
          <Icon name="x" className="w-4 h-4 stroke-[2.5] text-brand-blue" />
        ) : (
          <div className="flex flex-col gap-1 w-4 items-end justify-center">
            <span className="w-4 h-[2px] bg-current rounded-full" />
            <span className="w-3 h-[2px] bg-current rounded-full" />
            <span className="w-3.5 h-[2px] bg-current rounded-full" />
          </div>
        )}
      </button>

      {/* Portal Container */}
      {sheetContent ? createPortal(sheetContent, document.body) : null}
    </>
  );
}
