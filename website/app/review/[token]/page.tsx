'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import {
  Star,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Globe,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Phone,
  ArrowRight,
  HelpCircle,
} from 'lucide-react';

interface ReviewData {
  id: number;
  customer_name: string;
  customer_city?: string;
  rating: number;
  feedback?: string;
  service_type?: string;
  status: string;
  google_clicked: boolean;
}

export default function HomeownerReviewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const resolvedParams = use(params);
  const token = resolvedParams.token;

  const [review, setReview] = useState<ReviewData | null>(null);
  const [selectedRating, setSelectedRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadReview() {
      try {
        const res = await fetch(`/api/review/${token}`);
        if (!res.ok) {
          throw new Error('Review link is invalid or has expired.');
        }
        const data = await res.json();
        setReview(data.review);
        if (data.review.rating) {
          setSelectedRating(data.review.rating);
        }
        if (data.review.feedback) {
          setFeedback(data.review.feedback);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load review request.');
      } finally {
        setLoading(false);
      }
    }
    loadReview();
  }, [token]);

  const handleSubmit = async (isGoogleIntent: boolean) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/review/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: selectedRating,
          feedback,
          googleClicked: isGoogleIntent,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to record review.');
      }

      setSubmitted(true);

      if (isGoogleIntent) {
        // Direct to Google Business review link
        window.open('https://g.page/r/riseuproofing/review', '_blank');
      }
    } catch (err: any) {
      alert(err.message || 'Error submitting feedback.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-3 animate-spin">
          <Sparkles size={28} />
        </div>
        <p className="text-white font-bold text-base">Loading Review Request...</p>
        <p className="text-slate-400 text-xs mt-1">Rise Up Roofing &amp; Construction</p>
      </div>
    );
  }

  if (error || !review) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-3">
          <AlertTriangle size={28} />
        </div>
        <h1 className="text-white font-bold text-lg">Review Link Expired</h1>
        <p className="text-slate-400 text-xs mt-1 max-w-sm">
          {error || 'This personalized review link is no longer active. Thank you for your support!'}
        </p>
        <Link
          href="/"
          className="mt-6 px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow-md inline-block"
        >
          Return to Rise Up Roofing
        </Link>
      </div>
    );
  }

  const is5Star = selectedRating === 5;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 sm:px-6 flex flex-col items-center justify-center">
      {/* Container */}
      <div className="w-full max-w-xl bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
        {/* Header Branding */}
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 px-6 py-5 text-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-950 text-amber-400 flex items-center justify-center shadow-md flex-shrink-0">
              <Zap size={20} />
            </div>
            <div>
              <span className="font-black text-sm block leading-none">Rise Up Roofing &amp; Construction</span>
              <span className="text-slate-950/80 text-[10px] font-bold uppercase tracking-wider">CSLB License #1096492</span>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold bg-slate-950/15 px-2.5 py-1 rounded-full">
            Verified Homeowner
          </span>
        </div>

        {submitted ? (
          <div className="p-8 sm:p-12 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-lg animate-in zoom-in-95">
              <CheckCircle2 size={36} />
            </div>

            <h2 className="text-2xl font-black text-white">Thank You, {review.customer_name}!</h2>

            {is5Star ? (
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-md mx-auto">
                Your 5-star rating means the world to our crew. If you opened Google Reviews, your feedback helps other homeowners in San Diego choose trusted roofing contractors.
              </p>
            ) : (
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-md mx-auto">
                Thank you for your honesty. We take client satisfaction very seriously. Our leadership team will review your notes and contact you directly to resolve any outstanding matters.
              </p>
            )}

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href="tel:6194327663"
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
              >
                <Phone size={13} /> Call Office (619) 432-7663
              </a>
              <Link
                href="/"
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold transition-colors"
              >
                Visit Main Website
              </Link>
            </div>
          </div>
        ) : (
          <div className="p-6 sm:p-10 space-y-6">
            <div>
              <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">
                Homeowner Review Request
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-white mt-1">
                How was your roofing experience?
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Hi {review.customer_name}, we appreciate your trust with your {review.service_type || 'roofing project'}{review.customer_city ? ` in ${review.customer_city}` : ''}.
              </p>
            </div>

            {/* Big Interactive 5-Star Selector */}
            <div className="p-6 rounded-2xl bg-slate-950/70 border border-white/5 text-center space-y-3">
              <span className="text-xs font-bold text-slate-300 block">Tap to rate your experience:</span>
              <div className="flex items-center justify-center gap-2 sm:gap-3">
                {[1, 2, 3, 4, 5].map(star => {
                  const active = hoverRating ? star <= hoverRating : star <= selectedRating;
                  return (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setSelectedRating(star)}
                      className="p-1 sm:p-2 rounded-xl hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                      title={`${star} Star${star > 1 ? 's' : ''}`}
                    >
                      <Star
                        size={36}
                        className={
                          active
                            ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                            : 'text-slate-700 hover:text-slate-500'
                        }
                      />
                    </button>
                  );
                })}
              </div>

              <div className="text-xs font-black uppercase tracking-wider text-amber-400">
                {selectedRating === 5
                  ? '★★★★★ 5.0 — Excellent / Highly Recommend'
                  : selectedRating === 4
                  ? '★★★★☆ 4.0 — Good Experience'
                  : selectedRating === 3
                  ? '★★★☆☆ 3.0 — Average'
                  : '★★☆☆☆ Needs Improvement'}
              </div>
            </div>

            {/* Smart Reputation Gating Messaging */}
            {is5Star ? (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs space-y-1">
                <span className="font-bold flex items-center gap-1.5 text-emerald-400">
                  <Sparkles size={14} /> Thank you for being a 5-star client!
                </span>
                <p className="leading-relaxed opacity-90">
                  Your review directly supports our local roofing installers and foremen. Submitting will open Google Reviews where you can paste your thoughts.
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs space-y-1">
                <span className="font-bold flex items-center gap-1.5 text-amber-400">
                  <HelpCircle size={14} /> We want to make it 100% right
                </span>
                <p className="leading-relaxed opacity-90">
                  We hold our crews to the highest standard. Please let our management team know how we can resolve any issues with your roof or clean-up.
                </p>
              </div>
            )}

            {/* Feedback Box */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {is5Star ? 'What did you like best about our service? (Optional)' : 'How can we improve or resolve this for you?'}
              </label>
              <textarea
                rows={4}
                placeholder={
                  is5Star
                    ? 'e.g. Michael and the installation crew were fast, professional, and left the yard spotless. Love our new Owens Corning roof!'
                    : 'e.g. Let us know if there are any clean-up or gutter concerns...'
                }
                value={feedback}
                onChange={e => setFeedback(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Submit Action */}
            <div className="pt-2">
              {is5Star ? (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleSubmit(true)}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-black text-sm shadow-xl active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Globe size={16} />
                  {submitting ? 'Submitting...' : 'Submit & Post to Google Review'}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleSubmit(false)}
                  className="w-full py-3.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm border border-white/10 shadow-lg active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <MessageSquare size={16} />
                  {submitting ? 'Submitting...' : 'Submit Private Feedback to Owner'}
                </button>
              )}
            </div>

            <p className="text-[11px] text-slate-500 text-center">
              Owens Corning Preferred Contractor • CSLB #1096492 • San Diego &amp; Riverside County
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
