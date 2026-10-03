import React from 'react';
import {
  MapPin,
  Loader2,
  UserCheck,
  Edit3,
  UserCog,
  X,
} from 'lucide-react';

export interface DealModalHeaderProps {
  displayName: string;
  displayLocation: string;
  displayStageTitle: string;
  stagePillClass: string;
  displayId: string;
  isLoadingDetails: boolean;
  isUnassigned: boolean;
  canClaimLead: boolean;
  isClaiming: boolean;
  canReassignLead: boolean;
  onOpenClaimModal: () => void;
  onOpenEditContact: () => void;
  onOpenReassignModal: () => void;
  onClose: () => void;
}

export function DealModalHeader({
  displayName,
  displayLocation,
  displayStageTitle,
  stagePillClass,
  displayId,
  isLoadingDetails,
  isUnassigned,
  canClaimLead,
  isClaiming,
  canReassignLead,
  onOpenClaimModal,
  onOpenEditContact,
  onOpenReassignModal,
  onClose,
}: DealModalHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-200/70 dark:border-white/10 shrink-0">
      <div>
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-2xs ${stagePillClass}`}>
            {displayStageTitle}
          </span>
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
            ID: #{displayId.toUpperCase()}
          </span>
          {isLoadingDetails && (
            <Loader2 size={11} className="animate-spin text-sky-500" />
          )}
        </div>
        <h2 className="text-xl font-black text-[#1F1F1F] dark:text-white tracking-tight">
          {displayName}
        </h2>
        <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
          <MapPin size={12} className="text-[#1878B8]" />
          <span>{displayLocation}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {isUnassigned && canClaimLead && (
          <button
            type="button"
            onClick={onOpenClaimModal}
            disabled={isClaiming}
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            {isClaiming ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <UserCheck size={13} />
            )}
            <span>Claim Lead</span>
          </button>
        )}

        <button
          type="button"
          onClick={onOpenEditContact}
          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
          title="Edit Contact Info (Name, Phone, Email, Address)"
        >
          <Edit3 size={13} />
          <span>Edit Info</span>
        </button>

        {!isUnassigned && canReassignLead && (
          <button
            type="button"
            onClick={onOpenReassignModal}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            title="Reassign lead to another staff member"
          >
            <UserCog size={13} />
            <span>Reassign</span>
          </button>
        )}

        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-xl liquid-glass-btn text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
          title="Close modal"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
