'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Icon, GoogleIcon, YelpIcon } from '@/components/shared/Icon';
import { Section } from '@/components/shared/Container';
import { SectionHeading } from '@/components/shared/SectionHeading';
import { reviews, getAverageRating, type EnrichedReview } from '@/lib/data/reviews';
import type { ReviewStats } from '@/lib/reviews-server';
import { cn, YELP_REVIEWS_URL, GOOGLE_REVIEWS_URL } from '@/lib/utils';
import { Tooltip } from '@/components/shared/Tooltip';

export function ReviewsStrip({
  initialReviews,
  stats,
}: {
  initialReviews?: EnrichedReview[];
  stats?: ReviewStats;
}) {
  const reviewList = initialReviews && initialReviews.length > 0 ? initialReviews : reviews;
  const [platformFilter, setPlatformFilter] = useState<'all' | 'google' | 'yelp'>('all');
  const avgRating = stats?.averageRating ? stats.averageRating.toFixed(1) : getAverageRating(reviewList);
  const googleCount = stats?.googleCount ?? reviewList.filter((r) => r.source === 'google').length;
  const yelpCount = stats?.yelpCount ?? reviewList.filter((r) => r.source === 'yelp').length;
  const yelpTotalCount = stats?.yelpTotalCount ?? (yelpCount > 0 ? yelpCount : 1);
  const googleRating = stats?.googleRating ? stats.googleRating.toFixed(1) : '5.0';
  const yelpRating = stats?.yelpRating ? stats.yelpRating.toFixed(1) : '5.0';
  const totalCount = stats?.totalCount ?? reviewList.length;

  const filteredReviews =
    platformFilter === 'all'
      ? reviewList
      : reviewList.filter((r) => r.source === platformFilter);

  // Strictly display only 3 reviews on the homepage as requested
  const displayedReviews = filteredReviews.slice(0, 3);

  return (
    <Section alternate={true} id="reviews">
      <SectionHeading
        label="Verified Feedback"
        title="What San Diego Homeowners Say"
        subtitle="Real reviews from verified property owners across North County & Greater San Diego on Google Maps and Yelp."
      />

      {/* Interactive Platform Trust Header Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto mb-10">
        {/* Google Score Box */}
        <Tooltip content={`Read verified client reviews on Google`} className="w-full">
          <div className="bg-white rounded-2xl p-4 flex items-center justify-between border border-slate-100/80 hover:border-brand-blue/30 transition-all duration-300 w-full cursor-help shadow-[0_1px_3px_rgba(11,30,51,0.04),0_6px_18px_-4px_rgba(11,30,51,0.07)] hover:-translate-y-0.5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-50 p-2 border border-slate-100 flex items-center justify-center flex-shrink-0 shadow-2xs">
                <GoogleIcon className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-[var(--text-primary)] text-base">{googleRating}</span>
                  <div className="flex text-amber-400">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Icon key={s} name="star" className="w-3 h-3 text-amber-400" />
                    ))}
                  </div>
                </div>
                <p className="text-[11px] text-[var(--text-muted)] font-medium">{googleCount > 0 ? `${googleCount} Google Reviews` : 'Verified Google Rating'}</p>
              </div>
            </div>
            <span className="text-[10px] uppercase font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              Verified
            </span>
          </div>
        </Tooltip>

        {/* Yelp Score Box */}
        <Tooltip content="Read verified residential & commercial reviews on Yelp" className="w-full">
          <div className="bg-white rounded-2xl p-4 flex items-center justify-between border border-slate-100/80 hover:border-red-300/40 transition-all duration-300 w-full cursor-help shadow-[0_1px_3px_rgba(11,30,51,0.04),0_6px_18px_-4px_rgba(11,30,51,0.07)] hover:-translate-y-0.5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 p-2 flex items-center justify-center flex-shrink-0 shadow-2xs">
                <YelpIcon className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-[var(--text-primary)] text-base">{yelpRating}</span>
                  <div className="flex text-amber-400">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Icon key={s} name="star" className="w-3 h-3 text-amber-400" />
                    ))}
                  </div>
                </div>
                <p className="text-[11px] text-[var(--text-muted)] font-medium">{yelpTotalCount > 0 ? `${yelpTotalCount} Yelp Reviews` : 'Verified Yelp Rating'}</p>
              </div>
            </div>
            <span className="text-[10px] uppercase font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
              Top Rated
            </span>
          </div>
        </Tooltip>

        {/* Combined Score Box */}
        <Tooltip content={`Combined average rating based on verified client reviews`} className="w-full">
          <div className="bg-white rounded-2xl p-4 flex items-center justify-between border border-slate-100/80 hover:border-brand-blue/30 transition-all duration-300 w-full cursor-help shadow-[0_1px_3px_rgba(11,30,51,0.04),0_6px_18px_-4px_rgba(11,30,51,0.07)] hover:-translate-y-0.5">
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-extrabold text-[var(--text-primary)] text-xl tracking-tight">{avgRating}</span>
                <span className="text-xs text-[var(--text-muted)] font-medium">/ 5.0</span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] font-medium">Overall Rating</p>
            </div>
            <span className="text-[10px] uppercase font-bold text-brand-blue bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
              100% Recommended
            </span>
          </div>
        </Tooltip>
      </div>

      {/* Filter Tabs (only if reviews exist) */}
      {reviewList.length > 0 && (
        <div className="flex justify-center gap-2 mb-8">
          <button
            type="button"
            onClick={() => setPlatformFilter('all')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border',
              platformFilter === 'all'
                ? 'bg-brand-blue text-white border-brand-blue shadow-xs'
                : 'bg-white text-[#475569] border-slate-200/80 hover:border-brand-blue/30 shadow-2xs'
            )}
          >
            All Reviews ({totalCount})
          </button>

          <button
            type="button"
            onClick={() => setPlatformFilter('google')}
            className={cn(
              'inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border',
              platformFilter === 'google'
                ? 'bg-brand-blue text-white border-brand-blue shadow-xs'
                : 'bg-white text-[#475569] border-slate-200/80 hover:border-brand-blue/30 shadow-2xs'
            )}
          >
            <GoogleIcon className="w-3.5 h-3.5" />
            <span>Google ({googleCount > 0 ? googleCount : `${googleRating}★`})</span>
          </button>

          <button
            type="button"
            onClick={() => setPlatformFilter('yelp')}
            className={cn(
              'inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border',
              platformFilter === 'yelp'
                ? 'bg-brand-blue text-white border-brand-blue shadow-xs'
                : 'bg-white text-[#475569] border-slate-200/80 hover:border-brand-blue/30 shadow-2xs'
            )}
          >
            <YelpIcon className="w-3.5 h-3.5" />
            <span>Yelp ({yelpTotalCount > 0 ? yelpTotalCount : `${yelpRating}★`})</span>
          </button>
        </div>
      )}

      {/* Reviews Grid */}
      {displayedReviews.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {displayedReviews.map((review, idx) => {
            const isGoogle = review.source === 'google';
            const initials = (review.author || 'Client')
              .split(' ')
              .map((n: string) => n[0])
              .slice(0, 2)
              .join('');

            return (
              <div
                key={`${review.author}-${idx}`}
                className="bg-white rounded-3xl p-6 sm:p-7 flex flex-col justify-between border border-slate-100/80 hover:border-brand-blue/30 transition-all duration-300 relative group shadow-[0_1px_3px_rgba(11,30,51,0.04),0_8px_24px_-4px_rgba(11,30,51,0.07),0_24px_48px_-8px_rgba(11,30,51,0.04)] hover:shadow-[0_8px_24px_-4px_rgba(47,159,227,0.11),0_1px_3px_rgba(11,30,51,0.04)] hover:-translate-y-0.5 overflow-hidden"
              >
                {/* Accent top on hover */}
                <div className="absolute top-0 left-8 right-8 h-[2px] bg-gradient-to-r from-transparent via-brand-blue/35 to-transparent rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div>
                  {/* Header: Author Avatar + Name + Platform Badge */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      {review.authorPhoto ? (
                        <img
                          src={review.authorPhoto}
                          alt={review.author}
                          className="w-10 h-10 rounded-full object-cover border border-blue-100 shadow-2xs flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-xs font-bold text-brand-blue shadow-2xs flex-shrink-0">
                          {initials}
                        </div>
                      )}
                      <div>
                        <h4 className="text-sm font-bold text-[var(--text-primary)] group-hover:text-brand-blue transition-colors">
                          {review.author}
                        </h4>
                        <p className="text-[11px] text-[var(--text-muted)] flex items-center gap-1 mt-0.5 font-medium">
                          <Icon name="map-pin" className="w-3 h-3 text-brand-blue flex-shrink-0" />
                          <span>{review.neighborhood || review.location}</span>
                        </p>
                      </div>
                    </div>

                    {/* Platform pill with official logo */}
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] bg-slate-50 border border-slate-200/60 flex-shrink-0">
                      {isGoogle ? <GoogleIcon className="w-3 h-3" /> : <YelpIcon className="w-3 h-3" />}
                      <span>{isGoogle ? 'Google' : 'Yelp'}</span>
                    </span>
                  </div>

                  {/* Project Tag */}
                  {review.projectType && (
                    <div className="mb-3">
                      <span className="text-[10px] font-bold text-brand-blue bg-blue-50 border border-blue-100 px-2.5 py-0.5 rounded-full inline-block">
                        Project: {review.projectType}
                      </span>
                    </div>
                  )}

                  {/* Rating Stars & Date */}
                  <div className="flex items-center justify-between mb-3.5">
                    <div className="flex gap-0.5 text-amber-400">
                      {Array.from({ length: review.rating }).map((_, i) => (
                        <Icon key={i} name="star" className="w-3.5 h-3.5 text-amber-400" />
                      ))}
                    </div>
                    <span className="text-[10px] text-[var(--text-muted)] font-medium">{review.date}</span>
                  </div>

                  {/* Review Quote */}
                  <p className="text-xs sm:text-[13px] text-[var(--text-secondary)] leading-relaxed italic mb-4">
                    &ldquo;{review.text}&rdquo;
                  </p>

                  {/* Owner Reply if present */}
                  {review.ownerReply && (
                    <div className="mb-4 p-3 bg-slate-50 rounded-2xl border border-slate-100 text-[11px] text-[var(--text-secondary)]">
                      <p className="font-bold text-[10px] uppercase tracking-wider text-brand-blue mb-1">
                        Response from Rise Up Roofing:
                      </p>
                      <p className="italic leading-relaxed">&ldquo;{review.ownerReply}&rdquo;</p>
                    </div>
                  )}
                </div>

                {/* Bottom Verification Footer */}
                <div className="pt-3.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                    <Icon name="check-circle" className="w-3.5 h-3.5" />
                    <span>Verified Client</span>
                  </div>
                  {review.reviewUrl ? (
                    <a
                      href={review.reviewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--text-muted)] hover:text-brand-blue text-[10px] font-medium flex items-center gap-1 transition-colors"
                    >
                      <span>via {isGoogle ? 'Google Maps' : 'Yelp Profile'}</span>
                      <Icon name="external-link" className="w-2.5 h-2.5" />
                    </a>
                  ) : (
                    <span className="text-[var(--text-muted)] text-[10px] font-medium">
                      via {isGoogle ? 'Google Maps' : 'Yelp Profile'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {/* View All Reviews Primary Navigation CTA (if reviews exist) */}
      {totalCount > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
          <Link
            href="/reviews"
            className="inline-flex items-center justify-center gap-2.5 bg-brand-blue hover:bg-[#1C88DD] text-white font-bold text-xs sm:text-sm uppercase tracking-wider px-8 py-3.5 rounded-2xl transition-all shadow-md hover:shadow-lg hover:brightness-105 active:scale-[0.98] group"
          >
            <span>View All Client Reviews</span>
            <Icon name="arrow-right" className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      )}

      {/* External Review Links */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <a
          href={stats?.googleUrl || GOOGLE_REVIEWS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-white hover:bg-brand-blue text-[#0B1E33] hover:text-white font-bold text-xs uppercase tracking-wider px-6 py-3.5 rounded-2xl border border-slate-200/80 hover:border-brand-blue transition-all shadow-xs hover:shadow-md group"
        >
          <GoogleIcon className="w-4 h-4" />
          <span>Read All Google Reviews ({googleRating} ★)</span>
          <Icon name="external-link" className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </a>

        <a
          href={stats?.yelpUrl || YELP_REVIEWS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-white hover:bg-brand-blue text-[#0B1E33] hover:text-white font-bold text-xs uppercase tracking-wider px-6 py-3.5 rounded-2xl border border-slate-200/80 hover:border-brand-blue transition-all shadow-xs hover:shadow-md group"
        >
          <YelpIcon className="w-4 h-4" />
          <span>See all {yelpTotalCount} on Yelp ({yelpRating} ★)</span>
          <Icon name="external-link" className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </a>
      </div>
    </Section>
  );
}
