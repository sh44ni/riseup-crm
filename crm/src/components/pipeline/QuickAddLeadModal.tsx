import React from 'react';
import { CreateLeadModal, CreateLeadPayload } from './CreateLeadModal';

interface QuickAddLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onSubmitLead?: (lead: CreateLeadPayload) => void;
  initialStageId?: string;
}

export function QuickAddLeadModal({
  isOpen,
  onClose,
  onSuccess,
  onSubmitLead,
  initialStageId,
}: QuickAddLeadModalProps) {
  return (
    <CreateLeadModal
      isOpen={isOpen}
      onClose={onClose}
      initialStageId={initialStageId}
      onSubmitLead={(lead) => {
        if (onSubmitLead) onSubmitLead(lead);
        if (onSuccess) onSuccess();
      }}
    />
  );
}

export { CreateLeadModal };
export type { CreateLeadPayload };
