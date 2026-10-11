import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Shield, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import type { SignatureAccess } from '@/lib/signatureAccess';
import { OWNER_ONLY_EDIT_REASON, SignatureAccessSelector } from './SignatureAccessSelector';

interface CreateRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, description: string, signatureAccess: SignatureAccess) => Promise<void>;
}

export function CreateRoleModal({
  isOpen,
  onClose,
  onSubmit,
}: CreateRoleModalProps) {
  const { isOwner } = useAuth();
  const [newRoleName, setNewRoleName] = useState<string>('');
  const [newRoleDesc, setNewRoleDesc] = useState<string>('');
  const [signatureAccess, setSignatureAccess] = useState<SignatureAccess>('none');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit(newRoleName.trim(), newRoleDesc.trim(), signatureAccess);
      setNewRoleName('');
      setNewRoleDesc('');
      setSignatureAccess('none');
      onClose();
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
        className="w-full max-w-md rounded-2xl bg-white/95 dark:bg-[#0B1320]/95 backdrop-blur-xl border border-white/60 dark:border-white/10 shadow-2xl dark:shadow-[0_25px_90px_rgba(0,0,0,0.85)] p-6 relative space-y-4 my-auto max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-white cursor-pointer transition-colors"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-500 flex items-center justify-center text-white font-bold shadow-md">
            <Shield size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Create New Custom Role</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Define an operational role with preset module permissions.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Role Title *
            </label>
            <input
              type="text"
              required
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              placeholder="e.g. Commercial Estimator, Field Auditor, Billing Specialist"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50/80 dark:bg-white/5 border border-slate-200/90 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-sky-500/10 shadow-2xs transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Role Description
            </label>
            <textarea
              rows={2}
              value={newRoleDesc}
              onChange={(e) => setNewRoleDesc(e.target.value)}
              placeholder="e.g. Canvassing neighborhoods, qualifying leads, performing roof inspections"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50/80 dark:bg-white/5 border border-slate-200/90 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-sky-500/10 shadow-2xs transition-all"
            />
          </div>

          <div>
            <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Company Signature Access
            </span>
            <SignatureAccessSelector
              name="create_role_signature_access"
              compact
              value={signatureAccess}
              onChange={setSignatureAccess}
              disableEdit={!isOwner}
              lockedReason={!isOwner ? OWNER_ONLY_EDIT_REASON : undefined}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 shadow-md transition-all cursor-pointer"
            >
              {isSubmitting ? 'Creating...' : 'Create Role'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
