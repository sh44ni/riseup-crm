import React, { useState, useRef, useEffect } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  FileText,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Printer,
  ChevronDown,
  Layers,
} from 'lucide-react';
import type { ContractStudioData } from '@/types/contractStudioTypes';

interface ContractLivePreviewProps {
  data: ContractStudioData;
  activeStep?: number;
  previewPageFocus?: number;
}

export function ContractLivePreview({
  data,
  activeStep = 0,
  previewPageFocus = 1,
}: ContractLivePreviewProps) {
  const [zoom, setZoom] = useState<number>(100);
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeSection, setActiveSection] = useState<'all' | 'scope' | 'payments' | 'terms' | 'cancellation' | 'cert'>('all');

  // Format currency
  const fmt = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val || 0);

  const totalPayments = (data.paymentSchedule || []).reduce((acc, row) => acc + (Number(row.amount) || 0), 0);

  return (
    <div className="flex flex-col h-full bg-slate-900/95 text-slate-100 select-none overflow-hidden">
      {/* ── PREVIEW TOOLBAR ── */}
      <div className="h-12 px-4 bg-slate-950/80 border-b border-white/10 flex items-center justify-between flex-shrink-0 backdrop-blur-md">
        {/* Left: Document metadata */}
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-xs font-bold text-slate-200 tracking-wide flex items-center gap-1.5 font-mono">
            <FileText size={13} className="text-amber-400" />
            <span>{data.contractNumber || 'RU-2026-DRAFT'}</span>
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-slate-300 font-semibold border border-white/5">
            California CSLB Compliant
          </span>
        </div>

        {/* Center: Section Jump Tabs */}
        <div className="hidden lg:flex items-center gap-1 bg-white/5 p-1 rounded-lg border border-white/5 text-[11px]">
          {[
            { id: 'all', label: 'Full Agreement' },
            { id: 'scope', label: 'Scope' },
            { id: 'payments', label: 'Payments' },
            { id: 'terms', label: 'Terms' },
            { id: 'cancellation', label: 'Cancellation' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSection(tab.id as any)}
              className={`px-2.5 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                activeSection === tab.id
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Right: Zoom controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white/5 rounded-lg border border-white/10 p-0.5 text-xs font-mono">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(65, z - 10))}
              className="p-1 text-slate-400 hover:text-white hover:bg-white/10 rounded cursor-pointer"
              title="Zoom out"
            >
              <ZoomOut size={13} />
            </button>
            <span className="px-2 font-bold text-slate-200 text-[11px]">{zoom}%</span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(140, z + 10))}
              className="p-1 text-slate-400 hover:text-white hover:bg-white/10 rounded cursor-pointer"
              title="Zoom in"
            >
              <ZoomIn size={13} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setZoom(100)}
            className="p-1.5 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-colors cursor-pointer"
            title="Reset Zoom"
          >
            <Maximize2 size={13} />
          </button>
        </div>
      </div>

      {/* ── SCROLLABLE PREVIEW CANVAS ── */}
      <div
        ref={containerRef}
        className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-8 flex justify-center bg-[#0d1522] no-scrollbar"
      >
        <div
          style={{
            transform: `scale(${zoom / 100})`,
            transformOrigin: 'top center',
            transition: 'transform 0.15s ease-out',
          }}
          className="w-[820px] max-w-full flex flex-col gap-6 text-[#1e252d] font-serif shadow-2xl rounded-2xl overflow-hidden mb-12"
        >
          {/* ═════════════════════════════════════════════════════════════════
              PAGE 1: MASTHEAD, PARTIES, ADDRESS, LICENSING & SCOPE OF WORK
              ═════════════════════════════════════════════════════════════════ */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
            {/* Navy Masthead */}
            <div className="bg-[#10263b] text-white p-8 sm:p-10 flex justify-between items-start gap-6 border-b-4 border-[#a67c2e] relative">
              <div className="space-y-1.5">
                <h1 className="text-2xl font-bold font-sans tracking-wide text-white m-0">
                  Rise Up Roofing and Construction, Inc.
                </h1>
                <p className="text-xs text-slate-300 font-sans leading-relaxed m-0">
                  2182 S El Camino Real, Suite 202<br />
                  Oceanside, CA 92054<br />
                  Tel. (442) 266-2443 ext. 2 &nbsp;|&nbsp; Fax. (442) 266-2422<br />
                  <span className="text-amber-400 font-medium">www.riseuprac.com</span>
                </p>
              </div>
              <div className="text-right font-sans font-bold text-xs text-white whitespace-nowrap bg-white/10 px-3 py-2 rounded-xl border border-white/10">
                <span className="block text-amber-400 text-[10px] uppercase tracking-wider">Contractor License</span>
                <span className="text-sm font-extrabold">{data.contractorLicense || '#1096492'}</span>
                <span className="block text-[10px] text-slate-300">Class B / C39 / C46</span>
              </div>
            </div>

            {/* Document Body */}
            <div className="p-8 sm:p-10 space-y-6 text-sm leading-relaxed text-[#1e252d]">
              {/* Fully Executed or Draft Pill */}
              {data.isSigned || data.status === 'signed' ? (
                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-sans">
                  <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
                  <div>
                    <div className="font-extrabold text-xs tracking-wide uppercase">Fully Executed Agreement</div>
                    <div className="text-[11px] text-emerald-700">
                      Signed by all parties &middot; Document ID: {data.contractNumber || 'RU-2026-EXECUTED'}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-[#fdf1f0] border-l-4 border-rose-600 text-rose-800 text-xs font-sans font-semibold text-center rounded-r-lg">
                  A Notice of Cancellation may be sent to Rise Up Roofing and Construction, Inc. at the business address listed above or by email at {data.cancellationEmail || 'accountant@riseuprac.com'}
                </div>
              )}

              {/* Title & Gold Rule */}
              <div className="text-center pt-2">
                <h2 className="text-2xl font-bold font-sans tracking-widest text-[#10263b] uppercase">
                  Home Improvement Contract
                </h2>
                <div className="w-16 h-1 bg-[#a67c2e] mx-auto mt-2 rounded-full" />
              </div>

              {/* Parties Declaration */}
              <p className="text-base text-center text-slate-800">
                This contract <strong>(“Contract”)</strong> is between{' '}
                <strong className="text-[#10263b] underline decoration-amber-400 decoration-2">
                  {data.clientName || '[Homeowner / Client Name]'}
                </strong>{' '}
                <strong>(the “Client”)</strong> and{' '}
                <strong>Rise Up Roofing and Construction, Inc.</strong>{' '}
                <span className="font-bold text-[#10263b]">
                  {data.contractorName || 'Edith Guerrero'}
                </span>{' '}
                <strong>(the “Contractor”)</strong>.
              </p>

              {/* Project Card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 rounded-xl border border-slate-200 border-t-4 border-t-[#10263b] overflow-hidden text-xs font-sans divide-y sm:divide-y-0 sm:divide-x divide-slate-200 bg-slate-50/50">
                <div className="p-3 space-y-1">
                  <span className="block font-bold text-slate-500 uppercase tracking-wider text-[10px]">Project Address:</span>
                  <span className="font-extrabold text-slate-900 text-sm">
                    {data.projectAddress ? `${data.projectAddress}, ${data.city || 'Oceanside'}, ${data.state || 'CA'} ${data.zip || ''}` : '[Enter Property Address]'}
                  </span>
                </div>
                <div className="p-3 space-y-1">
                  <div className="flex justify-between">
                    <div>
                      <span className="block font-bold text-slate-500 uppercase tracking-wider text-[10px]">Contract Date:</span>
                      <span className="font-bold text-slate-800">{data.contractDate || 'September 22, 2026'}</span>
                    </div>
                    <div>
                      <span className="block font-bold text-slate-500 uppercase tracking-wider text-[10px]">Salesperson / PM:</span>
                      <span className="font-bold text-slate-800">{data.salespersonName || 'Marc Sarellano'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Statutory Notice Banner */}
              <div className="p-4 bg-amber-50/80 border-l-4 border-amber-600 rounded-r-xl text-xs font-sans font-bold text-[#10263b] text-center">
                You are entitled to a completely filled in copy of this agreement, signed by both you and the Contractor, before any work may be started.
              </div>

              {/* Section Header */}
              <div className="border-y border-slate-200 py-2.5 text-center">
                <h3 className="text-base font-extrabold font-sans tracking-widest text-[#10263b] uppercase m-0">
                  Agreement Terms &amp; Scope
                </h3>
              </div>

              {/* Section A: Licensing */}
              <div className="space-y-1.5">
                <h4 className="flex items-center gap-2 text-sm font-bold font-sans text-[#10263b] m-0">
                  <span className="w-5 h-5 rounded-full bg-[#10263b] text-white text-xs flex items-center justify-center font-bold">A</span>
                  <span>Licensing:</span>
                </h4>
                <p className="pl-7 text-xs text-slate-700 leading-relaxed m-0">
                  The Contractor warrants that the Contractor currently holds a valid license,{' '}
                  <strong className="text-[#10263b]">{data.contractorLicense || '#1096492'}</strong>, under the laws of the State of California to perform the work. All work will be performed in full compliance with applicable municipal, state, and federal codes.
                </p>
              </div>

              {/* Section B: Scope of Work */}
              <div className="space-y-3">
                <h4 className="flex items-center gap-2 text-sm font-bold font-sans text-[#10263b] m-0">
                  <span className="w-5 h-5 rounded-full bg-[#10263b] text-white text-xs flex items-center justify-center font-bold">B</span>
                  <span>Scope of Work / Payment:</span>
                </h4>
                <div className="pl-7 space-y-3 text-xs text-slate-700">
                  <p className="m-0 font-medium">
                    The Client is hiring the Contractor to complete the following project:<br />
                    <strong className="text-slate-900 text-sm font-sans">{data.scopeTitle || 'Complete Roofing System Installation'}</strong>
                  </p>

                  {/* Scope Box Container */}
                  <div className="p-5 rounded-xl border border-slate-200 border-l-4 border-l-[#10263b] bg-slate-50/70 space-y-3 font-sans">
                    <div className="font-bold text-[#10263b] text-xs underline pb-1">
                      {data.scopeIntro || 'Rise Up Roofing & Construction, Inc. will complete the following roofing, preventative maintenance, exterior waterproofing, and installation work at the property:'}
                    </div>

                    {(data.scopeSections || []).map((sec, i) => (
                      <div key={sec.id || i} className="space-y-1">
                        <div className="font-extrabold text-[#10263b] text-xs flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          <span>{sec.heading}</span>
                        </div>
                        <p className="text-[11.5px] text-slate-600 leading-relaxed pl-3 m-0">
                          {sec.text}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Project Dates */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 font-sans pt-1">
                    <div className="p-3 rounded-lg border border-slate-200 border-t-2 border-t-amber-600 bg-white">
                      <b className="block text-[10px] text-slate-500 uppercase tracking-wider">b. Approx Start Date</b>
                      <span className="font-bold text-slate-900 text-xs">{data.approxStartDate || 'To Be Scheduled'}</span>
                    </div>
                    <div className="p-3 rounded-lg border border-slate-200 border-t-2 border-t-amber-600 bg-white">
                      <b className="block text-[10px] text-slate-500 uppercase tracking-wider">c. Substantial Commencement</b>
                      <span className="font-bold text-slate-900 text-xs">{data.substantialCommencementDate || 'Within 5 days of start'}</span>
                    </div>
                    <div className="p-3 rounded-lg border border-slate-200 border-t-2 border-t-amber-600 bg-white">
                      <b className="block text-[10px] text-slate-500 uppercase tracking-wider">d. Approx Completion</b>
                      <span className="font-bold text-slate-900 text-xs">{data.approxCompletionDate || 'Per Project Schedule'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ═════════════════════════════════════════════════════════════════
              PAGE 2: PRICING, PAYMENT SCHEDULE, DOWNPAYMENT & INITIALS
              ═════════════════════════════════════════════════════════════════ */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200 p-8 sm:p-10 space-y-6 text-sm text-[#1e252d]">
            {/* Price Cards Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-sans">
              <div className="p-4 rounded-xl bg-[#10263b] text-white text-center">
                <span className="block text-[10px] uppercase font-bold text-amber-300 tracking-wider">g. Total Contract Price</span>
                <span className="text-xl font-extrabold">{fmt(data.contractPrice || 31000)}</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 text-center">
                <span className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">h. Finance Charge</span>
                <span className="text-xl font-bold text-slate-800">{data.financeCharge || 'N/A'}</span>
              </div>
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-center">
                <span className="block text-[10px] uppercase font-bold text-amber-800 tracking-wider">i. Initial Downpayment</span>
                <span className="text-xl font-extrabold text-amber-950">{fmt(data.downpayment || 1000)}</span>
              </div>
            </div>

            {/* CSLB Downpayment Law Alert */}
            <div className="p-3 rounded-xl bg-slate-50 border-2 border-[#10263b] text-center font-sans font-extrabold text-xs text-[#10263b]">
              THE DOWNPAYMENT MAY NOT EXCEED $1,000.00 OR 10 PERCENT OF THE CONTRACT PRICE, WHICHEVER IS LESS.
            </div>

            {/* Schedule of Progress Payments Table */}
            <div className="space-y-3 font-sans">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-bold text-[#10263b] m-0">
                  j. Schedule of Progress Payments:
                </h4>
                <span className="text-xs text-slate-500">
                  Total Scheduled: <strong className="text-slate-900">{fmt(totalPayments)}</strong>
                </span>
              </div>

              <div className="rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-[#10263b] text-white">
                      <th className="py-2.5 px-3 w-12 text-center">#</th>
                      <th className="py-2.5 px-3">Milestone / Deliverable Description</th>
                      <th className="py-2.5 px-3 text-right w-28">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(data.paymentSchedule || []).map((row, idx) => (
                      <tr key={row.id || idx} className={idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-400">{row.number || `${idx + 1}.`}</td>
                        <td className="py-2.5 px-3 font-medium text-slate-800">{row.description}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900 font-mono">{fmt(row.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-[#10263b] bg-slate-100 font-extrabold text-xs">
                      <td colSpan={2} className="py-2.5 px-3 text-right text-slate-700 uppercase tracking-wider">Total Contract Sum:</td>
                      <td className="py-2.5 px-3 text-right font-black text-[#10263b] font-mono text-sm">{fmt(totalPayments)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Initials Mark for Payment Schedule */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50/80 border border-dashed border-amber-400">
                <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                  Client Initials (Payment Schedule):
                </span>
                <div className="w-32 py-1 px-3 border-b-2 border-slate-900 text-center">
                  <span className="font-serif italic text-xl font-bold text-blue-900">
                    {data.clientInitials || ''}
                  </span>
                  <small className="block text-[9px] text-slate-400 font-sans">{data.contractDateShort || 'Sep 22, 2026'}</small>
                </div>
              </div>
            </div>

            {/* Payment Terms Subsections */}
            <div className="space-y-2 text-xs text-slate-700 leading-relaxed font-sans">
              <h4 className="text-sm font-bold text-[#10263b] m-0 font-serif">k. Payment Terms &amp; Conditions:</h4>
              <p className="m-0">
                Payment shall be made to Rise Up Roofing and Construction, Inc. via check, electronic bank transfer, or authorized progress disbursement. If any invoices are not paid when due, work may be suspended per California Civil Code.
              </p>
              <ul className="list-disc pl-5 space-y-1 text-slate-600 text-[11.5px]">
                <li><strong>Invoices:</strong> Invoices are due upon completion of each specified project milestone.</li>
                <li><strong>Late Payments:</strong> Delinquent accounts past 4 days subject to a standard late administrative fee.</li>
                <li><strong>Lien Release:</strong> Upon satisfactory payment, Contractor will provide unconditional statutory lien waivers.</li>
                <li><strong>Refund Policy:</strong> Custom ordered roofing materials and completed stages are non-refundable.</li>
              </ul>

              {/* Initials Mark for Payment Terms */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50/80 border border-dashed border-amber-400 mt-3">
                <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                  Client Initials (Payment Terms &amp; Lien Releases):
                </span>
                <div className="w-32 py-1 px-3 border-b-2 border-slate-900 text-center">
                  <span className="font-serif italic text-xl font-bold text-blue-900">
                    {data.clientInitials || ''}
                  </span>
                  <small className="block text-[9px] text-slate-400 font-sans">{data.contractDateShort || 'Sep 22, 2026'}</small>
                </div>
              </div>
            </div>
          </div>

          {/* ═════════════════════════════════════════════════════════════════
              PAGE 3: MECHANICS LIEN, CSLB INFO, INSURANCE & SIGNATURES
              ═════════════════════════════════════════════════════════════════ */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200 p-8 sm:p-10 space-y-6 text-sm text-[#1e252d]">
            {/* Mechanics Lien Warning Banner */}
            <div className="p-5 rounded-xl bg-[#fff9ea] border border-[#e6d29a] border-l-4 border-l-[#a67c2e] text-xs font-sans leading-relaxed space-y-2">
              <div className="font-extrabold text-[#10263b] text-sm uppercase tracking-wide flex items-center gap-1.5">
                <ShieldCheck size={16} className="text-amber-700" />
                <span>Mechanics Lien Warning:</span>
              </div>
              <p className="m-0 text-slate-700">
                Anyone who helps improve your property, but who is not paid, may record what is called a mechanics lien on your property. Even if you pay your contractor in full, unpaid subcontractors, suppliers, and laborers who helped improve your property may record liens.
              </p>
              <p className="m-0 text-slate-700 font-bold">
                PROTECT YOURSELF FROM LIENS. You can protect yourself by requesting lien release waivers from your contractor for all finished progress milestones.
              </p>
            </div>

            {/* Insurance Disclosures */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-sans">
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1">
                <span className="font-bold text-[#10263b] block">Commercial General Liability</span>
                <p className="text-slate-600 text-[11px] m-0">
                  Carried through <strong>{data.insuranceCarrier || 'PACIFIC UNITED INSURANCE SERVICES'}</strong>. Policy certificates available at {data.insurancePhone || '(619) 274-8144'}.
                </p>
              </div>
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1">
                <span className="font-bold text-[#10263b] block">Workers’ Compensation</span>
                <p className="text-slate-600 text-[11px] m-0">
                  Active policy maintained for all personnel through <strong>{data.workersCompCarrier || 'PACIFIC UNITED INSURANCE SERVICES'}</strong>.
                </p>
              </div>
            </div>

            {/* CSLB Consumer Information */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-sans text-slate-600 space-y-1">
              <strong className="text-slate-900 block">Contractors State License Board (CSLB) Information:</strong>
              <p className="text-[11px] m-0">
                CSLB is the California state consumer protection agency. Contact CSLB at <strong>www.cslb.ca.gov</strong>, call <strong>(800) 321-CSLB (2752)</strong>, or write P.O. Box 26000, Sacramento, CA 95826.
              </p>
            </div>

            {/* Signature Block */}
            <div className="pt-4 border-t-2 border-slate-200 font-sans space-y-4">
              <div className="font-bold text-sm text-[#10263b]">
                The Parties hereto agree to the foregoing as evidenced by their signatures below:
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                {/* Contractor Signature */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Signature of Contractor
                  </span>
                  <div className="py-2 border-b-2 border-slate-900 min-h-[48px] flex flex-col justify-end">
                    <span className="font-serif italic text-2xl font-bold text-slate-900">
                      {data.contractorSignatureName || ''}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600">
                    <strong>Rise Up Roofing and Construction, Inc.</strong><br />
                    By: {data.contractorName || 'Authorized Signatory'}<br />
                    Title: {data.contractorTitle || 'Project Manager'}
                  </div>
                </div>

                {/* Client Signature */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Signature of Client
                  </span>
                  <div className="py-2 border-b-2 border-slate-900 min-h-[48px] flex flex-col justify-end">
                    <span className="font-serif italic text-2xl font-bold text-blue-900">
                      {data.isSigned ? (data.clientSignatureName || data.clientName || '') : (data.clientSignatureName || '')}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600">
                    <strong>{data.clientName || 'Homeowner / Client'}</strong><br />
                    Date: {data.isSigned ? (data.contractDate || 'September 22, 2026') : '____________________'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ═════════════════════════════════════════════════════════════════
              PAGE 4: THREE-DAY RIGHT TO CANCEL ADDENDUM & EXHIBIT A
              ═════════════════════════════════════════════════════════════════ */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200 p-8 sm:p-10 space-y-6 text-sm text-[#1e252d]">
            <div className="border-b-2 border-[#10263b] pb-2">
              <h3 className="text-base font-extrabold font-sans tracking-widest text-[#10263b] uppercase m-0">
                Right to Cancel Notice &amp; Addendum
              </h3>
            </div>

            {/* Statutory 3-Day Notice */}
            <div className="space-y-3 font-sans text-xs text-slate-700 leading-relaxed">
              <div className="font-bold text-slate-900 text-sm">Notice of the Three-Day Right to Cancel</div>
              <p className="m-0">
                You, the Client, have the right to cancel this transaction, without any penalty or obligation, within{' '}
                <strong>three business days</strong> from the date of agreement execution. Notice may be delivered in writing or sent by email to{' '}
                <strong>{data.cancellationEmail || 'accountant@riseuprac.com'}</strong>.
              </p>
            </div>

            {/* Exhibit A Form Box */}
            <div className="p-6 rounded-xl border-2 border-slate-300 bg-slate-50/40 space-y-4 font-sans text-xs">
              <div className="text-center font-bold text-sm text-[#10263b] uppercase tracking-wider">
                Exhibit A &middot; Notice of Cancellation
              </div>
              <p className="text-[11px] text-slate-600 m-0 leading-relaxed">
                If you cancel, any payments made by you under this contract will be returned within 10 business days following receipt by Rise Up Roofing and Construction, Inc. of your cancellation notice.
              </p>
              <div className="space-y-2 pt-2 text-[11px] text-slate-700">
                <div>Date of Transaction: <span className="inline-block w-48 border-b border-slate-800 font-bold pl-2">{data.contractDate || 'September 22, 2026'}</span></div>
                <div>Homeowner Signature: <span className="inline-block w-48 border-b border-slate-800"></span></div>
                <div>Cancellation Date: <span className="inline-block w-48 border-b border-slate-800"></span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ContractLivePreview;
