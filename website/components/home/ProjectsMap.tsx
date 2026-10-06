'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import 'leaflet/dist/leaflet.css';
import { Icon } from '@/components/shared/Icon';
import { Section } from '@/components/shared/Container';
import { SectionHeading } from '@/components/shared/SectionHeading';
import { cn, PHONE_HREF } from '@/lib/utils';
import { projects } from '@/lib/data/projects';
import type { Project } from '@/lib/types';

interface MapProject {
  id: string;
  title: string;
  scope: string;
  category: 'residential' | 'repair' | 'commercial' | 'solar';
  city: string;
  neighborhood: string;
  lat: number;
  lng: number;
  image: string;
  materials: string;
}

const SAN_DIEGO_MAP_PROJECTS: MapProject[] = [
  {
    id: 'oceanside-shingle-replacement',
    title: 'Coastal Shingle & Underlayment',
    scope: 'Complete tear-off with Owens Corning TruDefinition Duration storm-grade shingles.',
    category: 'residential',
    city: 'Oceanside',
    neighborhood: 'South Oceanside',
    lat: 33.1764,
    lng: -117.3615,
    image: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=800&q=80',
    materials: 'Owens Corning TruDefinition Duration (Onyx Black)',
  },
  {
    id: 'carlsbad-tile-relayment',
    title: 'Custom Spanish S-Tile Lift & Reset',
    scope: 'Precision tile removal, high-temp dual underlayment, re-lay with rustproof fasteners.',
    category: 'residential',
    city: 'Carlsbad',
    neighborhood: 'Aviara',
    lat: 33.1259,
    lng: -117.3108,
    image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80',
    materials: 'Spanish Clay S-Tile + Eagle High-Temp Underlayment',
  },
  {
    id: 'sd-broken-tile-repair',
    title: 'Emergency Storm Leak & Valley Repair',
    scope: 'Same-day roof leak triage, replaced cracked valley tiles, rebuilt waterproof flashing.',
    category: 'repair',
    city: 'San Diego',
    neighborhood: 'Pacific Beach',
    lat: 32.7984,
    lng: -117.2366,
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
    materials: 'Eagle Concrete Tiles + 26-Gauge Galvalume Valley Metal',
  },
  {
    id: 'escondido-commercial-tpo',
    title: 'Commercial Medical Center TPO Roof',
    scope: '60-mil white reflective Carlisle TPO system with R-30 polyiso rigid insulation.',
    category: 'commercial',
    city: 'Escondido',
    neighborhood: 'Central Escondido',
    lat: 33.1215,
    lng: -117.0815,
    image: 'https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?auto=format&fit=crop&w=800&q=80',
    materials: 'Carlisle 60-Mil Energy-Star TPO System',
  },
  {
    id: 'encinitas-solar-roof',
    title: 'Integrated Solar System + Shingle Upgrade',
    scope: 'Full roof replacement combined with 8.4 kW integrated solar array and microinverters.',
    category: 'solar',
    city: 'Encinitas',
    neighborhood: 'Leucadia',
    lat: 33.0585,
    lng: -117.2952,
    image: 'https://images.unsplash.com/photo-1508873696983-2df5293cb32f?auto=format&fit=crop&w=800&q=80',
    materials: 'Owens Corning Duration + REC Alpha 420W Black Panels',
  },
  {
    id: 'san-marcos-flat-tile',
    title: 'Modern Flat Concrete Tile System',
    scope: 'Modern low-profile concrete tile installation with complete perimeter bird stop.',
    category: 'residential',
    city: 'San Marcos',
    neighborhood: 'San Elijo Hills',
    lat: 33.0970,
    lng: -117.1895,
    image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80',
    materials: 'Eagle Bel Air Flat Charcoal Tile',
  },
  {
    id: 'vista-tile-leak-fix',
    title: 'Chimney & Skylight Waterproofing',
    scope: 'Custom copper cricket fabrication and complete mortar cap restoration.',
    category: 'repair',
    city: 'Vista',
    neighborhood: 'Shadowridge',
    lat: 33.1678,
    lng: -117.2415,
    image: 'https://images.unsplash.com/photo-1584463699039-445a4947936d?auto=format&fit=crop&w=800&q=80',
    materials: 'Custom 16oz Cold-Rolled Copper + Seal-A-Ridge',
  },
  {
    id: 'poway-estate-roof',
    title: 'Luxury Presidential Shake Shingles',
    scope: 'High-definition heavy laminate shingles with Class-4 impact rating.',
    category: 'residential',
    city: 'Poway',
    neighborhood: 'Green Valley',
    lat: 32.9815,
    lng: -117.0425,
    image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80',
    materials: 'CertainTeed Presidential Shake TL (Autumn Blend)',
  },
  {
    id: 'del-mar-coastal-roof',
    title: 'High-Wind Marine Grade Shingles',
    scope: 'Stainless steel hurricane-rated fastening system for oceanfront salt resistance.',
    category: 'residential',
    city: 'Del Mar',
    neighborhood: 'Olde Del Mar',
    lat: 32.9595,
    lng: -117.2653,
    image: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=800&q=80',
    materials: 'Owens Corning Storm Shingles + Marine Fasteners',
  },
  {
    id: 'la-jolla-tile-preservation',
    title: 'Historic Villa Clay Tile Preservation',
    scope: 'Meticulous cataloging and reset of original clay barrel tiles with modern moisture barrier.',
    category: 'residential',
    city: 'La Jolla',
    neighborhood: 'La Jolla Shores',
    lat: 32.8580,
    lng: -117.2530,
    image: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=800&q=80',
    materials: 'Historic 2-Piece Clay Barrel Tile + Boral TileSeal',
  },
];

const CATEGORY_FILTERS = [
  { key: 'all', label: 'All Projects' },
  { key: 'residential', label: 'Residential Tile & Shingle' },
  { key: 'repair', label: 'Leak Repairs' },
  { key: 'commercial', label: 'Commercial Flat' },
  { key: 'solar', label: 'Solar Roofing' },
] as const;

const CATEGORY_COLORS = {
  residential: { hex: '#2F9FE3', bg: 'bg-[#2F9FE3]' },
  repair: { hex: '#EAA636', bg: 'bg-[#EAA636]' },
  commercial: { hex: '#10B981', bg: 'bg-[#10B981]' },
  solar: { hex: '#6366F1', bg: 'bg-[#6366F1]' },
};

export function ProjectsMap() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [selectedProject, setSelectedProject] = useState<MapProject | null>(SAN_DIEGO_MAP_PROJECTS[0]);

  const filteredProjects = filter === 'all'
    ? SAN_DIEGO_MAP_PROJECTS
    : SAN_DIEGO_MAP_PROJECTS.filter((p) => p.category === filter);

  const leafletRef = useRef<any>(null);

  // Initialize Map Once
  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (typeof window === 'undefined' || !mapContainerRef.current) return;

      try {
        const leafletModule = await import('leaflet');
        const L = (leafletModule as any).default || leafletModule;
        leafletRef.current = L;

        if (!isMounted || !mapContainerRef.current) return;

        // Clean up any stale container instance if hot-reloaded
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }

        const map = L.map(mapContainerRef.current, {
          center: [33.0800, -117.2000],
          zoom: 10,
          scrollWheelZoom: false,
          zoomControl: true,
        });

        // Esri ArcGIS World Street Map (100% Free, reliable enterprise CDN, no API key required)
        const mapTiles = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
          attribution: 'Tiles &copy; <a href="https://www.esri.com/" target="_blank" rel="noopener noreferrer">Esri</a> &mdash; DeLorme, NAVTEQ',
          maxZoom: 19,
          crossOrigin: true,
        }).addTo(map);

        mapInstanceRef.current = map;

        // Render initial markers
        renderMarkers(L, map, filter);

        // Ensure tiles render completely after layout settles
        setTimeout(() => {
          if (isMounted && mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize();
          }
        }, 200);

        setTimeout(() => {
          if (isMounted && mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize();
          }
        }, 600);
      } catch (err) {
        console.error('Failed to initialize map:', err);
      }
    }

    initMap();

    // Resize observer to prevent grey tile container glitches
    let resizeObserver: ResizeObserver | null = null;
    if (mapContainerRef.current && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      });
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      isMounted = false;
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  const renderMarkers = useCallback((L: any, map: any, currentFilter: string) => {
    if (!map || !L) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const activeList = currentFilter === 'all'
      ? SAN_DIEGO_MAP_PROJECTS
      : SAN_DIEGO_MAP_PROJECTS.filter((p) => p.category === currentFilter);

    activeList.forEach((proj) => {
      const color = CATEGORY_COLORS[proj.category]?.hex || '#2F9FE3';

      const customIcon = L.divIcon({
        className: 'custom-map-pin',
        html: `
          <div style="
            background-color: ${color};
            width: 32px;
            height: 32px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2.5px solid #FFFFFF;
            box-shadow: 0 4px 12px rgba(0,0,0,0.35);
            cursor: pointer;
            transition: transform 0.2s ease;
          ">
            <div style="
              width: 10px;
              height: 10px;
              background-color: #FFFFFF;
              border-radius: 50%;
              transform: rotate(45deg);
            "></div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32],
      });

      const marker = L.marker([proj.lat, proj.lng], { icon: customIcon }).addTo(map);

      marker.on('click', () => {
        setSelectedProject(proj);
      });

      markersRef.current.push(marker);
    });
  }, []);

  // Update markers on filter change
  useEffect(() => {
    if (mapInstanceRef.current && leafletRef.current) {
      renderMarkers(leafletRef.current, mapInstanceRef.current, filter);
    }
  }, [filter, renderMarkers]);

  const handleCityClick = (lat: number, lng: number, cityName: string) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([lat, lng], 12, { animate: true, duration: 0.8 });
    }
    const matched = SAN_DIEGO_MAP_PROJECTS.find((p) => p.city.toLowerCase() === cityName.toLowerCase());
    if (matched) {
      setSelectedProject(matched);
    }
  };

  return (
    <Section id="map" alternate={true}>
      <SectionHeading
        label="Our Completed Work"
        title="Projects Across San Diego"
        subtitle="Trusted by homeowners and businesses throughout San Diego County. Click any pin to inspect real project specifications."
        centered={true}
      />

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
        {CATEGORY_FILTERS.map((cat) => (
          <button
            key={cat.key}
            type="button"
            onClick={() => setFilter(cat.key)}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border flex items-center gap-2',
              filter === cat.key
                ? 'bg-brand-blue text-white border-brand-blue shadow-xs'
                : 'bg-white text-[#475569] border-slate-200/80 hover:border-brand-blue/40 shadow-2xs'
            )}
          >
            {cat.key !== 'all' && (
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: CATEGORY_COLORS[cat.key as MapProject['category']]?.hex }}
              />
            )}
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Quick Jump City Pills */}
      <div className="flex flex-wrap items-center justify-center gap-1.5 mb-8">
        <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mr-1">Quick Jump:</span>
        {[
          { name: 'Oceanside', lat: 33.1959, lng: -117.3795 },
          { name: 'Carlsbad', lat: 33.1581, lng: -117.3506 },
          { name: 'Encinitas', lat: 33.0370, lng: -117.2915 },
          { name: 'San Marcos', lat: 33.1434, lng: -117.1661 },
          { name: 'Escondido', lat: 33.1192, lng: -117.0864 },
          { name: 'Vista', lat: 33.2000, lng: -117.2425 },
          { name: 'Poway', lat: 32.9628, lng: -117.0359 },
          { name: 'San Diego', lat: 32.7157, lng: -117.1611 },
        ].map((c) => (
          <button
            key={c.name}
            type="button"
            onClick={() => handleCityClick(c.lat, c.lng, c.name)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-blue-50 border border-slate-200/70 hover:border-brand-blue/40 text-[11px] font-semibold text-[#475569] hover:text-brand-blue transition-all cursor-pointer shadow-2xs"
          >
            <Icon name="map-pin" className="w-3 h-3 text-brand-blue flex-shrink-0" />
            <span>{c.name}</span>
          </button>
        ))}
      </div>

      {/* Main Map + Project Details Showcase Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Map Container (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-3xl overflow-hidden border border-slate-100 p-2 shadow-[0_20px_50px_-12px_rgba(11,30,51,0.08)] relative min-h-[460px] lg:min-h-[540px] flex flex-col">
          {/* Map Surface */}
          <div ref={mapContainerRef} className="w-full h-full min-h-[440px] lg:min-h-[520px] rounded-2xl overflow-hidden" />
        </div>

        {/* Selected Project Inspector Card (4 cols) */}
        <div className="lg:col-span-4 flex flex-col">
          {selectedProject ? (
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-100 flex flex-col justify-between h-full space-y-6 shadow-[0_20px_50px_-12px_rgba(11,30,51,0.08)]">
              <div>
                {/* Project Image */}
                <div className="relative h-48 sm:h-52 w-full rounded-2xl overflow-hidden mb-4 border border-slate-100 group">
                  <Image
                    src={selectedProject.image}
                    alt={selectedProject.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  
                  {/* Category Pill on Image */}
                  <span
                    className={cn(
                      'absolute top-3 left-3 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border border-white/20 backdrop-blur-md shadow',
                      CATEGORY_COLORS[selectedProject.category].bg,
                      'text-white'
                    )}
                  >
                    {selectedProject.category}
                  </span>

                  <span className="absolute bottom-3 left-3 flex items-center gap-1 text-xs font-bold text-white drop-shadow-md">
                    <Icon name="map-pin" className="w-3.5 h-3.5 text-brand-blue" />
                    <span>{selectedProject.neighborhood}, {selectedProject.city}</span>
                  </span>
                </div>

                {/* Title & Scope */}
                <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2 leading-snug">
                  {selectedProject.title}
                </h3>
                <p className="text-xs sm:text-[13px] text-[var(--text-secondary)] leading-relaxed mb-4">
                  {selectedProject.scope}
                </p>

                {/* Specs Box */}
                <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/60 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--text-muted)] font-medium">Primary Materials:</span>
                    <span className="font-bold text-[var(--text-primary)] text-right">{selectedProject.materials}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-2.5 border-t border-slate-200/60">
                    <span className="text-[var(--text-muted)] font-medium">Warranty Issued:</span>
                    <span className="font-bold text-emerald-700">Owens Corning 50-Year</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5 pt-2">
                <Link
                  href="/projects"
                  className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-brand-blue hover:bg-[#1C88DD] text-white text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-brand-blue/20"
                >
                  <span>Explore Full Portfolio</span>
                  <Icon name="arrow-right" className="w-3.5 h-3.5" />
                </Link>

                <a
                  href={PHONE_HREF}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-[var(--text-primary)] text-xs font-bold border border-slate-200/80 hover:border-brand-blue/30 transition-all"
                >
                  <Icon name="phone" className="w-3.5 h-3.5 text-brand-blue" />
                  <span>Call About Similar Project</span>
                </a>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-6 border border-slate-100 flex items-center justify-center h-full text-center text-[var(--text-muted)] text-sm shadow-[0_20px_50px_-12px_rgba(11,30,51,0.08)]">
              Click any pin on the map to inspect project specifications.
            </div>
          )}
        </div>
      </div>
    </Section>
  );
}
