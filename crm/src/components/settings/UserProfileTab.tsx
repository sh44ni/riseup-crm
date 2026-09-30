import React, { useState, useEffect, useRef } from 'react';
import {
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
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { DevBadge } from '@/components/common/DevBadge';
import { isDevEmail } from '@/utils/devUtils';
import { api, API_ORIGIN } from '@/lib/api';

export function UserProfileTab() {
  const { user, updateUserProfile } = useAuth();

  // Profile fields state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
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

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
    }
  }, [user]);

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
        const fullUrl = res.avatar_url.startsWith('http') ? res.avatar_url : `${API_ORIGIN}${res.avatar_url}`;
        updateUserProfile({ avatar_url: fullUrl });
        setProfileSuccessMsg('Profile photo updated successfully!');
      }
    } catch (err: any) {
      setAvatarErrorMsg(err.message || 'Failed to upload photo.');
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
      setProfileErrorMsg(err.message || 'Failed to update profile.');
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

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* SECTION 1: IDENTITY & AVATAR STUDIO */}
      <div className="light-glass-card rounded-3xl p-6 border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md shadow-xs">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div className="relative group shrink-0">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-[#1878B8] to-[#55C4F5] flex items-center justify-center font-black text-white text-3xl shadow-md border-2 border-white dark:border-slate-800 overflow-hidden">
              {avatarSrc ? (
                <img src={avatarSrc} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <span>{initials}</span>
              )}
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAvatar}
              className="absolute inset-0 rounded-2xl bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white cursor-pointer backdrop-blur-[2px]"
              title="Change Photo"
            >
              {isUploadingAvatar ? (
                <Loader2 size={24} className="animate-spin" />
              ) : (
                <Camera size={24} className="drop-shadow-md" />
              )}
            </button>

            <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white dark:border-slate-800 bg-emerald-500 shadow-xs" />
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleAvatarFileSelect}
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
          />

          <div className="min-w-0 flex-1 text-center sm:text-left space-y-2">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h2 className="text-xl font-black text-slate-900 dark:text-white leading-tight">{displayName}</h2>
              {isDevEmail(user?.email) && <DevBadge size="sm" />}
              <span className="px-2.5 py-0.5 rounded-full bg-[#1878B8]/10 text-[#1878B8] dark:text-sky-400 border border-[#1878B8]/20 dark:border-sky-500/30 text-xs font-bold">
                {roleTitle}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 text-xs font-bold">
                Active Member
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{displayEmail}</p>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAvatar}
                className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 hover:border-[#1878B8] dark:hover:border-sky-400 hover:text-[#1878B8] dark:hover:text-sky-400 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all shadow-2xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Camera size={14} />
                <span>{isUploadingAvatar ? 'Uploading...' : 'Upload New Photo'}</span>
              </button>

              {avatarSrc && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  disabled={isUploadingAvatar}
                  className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-800/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-bold transition-all shadow-2xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Trash2 size={14} />
                  <span>Remove Photo</span>
                </button>
              )}
            </div>

            {avatarErrorMsg && (
              <p className="text-xs text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1 pt-1">
                <AlertCircle size={13} />
                {avatarErrorMsg}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 2: PERSONAL INFORMATION */}
      <div className="light-glass-card rounded-3xl p-6 border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md shadow-xs">
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-200/70 dark:border-white/10">
            <div className="w-9 h-9 rounded-xl bg-sky-100 dark:bg-sky-950/60 text-[#1878B8] dark:text-sky-400 flex items-center justify-center">
              <User size={18} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">Personal & Contact Information</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Update your public name and direct field phone number.</p>
            </div>
          </div>

          {profileSuccessMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{profileSuccessMsg}</span>
            </div>
          )}

          {profileErrorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
              <AlertCircle size={14} className="text-rose-600 dark:text-rose-400 shrink-0" />
              <span>{profileErrorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
            <div className="space-y-1.5">
              <label className="block font-bold text-slate-700 dark:text-slate-300">Full Name</label>
              <div className="relative">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 focus:border-[#1878B8] focus:ring-2 focus:ring-[#1878B8]/20 font-bold text-slate-900 dark:text-white outline-none shadow-2xs"
                />
                <User size={14} className="absolute left-3 top-3 text-slate-400" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block font-bold text-slate-700 dark:text-slate-300">Phone Number</label>
              <div className="relative">
                <input
                  type="tel"
                  value={phone}
                  onChange={handlePhoneChange}
                  placeholder="(760) 555-0123"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 focus:border-[#1878B8] focus:ring-2 focus:ring-[#1878B8]/20 font-bold text-slate-900 dark:text-white outline-none shadow-2xs"
                />
                <Phone size={14} className="absolute left-3 top-3 text-slate-400" />
              </div>
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <div className="flex items-center justify-between">
                <label className="block font-bold text-slate-700 dark:text-slate-300">Account Email</label>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                  <ShieldCheck size={11} />
                  Primary Authentication Key
                </span>
              </div>
              <div className="relative">
                <input
                  type="email"
                  value={displayEmail}
                  disabled
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 font-semibold text-slate-600 dark:text-slate-400 outline-none cursor-not-allowed"
                />
                <Mail size={14} className="absolute left-3 top-3 text-slate-400" />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSavingProfile}
              className="px-5 py-2.5 rounded-xl bg-[#1878B8] hover:bg-[#14649a] text-white text-xs font-bold transition-all shadow-sm hover:shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSavingProfile ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              <span>Save Contact Changes</span>
            </button>
          </div>
        </form>
      </div>

      {/* SECTION 3: SECURITY & PASSWORD */}
      <div className="light-glass-card rounded-3xl p-6 border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md shadow-xs">
        <form onSubmit={handleSavePassword} className="space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-200/70 dark:border-white/10">
            <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center">
              <KeyRound size={18} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">Security & Password Management</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Ensure your CRM access is protected with a secure password.</p>
            </div>
          </div>

          {passwordSuccessMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{passwordSuccessMsg}</span>
            </div>
          )}

          {passwordErrorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
              <AlertCircle size={14} className="text-rose-600 dark:text-rose-400 shrink-0" />
              <span>{passwordErrorMsg}</span>
            </div>
          )}

          <div className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="block font-bold text-slate-700 dark:text-slate-300">Current Password</label>
              <div className="relative">
                <input
                  type={showCurrentPass ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 focus:border-[#1878B8] focus:ring-2 focus:ring-[#1878B8]/20 font-bold text-slate-900 dark:text-white outline-none shadow-2xs"
                />
                <Lock size={14} className="absolute left-3 top-3 text-slate-400" />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  {showCurrentPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700 dark:text-slate-300">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 focus:border-[#1878B8] focus:ring-2 focus:ring-[#1878B8]/20 font-bold text-slate-900 dark:text-white outline-none shadow-2xs"
                  />
                  <KeyRound size={14} className="absolute left-3 top-3 text-slate-400" />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showNewPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700 dark:text-slate-300">Confirm New Password</label>
                <div className="relative">
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-type new password"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 focus:border-[#1878B8] focus:ring-2 focus:ring-[#1878B8]/20 font-bold text-slate-900 dark:text-white outline-none shadow-2xs"
                  />
                  <Lock size={14} className="absolute left-3 top-3 text-slate-400" />
                </div>
              </div>
            </div>

            {newPassword && (
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-600 dark:text-slate-400">Password Strength</span>
                  <span className={`font-bold ${strength.textColor}`}>{strength.label}</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5 h-1.5">
                  <div className={`rounded-full ${strength.score >= 1 ? strength.color : 'bg-slate-200 dark:bg-slate-700'}`} />
                  <div className={`rounded-full ${strength.score >= 2 ? strength.color : 'bg-slate-200 dark:bg-slate-700'}`} />
                  <div className={`rounded-full ${strength.score >= 3 ? strength.color : 'bg-slate-200 dark:bg-slate-700'}`} />
                  <div className={`rounded-full ${strength.score >= 4 ? strength.color : 'bg-slate-200 dark:bg-slate-700'}`} />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSavingPassword || !currentPassword || !newPassword}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-sky-600 dark:hover:bg-sky-500 text-white text-xs font-bold transition-all shadow-sm hover:shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSavingPassword ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
              <span>Update Password</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
