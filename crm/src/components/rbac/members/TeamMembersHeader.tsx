import React from 'react';
import { RotateCcw, UserPlus, Users } from 'lucide-react';

interface TeamMembersHeaderProps {
  usersCount: number;
  pendingCount: number;
  isLoading: boolean;
  canInvite: boolean;
  onRefresh: () => void;
  onOpenInvite: () => void;
}

export function TeamMembersHeader({
  usersCount,
  pendingCount,
  isLoading,
  canInvite,
  onRefresh,
  onOpenInvite,
}: TeamMembersHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl bg-white/90 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 backdrop-blur-md shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/50 flex items-center justify-center text-sky-600 dark:text-sky-400 font-bold shadow-2xs">
          <Users size={20} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>Team Roster & Invitations</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-sky-100 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/50">
              {usersCount} Active Staff
            </span>
            {pendingCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50">
                {pendingCount} Pending
              </span>
            )}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Assign roles, control field access scopes, and provision new team members with secure invitations.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 hover:bg-slate-50 hover:dark:bg-slate-700 hover:text-slate-900 hover:dark:text-white hover:border-slate-300 transition-all flex items-center gap-2 shadow-2xs cursor-pointer"
        >
          <RotateCcw size={14} className={isLoading ? 'animate-spin text-sky-600' : 'text-slate-500 dark:text-slate-400'} />
          <span>Sync</span>
        </button>

        {canInvite && (
          <button
            onClick={onOpenInvite}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 shadow-[0_2px_12px_rgba(224,104,0,0.25)] transition-all flex items-center gap-2 cursor-pointer"
          >
            <UserPlus size={15} />
            <span>Invite Team Member</span>
          </button>
        )}
      </div>
    </div>
  );
}
