'use client';

import React, { useEffect, useState, use } from 'react';
import {
  ShieldCheck,
  Check,
  CheckCircle2,
  Calendar,
  Home,
  Phone,
  Clock,
  Sparkles,
  FileCheck,
  Zap,
} from 'lucide-react';
import { ProposalDocumentSkeleton } from '@/components/shared/PortalSkeletons';

interface ProposalData {
  id: number;
  estimateNumber: string;
  status: string;
  customerName: string;
  customerAddress?: string;
  customerCity?: string;
  customerZip?: string;
  serviceType: string;
  roofSquares: number;
  roofPitch: string;
  stories: number;
  materialType: string;
  addons?: { id: string; name: string; unitPrice: number; quantity: number }[];
  total: number;
  financingMonths?: number;
  monthlyPayment?: number;
  validUntil?: string;
  notes?: string;
  createdAt: string;
  acceptedAt?: string;
  signatureName?: string;
}

export default function ClientProposalPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const proposalId = resolvedParams.id;

  const [proposal, setProposal] = useState<ProposalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Acceptance Form
  const [signature, setSignature] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [jobNumber, setJobNumber] = useState('');

  useEffect(() => {
    const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const token = searchParams?.get('token');
    const url = `/api/proposal/${proposalId}${token ? `?token=${encodeURIComponent(token)}` : ''}`;

    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error('Proposal not found or link has expired');
        return res.json();
      })
      .then(data => {
        setProposal(data.proposal);
        if (data.proposal.status === 'accepted') {
          setSuccess(true);
          setSignature(data.proposal.signatureName || '');
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [proposalId]);

  async function handleAccept(e: React.FormEvent) {
    e.preventDefault();
    if (!signature.trim()) {
      alert('Please type your full legal name to digitally sign.');
      return;
    }
    if (!agreed) {
      alert('Please check the acknowledgment box to authorize the proposal.');
      return;
    }

    setSubmitting(true);
    try {
      const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
      const token = searchParams?.get('token');

      const res = await fetch(`/api/proposal/${proposalId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signatureName: signature.trim(), token }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to sign proposal');
      }

      const d = await res.json();
      setSuccess(true);
      setJobNumber(d.jobNumber || '');
    } catch (err: any) {
      alert(err.message || 'Error signing proposal');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <ProposalDocumentSkeleton />;
  }

  if (error || !proposal) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-4 bg-slate-900 border border-white/10 p-8 rounded-3xl">
          <div className="w-12 h-12 rounded-full bg-red-500/15 text-red-400 flex items-center justify-center mx-auto">
            !
          </div>
          <h1 className="text-xl font-bold">Proposal Link Not Found</h1>
          <p className="text-slate-400 text-sm">
            {error || 'This estimate proposal may have expired or been updated.'}
          </p>
          <a
            href="tel:7606221230"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-sm"
          >
            <Phone size={16} /> Call (760) 622-1230
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white py-8 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Brand Header */}
        <div className="bg-slate-900/90 border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-slate-950 font-black shadow-lg">
              <Zap size={22} className="text-slate-950 fill-slate-950" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight">Rise Up Roofing</h2>
              <p className="text-amber-400 text-xs font-semibold uppercase tracking-wider">
                &amp; Construction • CA Lic #1096492
              </p>
            </div>
          </div>

          <div className="text-center sm:text-right">
            <span className="text-[11px] font-mono font-bold px-3 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300">
              {proposal.estimateNumber}
            </span>
            <p className="text-slate-500 text-xs mt-1">
              Prepared on {new Date(proposal.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Client & Project Header */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-900/90 to-amber-950/20 border border-white/10 rounded-3xl p-6 space-y-3">
          <span className="text-xs uppercase font-bold text-amber-400 tracking-wider">
            Official Roofing Proposal
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            Prepared for {proposal.customerName}
          </h1>
          {proposal.customerAddress && (
            <p className="text-slate-300 text-sm flex items-center gap-2">
              <Home size={16} className="text-slate-500 flex-shrink-0" />
              <span>
                {proposal.customerAddress}{proposal.customerCity ? `, ${proposal.customerCity}` : ''} {proposal.customerZip || ''}
              </span>
            </p>
          )}
        </div>

        {/* Inclusions & Scope */}
        <div className="bg-slate-900/80 border border-white/10 rounded-3xl p-6 space-y-5">
          <h3 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck size={18} className="text-amber-400" />
            Scope of Work &amp; Specifications
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3.5 bg-slate-800/60 rounded-2xl border border-white/5">
              <p className="text-[11px] text-slate-400 font-medium">Roof Surface</p>
              <p className="text-base font-bold text-white mt-0.5">
                {proposal.roofSquares} Squares
              </p>
              <p className="text-[10px] text-slate-500">({Number(proposal.roofSquares) * 100} sq ft)</p>
            </div>

            <div className="p-3.5 bg-slate-800/60 rounded-2xl border border-white/5">
              <p className="text-[11px] text-slate-400 font-medium">Material</p>
              <p className="text-sm font-bold text-white mt-0.5 truncate">{proposal.materialType}</p>
            </div>

            <div className="p-3.5 bg-slate-800/60 rounded-2xl border border-white/5">
              <p className="text-[11px] text-slate-400 font-medium">Roof Pitch</p>
              <p className="text-base font-bold text-white mt-0.5">{proposal.roofPitch}</p>
            </div>
          </div>

          {/* Key Standard Guarantees */}
          <div className="space-y-2 pt-2">
            <h4 className="text-xs uppercase font-bold text-slate-400 tracking-wider">
              Every Rise Up Installation Includes:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <Check size={14} className="text-emerald-400 flex-shrink-0" />
                <span>Full tear-off &amp; complete nail inspection</span>
              </div>
              <div className="flex items-center gap-2">
                <Check size={14} className="text-emerald-400 flex-shrink-0" />
                <span>Heavy-duty synthetic water barrier underlayment</span>
              </div>
              <div className="flex items-center gap-2">
                <Check size={14} className="text-emerald-400 flex-shrink-0" />
                <span>New 26-gauge galvanized drip edge &amp; flashings</span>
              </div>
              <div className="flex items-center gap-2">
                <Check size={14} className="text-emerald-400 flex-shrink-0" />
                <span>Continuous magnetic nail sweep &amp; cleanup</span>
              </div>
            </div>
          </div>

          {/* Add-ons & Custom Scope */}
          {proposal.addons && proposal.addons.length > 0 && (
            <div className="pt-3 border-t border-white/5 space-y-2">
              <h4 className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                Custom Inclusions &amp; Options:
              </h4>
              <div className="space-y-1.5">
                {proposal.addons.map((add, i) => (
                  <div key={i} className="flex justify-between items-center text-xs p-2.5 bg-slate-800/40 rounded-xl">
                    <span className="text-slate-200 font-medium">
                      {add.name} (Quantity: {add.quantity})
                    </span>
                    <span className="text-amber-400 font-bold">Included</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {proposal.notes && (
            <div className="p-3.5 rounded-2xl bg-white/2 border border-white/5 text-xs text-slate-300 leading-relaxed">
              <strong>Special Instructions:</strong> {proposal.notes}
            </div>
          )}
        </div>

        {/* Total Investment & Financing */}
        <div className="bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-transparent border border-amber-500/30 rounded-3xl p-6 sm:p-8 text-center space-y-3">
          <span className="text-xs uppercase font-extrabold text-amber-400 tracking-widest">
            Total Investment
          </span>
          <p className="text-4xl sm:text-5xl font-black text-white tabular-nums">
            ${Number(proposal.total).toLocaleString()}
          </p>

          {proposal.monthlyPayment && (
            <div className="inline-block px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs sm:text-sm font-bold mt-1">
              or ${proposal.monthlyPayment}/mo with 0% APR Financing ({proposal.financingMonths || 60} Mos)
            </div>
          )}

          <p className="text-xs text-slate-400 pt-1">
            Price includes all labor, permits, disposal, and 50-year manufacturer warranty.
          </p>
        </div>

        {/* Digital Signature & Acceptance Section */}
        {success ? (
          <div className="bg-emerald-500/15 border border-emerald-500/30 rounded-3xl p-8 text-center space-y-3 shadow-xl">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 size={32} />
            </div>
            <h2 className="text-2xl font-black text-white">Proposal Officially Signed!</h2>
            <p className="text-sm text-slate-300 max-w-md mx-auto">
              Thank you, <strong>{signature || proposal.signatureName}</strong>. Your project authorization has been recorded. Our production coordinator will contact you shortly to schedule city permitting and material drop-off.
            </p>
            {jobNumber && (
              <p className="text-xs font-mono font-bold text-amber-400">
                Project Tracking #: {jobNumber}
              </p>
            )}
            <div className="pt-2">
              <a
                href="tel:7606221230"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-slate-950 font-bold rounded-xl text-sm"
              >
                <Phone size={16} /> Questions? Call (760) 622-1230
              </a>
            </div>
          </div>
        ) : (
          <form onSubmit={handleAccept} className="bg-slate-900/80 border border-white/10 rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FileCheck size={20} className="text-amber-400" />
                Digital Authorization &amp; Signature
              </h3>
              <p className="text-slate-400 text-xs mt-0.5">
                Sign electronically below to lock in pricing and initiate scheduling.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Type Full Legal Name (Electronic Signature) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. David Martinez"
                  value={signature}
                  onChange={e => setSignature(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-800 border border-white/10 text-white placeholder-slate-500 font-serif text-lg italic focus:outline-none focus:border-amber-400 shadow-inner"
                />
              </div>

              <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/3 border border-white/5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={e => setAgreed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-slate-700 text-amber-500 focus:ring-amber-400 cursor-pointer"
                />
                <span className="text-xs text-slate-300 leading-relaxed">
                  I accept this proposal, authorize Rise Up Roofing &amp; Construction to secure building permits, and agree to the contract specifications as outlined.
                </span>
              </label>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-extrabold text-base shadow-xl active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <FileCheck size={20} />
                {submitting ? 'Submitting Signature...' : 'Accept Proposal & Authorize Work'}
              </button>
            </div>
          </form>
        )}

        {/* Footer Support */}
        <div className="text-center text-xs text-slate-500 space-y-1 pt-4">
          <p>Rise Up Roofing &amp; Construction • San Diego County &amp; Riverside County</p>
          <p>Direct Assistance: (760) 622-1230 • License #1096492</p>
        </div>
      </div>
    </div>
  );
}
