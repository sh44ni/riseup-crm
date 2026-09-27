import React, { useState } from 'react';
import {
  Sliders,
  Zap,
  MessageSquare,
  Clock,
  Send,
  Plus,
  Trash2,
  Copy,
  Check,
  Webhook,
  Sparkles,
  Smartphone,
  ShieldCheck,
} from 'lucide-react';
import { PipelineAutomation } from '@/types/settingsTypes';

interface PipelineSettingsTabProps {
  pipeline: PipelineAutomation;
  onChange: (updated: PipelineAutomation) => void;
}

export function PipelineSettingsTab({
  pipeline,
  onChange,
}: PipelineSettingsTabProps) {
  const [newReason, setNewReason] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  const handleAddReason = () => {
    if (!newReason.trim()) return;
    onChange({
      ...pipeline,
      lossReasons: [...pipeline.lossReasons, newReason.trim()],
    });
    setNewReason('');
  };

  const handleRemoveReason = (index: number) => {
    const updated = [...pipeline.lossReasons];
    updated.splice(index, 1);
    onChange({
      ...pipeline,
      lossReasons: updated,
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* ================================================================
          SECTION 1: SPEED-TO-LEAD AUTOMATED SMS RESPONDER
          ================================================================ */}
      <div className="light-glass-card rounded-3xl p-6 border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/15 to-purple-500/20 text-indigo-700 dark:text-indigo-400 flex items-center justify-center border border-indigo-300/40 dark:border-indigo-500/30">
              <Zap size={20} />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>Speed-to-Lead Instant SMS Auto-Responder</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-black uppercase tracking-wider border border-emerald-300 dark:border-emerald-700/50">
                  {pipeline.speedToLeadEnabled ? 'Active' : 'Paused'}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Instantly texts new inquiries within minutes to maximize closing rates.
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={pipeline.speedToLeadEnabled}
              onChange={(e) =>
                onChange({ ...pipeline, speedToLeadEnabled: e.target.checked })
              }
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1878B8]"></div>
          </label>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs">
          {/* Left Column: Config & Template Editor */}
          <div className="lg:col-span-7 space-y-4">
            <div className="space-y-1.5">
              <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Clock size={13} className="text-[#1878B8] dark:text-sky-400" />
                <span>Response SLA Window</span>
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={pipeline.responseSlaMinutes}
                  onChange={(e) =>
                    onChange({
                      ...pipeline,
                      responseSlaMinutes: parseInt(e.target.value) || 5,
                    })
                  }
                  className="w-24 px-3 py-2 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 focus:border-[#1878B8] font-bold text-slate-900 dark:text-white outline-none"
                />
                <span className="text-slate-600 dark:text-slate-300 font-semibold">
                  Minutes after lead submission
                </span>
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                Leads contacted within 5 minutes convert at 74% vs 24% after 2 hours.
              </p>
            </div>

            {/* Template Editor */}
            <div className="space-y-1.5">
              <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px] flex items-center justify-between">
                <span>Automated SMS Dispatch Copy</span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                  {pipeline.smsTemplate.length} characters
                </span>
              </label>
              <textarea
                rows={4}
                value={pipeline.smsTemplate}
                onChange={(e) =>
                  onChange({ ...pipeline, smsTemplate: e.target.value })
                }
                className="w-full p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 focus:border-[#1878B8] text-slate-800 dark:text-slate-200 text-xs font-medium outline-none resize-none leading-relaxed shadow-2xs"
              />
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">Dynamic Tokens:</span>
                {['{{first_name}}', '{{city}}', '{{estimator_name}}'].map(
                  (token) => (
                    <button
                      key={token}
                      type="button"
                      onClick={() =>
                        onChange({
                          ...pipeline,
                          smsTemplate: `${pipeline.smsTemplate} ${token}`,
                        })
                      }
                      className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-white/10 font-mono text-[10px] transition-colors"
                    >
                      {token}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* After Hours Routing */}
            <div className="space-y-1.5 pt-2">
              <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">
                After-Hours Routing (After 7:00 PM PST)
              </label>
              <select
                value={pipeline.afterHoursRouting}
                onChange={(e) =>
                  onChange({
                    ...pipeline,
                    afterHoursRouting: e.target.value as any,
                  })
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 focus:border-[#1878B8] text-xs font-semibold text-slate-800 dark:text-white outline-none shadow-2xs cursor-pointer"
              >
                <option value="emergency_dispatcher">
                  Forward to On-Call Emergency Tarp Dispatcher
                </option>
                <option value="queue_morning">
                  Queue SMS for 07:00 AM Next Morning Rollout
                </option>
                <option value="voicemail">
                  Send After-Hours SMS with Online Scheduling Link
                </option>
              </select>
            </div>
          </div>

          {/* Right Column: Interactive Phone Preview */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center p-4 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 text-white shadow-xl border border-slate-800 dark:border-white/10">
            <div className="w-full max-w-[280px] space-y-3">
              <div className="flex items-center justify-between text-[10px] text-slate-400 border-b border-slate-800 pb-2">
                <div className="flex items-center gap-1.5">
                  <Smartphone size={12} className="text-sky-400" />
                  <span className="font-bold">Client SMS Preview</span>
                </div>
                <span>(760) 842-7890</span>
              </div>

              {/* Text Bubble */}
              <div className="bg-[#1878B8] text-white p-3 rounded-2xl rounded-tl-sm text-[11px] leading-relaxed shadow-md">
                {pipeline.smsTemplate
                  .replace('{{first_name}}', 'Robert')
                  .replace('{{city}}', 'Oceanside')
                  .replace('{{estimator_name}}', 'Dave Miller')}
              </div>

              <div className="text-right text-[9px] text-slate-500">
                Delivered via Twilio • Now
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================
          SECTION 2: LOSS REASON TAXONOMY & WEBHOOKS
          ================================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Loss Reason Taxonomy */}
        <div className="light-glass-card rounded-3xl p-6 border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Pipeline Loss Reason Taxonomy
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Categorizes lost bids for win/loss executive intelligence.
              </p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-white/10">
              {pipeline.lossReasons.length} Categories
            </span>
          </div>

          <div className="space-y-2 text-xs">
            {pipeline.lossReasons.map((reason, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-white/10 shadow-2xs group hover:border-slate-300 dark:hover:border-white/20 transition-colors"
              >
                <span className="font-semibold text-slate-800 dark:text-slate-200">{reason}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveReason(idx)}
                  className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>

          {/* Add Reason Input */}
          <div className="flex items-center gap-2 pt-2">
            <input
              type="text"
              value={newReason}
              onChange={(e) => setNewReason(e.target.value)}
              placeholder="Add new loss reason..."
              onKeyDown={(e) => e.key === 'Enter' && handleAddReason()}
              className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 focus:border-[#1878B8] text-xs font-semibold text-slate-800 dark:text-white outline-none shadow-2xs"
            />
            <button
              type="button"
              onClick={handleAddReason}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-sky-600 hover:dark:bg-sky-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Plus size={14} />
              <span>Add</span>
            </button>
          </div>
        </div>

        {/* Webhooks & API Ingestion */}
        <div className="light-glass-card rounded-3xl p-6 border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Inbound Lead Webhooks & Gateways
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Direct endpoint routing for Google LSA, website forms, and Zapier.
              </p>
            </div>
            <Webhook size={18} className="text-[#1878B8] dark:text-sky-400" />
          </div>

          <div className="space-y-4 text-xs">
            {/* Google LSA Webhook */}
            <div className="space-y-1.5">
              <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">
                Google Local Services Ads (LSA) Webhook URL
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={pipeline.inboundWebhookLsa}
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 font-mono text-[11px] text-slate-700 dark:text-slate-300 outline-none select-all"
                />
                <button
                  type="button"
                  onClick={() => handleCopy(pipeline.inboundWebhookLsa, 'lsa')}
                  className="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 hover:bg-slate-50 hover:dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs flex items-center gap-1.5 transition-colors"
                >
                  {copiedKey === 'lsa' ? (
                    <Check size={13} className="text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Copy size={13} />
                  )}
                  <span>{copiedKey === 'lsa' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Zapier Secret */}
            <div className="space-y-1.5">
              <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">
                Zapier / Webhook Secret Key
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  readOnly
                  value={pipeline.zapierWebhookSecret}
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 font-mono text-[11px] text-slate-700 dark:text-slate-300 outline-none select-all"
                />
                <button
                  type="button"
                  onClick={() =>
                    handleCopy(pipeline.zapierWebhookSecret, 'secret')
                  }
                  className="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 hover:bg-slate-50 hover:dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs flex items-center gap-1.5 transition-colors"
                >
                  {copiedKey === 'secret' ? (
                    <Check size={13} className="text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Copy size={13} />
                  )}
                  <span>{copiedKey === 'secret' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Assignment Algorithm */}
            <div className="space-y-1.5 pt-1">
              <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">
                Lead Auto-Assignment Algorithm
              </label>
              <select
                value={pipeline.autoAssignMode}
                onChange={(e) =>
                  onChange({ ...pipeline, autoAssignMode: e.target.value as any })
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 focus:border-[#1878B8] text-xs font-semibold text-slate-800 dark:text-white outline-none shadow-2xs cursor-pointer"
              >
                <option value="territory_zip">
                  Zip-Code Territory Matrix (Oceanside, Carlsbad, Encinitas)
                </option>
                <option value="round_robin">
                  Round-Robin Equal Distribution (Dave Miller & Carlos Morales)
                </option>
                <option value="manual">
                  Manual Dispatch Assignment (Hold in Unassigned Pool)
                </option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
