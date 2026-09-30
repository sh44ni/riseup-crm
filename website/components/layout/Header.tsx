'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { Icon } from '@/components/shared/Icon';
import { cn, PHONE_HREF, PHONE_NUMBER, LICENSE_NUMBER } from '@/lib/utils';
import { SERVICES_MEGA_MENU, TOP_CITIES } from '@/lib/data/navigation';
import type { ReviewStats } from '@/lib/reviews-server';
import { MobileNav } from './MobileNav';

const ROUTE_LABELS: Record<string, string> = {
  services: 'Services',
  projects: 'Projects',
  reviews: 'Reviews',
  about: 'About',
  contact: 'Estimate',
  careers: 'Careers',
  'service-area': 'Areas',
  'roof-financing-san-diego': 'Financing',
  guides: 'Guides',
  privacy: 'Privacy',
  terms: 'Terms',
};

const ROUTE_TITLES: Record<string, string> = {
  services: 'Our Services',
  projects: 'Our Projects',
  reviews: 'Client Reviews',
  about: 'About Rise Up',
  contact: 'Free Estimate',
  careers: 'Careers',
  'service-area': 'Service Areas',
  'roof-financing-san-diego': 'Roof Financing San Diego',
  guides: 'Knowledge Hub & Technical Guides',
  privacy: 'Privacy Policy',
  terms: 'Terms of Service',
};

function getRouteNavInfo(pathname: string | null) {
  if (!pathname || pathname === '/') return null;
  if (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/proposal') ||
    pathname.startsWith('/inspection') ||
    pathname.startsWith('/warranty')
  ) {
    return null;
  }

  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return null;

  const first = segments[0];

  if (segments.length === 1) {
    return {
      parentHref: '/',
      label: 'Home',
      title: ROUTE_TITLES[first] || first.charAt(0).toUpperCase() + first.slice(1),
    };
  }

  const parentHref = `/${first}`;
  const parentLabel = ROUTE_LABELS[first] || first.charAt(0).toUpperCase() + first.slice(1);
  const slug = segments[1];

  const title = slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  return {
    parentHref,
    label: parentLabel,
    title,
  };
}

export function Header({ stats }: { stats?: ReviewStats } = {}) {
  const [scrolled, setScrolled] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [areasOpen, setAreasOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const navInfo = getRouteNavInfo(pathname);

  const handleMobileBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else if (navInfo?.parentHref) {
      router.push(navInfo.parentHref);
    }
  };

  const servicesTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const areasTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let ticking = false;
    let lastScrolled = false;

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const isScrolled = window.scrollY > 30;
          if (isScrolled !== lastScrolled) {
            setScrolled(isScrolled);
            lastScrolled = isScrolled;
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close dropdowns on route change
  useEffect(() => {
    setServicesOpen(false);
    setAreasOpen(false);
  }, [pathname]);

  const handleServicesEnter = () => {
    if (servicesTimeoutRef.current) clearTimeout(servicesTimeoutRef.current);
    setServicesOpen(true);
    setAreasOpen(false);
  };

  const handleServicesLeave = () => {
    servicesTimeoutRef.current = setTimeout(() => {
      setServicesOpen(false);
    }, 150);
  };

  const handleAreasEnter = () => {
    if (areasTimeoutRef.current) clearTimeout(areasTimeoutRef.current);
    setAreasOpen(true);
    setServicesOpen(false);
  };

  const handleAreasLeave = () => {
    areasTimeoutRef.current = setTimeout(() => {
      setAreasOpen(false);
    }, 150);
  };

  return (
    <header className="fixed top-0 inset-x-0 z-50">
      {/* UTILITY TIER — collapses on scroll */}
      <div
        className={cn(
          'w-full bg-[#07131F]/95 text-white/90 border-b border-white/10 transition-all duration-300 overflow-hidden backdrop-blur-md',
          scrolled ? 'max-h-0 opacity-0 py-0 border-b-0' : 'max-h-12 opacity-100 py-1.5'
        )}
      >
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-12 flex items-center justify-between text-[11px]">
          {/* Left: Live Dispatch + License */}
          <div className="flex items-center gap-5">
            <div className="inline-flex items-center gap-1.5 font-medium text-white">
              <span className="relative flex h-2 w-2">
                <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>24/7 Emergency Storm Dispatch</span>
            </div>

            <div className="hidden md:flex items-center gap-1.5 text-white/70">
              <Icon name="shield-check" className="w-3.5 h-3.5 text-brand-gold" />
              <span>CA License #{LICENSE_NUMBER} • Fully Bonded</span>
            </div>
          </div>

          {/* Right: Reviews + Direct Email */}
          <div className="flex items-center gap-5">
            <Link
              href="/reviews"
              className="inline-flex items-center gap-1.5 text-white hover:text-brand-gold transition-colors font-medium"
            >
              <div className="flex text-amber-400">
                <Icon name="star" className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              </div>
              <span className="font-bold text-white">
                {stats?.averageRating ? stats.averageRating.toFixed(1) : '5.0'} / 5.0
              </span>
              <span className="text-white/70 hidden sm:inline">
                {stats?.totalCount ? `(${stats.totalCount} Verified Reviews)` : '(Verified Reviews)'}
              </span>
            </Link>

            <span className="hidden sm:inline-block text-white/30">|</span>

            <a
              href="mailto:info@riseuprac.com"
              className="hidden sm:flex items-center gap-1.5 text-white/80 hover:text-white transition-colors"
            >
              <Icon name="mail" className="w-3.5 h-3.5 text-brand-blue" />
              <span>info@riseuprac.com</span>
            </a>
          </div>
        </div>
      </div>

      {/* MAIN NAVIGATION — Frosted Glass Bar with Generous Height & Presence */}
      <div
        className={cn(
          'w-full glass-nav-surface transition-all duration-300 backdrop-blur-2xl'
        )}
      >
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-12 py-3 sm:py-3.5 lg:py-4 flex items-center justify-between gap-4 xl:gap-8">
          {/* Brand Logo & Mobile App Back Navigation */}
          {navInfo ? (
            <>
              {/* Desktop: Full brand logo */}
              <Link
                href="/"
                className="hidden lg:flex flex-shrink-0 items-center group"
                aria-label="Rise Up Roofing & Construction - Home"
              >
                <Image
                  src="/logo.svg"
                  alt="Rise Up Roofing & Construction"
                  width={180}
                  height={50}
                  priority
                  className="h-9 sm:h-10 lg:h-11 w-auto object-contain transition-transform group-hover:scale-[1.02]"
                />
              </Link>

              {/* Mobile: App-like Back Button & Current View Title */}
              <div className="lg:hidden flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                <button
                  type="button"
                  onClick={handleMobileBack}
                  className="inline-flex items-center gap-1 -ml-1 px-3 py-2 rounded-xl bg-slate-100/90 dark:bg-white/10 hover:bg-slate-200 text-theme-primary font-bold text-xs transition-all active:scale-95 border border-slate-200/60 shadow-2xs flex-shrink-0 cursor-pointer"
                  aria-label={`Go back to ${navInfo.label}`}
                >
                  <Icon name="chevron-left" className="w-4 h-4 text-brand-blue stroke-[2.5]" />
                  <span className="truncate max-w-[80px] sm:max-w-[120px]">{navInfo.label}</span>
                </button>
                <span className="text-xs sm:text-sm font-extrabold text-theme-primary tracking-tight truncate">
                  {navInfo.title}
                </span>
              </div>
            </>
          ) : (
            <Link
              href="/"
              className="flex-shrink-0 flex items-center group"
              aria-label="Rise Up Roofing & Construction - Home"
            >
              <Image
                src="/logo.svg"
                alt="Rise Up Roofing & Construction"
                width={180}
                height={50}
                priority
                className="h-9 sm:h-10 lg:h-11 w-auto object-contain transition-transform group-hover:scale-[1.02]"
              />
            </Link>
          )}

          {/* Desktop Navigation Links — Refined Interactive Pills */}
          <nav className="hidden lg:flex items-center gap-1.5 xl:gap-2">
            <Link
              href="/"
              className={cn(
                'text-xs xl:text-sm font-bold tracking-tight px-3 py-1.5 rounded-xl transition-all',
                pathname === '/'
                  ? 'text-brand-blue bg-blue-50/80 border border-blue-200/60 shadow-2xs'
                  : 'text-theme-secondary hover:text-theme-primary hover:bg-slate-100/80'
              )}
            >
              Home
            </Link>

            {/* SERVICES MEGA-MENU TRIGGER */}
            <div
              className="relative"
              onMouseEnter={handleServicesEnter}
              onMouseLeave={handleServicesLeave}
            >
              <Link
                href="/services"
                className={cn(
                  'inline-flex items-center gap-1 text-xs xl:text-sm font-bold tracking-tight px-3 py-1.5 rounded-xl transition-all',
                  pathname.startsWith('/services')
                    ? 'text-brand-blue bg-blue-50/80 border border-blue-200/60 shadow-2xs'
                    : 'text-theme-secondary hover:text-theme-primary hover:bg-slate-100/80'
                )}
                aria-expanded={servicesOpen}
              >
                <span>Services</span>
                <Icon name="chevron-down"
                  className={cn(
                    'w-3.5 h-3.5 transition-transform duration-200 text-theme-muted',
                    servicesOpen && 'rotate-180 text-brand-blue'
                  )}
                />
              </Link>

              {/* MEGA-MENU DROPDOWN PANEL */}
              {servicesOpen && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 pt-3 w-[760px] z-50">
                  <div className="bg-white/98 backdrop-blur-2xl rounded-2xl shadow-2xl border border-slate-200/80 p-6 grid grid-cols-3 gap-6 animate-in fade-in zoom-in-95 duration-150">
                    {SERVICES_MEGA_MENU.map((col) => {
                      const Icon = col.icon;
                      return (
                        <div key={col.category} className="flex flex-col">
                          <Link
                            href={col.href}
                            className="group/cat flex items-start gap-3 p-2.5 -mx-2 rounded-xl hover:bg-slate-50 transition-colors"
                          >
                            <div
                              className={cn(
                                'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 border border-slate-200/60',
                                col.color
                              )}
                            >
                              <Icon className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-[#0B1E33] group-hover/cat:text-brand-blue transition-colors">
                                {col.category}
                              </h4>
                              <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">
                                {col.description}
                              </p>
                            </div>
                          </Link>

                          <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col gap-2 pl-2">
                            {col.items.map((item) => (
                              <Link
                                key={item.label}
                                href={item.href}
                                className="text-xs font-medium text-slate-600 hover:text-brand-blue transition-colors py-0.5"
                              >
                                {item.label}
                              </Link>
                            ))}
                          </div>
                        </div>
                      );
                    })}

                    {/* Mega Menu Footer Banner */}
                    <div className="col-span-3 bg-gradient-to-r from-brand-navy to-brand-dark border border-slate-700/40 text-white rounded-xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-blue/20 flex items-center justify-center text-brand-blue border border-brand-blue/30">
                          <Icon name="sparkles" className="w-4 h-4 text-brand-blue" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-white">
                            Need an Emergency Roof Inspection or Repair?
                          </p>
                          <p className="text-[11px] text-white/70">
                            Rapid storm diagnostics &amp; free itemized estimates.
                          </p>
                        </div>
                      </div>
                      <Link
                        href="/contact"
                        className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-navy bg-white px-4 py-2 rounded-lg hover:bg-slate-100 transition-colors shadow-sm"
                      >
                        Book Now <Icon name="arrow-right" className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* PROJECTS */}
            <Link
              href="/projects"
              className={cn(
                'text-xs xl:text-sm font-bold tracking-tight px-3 py-1.5 rounded-xl transition-all',
                pathname.startsWith('/projects')
                  ? 'text-brand-blue bg-blue-50/80 border border-blue-200/60 shadow-2xs'
                  : 'text-theme-secondary hover:text-theme-primary hover:bg-slate-100/80'
              )}
            >
              Projects
            </Link>

            {/* GUIDES */}
            <Link
              href="/guides"
              className={cn(
                'text-xs xl:text-sm font-bold tracking-tight px-3 py-1.5 rounded-xl transition-all',
                pathname.startsWith('/guides')
                  ? 'text-brand-blue bg-blue-50/80 border border-blue-200/60 shadow-2xs'
                  : 'text-theme-secondary hover:text-theme-primary hover:bg-slate-100/80'
              )}
            >
              Guides
            </Link>

            {/* SERVICE AREAS DROPDOWN */}
            <div
              className="relative"
              onMouseEnter={handleAreasEnter}
              onMouseLeave={handleAreasLeave}
            >
              <Link
                href="/service-area"
                className={cn(
                  'inline-flex items-center gap-1 text-xs xl:text-sm font-bold tracking-tight px-3 py-1.5 rounded-xl transition-all',
                  pathname.startsWith('/service-area')
                    ? 'text-brand-blue bg-blue-50/80 border border-blue-200/60 shadow-2xs'
                    : 'text-theme-secondary hover:text-theme-primary hover:bg-slate-100/80'
                )}
                aria-expanded={areasOpen}
              >
                <Icon name="map-pin" className="w-3.5 h-3.5 text-theme-muted" />
                <span>Service Areas</span>
                <Icon name="chevron-down"
                  className={cn(
                    'w-3.5 h-3.5 transition-transform duration-200 text-theme-muted',
                    areasOpen && 'rotate-180 text-brand-blue'
                  )}
                />
              </Link>

              {/* Areas dropdown */}
              {areasOpen && (
                <div className="absolute top-full left-0 pt-3 w-64 z-50">
                  <div className="bg-white/98 backdrop-blur-2xl rounded-2xl shadow-2xl border border-slate-200/80 p-3 animate-in fade-in zoom-in-95 duration-150">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1">
                      San Diego County Hubs
                    </div>
                    <div className="grid grid-cols-2 gap-1 mt-1">
                      {TOP_CITIES.map((city) => (
                        <Link
                          key={city.slug}
                          href={`/service-area/${city.slug}`}
                          className="px-3 py-2 text-xs text-slate-700 hover:text-brand-blue hover:bg-slate-50 rounded-lg font-medium transition-colors"
                        >
                          {city.name}
                        </Link>
                      ))}
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-100">
                      <Link
                        href="/service-area"
                        className="flex items-center justify-between px-3 py-1.5 text-xs font-semibold text-brand-blue hover:bg-blue-50/60 rounded-lg transition-colors"
                      >
                        <span>All 30+ Service Areas</span>
                        <Icon name="arrow-right" className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* FINANCING */}
            <Link
              href="/roof-financing-san-diego"
              className={cn(
                'text-xs xl:text-sm font-bold tracking-tight px-3 py-1.5 rounded-xl transition-all',
                pathname === '/roof-financing-san-diego'
                  ? 'text-brand-blue bg-blue-50/80 border border-blue-200/60 shadow-2xs'
                  : 'text-theme-secondary hover:text-theme-primary hover:bg-slate-100/80'
              )}
            >
              Financing
            </Link>

            {/* REVIEWS */}
            <Link
              href="/reviews"
              className={cn(
                'text-xs xl:text-sm font-bold tracking-tight px-3 py-1.5 rounded-xl transition-all',
                pathname === '/reviews'
                  ? 'text-brand-blue bg-blue-50/80 border border-blue-200/60 shadow-2xs'
                  : 'text-theme-secondary hover:text-theme-primary hover:bg-slate-100/80'
              )}
            >
              Reviews
            </Link>

            {/* ABOUT */}
            <Link
              href="/about"
              className={cn(
                'text-xs xl:text-sm font-bold tracking-tight px-3 py-1.5 rounded-xl transition-all',
                pathname === '/about'
                  ? 'text-brand-blue bg-blue-50/80 border border-blue-200/60 shadow-2xs'
                  : 'text-theme-secondary hover:text-theme-primary hover:bg-slate-100/80'
              )}
            >
              About
            </Link>

            {/* CONTACT */}
            <Link
              href="/contact"
              className={cn(
                'text-xs xl:text-sm font-bold tracking-tight px-3 py-1.5 rounded-xl transition-all',
                pathname === '/contact'
                  ? 'text-brand-blue bg-blue-50/80 border border-blue-200/60 shadow-2xs'
                  : 'text-theme-secondary hover:text-theme-primary hover:bg-slate-100/80'
              )}
            >
              Contact
            </Link>
          </nav>

          {/* Right Action Cluster */}
          <div className="flex items-center gap-3 xl:gap-4 flex-shrink-0">
            {/* Direct Call Capsule */}
            <a
              href={PHONE_HREF}
              className="hidden xl:flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-raised)] hover:border-brand-blue/50 transition-all group cursor-pointer shadow-xs"
              aria-label={`Call ${PHONE_NUMBER}`}
            >
              <div className="w-7 h-7 rounded-lg bg-brand-blue/15 text-brand-blue flex items-center justify-center group-hover:bg-brand-blue group-hover:text-white transition-colors flex-shrink-0">
                <Icon name="phone" className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-col whitespace-nowrap text-left">
                <span className="text-[9px] font-bold uppercase tracking-wider text-theme-muted leading-tight">
                  Direct Call / Text
                </span>
                <span className="text-xs font-extrabold text-theme-primary group-hover:text-brand-blue transition-colors">
                  {PHONE_NUMBER}
                </span>
              </div>
            </a>

            {/* Free Estimate CTA Button */}
            <Link href="/contact" className="hidden sm:inline-block">
              <span className="inline-flex items-center gap-1.5 bg-brand-blue hover:brightness-110 text-white font-bold text-xs uppercase tracking-wider rounded-xl px-4 py-2.5 transition-all shadow-md shadow-brand-blue/20 hover:shadow-brand-blue/35 hover:scale-[1.02] active:scale-[0.98]">
                <span>Free Estimate</span>
                <Icon name="arrow-right" className="w-3.5 h-3.5" />
              </span>
            </Link>

            {/* Mobile Hamburger Trigger */}
            <MobileNav stats={stats} />
          </div>
        </div>
      </div>
    </header>
  );
}
