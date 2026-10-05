import React from 'react';
import { ChevronRight, Edit3, Mail, Phone, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { Client360Record, ClientSortConfig, ClientSortField } from '@/types/client360Types';
import { getTelUrl, getMailtoUrl } from '@/utils/contactValidation';
import { ClientStatusBadge } from '@/components/clients/ClientStatusBadge';

interface ClientDirectoryTableProps {
  clients: Client360Record[];
  onSelectClient: (client: Client360Record) => void;
  onEditContact: (client: Client360Record) => void;
  sortConfig?: ClientSortConfig;
  onSortChange?: (config: ClientSortConfig) => void;
}

export function ClientDirectoryTable({
  clients,
  onSelectClient,
  onEditContact,
  sortConfig,
  onSortChange,
}: ClientDirectoryTableProps) {
  const handleHeaderClick = (field: ClientSortField) => {
    if (!onSortChange) return;
    if (sortConfig?.field === field) {
      onSortChange({
        field,
        direction: sortConfig.direction === 'asc' ? 'desc' : 'asc',
      });
    } else {
      onSortChange({
        field,
        direction: 'asc',
      });
    }
  };

  const renderSortIndicator = (field: ClientSortField) => {
    if (!sortConfig) return null;
    if (sortConfig.field === field) {
      return sortConfig.direction === 'asc' ? (
        <ArrowUp size={12} className="text-[#1878B8] dark:text-sky-400 shrink-0" />
      ) : (
        <ArrowDown size={12} className="text-[#1878B8] dark:text-sky-400 shrink-0" />
      );
    }
    return (
      <ArrowUpDown size={11} className="text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    );
  };

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md shadow-xs">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="bg-slate-50/90 dark:bg-slate-900/80 border-b border-slate-200/80 dark:border-white/10 text-slate-500 dark:text-slate-400 font-bold select-none">
            <th
              className="py-3 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors group"
              onClick={() => handleHeaderClick('name')}
              title="Click to sort by Homeowner Name"
            >
              <div className="flex items-center gap-1.5">
                <span>Homeowner</span>
                {renderSortIndicator('name')}
              </div>
            </th>
            <th
              className="py-3 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors group"
              onClick={() => handleHeaderClick('city')}
              title="Click to sort by City / Location"
            >
              <div className="flex items-center gap-1.5">
                <span>Address / City</span>
                {renderSortIndicator('city')}
              </div>
            </th>
            <th
              className="py-3 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors group"
              onClick={() => handleHeaderClick('roofArea')}
              title="Click to sort by Roof Area"
            >
              <div className="flex items-center gap-1.5">
                <span>Roof Specs</span>
                {renderSortIndicator('roofArea')}
              </div>
            </th>
            <th
              className="py-3 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors group"
              onClick={() => handleHeaderClick('status')}
              title="Click to sort by Status"
            >
              <div className="flex items-center gap-1.5">
                <span>Status</span>
                {renderSortIndicator('status')}
              </div>
            </th>
            <th
              className="py-3 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors group"
              onClick={() => handleHeaderClick('assignedRep')}
              title="Click to sort by Assigned Rep"
            >
              <div className="flex items-center gap-1.5">
                <span>Assigned Rep</span>
                {renderSortIndicator('assignedRep')}
              </div>
            </th>
            <th className="py-3 px-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
          {clients.map((client) => (
            <tr
              key={client.id}
              onClick={() => onSelectClient(client)}
              className="hover:bg-slate-50/80 dark:hover:bg-white/5 transition-colors cursor-pointer group"
            >
              <td className="py-3 px-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-900 text-white font-bold flex items-center justify-center text-xs shrink-0">
                    {client.name.charAt(0)}
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-sky-400 transition-colors">
                      {client.name}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5" onClick={(e) => e.stopPropagation()}>
                      {client.phone && (
                        <a
                          href={getTelUrl(client.phone)}
                          className="text-[11px] text-slate-400 hover:text-brand-600 dark:hover:text-sky-400 transition-colors flex items-center gap-0.5"
                          title={`Call ${client.phone}`}
                        >
                          <Phone size={10} />
                          <span>{client.phone}</span>
                        </a>
                      )}
                      {client.email && (
                        <a
                          href={getMailtoUrl(client.email)}
                          className="text-[11px] text-slate-400 hover:text-brand-600 dark:hover:text-sky-400 transition-colors flex items-center gap-0.5"
                          title={`Email ${client.email}`}
                        >
                          <Mail size={10} />
                          <span className="truncate max-w-[130px]">{client.email}</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </td>
              <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                <div>{client.roofSpecs?.address || client.address || 'Address not provided'}</div>
                <div className="text-[11px] text-slate-400">{[client.city, client.zip].filter(Boolean).join(', ')}</div>
              </td>
              <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                <span className="font-semibold text-slate-900 dark:text-slate-100">{client.roofSpecs.roofMaterial}</span>
                <div className="text-[11px] text-slate-400">{client.roofSpecs.roofAreaSqFt.toLocaleString()} sq ft</div>
              </td>
              <td className="py-3 px-4">
                <ClientStatusBadge status={client.status} />
              </td>
              <td className="py-3 px-4">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {client.assignedRep.name}
                </span>
              </td>
              <td className="py-3 px-4 text-right">
                <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => onEditContact(client)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold transition-all text-xs cursor-pointer"
                    title="Edit Contact Information"
                  >
                    <Edit3 size={12} />
                    <span className="hidden sm:inline">Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectClient(client)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-brand-600 dark:text-sky-400 font-bold hover:bg-brand-600 hover:text-white dark:hover:bg-sky-500 dark:hover:text-white transition-all text-xs cursor-pointer"
                  >
                    <span>Open 360</span>
                    <ChevronRight size={13} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
