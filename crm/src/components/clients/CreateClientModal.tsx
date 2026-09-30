import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, User, Phone, Mail, MapPin, Home, Layers, Plus, Sparkles } from 'lucide-react';
import { CreateClientPayload, checkClientContact } from '@/api/clientsApi';
import { z } from 'zod';

const CreateClientSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  company: z.string().optional(),
});

interface CreateClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: CreateClientPayload) => Promise<any>;
}

export function CreateClientModal({ isOpen, onClose, onSave }: CreateClientModalProps) {
  const [formData, setFormData] = useState<CreateClientPayload>({
    fullName: '',
    phone: '',
    email: '',
    address: '',
    city: 'Oceanside',
    zip: '92054',
    roofType: 'Eagle Concrete Tile',
    roofSqf: 2400,
    stories: 1,
    notes: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [emailConflict, setEmailConflict] = useState<string | null>(null);
  const [phoneConflict, setPhoneConflict] = useState<string | null>(null);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [isCheckingPhone, setIsCheckingPhone] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Lock body scroll and listen for Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleEmailBlur = async () => {
    const clean = formData.email?.trim();
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
      // Ignore preflight network error
    } finally {
      setIsCheckingEmail(false);
    }
  };

  const handlePhoneBlur = async () => {
    const clean = formData.phone?.trim();
    const digits = clean ? clean.replace(/\D/g, '') : '';
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
      // Ignore preflight network error
    } finally {
      setIsCheckingPhone(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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

    if (!formData.fullName.trim()) {
      setErrorMessage('Homeowner full name is required');
      return;
    }
    if (!formData.phone?.trim() && !formData.email?.trim()) {
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

    // Pre-flight duplicate check on submit
    try {
      const checkRes = await checkClientContact({
        email: formData.email?.trim() || undefined,
        phone: formData.phone?.trim() || undefined,
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
      // Backend enforces check
    }

    try {
      await onSave(formData);
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to create client');
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-5 bg-slate-950/65 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg rounded-3xl bg-white/95 dark:bg-[#0B1320]/95 backdrop-blur-2xl border border-white/90 dark:border-white/10 shadow-[0_25px_80px_rgba(0,0,0,0.35)] dark:shadow-[0_25px_80px_rgba(0,0,0,0.85)] overflow-hidden my-auto flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between p-5 border-b border-slate-200/80 dark:border-white/10 bg-gradient-to-r from-sky-50/50 dark:from-sky-950/20 to-white dark:to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#1878B8] to-[#55C4F5] text-white flex items-center justify-center shadow-xs">
              <Plus size={20} className="stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">New Homeowner Intake</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Create client record directly in CRM database</p>
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

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Scrollable Form Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 text-xs font-semibold">
              {errorMessage}
            </div>
          )}

          {/* Full Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Homeowner Full Name *</label>
            <div className="relative">
              <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                required
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="e.g. Robert Vance"
                className="w-full pl-10 pr-3.5 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#0284C7] dark:focus:border-sky-500 focus:bg-white dark:focus:bg-slate-900 transition-all"
              />
            </div>
            {errors.fullName && <p className="text-rose-500 text-xs mt-1">{errors.fullName}</p>}
          </div>

          {/* Contact Methods */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Phone Number *</label>
                {isCheckingPhone && (
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 animate-pulse font-medium">Checking phone...</span>
                )}
              </div>
              <div className="relative">
                <Phone size={15} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${phoneConflict ? 'text-rose-500' : 'text-slate-400 dark:text-slate-500'}`} />
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => {
                    setFormData({ ...formData, phone: e.target.value });
                    if (phoneConflict) setPhoneConflict(null);
                  }}
                  onBlur={handlePhoneBlur}
                  placeholder="(760) 555-0199"
                  className={`w-full pl-10 pr-3.5 py-2 rounded-xl border ${
                    phoneConflict
                      ? 'border-rose-400 dark:border-rose-600 bg-rose-50/40 dark:bg-rose-950/20 text-rose-900 dark:text-rose-200 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500'
                      : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none focus:border-[#0284C7] dark:focus:border-sky-500 focus:bg-white dark:focus:bg-slate-900'
                  } text-xs font-bold placeholder-slate-400 dark:placeholder-slate-500 transition-all`}
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
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Email Address</label>
                {isCheckingEmail && (
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 animate-pulse font-medium">Checking email...</span>
                )}
              </div>
              <div className="relative">
                <Mail size={15} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${emailConflict ? 'text-rose-500' : 'text-slate-400 dark:text-slate-500'}`} />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    if (emailConflict) setEmailConflict(null);
                  }}
                  onBlur={handleEmailBlur}
                  placeholder="homeowner@gmail.com"
                  className={`w-full pl-10 pr-3.5 py-2 rounded-xl border ${
                    emailConflict
                      ? 'border-rose-400 dark:border-rose-600 bg-rose-50/40 dark:bg-rose-950/20 text-rose-900 dark:text-rose-200 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500'
                      : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none focus:border-[#0284C7] dark:focus:border-sky-500 focus:bg-white dark:focus:bg-slate-900'
                  } text-xs font-bold placeholder-slate-400 dark:placeholder-slate-500 transition-all`}
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

          {/* Address */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Street Address</label>
            <div className="relative">
              <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="1234 Ocean Crest Way"
                className="w-full pl-10 pr-3.5 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#0284C7] dark:focus:border-sky-500 focus:bg-white dark:focus:bg-slate-900 transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">City</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#0284C7] dark:focus:border-sky-500 focus:bg-white dark:focus:bg-slate-900 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">ZIP Code</label>
              <input
                type="text"
                value={formData.zip}
                onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#0284C7] dark:focus:border-sky-500 focus:bg-white dark:focus:bg-slate-900 transition-all"
              />
            </div>
          </div>

          {/* Roof Specs */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Roof Material</label>
              <select
                value={formData.roofType}
                onChange={(e) => setFormData({ ...formData, roofType: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#0284C7] dark:focus:border-sky-500 focus:bg-white dark:focus:bg-slate-900 transition-all"
              >
                <option value="Eagle Concrete Tile" className="dark:bg-slate-900 dark:text-white">Eagle Concrete Tile</option>
                <option value="Architectural Shingle" className="dark:bg-slate-900 dark:text-white">Architectural Shingle</option>
                <option value="Standing Seam Metal" className="dark:bg-slate-900 dark:text-white">Standing Seam Metal</option>
                <option value="Commercial Flat / TPO" className="dark:bg-slate-900 dark:text-white">Commercial Flat / TPO</option>
                <option value="Clay Spanish Tile" className="dark:bg-slate-900 dark:text-white">Clay Spanish Tile</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Roof Area (Sq Ft)</label>
              <input
                type="number"
                value={formData.roofSqf}
                onChange={(e) => setFormData({ ...formData, roofSqf: Number(e.target.value) })}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#0284C7] dark:focus:border-sky-500 focus:bg-white dark:focus:bg-slate-900 transition-all"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Initial Notes</label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Homeowner request or project details..."
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#0284C7] dark:focus:border-sky-500 focus:bg-white dark:focus:bg-slate-900 transition-all"
            />
          </div>
          </div>

          {/* Sticky Actions Footer */}
          <div className="shrink-0 px-5 py-3.5 border-t border-slate-200/80 dark:border-white/10 bg-slate-50/60 dark:bg-slate-900/60 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-[#1878B8] to-[#55C4F5] text-white text-xs font-bold shadow-xs hover:shadow-md hover:scale-[1.02] transition-all disabled:opacity-50 cursor-pointer"
            >
              <Sparkles size={14} />
              <span>{isSubmitting ? 'Creating...' : 'Save Homeowner'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
