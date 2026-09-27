// Rise Up CRM — Pipeline Kanban Store
import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchPipelineForDashboard, type PipelineSummary } from '../api/pipelineApi';
import type { ColumnData } from '../components/pipeline/pipelineTypes';
import { subscribeContactUpdated, type ContactUpdatedDetail } from '../utils/syncEventBus';

export function usePipelineKanban() {
  const queryClient = useQueryClient();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['pipeline-kanban'],
    queryFn: () => fetchPipelineForDashboard(),
    staleTime: 15_000,
    refetchInterval: 15_000,
  });

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
      let movedCard: any = null;
      // Extract the card from fromCol
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

      // Place card into toCol
      return nextCols.map((col) => {
        if (col.id === toColId) {
          const newCards = [movedCard, ...col.cards];
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

  useEffect(() => {
    const unsubscribe = subscribeContactUpdated((detail: ContactUpdatedDetail) => {
      const id = detail.leadId;
      if (!id) return;
      updateCardAddress(String(id), detail.address, detail.city, detail.zip);
      queryClient.invalidateQueries({ queryKey: ['pipeline-kanban'] });
    });
    return unsubscribe;
  }, [updateCardAddress, queryClient]);

  const refresh = useCallback(async (_silent = true) => {
    await refetch();
    queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
  }, [refetch, queryClient]);

  return { columns, setColumns, summary, isLoading, refresh, moveCardOptimistically, updateCardAddress };
}
