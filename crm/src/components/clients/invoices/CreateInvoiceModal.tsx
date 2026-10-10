import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  FileText,
  Plus,
  Trash2,
  Send,
  Download,
  Check,
  AlertCircle,
  User,
  ShieldCheck,
  Copy,
  ChevronUp,
  ChevronDown,
  Search,
  BookOpen,
} from 'lucide-react';
import { Client360Record, InvoiceLineItem, InvoiceItemType } from '@/types/client360Types';
import {
  createClientInvoice,
  sendInvoiceEmail,
  renderInvoicePdf,
  CreateInvoicePayload,
} from '@/api/invoicesApi';
import { computeInvoiceTotals, formatMoney, DiscountType } from '@/utils/invoiceMath';
import {
  CatalogItem,
  SEED_CATALOG,
  INVOICE_UNITS,
  INVOICE_ITEM_TYPES,
  PAYMENT_METHOD_DEFS,
  PAYMENT_TERMS_OPTIONS,
  PaymentMethodEntry,
  loadRecentItems,
  rememberItems,
  loadSavedMethods,
  saveMethods,
  newMethodEntry,
  methodsToPayload,
} from './invoiceCatalog';

interface CreateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client360Record;
  onInvoiceCreated?: (invoice: any) => void;
}

const PRESET_MILESTONES = [
  'Scope & Services (Full Contract)',
  'Initial Roof Deposit',
  'Material Delivery Draw',
  'Progress Payment',
  'Final Balance Upon Completion',
];

const DEFAULT_NOTES =
  'Licensed California Roofing Contractor CSLB #1096492. Thank you for choosing Rise Up Roofing & Construction!';

// One consistent control style: 40px height, same radius/typography everywhere.
const inputCls =
  'w-full h-10 px-3 rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[13px] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all';
const numCls = `${inputCls} text-right tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`;
const textareaCls =
  'w-full px-3 py-2.5 rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[13px] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 resize-none';
const labelCls = 'block mb-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300';
const colHeadCls = 'text-[11px] font-semibold text-slate-400 dark:text-slate-500';
const ghostIconBtn =
  'p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-30 transition-colors cursor-pointer';

const blankItem = (): InvoiceLineItem => ({
  description: '',
  quantity: 1,
  unit_price: 0,
  total: 0,
  unit: 'ea',
  item_type: 'service',
  taxable: false,
});

/** Numbered section card — gives the form a clear top-down reading order. */
function Section({
  step,
  title,
  description,
  action,
  children,
}: {
  step: number;
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-label={title}
      className="rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-white/[0.03]"
    >
      <header className="flex items-start justify-between gap-3 px-5 pt-4 pb-3">
        <div className="flex items-start gap-3 min-w-0">
          <span className="mt-0.5 w-6 h-6 shrink-0 rounded-full bg-brand-600 text-white text-[11px] font-bold flex items-center justify-center">
            {step}
          </span>
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{title}</h4>
            {description && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>}
          </div>
        </div>
        {action}
      </header>
      <div className="px-5 pb-5">{children}</div>
    </section>
  );
}

function CatalogRow({ c, onPick }: { c: CatalogItem; onPick: (c: CatalogItem) => void }) {
  return (
    <button
      type="button"
      onClick={() => onPick(c)}
      className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
    >
      <span className="text-[13px] text-slate-800 dark:text-slate-100 leading-snug">{c.description}</span>
      <span className="shrink-0 text-xs font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
        {c.item_type === 'discount' ? '-' : ''}
        {formatMoney(c.unit_price)}
      </span>
    </button>
  );
}

export function CreateInvoiceModal({
  isOpen,
  onClose,
  client,
  onInvoiceCreated,
}: CreateInvoiceModalProps) {
  const [milestoneName, setMilestoneName] = useState('Scope & Services (Full Contract)');
  const [paymentTerms, setPaymentTerms] = useState('Due Upon Receipt');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState(DEFAULT_NOTES);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodEntry[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);

  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([blankItem()]);
  const [taxEnabled, setTaxEnabled] = useState(false);
  const [taxRate, setTaxRate] = useState<number | string>(0);
  const [discountType, setDiscountType] = useState<DiscountType>('flat');
  const [discountValue, setDiscountValue] = useState<number | string>(0);
  const [depositEnabled, setDepositEnabled] = useState(false);
  const [depositValue, setDepositValue] = useState<number | string>(0);

  const [catalogOpen, setCatalogOpen] = useState(false);
  const [catalogQuery, setCatalogQuery] = useState('');
  const [recentItems, setRecentItems] = useState<CatalogItem[]>([]);
  const catalogRef = useRef<HTMLDivElement>(null);

  const [sendImmediately, setSendImmediately] = useState(true);
  const [customEmailMessage, setCustomEmailMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [invalidRows, setInvalidRows] = useState<number[]>([]);
  const [successInfo, setSuccessInfo] = useState<{
    invoiceNumber: string;
    pdfUrl?: string;
    sent: boolean;
  } | null>(null);

  // Default due date from payment terms
  useEffect(() => {
    if (!isOpen) return;
    const today = new Date();
    let daysToAdd = 0;
    if (paymentTerms.includes('15')) daysToAdd = 15;
    else if (paymentTerms.includes('30')) daysToAdd = 30;
    else if (paymentTerms.includes('7')) daysToAdd = 7;
    else if (paymentTerms.includes('Completion')) daysToAdd = 14;
    const target = new Date(today);
    target.setDate(today.getDate() + daysToAdd);
    setDueDate(target.toISOString().split('T')[0]);
  }, [paymentTerms, isOpen]);

  // Reset only when the modal actually opens (or switches client) — NOT when the client
  // record object is refetched after creating an invoice, which used to wipe the success screen.
  const resetKey = isOpen ? String(client.id) : null;
  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg(null);
    setInvalidRows([]);
    setSuccessInfo(null);
    setIsSubmitting(false);
    setCatalogOpen(false);
    setCatalogQuery('');
    setRecentItems(loadRecentItems());
    setPaymentMethods(loadSavedMethods());
    setTaxEnabled(false);
    setTaxRate(0);
    setDiscountType('flat');
    setDiscountValue(0);
    setDepositEnabled(false);
    setDepositValue(0);

    const availableJobs =
      client.jobs || (client.activeJob ? [{ id: client.activeJob.jobId, status: 'active' }] : []);
    const firstJob = availableJobs.find((j: any) => j.status !== 'cancelled');
    if (firstJob) {
      const jid = parseInt(String(firstJob.id).replace(/\D/g, ''), 10);
      setSelectedJobId(isNaN(jid) ? null : jid);
    } else {
      setSelectedJobId(null);
    }
    setLineItems([blankItem()]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  // Lock scroll + Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || isSubmitting) return;
      if (catalogOpen) setCatalogOpen(false);
      else onClose();
    };
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = original;
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose, isSubmitting, catalogOpen]);

  // Close catalog on outside click
  useEffect(() => {
    if (!catalogOpen) return;
    const onDown = (e: MouseEvent) => {
      if (catalogRef.current && !catalogRef.current.contains(e.target as Node)) setCatalogOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [catalogOpen]);

  const totals = useMemo(
    () =>
      computeInvoiceTotals(lineItems, {
        taxRate: taxEnabled ? Number(taxRate) : 0,
        discountType,
        discountValue: Number(discountValue),
        deposit: depositEnabled ? Number(depositValue) : 0,
      }),
    [lineItems, taxEnabled, taxRate, discountType, discountValue, depositEnabled, depositValue]
  );

  const updateItem = (index: number, patch: Partial<InvoiceLineItem>) => {
    setLineItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
    setInvalidRows((prev) => prev.filter((i) => i !== index));
  };
  const addItem = () => setLineItems((prev) => [...prev, blankItem()]);
  const duplicateItem = (index: number) =>
    setLineItems((prev) => [...prev.slice(0, index + 1), { ...prev[index] }, ...prev.slice(index + 1)]);
  const removeItem = (index: number) =>
    setLineItems((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  const moveItem = (index: number, dir: -1 | 1) =>
    setLineItems((prev) => {
      const target = index + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const addFromCatalog = (c: CatalogItem) => {
    const item: InvoiceLineItem = {
      description: c.description,
      quantity: 1,
      unit_price: c.unit_price,
      total: c.unit_price,
      unit: c.unit,
      item_type: c.item_type,
      taxable: Boolean(c.taxable),
    };
    setLineItems((prev) => {
      const onlyBlank = prev.length === 1 && !prev[0].description.trim() && !Number(prev[0].unit_price);
      return onlyBlank ? [item] : [...prev, item];
    });
    setCatalogOpen(false);
    setCatalogQuery('');
  };

  // Payment methods: dynamic list, each with its own editable details
  const usedTypes = paymentMethods.map((m) => m.type);
  const addableMethods = Object.entries(PAYMENT_METHOD_DEFS).filter(
    ([type]) => type === 'other' || !usedTypes.includes(type)
  );
  const addMethod = (type: string) => {
    if (!type) return;
    setPaymentMethods((prev) => [...prev, newMethodEntry(type)]);
  };
  const removeMethod = (id: string) => setPaymentMethods((prev) => prev.filter((m) => m.id !== id));
  const changeMethodType = (id: string, type: string) =>
    setPaymentMethods((prev) => prev.map((m) => (m.id === id ? { ...newMethodEntry(type), id } : m)));
  const setMethodField = (id: string, idx: number, value: string) =>
    setPaymentMethods((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, fields: m.fields.map((f, i) => (i === idx ? { ...f, value } : f)) } : m
      )
    );
  const setMethodName = (id: string, name: string) =>
    setPaymentMethods((prev) => prev.map((m) => (m.id === id ? { ...m, name } : m)));

  const catalogMatches = (list: CatalogItem[]) => {
    const q = catalogQuery.trim().toLowerCase();
    return q ? list.filter((c) => c.description.toLowerCase().includes(q)) : list;
  };
  const recentMatches = catalogMatches(recentItems);
  const seedMatches = catalogMatches(SEED_CATALOG);

  const handleSubmit = async (sendEmailOption: boolean) => {
    setErrorMsg(null);

    const badRows = lineItems.map((it, i) => (!it.description.trim() ? i : -1)).filter((i) => i >= 0);
    if (badRows.length) {
      setInvalidRows(badRows);
      setErrorMsg('All line items must have a service description.');
      return;
    }
    if (totals.total <= 0) {
      setErrorMsg('Please add at least one line item with a price greater than $0.00.');
      return;
    }
    if (sendEmailOption && !client.email) {
      setErrorMsg('Client does not have an email address on file. Please edit contact info or uncheck "Email Invoice".');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CreateInvoicePayload = {
        clientId: Number(client.id),
        jobId: selectedJobId || undefined,
        milestoneName: milestoneName.trim() || 'Roofing Services',
        amount: totals.total,
        dueDate: dueDate || undefined,
        paymentTerms,
        lineItems: totals.items,
        notes: notes.trim() || undefined,
        status: 'pending',
        taxRate: totals.taxRate,
        discountType,
        discountValue: Number(discountValue) || 0,
        depositAmount: totals.depositAmount,
        acceptedMethods: methodsToPayload(paymentMethods),
      };

      const res = await createClientInvoice(client.id, payload);
      const newInvoice = res.invoice;
      saveMethods(paymentMethods);
      rememberItems(
        totals.items
          .filter((i) => i.item_type !== 'discount')
          .map((i) => ({
            description: i.description,
            unit_price: i.unit_price,
            unit: i.unit || 'ea',
            item_type: (i.item_type || 'service') as InvoiceItemType,
            taxable: i.taxable,
          }))
      );

      let pdfUrl = newInvoice.pdf_url;
      let emailSent = false;
      if (sendEmailOption) {
        try {
          const sendRes = await sendInvoiceEmail(newInvoice.id, {
            customerEmail: client.email || undefined,
            customerName: client.name,
            customMessage: customEmailMessage.trim() || undefined,
          });
          pdfUrl = sendRes.pdfUrl || pdfUrl;
          emailSent = true;
        } catch (e) {
          console.warn('Invoice saved but email delivery encountered an issue:', e);
          try {
            pdfUrl = (await renderInvoicePdf(newInvoice.id)).pdfUrl;
          } catch {}
        }
      } else {
        try {
          pdfUrl = (await renderInvoicePdf(newInvoice.id)).pdfUrl;
        } catch (e) {
          console.warn('PDF render error:', e);
        }
      }

      setSuccessInfo({ invoiceNumber: newInvoice.invoice_number, pdfUrl: pdfUrl || undefined, sent: emailSent });
      onInvoiceCreated?.(newInvoice);
    } catch (err: any) {
      setErrorMsg(
        err?.response?.data?.detail ||
          err?.message ||
          'Failed to create invoice. Please check the details and try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const jobs: any[] =
    client.jobs ||
    (client.activeJob
      ? [{ id: client.activeJob.jobId, jobNumber: client.activeJob.jobId, serviceType: client.activeJob.title, contractValue: client.activeJob.contractValue }]
      : []);

  return createPortal(
    <div
      onClick={() => !isSubmitting && onClose()}
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-50 dark:bg-[#0B1320] rounded-3xl border border-white/60 dark:border-white/10 w-full max-w-5xl shadow-[0_25px_80px_rgba(15,23,42,0.35)] dark:shadow-[0_25px_80px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col max-h-[94vh] animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="shrink-0 px-6 py-4 border-b border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0B1320] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-brand-500 to-sky-600 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
              <FileText size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-lg text-slate-900 dark:text-white leading-tight">Create Invoice</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30">
                  CSLB #1096492
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                For {client.name} • Pre-filled from Client 360 Record
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {successInfo ? (
          <div className="flex-1 overflow-y-auto py-14 px-6 text-center space-y-4 bg-white dark:bg-transparent">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto border-2 border-emerald-300 dark:border-emerald-500/40 shadow-lg">
              <Check size={32} />
            </div>
            <div>
              <h4 className="text-xl font-bold text-slate-900 dark:text-white">
                Invoice {successInfo.invoiceNumber} Created Successfully!
              </h4>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                {successInfo.sent
                  ? `The official Letter-format invoice PDF was generated and emailed directly to ${client.email}.`
                  : 'The invoice has been saved to the client record with high-fidelity Letter PDF.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
              {successInfo.pdfUrl && (
                <a
                  href={successInfo.pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold shadow-md transition-all cursor-pointer"
                >
                  <Download size={15} />
                  <span>Download Invoice PDF</span>
                </a>
              )}
              <button
                type="button"
                onClick={onClose}
                className="h-10 px-5 rounded-lg bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-slate-200 text-sm font-semibold transition-all cursor-pointer"
              >
                Close &amp; View in Profile
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {errorMsg && (
                <div role="alert" className="mb-4 p-3.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 text-[13px] flex items-center gap-2.5">
                  <AlertCircle size={16} className="shrink-0 text-rose-500" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-5 items-start">
                {/* ───────── Left: numbered sections ───────── */}
                <div className="space-y-4 min-w-0">
                  {/* 1 · Bill to */}
                  <Section
                    step={1}
                    title="Bill To"
                    description="Homeowner details pulled from the client record."
                    action={
                      <span className="hidden sm:flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                        <ShieldCheck size={13} />
                        Verified Client Details
                      </span>
                    }
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-3 p-3.5 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                      <div className="min-w-0">
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500 mb-0.5">
                          <User size={11} /> Name
                        </span>
                        <div className="text-[13px] font-semibold text-slate-900 dark:text-white truncate">{client.name}</div>
                      </div>
                      <div className="min-w-0">
                        <span className="block text-[11px] font-semibold text-slate-400 dark:text-slate-500 mb-0.5">Email</span>
                        <div className="text-[13px] text-slate-700 dark:text-slate-200 truncate">
                          {client.email || <span className="text-amber-500 italic">No email on file</span>}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <span className="block text-[11px] font-semibold text-slate-400 dark:text-slate-500 mb-0.5">Property</span>
                        <div className="text-[13px] text-slate-700 dark:text-slate-200 truncate">
                          {[client.address, client.city, client.zip].filter(Boolean).join(', ') || 'Address not provided'}
                        </div>
                      </div>
                    </div>
                  </Section>

                  {/* 2 · Invoice details */}
                  <Section step={2} title="Invoice Details" description="Title, terms and due date shown at the top of the invoice.">
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_180px_160px] gap-3">
                        <div>
                          <label htmlFor="inv-title" className={labelCls}>
                            Milestone / Title <span className="text-rose-500">*</span>
                          </label>
                          <input
                            id="inv-title"
                            type="text"
                            value={milestoneName}
                            onChange={(e) => setMilestoneName(e.target.value)}
                            placeholder="e.g. Scope & Services (Full Contract)"
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <label htmlFor="inv-terms" className={labelCls}>Payment Terms</label>
                          <select
                            id="inv-terms"
                            value={paymentTerms}
                            onChange={(e) => setPaymentTerms(e.target.value)}
                            className={`${inputCls} cursor-pointer`}
                          >
                            {PAYMENT_TERMS_OPTIONS.map((t) => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label htmlFor="inv-due" className={labelCls}>Due Date</label>
                          <input id="inv-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputCls} />
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 -mt-1">
                        <span className="text-[11px] text-slate-400 mr-1">Quick titles:</span>
                        {PRESET_MILESTONES.map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setMilestoneName(p)}
                            className={`text-[11px] px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                              milestoneName === p
                                ? 'bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-sky-300 border-brand-300 dark:border-sky-500/40 font-semibold'
                                : 'bg-white dark:bg-white/5 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/10 hover:border-slate-300'
                            }`}
                          >
                            {p.split('(')[0].trim()}
                          </button>
                        ))}
                      </div>

                      {jobs.length > 0 && (
                        <div>
                          <label htmlFor="inv-job" className={labelCls}>Linked Job <span className="font-normal text-slate-400">(optional)</span></label>
                          <select
                            id="inv-job"
                            value={selectedJobId || ''}
                            onChange={(e) => setSelectedJobId(e.target.value ? Number(e.target.value) : null)}
                            className={`${inputCls} cursor-pointer`}
                          >
                            <option value="">Direct Client Invoice (no job linked)</option>
                            {jobs.map((job: any) => {
                              const jid = parseInt(String(job.id).replace(/\D/g, ''), 10);
                              return (
                                <option key={job.id} value={isNaN(jid) ? '' : jid}>
                                  {job.jobNumber || `Job #${job.id}`} — {job.serviceType || job.title || 'Roof Replacement'} (
                                  {job.contractValue ? `$${Number(job.contractValue).toLocaleString()}` : 'N/A'})
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      )}
                    </div>
                  </Section>

                  {/* 3 · Line items */}
                  <Section
                    step={3}
                    title="Itemized Services & Materials"
                    description={`${lineItems.length} ${lineItems.length === 1 ? 'item' : 'items'} on this invoice`}
                    action={
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="relative" ref={catalogRef}>
                          <button
                            type="button"
                            onClick={() => setCatalogOpen((o) => !o)}
                            aria-expanded={catalogOpen}
                            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-white dark:bg-white/5 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-white/10 transition-all cursor-pointer"
                          >
                            <BookOpen size={13} />
                            <span>Add from catalog</span>
                          </button>
                          {catalogOpen && (
                            <div className="absolute right-0 top-full mt-2 z-20 w-[min(420px,calc(100vw-3rem))] rounded-xl bg-white dark:bg-[#111b2b] border border-slate-200 dark:border-white/10 shadow-2xl p-2">
                              <div className="relative p-1">
                                <Search size={13} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                  autoFocus
                                  type="text"
                                  value={catalogQuery}
                                  onChange={(e) => setCatalogQuery(e.target.value)}
                                  placeholder="Search services, materials, fees…"
                                  aria-label="Search catalog"
                                  className={`${inputCls} pl-8`}
                                />
                              </div>
                              <div className="max-h-64 overflow-y-auto mt-1 space-y-0.5">
                                {recentMatches.length > 0 && (
                                  <>
                                    <div className={`${colHeadCls} px-3 pt-2 pb-1`}>Recently used</div>
                                    {recentMatches.map((c) => (
                                      <CatalogRow key={`r-${c.description}`} c={c} onPick={addFromCatalog} />
                                    ))}
                                  </>
                                )}
                                <div className={`${colHeadCls} px-3 pt-2 pb-1`}>Standard items</div>
                                {seedMatches.map((c) => (
                                  <CatalogRow key={`s-${c.description}`} c={c} onPick={addFromCatalog} />
                                ))}
                                {recentMatches.length + seedMatches.length === 0 && (
                                  <div className="px-3 py-4 text-xs text-slate-400">No matching items.</div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={addItem}
                          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
                        >
                          <Plus size={13} />
                          <span>Add Item</span>
                        </button>
                      </div>
                    }
                  >
                    {/* Column heads (≥ md) */}
                    <div className="hidden md:grid grid-cols-[minmax(0,1fr)_72px_92px_104px_96px_32px] gap-2 px-3.5 mb-2">
                      <span className={colHeadCls}>Description</span>
                      <span className={`${colHeadCls} text-right`}>Qty</span>
                      <span className={colHeadCls}>Unit</span>
                      <span className={`${colHeadCls} text-right`}>Rate ($)</span>
                      <span className={`${colHeadCls} text-right`}>Total</span>
                      <span />
                    </div>

                    <div className="space-y-2.5">
                      {totals.items.map((item, index) => {
                        const raw = lineItems[index];
                        const isCredit = raw.item_type === 'discount';
                        const bad = invalidRows.includes(index);
                        return (
                          <div
                            key={index}
                            className={`rounded-xl border bg-slate-50/60 dark:bg-white/[0.03] ${
                              bad ? 'border-rose-300 dark:border-rose-500/50' : 'border-slate-200/90 dark:border-white/10'
                            }`}
                          >
                            <div className="grid grid-cols-2 md:grid-cols-[minmax(0,1fr)_72px_92px_104px_96px_32px] gap-2 items-center p-3">
                              <input
                                type="text"
                                aria-label={`Item ${index + 1} description`}
                                value={raw.description}
                                onChange={(e) => updateItem(index, { description: e.target.value })}
                                placeholder="e.g. Architectural shingle installation"
                                className={`${inputCls} col-span-2 md:col-span-1 font-medium ${bad ? 'border-rose-400' : ''}`}
                              />
                              <input
                                type="number"
                                min="0"
                                step="any"
                                aria-label={`Item ${index + 1} quantity`}
                                value={raw.quantity}
                                onChange={(e) => updateItem(index, { quantity: e.target.value as unknown as number })}
                                className={numCls}
                              />
                              <select
                                aria-label={`Item ${index + 1} unit`}
                                value={raw.unit || 'ea'}
                                onChange={(e) => updateItem(index, { unit: e.target.value })}
                                className={`${inputCls} cursor-pointer`}
                              >
                                {INVOICE_UNITS.map((u) => (
                                  <option key={u} value={u}>{u}</option>
                                ))}
                              </select>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                aria-label={`Item ${index + 1} rate`}
                                value={raw.unit_price}
                                onChange={(e) => updateItem(index, { unit_price: e.target.value as unknown as number })}
                                className={numCls}
                              />
                              <div
                                className={`h-10 flex items-center justify-end text-[13px] font-bold tabular-nums ${
                                  isCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'
                                }`}
                              >
                                {formatMoney(item.total)}
                              </div>
                              <button
                                type="button"
                                disabled={lineItems.length <= 1}
                                onClick={() => removeItem(index)}
                                className="h-10 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors disabled:opacity-30 cursor-pointer justify-self-end"
                                title="Remove item"
                                aria-label={`Remove item ${index + 1}`}
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>

                            {/* Secondary row — visually quieter than the primary inputs */}
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2 border-t border-slate-200/70 dark:border-white/5 bg-slate-100/50 dark:bg-white/[0.02] rounded-b-xl">
                              <select
                                aria-label={`Item ${index + 1} type`}
                                value={raw.item_type || 'service'}
                                onChange={(e) => updateItem(index, { item_type: e.target.value as InvoiceItemType })}
                                className="h-8 px-2 rounded-md bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-600 dark:text-slate-300 cursor-pointer focus:outline-none"
                              >
                                {INVOICE_ITEM_TYPES.map((t) => (
                                  <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                              </select>
                              <label className={`flex items-center gap-1.5 text-xs ${isCredit ? 'opacity-40' : 'text-slate-600 dark:text-slate-300 cursor-pointer'}`}>
                                <input
                                  type="checkbox"
                                  disabled={isCredit}
                                  checked={Boolean(raw.taxable)}
                                  onChange={(e) => updateItem(index, { taxable: e.target.checked })}
                                  className="w-3.5 h-3.5 rounded border-slate-300"
                                />
                                Taxable
                              </label>
                              <input
                                type="text"
                                aria-label={`Item ${index + 1} note`}
                                value={raw.notes || ''}
                                onChange={(e) => updateItem(index, { notes: e.target.value })}
                                placeholder="Add a note shown under this item"
                                className="flex-1 min-w-[160px] h-8 px-2.5 rounded-md bg-transparent border border-transparent hover:border-slate-200 dark:hover:border-white/10 focus:border-brand-500 text-xs text-slate-600 dark:text-slate-300 placeholder:text-slate-400 focus:outline-none"
                              />
                              <div className="flex items-center gap-0.5 ml-auto">
                                <button type="button" onClick={() => moveItem(index, -1)} disabled={index === 0} title="Move up" aria-label={`Move item ${index + 1} up`} className={ghostIconBtn}>
                                  <ChevronUp size={14} />
                                </button>
                                <button type="button" onClick={() => moveItem(index, 1)} disabled={index === lineItems.length - 1} title="Move down" aria-label={`Move item ${index + 1} down`} className={ghostIconBtn}>
                                  <ChevronDown size={14} />
                                </button>
                                <button type="button" onClick={() => duplicateItem(index)} title="Duplicate item" aria-label={`Duplicate item ${index + 1}`} className={ghostIconBtn}>
                                  <Copy size={13} />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Section>

                  {/* 4 · Payment methods */}
                  <Section
                    step={4}
                    title="How the Customer Can Pay"
                    description="Add the payment methods you accept and fill in the details. These print on the invoice."
                  >
                    <div className="space-y-3">
                      {paymentMethods.length === 0 && (
                        <div className="text-xs text-slate-500 dark:text-slate-400 py-3 text-center rounded-lg border border-dashed border-slate-200 dark:border-white/10">
                          No payment methods added — the invoice will show your default remittance text.
                        </div>
                      )}

                      {paymentMethods.map((m, mi) => {
                        const def = PAYMENT_METHOD_DEFS[m.type] || PAYMENT_METHOD_DEFS.other;
                        const defFields = def.fields;
                        return (
                          <div
                            key={m.id}
                            data-testid="payment-method"
                            className="rounded-xl border border-slate-200/90 dark:border-white/10 bg-slate-50/60 dark:bg-white/[0.03]"
                          >
                            <div className="flex items-center gap-2 p-3">
                              <select
                                aria-label={`Payment method ${mi + 1} type`}
                                value={m.type}
                                onChange={(e) => changeMethodType(m.id, e.target.value)}
                                className={`${inputCls} cursor-pointer font-semibold sm:max-w-[260px]`}
                              >
                                {Object.entries(PAYMENT_METHOD_DEFS)
                                  .filter(([type]) => type === m.type || type === 'other' || !usedTypes.includes(type))
                                  .map(([type, d]) => (
                                    <option key={type} value={type}>{d.label}</option>
                                  ))}
                              </select>
                              {m.type === 'other' && (
                                <input
                                  type="text"
                                  aria-label={`Payment method ${mi + 1} name`}
                                  value={m.name || ''}
                                  onChange={(e) => setMethodName(m.id, e.target.value)}
                                  placeholder="Method name (e.g. Venmo)"
                                  className={inputCls}
                                />
                              )}
                              <button
                                type="button"
                                onClick={() => removeMethod(m.id)}
                                title="Remove payment method"
                                aria-label={`Remove payment method ${mi + 1}`}
                                className="ml-auto h-10 w-9 shrink-0 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-3 pb-3">
                              {m.fields.map((f, fi) => {
                                const fd = defFields[fi];
                                const id = `${m.id}-f${fi}`;
                                return (
                                  <div key={id} className={fd?.multiline ? 'sm:col-span-2' : ''}>
                                    <label htmlFor={id} className={labelCls}>{f.label}</label>
                                    {fd?.multiline ? (
                                      <textarea
                                        id={id}
                                        rows={2}
                                        value={f.value}
                                        onChange={(e) => setMethodField(m.id, fi, e.target.value)}
                                        placeholder={fd?.placeholder}
                                        className={textareaCls}
                                      />
                                    ) : (
                                      <input
                                        id={id}
                                        type="text"
                                        value={f.value}
                                        onChange={(e) => setMethodField(m.id, fi, e.target.value)}
                                        placeholder={fd?.placeholder}
                                        className={inputCls}
                                      />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}

                      <div className="flex items-center gap-3">
                        <select
                          aria-label="Add payment method"
                          value=""
                          onChange={(e) => addMethod(e.target.value)}
                          className={`${inputCls} cursor-pointer sm:max-w-[260px] border-dashed text-brand-700 dark:text-sky-300 font-semibold`}
                        >
                          <option value="">+ Add payment method…</option>
                          {addableMethods.map(([type, d]) => (
                            <option key={type} value={type}>{d.label}</option>
                          ))}
                        </select>
                        <span className="text-[11px] text-slate-400 hidden sm:inline">Your details are remembered for next time.</span>
                      </div>
                    </div>
                  </Section>

                  {/* 5 · Notes */}
                  <Section step={5} title="Notes" description="Optional message printed on the invoice.">
                    <label htmlFor="inv-notes" className="sr-only">Invoice Notes</label>
                    <textarea
                      id="inv-notes"
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Thank-you message, license info, scope notes…"
                      className={textareaCls}
                    />
                  </Section>
                </div>

                {/* ───────── Right: summary + delivery ───────── */}
                <aside className="space-y-4 lg:sticky lg:top-0">
                  <div className="rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-white/[0.03] overflow-hidden">
                    <div className="px-5 pt-4 pb-3">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">Summary</h4>
                    </div>

                    <div className="px-5 pb-4 space-y-3.5">
                      <div className="flex justify-between text-[13px] text-slate-500 dark:text-slate-400">
                        <span>Subtotal</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-100 tabular-nums">{formatMoney(totals.subtotal)}</span>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[13px] text-slate-500 dark:text-slate-400">
                          <label htmlFor="inv-discount">Discount</label>
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                            {totals.discountAmount > 0 ? `-${formatMoney(totals.discountAmount)}` : formatMoney(0)}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <select
                            aria-label="Discount type"
                            value={discountType}
                            onChange={(e) => setDiscountType(e.target.value as DiscountType)}
                            className={`${inputCls} !w-16 !px-2 cursor-pointer font-semibold`}
                          >
                            <option value="flat">$</option>
                            <option value="percent">%</option>
                          </select>
                          <input id="inv-discount" type="number" min="0" step="any" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} className={numCls} />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[13px] text-slate-500 dark:text-slate-400">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={taxEnabled} onChange={(e) => setTaxEnabled(e.target.checked)} className="w-3.5 h-3.5 rounded border-slate-300" />
                            <span>Apply tax</span>
                          </label>
                          <span className="font-semibold text-slate-800 dark:text-slate-100 tabular-nums">{formatMoney(totals.taxAmount)}</span>
                        </div>
                        {taxEnabled && (
                          <>
                            <div className="flex items-center gap-2">
                              <input type="number" min="0" step="0.001" aria-label="Tax rate percent" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} className={numCls} />
                              <span className="text-sm font-semibold text-slate-500">%</span>
                            </div>
                            <p className="text-[11px] text-slate-400 leading-snug">Applies only to items marked “Taxable”.</p>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Hero total */}
                    <div className="px-5 py-4 bg-emerald-50 dark:bg-emerald-950/30 border-t border-emerald-100 dark:border-emerald-500/20 flex items-baseline justify-between">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">Amount Due</span>
                      <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">{formatMoney(totals.total)}</span>
                    </div>

                    <div className="px-5 py-4 space-y-2 border-t border-slate-100 dark:border-white/5">
                      <label className="flex items-center gap-2 text-[13px] font-medium text-slate-700 dark:text-slate-200 cursor-pointer">
                        <input type="checkbox" checked={depositEnabled} onChange={(e) => setDepositEnabled(e.target.checked)} className="w-3.5 h-3.5 rounded border-slate-300" />
                        Request a deposit now
                      </label>
                      {depositEnabled && (
                        <>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-500">$</span>
                            <input type="number" min="0" step="0.01" aria-label="Deposit amount" value={depositValue} onChange={(e) => setDepositValue(e.target.value)} className={numCls} />
                            <button
                              type="button"
                              onClick={() => setDepositValue(Math.round(totals.total * 50) / 100)}
                              className="shrink-0 h-10 px-3 rounded-lg text-xs font-semibold bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-50 cursor-pointer"
                            >
                              50%
                            </button>
                          </div>
                          <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                            <span>Remaining after deposit</span>
                            <span className="font-semibold tabular-nums">{formatMoney(totals.balanceAfterDeposit)}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Delivery */}
                  <div className="rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-white/[0.03] p-5 space-y-3">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Delivery</h4>
                    <label className="flex items-start gap-2.5 text-[13px] font-medium text-slate-700 dark:text-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sendImmediately}
                        onChange={(e) => setSendImmediately(e.target.checked)}
                        className="mt-0.5 w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-slate-300"
                      />
                      <span className="min-w-0 break-words">Email Invoice PDF directly to {client.email || 'Client'}</span>
                    </label>
                    {sendImmediately && (
                      <input
                        type="text"
                        value={customEmailMessage}
                        onChange={(e) => setCustomEmailMessage(e.target.value)}
                        placeholder="Optional note to client…"
                        aria-label="Custom email message"
                        className={inputCls}
                      />
                    )}
                  </div>
                </aside>
              </div>
            </div>

            {/* Footer */}
            <div className="shrink-0 px-6 py-3.5 border-t border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0B1320] flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="h-10 px-4 rounded-lg text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <div className="flex items-center gap-3 flex-wrap justify-end">
                <div className="hidden sm:block text-right mr-2">
                  <div className="text-[11px] font-semibold text-slate-400">Amount due</div>
                  <div className="text-base font-black text-emerald-600 dark:text-emerald-400 tabular-nums leading-none mt-0.5">{formatMoney(totals.total)}</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleSubmit(false)}
                  disabled={isSubmitting}
                  className="h-10 px-4 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-white/10 hover:bg-slate-50 dark:hover:bg-white/20 border border-slate-200 dark:border-white/10 transition-all cursor-pointer disabled:opacity-40"
                >
                  {isSubmitting ? 'Saving...' : 'Save Draft Invoice'}
                </button>
                <button
                  type="button"
                  onClick={() => handleSubmit(sendImmediately)}
                  disabled={isSubmitting}
                  className="h-10 px-5 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-brand-600 to-sky-600 hover:from-brand-700 hover:to-sky-700 shadow-md shadow-brand-500/20 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                >
                  {isSubmitting ? (
                    <span>Generating &amp; Sending...</span>
                  ) : (
                    <>
                      <Send size={14} />
                      <span>{sendImmediately ? 'Create & Send Invoice' : 'Create Invoice'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
