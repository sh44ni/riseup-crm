import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ContractStudioData } from '@/types/contractStudioTypes';
import { FileText, PenTool, Info, Lock, Loader2, ArrowRight, RotateCcw } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

/** Company signature status as seen by the contract wizard. */
export interface WizardSignatureStatus {
  loading: boolean;
  configured: boolean;
  signerName: string;
  signerTitle: string;
  error: string | null;
}

interface StepProps {
  data: ContractStudioData;
  onDataChange: (updates: Partial<ContractStudioData>) => void;
  signatureStatus: WizardSignatureStatus;
  onRetrySignatureStatus?: () => void;
}

function SignatureLockedCard({
  status,
  onRetry,
}: {
  status: WizardSignatureStatus;
  onRetry?: () => void;
}) {
  const navigate = useNavigate();
  const { canSignature } = useAuth();
  const canEdit = canSignature('edit');

  return (
    <div
      data-testid="contract-signature-locked"
      className="p-4 rounded-xl border border-amber-300 bg-amber-50/80 text-amber-900 space-y-3"
    >
      <div className="flex items-start gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
          <Lock size={15} />
        </div>
        <div>
          <h4 className="text-sm font-bold">Contract signature locked</h4>
          <p className="text-xs text-amber-800/90 mt-0.5 leading-relaxed">
            {status.error
              ? `We couldn’t verify the company signature (${status.error}).`
              : 'The company signature (Edith Guerrero) has not been set up. Contracts can’t be sent or counter-signed until it is.'}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-amber-200/80">
        {status.error && onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="px-3 py-1.5 rounded-lg text-xs font-bold text-amber-800 hover:bg-amber-100 border border-amber-300 flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw size={12} /> Retry
          </button>
        )}
        {canEdit ? (
          <button
            type="button"
            onClick={() => navigate('/settings?tab=signature')}
            className="px-3.5 py-1.5 rounded-lg bg-[#1a5ba5] hover:bg-[#154a87] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <PenTool size={12} /> Set up now <ArrowRight size={12} />
          </button>
        ) : (
          <span className="text-xs font-semibold text-amber-700">Ask an admin with Edit access.</span>
        )}
      </div>
    </div>
  );
}

export function ContractSignaturesStep({ data, onDataChange, signatureStatus, onRetrySignatureStatus }: StepProps) {
  const isCounterSigned = Boolean(data.isCounterSigned);
  const isLocked = !isCounterSigned && !signatureStatus.loading && !signatureStatus.configured;
  // Prefer the live company signatory; executed contracts keep whatever was stamped at counter-sign time.
  const signatoryName = isCounterSigned
    ? data.contractorSignatoryName || data.contractorSignatureName || signatureStatus.signerName
    : signatureStatus.signerName || data.contractorSignatoryName || '';
  const signatoryTitle = isCounterSigned
    ? data.contractorSignatoryTitle || data.contractorTitle || signatureStatus.signerTitle
    : signatureStatus.signerTitle || data.contractorSignatoryTitle || '';

  return (
    <div className="space-y-6">
      {isLocked && <SignatureLockedCard status={signatureStatus} onRetry={onRetrySignatureStatus} />}
      {/* 1. Page 5 General Contract Provisions */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
          <FileText size={16} className="text-[#1a5ba5]" /> General Contract Provisions
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              G. Representations &amp; Authority
            </label>
            <textarea
              rows={3}
              value={data.representationsText}
              onChange={(e) => onDataChange({ representationsText: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-[#1a5ba5] transition-colors leading-relaxed"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              H. General Provisions &amp; Code Compliance
            </label>
            <textarea
              rows={3}
              value={data.generalProvisionsText}
              onChange={(e) => onDataChange({ generalProvisionsText: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-[#1a5ba5] transition-colors leading-relaxed"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              I. Term &amp; Termination
            </label>
            <textarea
              rows={2}
              value={data.termTerminationText}
              onChange={(e) => onDataChange({ termTerminationText: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-[#1a5ba5] transition-colors leading-relaxed"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              J. Performance &amp; Payment Bond
            </label>
            <textarea
              rows={2}
              value={data.bondText}
              onChange={(e) => onDataChange({ bondText: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-[#1a5ba5] transition-colors leading-relaxed"
            />
          </div>
        </div>
      </div>

      {/* 2. Execution of Agreement Signatures */}
      <div className="space-y-3 border-t border-slate-100 pt-4">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
          <PenTool size={16} className="text-[#1a5ba5]" /> Execution Signatures
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Contractor Signature Preview (single company signature) */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2" data-testid="contractor-signature-card">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Contractor Signature
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                  isCounterSigned
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : isLocked
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-purple-50 text-purple-700 border-purple-200'
                }`}
              >
                {isCounterSigned
                  ? 'Counter-Signed'
                  : signatureStatus.loading
                  ? 'Checking…'
                  : isLocked
                  ? 'Locked'
                  : 'Applied on counter-sign'}
              </span>
            </div>
            <div className="text-xs text-slate-600 space-y-1 bg-white p-3 rounded-lg border border-slate-200">
              <div className="font-bold text-slate-900">Rise Up Roofing and Construction, Inc.</div>
              {signatureStatus.loading && !isCounterSigned ? (
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Loader2 size={12} className="animate-spin" /> Loading company signature…
                </div>
              ) : isLocked ? (
                <div className="flex items-center gap-1.5 italic text-slate-400">
                  <Lock size={12} /> Not set up — signatory unavailable
                </div>
              ) : (
                <div>
                  Signatory: <span className="font-semibold text-slate-800">{signatoryName}</span> &bull; Title:{' '}
                  <span className="font-semibold text-slate-800">{signatoryTitle}</span>
                </div>
              )}
              <div className="text-[11px] text-slate-400">License: B/C39/C46 • #1096492</div>
            </div>
            <p className="text-[11px] text-slate-400">
              {isCounterSigned
                ? 'Contract has been counter-signed with the company signature.'
                : isLocked
                ? 'The company signature must be set up before this contract can be sent.'
                : 'Name and title are pre-printed on the contract. The signature itself is applied when the contract is counter-signed.'}
            </p>
          </div>

          {/* Client Signature Preview */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Client Signature
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200">
                {data.isSigned ? 'Signed by Client' : 'Pending Client Portal'}
              </span>
            </div>
            <div className="text-xs text-slate-600 space-y-1 bg-white p-3 rounded-lg border border-slate-200">
              <div className="font-bold text-slate-900">{data.clientName || 'Selected Client'}</div>
              <div>
                Address:{' '}
                <span className="font-semibold text-slate-800">
                  {data.projectAddress ? `${data.projectAddress}, ${data.city}` : '—'}
                </span>
              </div>
              <div className="italic text-slate-400 pt-1">
                {data.isSigned
                  ? '✓ Client E-Signature Applied'
                  : 'Will be signed by client via signing portal'}
              </div>
            </div>
            <p className="text-[11px] text-slate-400">
              Stays empty in the draft. Populates automatically when the client submits via the
              signing portal.
            </p>
          </div>
        </div>
      </div>

      {/* 3. California Right to Cancel Addendum Note */}
      <div className="flex items-start gap-2 p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900">
        <Info size={16} className="text-amber-700 mt-0.5 shrink-0" />
        <span>
          <b>Right to Cancel Initials:</b> Page 5 contains statutory Three-Day and Five-Day (65+)
          receipt acknowledgment checkboxes. These remain blank in the wizard draft and are
          initialed directly by the client during online signing.
        </span>
      </div>
    </div>
  );
}

export default ContractSignaturesStep;
