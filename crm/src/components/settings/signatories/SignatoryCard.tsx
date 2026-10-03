import React from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Edit3,
  Lock,
  PenTool,
  Trash2,
} from 'lucide-react';
import { SignatoryUser } from './types';

interface SignatoryCardProps {
  sig: SignatoryUser;
  isSelf: boolean;
  onOpenEditModal: (sig: SignatoryUser) => void;
  onDeleteSignature: (id: number) => void;
}

export function SignatoryCard({
  sig,
  isSelf,
  onOpenEditModal,
  onDeleteSignature,
}: SignatoryCardProps) {
  return (
    <div
      className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 ${
        isSelf
          ? 'border-purple-300 dark:border-purple-800/80 bg-purple-50/20 dark:bg-purple-950/20 shadow-xs'
          : 'border-slate-200/90 dark:border-white/10 bg-slate-50/50 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-white/20'
      }`}
    >
      <div>
        {/* User Top Row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center text-white font-extrabold text-sm shadow-sm ${
                isSelf
                  ? 'bg-gradient-to-tr from-purple-600 to-indigo-600 ring-2 ring-purple-400/40'
                  : 'bg-gradient-to-tr from-slate-600 to-slate-800'
              }`}
            >
              {sig.name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {sig.name}
                </h3>
                {isSelf && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-purple-600 text-white tracking-wide">
                    You
                  </span>
                )}
                {sig.has_signature ? (
                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    <CheckCircle2 size={10} /> Ready
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                    <Clock size={10} /> Needs Setup
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {sig.email} {sig.phone ? `• ${sig.phone}` : ''}
              </p>
            </div>
          </div>

          {/* Top Action Button: Self can edit, others are locked */}
          {isSelf ? (
            <button
              type="button"
              onClick={() => onOpenEditModal(sig)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-950/80 border border-purple-200 dark:border-purple-800/60 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Edit3 size={12} />
              <span>{sig.has_signature ? 'Edit My Signature' : 'Set My Signature'}</span>
            </button>
          ) : (
            <div
              className="px-2.5 py-1 rounded-xl text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/5 flex items-center gap-1.5 shrink-0"
              title="Signatures are strictly self-managed credentials. Only this user can set or update their signature."
            >
              <Lock size={11} className="text-slate-400" />
              <span>Self-Managed</span>
            </div>
          )}
        </div>

        {/* Roles Tagged */}
        <div className="flex items-center gap-1.5 flex-wrap mt-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Signatory Via:
          </span>
          {sig.role_names.map((rn) => (
            <span
              key={rn}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800/50"
            >
              <PenTool size={9} />
              {rn}
            </span>
          ))}
        </div>

        {/* Official Signature Block */}
        <div className="mt-4 pt-3 border-t border-slate-200/70 dark:border-white/5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Official Contract Signature Block:
            </span>
            {isSelf && sig.has_signature && (
              <button
                type="button"
                onClick={() => onDeleteSignature(sig.id)}
                className="text-[10.5px] text-rose-500 hover:text-rose-600 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                title="Remove signature"
              >
                <Trash2 size={11} />
                <span>Reset Signature</span>
              </button>
            )}
          </div>

          {isSelf ? (
            sig.has_signature && sig.signature_data ? (
              <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-purple-200/80 dark:border-purple-900/60 text-center relative overflow-hidden">
                <div className="text-slate-400 dark:text-slate-500 uppercase tracking-widest font-bold text-[9px] mb-1">
                  {sig.signature_type === 'drawn' ? 'Hand-Drawn Electronic Ink' : 'Typed Calligraphy Signature'}
                </div>

                <div className="min-h-[50px] flex items-center justify-center py-1">
                  {sig.signature_type === 'drawn' && sig.signature_data.startsWith('data:image') ? (
                    <img
                      src={sig.signature_data}
                      alt={`${sig.name} signature`}
                      className="max-h-12 max-w-[220px] object-contain"
                    />
                  ) : (
                    <div
                      className="text-3xl text-sky-950 dark:text-sky-200 select-none font-semibold tracking-wide italic font-serif"
                    >
                      {sig.signature_data || sig.name}
                    </div>
                  )}
                </div>

                <div className="text-[11px] text-slate-600 dark:text-slate-300 font-semibold border-t border-slate-100 dark:border-white/5 pt-1.5 mt-1">
                  <strong>Rise Up Roofing and Construction, Inc.</strong><br />
                  By: {sig.name} &bull; Title: {sig.signature_title || 'Project Manager'}<br />
                  License: 1096492 B/C39/C46
                </div>
              </div>
            ) : (
              <div className="bg-amber-50/60 dark:bg-amber-950/30 rounded-xl p-4 border border-dashed border-amber-300/80 dark:border-amber-800/60 text-center space-y-2">
                <AlertCircle size={18} className="mx-auto text-amber-600 dark:text-amber-400" />
                <p className="text-xs text-amber-800 dark:text-amber-300 font-medium">
                  You have not configured your signature yet. You cannot counter-sign contracts until your signature is established.
                </p>
                <button
                  type="button"
                  onClick={() => onOpenEditModal(sig)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-2xs transition-all cursor-pointer inline-flex items-center gap-1.5"
                >
                  <PenTool size={11} />
                  <span>Set Up My Official Signature</span>
                </button>
              </div>
            )
          ) : sig.has_signature ? (
            <div className="bg-slate-100/70 dark:bg-slate-900/60 rounded-xl p-3.5 border border-slate-200/80 dark:border-white/5 text-center space-y-1.5">
              <div className="w-8 h-8 rounded-full bg-slate-200/80 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-500 dark:text-slate-400">
                <Lock size={14} />
              </div>
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Signature Stored &amp; Protected
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal max-w-xs mx-auto">
                Signatures are private credentials. Raw signature data is securely encrypted and accessible only by {sig.name}.
              </p>
              <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium pt-1 border-t border-slate-200/50 dark:border-white/5">
                CSLB Lic #1096492 &bull; Title: {sig.signature_title || 'Project Manager'}
              </div>
            </div>
          ) : (
            <div className="bg-amber-50/50 dark:bg-amber-950/20 rounded-xl p-3.5 border border-dashed border-amber-300/70 dark:border-amber-800/50 text-center space-y-1.5">
              <Clock size={16} className="mx-auto text-amber-500" />
              <div className="text-xs font-bold text-amber-900 dark:text-amber-200">
                Awaiting Setup by User
              </div>
              <p className="text-[11px] text-amber-700 dark:text-amber-400 max-w-xs mx-auto">
                {sig.name} must log into their own account to establish their personal electronic signature.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="text-[10px] text-slate-400 dark:text-slate-500 pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
        <span>Status: Active Signatory</span>
        <span>
          {sig.updated_at
            ? `Last updated: ${new Date(sig.updated_at).toLocaleDateString()}`
            : 'Default settings'}
        </span>
      </div>
    </div>
  );
}
