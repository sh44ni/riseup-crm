import React from 'react';
import { AlertTriangle, ArrowRight, ArrowLeft } from 'lucide-react';
import { PublicContractData } from '@/types/contractStudioTypes';

export interface Step3LegalDisclosuresProps {
  contract: PublicContractData;
  initials: string;
  agreeDisclosures: boolean;
  onAgreeDisclosuresChange: (agreed: boolean) => void;
  onBack: () => void;
  onContinue: () => void;
}

export function Step3LegalDisclosures({
  contract,
  initials,
  agreeDisclosures,
  onAgreeDisclosuresChange,
  onBack,
  onContinue,
}: Step3LegalDisclosuresProps) {
  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="border-b border-slate-100 pb-5">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#1a5ba5] bg-sky-50 px-3 py-1 rounded-full border border-sky-100">
            Step 3 of 4 &bull; Statutory Disclosures &amp; General Provisions
          </span>
          <h2 className="text-2xl font-bold text-slate-800 mt-3">
            Insurance, Mechanics Lien &amp; CSLB Disclosures
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            California mandatory statutory notices protecting property owners and contractors.
          </p>
        </div>

        {/* Insurance Verification Badges (Clauses C & D) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              C. Commercial General Liability, Excess Umbrella &amp; Auto
            </div>
            <div className="text-xs text-slate-700 leading-relaxed">
              <em>i.</em> Rise Up Roofing and Construction, Inc., carries commercial general liability, excess umbrella, and auto car insurance written by <strong>{contract.insuranceCarrier}</strong>. You can reach out to them at <strong>{contract.insurancePhone}</strong> to request a certificate of insurance.
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              D. Workers’ Compensation Insurance
            </div>
            <div className="text-xs text-slate-700 leading-relaxed">
              <em>i.</em> Rise Up Roofing and Construction, Inc. carries workers’ compensation insurance for all employees written by <strong>{contract.workersCompCarrier}</strong>. You can reach out to them at <strong>{contract.workersCompPhone}</strong> to request a certificate of insurance.
            </div>
          </div>
        </div>

        {/* Mechanics Lien Warning (Clause E - Verbatim Statutory) */}
        <div className="p-5 bg-amber-50/70 border-2 border-amber-200 rounded-2xl space-y-3 text-xs text-amber-950 leading-relaxed">
          <div className="font-extrabold text-sm uppercase text-amber-900 flex items-center gap-2">
            <AlertTriangle size={18} /> E. Mechanics Lien Warning (California Law)
          </div>
          <p>
            Anyone who helps improve your property, but who is not paid, may record what is called a mechanic’s lien on your property. A mechanics lien is a claim, like a mortgage or home equity loan, made against your property and recorded with the county recorder.
          </p>
          <p>
            Even if you pay your contractor in full, unpaid subcontractors, suppliers, and laborers who helped to improve your property may record mechanics liens and sue you in court to foreclose the lien. If a court finds the lien is valid, you could be forced to pay twice or have a court officer sell your home to pay the lien. Liens can also affect your credit.
          </p>
          <p>
            To preserve their right to record a lien, each subcontractor and material supplier must provide you with a document called a ‘Preliminary Notice.’ This notice is not a lien. The purpose of the notice is to let you know that the person who sends you the notice has the right to record a lien on your property if he or she is not paid.
          </p>
          <div className="p-3 bg-white/90 rounded-xl border border-amber-300 space-y-2 font-medium">
            <div><strong>BE CAREFUL.</strong> The Preliminary Notice can be sent up to 20 days after the subcontractor starts work or the supplier provides material. This can be a big problem if you pay your contractor before you have received the Preliminary Notices. You will not get Preliminary Notices from your prime contractor or from laborers who work on your project. The law assumes that you already know they are improving your property.</div>
            <div><strong>PROTECT YOURSELF FROM LIENS.</strong> You can protect yourself from liens by getting a list from your contractor of all the subcontractors and material suppliers that work on your project. Find out from your contractor when these subcontractors started work and when these suppliers’ delivered goods or materials. Then wait 20 days, paying attention to the Preliminary Notices you receive.</div>
            <div><strong>PAY WITH JOINT CHECKS.</strong> One way to protect yourself is to pay with a joint check. When your contractor tells you it is time to pay for the work of a subcontractor or supplier who has provided you with a Preliminary Notice, write a joint check payable to both the contractor and the subcontractor or material supplier.</div>
          </div>
          <p>
            For other ways to prevent liens, visit CSLB’s Internet Web site at <strong>www.cslb.ca.gov</strong> or call CSLB at <strong>800-321-CSLB (2752)</strong>.
          </p>
          <p className="font-extrabold text-amber-900 bg-amber-100/60 p-2.5 rounded-lg border border-amber-200">
            REMEMBER, IF YOU DO NOTHING, YOU RISK HAVING A LIEN PLACED ON YOUR HOME. This can mean that you may have to pay twice or face the forced sale of your home to pay what you owe.
          </p>
        </div>

        {/* Initial Action Card for Mechanics Lien (Clause E) */}
        <div className="p-4 bg-sky-50/60 border-2 border-sky-200 rounded-2xl">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={agreeDisclosures}
              onChange={(e) => onAgreeDisclosuresChange(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded text-[#1a5ba5] focus:ring-[#1a5ba5] cursor-pointer"
            />
            <span className="text-xs text-slate-800 font-bold leading-relaxed">
              CLIENT INITIAL ({initials || 'Required'}): I have read and understood the California Mechanics Lien Warning.
            </span>
          </label>
        </div>

        {/* CSLB Consumer Information (Clause F) */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs text-slate-700 leading-relaxed">
          <div className="font-bold text-slate-900">F. Information about the Contractors’ State License Board (CSLB):</div>
          <p>
            CSLB is the state consumer protection agency that licenses and regulates construction contractors. Contact CSLB for information about the licensed contractor you are considering, including information about disclosable complaints, disciplinary actions, and civil judgments that are reported to CSLB.
          </p>
          <p>
            Use only licensed contractors. If you file a complaint against a licensed contractor within the legal deadline (usually four years), CSLB has authority to investigate the complaint. If you use an unlicensed contractor, CSLB may not be able to help you resolve your complaint. Your only remedy may be in civil court, and you may be liable for damages arising out of any injuries to the unlicensed contractor or the unlicensed contractor’s employees.
          </p>
          <div className="p-3 bg-white rounded-xl border border-slate-200 font-semibold text-slate-800 flex flex-wrap gap-x-5 gap-y-1 text-[11px]">
            <span>Web: <a href="https://www.cslb.ca.gov" target="_blank" rel="noreferrer" className="text-[#1a5ba5] underline">www.cslb.ca.gov</a></span>
            <span>Call: <strong className="text-[#1a5ba5]">800-321-CSLB (2752)</strong></span>
            <span>Write: CSLB at P.O. Box 26000, Sacramento, CA 95826</span>
          </div>
        </div>

        {/* General Provisions: Clauses G, H, I, J */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5 text-xs text-slate-700 leading-relaxed">
          <div className="font-bold text-slate-900 text-sm">General Contract Provisions:</div>
          <div className="space-y-1.5 pl-1">
            <p>
              <strong>G. Representations:</strong> <em>a. Authority to Sign:</em> Each party promises to the other party that it has the authority to enter into this Contract and to perform all of its obligations under this Contract. <em>b. Client will Review Work:</em> The Client promises to review the work product, to be reasonably available to the Contractor if the Contractor has questions regarding this project, and to provide timely feedback and decisions.
            </p>
            <p>
              <strong>H. General:</strong> <em>a. Signatures:</em> The Client and the Contractor must sign the document either electronically or in hardcopy. If this document is signed in hard copy, it must be returned to the Contractor for valid record. Electronic signatures count as originals for all purposes. <em>b. Compliance with Laws:</em> Contractor must comply with all provisions of law applicable to this Contract.
            </p>
            <p>
              <strong>I. Term and Termination:</strong> This contract ends on the date indicated on page 2, item d of this contract ({contract.approxCompletionDate}), or unless the Client or the Contractor ends the contract before that time. If one of the parties chooses to end the Contract prior to project completion, the Client is responsible for paying for all work and costs incurred up until that date.
            </p>
            <p>
              <strong>J. Bond:</strong> Client has the right to require the Contractor to have a performance and payment bond.
            </p>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-2">
          <button
            type="button"
            onClick={onBack}
            className="py-3 px-5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-sm rounded-xl flex items-center gap-2 cursor-pointer"
          >
            <ArrowLeft size={16} /> Back
          </button>

          <button
            type="button"
            onClick={onContinue}
            disabled={!agreeDisclosures || !initials.trim()}
            className="py-3 px-6 bg-[#1a5ba5] hover:bg-[#154a87] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl flex items-center gap-2 shadow-md transition-all cursor-pointer"
          >
            <span>Continue to Sign Contract</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
