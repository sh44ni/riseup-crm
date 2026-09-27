import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Image, Sparkles, Check } from 'lucide-react';

interface SidebarPhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPhoto: string;
  onSelectPhoto: (url: string) => void;
}

export const SIDEBAR_PHOTO_PRESETS = [
  {
    id: 'villa',
    name: 'Oceanside Villa & Rig',
    url: '/hero-bg.jpg',
    description: 'Modern luxury estate with palms & Rise Up truck',
  },
  {
    id: 'palms',
    name: 'California Coastal Palms',
    url: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?q=80&w=800&auto=format&fit=crop',
    description: 'Golden hour palm trees against vibrant blue sky',
  },
  {
    id: 'pacific',
    name: 'Pacific Ocean Beach',
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=800&auto=format&fit=crop',
    description: 'Turquoise ocean surf and sunlit coastal shores',
  },
  {
    id: 'minimal',
    name: 'Minimal Obsidian Glass',
    url: 'none',
    description: 'Deep frosted charcoal glass with ambient caustics',
  },
];

export function SidebarPhotoModal({
  isOpen,
  onClose,
  currentPhoto,
  onSelectPhoto,
}: SidebarPhotoModalProps) {
  const [customUrl, setCustomUrl] = useState('');

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

  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (customUrl.trim()) {
      onSelectPhoto(customUrl.trim());
      onClose();
    }
  };

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-5 bg-slate-950/65 backdrop-blur-md select-none overflow-y-auto animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white/95 dark:bg-[#0B1320]/95 border border-slate-200/80 dark:border-white/[0.12] rounded-3xl w-full max-w-md shadow-[0_25px_80px_rgba(15,23,42,0.35)] dark:shadow-[0_25px_80px_rgba(0,0,0,0.85)] overflow-hidden my-auto flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150 relative text-slate-800 dark:text-slate-200"
      >
        {/* Ambient Top Glow */}
        <div className="absolute -top-16 -left-10 w-44 h-44 bg-[#1878B8]/25 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/80 dark:border-white/[0.08] relative z-10 bg-slate-50/70 dark:bg-transparent">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#2F9FE3]/15 border border-[#2F9FE3]/30 flex items-center justify-center text-[#2F9FE3]">
              <Image size={15} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Customize Sidebar Photo</h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Update background photography in real time</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] dark:text-slate-400 dark:hover:text-white flex items-center justify-center border border-slate-200 dark:border-white/[0.06] transition-all cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        {/* Presets Grid */}
        <div className="p-6 space-y-4 relative z-10">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
              <Sparkles size={12} className="text-[#2F9FE3]" />
              <span>Curated Coastal Presets</span>
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {SIDEBAR_PHOTO_PRESETS.map((preset) => {
                const isSelected = currentPhoto === preset.url;
                return (
                  <button
                    key={preset.id}
                    onClick={() => {
                      onSelectPhoto(preset.url);
                      onClose();
                    }}
                    className={`relative rounded-xl overflow-hidden p-2.5 text-left border transition-all cursor-pointer group ${
                      isSelected
                        ? 'bg-[#1878B8]/20 border-[#2F9FE3] shadow-[0_0_12px_rgba(47,159,227,0.3)]'
                        : 'bg-slate-50 dark:bg-white/[0.03] border-slate-200/80 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/[0.2] hover:bg-slate-100 dark:hover:bg-white/[0.06]'
                    }`}
                  >
                    {/* Thumbnail Preview */}
                    <div className="h-16 w-full rounded-lg overflow-hidden bg-black/40 relative mb-2">
                      {preset.url !== 'none' ? (
                        <img
                          src={preset.url}
                          alt={preset.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs font-mono">
                          Obsidian
                        </div>
                      )}
                      {isSelected && (
                        <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-[#2F9FE3] text-white flex items-center justify-center shadow-md">
                          <Check size={11} className="stroke-[3]" />
                        </div>
                      )}
                    </div>

                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate leading-tight">
                      {preset.name}
                    </div>
                    <div className="text-[9px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {preset.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom URL Input */}
          <form onSubmit={handleApplyCustom} className="pt-2 border-t border-slate-200/80 dark:border-white/[0.06] space-y-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Or Use Custom Image URL
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="https://example.com/photo.jpg"
                className="flex-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.09] text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#2F9FE3]"
              />
              <button
                type="submit"
                disabled={!customUrl.trim()}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#1878B8] to-[#2F9FE3] text-white text-xs font-bold transition-all disabled:opacity-50 hover:brightness-110 cursor-pointer shrink-0"
              >
                Apply
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
}
