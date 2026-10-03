import React, { useRef, useState } from 'react';
import { Camera, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { DevBadge } from '@/components/common/DevBadge';
import { isDevEmail } from '@/utils/devUtils';
import { api, API_ORIGIN } from '@/lib/api';

interface ProfileAvatarSectionProps {
  onSuccess: (msg: string) => void;
}

export function ProfileAvatarSection({ onSuccess }: ProfileAvatarSectionProps) {
  const { user, updateUserProfile } = useAuth();
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarErrorMsg, setAvatarErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayName = user?.name || 'Developer Admin';
  const displayEmail = user?.email || 'developer@riseuprac.com';
  const roleTitle = user?.role
    ? user.role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : 'Owner / Qualifier';
  const initials =
    displayName
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
        const fullUrl = res.avatar_url.startsWith('http')
          ? res.avatar_url
          : `${API_ORIGIN}${res.avatar_url}`;
        updateUserProfile({ avatar_url: fullUrl });
        onSuccess('Profile photo updated successfully!');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to upload photo. Please try again.';
      setAvatarErrorMsg(msg);
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    setIsUploadingAvatar(true);
    setAvatarErrorMsg('');
    try {
      const res = await api.removeAvatar();
      if (res.ok) {
        updateUserProfile({ avatar_url: undefined });
        onSuccess('Custom photo removed.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to remove photo.';
      setAvatarErrorMsg(msg);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  return (
    <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-sky-50/50 dark:from-slate-900/70 dark:to-slate-900/40 border border-slate-200/70 dark:border-white/10 flex flex-col sm:flex-row items-center sm:items-start gap-5">
      <div className="relative group shrink-0">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-[#1878B8] to-[#55C4F5] flex items-center justify-center font-black text-white text-2xl shadow-md border-2 border-white dark:border-white/20 overflow-hidden">
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
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <Camera size={20} className="drop-shadow-md" />
          )}
        </button>

        <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 bg-emerald-500 shadow-xs" />
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
          <h3 className="text-base font-black text-slate-900 dark:text-white leading-tight">{displayName}</h3>
          {isDevEmail(user?.email) && <DevBadge size="sm" />}
          <span className="px-2 py-0.5 rounded-md bg-[#1878B8]/10 dark:bg-sky-950/60 text-[#1878B8] dark:text-sky-300 border border-[#1878B8]/20 dark:border-sky-800/40 text-[10px] font-bold">
            {roleTitle}
          </span>
          <span className="px-2 py-0.5 rounded-md bg-emerald-100/80 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/40 text-[10px] font-bold">
            Active Member
          </span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{displayEmail}</p>

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
  );
}
