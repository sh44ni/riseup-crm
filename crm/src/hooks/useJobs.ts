import { useState, useCallback, useMemo } from 'react';
import { JobRecord, JobSummaryStats, JobMilestone } from '@/types/jobTypes';
import * as jobsApi from '@/api/jobsApi';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
  useJobsListQuery,
  useJobDetailQuery,
  useJobActivitiesQuery,
} from '@/entities/job/queries';
import {
  useCreateJobMutation,
  useUpdateJobMutation,
  useCompleteJobMutation,
} from '@/entities/job/mutations';

export function useJobs(filterStatus: string = 'all', searchQuery: string = '') {
  const queryClient = useQueryClient();
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);

  const queryParams = useMemo(
    () => ({
      status: filterStatus !== 'all' ? filterStatus : undefined,
      search: searchQuery.trim() || undefined,
    }),
    [filterStatus, searchQuery]
  );

  const { data, isLoading: loading, error: queryError, refetch } = useJobsListQuery(queryParams);

  const { data: jobDetailData } = useJobDetailQuery(selectedJobId || 0, {
    enabled: Boolean(selectedJobId),
  });

  const { data: activitiesData = [], isLoading: activitiesLoading } = useJobActivitiesQuery(
    selectedJobId || 0,
    {
      enabled: Boolean(selectedJobId),
    }
  );

  const createJobMutation = useCreateJobMutation();
  const updateJobMutation = useUpdateJobMutation();
  const completeJobMutation = useCompleteJobMutation();

  const jobs = useMemo(() => data?.jobs || [], [data?.jobs]);
  const summary: JobSummaryStats | null = data?.summary || null;
  const error = queryError ? (queryError instanceof Error ? queryError.message : 'Failed to load jobs') : null;

  const selectedJob = useMemo(() => {
    if (jobDetailData?.job) return jobDetailData.job;
    return jobs.find((j) => j.id === selectedJobId) || null;
  }, [jobDetailData, jobs, selectedJobId]);

  const activities = useMemo(() => activitiesData || [], [activitiesData]);

  // Add custom milestone
  const addMilestone = useCallback(
    async (jobId: number, milestone: Omit<JobMilestone, 'id'>) => {
      const job = jobs.find((j) => j.id === jobId) || selectedJob;
      if (!job) return;

      const newMilestone: JobMilestone = {
        ...milestone,
        id: `ms_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        status: milestone.status || 'pending',
      };

      const updatedMilestones = [...(job.milestones || []), newMilestone];
      return await updateJobMutation.mutateAsync({
        id: jobId,
        payload: { milestones: updatedMilestones },
      });
    },
    [jobs, selectedJob, updateJobMutation]
  );

  // Toggle milestone status
  const toggleMilestone = useCallback(
    async (jobId: number, milestoneId: string, authorName?: string) => {
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

      return await updateJobMutation.mutateAsync({
        id: jobId,
        payload: { milestones: updatedMilestones },
      });
    },
    [jobs, selectedJob, updateJobMutation]
  );

  // Delete milestone
  const deleteMilestone = useCallback(
    async (jobId: number, milestoneId: string) => {
      const job = jobs.find((j) => j.id === jobId) || selectedJob;
      if (!job) return;

      const updatedMilestones = (job.milestones || []).filter((m) => m.id !== milestoneId);
      return await updateJobMutation.mutateAsync({
        id: jobId,
        payload: { milestones: updatedMilestones },
      });
    },
    [jobs, selectedJob, updateJobMutation]
  );

  // Update job general details
  const updateJobDetails = useCallback(
    async (jobId: number, payload: Partial<JobRecord>) => {
      return await updateJobMutation.mutateAsync({ id: jobId, payload });
    },
    [updateJobMutation]
  );

  // Complete job
  const markJobComplete = useCallback(
    async (
      jobId: number,
      _notes?: string,
      _authorInfo?: { name?: string; role?: string }
    ) => {
      const completed = await completeJobMutation.mutateAsync(jobId);
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all() });
      return completed;
    },
    [completeJobMutation, queryClient]
  );

  // Log note / field activity
  const logActivity = useCallback(
    async (
      jobId: number,
      note: string,
      authorInfo?: { name?: string; role?: string }
    ) => {
      await jobsApi.logJobActivity(jobId, {
        note,
        authorName: authorInfo?.name,
        authorRole: authorInfo?.role,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.activities(jobId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.detail(jobId) });
    },
    [queryClient]
  );

  // Create new job
  const createNewJob = useCallback(
    async (payload: jobsApi.CreateJobPayload) => {
      return await createJobMutation.mutateAsync(payload);
    },
    [createJobMutation]
  );

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
    refetch,
    addMilestone,
    toggleMilestone,
    deleteMilestone,
    updateJobDetails,
    markJobComplete,
    logActivity,
    createNewJob,
  };
}
