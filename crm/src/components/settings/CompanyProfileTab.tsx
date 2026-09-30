import React from 'react';
import {
  Building2,
  ShieldCheck,
  FileBadge,
  MapPin,
  Phone,
  Mail,
  Globe,
  Percent,
  Palette,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';
import { CompanyProfile } from '@/types/settingsTypes';
import { BrandLogo } from '@/components/common/BrandLogo';

interface CompanyProfileTabProps {
  company: CompanyProfile;
  onChange: (updated: CompanyProfile) => void;
}

export function CompanyProfileTab({ company, onChange }: CompanyProfileTabProps) {
  const handleChange = (field: keyof CompanyProfile, value: any) => {
    onChange({
      ...company,
      [field]: value,
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* ================================================================
          SECTION 1: CSLB STATE CONTRACTOR LICENSING & SURETY BOND
          ================================================================ */}
      <div className="light-glass-card rounded-3xl p-6 border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/15 to-orange-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center border border-amber-300/40 dark:border-amber-500/30">
              <FileBadge size={20} />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>California State License Board (CSLB) Credentials</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-black uppercase tracking-wider border border-emerald-300 dark:border-emerald-700/50">
                  Verified Active
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Official licensing and mandatory state compliance filings for North County roofing operations.
              </p>
            </div>
          </div>
          <a
            href="https://www.cslb.ca.gov"
            target="_blank"
            rel="noreferrer"
            className="text-xs font-bold text-[#1878B8] dark:text-sky-400 hover:underline flex items-center gap-1 shrink-0"
          >
            <span>Verify on CSLB.ca.gov</span>
            <ExternalLink size={12} />
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 text-xs">
          {/* License Number */}
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">
              CSLB License Number
            </label>
            <input
              type="text"
              value={company.licenseNumber}
              onChange={(e) => handleChange('licenseNumber', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 focus:border-[#1878B8] focus:ring-2 focus:ring-[#1878B8]/20 font-mono font-bold text-slate-900 dark:text-white outline-none shadow-2xs"
            />
            <p className="text-[10px] text-slate-400 dark:text-slate-500">Class C-39 Roofing Contractor</p>
          </div>

          {/* Expiration Date */}
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">
              License Expiration Date
            </label>
            <input
              type="text"
              value={company.licenseExpiration}
              onChange={(e) => handleChange('licenseExpiration', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 focus:border-[#1878B8] focus:ring-2 focus:ring-[#1878B8]/20 font-bold text-slate-900 dark:text-white outline-none shadow-2xs"
            />
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 size={11} />
              Current & in Good Standing
            </p>
          </div>

          {/* Contractor Surety Bond */}
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">
              Surety Bond Policy
            </label>
            <input
              type="text"
              value={company.bondNumber}
              onChange={(e) => handleChange('bondNumber', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 focus:border-[#1878B8] focus:ring-2 focus:ring-[#1878B8]/20 font-mono text-slate-900 dark:text-white outline-none shadow-2xs"
            />
            <p className="text-[10px] text-slate-400 dark:text-slate-500">$25,000 State Bond Filed</p>
          </div>

          {/* Workers Comp Status */}
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">
              Workers' Compensation Policy
            </label>
            <input
              type="text"
              value={company.workersCompPolicy}
              onChange={(e) => handleChange('workersCompPolicy', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 focus:border-[#1878B8] focus:ring-2 focus:ring-[#1878B8]/20 font-mono text-slate-900 dark:text-white outline-none shadow-2xs"
            />
            <p className="text-[10px] text-slate-400 dark:text-slate-500">California State Compensation Insurance Fund</p>
          </div>

          {/* EPA Lead Certification */}
          <div className="space-y-1.5 md:col-span-2">
            <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">
              EPA Lead-Safe Certified Firm #
            </label>
            <input
              type="text"
              value={company.epaLeadCert}
              onChange={(e) => handleChange('epaLeadCert', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 focus:border-[#1878B8] focus:ring-2 focus:ring-[#1878B8]/20 font-semibold text-slate-900 dark:text-white outline-none shadow-2xs"
            />
            <p className="text-[10px] text-slate-400 dark:text-slate-500">Required for pre-1978 residential roof tear-offs</p>
          </div>
        </div>
      </div>

      {/* ================================================================
          SECTION 2: LEGAL ENTITY & HEADQUARTERS
          ================================================================ */}
      <div className="light-glass-card rounded-3xl p-6 border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md shadow-xs space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-white/5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/15 to-indigo-500/20 text-[#1878B8] dark:text-sky-400 flex items-center justify-center border border-blue-300/40 dark:border-sky-500/30">
            <Building2 size={20} />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
              Legal Entity & Headquarters Locations
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Corporate entity details, client contract heading, and material staging yards.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
          {/* Legal Entity Name */}
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">
              Registered Legal Entity Name
            </label>
            <input
              type="text"
              value={company.legalName}
              onChange={(e) => handleChange('legalName', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 focus:border-[#1878B8] focus:ring-2 focus:ring-[#1878B8]/20 font-bold text-slate-900 dark:text-white outline-none shadow-2xs"
            />
          </div>

          {/* DBA */}
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">
              Doing Business As (DBA)
            </label>
            <input
              type="text"
              value={company.dba}
              onChange={(e) => handleChange('dba', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 focus:border-[#1878B8] focus:ring-2 focus:ring-[#1878B8]/20 font-bold text-slate-900 dark:text-white outline-none shadow-2xs"
            />
          </div>

          {/* Oceanside HQ Address */}
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <MapPin size={12} className="text-[#1878B8] dark:text-sky-400" />
              <span>Oceanside Executive HQ Address</span>
            </label>
            <input
              type="text"
              value={company.hqAddress}
              onChange={(e) => handleChange('hqAddress', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 focus:border-[#1878B8] focus:ring-2 focus:ring-[#1878B8]/20 text-slate-900 dark:text-white outline-none shadow-2xs"
            />
          </div>

          {/* Carlsbad Yard Address */}
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <MapPin size={12} className="text-amber-600 dark:text-amber-400" />
              <span>Carlsbad Equipment & Material Yard</span>
            </label>
            <input
              type="text"
              value={company.yardAddress}
              onChange={(e) => handleChange('yardAddress', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 focus:border-[#1878B8] focus:ring-2 focus:ring-[#1878B8]/20 text-slate-900 dark:text-white outline-none shadow-2xs"
            />
          </div>

          {/* Contact Numbers */}
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Phone size={12} className="text-[#1878B8] dark:text-sky-400" />
              <span>Public Sales & Client Line</span>
            </label>
            <input
              type="tel"
              value={company.publicPhone}
              onChange={(e) => handleChange('publicPhone', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 focus:border-[#1878B8] focus:ring-2 focus:ring-[#1878B8]/20 text-slate-900 dark:text-white outline-none shadow-2xs"
            />
          </div>

          {/* Dispatch Hotline */}
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Phone size={12} className="text-rose-600 dark:text-rose-400" />
              <span>Crew Dispatch & Emergency Tarp Hotline</span>
            </label>
            <input
              type="tel"
              value={company.dispatchHotline}
              onChange={(e) => handleChange('dispatchHotline', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 focus:border-[#1878B8] focus:ring-2 focus:ring-[#1878B8]/20 text-slate-900 dark:text-white outline-none shadow-2xs"
            />
          </div>

          {/* Primary Inbound Email */}
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Mail size={12} className="text-[#1878B8] dark:text-sky-400" />
              <span>Primary Business Email</span>
            </label>
            <input
              type="email"
              value={company.primaryEmail}
              onChange={(e) => handleChange('primaryEmail', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 focus:border-[#1878B8] focus:ring-2 focus:ring-[#1878B8]/20 text-slate-900 dark:text-white outline-none shadow-2xs"
            />
          </div>

          {/* Official Website */}
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Globe size={12} className="text-emerald-600 dark:text-emerald-400" />
              <span>Company Website URL</span>
            </label>
            <input
              type="url"
              value={company.websiteUrl}
              onChange={(e) => handleChange('websiteUrl', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 focus:border-[#1878B8] focus:ring-2 focus:ring-[#1878B8]/20 text-slate-900 dark:text-white outline-none shadow-2xs"
            />
          </div>
        </div>
      </div>

      {/* ================================================================
          SECTION 3: CALIFORNIA SALES TAX & BRAND IDENTITY
          ================================================================ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Sales Tax Card */}
        <div className="light-glass-card rounded-3xl p-6 border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md shadow-xs space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-white/5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 flex items-center justify-center border border-emerald-300/40 dark:border-emerald-500/30">
              <Percent size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                California Regional Sales Tax Rates
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Applied automatically to material line items on client estimates.
              </p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-white/10">
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200">San Diego County Standard</span>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">Carlsbad, Encinitas, Vista, San Marcos</p>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  step="0.01"
                  value={company.taxRateDefault}
                  onChange={(e) =>
                    handleChange('taxRateDefault', parseFloat(e.target.value) || 0)
                  }
                  className="w-20 px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 font-bold text-right text-slate-900 dark:text-white outline-none"
                />
                <span className="font-bold text-slate-500 dark:text-slate-400">%</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-white/10">
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200">City of Oceanside (Municipal)</span>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">Measure X local district rate</p>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  step="0.01"
                  value={company.taxRateOceanside}
                  onChange={(e) =>
                    handleChange('taxRateOceanside', parseFloat(e.target.value) || 0)
                  }
                  className="w-20 px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 font-bold text-right text-slate-900 dark:text-white outline-none"
                />
                <span className="font-bold text-slate-500 dark:text-slate-400">%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Brand Assets Card */}
        <div className="light-glass-card rounded-3xl p-6 border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md shadow-xs space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-white/5">
            <div className="w-9 h-9 rounded-xl bg-sky-500/15 text-[#1878B8] dark:text-sky-400 flex items-center justify-center border border-sky-300/40 dark:border-sky-500/30">
              <Palette size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Official Brand Identity
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Vector logos and color tokens applied to proposals and portal.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {/* Logo Preview in Dark and Light Containers */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-[#090E17] border border-white/10 flex flex-col items-center justify-center gap-2">
                <BrandLogo size="sm" showTagline={true} themeMode="dark" />
                <span className="text-[10px] text-slate-400 font-semibold">
                  Charcoal Sidebar
                </span>
              </div>
              <div className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 flex flex-col items-center justify-center gap-2">
                <BrandLogo size="sm" showTagline={true} themeMode="light" />
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                  Pearl Glass Canvas
                </span>
              </div>
            </div>

            {/* Brand Colors */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-[#00B0ED] shadow-xs border border-white dark:border-white/20" />
                <div>
                  <div className="font-bold text-slate-800 dark:text-slate-200 text-[11px]">Rise Up Cyan</div>
                  <div className="font-mono text-[9px] text-slate-400 dark:text-slate-500">#00B0ED</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-[#F1B91B] shadow-xs border border-white dark:border-white/20" />
                <div>
                  <div className="font-bold text-slate-800 dark:text-slate-200 text-[11px]">Solar Gold</div>
                  <div className="font-mono text-[9px] text-slate-400 dark:text-slate-500">#F1B91B</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-[#1F3C47] shadow-xs border border-white dark:border-white/20" />
                <div>
                  <div className="font-bold text-slate-800 dark:text-slate-200 text-[11px]">Coastal Slate</div>
                  <div className="font-mono text-[9px] text-slate-400 dark:text-slate-500">#1F3C47</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-[#ED1C24] shadow-xs border border-white dark:border-white/20" />
                <div>
                  <div className="font-bold text-slate-800 dark:text-slate-200 text-[11px]">Apex Red</div>
                  <div className="font-mono text-[9px] text-slate-400 dark:text-slate-500">#ED1C24</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
