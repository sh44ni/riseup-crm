import React from 'react';
import { Phone, Zap, Mail, MapPin } from 'lucide-react';
import { getTelUrl, getMailtoUrl, getSmsUrl } from '@/utils/contactValidation';

interface LeadQuickCommActionsProps {
  phone?: string;
  email?: string;
  address: string;
  city: string;
  zip: string;
}

export function LeadQuickCommActions({
  phone,
  email,
  address,
  city,
  zip,
}: LeadQuickCommActionsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {phone ? (
        <a
          href={getTelUrl(phone)}
          className="p-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/50 border border-sky-200/80 dark:border-sky-800/60 text-[#1878B8] dark:text-sky-400 flex items-center justify-center gap-2 font-bold transition-colors text-center"
          title={`Call ${phone}`}
        >
          <Phone size={14} />
          <span>Call ({phone})</span>
        </a>
      ) : (
        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-slate-400 dark:text-slate-500 flex items-center justify-center gap-2 font-bold text-center opacity-60 cursor-not-allowed">
          <Phone size={14} />
          <span>No Phone</span>
        </div>
      )}

      {phone ? (
        <a
          href={getSmsUrl(phone)}
          className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200/80 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 flex items-center justify-center gap-2 font-bold transition-colors text-center"
          title={`Text ${phone}`}
        >
          <Zap size={14} />
          <span>Quick SMS</span>
        </a>
      ) : (
        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-slate-400 dark:text-slate-500 flex items-center justify-center gap-2 font-bold text-center opacity-60 cursor-not-allowed">
          <Zap size={14} />
          <span>No SMS</span>
        </div>
      )}

      {email ? (
        <a
          href={getMailtoUrl(email)}
          className="p-2.5 rounded-xl bg-violet-50 dark:bg-violet-950/40 hover:bg-violet-100 dark:hover:bg-violet-900/50 border border-violet-200/80 dark:border-violet-800/60 text-violet-800 dark:text-violet-300 flex items-center justify-center gap-2 font-bold transition-colors text-center"
          title={`Email ${email}`}
        >
          <Mail size={14} />
          <span>Send Email</span>
        </a>
      ) : (
        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-slate-400 dark:text-slate-500 flex items-center justify-center gap-2 font-bold text-center opacity-60 cursor-not-allowed">
          <Mail size={14} />
          <span>No Email</span>
        </div>
      )}

      <a
        href={`https://maps.google.com/?q=${encodeURIComponent(`${address}, ${city} CA ${zip}`)}`}
        target="_blank"
        rel="noreferrer"
        className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-200 flex items-center justify-center gap-2 font-bold transition-colors text-center"
        title="Open directions in Google Maps"
      >
        <MapPin size={14} />
        <span>Directions</span>
      </a>
    </div>
  );
}
