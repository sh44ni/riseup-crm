import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Eye, History, Loader2, PenTool, Settings2 } from 'lucide-react';
import { api } from '@/lib/api';
import type {
  CompanySignatureHistoryEntry,
  CompanySignatureVersionDetail,
} from '@/types/companySignatureTypes';
import { SignatureGlyph } from './SignatureGlyph';
import { changedFieldLabel, formatSignatureDateTime } from './signatureFormat';

interface CompanySignatureHistoryProps {
  history: CompanySignatureHistoryEntry[];
  isLoading: boolean;
  error: string | null;
}

function HistoryEntryRow({ entry }: { entry: CompanySignatureHistoryEntry }) {
  const [isOpen, setIsOpen] = useState(false);
  const [detail, setDetail] = useState<CompanySignatureVersionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isConfigured = entry.action === 'configured' || entry.version === 1;
  const ActionIcon = isConfigured ? Settings2 : PenTool;

  const toggle = async () => {
    const next = !isOpen;
    setIsOpen(next);
    if (!next || detail || isLoading) return;
    setIsLoading(true);
    setError(null);
    try {
      setDetail(await api.getCompanySignatureVersion(entry.version));
    } catch (err) {
      setError((err as Error | null)?.message || 'Could not load this version.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <li className="relative pl-8" data-testid={`signature-history-v${entry.version}`}>
      <span
        className={`absolute left-0 top-0.5 w-6 h-6 rounded-full flex items-center justify-center text-white shadow-sm ${
          isConfigured ? 'bg-emerald-600' : 'bg-purple-600'
        }`}
      >
        <ActionIcon size={12} />
      </span>

      <div className="rounded-xl border border-slate-200/90 dark:border-white/10 bg-slate-50/60 dark:bg-slate-800/40 p-3.5 space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                {isConfigured ? 'Signature configured' : 'Signature changed'}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                v{entry.version}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              by <strong className="text-slate-700 dark:text-slate-200">{entry.changed_by_name || 'Unknown user'}</strong>
              {' • '}
              {formatSignatureDateTime(entry.created_at)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void toggle()}
            aria-expanded={isOpen}
            className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/50 border border-purple-200 dark:border-purple-800/60 flex items-center gap-1 cursor-pointer shrink-0"
          >
            <Eye size={11} />
            <span>{isOpen ? 'Hide' : 'View'}</span>
            {isOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>
        </div>

        {entry.reason && (
          <blockquote className="text-[11.5px] italic text-slate-600 dark:text-slate-300 border-l-2 border-purple-300 dark:border-purple-700 pl-2.5">
            “{entry.reason}”
          </blockquote>
        )}

        {!isConfigured && entry.changed_fields && entry.changed_fields.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {entry.changed_fields.map((field) => (
              <span
                key={field}
                className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800/50"
              >
                {changedFieldLabel(field)}
              </span>
            ))}
          </div>
        )}

        {isOpen && (
          <div className="mt-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-3 text-center">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500">
                <Loader2 size={13} className="animate-spin" /> Loading version…
              </div>
            ) : error ? (
              <p className="text-[11px] text-rose-600 dark:text-rose-400">{error}</p>
            ) : detail ? (
              <div className="space-y-1.5">
                <div className="min-h-[44px] flex items-center justify-center">
                  <SignatureGlyph
                    signatureType={detail.signature_type}
                    signatureData={detail.signature_data}
                    signerName={detail.signer_name}
                    size="sm"
                  />
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-300 font-semibold">
                  By: {detail.signer_name} &bull; Title: {detail.signer_title}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </li>
  );
}

export function CompanySignatureHistory({ history, isLoading, error }: CompanySignatureHistoryProps) {
  return (
    <div className="light-glass-card bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden backdrop-blur-md">
      <div className="p-5 border-b border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-slate-800/40 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-slate-800 dark:bg-slate-700 flex items-center justify-center text-white shadow-sm">
          <History size={16} />
        </div>
        <div>
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Change history</h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Permanent, append-only record of every setup and change.
          </p>
        </div>
      </div>

      <div className="p-5">
        {isLoading ? (
          <div className="py-6 flex items-center justify-center gap-2 text-xs text-slate-500">
            <Loader2 size={14} className="animate-spin" /> Loading history…
          </div>
        ) : error ? (
          <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>
        ) : history.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">No changes recorded yet.</p>
        ) : (
          <ol className="relative space-y-4 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-px before:bg-slate-200 dark:before:bg-white/10">
            {history.map((entry) => (
              <HistoryEntryRow key={entry.id ?? entry.version} entry={entry} />
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
