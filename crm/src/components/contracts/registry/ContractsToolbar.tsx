import React from 'react';
import { ContractsSummary } from '@/api/contractApi';

interface ContractsToolbarProps {
  summary: ContractsSummary;
  statusFilter: string;
  contractsCount: number;
  onStatusFilterChange: (status: string) => void;
}

export function ContractsToolbar({
  summary,
  statusFilter,
  contractsCount,
  onStatusFilterChange,
}: ContractsToolbarProps) {
  const TABS = [
    { id: 'all', label: `All Contracts (${summary.totalCount})` },
    { id: 'client_signed', label: `1-Party Signed (${summary.clientSignedCount || 0})` },
    { id: 'signed', label: `Executed (${summary.signedCount || 0})` },
    { id: 'sent', label: `Sent (${summary.sentCount || 0})` },
    { id: 'draft', label: `Drafts (${summary.draftCount || 0})` },
    { id: 'archived', label: `Archived (${summary.archivedCount || 0})` },
  ];

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-2xl light-glass-panel glossy-sheen border border-white/85 dark:border-white/10 shadow-xs">
      <div className="flex items-center gap-1.5 flex-wrap">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onStatusFilterChange(tab.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusFilter === tab.id
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-xs'
                : 'bg-white/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
        Showing <span className="font-bold text-slate-900 dark:text-white">{contractsCount}</span> contracts
      </div>
    </div>
  );
}
