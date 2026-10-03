import React, { useState, useEffect } from 'react';
import { User, Phone, Mail, ShieldCheck, Check, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { formatPhoneNumber } from './profileUtils';
import { z } from 'zod';

const ProfileSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email format'),
});

interface ProfileContactFormProps {
  onSuccess: (msg: string) => void;
}

export function ProfileContactForm({ onSuccess }: ProfileContactFormProps) {
  const { user, updateUserProfile } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');
  const [profileErrorMsg, setProfileErrorMsg] = useState('');

  const displayEmail = user?.email || 'developer@riseuprac.com';

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
    }
  }, [user]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhone(formatted);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    const formData = {
      name,
      email: displayEmail,
    };
    const result = ProfileSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        if (issue.path[0]) {
          fieldErrors[issue.path[0].toString()] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});

    if (!name.trim()) {
      setProfileErrorMsg('Full name cannot be empty.');
      return;
    }

    setProfileErrorMsg('');
    setProfileSuccessMsg('');
    setIsSavingProfile(true);

    try {
      const res = await api.updateProfile({
        name: name.trim(),
        phone: phone.trim() || undefined,
      });

      if (res.ok) {
        updateUserProfile({
          name: name.trim(),
          phone: phone.trim() || undefined,
        });
        setProfileSuccessMsg('Profile details saved successfully!');
        onSuccess('Profile details saved successfully!');
        setTimeout(() => setProfileSuccessMsg(''), 4000);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update profile. Please try again.';
      setProfileErrorMsg(msg);
    } finally {
      setIsSavingProfile(false);
    }
  };

  return (
    <form onSubmit={handleSaveProfile} className="space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b border-slate-200/70 dark:border-white/10">
        <div className="w-6 h-6 rounded-lg bg-sky-100 dark:bg-sky-950/60 text-[#1878B8] dark:text-sky-400 flex items-center justify-center">
          <User size={14} />
        </div>
        <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
          Personal & Contact Details
        </h4>
      </div>

      {profileSuccessMsg && (
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{profileSuccessMsg}</span>
        </div>
      )}

      {profileErrorMsg && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-rose-800 dark:text-rose-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
          <AlertCircle size={14} className="text-rose-600 dark:text-rose-400 shrink-0" />
          <span>{profileErrorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        {/* Full Name */}
        <div className="space-y-1.5">
          <label className="block font-bold text-slate-700 dark:text-slate-300">Full Name</label>
          <div className="relative">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sam Martinez"
              className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-white/10 focus:border-[#1878B8] focus:ring-2 focus:ring-[#1878B8]/20 font-bold text-slate-900 dark:text-white outline-none shadow-2xs transition-all placeholder-slate-400 dark:placeholder-slate-500"
            />
            <User size={14} className="absolute left-3 top-3 text-slate-400 dark:text-slate-500" />
          </div>
          {errors.name && <p className="text-rose-500 text-xs mt-1">{errors.name}</p>}
        </div>

        {/* Phone Number */}
        <div className="space-y-1.5">
          <label className="block font-bold text-slate-700 dark:text-slate-300">Phone Number</label>
          <div className="relative">
            <input
              type="tel"
              value={phone}
              onChange={handlePhoneChange}
              placeholder="(760) 555-0123"
              className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-white/10 focus:border-[#1878B8] focus:ring-2 focus:ring-[#1878B8]/20 font-bold text-slate-900 dark:text-white outline-none shadow-2xs transition-all placeholder-slate-400 dark:placeholder-slate-500"
            />
            <Phone size={14} className="absolute left-3 top-3 text-slate-400 dark:text-slate-500" />
          </div>
        </div>

        {/* Email Address (Read-only identifier) */}
        <div className="space-y-1.5 sm:col-span-2">
          <div className="flex items-center justify-between">
            <label className="block font-bold text-slate-700 dark:text-slate-300">Account Email</label>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
              <ShieldCheck size={11} />
              Verified Primary Login
            </span>
          </div>
          <div className="relative">
            <input
              type="email"
              value={displayEmail}
              disabled
              className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/10 font-semibold text-slate-600 dark:text-slate-300 outline-none cursor-not-allowed select-none"
            />
            <Mail size={14} className="absolute left-3 top-3 text-slate-400 dark:text-slate-500" />
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500">
            Email is your unique system identifier and is managed by system administrators.
          </p>
        </div>
      </div>

      {/* Save Profile Changes CTA */}
      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={isSavingProfile}
          className="px-4 py-2 rounded-xl bg-[#1878B8] hover:bg-[#14649a] text-white text-xs font-bold transition-all shadow-sm hover:shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {isSavingProfile ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              <span>Saving Profile...</span>
            </>
          ) : (
            <>
              <Check size={14} />
              <span>Save Contact Changes</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
