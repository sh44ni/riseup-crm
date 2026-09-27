import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  MapPin,
  Phone,
  Mail,
  Calendar,
  CheckCircle2,
  Plus,
  Trash2,
  Loader2,
  ListTodo,
  Clock,
} from 'lucide-react';
import { JobRecord, JobMilestone, JobActivityItem } from '@/types/jobTypes';
import { useAuth } from '@/context/AuthContext';
import { ProfileNotesFeed } from '@/components/common/ProfileNotesFeed';
import { cleanseAuthor } from '@/lib/noteUtils';

interface JobInspectorModalProps {
  isOpen: boolean;
  job: JobRecord | null;
  activities: JobActivityItem[];
  activitiesLoading: boolean;
  onClose: () => void;
  onAddMilestone: (jobId: number, milestone: Omit<JobMilestone, 'id'>) => Promise<any>;
  onToggleMilestone: (jobId: number, milestoneId: string, authorName?: string) => Promise<any>;
  onDeleteMilestone: (jobId: number, milestoneId: string) => Promise<any>;
  onUpdateJob: (jobId: number, payload: Partial<JobRecord>) => Promise<any>;
  onCompleteJob: (jobId: number, notes?: string, authorInfo?: { name?: string; role?: string }) => Promise<any>;
  onLogActivity: (jobId: number, note: string, authorInfo?: { name?: string; role?: string }) => Promise<any>;
}

export function JobInspectorModal({
  isOpen,
  job,
  activities,
  activitiesLoading,
  onClose,
  onAddMilestone,
  onToggleMilestone,
  onDeleteMilestone,
  onUpdateJob,
  onCompleteJob,
  onLogActivity,
}: JobInspectorModalProps) {
  const { user } = useAuth();
  const clean = cleanseAuthor(user?.name, user?.role);
  const authorName = clean?.name || user?.name || 'Staff Member';
  const authorRole = clean?.role || user?.role || 'Field Manager';

  const [activeTab, setActiveTab] = useState<'milestones' | 'logs'>('milestones');

  // Custom milestone input
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [newMilestoneDesc, setNewMilestoneDesc] = useState('');
  const [isAddingMilestone, setIsAddingMilestone] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Complete job confirmation
  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false);
  const [completionNotes, setCompletionNotes] = useState('');
  const [isCompleting, setIsCompleting] = useState(false);

  useEffect(() => {
    if (job) {
      setIsCompleteDialogOpen(false);
      setShowAddForm(false);
      setNewMilestoneTitle('');
      setNewMilestoneDesc('');
    }
  }, [job?.id]);

  if (!isOpen || !job) return null;

  const totalMilestones = job.milestones?.length || 0;
  const completedMilestones = job.milestones?.filter((m) => m.status === 'completed').length || 0;
  const progress = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : (job.status === 'complete' ? 100 : 0);

  const handleAddMilestoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMilestoneTitle.trim()) return;
    setIsAddingMilestone(true);
    try {
      await onAddMilestone(job.id, {
        title: newMilestoneTitle.trim(),
        description: newMilestoneDesc.trim() || undefined,
        status: 'pending',
      });
      setNewMilestoneTitle('');
      setNewMilestoneDesc('');
      setShowAddForm(false);
    } catch (err) {
      console.error('Failed to add milestone:', err);
    } finally {
      setIsAddingMilestone(false);
    }
  };

  const handleConfirmCompleteJob = async () => {
    setIsCompleting(true);
    try {
      await onCompleteJob(job.id, completionNotes.trim(), {
        name: authorName,
        role: authorRole,
      });
      setIsCompleteDialogOpen(false);
      onClose();
    } catch (err) {
      console.error('Failed to complete job:', err);
    } finally {
      setIsCompleting(false);
    }
  };

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xl overflow-y-auto animate-in fade-in duration-200"
    >
      {/* Main Modal Card */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-3xl rounded-[28px] bg-white/95 dark:bg-[#0B1320]/95 backdrop-blur-3xl border border-white/95 dark:border-white/10 shadow-[0_25px_90px_rgba(0,0,0,0.40),0_0_0_1px_rgba(255,255,255,0.9)_inset] dark:shadow-[0_25px_90px_rgba(0,0,0,0.85)] overflow-hidden my-auto max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-200 select-none"
      >
        {/* Specular top rim */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white dark:via-white/20 to-transparent" />

        {/* ═══ HEADER ═══ */}
        <div className="p-5 sm:p-6 border-b border-slate-200/80 dark:border-white/10 bg-gradient-to-b from-slate-50/80 dark:from-white/5 to-white/40 dark:to-transparent shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Left: Job info */}
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0B1E33] to-[#162C46] text-white flex items-center justify-center font-black text-lg shadow-md shrink-0 font-mono">
                {job.customer_name.charAt(0)}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-black px-2.5 py-0.5 rounded-lg bg-[#1878B8]/15 text-[#0284C7] dark:text-sky-400 border border-[#1878B8]/30">
                    {job.job_number}
                  </span>
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {job.service_type || 'Roofing'}
                  </span>
                </div>

                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  {job.customer_name}
                </h2>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-300 font-semibold">
                  {job.customer_phone && (
                    <a href={`tel:${job.customer_phone}`} className="flex items-center gap-1 hover:text-[#0284C7] dark:hover:text-sky-400 transition-colors">
                      <Phone size={12} className="text-slate-400 dark:text-slate-500" />
                      <span>{job.customer_phone}</span>
                    </a>
                  )}
                  {job.customer_email && (
                    <a href={`mailto:${job.customer_email}`} className="flex items-center gap-1 hover:text-[#0284C7] dark:hover:text-sky-400 transition-colors">
                      <Mail size={12} className="text-slate-400 dark:text-slate-500" />
                      <span>{job.customer_email}</span>
                    </a>
                  )}
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(job.address ? `${job.address}, ${job.city}` : 'Carlsbad, CA')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 hover:text-[#0284C7] dark:hover:text-sky-400 transition-colors"
                  >
                    <MapPin size={12} className="text-slate-400 dark:text-slate-500" />
                    <span>{job.address ? `${job.address}, ${job.city || ''}` : 'San Diego County, CA'}</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Right: Value + Close + Complete */}
            <div className="flex items-center sm:items-end flex-row sm:flex-col justify-between sm:justify-center gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white bg-slate-100 dark:bg-white/10 px-3 py-1 rounded-xl border border-slate-200 dark:border-white/10">
                  ${job.contract_value.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                </span>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                >
                  <X size={16} />
                </button>
              </div>

              {job.status !== 'complete' && (
                <button
                  type="button"
                  onClick={() => setIsCompleteDialogOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:brightness-110 text-white font-extrabold text-xs shadow-md shadow-emerald-500/25 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <CheckCircle2 size={13} className="stroke-[2.5]" />
                  <span>Complete Job & Closeout</span>
                </button>
              )}
            </div>
          </div>

          {/* ═══ TWO TABS ONLY ═══ */}
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-200/70 dark:border-white/10">
            <button
              type="button"
              onClick={() => setActiveTab('milestones')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'milestones'
                  ? 'bg-slate-900 dark:bg-sky-600 text-white shadow-xs'
                  : 'bg-white/80 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-white/10 border border-slate-200/60 dark:border-white/10'
              }`}
            >
              <span>Milestones</span>
              {totalMilestones > 0 && (
                <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-extrabold ${activeTab === 'milestones' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300'}`}>
                  {completedMilestones}/{totalMilestones}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('logs')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'logs'
                  ? 'bg-slate-900 dark:bg-sky-600 text-white shadow-xs'
                  : 'bg-white/80 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-white/10 border border-slate-200/60 dark:border-white/10'
              }`}
            >
              <span>Logs</span>
              {activities.length > 0 && (
                <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-extrabold ${activeTab === 'logs' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300'}`}>
                  {activities.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ═══ MODAL BODY ═══ */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">

          {/* ─── TAB: MILESTONES ─── */}
          {activeTab === 'milestones' && (
            <div className="space-y-3">
              {/* Progress summary */}
              {totalMilestones > 0 && (
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        progress === 100
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                          : 'bg-gradient-to-r from-[#1878B8] via-sky-500 to-[#55C4F5]'
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="text-xs font-black text-slate-700 dark:text-slate-300 shrink-0">{progress}%</span>
                </div>
              )}

              {/* Milestones list — clean timeline style */}
              {job.milestones && job.milestones.length > 0 ? (
                <div className="space-y-1.5">
                  {job.milestones.map((m, idx) => {
                    const isCompleted = m.status === 'completed';
                    return (
                      <div
                        key={m.id || idx}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all group ${
                          isCompleted
                            ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200/70 dark:border-emerald-700/40'
                            : 'bg-white dark:bg-white/5 border-slate-200/80 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
                        }`}
                      >
                        {/* Toggle checkbox */}
                        <button
                          type="button"
                          onClick={() => onToggleMilestone(job.id, m.id, authorName)}
                          className={`w-5 h-5 rounded-lg flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                            isCompleted
                              ? 'bg-emerald-600 text-white'
                              : 'border-2 border-slate-300 dark:border-white/20 bg-white dark:bg-white/5 hover:border-[#0284C7] dark:hover:border-sky-400'
                          }`}
                        >
                          {isCompleted && <CheckCircle2 size={12} className="stroke-[3]" />}
                        </button>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <span className={`text-sm font-semibold ${isCompleted ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-white'}`}>
                            {m.title}
                          </span>
                          {m.description && (
                            <p className={`text-[11px] mt-0.5 ${isCompleted ? 'text-slate-400 dark:text-slate-500' : 'text-slate-500 dark:text-slate-400'}`}>
                              {m.description}
                            </p>
                          )}
                          {isCompleted && m.completedAt && (
                            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                              Completed {new Date(m.completedAt).toLocaleDateString()}
                              {m.completedBy ? ` by ${m.completedBy}` : ''}
                            </p>
                          )}
                        </div>

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => onDeleteMilestone(job.id, m.id)}
                          className="w-6 h-6 rounded-lg text-slate-300 dark:text-slate-600 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center transition-colors cursor-pointer shrink-0 opacity-0 group-hover:opacity-100"
                          title="Remove"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-14 px-4 text-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-white/10 bg-slate-50/30 dark:bg-white/5 space-y-2">
                  <ListTodo size={28} className="mx-auto text-slate-300 dark:text-slate-600" />
                  <h5 className="font-bold text-sm text-slate-600 dark:text-slate-300">No milestones yet</h5>
                  <p className="text-xs text-slate-400 dark:text-slate-500 max-w-xs mx-auto">
                    Add custom milestones to track progress — material orders, inspections, installations, anything you need.
                  </p>
                </div>
              )}

              {/* Add milestone — inline form */}
              {showAddForm ? (
                <form onSubmit={handleAddMilestoneSubmit} className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0F172A] p-3 space-y-2">
                  <input
                    type="text"
                    autoFocus
                    placeholder="Milestone title, e.g. Material Delivered"
                    value={newMilestoneTitle}
                    onChange={(e) => setNewMilestoneTitle(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm font-medium text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#0284C7] dark:focus:border-sky-500 focus:bg-white dark:focus:bg-slate-900 transition-all"
                  />
                  <input
                    type="text"
                    placeholder="Optional notes..."
                    value={newMilestoneDesc}
                    onChange={(e) => setNewMilestoneDesc(e.target.value)}
                    className="w-full h-8 px-3 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-700 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#0284C7] dark:focus:border-sky-500 focus:bg-white dark:focus:bg-slate-900 transition-all"
                  />
                  <div className="flex items-center gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => { setShowAddForm(false); setNewMilestoneTitle(''); setNewMilestoneDesc(''); }}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isAddingMilestone || !newMilestoneTitle.trim()}
                      className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-sky-600 dark:hover:bg-sky-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      {isAddingMilestone ? <Loader2 size={12} className="animate-spin" /> : <Plus size={13} />}
                      <span>Add</span>
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAddForm(true)}
                  className="w-full py-2.5 rounded-xl border-2 border-dashed border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Add Milestone</span>
                </button>
              )}
            </div>
          )}

          {/* ─── TAB: LOGS ─── */}
          {activeTab === 'logs' && (
            <div className="space-y-4">
              <ProfileNotesFeed
                rawNotes={job.notes}
                title="Field Logs & Notes"
                subtitle="Log field updates, inspections, delivery confirmations, and client interactions."
                placeholder="Log a field update or note..."
                onAddNote={async (serialized, plain, author) => {
                  await onLogActivity(job.id, plain, { name: author.name, role: author.role });
                }}
              />

              {activities.length > 0 && (
                <div className="rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-white/5 p-4 space-y-2.5">
                  <h4 className="font-bold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock size={12} className="text-slate-400 dark:text-slate-500" />
                    <span>Activity Timeline</span>
                  </h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {activities.map((act) => (
                      <div key={act.id} className="p-2.5 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800 dark:text-white">{act.title}</span>
                          <span className="text-slate-400 dark:text-slate-500 text-[10px] font-medium">
                            {new Date(act.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-300 text-[11px] whitespace-pre-wrap">{act.description}</p>
                        {act.performed_by && (
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                            by <span className="text-slate-600 dark:text-slate-300">{act.performed_by}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ═══ COMPLETE JOB DIALOG ═══ */}
        {isCompleteDialogOpen && (
          <div className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-md p-6 flex flex-col justify-center items-center animate-in fade-in duration-200">
            <div className="max-w-md w-full rounded-2xl bg-white dark:bg-[#0B1320] p-6 shadow-2xl border border-white/60 dark:border-white/10 space-y-4 animate-in zoom-in-95 duration-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                  <CheckCircle2 size={22} className="stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900 dark:text-white">Mark Job Completed</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Finalize {job.job_number} and archive to completed.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-700/60 text-xs text-emerald-900 dark:text-emerald-200 space-y-1">
                <div className="font-bold">This closeout will:</div>
                <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                  <li>Archive job from active jobs to Completed.</li>
                  <li>Record realized revenue (${job.contract_value.toLocaleString()}) to company stats.</li>
                  <li>Credit sales rep on top performers leaderboard.</li>
                </ul>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Completion Notes (Optional)</label>
                <textarea
                  rows={3}
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  placeholder="Final cleanup verified, walkthrough completed..."
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-xs font-medium text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-600 focus:bg-white dark:focus:bg-slate-900 transition-all"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCompleteDialogOpen(false)}
                  disabled={isCompleting}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-slate-300 font-bold text-xs transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCompleteJob}
                  disabled={isCompleting}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white font-extrabold text-xs shadow-md shadow-emerald-500/30 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  {isCompleting ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={14} className="stroke-[2.5]" />}
                  <span>Confirm Complete</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
