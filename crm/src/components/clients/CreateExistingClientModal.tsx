import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  UserCheck,
  User,
  Phone,
  Mail,
  MapPin,
  Home,
  Layers,
  DollarSign,
  Calendar,
  ShieldCheck,
  Clock,
  Briefcase,
  FileText,
  BadgeCheck,
  Building2,
  HardHat,
  Sparkles,
  RotateCcw,
  Send,
} from 'lucide-react';
import { CreateExistingClientPayload, checkClientContact } from '@/api/clientsApi';
import { z } from 'zod';

const CreateClientSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  company: z.string().optional(),
});
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

export interface CreateExistingClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: CreateExistingClientPayload) => Promise<any>;
}

interface PipelineStageOption {
  id: string;
  label: string;
  icon: React.ElementType;
}

const PIPELINE_STAGE_OPTIONS: PipelineStageOption[] = [
  { id: 'cold_lead', label: 'Cold Lead', icon: Clock },
  { id: 'initial_call', label: 'Contacted', icon: Phone },
  { id: 'estimate_scheduled', label: 'Estimate Scheduled', icon: Calendar },
  { id: 'estimate_sent', label: 'Estimate Sent', icon: FileText },
  { id: 'follow_up', label: 'Follow-Up', icon: RotateCcw },
  { id: 'contract_sent', label: 'Contract Sent', icon: Send },
  { id: 'contract_signed', label: 'Contract Signed', icon: BadgeCheck },
  { id: 'active_jobs', label: 'Active Job', icon: HardHat },
  { id: 'completed', label: 'Lifetime Warrantied', icon: ShieldCheck },
];

const ROOF_MATERIAL_OPTIONS = [
  'Eagle Concrete Tile',
  'GAF Timberline HDZ Shingles',
  'Standing Seam Metal',
  'Spanish Clay S-Tile',
  'Boral Lightweight Tile',
  'Flat / Torch-Down Modified Bitumen',
  'Commercial Silicone Coating',
];

const SERVICE_OPTIONS = [
  'Roof Replacement',
  'Tile Re-set & Underlayment',
  'Commercial Coating',
  'Emergency Roof Repair',
  'Fascia & Gutter Installation',
  'Dry Rot Repair',
];

export function CreateExistingClientModal({
  isOpen,
  onClose,
  onSave,
}: CreateExistingClientModalProps) {
  const { user } = useAuth();

  // Homeowner Identity
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [secondaryPhone, setSecondaryPhone] = useState('');
  const [clientSince, setClientSince] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [emailConflict, setEmailConflict] = useState<string | null>(null);
  const [phoneConflict, setPhoneConflict] = useState<string | null>(null);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [isCheckingPhone, setIsCheckingPhone] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Property & Specs
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Oceanside');
  const [zip, setZip] = useState('92054');
  const [propertyType, setPropertyType] = useState('Single Family');
  const [roofType, setRoofType] = useState('Eagle Concrete Tile');
  const [roofSqf, setRoofSqf] = useState<number | ''>('');
  const [roofAge, setRoofAge] = useState<number | ''>('');
  const [stories, setStories] = useState(1);
  const [hoa, setHoa] = useState(false);

  // Pipeline & Project Context
  const [pipelineStage, setPipelineStage] = useState('cold_lead');
  const [serviceType, setServiceType] = useState('Roof Replacement');
  const [contractValue, setContractValue] = useState<number | ''>('');
  const [notes, setNotes] = useState('');

  // Staff Assignment
  const [assignedToUserId, setAssignedToUserId] = useState<number | null>(null);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load team members on mount/open
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;

    api.getUsers()
      .then((res: any) => {
        if (!isMounted) return;
        const list = Array.isArray(res?.users) ? res.users : Array.isArray(res) ? res : [];
        setTeamMembers(list);
        if (user?.id && !assignedToUserId) {
          setAssignedToUserId(Number(user.id));
        }
      })
      .catch((err) => {
        console.warn('Failed to load team members for existing client modal:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, user]);

  // Lock body scroll and listen for Escape key
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
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const handleEmailBlur = async () => {
    const clean = email.trim();
    if (!clean || !clean.includes('@')) {
      setEmailConflict(null);
      return;
    }
    try {
      setIsCheckingEmail(true);
      const res = await checkClientContact({ email: clean });
      if (res.exists && res.client) {
        setEmailConflict(`A client with this email already exists: "${res.client.full_name}" (Client #${res.client.id}). Please use a unique email or edit the existing client.`);
      } else {
        setEmailConflict(null);
      }
    } catch (e) {
      // Ignore pre-flight network error
    } finally {
      setIsCheckingEmail(false);
    }
  };

  const handlePhoneBlur = async () => {
    const clean = phone.trim();
    const digits = clean.replace(/\D/g, '');
    if (!clean || digits.length < 7) {
      setPhoneConflict(null);
      return;
    }
    try {
      setIsCheckingPhone(true);
      const res = await checkClientContact({ phone: clean });
      if (res.exists && res.client) {
        setPhoneConflict(`A client with this phone number already exists: "${res.client.full_name}" (Client #${res.client.id}). Please use a unique phone number or edit the existing client.`);
      } else {
        setPhoneConflict(null);
      }
    } catch (e) {
      // Ignore pre-flight network error
    } finally {
      setIsCheckingPhone(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const formData = {
      fullName,
      phone,
      email,
    };
    const result = CreateClientSchema.safeParse(formData);
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

    if (!fullName.trim() || fullName.trim().length < 2) {
      setErrorMessage('Homeowner full name is required (at least 2 characters)');
      return;
    }
    if (!phone.trim() && !email.trim()) {
      setErrorMessage('At least one contact method (phone or email) is required');
      return;
    }

    if (emailConflict) {
      setErrorMessage(emailConflict);
      return;
    }
    if (phoneConflict) {
      setErrorMessage(phoneConflict);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    // Pre-flight check contact conflict before submitting
    try {
      const checkRes = await checkClientContact({
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
      });
      if (checkRes.exists && checkRes.client) {
        const msg = checkRes.field === 'phone'
          ? `A client with this phone number already exists: "${checkRes.client.full_name}" (Client #${checkRes.client.id}). Please use a unique phone number or edit the existing client.`
          : `A client with this email already exists: "${checkRes.client.full_name}" (Client #${checkRes.client.id}). Please use a unique email or edit the existing client.`;
        if (checkRes.field === 'phone') setPhoneConflict(msg);
        else setEmailConflict(msg);
        setErrorMessage(msg);
        setIsSubmitting(false);
        return;
      }
    } catch (e) {
      // Backend will still enforce duplicate check
    }

    const payload: CreateExistingClientPayload = {
      fullName: fullName.trim(),
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      secondaryPhone: secondaryPhone.trim() || undefined,
      address: address.trim() || undefined,
      city: city.trim() || 'Oceanside',
      zip: zip.trim() || '92054',
      propertyType,
      roofType,
      roofSqf: Number(roofSqf) || 2400,
      roofAge: roofAge !== '' ? Number(roofAge) : undefined,
      stories,
      hoa,
      pipelineStage,
      serviceType,
      contractValue: contractValue !== '' ? Number(contractValue) : 0,
      clientSince,
      notes: notes.trim() || undefined,
      assignedToUserId: assignedToUserId || (user?.id ? Number(user.id) : undefined),
      sourceType: 'team_member',
      acquiredByUserId: user?.id ? Number(user.id) : undefined,
      leadSourceDetail: `Staff Onboarding by ${user?.name || 'Staff'} (${user?.role || 'Staff'})`,
    };

    try {
      await onSave(payload);
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to onboard existing homeowner');
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-5 bg-slate-950/65 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200 select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-3xl rounded-3xl bg-white/95 dark:bg-[#0B1320]/95 backdrop-blur-2xl border border-white/90 dark:border-white/10 shadow-[0_25px_80px_rgba(0,0,0,0.35)] dark:shadow-[0_25px_80px_rgba(0,0,0,0.85)] overflow-hidden my-auto flex flex-col max-h-[90vh] text-slate-800 dark:text-slate-200"
      >
        {/* ========================================================
            HEADER
            ======================================================== */}
        <div className="shrink-0 flex items-center justify-between p-5 border-b border-slate-200/80 dark:border-white/10 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-xs">
              <UserCheck size={20} className="stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900 dark:text-white">
                  Onboard Existing Homeowner
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-800/60">
                  Staff Direct Intake
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Add existing customer data & inject directly into any CRM pipeline stage
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* ========================================================
            STAFF ATTRIBUTION AUDIT BANNER
            ======================================================== */}
        <div className="px-6 py-2.5 bg-slate-50 dark:bg-white/[0.03] border-b border-slate-200/60 dark:border-white/5 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              Attributed Creator: <strong className="text-slate-900 dark:text-white">{user?.name || 'Staff User'}</strong>{' '}
              <span className="text-[11px] px-1.5 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-300 ml-1">
                {user?.role || 'Staff'}
              </span>
            </span>
          </div>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 hidden sm:inline">
            Audit Event Auto-Logged
          </span>
        </div>

        {/* ========================================================
            SCROLLABLE FORM BODY
            ======================================================== */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-6 flex-1 text-xs">
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. PIPELINE STAGE SELECTOR (PRIMARY FOCUS) */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Layers size={14} className="text-emerald-500" />
              <span>Target Pipeline Stage</span>
              <span className="text-rose-500">*</span>
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PIPELINE_STAGE_OPTIONS.map((opt) => {
                const IconComponent = opt.icon;
                const isSelected = pipelineStage === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setPipelineStage(opt.id)}
                    className={`h-11 px-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 shadow-xs ring-2 ring-emerald-500/25'
                        : 'border-slate-200/80 dark:border-white/10 bg-white dark:bg-white/[0.02] text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        <IconComponent size={14} />
                      </div>
                      <span className="text-xs font-bold truncate">
                        {opt.label}
                      </span>
                    </div>
                    {isSelected && (
                      <BadgeCheck size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0 ml-1.5" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. HOMEOWNER IDENTITY & CONTACT */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5 border-b border-slate-100 dark:border-white/5 pb-1">
              <User size={13} className="text-slate-400" />
              <span>Homeowner Information</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Robert Henderson"
                    className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                  />
                </div>
                {errors.fullName && <p className="text-rose-500 text-xs mt-1">{errors.fullName}</p>}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Client Since (Historical Date)
                </label>
                <div className="relative">
                  <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="date"
                    value={clientSince}
                    onChange={(e) => setClientSince(e.target.value)}
                    className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    Primary Phone
                  </label>
                  {isCheckingPhone && (
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 animate-pulse font-medium">Checking phone...</span>
                  )}
                </div>
                <div className="relative">
                  <Phone size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${phoneConflict ? 'text-rose-500' : 'text-slate-400'}`} />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (phoneConflict) setPhoneConflict(null);
                    }}
                    onBlur={handlePhoneBlur}
                    placeholder="(760) 555-0199"
                    className={`w-full h-9 pl-9 pr-3 rounded-xl border ${
                      phoneConflict
                        ? 'border-rose-400 dark:border-rose-600 bg-rose-50/40 dark:bg-rose-950/20 text-rose-900 dark:text-rose-200 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500'
                        : 'border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500'
                    } transition-all font-medium`}
                  />
                </div>
                {phoneConflict && (
                  <div className="mt-1.5 p-2 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/80 text-rose-700 dark:text-rose-300 text-[11px] font-semibold flex items-start gap-1.5 leading-tight animate-in fade-in">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-600 shrink-0 mt-1" />
                    <span>{phoneConflict}</span>
                  </div>
                )}
                {errors.phone && <p className="text-rose-500 text-xs mt-1">{errors.phone}</p>}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    Email Address
                  </label>
                  {isCheckingEmail && (
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 animate-pulse font-medium">Checking email...</span>
                  )}
                </div>
                <div className="relative">
                  <Mail size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${emailConflict ? 'text-rose-500' : 'text-slate-400'}`} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailConflict) setEmailConflict(null);
                    }}
                    onBlur={handleEmailBlur}
                    placeholder="homeowner@gmail.com"
                    className={`w-full h-9 pl-9 pr-3 rounded-xl border ${
                      emailConflict
                        ? 'border-rose-400 dark:border-rose-600 bg-rose-50/40 dark:bg-rose-950/20 text-rose-900 dark:text-rose-200 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500'
                        : 'border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500'
                    } transition-all font-medium`}
                  />
                </div>
                {emailConflict && (
                  <div className="mt-1.5 p-2 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/80 text-rose-700 dark:text-rose-300 text-[11px] font-semibold flex items-start gap-1.5 leading-tight animate-in fade-in">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-600 shrink-0 mt-1" />
                    <span>{emailConflict}</span>
                  </div>
                )}
                {errors.email && <p className="text-rose-500 text-xs mt-1">{errors.email}</p>}
              </div>
            </div>
          </div>

          {/* 3. PROPERTY & ROOF SPECS */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5 border-b border-slate-100 dark:border-white/5 pb-1">
              <Home size={13} className="text-slate-400" />
              <span>Property & Roof Specifications</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Street Address
                </label>
                <div className="relative">
                  <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. 1420 Pacific Coast Hwy"
                    className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  City
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Oceanside"
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  ZIP Code
                </label>
                <input
                  type="text"
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  placeholder="92054"
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Roof Material
                </label>
                <select
                  value={roofType}
                  onChange={(e) => setRoofType(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                >
                  {ROOF_MATERIAL_OPTIONS.map((mat) => (
                    <option key={mat} value={mat}>
                      {mat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Roof Size (Sq Ft)
                </label>
                <input
                  type="number"
                  min="500"
                  step="50"
                  value={roofSqf}
                  onChange={(e) => setRoofSqf(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="e.g. 2400"
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Stories
                </label>
                <select
                  value={stories}
                  onChange={(e) => setStories(Number(e.target.value))}
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                >
                  <option value={1}>1 Story</option>
                  <option value={2}>2 Stories</option>
                  <option value={3}>3+ Stories</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  HOA Community
                </label>
                <button
                  type="button"
                  onClick={() => setHoa(!hoa)}
                  className={`w-full h-9 px-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    hoa
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                      : 'border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Building2 size={13} />
                  <span>{hoa ? 'HOA Regulated: Yes' : 'No HOA'}</span>
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Roof Age (Years)
                </label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={roofAge}
                  onChange={(e) => setRoofAge(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="e.g. 18"
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                />
              </div>
            </div>
          </div>

          {/* 4. FINANCIAL & SCOPE DETAILS */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5 border-b border-slate-100 dark:border-white/5 pb-1">
              <DollarSign size={13} className="text-slate-400" />
              <span>Project Scope & Contract Value</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Service / Project Type
                </label>
                <select
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                >
                  {SERVICE_OPTIONS.map((svc) => (
                    <option key={svc} value={svc}>
                      {svc}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Contract / Est. Value ($)
                </label>
                <div className="relative">
                  <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={contractValue}
                    onChange={(e) => setContractValue(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 18500"
                    className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Assigned Representative
                </label>
                <select
                  value={assignedToUserId || ''}
                  onChange={(e) => setAssignedToUserId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                >
                  <option value="">Auto-Assign to Creator ({user?.name || 'Self'})</option>
                  {teamMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.role || 'Staff'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Historical Context, Existing Warranty & Project Notes
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Include past roof permit info, previous repair dates, preferred contact times, or warranty terms..."
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium resize-none"
              />
            </div>
          </div>
        </form>

        {/* ========================================================
            STICKY ACTION FOOTER
            ======================================================== */}
        <div className="shrink-0 p-5 border-t border-slate-200/80 dark:border-white/10 bg-slate-50/80 dark:bg-white/[0.02] flex items-center justify-between">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSubmit}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white font-bold text-xs shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Onboarding Homeowner...</span>
              </>
            ) : (
              <>
                <UserCheck size={14} className="stroke-[2.5]" />
                <span>Onboard Existing Homeowner</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
