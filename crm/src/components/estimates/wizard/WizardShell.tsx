import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { TwoOptionsEstimate } from '@/types/estimateContractTypes';
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
import { Check, ArrowLeft } from 'lucide-react';

// Lazy imports for step components (they may not exist yet during initial build)
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

export function WizardShell({ estimateId, initialData, onBack, prefill }: WizardShellProps) {
  // Restore step from URL on mount
  const getInitialStep = () => {
    const params = new URLSearchParams(window.location.search);
    const s = parseInt(params.get('step') || '0', 10);
    return isNaN(s) || s < 0 || s >= WIZARD_STEPS.length ? 0 : s;
  };
  const [currentStep, setCurrentStep] = useState(getInitialStep);
  const [data, setData] = useState<TwoOptionsEstimate>(initialData || DEFAULT_ESTIMATE);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [dbEstimateId, setDbEstimateId] = useState<string | null>(estimateId || null);
  const [initError, setInitError] = useState<string | null>(null);
  const creatingRef = useRef(false);
  
  const stepDef = WIZARD_STEPS[currentStep] || WIZARD_STEPS[0];
  const totalSteps = WIZARD_STEPS.length;

  // Sync step to URL so refresh preserves position
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('step', String(currentStep));
    window.history.replaceState(null, '', url.toString());
  }, [currentStep]);

  // Apply initial data or load from server
  useEffect(() => {
    if (initialData) {
      setData(initialData);
    }
  }, [initialData]);

  // Keep dbEstimateId in sync if data.id gets populated
  useEffect(() => {
    if (data.id && String(data.id) !== dbEstimateId) {
      setDbEstimateId(String(data.id));
    }
  }, [data.id, dbEstimateId]);

  // Apply prefill from pipeline/client navigation
  useEffect(() => {
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
      // Skip template step if client is pre-filled, go straight to details
      setCurrentStep(1);
    }
  }, [prefill]);

  // Auto-restore or initialize draft estimate for prefilled lead
  useEffect(() => {
    if (estimateId || !prefill?.leadId) return;
    setInitError(null);
    (async () => {
      try {
        const res: any = await api.request(`/admin/estimates/draft-by-lead/${prefill.leadId}`);
        if (res?.exists && res.estimate) {
          const est = res.estimate;
          if (est.proposal_data) {
            const pd = typeof est.proposal_data === 'string' ? JSON.parse(est.proposal_data) : est.proposal_data;
            setData(prev => ({ ...prev, ...pd, id: est.id, estimateNumber: est.estimate_number }));
          } else {
            setData(prev => ({ ...prev, id: est.id, estimateNumber: est.estimate_number }));
          }
          setDbEstimateId(String(est.id));
          window.history.replaceState(null, '', `?mode=studio&id=${est.id}`);
        } else if (!dbEstimateId && prefill.leadId) {
          // Immediately initialize draft in DB so PreviewPanel and autosave activate without waiting
          const initRes: any = await api.request('/admin/estimates/two-options', {
            method: 'POST',
            body: JSON.stringify({
              ...data,
              client: {
                ...data.client,
                leadId: prefill.leadId,
                name: prefill.clientName || data.client.name,
                phone: prefill.phone || data.client.phone,
                email: prefill.email || data.client.email,
                property: prefill.address ? `${prefill.address}${prefill.city ? `, ${prefill.city}` : ''}` : data.client.property,
              }
            }),
          });
          const est = initRes?.estimate;
          if (est?.id) {
            setDbEstimateId(String(est.id));
            setData(prev => ({ ...prev, id: est.id, estimateNumber: est.estimate_number }));
            window.history.replaceState(null, '', `?mode=studio&id=${est.id}`);
          } else {
            setInitError('Failed to create draft — the server returned an unexpected response.');
          }
        }
      } catch (err: any) {
        console.warn('Failed checking/initializing draft estimate by lead:', err);
        setInitError(err?.message || 'Could not connect to the estimate service. Please try again.');
      }
    })();
  }, [prefill?.leadId, estimateId]);

  // Auto-initialize draft when a client is manually selected from search
  // (covers the case where there's no prefill.leadId but the user picks a lead on the Details step)
  useEffect(() => {
    const leadId = data.client.leadId;
    if (!leadId || dbEstimateId || estimateId || creatingRef.current) return;
    creatingRef.current = true;
    setInitError(null);
    (async () => {
      try {
        // First check if a draft already exists for this lead
        const check: any = await api.request(`/admin/estimates/draft-by-lead/${leadId}`);
        if (check?.exists && check.estimate) {
          const est = check.estimate;
          if (est.proposal_data) {
            const pd = typeof est.proposal_data === 'string' ? JSON.parse(est.proposal_data) : est.proposal_data;
            setData(prev => ({ ...prev, ...pd, id: est.id, estimateNumber: est.estimate_number }));
          } else {
            setData(prev => ({ ...prev, id: est.id, estimateNumber: est.estimate_number }));
          }
          setDbEstimateId(String(est.id));
          window.history.replaceState(null, '', `?mode=studio&id=${est.id}`);
        } else {
          const initRes: any = await api.request('/admin/estimates/two-options', {
            method: 'POST',
            body: JSON.stringify(data),
          });
          const est = initRes?.estimate;
          if (est?.id) {
            setDbEstimateId(String(est.id));
            setData(prev => ({ ...prev, id: est.id, estimateNumber: est.estimate_number }));
            window.history.replaceState(null, '', `?mode=studio&id=${est.id}`);
          } else {
            setInitError('Failed to create draft — the server returned an unexpected response.');
          }
        }
      } catch (err: any) {
        console.warn('Failed auto-initializing draft on client select:', err);
        setInitError(err?.message || 'Could not create estimate draft. Please try again.');
      } finally {
        creatingRef.current = false;
      }
    })();
  }, [data.client.leadId]);

  // Load existing estimate if editing
  useEffect(() => {
    if (estimateId) {
      (async () => {
        try {
          const res = await api.request(`/admin/estimates/${estimateId}`);
          const est = (res as any).estimate;
          if (est?.proposal_data) {
            const pd = typeof est.proposal_data === 'string' ? JSON.parse(est.proposal_data) : est.proposal_data;
            setData(prev => ({ ...prev, ...pd, id: est.id, estimateNumber: est.estimate_number }));
          }
        } catch (err) {
          console.error('Failed to load estimate', err);
        }
      })();
    }
  }, [estimateId]);

  // Data update handler
  const handleDataChange = useCallback((updates: Partial<TwoOptionsEstimate>) => {
    setData(prev => ({ ...prev, ...updates }));
  }, []);

  // Debounced Auto-save (uses dbEstimateId which is set after auto-create)
  useEffect(() => {
    if (!dbEstimateId) return;

    const timer = setTimeout(async () => {
      setIsSaving(true);
      try {
        await api.request(`/admin/estimates/${dbEstimateId}/two-options`, {
          method: 'PATCH',
          body: JSON.stringify(data),
        });
        setLastSaved(new Date());
      } catch (err) {
        console.error('Failed to autosave estimate', err);
      } finally {
        setIsSaving(false);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [data, dbEstimateId]);

  // Step-level validation: must select a client on Details step before proceeding
  const canProceed = (() => {
    if (currentStep === 1) {
      // Details step — require a lead to be selected
      return Boolean(data.client.leadId);
    }
    return true;
  })();

  const handleNext = async () => {
    if (!canProceed) return;

    // If stepping forward and no DB draft exists yet, initialize it
    if (!dbEstimateId && data.client?.leadId) {
      setIsSaving(true);
      try {
        const res: any = await api.request('/admin/estimates/two-options', {
          method: 'POST',
          body: JSON.stringify(data),
        });
        const est = res?.estimate;
        if (est?.id) {
          setDbEstimateId(String(est.id));
          setData(prev => ({ ...prev, id: est.id, estimateNumber: est.estimate_number }));
          window.history.replaceState(null, '', `?mode=studio&id=${est.id}`);
        }
      } catch (err) {
        console.error('Failed to initialize draft estimate:', err);
      } finally {
        setIsSaving(false);
      }
    }

    if (currentStep < totalSteps - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  return createPortal(
    <div className="fixed top-0 right-0 bottom-0 left-64 z-50 flex bg-slate-50 overflow-hidden">
      {/* Left Panel: Wizard Content */}
      <div className="w-1/2 flex flex-col min-h-0 bg-white border-r border-slate-200">
        
        {/* Header */}
        <div className="h-14 flex items-center justify-between px-6 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
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
            disabled={currentStep === 0}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              currentStep === 0 
                ? 'text-slate-300 cursor-not-allowed' 
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            Back
          </button>
          <button
            onClick={handleNext}
            disabled={!canProceed}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
              canProceed
                ? 'bg-[#1a5ba5] text-white shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 cursor-pointer'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            {currentStep === totalSteps - 1 ? 'Finish' : 'Next Step'}
          </button>
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
