import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  FileText,
  X,
  ChevronRight,
  ChevronLeft,
  Send,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  ExternalLink,
  UserCheck,
  MapPin,
  Phone,
  Mail,
} from 'lucide-react';
import { buildContract, sendContract, previewContractUrl } from '@/api/contractApi';
import { fetchClient360 } from '@/api/clientsApi';
import type { BackendClient } from '@/types/backendTypes';
import type { PipelineDealItem } from '@/components/pipeline/pipelineTypes';

import type { ContractFormState } from './contract/contractTypes';
import { DEFAULT_SCOPE_SECTIONS, autoSplitPayments, sumPayments } from './contract/contractTypes';
import { ContractStep1ProjectInfo } from './contract/ContractStep1ProjectInfo';
import { ContractStep2Scope } from './contract/ContractStep2Scope';
import { ContractStep3Payments } from './contract/ContractStep3Payments';
import { ContractStep4ReviewSend } from './contract/ContractStep4ReviewSend';

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

interface ContractBuilderModalProps {
  deal: PipelineDealItem;
  isOpen: boolean;
  onClose: () => void;
  onContractSent: () => void;
}

// ─────────────────────────────────────────────────────────────────
// Step indicator
// ─────────────────────────────────────────────────────────────────

const STEPS = [
  { label: 'Project Info', short: '1' },
  { label: 'Scope', short: '2' },
  { label: 'Payments', short: '3' },
  { label: 'Review & Send', short: '4' },
];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-1.5 px-6 py-3 border-b border-slate-200/80 dark:border-white/10 bg-slate-50/60 dark:bg-white/[0.02]">
      {STEPS.map((s, i) => {
        const active = i === current;
        const done = i < current;
        return (
          <React.Fragment key={i}>
            <div className="flex items-center gap-1.5">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black transition-colors ${
                  done
                    ? 'bg-emerald-500 text-white'
                    : active
                    ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-sm'
                    : 'bg-slate-200 dark:bg-white/10 text-slate-400 dark:text-slate-500'
                }`}
              >
                {done ? <CheckCircle2 size={12} /> : s.short}
              </div>
              <span
                className={`hidden sm:block text-[11px] font-bold transition-colors ${
                  active
                    ? 'text-amber-700 dark:text-amber-400'
                    : done
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`flex-1 h-0.5 rounded-full transition-colors ${
                  done ? 'bg-emerald-400' : 'bg-slate-200 dark:bg-white/10'
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────

export function ContractBuilderModal({
  deal,
  isOpen,
  onClose,
  onContractSent,
}: ContractBuilderModalProps) {
  const [step, setStep] = useState(0);
  const [isBuilding, setIsBuilding] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [builtContractId, setBuiltContractId] = useState<number | null>(null);
  const [builtContractNumber, setBuiltContractNumber] = useState<string>('');
  const [builtPdfUrl, setBuiltPdfUrl] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toEmail, setToEmail] = useState(deal.email || '');
  const [customMessage, setCustomMessage] = useState('');
  // Client 360 profile — the source of truth for address/phone/email validation
  const [clientProfile, setClientProfile] = useState<BackendClient | null>(null);
  const [clientLoading, setClientLoading] = useState(false);

  // ── Pre-fill form from deal ──
  const today = new Date();
  const contractDate = today.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const contractDateShort = today.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  });
  const startDateDefault = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString(
    'en-US',
    { month: 'long', day: 'numeric', year: 'numeric' }
  );
  const completionDateDefault = new Date(
    today.getTime() + 28 * 24 * 60 * 60 * 1000
  ).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const cancellationDeadlineDefault = new Date(
    today.getTime() + 3 * 24 * 60 * 60 * 1000
  ).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const formatProjectAddress = (address?: string, city?: string) => {
    const cleanAddr = (address || '').trim();
    const cleanCity = (city || '').trim();
    if (cleanAddr && cleanCity) {
      if (cleanAddr.toLowerCase().includes(cleanCity.toLowerCase())) {
        return cleanAddr.includes('CA') ? cleanAddr : `${cleanAddr}, CA`;
      }
      return `${cleanAddr}, ${cleanCity}, CA`;
    }
    if (cleanAddr) return cleanAddr.includes('CA') ? cleanAddr : `${cleanAddr}, CA`;
    if (cleanCity) return `${cleanCity}, CA`;
    return '';
  };

  const [form, setForm] = useState<ContractFormState>({
    clientName: deal.name || '',
    projectAddress: formatProjectAddress(deal.address, deal.city),
    contractDate,
    contractDateShort,
    startDate: startDateDefault,
    commencementDate: startDateDefault,
    completionDate: completionDateDefault,
    salespersonName: deal.estimator?.name || '',
    contractorName: 'Rise Up Roofing & Construction',
    contractorTitle: 'Authorized Representative',
    licenseNumber: 'CSLB #1089123',
    cancellationDeadline: cancellationDeadlineDefault,
    scopeTitle: `${deal.service || 'Roofing'} – Roofing Project`,
    scopeSections: DEFAULT_SCOPE_SECTIONS,
    contractPrice: deal.value ? String(deal.value) : '',
    downpayment: deal.value ? String(Math.round(deal.value * 0.1)) : '',
    financeCharge: '0.00',
    paymentRows: deal.value ? autoSplitPayments(String(deal.value)) : [],
  });

  // Lock body scroll
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Reset on open + fetch client 360 profile for real address/contact info
  useEffect(() => {
    if (!isOpen) return;
    setStep(0);
    setBuiltContractId(null);
    setBuiltContractNumber('');
    setBuiltPdfUrl(null);
    setSendSuccess(false);
    setErrorMsg(null);
    setToEmail(deal.email || '');
    setCustomMessage('');
    setClientProfile(null);

    // Fetch the client's 360 profile to get their canonical address
    if (deal.clientId) {
      setClientLoading(true);
      fetchClient360(deal.clientId)
        .then((res) => {
          const c = res.client;
          setClientProfile(c);
          // Prefill projectAddress from the CLIENT record, not the lead
          const clientAddr = [c.address, c.city, c.zip_code || c.zip]
            .filter(Boolean).join(', ');
          setForm((prev) => ({
            ...prev,
            clientName: c.full_name || deal.name || '',
            projectAddress: clientAddr || '',
            salespersonName: deal.estimator?.name || prev.salespersonName,
            scopeTitle: `${deal.service || 'Roofing'} – Roofing Project`,
            contractPrice: deal.value ? String(deal.value) : prev.contractPrice,
            downpayment: deal.value ? String(Math.round(deal.value * 0.1)) : prev.downpayment,
            paymentRows: deal.value ? autoSplitPayments(String(deal.value)) : prev.paymentRows,
          }));
        })
        .catch(() => {
          // Fallback to lead data if client fetch fails
          setForm((prev) => ({
            ...prev,
            clientName: deal.name || '',
            projectAddress: formatProjectAddress(deal.address, deal.city),
            salespersonName: deal.estimator?.name || prev.salespersonName,
            scopeTitle: `${deal.service || 'Roofing'} – Roofing Project`,
            contractPrice: deal.value ? String(deal.value) : prev.contractPrice,
            downpayment: deal.value ? String(Math.round(deal.value * 0.1)) : prev.downpayment,
            paymentRows: deal.value ? autoSplitPayments(String(deal.value)) : prev.paymentRows,
          }));
        })
        .finally(() => setClientLoading(false));
    } else {
      // No client linked — fall back to lead data
      setForm((prev) => ({
        ...prev,
        clientName: deal.name || '',
        projectAddress: formatProjectAddress(deal.address, deal.city),
        salespersonName: deal.estimator?.name || prev.salespersonName,
        scopeTitle: `${deal.service || 'Roofing'} – Roofing Project`,
        contractPrice: deal.value ? String(deal.value) : prev.contractPrice,
        downpayment: deal.value ? String(Math.round(deal.value * 0.1)) : prev.downpayment,
        paymentRows: deal.value ? autoSplitPayments(String(deal.value)) : prev.paymentRows,
      }));
    }
  }, [isOpen, deal]);

  const updateForm = useCallback(<K extends keyof ContractFormState>(
    key: K,
    val: ContractFormState[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  }, []);

  // ── Pre-flight validation: use CLIENT 360 data as the source of truth ──
  // The lead record may have stale/test address data; the client profile is canonical.
  const missingFields = useMemo(() => {
    // While loading client data, show nothing missing (gate shows loading state)
    if (clientLoading) return [];

    const missing: { label: string; field: string; icon: React.ReactNode }[] = [];

    // Use client profile if available, otherwise fall back to lead data
    const addr = clientProfile ? (clientProfile.address || '') : (deal.address || '');
    const phone = clientProfile ? (clientProfile.phone || '') : (deal.phone || '');
    const email = clientProfile ? (clientProfile.email || '') : (deal.email || '');

    if (!addr.trim() || addr.toLowerCase().includes('pending')) {
      missing.push({ label: 'Property Address', field: 'address', icon: <MapPin size={15} /> });
    }
    if (!phone.trim()) {
      missing.push({ label: 'Phone Number', field: 'phone', icon: <Phone size={15} /> });
    }
    if (!email.trim()) {
      missing.push({ label: 'Email Address', field: 'email', icon: <Mail size={15} /> });
    }
    return missing;
  }, [clientProfile, clientLoading, deal.address, deal.phone, deal.email]);


  // ── Step 3 → 4: Build contract (generate PDF) ──
  const handleBuild = useCallback(async () => {
    setIsBuilding(true);
    setErrorMsg(null);
    try {
      const total = sumPayments(form.paymentRows);
      const payload = {
        lead_id: parseInt(deal.id, 10),
        estimate_id: null,
        contract_data: {
          project_address: form.projectAddress,
          client_name: form.clientName,
          contractor_name: form.contractorName,
          contractor_title: form.contractorTitle,
          salesperson_name: form.salespersonName,
          contract_date: form.contractDate,
          contract_date_short: form.contractDateShort,
          scope_title: form.scopeTitle,
          scope_sections: form.scopeSections,
          start_date: form.startDate,
          commencement_date: form.commencementDate,
          completion_date: form.completionDate,
          contract_price: form.contractPrice,
          finance_charge: form.financeCharge,
          downpayment: form.downpayment,
          payment_schedule: form.paymentRows,
          payment_schedule_total: String(total),
          license_number: form.licenseNumber,
          cancellation_deadline: form.cancellationDeadline,
        },
      };
      const res = await buildContract(payload);
      setBuiltContractId(res.contract_id);
      setBuiltContractNumber(res.contract_number);
      setBuiltPdfUrl(res.pdf_url || null);
      setStep(3);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to generate contract. Please try again.');
    } finally {
      setIsBuilding(false);
    }
  }, [form, deal.id]);

  // ── Step 4: Send contract email ──
  const handleSend = useCallback(async () => {
    if (!builtContractId) return;
    if (!toEmail.trim()) {
      setErrorMsg('Please enter a recipient email address.');
      return;
    }
    setIsSending(true);
    setErrorMsg(null);
    try {
      await sendContract(builtContractId, toEmail.trim(), customMessage.trim() || undefined);
      setSendSuccess(true);
      setTimeout(() => {
        onContractSent();
      }, 1800);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to send contract. Please try again.');
    } finally {
      setIsSending(false);
    }
  }, [builtContractId, toEmail, customMessage, onContractSent]);

  const totalPayments = sumPayments(form.paymentRows);
  const contractPriceNum = parseFloat(form.contractPrice.replace(/[^0-9.]/g, '')) || 0;
  const totalMismatch =
    form.paymentRows.length > 0 &&
    contractPriceNum > 0 &&
    Math.abs(totalPayments - contractPriceNum) > 0.5;

  if (!isOpen) return null;

  // ─────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xl animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-3xl bg-white/95 dark:bg-[#0B1320]/97 backdrop-blur-3xl border border-white/90 dark:border-white/10 rounded-3xl shadow-[0_30px_100px_rgba(0,0,0,0.45)] animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh] overflow-hidden"
      >
        {/* Top specular bevel */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 dark:via-white/20 to-transparent pointer-events-none" />

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/80 dark:border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <FileText size={18} />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                Build & Send Contract
              </h2>
              <p className="text-[11px] text-slate-400 font-medium">{deal.name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-all cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Pre-flight Validation Gate ── */}
        {clientLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 p-10">
            <Loader2 size={28} className="animate-spin text-amber-500" />
            <p className="text-sm text-slate-400 font-medium">Verifying client profile…</p>
          </div>
        ) : missingFields.length > 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-6">
            {/* Icon */}
            <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
              <UserCheck size={28} className="text-amber-600 dark:text-amber-400" />
            </div>

            {/* Heading */}
            <div className="space-y-2 max-w-sm">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Client Profile Incomplete
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Before building a contract for <span className="font-bold text-slate-700 dark:text-slate-200">{deal.name}</span>, the following required details must be on file:
              </p>
            </div>

            {/* Missing fields list */}
            <div className="w-full max-w-xs space-y-2">
              {missingFields.map((f) => (
                <div
                  key={f.field}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 text-rose-700 dark:text-rose-300"
                >
                  <span className="shrink-0">{f.icon}</span>
                  <span className="text-sm font-semibold">{f.label} is missing</span>
                </div>
              ))}
            </div>

            {/* Instruction */}
            <div className="max-w-sm space-y-4">
              <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
                Go to <strong className="text-slate-600 dark:text-slate-300">Clients 360</strong>, open this client's profile, and add the missing details. Then come back here to build the contract.
              </p>

              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                >
                  Close
                </button>
                {deal.clientId && (
                  <a
                    href={`/clients?id=${deal.clientId}`}
                    onClick={onClose}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors cursor-pointer shadow-sm"
                  >
                    <ExternalLink size={13} />
                    Open Client 360 Profile
                  </a>
                )}
              </div>
            </div>
          </div>
        ) : (
          <>
        {/* ── Step Indicator ── */}
        <StepIndicator current={step} />

        {/* ── Success Banner ── */}
        {sendSuccess && (
          <div className="mx-6 mt-4 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 flex items-center gap-3 animate-in fade-in duration-300">
            <CheckCircle2 size={20} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
            <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
              Contract sent! Deal moved to Contract Sent stage.
            </p>
          </div>
        )}

        {/* ── Error Banner ── */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40 flex items-start gap-2.5">
            <AlertTriangle size={16} className="text-rose-500 shrink-0 mt-0.5" />
            <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">{errorMsg}</p>
          </div>
        )}

        {/* ── Scrollable Body ── */}
        <div className="overflow-y-auto flex-1 px-6 py-5">

          {/* ══════════════════════════════════════════════════ */}
          {/* STEP 1 — Project Info                             */}
          {/* ══════════════════════════════════════════════════ */}
          {step === 0 && <ContractStep1ProjectInfo form={form} onChange={(patch) => setForm(f => ({...f, ...patch}))} />}

          {/* ══════════════════════════════════════════════════ */}
          {/* STEP 2 — Scope of Work                            */}
          {/* ══════════════════════════════════════════════════ */}
          {step === 1 && <ContractStep2Scope form={form} onChange={(patch) => setForm(f => ({...f, ...patch}))} />}

          {/* ══════════════════════════════════════════════════ */}
          {/* STEP 3 — Payment Schedule                         */}
          {/* ══════════════════════════════════════════════════ */}
          {step === 2 && <ContractStep3Payments form={form} onChange={(patch) => setForm(f => ({...f, ...patch}))} />}

          {/* ══════════════════════════════════════════════════ */}
          {/* STEP 4 — Review & Send                            */}
          {/* ══════════════════════════════════════════════════ */}
          {step === 3 && (
            <ContractStep4ReviewSend
              form={form}
              toEmail={toEmail}
              setToEmail={setToEmail}
              customMessage={customMessage}
              setCustomMessage={setCustomMessage}
              isBuilding={isBuilding}
              isSending={isSending}
              builtContractId={builtContractId}
              builtContractNumber={builtContractNumber}
              builtPdfUrl={builtPdfUrl}
              sendSuccess={sendSuccess}
              errorMsg={errorMsg}
              onBuild={handleBuild}
              onSend={handleSend}
            />
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-4 border-t border-slate-200/80 dark:border-white/10 bg-slate-50/60 dark:bg-white/[0.02] flex items-center justify-between gap-3 shrink-0">
          {/* Back / Cancel */}
          {step === 0 ? (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-all cursor-pointer"
            >
              Cancel
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              disabled={isBuilding || isSending || sendSuccess}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <ChevronLeft size={14} />
              Back
            </button>
          )}

          {/* Next / Build / Send */}
          {step < 2 && (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              Next
              <ChevronRight size={14} />
            </button>
          )}

          {step === 2 && (
            <button
              type="button"
              onClick={handleBuild}
              disabled={isBuilding || totalMismatch}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 text-white font-black text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isBuilding ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Generating PDF…
                </>
              ) : (
                <>
                  <FileText size={14} />
                  Generate Contract
                </>
              )}
            </button>
          )}

          {step === 3 && (
            <button
              type="button"
              onClick={handleSend}
              disabled={isSending || sendSuccess || !toEmail.trim()}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm flex items-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSending ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Sending…
                </>
              ) : sendSuccess ? (
                <>
                  <CheckCircle2 size={15} />
                  Sent!
                </>
              ) : (
                <>
                  <Send size={15} />
                  Send Contract
                </>
              )}
            </button>
          )}
        </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
