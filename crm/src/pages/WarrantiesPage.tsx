import React, { useState } from 'react';
import {
  ShieldCheck,
  FileCheck,
  Download,
  Search,
  ExternalLink,
  Award,
  CheckCircle2,
  Calendar,
  Home,
  User,
} from 'lucide-react';
import { DevelopmentInProgressBanner } from '@/components/common/DevelopmentInProgressBanner';
import { CrmPageHero } from '@/components/common/CrmPageHero';
import { useCompany } from '@/context/CompanyContext';
import { useToast } from '@/context/ToastContext';

export function WarrantiesPage() {
  const { toast } = useToast();
  const { dba, licenseNumber } = useCompany();
  const companyName = dba || 'Rise Up';
  const licenseBadgeText = licenseNumber || 'CSLB #1115874';
  const [search, setSearch] = useState('');

  const WARRANTIES = [
    {
      id: 'WAR-9201',
      client: 'Marcus & Elena Bradley',
      address: '1420 Highland Dr, Carlsbad, CA',
      system: 'Owens Corning TruDefinition Duration (Onyx Black)',
      warrantyType: 'Platinum Protection 50-Year Non-Prorated',
      workmanship: `10-Year ${companyName} Certified Workmanship`,
      issuedDate: 'Sep 02, 2026',
      status: 'Registered & Active',
      cslbBadge: `${licenseBadgeText}`,
    },
    {
      id: 'WAR-9198',
      client: 'Jonathan Sterling',
      address: '882 Vista Way, Oceanside, CA',
      system: 'GAF Timberline HDZ (Pewter Gray)',
      warrantyType: 'GAF Golden Pledge 50-Year Warranty',
      workmanship: `10-Year ${companyName} Certified Workmanship`,
      issuedDate: 'Aug 28, 2026',
      status: 'Registered & Active',
      cslbBadge: `${licenseBadgeText}`,
    },
    {
      id: 'WAR-9185',
      client: 'Carlos & Sofia Morales',
      address: '3104 Ocean Crest Dr, Encinitas, CA',
      system: 'Eagle Concrete Spanish S-Tile (Terracotta)',
      warrantyType: 'Eagle Roofing Products Lifetime Limited',
      workmanship: `10-Year ${companyName} Certified Workmanship`,
      issuedDate: 'Aug 14, 2026',
      status: 'Registered & Active',
      cslbBadge: `${licenseBadgeText}`,
    },
    {
      id: 'WAR-9172',
      client: 'David Henderson',
      address: '2214 Sunset Blvd, Oceanside, CA',
      system: 'Carlisle Sure-Weld 60-mil White TPO Flat Roof',
      warrantyType: 'Carlisle 20-Year Total System Warranty',
      workmanship: `10-Year ${companyName} Certified Workmanship`,
      issuedDate: 'Jul 30, 2026',
      status: 'Registered & Active',
      cslbBadge: `${licenseBadgeText}`,
    },
  ];

  const filtered = WARRANTIES.filter(
    (w) =>
      w.client.toLowerCase().includes(search.toLowerCase()) ||
      w.address.toLowerCase().includes(search.toLowerCase()) ||
      w.system.toLowerCase().includes(search.toLowerCase()) ||
      w.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 w-full select-none pb-24">
      <CrmPageHero
        pageId="warranties"
        defaultEyebrow="Guarantees & Compliance"
        defaultTitle="Roofing Warranties & Protection"
        defaultSubtitle="50-year non-prorated manufacturer warranties and Rise Up 10-year workmanship certificates"
        searchValue={search}
        onSearchChange={setSearch}
        onSearchClear={() => setSearch('')}
        searchPlaceholder="Search certificates, clients, addresses..."
        bottomRightBadges={
          <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-700">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sky-50 text-sky-800 border border-sky-200 shadow-2xs">
              <ShieldCheck size={11} className="text-sky-600" />
              <span>Class C-39 Certified</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>4 Active Guarantees</span>
            </span>
          </div>
        }
      />

      <DevelopmentInProgressBanner
        moduleName="Roofing Warranties & Manufacturer Guarantees"
        expectedVersion="v3.2 Warranty Sprint"
        description="This warranty management module is currently undergoing active engineering. Automated GAF Golden Pledge and Owens Corning API registration feeds will be live in the upcoming release."
      />

      {/* Warranties Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filtered.map((w) => (
          <div
            key={w.id}
            className="light-glass-card rounded-3xl p-6 border border-slate-200/80 bg-white/70 backdrop-blur-md shadow-xs hover:shadow-md transition-all space-y-4"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200">
                  {w.id}
                </span>
                <h3 className="font-bold text-sm text-slate-900 mt-1.5 flex items-center gap-2">
                  <span>{w.client}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                    {w.cslbBadge}
                  </span>
                </h3>
                <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                  <Home size={12} className="text-[#1878B8]" />
                  <span>{w.address}</span>
                </div>
              </div>

              <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center gap-1">
                <CheckCircle2 size={11} />
                <span>{w.status}</span>
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2 text-xs">
              <div className="font-bold text-slate-800">{w.system}</div>
              <div className="pt-1 flex items-center justify-between text-[11px] text-slate-600">
                <span className="text-slate-400">Manufacturer Coverage:</span>
                <span className="font-semibold text-slate-900">{w.warrantyType}</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-600">
                <span className="text-slate-400">Workmanship:</span>
                <span className="font-semibold text-[#1878B8]">{w.workmanship}</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-600">
                <span className="text-slate-400">Issued On:</span>
                <span className="font-medium text-slate-700">{w.issuedDate}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => toast.success(`Downloading official warranty certificate for ${w.client}...`)}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
              >
                <Download size={13} />
                <span>Download Certificate (PDF)</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default WarrantiesPage;
