import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
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
import { CrmSelect } from '@/components/common/CrmSelect';

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
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [revokeConfirmId, setRevokeConfirmId] = useState<number | null>(null);

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
      await api.createInvitation({
        email,
        roleIds: [roleId],
      });
      const assignedRole = roles.find((r) => r.id === roleId)?.name || 'Role';

      showNotification(`Invitation sent to ${email} as "${assignedRole}"! An email invitation has been dispatched.`);
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
          error: `${email} already has a pending invite. Resend it to dispatch a fresh email.`,
          pendingResendId: existingId,
        };
      }
      return { success: false, error: msg };
    }
  };

  const handleResendFromModal = async (pendingResendId: number, email: string) => {
    try {
      await api.resendInvitation(pendingResendId);
      showNotification(`Invitation email resent to ${email} — renewed for 7 more days!`);
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
      showNotification('Invitation revoked.');
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
      showNotification('Invitation email resent — extended for 7 additional days.');
      await fetchTeamData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to resend invitation');
    }
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

        <CrmSelect
          value={roleFilter}
          onChange={setRoleFilter}
          options={[
            { value: 'all', label: `All Roles (${roles.length})` },
            ...roles.map((r) => ({ value: r.name, label: r.name })),
          ]}
          triggerClassName="py-2 text-xs"
        />

        <CrmSelect
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: 'all', label: 'All Account Statuses' },
            { value: 'active', label: 'Active Only' },
            { value: 'suspended', label: 'Suspended Only' },
          ]}
          triggerClassName="py-2 text-xs"
        />
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

      <PendingInvitationsTable
        invitations={invitations}
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
