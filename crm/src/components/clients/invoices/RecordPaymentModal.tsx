import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  CreditCard,
  DollarSign,
  Calendar,
  FileText,
  CheckCircle2,
  AlertCircle,
  Hash,
} from 'lucide-react';
import { ClientInvoice } from '@/types/client360Types';
import { recordInvoicePayment, RecordPaymentPayload } from '@/api/invoicesApi';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: ClientInvoice | null;
  clientName: string;
  onPaymentRecorded?: (updatedInvoice: any, payment: any) => void;
}

export function RecordPaymentModal({
  isOpen,
  onClose,
  invoice,
  clientName,
  onPaymentRecorded,
}: RecordPaymentModalProps) {
  const currentBalance = invoice ? (invoice.balance !== undefined ? invoice.balance : invoice.amount) : 0;

  const [amount, setAmount] = useState<number | string>('');
  const [paymentMethod, setPaymentMethod] = useState('check');
  const [transactionId, setTransactionId] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initialize form when invoice opens
  useEffect(() => {
    if (isOpen && invoice) {
      const bal = invoice.balance !== undefined ? invoice.balance : invoice.amount;
      setAmount(bal > 0 ? bal : invoice.amount);
      setPaymentMethod('check');
      setTransactionId('');
      setNotes('');
      setErrorMsg(null);
      setIsSubmitting(false);

      const today = new Date().toISOString().split('T')[0];
      setPaymentDate(today);
    }
  }, [isOpen, invoice]);

  // Lock body scroll and Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) onClose();
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, isSubmitting]);

  if (!isOpen || !invoice) return null;

  const numAmount = Number(amount) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (numAmount <= 0) {
      setErrorMsg('Payment amount must be greater than $0.00.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: RecordPaymentPayload = {
        amount: numAmount,
        paymentMethod,
        transactionId: transactionId.trim() || undefined,
        paymentDate: paymentDate || undefined,
        notes: notes.trim() || undefined,
      };

      const res = await recordInvoicePayment(invoice.id, payload);
      if (onPaymentRecorded) {
        onPaymentRecorded(res.invoice, res.payment);
      }
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Failed to record payment. Please try again.';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div
      onClick={() => !isSubmitting && onClose()}
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white/95 dark:bg-[#0B1320]/95 backdrop-blur-2xl rounded-3xl border border-white/60 dark:border-white/10 w-full max-w-md shadow-[0_25px_80px_rgba(15,23,42,0.35)] dark:shadow-[0_25px_80px_rgba(0,0,0,0.85)] overflow-hidden my-auto flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="shrink-0 p-5 border-b border-slate-200/80 dark:border-white/10 bg-gradient-to-r from-emerald-50/70 dark:from-emerald-950/30 to-white dark:to-transparent flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-600/20">
              <DollarSign size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white leading-tight">
                Record Payment
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Apply cash, check, or wire to {invoice.invoiceNumber}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Invoice Summary Box */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 flex items-center justify-between text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Homeowner / Invoice</span>
              <span className="font-bold text-slate-900 dark:text-white">{clientName}</span>
              <span className="text-slate-500 dark:text-slate-400 block mt-0.5">{invoice.invoiceNumber}</span>
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Balance Outstanding</span>
              <span className="text-base font-black text-amber-600 dark:text-amber-400">
                ${currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Total: ${invoice.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Payment Amount */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block mb-1">
              Payment Amount ($) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-sm">$</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={currentBalance > 0 ? currentBalance * 1.5 : undefined}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm font-extrabold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 transition-all"
                required
              />
            </div>
            {currentBalance > 0 && numAmount !== currentBalance && (
              <button
                type="button"
                onClick={() => setAmount(currentBalance)}
                className="text-[10px] text-brand-600 dark:text-sky-400 hover:underline font-semibold mt-1 cursor-pointer"
              >
                Pay Full Balance (${currentBalance.toLocaleString()})
              </button>
            )}
          </div>

          {/* Payment Method */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block mb-1">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 transition-all cursor-pointer"
              >
                <option value="check">Check</option>
                <option value="credit_card">Credit Card</option>
                <option value="ach_wire">ACH / Bank Wire</option>
                <option value="zelle">Zelle</option>
                <option value="cash">Cash</option>
                <option value="financing">Financing / Loan</option>
                <option value="insurance_check">Insurance Check</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block mb-1">
                Payment Date
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 transition-all"
              />
            </div>
          </div>

          {/* Reference # / Check # */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block mb-1">
              Reference / Check # (Optional)
            </label>
            <input
              type="text"
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              placeholder="e.g. Check #4092, AuthCode 98213"
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 transition-all"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block mb-1">
              Payment Memo / Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Initial roof deposit received via physical check..."
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 transition-all"
            />
          </div>

          {/* Footer Submit */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || numAmount <= 0}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
            >
              {isSubmitting ? (
                <span>Recording...</span>
              ) : (
                <>
                  <CheckCircle2 size={14} />
                  <span>Record ${numAmount > 0 ? numAmount.toLocaleString() : '0'} Payment</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
