import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles } from 'lucide-react';
import { ProfileAvatarSection } from './ProfileAvatarSection';
import { ProfileAppearanceSection } from './ProfileAppearanceSection';
import { ProfileContactForm } from './ProfileContactForm';
import { ProfileSecurityForm } from './ProfileSecurityForm';

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileSettingsModal({ isOpen, onClose }: ProfileSettingsModalProps) {
  const [, setGlobalMessage] = useState<string | null>(null);

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

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 bg-slate-950/65 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
    >
      {/* Modal Card */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl bg-white/95 dark:bg-[#0B1320]/95 backdrop-blur-2xl rounded-3xl border border-white/90 dark:border-white/12 shadow-[0_25px_80px_rgba(15,23,42,0.35)] dark:shadow-[0_25px_80px_rgba(0,0,0,0.85)] overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200 text-slate-800 dark:text-slate-100 my-auto flex flex-col max-h-[90vh]"
      >
        {/* Coastal Gradient Header Banner */}
        <div className="shrink-0 relative bg-gradient-to-r from-[#0B192C] via-[#1878B8] to-[#55C4F5] p-6 text-white overflow-hidden">
          <div
            className="absolute inset-0 opacity-15 [background-image:radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]"
            aria-hidden="true"
          />
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white/15 border border-white/30 backdrop-blur-md flex items-center justify-center shadow-md">
                <Sparkles size={20} className="text-amber-300" />
              </div>
              <div>
                <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                  <span>Profile & Security Studio</span>
                  <span className="px-2 py-0.5 rounded-full bg-white/20 border border-white/30 text-[10px] font-bold tracking-wider uppercase">
                    Live
                  </span>
                </h2>
                <p className="text-xs text-sky-100 font-medium mt-0.5">
                  Manage your personal identity, contact information, appearance, and security.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/25 border border-white/20 flex items-center justify-center text-white transition-all cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto no-scrollbar">
          <ProfileAvatarSection onSuccess={setGlobalMessage} />
          <ProfileAppearanceSection />
          <ProfileContactForm onSuccess={setGlobalMessage} />
          <ProfileSecurityForm />
        </div>

        {/* Modal Footer */}
        <div className="shrink-0 p-4 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200/70 dark:border-white/10 flex items-center justify-between text-xs">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Rise Up CRM v3.1.1</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold transition-all cursor-pointer shadow-2xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
