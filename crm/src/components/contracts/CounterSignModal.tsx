import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  AlertCircle,
  X,
  ShieldCheck,
  Mail,
  MessageSquare,
  Trophy,
  PenTool,
  MapPin,
  ArrowRight,
  Lock,
} from 'lucide-react';
import { ContractRow, counterSignContract } from '@/api/contractApi';
import { useAuth } from '@/context/AuthContext';
import { useCompanySignaturePreview } from '@/hooks/useCompanySignaturePreview';
import { SignatureGlyph } from '@/components/settings/company-signature/SignatureGlyph';

interface CounterSignModalProps {
  contract: ContractRow | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedContract: ContractRow, res: any) => void;
}

export const CounterSignModal: React.FC<CounterSignModalProps> = ({
  contract,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const navigate = useNavigate();
  const { user: currentUser, canSignature } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Single company contractor signature (Edith Guerrero) — loaded when the modal opens.
  const companySig = useCompanySignaturePreview(isOpen);
  const canUseSignature = canSignature('use');
  const canEditSignature = canSignature('edit');

  // Lock body scroll and handle Escape key
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isSubmitting, onClose]);

  useEffect(() => {
    if (isOpen) setError(null);
  }, [isOpen]);

  if (!isOpen || !contract) return null;

  const isConfigured = companySig.configured;
  const canConfirm = canUseSignature && isConfigured && !companySig.isLoading;
  const operatorName = currentUser?.name || currentUser?.email || 'you';

  const goToSignatureSettings = () => {
    onClose();
    navigate('/settings?tab=signature');
  };

  const handleConfirmCounterSign = async () => {
    if (!canUseSignature) {
      setError('You don’t have permission to counter-sign contracts with the company signature.');
      return;
    }
    if (!isConfigured) {
      setError('The company signature has not been set up yet.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const res = await counterSignContract(contract.id);
      onSuccess(res.contract || { ...contract, status: 'signed' }, res);
      onClose();
    } catch (err: any) {
      console.error('Counter-signing failed:', err);
      setError(err.message || 'Failed to counter-sign contract. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const clientSignedFormatted = contract.client_signed_at
    ? new Date(contract.client_signed_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : 'Recently';

  const contractValFormatted =
    contract.estimated_value && Number(contract.estimated_value) > 0
      ? `$${Number(contract.estimated_value).toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`
      : 'Specified in Contract';

  return createPortal(
    <div
      onClick={() => {
        if (!isSubmitting) onClose();
      }}
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs sm:backdrop-blur-sm animate-in fade-in duration-200 select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#1878B8] to-[#55C4F5] flex items-center justify-center text-white shadow-sm shadow-sky-500/20">
              <PenTool size={20} className="stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Counter-Sign &amp; Execute Contract
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  1-Party Signed
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                California Home Improvement Contract &bull; Lic #1096492
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div
              role="alert"
              className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 rounded-xl flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300"
            >
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* ALERT: NO PERMISSION TO USE THE COMPANY SIGNATURE */}
          {!canUseSignature && (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800/80 text-rose-900 dark:text-rose-200 shadow-2xs">
              <div className="flex items-start gap-2.5">
                <Lock size={16} className="shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider">Counter-sign permission required</h4>
                  <p className="text-xs text-rose-800/90 dark:text-rose-300/90 mt-1 leading-relaxed">
                    Your role doesn’t have “Can use” access to the company signature. Ask an administrator to update
                    your role in <strong>Settings &rarr; Users &amp; Permissions</strong>.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ALERT: COMPANY SIGNATURE NOT CONFIGURED */}
          {!companySig.isLoading && !companySig.error && !isConfigured && (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700/80 text-amber-900 dark:text-amber-200 space-y-3 shadow-2xs">
              <div className="flex items-start gap-2.5">
                <AlertCircle size={18} className="shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider">Company signature not set up</h4>
                  <p className="text-xs text-amber-800/90 dark:text-amber-300/90 mt-1 leading-relaxed">
                    Contracts are counter-signed with the company signature (Edith Guerrero). It has to be set up in
                    Settings before any contract can be executed.
                  </p>
                </div>
              </div>
              <div className="pt-2.5 border-t border-amber-200/80 dark:border-amber-800/60 flex items-center justify-between gap-2">
                <span className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                  {canEditSignature ? 'Settings → Company Signature' : 'Ask an admin with Edit access to set it up.'}
                </span>
                {canEditSignature && (
                  <button
                    type="button"
                    onClick={goToSignatureSettings}
                    className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <PenTool size={11} />
                    <span>Set up in Settings</span>
                    <ArrowRight size={11} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 1. CONTRACT SUMMARY CARD */}
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3.5 border border-slate-200/80 dark:border-white/5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Contract Reference:</span>
              <span className="text-xs font-extrabold text-slate-900 dark:text-white font-mono">
                {contract.contract_number}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 dark:border-white/5 text-xs">
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Client / Homeowner:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{contract.customer_name || 'Client'}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Contract Value:</span>
                <span className="font-extrabold text-emerald-700 dark:text-emerald-400">{contractValFormatted}</span>
              </div>
            </div>

            {(contract.customer_address || contract.customer_city) && (
              <div className="pt-2 border-t border-slate-200/60 dark:border-white/5 text-xs flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                <MapPin size={13} className="shrink-0 text-slate-400" />
                <span className="truncate">
                  {contract.customer_address}
                  {contract.customer_city ? `, ${contract.customer_city}` : ''}
                </span>
              </div>
            )}

            <div className="pt-2 border-t border-slate-200/60 dark:border-white/5 flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400 text-[11px] flex items-center gap-1">
                <CheckCircle2 size={12} className="text-emerald-600 dark:text-emerald-400" />
                Client Electronic Signature:
              </span>
              <span className="font-bold text-emerald-700 dark:text-emerald-400">{clientSignedFormatted}</span>
            </div>
          </div>

          {/* 2. COMPANY CONTRACTOR SIGNATURE CARD */}
          <div className="bg-sky-50/70 dark:bg-sky-950/30 rounded-xl p-4 border border-sky-200/80 dark:border-sky-800/50 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-sky-900 dark:text-sky-300 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-sky-600 dark:text-sky-400" />
                Company Contractor Signature
              </span>
              <span className="text-[10.5px] font-bold text-sky-700 dark:text-sky-400 bg-sky-100 dark:bg-sky-900/60 px-2 py-0.5 rounded-md border border-sky-300 dark:border-sky-800">
                Lic #1096492
              </span>
            </div>

            {companySig.isLoading ? (
              <div className="py-6 flex items-center justify-center gap-2 text-xs text-sky-700 dark:text-sky-400">
                <div className="w-4 h-4 border-2 border-sky-600 border-t-transparent rounded-full animate-spin" />
                <span>Loading the company signature...</span>
              </div>
            ) : companySig.error ? (
              <div className="bg-white/80 dark:bg-slate-900/60 rounded-lg p-3.5 border border-dashed border-rose-300 dark:border-rose-900/60 text-center text-xs text-rose-700 dark:text-rose-300">
                {companySig.error}
              </div>
            ) : !isConfigured ? (
              <div className="bg-white/80 dark:bg-slate-900/60 rounded-lg p-3.5 border border-dashed border-amber-300 dark:border-amber-800 text-center space-y-1">
                <PenTool size={16} className="mx-auto text-amber-500 mb-1" />
                <p className="text-xs text-slate-700 dark:text-slate-300 font-semibold">
                  Company signature not configured.
                </p>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900/90 rounded-lg p-3 border border-sky-200/80 dark:border-sky-900/60 text-center relative overflow-hidden">
                <div className="min-h-[46px] flex items-center justify-center py-1">
                  {companySig.signatureData ? (
                    <SignatureGlyph
                      signatureType={companySig.signatureType}
                      signatureData={companySig.signatureData}
                      signerName={companySig.signerName}
                    />
                  ) : (
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <Lock size={12} /> Signature preview hidden for your role
                    </div>
                  )}
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-300 font-semibold border-t border-slate-100 dark:border-white/5 pt-1 mt-1">
                  By: <strong>{companySig.signerName}</strong> &bull; Title: {companySig.signerTitle} &bull; Rise Up
                  Roofing and Construction, Inc.
                </div>
              </div>
            )}

            {isConfigured && (
              <p className="text-[11px] text-sky-900/80 dark:text-sky-300/80 leading-relaxed">
                You are applying {companySig.signerName}’s company signature. This action is logged under your account
                ({operatorName}).
              </p>
            )}
          </div>

          {/* 3. EXECUTION ACTIONS AUTOMATION SUMMARY */}
          <div className="space-y-2 text-xs">
            <span className="font-extrabold text-slate-700 dark:text-slate-300 text-[11px] uppercase tracking-wider block">
              Upon Counter-Signing:
            </span>
            <div className="space-y-1.5 text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-white/5">
                <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Generates official fully executed 6-page California contract PDF.</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-white/5">
                <Mail size={14} className="text-sky-600 dark:text-sky-400 shrink-0" />
                <span>
                  Emails final executed PDF to homeowner
                  {contract.customer_email ? ` (${contract.customer_email})` : ''}.
                </span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-white/5">
                <MessageSquare size={14} className="text-purple-600 dark:text-purple-400 shrink-0" />
                <span>
                  Sends SMS with instant PDF download link to homeowner
                  {contract.customer_phone ? ` (${contract.customer_phone})` : ''}.
                </span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-white/5">
                <Trophy size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
                <span>
                  Advances Deal pipeline stage to <strong>Contract Signed (Job Sold 🎉)</strong>.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-slate-900/80">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded-xl hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() => void handleConfirmCounterSign()}
            disabled={isSubmitting || !canConfirm}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs shadow-md shadow-emerald-500/25 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Executing Contract...</span>
              </>
            ) : (
              <>
                {canConfirm ? <PenTool size={13} className="stroke-[2.5]" /> : <Lock size={13} />}
                <span>Confirm &amp; Counter-Sign Contract</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
