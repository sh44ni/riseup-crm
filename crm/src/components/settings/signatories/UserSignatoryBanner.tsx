import React from 'react';
import { CheckCircle2, Clock, Lock, PenTool, ShieldCheck } from 'lucide-react';
import { SignatoryUser } from './types';

interface UserSignatoryBannerProps {
  isCurrentUserSignatory: boolean;
  mySignatory?: SignatoryUser;
  currentUser: { id: number; name: string; email: string; is_authorized_signatory?: boolean } | null;
  onOpenEditModal: (signatory: SignatoryUser) => void;
  onNavigateToRoles?: () => void;
}

export function UserSignatoryBanner({
  isCurrentUserSignatory,
  mySignatory,
  currentUser,
  onOpenEditModal,
  onNavigateToRoles,
}: UserSignatoryBannerProps) {
  if (!isCurrentUserSignatory) {
    return (
      <div className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-2.5">
          <Lock size={16} className="text-slate-400 shrink-0" />
          <span>
            <strong>Your Account Status:</strong> You do not currently hold Authorized Signatory authority. Signatory roles can be assigned by company administrators in Roles &amp; Permissions.
          </span>
        </div>
        {onNavigateToRoles && (
          <button
            type="button"
            onClick={onNavigateToRoles}
            className="text-purple-600 dark:text-purple-400 font-bold hover:underline shrink-0 text-xs cursor-pointer"
          >
            View Roles &rarr;
          </button>
        )}
      </div>
    );
  }

  const isConfigured = Boolean(mySignatory?.has_signature);

  return (
    <div
      className={`p-4 sm:p-5 rounded-2xl border transition-all ${
        isConfigured
          ? 'bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent border-emerald-500/30'
          : 'bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-transparent border-purple-500/30'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm ${
              isConfigured
                ? 'bg-gradient-to-tr from-emerald-600 to-teal-600'
                : 'bg-gradient-to-tr from-purple-600 to-indigo-600'
            }`}
          >
            <ShieldCheck size={22} className="stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Your Signatory Status: Active Authorized Signatory
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                You ({currentUser?.name})
              </span>
              {isConfigured ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <CheckCircle2 size={10} /> Signature Ready
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  <Clock size={10} /> Signature Required
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
              {isConfigured
                ? 'Your official signature is configured and stored privately. When you counter-sign contracts, your personal electronic signature will be legally affixed.'
                : 'You hold legal signatory authority on your account, but you must establish your personal electronic signature before counter-signing contracts.'}
            </p>
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (mySignatory) {
                onOpenEditModal(mySignatory);
              } else if (currentUser) {
                onOpenEditModal({
                  id: currentUser.id,
                  name: currentUser.name,
                  email: currentUser.email,
                  role_names: ['Authorized Signatory'],
                  signature_title: 'Project Manager',
                  signature_type: 'typed',
                  has_signature: false,
                  is_self: true,
                });
              }
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm transition-all flex items-center gap-1.5 cursor-pointer ${
              isConfigured
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-purple-600 hover:bg-purple-700'
            }`}
          >
            <PenTool size={13} />
            <span>{isConfigured ? 'Edit My Signature' : 'Configure My Signature'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
