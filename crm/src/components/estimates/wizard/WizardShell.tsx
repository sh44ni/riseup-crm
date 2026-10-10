import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { TwoOptionsEstimate, EstimateClient } from '@/types/estimateContractTypes';
import { 
  DEFAULT_PLAN_A, 
  DEFAULT_PLAN_B, 
  DEFAULT_ADDON_1, 
  DEFAULT_ADDON_2, 
  DEFAULT_PRICING, 
  WIZARD_STEPS 
} from '@/shared/config/estimateConstants';
import { api } from '@/lib/api';
import { PreviewPanel } from './PreviewPanel';
import { WizardProgress } from './WizardProgress';
import { Check, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { useSidebarPin } from '@/lib/sidebarPrefStore';

// Step components
import { TemplateStep } from './steps/TemplateStep';
import { DetailsStep } from './steps/DetailsStep';
import { Photo2Step } from './steps/Photo2Step';
import { PlansStep } from './steps/PlansStep';
import { AddonsStep } from './steps/AddonsStep';
import { SpecialPricingStep } from './steps/SpecialPricingStep';
import { ReviewSendStep } from './steps/ReviewSendStep';

interface WizardPrefill {
  clientName?: string;
  leadId?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  clientId?: string;
}

interface WizardShellProps {
  estimateId: string | null;
  initialData?: TwoOptionsEstimate;
  onBack?: () => void;
  prefill?: WizardPrefill;
  onSuccess?: () => void;
}

const DEFAULT_ESTIMATE: TwoOptionsEstimate = {
  templateId: 'two-options',
  status: 'draft',
  proposalDate: new Date().toISOString(),
  client: { leadId: '', name: '', property: '', phone: '', email: '' },
  plans: [DEFAULT_PLAN_A, DEFAULT_PLAN_B],
  addons: [DEFAULT_ADDON_1, DEFAULT_ADDON_2],
  pricing: DEFAULT_PRICING,
  photo2: { mode: 'reuse-photo1' }
};

export function WizardShell({ estimateId, initialData, onBack, prefill, onSuccess }: WizardShellProps) {
  const { isPinned } = useSidebarPin();

  // Capture initial URL step once on mount before any re-renders or URL sync
  const [initialUrlStep] = useState<number | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const s = params.get('step');
    if (s !== null) {
      const parsed = parseInt(s, 10);
      if (!isNaN(parsed) && parsed >= 0 && parsed < WIZARD_STEPS.length) {
        return parsed;
      }
    }
    return null;
  });

  // If initial URL had step > 0, honor it; otherwise for existing estimate or lead draft, default to Step 1 (Details), never Step 0
  const [currentStep, setCurrentStep] = useState<number>(() => {
    if (initialUrlStep !== null && initialUrlStep > 0) return initialUrlStep;
    if (estimateId || prefill?.leadId) return 1;
    return initialUrlStep ?? 0;
  });
  const [data, setData] = useState<TwoOptionsEstimate>(initialData || DEFAULT_ESTIMATE);
  const [hasLoadedDraft, setHasLoadedDraft] = useState(!estimateId && !prefill?.leadId);
  const [isLoadingEstimate, setIsLoadingEstimate] = useState(Boolean(estimateId));
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [dbEstimateId, setDbEstimateId] = useState<string | null>(estimateId || null);
  const [initError, setInitError] = useState<string | null>(null);
  const creatingRef = useRef(false);
  
  const stepDef = WIZARD_STEPS[currentStep] || WIZARD_STEPS[0];
  const totalSteps = WIZARD_STEPS.length;

  // Sync step & id to URL so refresh or bookmark preserves exact state (only after draft is loaded)
  useEffect(() => {
    if (!hasLoadedDraft) return;
    const url = new URL(window.location.href);
    url.searchParams.set('mode', 'studio');
    if (dbEstimateId) {
      url.searchParams.set('id', dbEstimateId);
    }
    url.searchParams.set('step', String(currentStep));
    window.history.replaceState(null, '', url.toString());
  }, [currentStep, dbEstimateId, hasLoadedDraft]);

  // Apply initial data if provided via props
  useEffect(() => {
    if (initialData) {
      setData(initialData);
      if (typeof initialData.wizardStep === 'number' && initialData.wizardStep > 0 && initialData.wizardStep < totalSteps) {
        setCurrentStep(initialData.wizardStep);
      }
    }
  }, [initialData, totalSteps]);

  // Keep dbEstimateId in sync if data.id gets populated
  useEffect(() => {
    if (data.id && String(data.id) !== dbEstimateId) {
      setDbEstimateId(String(data.id));
    }
  }, [data.id, dbEstimateId]);

  // Apply prefill ONLY for new estimates (never overwrite an existing estimateId)
  useEffect(() => {
    if (estimateId) return;
    if (prefill && (prefill.clientName || prefill.leadId)) {
      setData(prev => ({
        ...prev,
        client: {
          ...prev.client,
          leadId: prefill.leadId || prev.client.leadId,
          clientId: prefill.clientId,
          name: prefill.clientName || prev.client.name,
          property: prefill.address ? `${prefill.address}${prefill.city ? `, ${prefill.city}` : ''}` : prev.client.property,
          phone: prefill.phone || prev.client.phone,
          email: prefill.email || prev.client.email,
        },
      }));
      // Skip template step if brand new client is pre-filled, go straight to details
      setCurrentStep(prev => (prev === 0 ? 1 : prev));
    }
  }, [prefill, estimateId]);

  // Auto-restore or initialize draft estimate for prefilled lead (when no explicit estimateId is provided)
  useEffect(() => {
    if (estimateId || !prefill?.leadId) return;
    setInitError(null);
    let isMounted = true;
    (async () => {
      try {
        const res: any = await api.request(`/admin/estimates/draft-by-lead/${prefill.leadId}`);
        if (!isMounted) return;
        if (res?.exists && res.estimate) {
          const est = res.estimate;
          let pd: any = {};
          if (est.proposal_data) {
            pd = typeof est.proposal_data === 'string' ? JSON.parse(est.proposal_data) : est.proposal_data;
          }

          const estClient = pd.client || {};
          const mergedClient: EstimateClient = {
            leadId: String(estClient.leadId || est.lead_id || prefill.leadId || ''),
            clientId: estClient.clientId ? String(estClient.clientId) : (est.client_id ? String(est.client_id) : prefill.clientId),
            name: estClient.name || est.customer_name || prefill.clientName || '',
            property: estClient.property || est.customer_address || prefill.address || '',
            phone: estClient.phone || est.customer_phone || prefill.phone || '',
            email: estClient.email || est.customer_email || prefill.email || '',
            addressSource: estClient.addressSource,
          };

          const merged: TwoOptionsEstimate = {
            ...DEFAULT_ESTIMATE,
            ...pd,
            id: String(est.id),
            estimateNumber: est.estimate_number || pd.estimateNumber,
            status: (est.status || pd.status || 'draft') as 'draft' | 'sent',
            client: mergedClient,
          };

          setData(merged);
          setDbEstimateId(String(est.id));

          // Restore step from URL or saved wizardStep (never step 0 for an existing draft)
          let stepToRestore = 1;
          if (initialUrlStep !== null && initialUrlStep > 0) {
            stepToRestore = initialUrlStep;
          } else if (typeof pd.wizardStep === 'number' && pd.wizardStep > 0 && pd.wizardStep < totalSteps) {
            stepToRestore = pd.wizardStep;
          } else if (typeof pd.wizard_step === 'number' && pd.wizard_step > 0 && pd.wizard_step < totalSteps) {
            stepToRestore = pd.wizard_step;
          } else if (pd.plans && pd.plans.length > 0 && (pd.plans[0]?.price > 0 || pd.plans[1]?.price > 0)) {
            stepToRestore = 3;
          } else {
            stepToRestore = 1; // Resume at details
          }
          setCurrentStep(stepToRestore);
        } else if (!dbEstimateId && prefill.leadId) {
          // Immediately initialize draft in DB so PreviewPanel and autosave activate without waiting
          const initialDataPayload: TwoOptionsEstimate = {
            ...data,
            client: {
              ...data.client,
              leadId: prefill.leadId,
              clientId: prefill.clientId,
              name: prefill.clientName || data.client.name,
              phone: prefill.phone || data.client.phone,
              email: prefill.email || data.client.email,
              property: prefill.address ? `${prefill.address}${prefill.city ? `, ${prefill.city}` : ''}` : data.client.property,
            },
            wizardStep: 1,
          };
          const initRes: any = await api.request('/admin/estimates/two-options', {
            method: 'POST',
            body: JSON.stringify(initialDataPayload),
          });
          const est = initRes?.estimate;
          if (est?.id && isMounted) {
            setDbEstimateId(String(est.id));
            setData(prev => ({ ...prev, ...initialDataPayload, id: String(est.id), estimateNumber: est.estimate_number }));
            setCurrentStep(1);
          } else if (isMounted) {
            setInitError('Failed to create draft — the server returned an unexpected response.');
          }
        }
      } catch (err: any) {
        console.warn('Failed checking/initializing draft estimate by lead:', err);
        if (isMounted) setInitError(err?.message || 'Could not connect to the estimate service. Please try again.');
      } finally {
        if (isMounted) setHasLoadedDraft(true);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [prefill?.leadId, estimateId, totalSteps]);

  // Auto-initialize draft when a client is manually selected from search on Details step
  useEffect(() => {
    const leadId = data.client.leadId;
    if (!leadId || dbEstimateId || estimateId || creatingRef.current) return;
    creatingRef.current = true;
    setInitError(null);
    let isMounted = true;
    (async () => {
      try {
        // First check if a draft already exists for this lead
        const check: any = await api.request(`/admin/estimates/draft-by-lead/${leadId}`);
        if (!isMounted) return;
        if (check?.exists && check.estimate) {
          const est = check.estimate;
          let pd: any = {};
          if (est.proposal_data) {
            pd = typeof est.proposal_data === 'string' ? JSON.parse(est.proposal_data) : est.proposal_data;
          }

          const estClient = pd.client || {};
          const mergedClient: EstimateClient = {
            leadId: String(estClient.leadId || est.lead_id || leadId),
            clientId: estClient.clientId ? String(estClient.clientId) : (est.client_id ? String(est.client_id) : undefined),
            name: estClient.name || est.customer_name || data.client.name,
            property: estClient.property || est.customer_address || data.client.property,
            phone: estClient.phone || est.customer_phone || data.client.phone,
            email: estClient.email || est.customer_email || data.client.email,
            addressSource: estClient.addressSource,
          };

          const merged: TwoOptionsEstimate = {
            ...DEFAULT_ESTIMATE,
            ...pd,
            id: String(est.id),
            estimateNumber: est.estimate_number || pd.estimateNumber,
            status: (est.status || pd.status || 'draft') as 'draft' | 'sent',
            client: mergedClient,
          };

          setData(merged);
          setDbEstimateId(String(est.id));

          let stepToRestore = 1;
          if (typeof pd.wizardStep === 'number' && pd.wizardStep > 0 && pd.wizardStep < totalSteps) {
            stepToRestore = pd.wizardStep;
          } else if (typeof pd.wizard_step === 'number' && pd.wizard_step > 0 && pd.wizard_step < totalSteps) {
            stepToRestore = pd.wizard_step;
          }
          setCurrentStep(stepToRestore);
        } else {
          const initRes: any = await api.request('/admin/estimates/two-options', {
            method: 'POST',
            body: JSON.stringify({
              ...data,
              wizardStep: currentStep,
            }),
          });
          const est = initRes?.estimate;
          if (est?.id && isMounted) {
            setDbEstimateId(String(est.id));
            setData(prev => ({ ...prev, id: String(est.id), estimateNumber: est.estimate_number }));
          } else if (isMounted) {
            setInitError('Failed to create draft — the server returned an unexpected response.');
          }
        }
      } catch (err: any) {
        console.warn('Failed auto-initializing draft on client select:', err);
        if (isMounted) setInitError(err?.message || 'Could not create estimate draft. Please try again.');
      } finally {
        creatingRef.current = false;
        if (isMounted) setHasLoadedDraft(true);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [data.client.leadId, dbEstimateId, estimateId, currentStep, totalSteps]);

  // Load existing estimate if editing via estimateId
  useEffect(() => {
    if (!estimateId) return;
    let isMounted = true;
    setIsLoadingEstimate(true);
    setInitError(null);
    (async () => {
      try {
        const res: any = await api.request(`/admin/estimates/${estimateId}`);
        const est = res?.estimate;
        if (est && isMounted) {
          let pd: any = {};
          if (est.proposal_data) {
            pd = typeof est.proposal_data === 'string' ? JSON.parse(est.proposal_data) : est.proposal_data;
          }

          // Build merged client from proposal_data and db columns
          const estClient = pd.client || {};
          const mergedClient: EstimateClient = {
            leadId: String(estClient.leadId || est.lead_id || ''),
            clientId: estClient.clientId ? String(estClient.clientId) : (est.client_id ? String(est.client_id) : undefined),
            name: estClient.name || est.customer_name || '',
            property: estClient.property || est.customer_address || '',
            phone: estClient.phone || est.customer_phone || '',
            email: estClient.email || est.customer_email || '',
            addressSource: estClient.addressSource,
          };

          const merged: TwoOptionsEstimate = {
            ...DEFAULT_ESTIMATE,
            ...pd,
            id: String(est.id),
            estimateNumber: est.estimate_number || pd.estimateNumber,
            status: (est.status || pd.status || 'draft') as 'draft' | 'sent',
            client: mergedClient,
          };

          setData(merged);
          setDbEstimateId(String(est.id));

          // Determine step to resume:
          // 1. If explicit valid step > 0 was in URL on initial mount, use it
          // 2. If wizardStep was saved in proposal_data, resume there (must be >= 1 for existing drafts)
          // 3. Otherwise smart resume:
          //    - If plans configured with pricing, resume at Plans (Step 3)
          //    - Otherwise resume at Client Details (Step 1)
          let stepToRestore = 1;
          if (initialUrlStep !== null && initialUrlStep > 0) {
            stepToRestore = initialUrlStep;
          } else if (typeof pd.wizardStep === 'number' && pd.wizardStep > 0 && pd.wizardStep < totalSteps) {
            stepToRestore = pd.wizardStep;
          } else if (typeof pd.wizard_step === 'number' && pd.wizard_step > 0 && pd.wizard_step < totalSteps) {
            stepToRestore = pd.wizard_step;
          } else if (pd.plans && pd.plans.length > 0 && (pd.plans[0]?.price > 0 || pd.plans[1]?.price > 0)) {
            stepToRestore = 3; // Plans step
          } else {
            stepToRestore = 1; // Details step
          }

          setCurrentStep(stepToRestore);
        }
      } catch (err: any) {
        console.error('Failed to load estimate', err);
        if (isMounted) setInitError(err?.message || 'Could not load estimate draft.');
      } finally {
        if (isMounted) {
          setHasLoadedDraft(true);
          setIsLoadingEstimate(false);
        }
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [estimateId, totalSteps]);

  // Data update handler
  const handleDataChange = useCallback((updates: Partial<TwoOptionsEstimate>) => {
    setData(prev => ({ ...prev, ...updates }));
  }, []);

  // Debounced Auto-save (only runs AFTER existing draft has loaded, and when dbEstimateId is set)
  useEffect(() => {
    if (!hasLoadedDraft || !dbEstimateId) return;

    const timer = setTimeout(async () => {
      setIsSaving(true);
      try {
        await api.request(`/admin/estimates/${dbEstimateId}/two-options`, {
          method: 'PATCH',
          body: JSON.stringify({
            ...data,
            wizardStep: currentStep,
          }),
        });
        setLastSaved(new Date());
      } catch (err) {
        console.error('Failed to autosave estimate', err);
      } finally {
        setIsSaving(false);
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [hasLoadedDraft, data, dbEstimateId, currentStep]);

  const isEstimateSent = Boolean(
    data.status &&
      ['sent', 'accepted', 'declined'].includes(data.status.toLowerCase())
  );

  // Step-level validation:
  // - Step 1: must select a client / lead
  // - Step 6 (Review & Send): estimate must be sent to client before finishing (matching contract wizard)
  const canProceed = (() => {
    if (currentStep === 1) {
      return Boolean(data.client?.leadId || data.client?.name?.trim());
    }
    if (currentStep === totalSteps - 1) {
      return isEstimateSent;
    }
    return true;
  })();

  const handleNext = async () => {
    if (!canProceed) return;

    const nextStep = currentStep + 1;

    // If stepping forward and no DB draft exists yet, initialize it
    if (!dbEstimateId && data.client?.leadId) {
      setIsSaving(true);
      try {
        const res: any = await api.request('/admin/estimates/two-options', {
          method: 'POST',
          body: JSON.stringify({
            ...data,
            wizardStep: nextStep,
          }),
        });
        const est = res?.estimate;
        if (est?.id) {
          setDbEstimateId(String(est.id));
          setData(prev => ({ ...prev, id: String(est.id), estimateNumber: est.estimate_number, wizardStep: nextStep }));
        }
      } catch (err) {
        console.error('Failed to initialize draft estimate:', err);
      } finally {
        setIsSaving(false);
      }
    } else if (dbEstimateId && nextStep < totalSteps) {
      // Instantly record step transition
      setData(prev => ({ ...prev, wizardStep: nextStep }));
      api.request(`/admin/estimates/${dbEstimateId}/two-options`, {
        method: 'PATCH',
        body: JSON.stringify({
          ...data,
          wizardStep: nextStep,
        }),
      }).catch((e) => console.warn('Failed to save step transition:', e));
    }

    if (currentStep < totalSteps - 1) {
      setCurrentStep(nextStep);
    } else {
      if (onSuccess) onSuccess();
      onBack?.();
    }
  };

  const handleBack = () => {
    // Prevent navigating back to TemplateStep (step 0) if editing an existing estimate
    const minStep = dbEstimateId ? 1 : 0;
    if (currentStep > minStep) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      setData(prev => ({ ...prev, wizardStep: prevStep }));
      if (dbEstimateId) {
        api.request(`/admin/estimates/${dbEstimateId}/two-options`, {
          method: 'PATCH',
          body: JSON.stringify({
            ...data,
            wizardStep: prevStep,
          }),
        }).catch((e) => console.warn('Failed to save step transition:', e));
      }
    }
  };

  if (isLoadingEstimate) {
    return createPortal(
      <div className={`fixed top-0 right-0 bottom-0 ${isPinned ? 'left-64' : 'left-[72px]'} z-40 flex items-center justify-center bg-slate-50/95 backdrop-blur-xs select-none`}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin text-sky-600" />
          <p className="text-xs font-bold text-slate-700">Loading estimate draft...</p>
        </div>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div className={`fixed top-0 right-0 bottom-0 ${isPinned ? 'left-64' : 'left-[72px]'} z-30 flex bg-slate-50 overflow-hidden select-none transition-[left] duration-300`}>
      {/* Left Panel: Wizard Content */}
      <div className="w-1/2 flex flex-col min-h-0 bg-white border-r border-slate-200">
        
        {/* Header */}
        <div className="h-14 flex items-center justify-between px-6 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
                title="Back to Estimates"
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <WizardProgress 
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

        {/* Step Body — scrollable, takes all remaining space */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6">
          <div className="max-w-xl mx-auto w-full pb-8">
            {currentStep === 0 && <TemplateStep data={data} onDataChange={handleDataChange} />}
            {currentStep === 1 && <DetailsStep data={data} onDataChange={handleDataChange} />}
            {currentStep === 2 && <Photo2Step data={data} onDataChange={handleDataChange} />}
            {currentStep === 3 && <PlansStep data={data} onDataChange={handleDataChange} />}
            {currentStep === 4 && <AddonsStep data={data} onDataChange={handleDataChange} />}
            {currentStep === 5 && <SpecialPricingStep data={data} onDataChange={handleDataChange} />}
            {currentStep === 6 && <ReviewSendStep data={data} onDataChange={handleDataChange} />}
          </div>
        </div>

        {/* Footer — pinned at bottom */}
        <div className="h-16 px-6 border-t border-slate-100 flex items-center justify-between flex-shrink-0 bg-white">
          <button
            onClick={handleBack}
            disabled={currentStep === 0 || (Boolean(dbEstimateId) && currentStep === 1)}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              currentStep === 0 || (Boolean(dbEstimateId) && currentStep === 1)
                ? 'text-slate-300 cursor-not-allowed' 
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer'
            }`}
          >
            Back
          </button>
          <div className="flex items-center gap-3">
            {!canProceed && currentStep === 1 && (
              <span className="text-xs text-red-600 font-semibold animate-pulse">
                Select a client to proceed →
              </span>
            )}
            {!canProceed && currentStep === totalSteps - 1 && (
              <span className="text-xs text-amber-600 font-semibold flex items-center gap-1.5 animate-pulse">
                <AlertCircle size={14} className="shrink-0 text-amber-500" />
                <span>Send estimate proposal to client before finishing →</span>
              </span>
            )}
            <button
              onClick={handleNext}
              disabled={!canProceed}
              data-testid="estimate-wizard-finish-btn"
              title={
                currentStep === totalSteps - 1 && !canProceed
                  ? 'Please send the proposal to client via Email before clicking Finish'
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

      {/* Right Panel: Live PDF Preview */}
      <div className="w-1/2 min-h-0 bg-slate-100 overflow-hidden">
        <PreviewPanel 
          estimateId={dbEstimateId} 
          data={data} 
          currentStep={currentStep} 
          previewPage={stepDef.previewPage} 
          lastSaved={lastSaved}
          initError={initError}
        />
      </div>
    </div>,
    document.body
  );
}

export default WizardShell;
