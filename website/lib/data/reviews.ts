import type { Review } from '@/types/review';

export interface EnrichedReview extends Review {
  neighborhood?: string;
  projectType?: string;
}

export const reviews: EnrichedReview[] = [];

export function getAverageRating(reviewList: Review[] = reviews): number {
  if (!reviewList.length) return 5.0;
  const total = reviewList.reduce((sum, r) => sum + r.rating, 0);
  return Math.round((total / reviewList.length) * 10) / 10;
}

export function getReviewCount(reviewList: Review[] = reviews): number {
  return reviewList.length;
}
