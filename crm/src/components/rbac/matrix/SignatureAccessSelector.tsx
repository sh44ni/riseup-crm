import React from 'react';
import { Ban, Eye, Lock, PenLine, PenTool } from 'lucide-react';
import {
  SIGNATURE_ACCESS_DESCRIPTIONS,
  SIGNATURE_ACCESS_LABELS,
  SIGNATURE_ACCESS_LEVELS,
  type SignatureAccess,
} from '@/lib/signatureAccess';

export const OWNER_ONLY_EDIT_REASON = 'Only the Owner can grant edit access';

interface SignatureAccessSelectorProps {
  value: SignatureAccess;
  onChange: (level: SignatureAccess) => void;
  /** Disables every option (e.g. locked Owner role or caller lacks rights). */
  disabled?: boolean;
  /** Disables only the 'edit' option (non-owner callers cannot grant edit). */
  disableEdit?: boolean;
  /** Tooltip / helper shown when the selector or the edit option is locked. */
  lockedReason?: string;
  /** Radio group name — must be unique per page. */
  name?: string;
  /** Always use a 2-column grid (for narrow containers such as modals). */
  compact?: boolean;
  className?: string;
}

const ICONS: Record<SignatureAccess, React.ComponentType<{ size?: number; className?: string }>> = {
  none: Ban,
  view: Eye,
  use: PenLine,
  edit: PenTool,
};

const ACTIVE_STYLES: Record<SignatureAccess, string> = {
  none: 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white border-slate-300 dark:border-white/20',
  view: 'bg-sky-50 dark:bg-sky-950/60 text-sky-900 dark:text-sky-200 border-sky-300 dark:border-sky-800',
  use: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200 border-indigo-300 dark:border-indigo-800',
  edit: 'bg-purple-100 dark:bg-purple-950/60 text-purple-900 dark:text-purple-200 border-purple-300 dark:border-purple-800',
};

/**
 * 4-level segmented radio for a role's company-signature access.
 * Levels are hierarchical: Can edit ⊃ Can use ⊃ Can view.
 */
export function SignatureAccessSelector({
  value,
  onChange,
  disabled = false,
  disableEdit = false,
  lockedReason,
  name = 'signature_access',
  compact = false,
  className = '',
}: SignatureAccessSelectorProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Signature access"
      className={`grid ${compact ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-4'} gap-1.5 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200/90 dark:border-white/10 ${className}`}
    >
      {SIGNATURE_ACCESS_LEVELS.map((level) => {
        const Icon = ICONS[level];
        const checked = value === level;
        const optionDisabled = disabled || (level === 'edit' && disableEdit && !checked);
        const title = optionDisabled
          ? level === 'edit' && disableEdit && !disabled
            ? lockedReason || OWNER_ONLY_EDIT_REASON
            : lockedReason
          : SIGNATURE_ACCESS_DESCRIPTIONS[level];

        return (
          <label
            key={level}
            title={title}
            className={`flex flex-col gap-0.5 px-3 py-2 rounded-lg border text-left transition-all ${
              checked
                ? `${ACTIVE_STYLES[level]} shadow-2xs`
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'
            } ${optionDisabled ? 'opacity-55 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <span className="flex items-center gap-1.5 text-xs font-bold">
              <input
                type="radio"
                name={name}
                value={level}
                checked={checked}
                disabled={optionDisabled}
                onChange={() => onChange(level)}
                className="text-purple-600 focus:ring-purple-500"
              />
              <Icon size={12} />
              <span>{SIGNATURE_ACCESS_LABELS[level]}</span>
              {optionDisabled && level === 'edit' && <Lock size={10} className="ml-auto opacity-70" />}
            </span>
            <span className="text-[10.5px] leading-snug pl-5">{SIGNATURE_ACCESS_DESCRIPTIONS[level]}</span>
          </label>
        );
      })}
    </div>
  );
}
