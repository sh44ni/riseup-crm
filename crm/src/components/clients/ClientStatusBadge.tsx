import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { Client360Record } from '@/types/client360Types';

interface ClientStatusBadgeProps {
  status: Client360Record['status'];
}

export function ClientStatusBadge({ status }: ClientStatusBadgeProps) {
  switch (status) {
    case 'active_job':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white shadow-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-200 animate-pulse" />
          <span>Existing Client • Active Jobsite</span>
        </span>
      );
    case 'closed_lost':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-600 text-white shadow-xs">
          <span className="w-2 h-2 rounded-full bg-rose-200" />
          <span>Closed Lost • Win-Back Opportunity</span>
        </span>
      );
    case 'completed':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-teal-600 text-white shadow-xs">
          <ShieldCheck size={13} />
          <span>Lifetime Client • 50-Year Warranty</span>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-600 text-white shadow-xs">
          <span>Pipeline Prospect</span>
        </span>
      );
  }
}
