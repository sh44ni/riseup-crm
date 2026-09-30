import React, { useState } from 'react';
import { Star, MessageSquare, RefreshCw, Send, ThumbsUp } from 'lucide-react';
import { DevelopmentInProgressBanner } from '@/components/common/DevelopmentInProgressBanner';
import { CrmPageHero } from '@/components/common/CrmPageHero';

export function ReviewsPage() {
  const [search, setSearch] = useState('');
  const REVIEWS = [
    { author: 'Bradley Vance', rating: 5, source: 'Google Verified', text: 'Rise Up replaced our concrete tile roof after storm damage. Fast, honest estimator, clean crew, and zero mess left in the driveway.', date: '3 days ago' },
    { author: 'Chloe M.', rating: 5, source: 'Yelp Fusion', text: 'Best roofer in North County. They explained the whole pitch multiplier and underlayment options clearly. Highly recommend!', date: '1 week ago' },
    { author: 'Nathaniel Ramos', rating: 5, source: 'Google Verified', text: 'Seamless experience. Proposal was digital, signed on my phone, and work started 4 days later.', date: '2 weeks ago' },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto select-none pb-16">
      <CrmPageHero
        pageId="reviews"
        defaultEyebrow="Social Proof & Customer Trust"
        defaultTitle="Reputation & Review Automation"
        defaultSubtitle="Google Business Profile & Yelp sync, and automated 5-star customer feedback loops"
        searchValue={search}
        onSearchChange={setSearch}
        onSearchClear={() => setSearch('')}
        searchPlaceholder="Search reviews, authors, platforms..."
        bottomRightBadges={
          <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-700">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-200 shadow-2xs">
              <Star size={11} className="fill-amber-500 text-amber-500" />
              <span>4.98 Star Rating (142 Google)</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
              <span>96% Net Promoter</span>
            </span>
          </div>
        }
      />

      <DevelopmentInProgressBanner
        moduleName="Google 5-Star Reviews & Reputation Collector"
        expectedVersion="v3.2 Marketing Sprint"
        description="This review automation module is currently undergoing active engineering. Automated post-job SMS review requests, Google Business API webhooks, and Yelp sync are arriving shortly."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {REVIEWS.map((rev, idx) => (
          <div key={idx} className="light-glass-card rounded-3xl p-6 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-slate-900 dark:text-white">{rev.author}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[#0284C7] dark:text-sky-400 font-semibold border border-slate-200 dark:border-white/10">
                {rev.source}
              </span>
            </div>

            <div className="flex items-center gap-1 text-amber-400">
              {[...Array(rev.rating)].map((_, i) => (
                <Star key={i} size={14} className="fill-amber-400 text-amber-400" />
              ))}
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed italic">
              "{rev.text}"
            </p>

            <div className="text-[11px] text-slate-400 dark:text-slate-500 pt-2 border-t border-slate-100 dark:border-white/10">
              {rev.date}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
