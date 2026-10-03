import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, Lock, Mail, RotateCcw, Send, UserPlus, X } from 'lucide-react';
import { Role } from '../types';

interface InviteMemberModalProps {
  isOpen: boolean;
  roles: Role[];
  onClose: () => void;
  onSendInvite: (email: string, roleId: number) => Promise<{ success: boolean; error?: string; pendingResendId?: number | null }>;
  onResendFromModal: (pendingResendId: number, email: string) => Promise<{ success: boolean; error?: string }>;
}

export function InviteMemberModal({
  isOpen,
  roles,
  onClose,
  onSendInvite,
  onResendFromModal,
}: InviteMemberModalProps) {
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRoleId, setInviteRoleId] = useState<number>(() => {
    const dk = roles.find((r) => r.name.toLowerCase().includes('knocker') || r.name.toLowerCase().includes('sales'));
    return dk ? dk.id : (roles[0]?.id || 3);
  });
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [pendingResendId, setPendingResendId] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (roles.length > 0 && !roles.some((r) => r.id === inviteRoleId)) {
      const dk = roles.find((r) => r.name.toLowerCase().includes('knocker') || r.name.toLowerCase().includes('sales'));
      setInviteRoleId(dk ? dk.id : roles[0].id);
    }
  }, [roles, inviteRoleId]);

  const handleClose = () => {
    setInviteError('');
    setPendingResendId(null);
    setInviteEmail('');
    onClose();
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || isInviting) return;

    setIsInviting(true);
    setInviteError('');
    try {
      const res = await onSendInvite(inviteEmail.trim(), inviteRoleId);
      if (!res.success) {
        setInviteError(res.error || 'Failed to send invitation.');
        setPendingResendId(res.pendingResendId || null);
      } else {
        handleClose();
      }
    } finally {
      setIsInviting(false);
    }
  };

  const handleResend = async () => {
    if (!pendingResendId || isInviting) return;
    setIsInviting(true);
    try {
      const res = await onResendFromModal(pendingResendId, inviteEmail.trim());
      if (!res.success) {
        setInviteError(res.error || 'Failed to resend invitation.');
      } else {
        handleClose();
      }
    } finally {
      setIsInviting(false);
    }
  };

  return createPortal(
    <div
      onClick={handleClose}
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-5 bg-slate-950/65 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200 select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-white/95 dark:bg-[#0B1320]/95 backdrop-blur-xl border border-white/60 dark:border-white/10 shadow-2xl dark:shadow-[0_25px_90px_rgba(0,0,0,0.85)] p-6 relative space-y-4 my-auto max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200"
      >
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-white cursor-pointer transition-colors"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-500 flex items-center justify-center text-white font-bold shadow-md">
            <UserPlus size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Invite New Team Member</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Send an invitation with a pre-configured role.
            </p>
          </div>
        </div>

        {inviteError && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
            <AlertCircle size={15} className="shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <span>{inviteError}</span>
              {pendingResendId && (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={isInviting}
                  className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RotateCcw size={12} className={isInviting ? 'animate-spin' : ''} />
                  Resend existing invite instead
                </button>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Email Address *
            </label>
            <div className="relative">
              <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="e.g. marc@example.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50/80 dark:bg-white/5 border border-slate-200/90 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-sky-500/10 shadow-2xs transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Role Assignment *
            </label>
            <select
              value={inviteRoleId}
              onChange={(e) => setInviteRoleId(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#0f1d2f] border border-slate-200/90 dark:border-white/10 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 shadow-2xs cursor-pointer transition-all"
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id} className="bg-white dark:bg-[#0f1d2f] text-slate-900 dark:text-white">
                  {r.name} {r.is_protected ? '(Protected Superuser)' : ''}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              {roles.find((r) => r.id === inviteRoleId)?.description ||
                'Grants dynamic permissions configured in the Role Matrix.'}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/40 text-sky-800 dark:text-sky-300 text-[11px] flex items-start gap-2">
            <Lock size={14} className="shrink-0 mt-0.5 text-sky-600 dark:text-sky-400" />
            <span>
              The user will receive an activation link to set their own name and password. Once accepted, they immediately inherit the role's dynamic permissions.
            </span>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isInviting}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              {isInviting ? (
                <>
                  <RotateCcw size={14} className="animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Send size={14} />
                  <span>Send Invitation</span>
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
