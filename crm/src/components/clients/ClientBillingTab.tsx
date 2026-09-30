import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { DollarSign, Download, CheckCircle2, AlertCircle, Plus, FileText, CreditCard, Printer, X } from 'lucide-react';
import { BillingSummary, ClientInvoice } from '@/types/client360Types';

interface ClientBillingTabProps {
  billing: BillingSummary;
}

export function ClientBillingTab({ billing }: ClientBillingTabProps) {
  const [selectedInvoice, setSelectedInvoice] = useState<ClientInvoice | null>(null);

  // Lock body scroll and listen for Escape key when invoice modal is open
  useEffect(() => {
    if (!selectedInvoice) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedInvoice(null);
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedInvoice]);

  const handleDownloadInvoice = (inv: ClientInvoice) => {
    setSelectedInvoice(inv);
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white/90 dark:bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-200/90 dark:border-white/10 p-5 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Total Billed</div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
            ${billing.totalBilled.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Contract Total Scope</div>
        </div>

        <div className="bg-white/90 dark:bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-200/90 dark:border-white/10 p-5 shadow-sm">
          <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Collected Cash</div>
          <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
            ${billing.collectedCash.toLocaleString()}
          </div>
          <div className="text-[11px] text-emerald-700/70 dark:text-emerald-400/70 mt-1">Cleared in Bank Account</div>
        </div>

        <div className="bg-white/90 dark:bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-200/90 dark:border-white/10 p-5 shadow-sm">
          <div className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide">Pending / Deposit Due</div>
          <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">
            ${billing.pendingDeposit.toLocaleString()}
          </div>
          <div className="text-[11px] text-amber-700/70 dark:text-amber-400/70 mt-1">Awaiting Milestone Payment</div>
        </div>
      </div>

      {/* Invoices List */}
      <div className="bg-white/90 dark:bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-200/90 dark:border-white/10 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
          <div className="flex items-center gap-2">
            <CreditCard size={18} className="text-[#0284C7] dark:text-sky-400" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Invoices & Payment Records</h3>
          </div>
        </div>

        {billing.invoices.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400 dark:text-slate-500">
            No invoices have been billed to this client yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-white/5">
            {billing.invoices.map((inv) => (
              <div key={inv.id} className="py-3.5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white text-xs">{inv.invoiceNumber}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        inv.status === 'paid'
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30'
                          : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30'
                      }`}
                    >
                      {inv.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{inv.description} • {inv.date}</div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-sm font-bold text-slate-900 dark:text-white">${inv.amount.toLocaleString()}</span>
                  <button
                    type="button"
                    onClick={() => handleDownloadInvoice(inv)}
                    title="Download / View Invoice Receipt"
                    className="p-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-2xs"
                  >
                    <Download size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invoice Receipt Modal */}
      {selectedInvoice &&
        createPortal(
          <div
            onClick={() => setSelectedInvoice(null)}
            className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-5 bg-slate-950/65 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white/95 dark:bg-[#0B1320]/95 backdrop-blur-2xl rounded-3xl border border-white/60 dark:border-white/10 w-full max-w-md shadow-[0_25px_80px_rgba(15,23,42,0.35)] dark:shadow-[0_25px_80px_rgba(0,0,0,0.85)] overflow-hidden my-auto p-6 space-y-4 max-h-[90vh] flex flex-col"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10 shrink-0">
                <div className="flex items-center gap-2">
                  <FileText size={18} className="text-[#0284C7] dark:text-sky-400" />
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">Invoice Receipt</h3>
                </div>
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-2.5 text-xs">
                <div className="flex justify-between font-bold text-slate-900 dark:text-white text-sm">
                  <span>{selectedInvoice.invoiceNumber}</span>
                  <span className="text-emerald-600 dark:text-emerald-400">${selectedInvoice.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-500 dark:text-slate-400">
                  <span>Status:</span>
                  <span className="font-semibold uppercase text-slate-800 dark:text-white">{selectedInvoice.status}</span>
                </div>
                <div className="flex justify-between text-slate-500 dark:text-slate-400">
                  <span>Date:</span>
                  <span className="font-semibold text-slate-800 dark:text-white">{selectedInvoice.date}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300">
                  <span className="font-semibold">Description:</span> {selectedInvoice.description}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 shrink-0">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer size={14} />
                  <span>Print Receipt</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedInvoice(null)}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 dark:bg-sky-600 hover:bg-slate-800 dark:hover:bg-sky-500 transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
