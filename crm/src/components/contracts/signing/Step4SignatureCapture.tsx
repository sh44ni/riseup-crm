import React from 'react';
import { CheckCircle2, ArrowLeft } from 'lucide-react';
import { PublicContractData } from '@/types/contractStudioTypes';
import { SignaturePad } from './SignaturePad';

export interface Step4SignatureCaptureProps {
  contract: PublicContractData;
  initials: string;
  isSeniorCitizen: boolean;
  onSeniorCitizenChange: (val: boolean) => void;
  agreeCancellation: boolean;
  onAgreeCancellationChange: (val: boolean) => void;
  signatureName: string;
  onSignatureChange: (res: {
    signatureName: string;
    signatureType: 'typed' | 'drawn';
    signatureData: string;
    isValid: boolean;
  }) => void;
  agreeLegal: boolean;
  onAgreeLegalChange: (val: boolean) => void;
  isSubmitting: boolean;
  isSignatureValid: boolean;
  onBack: () => void;
  onSubmit: () => void;
}

export function Step4SignatureCapture({
  contract,
  initials,
  isSeniorCitizen,
  onSeniorCitizenChange,
  agreeCancellation,
  onAgreeCancellationChange,
  signatureName,
  onSignatureChange,
  agreeLegal,
  onAgreeLegalChange,
  isSubmitting,
  isSignatureValid,
  onBack,
  onSubmit,
}: Step4SignatureCaptureProps) {
  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="border-b border-slate-100 pb-5">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#1a5ba5] bg-sky-50 px-3 py-1 rounded-full border border-sky-100">
            Step 4 of 4 &bull; Execution &amp; Electronic Signature
          </span>
          <h2 className="text-2xl font-bold text-slate-800 mt-3">
            Right to Cancel Addendum &amp; Execution
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            California statutory cancellation rights and official electronic execution.
          </p>
        </div>

        {/* Right to Cancel Addendum & Statutory Notice (Civ. Code § 1689.7) */}
        <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-700 space-y-3 leading-relaxed">
          <div className="font-bold text-slate-900 text-sm">
            Notice of the Three-day Right to Cancel (Civ. Code § 1689.7):
          </div>
          <p>
            The Client has the right to cancel this contract within three business days. You may cancel by e-mailing, mailing, faxing, or delivering a written notice to the Contractor at the Contractor’s place of business by midnight of the third business day after you receive a signed and dated copy of the contract that includes this notice. Include your name, your address, and the date you received the signed copy of the contract and this notice.
          </p>
          <p>
            If you cancel, the contractor must return to you anything you paid within 10 days of receiving the notice of cancellation. For your part, you must make available to the contractor at your residence, in substantially as good condition as you received them, goods delivered to you under this contract or sale. Or you may, if you wish, comply with the contractor’s instructions on how to return the goods at the contractor’s expense and risk. If you do make the goods available to the contractor and the contractor does not pick them up within 20 days of the date of your notice of cancellation, you may keep them without any further obligation. If you fail to make the goods available to the contractor, or if you agree to return the goods to the contractor and fail to do so, then you remain liable for performance of all obligations under the contract.
          </p>
          <p className="p-3 bg-white rounded-xl border border-slate-200 text-[11px]">
            <strong>Cancellation Contact:</strong> Rise Up Roofing and Construction, Inc. at 2182 S El Camino Real, Suite 202, Oceanside, CA 92054 &bull; Fax (442) 266-2422 &bull; Email: <strong>{contract.cancellationEmail}</strong>.
          </p>
        </div>

        {/* Senior Citizen Five-Day Toggle (Civ. Code § 1689.6(a)(2)) */}
        <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-2">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isSeniorCitizen}
              onChange={(e) => onSeniorCitizenChange(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
            />
            <div className="text-xs text-amber-950 leading-relaxed">
              <strong>Five-Day Right to Cancel (For Senior Citizens, age 65+):</strong> Under California Civil Code § 1689.6(a)(2), senior citizens aged 65 and older are granted <strong>five (5) business days</strong> to cancel this contract. Check this box if you qualify.
            </div>
          </label>
        </div>

        {/* Right to Cancel Initial Box */}
        <div className="p-4 bg-sky-50/60 border-2 border-sky-200 rounded-2xl">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={agreeCancellation}
              onChange={(e) => onAgreeCancellationChange(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded text-[#1a5ba5] focus:ring-[#1a5ba5] cursor-pointer"
            />
            <span className="text-xs text-slate-800 font-bold leading-relaxed">
              CLIENT INITIAL ({initials || 'Required'}): The law requires that the contractor give you a notice explaining your right to cancel. I acknowledge receipt of the statutory “Notice of the Three-day Right to Cancel” (Exhibit A).
            </span>
          </label>
        </div>

        {/* Mutual Agreement Statement & Contractor Signature Card */}
        <div className="space-y-3 pt-1">
          <p className="text-xs font-semibold text-slate-700 italic text-center">
            “The Parties hereto agree to the foregoing as evidenced by their signatures below.”
          </p>
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Contractor Counter-Signature</div>
              <div className="font-extrabold text-sm text-slate-800">
                Rise Up Roofing and Construction, Inc.
              </div>
              <div className="text-slate-500 text-[11px]">
                {contract.contractorSignatoryName
                  ? `By: ${contract.contractorSignatoryName}${contract.contractorSignatoryTitle ? ` • ${contract.contractorSignatoryTitle}` : ''}`
                  : 'Authorized Signatory'}{' '}
                &bull; Lic #1096492 (B/C39/C46)
              </div>
            </div>
            <div className="text-left sm:text-right text-[11px]">
              {contract.isCounterSigned ? (
                <>
                  <div className="text-slate-600">Date: <strong>{contract.counterSignedAt || contract.contractDate}</strong></div>
                  <div className="text-emerald-700 font-semibold flex items-center gap-1 sm:justify-end mt-0.5">
                    <CheckCircle2 size={13} /> Counter-Signed &amp; Fully Executed
                  </div>
                </>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 font-semibold text-[11px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                  Pending Countersignature Upon Client Execution
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Interactive Signature Pad */}
        <div className="space-y-2 pt-1">
          <SignaturePad
            initialName={signatureName}
            onChange={onSignatureChange}
          />
        </div>

        {/* Legal Agreement Checkbox */}
        <label className="flex items-start gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl cursor-pointer">
          <input
            type="checkbox"
            checked={agreeLegal}
            onChange={(e) => onAgreeLegalChange(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded text-[#1a5ba5] focus:ring-[#1a5ba5] cursor-pointer"
          />
          <span className="text-xs text-slate-700 font-medium leading-relaxed">
            By clicking <strong>“Sign &amp; Complete Contract”</strong>, I agree that my electronic signature and initials are legally binding under the California Uniform Electronic Transactions Act (UETA) and the federal ESIGN Act, and I authorize Rise Up Roofing and Construction, Inc. to proceed under the terms of this contract.
          </span>
        </label>

        {/* Action Buttons */}
        <div className="flex justify-between pt-2">
          <button
            type="button"
            onClick={onBack}
            disabled={isSubmitting}
            className="py-3 px-5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-sm rounded-xl flex items-center gap-2 cursor-pointer"
          >
            <ArrowLeft size={16} /> Back
          </button>

          <button
            type="button"
            onClick={onSubmit}
            disabled={!isSignatureValid || !agreeCancellation || !agreeLegal || isSubmitting}
            className="py-3.5 px-8 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-sm rounded-xl flex items-center gap-2 shadow-lg hover:shadow-xl transition-all cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Generating Signed PDF...</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={18} />
                <span>Sign &amp; Complete Contract 🎉</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
