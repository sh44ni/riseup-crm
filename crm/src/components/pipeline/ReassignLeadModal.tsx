import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { UserCog, X, AlertTriangle, Loader2, User, ChevronDown, Check } from 'lucide-react';
import { api } from '@/lib/api';
import { reassignLead } from '@/api/pipelineApi';

export interface ReassignLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  leadId: string | number;
  leadName: string;
  currentAssigneeName?: string;
  currentAssigneeId?: number | null;
}

interface TeamMember {
  id: number;
  name: string;
  email: string;
  role: string;
  is_active?: boolean;
}

export function ReassignLeadModal({
  isOpen,
  onClose,
  onSuccess,
  leadId,
  leadName,
  currentAssigneeName,
  currentAssigneeId,
}: ReassignLeadModalProps) {
  const [users, setUsers] = useState<TeamMember[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setIsLoadingUsers(true);
      setError(null);
      setNotes('');
      api
        .getUsers()
        .then((res: any) => {
          if (res?.users && Array.isArray(res.users)) {
            // Filter active users
            const activeUsers = res.users.filter((u: TeamMember) => u.is_active !== false);
            setUsers(activeUsers);
            // Default select someone other than current assignee if possible
            const candidate = activeUsers.find((u: TeamMember) => u.id !== currentAssigneeId);
            if (candidate) {
              setSelectedUserId(candidate.id);
            } else if (activeUsers.length > 0) {
              setSelectedUserId(activeUsers[0].id);
            }
          }
        })
        .catch((err) => {
          console.error('Failed to load users:', err);
          setError('Failed to load team members for reassignment.');
        })
        .finally(() => {
          setIsLoadingUsers(false);
        });
    }
  }, [isOpen, currentAssigneeId]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (!selectedUserId) {
      setError('Please select a team member to reassign this lead to.');
      return;
    }
    if (selectedUserId === currentAssigneeId) {
      setError('Selected team member is already the current assignee.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await reassignLead(leadId, selectedUserId, notes.trim() || undefined);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to reassign lead. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (isSubmitting) return;
    setError(null);
    onClose();
  };

  const currentDisplay = currentAssigneeName || 'Unassigned';

  return createPortal(
    <div
      onClick={handleCancel}
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        className="relative w-full max-w-md rounded-3xl bg-white/95 dark:bg-[#0B1320]/95 backdrop-blur-3xl border border-white/90 dark:border-white/10 shadow-[0_25px_90px_rgba(0,0,0,0.35)] dark:shadow-[0_25px_90px_rgba(0,0,0,0.85)] p-6 space-y-5 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Specular top bevel */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white dark:via-white/20 to-transparent" />

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/15 border border-sky-500/30 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 shadow-2xs">
              <UserCog size={20} />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                Reassign Lead
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Transfer lead ownership to another team member
              </p>
            </div>
          </div>
          <button
            onClick={handleCancel}
            disabled={isSubmitting}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors disabled:opacity-50 cursor-pointer"
            title="Cancel and close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Current Lead & Assignee Info */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Target Lead:</span>
            <span className="text-xs font-black text-slate-900 dark:text-white truncate max-w-[220px]">
              {leadName} (#{String(leadId).toUpperCase()})
            </span>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-white/5">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Current Assignee:</span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <User size={12} className="text-slate-400" />
              <span>{currentDisplay}</span>
            </span>
          </div>
        </div>

        {/* Form: Select New Assignee */}
        <div className="space-y-3 text-xs">
          <div className="space-y-1.5">
            <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300">
              New Assignee <span className="text-rose-500">*</span>
            </label>
            {isLoadingUsers ? (
              <div className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-400">
                <Loader2 size={13} className="animate-spin text-sky-500" />
                <span>Loading team members...</span>
              </div>
            ) : (
              <div className="relative">
                <select
                  value={selectedUserId ?? ''}
                  onChange={(e) => setSelectedUserId(Number(e.target.value) || null)}
                  className="w-full appearance-none p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121c2e] text-slate-800 dark:text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-[#1878B8] cursor-pointer"
                >
                  <option value="" disabled>Select team member...</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role?.replace('_', ' ') || 'Staff'}) — {u.email}
                      {u.id === currentAssigneeId ? ' (Current Assignee)' : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
              </div>
            )}
          </div>

          {/* Optional Reason / Notes */}
          <div className="space-y-1.5">
            <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300">
              Reassignment Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Assigned to John for commercial estimating..."
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121c2e] text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-[#1878B8] resize-none"
            />
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-xs text-rose-700 dark:text-rose-300 font-semibold animate-in fade-in duration-150">
            <AlertTriangle size={14} className="shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-1">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors disabled:opacity-50 cursor-pointer"
          >
            Cancel (Keep Current)
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting || !selectedUserId || selectedUserId === currentAssigneeId}
            className="px-4 py-2 rounded-xl bg-[#1878B8] hover:bg-[#14649a] text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>Reassigning...</span>
              </>
            ) : (
              <>
                <Check size={13} />
                <span>Confirm Reassignment</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
