import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft,
  Check,
  Send,
  Loader2,
  Plus,
  Trash2,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  FileText,
  DollarSign,
  Calendar,
  User,
  MapPin,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import {
  ContractStudioData,
  CONTRACT_STUDIO_STEPS,
  DEFAULT_CONTRACT_SECTIONS,
  DEFAULT_CONTRACT_PAYMENTS,
  ContractScopeSection,
  ContractPaymentRow,
} from '@/types/contractStudioTypes';
import { ContractWizardProgress } from './ContractWizardProgress';
import { ContractLivePreview } from './ContractLivePreview';
import { buildContract, sendContract, signContract } from '@/api/contractApi';
import { api } from '@/lib/api';
import { useToast } from '@/context/ToastContext';

interface ContractStudioProps {
  contractId: string | null;
  onBack: () => void;
  prefill?: {
    leadId?: string;
    clientId?: string;
    clientName?: string;
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    service?: string;
    value?: number;
  };
}

const DEFAULT_STUDIO_DATA: ContractStudioData = {
  status: 'draft',
  clientName: '',
  clientPhone: '',
  clientEmail: '',
  projectAddress: '',
  city: 'Oceanside',
  state: 'CA',
  zip: '92054',
  contractorName: 'Edith Guerrero',
  contractorTitle: 'Project Manager',
  contractorLicense: '#1096492',
  salespersonName: 'Marc Sarellano',
  contractDate: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
  contractDateShort: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
  approxStartDate: 'Within 2–3 weeks of permit issue',
  substantialCommencementDate: 'Within 3 days of material delivery',
  approxCompletionDate: '3–5 working days from start',
  scopeTitle: 'Complete Roofing System Installation',
  scopeIntro: 'Rise Up Roofing & Construction, Inc. will complete the following roofing, preventative maintenance, exterior waterproofing, and installation work at the property:',
  scopeSections: DEFAULT_CONTRACT_SECTIONS,
  contractPrice: 31000,
  downpayment: 1000,
  financeCharge: 'N/A',
  paymentSchedule: DEFAULT_CONTRACT_PAYMENTS,
  cancellationDeadlineDays: 3,
  cancellationEmail: 'accountant@riseuprac.com',
  insuranceCarrier: 'PACIFIC UNITED INSURANCE SERVICES',
  insurancePhone: '(619) 274-8144',
  workersCompCarrier: 'PACIFIC UNITED INSURANCE SERVICES',
  workersCompPhone: '(619) 274-8144',
  isSigned: false,
  clientInitials: '',
  clientSignatureName: '',
  contractorSignatureName: '',
};

export function ContractStudio({ contractId, onBack, prefill }: ContractStudioProps) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<ContractStudioData>(DEFAULT_STUDIO_DATA);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [generatedPdfUrl, setGeneratedPdfUrl] = useState<string | null>(null);
  const [generatedContractId, setGeneratedContractId] = useState<number | null>(null);
  const [isBuilding, setIsBuilding] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [availableLeads, setAvailableLeads] = useState<any[]>([]);

  const totalSteps = CONTRACT_STUDIO_STEPS.length;
  const stepDef = CONTRACT_STUDIO_STEPS[currentStep] || CONTRACT_STUDIO_STEPS[0];

  // Fetch leads for quick selection
  useEffect(() => {
    (async () => {
      try {
        const res: any = await api.request('/admin/leads?limit=50');
        setAvailableLeads(res.leads || []);
      } catch (err) {
        console.warn('Failed to load leads for contract studio:', err);
      }
    })();
  }, []);

  // Apply prefill from query params or lead selection
  useEffect(() => {
    if (prefill && (prefill.clientName || prefill.leadId || prefill.address)) {
      setData((prev) => ({
        ...prev,
        leadId: prefill.leadId || prev.leadId,
        clientId: prefill.clientId || prev.clientId,
        clientName: prefill.clientName || prev.clientName,
        clientPhone: prefill.phone || prev.clientPhone,
        clientEmail: prefill.email || prev.clientEmail,
        projectAddress: prefill.address || prev.projectAddress,
        city: prefill.city || prev.city,
        scopeTitle: prefill.service ? `${prefill.service} System Installation` : prev.scopeTitle,
        contractPrice: prefill.value && prefill.value > 0 ? prefill.value : prev.contractPrice,
      }));
    }
  }, [prefill]);

  // Handler for Lead Selection Dropdown
  const handleSelectLead = (leadIdStr: string) => {
    const found = availableLeads.find((l) => String(l.id) === leadIdStr);
    if (!found) return;

    const val = Number(found.estimated_value) || 25000;
    const dp = Math.min(1000, Math.round(val * 0.1));
    const remainder = val - dp;
    const p1 = Math.round(remainder * 0.3);
    const p2 = Math.round(remainder * 0.3);
    const p3 = val - dp - p1 - p2;

    setData((prev) => ({
      ...prev,
      leadId: String(found.id),
      clientId: found.client_id ? String(found.client_id) : prev.clientId,
      clientName: found.full_name || prev.clientName,
      clientPhone: found.phone || prev.clientPhone,
      clientEmail: found.email || prev.clientEmail,
      projectAddress: found.address || prev.projectAddress,
      city: found.city || prev.city,
      zip: found.zip || prev.zip,
      scopeTitle: found.service_type ? `${found.service_type} System Installation` : prev.scopeTitle,
      contractPrice: val,
      downpayment: dp,
      paymentSchedule: [
        { id: '1', number: '1.', description: 'Initial Downpayment (Contract execution / scheduling)', amount: dp },
        { id: '2', number: '2.', description: 'Progress Payment 1 (Teardown & delivery of materials)', amount: p1 },
        { id: '3', number: '3.', description: 'Progress Payment 2 (Underlayment & waterproofing complete)', amount: p2 },
        { id: '4', number: '4.', description: 'Final Payment (Installation complete & walkthrough)', amount: p3 },
      ],
    }));
  };

  // Auto-split payment schedule based on total price
  const autoSplitPayments = (totalPrice: number) => {
    const dp = Math.min(1000, Math.round(totalPrice * 0.1));
    const remainder = totalPrice - dp;
    const p1 = Math.round(remainder * 0.3);
    const p2 = Math.round(remainder * 0.3);
    const p3 = totalPrice - dp - p1 - p2;

    setData((prev) => ({
      ...prev,
      contractPrice: totalPrice,
      downpayment: dp,
      paymentSchedule: [
        { id: '1', number: '1.', description: 'Initial Downpayment (Contract execution & material lock-in)', amount: dp },
        { id: '2', number: '2.', description: 'Progress Payment 1 (Teardown & delivery of materials)', amount: p1 },
        { id: '3', number: '3.', description: 'Progress Payment 2 (Underlayment, flashing & waterproofing)', amount: p2 },
        { id: '4', number: '4.', description: 'Final Payment (Project completion & final walkthrough)', amount: p3 },
      ],
    }));
  };

  // Scope Section Management
  const handleAddScopeSection = () => {
    const newSec: ContractScopeSection = {
      id: `sec-${Date.now()}`,
      heading: 'Additional Project Specification',
      text: 'Describe customized materials, specialized underlayment, or architectural flashing requirements here.',
    };
    setData((prev) => ({ ...prev, scopeSections: [...prev.scopeSections, newSec] }));
  };

  const handleUpdateScopeSection = (index: number, key: 'heading' | 'text', val: string) => {
    setData((prev) => {
      const copy = [...prev.scopeSections];
      copy[index] = { ...copy[index], [key]: val };
      return { ...prev, scopeSections: copy };
    });
  };

  const handleRemoveScopeSection = (index: number) => {
    setData((prev) => ({
      ...prev,
      scopeSections: prev.scopeSections.filter((_, i) => i !== index),
    }));
  };

  // Payment Row Management
  const handleUpdatePaymentRow = (index: number, key: 'description' | 'amount', val: any) => {
    setData((prev) => {
      const copy = [...prev.paymentSchedule];
      copy[index] = { ...copy[index], [key]: key === 'amount' ? Number(val) || 0 : val };
      return { ...prev, paymentSchedule: copy };
    });
  };

  const handleAddPaymentRow = () => {
    const count = data.paymentSchedule.length + 1;
    const newRow: ContractPaymentRow = {
      id: `pay-${Date.now()}`,
      number: `${count}.`,
      description: `Milestone Payment ${count}`,
      amount: 0,
    };
    setData((prev) => ({ ...prev, paymentSchedule: [...prev.paymentSchedule, newRow] }));
  };

  const handleRemovePaymentRow = (index: number) => {
    setData((prev) => ({
      ...prev,
      paymentSchedule: prev.paymentSchedule.filter((_, i) => i !== index),
    }));
  };

  // Build PDF Action
  const handleBuildContractPdf = async () => {
    setIsBuilding(true);
    try {
      const payload = {
        lead_id: Number(data.leadId) || 1,
        contract_data: {
          project_address: `${data.projectAddress}, ${data.city}, ${data.state} ${data.zip}`,
          client_name: data.clientName || 'Valued Client',
          contractor_name: data.contractorName,
          contractor_title: data.contractorTitle,
          salesperson_name: data.salespersonName,
          contract_date: data.contractDate,
          contract_date_short: data.contractDateShort,
          scope_title: data.scopeTitle,
          scope_sections: data.scopeSections.map((s) => ({ heading: s.heading, text: s.text })),
          start_date: data.approxStartDate,
          commencement_date: data.substantialCommencementDate,
          completion_date: data.approxCompletionDate,
          contract_price: `$${data.contractPrice.toLocaleString()}`,
          finance_charge: data.financeCharge,
          downpayment: `$${data.downpayment.toLocaleString()}`,
          payment_schedule: data.paymentSchedule.map((p) => ({
            number: p.number,
            description: p.description,
            amount: `$${p.amount.toLocaleString()}`,
          })),
          payment_schedule_total: `$${data.contractPrice.toLocaleString()}`,
          license_number: data.contractorLicense,
          cancellation_deadline: `${data.cancellationDeadlineDays} business days`,
        },
      };

      const res = await buildContract(payload as any);
      setGeneratedContractId(res.contract_id);
      setGeneratedPdfUrl(res.pdf_url);
      setLastSaved(new Date());
      toast.success('Contract document compiled successfully.');
    } catch (err: any) {
      toast.error(`Contract compilation error: ${err.message || 'Unknown'}`);
    } finally {
      setIsBuilding(false);
    }
  };

  // Send Contract via Resend Email
  const handleSendContract = async () => {
    if (!data.clientEmail) {
      toast.warning('Please enter a valid homeowner recipient email address.');
      return;
    }

    setIsSending(true);
    try {
      let activeId = generatedContractId;
      if (!activeId) {
        // Build first if not already built
        const payload = {
          lead_id: Number(data.leadId) || 1,
          contract_data: {
            project_address: `${data.projectAddress}, ${data.city}, ${data.state} ${data.zip}`,
            client_name: data.clientName,
            contractor_name: data.contractorName,
            contractor_title: data.contractorTitle,
            salesperson_name: data.salespersonName,
            contract_date: data.contractDate,
            contract_date_short: data.contractDateShort,
            scope_title: data.scopeTitle,
            scope_sections: data.scopeSections,
            start_date: data.approxStartDate,
            commencement_date: data.substantialCommencementDate,
            completion_date: data.approxCompletionDate,
            contract_price: `$${data.contractPrice.toLocaleString()}`,
            finance_charge: data.financeCharge,
            downpayment: `$${data.downpayment.toLocaleString()}`,
            payment_schedule: data.paymentSchedule.map((p) => ({
              number: p.number,
              description: p.description,
              amount: `$${p.amount.toLocaleString()}`,
            })),
            payment_schedule_total: `$${data.contractPrice.toLocaleString()}`,
            license_number: data.contractorLicense,
            cancellation_deadline: '3 business days',
          },
        };
        const buildRes = await buildContract(payload as any);
        activeId = buildRes.contract_id;
        setGeneratedContractId(activeId);
        setGeneratedPdfUrl(buildRes.pdf_url);
      }

      await sendContract(activeId, data.clientEmail, customMessage);
      setSendSuccess(true);
      toast.success('Contract email successfully dispatched to homeowner.');
      setTimeout(() => {
        onBack();
      }, 2000);
    } catch (err: any) {
      toast.error(`Failed to send contract email: ${err.message || 'Error'}`);
    } finally {
      setIsSending(false);
    }
  };

  const scheduledSum = data.paymentSchedule.reduce((a, b) => a + (Number(b.amount) || 0), 0);
  const isPaymentBalanced = Math.abs(scheduledSum - data.contractPrice) < 1;

  return createPortal(
    <div className="fixed top-0 right-0 bottom-0 left-0 md:left-64 z-50 flex flex-col lg:flex-row bg-slate-50 dark:bg-slate-950 overflow-hidden select-none">
      {/* ═══════════════════════════════════════════════════════════════════════
          LEFT PANEL: STUDIO BUILDER CONTROLS (LIGHT & DARK MODE OPTIMIZED)
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="w-full lg:w-1/2 flex flex-col min-h-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-white/10">
        {/* Studio Top Navigation Header */}
        <div className="h-14 flex items-center justify-between px-5 sm:px-6 border-b border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              title="Return to Contracts Registry"
            >
              <ArrowLeft size={18} />
            </button>
            <ContractWizardProgress
              currentStep={currentStep}
              totalSteps={totalSteps}
              stepLabel={stepDef.label}
              onStepClick={(idx) => setCurrentStep(idx)}
            />
          </div>

          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            {isBuilding ? (
              <span className="animate-pulse text-amber-600 flex items-center gap-1">
                <Loader2 size={12} className="animate-spin" /> Compiling...
              </span>
            ) : lastSaved ? (
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 text-[11px]">
                <Check size={13} className="stroke-[3]" /> Draft Active
              </span>
            ) : null}
          </div>
        </div>

        {/* Step Body (Scrollable Container) */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-7 space-y-6">
          {/* ── STEP 1: CLIENT & PROJECT INFO ── */}
          {currentStep === 0 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Quick Lead Autofill Selector */}
              {availableLeads.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 space-y-2">
                  <div className="text-xs font-extrabold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                    <Sparkles size={13} />
                    <span>Autofill from Active CRM Pipeline Lead:</span>
                  </div>
                  <select
                    onChange={(e) => handleSelectLead(e.target.value)}
                    className="w-full text-xs font-semibold bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700/60 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="">-- Choose a lead to populate fields --</option>
                    {availableLeads.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.full_name} &bull; {l.address || 'No Address'} ({l.service_type || 'Roofing'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-4">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <User size={15} className="text-[#1878B8]" />
                  <span>Homeowner / Client Information</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Client Full Name *</label>
                    <input
                      type="text"
                      value={data.clientName}
                      onChange={(e) => setData({ ...data, clientName: e.target.value })}
                      placeholder="e.g. Bryce Kirklen"
                      className="w-full text-xs font-semibold p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:bg-white focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Client Email (for signing) *</label>
                    <input
                      type="email"
                      value={data.clientEmail}
                      onChange={(e) => setData({ ...data, clientEmail: e.target.value })}
                      placeholder="client@example.com"
                      className="w-full text-xs font-semibold p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:bg-white focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Client Phone Number</label>
                    <input
                      type="text"
                      value={data.clientPhone}
                      onChange={(e) => setData({ ...data, clientPhone: e.target.value })}
                      placeholder="(760) 555-0142"
                      className="w-full text-xs font-semibold p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:bg-white focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Salesperson / Representative</label>
                    <input
                      type="text"
                      value={data.salespersonName}
                      onChange={(e) => setData({ ...data, salespersonName: e.target.value })}
                      placeholder="Marc Sarellano"
                      className="w-full text-xs font-semibold p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:bg-white focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div className="space-y-1 pt-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <MapPin size={13} className="text-rose-500" />
                    <span>Project Street Address *</span>
                  </label>
                  <input
                    type="text"
                    value={data.projectAddress}
                    onChange={(e) => setData({ ...data, projectAddress: e.target.value })}
                    placeholder="28663 Miller Road"
                    className="w-full text-xs font-semibold p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:bg-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">City</label>
                    <input
                      type="text"
                      value={data.city}
                      onChange={(e) => setData({ ...data, city: e.target.value })}
                      placeholder="Valley Center"
                      className="w-full text-xs font-semibold p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:bg-white focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">State</label>
                    <input
                      type="text"
                      value={data.state}
                      onChange={(e) => setData({ ...data, state: e.target.value })}
                      placeholder="CA"
                      className="w-full text-xs font-semibold p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:bg-white focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Zip Code</label>
                    <input
                      type="text"
                      value={data.zip}
                      onChange={(e) => setData({ ...data, zip: e.target.value })}
                      placeholder="92082"
                      className="w-full text-xs font-semibold p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:bg-white focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                {/* Dates Section */}
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 pt-3">
                  <Calendar size={15} className="text-[#1878B8]" />
                  <span>Statutory Timeline &amp; Dates</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Contract Execution Date</label>
                    <input
                      type="text"
                      value={data.contractDate}
                      onChange={(e) => setData({ ...data, contractDate: e.target.value })}
                      placeholder="September 22, 2026"
                      className="w-full text-xs font-semibold p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Approx. Start Date</label>
                    <input
                      type="text"
                      value={data.approxStartDate}
                      onChange={(e) => setData({ ...data, approxStartDate: e.target.value })}
                      placeholder="October 16, 2026"
                      className="w-full text-xs font-semibold p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Approx. Completion</label>
                    <input
                      type="text"
                      value={data.approxCompletionDate}
                      onChange={(e) => setData({ ...data, approxCompletionDate: e.target.value })}
                      placeholder="October 22, 2026"
                      className="w-full text-xs font-semibold p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2: SCOPE OF WORK & MATERIALS ── */}
          {currentStep === 1 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Primary Project Title</label>
                <input
                  type="text"
                  value={data.scopeTitle}
                  onChange={(e) => setData({ ...data, scopeTitle: e.target.value })}
                  placeholder="Complete 31-Square Concrete Tile Roof Installation"
                  className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:bg-white focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                  Scope Sections &amp; Specifications ({data.scopeSections.length})
                </h3>
                <button
                  type="button"
                  onClick={handleAddScopeSection}
                  className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 font-bold text-xs flex items-center gap-1.5 hover:bg-amber-100 transition-colors cursor-pointer"
                >
                  <Plus size={13} />
                  <span>Add Section</span>
                </button>
              </div>

              <div className="space-y-3">
                {data.scopeSections.map((sec, idx) => (
                  <div
                    key={sec.id || idx}
                    className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-slate-800/40 space-y-2.5 relative group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <input
                        type="text"
                        value={sec.heading}
                        onChange={(e) => handleUpdateScopeSection(idx, 'heading', e.target.value)}
                        placeholder="Section Heading"
                        className="text-xs font-extrabold text-[#10263b] dark:text-amber-400 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-amber-500 focus:outline-none w-full"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveScopeSection(idx)}
                        className="text-slate-400 hover:text-rose-500 p-1 transition-colors cursor-pointer"
                        title="Delete Section"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    <textarea
                      rows={2}
                      value={sec.text}
                      onChange={(e) => handleUpdateScopeSection(idx, 'text', e.target.value)}
                      placeholder="Section description and technical specifications..."
                      className="w-full text-xs font-normal p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-amber-500 leading-relaxed resize-none"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── STEP 3: PRICING & PROGRESS PAYMENT SCHEDULE ── */}
          {currentStep === 2 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Total Contract Price ($)</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={data.contractPrice}
                      onChange={(e) => autoSplitPayments(Number(e.target.value) || 0)}
                      className="w-full text-sm font-black p-2.5 pl-7 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:bg-white focus:ring-2 focus:ring-amber-500"
                    />
                    <DollarSign size={14} className="absolute left-2.5 top-3 text-slate-400" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Downpayment ($ max $1,000)</label>
                  <input
                    type="number"
                    value={data.downpayment}
                    onChange={(e) => setData({ ...data, downpayment: Number(e.target.value) || 0 })}
                    className="w-full text-sm font-bold p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Finance Charge</label>
                  <input
                    type="text"
                    value={data.financeCharge}
                    onChange={(e) => setData({ ...data, financeCharge: e.target.value })}
                    placeholder="N/A"
                    className="w-full text-sm font-bold p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* CSLB Compliance Warning */}
              {data.downpayment > 1000 && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 flex items-center gap-2 text-xs font-bold text-rose-800 dark:text-rose-300">
                  <AlertTriangle size={15} className="shrink-0 text-rose-600" />
                  <span>CSLB California Notice: Downpayment cannot legally exceed $1,000 or 10% of the contract total.</span>
                </div>
              )}

              {/* Progress Payments Table */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                      Progress Payment Schedule
                    </h3>
                    <div className="text-[11px] text-slate-500">
                      Sum of payments: <strong className={isPaymentBalanced ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>${scheduledSum.toLocaleString()}</strong> / ${data.contractPrice.toLocaleString()}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddPaymentRow}
                    className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 font-bold text-xs flex items-center gap-1.5 hover:bg-amber-100 transition-colors cursor-pointer"
                  >
                    <Plus size={13} />
                    <span>Add Milestone</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {data.paymentSchedule.map((row, idx) => (
                    <div
                      key={row.id || idx}
                      className="p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-slate-800/40 flex items-center gap-2.5"
                    >
                      <span className="w-7 h-7 rounded-lg bg-[#10263b] text-white flex items-center justify-center font-black text-xs shrink-0">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        value={row.description}
                        onChange={(e) => handleUpdatePaymentRow(idx, 'description', e.target.value)}
                        placeholder="Milestone description..."
                        className="flex-1 text-xs font-semibold p-2 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-amber-500"
                      />
                      <div className="w-28 relative">
                        <input
                          type="number"
                          value={row.amount}
                          onChange={(e) => handleUpdatePaymentRow(idx, 'amount', e.target.value)}
                          className="w-full text-xs font-black p-2 pl-5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                        />
                        <span className="absolute left-2 top-2 text-xs text-slate-400 font-bold">$</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemovePaymentRow(idx)}
                        className="text-slate-400 hover:text-rose-500 p-1 transition-colors cursor-pointer"
                        title="Remove row"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 4: TERMS, INSURANCE & LICENSING ── */}
          {currentStep === 3 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-500" />
                <span>Insurance &amp; Statutory Disclosures</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Liability Carrier</label>
                  <input
                    type="text"
                    value={data.insuranceCarrier}
                    onChange={(e) => setData({ ...data, insuranceCarrier: e.target.value })}
                    className="w-full text-xs font-semibold p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Liability Agent Phone</label>
                  <input
                    type="text"
                    value={data.insurancePhone}
                    onChange={(e) => setData({ ...data, insurancePhone: e.target.value })}
                    className="w-full text-xs font-semibold p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Workers' Comp Carrier</label>
                  <input
                    type="text"
                    value={data.workersCompCarrier}
                    onChange={(e) => setData({ ...data, workersCompCarrier: e.target.value })}
                    className="w-full text-xs font-semibold p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Cancellation Notice Email</label>
                  <input
                    type="email"
                    value={data.cancellationEmail}
                    onChange={(e) => setData({ ...data, cancellationEmail: e.target.value })}
                    className="w-full text-xs font-semibold p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Signatures & Execution Names */}
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider pt-3">
                Digital Signatures &amp; Initials
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Contractor Signatory Name</label>
                  <input
                    type="text"
                    value={data.contractorSignatureName}
                    onChange={(e) => setData({ ...data, contractorSignatureName: e.target.value })}
                    className="w-full text-xs font-semibold p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Client Signature Placeholder</label>
                  <input
                    type="text"
                    value={data.clientSignatureName || data.clientName}
                    onChange={(e) => setData({ ...data, clientSignatureName: e.target.value })}
                    className="w-full text-xs font-semibold p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 5: REVIEW, GENERATE & SEND ── */}
          {currentStep === 4 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Ready to Send Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300 dark:border-amber-800/60 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-amber-900 dark:text-amber-300 uppercase tracking-wide flex items-center gap-2">
                    <CheckCircle2 size={16} />
                    <span>Contract Ready For Client Delivery</span>
                  </h3>
                  <span className="text-xs font-mono font-bold text-amber-700 dark:text-amber-400">
                    ${data.contractPrice.toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed m-0">
                  Compile the official California Home Improvement Contract with Playwright PDF engine and email it directly to the homeowner for review and electronic signature.
                </p>
              </div>

              {/* Recipient Email & Custom Message */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Recipient Email Address *</label>
                  <input
                    type="email"
                    value={data.clientEmail}
                    onChange={(e) => setData({ ...data, clientEmail: e.target.value })}
                    placeholder="homeowner@email.com"
                    className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Custom Email Message (Optional)</label>
                  <textarea
                    rows={3}
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    placeholder="Hi Bryce, attached is your official Home Improvement Contract for the tile roof replacement project. Please review and sign."
                    className="w-full text-xs font-normal p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white resize-none"
                  />
                </div>
              </div>

              {/* Compilation Status / Actions */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleBuildContractPdf}
                  disabled={isBuilding}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
                >
                  {isBuilding ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                  <span>Generate PDF Document</span>
                </button>

                {generatedPdfUrl && (
                  <a
                    href={generatedPdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full sm:w-auto px-4 py-3 rounded-xl bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900 text-[#1878B8] dark:text-sky-300 border border-sky-300 dark:border-sky-800/60 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                  >
                    <ExternalLink size={14} />
                    <span>Preview Generated PDF</span>
                  </a>
                )}
              </div>

              {/* Send Success Banner */}
              {sendSuccess && (
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 text-emerald-900 dark:text-emerald-200 text-xs font-bold flex items-center gap-2 animate-in zoom-in-95">
                  <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                  <span>Contract sent successfully! Lead automatically moved to "Contract Sent" stage in pipeline.</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Studio Sticky Footer */}
        <div className="h-16 px-5 sm:px-6 border-t border-slate-200/80 dark:border-white/10 flex items-center justify-between flex-shrink-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md">
          <button
            type="button"
            onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
            disabled={currentStep === 0}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              currentStep === 0
                ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer'
            }`}
          >
            Previous
          </button>

          {currentStep < totalSteps - 1 ? (
            <button
              type="button"
              onClick={() => setCurrentStep((s) => Math.min(totalSteps - 1, s + 1))}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-500 text-white font-extrabold text-xs shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              Continue to {CONTRACT_STUDIO_STEPS[currentStep + 1]?.shortTitle} &rarr;
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSendContract}
              disabled={isSending || sendSuccess}
              className="px-7 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-2"
            >
              {isSending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              <span>Send Contract to Client</span>
            </button>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          RIGHT PANEL: LIVE WYSIWYG CONTRACT STUDIO PREVIEW (DESKTOP)
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="hidden lg:flex lg:w-1/2 min-h-0 bg-[#0a101d] overflow-hidden">
        <ContractLivePreview
          data={data}
          activeStep={currentStep}
          previewPageFocus={stepDef.pageFocus}
        />
      </div>
    </div>,
    document.body
  );
}

export default ContractStudio;
