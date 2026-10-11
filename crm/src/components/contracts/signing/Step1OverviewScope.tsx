import React from 'react';
import { FileText, Calendar, Info, ArrowRight } from 'lucide-react';
import { PublicContractData } from '@/types/contractStudioTypes';

export interface Step1OverviewScopeProps {
  contract: PublicContractData;
  agreeScope: boolean;
  onAgreeScopeChange: (agreed: boolean) => void;
  onContinue: () => void;
}

export function Step1OverviewScope({
  contract,
  agreeScope,
  onAgreeScopeChange,
  onContinue,
}: Step1OverviewScopeProps) {
  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="border-b border-slate-100 pb-5">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#1a5ba5] bg-sky-50 px-3 py-1 rounded-full border border-sky-100">
            Step 1 of 4 &bull; Home Improvement Contract Overview
          </span>
          <h1 className="text-2xl font-bold text-slate-800 mt-3">
            Welcome, {contract.clientName}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Please review your California Home Improvement Contract specifications, project dates, and roofing scope of work.
          </p>
        </div>

        {/* Statutory Entitlement Notice */}
        <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl flex items-start gap-3 text-xs text-amber-950 leading-relaxed font-semibold">
          <Info size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong>California Statutory Entitlement:</strong> You are entitled to a completely filled in copy of this agreement, signed by both you and the Contractor, before any work may be started.
          </div>
        </div>

        {/* Agreement Parties & Licensing Warranty */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-700 space-y-2 leading-relaxed">
          <div className="font-bold text-slate-900 text-sm">
            Contract Agreement Parties:
          </div>
          <p>
            This contract (“Contract”) is between <strong>{contract.clientName}</strong> (the “Client”) and <strong>Rise Up Roofing and Construction, Inc.</strong>
            {contract.contractorSignatoryName ? (
              <> / <strong>{contract.contractorSignatoryName}</strong></>
            ) : null}{' '}
            (the “Contractor”).
          </p>
          <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
            <div>
              <strong>A. Licensing:</strong> The Contractor warrants that the Contractor currently holds a valid license, <strong>#1096492 (B/C39/C46)</strong>, under the laws of the State of California to perform the work. The work performed will be done so in compliance with all applicable local, state, or federal statutes and regulations.
            </div>
          </div>
          <div className="text-[11px] text-slate-500 pt-1 flex flex-wrap gap-x-5 gap-y-1">
            <span>Salesperson: <strong>{contract.salespersonName || 'Marc Sarellano'}</strong></span>
            <span>Contract Date: <strong>{contract.contractDate}</strong></span>
            <span>Contract Reference: <strong className="font-mono text-slate-800">{contract.contractNumber}</strong></span>
          </div>
        </div>

        {/* Project Timetable (3 Dates) */}
        <div className="space-y-2">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Project Timetable (Clauses b, c, d)
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                b. Approximate Start Date
              </div>
              <div className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                <Calendar size={14} className="text-sky-600" />
                {contract.approxStartDate}
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                c. Substantial Commencement
              </div>
              <div className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                <Calendar size={14} className="text-amber-500" />
                {contract.substantialCommencementDate}
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                d. Approximate Completion
              </div>
              <div className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                <Calendar size={14} className="text-emerald-600" />
                {contract.approxCompletionDate}
              </div>
            </div>
          </div>
        </div>

        {/* Scope of Work Breakdown (Clause B.a) */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <FileText size={18} className="text-[#1a5ba5]" />
              {contract.scopeTitle || 'Scope of Work & Project Specifications'}
            </h3>
            <span className="text-xs font-bold text-slate-500 font-mono">
              {contract.contractPrice}
            </span>
          </div>
          <div className="text-xs italic text-slate-600 bg-slate-50/80 p-3 rounded-xl border border-slate-200 leading-relaxed">
            {contract.scopeIntro}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {contract.scopeSections.map((sec, i) => (
              <div
                key={i}
                className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-1.5 hover:border-slate-300 transition-colors"
              >
                <h4 className="font-bold text-xs text-slate-900">{sec.heading}</h4>
                <p className="text-xs text-slate-600 leading-relaxed">{sec.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Incorporated Documents (Clause e) & Extra Work / Change Orders (Clause f) */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-700 space-y-3 leading-relaxed">
          <div>
            <strong className="text-slate-900">e. List of documents incorporated into this Agreement:</strong>
            <ul className="list-disc list-inside mt-1 space-y-0.5 text-slate-600 pl-1">
              <li><span className="font-semibold text-slate-700">Exhibit A</span> – Notice of Cancellation Form</li>
              <li><span className="font-semibold text-slate-700">Exhibit B</span> – Extra Work or Change Order Form (if applicable)</li>
            </ul>
          </div>

          <div className="border-t border-slate-200/80 pt-2 space-y-1.5">
            <strong className="text-slate-900">f. Note About Extra Work and Change Orders:</strong>
            <p className="text-slate-600">
              Extra Work and Change Orders become part of the contract once the order is prepared in writing and signed by the parties prior to commencement of work covered by the new order in substantially the same form as attached as Exhibit B. The order must describe the scope of extra work or change, the cost to be added or subtracted, and the effect the order will have on progress payments or completion date.
            </p>
          </div>
        </div>

        {/* Cancellation Contact Notice */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 leading-relaxed">
          <strong>Notice of Cancellation Location:</strong> A Notice of Cancellation may be sent to Rise Up Roofing and Construction, Inc. at 2182 S El Camino Real, Suite 202, Oceanside, CA 92054 or by email at <strong>{contract.cancellationEmail}</strong>.
        </div>

        {/* Acknowledgment Checkbox */}
        <label className="flex items-start gap-3 p-4 bg-sky-50/60 border border-sky-100 rounded-2xl cursor-pointer">
          <input
            type="checkbox"
            checked={agreeScope}
            onChange={(e) => onAgreeScopeChange(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded text-[#1a5ba5] focus:ring-[#1a5ba5] cursor-pointer"
          />
          <span className="text-xs text-slate-700 font-semibold leading-relaxed">
            I have read and confirm that the project location ({contract.projectAddress}), roofing scope of work, project specifications, and timeline accurately reflect my agreement.
          </span>
        </label>

        {/* Next Button */}
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onContinue}
            disabled={!agreeScope}
            className="py-3 px-6 bg-[#1a5ba5] hover:bg-[#154a87] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl flex items-center gap-2 shadow-md transition-all cursor-pointer"
          >
            <span>Continue to Payment Schedule</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
