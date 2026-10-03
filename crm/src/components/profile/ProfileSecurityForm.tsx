import React, { useState } from 'react';
import { KeyRound, Lock, Eye, EyeOff, Check, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { getPasswordStrength } from './profileUtils';

export function ProfileSecurityForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState('');
  const [passwordErrorMsg, setPasswordErrorMsg] = useState('');

  const strength = getPasswordStrength(newPassword);

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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to change password. Please check your current password.';
      setPasswordErrorMsg(msg);
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
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
  );
}
