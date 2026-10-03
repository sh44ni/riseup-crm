import React, { useState } from 'react';
import {
  Calendar,
  Phone,
  Mail,
  MapPin,
  ExternalLink,
  ChevronRight,
  Copy,
  Check,
  MoveRight,
  User,
  Loader2,
  Ruler,
  Edit3,
} from 'lucide-react';
import { DealValueBadge } from '@/components/shared/DealValueBadge';
import { getTelUrl, getMailtoUrl } from '@/utils/contactValidation';
import { formatRelativeTime } from './types';

export interface DealSummaryTabProps {
  dealId: string | number;
  dealName?: string;
  canViewFinances: boolean;
  resolvedRoofSqf?: number | null;
  resolvedEstimateTotal?: number | null;
  resolvedContractValue?: number | null;
  resolvedEstimatedValue?: number | null;
  resolvedProposalSentAt?: string | null;
  resolvedIsUploadedEstimate?: boolean;
  resolvedEstimateTemplateKey?: string | null;
  resolvedIsContractSigned?: boolean;
  displayStageKey: string;
  displayService: string;
  displayPhone: string;
  displayEmail: string;
  displayAddress: string;
  displayLocation: string;
  rawScheduledAt?: string | null;
  realAppointmentDate?: string | null;
  realAppointmentTime?: string | null;
  latestMoveActivity?: any;
  getServiceBadgeClass: (color?: string) => string;
  serviceColor?: string;
  onOpenEditContact: () => void;
  onUpdateSqft: (sqft: number) => Promise<void>;
  onScheduleAppointment: (dateTime: string) => Promise<void>;
  onCancelAppointment: () => Promise<void>;
}

export function DealSummaryTab({
  canViewFinances,
  resolvedRoofSqf,
  resolvedEstimateTotal,
  resolvedContractValue,
  resolvedEstimatedValue,
  resolvedProposalSentAt,
  resolvedIsUploadedEstimate,
  resolvedEstimateTemplateKey,
  resolvedIsContractSigned,
  displayStageKey,
  displayService,
  displayPhone,
  displayEmail,
  displayAddress,
  displayLocation,
  rawScheduledAt,
  realAppointmentDate,
  realAppointmentTime,
  latestMoveActivity,
  getServiceBadgeClass,
  serviceColor,
  onOpenEditContact,
  onUpdateSqft,
  onScheduleAppointment,
  onCancelAppointment,
}: DealSummaryTabProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [sqftEditOpen, setSqftEditOpen] = useState(false);
  const [sqftInput, setSqftInput] = useState('');
  const [showScheduler, setShowScheduler] = useState(false);
  const [scheduleInput, setScheduleInput] = useState('');
  const [isScheduling, setIsScheduling] = useState(false);
  const [isSavingSqft, setIsSavingSqft] = useState(false);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1800);
  };

  const handleSqftSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const sqf = parseInt(sqftInput);
    if (!sqf || sqf <= 0) return;
    setIsSavingSqft(true);
    try {
      await onUpdateSqft(sqf);
      setSqftEditOpen(false);
    } finally {
      setIsSavingSqft(false);
    }
  };

  const handleConfirmSchedule = async () => {
    if (!scheduleInput || isScheduling) return;
    setIsScheduling(true);
    try {
      await onScheduleAppointment(scheduleInput);
      setShowScheduler(false);
    } finally {
      setIsScheduling(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (isScheduling) return;
    setIsScheduling(true);
    try {
      await onCancelAppointment();
      setShowScheduler(false);
      setScheduleInput('');
    } finally {
      setIsScheduling(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Quick Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        <div className="p-3 rounded-2xl liquid-glass-tile space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">
              Deal Value
            </span>
            {canViewFinances && !resolvedRoofSqf && !resolvedEstimateTotal && !resolvedContractValue && (
              <button
                type="button"
                onClick={() => setSqftEditOpen((v) => !v)}
                className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 hover:bg-amber-100 transition-colors cursor-pointer"
              >
                + Add Sq Ft
              </button>
            )}
            {canViewFinances && resolvedRoofSqf && !resolvedEstimateTotal && !resolvedContractValue && (
              <button
                type="button"
                onClick={() => {
                  setSqftInput(String(resolvedRoofSqf || ''));
                  setSqftEditOpen((v) => !v);
                }}
                className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Edit Sq Ft
              </button>
            )}
          </div>
          <div className="text-base font-black text-slate-800 dark:text-white flex items-center gap-0.5">
            <DealValueBadge
              contractValue={resolvedContractValue}
              estimateTotal={resolvedEstimateTotal}
              estimatedValue={resolvedEstimatedValue}
              roofSqf={resolvedRoofSqf}
              proposalSentAt={resolvedProposalSentAt}
              isUploadedEstimate={resolvedIsUploadedEstimate}
              estimateTemplateKey={resolvedEstimateTemplateKey}
              isContractSigned={resolvedIsContractSigned}
              stageId={displayStageKey}
              canViewFinances={canViewFinances}
              size="base"
            />
          </div>
          {resolvedRoofSqf && resolvedRoofSqf > 0 ? (
            <div className="text-[10.5px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
              <Ruler size={10} className="text-amber-500 shrink-0" />
              <span>{resolvedRoofSqf.toLocaleString()} sq ft</span>
            </div>
          ) : null}
          {sqftEditOpen && canViewFinances && (
            <form onSubmit={handleSqftSubmit} className="flex items-center gap-1.5 mt-1">
              <input
                type="number"
                min={1}
                max={50000}
                step={25}
                value={sqftInput}
                onChange={(e) => setSqftInput(e.target.value)}
                placeholder="e.g. 2500"
                className="flex-1 text-xs px-2 py-1 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-amber-400"
                autoFocus
              />
              <button
                type="submit"
                disabled={isSavingSqft}
                className="text-[10px] font-bold px-2 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSavingSqft ? '...' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => setSqftEditOpen(false)}
                className="text-[10px] font-bold px-2 py-1 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </form>
          )}
        </div>

        <div className="p-3 rounded-2xl liquid-glass-tile space-y-1">
          <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">
            Requested Service
          </span>
          <div>
            <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md ${getServiceBadgeClass(serviceColor)}`}>
              {displayService}
            </span>
          </div>
        </div>

        <div className="p-3 rounded-2xl liquid-glass-tile space-y-1 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">
              Appointment
            </span>
            <button
              type="button"
              onClick={() => {
                if (rawScheduledAt) {
                  const dt = new Date(rawScheduledAt);
                  const pad = (n: number) => String(n).padStart(2, '0');
                  setScheduleInput(`${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`);
                }
                setShowScheduler((s) => !s);
              }}
              className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60 hover:bg-sky-100 dark:hover:bg-sky-900/50 transition-colors cursor-pointer"
            >
              {rawScheduledAt ? 'Reschedule' : '+ Schedule'}
            </button>
          </div>
          {realAppointmentDate ? (
            <>
              <div className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                <Calendar size={12} className="text-[#1878B8]" />
                <span>{realAppointmentDate}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-[10px] text-slate-400 font-medium">{realAppointmentTime}</div>
                <button
                  type="button"
                  onClick={handleConfirmCancel}
                  disabled={isScheduling}
                  className="text-[9px] font-bold text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel appt
                </button>
              </div>
            </>
          ) : (
            <div className="text-xs text-slate-400 font-medium flex items-center gap-1">
              <Calendar size={12} className="text-slate-300" />
              <span>Not scheduled yet</span>
            </div>
          )}
          {showScheduler && (
            <div className="mt-1.5 space-y-1.5 pt-1.5 border-t border-slate-200/70 dark:border-white/10">
              <input
                type="datetime-local"
                value={scheduleInput}
                onChange={(e) => setScheduleInput(e.target.value)}
                className="w-full text-[11px] px-2 py-1 rounded-lg border border-slate-300 dark:border-white/20 bg-white/80 dark:bg-white/5 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-sky-400"
              />
              <button
                type="button"
                onClick={handleConfirmSchedule}
                disabled={!scheduleInput || isScheduling}
                className="w-full text-[10px] font-bold py-1 rounded-lg bg-[#1878B8] text-white hover:bg-[#1568a3] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center justify-center gap-1"
              >
                {isScheduling ? <Loader2 size={10} className="animate-spin" /> : <Calendar size={10} />}
                {isScheduling ? 'Saving…' : (rawScheduledAt ? 'Update Appointment' : 'Confirm Appointment')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Contact Channels */}
      <div className="p-3.5 rounded-2xl liquid-glass-tile space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[10.5px] uppercase tracking-wider font-extrabold text-slate-500 dark:text-slate-400">
            Contact Channels
          </span>
          <button
            type="button"
            onClick={onOpenEditContact}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/80 dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/20 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-white/10 text-xs font-bold transition-all cursor-pointer shadow-2xs"
            title="Edit Contact Information"
          >
            <Edit3 size={11} />
            <span>Edit Contact</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* Phone */}
          <div className="flex items-center justify-between p-2 rounded-xl bg-white/70 dark:bg-white/5 border border-white/80 dark:border-white/10 shadow-2xs">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-sky-100/90 dark:bg-sky-950/50 text-[#0284c7] dark:text-sky-300 flex items-center justify-center shrink-0">
                <Phone size={13} />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] text-slate-400 font-medium">Direct Phone</div>
                <div className="text-xs font-bold text-slate-800 dark:text-white truncate">{displayPhone || 'No Phone'}</div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {displayPhone && (
                <button
                  type="button"
                  onClick={() => handleCopy(displayPhone, 'phone')}
                  title="Copy phone"
                  className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
                >
                  {copiedField === 'phone' ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                </button>
              )}
              {displayPhone && (
                <a
                  href={getTelUrl(displayPhone)}
                  className="p-1 rounded-md hover:bg-sky-100 dark:hover:bg-sky-950/50 text-[#0284c7] dark:text-sky-300 transition-colors"
                  title="Dial now"
                >
                  <ChevronRight size={14} />
                </a>
              )}
            </div>
          </div>

          {/* Email */}
          <div className="flex items-center justify-between p-2 rounded-xl bg-white/70 dark:bg-white/5 border border-white/80 dark:border-white/10 shadow-2xs">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-indigo-100/90 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 flex items-center justify-center shrink-0">
                <Mail size={13} />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] text-slate-400 font-medium">Email Address</div>
                <div className="text-xs font-bold text-slate-800 dark:text-white truncate">{displayEmail || 'No Email'}</div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {displayEmail && (
                <button
                  type="button"
                  onClick={() => handleCopy(displayEmail, 'email')}
                  title="Copy email"
                  className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
                >
                  {copiedField === 'email' ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                </button>
              )}
              {displayEmail && (
                <a
                  href={getMailtoUrl(displayEmail)}
                  className="p-1 rounded-md hover:bg-indigo-100 dark:hover:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 transition-colors"
                  title="Compose email"
                >
                  <ChevronRight size={14} />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Property Location */}
      <div className="p-3.5 rounded-2xl liquid-glass-tile space-y-1.5">
        <span className="text-[10.5px] uppercase tracking-wider font-extrabold text-slate-500 dark:text-slate-400">
          Property Site Address
        </span>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-white">
            <MapPin size={13} className="text-[#1878B8] shrink-0" />
            <span>{displayAddress}, {displayLocation}</span>
          </div>
          <a
            href={`https://maps.google.com/?q=${encodeURIComponent(`${displayAddress}, ${displayLocation}`)}`}
            target="_blank"
            rel="noreferrer"
            className="text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:text-sky-800 dark:hover:text-sky-300 flex items-center gap-1"
          >
            <span>View Map</span>
            <ExternalLink size={11} />
          </a>
        </div>
      </div>

      {/* Latest Move Note Highlight Card */}
      {latestMoveActivity && (
        <div className="p-3.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200/90 dark:border-amber-800/40 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="p-1 rounded-md bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300">
                <MoveRight size={12} />
              </span>
              <span className="text-[11px] font-extrabold text-amber-900 dark:text-amber-200">
                Latest Pipeline Move Note
              </span>
            </div>
            <span className="text-[10px] font-medium text-amber-700 dark:text-amber-300">
              {formatRelativeTime(latestMoveActivity.created_at)}
            </span>
          </div>
          <div className="text-xs font-bold text-slate-800 dark:text-white">
            {latestMoveActivity.title}
          </div>
          {latestMoveActivity.description && (
            <p className="text-xs text-slate-700 dark:text-slate-300 italic bg-white/70 dark:bg-white/5 p-2 rounded-xl border border-amber-200/60 dark:border-amber-800/30">
              "{latestMoveActivity.description}"
            </p>
          )}
          <div className="text-[10.5px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
            <User size={10} className="text-slate-400" />
            <span>Logged by {latestMoveActivity.performed_by || latestMoveActivity.user_name || 'Owner'}</span>
          </div>
        </div>
      )}
    </div>
  );
}
