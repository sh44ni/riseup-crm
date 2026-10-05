import React from 'react';
import { ContractStudioData, ContractScopeSection } from '@/types/contractStudioTypes';
import { Plus, Trash2, FileText, Shield, HardHat } from 'lucide-react';

interface StepProps {
  data: ContractStudioData;
  onDataChange: (updates: Partial<ContractStudioData>) => void;
}

export function ContractScopeStep({ data, onDataChange }: StepProps) {
  const handleAddSection = () => {
    const newSec: ContractScopeSection = {
      id: `sec-${Date.now()}`,
      heading: 'Additional Project Specification',
      text: 'Provide customized materials, specialized underlayment, or architectural flashing requirements here.',
    };
    onDataChange({ scopeSections: [...(data.scopeSections || []), newSec] });
  };

  const handleUpdateSection = (index: number, key: 'heading' | 'text', val: string) => {
    const copy = [...(data.scopeSections || [])];
    copy[index] = { ...copy[index], [key]: val };
    onDataChange({ scopeSections: copy });
  };

  const handleRemoveSection = (index: number) => {
    onDataChange({
      scopeSections: (data.scopeSections || []).filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-6">
      {/* 1. Agreement A. Licensing Warranty (Rule 11) */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
          <Shield size={14} className="text-[#1a5ba5]" /> Agreement Section A: Licensing Warranty
        </label>
        <textarea
          rows={2}
          value={data.licensingClause}
          onChange={(e) => onDataChange({ licensingClause: e.target.value })}
          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-[#1a5ba5] transition-colors leading-relaxed"
          placeholder="Contractor license warranty..."
        />
        <p className="text-[11px] text-slate-400">
          Pre-filled with California statutory licensing warranty. Fully editable.
        </p>
      </div>

      {/* 2. Agreement B. Project Scope Title & Opening Description */}
      <div className="space-y-4 border-t border-slate-100 pt-4">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
            <FileText size={14} className="text-[#1a5ba5]" /> Agreement Section B: Project Specifications Title
          </label>
          <input
            type="text"
            value={data.scopeTitle}
            onChange={(e) => onDataChange({ scopeTitle: e.target.value })}
            placeholder="TILE ROOF LIFT & RELAY"
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:border-[#1a5ba5] transition-colors"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
            Section B(a): General Project Description & Materials Intro
          </label>
          <textarea
            rows={2}
            value={data.scopeIntro}
            onChange={(e) => onDataChange({ scopeIntro: e.target.value })}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-[#1a5ba5] transition-colors resize-none leading-relaxed"
          />
        </div>
      </div>

      {/* 3. Scope Specifications List (Rule 11 Items) */}
      <div className="space-y-3 border-t border-slate-100 pt-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              Scope of Work Specifications ({data.scopeSections?.length || 0})
            </h3>
            <p className="text-[11px] text-slate-400">
              Renders in the two-column specifications grid on Page 2.
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddSection}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Plus size={13} /> Add Specification
          </button>
        </div>

        <div className="space-y-3">
          {(data.scopeSections || []).map((sec, idx) => (
            <div
              key={sec.id || idx}
              className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2 group relative"
            >
              <div className="flex items-center justify-between gap-3">
                <input
                  type="text"
                  value={sec.heading}
                  onChange={(e) => handleUpdateSection(idx, 'heading', e.target.value)}
                  placeholder="Section Heading"
                  className="font-bold text-xs text-[#0b1a33] bg-transparent border-b border-transparent hover:border-slate-300 focus:border-[#1a5ba5] focus:outline-none w-full"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveSection(idx)}
                  className="text-slate-400 hover:text-red-500 p-1 transition-colors cursor-pointer"
                  title="Delete Section"
                >
                  <Trash2 size={13} />
                </button>
              </div>

              <textarea
                rows={2}
                value={sec.text}
                onChange={(e) => handleUpdateSection(idx, 'text', e.target.value)}
                placeholder="Description of materials and work..."
                className="w-full text-xs font-normal p-2.5 bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-[#1a5ba5] resize-none leading-relaxed"
              />
            </div>
          ))}
        </div>
      </div>

      {/* 4. Jobsite Protection & Decking Allowance Notes */}
      <div className="space-y-3 border-t border-slate-100 pt-4">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
          <HardHat size={14} className="text-[#1a5ba5]" /> Page 2 Statutory Footnotes
        </h3>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
            Important Conditions &amp; Decking Allowance
          </label>
          <textarea
            rows={2}
            value={data.deckingAllowanceText}
            onChange={(e) => onDataChange({ deckingAllowanceText: e.target.value })}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-[#1a5ba5] transition-colors leading-relaxed"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
            Jobsite Protection &amp; Standards Note (Title 24)
          </label>
          <textarea
            rows={2}
            value={data.jobsiteStandardsText}
            onChange={(e) => onDataChange({ jobsiteStandardsText: e.target.value })}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-[#1a5ba5] transition-colors leading-relaxed"
          />
        </div>
      </div>
    </div>
  );
}

export default ContractScopeStep;
