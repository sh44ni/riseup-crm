import React from 'react';
import { Edit, ExternalLink, Download, Loader2, PenTool, RotateCcw, Archive, Trash2 } from 'lucide-react';
import { ContractRow } from '@/api/contractApi';
import { ContractStatusBadge } from './ContractStatusBadge';

interface ContractTableRowProps {
  contract: ContractRow;
  downloadingId: number | null;
  canCounterSign: boolean;
  onOpenStudio: (id: number) => void;
  onDownloadPdf: (e: React.MouseEvent, c: ContractRow) => void;
  onCounterSign: (c: ContractRow) => void;
  onToggleArchive: (c: ContractRow) => void;
  onDeleteDraft: (c: ContractRow) => void;
}

export function ContractTableRow({
  contract: c,
  downloadingId,
  canCounterSign,
  onOpenStudio,
  onDownloadPdf,
  onCounterSign,
  onToggleArchive,
  onDeleteDraft,
}: ContractTableRowProps) {
  return (
    <tr
      onClick={() => onOpenStudio(c.id)}
      className="hover:bg-white/80 dark:hover:bg-slate-800/60 transition-colors cursor-pointer group"
    >
      <td className="py-3.5 px-4 font-mono font-bold text-amber-700 dark:text-amber-400">
        {c.contract_number}
      </td>

      <td className="py-3.5 px-4">
        <div className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-[#1878B8] transition-colors">
          {c.customer_name || 'Homeowner'}
        </div>
        <div className="text-[11px] text-slate-500 dark:text-slate-400">
          {c.customer_phone || c.customer_email || '—'}
        </div>
      </td>

      <td className="py-3.5 px-4">
        <div className="font-medium text-slate-800 dark:text-slate-200">
          {c.customer_address || '—'}
        </div>
        {c.customer_city && (
          <div className="text-[11px] text-slate-500 dark:text-slate-400">{c.customer_city}, CA</div>
        )}
      </td>

      <td className="py-3.5 px-4">
        <span className="inline-block text-[10.5px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10">
          {c.service_type || 'Roof Installation'}
        </span>
      </td>

      <td className="py-3.5 px-4 text-right font-black text-slate-900 dark:text-white">
        {c.estimated_value && Number(c.estimated_value) > 0
          ? `$${Number(c.estimated_value).toLocaleString()}`
          : '—'}
      </td>

      <td className="py-3.5 px-4">
        <ContractStatusBadge contract={c} />
      </td>

      <td className="py-3.5 px-4 text-[11px] text-slate-500 dark:text-slate-400">
        {new Date(c.created_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })}
      </td>

      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => onOpenStudio(c.id)}
            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
            title="Open in Studio"
          >
            <Edit size={13} />
          </button>

          <a
            href={`/api/admin/contracts/${c.id}/preview`}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900 text-[#1878B8] dark:text-sky-300 transition-colors"
            title="Preview Contract PDF in new tab"
          >
            <ExternalLink size={13} />
          </a>

          <button
            type="button"
            onClick={(e) => onDownloadPdf(e, c)}
            disabled={downloadingId === c.id}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
              c.status === 'signed'
                ? 'bg-emerald-100 dark:bg-emerald-950/60 hover:bg-emerald-200 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-300'
                : c.status === 'client_signed'
                ? 'bg-amber-100 dark:bg-amber-950/60 hover:bg-amber-200 dark:hover:bg-amber-900 text-amber-800 dark:text-amber-300'
                : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
            }`}
            title={`Download ${c.status === 'signed' ? 'Fully Executed' : c.status === 'client_signed' ? 'Partially Executed' : ''} PDF`}
          >
            {downloadingId === c.id ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Download size={12} />
            )}
            <span>
              {downloadingId === c.id
                ? 'Downloading…'
                : c.status === 'signed'
                ? 'Download'
                : c.status === 'client_signed'
                ? 'Download'
                : c.status === 'draft'
                ? 'Draft PDF'
                : 'Download'}
            </span>
          </button>

          {c.status === 'client_signed' && !c.is_archived && canCounterSign && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCounterSign(c);
              }}
              className="flex items-center gap-1.5 text-[11px] font-extrabold px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white transition-all shadow-xs hover:shadow-md cursor-pointer animate-pulse hover:animate-none"
              title="Counter-Sign & Execute Contract"
            >
              <PenTool size={12} className="stroke-[2.5]" />
              <span>Counter-Sign</span>
            </button>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleArchive(c);
            }}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              c.is_archived
                ? 'bg-amber-100 dark:bg-amber-950/60 hover:bg-amber-200 dark:hover:bg-amber-900 text-amber-700 dark:text-amber-300'
                : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
            title={c.is_archived ? 'Unarchive Contract (Restore to active list)' : 'Archive Contract'}
          >
            {c.is_archived ? <RotateCcw size={13} /> : <Archive size={13} />}
          </button>

          {c.status === 'draft' && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteDraft(c);
              }}
              className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer"
              title="Delete Draft Contract"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
