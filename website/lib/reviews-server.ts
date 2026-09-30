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
  return (
    process.env.RISEUP_API_KEY ||
    'rup_live_vhu3GEw1RtOSVEKNG881wT_whHOOiadXbnBzqiichUw'
  );
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

  // Only return real published reviews (empty if none published yet)
  return [];
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

  const googleCount = reviews.filter((r) => r.source === 'google').length;
  const yelpCount = reviews.filter((r) => r.source === 'yelp').length;

  return {
    totalCount: reviews.length,
    averageRating: 5.0,
    googleCount,
    yelpCount,
    yelpTotalCount: Math.max(yelpCount, 1),
    yelpRating: 5.0,
    googleRating: 5.0,
    yelpUrl: YELP_REVIEWS_URL,
    googleUrl: GOOGLE_REVIEWS_URL,
  };
}
