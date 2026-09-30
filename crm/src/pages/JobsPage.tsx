import React, { useState, useRef } from 'react';
import {
  Hammer,
  Sparkles,
} from 'lucide-react';
import { CrmPageHero } from '@/components/common/CrmPageHero';
import { ViewToggle } from '@/components/common/ViewToggle';
import { useJobs } from '@/hooks/useJobs';
import { JobRecord } from '@/types/jobTypes';
import { JobCard } from '@/components/jobs/JobCard';
import { JobsTableView } from '@/components/jobs/JobsTableView';
import { JobInspectorModal } from '@/components/jobs/JobInspectorModal';

export function JobsPage() {
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards');
  const [selectedJob, setSelectedJob] = useState<JobRecord | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const {
    jobs,
    loading,
    activities,
    activitiesLoading,
    setSelectedJobId,
    addMilestone,
    toggleMilestone,
    deleteMilestone,
    updateJobDetails,
    markJobComplete,
    logActivity,
  } = useJobs('all', search);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Show active jobs (not completed/cancelled) by default
  const activeJobs = jobs.filter((j) => j.status !== 'complete' && j.status !== 'cancelled');
  const completedJobs = jobs.filter((j) => j.status === 'complete');

  const handleOpenInspector = (job: JobRecord) => {
    setSelectedJob(job);
    setSelectedJobId(job.id);
  };

  const handleCloseInspector = () => {
    setSelectedJob(null);
    setSelectedJobId(null);
  };

  return (
    <div className="space-y-3.5 max-w-[1600px] mx-auto select-none pb-14">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 px-4 py-2.5 rounded-2xl bg-slate-900 text-white text-xs font-semibold shadow-2xl border border-white/20 flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-200">
          <Sparkles size={14} className="text-[#2F9FE3]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* HERO */}
      <CrmPageHero
        pageId="jobs"
        defaultEyebrow="FIELD OPERATIONS & PRODUCTION"
        defaultTitle="Active Jobs"
        defaultSubtitle="Track active job sites, custom milestones, and field activity logs."
        showSearch={true}
        searchPlaceholder="Search by client, address, or job number..."
        searchValue={search}
        onSearchChange={setSearch}
        onSearchClear={() => setSearch('')}
        searchRef={searchInputRef}
      />

      {/* TOOLBAR: Summary count & View Mode Switcher */}
      <div className="light-glass-panel rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Showing <strong className="text-slate-900 dark:text-white">{activeJobs.length}</strong> active {activeJobs.length === 1 ? 'jobsite' : 'jobsites'}
          </span>
          {completedJobs.length > 0 && (
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
              • {completedJobs.length} completed
            </span>
          )}
        </div>

        <ViewToggle
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
      </div>

      {/* ACTIVE JOBS */}
      {activeJobs.length > 0 ? (
        viewMode === 'table' ? (
          <JobsTableView jobs={activeJobs} onSelectJob={handleOpenInspector} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {activeJobs.map((job) => (
              <JobCard key={job.id} job={job} onClick={() => handleOpenInspector(job)} />
            ))}
          </div>
        )
      ) : (
        <div className="py-20 text-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-white/10 bg-white/30 dark:bg-white/5 space-y-2">
          <Hammer size={32} className="mx-auto text-slate-300 dark:text-slate-600" />
          <h5 className="font-bold text-sm text-slate-600 dark:text-slate-300">
            {loading ? 'Loading jobs...' : 'No active jobs'}
          </h5>
          <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm mx-auto">
            {loading
              ? 'Fetching your work orders...'
              : 'Jobs appear here automatically when leads move to Active Jobs in your pipeline.'}
          </p>
        </div>
      )}

      {/* COMPLETED JOBS (if any) */}
      {completedJobs.length > 0 && (
        <>
          <div className="flex items-center gap-2 pt-4">
            <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2">Completed ({completedJobs.length})</span>
            <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
          </div>
          {viewMode === 'table' ? (
            <div className="opacity-80">
              <JobsTableView jobs={completedJobs} onSelectJob={handleOpenInspector} />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 opacity-70">
              {completedJobs.map((job) => (
                <JobCard key={job.id} job={job} onClick={() => handleOpenInspector(job)} />
              ))}
            </div>
          )}
        </>
      )}

      {/* JOB INSPECTOR */}
      <JobInspectorModal
        isOpen={Boolean(selectedJob)}
        job={selectedJob}
        activities={activities}
        activitiesLoading={activitiesLoading}
        onClose={handleCloseInspector}
        onAddMilestone={async (jobId, milestone) => {
          const updated = await addMilestone(jobId, milestone);
          showToast('Milestone added!');
          return updated;
        }}
        onToggleMilestone={async (jobId, milestoneId, author) => {
          const updated = await toggleMilestone(jobId, milestoneId, author);
          showToast('Milestone updated!');
          return updated;
        }}
        onDeleteMilestone={async (jobId, milestoneId) => {
          const updated = await deleteMilestone(jobId, milestoneId);
          showToast('Milestone removed.');
          return updated;
        }}
        onUpdateJob={async (jobId, payload) => {
          const updated = await updateJobDetails(jobId, payload);
          showToast('Job updated!');
          return updated;
        }}
        onCompleteJob={async (jobId, notes, author) => {
          const completed = await markJobComplete(jobId, notes, author);
          showToast(`Job ${completed.job_number} completed!`);
          return completed;
        }}
        onLogActivity={async (jobId, note, author) => {
          await logActivity(jobId, note, author);
          showToast('Note saved!');
        }}
      />
    </div>
  );
}
