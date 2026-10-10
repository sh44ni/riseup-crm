import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  DollarSign,
  Download,
  CheckCircle2,
  AlertCircle,
  Plus,
  FileText,
  CreditCard,
  Printer,
  X,
  Send,
  ChevronDown,
  ChevronUp,
  Receipt,
  Clock,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { BillingSummary, ClientInvoice, Client360Record } from '@/types/client360Types';
import { CreateInvoiceModal } from './invoices/CreateInvoiceModal';
import { RecordPaymentModal } from './invoices/RecordPaymentModal';
import { renderInvoicePdf, sendInvoiceEmail } from '@/api/invoicesApi';

interface ClientBillingTabProps {
  billing: BillingSummary;
  client?: Client360Record;
  onOpenCreateInvoice?: () => void;
  onRefresh?: () => void;
}

export function ClientBillingTab({
  billing,
  client,
  onOpenCreateInvoice,
  onRefresh,
}: ClientBillingTabProps) {
  const [selectedInvoice, setSelectedInvoice] = useState<ClientInvoice | null>(null);
  const [paymentTargetInvoice, setPaymentTargetInvoice] = useState<ClientInvoice | null>(null);
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);
  const [isInternalCreateOpen, setIsInternalCreateOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Lock body scroll and listen for Escape key when invoice receipt modal is open
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

  const handleDownloadPdf = async (inv: ClientInvoice, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDownloadingId(inv.id);
    try {
      if (inv.pdfUrl) {
        window.open(inv.pdfUrl, '_blank');
        setDownloadingId(null);
        return;
      }
      const res = await renderInvoicePdf(inv.id);
      if (res.pdfUrl) {
        window.open(res.pdfUrl, '_blank');
      } else {
        showToast('PDF generated successfully.');
      }
      if (onRefresh) onRefresh();
    } catch (err: any) {
      showToast(err?.message || 'Failed to render PDF.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleSendInvoice = async (inv: ClientInvoice, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!client?.email && !inv.sentToEmail) {
      showToast('Client does not have an email address on file.');
      return;
    }
    setSendingId(inv.id);
    try {
      const targetEmail = inv.sentToEmail || client?.email;
      await sendInvoiceEmail(inv.id, {
        customerEmail: targetEmail,
        customerName: client?.name,
      });
      showToast(`Invoice ${inv.invoiceNumber} emailed to ${targetEmail}`);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      showToast(err?.message || 'Failed to send invoice email.');
    } finally {
      setSendingId(null);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedInvoiceId((prev) => (prev === id ? null : id));
  };

  const handleCreateClick = () => {
    if (onOpenCreateInvoice) {
      onOpenCreateInvoice();
    } else {
      setIsInternalCreateOpen(true);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[999999] px-4 py-3 rounded-2xl bg-slate-900 text-white text-xs font-bold shadow-2xl border border-white/10 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white/90 dark:bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-200/90 dark:border-white/10 p-5 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Total Billed
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
            ${billing.totalBilled.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">All Invoices & Scope</div>
        </div>

        <div className="bg-white/90 dark:bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-200/90 dark:border-white/10 p-5 shadow-sm">
          <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
            Collected Cash
          </div>
          <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
            ${billing.collectedCash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-emerald-700/70 dark:text-emerald-400/70 mt-1">Cleared Payments on File</div>
        </div>

        <div className="bg-white/90 dark:bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-200/90 dark:border-white/10 p-5 shadow-sm">
          <div className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
            Pending / Balance Due
          </div>
          <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">
            ${billing.pendingDeposit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-amber-700/70 dark:text-amber-400/70 mt-1">
            {billing.pendingDeposit <= 0 ? 'All Accounts Settled' : 'Awaiting Balance Payment'}
          </div>
        </div>
      </div>

      {/* Invoices List Section */}
      <div className="bg-white/90 dark:bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-200/90 dark:border-white/10 p-5 shadow-sm space-y-4">
        {/* Header with Title and Create Invoice Action */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-50 dark:bg-sky-950/40 text-brand-600 dark:text-sky-400 flex items-center justify-center font-bold">
              <CreditCard size={18} />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                Invoices & Payment Records
              </h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                Itemized line items, automated PDF receipts, and balance tracking
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCreateClick}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-brand-600 to-sky-600 hover:from-brand-700 hover:to-sky-700 text-white text-xs font-bold shadow-sm shadow-brand-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
          >
            <Plus size={14} />
            <span>Create Invoice</span>
          </button>
        </div>

        {billing.invoices.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-500 flex items-center justify-center mx-auto">
              <Receipt size={24} />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                No invoices on file yet
              </div>
              <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 max-w-sm mx-auto">
                Generate an official Letter-format invoice with company logo SVG, itemized services, and payment terms.
              </div>
            </div>
            <button
              type="button"
              onClick={handleCreateClick}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
            >
              <Plus size={14} />
              <span>Create First Invoice</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {billing.invoices.map((inv) => {
              const balance = inv.balance !== undefined ? inv.balance : inv.amount;
              const isPaid = inv.status === 'paid' || balance <= 0.001;
              const isExpanded = expandedInvoiceId === inv.id;
              const lineItems = inv.lineItems || [];
              const payments = inv.payments || [];

              return (
                <div
                  key={inv.id}
                  className="rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white/70 dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-white/20 transition-all overflow-hidden"
                >
                  {/* Top Row / Summary */}
                  <div
                    onClick={() => toggleExpand(inv.id)}
                    className="p-4 flex flex-wrap items-center justify-between gap-3 cursor-pointer select-none"
                  >
                    {/* Left: Invoice # + Badges + Description */}
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        className="mt-0.5 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                      >
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-extrabold text-slate-900 dark:text-white text-xs tracking-tight">
                            {inv.invoiceNumber}
                          </span>

                          {/* Status Pill */}
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              isPaid
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30'
                                : inv.status === 'partially_paid'
                                ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-500/30'
                                : inv.status === 'sent'
                                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30'
                                : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30'
                            }`}
                          >
                            {inv.status === 'partially_paid' ? 'Partially Paid' : isPaid ? 'Invoice Paid' : inv.status === 'overdue' ? 'Overdue' : inv.status === 'cancelled' ? 'Cancelled' : 'Invoice Pending'}
                          </span>

                          {inv.jobNumber && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                              {inv.jobNumber}
                            </span>
                          )}

                          {inv.paymentTerms && (
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                              • {inv.paymentTerms}
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {inv.milestoneName || inv.description}
                          </span>
                          <span>•</span>
                          <span>Issued {inv.date}</span>
                          {inv.dueDate && (
                            <>
                              <span>•</span>
                              <span>Due {inv.dueDate}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Amounts & Quick Actions */}
                    <div className="flex flex-wrap items-center gap-3 ml-auto">
                      <div className="text-right">
                        <div className="text-sm font-black text-slate-900 dark:text-white">
                          ${inv.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                        {!isPaid && balance > 0 && (
                          <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                            Bal: ${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1.5">
                        {!isPaid && balance > 0 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPaymentTargetInvoice(inv);
                            }}
                            title="Record Payment"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-xs hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                          >
                            <DollarSign size={12} />
                            <span>Pay</span>
                          </button>
                        )}

                        <button
                          type="button"
                          disabled={downloadingId === inv.id}
                          onClick={(e) => handleDownloadPdf(inv, e)}
                          title="Download Official PDF"
                          className="p-1.5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-2xs disabled:opacity-50"
                        >
                          <Download size={14} />
                        </button>

                        <button
                          type="button"
                          disabled={sendingId === inv.id}
                          onClick={(e) => handleSendInvoice(inv, e)}
                          title="Email Invoice to Client"
                          className="p-1.5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-2xs disabled:opacity-50"
                        >
                          <Send size={14} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Breakdown: Line Items & Payment History */}
                  {isExpanded && (
                    <div className="px-5 pb-5 pt-2 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] space-y-4 text-xs">
                      {/* Line Items Table */}
                      {lineItems.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                            Itemized Scope & Services
                          </div>
                          <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900/60">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="border-b border-slate-200/80 dark:border-white/10 text-[10px] uppercase font-bold text-slate-400 bg-slate-50/70 dark:bg-white/5">
                                  <th className="py-2 px-3">Description</th>
                                  <th className="py-2 px-3 text-right">Qty</th>
                                  <th className="py-2 px-3 text-right">Unit Rate</th>
                                  <th className="py-2 px-3 text-right">Total</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                {lineItems.map((item, idx) => (
                                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-white/5">
                                    <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200">
                                      {item.description}
                                    </td>
                                    <td className="py-2 px-3 text-right text-slate-600 dark:text-slate-300">
                                      {item.quantity}
                                    </td>
                                    <td className="py-2 px-3 text-right text-slate-600 dark:text-slate-300">
                                      ${Number(item.unit_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="py-2 px-3 text-right font-bold text-slate-900 dark:text-white">
                                      ${Number(item.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Payment History Table */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                            Payment Transactions ({payments.length})
                          </span>
                          {!isPaid && balance > 0 && (
                            <button
                              type="button"
                              onClick={() => setPaymentTargetInvoice(inv)}
                              className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <Plus size={12} />
                              <span>Record Payment</span>
                            </button>
                          )}
                        </div>

                        {payments.length === 0 ? (
                          <div className="p-3 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 text-[11px] text-slate-400 italic">
                            No payments have been recorded for this invoice yet.
                          </div>
                        ) : (
                          <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900/60">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="border-b border-slate-200/80 dark:border-white/10 text-[10px] uppercase font-bold text-slate-400 bg-slate-50/70 dark:bg-white/5">
                                  <th className="py-2 px-3">Date</th>
                                  <th className="py-2 px-3">Method</th>
                                  <th className="py-2 px-3">Reference #</th>
                                  <th className="py-2 px-3">Recorded By</th>
                                  <th className="py-2 px-3 text-right">Amount</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                {payments.map((p, pIdx) => (
                                  <tr key={pIdx} className="hover:bg-slate-50/50 dark:hover:bg-white/5">
                                    <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200">
                                      {p.payment_date ? new Date(p.payment_date).toLocaleDateString() : 'N/A'}
                                    </td>
                                    <td className="py-2 px-3 uppercase text-[10px] font-bold text-slate-600 dark:text-slate-300">
                                      {p.payment_method}
                                    </td>
                                    <td className="py-2 px-3 text-slate-500 dark:text-slate-400">
                                      {p.transaction_id || '—'}
                                    </td>
                                    <td className="py-2 px-3 text-slate-500 dark:text-slate-400">
                                      {p.recorded_by_name || 'Staff'}
                                    </td>
                                    <td className="py-2 px-3 text-right font-extrabold text-emerald-600 dark:text-emerald-400">
                                      +${Number(p.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>

                      {/* Notes & Actions bar */}
                      {inv.notes && (
                        <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 text-[11px] text-slate-600 dark:text-slate-300">
                          <span className="font-bold text-slate-800 dark:text-slate-200">Notes: </span>
                          {inv.notes}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Internal Create Invoice Modal if triggered directly from this tab */}
      {client && (
        <CreateInvoiceModal
          isOpen={isInternalCreateOpen}
          onClose={() => setIsInternalCreateOpen(false)}
          client={client}
          onInvoiceCreated={() => {
            if (onRefresh) onRefresh();
          }}
        />
      )}

      {/* Record Payment Modal */}
      {paymentTargetInvoice && (
        <RecordPaymentModal
          isOpen={Boolean(paymentTargetInvoice)}
          onClose={() => setPaymentTargetInvoice(null)}
          invoice={paymentTargetInvoice}
          clientName={client?.name || 'Homeowner'}
          onPaymentRecorded={() => {
            showToast('Payment successfully applied to invoice.');
            if (onRefresh) onRefresh();
          }}
        />
      )}
    </div>
  );
}
