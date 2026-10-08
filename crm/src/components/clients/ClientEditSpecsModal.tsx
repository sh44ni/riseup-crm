import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Home, Check } from 'lucide-react';
import { RoofSpecs } from '@/types/client360Types';
import { CrmSelect } from '@/components/common/CrmSelect';

interface ClientEditSpecsModalProps {
  isOpen: boolean;
  onClose: () => void;
  specs: RoofSpecs;
  onSave: (updated: RoofSpecs) => void;
}

export function ClientEditSpecsModal({
  isOpen,
  onClose,
  specs,
  onSave,
}: ClientEditSpecsModalProps) {
  const [formData, setFormData] = useState<RoofSpecs>({ ...specs });

  // Update internal state when specs prop changes
  useEffect(() => {
    if (isOpen) {
      setFormData({ ...specs });
    }
  }, [isOpen, specs]);

  // Lock body scroll and listen for Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-5 bg-slate-950/65 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white/95 dark:bg-[#0B1320]/95 backdrop-blur-2xl rounded-3xl border border-white/60 dark:border-white/10 w-full max-w-lg shadow-[0_25px_80px_rgba(15,23,42,0.35)] dark:shadow-[0_25px_80px_rgba(0,0,0,0.85)] overflow-hidden my-auto flex flex-col max-h-[90vh]"
      >
        <div className="shrink-0 p-5 border-b border-slate-200/80 dark:border-white/10 bg-gradient-to-r from-sky-50/50 dark:from-sky-950/20 to-white dark:to-transparent flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-500/10 border border-sky-100 dark:border-sky-500/20 flex items-center justify-center text-[#2F9FE3]">
              <Home size={16} />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Edit Property & Roof Specs</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Update dimensions, material, and architectural parameters.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="p-5 space-y-4 flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Address</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:outline-none focus:border-[#0284C7] dark:focus:border-sky-500 focus:bg-white dark:focus:bg-slate-900 transition-all"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">City & ZIP</label>
              <input
                type="text"
                value={formData.cityZip}
                onChange={(e) => setFormData({ ...formData, cityZip: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:outline-none focus:border-[#0284C7] dark:focus:border-sky-500 focus:bg-white dark:focus:bg-slate-900 transition-all"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Roof Material</label>
              <CrmSelect
                value={formData.roofMaterial}
                onChange={(val) => setFormData({ ...formData, roofMaterial: val })}
                options={[
                  'Concrete Tile',
                  'Spanish Clay S-Tile',
                  'Architectural Shingle',
                  'Standing Seam Metal',
                  'Flat TPO Commercial',
                  'Tile Relay & Underlayment',
                ]}
                triggerClassName="py-2 text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Roof Area (sq ft)</label>
              <input
                type="number"
                value={formData.roofAreaSqFt}
                onChange={(e) => {
                  const val = Number(e.target.value) || 0;
                  setFormData({
                    ...formData,
                    roofAreaSqFt: val,
                    roofSquares: Math.round(val / 100),
                  });
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:outline-none focus:border-[#0284C7] dark:focus:border-sky-500 focus:bg-white dark:focus:bg-slate-900 transition-all"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Stories</label>
              <input
                type="text"
                value={formData.stories}
                onChange={(e) => setFormData({ ...formData, stories: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:outline-none focus:border-[#0284C7] dark:focus:border-sky-500 focus:bg-white dark:focus:bg-slate-900 transition-all"
                placeholder="e.g. 1 Story"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Roof Age (Years)</label>
              <input
                type="number"
                value={formData.roofAgeYears}
                onChange={(e) => setFormData({ ...formData, roofAgeYears: Number(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:outline-none focus:border-[#0284C7] dark:focus:border-sky-500 focus:bg-white dark:focus:bg-slate-900 transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">HOA Community</label>
              <input
                type="text"
                value={formData.hoaCommunity}
                onChange={(e) => setFormData({ ...formData, hoaCommunity: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:outline-none focus:border-[#0284C7] dark:focus:border-sky-500 focus:bg-white dark:focus:bg-slate-900 transition-all"
                placeholder="e.g. No, or Capistrano HOA"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Roof Pitch</label>
              <input
                type="text"
                value={formData.pitch || ''}
                onChange={(e) => setFormData({ ...formData, pitch: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:outline-none focus:border-[#0284C7] dark:focus:border-sky-500 focus:bg-white dark:focus:bg-slate-900 transition-all"
                placeholder="e.g. 4/12"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Decking Condition & Notes</label>
            <textarea
              rows={2}
              value={formData.deckingCondition || ''}
              onChange={(e) => setFormData({ ...formData, deckingCondition: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:outline-none focus:border-[#0284C7] dark:focus:border-sky-500 focus:bg-white dark:focus:bg-slate-900 transition-all"
              placeholder="e.g. Original 1/2 inch plywood, dry rot near chimney"
            />
          </div>
          </div>

          <div className="shrink-0 px-5 py-3.5 border-t border-slate-200/80 dark:border-white/10 bg-slate-50/60 dark:bg-slate-900/60 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-[#1878B8] to-[#55C4F5] text-white text-xs font-bold shadow-xs hover:shadow-md hover:scale-[1.02] transition-all cursor-pointer"
            >
              <Check size={14} />
              <span>Update Specs</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
