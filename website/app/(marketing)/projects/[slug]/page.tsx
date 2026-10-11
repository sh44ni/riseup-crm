import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Icon } from '@/components/shared/Icon';
import { getProjectBySlug, getAllProjectSlugs, projects } from '@/lib/data/projects';
import { buildMetadata, buildProjectJsonLd } from '@/lib/seo/metadata';
import { Section } from '@/components/shared/Container';
import { Breadcrumbs } from '@/components/shared/Breadcrumbs';

export async function generateStaticParams() {
  return getAllProjectSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const project = getProjectBySlug(slug);
  if (!project) return {};
  return buildMetadata({
    title: `${project.title} in ${project.city} | San Diego Roofing Case Study`,
    description: `${project.title} in ${project.city}, CA. See before and after photos, scope of work, and materials used.`,
    path: `/projects/${project.slug}`,
    ogImage: project.afterImage,
  });
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = getProjectBySlug(slug);
  if (!project) notFound();

  const relatedProjects = projects
    .filter((p) => p.slug !== slug)
    .sort((a, b) => {
      if (a.category === project.category && b.category !== project.category) return -1;
      if (b.category === project.category && a.category !== project.category) return 1;
      return 0;
    })
    .slice(0, 3);

  const projectJsonLd = buildProjectJsonLd(project);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(projectJsonLd) }}
      />
      {/* Hero — full-width case study image */}

      <section className="relative min-h-[460px] flex items-end overflow-hidden bg-[#0B1B2B]">
        <Image
          src={project.afterImage}
          alt={project.title}
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#07131F] via-[#0B1B2B]/75 to-[#0B1B2B]/35" />
        
        <div className="relative z-10 w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-12 pb-12 pt-36">
          <Breadcrumbs
            items={[
              { label: 'Home', href: '/' },
              { label: 'Projects', href: '/projects' },
              { label: project.title }
            ]}
          />
          <div className="flex items-center gap-2 mb-3">
            <span className="glass-chip px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-white">
              {project.category}
            </span>
            <span className="glass-chip px-3 py-1 rounded-full text-xs font-semibold text-white/90 flex items-center gap-1">
              <Icon name="map-pin" className="w-3.5 h-3.5 text-brand-blue" />
              {project.city}, California
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-2 tracking-tight">
            {project.title}
          </h1>
        </div>
      </section>

      <Section alternate={false}>
        <div className="grid grid-cols-1 lg:grid-cols-[62%_38%] gap-10 lg:gap-12">
          {/* Left — Scope & Gallery */}
          <div>
            <div className="glass-card-interactive rounded-2xl p-6 sm:p-8 mb-8 border border-slate-200/80 shadow-xs">
              <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] mb-4">
                Scope of Work
              </h2>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-6">
                {project.scopeOfWork}
              </p>

              <h3 className="text-base font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                <Icon name="shield-check" className="w-4 h-4 text-brand-blue" />
                <span>Materials &amp; Specifications</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {project.materialsUsed.map((mat) => (
                  <div
                    key={mat}
                    className="glass-chip rounded-xl p-3 flex items-center gap-2 text-xs text-[var(--text-secondary)]"
                  >
                    <Icon name="check-circle" className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>{mat}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Detailed Project Story / Problem & Engineering */}
            {project.challengeAndContext && (
              <div className="glass-card-interactive rounded-2xl p-6 sm:p-8 mb-8 border border-slate-200/80 shadow-xs">
                <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] mb-3">
                  The Problem &amp; Local Climate Challenge
                </h2>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  {project.challengeAndContext}
                </p>
              </div>
            )}

            {project.solutionAndEngineering && (
              <div className="glass-card-interactive rounded-2xl p-6 sm:p-8 mb-8 border border-slate-200/80 shadow-xs">
                <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] mb-3">
                  Technical Solution &amp; Engineering Execution
                </h2>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  {project.solutionAndEngineering}
                </p>
              </div>
            )}

            {/* Gallery */}
            {project.gallery.length > 1 && (
              <div>
                <h3 className="text-xl font-extrabold text-[var(--text-primary)] mb-4">
                  Project Gallery
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {project.gallery.map((img, i) => (
                    <div key={i} className="relative aspect-[4/3] rounded-2xl overflow-hidden glass-chip border border-slate-200/80">
                      <Image
                        src={img}
                        alt={`${project.title} photo ${i + 1}`}
                        fill
                        className="object-cover hover:scale-105 transition-transform duration-500"
                        sizes="(max-width: 768px) 50vw, 33vw"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right — Sticky Info Card */}
          <div>
            <div className="lg:sticky lg:top-28 glass-card-hero rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-lg">
              <h3 className="text-lg font-extrabold text-[var(--text-primary)] mb-5 pb-3 border-b border-slate-100">
                Project Summary
              </h3>
              
              <div className="space-y-3.5 text-xs mb-6">
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="text-[var(--text-muted)] font-semibold uppercase tracking-wider">Location</span>
                  <span className="font-bold text-[var(--text-primary)]">{project.city}, CA</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="text-[var(--text-muted)] font-semibold uppercase tracking-wider">Category</span>
                  <span className="font-bold text-[var(--text-primary)] capitalize">{project.category}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="text-[var(--text-muted)] font-semibold uppercase tracking-wider">Warranty</span>
                  <span className="font-bold text-emerald-700">Lifetime Owens Corning</span>
                </div>
              </div>

              {project.clientQuote && (
                <div className="glass-chip rounded-2xl p-4 mb-6 border border-slate-200/80">
                  <p className="text-xs text-[var(--text-secondary)] italic mb-2 leading-relaxed">
                    &ldquo;{project.clientQuote.text}&rdquo;
                  </p>
                  <p className="text-[11px] text-brand-blue font-bold">
                    — {project.clientQuote.author}
                  </p>
                </div>
              )}

              {/* Quality & Workmanship Standards */}
              <div className="glass-chip rounded-2xl p-4 mb-6 border border-slate-200/80">
                <h4 className="text-xs font-bold text-[var(--text-primary)] mb-1.5 flex items-center gap-1.5">
                  <Icon name="shield-check" className="w-3.5 h-3.5 text-brand-blue" />
                  <span>Licensed &amp; Insured Craftsmanship</span>
                </h4>
                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                  Supervised on-site by master roofing professionals in full compliance with California Title 24 energy and building codes. Every project includes municipal permitting, thorough magnetic nail sweep cleanup, and official manufacturer warranty registration.
                </p>
              </div>

              <Link href="/contact" className="block">
                <span className="w-full inline-flex items-center justify-center gap-2 bg-[#2E9BF0] hover:bg-[#1C88DD] text-white font-bold text-xs uppercase tracking-wider py-3.5 px-6 rounded-xl shadow-lg shadow-brand-blue/30 transition-all hover:brightness-110">
                  <Icon name="clipboard-check" className="w-4 h-4" />
                  <span>Get a Similar Estimate</span>
                  <Icon name="arrow-right" className="w-4 h-4" />
                </span>
              </Link>
            </div>
          </div>
        </div>
      </Section>

      {/* Related Projects Cross-Linking (SEO Mesh & Architectural Proof) */}
      {relatedProjects.length > 0 && (
        <Section alternate={true} className="border-t border-slate-200/80">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-8">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-brand-blue">Portfolio Exploration</span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)]">
                Related Case Studies &amp; Projects
              </h2>
            </div>
            <Link
              href="/projects"
              className="text-xs font-bold text-brand-blue hover:text-[#1C88DD] transition-colors inline-flex items-center gap-1"
            >
              <span>View All 11 Projects</span>
              <Icon name="arrow-right" className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {relatedProjects.map((rel) => (
              <Link key={rel.slug} href={`/projects/${rel.slug}`} className="group flex">
                <div className="glass-card-interactive rounded-2xl overflow-hidden flex flex-col w-full border border-slate-200/80 shadow-xs hover:border-brand-blue/30 transition-all duration-300">
                  <div className="relative h-48 overflow-hidden">
                    <Image
                      src={rel.afterImage}
                      alt={rel.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0B1B2B] via-transparent to-transparent" />
                    <div className="absolute top-3 left-3">
                      <span className="glass-chip px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider text-white backdrop-blur-md border-white/20">
                        {rel.category}
                      </span>
                    </div>
                    <div className="absolute bottom-3 left-3 flex items-center gap-1 text-xs text-white">
                      <span className="glass-chip px-2 py-0.5 rounded-lg flex items-center gap-1 backdrop-blur-md text-[11px] font-semibold">
                        <Icon name="map-pin" className="w-3 h-3 text-brand-blue" />
                        {rel.city}, CA
                      </span>
                    </div>
                  </div>
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-base font-bold text-[var(--text-primary)] mb-1 group-hover:text-brand-blue transition-colors">
                        {rel.title}
                      </h3>
                      <p className="text-xs text-[var(--text-secondary)] line-clamp-2 mb-4 leading-relaxed">
                        {rel.scopeOfWork}
                      </p>
                    </div>
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-brand-blue group-hover:text-[#1C88DD] transition-colors">
                      <span>Read Case Study</span>
                      <Icon name="arrow-right" className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </Section>
      )}
    </>
  );
}
