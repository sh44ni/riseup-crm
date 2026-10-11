import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '@/components/shared/Icon';
import { getJobBySlug, getAllJobSlugs } from '@/lib/data/careers';
import { buildMetadata, buildJobPostingJsonLd } from '@/lib/seo/metadata';
import { Section } from '@/components/shared/Container';
import { Breadcrumbs } from '@/components/shared/Breadcrumbs';
import { PHONE_NUMBER, PHONE_HREF } from '@/lib/utils';

export async function generateStaticParams() {
  return getAllJobSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const job = getJobBySlug(slug);
  if (!job) return {};
  return buildMetadata({
    title: `${job.title} — Careers | Rise Up Roofing`,
    description: job.description,
    path: `/careers/${job.slug}`,
    noIndex: true,
  });
}

export default async function CareerDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const job = getJobBySlug(slug);
  if (!job) notFound();

  const jobJsonLd = buildJobPostingJsonLd(job);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jobJsonLd) }} />
      <Section alternate={false} className="pt-32 sm:pt-36">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Careers', href: '/careers' },
            { label: job.title }
          ]}
        />

        <Link
          href="/careers"
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-blue mb-8 hover:text-[#1C88DD] transition-colors"
        >
          <Icon name="arrow-left" className="w-4 h-4" /> Back to All Positions
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-[62%_38%] gap-10 lg:gap-12 max-w-6xl mx-auto">
          {/* Left — Details */}
          <div>
            <div className="glass-card-interactive rounded-3xl p-6 sm:p-8 mb-8 border border-slate-200/80">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[var(--text-primary)] mb-4 tracking-tight">
                {job.title}
              </h1>

              <div className="flex flex-wrap gap-2.5 mb-6">
                <span className="glass-chip px-3 py-1 rounded-full text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-1.5">
                  <Icon name="briefcase" className="w-3.5 h-3.5 text-brand-blue" />
                  {job.department}
                </span>
                <span className="glass-chip px-3 py-1 rounded-full text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-1.5">
                  <Icon name="map-pin" className="w-3.5 h-3.5 text-brand-blue" />
                  San Diego County, CA
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200">
                  {job.employmentType.replace('-', ' ')}
                </span>
              </div>

              <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-8">
                {job.description}
              </p>

              <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4">
                Key Responsibilities
              </h3>
              <ul className="space-y-3 mb-8">
                {job.responsibilities.map((r) => (
                  <li key={r} className="flex items-start gap-2.5 text-xs sm:text-sm text-[var(--text-secondary)]">
                    <Icon name="check-circle" className="w-4 h-4 text-brand-blue flex-shrink-0 mt-0.5" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>

              <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4">
                Requirements &amp; Qualifications
              </h3>
              <ul className="space-y-3">
                {job.requirements.map((r) => (
                  <li key={r} className="flex items-start gap-2.5 text-xs sm:text-sm text-[var(--text-secondary)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-blue flex-shrink-0 mt-2" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>

              <h3 className="text-lg font-bold text-[var(--text-primary)] mt-8 mb-4">
                What We Offer &amp; Why You&apos;ll Thrive Here
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-2.5 text-xs sm:text-sm text-[var(--text-secondary)]">
                  <Icon name="check-circle" className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Top-Tier Industry Compensation:</strong> Competitive hourly base, overtime availability, and milestone-based performance bonuses.</span>
                </li>
                <li className="flex items-start gap-2.5 text-xs sm:text-sm text-[var(--text-secondary)]">
                  <Icon name="check-circle" className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Year-Round Stability:</strong> Predictable, continuous work schedule throughout San Diego County without winter weather layoffs.</span>
                </li>
                <li className="flex items-start gap-2.5 text-xs sm:text-sm text-[var(--text-secondary)]">
                  <Icon name="check-circle" className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Safety &amp; Equipment:</strong> Full company-supplied PPE, modern fall-arrest rigs, and premium commercial-grade tooling.</span>
                </li>
                <li className="flex items-start gap-2.5 text-xs sm:text-sm text-[var(--text-secondary)]">
                  <Icon name="check-circle" className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Professional Advancement:</strong> Paid manufacturer certifications (Owens Corning, Title 24 cool roof systems) and career pathways to leadership.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Right — Sticky Application Card */}
          <div>
            <div className="lg:sticky lg:top-28 glass-card-hero rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-lg">
              <h3 className="text-xl font-extrabold text-[var(--text-primary)] mb-2">
                Apply for this Position
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mb-6 leading-relaxed">
                Connect directly with our hiring managers. We review all applications within 24–48 hours.
              </p>

              <div className="space-y-3 mb-6">
                <a
                  href={PHONE_HREF}
                  className="w-full inline-flex items-center justify-center gap-2 bg-[#2E9BF0] hover:bg-[#1C88DD] text-white font-bold text-xs uppercase tracking-wider py-3.5 px-6 rounded-xl shadow-lg shadow-brand-blue/30 transition-all hover:brightness-110"
                >
                  <Icon name="phone" className="w-4 h-4" />
                  <span>Call Hiring Desk ({PHONE_NUMBER})</span>
                </a>

                <a
                  href="mailto:careers@riseuprac.com"
                  className="w-full inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 text-[var(--text-primary)] font-bold text-xs uppercase tracking-wider py-3.5 px-6 rounded-xl transition-all shadow-xs"
                >
                  <Icon name="mail" className="w-4 h-4 text-brand-blue" />
                  <span>Email Resume to Careers</span>
                </a>
              </div>

              <div className="pt-4 border-t border-slate-100 text-[11px] text-[var(--text-muted)] leading-relaxed">
                Rise Up Roofing &amp; Construction is an Equal Opportunity Employer. We provide competitive pay, health benefits, safety gear, and rapid advancement paths.
              </div>
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}
