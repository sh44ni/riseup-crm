import React from 'react';
import { Plus, ShieldCheck, UserCheck } from 'lucide-react';
import { CrmPageHero } from '@/components/common/CrmPageHero';

interface ClientDirectoryHeroProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearchClear: () => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  canCreateClient: boolean;
  onOpenCreateModal: () => void;
  onOpenCreateExistingModal: () => void;
  isOwnOnly: boolean;
  totalClientsCount: number;
}

export function ClientDirectoryHero({
  searchQuery,
  onSearchChange,
  onSearchClear,
  searchInputRef,
  canCreateClient,
  onOpenCreateModal,
  onOpenCreateExistingModal,
  isOwnOnly,
  totalClientsCount,
}: ClientDirectoryHeroProps) {
  return (
    <CrmPageHero
      pageId="clients"
      defaultEyebrow="CLIENT 360 REGISTRY • HOMEOWNER INTELLIGENCE"
      defaultTitle="Unified Homeowner Records & 360 Directory"
      defaultSubtitle="Comprehensive homeowner profiles, active jobsites, 50-year warranty certificates, and closed lost win-back cadences."
      showSearch={true}
      searchPlaceholder="Search by client name, street address, material, or assigned rep..."
      searchValue={searchQuery}
      onSearchChange={onSearchChange}
      onSearchClear={onSearchClear}
      searchRef={searchInputRef}
      topRightActions={
        canCreateClient ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenCreateExistingModal}
              className="h-9 flex items-center gap-1.5 px-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-xs hover:shadow-md hover:scale-[1.02] transition-all cursor-pointer border border-emerald-500/30"
              title="Onboard an existing homeowner directly into any CRM pipeline stage"
            >
              <UserCheck size={14} className="stroke-[2.5]" />
              <span>Existing Homeowner</span>
            </button>

            <button
              type="button"
              onClick={onOpenCreateModal}
              className="h-9 flex items-center gap-1.5 px-4 rounded-xl bg-gradient-to-r from-brand-600 via-sky-500 to-sky-400 text-white font-bold text-xs shadow-xs hover:shadow-md hover:scale-[1.02] transition-all cursor-pointer"
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
            <span>{totalClientsCount} Verified Records</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50/90 border border-sky-200/90 text-[10px] font-bold text-sky-800 shadow-2xs shrink-0">
            <ShieldCheck size={11} className="text-sky-600" />
            <span>CSLB #1084221</span>
          </span>
        </div>
      }
    />
  );
}
