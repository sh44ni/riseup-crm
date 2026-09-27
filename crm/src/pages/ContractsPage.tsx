import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Plus,
  Search,
  FileText,
  DollarSign,
  CheckCircle2,
  Clock,
  ExternalLink,
  Send,
  Download,
  AlertTriangle,
  RefreshCw,
  ShieldCheck,
  Check,
  Award,
  Edit,
  Archive,
  RotateCcw,
  Trash2,
  PenTool,
} from 'lucide-react';
import { CrmPageHero } from '@/components/common/CrmPageHero';
import { UniversalStatCard } from '@/components/common/UniversalStatCard';
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
import { API_ORIGIN } from '@/lib/api';

export function ContractsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // Mode: 'registry' (table list) vs 'studio' (full-screen split Studio workspace)
  const mode = searchParams.get('mode') || 'registry';
  const editContractId = searchParams.get('id');

  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [summary, setSummary] = useState<ContractsSummary>({
    totalCount: 0,
    signedCount: 0,
    clientSignedCount: 0,
    sentCount: 0,
    draftCount: 0,
    archivedCount: 0,
    totalValue: 0,
    signedValue: 0,
  });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get('status') || 'all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const urlStatus = searchParams.get('status');
    if (urlStatus && urlStatus !== statusFilter) {
      setStatusFilter(urlStatus);
    }
  }, [searchParams]);
  const [selectedCounterSign, setSelectedCounterSign] = useState<ContractRow | null>(null);
  const [deleteConfirmContract, setDeleteConfirmContract] = useState<ContractRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchContractsList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getContracts({ status: statusFilter, search });
      setContracts(res.contracts || []);
      setSummary(res.summary || {
        totalCount: 0,
        signedCount: 0,
        sentCount: 0,
        draftCount: 0,
        totalValue: 0,
        signedValue: 0,
      });
    } catch (err) {
      console.error('Failed to fetch contracts:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    if (mode === 'registry') {
      fetchContractsList();
    }
  }, [mode, fetchContractsList]);

  const handleDeleteDraft = async () => {
    if (!deleteConfirmContract) return;
    setIsDeleting(true);
    try {
      await deleteContractDraft(deleteConfirmContract.id);
      toast.success('Contract draft deleted successfully');
      setDeleteConfirmContract(null);
      await fetchContractsList();
    } catch (err: any) {
      toast.error(`Failed to delete draft: ${err.message || 'Unknown error'}`);
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
      await fetchContractsList();
    } catch (err: any) {
      toast.error(`Failed to update archive status: ${err.message || 'Unknown error'}`);
    }
  };

  const openNewContractStudio = () => {
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

  const getStatusBadge = (c: ContractRow) => {
    if (c.is_archived) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-white/10">
          <Archive size={11} className="shrink-0 text-slate-500" />
          <span>Archived</span>
        </span>
      );
    }
    switch (c.status.toLowerCase()) {
      case 'signed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            <CheckCircle2 size={12} className="shrink-0 text-emerald-600" />
            <span>Signed / Executed</span>
          </span>
        );
      case 'client_signed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800 animate-pulse">
            <PenTool size={11} className="shrink-0 text-amber-600 dark:text-amber-400" />
            <span>1-Party Signed</span>
          </span>
        );
      case 'sent':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-300 dark:border-sky-800">
            <Clock size={12} className="shrink-0 text-sky-600" />
            <span>Sent (Awaiting Sign)</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-white/10">
            <FileText size={12} className="shrink-0 text-slate-500" />
            <span>Draft</span>
          </span>
        );
    }
  };

  // ═════════════════════════════════════════════════════════════════
  // MODE 1: SPLIT-SCREEN CONTRACT STUDIO (SAME ARCHITECTURE AS ESTIMATE STUDIO)
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
    <div className="space-y-4 max-w-[1600px] mx-auto select-none pb-14 animate-in fade-in duration-200">
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
              onClick={fetchContractsList}
              disabled={loading}
              className="h-9 flex items-center gap-1.5 px-3 rounded-xl liquid-glass-btn text-xs font-bold text-slate-700 hover:text-slate-900 dark:text-slate-200 transition-all cursor-pointer shadow-2xs"
              title="Refresh contracts"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin text-[#1878B8]' : ''} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              type="button"
              onClick={openNewContractStudio}
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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <UniversalStatCard
          label="Total Contracts"
          value={String(summary.totalCount)}
          icon={FileText}
          iconGradient="from-[#1878B8] to-[#55C4F5]"
          color="#0284c7"
          hoverBorderColor="hover:border-sky-400"
          blurColor="bg-sky-400/15 group-hover:bg-sky-400/25"
          footnoteLeft="All records"
          footnoteRight={`${summary.totalCount} generated`}
          sharePct={100}
          shareLabel="Portfolio"
          stageLabel="Contracts"
        />

        <UniversalStatCard
          label="Signed / Executed"
          value={String(summary.signedCount)}
          deltaLabel="🎉 Closed Won"
          icon={Award}
          iconGradient="from-[#059669] to-[#10b981]"
          color="#10b981"
          hoverBorderColor="hover:border-emerald-400"
          blurColor="bg-emerald-400/15 group-hover:bg-emerald-400/25"
          footnoteLeft="Fully signed"
          footnoteRight="Ready for production"
          sharePct={summary.totalCount > 0 ? Math.round((summary.signedCount / summary.totalCount) * 100) : 0}
          shareLabel="Signing rate"
          stageLabel="Executed"
        />

        <UniversalStatCard
          label="1-Party Signed"
          value={String(summary.clientSignedCount || 0)}
          deltaLabel={summary.clientSignedCount ? "Action Required" : "Up to date"}
          icon={PenTool}
          iconGradient="from-[#d97706] to-[#f59e0b]"
          color="#f59e0b"
          hoverBorderColor="hover:border-amber-400"
          blurColor="bg-amber-400/15 group-hover:bg-amber-400/25"
          footnoteLeft="Client signed"
          footnoteRight="Needs counter-sign"
          sharePct={summary.totalCount > 0 ? Math.round(((summary.clientSignedCount || 0) / summary.totalCount) * 100) : 0}
          shareLabel="Pending execution"
          stageLabel="Counter-signature"
        />

        <UniversalStatCard
          label="Sent (Awaiting Sign)"
          value={String(summary.sentCount)}
          deltaLabel="Pending"
          icon={Clock}
          iconGradient="from-[#0284c7] to-[#38bdf8]"
          color="#0284c7"
          hoverBorderColor="hover:border-sky-400"
          blurColor="bg-sky-400/15 group-hover:bg-sky-400/25"
          footnoteLeft="Delivered to client"
          footnoteRight="Review window"
          sharePct={summary.totalCount > 0 ? Math.round((summary.sentCount / summary.totalCount) * 100) : 0}
          shareLabel="Pending share"
          stageLabel="Out for signature"
        />

        <UniversalStatCard
          label="Signed Revenue"
          value={summary.signedValue > 0 ? `$${(summary.signedValue / 1000).toFixed(1)}k` : '$0'}
          deltaLabel="Locked In"
          icon={DollarSign}
          iconGradient="from-[#059669] to-[#34d399]"
          color="#10b981"
          hoverBorderColor="hover:border-emerald-400"
          blurColor="bg-emerald-400/15 group-hover:bg-emerald-400/25"
          footnoteLeft="Executed value"
          footnoteRight="Sold jobs"
          sharePct={summary.totalValue > 0 ? Math.round((summary.signedValue / summary.totalValue) * 100) : 0}
          shareLabel="Realized %"
          stageLabel="Signed revenue"
        />
      </div>

      {/* 3. FILTER TABS & TOOLBAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-2xl light-glass-panel glossy-sheen border border-white/85 dark:border-white/10 shadow-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { id: 'all', label: `All Contracts (${summary.totalCount})` },
            { id: 'client_signed', label: `1-Party Signed (${summary.clientSignedCount || 0})` },
            { id: 'signed', label: `Executed (${summary.signedCount || 0})` },
            { id: 'sent', label: `Sent (${summary.sentCount || 0})` },
            { id: 'draft', label: `Drafts (${summary.draftCount || 0})` },
            { id: 'archived', label: `Archived (${summary.archivedCount || 0})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setStatusFilter(tab.id);
                const nextParams = new URLSearchParams(searchParams);
                if (tab.id === 'all') {
                  nextParams.delete('status');
                } else {
                  nextParams.set('status', tab.id);
                }
                setSearchParams(nextParams);
              }}
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
          Showing <span className="font-bold text-slate-900 dark:text-white">{contracts.length}</span> contracts
        </div>
      </div>

      {/* 4. CONTRACTS REGISTRY TABLE */}
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
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-semibold">
                    <RefreshCw className="animate-spin inline-block mr-2" size={16} />
                    Loading contracts...
                  </td>
                </tr>
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
                          onClick={openNewContractStudio}
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
                  <tr
                    key={c.id}
                    onClick={() => setSearchParams({ mode: 'studio', id: String(c.id) })}
                    className="hover:bg-white/80 dark:hover:bg-slate-800/60 transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-amber-700 dark:text-amber-400">
                      {c.contract_number}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-[#1878B8] transition-colors">
                        {c.customer_name || 'Homeowner'}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {c.customer_phone || c.customer_email || '—'}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-800 dark:text-slate-200">
                        {c.customer_address || '—'}
                      </div>
                      {c.customer_city && (
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">{c.customer_city}, CA</div>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="inline-block text-[10.5px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10">
                        {c.service_type || 'Roof Installation'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right font-black text-slate-900 dark:text-white">
                      {c.estimated_value && Number(c.estimated_value) > 0
                        ? `$${Number(c.estimated_value).toLocaleString()}`
                        : '$31,000'}
                    </td>

                    <td className="py-3.5 px-4">{getStatusBadge(c)}</td>

                    <td className="py-3.5 px-4 text-[11px] text-slate-500 dark:text-slate-400">
                      {new Date(c.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>

                    <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Open Studio */}
                        <button
                          type="button"
                          onClick={() => setSearchParams({ mode: 'studio', id: String(c.id) })}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 transition-colors"
                          title="Open in Studio"
                        >
                          <Edit size={13} />
                        </button>

                        {/* Preview / View PDF */}
                        <a
                          href={c.signed_pdf_url ? `${API_ORIGIN}${c.signed_pdf_url}` : (c.pdf_url ? `${API_ORIGIN}${c.pdf_url}` : `/api/admin/contracts/${c.id}/preview`)}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900 text-[#1878B8] dark:text-sky-300 transition-colors"
                          title="Preview Contract PDF"
                        >
                          <ExternalLink size={14} />
                        </a>

                        {/* Counter-Sign Button (strictly for 1-party client_signed contracts) */}
                        {c.status === 'client_signed' && !c.is_archived && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCounterSign(c);
                            }}
                            className="flex items-center gap-1.5 text-[11px] font-extrabold px-3 py-1 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white transition-all shadow-xs hover:shadow-md cursor-pointer animate-pulse hover:animate-none"
                            title="Counter-Sign & Execute Contract"
                          >
                            <PenTool size={12} className="stroke-[2.5]" />
                            <span>Counter-Sign</span>
                          </button>
                        )}

                        {/* Archive / Unarchive Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleArchive(c);
                          }}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            c.is_archived
                              ? 'bg-amber-100 dark:bg-amber-950/60 hover:bg-amber-200 dark:hover:bg-amber-900 text-amber-700 dark:text-amber-300'
                              : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                          }`}
                          title={c.is_archived ? 'Unarchive Contract (Restore to active list)' : 'Archive Contract'}
                        >
                          {c.is_archived ? <RotateCcw size={13} /> : <Archive size={13} />}
                        </button>

                        {/* Delete Draft Button (Strictly for drafts) */}
                        {c.status === 'draft' && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirmContract(c);
                            }}
                            className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer"
                            title="Delete Draft Contract"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. COUNTER-SIGN MODAL */}
      <CounterSignModal
        contract={selectedCounterSign}
        isOpen={Boolean(selectedCounterSign)}
        onClose={() => setSelectedCounterSign(null)}
        onSuccess={() => {
          setSelectedCounterSign(null);
          fetchContractsList();
        }}
      />

      {/* 5. DELETE DRAFT CONFIRMATION MODAL */}
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
