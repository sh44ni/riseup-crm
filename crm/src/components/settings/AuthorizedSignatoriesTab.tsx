import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  PenTool,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Clock,
  RotateCcw,
  Sparkles,
  Users,
  Building2,
  FileCheck,
  Edit3,
  X,
  Plus,
  ArrowRight,
  HelpCircle,
  FileText,
  Lock,
  Trash2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

export interface SignatoryUser {
  id: number;
  name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  role_names: string[];
  signature_title: string;
  signature_type: 'typed' | 'drawn';
  signature_data?: string | null;
  has_signature: boolean;
  is_self?: boolean;
  updated_at?: string | null;
}

interface AuthorizedSignatoriesTabProps {
  onNavigateToRoles?: () => void;
}

export function AuthorizedSignatoriesTab({ onNavigateToRoles }: AuthorizedSignatoriesTabProps) {
  const { user: currentUser, isOwner } = useAuth();
  const { toast } = useToast();
  const [signatories, setSignatories] = useState<SignatoryUser[]>([]);
  const [configuredCount, setConfiguredCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Edit Signature Modal State
  const [editingSignatory, setEditingSignatory] = useState<SignatoryUser | null>(null);
  const [signName, setSignName] = useState<string>('');
  const [signTitle, setSignTitle] = useState<string>('Project Manager');
  const [signMode, setSignMode] = useState<'typed' | 'drawn'>('typed');
  const [drawnDataUrl, setDrawnDataUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Canvas drawing ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef<boolean>(false);

  // Lock body scroll and handle Escape key for modal
  useEffect(() => {
    if (!editingSignatory) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setEditingSignatory(null);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [editingSignatory]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    toast.success(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadSignatories = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.getSignatories();
      setSignatories(res.signatories || []);
      setConfiguredCount(res.configured_count || 0);
    } catch (err: any) {
      console.error('Failed to load signatories:', err);
      setError(err.message || 'Could not fetch authorized signatories.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSignatories();
  }, []);

  const handleDeleteSignature = async (signatoryId: number) => {
    if (!window.confirm('Are you sure you want to remove your electronic signature? You will not be able to counter-sign contracts until a new signature is configured.')) {
      return;
    }
    setIsSaving(true);
    try {
      await api.deleteSignatorySignature(signatoryId);
      showToast('Signature removed successfully.');
      setEditingSignatory(null);
      await loadSignatories();
    } catch (err: any) {
      console.error('Failed to remove signature:', err);
      toast.error(err.message || 'Failed to remove signature. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Modal open handler
  const handleOpenEditModal = (signatory: SignatoryUser) => {
    const isSelf = signatory.is_self ?? (signatory.id === currentUser?.id);
    if (!isSelf) {
      toast.warning('Signatures are private credentials. Each authorized signatory must set their signature from their own account.');
      return;
    }
    setEditingSignatory(signatory);
    setSignName(signatory.name || currentUser?.name || '');
    setSignTitle(signatory.signature_title || 'Project Manager');
    setSignMode(signatory.signature_type || 'typed');
    setDrawnDataUrl(
      signatory.signature_data && signatory.signature_data.startsWith('data:image')
        ? signatory.signature_data
        : null
    );
  };

  // Canvas drawing handlers
  useEffect(() => {
    if (!editingSignatory || signMode !== 'drawn') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Retina display scaling
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#091b36';
    ctx.lineWidth = 2.5;

    // If pre-existing drawn signature exists, render it onto canvas
    if (drawnDataUrl) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
      };
      img.src = drawnDataUrl;
    }
  }, [editingSignatory, signMode]);

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDrawingRef.current = true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    const canvas = canvasRef.current;
    if (canvas) {
      setDrawnDataUrl(canvas.toDataURL('image/png'));
    }
  };

  const handleClearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setDrawnDataUrl(null);
  };

  const handleSaveSignature = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSignatory) return;

    let finalSigData = '';
    if (signMode === 'typed') {
      if (!signName.trim()) {
        toast.warning('Please enter the legal printed name for the calligraphy signature.');
        return;
      }
      finalSigData = signName.trim();
    } else {
      if (!drawnDataUrl) {
        toast.warning('Please draw a valid electronic signature on the canvas pad before saving.');
        return;
      }
      finalSigData = drawnDataUrl;
    }

    setIsSaving(true);
    try {
      await api.updateSignatorySignature(editingSignatory.id, {
        signature_name: signName.trim(),
        signature_title: signTitle.trim() || 'Project Manager',
        signature_type: signMode,
        signature_data: finalSigData,
      });

      showToast(`Signature successfully saved for ${signName || editingSignatory.name}!`);
      setEditingSignatory(null);
      await loadSignatories();
    } catch (err: any) {
      console.error('Failed to save signature:', err);
      toast.error(err.message || 'Failed to save signature. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const mySignatory = signatories.find((s) => (s.is_self ?? (s.id === currentUser?.id)));
  const isCurrentUserSignatory = Boolean(currentUser?.is_authorized_signatory || mySignatory);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-700 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs font-bold animate-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Current User Signatory Status Hero Banner */}
      {isCurrentUserSignatory ? (
        <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
          mySignatory?.has_signature
            ? 'bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent border-emerald-500/30'
            : 'bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-transparent border-purple-500/30'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm ${
                mySignatory?.has_signature
                  ? 'bg-gradient-to-tr from-emerald-600 to-teal-600'
                  : 'bg-gradient-to-tr from-purple-600 to-indigo-600'
              }`}>
                <ShieldCheck size={22} className="stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    Your Signatory Status: Active Authorized Signatory
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                    You ({currentUser?.name})
                  </span>
                  {mySignatory?.has_signature ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      <CheckCircle2 size={10} /> Signature Ready
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                      <Clock size={10} /> Signature Required
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
                  {mySignatory?.has_signature
                    ? 'Your official signature is configured and stored privately. When you counter-sign contracts, your personal electronic signature will be legally affixed.'
                    : 'You hold legal signatory authority on your account, but you must establish your personal electronic signature before counter-signing contracts.'}
                </p>
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (mySignatory) {
                    handleOpenEditModal(mySignatory);
                  } else if (currentUser) {
                    handleOpenEditModal({
                      id: currentUser.id,
                      name: currentUser.name,
                      email: currentUser.email,
                      role_names: ['Authorized Signatory'],
                      signature_title: 'Project Manager',
                      signature_type: 'typed',
                      has_signature: false,
                      is_self: true,
                    });
                  }
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm transition-all flex items-center gap-1.5 cursor-pointer ${
                  mySignatory?.has_signature
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-purple-600 hover:bg-purple-700'
                }`}
              >
                <PenTool size={13} />
                <span>{mySignatory?.has_signature ? 'Edit My Signature' : 'Configure My Signature'}</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-2.5">
            <Lock size={16} className="text-slate-400 shrink-0" />
            <span>
              <strong>Your Account Status:</strong> You do not currently hold Authorized Signatory authority. Signatory roles can be assigned by company administrators in Roles &amp; Permissions.
            </span>
          </div>
          {onNavigateToRoles && (
            <button
              type="button"
              onClick={onNavigateToRoles}
              className="text-purple-600 dark:text-purple-400 font-bold hover:underline shrink-0 text-xs cursor-pointer"
            >
              View Roles &rarr;
            </button>
          )}
        </div>
      )}

      {/* Top Overview & KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200/90 dark:border-white/10 rounded-2xl p-4 shadow-2xs backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Authorized Signatories
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/60 flex items-center justify-center text-purple-700 dark:text-purple-300">
              <Users size={16} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
            {signatories.length}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Active staff with Signatory Authority
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900/60 border border-slate-200/90 dark:border-white/10 rounded-2xl p-4 shadow-2xs backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Signatures Ready
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-700 dark:text-emerald-400">
            {configuredCount}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Fully configured for counter-signing
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900/60 border border-slate-200/90 dark:border-white/10 rounded-2xl p-4 shadow-2xs backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Pending Setup
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center text-amber-700 dark:text-amber-300">
              <Clock size={16} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-amber-600 dark:text-amber-400">
            {Math.max(0, signatories.length - configuredCount)}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Require signature configuration
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900/60 border border-slate-200/90 dark:border-white/10 rounded-2xl p-4 shadow-2xs backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
              CSLB Licensure
            </span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800/60 flex items-center justify-center text-sky-700 dark:text-sky-300">
              <Building2 size={16} />
            </div>
          </div>
          <div className="mt-2 text-base font-black text-slate-900 dark:text-white">
            Lic #1096492
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            B / C39 / C46 Classifications
          </p>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden backdrop-blur-md">
        {/* Header Bar */}
        <div className="p-5 border-b border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-purple-500/20">
              <PenTool size={20} className="stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Designated Contract Signatories
                </h2>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60">
                  Legal Authority
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Staff members granted legal authority to counter-sign California Home Improvement Contracts.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadSignatories}
              disabled={isLoading}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-white/10 transition-colors cursor-pointer"
              title="Refresh Signatories"
            >
              <RotateCcw size={14} className={isLoading ? 'animate-spin' : ''} />
            </button>

            {onNavigateToRoles && (
              <button
                type="button"
                onClick={onNavigateToRoles}
                className="px-3.5 py-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
              >
                <Users size={13} />
                <span>Manage Roles &amp; Authority</span>
              </button>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 space-y-2">
              <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-medium">Loading authorized signatories...</span>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-3 text-xs text-rose-700 dark:text-rose-300">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600" />
              <div>
                <strong>Error loading signatories:</strong> {error}
              </div>
            </div>
          ) : signatories.length === 0 ? (
            /* EMPTY STATE: NO AUTHORIZED SIGNATORIES FOUND */
            <div className="py-10 px-6 text-center max-w-lg mx-auto space-y-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-sm">
                <AlertCircle size={28} />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  No Authorized Signatories Found
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                  Contract counter-signing is currently blocked across the platform because no staff member has been designated as an Authorized Signatory.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/5 text-xs text-left text-slate-600 dark:text-slate-300 space-y-2">
                <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-purple-600" />
                  How to designate an authorized signatory:
                </div>
                <ol className="list-decimal list-inside space-y-1 text-[11.5px] text-slate-500 dark:text-slate-400 pl-1">
                  <li>Navigate to <strong>Users &amp; Permissions</strong> tab.</li>
                  <li>Select an operational role (e.g. <em>Owner</em>, <em>Head</em>, or <em>Project Manager</em>).</li>
                  <li>Set <strong>Authorized Signatory Authority</strong> to <strong>Authorized Signatory</strong>.</li>
                  <li>Assign staff members to that role and configure their signature below.</li>
                </ol>
              </div>

              {onNavigateToRoles && (
                <button
                  type="button"
                  onClick={onNavigateToRoles}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-purple-500/25 transition-all cursor-pointer"
                >
                  <span>Go to Roles &amp; Permissions</span>
                  <ArrowRight size={13} />
                </button>
              )}
            </div>
          ) : (
            /* LIST OF SIGNATORY CARDS */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {signatories.map((sig) => {
                const isSelf = Boolean(sig.is_self ?? (sig.id === currentUser?.id));
                return (
                  <div
                    key={sig.id}
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
                          <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-white font-extrabold text-sm shadow-sm ${
                            isSelf
                              ? 'bg-gradient-to-tr from-purple-600 to-indigo-600 ring-2 ring-purple-400/40'
                              : 'bg-gradient-to-tr from-slate-600 to-slate-800'
                          }`}>
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
                            onClick={() => handleOpenEditModal(sig)}
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
                              onClick={() => handleDeleteSignature(sig.id)}
                              className="text-[10.5px] text-rose-500 hover:text-rose-600 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                              title="Remove signature"
                            >
                              <Trash2 size={11} />
                              <span>Reset Signature</span>
                            </button>
                          )}
                        </div>

                        {/* CASE 1: IS SELF - CAN VIEW OWN SIGNATURE INK */}
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
                                    className="text-3xl text-sky-950 dark:text-sky-200 select-none font-semibold tracking-wide italic"
                                    style={{
                                      fontFamily:
                                        "'Dancing Script', 'Caveat', 'Segoe Script', 'Brush Script MT', cursive",
                                    }}
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
                                onClick={() => handleOpenEditModal(sig)}
                                className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-2xs transition-all cursor-pointer inline-flex items-center gap-1.5"
                              >
                                <PenTool size={11} />
                                <span>Set Up My Official Signature</span>
                              </button>
                            </div>
                          )
                        ) : (
                          /* CASE 2: NOT SELF - PRIVATE ENCRYPTED MASKING */
                          sig.has_signature ? (
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
                          )
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
              })}
            </div>
          )}
        </div>
      </div>

      {/* Signature Setup Modal */}
      {editingSignatory &&
        createPortal(
          <div
            onClick={() => setEditingSignatory(null)}
            className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-5 bg-slate-950/65 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200 select-none"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-white dark:bg-[#0B1320] rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden flex flex-col max-h-[90vh] my-auto animate-in zoom-in-95 duration-200"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-slate-900/60 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-sm shrink-0">
                    <PenTool size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Configure Official Signatory Signature
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {editingSignatory.name} &bull; {editingSignatory.email}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingSignatory(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Form Body & Sticky Footer */}
              <form onSubmit={handleSaveSignature} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Legal Printed Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={signName}
                      onChange={(e) => setSignName(e.target.value)}
                      placeholder="e.g. Edith Guerrero"
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Official Corporate Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={signTitle}
                      onChange={(e) => setSignTitle(e.target.value)}
                      placeholder="e.g. Project Manager, President, Authorized Officer"
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20"
                    />
                  </div>

                  {/* Mode Selector */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Signature Style Mode
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setSignMode('typed')}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 cursor-pointer ${
                          signMode === 'typed'
                            ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-900 dark:text-purple-200 border-purple-300 dark:border-purple-800 shadow-2xs'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10 hover:border-slate-300'
                        }`}
                      >
                        <span>Typed Calligraphy</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSignMode('drawn')}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 cursor-pointer ${
                          signMode === 'drawn'
                            ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-900 dark:text-purple-200 border-purple-300 dark:border-purple-800 shadow-2xs'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10 hover:border-slate-300'
                        }`}
                      >
                        <Edit3 size={13} />
                        <span>Draw Electronic Signature</span>
                      </button>
                    </div>
                  </div>

                  {/* Typed Calligraphy Preview */}
                  {signMode === 'typed' && (
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
                        Calligraphy Preview:
                      </span>
                      <div className="bg-slate-50 dark:bg-slate-800/80 rounded-xl p-4 border border-slate-200 dark:border-white/10 text-center">
                        <div
                          className="text-4xl text-sky-950 dark:text-sky-200 select-none py-2 font-semibold tracking-wide italic"
                          style={{
                            fontFamily:
                              "'Dancing Script', 'Caveat', 'Segoe Script', 'Brush Script MT', cursive",
                          }}
                        >
                          {signName || 'Your Signature'}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-white/5 pt-1 mt-1">
                          Rendered on Contract Page 4 as official electronic calligraphy
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Hand-Drawn Canvas Pad */}
                  {signMode === 'drawn' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                          Sign with mouse or stylus:
                        </span>
                        <button
                          type="button"
                          onClick={handleClearCanvas}
                          className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCcw size={11} />
                          <span>Clear Canvas</span>
                        </button>
                      </div>

                      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-300 dark:border-slate-700 overflow-hidden shadow-inner touch-none relative">
                        <canvas
                          ref={canvasRef}
                          onPointerDown={startDrawing}
                          onPointerMove={draw}
                          onPointerUp={stopDrawing}
                          onPointerLeave={stopDrawing}
                          className="w-full h-36 cursor-crosshair block bg-amber-50/20 dark:bg-slate-900/30"
                        />
                        <div className="absolute bottom-2 left-3 text-[10px] text-slate-400 pointer-events-none">
                          &times; Draw signature along the line
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Legal Notice */}
                  <div className="p-3 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800/50 text-[11px] text-purple-900 dark:text-purple-300 leading-relaxed">
                    <strong>Legal Notice:</strong> In accordance with the California Uniform Electronic Transactions Act (UETA) and federal ESIGN regulations, this official signature will be affixed to binding contracts executed by Rise Up Roofing and Construction, Inc. (License #1096492).
                  </div>
                </div>

                {/* Sticky Action Footer */}
                <div className="shrink-0 px-6 py-4 border-t border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-slate-900/60 flex items-center justify-between gap-2.5">
                  {editingSignatory.has_signature ? (
                    <button
                      type="button"
                      onClick={() => handleDeleteSignature(editingSignatory.id)}
                      disabled={isSaving}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Trash2 size={13} />
                      <span>Remove Signature</span>
                    </button>
                  ) : (
                    <div />
                  )}

                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setEditingSignatory(null)}
                      disabled={isSaving}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-5 py-2.5 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      {isSaving ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Saving Signature...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={13} />
                          <span>Save Authorized Signature</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
