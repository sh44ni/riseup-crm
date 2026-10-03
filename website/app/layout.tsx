import type { Metadata } from 'next';
import Script from 'next/script';
import { Inter } from 'next/font/google';
import './globals.css';
import { buildLocalBusinessJsonLd } from '@/lib/seo/metadata';
import { COMPANY_NAME } from '@/lib/utils';
import { LeadModalProvider } from '@/context/LeadModalContext';
import { UnifiedLeadModal } from '@/components/shared/UnifiedLeadModal';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: {
    default: `${COMPANY_NAME} | San Diego County Roofing Experts`,
    template: `%s | ${COMPANY_NAME}`,
  },
  description: 'San Diego County\'s trusted roofing and construction company. Residential, commercial, solar roofing, repairs, and general construction. Licensed, bonded & insured. Free estimates.',
  metadataBase: new URL('https://riseuprac.com'),
  keywords: [
    'roofing contractor san diego',
    'san diego roofing company',
    'roof repair san diego',
    'tile roof repair san diego',
    'commercial roofing san diego',
    'roof replacement oceanside ca',
    'roof inspection san diego',
  ],
  authors: [{ name: COMPANY_NAME }],
  creator: COMPANY_NAME,
  publisher: COMPANY_NAME,
  category: 'Roofing and Construction Services',
  formatDetection: {
    telephone: true,
    email: true,
    address: true,
  },
  verification: {
    google: 'google127c05be5b9b38a9',
  },
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const localBusinessJsonLd = buildLocalBusinessJsonLd();
  const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: COMPANY_NAME,
    url: 'https://riseuprac.com',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://riseuprac.com/services?q={search_term_string}',
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <html lang="en" className={inter.variable} data-scroll-behavior="smooth">
      <head>
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="preconnect" href="https://www.google-analytics.com" />
      </head>
      <body className="antialiased">
        {/* Google tag (gtag.js) - active on production domains only; disabled on staging, localhost, and admin */}
        <Script id="google-tag-gtag" strategy="afterInteractive">
          {`
            var isStagingOrDev = (
              window.location.hostname === 'website.riseuprac.com' ||
              window.location.hostname.indexOf('staging') !== -1 ||
              window.location.hostname === 'localhost' ||
              window.location.hostname === '127.0.0.1' ||
              window.location.pathname.startsWith('/admin')
            );

            if (isStagingOrDev) {
              window['ga-disable-G-82QZ88P6TK'] = true;
            } else {
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-82QZ88P6TK');

              var s = document.createElement('script');
              s.async = true;
              s.src = 'https://www.googletagmanager.com/gtag/js?id=G-82QZ88P6TK';
              document.head.appendChild(s);
            }
          `}
        </Script>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        {/* Rich analytics tracking — pageviews, clicks, scroll, forms, CTAs, session duration, UTMs */}
        <Script src="/tracker.js" strategy="afterInteractive" />
        <LeadModalProvider>
          {children}
          <UnifiedLeadModal />
        </LeadModalProvider>
      </body>
    </html>
  );
}
