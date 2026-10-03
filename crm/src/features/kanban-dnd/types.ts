import { PipelineStageId } from '@/components/pipeline/pipelineTypes';
import { BackwardMoveWarning } from '@/components/pipeline/BackwardMoveModal';
import { GatedLeadCard } from '@/components/pipeline/EstimateSentGatedModal';

export type { BackwardMoveWarning, GatedLeadCard, PipelineStageId };
export type GatedEstimateCard = GatedLeadCard;

export interface KanbanCard {
  id: string;
  name: string;
  stageId: PipelineStageId | string;
  value?: number;
  address?: string;
  street?: string;
  city?: string;
  zip?: string;
  service?: string;
  serviceColor?: string;
  phone?: string;
  email?: string;
  assignedToUserId?: string | number | null;
  assignedToName?: string | null;
  createdByName?: string | null;
  estimator?: {
    name: string;
    avatarUrl?: string;
    avatar?: string;
    role?: string;
  };
  isFollowupOverdue?: boolean;
  followupNotes?: string[];
  daysInStage?: number;
  slaStatus?: string;
  slaText?: string;
  source?: string;
  leadSource?: string;
  hasPhotos?: boolean;
  notesCount?: number;
  appointmentDateTime?: string;
}

export interface KanbanColumn {
  id: string;
  title: string;
  shortTitle?: string;
  stepNumber: number;
  accentColor: string;
  borderColor?: string;
  pillBg?: string;
  pillText?: string;
  cards?: KanbanCard[];
}

export interface DropIntent {
  card: {
    id: string;
    name: string;
    location: string;
    address?: string;
    city?: string;
    service?: string;
    serviceColor?: string;
    phone?: string;
    email?: string;
    value?: number;
  };
  fromCol: {
    id: string;
    title: string;
    accentColor: string;
    pillClass?: string;
  };
  toCol: {
    id: string;
    title: string;
    accentColor: string;
    pillClass?: string;
  };
  targetStageId: PipelineStageId;
}

export interface PendingScheduleDeal {
  id: string;
  name: string;
  customerName?: string;
  currentStageId: string;
  targetStageId: string;
}
