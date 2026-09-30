import React, { useState } from 'react';
import {
  Sparkles,
  Plus,
  Trash2,
  Image as ImageIcon,
  Shield,
  Calendar,
  CheckCircle2,
  Clock,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { MultiOptionProposalData, OptionDetails } from '@/types/estimateTypes';

interface EstimateMultiOptionBuilderProps {
  proposalData: MultiOptionProposalData;
  onChangeProposalData: (data: MultiOptionProposalData) => void;
}

const PRESET_HERO_PHOTOS = [
  {
    label: 'Spanish Tile Villa (Oceanside)',
    url: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=800&q=80',
  },
  {
    label: 'Coastal Mediterranean Roof',
    url: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=800&q=80',
  },
  {
    label: 'Modern Tile Residence',
    url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80',
  },
  {
    label: 'Luxury Estate (Rancho Santa Fe)',
    url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
  },
];

export function EstimateMultiOptionBuilder({
  proposalData,
  onChangeProposalData,
}: EstimateMultiOptionBuilderProps) {
  const [newScopeA, setNewScopeA] = useState('');
  const [newScopeB, setNewScopeB] = useState('');

  const updateRoot = <K extends keyof MultiOptionProposalData>(
    key: K,
    val: MultiOptionProposalData[K]
  ) => {
    onChangeProposalData({
      ...proposalData,
      [key]: val,
    });
  };

  const updateOption = (optionKey: 'optionA' | 'optionB', field: keyof OptionDetails, val: any) => {
    onChangeProposalData({
      ...proposalData,
      [optionKey]: {
        ...proposalData[optionKey],
        [field]: val,
      },
    });
  };

  const addScopeItem = (optionKey: 'optionA' | 'optionB', text: string) => {
    if (!text.trim()) return;
    const current = proposalData[optionKey].scopeItems;
    updateOption(optionKey, 'scopeItems', [...current, text.trim()]);
    if (optionKey === 'optionA') setNewScopeA('');
    else setNewScopeB('');
  };

  const removeScopeItem = (optionKey: 'optionA' | 'optionB', idx: number) => {
    const updated = proposalData[optionKey].scopeItems.filter((_, i) => i !== idx);
    updateOption(optionKey, 'scopeItems', updated);
  };

  return (
    <div className="space-y-6">
      {/* ── Section A: Proposal Metadata & Hero Photo ── */}
      <div className="light-glass-panel rounded-3xl p-5 md:p-7 shadow-xs border border-white/85 dark:border-white/10 space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-200/60 pb-3">
          <div className="w-8 h-8 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-600">
            <Calendar size={16} />
          </div>
          <div>
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Proposal Details &amp; Hero House Photo
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              Proposal date ribbon, customer overview, and featured property photograph.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Proposal Date */}
          <div className="space-y-1">
            <label className="text-[11px] font-extrabold text-slate-700 block">
              Proposal Date (Angled Ribbon)
            </label>
            <input
              type="text"
              value={proposalData.proposalDate}
              onChange={(e) => updateRoot('proposalDate', e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-black text-slate-900 bg-white focus:outline-none focus:border-amber-500"
              placeholder="8/27/2026"
            />
          </div>

          {/* Lock-In Validity Days */}
          <div className="space-y-1">
            <label className="text-[11px] font-extrabold text-slate-700 block">
              Lock-In Price Validity Period
            </label>
            <div className="relative">
              <input
                type="number"
                value={proposalData.lockInDays || 20}
                onChange={(e) => updateRoot('lockInDays', parseInt(e.target.value) || 20)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-black text-slate-900 bg-white focus:outline-none focus:border-amber-500"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                Days
              </span>
            </div>
          </div>

          {/* Pitch & Stories */}
          <div className="space-y-1">
            <label className="text-[11px] font-extrabold text-slate-700 block">
              Roof Pitch &amp; Dimensions Callout
            </label>
            <input
              type="text"
              value={proposalData.roofPitch}
              onChange={(e) => updateRoot('roofPitch', e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-black text-slate-900 bg-white focus:outline-none focus:border-amber-500"
              placeholder="4:12 Standard Low Pitch"
            />
          </div>
        </div>

        {/* Hero Photo Selection */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <label className="text-[11px] font-extrabold text-slate-700 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <ImageIcon size={13} className="text-amber-500" />
              <span>Hero Property Photograph</span>
            </span>
            <span className="text-[10px] text-slate-400 font-normal">
              Select preset or paste custom photo URL
            </span>
          </label>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {PRESET_HERO_PHOTOS.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => updateRoot('heroPhotoUrl', p.url)}
                className={`p-1.5 rounded-xl border transition-all text-left group overflow-hidden cursor-pointer ${
                  proposalData.heroPhotoUrl === p.url
                    ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/40'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="w-full h-14 rounded-lg overflow-hidden mb-1 bg-slate-100">
                  <img src={p.url} alt={p.label} className="w-full h-full object-cover" />
                </div>
                <span className="text-[10px] font-bold text-slate-700 block truncate">
                  {p.label}
                </span>
              </button>
            ))}
          </div>

          <div className="relative mt-1">
            <input
              type="text"
              value={proposalData.heroPhotoUrl}
              onChange={(e) => updateRoot('heroPhotoUrl', e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-white focus:outline-none focus:border-amber-500"
              placeholder="Paste custom photo URL (https://...)"
            />
          </div>
        </div>
      </div>

      {/* ── Section B: Dual Option A vs Option B Cards Editor ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* OPTION A CARD EDITOR */}
        <div className="light-glass-panel rounded-3xl p-5 md:p-6 shadow-xs border-2 border-sky-500/40 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-sky-600 text-white font-black text-sm flex items-center justify-center">
                A
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Option A: Lift &amp; Relay
                </h4>
                <span className="text-[10px] font-bold text-sky-600">Reuse Existing Tiles</span>
              </div>
            </div>
            <span className="text-xs font-black text-sky-700">
              ${proposalData.optionA.lockInPrice.toLocaleString()}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-slate-600">Card Title</label>
              <input
                type="text"
                value={proposalData.optionA.title}
                onChange={(e) => updateOption('optionA', 'title', e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-black text-slate-900 bg-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-slate-600">Card Subtitle</label>
              <input
                type="text"
                value={proposalData.optionA.subtitle}
                onChange={(e) => updateOption('optionA', 'subtitle', e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-sky-700">Lock-In Price ($)</label>
              <input
                type="number"
                value={proposalData.optionA.lockInPrice}
                onChange={(e) => updateOption('optionA', 'lockInPrice', parseFloat(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-sky-300 text-xs font-black text-sky-900 bg-sky-50/40"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-slate-600">Standard Price ($)</label>
              <input
                type="number"
                value={proposalData.optionA.standardPrice}
                onChange={(e) => updateOption('optionA', 'standardPrice', parseFloat(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-black text-slate-800 bg-white"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-slate-600">Warranty Statement</label>
            <input
              type="text"
              value={proposalData.optionA.warranty}
              onChange={(e) => updateOption('optionA', 'warranty', e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-white"
            />
          </div>

          {/* Scope Bullet Checklist */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 flex items-center justify-between">
              <span>Scope of Work Bullets ({proposalData.optionA.scopeItems.length})</span>
            </label>

            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
              {proposalData.optionA.scopeItems.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-1.5 p-1.5 rounded-lg bg-white border border-slate-200 text-[11px] text-slate-800"
                >
                  <CheckCircle2 size={12} className="text-sky-600 shrink-0" />
                  <span className="flex-1 truncate">{item}</span>
                  <button
                    type="button"
                    onClick={() => removeScopeItem('optionA', idx)}
                    className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-1.5 pt-1">
              <input
                type="text"
                value={newScopeA}
                onChange={(e) => setNewScopeA(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addScopeItem('optionA', newScopeA)}
                placeholder="Add custom scope checklist bullet..."
                className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-white focus:outline-none focus:border-amber-500"
              />
              <button
                type="button"
                onClick={() => addScopeItem('optionA', newScopeA)}
                className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold cursor-pointer"
              >
                Add
              </button>
            </div>
          </div>
        </div>

        {/* OPTION B CARD EDITOR */}
        <div className="light-glass-panel rounded-3xl p-5 md:p-6 shadow-xs border-2 border-indigo-500/40 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-black text-sm flex items-center justify-center">
                B
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Option B: Full Tile Replacement
                </h4>
                <span className="text-[10px] font-bold text-indigo-600">100% Brand-New Tiles</span>
              </div>
            </div>
            <span className="text-xs font-black text-indigo-700">
              ${proposalData.optionB.lockInPrice.toLocaleString()}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-slate-600">Card Title</label>
              <input
                type="text"
                value={proposalData.optionB.title}
                onChange={(e) => updateOption('optionB', 'title', e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-black text-slate-900 bg-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-slate-600">Card Subtitle</label>
              <input
                type="text"
                value={proposalData.optionB.subtitle}
                onChange={(e) => updateOption('optionB', 'subtitle', e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-indigo-700">Lock-In Price ($)</label>
              <input
                type="number"
                value={proposalData.optionB.lockInPrice}
                onChange={(e) => updateOption('optionB', 'lockInPrice', parseFloat(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-indigo-300 text-xs font-black text-indigo-900 bg-indigo-50/40"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-slate-600">Standard Price ($)</label>
              <input
                type="number"
                value={proposalData.optionB.standardPrice}
                onChange={(e) => updateOption('optionB', 'standardPrice', parseFloat(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-black text-slate-800 bg-white"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-slate-600">Warranty Statement</label>
            <input
              type="text"
              value={proposalData.optionB.warranty}
              onChange={(e) => updateOption('optionB', 'warranty', e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-white"
            />
          </div>

          {/* Scope Bullet Checklist */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 flex items-center justify-between">
              <span>Scope of Work Bullets ({proposalData.optionB.scopeItems.length})</span>
            </label>

            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
              {proposalData.optionB.scopeItems.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-1.5 p-1.5 rounded-lg bg-white border border-slate-200 text-[11px] text-slate-800"
                >
                  <CheckCircle2 size={12} className="text-indigo-600 shrink-0" />
                  <span className="flex-1 truncate">{item}</span>
                  <button
                    type="button"
                    onClick={() => removeScopeItem('optionB', idx)}
                    className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-1.5 pt-1">
              <input
                type="text"
                value={newScopeB}
                onChange={(e) => setNewScopeB(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addScopeItem('optionB', newScopeB)}
                placeholder="Add custom scope checklist bullet..."
                className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-white focus:outline-none focus:border-amber-500"
              />
              <button
                type="button"
                onClick={() => addScopeItem('optionB', newScopeB)}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Section C: Add-On 1 & Add-On 2 Customization ── */}
      <div className="light-glass-panel rounded-3xl p-5 md:p-7 shadow-xs border border-white/85 dark:border-white/10 space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-200/60 pb-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600">
            <Plus size={16} />
          </div>
          <div>
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Proposal Add-On Upgrades (Featured Banners)
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              Customize Add-on 1 (Underlayment upgrade) and Add-on 2 (Pressure washing soft wash).
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Add-on 1 */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-sky-700">Add-On Upgrade 1</span>
              <span className="text-xs font-black text-slate-900">+${proposalData.addon1.price}</span>
            </div>
            <input
              type="text"
              value={proposalData.addon1.title}
              onChange={(e) =>
                onChangeProposalData({
                  ...proposalData,
                  addon1: { ...proposalData.addon1, title: e.target.value },
                })
              }
              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-black text-slate-900"
            />
            <textarea
              rows={2}
              value={proposalData.addon1.description}
              onChange={(e) =>
                onChangeProposalData({
                  ...proposalData,
                  addon1: { ...proposalData.addon1, description: e.target.value },
                })
              }
              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-[11px] font-medium text-slate-700"
            />
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-600">Upgrade Price:</span>
              <div className="relative w-32">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">+$</span>
                <input
                  type="number"
                  value={proposalData.addon1.price}
                  onChange={(e) =>
                    onChangeProposalData({
                      ...proposalData,
                      addon1: { ...proposalData.addon1, price: parseFloat(e.target.value) || 0 },
                    })
                  }
                  className="w-full pl-7 pr-2.5 py-1 rounded-lg border border-slate-200 text-xs font-black text-slate-900"
                />
              </div>
            </div>
          </div>

          {/* Add-on 2 */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-sky-700">Add-On Upgrade 2</span>
              <span className="text-xs font-black text-slate-900">+${proposalData.addon2.price}</span>
            </div>
            <input
              type="text"
              value={proposalData.addon2.title}
              onChange={(e) =>
                onChangeProposalData({
                  ...proposalData,
                  addon2: { ...proposalData.addon2, title: e.target.value },
                })
              }
              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-black text-slate-900"
            />
            <textarea
              rows={2}
              value={proposalData.addon2.description}
              onChange={(e) =>
                onChangeProposalData({
                  ...proposalData,
                  addon2: { ...proposalData.addon2, description: e.target.value },
                })
              }
              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-[11px] font-medium text-slate-700"
            />
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-600">Upgrade Price:</span>
              <div className="relative w-32">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">+$</span>
                <input
                  type="number"
                  value={proposalData.addon2.price}
                  onChange={(e) =>
                    onChangeProposalData({
                      ...proposalData,
                      addon2: { ...proposalData.addon2, price: parseFloat(e.target.value) || 0 },
                    })
                  }
                  className="w-full pl-7 pr-2.5 py-1 rounded-lg border border-slate-200 text-xs font-black text-slate-900"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
