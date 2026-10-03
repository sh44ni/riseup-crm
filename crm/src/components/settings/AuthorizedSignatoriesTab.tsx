import React, { useState, useEffect } from 'react';
import {
  PenTool,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  RotateCcw,
  Users,
  ArrowRight,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { SignatoryUser } from './signatories/types';
import { UserSignatoryBanner } from './signatories/UserSignatoryBanner';
import { SignatoryStatsRow } from './signatories/SignatoryStatsRow';
import { SignatoryCard } from './signatories/SignatoryCard';
import { EditSignatureModal } from './signatories/EditSignatureModal';

export type { SignatoryUser } from './signatories/types';

interface AuthorizedSignatoriesTabProps {
  onNavigateToRoles?: () => void;
}

export function AuthorizedSignatoriesTab({ onNavigateToRoles }: AuthorizedSignatoriesTabProps) {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [signatories, setSignatories] = useState<SignatoryUser[]>([]);
  const [configuredCount, setConfiguredCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Edit Signature Modal State
  const [editingSignatory, setEditingSignatory] = useState<SignatoryUser | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    toast.success(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadSignatories = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.getSignatories();
      setSignatories(res.signatories || []);
      setConfiguredCount(res.configured_count || 0);
    } catch (err: any) {
      console.error('Failed to load signatories:', err);
      setError(err.message || 'Could not fetch authorized signatories.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSignatories();
  }, []);

  const handleDeleteSignature = async (signatoryId: number) => {
    if (!window.confirm('Are you sure you want to remove your electronic signature? You will not be able to counter-sign contracts until a new signature is configured.')) {
      return;
    }
    try {
      await api.deleteSignatorySignature(signatoryId);
      showToast('Signature removed successfully.');
      setEditingSignatory(null);
      await loadSignatories();
    } catch (err: any) {
      console.error('Failed to remove signature:', err);
      toast.error(err.message || 'Failed to remove signature. Please try again.');
    }
  };

  const handleSaveSignature = async (
    id: number,
    name: string,
    title: string,
    type: 'typed' | 'drawn',
    data: string
  ) => {
    try {
      await api.updateSignatorySignature(id, {
        signature_name: name,
        signature_title: title,
        signature_type: type,
        signature_data: data,
      });

      showToast(`Signature successfully saved for ${name}!`);
      setEditingSignatory(null);
      await loadSignatories();
    } catch (err: any) {
      console.error('Failed to save signature:', err);
      toast.error(err.message || 'Failed to save signature. Please try again.');
      throw err;
    }
  };

  const handleOpenEditModal = (signatory: SignatoryUser) => {
    const isSelf = signatory.is_self ?? (signatory.id === currentUser?.id);
    if (!isSelf) {
      toast.warning('Signatures are private credentials. Each authorized signatory must set their signature from their own account.');
      return;
    }
    setEditingSignatory(signatory);
  };

  const mySignatory = signatories.find((s) => (s.is_self ?? (s.id === currentUser?.id)));
  const isCurrentUserSignatory = Boolean(currentUser?.is_authorized_signatory || mySignatory);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-700 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs font-bold animate-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      <UserSignatoryBanner
        isCurrentUserSignatory={isCurrentUserSignatory}
        mySignatory={mySignatory}
        currentUser={currentUser}
        onOpenEditModal={handleOpenEditModal}
        onNavigateToRoles={onNavigateToRoles}
      />

      <SignatoryStatsRow
        signatoriesCount={signatories.length}
        configuredCount={configuredCount}
      />

      {/* Main Container */}
      <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden backdrop-blur-md">
        <div className="p-5 border-b border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-purple-500/20">
              <PenTool size={20} className="stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Designated Contract Signatories
                </h2>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60">
                  Legal Authority
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Staff members granted legal authority to counter-sign California Home Improvement Contracts.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadSignatories}
              disabled={isLoading}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-white/10 transition-colors cursor-pointer"
              title="Refresh Signatories"
            >
              <RotateCcw size={14} className={isLoading ? 'animate-spin' : ''} />
            </button>

            {onNavigateToRoles && (
              <button
                type="button"
                onClick={onNavigateToRoles}
                className="px-3.5 py-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
              >
                <Users size={13} />
                <span>Manage Roles &amp; Authority</span>
              </button>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 space-y-2">
              <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-medium">Loading authorized signatories...</span>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-3 text-xs text-rose-700 dark:text-rose-300">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600" />
              <div>
                <strong>Error loading signatories:</strong> {error}
              </div>
            </div>
          ) : signatories.length === 0 ? (
            <div className="py-10 px-6 text-center max-w-lg mx-auto space-y-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-sm">
                <AlertCircle size={28} />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  No Authorized Signatories Found
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                  Contract counter-signing is currently blocked across the platform because no staff member has been designated as an Authorized Signatory.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/5 text-xs text-left text-slate-600 dark:text-slate-300 space-y-2">
                <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-purple-600" />
                  How to designate an authorized signatory:
                </div>
                <ol className="list-decimal list-inside space-y-1 text-[11.5px] text-slate-500 dark:text-slate-400 pl-1">
                  <li>Navigate to <strong>Users &amp; Permissions</strong> tab.</li>
                  <li>Select an operational role (e.g. <em>Owner</em>, <em>Head</em>, or <em>Project Manager</em>).</li>
                  <li>Set <strong>Authorized Signatory Authority</strong> to <strong>Authorized Signatory</strong>.</li>
                  <li>Assign staff members to that role and configure their signature below.</li>
                </ol>
              </div>

              {onNavigateToRoles && (
                <button
                  type="button"
                  onClick={onNavigateToRoles}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-purple-500/25 transition-all cursor-pointer"
                >
                  <span>Go to Roles &amp; Permissions</span>
                  <ArrowRight size={13} />
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {signatories.map((sig) => (
                <SignatoryCard
                  key={sig.id}
                  sig={sig}
                  isSelf={Boolean(sig.is_self ?? (sig.id === currentUser?.id))}
                  onOpenEditModal={handleOpenEditModal}
                  onDeleteSignature={handleDeleteSignature}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <EditSignatureModal
        editingSignatory={editingSignatory}
        onClose={() => setEditingSignatory(null)}
        onSave={handleSaveSignature}
        onDelete={handleDeleteSignature}
      />
    </div>
  );
}
