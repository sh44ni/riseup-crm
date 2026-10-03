import { useState, useRef, useCallback } from 'react';
import {
  KanbanCard,
  KanbanColumn,
  DropIntent,
  BackwardMoveWarning,
  GatedEstimateCard,
  PendingScheduleDeal,
  PipelineStageId,
} from './types';

export interface UseKanbanDnDProps {
  cards: KanbanCard[];
  columns: KanbanColumn[];
  canAdvanceStage: boolean;
  onMoveCard: (cardId: string, targetStageId: string, notes?: string) => Promise<void>;
  onScheduleMove?: (cardId: string, appointmentDateTime: string) => Promise<void>;
  notifyWarning?: (msg: string) => void;
  notifySuccess?: (msg: string) => void;
  notifyError?: (msg: string) => void;
}

export function useKanbanDnD({
  cards,
  columns,
  canAdvanceStage,
  onMoveCard,
  onScheduleMove,
  notifyWarning,
  notifySuccess,
  notifyError,
}: UseKanbanDnDProps) {
  const dragCardRef = useRef<{ cardId: string; fromColId: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOverColId, setDragOverColId] = useState<string | null>(null);
  const [dropIntent, setDropIntent] = useState<DropIntent | null>(null);
  const [isMoving, setIsMoving] = useState(false);
  const [backwardMoveWarning, setBackwardMoveWarning] = useState<BackwardMoveWarning | null>(null);
  const [gatedEstimateCard, setGatedEstimateCard] = useState<GatedEstimateCard | null>(null);
  const [pendingScheduleDeal, setPendingScheduleDeal] = useState<PendingScheduleDeal | null>(null);

  const handleDragStart = useCallback((cardId: string, fromColId: string) => {
    if (!canAdvanceStage) return;
    dragCardRef.current = { cardId, fromColId };
    setIsDragging(true);
  }, [canAdvanceStage]);

  const handleDragEnd = useCallback(() => {
    dragCardRef.current = null;
    setIsDragging(false);
    setDragOverColId(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, colId: string) => {
    if (!canAdvanceStage) return;
    e.preventDefault();
    setDragOverColId(colId);
  }, [canAdvanceStage]);

  const handleDragLeave = useCallback((colId: string) => {
    setDragOverColId((prev) => (prev === colId ? null : prev));
  }, []);

  const executeDropIntent = useCallback((cardId: string, targetColId: string) => {
    if (!canAdvanceStage) return;
    const card = cards.find((c) => c.id === cardId);
    if (!card || card.stageId === targetColId) return;

    const fromCol = columns.find((c) => c.id === card.stageId) || {
      id: card.stageId,
      title: card.stageId.replace(/_/g, ' ').toUpperCase(),
      shortTitle: card.stageId.replace(/_/g, ' ').toUpperCase(),
      stepNumber: 1,
      accentColor: '#0284c7',
      pillBg: 'bg-sky-500/15 border-sky-500/30',
      pillText: 'text-sky-700',
    };

    const toCol = columns.find((c) => c.id === targetColId) || {
      id: targetColId,
      title: targetColId.replace(/_/g, ' ').toUpperCase(),
      shortTitle: targetColId.replace(/_/g, ' ').toUpperCase(),
      stepNumber: 1,
      accentColor: '#10b981',
      pillBg: 'bg-emerald-500/15 border-emerald-500/30',
      pillText: 'text-emerald-700',
    };

    const fromStep = fromCol.stepNumber;
    const toStep = toCol.stepNumber;

    // 1. Backward move check: deals cannot move backward (except to closed_lost)
    if (targetColId !== 'closed_lost' && toStep < fromStep) {
      setBackwardMoveWarning({
        dealName: card.name,
        fromTitle: fromCol.shortTitle || fromCol.title,
        toTitle: toCol.shortTitle || toCol.title,
        fromStep,
        toStep,
      });
      return;
    }

    // 2. Unclaimed lead check
    const isUnclaimed =
      !card.assignedToUserId &&
      (!card.estimator?.name || card.estimator.name.toLowerCase() === 'unassigned') &&
      (!card.assignedToName || card.assignedToName.toLowerCase() === 'unassigned');

    if (isUnclaimed && targetColId !== 'cold_lead' && targetColId !== 'new_leads') {
      notifyWarning?.('Please claim the lead first before advancing its stage.');
      return;
    }

    // 3. Gated stages check
    if (targetColId === 'estimate_sent' || targetColId === 'contract_sent') {
      setGatedEstimateCard({
        id: card.id,
        name: card.name,
        location: card.address ? `${card.address}, ${card.city || ''}` : card.city || '',
        address: card.address,
        city: card.city,
        service: card.service,
        serviceColor: card.serviceColor,
        phone: card.phone,
        email: card.email,
        value: card.value,
        currentStageName: fromCol.shortTitle || fromCol.title,
      });
      return;
    }

    // 4. Appointment scheduling check
    if (targetColId === 'estimate_scheduled' || targetColId === 'est_scheduled') {
      setPendingScheduleDeal({
        id: card.id,
        name: card.name,
        customerName: card.name,
        currentStageId: card.stageId,
        targetStageId: targetColId,
      });
      return;
    }

    setDropIntent({
      card: {
        id: card.id,
        name: card.name,
        location: card.address ? `${card.address}, ${card.city || ''}` : card.city || '',
        service: card.service,
        serviceColor: card.serviceColor,
        phone: card.phone,
        email: card.email,
      },
      fromCol: {
        id: fromCol.id,
        title: fromCol.shortTitle || fromCol.title,
        accentColor: fromCol.accentColor,
        pillClass: `${fromCol.pillBg || ''} ${fromCol.pillText || ''} font-black border`,
      },
      toCol: {
        id: toCol.id,
        title: toCol.shortTitle || toCol.title,
        accentColor: toCol.accentColor,
        pillClass: `${toCol.pillBg || ''} ${toCol.pillText || ''} font-black border`,
      },
      targetStageId: targetColId as PipelineStageId,
    });
  }, [cards, columns, canAdvanceStage, notifyWarning]);

  const handleDropOnColumn = useCallback((e: React.DragEvent, targetColId: string) => {
    e.preventDefault();
    setIsDragging(false);
    setDragOverColId(null);
    const drag = dragCardRef.current;
    dragCardRef.current = null;
    if (!drag) return;
    executeDropIntent(drag.cardId, targetColId);
  }, [executeDropIntent]);

  const handleConfirmMove = useCallback(async (notes: string) => {
    if (!dropIntent) return;
    const { card, targetStageId, toCol } = dropIntent;
    setIsMoving(true);
    try {
      await onMoveCard(card.id, targetStageId, notes);
      notifySuccess?.(`Moved ${card.name} to ${toCol.title}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Move not permitted. Deal returned to original stage.';
      notifyError?.(msg);
    } finally {
      setIsMoving(false);
      setDropIntent(null);
    }
  }, [dropIntent, onMoveCard, notifySuccess, notifyError]);

  const handleCancelMove = useCallback(() => {
    setDropIntent(null);
  }, []);

  const handleConfirmScheduleMove = useCallback(async (appointmentDateTime: string) => {
    if (!pendingScheduleDeal) return;
    setIsMoving(true);
    try {
      if (onScheduleMove) {
        await onScheduleMove(pendingScheduleDeal.id, appointmentDateTime);
      } else {
        await onMoveCard(pendingScheduleDeal.id, pendingScheduleDeal.targetStageId, `Scheduled appointment for ${appointmentDateTime}`);
      }
      notifySuccess?.(`Scheduled appointment and moved ${pendingScheduleDeal.name}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to schedule appointment';
      notifyError?.(msg);
    } finally {
      setIsMoving(false);
      setPendingScheduleDeal(null);
    }
  }, [pendingScheduleDeal, onScheduleMove, onMoveCard, notifySuccess, notifyError]);

  const handleCancelScheduleMove = useCallback(() => {
    setPendingScheduleDeal(null);
  }, []);

  const handleQuickAdvance = useCallback(async (cardId: string, targetColId: string) => {
    executeDropIntent(cardId, targetColId);
  }, [executeDropIntent]);

  return {
    isDragging,
    dragOverColId,
    dropIntent,
    isMoving,
    backwardMoveWarning,
    setBackwardMoveWarning,
    gatedEstimateCard,
    setGatedEstimateCard,
    pendingScheduleDeal,
    setPendingScheduleDeal,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDropOnColumn,
    executeDropIntent,
    handleConfirmMove,
    handleCancelMove,
    handleConfirmScheduleMove,
    handleCancelScheduleMove,
    handleQuickAdvance,
  };
}
