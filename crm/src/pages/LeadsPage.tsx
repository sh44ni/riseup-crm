import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Plus, Download, Users, Zap, PhoneCall, CalendarCheck, DollarSign, AlertTriangle, RefreshCw, AlertCircle, Search } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { CrmPageHero } from '@/components/common/CrmPageHero';
import { UniversalStatCard } from '@/components/common/UniversalStatCard';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useLeads } from '@/hooks/useLeads';
import { api } from '@/lib/api';
import { useDashboardStats } from '@/lib/dashboardStatsStore';
import { exportLeadsToCsv } from '@/lib/leads/exportLeadsCsv';
import { Lead } from '@/types/leadTypes';
import { getServiceBadgeClass } from '@/utils/leadHelpers';
import { CreateLeadPayload } from '@/components/pipeline/CreateLeadModal';

// Components
import { LeadToolbar } from '@/components/leads/LeadToolbar';
import { LeadCard } from '@/components/leads/LeadCard';
import { LeadTableRow } from '@/components/leads/LeadTableRow';
import { LeadModals } from '@/components/leads/LeadModals';
import { LOSS_REASONS } from '@/components/leads/MarkLeadLostModal';

export type { Lead };

export function LeadsPage() {
  const { user, can, isOwner, getScope } = useAuth();
  const leadScope = getScope('leads.view');
  const canViewFinances = isOwner || can('finances.view');
  const canCreateLead = isOwner || can('leads.create');
  const canClaimLead = isOwner || can('leads.claim');
  const canReassignLead = isOwner || can('leads.reassign');

  const { stats } = useDashboardStats();
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const {
    leads,
    totalCount,
    counts,
    isLoading,
    isRefreshing,
    error,
    refresh,
    createLead,
    advanceStage,
    markAsLost,
    reactivateLead,
    addNote,
    updateLeadContact,
    page,
    perPage,
    setPage,
    sources,
  } = useLeads({ search: debouncedSearch || undefined });

  const [search, setSearch] = useState('');
  const [activeStage, setActiveStage] = useState<string>('all');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [selectedRep, setSelectedRep] = useState<string>('all');
  const [selectedService, setSelectedService] = useState<string>('all');
  const [selectedLossReason, setSelectedLossReason] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'value' | 'speed'>('newest');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [openDropdown, setOpenDropdown] = useState<'source' | 'rep' | 'service' | 'loss' | 'sort' | null>(null);

  // Modals & Inspection Drawer
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [inspectLead, setInspectLead] = useState<Lead | null>(null);
  const [lostModalLead, setLostModalLead] = useState<Lead | null>(null);
  const [claimModalLead, setClaimModalLead] = useState<Lead | null>(null);
  const [reassignModalLead, setReassignModalLead] = useState<Lead | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleConfirmClaimLead = async () => {
    if (!claimModalLead) return;
    try {
      await api.claimLead(claimModalLead.id);
      await refresh();
      if (inspectLead && inspectLead.id === claimModalLead.id) {
        setInspectLead((prev) => (prev ? { ...prev, isClaimed: true, assignedRep: user?.name || 'Claimed' } : null));
      }
    } catch (err: any) {
      console.error('Failed to claim lead:', err);
      throw err;
    }
  };

  const handleReassignSuccess = async () => {
    await refresh();
    if (inspectLead && reassignModalLead && inspectLead.id === reassignModalLead.id) {
      setInspectLead(null);
    }
  };

  // Keyboard shortcut: Cmd/Ctrl + K focuses search
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setOpenDropdown(null);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Debounce search input → triggers server-side query via useLeads
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1); // reset to first page on new search
    }, 400);
    return () => clearTimeout(timer);
  }, [search, setPage]);

  // Calculate statistics from full dataset API counts (falling back to in-memory leads array)
  const totalLeads = counts?.all || totalCount || leads.length;
  const activeLeadsCount = counts?.leads ?? leads.filter((l) => l.status !== 'lost').length;
  const lostLeadsCount = counts?.lost_leads ?? leads.filter((l) => l.status === 'lost').length;
  const wonCount = counts?.new_clients ?? leads.filter((l) => l.status === 'contract_won').length;

  const activeLeads = leads.filter((l) => l.status !== 'lost');
  const lostLeads = leads.filter((l) => l.status === 'lost');
  const totalIntakeValue = activeLeads.reduce((acc, l) => acc + l.value, 0);
  const totalLostValue = lostLeads.reduce((acc, l) => acc + l.value, 0);
  const inspectionBookedCount = leads.filter((l) => l.status === 'inspection_scheduled').length;
  const lostRate = totalLeads > 0 ? Math.round((lostLeadsCount / totalLeads) * 100) : 0;
  
  // Avg deal value only from leads with a real estimated value
  const leadsWithValue = activeLeads.filter((l) => l.value > 0);
  const avgDealValue = leadsWithValue.length > 0 ? Math.round(totalIntakeValue / leadsWithValue.length) : 0;
  const wonRate = totalLeads > 0 ? Math.round((wonCount / totalLeads) * 100) : 0;

  // Derive rep list from real DB data (no hardcoded names)
  const repOptions = useMemo(() => [
    'all',
    ...Array.from(new Set(leads.map((l) => l.assignedRep).filter(Boolean))).sort(),
  ], [leads]);

  // Derive service list from real DB data (no hardcoded list)
  const serviceOptions = useMemo(() => [
    'all',
    ...Array.from(new Set(leads.map((l) => l.service).filter(Boolean))).sort(),
  ], [leads]);

  // Filtered Leads
  const filteredLeads = leads
    .filter((lead) => {
      // Stage filter
      // Lost leads live only in the Lost tab; every other tab (incl. All) excludes them
      if (activeStage === 'lost' && lead.status !== 'lost') return false;
      if (activeStage !== 'lost' && lead.status === 'lost') return false;
      if (activeStage !== 'all' && activeStage !== 'lost' && lead.status !== activeStage) return false;

      // Source filter
      if (selectedSource !== 'all') {
        if (selectedSource === 'website' && lead.source !== 'website') return false;
        if (selectedSource === 'manual' && lead.source !== 'manual') return false;
        if (selectedSource !== 'website' && selectedSource !== 'manual' && lead.source !== selectedSource) return false;
      }

      // Rep filter
      if (selectedRep !== 'all' && lead.assignedRep !== selectedRep) return false;

      // Service filter
      if (selectedService !== 'all' && lead.service !== selectedService) return false;

      // Loss Reason filter
      if (activeStage === 'lost' && selectedLossReason !== 'all') {
        if (lead.status !== 'lost' || lead.lossReason !== selectedLossReason) return false;
      }

      // Search query
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchesName = lead.name.toLowerCase().includes(query);
        const matchesPhone = lead.phone.toLowerCase().includes(query);
        const matchesEmail = lead.email.toLowerCase().includes(query);
        const matchesCity = lead.city.toLowerCase().includes(query);
        const matchesAddress = lead.address.toLowerCase().includes(query);
        const matchesService = lead.service.toLowerCase().includes(query);
        const matchesSource = lead.sourceLabel.toLowerCase().includes(query);
        const matchesLoss = lead.lossReason && LOSS_REASONS[lead.lossReason]?.label.toLowerCase().includes(query);
        return (
          matchesName ||
          matchesPhone ||
          matchesEmail ||
          matchesCity ||
          matchesAddress ||
          matchesService ||
          matchesSource ||
          matchesLoss
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'value') return b.value - a.value;
      if (sortBy === 'speed') return (a.speedToCall || '').localeCompare(b.speedToCall || '');
      return 0; // default order
    });

  // Keep inspectLead in sync with live leads updates
  useEffect(() => {
    if (inspectLead) {
      const found = leads.find((l) => l.id === inspectLead.id);
      if (found) {
        setInspectLead(found);
      }
    }
  }, [leads]);

  // Action: Add Lead (created once in CreateLeadModal, refresh live store)
  const handleCreateLead = async (payload: CreateLeadPayload) => {
    try {
      await refresh();
      setShowCreateModal(false);
    } catch (err) {
      console.error('Failed to refresh leads after creation:', err);
    }
  };

  // Action: Mark as Lost
  const handleMarkAsLost = async (
    leadId: string | number,
    reason: string,
    lossNotes?: string
  ) => {
    try {
      await markAsLost(leadId, reason, lossNotes);
    } catch (err) {
      console.error('Failed to mark lead as lost:', err);
    }
  };

  // Action: Reactivate Lead
  const handleReactivateLead = async (leadId: string | number) => {
    try {
      await reactivateLead(leadId);
    } catch (err) {
      console.error('Failed to reactivate lead:', err);
    }
  };

  // Action: Advance Stage
  const handleAdvanceStage = async (leadId: string | number, nextStage: Lead['status']) => {
    try {
      await advanceStage(leadId, nextStage);
    } catch (err) {
      console.error('Failed to advance stage:', err);
    }
  };

  // Action: Export CSV
  const handleExportCsv = () => {
    exportLeadsToCsv(filteredLeads);
  };

  return (
    <div className="space-y-3 w-full select-none pb-12">
      <CrmPageHero
        pageId="leads"
        defaultEyebrow="Intake & Conversion Pipeline • North County San Diego"
        defaultTitle="LEADS & INTAKE DIRECTORY"
        defaultSubtitle="Live homeowner inquiries, fast dispatch SLAs, and loss root-cause intelligence."
        showSearch={true}
        searchPlaceholder="Search leads, phones, addresses, cities, loss reasons..."
        searchValue={search}
        onSearchChange={setSearch}
        onSearchClear={() => setSearch('')}
        searchRef={searchInputRef}
        topRightActions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => refresh()}
              disabled={isRefreshing}
              title="Refresh leads from PostgreSQL backend"
              className="h-9 flex items-center gap-1.5 px-3 rounded-xl liquid-glass-btn text-xs font-bold text-slate-800 shadow-2xs hover:border-sky-400 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={13} className={`text-slate-600 ${isRefreshing ? 'animate-spin text-sky-600' : ''}`} />
              <span className="hidden sm:inline">{isRefreshing ? 'Syncing...' : 'Refresh'}</span>
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              className="h-9 flex items-center gap-1.5 px-3.5 rounded-xl liquid-glass-btn text-xs font-bold text-slate-800 shadow-2xs hover:border-sky-400 transition-all cursor-pointer"
            >
              <Download size={13} className="text-slate-600" />
              <span>Export CSV</span>
            </button>
            {canCreateLead && (
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="h-9 flex items-center gap-1.5 px-4 rounded-xl bg-gradient-to-r from-[#1878B8] via-[#0284c7] to-[#38bdf8] text-white text-xs font-bold shadow-md shadow-sky-500/25 hover:shadow-lg hover:shadow-sky-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer border border-sky-300/40"
              >
                <Plus size={14} className="stroke-[3]" />
                <span>New Lead</span>
              </button>
            )}
          </div>
        }
        bottomRightBadges={
          <>
            {leadScope === 'own' && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50/90 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700/60 text-[10px] font-bold text-amber-900 dark:text-amber-300 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                <span>Viewing: My Created Leads Only</span>
              </div>
            )}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50/90 border border-emerald-200/90 text-[10px] font-bold text-emerald-800 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>PostgreSQL Live: {leads.length} Leads</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-sky-50/90 border border-sky-200/90 text-[10px] font-bold text-sky-800 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
              <span>FastAPI Backend: Synced</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-50/90 border border-indigo-200/90 text-[10px] font-bold text-indigo-800 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              <span>Active Intake: {activeLeads.length}</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-50/90 border border-rose-200/90 text-[10px] font-bold text-rose-800 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              <span>Lost Archive: {lostLeads.length} Tracked</span>
            </div>
          </>
        }
      />

      <ErrorBoundary fallbackTitle="Lead Performance Metrics Temporarily Unavailable">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <UniversalStatCard
            label="Total Inbound"
            value={totalLeads}
            icon={Users}
            iconGradient="from-[#1878B8] to-[#55C4F5]"
            color="#0284c7"
            hoverBorderColor="hover:border-sky-400"
            blurColor="bg-sky-400/15 group-hover:bg-sky-400/25"
            footnoteLeft={`${activeLeadsCount} active`}
            footnoteRight={<span className="text-[#1878B8] font-bold">{lostLeadsCount} lost</span>}
            sharePct={totalLeads > 0 ? Math.round((activeLeadsCount / totalLeads) * 100) : 100}
            shareLabel="Active share"
            stageLabel="Lead Generation"
            sparklineData={stats?.sparklines?.newLeads}
          />
          <UniversalStatCard
            label="Active Pipeline"
            value={activeLeadsCount}
            icon={Zap}
            iconGradient="from-emerald-600 to-teal-400"
            color="#10b981"
            hoverBorderColor="hover:border-emerald-400"
            blurColor="bg-emerald-400/15 group-hover:bg-emerald-400/25"
            footnoteLeft={`${leads.filter((l) => l.status === 'new_lead').length} new`}
            footnoteRight={<span className="text-emerald-700 font-bold">{leads.filter((l) => l.status === 'contacted').length} contacted</span>}
            sharePct={totalLeads > 0 ? Math.round((activeLeadsCount / totalLeads) * 100) : 100}
            shareLabel="Active share"
            stageLabel="In Pipeline"
            sparklineData={stats?.sparklines?.contacted}
          />
          <UniversalStatCard
            label="Won Rate"
            value={`${wonRate}%`}
            icon={PhoneCall}
            iconGradient="from-[#0284C7] to-[#38BDF8]"
            color="#06b6d4"
            hoverBorderColor="hover:border-cyan-400"
            blurColor="bg-cyan-400/15 group-hover:bg-cyan-400/25"
            footnoteLeft={`${wonCount} contracts`}
            footnoteRight={<span className="text-cyan-700 font-bold">of {totalLeads} leads</span>}
            sharePct={wonRate || 0}
            shareLabel="Win rate"
            stageLabel="Conversions"
            sparklineData={stats?.sparklines?.jobsWon}
          />
          <UniversalStatCard
            label="Inspections Booked"
            value={inspectionBookedCount}
            icon={CalendarCheck}
            iconGradient="from-[#7C3AED] to-[#A855F7]"
            color="#8b5cf6"
            hoverBorderColor="hover:border-purple-400"
            blurColor="bg-purple-400/15 group-hover:bg-purple-400/25"
            footnoteLeft={totalLeads > 0 ? `${Math.round((inspectionBookedCount / totalLeads) * 100)}% conversion` : 'No data'}
            footnoteRight={<span className="text-purple-700 font-bold">{leads.filter((l) => l.status === 'proposal_sent').length} proposals out</span>}
            sharePct={totalLeads > 0 ? Math.round((inspectionBookedCount / totalLeads) * 100) : 0}
            shareLabel="Booking share"
            stageLabel="Site Survey"
            sparklineData={stats?.sparklines?.estScheduled}
          />
          <UniversalStatCard
            label={canViewFinances ? "Pipeline Value" : "Active Inquiries"}
            value={canViewFinances ? (totalIntakeValue > 0 ? `$${(totalIntakeValue / 1000).toFixed(0)}k` : '—') : `${activeLeadsCount} Leads`}
            icon={DollarSign}
            iconGradient="from-[#D97706] to-[#FBBF24]"
            color="#f59e0b"
            hoverBorderColor="hover:border-amber-400"
            blurColor="bg-amber-400/15 group-hover:bg-amber-400/25"
            footnoteLeft={canViewFinances ? (avgDealValue > 0 ? `Avg $${(avgDealValue / 1000).toFixed(1)}k` : 'Estimates pending') : 'Scoped team leads'}
            footnoteRight={<span className="text-amber-700 font-bold">{wonCount} won</span>}
            sharePct={leadsWithValue.length > 0 ? Math.round((leadsWithValue.length / totalLeads) * 100) : 0}
            shareLabel={canViewFinances ? "Have estimates" : "Active status"}
            stageLabel="Pipeline Intake"
            sparklineData={stats?.sparklines?.estSent}
          />
          <UniversalStatCard
            label="Lost Opportunities"
            value={`${lostLeads.length} Lost`}
            deltaLabel={totalLeads > 0 ? `${lostRate}% rate` : undefined}
            icon={AlertTriangle}
            iconGradient="from-rose-600 to-rose-400"
            color="#f43f5e"
            hoverBorderColor="hover:border-rose-400"
            blurColor="bg-rose-400/15 group-hover:bg-rose-400/25"
            footnoteLeft={canViewFinances ? (totalLostValue > 0 ? `$${(totalLostValue / 1000).toFixed(0)}k lost value` : 'No value data') : `${lostLeads.length} lost records`}
            footnoteRight={<span className="text-rose-600 font-bold">{lostRate}% loss rate</span>}
            sharePct={lostRate || 0}
            shareLabel="Loss percentage"
            stageLabel="Loss Prevention"
            sparklineData={stats?.sparklines?.lostClosed}
          />
        </div>
      </ErrorBoundary>

      <LeadToolbar
        leads={leads}
        totalLeads={Math.max(totalLeads - lostLeadsCount, 0)}
        lostLeads={lostLeads}
        activeStage={activeStage}
        setActiveStage={setActiveStage}
        openDropdown={openDropdown}
        setOpenDropdown={setOpenDropdown}
        selectedSource={selectedSource}
        setSelectedSource={setSelectedSource}
        sources={sources}
        selectedRep={selectedRep}
        setSelectedRep={setSelectedRep}
        repOptions={repOptions}
        selectedService={selectedService}
        setSelectedService={setSelectedService}
        serviceOptions={serviceOptions}
        selectedLossReason={selectedLossReason}
        setSelectedLossReason={setSelectedLossReason}
        search={search}
        setSearch={setSearch}
        filteredLeadsLength={filteredLeads.length}
        sortBy={sortBy}
        setSortBy={setSortBy}
        viewMode={viewMode}
        setViewMode={setViewMode}
      />

      <ErrorBoundary fallbackTitle="Lead Registry Temporarily Unavailable">
        {error && leads.length === 0 ? (
          <div className="light-glass-card rounded-2xl p-12 text-center border border-rose-200/80 bg-rose-50/40 backdrop-blur-2xl space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-2xs">
              <AlertCircle size={24} />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900">Database Connection Notice</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">{error}</p>
            </div>
            <button
              type="button"
              onClick={() => refresh()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1878B8] hover:bg-sky-600 text-white text-xs font-bold shadow-md shadow-sky-500/20 transition-all cursor-pointer"
            >
              <RefreshCw size={13} />
              <span>Retry Connection</span>
            </button>
          </div>
        ) : isLoading ? (
          <div className="light-glass-card rounded-2xl p-6 border border-white/85 dark:border-white/10 shadow-sm backdrop-blur-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="h-4 w-40 bg-slate-200/80 rounded animate-pulse" />
              <div className="h-4 w-24 bg-slate-200/80 rounded animate-pulse" />
            </div>
            <div className="space-y-2.5">
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <div key={i} className="h-14 bg-slate-100/80 rounded-xl animate-pulse flex items-center px-4 justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-200" />
                    <div className="space-y-1.5">
                      <div className="w-36 h-3.5 bg-slate-200 rounded" />
                      <div className="w-24 h-2.5 bg-slate-200/60 rounded" />
                    </div>
                  </div>
                  <div className="w-24 h-4 bg-slate-200 rounded hidden md:block" />
                  <div className="w-20 h-4 bg-slate-200 rounded hidden sm:block" />
                  <div className="w-20 h-6 bg-slate-200 rounded" />
                </div>
              ))}
            </div>
          </div>
        ) : viewMode === 'table' ? (
          <div className="light-glass-card rounded-2xl overflow-hidden border border-white/85 dark:border-white/10 shadow-[0_10px_32px_rgba(15,23,42,0.06)] backdrop-blur-2xl">
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/90 dark:bg-slate-900/80 border-b border-slate-200/80 dark:border-white/10 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="px-4 py-3">Homeowner & Property</th>
                    <th className="px-3 py-3">Direct Contact</th>
                    <th className="px-3 py-3">Roofing Service</th>
                    {activeStage === 'lost' && <th className="px-3 py-3 text-center">Loss Root Cause</th>}
                    <th className="px-3 py-3">Source</th>
                    <th className="px-3 py-3">Estimator</th>
                    <th className="px-3 py-3 text-right">Value</th>
                    <th className="px-3 py-3">Stage</th>
                    <th className="px-3 py-3">Received / SLA</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 dark:divide-white/5">
                  {filteredLeads.length === 0 ? (
                    <tr>
                      <td colSpan={activeStage === 'lost' ? 10 : 9} className="px-4 py-12 text-center text-slate-400 dark:text-slate-500">
                        <div className="flex flex-col items-center gap-2">
                          <Search size={24} className="text-slate-300 dark:text-slate-600" />
                          <div className="text-sm font-bold text-slate-700 dark:text-slate-200">No leads match your active filters</div>
                          <div className="text-xs text-slate-400 dark:text-slate-500">Try adjusting your search keywords or resetting filters</div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredLeads.map((lead) => (
                      <LeadTableRow
                        key={lead.id}
                        lead={lead}
                        activeStage={activeStage}
                        canViewFinances={canViewFinances}
                        canClaimLead={canClaimLead}
                        canReassignLead={canReassignLead}
                        setInspectLead={setInspectLead}
                        setClaimModalLead={setClaimModalLead}
                        setReassignModalLead={setReassignModalLead}
                        setLostModalLead={setLostModalLead}
                        handleReactivateLead={handleReactivateLead}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="light-glass-card rounded-2xl p-12 text-center border border-white/85 dark:border-white/10 shadow-sm backdrop-blur-2xl">
            <div className="flex flex-col items-center gap-2">
              <Search size={28} className="text-slate-300" />
              <div className="text-sm font-bold text-slate-700">No leads match your active filters</div>
              <div className="text-xs text-slate-400">Try adjusting your search keywords or resetting filters</div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
            {filteredLeads.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                canViewFinances={canViewFinances}
                canClaimLead={canClaimLead}
                canReassignLead={canReassignLead}
                setInspectLead={setInspectLead}
                setClaimModalLead={setClaimModalLead}
                setReassignModalLead={setReassignModalLead}
                handleReactivateLead={handleReactivateLead}
              />
            ))}
          </div>
        )}
      </ErrorBoundary>

      {totalCount > perPage && (
        <div className="flex items-center justify-between mt-4 p-4 light-glass-card rounded-2xl border border-white/85 dark:border-white/10 shadow-sm backdrop-blur-2xl">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
            Showing {(page - 1) * perPage + 1} to {Math.min(page * perPage, totalCount)} of {totalCount} Leads
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p: number) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              Previous
            </button>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10">
              Page {page}
            </span>
            <button
              onClick={() => setPage((p: number) => p + 1)}
              disabled={page * perPage >= totalCount}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}

      <LeadModals
        inspectLead={inspectLead}
        setInspectLead={setInspectLead}
        lostModalLead={lostModalLead}
        setLostModalLead={setLostModalLead}
        showCreateModal={showCreateModal}
        setShowCreateModal={setShowCreateModal}
        claimModalLead={claimModalLead}
        setClaimModalLead={setClaimModalLead}
        reassignModalLead={reassignModalLead}
        setReassignModalLead={setReassignModalLead}
        handleMarkAsLost={handleMarkAsLost}
        handleReactivateLead={handleReactivateLead}
        handleAdvanceStage={handleAdvanceStage}
        addNote={addNote}
        updateLeadContact={updateLeadContact}
        getServiceBadgeClass={getServiceBadgeClass}
        handleCreateLead={handleCreateLead}
        handleConfirmClaimLead={handleConfirmClaimLead}
        handleReassignSuccess={handleReassignSuccess}
      />
    </div>
  );
}
