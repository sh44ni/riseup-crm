import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Camera,
  Trash2,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  User,
  Phone,
  Mail,
  KeyRound,
  Sparkles,
  Loader2,
  Calendar,
  Clock,
  Check,
  Sun,
  Moon,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { api, API_ORIGIN } from '@/lib/api';
import { z } from 'zod';

const ProfileSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email format'),
});

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileSettingsModal({ isOpen, onClose }: ProfileSettingsModalProps) {
  const { user, updateUserProfile, refreshUser } = useAuth();
  const { theme, setTheme } = useTheme();

  // Profile fields state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');
  const [profileErrorMsg, setProfileErrorMsg] = useState('');

  // Password fields state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState('');
  const [passwordErrorMsg, setPasswordErrorMsg] = useState('');

  // Avatar upload state
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarErrorMsg, setAvatarErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state with active user
  useEffect(() => {
    if (user && isOpen) {
      setName(user.name || '');
      setPhone(user.phone || '');
      setProfileSuccessMsg('');
      setProfileErrorMsg('');
      setPasswordSuccessMsg('');
      setPasswordErrorMsg('');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
  }, [user, isOpen]);

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

  // Format phone number utility: (XXX) XXX-XXXX
  const formatPhoneNumber = (value: string) => {
    if (!value) return value;
    const phoneNumber = value.replace(/[^\d]/g, '');
    const phoneNumberLength = phoneNumber.length;
    if (phoneNumberLength < 4) return phoneNumber;
    if (phoneNumberLength < 7) {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    }
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhone(formatted);
  };

  // Password Strength Calculation
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: 'None', color: 'bg-slate-200' };
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1;
    if (/\d/.test(pass)) score += 1;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(pass)) score += 1;

    if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-rose-500', textColor: 'text-rose-600' };
    if (score <= 3) return { score: 2, label: 'Medium', color: 'bg-amber-500', textColor: 'text-amber-600' };
    if (score <= 4) return { score: 3, label: 'Good', color: 'bg-sky-500', textColor: 'text-sky-600' };
    return { score: 4, label: 'Strong', color: 'bg-emerald-500', textColor: 'text-emerald-600' };
  };

  const strength = getPasswordStrength(newPassword);

  // Avatar file upload handler
  const handleAvatarFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setAvatarErrorMsg('Please select a valid image file (PNG, JPG, WEBP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setAvatarErrorMsg('Image size cannot exceed 5MB.');
      return;
    }

    setAvatarErrorMsg('');
    setIsUploadingAvatar(true);

    try {
      const res = await api.uploadAvatar(file);
      if (res.ok && res.avatar_url) {
        // Resolve full URL if relative
        const fullUrl = res.avatar_url.startsWith('http') ? res.avatar_url : `${API_ORIGIN}${res.avatar_url}`;
        updateUserProfile({ avatar_url: fullUrl });
        setProfileSuccessMsg('Profile photo updated successfully!');
      }
    } catch (err: any) {
      setAvatarErrorMsg(err.message || 'Failed to upload photo. Please try again.');
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Remove Avatar Handler
  const handleRemoveAvatar = async () => {
    setIsUploadingAvatar(true);
    setAvatarErrorMsg('');
    try {
      const res = await api.removeAvatar();
      if (res.ok) {
        updateUserProfile({ avatar_url: undefined });
        setProfileSuccessMsg('Custom photo removed.');
      }
    } catch (err: any) {
      setAvatarErrorMsg(err.message || 'Failed to remove photo.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Save Profile Info (Name & Phone)
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    const formData = {
      name,
      email: displayEmail,
    };
    const result = ProfileSchema.safeParse(formData);
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
        setTimeout(() => setProfileSuccessMsg(''), 4000);
      }
    } catch (err: any) {
      setProfileErrorMsg(err.message || 'Failed to update profile. Please try again.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Save Password
  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordErrorMsg('');
    setPasswordSuccessMsg('');

    if (!currentPassword) {
      setPasswordErrorMsg('Please enter your current password.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordErrorMsg('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordErrorMsg('New passwords do not match. Please verify.');
      return;
    }

    setIsSavingPassword(true);

    try {
      const res = await api.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });

      if (res.ok) {
        setPasswordSuccessMsg('Password updated successfully! Your account is secured.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setPasswordSuccessMsg(''), 5000);
      }
    } catch (err: any) {
      setPasswordErrorMsg(err.message || 'Failed to change password. Please check your current password.');
    } finally {
      setIsSavingPassword(false);
    }
  };

  const displayName = user?.name || 'Developer Admin';
  const displayEmail = user?.email || 'developer@riseuprac.com';
  const roleTitle = user?.role ? user.role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : 'Owner / Qualifier';
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('') || 'DA';

  const avatarSrc = user?.avatar_url
    ? user.avatar_url.startsWith('http')
      ? user.avatar_url
      : `${API_ORIGIN}${user.avatar_url}`
    : null;

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 bg-slate-950/65 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
    >
      {/* Modal Card */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl bg-white/95 dark:bg-[#0B1320]/95 backdrop-blur-2xl rounded-3xl border border-white/90 dark:border-white/12 shadow-[0_25px_80px_rgba(15,23,42,0.35)] dark:shadow-[0_25px_80px_rgba(0,0,0,0.85)] overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200 text-slate-800 dark:text-slate-100 my-auto flex flex-col max-h-[90vh]"
      >
        {/* Coastal Gradient Header Banner */}
        <div className="shrink-0 relative bg-gradient-to-r from-[#0B192C] via-[#1878B8] to-[#55C4F5] p-6 text-white overflow-hidden">
          <div
            className="absolute inset-0 opacity-15 [background-image:radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]"
            aria-hidden="true"
          />
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white/15 border border-white/30 backdrop-blur-md flex items-center justify-center shadow-md">
                <Sparkles size={20} className="text-amber-300" />
              </div>
              <div>
                <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                  <span>Profile & Security Studio</span>
                  <span className="px-2 py-0.5 rounded-full bg-white/20 border border-white/30 text-[10px] font-bold tracking-wider uppercase">
                    Live
                  </span>
                </h2>
                <p className="text-xs text-sky-100 font-medium mt-0.5">
                  Manage your personal identity, contact information, appearance, and security.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/25 border border-white/20 flex items-center justify-center text-white transition-all cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto no-scrollbar">
          {/* ================================================================
              SECTION 1: AVATAR & IDENTITY HERO
              ================================================================ */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-sky-50/50 dark:from-slate-900/70 dark:to-slate-900/40 border border-slate-200/70 dark:border-white/10 flex flex-col sm:flex-row items-center sm:items-start gap-5">
            {/* Avatar with live photo / initials */}
            <div className="relative group shrink-0">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-[#1878B8] to-[#55C4F5] flex items-center justify-center font-black text-white text-2xl shadow-md border-2 border-white dark:border-white/20 overflow-hidden">
                {avatarSrc ? (
                  <img src={avatarSrc} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  <span>{initials}</span>
                )}
              </div>

              {/* Upload Trigger Overlay */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAvatar}
                className="absolute inset-0 rounded-2xl bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white cursor-pointer backdrop-blur-[2px]"
                title="Change Photo"
              >
                {isUploadingAvatar ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <Camera size={20} className="drop-shadow-md" />
                )}
              </button>

              <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 bg-emerald-500 shadow-xs" />
            </div>

            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarFileSelect}
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
            />

            <div className="min-w-0 flex-1 text-center sm:text-left space-y-2">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h3 className="text-base font-black text-slate-900 dark:text-white leading-tight">{displayName}</h3>
                <span className="px-2 py-0.5 rounded-md bg-[#1878B8]/10 dark:bg-sky-950/60 text-[#1878B8] dark:text-sky-300 border border-[#1878B8]/20 dark:border-sky-800/40 text-[10px] font-bold">
                  {roleTitle}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-100/80 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/40 text-[10px] font-bold">
                  Active Member
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{displayEmail}</p>

              {/* Photo Action Buttons */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 hover:border-[#1878B8] dark:hover:border-sky-400 hover:text-[#1878B8] dark:hover:text-sky-300 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Camera size={13} />
                  <span>{isUploadingAvatar ? 'Uploading...' : 'Upload New Photo'}</span>
                </button>

                {avatarSrc && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    disabled={isUploadingAvatar}
                    className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-900/40 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 size={13} />
                    <span>Remove Photo</span>
                  </button>
                )}
              </div>

              {avatarErrorMsg && (
                <p className="text-xs text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1 pt-1">
                  <AlertCircle size={12} />
                  {avatarErrorMsg}
                </p>
              )}
            </div>
          </div>

          {/* ================================================================
              SECTION: APPEARANCE & THEME (Profile-Only Toggle)
              ================================================================ */}
          <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/70 dark:border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-sky-100 dark:bg-sky-950/60 text-[#1878B8] dark:text-sky-400 flex items-center justify-center">
                  {theme === 'dark' ? <Moon size={14} /> : <Sun size={14} />}
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Appearance & Theme
                  </h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Switch between luminous Coastal Light glass and deep Obsidian Dark glass.
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {theme === 'dark' ? 'Obsidian Dark' : 'Coastal Light'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`p-3 rounded-xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
                  theme === 'light'
                    ? 'bg-white dark:bg-slate-800 border-[#1878B8] shadow-sm ring-2 ring-[#1878B8]/20'
                    : 'bg-white/60 dark:bg-slate-900/40 border-slate-200/80 dark:border-white/10 opacity-70 hover:opacity-100'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center shrink-0 border border-amber-200/50 dark:border-amber-800/40">
                  <Sun size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between">
                    <span>Coastal Light</span>
                    {theme === 'light' && <Check size={12} className="text-[#1878B8]" />}
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Frosted white glass & luminous daylight
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`p-3 rounded-xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-slate-900 border-[#55C4F5] shadow-sm ring-2 ring-[#55C4F5]/30'
                    : 'bg-white/60 dark:bg-slate-900/40 border-slate-200/80 dark:border-white/10 opacity-70 hover:opacity-100'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-sky-950 text-sky-400 flex items-center justify-center shrink-0 border border-sky-800/40">
                  <Moon size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between">
                    <span>Obsidian Dark</span>
                    {theme === 'dark' && <Check size={12} className="text-[#55C4F5]" />}
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Deep midnight glass & cyan highlights
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* ================================================================
              SECTION 2: PERSONAL & CONTACT INFORMATION
              ================================================================ */}
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

          {/* ================================================================
              SECTION 3: SECURITY & PASSWORD UPDATE
              ================================================================ */}
          <form onSubmit={handleSavePassword} className="space-y-4 pt-2">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200/70 dark:border-white/10">
              <div className="w-6 h-6 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center">
                <KeyRound size={14} />
              </div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Security & Password Update
              </h4>
            </div>

            {passwordSuccessMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
                <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{passwordSuccessMsg}</span>
              </div>
            )}

            {passwordErrorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-rose-800 dark:text-rose-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
                <AlertCircle size={14} className="text-rose-600 dark:text-rose-400 shrink-0" />
                <span>{passwordErrorMsg}</span>
              </div>
            )}

            <div className="space-y-3.5 text-xs">
              {/* Current Password */}
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700 dark:text-slate-300">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrentPass ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter your current password"
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-white/10 focus:border-[#1878B8] focus:ring-2 focus:ring-[#1878B8]/20 font-bold text-slate-900 dark:text-white outline-none shadow-2xs transition-all placeholder-slate-400 dark:placeholder-slate-500"
                  />
                  <Lock size={14} className="absolute left-3 top-3 text-slate-400 dark:text-slate-500" />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                  >
                    {showCurrentPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* New Password & Strength Meter */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="block font-bold text-slate-700 dark:text-slate-300">New Password</label>
                  <div className="relative">
                    <input
                      type={showNewPass ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-white/10 focus:border-[#1878B8] focus:ring-2 focus:ring-[#1878B8]/20 font-bold text-slate-900 dark:text-white outline-none shadow-2xs transition-all placeholder-slate-400 dark:placeholder-slate-500"
                    />
                    <KeyRound size={14} className="absolute left-3 top-3 text-slate-400 dark:text-slate-500" />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                    >
                      {showNewPass ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block font-bold text-slate-700 dark:text-slate-300">Confirm New Password</label>
                    {confirmPassword && newPassword === confirmPassword && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
                        <Check size={11} />
                        Passwords Match
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-type new password"
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-white/10 focus:border-[#1878B8] focus:ring-2 focus:ring-[#1878B8]/20 font-bold text-slate-900 dark:text-white outline-none shadow-2xs transition-all placeholder-slate-400 dark:placeholder-slate-500"
                    />
                    <Lock size={14} className="absolute left-3 top-3 text-slate-400 dark:text-slate-500" />
                  </div>
                </div>
              </div>

              {/* Password Strength Indicator */}
              {newPassword && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-slate-600 dark:text-slate-400">Password Security Strength</span>
                    <span className={`font-bold ${strength.textColor}`}>{strength.label}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 h-1.5">
                    <div className={`rounded-full ${strength.score >= 1 ? strength.color : 'bg-slate-200 dark:bg-slate-800'}`} />
                    <div className={`rounded-full ${strength.score >= 2 ? strength.color : 'bg-slate-200 dark:bg-slate-800'}`} />
                    <div className={`rounded-full ${strength.score >= 3 ? strength.color : 'bg-slate-200 dark:bg-slate-800'}`} />
                    <div className={`rounded-full ${strength.score >= 4 ? strength.color : 'bg-slate-200 dark:bg-slate-800'}`} />
                  </div>
                </div>
              )}
            </div>

            {/* Update Password CTA */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSavingPassword || !currentPassword || !newPassword}
                className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-[#1878B8] hover:bg-slate-800 dark:hover:bg-[#14649a] text-white text-xs font-bold transition-all shadow-sm hover:shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSavingPassword ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <>
                    <Lock size={14} />
                    <span>Update Password</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Modal Footer */}
        <div className="shrink-0 p-4 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200/70 dark:border-white/10 flex items-center justify-between text-xs">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Rise Up CRM v3.1.1</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold transition-all cursor-pointer shadow-2xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
