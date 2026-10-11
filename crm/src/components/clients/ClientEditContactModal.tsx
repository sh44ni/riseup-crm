import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, User, Mail, Phone, MapPin, Check, AlertCircle, PhoneCall, Send, ShieldCheck } from 'lucide-react';
import {
  validateEmail,
  validatePhone,
  validateAddress,
  formatPhoneNumber,
  getTelUrl,
  getMailtoUrl,
  ContactValidationErrors,
} from '@/utils/contactValidation';
import { checkClientContact } from '@/api/clientsApi';

export interface ClientContactData {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  zip: string;
}

interface ClientEditContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientName: string;
  clientId?: number | string;
  initialData: ClientContactData;
  onSave: (data: ClientContactData) => Promise<void>;
}

export function ClientEditContactModal({
  isOpen,
  onClose,
  clientName,
  clientId,
  initialData,
  onSave,
}: ClientEditContactModalProps) {
  const [formData, setFormData] = useState<ClientContactData>({ ...initialData });
  const [errors, setErrors] = useState<ContactValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: initialData.name || '',
        email: initialData.email || '',
        phone: initialData.phone || '',
        address: initialData.address || '',
        city: initialData.city || '',
        zip: initialData.zip || '',
      });
      setErrors({});
      setSubmitError(null);
    }
  }, [isOpen, initialData]);

  // Handle ESC key and body scroll lock
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
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

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const formatted = formatPhoneNumber(raw);
    setFormData((prev) => ({ ...prev, phone: formatted }));

    if (errors.phone) {
      const v = validatePhone(raw, false);
      if (v.isValid) {
        setErrors((prev) => ({ ...prev, phone: undefined }));
      }
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFormData((prev) => ({ ...prev, email: val }));

    if (errors.email) {
      const v = validateEmail(val, false);
      if (v.isValid) {
        setErrors((prev) => ({ ...prev, email: undefined }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const newErrors: ContactValidationErrors = {};

    // Validate Name
    if (!formData.name.trim()) {
      newErrors.name = 'Contact name is required.';
    }

    // Validate Email
    if (formData.email.trim()) {
      const emailVal = validateEmail(formData.email, false);
      if (!emailVal.isValid) {
        newErrors.email = emailVal.error;
      }
    }

    // Validate Phone
    if (formData.phone.trim()) {
      const phoneVal = validatePhone(formData.phone, false);
      if (!phoneVal.isValid) {
        newErrors.phone = phoneVal.error;
      }
    }

    // Validate Address
    const addrVal = validateAddress(formData.address, formData.city, formData.zip, false);
    if (!addrVal.isValid) {
      Object.assign(newErrors, addrVal.errors);
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);

    // Only run pre-flight conflict check if email or phone was actually modified by the user
    const emailChanged = Boolean(
      formData.email.trim() &&
      formData.email.trim().toLowerCase() !== (initialData.email || '').trim().toLowerCase()
    );
    const initialPhoneDigits = (initialData.phone || '').replace(/\D/g, '');
    const formPhoneDigits = (formData.phone || '').replace(/\D/g, '');
    const phoneChanged = Boolean(
      formPhoneDigits &&
      formPhoneDigits !== initialPhoneDigits &&
      formPhoneDigits.length >= 7
    );

    if (emailChanged || phoneChanged) {
      try {
        const checkRes = await checkClientContact({
          email: emailChanged ? formData.email.trim() : undefined,
          phone: phoneChanged ? formData.phone.trim() : undefined,
          excludeClientId: clientId ? Number(clientId) : undefined,
        });

        const currentCid = clientId != null && !isNaN(Number(clientId)) ? Number(clientId) : null;
        const matchedCid = checkRes.client?.id != null ? Number(checkRes.client.id) : null;

        // Conflict only applies if it belongs to a different client record
        if (checkRes.exists && checkRes.client && (!currentCid || matchedCid !== currentCid)) {
          const msg = checkRes.field === 'phone'
            ? `A client with this phone number already exists: "${checkRes.client.full_name}" (Client #${checkRes.client.id}). Please use a unique phone number.`
            : `A client with this email already exists: "${checkRes.client.full_name}" (Client #${checkRes.client.id}). Please use a unique email.`;
          setSubmitError(msg);
          setIsSubmitting(false);
          return;
        }
      } catch {
        // Backend enforces check
      }
    }

    try {
      await onSave({
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        city: formData.city.trim(),
        zip: formData.zip.trim(),
      });
      onClose();
    } catch (err: any) {
      setSubmitError(err?.message || 'Failed to update contact info. Please try again.');
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
        className="bg-white/95 dark:bg-[#0B1320]/95 backdrop-blur-2xl rounded-3xl border border-white/60 dark:border-white/10 w-full max-w-lg shadow-[0_25px_80px_rgba(15,23,42,0.35)] dark:shadow-[0_25px_80px_rgba(0,0,0,0.85)] overflow-hidden my-auto flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-contact-title"
      >
        {/* Header */}
        <div className="shrink-0 p-5 border-b border-slate-200/80 dark:border-white/10 bg-gradient-to-r from-sky-50/70 dark:from-sky-950/30 to-white dark:to-transparent flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0284C7]/10 dark:bg-sky-500/15 border border-[#0284C7]/20 dark:border-sky-500/30 flex items-center justify-center text-[#0284C7] dark:text-sky-400">
              <User size={18} />
            </div>
            <div>
              <h3 id="edit-contact-title" className="font-extrabold text-base text-slate-900 dark:text-white leading-tight">
                Edit Contact Information
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Client 360 Source of Truth • Syncs across related views
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Form Body */}
          <div className="p-5 space-y-4 flex-1 overflow-y-auto">
          {submitError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0 text-rose-500" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Full Name */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 mb-1">
              <User size={13} className="text-[#0284C7] dark:text-sky-400" />
              <span>Full Name / Homeowner</span>
              <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Bryce Kirklen"
              className={`w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:outline-none focus:bg-white dark:focus:bg-slate-900 transition-all ${
                errors.name
                  ? 'border-rose-300 dark:border-rose-600 focus:border-rose-500'
                  : 'border-slate-200 dark:border-white/10 focus:border-[#0284C7] dark:focus:border-sky-500'
              }`}
              required
            />
            {errors.name && <p className="text-[11px] text-rose-500 font-medium mt-1">{errors.name}</p>}
          </div>

          {/* Email & Phone Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Email */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between mb-1">
                <span className="flex items-center gap-1.5">
                  <Mail size={13} className="text-[#0284C7] dark:text-sky-400" />
                  <span>Email Address</span>
                </span>
                {formData.email && !errors.email && (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
                    <Check size={10} /> Valid
                  </span>
                )}
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={handleEmailChange}
                placeholder="e.g. client@example.com"
                className={`w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:outline-none focus:bg-white dark:focus:bg-slate-900 transition-all ${
                  errors.email
                    ? 'border-rose-300 dark:border-rose-600 focus:border-rose-500'
                    : 'border-slate-200 dark:border-white/10 focus:border-[#0284C7] dark:focus:border-sky-500'
                }`}
              />
              {errors.email && <p className="text-[11px] text-rose-500 font-medium mt-1">{errors.email}</p>}
            </div>

            {/* Phone */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between mb-1">
                <span className="flex items-center gap-1.5">
                  <Phone size={13} className="text-[#0284C7] dark:text-sky-400" />
                  <span>Primary Phone</span>
                </span>
                {formData.phone && !errors.phone && (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
                    <Check size={10} /> Valid
                  </span>
                )}
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={handlePhoneChange}
                placeholder="(760) 555-0199"
                className={`w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:outline-none focus:bg-white dark:focus:bg-slate-900 transition-all ${
                  errors.phone
                    ? 'border-rose-300 dark:border-rose-600 focus:border-rose-500'
                    : 'border-slate-200 dark:border-white/10 focus:border-[#0284C7] dark:focus:border-sky-500'
                }`}
              />
              {errors.phone && <p className="text-[11px] text-rose-500 font-medium mt-1">{errors.phone}</p>}
            </div>
          </div>

          {/* Quick Actions Protocol Preview (Kept Separate From Editing Controls) */}
          <div className="p-3 rounded-2xl bg-slate-50/90 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                <ShieldCheck size={13} className="text-sky-500" />
                <span>Quick Actions (Native Apps)</span>
              </span>
              <span className="text-[10px] text-slate-400">Click to open native app</span>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <a
                href={getTelUrl(formData.phone)}
                onClick={(e) => {
                  if (!formData.phone || errors.phone) {
                    e.preventDefault();
                  }
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs ${
                  formData.phone && !errors.phone
                    ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 border border-sky-200/80 dark:border-sky-800/60 hover:bg-sky-50 dark:hover:bg-sky-950/40 cursor-pointer'
                    : 'bg-slate-100 dark:bg-white/5 text-slate-400 border border-slate-200/60 dark:border-white/5 cursor-not-allowed opacity-60'
                }`}
                title={formData.phone ? `Open calling app: ${formData.phone}` : 'Enter a valid phone to test calling'}
              >
                <PhoneCall size={12} />
                <span>Call Phone ({formData.phone || 'None'})</span>
              </a>

              <a
                href={getMailtoUrl(formData.email, `Rise Up Roofing & Construction: Project Update`)}
                onClick={(e) => {
                  if (!formData.email || errors.email) {
                    e.preventDefault();
                  }
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs ${
                  formData.email && !errors.email
                    ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer'
                    : 'bg-slate-100 dark:bg-white/5 text-slate-400 border border-slate-200/60 dark:border-white/5 cursor-not-allowed opacity-60'
                }`}
                title={formData.email ? `Open mail app: ${formData.email}` : 'Enter a valid email to test mailing'}
              >
                <Send size={12} />
                <span>Send Email</span>
              </a>
            </div>
          </div>

          {/* Address Line */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 mb-1">
              <MapPin size={13} className="text-[#0284C7] dark:text-sky-400" />
              <span>Street Address</span>
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="e.g. 1942 Oceanside Blvd"
              className={`w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:outline-none focus:bg-white dark:focus:bg-slate-900 transition-all ${
                errors.address
                  ? 'border-rose-300 dark:border-rose-600 focus:border-rose-500'
                  : 'border-slate-200 dark:border-white/10 focus:border-[#0284C7] dark:focus:border-sky-500'
              }`}
            />
            {errors.address && <p className="text-[11px] text-rose-500 font-medium mt-1">{errors.address}</p>}
          </div>

          {/* City & ZIP */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block mb-1">City</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="e.g. Oceanside"
                className={`w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:outline-none focus:bg-white dark:focus:bg-slate-900 transition-all ${
                  errors.city
                    ? 'border-rose-300 dark:border-rose-600 focus:border-rose-500'
                    : 'border-slate-200 dark:border-white/10 focus:border-[#0284C7] dark:focus:border-sky-500'
                }`}
              />
              {errors.city && <p className="text-[11px] text-rose-500 font-medium mt-1">{errors.city}</p>}
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block mb-1">ZIP Code</label>
              <input
                type="text"
                value={formData.zip}
                onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                placeholder="92054"
                maxLength={10}
                className={`w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:outline-none focus:bg-white dark:focus:bg-slate-900 transition-all ${
                  errors.zip
                    ? 'border-rose-300 dark:border-rose-600 focus:border-rose-500'
                    : 'border-slate-200 dark:border-white/10 focus:border-[#0284C7] dark:focus:border-sky-500'
                }`}
              />
              {errors.zip && <p className="text-[11px] text-rose-500 font-medium mt-1">{errors.zip}</p>}
            </div>
          </div>

          </div>

          {/* Action Buttons Sticky Footer */}
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
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#1878B8] via-sky-500 to-[#55C4F5] text-white text-xs font-bold shadow-xs hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Saving to Client 360...</span>
              ) : (
                <>
                  <Check size={14} className="stroke-[3]" />
                  <span>Save to Client 360</span>
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
