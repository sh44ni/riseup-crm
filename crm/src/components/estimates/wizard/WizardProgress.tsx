import React from 'react';

interface WizardProgressProps {
  currentStep: number;
  totalSteps: number;
  stepLabel: string;
}

export function WizardProgress({ currentStep, totalSteps, stepLabel }: WizardProgressProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-col gap-1">
        <div className="text-sm font-bold text-slate-800">{stepLabel}</div>
        <div className="flex items-center gap-1.5">
          {Array.from({ length: totalSteps }).map((_, i) => {
            const isCompleted = i < currentStep;
            const isCurrent = i === currentStep;
            
            let classes = "w-2 h-2 rounded-full transition-all duration-300";
            if (isCurrent) {
              classes += " bg-[#091b36] scale-125";
            } else if (isCompleted) {
              classes += " bg-[#00b0ed]";
            } else {
              classes += " border border-slate-300 bg-transparent";
            }
            
            return <div key={i} className={classes} />;
          })}
          <span className="text-[10px] text-slate-400 font-medium ml-1">
            {currentStep + 1}/{totalSteps}
          </span>
        </div>
      </div>
    </div>
  );
}
