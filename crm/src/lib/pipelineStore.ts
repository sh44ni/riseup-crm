// Rise Up CRM — Pipeline Kanban Store
import { useState, useEffect, useCallback } from 'react';
import { usePipelineDashboardQuery } from '@/entities/pipeline/queries';
import type { PipelineSummary } from '@/api/pipelineApi';
import type { ColumnData, DealCard } from '@/components/pipeline/pipelineTypes';

export function usePipelineKanban() {
  const { data, isLoading, refetch } = usePipelineDashboardQuery();

  const [columns, setColumns] = useState<ColumnData[]>([]);
  const [summary, setSummary] = useState<PipelineSummary | null>(null);

  useEffect(() => {
    if (data?.columns && data.columns.length > 0) {
      setColumns(data.columns);
    }
    if (data?.summary) {
      setSummary(data.summary);
    }
  }, [data]);

  const moveCardOptimistically = useCallback((cardId: string, fromColId: string, toColId: string) => {
    if (fromColId === toColId) return;
    setColumns((prevCols) => {
      let movedCard: DealCard | null = null;
      const nextCols = prevCols.map((col) => {
        if (col.id === fromColId) {
          const card = col.cards.find((c) => c.id === cardId);
          if (card) movedCard = card;
          const filteredCards = col.cards.filter((c) => c.id !== cardId);
          return {
            ...col,
            cards: filteredCards,
            count: filteredCards.length,
          };
        }
        return col;
      });

      if (!movedCard) return prevCols;

      return nextCols.map((col) => {
        if (col.id === toColId) {
          const newCards = [movedCard!, ...col.cards];
          return {
            ...col,
            cards: newCards,
            count: newCards.length,
          };
        }
        return col;
      });
    });
  }, []);

  const updateCardAddress = useCallback((cardId: string, address?: string, city?: string, zip?: string) => {
    const cleanStreet = (address || '').trim();
    const cleanCity = (city || '').trim();
    const cleanZip = (zip || '').trim();
    const location = cleanStreet
      ? `${cleanStreet}${cleanCity ? `, ${cleanCity}` : ''}`
      : (cleanCity ? `${cleanCity}, CA` : 'No address provided');

    setColumns((prevCols) =>
      prevCols.map((col) => ({
        ...col,
        cards: col.cards.map((c) =>
          c.id === cardId
            ? {
                ...c,
                address: cleanStreet || undefined,
                city: cleanCity || undefined,
                zip: cleanZip || undefined,
                location,
              }
            : c
        ),
      }))
    );
  }, []);

  const refresh = useCallback(async (_isSilent?: boolean) => {
    await refetch();
  }, [refetch]);

  return {
    columns,
    setColumns,
    summary,
    isLoading,
    refetch,
    refresh,
    moveCardOptimistically,
    updateCardAddress,
  };
}
