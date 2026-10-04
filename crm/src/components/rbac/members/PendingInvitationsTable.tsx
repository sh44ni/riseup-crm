import React from 'react';
import { AlertCircle, Mail, RotateCcw, Shield, Trash2 } from 'lucide-react';
import { DevBadge } from '@/components/common/DevBadge';
import { isDevEmail } from '@/utils/devUtils';
import { InvitationItem } from '../types';

interface PendingInvitationsTableProps {
  invitations: InvitationItem[];
  onResend: (id: number) => void;
  onRevoke: (id: number) => void;
}

export function PendingInvitationsTable({
  invitations,
  onResend,
  onRevoke,
}: PendingInvitationsTableProps) {
  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 overflow-hidden shadow-sm backdrop-blur-md">
      <div className="px-5 py-3.5 border-b border-slate-200/80 dark:border-white/5 bg-slate-50/80 dark:bg-slate-800/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mail size={15} className="text-amber-500 dark:text-amber-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
            Pending Invitations ({invitations.length})
          </span>
        </div>
        <span className="text-[11px] text-slate-500 dark:text-slate-400">
          Invited users must verify ownership of their email via a 6-digit confirmation code to activate their account.
        </span>
      </div>

      {invitations.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
          No pending invitations right now. Click "Invite Team Member" above to invite someone!
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/5 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-50/60 dark:bg-slate-800/50">
                <th className="py-3 px-4">Invitee Email</th>
                <th className="py-3 px-4">Role Assigned</th>
                <th className="py-3 px-4">Invited By</th>
                <th className="py-3 px-4">Expires In</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {invitations.map((inv) => {
                const roleName = inv.roles?.[0]?.name || 'Role';
                const isExpired = new Date(inv.expires_at) < new Date();

                return (
                  <tr key={inv.id} className="hover:bg-slate-50/70 hover:dark:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <Mail size={13} className="text-slate-400 dark:text-slate-500" />
                        <span>{inv.email}</span>
                        {isDevEmail(inv.email) && <DevBadge size="xs" />}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 inline-flex items-center gap-1">
                        <Shield size={11} />
                        {roleName}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                      {inv.invited_by_name || 'System Admin'}
                    </td>

                    <td className="py-3 px-4 text-[11px] text-slate-500 dark:text-slate-400">
                      {isExpired ? (
                        <span className="text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                          <AlertCircle size={12} /> Expired
                        </span>
                      ) : (
                        new Date(inv.expires_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                          isExpired
                            ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/50'
                            : inv.status === 'accepted'
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50'
                            : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/50'
                        }`}
                      >
                        {isExpired ? 'Expired' : inv.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onResend(inv.id)}
                          title="Resend Invitation Email & Extend 7 Days"
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-50 hover:dark:bg-slate-700 hover:text-slate-900 hover:dark:text-white transition-all shadow-2xs cursor-pointer flex items-center gap-1.5"
                        >
                          <RotateCcw size={12} />
                          <span className="text-[11px]">Resend Email</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onRevoke(inv.id)}
                          title="Revoke Invitation"
                          aria-label="Revoke Invitation"
                          className="px-2 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-100 hover:dark:bg-rose-900/60 transition-all cursor-pointer"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
