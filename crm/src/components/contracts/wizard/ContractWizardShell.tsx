import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  ContractStudioData,
  DEFAULT_CONTRACT_SECTIONS,
  DEFAULT_CONTRACT_PAYMENTS,
  CONTRACT_WIZARD_STEPS,
} from '@/types/contractStudioTypes';
import { ContractPreviewPanel } from './ContractPreviewPanel';
import { ContractWizardProgress } from './ContractWizardProgress';
import { ContractDetailsStep } from './steps/ContractDetailsStep';
import { ContractScopeStep } from './steps/ContractScopeStep';
import { ContractDatesPricingStep } from './steps/ContractDatesPricingStep';
import { ContractPaymentScheduleStep } from './steps/ContractPaymentScheduleStep';
import { ContractTermsStep } from './steps/ContractTermsStep';
import { ContractSignaturesStep } from './steps/ContractSignaturesStep';
import { ContractCancellationStep } from './steps/ContractCancellationStep';
import { ContractReviewSendStep } from './steps/ContractReviewSendStep';
import { ArrowLeft, Check, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import { getDraftContractByLead, autoSaveContractDraft, buildContract } from '@/api/contractApi';
import { useAuth } from '@/context/AuthContext';

interface WizardPrefill {
  leadId?: string;
  clientId?: string;
  clientName?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  service?: string;
  value?: number;
}

interface ContractWizardShellProps {
  contractId: string | null;
  onBack: () => void;
  prefill?: WizardPrefill;
}

const DEFAULT_CONTRACT: ContractStudioData = {
  status: 'draft',
  clientName: '',
  clientPhone: '',
  clientEmail: '',
  projectAddress: '',
  city: '',
  state: 'CA',
  zip: '',
  contractorName: 'Edith Guerrero',
  contractorTitle: 'Project Manager',
  contractorLicense: '#1096492',
  salespersonName: 'Marc Sarellano',
  contractDate: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
  contractDateShort: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
  approxStartDate: 'Within 2–3 weeks of permit issuance',
  substantialCommencementDate: 'Within 3 days of material delivery',
  approxCompletionDate: '5–7 business days from commencement',
  scopeTitle: 'Complete 31-Square Concrete Tile Roof Installation',
  scopeIntro:
    'Rise Up Roofing & Construction, Inc. will complete the following roofing, preventative maintenance, exterior waterproofing, and interior repair work at the property:',
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

function parsePrice(strOrNum: any, defaultVal = 0): number {
  if (typeof strOrNum === 'number') return strOrNum;
  if (!strOrNum) return defaultVal;
  const cleaned = String(strOrNum).replace(/[^0-9.-]+/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? defaultVal : parsed;
}

export function getContractDataPayload(data: ContractStudioData) {
  let rawAddr = (data.projectAddress || '').trim();
  const rawCity = (data.city || '').trim();
  const rawState = (data.state || 'CA').trim();
  const rawZip = (data.zip || '').trim();

  let projectAddress = '';
  if (rawAddr) {
    projectAddress = rawAddr;
    if (rawCity && !projectAddress.toLowerCase().includes(rawCity.toLowerCase())) {
      projectAddress += `, ${rawCity}`;
    }
    if (rawState && !projectAddress.includes(rawState)) {
      projectAddress += `, ${rawState}`;
    }
    if (rawZip && !projectAddress.includes(rawZip)) {
      projectAddress += ` ${rawZip}`;
    }
  } else if (rawCity || rawZip) {
    projectAddress = [rawCity, rawState, rawZip].filter(Boolean).join(' ');
  } else {
    projectAddress = '';
  }

  return {
    project_address: projectAddress,
    client_name: data.clientName || '',
    contractor_name: data.contractorName || 'Edith Guerrero',
    contractor_title: data.contractorTitle || 'Project Manager',
    salesperson_name: data.salespersonName || 'Marc Sarellano',
    contract_date: data.contractDate || 'September 22, 2026',
    contract_date_short: data.contractDateShort || 'Sep 22, 2026',
    scope_title: data.scopeTitle || 'Complete Roofing System Installation',
    scope_sections: (data.scopeSections || []).map((s) => ({ heading: s.heading, text: s.text })),
    start_date: data.approxStartDate || 'October 16th, 2026.',
    commencement_date: data.substantialCommencementDate || 'October 19th, 2026.',
    completion_date: data.approxCompletionDate || 'October 22th, 2026.',
    contract_price: `$${(data.contractPrice || 31000).toLocaleString()}`,
    finance_charge: data.financeCharge || 'N/A',
    downpayment: `$${(data.downpayment || 1000).toLocaleString()}`,
    payment_schedule: (data.paymentSchedule || []).map((p) => ({
      number: p.number,
      description: p.description,
      amount: `$${(Number(p.amount) || 0).toLocaleString()}`,
    })),
    payment_schedule_total: `$${(data.contractPrice || 31000).toLocaleString()}`,
    license_number: data.contractorLicense || '#1096492',
    cancellation_deadline: 'three business days from signing',
    client_initials: data.clientInitials || '',
    insurance_carrier: data.insuranceCarrier || 'PACIFIC UNITED INSURANCE SERVICES',
    insurance_phone: data.insurancePhone || '(619) 274-8144',
    workers_comp_carrier: data.workersCompCarrier || 'PACIFIC UNITED INSURANCE SERVICES',
    cancellation_email: data.cancellationEmail || 'accountant@riseuprac.com',
  };
}

export function restoreFromContractData(
  contractRow: any,
  prev: ContractStudioData
): Partial<ContractStudioData> {
  let cd = contractRow.contract_data;
  if (typeof cd === 'string') {
    try {
      cd = JSON.parse(cd);
    } catch {
      cd = {};
    }
  }
  cd = cd || {};

  const updates: Partial<ContractStudioData> = {
    id: String(contractRow.id),
    contractNumber: contractRow.contract_number || prev.contractNumber,
    status: contractRow.status || prev.status,
    leadId: contractRow.lead_id ? String(contractRow.lead_id) : prev.leadId,
    clientId: contractRow.client_id ? String(contractRow.client_id) : prev.clientId,
  };

  if (cd.client_name || contractRow.customer_name) {
    updates.clientName = cd.client_name || contractRow.customer_name;
  }
  if (contractRow.customer_phone) updates.clientPhone = contractRow.customer_phone;
  if (contractRow.customer_email) updates.clientEmail = contractRow.customer_email;
  if (cd.project_address || contractRow.customer_address) {
    updates.projectAddress = cd.project_address || contractRow.customer_address;
  }
  if (contractRow.customer_city) updates.city = contractRow.customer_city;
  if (cd.contractor_name) updates.contractorName = cd.contractor_name;
  if (cd.contractor_title) updates.contractorTitle = cd.contractor_title;
  if (cd.salesperson_name || contractRow.salesperson) {
    updates.salespersonName = cd.salesperson_name || contractRow.salesperson;
  }
  if (cd.contract_date) updates.contractDate = cd.contract_date;
  if (cd.contract_date_short) updates.contractDateShort = cd.contract_date_short;
  if (cd.scope_title) updates.scopeTitle = cd.scope_title;
  if (Array.isArray(cd.scope_sections) && cd.scope_sections.length > 0) {
    updates.scopeSections = cd.scope_sections.map((s: any, i: number) => ({
      id: String(i + 1),
      heading: s.heading || '',
      text: s.text || '',
    }));
  }
  if (cd.start_date) updates.approxStartDate = cd.start_date;
  if (cd.commencement_date) updates.substantialCommencementDate = cd.commencement_date;
  if (cd.completion_date) updates.approxCompletionDate = cd.completion_date;
  if (cd.contract_price || contractRow.estimated_value) {
    updates.contractPrice = parsePrice(cd.contract_price || contractRow.estimated_value, prev.contractPrice);
  }
  if (cd.downpayment) updates.downpayment = parsePrice(cd.downpayment, prev.downpayment);
  if (cd.finance_charge) updates.financeCharge = cd.finance_charge;
  if (Array.isArray(cd.payment_schedule) && cd.payment_schedule.length > 0) {
    updates.paymentSchedule = cd.payment_schedule.map((p: any, i: number) => ({
      id: String(i + 1),
      number: p.number || `${i + 1}.`,
      description: p.description || '',
      amount: parsePrice(p.amount, 0),
    }));
  }
  if (cd.license_number) updates.contractorLicense = cd.license_number;
  if (cd.client_initials) updates.clientInitials = cd.client_initials;
  if (cd.insurance_carrier) updates.insuranceCarrier = cd.insurance_carrier;
  if (cd.insurance_phone) updates.insurancePhone = cd.insurance_phone;
  if (cd.workers_comp_carrier) updates.workersCompCarrier = cd.workers_comp_carrier;
  if (cd.cancellation_email) updates.cancellationEmail = cd.cancellation_email;
  if (contractRow.signing_token) updates.signingToken = contractRow.signing_token;

  return updates;
}

function computeInitialContractData(prefill?: WizardPrefill, userName?: string): ContractStudioData {
  const base: ContractStudioData = {
    ...DEFAULT_CONTRACT,
    salespersonName: userName || DEFAULT_CONTRACT.salespersonName,
  };
  if (!prefill || (!prefill.clientName && !prefill.leadId && !prefill.address)) {
    return base;
  }
  const val = prefill.value && prefill.value > 0 ? prefill.value : 31000;
  const dp = Math.min(1000, Math.round(val * 0.1));
  const rem = Math.max(0, val - dp);
  const p1 = Math.round(rem * 0.3);
  const p2 = Math.round(rem * 0.3);
  const p3 = Math.max(0, val - dp - p1 - p2);

  return {
    ...base,
    leadId: prefill.leadId || base.leadId,
    clientId: prefill.clientId || base.clientId,
    clientName: prefill.clientName || base.clientName,
    clientInitials: '',
    clientPhone: prefill.phone || base.clientPhone,
    clientEmail: prefill.email || base.clientEmail,
    projectAddress: prefill.address || base.projectAddress,
    city: prefill.city || base.city,
    scopeTitle: prefill.service ? `${prefill.service} System Installation` : base.scopeTitle,
    contractPrice: val,
    downpayment: dp,
    salespersonName: userName || base.salespersonName,
    paymentSchedule: [
      { id: '1', number: '1.', description: 'Initial Downpayment (Contract execution / scheduling)', amount: dp },
      { id: '2', number: '2.', description: 'Progress Payment 1 (Teardown & delivery of materials)', amount: p1 },
      { id: '3', number: '3.', description: 'Progress Payment 2 (Underlayment & waterproofing complete)', amount: p2 },
      { id: '4', number: '4.', description: 'Final Payment (Installation complete & walkthrough)', amount: p3 },
    ],
  };
}

export function ContractWizardShell({ contractId, onBack, prefill }: ContractWizardShellProps) {
  const { user } = useAuth();

  // Restore step from URL on mount
  const getInitialStep = () => {
    const params = new URLSearchParams(window.location.search);
    const s = parseInt(params.get('step') || '0', 10);
    return isNaN(s) || s < 0 || s >= CONTRACT_WIZARD_STEPS.length ? 0 : s;
  };

  const [currentStep, setCurrentStep] = useState(getInitialStep);
  const [data, setData] = useState<ContractStudioData>(() => computeInitialContractData(prefill, user?.name));
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [dbContractId, setDbContractId] = useState<string | null>(contractId || null);

  const stepDef = CONTRACT_WIZARD_STEPS[currentStep] || CONTRACT_WIZARD_STEPS[0];
  const totalSteps = CONTRACT_WIZARD_STEPS.length;

  // Sync step to URL so browser refresh preserves position
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('step', String(currentStep));
    window.history.replaceState(null, '', url.toString());
  }, [currentStep]);

  // Ensure salesperson is locked to current logged-in user
  useEffect(() => {
    if (user?.name) {
      setData((prev) => ({
        ...prev,
        salespersonName: user.name,
      }));
    }
  }, [user?.name]);

  // Keep dbContractId in sync if data.id gets populated
  useEffect(() => {
    if (data.id && String(data.id) !== dbContractId) {
      setDbContractId(String(data.id));
    }
  }, [data.id, dbContractId]);

  // Apply prefill if props update dynamically
  useEffect(() => {
    if (prefill && (prefill.clientName || prefill.leadId || prefill.address)) {
      setData((prev) => {
        const computed = computeInitialContractData(prefill, user?.name);
        return {
          ...prev,
          leadId: computed.leadId || prev.leadId,
          clientId: computed.clientId || prev.clientId,
          clientName: computed.clientName || prev.clientName,
          clientInitials: computed.clientInitials || prev.clientInitials,
          clientPhone: computed.clientPhone || prev.clientPhone,
          clientEmail: computed.clientEmail || prev.clientEmail,
          projectAddress: computed.projectAddress || prev.projectAddress,
          city: computed.city || prev.city,
          scopeTitle: prefill.service ? `${prefill.service} System Installation` : prev.scopeTitle,
          contractPrice: computed.contractPrice || prev.contractPrice,
          downpayment: computed.downpayment || prev.downpayment,
          paymentSchedule: computed.paymentSchedule || prev.paymentSchedule,
        };
      });
    }
  }, [prefill, user?.name]);

  // Auto-restore draft contract for prefilled lead if one exists, or auto-initialize draft
  useEffect(() => {
    if (contractId || !prefill?.leadId) return;
    let isMounted = true;
    (async () => {
      try {
        const res = await getDraftContractByLead(prefill.leadId!);
        if (!isMounted) return;
        if (res.exists && res.contract) {
          setData((prev) => ({
            ...prev,
            ...restoreFromContractData(res.contract, prev),
          }));
          setDbContractId(String(res.contract.id));
        } else if (!dbContractId && (data.clientName || prefill.clientName)) {
          // Initialize draft contract in DB so contract ID exists immediately
          setIsSaving(true);
          try {
            const initialPayload = getContractDataPayload({
              ...data,
              leadId: prefill.leadId,
              clientName: prefill.clientName || data.clientName,
              projectAddress: prefill.address || data.projectAddress,
              clientPhone: prefill.phone || data.clientPhone,
              clientEmail: prefill.email || data.clientEmail,
            });
            const buildRes = await buildContract({
              lead_id: Number(prefill.leadId),
              contract_id: undefined,
              contract_data: initialPayload as any,
            });
            if (!isMounted) return;
            if (buildRes?.contract_id) {
              setDbContractId(String(buildRes.contract_id));
              setData((prev) => ({
                ...prev,
                id: String(buildRes.contract_id),
                contractNumber: buildRes.contract_number,
                signingToken: buildRes.signing_token,
                signingUrl: buildRes.signing_url,
              }));
              setLastSaved(new Date());
            }
          } catch (initErr) {
            console.warn('Could not auto-initialize draft contract on mount:', initErr);
          } finally {
            if (isMounted) setIsSaving(false);
          }
        }
      } catch (err) {
        console.warn('Failed checking draft contract for lead:', err);
      }
    })();
    return () => { isMounted = false; };
  }, [prefill?.leadId, contractId]);

  // Load existing contract if editing an existing one
  useEffect(() => {
    if (contractId) {
      (async () => {
        try {
          const res: any = await api.request(`/admin/contracts?status=all`);
          const found = (res?.contracts || []).find((c: any) => String(c.id) === String(contractId));
          if (found) {
            setData((prev) => ({
              ...prev,
              ...restoreFromContractData(found, prev),
            }));
          }
        } catch (err) {
          console.error('Failed to load contract', err);
        }
      })();
    }
  }, [contractId, user?.name]);

  // Debounced auto-save to backend PostgreSQL
  useEffect(() => {
    if (!dbContractId || data.status !== 'draft') return;
    const timer = setTimeout(async () => {
      setIsSaving(true);
      try {
        const payload = getContractDataPayload(data);
        await autoSaveContractDraft(dbContractId, payload);
        setLastSaved(new Date());
      } catch (err) {
        console.error('Failed to auto-save contract draft', err);
      } finally {
        setIsSaving(false);
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [data, dbContractId]);

  // Data update handler
  const handleDataChange = useCallback((updates: Partial<ContractStudioData>) => {
    setData((prev) => ({ ...prev, ...updates }));
    setLastSaved(new Date());
  }, []);

  // Step-level gating: A lead MUST be selected on the first step to proceed
  const canProceed = (() => {
    if (currentStep === 0) {
      return Boolean(data.leadId && data.clientName && data.clientName.trim().length > 0);
    }
    return true;
  })();

  const handleNext = async () => {
    if (!canProceed) return;

    // If stepping forward and no DB draft exists yet, initialize it
    if (!dbContractId && data.leadId) {
      setIsSaving(true);
      try {
        const res = await buildContract({
          lead_id: Number(data.leadId),
          contract_id: undefined,
          contract_data: getContractDataPayload(data) as any,
        });
        if (res?.contract_id) {
          setDbContractId(String(res.contract_id));
          setData((prev) => ({
            ...prev,
            id: String(res.contract_id),
            contractNumber: res.contract_number,
            signingToken: res.signing_token,
            signingUrl: res.signing_url,
          }));
        }
      } catch (err) {
        console.error('Failed to initialize contract draft:', err);
      } finally {
        setIsSaving(false);
      }
    }

    if (currentStep < totalSteps - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  return createPortal(
    <div className="fixed top-0 right-0 bottom-0 left-64 z-50 flex bg-slate-50 overflow-hidden select-none">
      {/* Left Panel: Wizard Content (Compact, single-screen height ergonomics) */}
      <div className="w-1/2 flex flex-col min-h-0 bg-white border-r border-slate-200">
        {/* Header */}
        <div className="h-14 flex items-center justify-between px-6 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
                title="Back to Contracts"
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <ContractWizardProgress
              currentStep={currentStep}
              totalSteps={totalSteps}
              stepLabel={stepDef.label}
            />
          </div>
          <div className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
            {isSaving ? (
              <span className="animate-pulse">Saving...</span>
            ) : lastSaved ? (
              <>
                <Check size={14} className="text-emerald-500" />
                <span>Saved</span>
              </>
            ) : null}
          </div>
        </div>

        {/* Step Body — scrollable, comfortable max-w-xl container */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6">
          <div className="max-w-xl mx-auto w-full pb-6">
            {currentStep === 0 && (
              <ContractDetailsStep data={data} onDataChange={handleDataChange} />
            )}
            {currentStep === 1 && (
              <ContractScopeStep data={data} onDataChange={handleDataChange} />
            )}
            {currentStep === 2 && (
              <ContractDatesPricingStep data={data} onDataChange={handleDataChange} />
            )}
            {currentStep === 3 && (
              <ContractPaymentScheduleStep data={data} onDataChange={handleDataChange} />
            )}
            {currentStep === 4 && (
              <ContractTermsStep data={data} onDataChange={handleDataChange} />
            )}
            {currentStep === 5 && (
              <ContractSignaturesStep data={data} onDataChange={handleDataChange} />
            )}
            {currentStep === 6 && (
              <ContractCancellationStep data={data} onDataChange={handleDataChange} />
            )}
            {currentStep === 7 && (
              <ContractReviewSendStep data={data} onDataChange={handleDataChange} />
            )}
          </div>
        </div>

        {/* Footer — pinned at bottom, ALWAYS on the same screen */}
        <div className="h-16 px-6 border-t border-slate-100 flex items-center justify-between flex-shrink-0 bg-white">
          <button
            onClick={handleBack}
            disabled={currentStep === 0}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              currentStep === 0
                ? 'text-slate-300 cursor-not-allowed'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer'
            }`}
          >
            Back
          </button>
          <div className="flex items-center gap-3">
            {!canProceed && currentStep === 0 && (
              <span className="text-xs text-amber-600 font-semibold animate-pulse">
                Select a lead to proceed &rarr;
              </span>
            )}
            <button
              onClick={handleNext}
              disabled={!canProceed}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                canProceed
                  ? 'bg-[#1a5ba5] hover:bg-[#154a87] text-white shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 cursor-pointer'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {currentStep === totalSteps - 1 ? 'Finish' : 'Next Step'}
            </button>
          </div>
        </div>
      </div>

      {/* Right Panel: Live Single-Page PDF Preview (Synchronized Page Transitions) */}
      <div className="w-1/2 min-h-0 bg-slate-100 overflow-hidden">
        <ContractPreviewPanel
          contractId={dbContractId}
          data={data}
          currentStep={currentStep}
          previewPage={stepDef.previewPage}
          lastSaved={lastSaved}
        />
      </div>
    </div>,
    document.body
  );
}

export default ContractWizardShell;
