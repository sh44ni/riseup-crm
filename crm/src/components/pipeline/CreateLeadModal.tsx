import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  X,
  User,
  Phone,
  Mail,
  Home,
  MapPin,
  FileText,
  ChevronDown,
  Layers,
  Building,
  Hash,
  Plus,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { cleanseAuthor, serializeProfileNote } from '@/lib/noteUtils';
import { CrmSelect } from '@/components/common/CrmSelect';
import {
  CreateLeadFormSchema,
  CreateLeadFormData,
  CreateLeadPayload,
  getServiceColor,
  ROOF_TYPES,
  SERVICE_OPTIONS,
  STORIES_OPTIONS,
} from './create-lead/types';
import { calculateLiveQuote } from './create-lead/quoteMath';
import { LiveQuoteCard } from './create-lead/LiveQuoteCard';

export type { CreateLeadPayload } from './create-lead/types';

interface CreateLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitLead?: (lead: CreateLeadPayload) => void;
  initialStageId?: string;
}

export function CreateLeadModal({
  isOpen,
  initialStageId = 'cold_lead',
  onClose,
  onSubmitLead,
}: CreateLeadModalProps) {
  const { user } = useAuth();
  const clean = cleanseAuthor(user?.name, user?.role);
  const authorName = clean.name;
  const authorRole = clean.role || 'Owner';

  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateLeadFormData>({
    resolver: zodResolver(CreateLeadFormSchema),
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      service: 'Residential Roofing',
      sqf: '',
      roofType: 'Concrete Tile',
      stories: '1 Story',
      address: '',
      zipCode: '92025',
      notes: '',
    },
  });

  const sqfValue = watch('sqf');
  const serviceValue = watch('service');
  const phoneValue = watch('phone');
  const roofTypeValue = watch('roofType');
  const storiesValue = watch('stories');

  const liveQuote = calculateLiveQuote(sqfValue, serviceValue);

  useEffect(() => {
    if (isOpen) {
      reset({
        name: '',
        phone: '',
        email: '',
        service: 'Residential Roofing',
        sqf: '',
        roofType: 'Concrete Tile',
        stories: '1 Story',
        address: '',
        zipCode: '92025',
        notes: '',
      });
      setServerError(null);
      setSuccessNotice(false);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, reset]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 10);
    let formatted = raw;
    if (raw.length > 6) {
      formatted = `(${raw.slice(0, 3)}) ${raw.slice(3, 6)}-${raw.slice(6)}`;
    } else if (raw.length > 3) {
      formatted = `(${raw.slice(0, 3)}) ${raw.slice(3)}`;
    } else if (raw.length > 0) {
      formatted = `(${raw}`;
    }
    setValue('phone', formatted, { shouldValidate: true });
  };

  if (!isOpen) return null;

  const onSubmit = async (data: CreateLeadFormData) => {
    setSubmitting(true);
    setServerError(null);

    try {
      const addressParts = data.address.split(',');
      const city = addressParts.length > 1 ? addressParts[1].trim() : 'Oceanside, CA';
      const stampedNotes = data.notes.trim()
        ? serializeProfileNote(data.notes.trim(), authorName, authorRole)
        : '';

      const payload: CreateLeadPayload = {
        ...data,
        notes: stampedNotes,
        serviceColor: getServiceColor(data.service),
        city: city.includes('CA') ? city : `${city}, CA`,
        stageId: initialStageId,
      };

      await api.createLead({
        name: data.name,
        fullName: data.name,
        full_name: data.name,
        phone: data.phone,
        email: data.email,
        address: data.address,
        city: payload.city,
        zip: data.zipCode,
        service: data.service,
        serviceType: data.service,
        service_type: data.service,
        ...(liveQuote.sqft
          ? {
              roof_sqf: liveQuote.sqft,
              roofSqf: liveQuote.sqft,
              estimated_value: liveQuote.midpoint ?? undefined,
            }
          : {}),
        leadSource: 'manual',
        status: initialStageId || 'new_lead',
        notes: stampedNotes || undefined,
        roofType: data.roofType,
        roof_type: data.roofType,
        stories: data.stories,
      });

      setSuccessNotice(true);
      if (onSubmitLead) onSubmitLead(payload);
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create lead. Please check network and try again.';
      setServerError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-white/10 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between bg-slate-50/60 dark:bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-600 to-sky-500 text-white flex items-center justify-center shadow-xs">
              <Plus size={18} className="stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white">Create New Lead</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Add homeowner details to initialize pipeline tracking
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {serverError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0 text-rose-500" />
              <span>{serverError}</span>
            </div>
          )}

          {successNotice && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 size={15} className="shrink-0 text-emerald-600" />
              <span>Lead created successfully! Added to pipeline.</span>
            </div>
          )}

          {/* Section 1: Contact Info */}
          <div className="space-y-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Contact Information
            </span>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  {...register('name')}
                  placeholder="e.g. Robert Johnson"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                />
              </div>
              {errors.name && <p className="text-rose-500 text-xs mt-1">{errors.name.message}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Phone Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    value={phoneValue}
                    onChange={handlePhoneChange}
                    placeholder="(760) 000-0000"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                  />
                </div>
                {errors.phone && <p className="text-rose-500 text-xs mt-1">{errors.phone.message}</p>}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    {...register('email')}
                    placeholder="name@example.com"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                  />
                </div>
                {errors.email && <p className="text-rose-500 text-xs mt-1">{errors.email.message}</p>}
              </div>
            </div>
          </div>

          {/* Section 2: Project & Specs */}
          <div className="space-y-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Project & Service
            </span>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Service Type
              </label>
              <CrmSelect
                value={serviceValue}
                onChange={(val) => setValue('service', val, { shouldValidate: true })}
                options={SERVICE_OPTIONS.map((svc) => ({ value: svc, label: svc }))}
                triggerClassName="py-2 text-xs font-bold"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10.5px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Roof Size (Sq Ft)
                </label>
                <input
                  type="number"
                  min="0"
                  step="50"
                  {...register('sqf')}
                  placeholder="e.g. 2500"
                  className="w-full px-2.5 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-[10.5px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Roof Type
                </label>
                <CrmSelect
                  value={roofTypeValue}
                  onChange={(val) => setValue('roofType', val, { shouldValidate: true })}
                  options={ROOF_TYPES.map((type) => ({ value: type, label: type }))}
                  triggerClassName="py-2 text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10.5px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Stories
                </label>
                <CrmSelect
                  value={storiesValue}
                  onChange={(val) => setValue('stories', val, { shouldValidate: true })}
                  options={STORIES_OPTIONS.map((st) => ({ value: st, label: st }))}
                  triggerClassName="py-2 text-xs font-semibold"
                />
              </div>
            </div>

            <LiveQuoteCard quote={liveQuote} />
          </div>

          {/* Section 3: Location & Notes */}
          <div className="space-y-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Location & Notes
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[10.5px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Property Address
                </label>
                <div className="relative">
                  <MapPin size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    {...register('address')}
                    placeholder="1234 Main St, Oceanside, CA"
                    className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10.5px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  ZIP Code
                </label>
                <input
                  type="text"
                  {...register('zipCode')}
                  placeholder="92025"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10.5px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Initial Notes
              </label>
              <textarea
                rows={2}
                {...register('notes')}
                placeholder="Caller notes, leak locations, urgency level..."
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all resize-none"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200/80 dark:border-white/10 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Creating Lead...' : 'Create Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
