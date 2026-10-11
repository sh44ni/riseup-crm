import React from 'react';
import { CheckCircle2, Edit3, Lock, PenTool } from 'lucide-react';
import type { CompanySignature } from '@/types/companySignatureTypes';
import { SignatureGlyph } from './SignatureGlyph';
import { COMPANY_LEGAL_NAME, CONTRACTOR_LICENSE_LABEL, formatSignatureDateTime } from './signatureFormat';

interface CompanySignatureCardProps {
  signature: CompanySignature;
  canEdit: boolean;
  onChange: () => void;
}

export function CompanySignatureCard({ signature, canEdit, onChange }: CompanySignatureCardProps) {
  const changedSinceSetup = signature.version > 1;

  return (
    <div className="light-glass-card bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden backdrop-blur-md">
      <div className="p-5 border-b border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-purple-500/20">
            <PenTool size={20} className="stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">Company contract signature</h2>
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 size={10} /> Active
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                Version {signature.version}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Applied to every contract when it is counter-signed.
            </p>
          </div>
        </div>

        {canEdit ? (
          <button
            type="button"
            onClick={onChange}
            className="px-3.5 py-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer shrink-0"
          >
            <Edit3 size={13} />
            <span>Change signature</span>
          </button>
        ) : (
          <div
            className="px-2.5 py-1 rounded-xl text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/5 flex items-center gap-1.5 shrink-0"
            title="Only roles with Edit access can change the company signature."
          >
            <Lock size={11} className="text-slate-400" />
            <span>Read-only</span>
          </div>
        )}
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-purple-200/80 dark:border-purple-900/60 text-center">
          <div className="text-slate-400 dark:text-slate-500 uppercase tracking-widest font-bold text-[9px] mb-1">
            {signature.signature_type === 'drawn' ? 'Hand-drawn electronic signature' : 'Typed calligraphy signature'}
          </div>
          <div className="min-h-[72px] flex items-center justify-center py-2">
            <SignatureGlyph
              signatureType={signature.signature_type}
              signatureData={signature.signature_data}
              signerName={signature.signer_name}
              size="lg"
            />
          </div>
          <div className="text-[11.5px] text-slate-600 dark:text-slate-300 font-semibold border-t border-slate-100 dark:border-white/5 pt-2 mt-1 leading-relaxed">
            <strong>{COMPANY_LEGAL_NAME}</strong>
            <br />
            By: {signature.signer_name} &bull; Title: {signature.signer_title} &bull; {CONTRACTOR_LICENSE_LABEL}
          </div>
        </div>

        <dl className="text-xs space-y-3 self-center">
          <div>
            <dt className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Configured by
            </dt>
            <dd className="text-slate-800 dark:text-slate-200 font-semibold">
              {signature.configured_by_name || '—'}{' '}
              <span className="text-slate-500 dark:text-slate-400 font-normal">
                on {formatSignatureDateTime(signature.configured_at)}
              </span>
            </dd>
          </div>
          {changedSinceSetup && (
            <div>
              <dt className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Last changed by
              </dt>
              <dd className="text-slate-800 dark:text-slate-200 font-semibold">
                {signature.updated_by_name || '—'}{' '}
                <span className="text-slate-500 dark:text-slate-400 font-normal">
                  on {formatSignatureDateTime(signature.updated_at)}
                </span>
              </dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  );
}
