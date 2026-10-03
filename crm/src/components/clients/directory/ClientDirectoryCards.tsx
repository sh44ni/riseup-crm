import React from 'react';
import { ChevronRight, MapPin, Phone, Mail, Edit3, ExternalLink } from 'lucide-react';
import { Client360Record } from '@/types/client360Types';
import { getTelUrl, getMailtoUrl } from '@/utils/contactValidation';
import { ClientStatusBadge } from '@/components/clients/ClientStatusBadge';

interface ClientDirectoryCardsProps {
  clients: Client360Record[];
  onSelectClient: (client: Client360Record) => void;
  onEditContact: (client: Client360Record) => void;
}

export function ClientDirectoryCards({
  clients,
  onSelectClient,
  onEditContact,
}: ClientDirectoryCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
      {clients.map((client) => (
        <div
          key={client.id}
          onClick={() => onSelectClient(client)}
          className="light-glass-card rounded-2xl p-5 shadow-xs hover:shadow-md transition-all cursor-pointer space-y-4 group"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-900 text-white font-black text-base flex items-center justify-center shadow-xs group-hover:scale-105 transition-all">
                {client.name.charAt(0)}
              </div>
              <div>
                <h3 className="font-black text-sm text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-sky-400 transition-colors">
                  {client.name}
                </h3>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                  <MapPin size={12} className="text-brand-600 dark:text-sky-400" />
                  <span className="truncate">
                    {[client.roofSpecs?.address || client.address, client.city].filter(Boolean).join(', ') || 'Address not provided'}
                  </span>
                </div>
              </div>
            </div>

            <span className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 group-hover:bg-brand-600 dark:group-hover:bg-sky-500 text-slate-400 dark:text-slate-500 group-hover:text-white flex items-center justify-center transition-all">
              <ChevronRight size={14} />
            </span>
          </div>

          {/* Specs tile */}
          <div className="liquid-glass-tile rounded-xl p-3 text-xs space-y-1.5 dark:bg-white/5 dark:border-white/10">
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Roof Material:</span>
              <span className="font-bold text-slate-900 dark:text-slate-200">{client.roofSpecs.roofMaterial}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Roof Area:</span>
              <span className="font-bold text-slate-900 dark:text-slate-200">{client.roofSpecs.roofAreaSqFt.toLocaleString()} sq ft</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Assigned Rep:</span>
              <span className="font-bold text-slate-900 dark:text-slate-200">{client.assignedRep.name}</span>
            </div>
            {client.lossPostMortem && (
              <div className="flex justify-between text-rose-600 dark:text-rose-400 font-bold pt-1 border-t border-slate-200/60 dark:border-white/10">
                <span>Lost Reason:</span>
                <span className="truncate max-w-[180px]">{client.lossPostMortem.lossReason}</span>
              </div>
            )}
          </div>

          {/* Quick Contact & Edit Controls */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/5">
            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
              {client.phone && (
                <a
                  href={getTelUrl(client.phone)}
                  className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-brand-600 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-900/50 transition-colors"
                  title={`Call ${client.phone}`}
                  aria-label={`Call ${client.name}`}
                >
                  <Phone size={12} />
                </a>
              )}
              {client.email && (
                <a
                  href={getMailtoUrl(client.email)}
                  className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-brand-600 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-900/50 transition-colors"
                  title={`Email ${client.email}`}
                  aria-label={`Email ${client.name}`}
                >
                  <Mail size={12} />
                </a>
              )}
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEditContact(client);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-brand-600 hover:text-white dark:hover:bg-sky-500 dark:hover:text-white text-[11px] font-bold transition-all cursor-pointer"
              title="Edit Contact Info"
            >
              <Edit3 size={11} />
              <span>Edit Info</span>
            </button>
          </div>

          <div className="flex items-center justify-between pt-1 text-xs">
            <ClientStatusBadge status={client.status} />
            <span className="text-brand-600 dark:text-sky-400 font-bold flex items-center gap-1 group-hover:underline">
              <span>Open 360</span>
              <ExternalLink size={12} />
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
