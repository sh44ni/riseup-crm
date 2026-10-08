import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, RefreshCw, ShieldCheck } from 'lucide-react';
import { CrmPageHero } from '@/components/common/CrmPageHero';
import { ContractWizardShell } from '@/components/contracts/wizard/ContractWizardShell';
import { CounterSignModal } from '@/components/contracts/CounterSignModal';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import {
  getContracts,
  deleteContractDraft,
  archiveContract,
  unarchiveContract,
  ContractRow,
  ContractsSummary,
} from '@/api/contractApi';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { openapiClient } from '@/shared/api/client';
import { ContractsKpiCards } from '@/components/contracts/registry/ContractsKpiCards';
import { ContractsToolbar } from '@/components/contracts/registry/ContractsToolbar';
import { ContractsTable } from '@/components/contracts/registry/ContractsTable';

import { useContractsListQuery } from '@/entities/contract/queries';
import { useDebounce } from '@/hooks/useDebounce';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';

export function ContractsPage() {
  const { user, isOwner } = useAuth();
  const canCounterSign = isOwner || Boolean(user?.is_authorized_signatory);
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  // Mode: 'registry' (table list) vs 'studio' (full-screen split Studio workspace)
  const mode = searchParams.get('mode') || 'registry';
  const editContractId = searchParams.get('id');

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 250);
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get('status') || 'all');

  useEffect(() => {
    const urlStatus = searchParams.get('status');
    if (urlStatus && urlStatus !== statusFilter) {
      setStatusFilter(urlStatus);
    }
  }, [searchParams, statusFilter]);

  const {
    data,
    isLoading,
    isFetching,
    refetch,
  } = useContractsListQuery(
    {
      status: statusFilter,
      search: debouncedSearch.trim() || undefined,
    },
    { enabled: mode === 'registry' }
  );

  const contracts = data?.contracts || [];
  const summary: ContractsSummary = data?.summary || {
    totalCount: 0,
    signedCount: 0,
    clientSignedCount: 0,
    sentCount: 0,
    draftCount: 0,
    archivedCount: 0,
    totalValue: 0,
    signedValue: 0,
  };
  const loading = isLoading && !data;

  const [selectedCounterSign, setSelectedCounterSign] = useState<ContractRow | null>(null);
  const [deleteConfirmContract, setDeleteConfirmContract] = useState<ContractRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const handleDeleteDraft = async () => {
    if (!deleteConfirmContract) return;
    setIsDeleting(true);
    try {
      await deleteContractDraft(deleteConfirmContract.id);
      toast.success('Contract draft deleted successfully');
      setDeleteConfirmContract(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.contracts.all() });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Failed to delete draft: ${msg}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleArchive = async (contract: ContractRow) => {
    try {
      if (contract.is_archived) {
        await unarchiveContract(contract.id);
        toast.success(`Unarchived contract ${contract.contract_number}`);
      } else {
        await archiveContract(contract.id);
        toast.success(`Archived contract ${contract.contract_number}`);
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.contracts.all() });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Failed to update archive status: ${msg}`);
    }
  };

  const handleDownloadPdf = async (
    e: React.MouseEvent,
    c: ContractRow,
    version?: 'draft' | 'partially_executed' | 'fully_executed'
  ) => {
    e.stopPropagation();
    if (downloadingId === c.id) return;
    setDownloadingId(c.id);
    try {
      const { data: blob, error } = await openapiClient.GET(
        '/api/admin/contracts/{contract_id}/preview',
        {
          params: {
            path: { contract_id: c.id },
            query: version ? ({ version } as any) : undefined,
          },
          parseAs: 'blob',
        }
      );
      if (error || !blob) {
        toast.error(`Download failed — contract PDF not yet generated.`);
        return;
      }
      const blobUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = blobUrl;
      const statusSuffix =
        version === 'draft'
          ? 'Draft'
          : version === 'partially_executed'
          ? 'Partially-Executed'
          : version === 'fully_executed'
          ? 'Fully-Executed'
          : c.status === 'signed'
          ? 'Fully-Executed'
          : c.status === 'client_signed'
          ? 'Partially-Executed'
          : c.status === 'sent'
          ? 'Sent'
          : 'Draft';
      anchor.download = `Contract-${(c.contract_number || String(c.id)).replace(/\//g, '-')}-${statusSuffix}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(blobUrl);
      toast.success(`Downloaded ${anchor.download}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Download error: ${msg}`);
    } finally {
      setDownloadingId(null);
    }
  };

  const openContractStudio = (id?: number) => {
    if (id) {
      setSearchParams({ mode: 'studio', id: String(id) });
      return;
    }
    const params = new URLSearchParams({ mode: 'studio' });
    const clientName = searchParams.get('clientName') || searchParams.get('name');
    const leadId = searchParams.get('leadId');
    if (clientName) params.set('clientName', clientName);
    if (leadId) params.set('leadId', leadId);
    ['phone', 'email', 'address', 'city', 'clientId', 'service', 'value'].forEach((k) => {
      const v = searchParams.get(k);
      if (v) params.set(k, v);
    });
    setSearchParams(params);
  };

  // ═════════════════════════════════════════════════════════════════
  // MODE 1: SPLIT-SCREEN CONTRACT STUDIO
  // ═════════════════════════════════════════════════════════════════
  if (mode === 'studio') {
    return (
      <ContractWizardShell
        contractId={editContractId}
        onBack={() => setSearchParams({ mode: 'registry' })}
        prefill={{
          leadId: searchParams.get('leadId') || undefined,
          clientId: searchParams.get('clientId') || undefined,
          clientName: searchParams.get('clientName') || searchParams.get('name') || undefined,
          phone: searchParams.get('phone') || undefined,
          email: searchParams.get('email') || undefined,
          address: searchParams.get('address') || undefined,
          city: searchParams.get('city') || undefined,
          service: searchParams.get('service') || undefined,
          value: searchParams.get('value') ? Number(searchParams.get('value')) : undefined,
        }}
      />
    );
  }

  // ═════════════════════════════════════════════════════════════════
  // MODE 2: REGISTRY TABLE VIEW
  // ═════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-4 w-full select-none pb-14 animate-in fade-in duration-200">
      {/* 1. HERO BANNER */}
      <CrmPageHero
        pageId="contracts"
        defaultEyebrow="California CSLB Compliant • Electronic Execution"
        defaultTitle="HOME IMPROVEMENT CONTRACTS"
        defaultSubtitle="Generate, deliver, preview, and track signed California Home Improvement Contracts with live status and audit trails."
        showSearch={true}
        searchPlaceholder="Search contracts by number, homeowner name, or property address..."
        searchValue={search}
        onSearchChange={setSearch}
        onSearchClear={() => setSearch('')}
        topRightActions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className="h-9 flex items-center gap-1.5 px-3 rounded-xl liquid-glass-btn text-xs font-bold text-slate-700 hover:text-slate-900 dark:text-slate-200 transition-all cursor-pointer shadow-2xs"
              title="Refresh contracts"
            >
              <RefreshCw size={13} className={isFetching ? 'animate-spin text-[#1878B8]' : ''} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              type="button"
              onClick={() => openContractStudio()}
              className="h-9 flex items-center gap-1.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-500 text-white font-bold text-xs shadow-xs hover:shadow-md hover:scale-[1.02] transition-all cursor-pointer"
            >
              <Plus size={14} className="stroke-[3]" />
              <span>Contract Studio</span>
            </button>
          </div>
        }
        bottomRightBadges={
          <>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50/90 dark:bg-amber-950/60 border border-amber-200/90 dark:border-amber-800/60 text-[10px] font-bold text-amber-800 dark:text-amber-300 shadow-2xs">
              <ShieldCheck size={12} className="text-amber-600" />
              <span>CSLB Lic #1096492</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50/90 dark:bg-emerald-950/60 border border-emerald-200/90 dark:border-emerald-800/60 text-[10px] font-bold text-emerald-800 dark:text-emerald-300 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Signed: {summary.signedCount}</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50/90 dark:bg-sky-950/60 border border-sky-200/90 dark:border-sky-800/60 text-[10px] font-bold text-sky-800 dark:text-sky-300 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
              <span>Total: {summary.totalCount}</span>
            </div>
          </>
        }
      />

      {/* 2. EXECUTIVE KPI CARDS */}
      <ContractsKpiCards summary={summary} />

      {/* 3. FILTER TABS & TOOLBAR */}
      <ContractsToolbar
        summary={summary}
        statusFilter={statusFilter}
        contractsCount={contracts.length}
        onStatusFilterChange={(tabId) => {
          setStatusFilter(tabId);
          const nextParams = new URLSearchParams(searchParams);
          if (tabId === 'all') {
            nextParams.delete('status');
          } else {
            nextParams.set('status', tabId);
          }
          setSearchParams(nextParams);
        }}
      />

      {/* 4. CONTRACTS REGISTRY TABLE */}
      <ContractsTable
        loading={loading}
        contracts={contracts}
        statusFilter={statusFilter}
        downloadingId={downloadingId}
        canCounterSign={canCounterSign}
        onOpenStudio={openContractStudio}
        onDownloadPdf={handleDownloadPdf}
        onCounterSign={setSelectedCounterSign}
        onToggleArchive={handleToggleArchive}
        onDeleteDraft={setDeleteConfirmContract}
      />

      {/* 5. COUNTER-SIGN MODAL */}
      <CounterSignModal
        contract={selectedCounterSign}
        isOpen={Boolean(selectedCounterSign)}
        onClose={() => setSelectedCounterSign(null)}
        onSuccess={() => {
          setSelectedCounterSign(null);
          refetch();
        }}
      />

      {/* 6. DELETE DRAFT CONFIRMATION MODAL */}
      <ConfirmDialog
        isOpen={Boolean(deleteConfirmContract)}
        title="Delete Contract Draft"
        message={`Are you sure you want to permanently delete draft ${deleteConfirmContract?.contract_number || ''} for ${deleteConfirmContract?.customer_name || 'Homeowner'}? This action cannot be undone.`}
        confirmLabel={isDeleting ? 'Deleting...' : 'Delete Draft'}
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleDeleteDraft}
        onCancel={() => setDeleteConfirmContract(null)}
      />
    </div>
  );
}

export default ContractsPage;
