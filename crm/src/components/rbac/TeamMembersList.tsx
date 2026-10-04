import React, { useState, useEffect } from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  Search,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Role, UserItem, InvitationItem } from './types';
import { ActiveMembersTable } from './members/ActiveMembersTable';
import { PendingInvitationsTable } from './members/PendingInvitationsTable';
import { InviteMemberModal } from './members/InviteMemberModal';
import { TeamMembersHeader } from './members/TeamMembersHeader';

interface TeamMembersListProps {
  roles: Role[];
  onRefresh: () => void;
}

export function TeamMembersList({ roles, onRefresh }: TeamMembersListProps) {
  const { can, isOwner } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [invitations, setInvitations] = useState<InvitationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Invite Modal State
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [revokeConfirmId, setRevokeConfirmId] = useState<number | null>(null);
  const [lastInviteResult, setLastInviteResult] = useState<{
    email: string;
    url: string;
    emailSent: boolean;
  } | null>(null);

  const fetchTeamData = async () => {
    setIsLoading(true);
    try {
      const [uRes, iRes] = await Promise.all([
        api.getUsers(),
        api.getInvitations(),
      ]);
      setUsers(uRes.users || []);
      setInvitations(iRes.invitations || []);
    } catch (err: any) {
      console.error('Failed to load team data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamData();
  }, []);

  const showNotification = (msg: string) => {
    setActionSuccess(msg);
    toast.success(msg);
    setTimeout(() => setActionSuccess(null), 4000);
  };

  const handleSendInvite = async (email: string, roleId: number) => {
    try {
      const res = await api.createInvitation({
        email,
        roleIds: [roleId],
      });
      const assignedRole = roles.find((r) => r.id === roleId)?.name || 'Role';
      const origin = window.location.origin;
      const token = res?.token;
      const inviteUrl = token ? `${origin}/accept-invite?token=${token}` : null;

      if (inviteUrl) {
        try { await navigator.clipboard.writeText(inviteUrl); } catch {}
        setLastInviteResult({ email, url: inviteUrl, emailSent: !!res?.email_sent });
      }

      showNotification(
        inviteUrl
          ? `Invite sent as "${assignedRole}"! Link copied to clipboard.`
          : `Invitation sent to ${email} as "${assignedRole}"!`
      );
      await fetchTeamData();
      onRefresh();
      return { success: true };
    } catch (err: any) {
      const msg: string = err.message || 'Failed to send invitation.';
      const dupMatch = msg.match(/already exists \(ID:\s*(\d+)\)/i);
      if (dupMatch) {
        const existingId = Number(dupMatch[1]);
        return {
          success: false,
          error: `${email} already has a pending invite. Resend it to generate a fresh link.`,
          pendingResendId: existingId,
        };
      }
      return { success: false, error: msg };
    }
  };

  const handleResendFromModal = async (pendingResendId: number, email: string) => {
    try {
      const res = await api.resendInvitation(pendingResendId);
      const origin = window.location.origin;
      const token = res?.token;
      const inviteUrl = token ? `${origin}/accept-invite?token=${token}` : null;
      if (inviteUrl) {
        try { await navigator.clipboard.writeText(inviteUrl); } catch {}
        setLastInviteResult({ email, url: inviteUrl, emailSent: !!res?.email_sent });
      }
      showNotification('Invitation resent — link renewed for 7 more days!');
      await fetchTeamData();
      onRefresh();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to resend invitation.' };
    }
  };

  const handleRevokeInvitation = async (id: number) => {
    try {
      await api.revokeInvitation(id);
      showNotification('Invitation link revoked.');
      await fetchTeamData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to revoke invitation');
    } finally {
      setRevokeConfirmId(null);
    }
  };

  const handleResendInvitation = async (id: number) => {
    try {
      await api.resendInvitation(id);
      showNotification('Invitation renewed for 7 additional days.');
      await fetchTeamData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to resend invitation');
    }
  };

  const handleCopyInviteLink = (token: string) => {
    const origin = window.location.origin;
    const inviteUrl = `${origin}/accept-invite?token=${token}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2500);
  };

  const handleRoleChange = async (userId: number, newRoleId: number) => {
    try {
      const selectedRole = roles.find((r) => r.id === newRoleId);
      await api.updateUser(userId, {
        role_id: newRoleId,
        role: selectedRole?.name.toLowerCase().replace(/ /g, '_'),
      });
      showNotification(`Role updated to "${selectedRole?.name}" successfully.`);
      await fetchTeamData();
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update role');
    }
  };

  const handleToggleStatus = async (userItem: UserItem) => {
    const newStatus = userItem.status === 'active' ? 'suspended' : 'active';
    try {
      await api.updateUser(userItem.id, { status: newStatus });
      showNotification(`User account marked as ${newStatus}.`);
      await fetchTeamData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status');
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      !search ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.role.toLowerCase().includes(search.toLowerCase());

    const matchesRole =
      roleFilter === 'all' ||
      u.role.toLowerCase() === roleFilter.toLowerCase() ||
      u.roles?.some((r) => r.name.toLowerCase() === roleFilter.toLowerCase());

    const matchesStatus = statusFilter === 'all' || u.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-600 hover:text-emerald-800">
            <X size={14} />
          </button>
        </div>
      )}

      <TeamMembersHeader
        usersCount={users.length}
        pendingCount={invitations.length}
        isLoading={isLoading}
        canInvite={isOwner || can('users.invite')}
        onRefresh={() => {
          fetchTeamData();
          onRefresh();
        }}
        onOpenInvite={() => setIsInviteModalOpen(true)}
      />

      {/* Filters Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or role..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10 shadow-2xs"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 text-xs text-slate-700 dark:text-white focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10 shadow-2xs cursor-pointer"
        >
          <option value="all" className="dark:bg-slate-900 dark:text-white">All Roles ({roles.length})</option>
          {roles.map((r) => (
            <option key={r.id} value={r.name} className="dark:bg-slate-900 dark:text-white">
              {r.name}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 text-xs text-slate-700 dark:text-white focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10 shadow-2xs cursor-pointer"
        >
          <option value="all" className="dark:bg-slate-900 dark:text-white">All Account Statuses</option>
          <option value="active" className="dark:bg-slate-900 dark:text-white">Active Only</option>
          <option value="suspended" className="dark:bg-slate-900 dark:text-white">Suspended Only</option>
        </select>
      </div>

      <ActiveMembersTable
        users={filteredUsers}
        roles={roles}
        isLoading={isLoading}
        canAssignRoles={can('users.assign_roles')}
        canDeactivate={can('users.deactivate')}
        isOwner={isOwner}
        onRoleChange={handleRoleChange}
        onToggleStatus={handleToggleStatus}
      />

      {/* Last Invite Link Banner */}
      {lastInviteResult && (
        <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 p-4 flex items-start gap-3 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center shrink-0">
            <Check size={15} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
              Invite sent to {lastInviteResult.email}
              {lastInviteResult.emailSent ? ' via email' : ' — share this link manually:'}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <input
                readOnly
                value={lastInviteResult.url}
                className="flex-1 min-w-0 text-[11px] font-mono bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800/60 rounded-lg px-3 py-1.5 text-slate-700 dark:text-slate-300 truncate select-all"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(lastInviteResult.url);
                  setCopiedToken('__last__');
                  setTimeout(() => setCopiedToken(null), 2000);
                }}
                className="shrink-0 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedToken === '__last__' ? <Check size={12} /> : <Copy size={12} />}
                {copiedToken === '__last__' ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
          <button
            onClick={() => setLastInviteResult(null)}
            className="shrink-0 text-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>
      )}

      <PendingInvitationsTable
        invitations={invitations}
        copiedToken={copiedToken}
        onCopyLink={handleCopyInviteLink}
        onResend={handleResendInvitation}
        onRevoke={(id) => setRevokeConfirmId(id)}
      />

      <InviteMemberModal
        isOpen={isInviteModalOpen}
        roles={isOwner ? roles : roles.filter((r) => !['owner', 'administrator', 'admin'].includes(r.name.toLowerCase()))}
        onClose={() => setIsInviteModalOpen(false)}
        onSendInvite={handleSendInvite}
        onResendFromModal={handleResendFromModal}
      />

      <ConfirmDialog
        isOpen={revokeConfirmId !== null}
        title="Revoke Invitation Link"
        message="Are you sure you want to revoke this invitation link? The recipient will no longer be able to use it to join your team."
        confirmLabel="Revoke Invitation"
        variant="danger"
        onConfirm={() => {
          if (revokeConfirmId !== null) {
            handleRevokeInvitation(revokeConfirmId);
          }
        }}
        onCancel={() => setRevokeConfirmId(null)}
      />
    </div>
  );
}
