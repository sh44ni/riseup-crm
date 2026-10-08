import React from 'react';
import { Home, MapPin, Building2 } from 'lucide-react';
import type { UseFormRegister, FieldErrors, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import type { ExistingClientFormData } from './types';
import { ROOF_MATERIAL_OPTIONS } from './types';
import { CrmSelect } from '@/components/common/CrmSelect';

interface PropertySpecsSectionProps {
  register: UseFormRegister<ExistingClientFormData>;
  errors: FieldErrors<ExistingClientFormData>;
  setValue: UseFormSetValue<ExistingClientFormData>;
  watch: UseFormWatch<ExistingClientFormData>;
}

export function PropertySpecsSection({
  register,
  setValue,
  watch,
}: PropertySpecsSectionProps) {
  const hoa = watch('hoa');
  const roofType = watch('roofType');
  const stories = watch('stories');

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5 border-b border-slate-100 dark:border-white/5 pb-1">
        <Home size={13} className="text-slate-400" />
        <span>Property & Roof Specifications</span>
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2">
          <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Street Address
          </label>
          <div className="relative">
            <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              {...register('address')}
              placeholder="e.g. 1420 Pacific Coast Hwy"
              className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
            City
          </label>
          <input
            type="text"
            {...register('city')}
            placeholder="Oceanside"
            className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
            ZIP Code
          </label>
          <input
            type="text"
            {...register('zip')}
            placeholder="92054"
            className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Roof Material
          </label>
          <CrmSelect
            value={roofType}
            onChange={(val) => setValue('roofType', val, { shouldValidate: true })}
            options={ROOF_MATERIAL_OPTIONS.map((mat) => ({ value: mat, label: mat }))}
            triggerClassName="h-9 font-medium"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Roof Size (Sq Ft)
          </label>
          <input
            type="number"
            min="500"
            step="50"
            {...register('roofSqf')}
            placeholder="e.g. 2400"
            className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Stories
          </label>
          <CrmSelect
            value={String(stories ?? 1)}
            onChange={(val) => setValue('stories', Number(val) as 1 | 2 | 3, { shouldValidate: true })}
            options={[
              { value: '1', label: '1 Story' },
              { value: '2', label: '2 Stories' },
              { value: '3', label: '3+ Stories' },
            ]}
            triggerClassName="h-9 font-medium"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
            HOA Community
          </label>
          <button
            type="button"
            onClick={() => setValue('hoa', !hoa)}
            className={`w-full h-9 px-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              hoa
                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                : 'border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-600 dark:text-slate-400'
            }`}
          >
            <Building2 size={13} />
            <span>{hoa ? 'HOA Regulated: Yes' : 'No HOA'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
