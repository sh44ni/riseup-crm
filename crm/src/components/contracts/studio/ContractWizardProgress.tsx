import React from 'react';
import { Check, ShieldCheck } from 'lucide-react';
import { CONTRACT_STUDIO_STEPS } from '@/types/contractStudioTypes';

interface ContractWizardProgressProps {
  currentStep: number;
  totalSteps: number;
  stepLabel: string;
  onStepClick?: (stepIndex: number) => void;
}

export function ContractWizardProgress({
  currentStep,
  totalSteps,
  stepLabel,
  onStepClick,
}: ContractWizardProgressProps) {
  const currentDef = CONTRACT_STUDIO_STEPS[currentStep] || CONTRACT_STUDIO_STEPS[0];

  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
          <ShieldCheck size={10} className="shrink-0" />
          <span>Step {currentStep + 1} of {totalSteps}</span>
        </span>
        <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate">
          {currentDef.label}
        </h2>
      </div>

      {/* Mini Step Track Indicators */}
      <div className="flex items-center gap-1.5">
        {CONTRACT_STUDIO_STEPS.map((step, idx) => {
          const isDone = idx < currentStep;
          const isCurrent = idx === currentStep;

          return (
            <button
              key={step.id}
              type="button"
              onClick={() => onStepClick?.(idx)}
              className={`h-1.5 rounded-full transition-all cursor-pointer ${
                isDone
                  ? 'w-6 bg-emerald-500'
                  : isCurrent
                  ? 'w-10 bg-amber-500 shadow-xs'
                  : 'w-4 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600'
              }`}
              title={`${idx + 1}. ${step.label}`}
            />
          );
        })}
      </div>
    </div>
  );
}

export default ContractWizardProgress;
