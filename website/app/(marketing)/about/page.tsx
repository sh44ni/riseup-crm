import type { Metadata } from 'next';
import { Icon, type IconName } from '@/components/shared/Icon';
import Link from 'next/link';
import { buildMetadata } from '@/lib/seo/metadata';
import { Section } from '@/components/shared/Container';
import { SectionHeading } from '@/components/shared/SectionHeading';
import { Breadcrumbs } from '@/components/shared/Breadcrumbs';
import { COMPANY_NAME, LICENSE_NUMBER, PHONE_HREF, PHONE_NUMBER } from '@/lib/utils';
import { getReviewStats } from '@/lib/reviews-server';

export const revalidate = 3600;

export const metadata: Metadata = buildMetadata({
  title: 'About Us | San Diego Roofing & Construction',
  description: `Learn about ${COMPANY_NAME} — San Diego County's trusted roofing company with 25+ years of experience. Licensed, bonded, and insured CA Lic #${LICENSE_NUMBER}.`,
  path: '/about',
});

const VALUES: Array<{
  icon: IconName;
  title: string;
  desc: string;
  color: string;
}> = [
  {
    icon: 'shield',
    title: 'Integrity First',
    desc: 'We provide honest assessments and transparent itemized pricing. If a targeted repair will solve the issue, we will never push for an unnecessary replacement.',
    color: 'text-brand-blue bg-blue-500/10 border-blue-400/30',
  },
  {
    icon: 'users',
    title: 'Client Focus',
    desc: 'Every project starts with attentive communication. We tailor solutions to your property structure, timeline, and budget — treating your home with utmost care.',
    color: 'text-amber-400 bg-amber-500/10 border-amber-400/30',
  },
  {
    icon: 'award',
    title: 'Quality Craftsmanship',
    desc: 'We use premium Owens Corning materials, follow strict manufacturer specifications, and back our installations with long-term non-prorated warranties.',
    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-400/30',
  },
  {
    icon: 'heart',
    title: 'Community Roots',
    desc: 'We are proud San Diego neighbors, not an out-of-state franchise. We take personal pride in protecting the families and businesses across our local communities.',
    color: 'text-rose-400 bg-rose-500/10 border-rose-400/30',
  },
];

export default async function AboutPage() {
  const stats = await getReviewStats();
  return (
    <Section alternate={false} className="pt-32 sm:pt-36">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'About' }]} />
      
      <SectionHeading
        as="h1"
        label="Our Heritage"
        title="About Rise Up Roofing & Construction"
        subtitle={`${COMPANY_NAME} has been protecting homes and commercial properties across San Diego County for over 25 years with master craftsmanship.`}
      />

      {/* Founder Story Glass Card */}
      <div className="max-w-4xl mx-auto mb-16">
        <div className="glass-card-hero rounded-3xl p-8 sm:p-10 lg:p-12 border border-slate-200/80 shadow-md">
          <div className="inline-flex items-center gap-2 glass-chip px-3.5 py-1 rounded-full mb-4 text-xs font-bold uppercase tracking-wider text-brand-blue">
            <span>Established 2000 • San Diego County</span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] mb-6">
            Built on Honest Relationships &amp; Master Craftsmanship
          </h3>
          <div className="space-y-4 text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
            <p>
              Rise Up Roofing &amp; Construction was founded with a clear mission: every homeowner deserves honest, professional roofing service at a fair price. What started as a dedicated local crew has grown into one of San Diego County&apos;s most reputable roofing and construction companies.
            </p>
            <p>
              With California Contractor&apos;s License #{LICENSE_NUMBER}, we are fully licensed, bonded, and insured. As an Owens Corning Preferred Contractor, we install industry-leading roofing systems engineered to withstand coastal weather, marine salt mist, and inland heat.
            </p>
            <p>
              Our master craftsmen take personal pride in every project — from emergency leak diagnostics to complete tile relays and commercial flat roofs. We treat every roof as if it were our own home.
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)]">
              <Icon name="check-circle" className="w-4 h-4 text-emerald-600" />
              <span>CA License #{LICENSE_NUMBER} • Fully Bonded</span>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/contact">
                <span className="inline-flex items-center gap-1.5 bg-[#2E9BF0] hover:bg-[#1C88DD] text-white font-bold text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl shadow-md transition-all hover:brightness-110">
                  <Icon name="clipboard-check" className="w-3.5 h-3.5" />
                  <span>Free Estimate</span>
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Values */}
      <div className="mb-16">
        <div className="text-center mb-10">
          <span className="glass-chip px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-brand-blue mb-3 inline-block">
            Our Principles
          </span>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)]">
            Core Values That Guide Every Roof We Build
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {VALUES.map((v) => {
            return (
              <div
                key={v.title}
                className="glass-card-interactive rounded-2xl p-6 flex items-start gap-4 border border-slate-200/80"
              >
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 border ${v.color}`}
                >
                  <Icon name={v.icon} className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-[var(--text-primary)] mb-1.5">{v.title}</h4>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{v.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Technical Standards & Roof Tear-Off Guide Link */}
      <div className="max-w-5xl mx-auto mb-16">
        <div className="glass-card-interactive rounded-3xl p-6 sm:p-8 border border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-brand-blue flex items-center justify-center flex-shrink-0 border border-blue-100">
              <Icon name="file-text" className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-brand-blue block mb-1">
                Engineering &amp; Code Standards
              </span>
              <h4 className="text-base sm:text-lg font-bold text-[var(--text-primary)] mb-1">
                Explore Our Technical Roof Tear-Off &amp; Removal Guide
              </h4>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed max-w-xl">
                Learn how we comply with California Residential Code CRC R908, detect sub-deck dry rot, and divert 100% of asphalt shingles into Caltrans road recycling.
              </p>
            </div>
          </div>
          <Link
            href="/about/roof-tear-off-process"
            className="inline-flex items-center gap-2 bg-[#2E9BF0] hover:bg-[#1C88DD] text-white font-bold text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl shadow-md transition-all hover:brightness-110 flex-shrink-0"
          >
            <span>Read Technical Guide</span>
            <Icon name="arrow-right" className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Facts Dock */}
      <div className="glass-card-interactive rounded-3xl p-8 lg:p-10 border border-slate-200/80 max-w-5xl mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
          {[
            { stat: '25+', label: 'Years Experience' },
            { stat: '1,000+', label: 'Roofs Protected' },
            { stat: `${stats.averageRating ? stats.averageRating.toFixed(1) : '5.0'} / 5.0`, label: 'Client Rating' },
            { stat: '100%', label: 'Licensed & Bonded' },
          ].map((item) => (
            <div key={item.label}>
              <p className="text-3xl sm:text-4xl font-extrabold text-brand-blue mb-1">
                {item.stat}
              </p>
              <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                {item.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}
