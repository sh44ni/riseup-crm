import { useState, useEffect, useCallback } from 'react';
import { JobRecord, JobSummaryStats, JobMilestone, JobActivityItem } from '@/types/jobTypes';
import * as jobsApi from '@/api/jobsApi';

export function useJobs(filterStatus: string = 'all', searchQuery: string = '') {
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [summary, setSummary] = useState<JobSummaryStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [selectedJob, setSelectedJob] = useState<JobRecord | null>(null);
  const [activities, setActivities] = useState<JobActivityItem[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState<boolean>(false);

  const fetchJobsData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await jobsApi.fetchJobs({
        status: filterStatus,
        search: searchQuery,
      });
      setJobs(res.jobs);
      setSummary(res.summary);
    } catch (err: any) {
      setError(err?.message || 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, searchQuery]);

  useEffect(() => {
    fetchJobsData();
  }, [fetchJobsData]);

  // Fetch single job details and activities when selected
  useEffect(() => {
    if (!selectedJobId) {
      setSelectedJob(null);
      setActivities([]);
      return;
    }

    let isMounted = true;
    const loadDetails = async () => {
      try {
        setActivitiesLoading(true);
        const [jobRes, actRes] = await Promise.all([
          jobsApi.fetchJob(selectedJobId),
          jobsApi.fetchJobActivities(selectedJobId),
        ]);
        if (isMounted) {
          setSelectedJob(jobRes.job);
          setActivities(actRes);
        }
      } catch (err: any) {
        console.error('Error fetching job details:', err);
      } finally {
        if (isMounted) setActivitiesLoading(false);
      }
    };

    loadDetails();
    return () => {
      isMounted = false;
    };
  }, [selectedJobId]);

  // Helper to update a job in local state
  const updateLocalJob = (updated: JobRecord) => {
    setJobs((prev) => prev.map((j) => (j.id === updated.id ? updated : j)));
    if (selectedJobId === updated.id) {
      setSelectedJob(updated);
    }
  };

  // Add custom milestone
  const addMilestone = async (jobId: number, milestone: Omit<JobMilestone, 'id'>) => {
    const job = jobs.find((j) => j.id === jobId) || selectedJob;
    if (!job) return;

    const newMilestone: JobMilestone = {
      ...milestone,
      id: `ms_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      status: milestone.status || 'pending',
    };

    const updatedMilestones = [...(job.milestones || []), newMilestone];
    // Optimistic update
    const optimisticJob: JobRecord = {
      ...job,
      milestones: updatedMilestones,
      milestones_total_count: updatedMilestones.length,
      milestones_completed_count: updatedMilestones.filter((m) => m.status === 'completed').length,
      milestone_progress: Math.round(
        (updatedMilestones.filter((m) => m.status === 'completed').length / updatedMilestones.length) * 100
      ),
    };
    updateLocalJob(optimisticJob);

    try {
      const serverJob = await jobsApi.updateJob(jobId, { milestones: updatedMilestones });
      updateLocalJob(serverJob);
      return serverJob;
    } catch (err) {
      fetchJobsData();
      throw err;
    }
  };

  // Toggle milestone status
  const toggleMilestone = async (
    jobId: number,
    milestoneId: string,
    authorName?: string
  ) => {
    const job = jobs.find((j) => j.id === jobId) || selectedJob;
    if (!job) return;

    const updatedMilestones = (job.milestones || []).map((m) => {
      if (m.id !== milestoneId) return m;
      const isComplete = m.status === 'completed';
      return {
        ...m,
        status: (isComplete ? 'pending' : 'completed') as 'pending' | 'completed',
        completedAt: !isComplete ? new Date().toISOString() : undefined,
        completedBy: !isComplete ? authorName || 'Field Crew' : undefined,
      };
    });

    const completedCount = updatedMilestones.filter((m) => m.status === 'completed').length;
    const progress = updatedMilestones.length > 0 ? Math.round((completedCount / updatedMilestones.length) * 100) : 0;

    const optimisticJob: JobRecord = {
      ...job,
      milestones: updatedMilestones,
      milestones_completed_count: completedCount,
      milestone_progress: progress,
    };
    updateLocalJob(optimisticJob);

    try {
      const serverJob = await jobsApi.updateJob(jobId, { milestones: updatedMilestones });
      updateLocalJob(serverJob);
      return serverJob;
    } catch (err) {
      fetchJobsData();
      throw err;
    }
  };

  // Delete milestone
  const deleteMilestone = async (jobId: number, milestoneId: string) => {
    const job = jobs.find((j) => j.id === jobId) || selectedJob;
    if (!job) return;

    const updatedMilestones = (job.milestones || []).filter((m) => m.id !== milestoneId);
    const completedCount = updatedMilestones.filter((m) => m.status === 'completed').length;
    const progress = updatedMilestones.length > 0 ? Math.round((completedCount / updatedMilestones.length) * 100) : 0;

    const optimisticJob: JobRecord = {
      ...job,
      milestones: updatedMilestones,
      milestones_total_count: updatedMilestones.length,
      milestones_completed_count: completedCount,
      milestone_progress: progress,
    };
    updateLocalJob(optimisticJob);

    try {
      const serverJob = await jobsApi.updateJob(jobId, { milestones: updatedMilestones });
      updateLocalJob(serverJob);
      return serverJob;
    } catch (err) {
      fetchJobsData();
      throw err;
    }
  };

  // Update job general details
  const updateJobDetails = async (jobId: number, payload: Partial<JobRecord>) => {
    try {
      const updated = await jobsApi.updateJob(jobId, payload);
      updateLocalJob(updated);
      fetchJobsData();
      return updated;
    } catch (err) {
      throw err;
    }
  };

  // Complete job
  const markJobComplete = async (
    jobId: number,
    notes?: string,
    authorInfo?: { name?: string; role?: string }
  ) => {
    try {
      const completed = await jobsApi.completeJob(jobId, {
        notes,
        authorName: authorInfo?.name,
        authorRole: authorInfo?.role,
      });
      updateLocalJob(completed);
      fetchJobsData();
      window.dispatchEvent(new CustomEvent('crm:top-performers-updated'));
      return completed;
    } catch (err) {
      throw err;
    }
  };

  // Log note / field activity
  const logActivity = async (
    jobId: number,
    note: string,
    authorInfo?: { name?: string; role?: string }
  ) => {
    try {
      await jobsApi.logJobActivity(jobId, {
        note,
        authorName: authorInfo?.name,
        authorRole: authorInfo?.role,
      });
      const [jobRes, actRes] = await Promise.all([
        jobsApi.fetchJob(jobId),
        jobsApi.fetchJobActivities(jobId),
      ]);
      updateLocalJob(jobRes.job);
      setActivities(actRes);
    } catch (err) {
      throw err;
    }
  };

  // Create new job
  const createNewJob = async (payload: jobsApi.CreateJobPayload) => {
    try {
      const created = await jobsApi.createJob(payload);
      fetchJobsData();
      return created;
    } catch (err) {
      throw err;
    }
  };

  return {
    jobs,
    summary,
    loading,
    error,
    selectedJobId,
    setSelectedJobId,
    selectedJob,
    activities,
    activitiesLoading,
    refetch: fetchJobsData,
    addMilestone,
    toggleMilestone,
    deleteMilestone,
    updateJobDetails,
    markJobComplete,
    logActivity,
    createNewJob,
  };
}
