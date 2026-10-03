import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { ContractStudioData } from '@/types/contractStudioTypes';
import { CONTRACT_WIZARD_STEPS } from '@/types/contractStudioTypes';
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
import { ArrowLeft, Check } from 'lucide-react';
import { getDraftContractByLead, autoSaveContractDraft, buildContract, getContracts } from '@/api/contractApi';
import { useAuth } from '@/context/AuthContext';
import {
  WizardPrefill,
  getContractDataPayload,
  restoreFromContractData,
  computeInitialContractData,
} from './contractWizardData';

export { restoreFromContractData, getContractDataPayload } from './contractWizardData';
export type { WizardPrefill } from './contractWizardData';

export interface ContractWizardShellProps {
  contractId: string | null;
  onBack: () => void;
  prefill?: WizardPrefill;
  onSuccess?: () => void;
}

export function ContractWizardShell({ contractId, onBack, prefill, onSuccess }: ContractWizardShellProps) {
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
            if (buildRes?.contract_id && isMounted) {
              setDbContractId(String(buildRes.contract_id));
              setData((prev) => ({
                ...prev,
                id: String(buildRes.contract_id),
                contractNumber: buildRes.contract_number,
                signingToken: buildRes.signing_token,
                signingUrl: buildRes.signing_url,
              }));
            }
          } catch {
            // Silently fall through
          } finally {
            if (isMounted) setIsSaving(false);
          }
        }
      } catch {
        // Silently fall through
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [contractId, prefill?.leadId, prefill?.clientName, prefill?.address, prefill?.phone, prefill?.email, data.clientName, data.projectAddress, data.clientPhone, data.clientEmail, dbContractId]);

  // Fetch full contract if an existing contract ID was passed
  useEffect(() => {
    if (!contractId) return;
    let isMounted = true;
    (async () => {
      try {
        const { contracts } = await getContracts();
        const found = contracts.find((c: any) => String(c.id) === String(contractId));
        if (found && isMounted) {
          setData((prev) => ({
            ...prev,
            ...restoreFromContractData(found, prev),
          }));
          setDbContractId(String(found.id));
        }
      } catch (err) {
        console.error('Failed to load contract:', err);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [contractId]);

  // Auto-save draft debounce
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

  const handleDataChange = useCallback((updates: Partial<ContractStudioData>) => {
    setData((prev) => ({ ...prev, ...updates }));
    setLastSaved(new Date());
  }, []);

  const canProceed = (() => {
    if (currentStep === 0) {
      return Boolean(data.leadId && data.clientName && data.clientName.trim().length > 0);
    }
    return true;
  })();

  const handleNext = async () => {
    if (!canProceed) return;

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
    } else {
      if (onSuccess) onSuccess();
      onBack();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  return createPortal(
    <div className="fixed top-0 right-0 bottom-0 left-64 z-50 flex bg-slate-50 overflow-hidden select-none">
      <div className="w-1/2 flex flex-col min-h-0 bg-white border-r border-slate-200">
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
