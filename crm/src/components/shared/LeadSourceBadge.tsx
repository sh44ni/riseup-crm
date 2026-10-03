import React from 'react';
import { getLeadSourceBadgeInfo } from '@/utils/leadHelpers';

export interface LeadSourceBadgeProps {
  dealOrLead: {
    leadSource?: string | null;
    lead_source?: string | null;
    leadSourceDetail?: string | null;
    lead_source_detail?: string | null;
    source?: string | null;
    createdByName?: string | null;
    formType?: string | null;
    form_type?: string | null;
  };
  className?: string;
  size?: 'xs' | 'sm';
}

export function LeadSourceBadge({
  dealOrLead,
  className = '',
  size = 'xs',
}: LeadSourceBadgeProps) {
  const info = getLeadSourceBadgeInfo(dealOrLead);
  const sizeClasses = size === 'xs' ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] px-2 py-0.5';

  return (
    <span
      className={`rounded-md shrink-0 truncate max-w-[130px] inline-flex items-center gap-1 ${sizeClasses} ${info.badgeClass} ${className}`}
      title={info.tooltip}
    >
      {info.label}
    </span>
  );
}

export default LeadSourceBadge;
