import { Lead } from '@/types/leadTypes';

export function getSourceBadges(lead: Lead): {
  type: 'website' | 'manual';
  mainLabel: string;
  detailLabel: string | null;
} {
  if (lead.source === 'website') {
    let detail = lead.leadSourceDetail ? lead.leadSourceDetail.trim() : null;
    if (detail) {
      const stripped = detail.replace(/^website\s*[-–:]?\s*/i, '').trim();
      if (!stripped || stripped.toLowerCase() === 'lead' || stripped.toLowerCase() === 'website') {
        detail = null;
      } else {
        detail = stripped;
      }
    }
    return {
      type: 'website',
      mainLabel: 'Website Lead',
      detailLabel: detail,
    };
  }

  return {
    type: 'manual',
    mainLabel: lead.sourceLabel || 'Manual Entry',
    detailLabel: lead.leadSourceDetail && lead.leadSourceDetail !== lead.sourceLabel ? lead.leadSourceDetail : null,
  };
}

export const getServiceBadgeClass = (color: string) => {
  switch (color) {
    case 'sky':
      return 'bg-sky-100/90 text-[#0284c7] border border-sky-300/80 font-bold shadow-2xs backdrop-blur-xs';
    case 'amber':
      return 'bg-amber-100/90 text-amber-900 border border-[#F9C500]/70 font-bold shadow-2xs backdrop-blur-xs';
    case 'blue':
      return 'bg-blue-100/90 text-blue-900 border border-blue-300/80 font-bold shadow-2xs backdrop-blur-xs';
    case 'coral':
      return 'bg-rose-100/90 text-rose-900 border border-rose-300/80 font-bold shadow-2xs backdrop-blur-xs';
    case 'purple':
      return 'bg-purple-100/90 text-purple-900 border border-purple-300/80 font-bold shadow-2xs backdrop-blur-xs';
    case 'emerald':
      return 'bg-emerald-100/90 text-emerald-900 border border-emerald-300/80 font-bold shadow-2xs backdrop-blur-xs';
    default:
      return 'bg-slate-100 text-slate-800 border border-slate-300 font-bold shadow-2xs';
  }
};
