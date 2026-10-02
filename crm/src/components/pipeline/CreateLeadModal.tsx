import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  Calculator,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { cleanseAuthor, serializeProfileNote } from '@/lib/noteUtils';
import { z } from 'zod';

const CreateLeadSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  phone: z.string().optional().or(z.literal('')),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  address: z.string().optional(),
  serviceType: z.string().min(1, 'Service type is required'),
});

export interface CreateLeadPayload {
  name: string;
  phone: string;
  email: string;
  service: string;
  serviceColor: 'sky' | 'amber' | 'emerald' | 'purple' | 'coral' | 'indigo' | 'blue';
  sqf: string;
  roofType: string;
  stories: string;
  address: string;
  zipCode: string;
  notes: string;
  city: string;
  stageId?: string;
}

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

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    service: 'Residential Roofing',
    sqf: '',          // empty = not entered; filled = user intentionally provided roof size
    roofType: 'Concrete Tile',
    stories: '1 Story',
    address: '',
    zipCode: '92025',
    notes: '',
  });
  const [sqfTouched, setSqfTouched] = useState(false); // true only when user explicitly typed a value

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
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
      setSqfTouched(false);

      setError(null);
      setSuccessNotice(false);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Phone number format helper: (760) 000-0000
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
    setFormData((prev) => ({ ...prev, phone: formatted }));
  };

  // Service to serviceColor mapping
  const getServiceColor = (service: string): 'sky' | 'amber' | 'emerald' | 'purple' | 'coral' | 'indigo' | 'blue' => {
    if (service.includes('Tile')) return 'coral';
    if (service.includes('Commercial') || service.includes('Flat')) return 'sky';
    if (service.includes('Repair') || service.includes('Emergency')) return 'amber';
    if (service.includes('Solar')) return 'purple';
    if (service.includes('Gutters') || service.includes('Maintenance')) return 'emerald';
    return 'blue';
  };

  // Formula-based real-time valuation matching global estimator rules
  // Returns null amounts when the user hasn't entered a roof size yet
  const calculateLiveQuote = () => {
    const rawSqf = parseInt(formData.sqf);
    const hasSize = !isNaN(rawSqf) && rawSqf > 0;
    const sqft = hasSize ? rawSqf : 0;
    const svc = (formData.service || '').toLowerCase();

    let lowRate = 4.0;
    let highRate = 6.2;
    let baseLow = 500;
    let baseHigh = 950;
    let term = 60;

    if (svc.includes('repair') || svc.includes('leak')) {
      lowRate = 0.4;
      highRate = 0.8;
      baseLow = 100;
      baseHigh = 600;
      term = 18;
    } else if (svc.includes('commercial') || svc.includes('flat')) {
      lowRate = 5.0;
      highRate = 8.0;
      baseLow = 2250;
      baseHigh = 4000;
      term = 60;
    } else if (svc.includes('solar')) {
      lowRate = 7.5;
      highRate = 11.5;
      baseLow = 1500;
      baseHigh = 3000;
      term = 120;
    }

    if (!hasSize) {
      return { sqft: null, low: null, high: null, midpoint: null, monthly: null, term };
    }

    const low = Math.round(baseLow + sqft * lowRate);
    const high = Math.round(baseHigh + sqft * highRate);
    const midpoint = Math.round((low + high) / 2);
    const monthly = Math.round(midpoint / term);

    return { sqft, low, high, midpoint, monthly, term };
  };

  const liveQuote = calculateLiveQuote();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationData = {
      fullName: formData.name,
      phone: formData.phone,
      email: formData.email,
      address: formData.address,
      serviceType: formData.service
    };
    const result = CreateLeadSchema.safeParse(validationData);
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

    if (!formData.name.trim()) {
      setError('Please enter the homeowner / company full name.');
      return;
    }
    if (!formData.phone.trim() || formData.phone.replace(/\D/g, '').length < 10) {
      setError('Please enter a valid 10-digit phone number.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const addressParts = formData.address.split(',');
      const city = addressParts.length > 1 ? addressParts[1].trim() : 'Oceanside, CA';
      const stampedNotes = formData.notes.trim()
        ? serializeProfileNote(formData.notes.trim(), authorName, authorRole)
        : '';

      const payload: CreateLeadPayload = {
        ...formData,
        notes: stampedNotes,
        serviceColor: getServiceColor(formData.service),
        city: city.includes('CA') ? city : `${city}, CA`,
        stageId: initialStageId,
      };

      await api.createLead({
        name: formData.name,
        fullName: formData.name,
        full_name: formData.name,
        phone: formData.phone,
        email: formData.email,
        address: formData.address,
        city: payload.city,
        zip: formData.zipCode,
        service: formData.service,
        serviceType: formData.service,
        service_type: formData.service,
        // Only send roof size fields when the user actually entered a value
        ...(liveQuote.sqft ? {
          roof_sqf: liveQuote.sqft,
          roofSqf: liveQuote.sqft,
          roof_squares: Math.round((liveQuote.sqft / 100) * 10) / 10,
          estimated_value: liveQuote.midpoint,
          estimatedValue: liveQuote.midpoint,
        } : {}),
        roof_type: formData.roofType,
        stories: formData.stories,
        notes: stampedNotes,
        leadSource: 'manual',
        lead_source: 'manual',
      });

      if (onSubmitLead) {
        await onSubmitLead(payload);
      }

      setSuccessNotice(true);
      setTimeout(() => {
        onClose();
      }, 400);
    } catch (err: any) {
      setError(err?.message || 'Failed to create lead. Please check details.');
    } finally {
      setSubmitting(false);
    }
  };

  // Portal directly to document.body to blanket BOTH side panels
  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-5 bg-slate-950/65 backdrop-blur-xl overflow-y-auto animate-in fade-in duration-200"
    >
      {/* Ambient Caustic Light Behind Modal */}
      <div className="fixed top-1/4 left-1/3 w-96 h-96 bg-sky-400/20 rounded-full blur-[110px] pointer-events-none" />
      <div className="fixed bottom-1/4 right-1/3 w-80 h-80 bg-amber-400/15 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Centered Optical Glass Modal Card */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-xl rounded-[26px] bg-white/94 dark:bg-[#0B1320]/95 backdrop-blur-3xl border border-white/95 dark:border-white/12 shadow-[0_25px_90px_rgba(0,0,0,0.40),0_0_0_1px_rgba(255,255,255,0.9)_inset] dark:shadow-[0_25px_90px_rgba(0,0,0,0.85)] overflow-hidden my-auto animate-in zoom-in-95 duration-200 text-slate-800 dark:text-slate-100"
      >
        {/* Subtle Specular Top Highlight Bevel */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 dark:via-white/20 to-transparent" />

        {/* Modal Header */}
        <div className="px-6 pt-5 pb-3.5 border-b border-slate-200/75 dark:border-white/10 flex items-start justify-between gap-4 bg-white/40 dark:bg-white/5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Create New Lead
              </h2>
              <span className="text-[9.5px] font-black px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-500/20 text-[#0284c7] dark:text-sky-300 border border-sky-300/70 dark:border-sky-500/30 shadow-2xs">
                Pipeline Intake
              </span>
            </div>

            {/* Minimal Autofetched Account Tag */}
            <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              <span>Enter property & contact details</span>
              <span className="text-slate-300 dark:text-slate-600">•</span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 border border-slate-200/80 dark:border-white/10 text-[10px] font-bold text-slate-700 dark:text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span>Rep: {authorName} ({authorRole.toUpperCase()})</span>
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100/90 hover:bg-slate-200 text-slate-500 hover:text-slate-900 dark:bg-white/10 dark:hover:bg-white/20 dark:text-slate-400 dark:hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-2xs shrink-0"
            title="Close dialog (Esc)"
          >
            <X size={15} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto no-scrollbar">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2 shadow-2xs animate-in fade-in">
              <AlertCircle size={15} className="shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {successNotice && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 shadow-2xs animate-in fade-in">
              <CheckCircle2 size={15} className="shrink-0 text-emerald-600" />
              <span>Lead created successfully! Added to pipeline.</span>
            </div>
          )}

          {/* ========================================================
              SECTION 1: CONTACT INFORMATION
              ======================================================== */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-3.5 rounded-full bg-gradient-to-b from-[#1878B8] to-[#55C4F5]" />
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Contact Information
              </span>
              <div className="h-px bg-gradient-to-r from-slate-200 via-slate-100 to-transparent dark:from-white/15 dark:via-white/5 dark:to-transparent flex-1" />
            </div>

            {/* Full Name * */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative group">
                <User size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#1878B8] transition-colors pointer-events-none" />
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Robert Johnson"
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50/80 hover:bg-white focus:bg-white dark:bg-white/5 dark:hover:bg-white/10 dark:focus:bg-slate-900 border border-slate-200/90 dark:border-white/12 focus:border-[#1878B8] dark:focus:border-sky-400 focus:ring-3 focus:ring-sky-400/20 text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all shadow-2xs"
                />
              </div>
              {errors.fullName && <p className="text-rose-500 text-xs mt-1">{errors.fullName}</p>}
            </div>

            {/* Phone & Email Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Phone Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative group">
                  <Phone size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#1878B8] transition-colors pointer-events-none" />
                  <input
                    required
                    type="tel"
                    value={formData.phone}
                    onChange={handlePhoneChange}
                    placeholder="(760) 000-0000"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50/80 hover:bg-white focus:bg-white dark:bg-white/5 dark:hover:bg-white/10 dark:focus:bg-slate-900 border border-slate-200/90 dark:border-white/12 focus:border-[#1878B8] dark:focus:border-sky-400 focus:ring-3 focus:ring-sky-400/20 text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all shadow-2xs"
                  />
                </div>
                {errors.phone && <p className="text-rose-500 text-xs mt-1">{errors.phone}</p>}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address
                </label>
                <div className="relative group">
                  <Mail size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#1878B8] transition-colors pointer-events-none" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="name@example.com"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50/80 hover:bg-white focus:bg-white dark:bg-white/5 dark:hover:bg-white/10 dark:focus:bg-slate-900 border border-slate-200/90 dark:border-white/12 focus:border-[#1878B8] dark:focus:border-sky-400 focus:ring-3 focus:ring-sky-400/20 text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all shadow-2xs"
                  />
                </div>
                {errors.email && <p className="text-rose-500 text-xs mt-1">{errors.email}</p>}
              </div>
            </div>
          </div>

          {/* ========================================================
              SECTION 2: PROJECT & PIPELINE
              ======================================================== */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-3.5 rounded-full bg-gradient-to-b from-[#1878B8] to-[#55C4F5]" />
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Project & Service
              </span>
              <div className="h-px bg-gradient-to-r from-slate-200 via-slate-100 to-transparent dark:from-white/15 dark:via-white/5 dark:to-transparent flex-1" />
            </div>

            {/* Service Type Dropdown */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Service Type
              </label>
              <div className="relative group">
                <select
                  value={formData.service}
                  onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50/80 hover:bg-white focus:bg-white dark:bg-white/5 dark:hover:bg-white/10 dark:focus:bg-slate-900 border border-slate-200/90 dark:border-white/12 focus:border-[#1878B8] dark:focus:border-sky-400 focus:ring-3 focus:ring-sky-400/20 text-xs font-bold text-slate-900 dark:text-white appearance-none outline-none cursor-pointer pr-9 transition-all shadow-2xs"
                >
                  <option value="Residential Roofing">Residential Roofing</option>
                  <option value="Concrete / Spanish Tile Relay & Reset">Concrete / Spanish Tile Relay & Reset</option>
                  <option value="Asphalt & Architectural Shingle">Asphalt & Architectural Shingle</option>
                  <option value="Emergency Roof Leak Repair">Emergency Roof Leak Repair</option>
                  <option value="Commercial Flat Roofing">Commercial Flat Roofing</option>
                  <option value="Solar Detach & Reset (R&R)">Solar Detach & Reset (R&R)</option>
                  <option value="Full Gutters & Maintenance">Full Gutters & Maintenance</option>
                </select>
                <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 pointer-events-none transition-colors" />
              </div>
            </div>
          </div>

          {/* ========================================================
              SECTION 3: PROPERTY SPECIFICATIONS (ROOFING)
              ======================================================== */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-3.5 rounded-full bg-gradient-to-b from-[#1878B8] to-[#55C4F5]" />
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Property Specifications (Roofing)
              </span>
              <div className="h-px bg-gradient-to-r from-slate-200 via-slate-100 to-transparent dark:from-white/15 dark:via-white/5 dark:to-transparent flex-1" />
            </div>

            {/* 3-Column Spec Row */}
            <div className="grid grid-cols-3 gap-2.5">
              {/* Roof Size */}
              <div>
                <label className="block text-[10.5px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Roof Size <span className="font-normal text-slate-400">(sq ft)</span>
                </label>
                <div className="relative group">
                  <input
                    type="number"
                    value={formData.sqf}
                    onChange={(e) => {
                      setFormData({ ...formData, sqf: e.target.value });
                      setSqfTouched(e.target.value.trim() !== '');
                    }}
                    placeholder="Optional — e.g. 2500"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50/80 hover:bg-white focus:bg-white dark:bg-white/5 dark:hover:bg-white/10 dark:focus:bg-slate-900 border border-slate-200/90 dark:border-white/12 focus:border-[#1878B8] dark:focus:border-sky-400 focus:ring-3 focus:ring-sky-400/20 text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all shadow-2xs"
                  />
                </div>
              </div>

              {/* Roof Type */}
              <div>
                <label className="block text-[10.5px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Roof Type
                </label>
                <div className="relative group">
                  <select
                    value={formData.roofType}
                    onChange={(e) => setFormData({ ...formData, roofType: e.target.value })}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-50/80 hover:bg-white focus:bg-white dark:bg-white/5 dark:hover:bg-white/10 dark:focus:bg-slate-900 border border-slate-200/90 dark:border-white/12 focus:border-[#1878B8] dark:focus:border-sky-400 focus:ring-3 focus:ring-sky-400/20 text-xs font-semibold text-slate-900 dark:text-white appearance-none outline-none cursor-pointer pr-6 truncate transition-all shadow-2xs"
                  >
                    <option value="Concrete Tile">Concrete Tile</option>
                    <option value="Spanish Clay Tile">Spanish Clay Tile</option>
                    <option value="Architectural Shingle">Architectural Shingle</option>
                    <option value="Standing Seam Metal">Standing Seam Metal</option>
                    <option value="Flat / Torch Down">Flat / Torch Down</option>
                    <option value="Wood Shake">Wood Shake</option>
                  </select>
                  <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Stories */}
              <div>
                <label className="block text-[10.5px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Stories
                </label>
                <div className="relative group">
                  <select
                    value={formData.stories}
                    onChange={(e) => setFormData({ ...formData, stories: e.target.value })}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-50/80 hover:bg-white focus:bg-white dark:bg-white/5 dark:hover:bg-white/10 dark:focus:bg-slate-900 border border-slate-200/90 dark:border-white/12 focus:border-[#1878B8] dark:focus:border-sky-400 focus:ring-3 focus:ring-sky-400/20 text-xs font-semibold text-slate-900 dark:text-white appearance-none outline-none cursor-pointer pr-6 transition-all shadow-2xs"
                  >
                    <option value="1 Story">1 Story</option>
                    <option value="2 Story">2 Story</option>
                    <option value="3 Story">3 Story</option>
                    <option value="Split Level">Split Level</option>
                  </select>
                  <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Live Auto-Calculated Pricing Card */}
            <div className="p-3 rounded-2xl bg-gradient-to-r from-sky-500/10 via-sky-500/5 to-white dark:from-sky-950/40 dark:via-sky-950/20 dark:to-slate-900/60 border border-sky-200/90 dark:border-sky-500/30 shadow-2xs flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <Calculator size={13} className="text-[#1878B8] dark:text-sky-400" />
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Live Formula Deal Valuation
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  {liveQuote.midpoint != null ? (
                    <>
                      <span className="text-lg font-black text-[#1878B8] dark:text-sky-400">
                        ${liveQuote.midpoint.toLocaleString()}
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        (${liveQuote.low!.toLocaleString()} – ${liveQuote.high!.toLocaleString()})
                      </span>
                    </>
                  ) : (
                    <span className="text-sm text-slate-400 dark:text-slate-500 font-medium italic">
                      Add roof size to estimate value
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0">
                {liveQuote.monthly != null ? (
                  <>
                    <span className="text-[10px] font-bold text-sky-800 dark:text-sky-300 bg-sky-100/90 dark:bg-sky-500/20 px-2 py-0.5 rounded-lg border border-sky-200/80 dark:border-sky-500/40">
                      ~${liveQuote.monthly}/mo (0% APR)
                    </span>
                    <span className="block text-[9.5px] text-slate-400 dark:text-slate-500 mt-0.5 font-mono">
                      {liveQuote.sqft!.toLocaleString()} sq ft @ global rule
                    </span>
                  </>
                ) : (
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                    Optional field
                  </span>
                )}
              </div>
            </div>

            {/* Address / City & ZIP Code */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="sm:col-span-2">
                <label className="block text-[10.5px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Address / City
                </label>
                <div className="relative group">
                  <MapPin size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#1878B8] transition-colors pointer-events-none" />
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="e.g. 1245 Grand Ave, Escondido"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50/80 hover:bg-white focus:bg-white dark:bg-white/5 dark:hover:bg-white/10 dark:focus:bg-slate-900 border border-slate-200/90 dark:border-white/12 focus:border-[#1878B8] dark:focus:border-sky-400 focus:ring-3 focus:ring-sky-400/20 text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all shadow-2xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10.5px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  ZIP Code
                </label>
                <div className="relative group">
                  <Hash size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#1878B8] transition-colors pointer-events-none" />
                  <input
                    type="text"
                    maxLength={5}
                    value={formData.zipCode}
                    onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                    placeholder="92025"
                    className="w-full pl-8 pr-2.5 py-2 rounded-xl bg-slate-50/80 hover:bg-white focus:bg-white dark:bg-white/5 dark:hover:bg-white/10 dark:focus:bg-slate-900 border border-slate-200/90 dark:border-white/12 focus:border-[#1878B8] dark:focus:border-sky-400 focus:ring-3 focus:ring-sky-400/20 text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all shadow-2xs"
                  />
                </div>
              </div>
            </div>

            {/* Project Notes */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10.5px] font-bold text-slate-700 dark:text-slate-300">
                  Project Notes & Intake Details
                </label>
              </div>

              <div className="relative group">
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="e.g. Active leak in master bedroom ceiling; needs urgent inspection..."
                  className="w-full p-3 rounded-xl bg-slate-50/80 hover:bg-white focus:bg-white dark:bg-white/5 dark:hover:bg-white/10 dark:focus:bg-slate-900 border border-slate-200/90 dark:border-white/12 focus:border-[#1878B8] dark:focus:border-sky-400 focus:ring-3 focus:ring-sky-400/20 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all resize-none font-medium shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-600 hover:text-slate-900 dark:bg-white/10 dark:hover:bg-white/20 dark:text-slate-300 dark:hover:text-white transition-all cursor-pointer shadow-2xs"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="flex items-center justify-center gap-1.5 px-6 py-2 rounded-xl bg-gradient-to-r from-[#1878B8] via-[#0284c7] to-[#38bdf8] hover:brightness-105 active:scale-[0.98] text-white text-xs font-black shadow-[0_4px_16px_rgba(24,120,184,0.35)] hover:shadow-[0_6px_22px_rgba(24,120,184,0.45)] transition-all disabled:opacity-50 cursor-pointer"
            >
              <Plus size={14} className="stroke-[3]" />
              <span>{submitting ? 'Creating Lead...' : 'Create Lead'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
