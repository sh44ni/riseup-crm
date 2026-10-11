import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Loader2, RotateCcw } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import type {
  CompanySignature,
  CompanySignatureHistoryEntry,
  CompanySignatureUpdatePayload,
} from '@/types/companySignatureTypes';
import { CompanySignatureCard } from './company-signature/CompanySignatureCard';
import { CompanySignatureEmptyState } from './company-signature/CompanySignatureEmptyState';
import { CompanySignatureEditorModal } from './company-signature/CompanySignatureEditorModal';
import { CompanySignatureHistory } from './company-signature/CompanySignatureHistory';

/**
 * Settings → Company Signature.
 *
 * One shared contractor signature (Edith Guerrero) for the whole company.
 * - view: see the signature and its history
 * - edit: set it up / change it (every change requires a reason and is logged)
 */
export function CompanySignatureTab() {
  const { canSignature } = useAuth();
  const { toast } = useToast();
  const canEdit = canSignature('edit');

  const [signature, setSignature] = useState<CompanySignature | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [history, setHistory] = useState<CompanySignatureHistoryEntry[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState<boolean>(true);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);

  const loadSignature = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.getCompanySignature();
      setSignature(res.configured && res.signature ? res.signature : null);
    } catch (err) {
      setError((err as Error | null)?.message || 'Could not load the company signature.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    setIsHistoryLoading(true);
    setHistoryError(null);
    try {
      const res = await api.getCompanySignatureHistory();
      setHistory(Array.isArray(res.history) ? res.history : []);
    } catch (err) {
      setHistoryError((err as Error | null)?.message || 'Could not load the signature history.');
    } finally {
      setIsHistoryLoading(false);
    }
  }, []);

  const reloadAll = useCallback(async () => {
    await Promise.all([loadSignature(), loadHistory()]);
  }, [loadSignature, loadHistory]);

  useEffect(() => {
    void reloadAll();
  }, [reloadAll]);

  const closeEditor = useCallback(() => setIsEditorOpen(false), []);

  const handleSubmit = async (payload: CompanySignatureUpdatePayload) => {
    const isFirst = !signature;
    try {
      await api.updateCompanySignature(payload);
    } catch (err) {
      // A conflict means our copy is stale — refresh it in the background so the next try is correct.
      if ((err as { status?: number } | null)?.status === 409) void reloadAll();
      throw err;
    }
    toast.success(isFirst ? 'Company signature set up.' : 'Company signature updated.');
    setIsEditorOpen(false);
    await reloadAll();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">Company Signature</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            The single contractor signature used on every Rise Up contract.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void reloadAll()}
          disabled={isLoading}
          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-white/10 transition-colors cursor-pointer"
          title="Refresh"
          aria-label="Refresh company signature"
        >
          <RotateCcw size={14} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {isLoading ? (
        <div className="py-12 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 space-y-2">
          <Loader2 size={22} className="animate-spin text-purple-600" />
          <span className="text-xs font-medium">Loading company signature…</span>
        </div>
      ) : error ? (
        <div
          role="alert"
          className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-3 text-xs text-rose-700 dark:text-rose-300"
        >
          <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600" />
          <div>
            <strong>Error loading the company signature:</strong> {error}
          </div>
        </div>
      ) : signature ? (
        <CompanySignatureCard signature={signature} canEdit={canEdit} onChange={() => setIsEditorOpen(true)} />
      ) : (
        <CompanySignatureEmptyState canEdit={canEdit} onSetUp={() => setIsEditorOpen(true)} />
      )}

      {(signature || history.length > 0) && (
        <CompanySignatureHistory history={history} isLoading={isHistoryLoading} error={historyError} />
      )}

      {canEdit && (
        <CompanySignatureEditorModal
          isOpen={isEditorOpen}
          current={signature}
          onClose={closeEditor}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}
