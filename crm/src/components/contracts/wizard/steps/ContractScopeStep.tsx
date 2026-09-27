import React from 'react';
import { ContractStudioData, ContractScopeSection } from '@/types/contractStudioTypes';
import { Plus, Trash2, FileText } from 'lucide-react';

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
    <div className="space-y-8">
      {/* Scope Title */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
          <FileText size={14} /> Project Scope Title
        </label>
        <input
          type="text"
          value={data.scopeTitle}
          onChange={(e) => onDataChange({ scopeTitle: e.target.value })}
          placeholder="Complete 31-Square Concrete Tile Roof Installation"
          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:border-[#1a5ba5] transition-colors"
        />
      </div>

      {/* Scope Intro */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
          Scope Opening Statement
        </label>
        <textarea
          rows={2}
          value={data.scopeIntro}
          onChange={(e) => onDataChange({ scopeIntro: e.target.value })}
          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-[#1a5ba5] transition-colors resize-none"
        />
      </div>

      {/* Scope Specifications List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h3 className="text-sm font-bold text-slate-800">
            Work Specifications ({data.scopeSections?.length || 0})
          </h3>
          <span className="text-xs text-slate-400">Printed directly in Agreement Section B</span>
        </div>

        <div className="space-y-3">
          {(data.scopeSections || []).map((sec, idx) => (
            <div
              key={sec.id || idx}
              className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5 group relative"
            >
              <div className="flex items-center justify-between gap-3">
                <input
                  type="text"
                  value={sec.heading}
                  onChange={(e) => handleUpdateSection(idx, 'heading', e.target.value)}
                  placeholder="Section Heading"
                  className="font-bold text-sm text-[#10263b] bg-transparent border-b border-transparent hover:border-slate-300 focus:border-[#1a5ba5] focus:outline-none w-full"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveSection(idx)}
                  className="text-slate-400 hover:text-red-500 p-1 transition-colors"
                  title="Delete Section"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <textarea
                rows={2}
                value={sec.text}
                onChange={(e) => handleUpdateSection(idx, 'text', e.target.value)}
                placeholder="Description of significant materials and work..."
                className="w-full text-xs font-normal p-2.5 bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-[#1a5ba5] resize-none leading-relaxed"
              />
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={handleAddSection}
          className="w-full py-3 border-2 border-dashed border-slate-300 hover:border-[#1a5ba5] hover:bg-slate-50 rounded-xl text-sm font-bold text-[#1a5ba5] flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <Plus size={16} />
          <span>Add Scope Item</span>
        </button>
      </div>
    </div>
  );
}

export default ContractScopeStep;
