import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  X,
  UserCheck,
  DollarSign,
} from 'lucide-react';
import { CreateExistingClientPayload, checkClientContact } from '@/api/clientsApi';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import {
  ExistingClientFormSchema,
  ExistingClientFormData,
  SERVICE_OPTIONS,
} from './create-modal/types';
import { PipelineStageSelector } from './create-modal/PipelineStageSelector';
import { HomeownerIdentitySection } from './create-modal/HomeownerIdentitySection';
import { PropertySpecsSection } from './create-modal/PropertySpecsSection';

export interface CreateExistingClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: CreateExistingClientPayload) => Promise<unknown>;
}

export function CreateExistingClientModal({
  isOpen,
  onClose,
  onSave,
}: CreateExistingClientModalProps) {
  const { user } = useAuth();
  const [emailConflict, setEmailConflict] = useState<string | null>(null);
  const [phoneConflict, setPhoneConflict] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<Array<{ id: number; name: string; role?: string }>>([]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ExistingClientFormData>({
    resolver: zodResolver(ExistingClientFormSchema),
    defaultValues: {
      fullName: '',
      phone: '',
      email: '',
      secondaryPhone: '',
      clientSince: new Date().toISOString().split('T')[0],
      address: '',
      city: 'Oceanside',
      zip: '92054',
      propertyType: 'Single Family',
      roofType: 'Eagle Concrete Tile',
      roofSqf: 2400,
      roofAge: '',
      stories: 1,
      hoa: false,
      pipelineStage: 'cold_lead',
      serviceType: 'Roof Replacement',
      contractValue: '',
      notes: '',
      assignedToUserId: null,
    },
  });

  const emailValue = watch('email');
  const phoneValue = watch('phone');
  const pipelineStage = watch('pipelineStage');

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    api.getUsers()
      .then((res: unknown) => {
        if (!isMounted) return;
        const data = res as { users?: Array<{ id: number; name: string; role?: string }> } | Array<{ id: number; name: string; role?: string }>;
        const list = Array.isArray((data as { users?: unknown[] }).users)
          ? (data as { users: Array<{ id: number; name: string; role?: string }> }).users
          : Array.isArray(data)
            ? data
            : [];
        setTeamMembers(list);
      })
      .catch((err) => {
        console.warn('Failed to load team members for existing client modal:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) onClose();
    };
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const onSubmit = async (formData: ExistingClientFormData) => {
    setErrorMessage(null);

    if (emailConflict) {
      setErrorMessage(emailConflict);
      return;
    }
    if (phoneConflict) {
      setErrorMessage(phoneConflict);
      return;
    }

    try {
      const checkRes = await checkClientContact({
        email: formData.email?.trim() || undefined,
        phone: formData.phone?.trim() || undefined,
      });
      if (checkRes.exists && checkRes.client) {
        const msg =
          checkRes.field === 'phone'
            ? `A client with this phone number already exists: "${checkRes.client.full_name}" (Client #${checkRes.client.id}). Please use a unique phone number or edit the existing client.`
            : `A client with this email already exists: "${checkRes.client.full_name}" (Client #${checkRes.client.id}). Please use a unique email or edit the existing client.`;
        if (checkRes.field === 'phone') setPhoneConflict(msg);
        else setEmailConflict(msg);
        setErrorMessage(msg);
        return;
      }
    } catch {
      // Backend will still enforce duplicate check
    }

    const payload: CreateExistingClientPayload = {
      fullName: formData.fullName.trim(),
      phone: formData.phone?.trim() || undefined,
      email: formData.email?.trim() || undefined,
      secondaryPhone: formData.secondaryPhone?.trim() || undefined,
      address: formData.address?.trim() || undefined,
      city: formData.city?.trim() || 'Oceanside',
      zip: formData.zip?.trim() || '92054',
      propertyType: formData.propertyType,
      roofType: formData.roofType,
      roofSqf: Number(formData.roofSqf) || 2400,
      roofAge: formData.roofAge !== '' && formData.roofAge !== undefined ? Number(formData.roofAge) : undefined,
      stories: Number(formData.stories) || 1,
      hoa: formData.hoa,
      pipelineStage: formData.pipelineStage,
      serviceType: formData.serviceType,
      contractValue: formData.contractValue !== '' && formData.contractValue !== undefined ? Number(formData.contractValue) : 0,
      clientSince: formData.clientSince,
      notes: formData.notes?.trim() || undefined,
      assignedToUserId: formData.assignedToUserId || (user?.id ? Number(user.id) : undefined),
      sourceType: 'team_member',
      acquiredByUserId: user?.id ? Number(user.id) : undefined,
      leadSourceDetail: `Staff Onboarding by ${user?.name || 'Staff'} (${user?.role || 'Staff'})`,
    };

    try {
      await onSave(payload);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save client';
      setErrorMessage(msg);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-white/10 overflow-hidden">
        <div className="shrink-0 flex items-center justify-between p-5 border-b border-slate-200/80 dark:border-white/10 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-xs">
              <UserCheck size={20} className="stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900 dark:text-white">
                  Onboard Existing Homeowner
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-800/60">
                  Staff Direct Intake
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Add existing customer data & inject directly into any CRM pipeline stage
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-2.5 bg-slate-50 dark:bg-white/[0.03] border-b border-slate-200/60 dark:border-white/5 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              Attributed Creator: <strong className="text-slate-900 dark:text-white">{user?.name || 'Staff User'}</strong>{' '}
              <span className="text-[11px] px-1.5 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-300 ml-1">
                {user?.role || 'Staff'}
              </span>
            </span>
          </div>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 hidden sm:inline">
            Audit Event Auto-Logged
          </span>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="overflow-y-auto p-6 space-y-6 flex-1 text-xs">
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          <PipelineStageSelector
            value={pipelineStage}
            onChange={(stageId) => setValue('pipelineStage', stageId)}
          />

          <HomeownerIdentitySection
            register={register}
            errors={errors}
            setValue={setValue}
            emailValue={emailValue}
            phoneValue={phoneValue}
            emailConflict={emailConflict}
            setEmailConflict={setEmailConflict}
            phoneConflict={phoneConflict}
            setPhoneConflict={setPhoneConflict}
          />

          <PropertySpecsSection
            register={register}
            errors={errors}
            setValue={setValue}
            watch={watch}
          />

          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5 border-b border-slate-100 dark:border-white/5 pb-1">
              <DollarSign size={13} className="text-slate-400" />
              <span>Project Scope & Contract Value</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Service / Project Type
                </label>
                <select
                  {...register('serviceType')}
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                >
                  {SERVICE_OPTIONS.map((svc) => (
                    <option key={svc} value={svc}>
                      {svc}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Contract / Est. Value ($)
                </label>
                <div className="relative">
                  <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="number"
                    min="0"
                    step="100"
                    {...register('contractValue')}
                    placeholder="e.g. 18500"
                    className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Assigned Representative
                </label>
                <select
                  {...register('assignedToUserId', {
                    setValueAs: (v) => (v ? Number(v) : null),
                  })}
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                >
                  <option value="">Auto-Assign to Creator ({user?.name || 'Self'})</option>
                  {teamMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.role || 'Staff'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Historical Context, Existing Warranty & Project Notes
              </label>
              <textarea
                rows={3}
                {...register('notes')}
                placeholder="Include past roof permit info, previous repair dates, preferred contact times, or warranty terms..."
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium resize-none"
              />
            </div>
          </div>

          <div className="shrink-0 pt-4 border-t border-slate-200/80 dark:border-white/10 flex items-center justify-between">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white font-bold text-xs shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Onboarding Homeowner...</span>
                </>
              ) : (
                <>
                  <UserCheck size={14} className="stroke-[2.5]" />
                  <span>Onboard Existing Homeowner</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
