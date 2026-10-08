import React from 'react';
import { RotateCcw, Shield } from 'lucide-react';
import { DevBadge } from '@/components/common/DevBadge';
import { isDevEmail } from '@/utils/devUtils';
import { Role, UserItem } from '../types';
import { CrmSelect } from '@/components/common/CrmSelect';

interface ActiveMembersTableProps {
  users: UserItem[];
  roles: Role[];
  isLoading: boolean;
  canAssignRoles: boolean;
  canDeactivate: boolean;
  isOwner: boolean;
  onRoleChange: (userId: number, roleId: number) => void;
  onToggleStatus: (user: UserItem) => void;
}

export function ActiveMembersTable({
  users,
  roles,
  isLoading,
  canAssignRoles,
  canDeactivate,
  isOwner,
  onRoleChange,
  onToggleStatus,
}: ActiveMembersTableProps) {
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
    <div className="rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 overflow-hidden shadow-sm backdrop-blur-md">
      <div className="px-5 py-3.5 border-b border-slate-200/80 dark:border-white/5 bg-slate-50/80 dark:bg-slate-800/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
            Active Team Members ({users.length})
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
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-slate-500 dark:text-slate-400">
                  No team members found matching your search.
                </td>
              </tr>
            ) : (
              users.map((u) => {
                const roleName = getRoleDisplayName(u);
                const isUserOwner = u.role === 'owner' || u.roles?.some((r) => r.name.toLowerCase() === 'owner');
                const isUserAdmin = ['admin', 'administrator'].includes(u.role?.toLowerCase() || '') || u.roles?.some((r) => ['administrator', 'admin'].includes(r.name.toLowerCase()));

                const canChangeThisUserRole = isUserOwner ? false : (isUserAdmin ? isOwner : canAssignRoles);
                const canToggleThisUserStatus = isUserOwner ? false : (isUserAdmin ? isOwner : canDeactivate);
                const selectableRoles = isOwner ? roles : roles.filter((r) => !['owner', 'administrator', 'admin'].includes(r.name.toLowerCase()));

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
                            {isUserOwner && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50">
                                Owner
                              </span>
                            )}
                            {isUserAdmin && !isUserOwner && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50">
                                Administrator
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
                      {canChangeThisUserRole ? (
                        <div className="w-36">
                          <CrmSelect
                            value={String(u.roles?.[0]?.id || roles.find((r) => r.name.toLowerCase() === u.role.toLowerCase() || r.name.toLowerCase().replace(/ /g, '_') === u.role.toLowerCase())?.id || '')}
                            onChange={(val) => onRoleChange(u.id, Number(val))}
                            options={selectableRoles.map((r) => ({
                              value: String(r.id),
                              label: r.name,
                            }))}
                            size="xs"
                          />
                        </div>
                      ) : (
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border inline-flex items-center gap-1 ${
                          isUserOwner
                            ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/50'
                            : isUserAdmin
                            ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/50'
                            : 'bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800/50'
                        }`}>
                          <Shield size={12} />
                          {roleName}
                        </span>
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
                      {canToggleThisUserStatus && (
                        <button
                          onClick={() => onToggleStatus(u)}
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
  );
}
