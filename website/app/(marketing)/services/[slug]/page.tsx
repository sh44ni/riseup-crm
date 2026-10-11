import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Icon, type IconName } from '@/components/shared/Icon';
import { services, getServiceBySlug, getAllServiceSlugs } from '@/lib/data/services';
import { projects } from '@/lib/data/projects';
import { buildMetadata, buildServiceJsonLd, buildFAQJsonLd } from '@/lib/seo/metadata';
import { Section } from '@/components/shared/Container';
import { SectionHeading } from '@/components/shared/SectionHeading';
import { Breadcrumbs } from '@/components/shared/Breadcrumbs';
import { FAQAccordion } from '@/components/shared/FAQAccordion';
import { PHONE_HREF, PHONE_NUMBER } from '@/lib/utils';
import { getReviewStats } from '@/lib/reviews-server';

export async function generateStaticParams() {
  return getAllServiceSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const service = getServiceBySlug(slug);
  if (!service) return {};
  return buildMetadata({
    title: service.seoTitle || `${service.name} | San Diego Roofing Experts`,
    description: service.seoDescription || service.shortDescription,
    path: `/services/${service.slug}`,
    ogImage: service.heroImage,
  });
}

export default async function ServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = getServiceBySlug(slug);
  if (!service) notFound();

  const [stats] = await Promise.all([getReviewStats()]);

  const relatedProjects = (
    service.relatedProjectSlugs && service.relatedProjectSlugs.length > 0
      ? service.relatedProjectSlugs
          .map((pSlug) => projects.find((p) => p.slug === pSlug))
          .filter((p): p is (typeof projects)[0] => Boolean(p))
      : projects.filter(
          (p) =>
            (service.category && p.category.toLowerCase() === service.category.toLowerCase()) ||
            p.category.toLowerCase().includes(slug.toLowerCase()) ||
            slug.includes(p.category.toLowerCase())
        )
  ).slice(0, 3);
  const serviceJsonLd = buildServiceJsonLd(service, stats);
  const faqJsonLd = service.faqs.length > 0 ? buildFAQJsonLd(service.faqs) : null;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }} />
      {faqJsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />}

      {/* Hero Banner */}
      <section className="relative min-h-[460px] flex items-end overflow-hidden bg-[#0B1B2B]">
        <Image
          src={service.heroImage}
          alt={service.name}
          fill
          className="object-cover object-center"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#07131F] via-[#0B1B2B]/75 to-[#0B1B2B]/40" />
        
        <div className="relative z-10 w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-12 pb-12 pt-36">
          <Breadcrumbs
            items={[
              { label: 'Home', href: '/' },
              { label: 'Services', href: '/services' },
              { label: service.name }
            ]}
          />

          {/* Context-Aware Conversion Banners */}
          {(service.slug === 'roof-repair' || service.slug === 'roof-inspection') && (
            <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-red-950/80 border border-red-500/40 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
              <div className="flex items-center gap-3">
                <span className="relative flex h-3.5 w-3.5 flex-shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500"></span>
                </span>
                <div>
                  <p className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                    24/7 Active Storm Leak Dispatch • 60-Min North County Window
                  </p>
                  <p className="text-[11px] sm:text-xs text-red-200/90 mt-0.5">
                    Same-day emergency tarping, infrared thermal leak tracing &amp; insurance photo documentation
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <a
                  href={PHONE_HREF}
                  className="w-full sm:w-auto text-center px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-red-600/40 transition-all active:scale-95 flex items-center justify-center gap-2 flex-shrink-0"
                >
                  <Icon name="phone" className="w-4 h-4" />
                  <span>Emergency Dispatch: (760) 622-1230</span>
                </a>
              </div>
            </div>
          )}

          {service.category === 'commercial' && (
            <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-amber-950/70 border border-amber-500/30 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300 flex-shrink-0">
                  <Icon name="building" className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                    Commercial Facility Managers &amp; HOA Boards
                  </p>
                  <p className="text-[11px] sm:text-xs text-amber-200/90 mt-0.5">
                    20 to 30-Year NDL (No Dollar Limit) manufacturer warranties • Title 24 cool-roof engineering • Zero tenant disruption
                  </p>
                </div>
              </div>
              <Link
                href="/contact"
                className="w-full sm:w-auto text-center px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#07131F] font-extrabold text-xs uppercase tracking-wider shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 flex-shrink-0"
              >
                <Icon name="file-text" className="w-4 h-4" />
                <span>Request Commercial RFQ</span>
              </Link>
            </div>
          )}

          {service.slug === 'deck-builder' && (
            <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-orange-950/70 border border-orange-500/30 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-orange-500/20 border border-orange-400/30 flex items-center justify-center text-orange-300 flex-shrink-0">
                  <Icon name="hammer" className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                    Rancho San Diego, Carlsbad &amp; Coastal Custom Deck Builders
                  </p>
                  <p className="text-[11px] sm:text-xs text-orange-200/90 mt-0.5">
                    Certified Trex® composite installers • California WUI Class A fire-rated framing • 25-year non-fade warranty
                  </p>
                </div>
              </div>
              <Link
                href="/contact"
                className="w-full sm:w-auto text-center px-5 py-2.5 rounded-xl bg-[#C85A2A] hover:bg-[#D96B3B] text-white font-extrabold text-xs uppercase tracking-wider shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 flex-shrink-0"
              >
                <span>Schedule 3D Deck Design</span>
              </Link>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 mb-4">
            {service.highlightBadge && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-brand-blue text-white shadow-md shadow-brand-blue/30">
                <Icon name="sparkles" className="w-3.5 h-3.5" />
                <span>{service.highlightBadge}</span>
              </span>
            )}
            {service.warranty && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md bg-white/10 border border-white/20 text-white/90">
                <Icon name="shield-check" className="w-3.5 h-3.5 text-brand-blue" />
                <span>{service.warranty}</span>
              </span>
            )}
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-4 tracking-tight">
            {service.name}
          </h1>
          <p className="text-sm sm:text-base text-white/85 max-w-2xl leading-relaxed mb-6">
            {service.shortDescription}
          </p>

          <div className="flex flex-wrap items-center gap-3 mb-8">
            <Link href="/contact">
              <span className="inline-flex items-center gap-2 bg-[#2E9BF0] hover:bg-[#1C88DD] text-white font-bold text-xs uppercase tracking-wider px-6 py-3.5 rounded-xl shadow-lg shadow-brand-blue/30 transition-all hover:brightness-110 active:scale-95">
                <Icon name="clipboard-check" className="w-4 h-4" />
                <span>Get a Free Estimate</span>
              </span>
            </Link>
            <a href={PHONE_HREF}>
              <span className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs uppercase tracking-wider px-5 py-3.5 rounded-xl backdrop-blur-md transition-all active:scale-95">
                <Icon name="phone" className="w-4 h-4 text-brand-blue" />
                <span>{PHONE_NUMBER}</span>
              </span>
            </a>
            <Link href="/roof-financing-san-diego">
              <span className="inline-flex items-center gap-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-300 font-bold text-xs uppercase tracking-wider px-4 py-3.5 rounded-xl backdrop-blur-md transition-all">
                <span>0% APR Financing Available →</span>
              </span>
            </Link>
          </div>

          {/* Quick Credibility Strip */}
          <div className="pt-6 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-white/80">
            <div className="flex items-center gap-2">
              <Icon name="shield-check" className="w-4 h-4 text-brand-blue flex-shrink-0" />
              <span>CA License #1096492</span>
            </div>
            <div className="flex items-center gap-2">
              <Icon name="award" className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>
                {service.category === 'construction'
                  ? 'Licensed Class B Builder'
                  : service.category === 'commercial'
                  ? 'Carlisle & GAF Commercial'
                  : service.category === 'solar'
                  ? 'Unified Solar & Roof Pro'
                  : 'Owens Corning Preferred'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Icon name="star" className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>
                {stats?.averageRating ? stats.averageRating.toFixed(1) : '5.0'}/5 ({stats?.totalCount || 9} Verified Reviews)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Icon name="check-circle" className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Title 24 Compliant</span>
            </div>
          </div>
        </div>
      </section>

      {/* Detailed Overview & Deep Dive Section (SEO & Educational Value) */}
      {service.detailedOverview && (
        <Section alternate={false} className="py-12 sm:py-16">
          <div className="max-w-4xl mx-auto">
            <SectionHeading
              label="Expert Overview"
              title={service.detailedOverview.heading}
              subtitle={service.detailedOverview.subheading}
              centered={false}
            />
            <div className="space-y-4 text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed mb-8">
              {service.detailedOverview.paragraphs.map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>

            {service.detailedOverview.highlights && service.detailedOverview.highlights.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                {service.detailedOverview.highlights.map((item, i) => (
                  <div key={i} className="glass-card-interactive rounded-2xl p-5 border border-slate-200/80 shadow-xs">
                    <h3 className="text-sm font-bold text-[var(--text-primary)] mb-1 flex items-center gap-2">
                      <Icon name="shield-check" className="w-4 h-4 text-brand-blue flex-shrink-0" />
                      <span>{item.title}</span>
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Section>
      )}

      {/* What's Included */}
      <Section alternate={service.detailedOverview ? true : false}>
        <SectionHeading
          label="What's Included"
          title={`Our ${service.name} Scope of Work`}
          subtitle="Every project includes comprehensive property protection, premium materials, and certified installation."
          centered={false}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {service.includes.map((item) => (
            <div
              key={item}
              className="glass-card-interactive rounded-2xl p-5 flex items-start gap-3.5 border border-slate-200/80 shadow-xs"
            >
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-brand-blue flex items-center justify-center flex-shrink-0 mt-0.5 border border-blue-100">
                <Icon name="check-circle" className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[var(--text-primary)] mb-1">{item}</h4>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Engineered and inspected according to manufacturer specifications and San Diego coastal building codes.
                </p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Process */}
      <Section alternate={true}>
        <SectionHeading
          label="Our Process"
          title="How We Deliver Lasting Results"
          subtitle="A seamless 5-step workflow designed for complete transparency, safety, and guaranteed quality."
          centered={false}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
          {service.processSteps.map((step, index) => (
            <div
              key={index}
              className="glass-card-interactive rounded-2xl p-5 flex flex-col justify-between border border-slate-200/80 shadow-xs"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-brand-blue text-white flex items-center justify-center font-extrabold text-sm mb-4 shadow-md shadow-brand-blue/30">
                  0{index + 1}
                </div>
                <h4 className="text-sm font-bold text-[var(--text-primary)] mb-2">{step.title}</h4>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Material & System Specifications ─────────────────────────────── */}
      {service.materialSpecs && service.materialSpecs.length > 0 && (
        <Section alternate={false}>
          <SectionHeading
            label="System Specifications"
            title="Manufacturer-Grade Materials We Install"
            subtitle="Every component is sourced direct from certified manufacturers and installed to exact engineering specifications."
            centered={false}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
            {service.materialSpecs.map((spec, i) => (
              <div
                key={i}
                className="glass-card-interactive rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm font-extrabold text-[var(--text-primary)] leading-tight">{spec.name}</h4>
                  {spec.highlight && (
                    <span className="shrink-0 inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-brand-blue/10 text-brand-blue border border-brand-blue/20">
                      {spec.highlight}
                    </span>
                  )}
                </div>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{spec.spec}</p>
                <div className="mt-auto pt-3 border-t border-slate-100 flex items-center gap-1.5">
                  <Icon name="check-circle" className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                  <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wide">Verified Installation</span>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── San Diego Climate & Title 24 Intelligence ─────────────────────── */}
      <Section alternate={service.materialSpecs && service.materialSpecs.length > 0 ? true : false}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div>
            <SectionHeading
              label="Local Engineering"
              title="Built for San Diego's Microclimate Extremes"
              subtitle="Southern California's climate is not uniform — your roofing system must be engineered for where you actually live."
              centered={false}
            />
            <div className="space-y-4 text-sm text-[var(--text-secondary)] leading-relaxed">
              <p>
                Coastal zones from La Jolla to Oceanside face salt-laden marine layer humidity, which degrades unsealed flashings and corrodes standard galvanized fasteners. We specify 316 marine-grade stainless and pre-bent copper at all coastal installations.
              </p>
              <p>
                Inland communities like Santee, El Cajon, and Ramona experience &ldquo;heat island&rdquo; peaks exceeding 110°F during Santa Ana wind events — conditions that bake standard organic felt paper, causing premature cracking and leak paths within 10–15 years.
              </p>
              <p>
                Every Rise Up installation meets or exceeds <strong className="text-[var(--text-primary)]">California Title 24 2022 Energy Standards</strong>, including minimum Cool Roof SRI requirements and NFA 1:150 attic ventilation ratios to reduce thermal transfer into living spaces.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { icon: 'cloud-rain', label: 'Santa Ana Wind Zones', value: 'Up to 80 MPH gusts engineered', color: 'text-sky-500', bg: 'bg-sky-50 border-sky-100' },
              { icon: 'sun', label: 'UV / Thermal Load', value: 'Cool-roof SRI ≥ 29 mandatory', color: 'text-amber-500', bg: 'bg-amber-50 border-amber-100' },
              { icon: 'shield', label: 'Coastal Salt Spray', value: '316 marine stainless at coastal sites', color: 'text-blue-500', bg: 'bg-blue-50 border-blue-100' },
              { icon: 'alert-triangle', label: 'WUI Fire Zones', value: 'Class A rated systems for Ramona, Alpine, Fallbrook', color: 'text-red-500', bg: 'bg-red-50 border-red-100' },
            ].map((item) => (
              <div key={item.label} className={`rounded-2xl p-4 border ${item.bg} flex flex-col gap-2`}>
                <div className={`w-8 h-8 rounded-xl bg-white border ${item.bg.split(' ')[1]} flex items-center justify-center`}>
                  <Icon name={item.icon as IconName} className={`w-4 h-4 ${item.color}`} />
                </div>
                <p className="text-xs font-bold text-[var(--text-primary)]">{item.label}</p>
                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── Investment & Financing Preview Widget ─────────────────────────── */}
      {service.investmentRange && (
        <Section alternate={true}>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
            {/* Left: Range + Duration */}
            <div className="lg:col-span-3 space-y-5">
              <SectionHeading
                label="Investment Preview"
                title={`Typical ${service.name} Investment Range`}
                subtitle="Transparent San Diego market pricing based on real project data. Your exact quote depends on scope, materials, and access."
                centered={false}
              />
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-[140px] rounded-2xl bg-white border border-slate-200 shadow-xs p-5 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1">Starting From</p>
                  <p className="text-3xl font-extrabold text-[var(--text-primary)]">{service.investmentRange.low}</p>
                </div>
                <div className="text-2xl font-bold text-[var(--text-muted)]">—</div>
                <div className="flex-1 min-w-[140px] rounded-2xl bg-white border border-slate-200 shadow-xs p-5 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1">Up To</p>
                  <p className="text-3xl font-extrabold text-brand-blue">{service.investmentRange.high}</p>
                </div>
                {service.typicalDuration && (
                  <div className="flex-1 min-w-[140px] rounded-2xl bg-white border border-slate-200 shadow-xs p-5 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1">Typical Duration</p>
                    <p className="text-xl font-extrabold text-[var(--text-primary)]">{service.typicalDuration}</p>
                  </div>
                )}
              </div>
              {service.investmentRange.note && (
                <p className="text-xs text-[var(--text-muted)] leading-relaxed pl-1">
                  <span className="font-semibold text-[var(--text-secondary)]">Note:</span> {service.investmentRange.note}
                </p>
              )}
            </div>
            {/* Right: Financing CTA */}
            <div className="lg:col-span-2 rounded-2xl bg-gradient-to-br from-[#0B1B2B] to-[#0D2640] p-6 text-white flex flex-col gap-5 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-blue/20 border border-brand-blue/30 flex items-center justify-center">
                  <Icon name="badge-percent" className="w-5 h-5 text-brand-blue" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-white/60">Flexible Payment</p>
                  <p className="text-base font-extrabold text-white">0% APR Financing Available</p>
                </div>
              </div>
              <ul className="space-y-2.5">
                {[
                  '$0 down, zero interest options',
                  'Same-as-cash 12–18 month plans',
                  'Low monthly rate longer terms',
                  'Approval in minutes — not days',
                ].map((point) => (
                  <li key={point} className="flex items-center gap-2 text-xs text-white/80">
                    <Icon name="check-circle" className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    {point}
                  </li>
                ))}
              </ul>
              <Link href="/roof-financing-san-diego">
                <span className="flex items-center justify-center gap-2 w-full bg-brand-blue hover:bg-[#1C88DD] text-white font-bold text-xs uppercase tracking-wider px-5 py-3.5 rounded-xl shadow-lg shadow-brand-blue/30 transition-all hover:brightness-110 active:scale-95">
                  <Icon name="calculator" className="w-4 h-4" />
                  <span>Explore Financing Options</span>
                </span>
              </Link>
              <p className="text-[10px] text-white/40 text-center leading-relaxed">
                CA License #1096492 · C-39 Roofing · B General
              </p>
            </div>
          </div>
        </Section>
      )}

      {/* Related Projects */}
      {relatedProjects.length > 0 && (
        <Section alternate={false}>
          <SectionHeading
            label="Real Craftsmanship"
            title={`Recent ${service.name} Projects`}
            subtitle="Explore our completed work in San Diego County."
            centered={false}
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {relatedProjects.map((project) => (
              <Link key={project.slug} href={`/projects/${project.slug}`} className="group flex">
                <div className="image-overlay-card glass-card-interactive rounded-2xl overflow-hidden flex flex-col w-full border border-slate-200/80 shadow-xs">
                  <div className="relative h-52 overflow-hidden">
                    <Image
                      src={project.afterImage}
                      alt={project.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="33vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0B1B2B] via-transparent to-transparent" />
                  </div>
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-[var(--text-primary)] mb-1 group-hover:text-brand-blue transition-colors">
                        {project.title}
                      </h4>
                      <p className="text-xs text-[var(--text-muted)] mb-3">{project.city}, CA</p>
                    </div>
                    <span className="text-xs font-bold text-brand-blue flex items-center gap-1 group-hover:text-[#1C88DD] transition-colors">
                      View Project <Icon name="arrow-right" className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {/* FAQ */}
      {service.faqs.length > 0 && (
        <Section alternate={true}>
          <SectionHeading
            label="Common Questions"
            title={`${service.name} FAQ`}
            subtitle={`Answers to the most frequently asked questions about our ${service.name.toLowerCase()} services in San Diego.`}
            centered={true}
          />
          <FAQAccordion items={service.faqs} />
        </Section>
      )}

      {/* Related Services Internal Linking */}
      <Section>
        <SectionHeading
          label="Explore More Capabilities"
          title="Related Roofing & Construction Services"
          subtitle="Explore complementary services designed to protect and enhance your Southern California property."
          centered={true}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
          {services
            .filter((s) => s.slug !== slug)
            .sort((a, b) => {
              const aSame = service.category && a.category === service.category ? 1 : 0;
              const bSame = service.category && b.category === service.category ? 1 : 0;
              return bSame - aSame;
            })
            .slice(0, 4)
            .map((s) => (
              <Link
                key={s.slug}
                href={`/services/${s.slug}`}
                className="group p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md hover:border-brand-blue/50 transition-all flex flex-col justify-between"
              >
                <div>
                  <h3 className="text-base font-bold text-[var(--text-primary)] group-hover:text-brand-blue transition-colors mb-2">
                    {s.name}
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                    {s.shortDescription}
                  </p>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-brand-blue">
                  <span>Learn More</span>
                  <Icon name="arrow-right" className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            ))}
        </div>
      </Section>

      {/* Local Communities We Serve Internal Linking Mesh */}
      <Section alternate={true} className="py-12 border-t border-slate-200/80">
        <div className="max-w-5xl mx-auto">
          <SectionHeading
            label="Service Coverage"
            title={`${service.name} Across San Diego County`}
            subtitle={`We provide licensed ${service.name.toLowerCase()} services across all coastal and inland North County communities.`}
            centered={true}
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-8">
            {[
              { slug: 'oceanside', name: 'Oceanside', highlight: 'HQ & Rapid Dispatch' },
              { slug: 'carlsbad', name: 'Carlsbad', highlight: 'Coastal & Aviara' },
              { slug: 'vista', name: 'Vista', highlight: 'Shadowridge & Inland' },
              { slug: 'encinitas', name: 'Encinitas', highlight: 'Leucadia & Cardiff' },
              { slug: 'san-marcos', name: 'San Marcos', highlight: 'Lake San Marcos' },
              { slug: 'san-diego', name: 'San Diego', highlight: 'Metro & Coastal' },
              { slug: 'rancho-san-diego', name: 'Rancho San Diego', highlight: 'East County & Foothills' },
              { slug: 'escondido', name: 'Escondido', highlight: 'Inland Valley' },
            ].map((loc) => (
              <Link
                key={loc.slug}
                href={`/service-area/${loc.slug}`}
                className="group p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-xs hover:border-brand-blue/60 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-[var(--text-primary)] group-hover:text-brand-blue transition-colors">
                    {loc.name}
                  </span>
                  <Icon name="map-pin" className="w-3.5 h-3.5 text-brand-blue opacity-70 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-[11px] text-[var(--text-muted)] line-clamp-1">{loc.highlight}</p>
              </Link>
            ))}
          </div>
          <div className="mt-6 text-center">
            <Link
              href="/service-area"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-blue hover:text-[#1C88DD] transition-colors"
            >
              <span>View all 22+ San Diego service locations</span>
              <Icon name="arrow-right" className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </Section>

      <section className="py-16 bg-[#F4F8FD] border-t border-slate-200/80 relative">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <div className="glass-card-hero rounded-3xl p-8 sm:p-10 border border-slate-200/80 shadow-md">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] mb-3">
              Ready for a Free {service.name} Proposal?
            </h2>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] mb-6 max-w-md mx-auto leading-relaxed">
              Schedule your 100% free inspection with our licensed San Diego specialists today.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/contact">
                <span className="inline-flex items-center gap-2 bg-[#2E9BF0] hover:bg-[#1C88DD] text-white font-bold text-xs uppercase tracking-wider px-6 py-3.5 rounded-xl shadow-lg shadow-brand-blue/30 transition-all hover:brightness-110">
                  <Icon name="clipboard-check" className="w-4 h-4" />
                  <span>Request Free Estimate</span>
                </span>
              </Link>
              <a href={PHONE_HREF}>
                <span className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 text-[var(--text-primary)] font-bold text-xs uppercase tracking-wider px-6 py-3.5 rounded-xl transition-all shadow-xs">
                  <Icon name="phone" className="w-4 h-4 text-brand-blue" />
                  <span>Call {PHONE_NUMBER}</span>
                </span>
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
