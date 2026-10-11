'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Icon } from '@/components/shared/Icon';
import { Section } from '@/components/shared/Container';
import { SectionHeading } from '@/components/shared/SectionHeading';
import { projects } from '@/lib/data/projects';
import { cn } from '@/lib/utils';

const CATEGORIES = ['All', 'Residential', 'Commercial', 'Repairs', 'Construction'];

export function FeaturedProjects() {
  const [activeCategory, setActiveCategory] = useState('All');

  const filteredProjects =
    activeCategory === 'All'
      ? projects.slice(0, 6)
      : projects
          .filter((p) => p.category.toLowerCase().includes(activeCategory.toLowerCase()))
          .slice(0, 6);

  return (
    <Section id="projects" alternate={false}>
      <SectionHeading
        label="Our Portfolio"
        title="Featured Roofing &amp; Construction Projects"
        subtitle="See the craftsmanship and attention to detail that sets Rise Up apart. Every project is engineered with premium materials, strict manufacturer guidelines, and lasting coastal protection."
      />

      {/* Category filter tabs */}
      <div className="flex flex-wrap justify-center gap-2 mb-10">
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat;
          return (
            <button
              type="button"
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border',
                isActive
                  ? 'bg-brand-blue text-white border-brand-blue shadow-xs'
                  : 'bg-white text-[#475569] border-slate-200/80 hover:border-brand-blue/30 shadow-2xs'
              )}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Project Cards Grid (Balanced 3x2) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-7">
        {filteredProjects.map((project) => (
          <Link
            key={project.slug}
            href={`/projects/${project.slug}`}
            className="image-overlay-card group relative rounded-3xl overflow-hidden flex flex-col justify-end min-h-[450px] sm:min-h-[480px] border border-slate-200/60 hover:border-brand-blue/70 transition-all duration-300 shadow-[0_16px_40px_-10px_rgba(11,30,51,0.10)] hover:-translate-y-1.5 hover:shadow-[0_24px_50px_-10px_rgba(47,159,227,0.25)] cursor-pointer"
          >
            {/* Full Bleed Background Image */}
            <Image
              src={project.afterImage}
              alt={project.title}
              fill
              className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />

            {/* Multi-stop Deep Gradient Overlay for crisp readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B1B2B] via-[#0B1B2B]/85 via-55% to-black/35 transition-opacity duration-300 group-hover:via-[#0B1B2B]/75" />

            {/* Top Category Badge & Location */}
            <div className="absolute top-4 left-5 right-5 z-10 flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-bold tracking-wider uppercase text-brand-blue bg-black/60 backdrop-blur-md px-3 py-1 rounded-xl border border-white/15 shadow-sm">
                {project.category}
              </span>

              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-white bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-xl border border-white/15 shadow-sm">
                <Icon name="map-pin" className="w-3 h-3 text-brand-blue" />
                <span>{project.city}, CA</span>
              </span>
            </div>

            {/* Card Bottom Content Area */}
            <div className="relative z-10 p-5 sm:p-6 flex flex-col justify-end">
              {/* Title */}
              <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug mb-2 group-hover:text-brand-blue transition-colors duration-200">
                {project.title}
              </h3>

              {/* Scope of Work */}
              <p className="text-xs sm:text-[13px] text-white/80 leading-relaxed line-clamp-2 sm:line-clamp-3 mb-4">
                {project.scopeOfWork}
              </p>

              {/* Clean Architectural Spec Row */}
              <div className="grid grid-cols-2 gap-3 py-3 border-y border-white/15 mb-5">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-white/50 font-medium block">
                    City Location
                  </span>
                  <span className="text-xs font-bold text-white truncate block mt-0.5">
                    {project.city}, CA
                  </span>
                </div>
                <div className="border-l border-white/15 pl-3">
                  <span className="text-[10px] uppercase tracking-wider text-white/50 font-medium block">
                    Key Material
                  </span>
                  <span className="text-xs font-bold text-brand-blue truncate block mt-0.5">
                    {project.materialsUsed?.[0] || 'Manufacturer System'}
                  </span>
                </div>
              </div>

              {/* Global Website Button Style */}
              <div className="w-full py-3 px-5 rounded-xl bg-brand-blue text-white group-hover:brightness-110 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-200 shadow-md group-hover:shadow-brand-blue/30">
                <span>View Case Study</span>
                <Icon name="arrow-right" className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Complete Projects Quick-Access Index (Ensures all 11 case studies receive homepage PageRank) */}
      <div className="mt-10 pt-8 border-t border-slate-200/60 max-w-5xl mx-auto">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 text-center mb-3">
          All San Diego Case Studies &amp; Completed Installations
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {projects.map((p) => (
            <Link
              key={p.slug}
              href={`/projects/${p.slug}`}
              className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200/70 hover:border-brand-blue/40 text-slate-700 hover:text-brand-blue text-xs font-medium transition-all shadow-2xs flex items-center gap-1.5"
            >
              <Icon name="map-pin" className="w-3 h-3 text-brand-blue" />
              <span>{p.title} ({p.city})</span>
            </Link>
          ))}
        </div>
      </div>

      {/* View All Projects Bottom Banner */}
      <div className="text-center mt-8">
        <Link href="/projects">
          <span className="inline-flex items-center gap-2 bg-white hover:bg-brand-blue hover:text-white border border-slate-200/80 hover:border-brand-blue text-[#0B1E33] font-bold text-xs uppercase tracking-wider px-6 py-3.5 rounded-2xl transition-all shadow-xs hover:shadow-md cursor-pointer">
            <span>Explore Complete Projects Portfolio</span>
            <Icon name="arrow-right" className="w-4 h-4" />
          </span>
        </Link>
      </div>
    </Section>
  );
}
