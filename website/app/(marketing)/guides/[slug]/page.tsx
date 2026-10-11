import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Icon } from '@/components/shared/Icon';
import {
  buildMetadata,
  buildTechArticleJsonLd,
  buildFAQJsonLd,
  buildLocalBusinessJsonLd,
} from '@/lib/seo/metadata';
import { getGuideBySlug, getAllGuideSlugs, GUIDES } from '@/lib/data/guides';
import { Section, Container } from '@/components/shared/Container';
import { Breadcrumbs } from '@/components/shared/Breadcrumbs';
import { FAQAccordion } from '@/components/shared/FAQAccordion';
import { PHONE_HREF, PHONE_NUMBER, BASE_URL } from '@/lib/utils';
import { getReviewStats } from '@/lib/reviews-server';

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return getAllGuideSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);

  if (!guide) {
    return {};
  }

  return buildMetadata({
    title: guide.seoTitle,
    description: guide.seoDescription,
    path: `/guides/${guide.slug}`,
  });
}

export default async function GuideDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);

  if (!guide) {
    notFound();
  }

  const [stats] = await Promise.all([getReviewStats()]);

  const articleJsonLd = buildTechArticleJsonLd({
    headline: guide.title,
    description: guide.seoDescription,
    url: `${BASE_URL}/guides/${guide.slug}`,
    datePublished: guide.publishedAt,
    dateModified: guide.updatedAt,
    keywords: guide.tags,
  });

  const faqJsonLd = guide.faqs.length > 0 ? buildFAQJsonLd(guide.faqs) : null;
  const localBusinessJsonLd = buildLocalBusinessJsonLd(stats);

  const otherGuides = GUIDES.filter((g) => g.slug !== guide.slug).slice(0, 3);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }}
      />

      {/* Hero Header */}
      <section className="relative pt-32 pb-16 md:pt-40 md:pb-24 bg-slate-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a192f]/90 via-[#0d213a]/80 to-slate-900/95 pointer-events-none" />
        
        <Container className="relative z-10">
          <Breadcrumbs
            items={[
              { label: 'Home', href: '/' },
              { label: 'Guides', href: '/guides' },
              { label: guide.title, href: `/guides/${guide.slug}` },
            ]}
          />

          <div className="max-w-4xl mt-6">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className="text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full bg-brand-gold/20 text-brand-gold border border-brand-gold/30">
                {guide.category}
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1.5">
                <Icon name="clock" className="w-3.5 h-3.5 text-slate-400" />
                {guide.readTimeMinutes} min read
              </span>
              <span className="text-xs text-slate-400">
                • CSLB #1096492
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight mb-6">
              {guide.title}
            </h1>

            <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
              {guide.summary}
            </p>

            <div className="mt-8 pt-6 border-t border-slate-800 flex items-center justify-between flex-wrap gap-4 text-xs text-slate-400">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand-blue/20 border border-brand-blue/30 flex items-center justify-center text-brand-blue font-bold text-sm">
                  RU
                </div>
                <div>
                  <div className="font-bold text-white text-sm">{guide.author.name}</div>
                  <div className="text-slate-400">{guide.author.role} • {guide.author.license}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span>Published by Rise Up Roofing & Construction Inc.</span>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Main Content Body with Sticky TOC */}
      <Section className="py-16 md:py-24 bg-white">
        <Container>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* Sidebar Table of Contents */}
            <aside className="lg:col-span-4 order-2 lg:order-1">
              <div className="sticky top-28 space-y-8">
                <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-6 shadow-xs">
                  <h3 className="text-xs font-black uppercase tracking-widest text-brand-blue mb-4 flex items-center gap-2">
                    <Icon name="layers" className="w-4 h-4" />
                    <span>Table of Contents</span>
                  </h3>
                  <nav className="space-y-2.5">
                    {guide.tableOfContents.map((item, idx) => (
                      <a
                        key={item.id}
                        href={`#${item.id}`}
                        className="flex items-start gap-2.5 text-xs font-semibold text-slate-600 hover:text-brand-blue transition-colors py-1 leading-snug"
                      >
                        <span className="text-slate-400 font-mono text-[11px] shrink-0">{idx + 1}.</span>
                        <span>{item.title}</span>
                      </a>
                    ))}
                  </nav>
                </div>

                {/* Related Services Links */}
                <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-6">
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 mb-3">
                    Related Services
                  </h4>
                  <div className="space-y-2">
                    {guide.relatedServices.map((svc) => (
                      <Link
                        key={svc.slug}
                        href={`/services/${svc.slug}`}
                        className="block text-xs font-bold text-brand-blue hover:underline py-1"
                      >
                        → {svc.name}
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Direct Consultation Box */}
                <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-md">
                  <h4 className="text-sm font-bold text-white mb-2">Have Project Questions?</h4>
                  <p className="text-xs text-slate-300 leading-relaxed mb-4">
                    Speak directly with our San Diego project estimators for free advice.
                  </p>
                  <a
                    href={PHONE_HREF}
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-brand-blue hover:bg-[#1C88DD] text-white font-bold text-xs transition-colors"
                  >
                    <Icon name="phone" className="w-3.5 h-3.5 text-brand-gold" />
                    <span>Call {PHONE_NUMBER}</span>
                  </a>
                </div>
              </div>
            </aside>

            {/* Article Main Text */}
            <main className="lg:col-span-8 order-1 lg:order-2 space-y-12">
              {/* Featured Image */}
              <div className="relative h-72 sm:h-96 rounded-3xl overflow-hidden shadow-lg">
                <Image
                  src={guide.coverImage}
                  alt={guide.title}
                  fill
                  className="object-cover"
                  priority
                />
              </div>

              {/* Sections */}
              {guide.sections.map((section) => (
                <section key={section.id} id={section.id} className="scroll-mt-32 space-y-4">
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight border-b border-slate-100 pb-3">
                    {section.title}
                  </h2>
                  <div className="text-slate-700 text-sm sm:text-base leading-relaxed whitespace-pre-line space-y-4">
                    {section.content}
                  </div>

                  {section.highlights && section.highlights.length > 0 && (
                    <div className="mt-4 bg-slate-50 border border-slate-200/80 rounded-2xl p-5 space-y-2">
                      <div className="text-xs font-black uppercase tracking-wider text-brand-blue mb-1">
                        Key Takeaways:
                      </div>
                      <ul className="space-y-1.5">
                        {section.highlights.map((h, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs font-semibold text-slate-700">
                            <Icon name="check-circle" className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                            <span>{h}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </section>
              ))}

              {/* FAQs Component */}
              {guide.faqs.length > 0 && (
                <section className="pt-8 border-t border-slate-200">
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-6">
                    Frequently Asked Questions
                  </h2>
                  <FAQAccordion items={guide.faqs} />
                </section>
              )}

              {/* Tags */}
              <div className="pt-6 border-t border-slate-100 flex flex-wrap gap-2 items-center">
                <span className="text-xs font-bold text-slate-400">Tags:</span>
                {guide.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-full"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </main>
          </div>
        </Container>
      </Section>

      {/* Related Guides Section */}
      <Section className="py-16 bg-slate-50 border-t border-slate-200/80">
        <Container>
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-black text-slate-900">Explore More Technical Guides</h3>
            <Link href="/guides" className="text-xs font-bold text-brand-blue hover:underline">
              View All Guides →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {otherGuides.map((og) => (
              <Link
                key={og.slug}
                href={`/guides/${og.slug}`}
                className="group bg-white rounded-2xl p-5 border border-slate-200/80 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-brand-blue mb-2 block">
                    {og.category}
                  </span>
                  <h4 className="font-bold text-slate-900 text-sm group-hover:text-brand-blue transition-colors line-clamp-2 mb-2">
                    {og.title}
                  </h4>
                  <p className="text-xs text-slate-500 line-clamp-2 mb-4">
                    {og.summary}
                  </p>
                </div>
                <span className="text-xs font-bold text-brand-blue inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Read Article →
                </span>
              </Link>
            ))}
          </div>
        </Container>
      </Section>
    </>
  );
}
