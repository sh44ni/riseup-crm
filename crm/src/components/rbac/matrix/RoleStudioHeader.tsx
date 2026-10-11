import React from 'react';
import { Lock, PenTool, RotateCcw, Save, Trash2 } from 'lucide-react';
import { Role } from '../types';
import { SIGNATURE_ACCESS_LABELS, type SignatureAccess } from '@/lib/signatureAccess';
import { OWNER_ONLY_EDIT_REASON, SignatureAccessSelector } from './SignatureAccessSelector';

interface RoleStudioHeaderProps {
  activeRole: Role;
  activeSignatureAccess: SignatureAccess;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  /** Whether the *current user* is the Owner. */
  isOwner: boolean;
  onSaveChanges: () => void;
  onPromptDeleteRole: (role: Role) => void;
  onSignatureAccessChange: (level: SignatureAccess) => void;
}

export function RoleStudioHeader({
  activeRole,
  activeSignatureAccess,
  hasUnsavedChanges,
  isSaving,
  isOwner,
  onSaveChanges,
  onPromptDeleteRole,
  onSignatureAccessChange,
}: RoleStudioHeaderProps) {
  const isOwnerRole = activeRole.name.toLowerCase() === 'owner';
  const isAdminRole = ['administrator', 'admin'].includes(activeRole.name.toLowerCase());
  const isPermanentSystemRole = Boolean(activeRole.is_protected) || isOwnerRole || isAdminRole;
  const canEdit = !isOwnerRole && (isAdminRole ? isOwner : true);
  // The Owner role is always 'edit', regardless of what the payload says.
  const effectiveAccess: SignatureAccess = isOwnerRole ? 'edit' : activeSignatureAccess;

  return (
    <>
      {/* Studio Header Bar */}
      <div className="p-5 border-b border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-slate-800/40 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-black uppercase tracking-wider text-sky-700 dark:text-sky-300 bg-sky-100 dark:bg-sky-950/50 px-2 py-0.5 rounded-md border border-sky-200 dark:border-sky-800/50">
              Configuring Role
            </span>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">{activeRole.name}</h2>
            {isOwnerRole && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 flex items-center gap-1">
                <Lock size={10} /> Root Owner
              </span>
            )}
            {isAdminRole && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-100 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 flex items-center gap-1">
                <Lock size={10} /> Protected Administrator
              </span>
            )}
            {effectiveAccess !== 'none' && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-purple-100 dark:bg-purple-950/50 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 flex items-center gap-1">
                <PenTool size={10} /> Signature: {SIGNATURE_ACCESS_LABELS[effectiveAccess]}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {activeRole.description || 'Custom operational role with tailored module permissions.'}
          </p>
        </div>

        {/* Save & Delete Actions */}
        <div className="flex items-center flex-wrap gap-2">
          {canEdit && (
            <button
              type="button"
              onClick={onSaveChanges}
              disabled={isSaving || !hasUnsavedChanges}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                hasUnsavedChanges
                  ? 'bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white shadow-md animate-pulse'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-white/10 cursor-not-allowed'
              }`}
            >
              {isSaving ? (
                <>
                  <RotateCcw size={13} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save size={13} />
                  <span>{hasUnsavedChanges ? 'Save Changes *' : 'Saved'}</span>
                </>
              )}
            </button>
          )}

          {!isPermanentSystemRole && (
            <button
              type="button"
              onClick={() => onPromptDeleteRole(activeRole)}
              title="Delete this role"
              aria-label="Delete this role"
              className="p-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 transition-colors cursor-pointer"
            >
              <Trash2 size={15} />
            </button>
          )}

          {isOwnerRole && (
            <div className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-300 text-xs font-semibold flex items-center gap-1.5">
              <Lock size={13} className="text-amber-600 dark:text-amber-400" />
              <span>Owner permissions are permanent root (* &rarr; all).</span>
            </div>
          )}

          {isAdminRole && !isOwner && (
            <div className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5">
              <Lock size={13} className="text-indigo-600 dark:text-indigo-400" />
              <span>Only the Owner can customize what Administrators can see.</span>
            </div>
          )}

          {isAdminRole && isOwner && (
            <div className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/50 text-indigo-800 dark:text-indigo-300 text-xs font-semibold flex items-center gap-1.5">
              <span>Owner Control: You can adjust what Administrators can see below.</span>
            </div>
          )}
        </div>
      </div>

      {/* Company Signature Access (4-level radio) */}
      <div className="px-5 py-3.5 border-b border-slate-200/90 dark:border-white/10 bg-gradient-to-r from-purple-50/70 via-indigo-50/40 to-slate-50 dark:from-purple-950/25 dark:via-indigo-950/20 dark:to-slate-900/40 space-y-3">
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/60 flex items-center justify-center text-purple-700 dark:text-purple-300 shrink-0 mt-0.5">
            <PenTool size={15} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-900 dark:text-white">Company Signature Access</span>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-700/50">
                {SIGNATURE_ACCESS_LABELS[effectiveAccess]}
              </span>
              {isOwnerRole && (
                <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1">
                  <Lock size={10} /> Always “Can edit” for the Owner
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              What members of this role can do with the company contract signature. Each level includes the ones
              before it.
            </p>
          </div>
        </div>

        <SignatureAccessSelector
          name="active_role_signature_access"
          value={effectiveAccess}
          onChange={onSignatureAccessChange}
          disabled={!canEdit}
          disableEdit={!isOwner}
          lockedReason={
            isOwnerRole
              ? 'The Owner role always has edit access'
              : isAdminRole && !isOwner
                ? 'Only the Owner can change Administrator access'
                : !isOwner
                  ? OWNER_ONLY_EDIT_REASON
                  : undefined
          }
        />
      </div>
    </>
  );
}
