import React from 'react';
import { ContractStudioData } from '@/types/contractStudioTypes';
import { FileText, PenTool, Info } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface StepProps {
  data: ContractStudioData;
  onDataChange: (updates: Partial<ContractStudioData>) => void;
}

export function ContractSignaturesStep({ data, onDataChange }: StepProps) {
  const { user } = useAuth();
  const isRepAuthorizedSignatory = Boolean(
    user?.is_protected_owner || user?.role === 'owner' || user?.is_authorized_signatory
  );

  return (
    <div className="space-y-6">
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
          {/* Contractor Signature Preview */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Contractor Signature
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                  data.isCounterSigned
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : isRepAuthorizedSignatory
                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
              >
                {data.isCounterSigned
                  ? 'Counter-Signed'
                  : isRepAuthorizedSignatory
                  ? 'Authorized Signatory'
                  : 'Pending Counter-Signature'}
              </span>
            </div>
            <div className="text-xs text-slate-600 space-y-1 bg-white p-3 rounded-lg border border-slate-200">
              <div className="font-bold text-slate-900">Rise Up Roofing and Construction, Inc.</div>
              {data.isCounterSigned ? (
                <>
                  <div>
                    Signatory:{' '}
                    <span className="font-semibold text-slate-800">
                      {data.contractorSignatureName}
                    </span>
                  </div>
                  <div>
                    Title:{' '}
                    <span className="font-semibold text-slate-800">
                      {data.contractorTitle || 'Authorized Signatory'}
                    </span>
                  </div>
                </>
              ) : isRepAuthorizedSignatory ? (
                <>
                  <div>
                    Signatory:{' '}
                    <span className="font-semibold text-slate-800">
                      {user?.name || data.salespersonName || 'Authorized Signatory'}
                    </span>
                  </div>
                  <div>
                    Title:{' '}
                    <span className="font-semibold text-slate-800">
                      {user?.signature_title ||
                        (user?.role === 'owner' ? 'Owner / General Contractor' : 'Project Manager')}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    Signatory:{' '}
                    <span className="italic text-slate-400 font-normal">
                      Blank (Pending authorized counter-sign)
                    </span>
                  </div>
                  <div>
                    Title:{' '}
                    <span className="italic text-slate-400 font-normal">
                      Blank (Pending authorized counter-sign)
                    </span>
                  </div>
                </>
              )}
              <div className="text-[11px] text-slate-400">License: B/C39/C46 • #1096492</div>
            </div>
            <p className="text-[11px] text-slate-400">
              {data.isCounterSigned
                ? 'Contract has been counter-signed by an authorized company officer.'
                : isRepAuthorizedSignatory
                ? 'Representative holds Authorized Signatory authority and name will print on the contract.'
                : 'Representative is not an authorized signatory. Signatory name remains blank until an authorized signatory counter-signs.'}
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
