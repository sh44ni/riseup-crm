import React, { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Send,
  ShieldAlert,
  ArrowRight,
  FileText,
  User,
  Phone,
  Mail,
  MapPin,
  Clock,
  Sparkles,
  Layers,
} from 'lucide-react';

export interface GatedLeadCard {
  id: string | number;
  name: string;
  location?: string;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  service?: string;
  serviceColor?: string;
  currentStageName?: string;
  value?: number;
}

interface EstimateSentGatedModalProps {
  deal: GatedLeadCard | null;
  isOpen: boolean;
  onClose: () => void;
}

export function EstimateSentGatedModal({
  deal,
  isOpen,
  onClose,
}: EstimateSentGatedModalProps) {
  const navigate = useNavigate();

  const handleGoToEstimates = useCallback(() => {
    if (!deal) return;
    onClose();

    // Prepare search params to prefill Estimates Proposal Studio
    const params = new URLSearchParams();
    if (deal.name) params.set('clientName', deal.name);
    if (deal.phone) params.set('phone', deal.phone);
    if (deal.email) params.set('email', deal.email);
    if (deal.address) {
      params.set('address', deal.address);
    } else if (deal.location) {
      params.set('address', deal.location);
    }
    if (deal.city) params.set('city', deal.city);
    if (deal.id) params.set('leadId', String(deal.id));

    navigate(`/estimates?${params.toString()}`);
  }, [deal, navigate, onClose]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleGoToEstimates();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handleGoToEstimates]);

  if (!isOpen || !deal) return null;

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white/95 dark:bg-slate-900/95 border border-amber-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150 text-slate-800 dark:text-slate-100"
      >
        {/* Top Header Badge & Close Button */}
        <div className="relative px-6 pt-6 pb-4 border-b border-slate-200/80 dark:border-slate-800 flex items-start justify-between bg-amber-50/40 dark:bg-transparent">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-500 dark:text-amber-400 flex items-center justify-center shadow-xs shrink-0">
              <ShieldAlert size={22} className="text-amber-500 dark:text-amber-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40">
                  Automated Stage
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Stage 6 • 48h SLA</span>
              </div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white mt-0.5 tracking-tight">
                Estimate Sent is Gated
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-transparent dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {/* Explanation Alert */}
          <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-slate-800/80 border border-amber-200/80 dark:border-slate-700/80 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300">
              <Sparkles size={14} />
              <span>Manual Dragging is Restricted for Estimate Sent</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
              You cannot manually drop a lead into <strong className="text-slate-900 dark:text-white">Estimate Sent</strong>. 
              Leads automatically transition to this stage when an official proposal is built and delivered to the client via the <strong className="text-amber-700 dark:text-amber-300">Estimates</strong> page.
            </p>
          </div>

          {/* Target Lead Summary Card */}
          <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[10px] font-extrabold uppercase text-slate-500 dark:text-slate-400">Selected Lead</div>
                <div className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5 mt-0.5">
                  <User size={14} className="text-[#0284c7] dark:text-sky-400" />
                  <span>{deal.name}</span>
                </div>
              </div>
              {deal.service && (
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-sky-100 dark:bg-sky-500/15 text-[#0284c7] dark:text-sky-300 border border-sky-200 dark:border-sky-500/30">
                  {deal.service}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300 pt-2 border-t border-slate-200/80 dark:border-slate-800/80">
              {deal.phone && (
                <div className="flex items-center gap-2">
                  <Phone size={12} className="text-slate-400 dark:text-slate-500 shrink-0" />
                  <span className="truncate">{deal.phone}</span>
                </div>
              )}
              {deal.email && (
                <div className="flex items-center gap-2">
                  <Mail size={12} className="text-slate-400 dark:text-slate-500 shrink-0" />
                  <span className="truncate">{deal.email}</span>
                </div>
              )}
              {(deal.address || deal.location) && (
                <div className="flex items-center gap-2 sm:col-span-2">
                  <MapPin size={12} className="text-slate-400 dark:text-slate-500 shrink-0" />
                  <span className="truncate">{deal.address || deal.location}</span>
                </div>
              )}
            </div>
          </div>

          {/* Workflow Note */}
          <div className="flex items-center gap-2 text-[11.5px] text-slate-500 dark:text-slate-400 px-1">
            <Clock size={13} className="text-[#0284c7] dark:text-sky-400 shrink-0" />
            <span>
              Once sent, a 48-hour client review timer starts automatically before advancing to Follow-Up.
            </span>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 bg-slate-50/80 dark:bg-slate-950/80 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-all cursor-pointer"
          >
            Cancel / Stay
          </button>

          <button
            type="button"
            onClick={handleGoToEstimates}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.02] cursor-pointer"
          >
            <Send size={13} />
            <span>Open in Estimates Builder</span>
            <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
