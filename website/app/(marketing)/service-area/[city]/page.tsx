import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '@/components/shared/Icon';
import { getServiceAreaBySlug, getAllServiceAreaSlugs } from '@/lib/data/serviceAreas';
import { services } from '@/lib/data/services';
import { buildMetadata, buildFAQJsonLd } from '@/lib/seo/metadata';
import { Section } from '@/components/shared/Container';
import { Breadcrumbs } from '@/components/shared/Breadcrumbs';
import { FAQAccordion } from '@/components/shared/FAQAccordion';
import { COMPANY_NAME, PHONE_NUMBER, PHONE_HREF, LICENSE_NUMBER } from '@/lib/utils';
import { getReviewStats, getPublicReviews } from '@/lib/reviews-server';

export async function generateStaticParams() {
  return getAllServiceAreaSlugs().map((city) => ({ city }));
}

export async function generateMetadata({ params }: { params: Promise<{ city: string }> }): Promise<Metadata> {
  const { city } = await params;
  const area = getServiceAreaBySlug(city);
  if (!area) return {};

  return buildMetadata({
    title: area.seoTitle || `Roofing & Construction in ${area.name}, CA | Rise Up Roofing`,
    description:
      area.seoDescription ||
      `${COMPANY_NAME} provides expert roofing, tile underlayment, repairs, solar, and construction services in ${area.name}, California. Licensed, bonded & insured. Free estimates.`,
    path: `/service-area/${area.slug}`,
  });
}

export default async function CityPage({ params }: { params: Promise<{ city: string }> }) {
  const { city } = await params;
  const area = getServiceAreaBySlug(city);
  if (!area) notFound();

  const [stats, allReviews] = await Promise.all([getReviewStats(), getPublicReviews()]);

  const localReviews = allReviews.filter(
    (r) =>
      r.location.toLowerCase().includes(area.name.toLowerCase()) ||
      (r.neighborhood && r.neighborhood.toLowerCase().includes(area.name.toLowerCase()))
  );
  const displayReviews = localReviews.length > 0 ? localReviews : allReviews.slice(0, 2);

  const faqs = area.faqs || [];
  const faqJsonLd = faqs.length > 0 ? buildFAQJsonLd(faqs) : null;
  const cityJsonLd = {
    '@context': 'https://schema.org',
    '@type': ['RoofingContractor', 'GeneralContractor'],
    name: COMPANY_NAME,
    url: `https://riseuprac.com/service-area/${area.slug}`,
    telephone: '+17606221230',
    priceRange: '$$',
    openingHours: 'Mo-Su 00:00-24:00',
    address: {
      '@type': 'PostalAddress',
      streetAddress: '2182 S El Camino Real',
      addressLocality: 'Oceanside',
      addressRegion: 'CA',
      postalCode: '92054',
      addressCountry: 'US',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 33.1812,
      longitude: -117.3395,
    },
    ...(stats && stats.totalCount > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: stats.averageRating.toFixed(1),
            reviewCount: stats.totalCount,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
    areaServed: {
      '@type': 'City',
      name: area.name,
      containedInPlace: {
        '@type': 'State',
        name: 'California',
      },
    },
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: `Roofing & Construction Services in ${area.name}`,
      itemListElement: services.map((s) => ({
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: s.name,
          url: `https://riseuprac.com/services/${s.slug}`,
          description: s.shortDescription,
        },
      })),
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(cityJsonLd) }}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}

      <Section alternate={false} className="pt-32 sm:pt-36">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Service Areas', href: '/service-area' },
            { label: area.name }
          ]}
        />

        <div className="max-w-4xl mx-auto">
          <div className="flex flex-wrap items-center gap-2.5 mb-4">
            <div className="inline-flex items-center gap-2 glass-chip px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-brand-blue">
              <span>Serving {area.name}, California</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 border border-amber-500/20 text-amber-900">
              <Icon name="star" className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span>
                {stats?.averageRating ? stats.averageRating.toFixed(1) : '5.0'}/5.0 Google Rating ({stats?.totalCount || 9} Verified Reviews)
              </span>
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[var(--text-primary)] mb-4 tracking-tight">
            {area.h1 || `Roofing & Construction in ${area.name}, CA`}
          </h1>

          <p className="text-sm sm:text-base text-[var(--text-secondary)] mb-8 leading-relaxed">
            {area.intro || (
              <>
                {COMPANY_NAME} is proud to serve homeowners and commercial property managers in {area.name}, {area.county} County. 
                Whether you need a complete roof replacement, tile relay with 2-ply underlayment, emergency leak detection, or general construction repairs, our licensed team delivers master craftsmanship backed by 50-year manufacturer warranties.
              </>
            )}
          </p>

          {/* Local Neighborhood Badges (Authority Signals) */}
          {area.neighborhoods && area.neighborhoods.length > 0 && (
            <div className="glass-card-interactive rounded-2xl p-5 mb-10 border border-slate-200/80 shadow-xs">
              <h2 className="text-sm font-bold text-[var(--text-primary)] mb-2 flex items-center gap-2">
                <Icon name="map-pin" className="w-4 h-4 text-brand-blue" />
                <span>{area.name} Communities &amp; Neighborhoods Served</span>
              </h2>
              <div className="flex flex-wrap gap-2 text-xs text-[var(--text-secondary)]">
                {area.neighborhoods.map((n) => (
                  <span key={n} className="glass-chip px-2.5 py-1 rounded-lg">
                    {n}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Local Services Grid */}
          <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] mb-6">
            Our Roofing &amp; Construction Services in {area.name}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
            {services.map((service) => (
              <Link
                key={service.slug}
                href={`/services/${service.slug}`}
                className="glass-card-interactive rounded-2xl p-5 flex items-center gap-3.5 border border-slate-200/80 hover:border-brand-blue/30 shadow-xs transition-all group"
              >
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-brand-blue flex items-center justify-center flex-shrink-0 group-hover:bg-brand-blue group-hover:text-white transition-colors">
                  <Icon name="check-circle" className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-[var(--text-primary)] group-hover:text-brand-blue transition-colors">
                    {service.name}
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] line-clamp-1 mt-0.5">
                    {service.shortDescription}
                  </p>
                </div>
                <Icon name="arrow-right" className="w-4 h-4 text-slate-400 group-hover:text-brand-blue group-hover:translate-x-1 transition-all" />
              </Link>
            ))}
          </div>

          {/* Why Choose Rise Up in This City */}
          <div className="glass-card-interactive rounded-3xl p-6 sm:p-8 mb-12 border border-slate-200/80 shadow-xs">
            <h2 className="text-xl font-extrabold text-[var(--text-primary)] mb-4">
              Why {area.name} Property Owners Choose Rise Up Roofing
            </h2>
            <div className="space-y-4 text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
              <p>
                As a local San Diego County contractor with over 25 years of combined experience, we understand the specific environmental factors affecting {area.name} properties — including coastal salt fog, morning moisture, UV exposure, and Santa Ana winds.
              </p>
              <p>
                With California Contractor&apos;s License #{LICENSE_NUMBER}, we are fully licensed, bonded, and insured for both roofing (C-39) and general construction (B). As an Owens Corning Preferred Contractor, we install roofing systems to exact manufacturer specifications, ensuring full warranty protection and peerless build quality.
              </p>
              <p>
                Every roofing installation in {area.name} is engineered to meet or exceed California Title 24 Cool Roof energy efficiency mandates, Class A fire-retardant standards, and local municipal wind resistance requirements. Our project coordination team manages the complete building permit process from initial submission through final municipal sign-off, giving you complete peace of mind.
              </p>
              <p>
                From premium synthetic felt underlayment relays on classic concrete tile roofs to complete Owens Corning architectural shingle replacements and commercial flat roof membranes, we back our work with non-prorated manufacturer warranties and Rise Up&apos;s ironclad workmanship guarantee. We also offer certified solar detach-and-reset services so your solar investment remains protected throughout your roof project.
              </p>
            </div>
          </div>

          {/* Verified Local Reviews Section */}
          <div className="mb-12">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-brand-blue">Local Proof</span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)]">
                  Verified Client Reviews in {area.name} &amp; San Diego County
                </h2>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-900 text-xs font-bold w-fit">
                <Icon name="star" className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span>
                  {stats?.averageRating ? stats.averageRating.toFixed(1) : '5.0'} / 5.0 Star Rated ({stats?.totalCount || 9} Verified Reviews)
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {displayReviews.map((review, idx) => (
                <div
                  key={`${review.author}-${idx}`}
                  className="glass-card-interactive rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex gap-0.5 text-amber-400 text-sm select-none" aria-label={`${review.rating} out of 5 stars`}>
                        {'★'.repeat(review.rating)}
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        {review.projectType || 'Verified Project'}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-[var(--text-secondary)] italic leading-relaxed mb-4">
                      &ldquo;{review.text}&rdquo;
                    </p>
                  </div>
                  <div>
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-[var(--text-primary)]">{review.author}</p>
                        <p className="text-[11px] text-[var(--text-muted)]">{review.location}</p>
                      </div>
                      <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        Verified Google Review
                      </span>
                    </div>
                    {review.ownerReply && (
                      <div className="mt-3 p-3 bg-slate-50/80 rounded-xl border border-slate-200/60 text-[11px] text-slate-600">
                        <p className="font-bold text-slate-800 mb-0.5 flex items-center gap-1.5">
                          <span>Owner Response (Edith):</span>
                        </p>
                        <p className="line-clamp-3">{review.ownerReply}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Local FAQs */}
          {faqs.length > 0 && (
            <div className="mb-12">
              <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] mb-4">
                Frequently Asked Questions About Roofing in {area.name}
              </h2>
              <FAQAccordion items={faqs} />
            </div>
          )}

          {/* City CTA Banner */}
          <div className="glass-card-hero rounded-3xl p-8 sm:p-10 text-center border border-slate-200/80 shadow-md">
            <h3 className="text-2xl font-extrabold text-[var(--text-primary)] mb-2">
              Get a Free Roofing Estimate in {area.name}
            </h3>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] mb-6 leading-relaxed">
              Contact our licensed San Diego specialists today for an itemized, no-obligation roof proposal.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/contact">
                <span className="inline-flex items-center gap-2 bg-[#2E9BF0] hover:bg-[#1C88DD] text-white font-bold text-xs uppercase tracking-wider px-6 py-3.5 rounded-xl shadow-lg shadow-brand-blue/30 transition-all hover:brightness-110">
                  <Icon name="clipboard-check" className="w-4 h-4" />
                  <span>Request Free Estimate</span>
                </span>
              </Link>
              <a href={PHONE_HREF}>
                <span className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 text-[var(--text-primary)] font-bold text-xs uppercase tracking-wider px-5 py-3.5 rounded-xl transition-all shadow-xs">
                  <Icon name="phone" className="w-4 h-4 text-brand-blue" />
                  <span>Call {PHONE_NUMBER}</span>
                </span>
              </a>
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}
