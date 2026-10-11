import React from 'react';
import { Check, Lock, PenTool } from 'lucide-react';
import { Role } from '../types';
import { SIGNATURE_ACCESS_LABELS, hasSignatureAccess, normalizeSignatureAccess } from '@/lib/signatureAccess';

interface RoleSelectorGridProps {
  roles: Role[];
  selectedRoleId: number | null;
  onSelectRole: (role: Role) => void;
}

export function RoleSelectorGrid({
  roles,
  selectedRoleId,
  onSelectRole,
}: RoleSelectorGridProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1">
        <span>Select Role to Configure</span>
        <span>Click a role to adjust its module radios</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
        {roles.map((r) => {
          const isSelected = r.id === selectedRoleId;
          return (
            <button
              key={r.id}
              onClick={() => onSelectRole(r)}
              className={`p-3 rounded-xl text-left transition-all relative border flex flex-col justify-between cursor-pointer ${
                isSelected
                  ? 'bg-sky-50/80 dark:bg-sky-950/60 border-sky-400 dark:border-sky-500 shadow-sm ring-2 ring-sky-400/20 dark:ring-sky-500/30'
                  : 'bg-white dark:bg-slate-800/70 border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 hover:bg-slate-50/50 hover:dark:bg-slate-800 shadow-2xs'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className={`text-xs font-bold truncate ${isSelected ? 'text-sky-900 dark:text-sky-200' : 'text-slate-900 dark:text-white'}`}>
                    {r.name}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    {hasSignatureAccess(r.signature_access, 'use') && (
                      <span
                        title={`Company signature: ${SIGNATURE_ACCESS_LABELS[normalizeSignatureAccess(r.signature_access)]}`}
                        className="text-purple-600 dark:text-purple-400"
                      >
                        <PenTool size={11} />
                      </span>
                    )}
                    {r.is_protected && (
                      <span title={r.name.toLowerCase() === 'owner' ? "Root Owner Role" : "Protected Administrator Role"}>
                        <Lock size={11} className={r.name.toLowerCase() === 'owner' ? "text-amber-600 dark:text-amber-400 shrink-0" : "text-indigo-600 dark:text-indigo-400 shrink-0"} />
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                  {r.description || 'Custom role'}
                </p>
              </div>

              <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100 dark:border-white/5 text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                <span>{r.user_count ?? 0} staff</span>
                {isSelected && (
                  <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 flex items-center gap-0.5">
                    <Check size={11} /> Active
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
