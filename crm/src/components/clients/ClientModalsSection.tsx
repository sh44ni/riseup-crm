import React from 'react';
import { Client360Record, TimelineEvent, RoofSpecs } from '@/types/client360Types';
import { ClientLogModal } from '@/components/clients/ClientLogModal';
import { ClientEditSpecsModal } from '@/components/clients/ClientEditSpecsModal';
import { ClientEditContactModal, ClientContactData } from '@/components/clients/ClientEditContactModal';
import { CreateExistingClientModal } from '@/components/clients/CreateExistingClientModal';
import { CreateClientModal } from '@/components/clients/CreateClientModal';
import { MarkLeadLostModal } from '@/components/leads/MarkLeadLostModal';
import { PromptDialog } from '@/components/common/PromptDialog';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { CreateClientPayload, CreateExistingClientPayload } from '@/api/clientsApi';

interface ClientModalsSectionProps {
  currentClient: Client360Record | null;
  editingClient: Client360Record | null;
  isLogModalOpen: boolean;
  onCloseLogModal: () => void;
  onSaveActivity: (event: Omit<TimelineEvent, 'id'>) => Promise<void>;
  isEditSpecsOpen: boolean;
  onCloseEditSpecs: () => void;
  onSaveSpecs: (specs: RoofSpecs) => Promise<void>;
  isEditContactOpen: boolean;
  onCloseEditContact: () => void;
  onSaveContact: (data: ClientContactData) => Promise<void>;
  isCreateExistingModalOpen: boolean;
  onCloseCreateExistingModal: () => void;
  onSaveExistingClient: (payload: CreateExistingClientPayload) => Promise<any>;
  isCreateModalOpen: boolean;
  onCloseCreateModal: () => void;
  onSaveCreateClient: (payload: CreateClientPayload) => Promise<any>;
  showMarkLostModal: boolean;
  onCloseMarkLostModal: () => void;
  onConfirmMarkLost: (reason: string, notes?: string) => Promise<void>;
  isAddTaskDialogOpen: boolean;
  onConfirmAddTask: (title: string) => Promise<void>;
  onCloseAddTaskDialog: () => void;
  isReactivateConfirmOpen: boolean;
  onConfirmReactivateDeal: () => Promise<void>;
  onCloseReactivateConfirm: () => void;
}

export function ClientModalsSection({
  currentClient,
  editingClient,
  isLogModalOpen,
  onCloseLogModal,
  onSaveActivity,
  isEditSpecsOpen,
  onCloseEditSpecs,
  onSaveSpecs,
  isEditContactOpen,
  onCloseEditContact,
  onSaveContact,
  isCreateExistingModalOpen,
  onCloseCreateExistingModal,
  onSaveExistingClient,
  isCreateModalOpen,
  onCloseCreateModal,
  onSaveCreateClient,
  showMarkLostModal,
  onCloseMarkLostModal,
  onConfirmMarkLost,
  isAddTaskDialogOpen,
  onConfirmAddTask,
  onCloseAddTaskDialog,
  isReactivateConfirmOpen,
  onConfirmReactivateDeal,
  onCloseReactivateConfirm,
}: ClientModalsSectionProps) {
  return (
    <>
      {currentClient && (
        <>
          <ClientLogModal
            isOpen={isLogModalOpen}
            onClose={onCloseLogModal}
            onSave={onSaveActivity}
            clientName={currentClient.name}
            isLostClient={currentClient.status === 'closed_lost'}
          />

          <ClientEditSpecsModal
            isOpen={isEditSpecsOpen}
            onClose={onCloseEditSpecs}
            specs={currentClient.roofSpecs}
            onSave={onSaveSpecs}
          />
        </>
      )}

      {(editingClient || currentClient) && (
        <ClientEditContactModal
          isOpen={isEditContactOpen}
          onClose={onCloseEditContact}
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
          onSave={onSaveContact}
        />
      )}

      {isCreateExistingModalOpen && (
        <CreateExistingClientModal
          isOpen={isCreateExistingModalOpen}
          onClose={onCloseCreateExistingModal}
          onSave={onSaveExistingClient}
        />
      )}

      {isCreateModalOpen && (
        <CreateClientModal
          isOpen={isCreateModalOpen}
          onClose={onCloseCreateModal}
          onSave={onSaveCreateClient}
        />
      )}

      {currentClient && (
        <MarkLeadLostModal
          lead={showMarkLostModal ? ({
            id: currentClient.id,
            name: currentClient.name,
            city: currentClient.city,
            value: (currentClient.roofSpecs as any)?.estimatedValue ?? 0,
          } as any) : null}
          onClose={onCloseMarkLostModal}
          onConfirm={onConfirmMarkLost}
        />
      )}

      <PromptDialog
        isOpen={isAddTaskDialogOpen}
        title="Add Task / Reminder"
        message="Enter task or reminder description for this client schedule:"
        placeholder="e.g. Follow up on shingle color selection..."
        onConfirm={onConfirmAddTask}
        onCancel={onCloseAddTaskDialog}
      />

      <ConfirmDialog
        isOpen={isReactivateConfirmOpen}
        title="Reactivate Client Deal"
        message={`Reactivate ${currentClient?.name || 'this client'} back into the active Sales Pipeline?`}
        confirmLabel="Reactivate Deal"
        variant="primary"
        onConfirm={onConfirmReactivateDeal}
        onCancel={onCloseReactivateConfirm}
      />
    </>
  );
}
