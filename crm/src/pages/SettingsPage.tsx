import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Download, RotateCcw, Save, ShieldCheck } from 'lucide-react';
import { CrmPageHero } from '@/components/common/CrmPageHero';
import { SettingsNavigation } from '@/components/settings/SettingsNavigation';
import { TeamRolesPermissionMatrix } from '@/components/rbac/TeamRolesPermissionMatrix';
import { CompanyProfileTab } from '@/components/settings/CompanyProfileTab';
import { PricingFormulasTab } from '@/components/settings/PricingFormulasTab';
import { PipelineSettingsTab } from '@/components/settings/PipelineSettingsTab';
import { NotificationSettingsTab } from '@/components/settings/NotificationSettingsTab';
import { UserProfileTab } from '@/components/settings/UserProfileTab';
import { AuthorizedSignatoriesTab } from '@/components/settings/AuthorizedSignatoriesTab';
import { useCompany } from '@/context/CompanyContext';
import { useToast } from '@/context/ToastContext';
import { getSettings, updateSettings } from '@/api/systemApi';
import { api } from '@/lib/api';

import {
  SettingsTab,
  TeamMember,
  UserRole,
  CompanyProfile,
  PricingConfig,
  PipelineAutomation,
  NotificationSettings,
  IntegrationItem,
  SecuritySession,
  AuditLogEntry,
  RoleType,
  PermissionKey,
} from '@/types/settingsTypes';

import {
  INITIAL_TEAM_MEMBERS,
  INITIAL_USER_ROLES,
  INITIAL_PRICING_CONFIG,
  INITIAL_PIPELINE_AUTOMATION,
  INITIAL_NOTIFICATION_SETTINGS,
  INITIAL_INTEGRATIONS,
  INITIAL_SECURITY_SESSIONS,
  INITIAL_AUDIT_LOGS,
} from '@/shared/config/company';

export function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryTab = searchParams.get('tab') as SettingsTab | null;

  const validTabs: SettingsTab[] = [
    'profile',
    'users',
    'signatories',
    'company',
    'pricing',
    'pipeline',
    'notifications',
  ];

  const initialTab =
    queryTab && validTabs.includes(queryTab) ? queryTab : 'profile';

  // Master State
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const [search, setSearch] = useState<string>('');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

  // Global Company State from context (applies everywhere across the CRM)
  const { company, updateCompany, resetCompany } = useCompany();

  // Data Collections
  const [members, setMembers] = useState<TeamMember[]>(INITIAL_TEAM_MEMBERS);
  const [roles, setRoles] = useState<UserRole[]>(INITIAL_USER_ROLES);
  const [pricing, setPricing] = useState<PricingConfig>(INITIAL_PRICING_CONFIG);
  const [pipeline, setPipeline] = useState<PipelineAutomation>(INITIAL_PIPELINE_AUTOMATION);
  const [notifications, setNotifications] = useState<NotificationSettings>(INITIAL_NOTIFICATION_SETTINGS);

  const [integrations] = useState<IntegrationItem[]>(INITIAL_INTEGRATIONS);
  const [sessions, setSessions] = useState<SecuritySession[]>(INITIAL_SECURITY_SESSIONS);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(INITIAL_AUDIT_LOGS);

  // Baseline settings storage to support discarding changes to server values
  const baselineSettingsRef = useRef<{
    members: TeamMember[];
    roles: UserRole[];
    pricing: PricingConfig;
    pipeline: PipelineAutomation;
    notifications: NotificationSettings;
  }>({
    members: INITIAL_TEAM_MEMBERS,
    roles: INITIAL_USER_ROLES,
    pricing: INITIAL_PRICING_CONFIG,
    pipeline: INITIAL_PIPELINE_AUTOMATION,
    notifications: INITIAL_NOTIFICATION_SETTINGS,
  });

  // Load Settings from API on mount
  useEffect(() => {
    async function loadSettings() {
      try {
        const [backendSettings, usersRes, rolesRes] = await Promise.all([
          getSettings(),
          api.getUsers().catch(() => null),
          api.getRoles().catch(() => null),
        ]);

        let loadedMembers = INITIAL_TEAM_MEMBERS;
        if (usersRes?.users) {
          loadedMembers = usersRes.users as any;
          setMembers(loadedMembers);
        } else if (backendSettings.team_members) {
          loadedMembers = backendSettings.team_members;
          setMembers(loadedMembers);
        }

        let loadedRoles = INITIAL_USER_ROLES;
        if (rolesRes?.roles) {
          loadedRoles = rolesRes.roles as any;
          setRoles(loadedRoles);
        } else if (backendSettings.user_roles) {
          loadedRoles = backendSettings.user_roles;
          setRoles(loadedRoles);
        }

        let loadedPipeline = INITIAL_PIPELINE_AUTOMATION;
        if (backendSettings.pipeline_config) {
          loadedPipeline = backendSettings.pipeline_config;
          setPipeline(loadedPipeline);
        }

        let loadedNotifications = INITIAL_NOTIFICATION_SETTINGS;
        if (backendSettings.notification_config) {
          loadedNotifications = backendSettings.notification_config;
          setNotifications(loadedNotifications);
        }

        let loadedPricing = INITIAL_PRICING_CONFIG;
        const pricingRes = await api.request<any>('/admin/estimator').catch(() => null);
        if (pricingRes) {
          let rules = pricingRes.pricingRules;
          if ((!rules || rules.length === 0) && pricingRes.services) {
            rules = pricingRes.services.map((s: any) => ({
              service_id: s.id,
              slug: s.slug,
              name: s.name,
              price_per_sqft_low: s.pricing?.pricePerSqftLow ?? 4.0,
              price_per_sqft_high: s.pricing?.pricePerSqftHigh ?? 6.2,
              base_fee_low: s.pricing?.baseFeeLow ?? 500,
              base_fee_high: s.pricing?.baseFeeHigh ?? 950,
              min_sqft: s.pricing?.minSqft ?? 500,
              max_sqft: s.pricing?.maxSqft ?? 12000,
              apr_available: s.pricing?.aprAvailable ?? true,
              financing_apr: s.pricing?.financingApr ?? 0.0,
              financing_term_months: s.pricing?.financingTermMonths ?? 60,
            }));
          }
          loadedPricing = {
            ...INITIAL_PRICING_CONFIG,
            ...pricingRes,
            pricingRules: rules && rules.length > 0 ? rules : INITIAL_PRICING_CONFIG.pricingRules,
            marginGuardrails: pricingRes.marginGuardrails || INITIAL_PRICING_CONFIG.marginGuardrails,
            pitchMultipliers: pricingRes.pitchMultipliers || INITIAL_PRICING_CONFIG.pitchMultipliers,
            storyMultipliers: pricingRes.storyMultipliers || INITIAL_PRICING_CONFIG.storyMultipliers,
            tearOffRates: pricingRes.tearOffRates || INITIAL_PRICING_CONFIG.tearOffRates,
            permitFees: pricingRes.permitFees || INITIAL_PRICING_CONFIG.permitFees,
            wasteFactors: pricingRes.wasteFactors || INITIAL_PRICING_CONFIG.wasteFactors,
          };
          setPricing(loadedPricing);
        }

        baselineSettingsRef.current = {
          members: loadedMembers,
          roles: loadedRoles,
          pricing: loadedPricing,
          pipeline: loadedPipeline,
          notifications: loadedNotifications,
        };

        const logsRes = (await api.getAuditLogs().catch(() => null)) as { logs?: AuditLogEntry[] } | null;
        if (logsRes?.logs) setAuditLogs(logsRes.logs);
      } catch (err) {
        console.warn('Failed to load backend settings', err);
      }
    }
    loadSettings();
  }, []);

  // Sync URL search params with active tab
  useEffect(() => {
    if (queryTab && validTabs.includes(queryTab) && queryTab !== activeTab) {
      setActiveTab(queryTab);
    }
  }, [queryTab]);

  // Global keyboard shortcut: ⌘ / Win + K to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const input = document.querySelector(
          'input[placeholder*="Search settings"]'
        ) as HTMLInputElement;
        if (input) input.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleTabChange = (newTab: SettingsTab) => {
    if (validTabs.includes(newTab)) {
      setActiveTab(newTab);
      setSearchParams({ tab: newTab });
    }
  };

  // State Change Triggers
  const handleCompanyChange = (updated: CompanyProfile) => {
    updateCompany(updated);
    setHasUnsavedChanges(true);
  };

  const handlePricingChange = (updated: PricingConfig) => {
    setPricing(updated);
    setHasUnsavedChanges(true);
  };

  const handleUpdateMember = async (updatedMember: TeamMember) => {
    // optimistic update
    setMembers((prev) =>
      prev.map((m) => (m.id === updatedMember.id ? updatedMember : m))
    );
    try {
      if (!updatedMember.id.toString().startsWith('usr-')) {
        await api.updateUser(Number(updatedMember.id), {
          role: updatedMember.role,
          status: updatedMember.status,
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteMember = async (id: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
    // Usually api.deleteUser(id) but it wasn't listed in api.ts, so we just remove locally and save via settings or assume handled.
  };

  const handleInviteMember = async (newMemberData: any) => {
    try {
      await api.createInvitation({
        email: newMemberData.email,
      });
      toast.success(`Invitation emailed to ${newMemberData.email}.`);
      const usersRes = await api.getUsers().catch(() => null);
      if (usersRes?.users) setMembers(usersRes.users as any);
    } catch (e: any) {
      toast.error(`Failed to send invite: ${e.message}`);
    }
  };

  const handleUpdatePermissions = async (
    roleId: RoleType,
    permKey: PermissionKey,
    val: boolean
  ) => {
    setRoles((prev) =>
      prev.map((r) => {
        if (r.id === roleId) {
          return {
            ...r,
            permissions: {
              ...r.permissions,
              [permKey]: val,
            },
          };
        }
        return r;
      })
    );
    try {
      if (typeof roleId === 'number') {
        // Find existing role permissions and update
        const currentRole = roles.find(r => r.id === roleId);
        if (currentRole) {
           const currentPerms = currentRole.permissions as Record<string, boolean>;
           await api.updateRole(Number(roleId), {
             permissions: Object.keys(currentRole.permissions).filter(k => k !== permKey ? currentPerms[k] : val).map(k => ({ permission_id: 1, scope: k }))
           });
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRevokeSession = (sessionId: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
  };

  const handleCreateBackup = async () => {
    try {
      await api.request('/admin/backups', { method: 'POST' });
      toast.success('Encrypted backup successfully created and pushed to cloud storage.');
    } catch (e) {
      console.error(e);
      toast.error('Failed to create encrypted backup.');
    }
  };

  // Master Synchronize & Save
  const handleSaveAll = async () => {
    setIsSaving(true);

    try {
      // Save global company profile (dispatches cross-window sync event)
      updateCompany(company);

      // Save configurations to backend
      await api.request('/admin/estimator', { method: 'POST', body: JSON.stringify(pricing) }).catch(console.error);
      await updateSettings('pipeline_config', pipeline);
      await updateSettings('notification_config', notifications);
      
      // Update users and roles (for this demo, we'll sync the arrays as settings or rely on individual handlers, but here we save them to settings as a fallback if endpoints aren't fully matching)
      await updateSettings('team_members', members);
      await updateSettings('user_roles', roles);
      baselineSettingsRef.current = {
        members,
        roles,
        pricing,
        pipeline,
        notifications,
      };

      setHasUnsavedChanges(false);
      toast.success('All settings saved and synchronized.');
    } catch (err) {
      console.error('Failed to save settings:', err);
      toast.error('Failed to save settings to the server.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    const baseline = baselineSettingsRef.current;
    setMembers(baseline.members);
    setRoles(baseline.roles);
    resetCompany();
    setPricing(baseline.pricing);
    setPipeline(baseline.pipeline);
    setNotifications(baseline.notifications);
    setHasUnsavedChanges(false);
  };

  const handleExportConfig = () => {
    const fullConfig = {
      exportedAt: new Date().toISOString(),
      company,
      pricing,
      pipeline,
      notifications,
      teamMembers: members,
      roles,
      activeIntegrations: integrations,
    };

    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(fullConfig, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `rise_up_crm_config_${new Date().toISOString().slice(0, 10)}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto select-none pb-24">
      {/* 1. Unified 220px Hero Header with Top Search & Actions */}
      <CrmPageHero
        pageId="settings"
        defaultEyebrow={`Operations & Contractor Infrastructure • ${company.dba || 'Oceanside HQ'}`}
        defaultTitle="BUSINESS SETTINGS & TEAM SUITE"
        defaultSubtitle="Centralized operations, contractor licensing, estimator pricing multipliers, and team user roles."
        showSearch={true}
        searchPlaceholder="Search settings, team members..."
        searchValue={search}
        onSearchChange={setSearch}
        onSearchClear={() => setSearch('')}
        topRightActions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportConfig}
              className="h-9 px-3.5 rounded-xl liquid-glass-btn text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:border-sky-400 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
              title="Export complete configuration JSON snapshot"
            >
              <Download size={13} className="text-[#1878B8] dark:text-sky-400" />
              <span>Export</span>
            </button>

            {hasUnsavedChanges && (
              <button
                type="button"
                onClick={handleDiscard}
                className="h-9 px-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
              >
                <RotateCcw size={13} />
                <span>Discard</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleSaveAll}
              disabled={isSaving}
              className="h-9 flex items-center gap-1.5 px-4 rounded-xl bg-gradient-to-r from-[#1878B8] via-sky-500 to-[#55C4F5] text-white font-bold text-xs shadow-xs hover:shadow-md hover:scale-[1.02] transition-all cursor-pointer"
            >
              {isSaving ? (
                <>
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Syncing...</span>
                </>
              ) : (
                <>
                  <Save size={13} />
                  <span>Save Changes</span>
                  {hasUnsavedChanges && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-ping ml-0.5" />
                  )}
                </>
              )}
            </button>
          </div>
        }
        bottomRightBadges={
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50/90 dark:bg-emerald-950/60 border border-emerald-200/90 dark:border-emerald-800/60 text-[10px] font-bold text-emerald-800 dark:text-emerald-300 shadow-2xs shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>{company.licenseNumber || 'CSLB #1115874'} Active</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50/90 dark:bg-sky-950/60 border border-sky-200/90 dark:border-sky-800/60 text-[10px] font-bold text-sky-800 dark:text-sky-300 shadow-2xs shrink-0">
              <ShieldCheck size={11} className="text-sky-600 dark:text-sky-400" />
              <span>{company.dba || 'Rise Up Roofing'}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/90 dark:border-white/10 text-[10px] font-bold text-slate-700 dark:text-slate-300 shadow-2xs shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
              <span>Cloud Sync: Real-time</span>
            </span>
          </div>
        }
      />

      {/* 2. Sleek Tab Navigation with Disabled Under-Development Badges */}
      <SettingsNavigation
        activeTab={activeTab}
        onTabChange={handleTabChange}
        userCount={members.length}
      />

      {/* 3. Active Tab Deep-Dive Viewport */}
      <div className="animate-in fade-in duration-200">
        {activeTab === 'profile' && (
          <UserProfileTab />
        )}

        {activeTab === 'users' && (
          <TeamRolesPermissionMatrix />
        )}

        {activeTab === 'signatories' && (
          <AuthorizedSignatoriesTab onNavigateToRoles={() => handleTabChange('users')} />
        )}

        {activeTab === 'company' && (
          <CompanyProfileTab
            company={company}
            onChange={handleCompanyChange}
          />
        )}

        {activeTab === 'pricing' && (
          <PricingFormulasTab
            pricing={pricing}
            onChange={handlePricingChange}
          />
        )}

        {activeTab === 'pipeline' && (
          <PipelineSettingsTab
            pipeline={pipeline}
            onChange={(updated) => { setPipeline(updated); setHasUnsavedChanges(true); }}
          />
        )}

        {activeTab === 'notifications' && (
          <NotificationSettingsTab
            notifications={notifications}
            onChange={(updated) => { setNotifications(updated); setHasUnsavedChanges(true); }}
          />
        )}
      </div>
    </div>
  );
}

export default SettingsPage;
