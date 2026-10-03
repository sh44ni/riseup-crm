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

export interface LeadSourceBadgeInfo {
  label: string;
  badgeClass: string;
  tooltip: string;
  category: 'storm_promo' | 'estimator' | 'landing' | 'contact' | 'website' | 'manual';
}

export function getLeadSourceBadgeInfo(dealOrLead: {
  leadSource?: string | null;
  lead_source?: string | null;
  leadSourceDetail?: string | null;
  lead_source_detail?: string | null;
  source?: string | null;
  createdByName?: string | null;
  formType?: string | null;
  form_type?: string | null;
}): LeadSourceBadgeInfo {
  const src = (dealOrLead.leadSource || dealOrLead.lead_source || dealOrLead.source || '').toLowerCase();
  const detail = (dealOrLead.leadSourceDetail || dealOrLead.lead_source_detail || '').trim();
  const detailLower = detail.toLowerCase();
  const form = (dealOrLead.formType || dealOrLead.form_type || '').toLowerCase();

  // 1. Storm Promo / $1,000 Off Voucher
  if (
    src.includes('storm') ||
    form.includes('storm') ||
    detailLower.includes('storm') ||
    detailLower.includes('voucher') ||
    detailLower.includes('$1,000') ||
    detailLower.includes('el niño')
  ) {
    return {
      category: 'storm_promo',
      label: '⚡ $1k Voucher',
      badgeClass: 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60 font-black shadow-xs',
      tooltip: detail || '⚡ Claimed $1,000 Off El Niño Storm Voucher',
    };
  }

  // 2. Instant Estimator Ballpark
  if (
    src.includes('estimator') ||
    form.includes('estimator') ||
    form.includes('calculator') ||
    detailLower.includes('estimator') ||
    detailLower.includes('ballpark')
  ) {
    return {
      category: 'estimator',
      label: '📊 Estimator',
      badgeClass: 'bg-cyan-100 dark:bg-cyan-950/70 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-700/60 font-black shadow-xs',
      tooltip: detail || '📊 Calculated Instant Ballpark Estimate on Website',
    };
  }

  // 3. City Landing Page (e.g. Oceanside, Carlsbad, Vista)
  if (src.includes('landing') || detailLower.includes('landing')) {
    const match = detail.match(/landing\s*\(([^)]+)\)/i);
    const city = match ? match[1] : 'City';
    return {
      category: 'landing',
      label: `📍 ${city}`,
      badgeClass: 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/60 font-bold shadow-xs',
      tooltip: detail || `📍 Local Landing Page Inbound (${city})`,
    };
  }

  // 4. Contact Form Inquiry
  if (src.includes('contact') || form.includes('contact') || detailLower.includes('contact')) {
    return {
      category: 'contact',
      label: '✉️ Contact Form',
      badgeClass: 'bg-sky-100 dark:bg-sky-950/70 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-700/60 font-bold shadow-xs',
      tooltip: detail || '✉️ Website Contact Form Inquiry',
    };
  }

  // 5. Generic Website Inbound
  if (src === 'website' || src.includes('web')) {
    return {
      category: 'website',
      label: '🌐 Website',
      badgeClass: 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60 font-bold',
      tooltip: detail || 'Direct Website Inbound Lead',
    };
  }

  // 6. Manual Entry / Sales Rep Outreach / Inbound Call
  const repName = dealOrLead.createdByName || detail || 'Manual Entry';
  return {
    category: 'manual',
    label: repName,
    badgeClass: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 font-bold',
    tooltip: `Staff Created: ${repName}`,
  };
}
