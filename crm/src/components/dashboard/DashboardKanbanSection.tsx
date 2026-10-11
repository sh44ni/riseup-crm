import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { ColumnData, DealCard } from './dashboardTypes';
import { DashboardDealCard } from './DashboardDealCard';
import { KanbanColumnSkeleton } from './KanbanColumnSkeleton';
import { PipelineListView } from '@/components/pipeline/PipelineListView';
import { PipelineCalendarView } from '@/components/pipeline/PipelineCalendarView';
import type { EnrichedDeal } from '@/components/pipeline/pipelineTypes';

export interface DashboardKanbanSectionProps {
  viewMode?: 'kanban' | 'list' | 'calendar';
  onSelectDeal?: (deal: EnrichedDeal) => void;
  pipelineLoading: boolean;
  filteredColumns: ColumnData[];
  pipelineSearch: string;
  isDark: boolean;
  dragOverColId: string | null;
  canAdvanceStage: boolean;
  canViewFinances: boolean;
  canClaimLead: boolean;
  canReassignLead: boolean;
  editingAddressCardId?: string | null;
  addressFormStreet?: string;
  addressFormCity?: string;
  addressFormZip?: string;
  isSavingAddress?: boolean;
  addressSaveError?: string | null;
  onStreetChange?: (val: string) => void;
  onCityChange?: (val: string) => void;
  onZipChange?: (val: string) => void;
  onStartEditAddress?: (deal: any, e: React.SyntheticEvent) => void;
  onCancelEditAddress?: (e?: React.SyntheticEvent) => void;
  onSaveAddress?: (deal: any, e: React.SyntheticEvent) => void;
  onDragStart: (cardId: string, colId: string) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent, colId: string) => void;
  onDragLeave: (colId: string) => void;
  onDrop: (e: React.DragEvent, col: ColumnData) => void;
  onSelectCard: (card: DealCard, col: ColumnData) => void;
  onClaimLead: (card: DealCard) => void;
  onReassignLead: (card: DealCard) => void;
  onFollowUp: (card: DealCard) => void;
  renderColumnIcon: (iconType: string) => React.ReactNode;
  getServiceBadgeClass: (color?: string) => string;
  kanbanContainerRef: React.RefObject<HTMLDivElement | null>;
}

export function DashboardKanbanSection({
  viewMode = 'kanban',
  onSelectDeal = () => {},
  pipelineLoading,
  filteredColumns,
  pipelineSearch,
  isDark,
  dragOverColId,
  canAdvanceStage,
  canViewFinances,
  canClaimLead,
  canReassignLead,
  editingAddressCardId,
  addressFormStreet,
  addressFormCity,
  addressFormZip,
  isSavingAddress,
  addressSaveError,
  onStreetChange,
  onCityChange,
  onZipChange,
  onStartEditAddress,
  onCancelEditAddress,
  onSaveAddress,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  onSelectCard,
  onClaimLead,
  onReassignLead,
  onFollowUp,
  renderColumnIcon,
  getServiceBadgeClass,
  kanbanContainerRef,
}: DashboardKanbanSectionProps) {
  const navigate = useNavigate();

  // Memoize filtered and sorted cards per column to prevent expensive recalculations during drags
  const cardsByColId = useMemo(() => {
    const map = new Map<string, DealCard[]>();
    const searchLower = pipelineSearch.trim().toLowerCase();

    for (const col of filteredColumns) {
      let cards = col.cards;
      if (searchLower) {
        cards = cards.filter(
          (c) =>
            c.name.toLowerCase().includes(searchLower) ||
            c.location.toLowerCase().includes(searchLower) ||
            c.service.toLowerCase().includes(searchLower)
        );
      }

      if (col.id === 'follow_up') {
        cards = [...cards].sort((a, b) => {
          if (a.isFollowupOverdue && !b.isFollowupOverdue) return -1;
          if (!a.isFollowupOverdue && b.isFollowupOverdue) return 1;
          const remA = a.followupDaysRemaining ?? 7;
          const remB = b.followupDaysRemaining ?? 7;
          return remA - remB;
        });
      }

      map.set(col.id, cards);
    }
    return map;
  }, [filteredColumns, pipelineSearch]);

  if (pipelineLoading) {
    return (
      <div className="grid grid-cols-7 gap-2 items-stretch pb-0.5 w-full flex-1 min-h-0">
        {Array.from({ length: 7 }).map((_, i) => (
          <KanbanColumnSkeleton key={i} cardCount={i < 3 ? 3 : 2} />
        ))}
      </div>
    );
  }

  if (viewMode === 'list') {
    return (
      <div className="flex-1 min-h-0 overflow-auto" data-testid="dashboard-list-view">
        <PipelineListView
          columns={filteredColumns}
          pipelineSearch={pipelineSearch}
          onSelectDeal={onSelectDeal}
          getServiceBadgeClass={getServiceBadgeClass}
        />
      </div>
    );
  }

  if (viewMode === 'calendar') {
    return (
      <div className="flex-1 min-h-0 overflow-auto" data-testid="dashboard-calendar-view">
        <PipelineCalendarView
          columns={filteredColumns}
          pipelineSearch={pipelineSearch}
          onSelectDeal={onSelectDeal}
          getServiceBadgeClass={getServiceBadgeClass}
        />
      </div>
    );
  }

  return (
    <div
      ref={kanbanContainerRef}
      className="grid grid-cols-7 gap-2 items-stretch overflow-hidden pb-0.5 w-full flex-1 min-h-0"
    >
      {filteredColumns.map((col) => {
        const filteredCards = cardsByColId.get(col.id) || [];

        return (
          <div
            key={col.id}
            className="liquid-column-channel rounded-2xl p-1.5 flex flex-col min-w-0 min-h-0 max-h-full overflow-hidden transition-all duration-200 h-full"
            style={{
              backgroundColor: isDark ? 'rgba(10, 16, 28, 0.65)' : col.bgColor,
              border: `1.5px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : col.borderColor}`,
              boxShadow:
                dragOverColId === col.id
                  ? `0 0 0 2.5px ${col.accentColor}, inset 0 1.5px 1px 0 rgba(255,255,255,${
                      isDark ? '0.12' : '0.85'
                    }), 0 8px 32px -2px ${col.accentColor}35`
                  : isDark
                  ? `0 0 0 1px rgba(255,255,255,0.06), inset 0 1px 1px 0 rgba(255,255,255,0.04), 0 4px 16px -2px rgba(0,0,0,0.35)`
                  : `inset 0 1.5px 1px 0 rgba(255,255,255,0.95), 0 4px 16px -2px rgba(15,23,42,0.04)`,
              transform: dragOverColId === col.id ? 'scale(1.012)' : 'scale(1)',
            }}
            onDragOver={(e) => onDragOver(e, col.id)}
            onDragLeave={() => onDragLeave(col.id)}
            onDrop={(e) => onDrop(e, col)}
          >
            {/* Column Header */}
            <div
              className={`flex items-center justify-between px-2 py-1 rounded-xl shadow-xs flex-shrink-0 ${
                col.pillClass
              } ${
                col.id === 'contract_sent'
                  ? 'cursor-pointer hover:opacity-95 hover:shadow-sm transition-all group/colheader'
                  : ''
              }`}
              onClick={() => {
                if (col.id === 'contract_sent') {
                  navigate('/pipeline?stage=contract_sent');
                }
              }}
              title={col.id === 'contract_sent' ? 'View Sent Contracts in Pipeline' : undefined}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                {renderColumnIcon(col.iconType)}
                <span className="text-[10px] font-black truncate">{col.title}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0 ml-1">
                <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-md leading-normal ${col.badgeClass}`}>
                  {col.count}
                </span>
                {col.id === 'contract_sent' && (
                  <span
                    title="Open in Pipeline"
                    className="text-white/80 group-hover/colheader:text-white group-hover/colheader:translate-x-0.5 transition-all"
                  >
                    <ChevronRight size={10} className="stroke-[2.5]" />
                  </span>
                )}
              </div>
            </div>

            {/* Deal Cards Container */}
            <div className="flex-1 overflow-y-auto kanban-column-scroll min-h-0 space-y-1.5 mt-1.5 pr-0.5">
              {filteredCards.map((card) => (
                <DashboardDealCard
                  key={card.id}
                  card={card}
                  col={col}
                  canAdvanceStage={canAdvanceStage}
                  canViewFinances={canViewFinances}
                  canClaimLead={canClaimLead}
                  canReassignLead={canReassignLead}
                  isDark={isDark}
                  isEditingAddress={editingAddressCardId === String(card.id)}
                  addressFormStreet={addressFormStreet}
                  addressFormCity={addressFormCity}
                  addressFormZip={addressFormZip}
                  isSavingAddress={isSavingAddress}
                  addressSaveError={addressSaveError}
                  onStreetChange={onStreetChange}
                  onCityChange={onCityChange}
                  onZipChange={onZipChange}
                  onStartEditAddress={onStartEditAddress}
                  onCancelEditAddress={onCancelEditAddress}
                  onSaveAddress={onSaveAddress}
                  onDragStart={onDragStart}
                  onDragEnd={onDragEnd}
                  onClick={() => onSelectCard(card, col)}
                  onClaimLead={onClaimLead}
                  onReassignLead={onReassignLead}
                  onFollowUp={onFollowUp}
                  getServiceBadgeClass={getServiceBadgeClass}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default DashboardKanbanSection;
