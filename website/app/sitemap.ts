import type { MetadataRoute } from 'next';
import { getAllServiceSlugs } from '@/lib/data/services';
import { getAllProjectSlugs } from '@/lib/data/projects';
import { getAllServiceAreaSlugs } from '@/lib/data/serviceAreas';
import { getAllGuideSlugs } from '@/lib/data/guides';
import { BASE_URL } from '@/lib/utils';

// Stable content release timestamps (Prevents Google from invalidating lastmod due to fake dynamic updates)
const RECENT_UPDATE = new Date('2026-10-11T00:00:00Z');
const PROJECT_UPDATE = new Date('2026-09-20T00:00:00Z');
const STATIC_UPDATE = new Date('2026-10-02T00:00:00Z');

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages = [
    { url: `${BASE_URL}/`, lastModified: RECENT_UPDATE, changeFrequency: 'weekly' as const, priority: 1 },
    { url: `${BASE_URL}/services`, lastModified: RECENT_UPDATE, changeFrequency: 'weekly' as const, priority: 0.9 },
    { url: `${BASE_URL}/roof-financing-san-diego`, lastModified: STATIC_UPDATE, changeFrequency: 'monthly' as const, priority: 0.9 },
    { url: `${BASE_URL}/guides`, lastModified: RECENT_UPDATE, changeFrequency: 'weekly' as const, priority: 0.8 },
    { url: `${BASE_URL}/projects`, lastModified: PROJECT_UPDATE, changeFrequency: 'weekly' as const, priority: 0.8 },
    { url: `${BASE_URL}/reviews`, lastModified: RECENT_UPDATE, changeFrequency: 'weekly' as const, priority: 0.7 },
    { url: `${BASE_URL}/about`, lastModified: STATIC_UPDATE, changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${BASE_URL}/about/roof-tear-off-process`, lastModified: STATIC_UPDATE, changeFrequency: 'monthly' as const, priority: 0.7 },
    { url: `${BASE_URL}/careers`, lastModified: STATIC_UPDATE, changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${BASE_URL}/contact`, lastModified: STATIC_UPDATE, changeFrequency: 'monthly' as const, priority: 0.9 },
    { url: `${BASE_URL}/service-area`, lastModified: RECENT_UPDATE, changeFrequency: 'monthly' as const, priority: 0.7 },
    { url: `${BASE_URL}/terms`, lastModified: STATIC_UPDATE, changeFrequency: 'yearly' as const, priority: 0.3 },
    { url: `${BASE_URL}/privacy`, lastModified: STATIC_UPDATE, changeFrequency: 'yearly' as const, priority: 0.3 },
  ];

  const servicePages = getAllServiceSlugs().map((slug) => ({
    url: `${BASE_URL}/services/${slug}`,
    lastModified: RECENT_UPDATE,
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }));

  const projectPages = getAllProjectSlugs().map((slug) => ({
    url: `${BASE_URL}/projects/${slug}`,
    lastModified: PROJECT_UPDATE,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  const cityPages = getAllServiceAreaSlugs().map((slug) => ({
    url: `${BASE_URL}/service-area/${slug}`,
    lastModified: RECENT_UPDATE,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  const guidePages = getAllGuideSlugs().map((slug) => ({
    url: `${BASE_URL}/guides/${slug}`,
    lastModified: RECENT_UPDATE,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  // Note: Individual /careers/[slug] subpages are intentionally excluded from sitemap
  // to concentrate crawl budget on high-value commercial, residential, and regional landing pages.
  return [...staticPages, ...servicePages, ...projectPages, ...cityPages, ...guidePages];
}
