import React from 'react';
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Plus,
  Edit3,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';
import { Client360Record } from '@/types/client360Types';
import { getTelUrl, getMailtoUrl, getSmsUrl } from '@/utils/contactValidation';
import { ClientStatusBadge } from '@/components/clients/ClientStatusBadge';
import { CrmSelect } from '@/components/common/CrmSelect';

export type ClientProfileTab = 'overview' | 'timeline' | 'quotes' | 'billing' | 'warranties' | 'tasks';

interface ClientProfileHeaderProps {
  client: Client360Record;
  clients: Client360Record[];
  selectedClientId: string | null;
  onSelectClientId: (id: string) => void;
  onBackToDirectory: () => void;
  activeTab: ClientProfileTab;
  onTabChange: (tab: ClientProfileTab) => void;
  canViewFinances: boolean;
  onOpenLogModal: () => void;
  onOpenEditSpecs: () => void;
  onOpenEditContact: () => void;
  onReactivateDeal: () => void;
  onOpenMarkLost: () => void;
}

export function ClientProfileHeader({
  client,
  clients,
  selectedClientId,
  onSelectClientId,
  onBackToDirectory,
  activeTab,
  onTabChange,
  canViewFinances,
  onOpenLogModal,
  onOpenEditSpecs,
  onOpenEditContact,
  onReactivateDeal,
  onOpenMarkLost,
}: ClientProfileHeaderProps) {
  return (
    <div className="space-y-3.5">
      {/* Breadcrumb & Client Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={onBackToDirectory}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/90 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-white/10 shadow-2xs hover:border-slate-300 dark:hover:border-white/20 transition-all cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>All Clients</span>
        </button>

        {/* Quick Switcher */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 dark:text-slate-400 font-semibold hidden sm:inline">Switch Client:</span>
          <div className="w-56 sm:w-64">
            <CrmSelect
              value={selectedClientId ?? ''}
              onChange={onSelectClientId}
              options={clients.map((c) => ({
                value: c.id,
                label: c.name,
                badge: c.status === 'active_job' ? 'Active' : c.status === 'closed_lost' ? 'Lost' : 'Completed',
                badgeClass: c.status === 'active_job' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
              }))}
              size="sm"
            />
          </div>
        </div>
      </div>

      {/* CLIENT 360 HEADER PANEL */}
      <div className="light-glass-panel rounded-3xl p-5 md:p-6 shadow-[0_12px_36px_rgba(15,23,42,0.05)] select-none">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* Left Side: Avatar + Client Name + Contact Metadata + Rep Badge */}
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-900 dark:bg-slate-800 text-white flex items-center justify-center text-2xl font-black shadow-md shrink-0">
              {client.name.charAt(0)}
            </div>

            <div className="space-y-1.5">
              <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {client.name}
              </h1>

              {/* Phone, Email, Address Info Row */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-300 font-semibold">
                <a
                  href={getTelUrl(client.phone)}
                  className="flex items-center gap-1 hover:text-brand-600 dark:hover:text-sky-400 transition-colors"
                >
                  <Phone size={13} className="text-slate-400 dark:text-slate-500" />
                  <span>{client.phone || 'No phone on file'}</span>
                </a>

                <a
                  href={getMailtoUrl(client.email)}
                  className="flex items-center gap-1 hover:text-brand-600 dark:hover:text-sky-400 transition-colors"
                >
                  <Mail size={13} className="text-slate-400 dark:text-slate-500" />
                  <span>{client.email || 'No email on file'}</span>
                </a>

                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(
                    [client.address, client.city, client.zip].filter(Boolean).join(', ')
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 hover:text-brand-600 dark:hover:text-sky-400 transition-colors"
                >
                  <MapPin size={13} className="text-slate-400 dark:text-slate-500" />
                  <span>
                    {[client.address, client.city, client.zip].filter(Boolean).join(', ') || 'Address not provided'}
                  </span>
                </a>
              </div>

              {/* Assigned Rep & Source Pill */}
              <div className="inline-flex items-center gap-2 pt-1">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 dark:bg-slate-800/80 border border-slate-200/90 dark:border-white/10 text-xs shadow-2xs">
                  {client.assignedRep.avatar ? (
                    <img
                      src={client.assignedRep.avatar}
                      alt={client.assignedRep.name}
                      className="w-4 h-4 rounded-full object-cover"
                    />
                  ) : (
                    <span className="w-4 h-4 rounded-full bg-slate-800 dark:bg-slate-700 text-white text-[9px] flex items-center justify-center font-bold">
                      {client.assignedRep.name.charAt(0)}
                    </span>
                  )}
                  <span className="font-bold text-slate-900 dark:text-white">{client.assignedRep.name}</span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30">
                    {client.assignedRep.badge}
                  </span>
                  <span className="text-slate-300 dark:text-slate-600 text-[11px] hidden sm:inline">•</span>
                  <span className="text-slate-500 dark:text-slate-400 text-[11px] font-medium hidden sm:inline">{client.originSource}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side: Status Badge + Action Buttons */}
          <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end gap-3 shrink-0">
            <ClientStatusBadge status={client.status} />

            <div className="flex flex-wrap items-center gap-2">
              <a
                href={getTelUrl(client.phone)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200/90 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-2xs transition-all"
              >
                <Phone size={13} className="text-slate-500 dark:text-slate-400" />
                <span>Call</span>
              </a>

              <a
                href={getSmsUrl(client.phone)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200/90 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-2xs transition-all"
              >
                <Mail size={13} className="text-slate-500 dark:text-slate-400" />
                <span>Text</span>
              </a>

              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(
                  [client.address, client.city, client.zip].filter(Boolean).join(', ')
                )}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200/90 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-2xs transition-all"
              >
                <MapPin size={13} className="text-slate-500 dark:text-slate-400" />
                <span>Directions</span>
              </a>

              {/* Primary Action: + Log Note / Call */}
              <button
                onClick={onOpenLogModal}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-slate-900 dark:bg-sky-600 hover:bg-slate-800 dark:hover:bg-sky-500 text-white text-xs font-bold shadow-xs hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
              >
                <Plus size={14} />
                <span>Log Note / Call</span>
              </button>

              <button
                onClick={onOpenEditSpecs}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200/90 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-2xs transition-all cursor-pointer"
              >
                <Edit3 size={13} className="text-slate-500 dark:text-slate-400" />
                <span>Edit Specs</span>
              </button>

              <button
                type="button"
                onClick={onOpenEditContact}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200/90 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-2xs transition-all cursor-pointer"
                title="Edit Contact Info (Name, Phone, Email, Address)"
              >
                <Edit3 size={13} className="text-slate-500 dark:text-slate-400" />
                <span>Edit Contact</span>
              </button>

              {/* Reactivate button for lost clients */}
              {client.status === 'closed_lost' && (
                <button
                  onClick={onReactivateDeal}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                >
                  <RotateCcw size={13} />
                  <span>Reactivate</span>
                </button>
              )}

              {/* Mark as Lost button — only for active clients */}
              {client.status !== 'closed_lost' && (
                <button
                  onClick={onOpenMarkLost}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-600 dark:hover:bg-rose-600 border border-rose-200 dark:border-rose-800/60 hover:border-rose-600 text-rose-700 dark:text-rose-300 hover:text-white text-xs font-bold shadow-xs hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                >
                  <AlertTriangle size={13} />
                  <span>Mark as Lost</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* MAIN NAVIGATION TABS */}
        <div className="flex items-center gap-2 mt-6 pt-5 border-t border-slate-200/70 dark:border-white/10 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => onTabChange('overview')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-slate-900 dark:bg-sky-500 text-white shadow-xs'
                : 'bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 border border-slate-200/60 dark:border-white/10'
            }`}
          >
            360° Overview
          </button>

          <button
            onClick={() => onTabChange('timeline')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'timeline'
                ? 'bg-slate-900 dark:bg-sky-500 text-white shadow-xs'
                : 'bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 border border-slate-200/60 dark:border-white/10'
            }`}
          >
            <span>Timeline</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeTab === 'timeline' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              {client.timeline.length}
            </span>
          </button>

          <button
            onClick={() => onTabChange('quotes')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'quotes'
                ? 'bg-slate-900 dark:bg-sky-500 text-white shadow-xs'
                : 'bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 border border-slate-200/60 dark:border-white/10'
            }`}
          >
            <span>Quotes & Jobs</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeTab === 'quotes' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              {client.quotes.length}
            </span>
          </button>

          {canViewFinances && (
            <button
              onClick={() => onTabChange('billing')}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                activeTab === 'billing'
                  ? 'bg-slate-900 dark:bg-sky-500 text-white shadow-xs'
                : 'bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 border border-slate-200/60 dark:border-white/10'
              }`}
            >
              Billing & Invoices
            </button>
          )}

          <button
            onClick={() => onTabChange('warranties')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'warranties'
                ? 'bg-slate-900 dark:bg-sky-500 text-white shadow-xs'
                : 'bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 border border-slate-200/60 dark:border-white/10'
            }`}
          >
            Warranties & Inspections
          </button>

          <button
            onClick={() => onTabChange('tasks')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'tasks'
                ? 'bg-slate-900 dark:bg-sky-500 text-white shadow-xs'
                : 'bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 border border-slate-200/60 dark:border-white/10'
            }`}
          >
            <span>Tasks</span>
            {client.tasks.length > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  activeTab === 'tasks' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                {client.tasks.filter((t) => !t.completed).length}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
