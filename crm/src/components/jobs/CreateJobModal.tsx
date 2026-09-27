import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Hammer, MapPin, DollarSign, Calendar, Users, Loader2 } from 'lucide-react';
import { CreateJobPayload } from '@/api/jobsApi';
import { z } from 'zod';

const CreateJobSchema = z.object({
  customerName: z.string().min(1, 'Customer name is required'),
  address: z.string().min(1, 'Address is required'),
  phone: z.string().optional().or(z.literal('')),
  serviceType: z.string().min(1, 'Service type is required'),
  contractValue: z.number().nonnegative().optional(),
});

interface CreateJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateJobPayload) => Promise<any>;
}

export function CreateJobModal({ isOpen, onClose, onSubmit }: CreateJobModalProps) {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [zip, setZip] = useState('');
  const [serviceType, setServiceType] = useState('Residential Tile Re-Roof');
  const [contractValue, setContractValue] = useState<number>(18500);
  const [crewLead, setCrewLead] = useState('Marco Silva (Field Foreman)');
  const [scheduledStart, setScheduledStart] = useState('');
  const [estimatedDays, setEstimatedDays] = useState<number>(3);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) return;

    const formData = {
      customerName,
      address,
      phone: customerPhone,
      serviceType,
      contractValue: Number(contractValue)
    };
    const result = CreateJobSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const [key, issues] of Object.entries(result.error.format())) {
        if (key !== '_errors' && Array.isArray((issues as any)._errors)) {
          fieldErrors[key] = (issues as any)._errors[0];
        }
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});

    setIsSubmitting(true);
    try {
      await onSubmit({
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim() || undefined,
        customerEmail: customerEmail.trim() || undefined,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        zip: zip.trim() || undefined,
        serviceType: serviceType.trim() || 'Residential Roofing',
        contractValue: Number(contractValue) || 0,
        crewLead: crewLead.trim() || undefined,
        scheduledStart: scheduledStart || undefined,
        estimatedDays: Number(estimatedDays) || 3,
        notes: notes.trim() || undefined,
        status: 'scheduled',
        milestones: [], // Starts completely blank as requested!
      });
      onClose();
    } catch (err) {
      console.error('Failed to create job:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xl overflow-y-auto animate-in fade-in duration-200 select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg rounded-[28px] bg-white/95 dark:bg-[#0B1320]/95 backdrop-blur-3xl border border-white/95 dark:border-white/10 shadow-2xl dark:shadow-[0_25px_90px_rgba(0,0,0,0.85)] overflow-hidden my-auto animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-200/80 dark:border-white/10 bg-slate-50/80 dark:bg-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#1878B8] to-[#55C4F5] text-white flex items-center justify-center shadow-md">
              <Hammer size={18} />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Create Production Work Order</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Dispatch a new jobsite order with property and contact data.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
          {/* Homeowner info */}
          <div className="space-y-2">
            <label className="font-extrabold text-slate-900 dark:text-white">Homeowner / Client Information</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <input
                  type="text"
                  required
                  placeholder="Full Customer Name *"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl bg-slate-50/80 dark:bg-white/5 border border-slate-200/90 dark:border-white/10 font-semibold text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:border-[#0284C7] dark:focus:border-sky-500 focus:outline-none transition-all"
                />
                {errors.customerName && <p className="text-rose-500 text-xs mt-1">{errors.customerName}</p>}
              </div>
              <div>
                <input
                  type="tel"
                  placeholder="Phone Number"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl bg-slate-50/80 dark:bg-white/5 border border-slate-200/90 dark:border-white/10 font-semibold text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:border-[#0284C7] dark:focus:border-sky-500 focus:outline-none transition-all"
                />
                {errors.phone && <p className="text-rose-500 text-xs mt-1">{errors.phone}</p>}
              </div>
              <div className="sm:col-span-2">
                <input
                  type="email"
                  placeholder="Email Address"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl bg-slate-50/80 dark:bg-white/5 border border-slate-200/90 dark:border-white/10 font-semibold text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:border-[#0284C7] dark:focus:border-sky-500 focus:outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* Property Address */}
          <div className="space-y-2">
            <label className="font-extrabold text-slate-900 dark:text-white">Jobsite Address</label>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <div className="sm:col-span-12">
                <input
                  type="text"
                  placeholder="Street Address (e.g. 4520 Highland Dr)"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl bg-slate-50/80 dark:bg-white/5 border border-slate-200/90 dark:border-white/10 font-semibold text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:border-[#0284C7] dark:focus:border-sky-500 focus:outline-none transition-all"
                />
                {errors.address && <p className="text-rose-500 text-xs mt-1">{errors.address}</p>}
              </div>
              <div className="sm:col-span-8">
                <input
                  type="text"
                  placeholder="City (e.g. Carlsbad)"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl bg-slate-50/80 dark:bg-white/5 border border-slate-200/90 dark:border-white/10 font-semibold text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:border-[#0284C7] dark:focus:border-sky-500 focus:outline-none transition-all"
                />
              </div>
              <div className="sm:col-span-4">
                <input
                  type="text"
                  placeholder="Zip (e.g. 92008)"
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl bg-slate-50/80 dark:bg-white/5 border border-slate-200/90 dark:border-white/10 font-semibold text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:border-[#0284C7] dark:focus:border-sky-500 focus:outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* Scope & Contract */}
          <div className="space-y-2">
            <label className="font-extrabold text-slate-900 dark:text-white">Service Scope & Financials</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Scope of Work</label>
                <input
                  type="text"
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl bg-slate-50/80 dark:bg-white/5 border border-slate-200/90 dark:border-white/10 font-semibold text-slate-800 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:border-[#0284C7] dark:focus:border-sky-500 focus:outline-none mt-1 transition-all"
                />
                {errors.serviceType && <p className="text-rose-500 text-xs mt-1">{errors.serviceType}</p>}
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Contract Value ($)</label>
                <input
                  type="number"
                  value={contractValue}
                  onChange={(e) => setContractValue(Number(e.target.value))}
                  className="w-full h-9 px-3 rounded-xl bg-slate-50/80 dark:bg-white/5 border border-slate-200/90 dark:border-white/10 font-semibold text-slate-800 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:border-[#0284C7] dark:focus:border-sky-500 focus:outline-none mt-1 transition-all"
                />
                {errors.contractValue && <p className="text-rose-500 text-xs mt-1">{errors.contractValue}</p>}
              </div>
            </div>
          </div>

          {/* Crew & Schedule */}
          <div className="space-y-2">
            <label className="font-extrabold text-slate-900 dark:text-white">Crew & Schedule</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Assigned Crew Lead</label>
                <input
                  type="text"
                  value={crewLead}
                  onChange={(e) => setCrewLead(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl bg-slate-50/80 dark:bg-white/5 border border-slate-200/90 dark:border-white/10 font-semibold text-slate-800 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:border-[#0284C7] dark:focus:border-sky-500 focus:outline-none mt-1 transition-all"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Scheduled Start</label>
                <input
                  type="date"
                  value={scheduledStart}
                  onChange={(e) => setScheduledStart(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl bg-slate-50/80 dark:bg-white/5 border border-slate-200/90 dark:border-white/10 font-semibold text-slate-800 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:border-[#0284C7] dark:focus:border-sky-500 focus:outline-none mt-1 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Initial Notes */}
          <div className="space-y-1">
            <label className="font-extrabold text-slate-900 dark:text-white">Initial Jobsite Notes</label>
            <textarea
              rows={2}
              placeholder="Dumpster placement instructions, gate code, homeowner preferences..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-50/80 dark:bg-white/5 border border-slate-200/90 dark:border-white/10 font-medium text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:border-[#0284C7] dark:focus:border-sky-500 focus:outline-none transition-all"
            />
          </div>

          {/* Footer Submit */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-slate-300 font-bold transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !customerName.trim()}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#1878B8] via-sky-500 to-[#55C4F5] hover:brightness-110 text-white font-extrabold shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={15} />}
              <span>Create Work Order</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
