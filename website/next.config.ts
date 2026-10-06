import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname, '..'),
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'media.base44.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 's3-media0.fl.yelpcdn.com' },
      { protocol: 'https', hostname: 's3-media1.fl.yelpcdn.com' },
      { protocol: 'https', hostname: 's3-media2.fl.yelpcdn.com' },
      { protocol: 'https', hostname: 'cdn.weatherapi.com' },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://images.unsplash.com https://media.base44.com https://lh3.googleusercontent.com https://s3-media0.fl.yelpcdn.com https://s3-media1.fl.yelpcdn.com https://s3-media2.fl.yelpcdn.com https://cdn.weatherapi.com https://*.tile.openstreetmap.org https://tile.openstreetmap.org https://*.tile.openstreetmap.fr https://server.arcgisonline.com https://services.arcgisonline.com https://*.basemaps.cartocdn.com https://basemaps.cartocdn.com https://unpkg.com",
              "connect-src 'self' https://www.google-analytics.com https://analytics.google.com https://vitals.vercel-insights.com https://server.arcgisonline.com https://*.tile.openstreetmap.org https://tile.openstreetmap.org",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/services/repairs',
        destination: '/services/roof-repair',
        permanent: true,
      },
      {
        source: '/services/commercial',
        destination: '/services/commercial-roofing',
        permanent: true,
      },
      {
        source: '/services/solar',
        destination: '/services/solar-roofing',
        permanent: true,
      },
      {
        source: '/services/residential-roofing',
        destination: '/services/residential',
        permanent: true,
      },
      {
        source: '/roof-inspection',
        destination: '/services/roof-inspection',
        permanent: true,
      },
      {
        source: '/commercial-roofing',
        destination: '/services/commercial-roofing',
        permanent: true,
      },
      {
        source: '/commercial-roof-inspection',
        destination: '/services/commercial-roof-inspection',
        permanent: true,
      },
      {
        source: '/roof-repair',
        destination: '/services/roof-repair',
        permanent: true,
      },
      {
        source: '/metal-roofs',
        destination: '/services/metal-roofing',
        permanent: true,
      },
      {
        source: '/tile-roofing',
        destination: '/services/tile-roofing',
        permanent: true,
      },
      {
        source: '/solar-installation',
        destination: '/services/solar-roofing',
        permanent: true,
      },
      {
        source: '/modified-bitumen',
        destination: '/services/modified-bitumen',
        permanent: true,
      },
      {
        source: '/industrial-roofing',
        destination: '/services/industrial-roofing',
        permanent: true,
      },
      {
        source: '/roof-coating',
        destination: '/services/roof-coating',
        permanent: true,
      },
      {
        source: '/deck-builder',
        destination: '/services/deck-builder',
        permanent: true,
      },
    ];
  },
  async rewrites() {
    const fastApiUrl = process.env.FASTAPI_BACKEND_URL || (process.env.USE_FASTAPI === 'true' ? 'http://127.0.0.1:8000' : null);
    if (!fastApiUrl) {
      return [];
    }
    return {
      beforeFiles: [
        {
          source: '/api/:path*',
          destination: `${fastApiUrl}/api/:path*`,
        },
        {
          source: '/developer',
          destination: `${fastApiUrl}/developer`,
        },
        {
          source: '/developer/:path*',
          destination: `${fastApiUrl}/developer/:path*`,
        },
        {
          source: '/docs',
          destination: `${fastApiUrl}/docs`,
        },
        {
          source: '/docs/:path*',
          destination: `${fastApiUrl}/docs/:path*`,
        },
        {
          source: '/openapi.json',
          destination: `${fastApiUrl}/openapi.json`,
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};


export default nextConfig;
