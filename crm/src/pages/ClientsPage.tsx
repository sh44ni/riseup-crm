import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Sparkles } from 'lucide-react';
import { Client360Record, TimelineEvent, RoofSpecs, ClientSortConfig, isClientLost } from '@/types/client360Types';
import { useClients } from '@/hooks/useClients';
import { useDashboardStats } from '@/lib/dashboardStatsStore';
import { useAuth } from '@/context/AuthContext';
import { useLocation } from 'react-router-dom';
import { ClientContactData } from '@/components/clients/ClientEditContactModal';
import { ClientDirectoryHero } from '@/components/clients/directory/ClientDirectoryHero';
import { ClientDirectoryStats } from '@/components/clients/directory/ClientDirectoryStats';
import { ClientDirectoryToolbar, DirectoryFilterType } from '@/components/clients/directory/ClientDirectoryToolbar';
import { ClientDirectoryCards } from '@/components/clients/directory/ClientDirectoryCards';
import { ClientDirectoryTable } from '@/components/clients/directory/ClientDirectoryTable';
import { ClientProfileView } from '@/components/clients/profile/ClientProfileView';
import { ClientProfileTab } from '@/components/clients/profile/ClientProfileHeader';
import { ClientModalsSection } from '@/components/clients/ClientModalsSection';
import { CreateClientPayload, CreateExistingClientPayload } from '@/api/clientsApi';
import { sortClients, getSavedClientSort, saveClientSort } from '@/utils/clientSortUtils';

export function ClientsPage() {
  const { can, isOwner, getScope, user } = useAuth();
  const canViewFinances = isOwner || can('finances.view');
  const canCreateClient = isOwner || can('clients.create') || can('leads.create');
  const clientScope = getScope('leads.view');
  const isOwnOnly = clientScope === 'own';

  const { stats } = useDashboardStats();
  const {
    clients,
    summary,
    selectedClientId,
    setSelectedClientId,
    currentClient,
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
  const [activeTab, setActiveTab] = useState<ClientProfileTab>('overview');

  // Reset to directory when sidebar button signals reset
  useEffect(() => {
    if ((location.state as any)?.resetToDirectory) {
      setViewMode('directory');
      setSelectedClientId(null);
      window.history.replaceState({}, '', window.location.href);
    }
  }, [location.state, setSelectedClientId]);

  // Directory filter & search
  const [directoryFilter, setDirectoryFilter] = useState<DirectoryFilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [directoryDisplayMode, setDirectoryDisplayMode] = useState<'table' | 'cards'>('cards');

  // Directory sorting state (persisted per user in localStorage)
  const [sortConfig, setSortConfig] = useState<ClientSortConfig>(() =>
    getSavedClientSort(user?.id)
  );

  // Sync sort preferences if the logged-in user changes
  useEffect(() => {
    if (user?.id) {
      setSortConfig(getSavedClientSort(user.id));
    }
  }, [user?.id]);

  const handleSortChange = (newConfig: ClientSortConfig) => {
    setSortConfig(newConfig);
    saveClientSort(newConfig, user?.id);
  };

  // Modals state
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isEditSpecsOpen, setIsEditSpecsOpen] = useState(false);
  const [isEditContactOpen, setIsEditContactOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client360Record | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreateExistingModalOpen, setIsCreateExistingModalOpen] = useState(false);
  const [showMarkLostModal, setShowMarkLostModal] = useState(false);
  const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false);
  const [isReactivateConfirmOpen, setIsReactivateConfirmOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

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

  const handleSaveActivity = async (newEvent: Omit<TimelineEvent, 'id'>) => {
    if (!currentClient) return;
    try {
      await logActivity(currentClient.id, newEvent);
      showToast('Activity successfully logged to 360 timeline!');
    } catch {
      showToast('Failed to log activity to database.');
    }
  };

  const handleSaveSpecs = async (updatedSpecs: RoofSpecs) => {
    if (!currentClient) return;
    try {
      await saveSpecs(currentClient.id, updatedSpecs);
      showToast('Property and roof specs updated!');
    } catch {
      showToast('Failed to update specs on database.');
    }
  };

  const handleToggleTask = async (taskId: string) => {
    if (!currentClient) return;
    try {
      await toggleClientTask(currentClient.id, taskId);
      showToast('Task status updated!');
      refetch();
    } catch {
      showToast('Failed to update task.');
    }
  };

  const handleConfirmAddTask = async (title: string) => {
    if (!title || !title.trim() || !currentClient) return;
    try {
      await createClientTask(currentClient.id, {
        title: title.trim(),
        description: 'Follow-up task scheduled.',
      });
      showToast('Reminder task added to client schedule!');
      refetch();
    } catch {
      showToast('Failed to add task.');
    } finally {
      setIsAddTaskDialogOpen(false);
    }
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

  const handleConfirmMarkLost = async (reason: string, notes?: string) => {
    if (!currentClient) return;
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
  };

  const handleSaveExistingClient = async (payload: CreateExistingClientPayload) => {
    const res = await createExistingHomeowner(payload);
    setDirectoryFilter('all');
    setSearchQuery('');
    showToast(`${payload.fullName} successfully onboarded as existing homeowner!`);
    return res;
  };

  const handleSaveCreateClient = async (payload: CreateClientPayload) => {
    return createNewClient(payload);
  };

  const handleOpenClientProfile = (client: Client360Record) => {
    setSelectedClientId(client.id);
    setViewMode('profile');
    setActiveTab('overview');
  };

  const handleEditContact = (client: Client360Record) => {
    setEditingClient(client);
    setIsEditContactOpen(true);
  };

  const nonLostClientsCount = useMemo(
    () => clients.filter((c) => !isClientLost(c)).length,
    [clients]
  );
  const activeJobsCount = useMemo(
    () => clients.filter((c) => c.status === 'active_job' && !isClientLost(c)).length,
    [clients]
  );
  const completedJobsCount = useMemo(
    () => clients.filter((c) => c.status === 'completed' && !isClientLost(c)).length,
    [clients]
  );
  const lostClientsCount = useMemo(
    () => clients.filter((c) => isClientLost(c)).length,
    [clients]
  );

  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      const isLost = isClientLost(c);
      const matchesFilter =
        directoryFilter === 'all'
          ? !isLost
          : directoryFilter === 'closed_lost'
          ? isLost
          : c.status === directoryFilter && !isLost;

      const matchesSearch =
        searchQuery.trim() === '' ||
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.roofSpecs.roofMaterial.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.assignedRep.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [clients, directoryFilter, searchQuery]);

  const sortedClients = useMemo(() => {
    return sortClients(filteredClients, sortConfig);
  }, [filteredClients, sortConfig]);

  return (
    <div className="space-y-3.5 w-full select-none pb-12">
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 px-4 py-2.5 rounded-2xl bg-slate-900 text-white text-xs font-semibold shadow-2xl border border-white/20 flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-200">
          <Sparkles size={14} className="text-sky-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {viewMode === 'directory' ? (
        <div className="space-y-3.5">
          <ClientDirectoryHero
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onSearchClear={() => setSearchQuery('')}
            searchInputRef={searchInputRef}
            canCreateClient={canCreateClient}
            onOpenCreateModal={() => setIsCreateModalOpen(true)}
            onOpenCreateExistingModal={() => setIsCreateExistingModalOpen(true)}
            isOwnOnly={isOwnOnly}
            totalClientsCount={nonLostClientsCount}
          />

          <ClientDirectoryStats
            clients={clients}
            summary={summary}
            stats={stats}
          />

          <ClientDirectoryToolbar
            directoryFilter={directoryFilter}
            onFilterChange={setDirectoryFilter}
            counts={{
              all: nonLostClientsCount,
              active_job: activeJobsCount,
              completed: completedJobsCount,
              closed_lost: lostClientsCount,
            }}
            directoryDisplayMode={directoryDisplayMode}
            onDisplayModeChange={setDirectoryDisplayMode}
            sortConfig={sortConfig}
            onSortChange={handleSortChange}
          />

          {directoryDisplayMode === 'cards' ? (
            <ClientDirectoryCards
              clients={sortedClients}
              onSelectClient={handleOpenClientProfile}
              onEditContact={handleEditContact}
            />
          ) : (
            <ClientDirectoryTable
              clients={sortedClients}
              onSelectClient={handleOpenClientProfile}
              onEditContact={handleEditContact}
              sortConfig={sortConfig}
              onSortChange={handleSortChange}
            />
          )}
        </div>
      ) : currentClient ? (
        <ClientProfileView
          client={currentClient}
          clients={clients}
          selectedClientId={selectedClientId}
          onSelectClientId={setSelectedClientId}
          onBackToDirectory={() => setViewMode('directory')}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          canViewFinances={canViewFinances}
          onOpenLogModal={() => setIsLogModalOpen(true)}
          onOpenEditSpecs={() => setIsEditSpecsOpen(true)}
          onOpenEditContact={() => {
            setEditingClient(currentClient);
            setIsEditContactOpen(true);
          }}
          onReactivateDeal={() => setIsReactivateConfirmOpen(true)}
          onOpenMarkLost={() => setShowMarkLostModal(true)}
          onToggleTask={handleToggleTask}
          onAddTask={() => setIsAddTaskDialogOpen(true)}
        />
      ) : null}

      <ClientModalsSection
        currentClient={currentClient}
        editingClient={editingClient}
        isLogModalOpen={isLogModalOpen}
        onCloseLogModal={() => setIsLogModalOpen(false)}
        onSaveActivity={handleSaveActivity}
        isEditSpecsOpen={isEditSpecsOpen}
        onCloseEditSpecs={() => setIsEditSpecsOpen(false)}
        onSaveSpecs={handleSaveSpecs}
        isEditContactOpen={isEditContactOpen}
        onCloseEditContact={() => {
          setIsEditContactOpen(false);
          setEditingClient(null);
        }}
        onSaveContact={handleSaveContact}
        isCreateExistingModalOpen={isCreateExistingModalOpen}
        onCloseCreateExistingModal={() => setIsCreateExistingModalOpen(false)}
        onSaveExistingClient={handleSaveExistingClient}
        isCreateModalOpen={isCreateModalOpen}
        onCloseCreateModal={() => setIsCreateModalOpen(false)}
        onSaveCreateClient={handleSaveCreateClient}
        showMarkLostModal={showMarkLostModal}
        onCloseMarkLostModal={() => setShowMarkLostModal(false)}
        onConfirmMarkLost={handleConfirmMarkLost}
        isAddTaskDialogOpen={isAddTaskDialogOpen}
        onConfirmAddTask={handleConfirmAddTask}
        onCloseAddTaskDialog={() => setIsAddTaskDialogOpen(false)}
        isReactivateConfirmOpen={isReactivateConfirmOpen}
        onConfirmReactivateDeal={handleConfirmReactivateDeal}
        onCloseReactivateConfirm={() => setIsReactivateConfirmOpen(false)}
      />
    </div>
  );
}
