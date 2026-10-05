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
import { ArrowLeft, Check, AlertCircle } from 'lucide-react';
import {
  getDraftContractByLead,
  getDraftContractByClient,
  getContractById,
  autoSaveContractDraft,
  buildContract,
} from '@/api/contractApi';
import { useAuth } from '@/context/AuthContext';
import {
  WizardPrefill,
  getContractDataPayload,
  restoreFromContractData,
  computeInitialContractData,
  validateClientProfileForContract,
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
  const [hasLoadedDraft, setHasLoadedDraft] = useState(!contractId && !prefill?.leadId && !prefill?.clientId);
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

  // Ensure salesperson and preparedBy are locked to current logged-in user / representative
  useEffect(() => {
    if (user?.name) {
      const isSignatory = Boolean(user.is_protected_owner || user.role === 'owner' || user.is_authorized_signatory);
      const repTitle = user.signature_title || (user.role === 'owner' ? 'Owner / General Contractor' : 'Project Manager');
      setData((prev) => ({
        ...prev,
        salespersonName: user.name,
        preparedByName: user.name,
        preparedByTitle: repTitle,
        isRepresentativeSignatory: isSignatory,
        representativeName: user.name,
        representativeTitle: repTitle,
      }));
    }
  }, [user]);

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

  // Auto-restore draft contract for prefilled lead/client if one exists, or auto-initialize draft
  useEffect(() => {
    if (contractId || (!prefill?.leadId && !prefill?.clientId)) return;
    let isMounted = true;
    (async () => {
      try {
        let res: any = null;
        if (prefill?.leadId) {
          res = await getDraftContractByLead(prefill.leadId);
        }
        if ((!res?.exists || !res.contract) && prefill?.clientId) {
          res = await getDraftContractByClient(prefill.clientId);
        }
        if (!isMounted) return;
        if (res?.exists && res.contract) {
          let stepToRestore: number | undefined;
          setData((prev) => {
            const restored = restoreFromContractData(res.contract, prev);
            if (typeof restored.wizardStep === 'number' && restored.wizardStep >= 0 && restored.wizardStep < totalSteps) {
              stepToRestore = restored.wizardStep;
            }
            return {
              ...prev,
              ...restored,
            };
          });
          setDbContractId(String(res.contract.id));
          if (stepToRestore !== undefined) {
            setCurrentStep(stepToRestore);
          }
        } else if (!dbContractId && (data.clientName || prefill?.clientName)) {
          // Initialize draft contract in DB so contract ID exists immediately
          setIsSaving(true);
          try {
            const initialPayload = getContractDataPayload({
              ...data,
              leadId: prefill?.leadId,
              clientId: prefill?.clientId,
              clientName: prefill?.clientName || data.clientName,
              projectAddress: prefill?.address || data.projectAddress,
              clientPhone: prefill?.phone || data.clientPhone,
              clientEmail: prefill?.email || data.clientEmail,
            }, 0);
            const buildRes = await buildContract({
              lead_id: prefill?.leadId ? Number(prefill.leadId) : undefined,
              client_id: prefill?.clientId ? Number(prefill.clientId) : undefined,
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
      } finally {
        if (isMounted) setHasLoadedDraft(true);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [contractId, prefill?.leadId, prefill?.clientId, totalSteps]);

  // Fetch full contract if an existing contract ID was passed
  useEffect(() => {
    if (!contractId) return;
    let isMounted = true;
    (async () => {
      try {
        const res = await getContractById(contractId);
        const found = res?.contract;
        if (found && isMounted) {
          let stepToRestore: number | undefined;
          setData((prev) => {
            const restored = restoreFromContractData(found, prev);
            if (typeof restored.wizardStep === 'number' && restored.wizardStep >= 0 && restored.wizardStep < totalSteps) {
              stepToRestore = restored.wizardStep;
            }
            return {
              ...prev,
              ...restored,
            };
          });
          setDbContractId(String(found.id));
          if (stepToRestore !== undefined) {
            setCurrentStep(stepToRestore);
          }
        }
      } catch (err) {
        console.error('Failed to load contract by ID:', err);
      } finally {
        if (isMounted) setHasLoadedDraft(true);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [contractId, totalSteps]);

  // Auto-save draft debounce
  useEffect(() => {
    if (!hasLoadedDraft || !dbContractId || data.status !== 'draft') return;
    const timer = setTimeout(async () => {
      setIsSaving(true);
      try {
        const payload = getContractDataPayload(data, currentStep);
        await autoSaveContractDraft(dbContractId, payload);
        setLastSaved(new Date());
      } catch (err) {
        console.error('Failed to auto-save contract draft', err);
      } finally {
        setIsSaving(false);
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [hasLoadedDraft, data, dbContractId, currentStep]);

  const handleDataChange = useCallback((updates: Partial<ContractStudioData>) => {
    if (updates.id && String(updates.id) !== dbContractId) {
      setDbContractId(String(updates.id));
    }
    setData((prev) => ({ ...prev, ...updates }));
    setLastSaved(new Date());
  }, [dbContractId]);

  const clientValidation = validateClientProfileForContract({
    address: data.projectAddress,
    phone: data.clientPhone,
    email: data.clientEmail,
  });

  const isContractSent = Boolean(
    data.status &&
      ['sent', 'client_signed', 'signed', 'partially_signed', 'executed'].includes(
        data.status.toLowerCase()
      )
  );

  const canProceed = (() => {
    if (currentStep === 0) {
      return Boolean(
        data.clientName &&
        data.clientName.trim().length > 0 &&
        clientValidation.isValid
      );
    }
    if (currentStep === totalSteps - 1) {
      return isContractSent;
    }
    return true;
  })();

  const handleNext = async () => {
    if (!canProceed) return;

    if (!dbContractId && (data.leadId || data.clientId)) {
      setIsSaving(true);
      try {
        const nextStep = Math.min(currentStep + 1, totalSteps - 1);
        const res = await buildContract({
          lead_id: data.leadId ? Number(data.leadId) : undefined,
          client_id: data.clientId ? Number(data.clientId) : undefined,
          contract_id: undefined,
          contract_data: getContractDataPayload(data, nextStep) as any,
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
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      if (dbContractId && data.status === 'draft') {
        autoSaveContractDraft(dbContractId, getContractDataPayload(data, nextStep)).catch((e) =>
          console.error('Failed to auto-save step transition', e)
        );
      }
    } else {
      if (onSuccess) onSuccess();
      onBack();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      if (dbContractId && data.status === 'draft') {
        autoSaveContractDraft(dbContractId, getContractDataPayload(data, prevStep)).catch((e) =>
          console.error('Failed to auto-save step transition', e)
        );
      }
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
              <ContractDetailsStep data={data} onDataChange={handleDataChange} onStepChange={setCurrentStep} />
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
              <span className="text-xs text-red-600 font-semibold animate-pulse">
                {!data.clientName ? 'Select a pipeline client to proceed →' : 'Complete client contact info required →'}
              </span>
            )}
            {!canProceed && currentStep === totalSteps - 1 && (
              <span className="text-xs text-amber-600 font-semibold flex items-center gap-1.5 animate-pulse">
                <AlertCircle size={14} className="shrink-0 text-amber-500" />
                <span>Send contract to client before finishing →</span>
              </span>
            )}
            <button
              onClick={handleNext}
              disabled={!canProceed}
              data-testid="wizard-finish-btn"
              title={
                currentStep === totalSteps - 1 && !canProceed
                  ? 'Please send the contract to client via Email/SMS before clicking Finish'
                  : undefined
              }
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                canProceed
                  ? 'bg-[#1a5ba5] hover:bg-[#154a87] text-white shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 cursor-pointer'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-80'
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
