import type { Metadata } from 'next';
import { COMPANY_NAME, BASE_URL, CONTACT_EMAIL } from '@/lib/utils';

interface MetadataOptions {
  title: string;
  description: string;
  path: string;
  ogImage?: string;
}


export function buildMetadata({ title, description, path, ogImage }: MetadataOptions): Metadata {
  const trimmed = title.trim();
  let fullTitle: string;

  if (trimmed.includes('Rise Up') || trimmed.includes('riseuprac')) {
    fullTitle = trimmed.replace(/\s*\|\s*San Diego County/i, '').trim();
  } else if (trimmed.length <= 48) {
    // Plenty of room for full brand suffix under 60 chars
    fullTitle = `${trimmed} | Rise Up Roofing`;
  } else if (trimmed.length <= 53) {
    // Fit short brand suffix under 60 chars
    fullTitle = `${trimmed} | Rise Up`;
  } else {
    // Title is already a complete, rich 54-65 char keyword phrase — preserve fully without truncation
    fullTitle = trimmed;
  }

  const url = `${BASE_URL}${path}`;

  const image = ogImage || `${BASE_URL}/og-image.jpg`;

  return {
    title: {
      absolute: fullTitle,
    },
    description,
    alternates: { canonical: url },
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: COMPANY_NAME,
      images: [{ url: image, width: 1200, height: 630 }],
      locale: 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [image],
    },
  };
}

export const BUSINESS_ADDRESS = {
  '@type': 'PostalAddress',
  streetAddress: '2182 S El Camino Real',
  addressLocality: 'Oceanside',
  addressRegion: 'CA',
  postalCode: '92054',
  addressCountry: 'US',
};

export function buildLocalBusinessJsonLd(stats?: { totalCount: number; averageRating: number }) {
  return {
    '@context': 'https://schema.org',
    '@type': ['RoofingContractor', 'GeneralContractor'],
    name: COMPANY_NAME,
    url: BASE_URL,
    telephone: '+17606221230',
    email: CONTACT_EMAIL,
    address: BUSINESS_ADDRESS,
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
    areaServed: [
      { '@type': 'County', name: 'San Diego County' },
      { '@type': 'City', name: 'San Diego' },
      { '@type': 'City', name: 'Oceanside' },
      { '@type': 'City', name: 'Carlsbad' },
      { '@type': 'City', name: 'Escondido' },
      { '@type': 'City', name: 'Encinitas' },
      { '@type': 'City', name: 'San Marcos' },
      { '@type': 'City', name: 'Vista' },
      { '@type': 'City', name: 'Del Mar' },
      { '@type': 'City', name: 'Solana Beach' },
      { '@type': 'City', name: 'La Jolla' },
      { '@type': 'City', name: 'Chula Vista' },
      { '@type': 'City', name: 'El Cajon' },
      { '@type': 'City', name: 'La Mesa' },
      { '@type': 'City', name: 'Poway' },
      { '@type': 'City', name: 'Rancho Santa Fe' },
      { '@type': 'City', name: 'Rancho San Diego' },
      { '@type': 'City', name: 'Fallbrook' },
      { '@type': 'City', name: 'Ramona' },
      { '@type': 'City', name: 'Valley Center' },
      { '@type': 'City', name: 'Rancho Bernardo' },
    ],

    priceRange: '$$',
    openingHours: 'Mo-Su 00:00-24:00',
    sameAs: [
      'https://www.google.com/maps/place/Rise+Up+Roofing+%26+Construction',
      'https://www.yelp.com/biz/rise-up-roofing-and-construction-oceanside-2',
      'https://www.instagram.com/riseuproofingandconstruction/',
      'https://www.facebook.com/profile.php?id=61551393216836',
      'https://business.escondidochamber.org/list/member/rise-up-roofing-and-construction-inc-9925',
      'https://www.owenscorning.com/en-us/roofing/contractors/contractor-profile/247226',
    ],
  };
}

export function buildServiceJsonLd(
  service: { name: string; shortDescription: string; slug: string },
  stats?: { totalCount: number; averageRating: number }
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: service.name,
    description: service.shortDescription,
    url: `${BASE_URL}/services/${service.slug}`,
    provider: {
      '@type': ['RoofingContractor', 'GeneralContractor'],
      name: COMPANY_NAME,
      url: BASE_URL,
      telephone: '+17606221230',
      address: BUSINESS_ADDRESS,
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
      '@type': 'County',
      name: 'San Diego County',
    },
  };
}

export function buildFAQJsonLd(faqs: { question: string; answer: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

export function buildReviewJsonLd(reviews: { author: string; rating: number; text: string }[]) {
  const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / (reviews.length || 1);
  return {
    '@context': 'https://schema.org',
    '@type': 'RoofingContractor',
    name: COMPANY_NAME,
    url: BASE_URL,
    telephone: '+17606221230',
    priceRange: '$$',
    address: BUSINESS_ADDRESS,
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: avgRating.toFixed(1),
      reviewCount: reviews.length,
      bestRating: 5,
      worstRating: 1,
    },
    review: reviews.map((r) => ({
      '@type': 'Review',
      author: { '@type': 'Person', name: r.author },
      reviewRating: { '@type': 'Rating', ratingValue: r.rating, bestRating: 5 },
      reviewBody: r.text,
    })),
  };
}

export function buildJobPostingJsonLd(job: {
  title: string;
  description: string;
  employmentType: string;
  slug: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description: job.description,
    employmentType: job.employmentType.toUpperCase().replace('-', '_'),
    hiringOrganization: {
      '@type': 'Organization',
      name: COMPANY_NAME,
      sameAs: BASE_URL,
    },
    jobLocation: {
      '@type': 'Place',
      address: BUSINESS_ADDRESS,
    },
    url: `${BASE_URL}/careers/${job.slug}`,
    datePosted: new Date().toISOString().split('T')[0],
  };
}

export function buildTechArticleJsonLd({
  headline,
  description,
  url,
  datePublished,
  dateModified,
  keywords,
}: {
  headline: string;
  description: string;
  url: string;
  datePublished?: string;
  dateModified?: string;
  keywords?: string[];
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline,
    description,
    url,
    mainEntityOfPage: url,
    datePublished: datePublished || '2024-01-15T08:00:00+08:00',
    dateModified: dateModified || new Date().toISOString(),
    author: {
      '@type': 'RoofingContractor',
      name: COMPANY_NAME,
      url: BASE_URL,
      address: BUSINESS_ADDRESS,
      telephone: '+17606221230',
    },
    publisher: {
      '@type': 'Organization',
      name: COMPANY_NAME,
      url: BASE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${BASE_URL}/og-image.jpg`,
      },
    },
    keywords: keywords || ['Roof Tear Off Process', 'Roof Removal', 'San Diego Roofing'],
    inLanguage: 'en-US',
  };
}

export function buildProjectJsonLd(project: {
  title: string;
  scopeOfWork: string;
  city: string;
  slug: string;
  afterImage: string;
  materialsUsed: string[];
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: project.title,
    headline: project.title,
    description: project.scopeOfWork,
    image: project.afterImage,
    url: `${BASE_URL}/projects/${project.slug}`,
    locationCreated: {
      '@type': 'Place',
      name: `${project.city}, California`,
      address: {
        '@type': 'PostalAddress',
        addressLocality: project.city,
        addressRegion: 'CA',
        addressCountry: 'US',
      },
    },
    author: {
      '@type': 'RoofingContractor',
      name: COMPANY_NAME,
      url: BASE_URL,
    },
  };
}

