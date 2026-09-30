import React from 'react';
import { AlertTriangle, CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react';
import { PublicContractData } from '@/types/contractStudioTypes';

export interface Step2PaymentMilestonesProps {
  contract: PublicContractData;
  initials: string;
  onInitialsChange: (inits: string) => void;
  agreeMilestones: boolean;
  onAgreeMilestonesChange: (agreed: boolean) => void;
  agreeTermsRefund: boolean;
  onAgreeTermsRefundChange: (agreed: boolean) => void;
  onBack: () => void;
  onContinue: () => void;
}

export function Step2PaymentMilestones({
  contract,
  initials,
  onInitialsChange,
  agreeMilestones,
  onAgreeMilestonesChange,
  agreeTermsRefund,
  onAgreeTermsRefundChange,
  onBack,
  onContinue,
}: Step2PaymentMilestonesProps) {
  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="border-b border-slate-100 pb-5">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#1a5ba5] bg-sky-50 px-3 py-1 rounded-full border border-sky-100">
            Step 2 of 4 &bull; Payment Milestones &amp; Terms
          </span>
          <h2 className="text-2xl font-bold text-slate-800 mt-3">
            Schedule of Progress Payments &amp; Payment Terms
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            California Home Improvement Contract payment schedule, statutory downpayment protections, and invoicing terms.
          </p>
        </div>

        {/* Price, Finance Charge, Downpayment Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              g. Contract Price
            </div>
            <div className="text-lg font-extrabold text-[#1a5ba5]">
              {contract.contractPrice}
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              h. Finance Charge
            </div>
            <div className="text-lg font-extrabold text-slate-800">
              {contract.financeCharge || 'N/A'}
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              i. Downpayment
            </div>
            <div className="text-lg font-extrabold text-amber-600">
              {contract.downpayment || '$1,000.00'}
            </div>
          </div>
        </div>

        {/* Verbatim Downpayment Statutory Alert */}
        <div className="p-4 bg-amber-50/90 border-2 border-amber-300 rounded-2xl flex items-start gap-3 text-xs text-amber-950 leading-relaxed font-bold">
          <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="uppercase tracking-wide font-black text-amber-900">
              THE DOWNPAYMENT MAY NOT EXCEED $1,000.00 OR 10 PERCENT OF THE CONTRACT PRICE, WHICHEVER IS LESS.
            </div>
            <div className="text-amber-900 font-semibold normal-case">
              IT IS AGAINST THE LAW FOR A CONTRACTOR TO COLLECT PAYMENT FOR WORK NOT YET COMPLETED, OR FOR MATERIALS NOT YET DELIVERED. HOWEVER, A CONTRACTOR MAY REQUIRE A DOWNPAYMENT.
            </div>
          </div>
        </div>

        {/* Milestones Table (Clause j) */}
        <div className="space-y-2">
          <div className="text-xs font-bold text-slate-700">
            <strong>j. Payment Schedule:</strong> <em>i.</em> Schedule of Progress Payments: Contractor will complete the deliverables and/or complete specified milestones, and Client will pay Contractor upon acceptance of Deliverables or timely completion of a milestone, according to the following schedule:
          </div>
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600">
                <tr>
                  <th className="p-3.5 w-12">#</th>
                  <th className="p-3.5">Payment Deliverable / Milestone Stage</th>
                  <th className="p-3.5 text-right w-28">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {contract.paymentSchedule.map((p, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="p-3.5 font-bold text-slate-800">{p.number}</td>
                    <td className="p-3.5 text-slate-700">{p.description}</td>
                    <td className="p-3.5 font-extrabold text-slate-900 text-right">{p.amount}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50/80 font-bold border-t border-slate-200">
                <tr>
                  <td colSpan={2} className="p-3.5 text-right text-slate-700">Total Contract Price:</td>
                  <td className="p-3.5 text-right text-base text-[#1a5ba5] font-extrabold">{contract.contractPrice}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Client Initials Input & Milestone Initial Box */}
        <div className="p-5 bg-sky-50/60 border-2 border-sky-200 rounded-2xl space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-sky-200/60 pb-3">
            <div className="text-xs font-bold text-[#091b36] uppercase tracking-wider">
              Homeowner Initials Verification
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-600 font-medium">Your initials:</label>
              <input
                type="text"
                maxLength={4}
                value={initials}
                onChange={(e) => onInitialsChange(e.target.value.toUpperCase())}
                placeholder="Initials"
                className="w-24 px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-center text-sm font-extrabold text-[#091b36] tracking-widest focus:outline-none focus:border-[#1a5ba5]"
              />
              {initials && (
                <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 size={14} /> Ready
                </span>
              )}
            </div>
          </div>

          <label className="flex items-start gap-3 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={agreeMilestones}
              onChange={(e) => onAgreeMilestonesChange(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded text-[#1a5ba5] focus:ring-[#1a5ba5] cursor-pointer"
            />
            <span className="text-xs text-slate-800 font-bold leading-relaxed">
              CLIENT INITIAL ({initials || 'Required'}): I have read and agree to the Payment Milestones Schedule.
            </span>
          </label>
        </div>

        {/* Payment Terms (Clause k - Verbatim) */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-700 space-y-2.5 leading-relaxed">
          <div className="font-bold text-slate-900 text-sm">
            k. Payment Terms:
          </div>
          <p>
            Payment shall be made to the Contractor via cash, cashier’s check, or money order. If any invoices are not paid when due, this could result in suspension or termination of the project. If the Client fails to pay for the Services when due, the Contractor reserves the right to treat such failure as a breach of this Contract. Any legal fees associated with such will be the Client’s responsibility.
          </p>
          <div className="space-y-1.5 pt-1 pl-1">
            <p>
              <strong>i. Invoices:</strong> The Contractor will invoice the Client on the dates listed in the Payment Schedule section. The Client agrees to pay the invoice with the amount owed within <strong>UPON COMPLETION</strong>.
            </p>
            <p>
              <strong>ii. Late Payments:</strong> If the Client fails to pay the Contractor on time per agreed upon payment schedule, the Contractor may suspend work until delinquent payments are brought current. If payments are delinquent for more than <strong>4 days</strong>, then the Client will be subjected to a late fee of <strong>$25.00</strong>.
            </p>
            <p>
              <strong>iii. Expenses:</strong> Client shall pay to the Contractor any expenses incurred by the Contractor in the provision of services under this Agreement, including, but not limited to <strong>any extra materials needed</strong> no later than <strong>2 days</strong> after receipt is provided.
            </p>
            <p>
              <strong>iv. Lien Release:</strong> Upon satisfactory payment being made for any portion of the work performed, the Contractor, prior to any further payment being made, shall furnish to the Client a full and unconditional release from any potential lien claimant claim or mechanics lien authorized pursuant to Sections 8400 and 8404 of the California Civil Code for that portion of the work for which payment has been made.
            </p>
            <p>
              <strong>v. Refund Policy: 1.6.2(a) No Refunds:</strong> Services completed as described in this contract are not subject to refunds. The Client will not be reimbursed for services cancelled once work has begun. All sales are final.
            </p>
          </div>
        </div>

        {/* Second Initial Box (Payment Terms & Refund Policy) */}
        <div className="p-4 bg-sky-50/60 border-2 border-sky-200 rounded-2xl">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={agreeTermsRefund}
              onChange={(e) => onAgreeTermsRefundChange(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded text-[#1a5ba5] focus:ring-[#1a5ba5] cursor-pointer"
            />
            <span className="text-xs text-slate-800 font-bold leading-relaxed">
              CLIENT INITIAL ({initials || 'Required'}): I have read and understood the Payment Terms, Invoicing Provisions &amp; Refund Policy (1.6.2(a) No Refunds).
            </span>
          </label>
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
            disabled={!agreeMilestones || !agreeTermsRefund || !initials.trim()}
            className="py-3 px-6 bg-[#1a5ba5] hover:bg-[#154a87] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl flex items-center gap-2 shadow-md transition-all cursor-pointer"
          >
            <span>Continue to Disclosures</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
