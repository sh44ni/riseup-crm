import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  FileText,
  DollarSign,
  CheckCircle2,
  Filter,
  ChevronRight,
  Download,
  Archive,
  RotateCcw,
  Trash2,
  Edit,
  RefreshCw,
} from 'lucide-react';
import { CrmPageHero } from '@/components/common/CrmPageHero';
import { UniversalStatCard } from '@/components/common/UniversalStatCard';
import { WizardShell } from '@/components/estimates/wizard/WizardShell';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { NewEstimateChooserModal } from '@/components/estimates/NewEstimateChooserModal';
import { UploadAndSendModal } from '@/components/estimates/UploadAndSendModal';
import { api } from '@/lib/api';
import { formatEstimatePrice } from '@/shared/config/estimateConstants';
import { useToast } from '@/context/ToastContext';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { useEstimatesListQuery, type EstimateRow, type EstimateSummary } from '@/entities/estimate/queries';
import { useDebounce } from '@/hooks/useDebounce';

// ─── Component ──────────────────────────────────────────────────────────────

export function EstimatesPage() {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Determine view mode from URL
  const mode = searchParams.get('mode') || 'registry';
  const editId = searchParams.get('id');

  // Registry state
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 250);
  const [statusFilter, setStatusFilter] = useState('all');
  const [deleteConfirmEstimate, setDeleteConfirmEstimate] = useState<EstimateRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Modal state
  const [showChooser, setShowChooser] = useState(false);
  const [showUploadSend, setShowUploadSend] = useState(false);

  // ── Fetch estimates for registry via TanStack Query ────────────────────
  const {
    data,
    isLoading,
    isFetching,
    refetch,
  } = useEstimatesListQuery(statusFilter, { enabled: mode === 'registry' });

  const estimates = data?.estimates || [];
  const summary = data?.summary || { totalCount: 0, pipelineValue: 0, acceptedCount: 0, acceptedValue: 0 };
  const loading = isLoading && !data;

  const handleToggleArchive = async (est: EstimateRow) => {
    try {
      if (est.is_archived) {
        await api.request(`/admin/estimates/${est.id}/unarchive`, { method: 'PATCH' });
        toast.success(`Unarchived estimate ${est.estimate_number}`);
      } else {
        await api.request(`/admin/estimates/${est.id}/archive`, { method: 'PATCH' });
        toast.success(`Archived estimate ${est.estimate_number}`);
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.estimates.all() });
    } catch (err: any) {
      toast.error(`Failed to update archive status: ${err.message || 'Unknown error'}`);
    }
  };

  const handleDeleteDraft = async () => {
    if (!deleteConfirmEstimate) return;
    setIsDeleting(true);
    try {
      await api.request(`/admin/estimates/${deleteConfirmEstimate.id}`, { method: 'DELETE' });
      toast.success('Estimate draft deleted successfully');
      setDeleteConfirmEstimate(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.estimates.all() });
    } catch (err: any) {
      toast.error(`Failed to delete draft: ${err.message || 'Unknown error'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Navigation helpers ────────────────────────────────────────────────

  const openNewEstimate = () => {
    // If navigating from pipeline/lead with client params, skip chooser & go directly to studio
    const clientName = searchParams.get('clientName') || searchParams.get('name');
    const leadId = searchParams.get('leadId');
    if (clientName || leadId) {
      openStudioDirect();
    } else {
      setShowChooser(true);
    }
  };

  const openStudioDirect = () => {
    const params = new URLSearchParams({ mode: 'studio' });
    const clientName = searchParams.get('clientName') || searchParams.get('name');
    const leadId = searchParams.get('leadId');
    if (clientName) params.set('clientName', clientName);
    if (leadId) params.set('leadId', leadId);
    ['phone', 'email', 'address', 'city', 'clientId'].forEach(k => {
      const v = searchParams.get(k);
      if (v) params.set(k, v);
    });
    setSearchParams(params);
  };

  const openEditEstimate = (id: number) => {
    setSearchParams({ mode: 'studio', id: String(id) });
  };

  const backToRegistry = () => {
    setSearchParams({});
    refetch();
  };

  // ── Auto-open studio if navigating with client params ─────────────────

  useEffect(() => {
    const qName = searchParams.get('clientName') || searchParams.get('name');
    const qLeadId = searchParams.get('leadId');
    if ((qName || qLeadId) && mode !== 'studio') {
      openStudioDirect();
    }
  }, []); // only on mount


  // ── Filter estimates ──────────────────────────────────────────────────

  const filtered = useMemo<EstimateRow[]>(() => {
    if (!debouncedSearch) return estimates;
    const q = debouncedSearch.toLowerCase();
    return estimates.filter((e: EstimateRow) =>
      (e.customer_name || '').toLowerCase().includes(q) ||
      (e.estimate_number || '').toLowerCase().includes(q) ||
      (e.customer_email || '').toLowerCase().includes(q) ||
      (e.customer_address || '').toLowerCase().includes(q)
    );
  }, [estimates, debouncedSearch]);

  // ── Render: Studio Mode (Wizard) ──────────────────────────────────────

  if (mode === 'studio') {
    return (
      <WizardShell
        estimateId={editId}
        onBack={backToRegistry}
        prefill={{
          clientName: searchParams.get('clientName') || searchParams.get('name') || undefined,
          leadId: searchParams.get('leadId') || undefined,
          phone: searchParams.get('phone') || undefined,
          email: searchParams.get('email') || undefined,
          address: searchParams.get('address') || undefined,
          city: searchParams.get('city') || undefined,
          clientId: searchParams.get('clientId') || undefined,
        }}
      />
    );
  }

  // ── Render: Registry Mode (List) ──────────────────────────────────────

  const statusBadge = (status: string, isArchived?: boolean) => {
    if (isArchived) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border shadow-2xs bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30">
          archived
        </span>
      );
    }
    const colors: Record<string, string> = {
      draft: 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10',
      sent: 'bg-blue-50 dark:bg-sky-950/60 text-blue-700 dark:text-sky-300 border-blue-200 dark:border-sky-500/30',
      accepted: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30',
      declined: 'bg-red-50 dark:bg-rose-950/60 text-red-600 dark:text-rose-300 border-red-200 dark:border-rose-500/30',
      archived: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30',
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border shadow-2xs ${colors[status] || colors.draft}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Hero */}
      <CrmPageHero
        pageId="estimates"
        defaultEyebrow="Manage"
        defaultTitle="Estimates & Proposals"
        defaultSubtitle="Generate, track, and deliver professional roofing proposals."
        topRightActions={
          <button
            onClick={openNewEstimate}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#1878B8] to-[#55C4F5] text-white text-sm font-bold shadow-xs hover:brightness-110 transition-all cursor-pointer"
          >
            <Plus size={16} />
            New Estimate
          </button>
        }
      />

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <UniversalStatCard
          label="Total Estimates"
          value={summary.totalCount}
          icon={FileText}
        />
        <UniversalStatCard
          label="Pipeline Value"
          value={formatEstimatePrice(summary.pipelineValue)}
          icon={DollarSign}
        />
        <UniversalStatCard
          label="Accepted"
          value={summary.acceptedCount}
          icon={CheckCircle2}
        />
        <UniversalStatCard
          label="Accepted Value"
          value={formatEstimatePrice(summary.acceptedValue)}
          icon={DollarSign}
        />
      </div>

      {/* Search & Filter Bar */}
      <div className="light-glass-card rounded-2xl p-4 border border-slate-200/80 dark:border-white/10 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search estimates by name, number, email..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-[#1878B8] focus:ring-2 focus:ring-[#1878B8]/20 text-sm outline-none transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-slate-400 dark:text-slate-500" />
            {['all', 'draft', 'sent', 'accepted', 'archived'].map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  statusFilter === s
                    ? 'bg-gradient-to-r from-[#1878B8] to-[#55C4F5] text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700/80 border border-slate-200/60 dark:border-white/10'
                }`}
              >
                {s === 'archived' ? `Archived (${summary.archivedCount || 0})` : s === 'all' ? 'All' : s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Estimates Table */}
      <div className="light-glass-card rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 dark:text-slate-500 text-sm">Loading estimates...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <FileText size={40} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-1">
              {statusFilter === 'archived' ? 'No archived estimates' : 'No estimates found'}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">
              {statusFilter === 'archived'
                ? 'Estimates that are archived will appear here for audit history.'
                : search
                ? 'Try a different search term.'
                : 'Create your first estimate to get started.'}
            </p>
            {statusFilter !== 'archived' && (
              <button
                onClick={openNewEstimate}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#1878B8] to-[#55C4F5] text-white text-xs font-bold hover:brightness-110 shadow-xs transition-all cursor-pointer"
              >
                <Plus size={14} className="inline mr-1" />
                New Estimate
              </button>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200/70 dark:border-white/10 bg-slate-50/70 dark:bg-slate-900/80">
                <th className="text-left px-4 py-3 text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">Estimate #</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">Client</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">Status</th>
                <th className="text-right px-4 py-3 text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">Total</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">Created</th>
                <th className="text-right px-4 py-3 text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/70 dark:divide-white/5">
              {filtered.map(est => (
                <tr
                  key={est.id}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 cursor-pointer transition-colors group"
                  onClick={() => openEditEstimate(est.id)}
                >
                  <td className="px-4 py-3">
                    <span className="font-mono font-bold text-[#1878B8] dark:text-sky-400 text-xs">{est.estimate_number}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-800 dark:text-slate-100 group-hover:text-[#1878B8] dark:group-hover:text-sky-400 transition-colors text-xs">{est.customer_name || '—'}</div>
                    {est.customer_address && (
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 truncate max-w-[200px]">{est.customer_address}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">{statusBadge(est.status, est.is_archived)}</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-800 dark:text-slate-100 text-xs">
                    {est.total ? formatEstimatePrice(est.total) : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                    {est.created_at ? new Date(est.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                      {/* Open Studio */}
                      <button
                        className="p-1.5 rounded-lg text-slate-400 hover:text-[#1878B8] dark:hover:text-sky-400 hover:bg-blue-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
                        title="Edit in Studio"
                        onClick={() => openEditEstimate(est.id)}
                      >
                        <Edit size={14} />
                      </button>

                      {/* Download PDF */}
                      {est.pdf_url && (
                        <a
                          href={est.pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-[#1878B8] dark:hover:text-sky-400 hover:bg-blue-50 dark:hover:bg-slate-800 transition-all"
                          title="Download PDF"
                        >
                          <Download size={14} />
                        </a>
                      )}

                      {/* Archive / Unarchive */}
                      <button
                        type="button"
                        onClick={() => handleToggleArchive(est)}
                        className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                          est.is_archived
                            ? 'bg-amber-100 dark:bg-amber-950/60 hover:bg-amber-200 dark:hover:bg-amber-900 text-amber-700 dark:text-amber-300'
                            : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                        title={est.is_archived ? 'Unarchive Estimate (Restore to active list)' : 'Archive Estimate'}
                      >
                        {est.is_archived ? <RotateCcw size={14} /> : <Archive size={14} />}
                      </button>

                      {/* Delete Draft Button (Strictly for drafts) */}
                      {est.status === 'draft' && (
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmEstimate(est)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-all cursor-pointer"
                          title="Delete Draft Estimate"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Delete Draft Confirmation Modal */}
      <ConfirmDialog
        isOpen={Boolean(deleteConfirmEstimate)}
        title="Delete Estimate Draft"
        message={`Are you sure you want to permanently delete draft estimate ${deleteConfirmEstimate?.estimate_number || ''} for ${deleteConfirmEstimate?.customer_name || 'Draft'}? The record will be permanently removed from the database.`}
        confirmLabel={isDeleting ? 'Deleting...' : 'Delete Draft'}
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleDeleteDraft}
        onCancel={() => setDeleteConfirmEstimate(null)}
      />

      {/* New Estimate Chooser Modal */}
      <NewEstimateChooserModal
        isOpen={showChooser}
        onClose={() => setShowChooser(false)}
        onBuildStudio={() => openStudioDirect()}
        onUploadAndSend={() => setShowUploadSend(true)}
      />

      {/* Upload & Send Modal */}
      <UploadAndSendModal
        isOpen={showUploadSend}
        onClose={() => setShowUploadSend(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: queryKeys.estimates.all() });
        }}
      />
    </div>
  );
}
