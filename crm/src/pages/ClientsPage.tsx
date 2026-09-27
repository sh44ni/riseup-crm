import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  ExternalLink,
  Plus,
  Edit3,
  Search,
  Filter,
  Users,
  ShieldCheck,
  Flame,
  CheckCircle2,
  Clock,
  RotateCcw,
  Sparkles,
  Building2,
  Calendar,
  Layers,
  ChevronRight,
  Briefcase,
  AlertTriangle,
  Download,
  X,
  DollarSign,
  TrendingUp,
  UserCheck,
} from 'lucide-react';
import { Client360Record, TimelineEvent, RoofSpecs } from '@/types/client360Types';
import { useClients } from '@/hooks/useClients';
import { useDashboardStats } from '@/lib/dashboardStatsStore';
import { CreateClientModal } from '@/components/clients/CreateClientModal';
import { CreateExistingClientModal } from '@/components/clients/CreateExistingClientModal';
import { useAuth } from '@/context/AuthContext';
import { useLocation } from 'react-router-dom';
import { ClientHeroBanner } from '@/components/clients/ClientHeroBanner';
import { ClientSpecsCard } from '@/components/clients/ClientSpecsCard';
import { CrmPageHero } from '@/components/common/CrmPageHero';
import { UniversalStatCard } from '@/components/common/UniversalStatCard';
import { ViewToggle } from '@/components/common/ViewToggle';
import { ClientBillingCard } from '@/components/clients/ClientBillingCard';
import { ClientWarrantyCard } from '@/components/clients/ClientWarrantyCard';
import { ClientRemindersCard } from '@/components/clients/ClientRemindersCard';
import { ClientTimelineTab } from '@/components/clients/ClientTimelineTab';
import { ClientQuotesJobsTab } from '@/components/clients/ClientQuotesJobsTab';
import { ClientBillingTab } from '@/components/clients/ClientBillingTab';
import { ClientWarrantiesTab } from '@/components/clients/ClientWarrantiesTab';
import { ClientLogModal } from '@/components/clients/ClientLogModal';
import { ClientEditSpecsModal } from '@/components/clients/ClientEditSpecsModal';
import { ClientEditContactModal, ClientContactData } from '@/components/clients/ClientEditContactModal';
import { getTelUrl, getMailtoUrl, getSmsUrl } from '@/utils/contactValidation';
import { MarkLeadLostModal } from '@/components/leads/MarkLeadLostModal';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { PromptDialog } from '@/components/common/PromptDialog';

export function ClientsPage() {
  const { user, can, isOwner, getScope } = useAuth();
  const canViewFinances = isOwner || can('finances.view');
  const canCreateClient = isOwner || can('clients.create') || can('leads.create');
  const clientScope = getScope('leads.view');
  const isOwnOnly = clientScope === 'own';

  const { stats } = useDashboardStats();
  const {
    clients,
    setClients,
    summary,
    selectedClientId,
    setSelectedClientId,
    currentClient,
    loading,
    detailLoading,
    error,
    saveSpecs,
    updateContact,
    logActivity,
    reactivateClient,
    markClientAsLost,
    createNewClient,
    createExistingHomeowner,
    refetch,
    createClientTask,
    toggleClientTask,
  } = useClients();

  const location = useLocation();

  const [viewMode, setViewMode] = useState<'profile' | 'directory'>('directory');
  const [activeTab, setActiveTab] = useState<
    'overview' | 'timeline' | 'quotes' | 'billing' | 'warranties' | 'tasks'
  >('overview');

  // Reset to directory whenever the sidebar "Clients 360" button is clicked
  // while the user is already inside a client profile. The sidebar passes
  // { state: { resetToDirectory: true } } via navigate() to signal this.
  useEffect(() => {
    if ((location.state as any)?.resetToDirectory) {
      setViewMode('directory');
      setSelectedClientId(null);
      // Clear the navigation state so a page refresh doesn't re-trigger this
      window.history.replaceState({}, '', window.location.href);
    }
  }, [location.state]);

  // Directory filter & search
  const [directoryFilter, setDirectoryFilter] = useState<'all' | 'active_job' | 'completed' | 'closed_lost'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [directoryDisplayMode, setDirectoryDisplayMode] = useState<'table' | 'cards'>('cards');

  // Modals
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isEditSpecsOpen, setIsEditSpecsOpen] = useState(false);
  const [isEditContactOpen, setIsEditContactOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client360Record | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreateExistingModalOpen, setIsCreateExistingModalOpen] = useState(false);
  const [showMarkLostModal, setShowMarkLostModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Handler: Save Contact Details (Source of Truth)
  const handleSaveContact = async (data: ClientContactData) => {
    const target = editingClient || currentClient;
    if (!target) return;
    try {
      await updateContact(target.id, {
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        city: data.city,
        zip: data.zip,
      });
      showToast(`Contact info for ${data.name} saved to Client 360 source of truth!`);
    } catch (err: any) {
      showToast(err?.message || 'Failed to update contact info on server.');
      throw err;
    }
  };

  // Handler: Log activity
  const handleSaveActivity = async (newEvent: Omit<TimelineEvent, 'id'>) => {
    if (!currentClient) return;
    try {
      await logActivity(currentClient.id, newEvent);
      showToast('Activity successfully logged to 360 timeline!');
    } catch (err: any) {
      showToast('Failed to log activity to database.');
    }
  };

  // Handler: Edit Specs
  const handleSaveSpecs = async (updatedSpecs: RoofSpecs) => {
    if (!currentClient) return;
    try {
      await saveSpecs(currentClient.id, updatedSpecs);
      showToast('Property and roof specs updated!');
    } catch (err: any) {
      showToast('Failed to update specs on database.');
    }
  };

  // Handler: Toggle Task
  const handleToggleTask = async (taskId: string) => {
    if (!currentClient) return;
    try {
      await toggleClientTask(currentClient.id, taskId);
      showToast('Task status updated!');
      refetch();
    } catch (err: any) {
      showToast('Failed to update task.');
    }
  };

  // Accessible Dialog States
  const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false);
  const [isReactivateConfirmOpen, setIsReactivateConfirmOpen] = useState(false);

  // Handler: Add simple task
  const handleAddTask = () => {
    setIsAddTaskDialogOpen(true);
  };

  const handleConfirmAddTask = async (title: string) => {
    if (!title || !title.trim() || !currentClient) return;
    
    try {
      await createClientTask(currentClient.id, { 
        title: title.trim(), 
        description: 'Follow-up task scheduled.' 
      });
      showToast('Reminder task added to client schedule!');
      refetch();
    } catch {
      showToast('Failed to add task.');
    } finally {
      setIsAddTaskDialogOpen(false);
    }
  };

  // Handler: Reactivate lost deal
  const handleReactivateDeal = () => {
    if (!currentClient) return;
    setIsReactivateConfirmOpen(true);
  };

  const handleConfirmReactivateDeal = async () => {
    if (!currentClient) return;
    try {
      const targetId = currentClient.id;
      await reactivateClient(targetId);
      setDirectoryFilter('active_job');
      setSelectedClientId(String(targetId));
      showToast(`${currentClient.name} successfully reactivated into the active pipeline!`);
      refetch();
    } catch {
      showToast('Failed to reactivate client on server.');
    } finally {
      setIsReactivateConfirmOpen(false);
    }
  };

  // Filtered clients for directory list
  const filteredClients = clients.filter((c) => {
    const matchesFilter = directoryFilter === 'all' || c.status === directoryFilter;
    const matchesSearch =
      searchQuery.trim() === '' ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.roofSpecs.roofMaterial.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.assignedRep.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Dynamic status badges
  const getStatusBadge = (client: Client360Record) => {
    switch (client.status) {
      case 'active_job':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-200 animate-pulse" />
            <span>Existing Client • Active Jobsite</span>
          </span>
        );
      case 'closed_lost':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-600 text-white shadow-xs">
            <span className="w-2 h-2 rounded-full bg-rose-200" />
            <span>Closed Lost • Win-Back Opportunity</span>
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-teal-600 text-white shadow-xs">
            <ShieldCheck size={13} />
            <span>Lifetime Client • 50-Year Warranty</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-600 text-white shadow-xs">
            <span>Pipeline Prospect</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-3.5 max-w-[1600px] mx-auto select-none pb-12">
      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 px-4 py-2.5 rounded-2xl bg-slate-900 text-white text-xs font-semibold shadow-2xl border border-white/20 flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-200">
          <Sparkles size={14} className="text-[#2F9FE3]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DIRECTORY VIEW: Client Registry Table & Cards (Liquid Glass 3.0)          */}
      {/* ========================================================================= */}
      {viewMode === 'directory' ? (
        <div className="space-y-3.5">
          {/* 1. HERO INTAKE BANNER WITH PANORAMA BACKGROUND */}
          <CrmPageHero
            pageId="clients"
            defaultEyebrow="CLIENT 360 REGISTRY • HOMEOWNER INTELLIGENCE"
            defaultTitle="Unified Homeowner Records & 360 Directory"
            defaultSubtitle="Comprehensive homeowner profiles, active jobsites, 50-year warranty certificates, and closed lost win-back cadences."
            showSearch={true}
            searchPlaceholder="Search by client name, street address, material, or assigned rep..."
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            onSearchClear={() => setSearchQuery('')}
            searchRef={searchInputRef}
            topRightActions={
              canCreateClient ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateExistingModalOpen(true)}
                    className="h-9 flex items-center gap-1.5 px-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-xs hover:shadow-md hover:scale-[1.02] transition-all cursor-pointer border border-emerald-500/30"
                    title="Onboard an existing homeowner directly into any CRM pipeline stage"
                  >
                    <UserCheck size={14} className="stroke-[2.5]" />
                    <span>Existing Homeowner</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(true)}
                    className="h-9 flex items-center gap-1.5 px-4 rounded-xl bg-gradient-to-r from-[#1878B8] via-sky-500 to-[#55C4F5] text-white font-bold text-xs shadow-xs hover:shadow-md hover:scale-[1.02] transition-all cursor-pointer"
                  >
                    <Plus size={14} className="stroke-[3]" />
                    <span>New Homeowner</span>
                  </button>
                </div>
              ) : undefined
            }
            bottomRightBadges={
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 text-[11px] font-semibold text-slate-700">
                {isOwnOnly && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50/90 dark:bg-indigo-950/60 border border-indigo-200/90 dark:border-indigo-800/60 text-[10px] font-bold text-indigo-800 dark:text-indigo-300 shadow-2xs shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                    <span>My Clients Only</span>
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50/90 border border-emerald-200/90 text-[10px] font-bold text-emerald-800 shadow-2xs shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{clients.length} Verified Records</span>
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50/90 border border-sky-200/90 text-[10px] font-bold text-sky-800 shadow-2xs shrink-0">
                  <ShieldCheck size={11} className="text-sky-600" />
                  <span>CSLB #1084221</span>
                </span>
              </div>
            }
          />

          {/* 2. KPI METRICS ROW (Interactive UniversalStatCards driven by backend summary) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <UniversalStatCard
              label="Total Homeowners"
              value={summary?.totalClients ?? clients.length}
              icon={Users}
              iconGradient="from-[#1878B8] to-[#55C4F5]"
              color="#0284c7"
              hoverBorderColor="hover:border-sky-400"
              blurColor="bg-sky-400/15 group-hover:bg-sky-400/25"
              footnoteLeft={`${summary?.activeProjects ?? clients.filter((c) => c.status === 'active_job').length} active jobs`}
              footnoteRight={`${summary?.existingClientsCount ?? clients.filter((c) => c.status === 'completed').length} warrantied`}
              sharePct={100}
              shareLabel="Client directory"
              stageLabel="Homeowner Base"
              sparklineData={stats?.sparklines?.newLeads}
            />

            <UniversalStatCard
              label="Active Jobsites"
              value={summary?.activeProjects ?? clients.filter((c) => c.status === 'active_job').length}
              icon={Building2}
              iconGradient="from-emerald-600 to-emerald-400"
              color="#10b981"
              hoverBorderColor="hover:border-emerald-400"
              blurColor="bg-emerald-400/15 group-hover:bg-emerald-400/25"
              footnoteLeft={`${summary?.activeProjects ?? clients.filter((c) => c.status === 'active_job').length} crews deployed`}
              footnoteRight="Work in progress"
              sharePct={clients.length > 0 ? Math.round(((summary?.activeProjects ?? clients.filter((c) => c.status === 'active_job').length) / (summary?.totalClients || clients.length || 1)) * 100) : 0}
              shareLabel="Site share"
              stageLabel="Production"
              sparklineData={stats?.sparklines?.jobsWon}
            />

            <UniversalStatCard
              label="Lifetime Warrantied"
              value={summary?.existingClientsCount ?? clients.filter((c) => c.status === 'completed').length}
              icon={ShieldCheck}
              iconGradient="from-teal-600 to-teal-400"
              color="#0d9488"
              hoverBorderColor="hover:border-teal-400"
              blurColor="bg-teal-400/15 group-hover:bg-teal-400/25"
              footnoteLeft="50-Yr Eagle System"
              footnoteRight={`${summary?.existingClientsCount ?? clients.filter((c) => c.status === 'completed').length} certificates issued`}
              sharePct={clients.length > 0 ? Math.round(((summary?.existingClientsCount ?? clients.filter((c) => c.status === 'completed').length) / (summary?.totalClients || clients.length || 1)) * 100) : 0}
              shareLabel="Warranty share"
              stageLabel="Protected Roofs"
              sparklineData={stats?.sparklines?.jobsWon}
            />

            <UniversalStatCard
              label="Lost & Win-Backs"
              value={summary?.lostLeadsCount ?? clients.filter((c) => c.status === 'closed_lost').length}
              icon={Flame}
              iconGradient="from-rose-600 to-rose-400"
              color="#f43f5e"
              hoverBorderColor="hover:border-rose-400"
              blurColor="bg-rose-400/15 group-hover:bg-rose-400/25"
              footnoteLeft="Win-back radar active"
              footnoteRight={`${clients.filter((c) => c.lossPostMortem?.canReactivate).length} reactivatable`}
              sharePct={clients.length > 0 ? Math.round(((summary?.lostLeadsCount ?? clients.filter((c) => c.status === 'closed_lost').length) / (summary?.totalClients || clients.length || 1)) * 100) : 0}
              shareLabel="Lost share"
              stageLabel="Win-Back Radar"
              sparklineData={stats?.sparklines?.lostClosed}
            />
          </div>

          {/* 3. FILTER TOOLBAR (Light Glass Panel) */}
          <div className="light-glass-panel rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              {(
                [
                  { id: 'all', label: 'All Records', count: clients.length },
                  { id: 'active_job', label: 'Active Jobsites', count: clients.filter((c) => c.status === 'active_job').length },
                  { id: 'completed', label: 'Completed', count: clients.filter((c) => c.status === 'completed').length },
                  { id: 'closed_lost', label: 'Closed Lost & Win-Backs', count: clients.filter((c) => c.status === 'closed_lost').length },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  onClick={() => setDirectoryFilter(f.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    directoryFilter === f.id
                      ? 'bg-slate-900 dark:bg-sky-500 text-white shadow-xs'
                      : 'bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700/80 text-slate-600 dark:text-slate-300 border border-slate-200/70 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
                  }`}
                >
                  <span>{f.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-md text-[10px] font-extrabold ${
                      directoryFilter === f.id ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {f.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Display toggle */}
            <ViewToggle
              viewMode={directoryDisplayMode}
              onViewModeChange={setDirectoryDisplayMode}
            />
          </div>

          {/* 4. CLIENT REGISTRY: CARDS GRID OR TABLE VIEW */}
          {directoryDisplayMode === 'cards' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredClients.map((client) => (
                <div
                  key={client.id}
                  onClick={() => {
                    setSelectedClientId(client.id);
                    setViewMode('profile');
                    setActiveTab('overview');
                  }}
                  className="light-glass-card rounded-2xl p-5 shadow-xs hover:shadow-md transition-all cursor-pointer space-y-4 group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#0B1E33] to-[#162C46] dark:from-slate-800 dark:to-slate-900 text-white font-black text-base flex items-center justify-center shadow-xs group-hover:scale-105 transition-all">
                        {client.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-black text-sm text-slate-900 dark:text-white group-hover:text-[#0284C7] dark:group-hover:text-sky-400 transition-colors">
                          {client.name}
                        </h3>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                          <MapPin size={12} className="text-[#0284C7] dark:text-sky-400" />
                          <span className="truncate">
                            {[client.roofSpecs?.address || client.address, client.city].filter(Boolean).join(', ') || 'Address not provided'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <span className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 group-hover:bg-[#0284C7] dark:group-hover:bg-sky-500 text-slate-400 dark:text-slate-500 group-hover:text-white flex items-center justify-center transition-all">
                      <ChevronRight size={14} />
                    </span>
                  </div>

                  {/* Specs tile */}
                  <div className="liquid-glass-tile rounded-xl p-3 text-xs space-y-1.5 dark:bg-white/5 dark:border-white/10">
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">Roof Material:</span>
                      <span className="font-bold text-slate-900 dark:text-slate-200">{client.roofSpecs.roofMaterial}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">Roof Area:</span>
                      <span className="font-bold text-slate-900 dark:text-slate-200">{client.roofSpecs.roofAreaSqFt.toLocaleString()} sq ft</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">Assigned Rep:</span>
                      <span className="font-bold text-slate-900 dark:text-slate-200">{client.assignedRep.name}</span>
                    </div>
                    {client.lossPostMortem && (
                      <div className="flex justify-between text-rose-600 dark:text-rose-400 font-bold pt-1 border-t border-slate-200/60 dark:border-white/10">
                        <span>Lost Reason:</span>
                        <span className="truncate max-w-[180px]">{client.lossPostMortem.lossReason}</span>
                      </div>
                    )}
                  </div>

                  {/* Quick Contact & Edit Controls */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/5">
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      {client.phone && (
                        <a
                          href={getTelUrl(client.phone)}
                          className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-[#0284C7] dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-900/50 transition-colors"
                          title={`Call ${client.phone}`}
                          aria-label={`Call ${client.name}`}
                        >
                          <Phone size={12} />
                        </a>
                      )}
                      {client.email && (
                        <a
                          href={getMailtoUrl(client.email)}
                          className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-[#0284C7] dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-900/50 transition-colors"
                          title={`Email ${client.email}`}
                          aria-label={`Email ${client.name}`}
                        >
                          <Mail size={12} />
                        </a>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingClient(client);
                        setIsEditContactOpen(true);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-[#0284C7] hover:text-white dark:hover:bg-sky-500 dark:hover:text-white text-[11px] font-bold transition-all cursor-pointer"
                      title="Edit Contact Info"
                    >
                      <Edit3 size={11} />
                      <span>Edit Info</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-1 text-xs">
                    {getStatusBadge(client)}
                    <span className="text-[#0284C7] dark:text-sky-400 font-bold flex items-center gap-1 group-hover:underline">
                      <span>Open 360</span>
                      <ExternalLink size={12} />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md shadow-xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/90 dark:bg-slate-900/80 border-b border-slate-200/80 dark:border-white/10 text-slate-500 dark:text-slate-400 font-bold">
                    <th className="py-3 px-4">Homeowner</th>
                    <th className="py-3 px-4">Address / City</th>
                    <th className="py-3 px-4">Roof Specs</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Assigned Rep</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {filteredClients.map((client) => (
                    <tr
                      key={client.id}
                      onClick={() => {
                        setSelectedClientId(client.id);
                        setViewMode('profile');
                        setActiveTab('overview');
                      }}
                      className="hover:bg-slate-50/80 dark:hover:bg-white/5 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#0B1E33] to-[#162C46] dark:from-slate-800 dark:to-slate-900 text-white font-bold flex items-center justify-center text-xs shrink-0">
                            {client.name.charAt(0)}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white group-hover:text-[#0284C7] dark:group-hover:text-sky-400 transition-colors">
                              {client.name}
                            </span>
                            <div className="flex items-center gap-2 mt-0.5" onClick={(e) => e.stopPropagation()}>
                              {client.phone && (
                                <a
                                  href={getTelUrl(client.phone)}
                                  className="text-[11px] text-slate-400 hover:text-[#0284C7] dark:hover:text-sky-400 transition-colors flex items-center gap-0.5"
                                  title={`Call ${client.phone}`}
                                >
                                  <Phone size={10} />
                                  <span>{client.phone}</span>
                                </a>
                              )}
                              {client.email && (
                                <a
                                  href={getMailtoUrl(client.email)}
                                  className="text-[11px] text-slate-400 hover:text-[#0284C7] dark:hover:text-sky-400 transition-colors flex items-center gap-0.5"
                                  title={`Email ${client.email}`}
                                >
                                  <Mail size={10} />
                                  <span className="truncate max-w-[130px]">{client.email}</span>
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        <div>{client.roofSpecs?.address || client.address || 'Address not provided'}</div>
                        <div className="text-[11px] text-slate-400">{[client.city, client.zip].filter(Boolean).join(', ')}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">{client.roofSpecs.roofMaterial}</span>
                        <div className="text-[11px] text-slate-400">{client.roofSpecs.roofAreaSqFt.toLocaleString()} sq ft</div>
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(client)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          {client.assignedRep.name}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingClient(client);
                              setIsEditContactOpen(true);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold transition-all text-xs cursor-pointer"
                            title="Edit Contact Information"
                          >
                            <Edit3 size={12} />
                            <span className="hidden sm:inline">Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedClientId(client.id);
                              setViewMode('profile');
                              setActiveTab('overview');
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-[#0284C7] dark:text-sky-400 font-bold hover:bg-[#0284C7] hover:text-white dark:hover:bg-sky-500 dark:hover:text-white transition-all text-xs cursor-pointer"
                          >
                            <span>Open 360</span>
                            <ChevronRight size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* ========================================================================= */
        /* PROFILE VIEW: 1:1 Client 360 Profile (Luxury Liquid Glass 3.0)            */
        /* ========================================================================= */
        <div className="space-y-3.5">
          {/* Breadcrumb & Client Switcher */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={() => setViewMode('directory')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/90 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-white/10 shadow-2xs hover:border-slate-300 dark:hover:border-white/20 transition-all cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>All Clients</span>
            </button>

            {/* Quick Switcher */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-semibold hidden sm:inline">Switch Client:</span>
              <select
                value={selectedClientId ?? ''}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-300/80 dark:border-white/10 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-[#0284C7] dark:focus:border-sky-500 shadow-2xs"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id} className="dark:bg-slate-900 dark:text-white">
                    {c.name} ({c.status === 'active_job' ? 'Active' : c.status === 'closed_lost' ? 'Lost' : 'Completed'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ======================================================================= */}
          {/* CLIENT 360 HEADER (Exact Mockup Layout in Light Glass Panel)            */}
          {/* ======================================================================= */}
          <div className="light-glass-panel rounded-3xl p-5 md:p-6 shadow-[0_12px_36px_rgba(15,23,42,0.05)] select-none">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              {/* Left Side: Avatar + Client Name + Contact Metadata + Rep Badge */}
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[#0B1E33] dark:bg-slate-800 text-white flex items-center justify-center text-2xl font-black shadow-md shrink-0">
                  {currentClient.name.charAt(0)}
                </div>

                <div className="space-y-1.5">
                  <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    {currentClient.name}
                  </h1>

                  {/* Phone, Email, Address Info Row */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-300 font-semibold">
                    <a
                      href={getTelUrl(currentClient.phone)}
                      className="flex items-center gap-1 hover:text-[#0284C7] dark:hover:text-sky-400 transition-colors"
                    >
                      <Phone size={13} className="text-slate-400 dark:text-slate-500" />
                      <span>{currentClient.phone || 'No phone on file'}</span>
                    </a>

                    <a
                      href={getMailtoUrl(currentClient.email)}
                      className="flex items-center gap-1 hover:text-[#0284C7] dark:hover:text-sky-400 transition-colors"
                    >
                      <Mail size={13} className="text-slate-400 dark:text-slate-500" />
                      <span>{currentClient.email || 'No email on file'}</span>
                    </a>

                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(
                        [currentClient.address, currentClient.city, currentClient.zip].filter(Boolean).join(', ')
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 hover:text-[#0284C7] dark:hover:text-sky-400 transition-colors"
                    >
                      <MapPin size={13} className="text-slate-400 dark:text-slate-500" />
                      <span>
                        {[currentClient.address, currentClient.city, currentClient.zip].filter(Boolean).join(', ') || 'Address not provided'}
                      </span>
                    </a>
                  </div>

                  {/* Assigned Rep & Source Pill */}
                  <div className="inline-flex items-center gap-2 pt-1">
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 dark:bg-slate-800/80 border border-slate-200/90 dark:border-white/10 text-xs shadow-2xs">
                      {currentClient.assignedRep.avatar ? (
                        <img
                          src={currentClient.assignedRep.avatar}
                          alt={currentClient.assignedRep.name}
                          className="w-4 h-4 rounded-full object-cover"
                        />
                      ) : (
                        <span className="w-4 h-4 rounded-full bg-slate-800 dark:bg-slate-700 text-white text-[9px] flex items-center justify-center font-bold">
                          {currentClient.assignedRep.name.charAt(0)}
                        </span>
                      )}
                      <span className="font-bold text-slate-900 dark:text-white">{currentClient.assignedRep.name}</span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30">
                        {currentClient.assignedRep.badge}
                      </span>
                      <span className="text-slate-300 dark:text-slate-600 text-[11px] hidden sm:inline">•</span>
                      <span className="text-slate-500 dark:text-slate-400 text-[11px] font-medium hidden sm:inline">{currentClient.originSource}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Side: Status Badge + Action Buttons */}
              <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end gap-3 shrink-0">
                {getStatusBadge(currentClient)}

                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={getTelUrl(currentClient.phone)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200/90 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-2xs transition-all"
                  >
                    <Phone size={13} className="text-slate-500 dark:text-slate-400" />
                    <span>Call</span>
                  </a>

                  <a
                    href={getSmsUrl(currentClient.phone)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200/90 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-2xs transition-all"
                  >
                    <Mail size={13} className="text-slate-500 dark:text-slate-400" />
                    <span>Text</span>
                  </a>

                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(
                      [currentClient.address, currentClient.city, currentClient.zip].filter(Boolean).join(', ')
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200/90 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-2xs transition-all"
                  >
                    <MapPin size={13} className="text-slate-500 dark:text-slate-400" />
                    <span>Directions</span>
                  </a>

                  {/* Primary Action: + Log Note / Call */}
                  <button
                    onClick={() => setIsLogModalOpen(true)}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-slate-900 dark:bg-sky-600 hover:bg-slate-800 dark:hover:bg-sky-500 text-white text-xs font-bold shadow-xs hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Log Note / Call</span>
                  </button>

                  <button
                    onClick={() => setIsEditSpecsOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200/90 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-2xs transition-all cursor-pointer"
                  >
                    <Edit3 size={13} className="text-slate-500 dark:text-slate-400" />
                    <span>Edit Specs</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingClient(currentClient);
                      setIsEditContactOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200/90 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-2xs transition-all cursor-pointer"
                    title="Edit Contact Info (Name, Phone, Email, Address)"
                  >
                    <Edit3 size={13} className="text-slate-500 dark:text-slate-400" />
                    <span>Edit Contact</span>
                  </button>

                  {/* Reactivate button for lost clients */}
                  {currentClient.status === 'closed_lost' && (
                    <button
                      onClick={handleReactivateDeal}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                    >
                      <RotateCcw size={13} />
                      <span>Reactivate</span>
                    </button>
                  )}

                  {/* Mark as Lost button — only for active clients */}
                  {currentClient.status !== 'closed_lost' && (
                    <button
                      onClick={() => setShowMarkLostModal(true)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-600 dark:hover:bg-rose-600 border border-rose-200 dark:border-rose-800/60 hover:border-rose-600 text-rose-700 dark:text-rose-300 hover:text-white text-xs font-bold shadow-xs hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                    >
                      <AlertTriangle size={13} />
                      <span>Mark as Lost</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* ===================================================================== */}
            {/* MAIN NAVIGATION TABS                                                  */}
            {/* ===================================================================== */}
            <div className="flex items-center gap-2 mt-6 pt-5 border-t border-slate-200/70 dark:border-white/10 overflow-x-auto pb-1 no-scrollbar">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  activeTab === 'overview'
                    ? 'bg-slate-900 dark:bg-sky-500 text-white shadow-xs'
                    : 'bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 border border-slate-200/60 dark:border-white/10'
                }`}
              >
                360° Overview
              </button>

              <button
                onClick={() => setActiveTab('timeline')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  activeTab === 'timeline'
                    ? 'bg-slate-900 dark:bg-sky-500 text-white shadow-xs'
                    : 'bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 border border-slate-200/60 dark:border-white/10'
                }`}
              >
                <span>Timeline</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    activeTab === 'timeline' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {currentClient.timeline.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('quotes')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  activeTab === 'quotes'
                    ? 'bg-slate-900 dark:bg-sky-500 text-white shadow-xs'
                    : 'bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 border border-slate-200/60 dark:border-white/10'
                }`}
              >
                <span>Quotes & Jobs</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    activeTab === 'quotes' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {currentClient.quotes.length}
                </span>
              </button>

              {canViewFinances && (
                <button
                  onClick={() => setActiveTab('billing')}
                  className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    activeTab === 'billing'
                      ? 'bg-slate-900 dark:bg-sky-500 text-white shadow-xs'
                      : 'bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 border border-slate-200/60 dark:border-white/10'
                  }`}
                >
                  Billing & Invoices
                </button>
              )}

              <button
                onClick={() => setActiveTab('warranties')}
                className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  activeTab === 'warranties'
                    ? 'bg-slate-900 dark:bg-sky-500 text-white shadow-xs'
                    : 'bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 border border-slate-200/60 dark:border-white/10'
                }`}
              >
                Warranties & Inspections
              </button>

              <button
                onClick={() => setActiveTab('tasks')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  activeTab === 'tasks'
                    ? 'bg-slate-900 dark:bg-sky-500 text-white shadow-xs'
                    : 'bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 border border-slate-200/60 dark:border-white/10'
                }`}
              >
                <span>Tasks</span>
                {currentClient.tasks.length > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      activeTab === 'tasks' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {currentClient.tasks.filter((t) => !t.completed).length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* ======================================================================= */}
          {/* TAB 1: 360° OVERVIEW                                                    */}
          {/* ======================================================================= */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* Dynamic Hero Banner */}
              <ClientHeroBanner
                client={currentClient}
                onManageJob={() => setActiveTab('quotes')}
                onReactivate={handleReactivateDeal}
                onOpenWinBack={() => setActiveTab('tasks')}
              />

              {/* 3-Card Grid Row */}
              <div className={`grid grid-cols-1 ${canViewFinances ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4`}>
                <ClientSpecsCard
                  specs={currentClient.roofSpecs}
                  onEdit={() => setIsEditSpecsOpen(true)}
                />

                {canViewFinances && (
                  <ClientBillingCard
                    billing={currentClient.billingSummary}
                    onViewAll={() => setActiveTab('billing')}
                    onOpenHub={() => setActiveTab('billing')}
                  />
                )}

                <ClientWarrantyCard
                  warranty={currentClient.warrantySummary}
                  onViewAll={() => setActiveTab('warranties')}
                  onOpenHub={() => setActiveTab('warranties')}
                />
              </div>

              {/* Bottom Row: Next Follow-ups & Reminders */}
              <ClientRemindersCard
                tasks={currentClient.tasks}
                onToggleTask={handleToggleTask}
                onAddTask={handleAddTask}
                onViewAllTasks={() => setActiveTab('tasks')}
              />
            </div>
          )}

          {/* TAB 2: TIMELINE */}
          {activeTab === 'timeline' && (
            <ClientTimelineTab
              timeline={currentClient.timeline}
              onLogActivity={() => setIsLogModalOpen(true)}
            />
          )}

          {/* TAB 3: QUOTES & JOBS */}
          {activeTab === 'quotes' && <ClientQuotesJobsTab client={currentClient} />}

          {/* TAB 4: BILLING & INVOICES */}
          {activeTab === 'billing' && canViewFinances && (
            <ClientBillingTab
              billing={currentClient.billingSummary}
            />
          )}

          {/* TAB 5: WARRANTIES & INSPECTIONS */}
          {activeTab === 'warranties' && (
            <ClientWarrantiesTab
              warranty={currentClient.warrantySummary}
              specs={currentClient.roofSpecs}
            />
          )}

          {/* TAB 6: TASKS */}
          {activeTab === 'tasks' && (
            <div className="light-glass-panel rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/70 dark:border-white/10">
                <div className="flex items-center gap-2">
                  <Calendar size={18} className="text-[#0284C7] dark:text-sky-400" />
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">Task Management & Win-Back Callbacks</h3>
                </div>
                <button
                  onClick={handleAddTask}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#0284C7] dark:bg-sky-600 hover:bg-[#0369a1] dark:hover:bg-sky-500 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                >
                  <Plus size={14} />
                  <span>New Task</span>
                </button>
              </div>

              <ClientRemindersCard
                tasks={currentClient.tasks}
                onToggleTask={handleToggleTask}
                onAddTask={handleAddTask}
              />
            </div>
          )}
        </div>
      )}

      {/* MODALS */}
      {currentClient && (
        <>
          <ClientLogModal
            isOpen={isLogModalOpen}
            onClose={() => setIsLogModalOpen(false)}
            onSave={handleSaveActivity}
            clientName={currentClient.name}
            isLostClient={currentClient.status === 'closed_lost'}
          />

          <ClientEditSpecsModal
            isOpen={isEditSpecsOpen}
            onClose={() => setIsEditSpecsOpen(false)}
            specs={currentClient.roofSpecs}
            onSave={handleSaveSpecs}
          />
        </>
      )}

      {/* Client Edit Contact Modal (Source of Truth) */}
      {(editingClient || currentClient) && (
        <ClientEditContactModal
          isOpen={isEditContactOpen}
          onClose={() => {
            setIsEditContactOpen(false);
            setEditingClient(null);
          }}
          clientName={editingClient?.name || currentClient?.name || ''}
          clientId={editingClient?.id || currentClient?.id}
          initialData={{
            name: editingClient?.name || currentClient?.name || '',
            email: editingClient?.email || currentClient?.email || '',
            phone: editingClient?.phone || currentClient?.phone || '',
            address: editingClient?.roofSpecs?.address || editingClient?.address || currentClient?.address || '',
            city: editingClient?.city || currentClient?.city || '',
            zip: editingClient?.zip || currentClient?.zip || '',
          }}
          onSave={handleSaveContact}
        />
      )}

      {isCreateExistingModalOpen && (
        <CreateExistingClientModal
          isOpen={isCreateExistingModalOpen}
          onClose={() => setIsCreateExistingModalOpen(false)}
          onSave={async (payload) => {
            const res = await createExistingHomeowner(payload);
            setDirectoryFilter('all');
            setSearchQuery('');
            showToast(`${payload.fullName} successfully onboarded as existing homeowner!`);
            return res;
          }}
        />
      )}

      {isCreateModalOpen && (
        <CreateClientModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSave={createNewClient}
        />
      )}

      {/* Mark as Lost Modal — 2-step confirm + reason form */}
      {currentClient && (
        <MarkLeadLostModal
          lead={showMarkLostModal ? ({
            id: currentClient.id,
            name: currentClient.name,
            city: currentClient.city,
            value: (currentClient.roofSpecs as any)?.estimatedValue ?? 0,
          } as any) : null}
          onClose={() => setShowMarkLostModal(false)}
          onConfirm={async (reason, notes) => {
            try {
              const targetId = currentClient.id;
              await markClientAsLost(targetId, reason, notes);
              setDirectoryFilter('closed_lost');
              setSelectedClientId(String(targetId));
              showToast(`${currentClient.name} marked as lost opportunity.`);
            } catch {
              showToast('Failed to mark client as lost.');
            }
            setShowMarkLostModal(false);
          }}
        />
      )}

      {/* Accessible Add Task Prompt Dialog */}
      <PromptDialog
        isOpen={isAddTaskDialogOpen}
        title="Add Task / Reminder"
        message="Enter task or reminder description for this client schedule:"
        placeholder="e.g. Follow up on shingle color selection..."
        onConfirm={handleConfirmAddTask}
        onCancel={() => setIsAddTaskDialogOpen(false)}
      />

      {/* Accessible Reactivate Deal Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isReactivateConfirmOpen}
        title="Reactivate Client Deal"
        message={`Reactivate ${currentClient?.name || 'this client'} back into the active Sales Pipeline?`}
        confirmLabel="Reactivate Deal"
        variant="primary"
        onConfirm={handleConfirmReactivateDeal}
        onCancel={() => setIsReactivateConfirmOpen(false)}
      />
    </div>
  );
}
