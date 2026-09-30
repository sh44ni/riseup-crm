import type { Metadata } from 'next';
import { Icon, GoogleIcon, YelpIcon } from '@/components/shared/Icon';
import { buildMetadata, buildReviewJsonLd } from '@/lib/seo/metadata';
import { getAverageRating, getReviewCount } from '@/lib/data/reviews';
import { getPublicReviews, getReviewStats } from '@/lib/reviews-server';
import { Section } from '@/components/shared/Container';
import { SectionHeading } from '@/components/shared/SectionHeading';
import { Breadcrumbs } from '@/components/shared/Breadcrumbs';
import { YELP_REVIEWS_URL, GOOGLE_REVIEWS_URL } from '@/lib/utils';

export const revalidate = 3600;

export const metadata: Metadata = buildMetadata({
  title: 'Client Reviews | 5-Star San Diego Roofing',
  description:
    '5-star rated roofing and construction company in San Diego County. Read authentic reviews from clients across Oceanside, Carlsbad, Escondido, and surrounding areas.',
  path: '/reviews',
});

export default async function ReviewsPage() {
  const [reviewList, stats] = await Promise.all([getPublicReviews(), getReviewStats()]);
  const avgRating = stats.averageRating ? stats.averageRating.toFixed(1) : getAverageRating(reviewList);
  const count = stats.totalCount || getReviewCount(reviewList);
  const reviewJsonLd = buildReviewJsonLd(reviewList);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(reviewJsonLd) }}
      />
      <Section alternate={false} className="pt-32 sm:pt-36">
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Reviews' }]} />

        <SectionHeading
          as="h1"
          label="Verified Ratings"
          title="Client Reviews"
          subtitle="Real reviews from real property owners across North County and San Diego. See why Rise Up is the trusted choice for roofing replacements, tile relays, and storm repairs."
        />

        {/* Aggregate Hero Dock */}
        <div className="flex items-center justify-center mb-12">
          <div className="glass-card-hero rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6 border border-slate-200/80 shadow-md">
            <div className="text-5xl font-extrabold text-[var(--text-primary)] tracking-tight">
              {avgRating}
            </div>
            <div className="sm:border-l sm:border-slate-200 sm:pl-6 text-center sm:text-left">
              <div className="flex gap-1.5 justify-center sm:justify-start mb-1.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Icon key={s} name="star" className="w-5 h-5 text-amber-400 fill-amber-400" />
                ))}
              </div>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-semibold">
                Based on{' '}
                <span className="text-[var(--text-primary)] font-bold">
                  {count > 0 ? `${count} Verified Client Reviews` : 'Verified 5.0 Star Client Rating'}
                </span>
              </p>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                Top rated across Google Local, Yelp &amp; BBB
              </p>
            </div>
          </div>
        </div>

        {/* All reviews (only rendered when real published reviews exist) */}
        {reviewList.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {reviewList.map((review, index) => {
              const isGoogle = review.source === 'google';
              const initials = (review.author || 'Client')
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('');

              return (
                <div
                  key={`${review.author}-${index}`}
                  className="glass-card-interactive rounded-2xl p-6 flex flex-col justify-between border border-slate-200/80 hover:border-brand-blue/30 shadow-xs transition-all duration-300 relative group"
                >
                  <Icon name="quote" className="absolute top-5 right-5 w-8 h-8 text-slate-200 group-hover:text-brand-blue/20 transition-colors pointer-events-none" />

                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex gap-0.5 text-amber-400 text-sm select-none" aria-label={`${review.rating} out of 5 stars`}>
                        {'★'.repeat(review.rating)}
                      </div>
                      {review.reviewUrl ? (
                        <a
                          href={review.reviewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-[var(--text-secondary)] bg-slate-50 hover:bg-red-50 hover:text-red-700 hover:border-red-200 border border-slate-200/60 uppercase tracking-wider transition-all"
                          title="View verified review on Yelp"
                        >
                          {isGoogle ? <GoogleIcon className="w-3 h-3" /> : <YelpIcon className="w-3 h-3" />}
                          <span>via {isGoogle ? 'Google' : 'Yelp'}</span>
                        </a>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-[var(--text-secondary)] bg-slate-50 border border-slate-200/60 uppercase tracking-wider">
                          {isGoogle ? <GoogleIcon className="w-3 h-3" /> : <YelpIcon className="w-3 h-3" />}
                          <span>via {isGoogle ? 'Google' : 'Yelp'}</span>
                        </span>
                      )}
                    </div>

                    <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed mb-4 italic">
                      &ldquo;{review.text}&rdquo;
                    </p>

                    {review.ownerReply && (
                      <div className="mb-4 p-3 bg-slate-50 rounded-xl border border-slate-100 text-[11px] text-[var(--text-secondary)]">
                        <p className="font-bold text-[10px] uppercase tracking-wider text-brand-blue mb-1">
                          Response from Rise Up Roofing:
                        </p>
                        <p className="italic leading-relaxed">&ldquo;{review.ownerReply}&rdquo;</p>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      {review.authorPhoto ? (
                        <img
                          src={review.authorPhoto}
                          alt={review.author}
                          className="w-8 h-8 rounded-full object-cover border border-blue-100 shadow-2xs"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-[10px] font-bold text-brand-blue shadow-2xs">
                          {initials}
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-bold text-[var(--text-primary)]">{review.author}</p>
                        <p className="text-[11px] text-[var(--text-muted)]">
                          {review.location} • {review.serviceCategory}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                      <Icon name="check-circle" className="w-3.5 h-3.5" />
                      <span>Verified Client</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="max-w-2xl mx-auto text-center bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xs mb-12 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-brand-blue flex items-center justify-center mx-auto shadow-2xs">
              <Icon name="award" className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-[var(--text-primary)]">
              Verified Client Reviews on Google &amp; Yelp
            </h3>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed max-w-lg mx-auto">
              We collect 100% authentic, verified feedback directly on Google Maps and Yelp. Click below to read live reviews from property owners across San Diego County.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href={stats.googleUrl || GOOGLE_REVIEWS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-brand-blue hover:bg-[#1C88DD] text-white font-bold text-xs uppercase tracking-wider px-6 py-3 rounded-xl transition-all shadow-xs"
              >
                <GoogleIcon className="w-4 h-4" />
                <span>Read on Google Maps</span>
              </a>
              <a
                href={stats.yelpUrl || YELP_REVIEWS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-[var(--text-primary)] font-bold text-xs uppercase tracking-wider px-6 py-3 rounded-xl border border-slate-200 transition-all shadow-xs"
              >
                <YelpIcon className="w-4 h-4" />
                <span>Read on Yelp</span>
              </a>
            </div>
          </div>
        )}

        {/* Review Assurance & Verification Section */}
        <div className="mt-16 border-t border-slate-200/80 pt-12 mb-12">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center sm:text-left">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-blue">
                Verified Client Feedback
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] mt-1.5 tracking-tight">
                San Diego County&apos;s Highest-Rated Roofing &amp; Construction Specialists
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm text-[var(--text-secondary)] leading-relaxed">
              <div className="space-y-4">
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  Unbiased Reviews on Google Local &amp; Yelp
                </h3>
                <p>
                  At Rise Up Roofing &amp; Construction, every review represents an authentic homeowner or commercial property manager who trusted us with their building envelope. We maintain a top-tier rating across Google Business and Yelp because we prioritize crystal-clear communication, proactive jobsite cleanliness, and engineered precision from start to finish.
                </p>
                <p>
                  Our clients frequently highlight our dedicated project managers, daily photographic progress logs, and strict adherence to agreed project timelines. Whether replacing aging asphalt shingles in Oceanside or completing complex tile underlayment relayments in Carlsbad, our focus remains on providing a stress-free contractor experience.
                </p>
              </div>

              <div className="space-y-4">
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  Master Workmanship &amp; Ironclad Warranties
                </h3>
                <p>
                  A great roofing review is earned on the roof, not in an advertising campaign. As an Owens Corning Preferred Contractor and licensed dual-trade specialist (C-39 Roofing and B General Building), our installations are executed to strict manufacturer specifications that qualify for extended 50-year non-prorated system warranties.
                </p>
                <p>
                  We also eliminate finger-pointing during solar detach-and-reset procedures by managing both the photovoltaic array and roofing underlayment in-house. When North County property owners invest in their roofs, they know Rise Up stands behind every nail, bracket, and valley metal installation with our comprehensive workmanship guarantee.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href={stats.googleUrl || GOOGLE_REVIEWS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 text-[var(--text-primary)] font-bold text-xs uppercase tracking-wider px-6 py-3.5 rounded-xl transition-all shadow-xs"
          >
            <Icon name="star" className="w-4 h-4 text-amber-400 fill-amber-400" />
            <span>Read Google Reviews ({stats.googleRating ? stats.googleRating.toFixed(1) : '5.0'} ★)</span>
          </a>
          <a
            href={stats.yelpUrl || YELP_REVIEWS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 text-[var(--text-primary)] font-bold text-xs uppercase tracking-wider px-6 py-3.5 rounded-xl transition-all shadow-xs"
          >
            <YelpIcon className="w-4 h-4" />
            <span>See all {stats.yelpTotalCount} on Yelp</span>
          </a>
        </div>
      </Section>
    </>
  );
}
