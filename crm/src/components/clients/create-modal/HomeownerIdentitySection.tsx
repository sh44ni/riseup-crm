import React, { useState } from 'react';
import { User, Calendar, Phone, Mail } from 'lucide-react';
import type { UseFormRegister, FieldErrors, UseFormSetValue } from 'react-hook-form';
import type { ExistingClientFormData } from './types';
import { checkClientContact } from '@/api/clientsApi';

interface HomeownerIdentitySectionProps {
  register: UseFormRegister<ExistingClientFormData>;
  errors: FieldErrors<ExistingClientFormData>;
  setValue: UseFormSetValue<ExistingClientFormData>;
  emailValue: string;
  phoneValue: string;
  emailConflict: string | null;
  setEmailConflict: (conflict: string | null) => void;
  phoneConflict: string | null;
  setPhoneConflict: (conflict: string | null) => void;
}

export function HomeownerIdentitySection({
  register,
  errors,
  emailValue,
  phoneValue,
  emailConflict,
  setEmailConflict,
  phoneConflict,
  setPhoneConflict,
}: HomeownerIdentitySectionProps) {
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [isCheckingPhone, setIsCheckingPhone] = useState(false);

  const handleEmailBlur = async () => {
    const clean = (emailValue || '').trim();
    if (!clean || !clean.includes('@')) {
      setEmailConflict(null);
      return;
    }
    try {
      setIsCheckingEmail(true);
      const res = await checkClientContact({ email: clean });
      if (res.exists && res.client) {
        setEmailConflict(
          `A client with this email already exists: "${res.client.full_name}" (Client #${res.client.id}). Please use a unique email or edit the existing client.`
        );
      } else {
        setEmailConflict(null);
      }
    } catch {
      // Ignore pre-flight check failure
    } finally {
      setIsCheckingEmail(false);
    }
  };

  const handlePhoneBlur = async () => {
    const clean = (phoneValue || '').trim();
    const digits = clean.replace(/\D/g, '');
    if (!clean || digits.length < 7) {
      setPhoneConflict(null);
      return;
    }
    try {
      setIsCheckingPhone(true);
      const res = await checkClientContact({ phone: clean });
      if (res.exists && res.client) {
        setPhoneConflict(
          `A client with this phone number already exists: "${res.client.full_name}" (Client #${res.client.id}). Please use a unique phone number or edit the existing client.`
        );
      } else {
        setPhoneConflict(null);
      }
    } catch {
      // Ignore pre-flight check failure
    } finally {
      setIsCheckingPhone(false);
    }
  };

  return (
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
              {...register('fullName')}
              placeholder="e.g. Robert Henderson"
              className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
            />
          </div>
          {errors.fullName && <p className="text-rose-500 text-xs mt-1">{errors.fullName.message}</p>}
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Client Since (Historical Date)
          </label>
          <div className="relative">
            <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="date"
              {...register('clientSince')}
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
              <span className="text-[10px] text-slate-400 dark:text-slate-500 animate-pulse font-medium">
                Checking phone...
              </span>
            )}
          </div>
          <div className="relative">
            <Phone
              size={14}
              className={`absolute left-3 top-1/2 -translate-y-1/2 ${
                phoneConflict ? 'text-rose-500' : 'text-slate-400'
              }`}
            />
            <input
              type="tel"
              {...register('phone', {
                onBlur: handlePhoneBlur,
                onChange: () => {
                  if (phoneConflict) setPhoneConflict(null);
                },
              })}
              placeholder="(760) 555-0199"
              className={`w-full h-9 pl-9 pr-3 rounded-xl border ${
                phoneConflict
                  ? 'border-rose-400 dark:border-rose-600 bg-rose-50/40 dark:bg-rose-950/20 text-rose-900 dark:text-rose-200 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500'
                  : 'border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500'
              } transition-all font-medium`}
            />
          </div>
          {phoneConflict && (
            <div className="mt-1.5 p-2 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/80 text-rose-700 dark:text-rose-300 text-[11px] font-semibold flex items-start gap-1.5 leading-tight">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-600 shrink-0 mt-1" />
              <span>{phoneConflict}</span>
            </div>
          )}
          {errors.phone && <p className="text-rose-500 text-xs mt-1">{errors.phone.message}</p>}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
              Email Address
            </label>
            {isCheckingEmail && (
              <span className="text-[10px] text-slate-400 dark:text-slate-500 animate-pulse font-medium">
                Checking email...
              </span>
            )}
          </div>
          <div className="relative">
            <Mail
              size={14}
              className={`absolute left-3 top-1/2 -translate-y-1/2 ${
                emailConflict ? 'text-rose-500' : 'text-slate-400'
              }`}
            />
            <input
              type="email"
              {...register('email', {
                onBlur: handleEmailBlur,
                onChange: () => {
                  if (emailConflict) setEmailConflict(null);
                },
              })}
              placeholder="homeowner@gmail.com"
              className={`w-full h-9 pl-9 pr-3 rounded-xl border ${
                emailConflict
                  ? 'border-rose-400 dark:border-rose-600 bg-rose-50/40 dark:bg-rose-950/20 text-rose-900 dark:text-rose-200 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500'
                  : 'border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500'
              } transition-all font-medium`}
            />
          </div>
          {emailConflict && (
            <div className="mt-1.5 p-2 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/80 text-rose-700 dark:text-rose-300 text-[11px] font-semibold flex items-start gap-1.5 leading-tight">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-600 shrink-0 mt-1" />
              <span>{emailConflict}</span>
            </div>
          )}
          {errors.email && <p className="text-rose-500 text-xs mt-1">{errors.email.message}</p>}
        </div>
      </div>
    </div>
  );
}
