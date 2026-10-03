import React from 'react';
import { CheckCircle2, FileText, ArrowRight, AlertTriangle } from 'lucide-react';
import { SentResult } from './types';

interface UploadSuccessViewProps {
  result: SentResult;
}

export function UploadSuccessView({ result }: UploadSuccessViewProps) {
  return (
    <div className="py-4 text-center space-y-4">
      <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
        <CheckCircle2 size={32} strokeWidth={2} />
      </div>
      <div>
        <h3 className="text-base font-black text-slate-900 dark:text-white">
          {result.simulated ? 'Estimate Logged' : 'Estimate Sent!'}
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
          {result.message}
        </p>
        {result.estimateNumber && (
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
            <FileText size={12} />
            {result.estimateNumber}
          </div>
        )}
        {!result.simulated && (
          <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
            <ArrowRight size={12} />
            Lead pipeline advanced to <strong>Estimate Sent</strong>
          </div>
        )}
      </div>
      {result.simulated && (
        <div className="flex items-start gap-2 text-left p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-500/30">
          <AlertTriangle size={14} className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
            Email was <strong>not sent</strong> — test addresses are skipped. Use a real homeowner
            email for live delivery.
          </p>
        </div>
      )}
    </div>
  );
}
