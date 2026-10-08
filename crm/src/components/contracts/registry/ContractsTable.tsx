import React from 'react';
import { RefreshCw, FileText, Plus } from 'lucide-react';
import { ContractRow } from '@/api/contractApi';
import { ContractTableRow } from './ContractTableRow';
import { ShimmerBox } from '@/components/common/Skeletons';

interface ContractsTableProps {
  loading: boolean;
  contracts: ContractRow[];
  statusFilter: string;
  downloadingId: number | null;
  canCounterSign: boolean;
  onOpenStudio: (id?: number) => void;
  onDownloadPdf: (
    e: React.MouseEvent,
    c: ContractRow,
    version?: 'draft' | 'partially_executed' | 'fully_executed'
  ) => void;
  onCounterSign: (c: ContractRow) => void;
  onToggleArchive: (c: ContractRow) => void;
  onDeleteDraft: (c: ContractRow) => void;
}

export function ContractsTable({
  loading,
  contracts,
  statusFilter,
  downloadingId,
  canCounterSign,
  onOpenStudio,
  onDownloadPdf,
  onCounterSign,
  onToggleArchive,
  onDeleteDraft,
}: ContractsTableProps) {
  return (
    <div className="rounded-2xl light-glass-panel glossy-sheen border border-white/85 dark:border-white/10 shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200/70 dark:border-white/10 bg-white/60 dark:bg-slate-900/70 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <th className="py-3.5 px-4">Contract #</th>
              <th className="py-3.5 px-4">Homeowner / Client</th>
              <th className="py-3.5 px-4">Property Address</th>
              <th className="py-3.5 px-4">Scope / Service</th>
              <th className="py-3.5 px-4 text-right">Contract Value</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4">Date Created</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-xs">
            {loading ? (
              Array.from({ length: 7 }).map((_, i) => (
                <tr key={i} style={{ opacity: 1 - i * 0.1 }}>
                  <td className="py-3.5 px-4"><ShimmerBox className="h-5 w-24 rounded-lg" /></td>
                  <td className="py-3.5 px-4">
                    <div className="space-y-1">
                      <ShimmerBox className="h-4 w-32 rounded" />
                      <ShimmerBox className="h-3 w-20 rounded" />
                    </div>
                  </td>
                  <td className="py-3.5 px-4"><ShimmerBox className="h-3.5 w-40 rounded" /></td>
                  <td className="py-3.5 px-4"><ShimmerBox className="h-5 w-24 rounded-full" /></td>
                  <td className="py-3.5 px-4 text-right"><ShimmerBox className="h-4 w-20 rounded ml-auto" /></td>
                  <td className="py-3.5 px-4"><ShimmerBox className="h-5 w-20 rounded-full" /></td>
                  <td className="py-3.5 px-4"><ShimmerBox className="h-3.5 w-24 rounded" /></td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <ShimmerBox className="h-7 w-20 rounded-xl" />
                      <ShimmerBox className="h-7 w-8 rounded-xl" />
                    </div>
                  </td>
                </tr>
              ))
            ) : contracts.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-16 text-center">
                  <div className="max-w-md mx-auto space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center mx-auto">
                      <FileText size={24} />
                    </div>
                    <div className="text-base font-bold text-slate-800 dark:text-slate-100">
                      {statusFilter === 'archived' ? 'No archived contracts' : 'No contracts found'}
                    </div>
                    <p className="text-xs text-slate-500">
                      {statusFilter === 'archived'
                        ? 'Contracts that are archived will appear here for audit history.'
                        : 'Launch the split-screen Contract Studio to customize scope, payment schedules, and deliver California-compliant contracts.'}
                    </p>
                    {statusFilter !== 'archived' && (
                      <button
                        type="button"
                        onClick={() => onOpenStudio()}
                        className="mt-2 py-2 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <Plus size={14} />
                        <span>Launch Contract Studio</span>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              contracts.map((c) => (
                <ContractTableRow
                  key={c.id}
                  contract={c}
                  downloadingId={downloadingId}
                  canCounterSign={canCounterSign}
                  onOpenStudio={(id) => onOpenStudio(id)}
                  onDownloadPdf={onDownloadPdf}
                  onCounterSign={onCounterSign}
                  onToggleArchive={onToggleArchive}
                  onDeleteDraft={onDeleteDraft}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
