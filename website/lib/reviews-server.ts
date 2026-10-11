import { reviews, type EnrichedReview } from '@/lib/data/reviews';
import { GOOGLE_REVIEWS_URL, YELP_REVIEWS_URL } from '@/lib/utils';

export type { EnrichedReview };

export interface ReviewStats {
  totalCount: number;
  averageRating: number;
  googleCount: number;
  yelpCount: number;
  yelpTotalCount: number;
  yelpRating: number;
  googleRating: number;
  yelpUrl: string;
  googleUrl: string;
}

function getBackendUrl(): string {
  return (
    process.env.FASTAPI_BACKEND_URL ||
    (process.env.USE_FASTAPI === 'true' ? 'http://127.0.0.1:8000' : 'http://127.0.0.1:8000')
  );
}

function getApiKey(): string {
  // No hard-coded fallback: the key must be supplied via the environment.
  return process.env.RISEUP_API_KEY || '';
}

/**
 * Fetch published reviews from FastAPI backend with graceful fallback to curated defaults
 */
export async function getPublicReviews(): Promise<EnrichedReview[]> {
  try {
    const backendUrl = getBackendUrl();
    const apiKey = getApiKey();
    const res = await fetch(`${backendUrl}/api/reviews/public`, {
      next: { revalidate: 60 },
      headers: {
        'x-api-key': apiKey,
      },
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.reviews)) {
        return data.reviews;
      }
    }
  } catch (err) {
    console.warn('[getPublicReviews] Backend fetch failed:', err);
  }

  // Return authentic verified reviews fallback if backend fetch fails
  return reviews;
}

/**
 * Fetch aggregated review counts and ratings from FastAPI backend or fallback to static defaults
 */
export async function getReviewStats(): Promise<ReviewStats> {
  try {
    const backendUrl = getBackendUrl();
    const apiKey = getApiKey();
    const res = await fetch(`${backendUrl}/api/reviews/public`, {
      next: { revalidate: 60 },
      headers: {
        'x-api-key': apiKey,
      },
    });

    if (res.ok) {
      const data = await res.json();
      if (data.stats && data.stats.totalCount > 0) {
        return data.stats;
      }
    }
  } catch (err) {
    console.warn('[getReviewStats] Backend fetch failed, using static stats fallback:', err);
  }

  const googleReviews = reviews.filter((r) => r.source === 'google');
  const yelpReviews = reviews.filter((r) => r.source === 'yelp');
  const googleRating = googleReviews.length
    ? Math.round((googleReviews.reduce((sum, r) => sum + r.rating, 0) / googleReviews.length) * 10) / 10
    : 5.0;
  const yelpRating = yelpReviews.length
    ? Math.round((yelpReviews.reduce((sum, r) => sum + r.rating, 0) / yelpReviews.length) * 10) / 10
    : 5.0;
  const avgRating = reviews.length
    ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10
    : 5.0;

  return {
    totalCount: reviews.length,
    averageRating: avgRating,
    googleCount: googleReviews.length,
    yelpCount: yelpReviews.length,
    yelpTotalCount: Math.max(yelpReviews.length, 1),
    yelpRating,
    googleRating,
    yelpUrl: YELP_REVIEWS_URL,
    googleUrl: GOOGLE_REVIEWS_URL,
  };
}
