import React, { useState } from 'react';
import {
  MessageSquare,
  FileText,
  Copy,
  Check,
  Search,
  Send,
  Plus,
  Sparkles,
} from 'lucide-react';
import { DevelopmentInProgressBanner } from '@/components/common/DevelopmentInProgressBanner';
import { CrmPageHero } from '@/components/common/CrmPageHero';
import { useCompany } from '@/context/CompanyContext';
import { useToast } from '@/context/ToastContext';

export function TemplatesPage() {
  const { toast } = useToast();
  const { dba, legalName } = useCompany();
  const companyDba = dba || 'Rise Up Roofing';
  const companyLegal = legalName || 'Rise Up Roofing & Solar LLC';
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const TEMPLATES = [
    {
      id: 'tpl-1',
      title: 'Speed-to-Lead Instant SMS',
      category: 'SMS Automation',
      description: 'Triggered within 5 minutes of online form submission or Google LSA lead.',
      content:
        `Hi {{first_name}}! This is {{estimator_name}} with ${companyDba}. We received your roof replacement request in {{city}} and would love to schedule your complimentary 21-point roof health inspection. Are you free for a 15-min visit tomorrow?`,
    },
    {
      id: 'tpl-2',
      title: 'Official Roof Estimate Cover Email',
      category: 'Email Template',
      description: 'Accompanies the interactive proposal link with 3 roofing system options.',
      content:
        `Dear {{first_name}},\n\nThank you for inviting ${companyDba} to inspect your home at {{address}}. Attached is your complete 3D aerial estimate with Good/Better/Best shingle and tile options, 50-year warranty options, and zero-down financing rates starting at $164/mo.\n\nYou can review, customize options, and digitally sign directly online.\n\nWarm regards,\n{{estimator_name}} | ${companyLegal}`,
    },
    {
      id: 'tpl-3',
      title: 'Pre-Construction Prep Checklist',
      category: 'Customer Notice',
      description: 'Sent 48 hours prior to crew arriving on site for tear-off.',
      content:
        'Hello {{first_name}}! Team Alpha is scheduled to begin tear-off at {{address}} on {{start_date}}. Please ensure: (1) Driveway is clear for dumpster delivery, (2) Pets are secured indoors, (3) Fragile wall hangings are secured. Call {{pm_phone}} with any questions.',
    },
    {
      id: 'tpl-4',
      title: 'Post-Job 5-Star Review Request',
      category: 'SMS Automation',
      description: 'Sent 24 hours after final walkthrough and drone inspection sign-off.',
      content:
        `Hi {{first_name}}, thank you for choosing ${companyDba}! Our team loved working on your new roof at {{address}}. If you had a 5-star experience, would you mind leaving us a quick Google review? It means the world to our local crew: {{review_link}}`,
    },
  ];

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredTemplates = TEMPLATES.filter(
    (t) =>
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase()) ||
      t.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto select-none pb-24">
      <CrmPageHero
        pageId="templates"
        defaultEyebrow="Speed-to-Lead Automation"
        defaultTitle="Communication & Templates"
        defaultSubtitle="Standardized speed-to-lead messaging, proposal cover emails, and homeowner notices"
        searchValue={search}
        onSearchChange={setSearch}
        onSearchClear={() => setSearch('')}
        searchPlaceholder="Search message templates, email copy..."
        topRightActions={
          <button
            type="button"
            onClick={() => toast.info('Template creation wizard will be available in the upcoming templates sprint.')}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
          >
            <Plus size={13} />
            <span>New Template</span>
          </button>
        }
        bottomRightBadges={
          <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-700">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-50 text-purple-800 border border-purple-200 shadow-2xs">
              <Sparkles size={11} className="text-purple-600" />
              <span>SMS & Email Suite</span>
            </span>
          </div>
        }
      />

      <DevelopmentInProgressBanner
        moduleName="Communication & Document Templates"
        expectedVersion="v3.2 Templates Sprint"
        description="This messaging template module is currently undergoing active engineering. Dynamic variable injection, California contract compliance forms, and template editors will be available shortly."
      />

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredTemplates.map((t) => (
          <div
            key={t.id}
            className="light-glass-card rounded-3xl p-6 border border-slate-200/80 bg-white/70 backdrop-blur-md shadow-xs hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    {t.category}
                  </span>
                  <h3 className="font-bold text-sm text-slate-900 mt-1">
                    {t.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {t.description}
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white border border-slate-200 text-xs font-medium text-slate-700 whitespace-pre-line leading-relaxed font-sans shadow-2xs">
                {t.content}
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end">
              <button
                onClick={() => handleCopy(t.id, t.content)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-colors"
              >
                {copiedId === t.id ? (
                  <Check size={13} className="text-emerald-600" />
                ) : (
                  <Copy size={13} />
                )}
                <span>{copiedId === t.id ? 'Copied to Clipboard' : 'Copy Template'}</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TemplatesPage;
