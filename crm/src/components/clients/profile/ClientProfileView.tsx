import React, { useState } from 'react';
import { Calendar, Plus } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { Client360Record, ClientInvoice } from '@/types/client360Types';
import { ClientProfileHeader, ClientProfileTab } from './ClientProfileHeader';
import { ClientHeroBanner } from '@/components/clients/ClientHeroBanner';
import { ClientSpecsCard } from '@/components/clients/ClientSpecsCard';
import { ClientBillingCard } from '@/components/clients/ClientBillingCard';
import { ClientWarrantyCard } from '@/components/clients/ClientWarrantyCard';
import { ClientRemindersCard } from '@/components/clients/ClientRemindersCard';
import { ClientTimelineTab } from '@/components/clients/ClientTimelineTab';
import { ClientQuotesJobsTab } from '@/components/clients/ClientQuotesJobsTab';
import { ClientBillingTab } from '@/components/clients/ClientBillingTab';
import { ClientWarrantiesTab } from '@/components/clients/ClientWarrantiesTab';
import { ClientMediaSection } from '@/components/clients/ClientMediaSection';
import { CreateInvoiceModal } from '@/components/clients/invoices/CreateInvoiceModal';
import { RecordPaymentModal } from '@/components/clients/invoices/RecordPaymentModal';

interface ClientProfileViewProps {
  client: Client360Record;
  clients: Client360Record[];
  selectedClientId: string | null;
  onSelectClientId: (id: string) => void;
  onBackToDirectory: () => void;
  activeTab: ClientProfileTab;
  onTabChange: (tab: ClientProfileTab) => void;
  canViewFinances: boolean;
  onOpenLogModal: () => void;
  onOpenEditSpecs: () => void;
  onOpenEditContact: () => void;
  onReactivateDeal: () => void;
  onOpenMarkLost: () => void;
  onToggleTask: (taskId: string) => void;
  onAddTask: () => void;
  onUploadMedia: (files: File[]) => Promise<void>;
  onDeleteMedia: (mediaId: string) => Promise<void>;
}

export function ClientProfileView({
  client,
  clients,
  selectedClientId,
  onSelectClientId,
  onBackToDirectory,
  activeTab,
  onTabChange,
  canViewFinances,
  onOpenLogModal,
  onOpenEditSpecs,
  onOpenEditContact,
  onReactivateDeal,
  onOpenMarkLost,
  onToggleTask,
  onAddTask,
  onUploadMedia,
  onDeleteMedia,
}: ClientProfileViewProps) {
  const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState<ClientInvoice | null>(null);
  const queryClient = useQueryClient();

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.clients.all() });
  };

  return (
    <div className="space-y-3.5">
      <ClientProfileHeader
        client={client}
        clients={clients}
        selectedClientId={selectedClientId}
        onSelectClientId={onSelectClientId}
        onBackToDirectory={onBackToDirectory}
        activeTab={activeTab}
        onTabChange={onTabChange}
        canViewFinances={canViewFinances}
        onOpenLogModal={onOpenLogModal}
        onOpenEditSpecs={onOpenEditSpecs}
        onOpenEditContact={onOpenEditContact}
        onOpenCreateInvoice={() => setIsCreateInvoiceOpen(true)}
        onReactivateDeal={onReactivateDeal}
        onOpenMarkLost={onOpenMarkLost}
      />

      {/* TAB 1: 360° OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <ClientHeroBanner
            client={client}
            onManageJob={() => onTabChange('quotes')}
            onReactivate={onReactivateDeal}
            onOpenWinBack={() => onTabChange('tasks')}
          />

          {/* 3-Card Grid Row */}
          <div className={`grid grid-cols-1 ${canViewFinances ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4`}>
            <ClientSpecsCard
              specs={client.roofSpecs}
              onEdit={onOpenEditSpecs}
            />

            {canViewFinances && (
              <ClientBillingCard
                billing={client.billingSummary}
                clientEmail={client.email}
                clientName={client.name}
                onViewAll={() => onTabChange('billing')}
                onOpenHub={() => onTabChange('billing')}
                onOpenCreateInvoice={() => setIsCreateInvoiceOpen(true)}
                onRecordPayment={(inv) => setPaymentTarget(inv)}
              />

            )}

            <ClientWarrantyCard
              warranty={client.warrantySummary}
              onViewAll={() => onTabChange('warranties')}
              onOpenHub={() => onTabChange('warranties')}
            />
          </div>

          {/* Photos & Videos Section */}
          <ClientMediaSection
            clientId={String(client.id)}
            clientName={client.name}
            media={client.media || []}
            onUploadMedia={onUploadMedia}
            onDeleteMedia={onDeleteMedia}
          />

          {/* Bottom Row: Next Follow-ups & Reminders */}
          <ClientRemindersCard
            tasks={client.tasks}
            onToggleTask={onToggleTask}
            onAddTask={onAddTask}
            onViewAllTasks={() => onTabChange('tasks')}
          />
        </div>
      )}

      {/* TAB 2: TIMELINE */}
      {activeTab === 'timeline' && (
        <ClientTimelineTab
          timeline={client.timeline}
          onLogActivity={onOpenLogModal}
        />
      )}

      {/* TAB 3: QUOTES & JOBS */}
      {activeTab === 'quotes' && <ClientQuotesJobsTab client={client} />}

      {/* TAB 4: BILLING & INVOICES */}
      {activeTab === 'billing' && canViewFinances && (
        <ClientBillingTab
          billing={client.billingSummary}
          client={client}
          onOpenCreateInvoice={() => setIsCreateInvoiceOpen(true)}
          onRefresh={handleRefresh}
        />
      )}

      {/* TAB 5: WARRANTIES & INSPECTIONS */}
      {activeTab === 'warranties' && (
        <ClientWarrantiesTab
          warranty={client.warrantySummary}
          specs={client.roofSpecs}
        />
      )}

      {/* TAB: PHOTOS & VIDEOS */}
      {activeTab === 'media' && (
        <ClientMediaSection
          clientId={String(client.id)}
          clientName={client.name}
          media={client.media || []}
          onUploadMedia={onUploadMedia}
          onDeleteMedia={onDeleteMedia}
          isFullTab={true}
        />
      )}

      {/* TAB 6: TASKS */}
      {activeTab === 'tasks' && (
        <div className="light-glass-panel rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/70 dark:border-white/10">
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-brand-600 dark:text-sky-400" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Task Management & Win-Back Callbacks</h3>
            </div>
            <button
              onClick={onAddTask}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-brand-600 dark:bg-sky-600 hover:bg-brand-700 dark:hover:bg-sky-500 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <Plus size={14} />
              <span>New Task</span>
            </button>
          </div>

          <ClientRemindersCard
            tasks={client.tasks}
            onToggleTask={onToggleTask}
            onAddTask={onAddTask}
          />
        </div>
      )}

      {/* Create Invoice Modal */}
      {isCreateInvoiceOpen && (
        <CreateInvoiceModal
          isOpen={isCreateInvoiceOpen}
          onClose={() => setIsCreateInvoiceOpen(false)}
          client={client}
          onInvoiceCreated={() => {
            handleRefresh();
          }}
        />
      )}

      {/* Record Payment (launched from the Billing card) */}
      {paymentTarget && (
        <RecordPaymentModal
          isOpen={Boolean(paymentTarget)}
          onClose={() => setPaymentTarget(null)}
          invoice={paymentTarget}
          clientName={client.name}
          onPaymentRecorded={() => {
            setPaymentTarget(null);
            handleRefresh();
          }}
        />
      )}
    </div>
  );
}
