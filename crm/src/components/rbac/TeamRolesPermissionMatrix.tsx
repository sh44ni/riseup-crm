import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Shield,
  ShieldCheck,
  Users,
  UserPlus,
  RotateCcw,
  Search,
  Check,
  X,
  Sliders,
  Sparkles,
  Key,
  Lock,
  Plus,
  CheckCircle2,
  AlertCircle,
  Eye,
  DollarSign,
  BarChart3,
  Calendar,
  FileText,
  Briefcase,
  Camera,
  HardHat,
  FileCheck,
  Award,
  Zap,
  Save,
  Trash2,
  PenTool,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { TeamMembersList } from './TeamMembersList';

interface ModuleConfig {
  view: 'none' | 'own' | 'assigned' | 'all';
  manage: boolean;
}

interface Role {
  id: number;
  name: string;
  description?: string;
  is_protected?: boolean;
  is_authorized_signatory?: boolean;
  user_count?: number;
  permissions?: Array<{ permission_id: number; key?: string; scope: string }>;
  modules?: Record<string, ModuleConfig>;
}

interface ModuleDefinition {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  accentColor: string;
  scoped: boolean;
}

const MODULE_DEFINITIONS: ModuleDefinition[] = [
  {
    id: 'leads',
    label: 'Leads & Inquiries',
    description: 'Inbound prospective homeowners, storm leads & door knocker canvassing submissions',
    icon: UserPlus,
    accentColor: 'from-amber-500 to-orange-500 text-amber-600 bg-amber-50 border-amber-200',
    scoped: true,
  },
  {
    id: 'pipeline',
    label: 'Sales Pipeline',
    description: 'Kanban deal stages, win/loss probabilities, velocity tracking, and stage transitions',
    icon: Sliders,
    accentColor: 'from-sky-500 to-blue-600 text-sky-600 bg-sky-50 border-sky-200',
    scoped: true,
  },
  {
    id: 'clients',
    label: 'Homeowner Profiles (360 Registry)',
    description: 'Homeowner contact registry, 360 property histories, specs, notes, and records',
    icon: Users,
    accentColor: 'from-blue-500 to-cyan-600 text-blue-600 bg-blue-50 border-blue-200',
    scoped: true,
  },
  {
    id: 'estimates',
    label: 'Estimates & Proposals',
    description: 'Roofing cost calculations, material formulas, pricing templates, and sent proposals',
    icon: FileText,
    accentColor: 'from-indigo-500 to-purple-600 text-indigo-600 bg-indigo-50 border-indigo-200',
    scoped: true,
  },
  {
    id: 'contracts',
    label: 'Contracts & Signatures',
    description: 'Legally binding work authorizations, deposit terms, and client signature sign-offs',
    icon: FileCheck,
    accentColor: 'from-emerald-500 to-teal-600 text-emerald-600 bg-emerald-50 border-emerald-200',
    scoped: false,
  },
  {
    id: 'jobs',
    label: 'Production Jobs',
    description: 'Jobsite work orders, crew dispatch schedules, material deliveries, and completion sign-offs',
    icon: Briefcase,
    accentColor: 'from-blue-600 to-indigo-700 text-blue-600 bg-blue-50 border-blue-200',
    scoped: true,
  },
  {
    id: 'calendar',
    label: 'Schedule & Calendar',
    description: 'Roof inspection appointments, crew dispatch calendars, and team events',
    icon: Calendar,
    accentColor: 'from-violet-500 to-purple-600 text-violet-600 bg-violet-50 border-violet-200',
    scoped: true,
  },
  {
    id: 'inspections',
    label: 'Roof Inspections',
    description: '12-point photo audits, drone inspection reports, and storm damage assessments',
    icon: Camera,
    accentColor: 'from-teal-500 to-emerald-600 text-teal-600 bg-teal-50 border-teal-200',
    scoped: false,
  },
  {
    id: 'finances',
    label: 'Finances & Invoicing',
    description: 'Customer invoices, payment processing, project gross margins, and profit ledgers',
    icon: DollarSign,
    accentColor: 'from-rose-500 to-pink-600 text-rose-600 bg-rose-50 border-rose-200',
    scoped: false,
  },
  {
    id: 'reports',
    label: 'Reports & Analytics',
    description: 'Executive revenue KPIs, proposal win rates, roofer leaderboard, and speed-to-lead',
    icon: BarChart3,
    accentColor: 'from-orange-500 to-amber-600 text-orange-600 bg-orange-50 border-orange-200',
    scoped: false,
  },
  {
    id: 'warranties',
    label: 'Warranties & Certificates',
    description: 'Manufacturer material guarantees and Rise Up workmanship roof certificates',
    icon: Award,
    accentColor: 'from-amber-600 to-yellow-600 text-amber-700 bg-amber-50 border-amber-200',
    scoped: false,
  },
  {
    id: 'crew',
    label: 'Field Crew & Subcontractors',
    description: 'In-house journeymen roofer rosters, daily laborers, and certified trade subcontractors',
    icon: HardHat,
    accentColor: 'from-cyan-600 to-sky-600 text-cyan-600 bg-cyan-50 border-cyan-200',
    scoped: false,
  },
  {
    id: 'estimator_settings',
    label: 'Estimator & Pricing Formulas',
    description: 'Base square costs, labor multipliers, pitch steepness factors, and margin floors',
    icon: Sliders,
    accentColor: 'from-slate-600 to-slate-800 text-slate-700 bg-slate-100 border-slate-200',
    scoped: false,
  },
  {
    id: 'users',
    label: 'Team & User Accounts',
    description: 'Staff account provisioning, invitation management, and account deactivation',
    icon: Users,
    accentColor: 'from-emerald-600 to-green-700 text-emerald-700 bg-emerald-50 border-emerald-200',
    scoped: false,
  },
  {
    id: 'roles',
    label: 'Roles & RBAC Privileges',
    description: 'Security role definitions, permission studio assignments, and access policies',
    icon: ShieldCheck,
    accentColor: 'from-purple-600 to-indigo-700 text-purple-700 bg-purple-50 border-purple-200',
    scoped: false,
  },
];

export function TeamRolesPermissionMatrix() {
  const { user: currentUser, isOwner, can } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'matrix' | 'members'>('matrix');
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [activeModules, setActiveModules] = useState<Record<string, ModuleConfig>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Accessible Dialog States
  const [pendingSwitchRole, setPendingSwitchRole] = useState<Role | null>(null);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);

  // Search filter
  const [searchModule, setSearchModule] = useState<string>('');

  // Create Role Modal State
  const [isCreateRoleOpen, setIsCreateRoleOpen] = useState<boolean>(false);
  const [newRoleName, setNewRoleName] = useState<string>('');
  const [newRoleDesc, setNewRoleDesc] = useState<string>('');
  const [newRoleIsSignatory, setNewRoleIsSignatory] = useState<boolean>(false);

  // Active Role Signatory State
  const [activeIsSignatory, setActiveIsSignatory] = useState<boolean>(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    toast.success(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadRoles = async () => {
    try {
      const [rolesRes, usersRes] = await Promise.all([
        api.getRoles(),
        api.getUsers(),
      ]);

      const rawRoles: Role[] = rolesRes.roles || [];
      const rawUsers = usersRes.users || [];

      // Calculate user counts per role
      const counts: Record<number, number> = {};
      rawUsers.forEach((u: any) => {
        if (u.roles && u.roles.length > 0) {
          u.roles.forEach((r: any) => {
            counts[r.id] = (counts[r.id] || 0) + 1;
          });
        } else if (u.role) {
          const matched = rawRoles.find(
            (r) =>
              r.name.toLowerCase() === u.role.toLowerCase() ||
              r.name.toLowerCase().replace(/ /g, '_') === u.role.toLowerCase()
          );
          if (matched) counts[matched.id] = (counts[matched.id] || 0) + 1;
        }
      });

      const augmentedRoles = rawRoles.map((r) => ({
        ...r,
        user_count: counts[r.id] || 0,
      }));

      setRoles(augmentedRoles);

      // Default select first non-protected role or first role
      if (!selectedRoleId && augmentedRoles.length > 0) {
        const defaultRole = augmentedRoles.find((r) => !r.is_protected) || augmentedRoles[0];
        setSelectedRoleId(defaultRole.id);
        setActiveModules(defaultRole.modules || {});
        setActiveIsSignatory(Boolean(defaultRole.is_authorized_signatory));
      } else if (selectedRoleId) {
        const curr = augmentedRoles.find((r) => r.id === selectedRoleId);
        if (curr) {
          setActiveModules(curr.modules || {});
          setActiveIsSignatory(Boolean(curr.is_authorized_signatory));
        }
      }
    } catch (err: any) {
      console.error('Failed to load roles:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadRoles();
  }, []);

  useEffect(() => {
    if (!isCreateRoleOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsCreateRoleOpen(false);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCreateRoleOpen]);

  const activeRole = useMemo(() => {
    return roles.find((r) => r.id === selectedRoleId) || null;
  }, [roles, selectedRoleId]);

  const applySelectRole = (role: Role) => {
    setSelectedRoleId(role.id);
    setActiveModules(role.modules || {});
    setActiveIsSignatory(Boolean(role.is_authorized_signatory));
    setHasUnsavedChanges(false);
    setPendingSwitchRole(null);
  };

  const handleSelectRole = (role: Role) => {
    if (hasUnsavedChanges) {
      setPendingSwitchRole(role);
      return;
    }
    applySelectRole(role);
  };

  const handleSignatoryChange = (val: boolean) => {
    if (!activeRole || activeRole.is_protected) return;
    if (!can('roles.edit') && !isOwner) {
      showToast('You do not have permission to edit roles.');
      return;
    }
    setActiveIsSignatory(val);
    setHasUnsavedChanges(true);
  };

  const handleViewChange = (moduleId: string, newView: 'none' | 'own' | 'assigned' | 'all') => {
    if (!activeRole || activeRole.is_protected) return;
    if (!can('roles.edit') && !isOwner) {
      showToast('You do not have permission to edit roles.');
      return;
    }

    setActiveModules((prev) => {
      const current = prev[moduleId] || { view: 'none', manage: false };
      // If setting view to none, manage must automatically become false
      const nextManage = newView === 'none' ? false : current.manage;
      return {
        ...prev,
        [moduleId]: {
          view: newView,
          manage: nextManage,
        },
      };
    });
    setHasUnsavedChanges(true);
  };

  const handleManageChange = (moduleId: string, newManage: boolean) => {
    if (!activeRole || activeRole.is_protected) return;
    if (!can('roles.edit') && !isOwner) {
      showToast('You do not have permission to edit roles.');
      return;
    }

    setActiveModules((prev) => {
      const current = prev[moduleId] || { view: 'none', manage: false };
      // If enabling manage while view was none, auto-enable view to 'all' or 'assigned'
      const def = MODULE_DEFINITIONS.find((m) => m.id === moduleId);
      let nextView = current.view;
      if (newManage && current.view === 'none') {
        nextView = def?.scoped ? 'assigned' : 'all';
      }
      return {
        ...prev,
        [moduleId]: {
          view: nextView,
          manage: newManage,
        },
      };
    });
    setHasUnsavedChanges(true);
  };

  const handleSaveChanges = async () => {
    if (!activeRole || activeRole.is_protected) return;
    setIsSaving(true);
    try {
      await api.updateRole(activeRole.id, {
        modules: activeModules,
        is_authorized_signatory: activeIsSignatory,
      });
      showToast(`Permissions and signatory status saved successfully for "${activeRole.name}".`);
      setHasUnsavedChanges(false);
      await loadRoles();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save role permissions');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;

    // Initialize all modules as none/false
    const initialModules: Record<string, ModuleConfig> = {};
    MODULE_DEFINITIONS.forEach((def) => {
      initialModules[def.id] = { view: 'none', manage: false };
    });

    try {
      const res = await api.createRole({
        name: newRoleName.trim(),
        description: newRoleDesc.trim() || 'Custom operational role',
        is_authorized_signatory: newRoleIsSignatory,
        modules: initialModules,
      });
      showToast(`Role "${newRoleName}" created successfully! Configure its permissions below.`);
      setIsCreateRoleOpen(false);
      setNewRoleName('');
      setNewRoleDesc('');
      setNewRoleIsSignatory(false);
      await loadRoles();
      if (res.role?.id) {
        setSelectedRoleId(res.role.id);
        setActiveModules(res.role.modules || initialModules);
        setActiveIsSignatory(Boolean(res.role.is_authorized_signatory));
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to create role');
    }
  };

  const promptDeleteRole = (role: Role) => {
    if (role.is_protected) {
      toast.warning('Cannot delete system protected Owner role.');
      return;
    }
    setRoleToDelete(role);
  };

  const confirmDeleteRole = async () => {
    if (!roleToDelete) return;
    try {
      await api.deleteRole(roleToDelete.id);
      showToast(`Role "${roleToDelete.name}" deleted.`);
      const remaining = roles.filter((r) => r.id !== roleToDelete.id);
      setSelectedRoleId(remaining[0]?.id || null);
      await loadRoles();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete role');
    } finally {
      setRoleToDelete(null);
    }
  };

  // Filtered modules based on search
  const filteredModules = useMemo(() => {
    const q = searchModule.toLowerCase().trim();
    if (!q) return MODULE_DEFINITIONS;
    return MODULE_DEFINITIONS.filter(
      (m) =>
        m.label.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q)
    );
  }, [searchModule]);

  return (
    <div className="space-y-6 select-none">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-xl bg-white border border-sky-200 text-slate-900 text-xs font-semibold flex items-center gap-3 shadow-xl animate-in slide-in-from-bottom-5 duration-200">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-slate-700 ml-2 cursor-pointer">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/50 mb-2 shadow-2xs">
            <ShieldCheck size={14} className="text-sky-600 dark:text-sky-400" />
            <span>Role Permissions Studio • {roles.length} Configured Roles</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Team, Roles & Access Control
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Configure dynamic roles per module with clean [View] and [Manage] access controls.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setIsRefreshing(true);
              loadRoles();
              showToast('Role permissions synced with database.');
            }}
            disabled={isRefreshing}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 hover:bg-slate-50 hover:dark:bg-slate-700 hover:text-slate-900 hover:dark:text-white hover:border-slate-300 transition-all flex items-center gap-2 shadow-2xs cursor-pointer"
          >
            <RotateCcw size={14} className={isRefreshing ? 'animate-spin text-sky-600' : 'text-slate-500 dark:text-slate-400'} />
            <span>Sync</span>
          </button>

          {(isOwner || can('roles.create')) && (
            <button
              onClick={() => setIsCreateRoleOpen(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#E06800] to-[#FF8A00] hover:from-[#C85A00] hover:to-[#E06800] shadow-[0_2px_12px_rgba(224,104,0,0.25)] transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus size={15} />
              <span>Create New Role</span>
            </button>
          )}
        </div>
      </div>

      {/* Top Tab Bar (Members vs Roles Studio) */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-1">
        <button
          onClick={() => setActiveTab('members')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 relative cursor-pointer ${
            activeTab === 'members'
              ? 'text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800/50 shadow-2xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:dark:text-white hover:bg-slate-100 hover:dark:bg-slate-800'
          }`}
        >
          <Users size={15} />
          <span>Team Members & Invitations</span>
        </button>

        <button
          onClick={() => setActiveTab('matrix')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 relative cursor-pointer ${
            activeTab === 'matrix'
              ? 'text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800/50 shadow-2xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:dark:text-white hover:bg-slate-100 hover:dark:bg-slate-800'
          }`}
        >
          <Shield size={15} className={activeTab === 'matrix' ? 'text-sky-600 dark:text-sky-400' : ''} />
          <span>Role Permissions Studio</span>
          <span className="px-2 py-0.2 rounded-full text-[10px] font-black bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60">
            {roles.length} Roles
          </span>
        </button>
      </div>

      {/* Tab 1: Team Members List */}
      {activeTab === 'members' && (
        <TeamMembersList roles={roles} onRefresh={loadRoles} />
      )}

      {/* Tab 2: Role Permissions Studio */}
      {activeTab === 'matrix' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* 1. Horizontal Role Selector Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1">
              <span>Select Role to Configure</span>
              <span>Click a role to adjust its module radios</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
              {roles.map((r) => {
                const isSelected = r.id === selectedRoleId;
                return (
                  <button
                    key={r.id}
                    onClick={() => handleSelectRole(r)}
                    className={`p-3 rounded-xl text-left transition-all relative border flex flex-col justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-sky-50/80 dark:bg-sky-950/60 border-sky-400 dark:border-sky-500 shadow-sm ring-2 ring-sky-400/20 dark:ring-sky-500/30'
                        : 'bg-white dark:bg-slate-800/70 border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 hover:bg-slate-50/50 hover:dark:bg-slate-800 shadow-2xs'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className={`text-xs font-bold truncate ${isSelected ? 'text-sky-900 dark:text-sky-200' : 'text-slate-900 dark:text-white'}`}>
                          {r.name}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          {r.is_authorized_signatory && (
                            <span title="Authorized Signatory Role" className="text-purple-600 dark:text-purple-400">
                              <PenTool size={11} />
                            </span>
                          )}
                          {r.is_protected && (
                            <span title="Protected Owner Role">
                              <Lock size={11} className="text-amber-600 dark:text-amber-400 shrink-0" />
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                        {r.description || 'Custom role'}
                      </p>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100 dark:border-white/5 text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                      <span>{r.user_count ?? 0} staff</span>
                      {isSelected && (
                        <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 flex items-center gap-0.5">
                          <Check size={11} /> Active
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Active Role Control Studio */}
          {activeRole && (
            <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden backdrop-blur-md">
              {/* Studio Header Bar */}
              <div className="p-5 border-b border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-slate-800/40 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-black uppercase tracking-wider text-sky-700 dark:text-sky-300 bg-sky-100 dark:bg-sky-950/50 px-2 py-0.5 rounded-md border border-sky-200 dark:border-sky-800/50">
                      Configuring Role
                    </span>
                    <h2 className="text-lg font-black text-slate-900 dark:text-white">{activeRole.name}</h2>
                    {activeRole.is_protected && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 flex items-center gap-1">
                        <Lock size={10} /> Root Owner
                      </span>
                    )}
                    {activeIsSignatory && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-purple-100 dark:bg-purple-950/50 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 flex items-center gap-1">
                        <PenTool size={10} /> Authorized Signatory
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {activeRole.description || 'Custom operational role with tailored module permissions.'}
                  </p>
                </div>

                {/* Save & Delete Actions */}
                <div className="flex items-center flex-wrap gap-2">
                  {!activeRole.is_protected && (
                    <>
                      <button
                        type="button"
                        onClick={handleSaveChanges}
                        disabled={isSaving || !hasUnsavedChanges}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                          hasUnsavedChanges
                            ? 'bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white shadow-md animate-pulse'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-white/10 cursor-not-allowed'
                        }`}
                      >
                        {isSaving ? (
                          <>
                            <RotateCcw size={13} className="animate-spin" />
                            <span>Saving...</span>
                          </>
                        ) : (
                          <>
                            <Save size={13} />
                            <span>{hasUnsavedChanges ? 'Save Changes *' : 'Saved'}</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => promptDeleteRole(activeRole)}
                        title="Delete this role"
                        aria-label="Delete this role"
                        className="p-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 transition-colors cursor-pointer"
                      >
                        <Trash2 size={15} />
                      </button>
                    </>
                  )}

                  {activeRole.is_protected && (
                    <div className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-300 text-xs font-semibold flex items-center gap-1.5">
                      <Lock size={13} className="text-amber-600 dark:text-amber-400" />
                      <span>Owner permissions are permanent root (* &rarr; all).</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Authorized Signatory Authority Radio Selector Banner */}
              <div className="px-5 py-3.5 border-b border-slate-200/90 dark:border-white/10 bg-gradient-to-r from-purple-50/70 via-indigo-50/40 to-slate-50 dark:from-purple-950/25 dark:via-indigo-950/20 dark:to-slate-900/40">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/60 flex items-center justify-center text-purple-700 dark:text-purple-300 shrink-0 mt-0.5">
                      <PenTool size={15} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          Authorized Signatory Authority
                        </span>
                        {activeIsSignatory ? (
                          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-700/50">
                            Authorized Signatory
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-white/10">
                            Standard Role
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Designates members in this role with legal authority to counter-sign official California contracts &amp; agreements.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200/90 dark:border-white/10 shrink-0">
                    <label className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                      !activeIsSignatory
                        ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold'
                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                    }`}>
                      <input
                        type="radio"
                        name="active_role_signatory"
                        checked={!activeIsSignatory}
                        disabled={activeRole.is_protected}
                        onChange={() => handleSignatoryChange(false)}
                        className="text-sky-600 focus:ring-sky-500"
                      />
                      <span>Standard Role</span>
                    </label>

                    <label className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                      activeIsSignatory
                        ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-900 dark:text-purple-200 shadow-2xs font-bold border border-purple-200 dark:border-purple-800/50'
                        : 'text-slate-500 hover:text-purple-700 dark:text-slate-400'
                    }`}>
                      <input
                        type="radio"
                        name="active_role_signatory"
                        checked={activeIsSignatory}
                        disabled={activeRole.is_protected}
                        onChange={() => handleSignatoryChange(true)}
                        className="text-purple-600 focus:ring-purple-500"
                      />
                      <span>Authorized Signatory</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Module Search & Filter Bar */}
              <div className="p-3 border-b border-slate-100 dark:border-white/5 bg-white dark:bg-slate-900/40 flex items-center justify-between gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  <input
                    type="text"
                    value={searchModule}
                    onChange={(e) => setSearchModule(e.target.value)}
                    placeholder="Search module (e.g. leads, pipeline, finances)..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Access Legend:</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10">
                    None
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50">
                    Own Only
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/50">
                    Assigned
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
                    Org-Wide
                  </span>
                </div>
              </div>

              {/* Module Radios Table / Rows */}
              <div className="divide-y divide-slate-100 dark:divide-white/5">
                {filteredModules.map((module) => {
                  const modConfig = activeModules[module.id] || { view: 'none', manage: false };
                  const isProtected = activeRole.is_protected;
                  const Icon = module.icon;
                  const currentView = isProtected ? 'all' : modConfig.view;
                  const currentManage = isProtected ? true : modConfig.manage;
                  const canManageDisabled = isProtected || currentView === 'none';

                  // Compute summary badge
                  let summaryBadge = {
                    label: 'No Access',
                    className: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10',
                  };
                  if (currentView !== 'none') {
                    let scopeText = 'Org-Wide';
                    if (currentView === 'own') scopeText = 'Own Only';
                    else if (currentView === 'assigned') scopeText = 'Assigned';

                    if (currentManage) {
                      summaryBadge = {
                        label: `Full Manage (${scopeText})`,
                        className: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 font-black',
                      };
                    } else {
                      summaryBadge = {
                        label: `View Only (${scopeText})`,
                        className: 'bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/50 font-bold',
                      };
                    }
                  }

                  return (
                    <div
                      key={module.id}
                      className="p-4 hover:bg-slate-50/50 hover:dark:bg-slate-800/30 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      {/* Left: Module Info */}
                      <div className="flex items-start gap-3 md:w-5/12">
                        <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 shadow-2xs ${module.accentColor}`}>
                          <Icon size={17} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900 dark:text-white">{module.label}</span>
                            <span className={`px-2 py-0.2 rounded-full text-[10px] uppercase tracking-wider border ${summaryBadge.className}`}>
                              {summaryBadge.label}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">
                            {module.description}
                          </p>
                        </div>
                      </div>

                      {/* Right: The Radios Control Box */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4 md:w-7/12 justify-end">
                        {/* 1. View Access Radios */}
                        <div className="space-y-1">
                          <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                            View Access
                          </label>
                          <div className="inline-flex items-center p-1 bg-slate-100/90 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-white/10 gap-1 shadow-2xs">
                            {/* None */}
                            <button
                              type="button"
                              disabled={isProtected}
                              onClick={() => handleViewChange(module.id, 'none')}
                              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                                currentView === 'none'
                                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold border border-slate-200 dark:border-white/10'
                                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 hover:dark:text-white'
                              } ${isProtected ? 'opacity-60 cursor-not-allowed' : ''}`}
                            >
                              None
                            </button>

                            {/* Scoped Options */}
                            {module.scoped ? (
                              <>
                                <button
                                  type="button"
                                  disabled={isProtected}
                                  onClick={() => handleViewChange(module.id, 'own')}
                                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                                    currentView === 'own'
                                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-2xs font-bold'
                                      : 'text-slate-500 dark:text-slate-400 hover:text-amber-600 hover:dark:text-amber-300'
                                  } ${isProtected ? 'opacity-60 cursor-not-allowed' : ''}`}
                                  title="Can only view records created by this user (e.g. Door Knocker)"
                                >
                                  Own Only
                                </button>
                                <button
                                  type="button"
                                  disabled={isProtected}
                                  onClick={() => handleViewChange(module.id, 'assigned')}
                                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                                    currentView === 'assigned'
                                      ? 'bg-sky-600 text-white shadow-2xs font-bold'
                                      : 'text-slate-500 dark:text-slate-400 hover:text-sky-600 hover:dark:text-sky-300'
                                  } ${isProtected ? 'opacity-60 cursor-not-allowed' : ''}`}
                                  title="Can view records assigned to user or created by them (e.g. Sales Rep)"
                                >
                                  Assigned
                                </button>
                                <button
                                  type="button"
                                  disabled={isProtected}
                                  onClick={() => handleViewChange(module.id, 'all')}
                                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                                    currentView === 'all'
                                      ? 'bg-emerald-600 text-white shadow-2xs font-bold'
                                      : 'text-slate-500 dark:text-slate-400 hover:text-emerald-600 hover:dark:text-emerald-300'
                                  } ${isProtected ? 'opacity-60 cursor-not-allowed' : ''}`}
                                  title="Can view all organization records (e.g. Door Knocker Lead / Manager)"
                                >
                                  Org-Wide
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                disabled={isProtected}
                                onClick={() => handleViewChange(module.id, 'all')}
                                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                                  currentView === 'all'
                                    ? 'bg-emerald-600 text-white shadow-2xs font-bold'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 hover:dark:text-white'
                                } ${isProtected ? 'opacity-60 cursor-not-allowed' : ''}`}
                              >
                                Can View
                              </button>
                            )}
                          </div>
                        </div>

                        {/* 2. Manage Access Radios */}
                        <div className="space-y-1">
                          <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                            Manage Access
                          </label>
                          <div className={`inline-flex items-center p-1 rounded-xl border gap-1 shadow-2xs ${
                            canManageDisabled ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-200/60 dark:border-white/5 opacity-60' : 'bg-slate-100/90 dark:bg-slate-800/80 border-slate-200 dark:border-white/10'
                          }`}>
                            <button
                              type="button"
                              disabled={canManageDisabled}
                              onClick={() => handleManageChange(module.id, false)}
                              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                                !currentManage
                                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold border border-slate-200 dark:border-white/10'
                                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 hover:dark:text-white'
                              } ${canManageDisabled ? 'cursor-not-allowed' : ''}`}
                            >
                              Read Only
                            </button>

                            <button
                              type="button"
                              disabled={canManageDisabled}
                              onClick={() => handleManageChange(module.id, true)}
                              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                                currentManage
                                  ? 'bg-gradient-to-r from-[#E06800] to-[#FF8A00] text-white shadow-2xs font-bold'
                                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 hover:dark:text-white'
                              } ${canManageDisabled ? 'cursor-not-allowed' : ''}`}
                              title="Allows creating, updating, editing, and deleting records in this module"
                            >
                              Can Manage
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Sticky Save Bar if unsaved */}
              {hasUnsavedChanges && !activeRole.is_protected && (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border-t border-amber-200 dark:border-amber-800/50 flex items-center justify-between animate-in slide-in-from-bottom-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-amber-900 dark:text-amber-200">
                    <AlertCircle size={15} className="text-amber-600 dark:text-amber-400" />
                    <span>You have unsaved radio changes for <strong>{activeRole.name}</strong>.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveModules(activeRole.modules || {});
                        setHasUnsavedChanges(false);
                      }}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-amber-100/60 dark:hover:bg-white/10 cursor-pointer"
                    >
                      Reset
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveChanges}
                      disabled={isSaving}
                      className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      {isSaving ? <RotateCcw size={12} className="animate-spin" /> : <Save size={12} />}
                      <span>Save Role Changes</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Create New Role Modal */}
      {isCreateRoleOpen &&
        createPortal(
          <div
            onClick={() => setIsCreateRoleOpen(false)}
            className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-5 bg-slate-950/65 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200 select-none"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl bg-white/95 dark:bg-[#0B1320]/95 backdrop-blur-xl border border-white/60 dark:border-white/10 shadow-2xl dark:shadow-[0_25px_90px_rgba(0,0,0,0.85)] p-6 relative space-y-4 my-auto max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200"
            >
              <button
                type="button"
                onClick={() => setIsCreateRoleOpen(false)}
                className="absolute top-4 right-4 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-white cursor-pointer transition-colors"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#E06800] to-[#FF8A00] flex items-center justify-center text-white font-bold shadow-md">
                  <Shield size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Create New Custom Role</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Define an operational role with preset module permissions.
                  </p>
                </div>
              </div>

              <form onSubmit={handleCreateRole} className="space-y-3.5">
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
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Signatory Authority
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <label
                      className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                        !newRoleIsSignatory
                          ? 'border-sky-400 dark:border-sky-500 bg-sky-50/60 dark:bg-sky-950/40 ring-1 ring-sky-400/20'
                          : 'border-slate-200 dark:border-white/10 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="create_role_signatory"
                        checked={!newRoleIsSignatory}
                        onChange={() => setNewRoleIsSignatory(false)}
                        className="mt-0.5 text-sky-600 focus:ring-sky-500"
                      />
                      <div>
                        <span className="block text-xs font-bold text-slate-900 dark:text-white">
                          Standard Role
                        </span>
                        <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                          Operational permissions only. Cannot execute contracts.
                        </span>
                      </div>
                    </label>

                    <label
                      className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                        newRoleIsSignatory
                          ? 'border-purple-500 bg-purple-50/80 dark:bg-purple-950/40 ring-1 ring-purple-500/20'
                          : 'border-slate-200 dark:border-white/10 hover:border-purple-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="create_role_signatory"
                        checked={newRoleIsSignatory}
                        onChange={() => setNewRoleIsSignatory(true)}
                        className="mt-0.5 text-purple-600 focus:ring-purple-500"
                      />
                      <div>
                        <span className="block text-xs font-bold text-purple-900 dark:text-purple-300 flex items-center gap-1">
                          <PenTool size={12} className="text-purple-600" /> Authorized Signatory
                        </span>
                        <span className="block text-[11px] text-purple-700/80 dark:text-purple-300/80">
                          Designated to counter-sign official CSLB contracts.
                        </span>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsCreateRoleOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#E06800] to-[#FF8A00] hover:from-[#C85A00] hover:to-[#E06800] shadow-md transition-all cursor-pointer"
                  >
                    Create Role
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* 4. Accessible Confirm Dialog: Switch Role with Unsaved Changes */}
      <ConfirmDialog
        isOpen={pendingSwitchRole !== null}
        title="Unsaved Permission Changes"
        message={`You have unsaved changes to role permissions. Discard changes and switch to "${pendingSwitchRole?.name}"?`}
        confirmLabel="Discard & Switch"
        variant="warning"
        onConfirm={() => {
          if (pendingSwitchRole) {
            applySelectRole(pendingSwitchRole);
          }
        }}
        onCancel={() => setPendingSwitchRole(null)}
      />

      {/* 5. Accessible Confirm Dialog: Delete Role */}
      <ConfirmDialog
        isOpen={roleToDelete !== null}
        title="Delete Role"
        message={`Are you sure you want to delete role "${roleToDelete?.name}"? Users assigned to this role will lose their permission profiles.`}
        confirmLabel="Delete Role"
        variant="danger"
        onConfirm={confirmDeleteRole}
        onCancel={() => setRoleToDelete(null)}
      />
    </div>
  );
}
