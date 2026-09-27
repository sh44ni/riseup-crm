import React, { useState, useEffect } from 'react';
import {
  FileText,
  Sparkles,
  Layers,
  Wrench,
  Sun,
  Shield,
  Droplets,
  AlertTriangle,
  Building2,
  CheckCircle2,
  ChevronRight,
  Calculator,
} from 'lucide-react';
import { TemplateKey, EstimateTemplateMeta } from '@/types/estimateTypes';
import { api } from '@/lib/api';

interface EstimateTemplateSelectorProps {
  selectedTemplate: TemplateKey;
  onSelectTemplate: (key: TemplateKey) => void;
}

export function EstimateTemplateSelector({
  selectedTemplate,
  onSelectTemplate,
}: EstimateTemplateSelectorProps) {
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [templates, setTemplates] = useState<EstimateTemplateMeta[]>([]);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const res = await api.getEstimateTemplates();
        if (res?.templates) {
          setTemplates(res.templates);
        }
      } catch (err) {
        console.error('Failed to fetch estimate templates:', err);
      }
    };
    fetchTemplates();
  }, []);

  const categories = [
    { id: 'all', label: 'All Templates', count: templates.length },
    { id: 'Proposal', label: 'Proposals', count: templates.filter((t) => t.category === 'Proposal').length },
    { id: 'Estimate', label: 'Estimates', count: templates.filter((t) => t.category === 'Estimate').length },
    { id: 'Add-On', label: 'Add-Ons', count: templates.filter((t) => t.category === 'Add-On').length },
    { id: 'Report', label: 'Reports', count: templates.filter((t) => t.category === 'Report').length },
    { id: 'Commercial', label: 'Commercial', count: templates.filter((t) => t.category === 'Commercial').length },
  ];

  const filtered = templates.filter(
    (t) => filterCategory === 'all' || t.category === filterCategory
  );

  const getTemplateIcon = (key: TemplateKey) => {
    switch (key) {
      case 'multi_option_proposal':
        return <Sparkles size={16} className="text-amber-500" />;
      case 'standard_roofing_estimate':
        return <FileText size={16} className="text-sky-500" />;
      case 'premium_4page_proposal':
        return <Layers size={16} className="text-indigo-500" />;
      case 'skylight_estimate':
        return <Sun size={16} className="text-amber-400" />;
      case 'solar_rr_addon':
        return <Sun size={16} className="text-yellow-500" />;
      case 'fascia_wood_repair':
        return <Wrench size={16} className="text-orange-500" />;
      case 'rain_gutter_addon':
        return <Droplets size={16} className="text-teal-500" />;
      case 'pressure_washing_addon':
        return <Droplets size={16} className="text-blue-500" />;
      case 'emergency_leak_prep':
        return <AlertTriangle size={16} className="text-rose-500" />;
      case 'roof_inspection_report':
        return <Shield size={16} className="text-emerald-500" />;
      case 'hoa_property_program':
        return <Building2 size={16} className="text-purple-500" />;
      case 'commercial_roofing_proposal':
        return <Building2 size={16} className="text-slate-600" />;
      default:
        return <FileText size={16} className="text-slate-500" />;
    }
  };

  return (
    <div className="light-glass-panel rounded-2xl p-4 shadow-xs border border-white/85 dark:border-white/10 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-600">
            <Calculator size={15} />
          </div>
          <div>
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <span>Rise Up Estimate Template Library</span>
              <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black">
                12 Formats
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              Select proposal style &mdash; each connects to the unified pricing engine and generates high-res PDF.
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setFilterCategory(c.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                filterCategory === c.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white/80 hover:bg-white text-slate-600 border border-slate-200/70'
              }`}
            >
              {c.label} <span className="opacity-60 text-[10px]">({c.count})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Templates */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
        {filtered.map((tmpl) => {
          const isSelected = selectedTemplate === tmpl.key;
          return (
            <div
              key={tmpl.key}
              onClick={() => onSelectTemplate(tmpl.key)}
              className={`p-3 rounded-xl border transition-all cursor-pointer select-none relative flex flex-col justify-between group ${
                isSelected
                  ? 'bg-gradient-to-br from-white via-sky-50/50 to-amber-50/30 border-amber-500 shadow-md ring-2 ring-amber-500/20'
                  : 'bg-white/80 hover:bg-white border-slate-200/80 hover:border-slate-300 shadow-2xs hover:shadow-xs'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-1.5 mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center shrink-0">
                      {getTemplateIcon(tmpl.key)}
                    </div>
                    <span className="text-[10px] font-extrabold text-slate-400">
                      {tmpl.numberPrefix}
                    </span>
                  </div>

                  {tmpl.badge && (
                    <span
                      className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${
                        tmpl.badge === 'MOST POPULAR'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {tmpl.badge}
                    </span>
                  )}
                </div>

                <h4
                  className={`text-xs font-black leading-tight line-clamp-1 ${
                    isSelected ? 'text-amber-700' : 'text-slate-900 group-hover:text-amber-800'
                  }`}
                >
                  {tmpl.name}
                </h4>

                <p className="text-[11px] text-slate-500 font-medium line-clamp-2 mt-1 leading-snug">
                  {tmpl.description}
                </p>
              </div>

              <div className="mt-2.5 pt-2 border-t border-slate-100/90 flex items-center justify-between text-[10px]">
                <span className="text-slate-400 font-bold">{tmpl.pages}</span>
                <span
                  className={`font-black flex items-center gap-0.5 ${
                    isSelected ? 'text-amber-700' : 'text-sky-600 group-hover:text-amber-700'
                  }`}
                >
                  <span>{isSelected ? 'Active' : 'Select'}</span>
                  <ChevronRight size={11} />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
