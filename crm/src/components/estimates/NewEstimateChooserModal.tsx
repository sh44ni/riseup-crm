import React from 'react';
import { CrmModal } from '@/components/common/CrmModal';
import { FileText, Upload, ChevronRight, PenLine } from 'lucide-react';

interface NewEstimateChooserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBuildStudio: () => void;
  onUploadAndSend: () => void;
}

export function NewEstimateChooserModal({
  isOpen,
  onClose,
  onBuildStudio,
  onUploadAndSend,
}: NewEstimateChooserModalProps) {
  return (
    <CrmModal
      isOpen={isOpen}
      onClose={onClose}
      title="New Estimate"
      subtitle="How would you like to create this estimate?"
      icon={<FileText size={18} />}
      iconGradient="from-[#1878B8] to-[#55C4F5]"
      maxWidth="md"
    >
      <div className="space-y-3">
        {/* Option 1: Build in Studio */}
        <button
          type="button"
          onClick={() => { onClose(); onBuildStudio(); }}
          className="w-full group flex items-center gap-4 p-4 rounded-2xl border-2 border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 hover:border-[#1878B8] dark:hover:border-sky-500 hover:bg-sky-50/60 dark:hover:bg-sky-950/20 transition-all cursor-pointer text-left shadow-xs hover:shadow-md"
        >
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#1878B8] to-[#55C4F5] text-white flex items-center justify-center shadow-md shadow-sky-500/25 shrink-0">
            <PenLine size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-black text-slate-900 dark:text-white group-hover:text-[#1878B8] dark:group-hover:text-sky-400 transition-colors">
              Build in Estimate Studio
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
              Create a professional 2-page proposal with our guided wizard — pricing, scope, photos &amp; lock-in savings.
            </div>
          </div>
          <ChevronRight
            size={16}
            className="text-slate-300 dark:text-slate-600 group-hover:text-[#1878B8] dark:group-hover:text-sky-400 shrink-0 transition-colors"
          />
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 py-1">
          <div className="h-px flex-1 bg-slate-200/70 dark:bg-white/10" />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">or</span>
          <div className="h-px flex-1 bg-slate-200/70 dark:bg-white/10" />
        </div>

        {/* Option 2: Upload & Send */}
        <button
          type="button"
          onClick={() => { onClose(); onUploadAndSend(); }}
          className="w-full group flex items-center gap-4 p-4 rounded-2xl border-2 border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 hover:border-emerald-500 dark:hover:border-emerald-500 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/20 transition-all cursor-pointer text-left shadow-xs hover:shadow-md"
        >
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center shadow-md shadow-emerald-500/25 shrink-0">
            <Upload size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-black text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
              Upload &amp; Send Existing PDF
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
              Already have an estimate ready? Upload your PDF and send it directly to the client&apos;s email.
            </div>
          </div>
          <ChevronRight
            size={16}
            className="text-slate-300 dark:text-slate-600 group-hover:text-emerald-500 shrink-0 transition-colors"
          />
        </button>
      </div>
    </CrmModal>
  );
}
