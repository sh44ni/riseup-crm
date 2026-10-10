import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  FileText,
  Download,
  Send,
  CreditCard,
  Loader2,
  Plus,
} from 'lucide-react';
import { BillingSummary, ClientInvoice } from '@/types/client360Types';
import { renderInvoicePdf, sendInvoiceEmail } from '@/api/invoicesApi';

interface ClientBillingCardProps {
  billing: BillingSummary;
  /** Used to prefill the email recipient when sending from the card. */
  clientEmail?: string;
  clientName?: string;
  onViewAll?: () => void;
  onOpenHub?: () => void;
  onOpenCreateInvoice?: () => void;
  onRecordPayment?: (invoice: ClientInvoice) => void;
}

const STATUS_STYLES: Record<string, { label: string; cls: string }> = {
  paid: { label: 'Invoice Paid', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-500/30' },
  partially_paid: { label: 'Partial', cls: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-500/30' },
  overdue: { label: 'Overdue', cls: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-500/30' },
  sent: { label: 'Invoice Pending', cls: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-500/30' },
  draft: { label: 'Invoice Pending', cls: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-white/10 dark:text-slate-300 dark:border-white/10' },
  pending: { label: 'Invoice Pending', cls: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-white/10 dark:text-slate-300 dark:border-white/10' },
  cancelled: { label: 'Cancelled', cls: 'bg-slate-100 text-slate-400 border-slate-200 dark:bg-white/5 dark:text-slate-500 dark:border-white/10' },
};

const money = (n: number) =>
  `$${(Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

export function ClientBillingCard({
  billing,
  clientEmail,
  clientName,
  onViewAll,
  onOpenHub,
  onOpenCreateInvoice,
  onRecordPayment,
}: ClientBillingCardProps) {
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Two most recent invoices (highest id = newest)
  const recentInvoices = useMemo(
    () =>
      [...(billing.invoices || [])]
        .sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0))
        .slice(0, 2),
    [billing.invoices]
  );
  const totalCount = billing.invoicesOnFileCount || billing.invoices?.length || 0;

  const flash = (type: 'ok' | 'err', text: string) => {
    setFeedback({ type, text });
    window.setTimeout(() => setFeedback(null), 4000);
  };

  const handleDownload = async (inv: ClientInvoice) => {
    setBusy(`dl-${inv.id}`);
    try {
      const res = await renderInvoicePdf(inv.id);
      window.open(res.pdfUrl || res.url, '_blank', 'noopener');
    } catch (e: any) {
      flash('err', e?.message || 'Could not generate the invoice PDF.');
    } finally {
      setBusy(null);
    }
  };

  const handleSend = async (inv: ClientInvoice) => {
    const target = inv.sentToEmail || clientEmail;
    if (!target) {
      flash('err', 'No email on file for this client.');
      return;
    }
    setBusy(`send-${inv.id}`);
    try {
      await sendInvoiceEmail(inv.id, { customerEmail: target, customerName: clientName });
      flash('ok', `Invoice ${inv.invoiceNumber} emailed to ${target}`);
    } catch (e: any) {
      flash('err', e?.message || 'Failed to send invoice email.');
    } finally {
      setBusy(null);
    }
  };

  const iconBtn =
    'w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-[#0284C7] dark:hover:text-sky-300 hover:bg-sky-50 dark:hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-40';

  return (
    <div className="light-glass-card rounded-2xl p-5 flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold">
              $
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white tracking-tight">Billing &amp; Cash Flow</h3>
          </div>

          <button
            onClick={onViewAll}
            className="text-xs font-semibold text-[#0284C7] dark:text-sky-400 hover:text-[#0369a1] dark:hover:text-sky-300 transition-colors flex items-center gap-0.5 cursor-pointer"
          >
            <span>View All</span>
            <ChevronRight size={14} />
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-100 dark:border-white/10">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Total Billed</div>
            <div className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">${billing.totalBilled.toLocaleString()}</div>
          </div>
          <div className="p-3.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-100/80 dark:border-emerald-500/20">
            <div className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">Collected Cash</div>
            <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">${billing.collectedCash.toLocaleString()}</div>
          </div>
        </div>

        {/* Payment health */}
        <div className="mt-4">
          {billing.paymentHealthStatus === 'current_and_paid' && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/50 border border-emerald-200/80 dark:border-emerald-500/30 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{billing.paymentHealthMessage || 'All invoices current & paid in full'}</span>
            </div>
          )}
          {(billing.paymentHealthStatus === 'deposit_pending' || billing.paymentHealthStatus === 'overdue') && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-500/30 text-xs font-semibold text-amber-800 dark:text-amber-300">
              <AlertCircle size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
              <span>{billing.paymentHealthMessage || `$${billing.pendingDeposit.toLocaleString()} Deposit Invoice Due`}</span>
            </div>
          )}
          {billing.paymentHealthStatus === 'no_billing_archived' && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500 shrink-0" />
              <span>{billing.paymentHealthMessage || 'No active billings — Deal archived'}</span>
            </div>
          )}
        </div>

        {/* Recent invoices (top 2) */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Recent Invoices</span>
            {totalCount > 2 && (
              <button type="button" onClick={onViewAll} className="text-[11px] font-semibold text-[#0284C7] dark:text-sky-400 hover:underline cursor-pointer">
                +{totalCount - 2} more
              </button>
            )}
          </div>

          {recentInvoices.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-5 rounded-xl border border-dashed border-slate-200 dark:border-white/10 text-center">
              <FileText size={18} className="text-slate-300 dark:text-slate-600" />
              <span className="text-xs text-slate-500 dark:text-slate-400">No invoices yet</span>
              {onOpenCreateInvoice && (
                <button
                  type="button"
                  onClick={onOpenCreateInvoice}
                  className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  <Plus size={12} /> Create first invoice
                </button>
              )}
            </div>
          ) : (
            <ul className="space-y-2">
              {recentInvoices.map((inv) => {
                const st = STATUS_STYLES[inv.status] || STATUS_STYLES.pending;
                const balance = inv.balance ?? inv.amount;
                const canPay = balance > 0 && inv.status !== 'cancelled' && inv.status !== 'paid';
                return (
                  <li
                    key={inv.id}
                    className="rounded-xl border border-slate-100 dark:border-white/10 bg-white/70 dark:bg-white/5 px-3 py-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <button
                        type="button"
                        onClick={onViewAll}
                        className="min-w-0 text-left cursor-pointer"
                        title="Open in Billing tab"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-white truncate">{inv.invoiceNumber}</span>
                          <span className={`shrink-0 px-1.5 py-0.5 rounded-md border text-[10px] font-bold ${st.cls}`}>{st.label}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {inv.description}
                          {inv.dueDate ? ` · Due ${inv.dueDate}` : ''}
                        </div>
                      </button>
                      <div className="text-right shrink-0">
                        <div className="text-xs font-extrabold text-slate-900 dark:text-white tabular-nums">{money(inv.amount)}</div>
                        <div
                          className={`text-[10px] font-semibold tabular-nums ${
                            balance > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {balance > 0 ? `${money(balance)} due` : 'Settled'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-0.5 mt-1.5 -mb-0.5">
                      <button type="button" className={iconBtn} title="Preview / Download PDF" aria-label={`Download ${inv.invoiceNumber} PDF`} disabled={busy === `dl-${inv.id}`} onClick={() => handleDownload(inv)}>
                        {busy === `dl-${inv.id}` ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                      </button>
                      <button type="button" className={iconBtn} title="Email to client" aria-label={`Send ${inv.invoiceNumber}`} disabled={busy === `send-${inv.id}`} onClick={() => handleSend(inv)}>
                        {busy === `send-${inv.id}` ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                      </button>
                      {canPay && onRecordPayment && (
                        <button type="button" className={iconBtn} title="Record payment" aria-label={`Record payment for ${inv.invoiceNumber}`} onClick={() => onRecordPayment(inv)}>
                          <CreditCard size={13} />
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {feedback && (
            <div
              role="status"
              className={`mt-2 text-[11px] font-semibold ${feedback.type === 'ok' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}
            >
              {feedback.text}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/10 flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
        <span>Invoices on file: {totalCount}</span>
        <div className="flex items-center gap-3">
          {onOpenCreateInvoice && (
            <button
              type="button"
              onClick={onOpenCreateInvoice}
              className="text-emerald-600 dark:text-emerald-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
            >
              <span>+ Create Invoice</span>
            </button>
          )}
          <button
            type="button"
            onClick={onOpenHub}
            className="text-[#0284C7] dark:text-sky-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
          >
            <span>Open Invoices Hub</span>
            <ExternalLink size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}
