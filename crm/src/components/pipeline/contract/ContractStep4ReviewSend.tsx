import React from 'react';
import { ExternalLink } from 'lucide-react';
import type { ContractFormState } from './contractTypes';
import { formatMoney, sumPayments, labelCls, inputCls, textareaCls } from './contractTypes';
import { previewContractUrl } from '@/api/contractApi';

interface ContractStep4Props {
  form: ContractFormState;
  toEmail: string;
  setToEmail: (v: string) => void;
  customMessage: string;
  setCustomMessage: (v: string) => void;
  isBuilding: boolean;
  isSending: boolean;
  builtContractId: number | null;
  builtContractNumber: string;
  builtPdfUrl: string | null;
  sendSuccess: boolean;
  errorMsg: string | null;
  onBuild: () => void;
  onSend: () => void;
}

export function ContractStep4ReviewSend({
  form,
  toEmail,
  setToEmail,
  customMessage,
  setCustomMessage,
  isBuilding,
  isSending,
  builtContractId,
  builtContractNumber,
  builtPdfUrl,
  sendSuccess,
  errorMsg,
  onBuild,
  onSend,
}: ContractStep4Props) {
  const totalPayments = sumPayments(form.paymentRows);

  return (
    <div className="space-y-5">
      {/* Contract Summary */}
      <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 space-y-3">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Contract Summary
        </h3>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
          {[
            ['Contract #', builtContractNumber || '—'],
            ['Client', form.clientName],
            ['Address', form.projectAddress],
            ['Contract Price', formatMoney(form.contractPrice)],
            ['Downpayment', formatMoney(form.downpayment)],
            ['Start Date', form.commencementDate],
            ['Completion', form.completionDate],
            ['Salesperson', form.salespersonName],
          ].map(([label, val]) => (
            <div key={label} className="flex flex-col gap-0.5">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                {label}
              </span>
              <span className="font-bold text-slate-800 dark:text-white">{val}</span>
            </div>
          ))}
        </div>

        {builtPdfUrl && (
          <a
            href={builtPdfUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-600 dark:text-sky-400 hover:text-sky-800 dark:hover:text-sky-300 transition-colors"
          >
            <ExternalLink size={13} />
            Preview Contract PDF
          </a>
        )}
        {builtContractId && !builtPdfUrl && (
          <a
            href={previewContractUrl(builtContractId)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-600 dark:text-sky-400 hover:text-sky-800 dark:hover:text-sky-300 transition-colors"
          >
            <ExternalLink size={13} />
            Preview Contract PDF
          </a>
        )}
      </div>

      {/* Payment Schedule summary */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-100 dark:bg-white/5">
              <th className="text-left px-3 py-2 font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                #
              </th>
              <th className="text-left px-3 py-2 font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Milestone
              </th>
              <th className="text-right px-3 py-2 font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {form.paymentRows.map((row, i) => (
              <tr
                key={i}
                className="border-t border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/[0.02]"
              >
                <td className="px-3 py-2 text-slate-500">{row.number}</td>
                <td className="px-3 py-2 text-slate-800 dark:text-slate-200">
                  {row.description}
                </td>
                <td className="px-3 py-2 text-right font-bold text-slate-800 dark:text-white">
                  {formatMoney(row.amount)}
                </td>
              </tr>
            ))}
            <tr className="border-t-2 border-slate-300 dark:border-white/20 bg-slate-50 dark:bg-white/[0.03]">
              <td colSpan={2} className="px-3 py-2 font-extrabold text-slate-700 dark:text-white">
                Total
              </td>
              <td className="px-3 py-2 text-right font-black text-amber-700 dark:text-amber-400">
                {formatMoney(totalPayments)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Email & Message */}
      <div className="space-y-3">
        <div>
          <label className={labelCls}>Send To (Email)</label>
          <input
            type="email"
            value={toEmail}
            onChange={(e) => setToEmail(e.target.value)}
            className={inputCls}
            placeholder="client@example.com"
            disabled={sendSuccess}
          />
        </div>
        <div>
          <label className={labelCls}>Custom Message (Optional)</label>
          <textarea
            rows={3}
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            className={textareaCls}
            placeholder="Add a personal note to accompany the contract email…"
            disabled={sendSuccess}
          />
        </div>
      </div>
    </div>
  );
}
