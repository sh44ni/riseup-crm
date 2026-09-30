import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Users,
  UserPlus,
  Mail,
  Phone,
  Shield,
  Check,
  X,
  Search,
  RotateCcw,
  Copy,
  Clock,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Send,
  MoreVertical,
  Calendar,
  Lock,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { DevBadge } from '@/components/common/DevBadge';
import { isDevEmail } from '@/utils/devUtils';

interface Role {
  id: number;
  name: string;
  description?: string;
  is_protected?: boolean;
}

interface UserItem {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: string;
  status: string;
  avatar_url?: string;
  last_login_at?: string;
  created_at?: string;
  roles?: Array<{ id: number; name: string; is_protected?: boolean }>;
}

interface InvitationItem {
  id: number;
  email: string;
  invited_role_ids: number[];
  token: string;
  status: string;
  expires_at: string;
  created_at: string;
  invited_by_name?: string;
  roles?: Array<{ id: number; name: string }>;
}

interface TeamMembersListProps {
  roles: Role[];
  onRefresh: () => void;
}

export function TeamMembersList({ roles, onRefresh }: TeamMembersListProps) {
  const { user: currentUser, can, isOwner } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [invitations, setInvitations] = useState<InvitationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Invite Modal State
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRoleId, setInviteRoleId] = useState<number>(() => {
    const dk = roles.find((r) => r.name.toLowerCase().includes('knocker') || r.name.toLowerCase().includes('sales'));
    return dk ? dk.id : (roles[0]?.id || 3);
  });
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [pendingResendId, setPendingResendId] = useState<number | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
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

  useEffect(() => {
    if (!isInviteModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeInviteModal();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isInviteModalOpen]);

  const closeInviteModal = () => {
    setIsInviteModalOpen(false);
    setInviteError('');
    setPendingResendId(null);
  };

  useEffect(() => {
    if (roles.length > 0 && !roles.some((r) => r.id === inviteRoleId)) {
      const dk = roles.find((r) => r.name.toLowerCase().includes('knocker') || r.name.toLowerCase().includes('sales'));
      setInviteRoleId(dk ? dk.id : roles[0].id);
    }
  }, [roles, inviteRoleId]);

  const showNotification = (msg: string) => {
    setActionSuccess(msg);
    toast.success(msg);
    setTimeout(() => setActionSuccess(null), 4000);
  };

  // After a successful invite, store the generated link so we can show/copy it
  const [lastInviteResult, setLastInviteResult] = useState<{
    email: string; url: string; emailSent: boolean;
  } | null>(null);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) {
      setInviteError('Please enter a valid email address.');
      return;
    }
    setIsInviting(true);
    setInviteError('');
    try {
      const res = await api.createInvitation({
        email: inviteEmail.trim(),
        roleIds: [inviteRoleId],
      });
      const assignedRole = roles.find((r) => r.id === inviteRoleId)?.name || 'Role';

      // Build the invite link using the CURRENT origin so it works on localhost too
      const origin = window.location.origin;
      const token = res?.token;
      const inviteUrl = token ? `${origin}/accept-invite?token=${token}` : null;

      if (inviteUrl) {
        // Auto-copy to clipboard
        try { await navigator.clipboard.writeText(inviteUrl); } catch {}
        setLastInviteResult({ email: inviteEmail.trim(), url: inviteUrl, emailSent: !!res?.email_sent });
      }

      showNotification(
        inviteUrl
          ? `Invite sent as "${assignedRole}"! Link copied to clipboard.`
          : `Invitation sent to ${inviteEmail} as "${assignedRole}"!`
      );
      setIsInviteModalOpen(false);
      setInviteEmail('');
      await fetchTeamData();
      onRefresh();
    } catch (err: any) {
      const msg: string = err.message || 'Failed to send invitation.';
      // Detect duplicate invite — backend says "already exists (ID: 123)"
      const dupMatch = msg.match(/already exists \(ID:\s*(\d+)\)/i);
      if (dupMatch) {
        const existingId = Number(dupMatch[1]);
        setInviteError(
          `${inviteEmail.trim()} already has a pending invite. Resend it to generate a fresh link.`
        );
        // Store a pending resend so the "Resend" button in the error can trigger it
        setPendingResendId(existingId);
      } else {
        setInviteError(msg);
        setPendingResendId(null);
      }
    } finally {
      setIsInviting(false);
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

  // Called from the invite modal when a duplicate is detected — resends the existing invite
  const handleResendFromModal = async () => {
    if (!pendingResendId) return;
    setIsInviting(true);
    try {
      const res = await api.resendInvitation(pendingResendId);
      const origin = window.location.origin;
      const token = res?.token;
      const inviteUrl = token ? `${origin}/accept-invite?token=${token}` : null;
      if (inviteUrl) {
        try { await navigator.clipboard.writeText(inviteUrl); } catch {}
        setLastInviteResult({ email: inviteEmail.trim(), url: inviteUrl, emailSent: !!res?.email_sent });
      }
      showNotification('Invitation resent — link renewed for 7 more days!');
      setIsInviteModalOpen(false);
      setInviteEmail('');
      setInviteError('');
      setPendingResendId(null);
      await fetchTeamData();
      onRefresh();
    } catch (err: any) {
      setInviteError(err.message || 'Failed to resend invitation.');
    } finally {
      setIsInviting(false);
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

  // Filtered roster
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

  const getRoleDisplayName = (userItem: UserItem) => {
    if (userItem.roles && userItem.roles.length > 0) {
      return userItem.roles[0].name;
    }
    const matched = roles.find(
      (r) =>
        r.name.toLowerCase() === userItem.role.toLowerCase() ||
        r.name.toLowerCase().replace(/ /g, '_') === userItem.role.toLowerCase()
    );
    if (matched) return matched.name;
    return userItem.role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
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

      {/* Action Bar & Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl bg-white/90 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 backdrop-blur-md shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/50 flex items-center justify-center text-sky-600 dark:text-sky-400 font-bold shadow-2xs">
            <Users size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Team Roster & Invitations</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-sky-100 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/50">
                {users.length} Active Staff
              </span>
              {invitations.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50">
                  {invitations.length} Pending
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Assign roles, control field access scopes, and provision new team members with secure invitations.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              fetchTeamData();
              onRefresh();
            }}
            disabled={isLoading}
            className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 hover:bg-slate-50 hover:dark:bg-slate-700 hover:text-slate-900 hover:dark:text-white hover:border-slate-300 transition-all flex items-center gap-2 shadow-2xs cursor-pointer"
          >
            <RotateCcw size={14} className={isLoading ? 'animate-spin text-sky-600' : 'text-slate-500 dark:text-slate-400'} />
            <span>Sync</span>
          </button>

          {(isOwner || can('users.invite')) && (
            <button
              onClick={() => setIsInviteModalOpen(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#E06800] to-[#FF8A00] hover:from-[#C85A00] hover:to-[#E06800] shadow-[0_2px_12px_rgba(224,104,0,0.25)] transition-all flex items-center gap-2 cursor-pointer"
            >
              <UserPlus size={15} />
              <span>Invite Team Member</span>
            </button>
          )}
        </div>
      </div>

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

      {/* Active Staff Roster Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 overflow-hidden shadow-sm backdrop-blur-md">
        <div className="px-5 py-3.5 border-b border-slate-200/80 dark:border-white/5 bg-slate-50/80 dark:bg-slate-800/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
              Active Team Members ({filteredUsers.length})
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/5 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-50/60 dark:bg-slate-800/50">
                <th className="py-3 px-4">Member Name</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Assigned Role</th>
                <th className="py-3 px-4">Account Status</th>
                <th className="py-3 px-4">Last Active</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-500 dark:text-slate-400">
                    <RotateCcw size={20} className="animate-spin mx-auto text-sky-600 mb-2" />
                    Loading team members from PostgreSQL...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-500 dark:text-slate-400">
                    No team members found matching your search.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const roleName = getRoleDisplayName(u);
                  const isProtected = u.roles?.some((r) => r.is_protected) || u.role === 'owner';

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70 hover:dark:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center font-black text-white text-xs shrink-0 shadow-xs">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span>{u.name}</span>
                              {isProtected && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50">
                                  Owner
                                </span>
                              )}
                              {isDevEmail(u.email) && <DevBadge size="xs" />}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">{u.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="text-slate-600 dark:text-slate-300 font-medium">{u.phone || '—'}</div>
                      </td>

                      <td className="py-3 px-4">
                        {isProtected || !can('users.assign_roles') ? (
                          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/50 inline-flex items-center gap-1">
                            <Shield size={12} />
                            {roleName}
                          </span>
                        ) : (
                          <select
                            value={u.roles?.[0]?.id || roles.find((r) => r.name.toLowerCase() === u.role.toLowerCase() || r.name.toLowerCase().replace(/ /g, '_') === u.role.toLowerCase())?.id || ''}
                            onChange={(e) => handleRoleChange(u.id, Number(e.target.value))}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-200 dark:border-white/10 hover:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer shadow-2xs"
                          >
                            {roles.map((r) => (
                              <option key={r.id} value={r.id} className="dark:bg-slate-900 dark:text-white">
                                {r.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                            u.status === 'active'
                              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50'
                              : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/50'
                          }`}
                        >
                          {u.status}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400 text-[11px]">
                        {u.last_login_at
                          ? new Date(u.last_login_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Never'}
                      </td>

                      <td className="py-3 px-4 text-right">
                        {!isProtected && can('users.deactivate') && (
                          <button
                            onClick={() => handleToggleStatus(u)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                              u.status === 'active'
                                ? 'border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                                : 'border-emerald-200 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                            }`}
                          >
                            {u.status === 'active' ? 'Suspend' : 'Activate'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 🔗 Last Invite Link Banner — shown after a successful invite send */}
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

      {/* Pending Invitations Section */}
      <div className="rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 overflow-hidden shadow-sm backdrop-blur-md">
        <div className="px-5 py-3.5 border-b border-slate-200/80 dark:border-white/5 bg-slate-50/80 dark:bg-slate-800/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail size={15} className="text-amber-500 dark:text-amber-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
              Pending Invitations ({invitations.length})
            </span>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Invited users can redeem their role immediately by clicking the link.
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
                            onClick={() => handleCopyInviteLink(inv.token)}
                            title="Copy Invitation Link"
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800/50 text-sky-700 dark:text-sky-300 hover:bg-sky-100 hover:dark:bg-sky-900/60 transition-all flex items-center gap-1 cursor-pointer"
                          >
                            {copiedToken === inv.token ? (
                              <>
                                <Check size={12} className="text-emerald-600 dark:text-emerald-400" />
                                <span className="text-emerald-700 dark:text-emerald-300">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy size={12} />
                                <span>Copy Link</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => handleResendInvitation(inv.id)}
                            title="Extend 7 Days"
                            className="px-2 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-50 hover:dark:bg-slate-700 hover:text-slate-900 hover:dark:text-white transition-all shadow-2xs cursor-pointer"
                          >
                            <RotateCcw size={12} />
                          </button>

                          <button
                            type="button"
                            onClick={() => setRevokeConfirmId(inv.id)}
                            title="Revoke Link"
                            aria-label="Revoke Invitation Link"
                            className="px-2 py-1 rounded-lg text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-100 hover:dark:bg-rose-900/60 transition-all cursor-pointer"
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

      {/* Invite Team Member Modal */}
      {isInviteModalOpen &&
        createPortal(
          <div
            onClick={() => closeInviteModal()}
            className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-5 bg-slate-950/65 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200 select-none"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl bg-white/95 dark:bg-[#0B1320]/95 backdrop-blur-xl border border-white/60 dark:border-white/10 shadow-2xl dark:shadow-[0_25px_90px_rgba(0,0,0,0.85)] p-6 relative space-y-4 my-auto max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200"
            >
              <button
                type="button"
                onClick={() => closeInviteModal()}
                className="absolute top-4 right-4 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-white cursor-pointer transition-colors"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#E06800] to-[#FF8A00] flex items-center justify-center text-white font-bold shadow-md">
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
                        onClick={handleResendFromModal}
                        disabled={isInviting}
                        className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {isInviting ? <RotateCcw size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                        Resend existing invite instead
                      </button>
                    )}
                  </div>
                </div>
              )}

              <form onSubmit={handleSendInvite} className="space-y-4">
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
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#0f1d2f] border border-slate-200/90 dark:border-white/10 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-[#E06800] focus:ring-2 focus:ring-[#E06800]/20 shadow-2xs cursor-pointer transition-all"
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
                    onClick={() => closeInviteModal()}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isInviting}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#E06800] to-[#FF8A00] hover:from-[#C85A00] hover:to-[#E06800] shadow-md transition-all flex items-center gap-2 cursor-pointer"
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
        )}

      {/* Revocation Confirmation Dialog */}
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
