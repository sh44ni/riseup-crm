import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Mail,
  Phone,
  Shield,
  ShieldCheck,
  ShieldAlert,
  MapPin,
  Check,
  X,
  Search,
  MoreVertical,
  Trash2,
  Lock,
  Sparkles,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import {
  TeamMember,
  UserRole,
  RoleType,
  PermissionKey,
} from '@/types/settingsTypes';

interface UsersManagementTabProps {
  members: TeamMember[];
  roles: UserRole[];
  search: string;
  onUpdateMember: (member: TeamMember) => void;
  onDeleteMember: (id: string) => void;
  onOpenInviteModal: () => void;
  onUpdatePermissions: (
    roleId: RoleType,
    permKey: PermissionKey,
    val: boolean
  ) => void;
}

export function UsersManagementTab({
  members,
  roles,
  search,
  onUpdateMember,
  onDeleteMember,
  onOpenInviteModal,
  onUpdatePermissions,
}: UsersManagementTabProps) {
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [memberSearch, setMemberSearch] = useState<string>('');

  const combinedSearch = (search || memberSearch).toLowerCase().trim();

  // Filter members
  const filteredMembers = members.filter((m) => {
    const matchesSearch =
      !combinedSearch ||
      m.name.toLowerCase().includes(combinedSearch) ||
      m.email.toLowerCase().includes(combinedSearch) ||
      m.roleLabel.toLowerCase().includes(combinedSearch) ||
      m.branch.toLowerCase().includes(combinedSearch);

    const matchesRole =
      roleFilter === 'all' ||
      (roleFilter === 'estimators' && m.role === 'senior_estimator') ||
      (roleFilter === 'field' && (m.role === 'crew_lead' || m.role === 'production_manager')) ||
      (roleFilter === 'office' && (m.role === 'owner' || m.role === 'office_admin'));

    return matchesSearch && matchesRole;
  });

  const handleRoleChange = (member: TeamMember, newRole: RoleType) => {
    const roleMeta = roles.find((r) => r.id === newRole);
    onUpdateMember({
      ...member,
      role: newRole,
      roleLabel: roleMeta ? roleMeta.title : member.roleLabel,
    });
  };

  const handleToggleStatus = (member: TeamMember) => {
    const newStatus = member.status === 'active' ? 'suspended' : 'active';
    onUpdateMember({
      ...member,
      status: newStatus,
    });
  };

  const PERMISSION_ROWS: {
    key: PermissionKey;
    label: string;
    description: string;
  }[] = [
    {
      key: 'viewFinancials',
      label: 'View Financials & Profit Margins',
      description: 'Access executive gross margins, revenue velocity, and company P&L',
    },
    {
      key: 'editPricingFormulas',
      label: 'Modify Roofing Pricing Formulas',
      description: 'Alter pitch multipliers, story staging, and tear-off rates per SQ',
    },
    {
      key: 'createEstimates',
      label: 'Create & Send Estimates',
      description: 'Generate quotes from aerial CAD and dispatch proposals to homeowners',
    },
    {
      key: 'signContracts',
      label: 'E-Sign Legal Roofing Contracts',
      description: 'Counter-sign California Home Improvement Contracts (CSLB C-39)',
    },
    {
      key: 'dispatchCrews',
      label: 'Dispatch Field Work Orders',
      description: 'Assign production crews, rollout schedules, and staging instructions',
    },
    {
      key: 'deleteRecords',
      label: 'Delete CRM Leads & Job Files',
      description: 'Permanently remove client records, insurance files, and invoices',
    },
    {
      key: 'exportReports',
      label: 'Export Business Intelligence (CSV/PDF)',
      description: 'Download sales leaderboard, customer acquisition, and payroll data',
    },
    {
      key: 'manageUsers',
      label: 'Manage Team Roster & Security Policies',
      description: 'Invite new staff, revoke sessions, and configure 2FA enforcement',
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* ================================================================
          SECTION 1: TEAM ROSTER & ACTION BAR
          ================================================================ */}
      <div className="light-glass-card rounded-3xl p-6 border border-slate-200/80 bg-white/70 backdrop-blur-md shadow-xs space-y-6">
        {/* Top Control Bar */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                Team Roster & Operational Staff
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200/80 text-[10px] font-bold">
                {members.length} Active Staff
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Manage field estimators, crew foremen, and dispatch administrators across North County branches.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            {/* Inner Search */}
            <div className="relative w-48 sm:w-60">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={13}
              />
              <input
                type="text"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Search staff..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white border border-slate-200 focus:border-[#1878B8] text-xs font-semibold text-slate-800 outline-none shadow-2xs placeholder:text-slate-400"
              />
            </div>

            {/* Invite Button */}
            <button
              onClick={onOpenInviteModal}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-[#1878B8] to-[#2F9FE3] text-white hover:brightness-110 shadow-[0_3px_12px_rgba(47,159,227,0.35)] flex items-center gap-2 transition-all active:scale-[0.98]"
            >
              <UserPlus size={14} />
              <span>Invite Team Member</span>
            </button>
          </div>
        </div>

        {/* Role Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar border-b border-slate-100">
          {[
            { id: 'all', label: `All Staff (${members.length})` },
            {
              id: 'estimators',
              label: `Sales & Estimators (${
                members.filter((m) => m.role === 'senior_estimator').length
              })`,
            },
            {
              id: 'field',
              label: `Field Operations (${
                members.filter(
                  (m) =>
                    m.role === 'crew_lead' || m.role === 'production_manager'
                ).length
              })`,
            },
            {
              id: 'office',
              label: `Leadership & Office (${
                members.filter(
                  (m) => m.role === 'owner' || m.role === 'office_admin'
                ).length
              })`,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setRoleFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
                roleFilter === tab.id
                  ? 'bg-slate-900 text-white font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Members Roster Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="pb-3 pl-2">Team Member</th>
                <th className="pb-3">Role & Access</th>
                <th className="pb-3">Contact</th>
                <th className="pb-3">Operating Branch</th>
                <th className="pb-3 text-center">2FA</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 pr-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredMembers.map((member) => (
                <tr
                  key={member.id}
                  className="hover:bg-sky-50/40 transition-colors group"
                >
                  {/* Member Name + Avatar */}
                  <td className="py-3.5 pl-2">
                    <div className="flex items-center gap-3">
                      <div className="relative shrink-0">
                        <div
                          className={`w-9 h-9 rounded-xl bg-gradient-to-br ${member.avatarColor} text-white font-black text-xs flex items-center justify-center shadow-2xs`}
                        >
                          {member.initials}
                        </div>
                        {member.status === 'active' && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 group-hover:text-[#1878B8] transition-colors flex items-center gap-1.5">
                          <span>{member.name}</span>
                          {member.role === 'owner' && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold border border-amber-300">
                              Owner
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Joined {member.joinedDate} • {member.lastActive}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Role Dropdown */}
                  <td className="py-3.5">
                    <select
                      value={member.role}
                      disabled={member.role === 'owner'}
                      onChange={(e) =>
                        handleRoleChange(member, e.target.value as RoleType)
                      }
                      className={`text-xs font-semibold px-2.5 py-1 rounded-lg border bg-white outline-none cursor-pointer ${
                        member.role === 'owner'
                          ? 'border-sky-300 bg-sky-50/60 text-sky-800 cursor-not-allowed'
                          : 'border-slate-200 text-slate-700 hover:border-slate-300 focus:border-[#1878B8]'
                      }`}
                    >
                      <option value="owner">Owner & Executive</option>
                      <option value="senior_estimator">Senior Estimator</option>
                      <option value="production_manager">Production Manager</option>
                      <option value="crew_lead">Crew Lead Foreman</option>
                      <option value="office_admin">Office Administrator</option>
                    </select>
                  </td>

                  {/* Contact Info */}
                  <td className="py-3.5 space-y-0.5">
                    <a
                      href={`mailto:${member.email}`}
                      className="text-slate-600 hover:text-[#1878B8] flex items-center gap-1.5 transition-colors"
                    >
                      <Mail size={12} className="text-slate-400" />
                      <span>{member.email}</span>
                    </a>
                    <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                      <Phone size={11} className="text-slate-400" />
                      <span>{member.phone}</span>
                    </div>
                  </td>

                  {/* Branch Assignment */}
                  <td className="py-3.5">
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-semibold border border-slate-200">
                      <MapPin size={11} className="text-slate-400" />
                      <span>{member.branch}</span>
                    </div>
                  </td>

                  {/* 2FA Status */}
                  <td className="py-3.5 text-center">
                    {member.twoFactorEnabled ? (
                      <span
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60"
                        title="Two-Factor Authentication Enforced"
                      >
                        <ShieldCheck size={12} />
                        Enforced
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60"
                        title="Pending 2FA Setup"
                      >
                        <ShieldAlert size={12} />
                        Pending
                      </span>
                    )}
                  </td>

                  {/* Status Toggle */}
                  <td className="py-3.5">
                    <button
                      onClick={() => handleToggleStatus(member)}
                      disabled={member.role === 'owner'}
                      className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full transition-all flex items-center gap-1.5 ${
                        member.status === 'active'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200'
                          : 'bg-rose-100 text-rose-800 border border-rose-300 hover:bg-rose-200'
                      } ${member.role === 'owner' ? 'cursor-not-allowed opacity-90' : 'cursor-pointer'}`}
                      title={
                        member.role === 'owner'
                          ? 'Primary license holder account cannot be suspended'
                          : 'Click to toggle status'
                      }
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          member.status === 'active'
                            ? 'bg-emerald-600 animate-pulse'
                            : 'bg-rose-600'
                        }`}
                      />
                      {member.status}
                    </button>
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 pr-2 text-right">
                    {member.role !== 'owner' && (
                      <button
                        onClick={() => onDeleteMember(member.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Remove member access"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================================================================
          SECTION 2: ROLE & PERMISSION MATRIX
          ================================================================ */}
      <div className="light-glass-card rounded-3xl p-6 border border-slate-200/80 bg-white/70 backdrop-blur-md shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Lock className="text-[#1878B8]" size={18} />
              <h3 className="text-base font-black text-slate-900 tracking-tight">
                Granular Role Permissions Matrix
              </h3>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Configure access levels, financial visibility, and job execution controls for each operational role.
            </p>
          </div>
          <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
            5 Standard Roofing Roles
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider bg-slate-50/50">
                <th className="py-3 pl-3">Operational Capability</th>
                {roles.map((r) => (
                  <th key={r.id} className="py-3 px-3 text-center">
                    <div className="font-bold text-slate-900">{r.title}</div>
                    <div className="text-[9px] text-slate-400 font-normal">
                      {r.memberCount} Assigned
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {PERMISSION_ROWS.map((row) => (
                <tr key={row.key} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 pl-3 pr-4">
                    <div className="font-bold text-slate-800">{row.label}</div>
                    <div className="text-[11px] text-slate-400">
                      {row.description}
                    </div>
                  </td>

                  {roles.map((role) => {
                    const isAllowed = role.permissions[row.key];
                    const isOwner = role.id === 'owner';

                    return (
                      <td key={role.id} className="py-3.5 px-3 text-center">
                        <button
                          disabled={isOwner}
                          onClick={() =>
                            onUpdatePermissions(role.id, row.key, !isAllowed)
                          }
                          className={`w-7 h-7 rounded-lg inline-flex items-center justify-center transition-all ${
                            isAllowed
                              ? 'bg-emerald-500 text-white shadow-2xs hover:bg-emerald-600'
                              : 'bg-slate-100 text-slate-300 hover:bg-slate-200 hover:text-slate-500'
                          } ${isOwner ? 'cursor-not-allowed opacity-90' : 'cursor-pointer'}`}
                          title={
                            isOwner
                              ? 'Owner permissions cannot be altered'
                              : isAllowed
                              ? 'Click to revoke permission'
                              : 'Click to grant permission'
                          }
                        >
                          {isAllowed ? <Check size={14} /> : <X size={13} />}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
