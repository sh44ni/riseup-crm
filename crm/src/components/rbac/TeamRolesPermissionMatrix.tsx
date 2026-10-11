import React, { useState, useEffect, useMemo } from 'react';
import {
  Shield,
  ShieldCheck,
  Users,
  RotateCcw,
  Search,
  CheckCircle2,
  AlertCircle,
  Plus,
  Save,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { TeamMembersList } from './TeamMembersList';
import { ModuleConfig, Role, MODULE_DEFINITIONS } from './types';
import { RoleSelectorGrid } from './matrix/RoleSelectorGrid';
import { RoleStudioHeader } from './matrix/RoleStudioHeader';
import { ModulePermissionRow } from './matrix/ModulePermissionRow';
import { CreateRoleModal } from './matrix/CreateRoleModal';
import { normalizeSignatureAccess, type SignatureAccess } from '@/lib/signatureAccess';

export function TeamRolesPermissionMatrix() {
  const { isOwner, can } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'matrix' | 'members'>('matrix');
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [activeModules, setActiveModules] = useState<Record<string, ModuleConfig>>({});
  const [, setIsLoading] = useState<boolean>(true);
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

  // Active Role Company Signature Access State
  const [activeSignatureAccess, setActiveSignatureAccess] = useState<SignatureAccess>('none');

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

      if (!selectedRoleId && augmentedRoles.length > 0) {
        const defaultRole = augmentedRoles.find((r) => !r.is_protected) || augmentedRoles[0];
        setSelectedRoleId(defaultRole.id);
        setActiveModules(defaultRole.modules || {});
        setActiveSignatureAccess(normalizeSignatureAccess(defaultRole.signature_access));
      } else if (selectedRoleId) {
        const curr = augmentedRoles.find((r) => r.id === selectedRoleId);
        if (curr) {
          setActiveModules(curr.modules || {});
          setActiveSignatureAccess(normalizeSignatureAccess(curr.signature_access));
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

  const activeRole = useMemo(() => {
    return roles.find((r) => r.id === selectedRoleId) || null;
  }, [roles, selectedRoleId]);

  const applySelectRole = (role: Role) => {
    setSelectedRoleId(role.id);
    setActiveModules(role.modules || {});
    setActiveSignatureAccess(normalizeSignatureAccess(role.signature_access));
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

  const isOwnerRole = activeRole?.name.toLowerCase() === 'owner';
  const isAdminRole = ['administrator', 'admin'].includes(activeRole?.name.toLowerCase() || '');
  const canEditActiveRole = Boolean(activeRole && !isOwnerRole && (isAdminRole ? isOwner : (can('roles.edit') || isOwner)));

  const handleSignatureAccessChange = (level: SignatureAccess) => {
    if (!activeRole || !canEditActiveRole) {
      if (isAdminRole && !isOwner) {
        showToast('Only the Owner can modify Administrator signature access.');
      }
      return;
    }
    if (level === 'edit' && !isOwner) {
      toast.warning('Only the Owner can grant edit access to the company signature.');
      return;
    }
    if (level === activeSignatureAccess) return;
    setActiveSignatureAccess(level);
    setHasUnsavedChanges(true);
  };

  const handleViewChange = (moduleId: string, newView: 'none' | 'own' | 'assigned' | 'all') => {
    if (!activeRole || !canEditActiveRole) {
      if (isAdminRole && !isOwner) {
        showToast('Only the Owner can customize what Administrators can see.');
      }
      return;
    }

    setActiveModules((prev) => {
      const current = prev[moduleId] || { view: 'none', manage: false };
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
    if (!activeRole || !canEditActiveRole) {
      if (isAdminRole && !isOwner) {
        showToast('Only the Owner can customize what Administrators can see.');
      }
      return;
    }

    setActiveModules((prev) => {
      const current = prev[moduleId] || { view: 'none', manage: false };
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
    if (!activeRole || !canEditActiveRole) return;
    setIsSaving(true);
    try {
      await api.updateRole(activeRole.id, {
        modules: activeModules,
        signature_access: activeSignatureAccess,
      });
      showToast(`Permissions and signature access saved successfully for "${activeRole.name}".`);
      setHasUnsavedChanges(false);
      await loadRoles();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save role permissions');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateRole = async (name: string, description: string, signatureAccess: SignatureAccess) => {
    const initialModules: Record<string, ModuleConfig> = {};
    MODULE_DEFINITIONS.forEach((def) => {
      initialModules[def.id] = { view: 'none', manage: false };
    });

    try {
      const res = await api.createRole({
        name,
        description: description || 'Custom operational role',
        signature_access: signatureAccess,
        modules: initialModules,
      });
      showToast(`Role "${name}" created successfully! Configure its permissions below.`);
      setIsCreateRoleOpen(false);
      await loadRoles();
      if (res.role?.id) {
        setSelectedRoleId(res.role.id);
        setActiveModules(res.role.modules || initialModules);
        setActiveSignatureAccess(normalizeSignatureAccess(res.role.signature_access ?? signatureAccess));
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to create role');
    }
  };

  const promptDeleteRole = (role: Role) => {
    const rName = role.name.toLowerCase();
    if (role.is_protected || rName === 'owner' || rName === 'administrator' || rName === 'admin') {
      toast.warning(`Cannot delete permanent system role "${role.name}".`);
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
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 shadow-md transition-all flex items-center gap-2 cursor-pointer"
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

      {activeTab === 'members' && (
        <TeamMembersList roles={roles} onRefresh={loadRoles} />
      )}

      {activeTab === 'matrix' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <RoleSelectorGrid
            roles={roles}
            selectedRoleId={selectedRoleId}
            onSelectRole={handleSelectRole}
          />

          {activeRole && (
            <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden backdrop-blur-md">
              <RoleStudioHeader
                activeRole={activeRole}
                activeSignatureAccess={activeSignatureAccess}
                hasUnsavedChanges={hasUnsavedChanges}
                isSaving={isSaving}
                isOwner={isOwner}
                onSaveChanges={handleSaveChanges}
                onPromptDeleteRole={promptDeleteRole}
                onSignatureAccessChange={handleSignatureAccessChange}
              />

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
                {filteredModules.map((module) => (
                  <ModulePermissionRow
                    key={module.id}
                    module={module}
                    modConfig={activeModules[module.id] || { view: 'none', manage: false }}
                    isProtected={isOwnerRole}
                    disabled={!canEditActiveRole}
                    onViewChange={handleViewChange}
                    onManageChange={handleManageChange}
                  />
                ))}
              </div>

              {/* Bottom Sticky Save Bar if unsaved */}
              {hasUnsavedChanges && canEditActiveRole && (
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
                        setActiveSignatureAccess(normalizeSignatureAccess(activeRole.signature_access));
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

      <CreateRoleModal
        isOpen={isCreateRoleOpen}
        onClose={() => setIsCreateRoleOpen(false)}
        onSubmit={handleCreateRole}
      />

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
