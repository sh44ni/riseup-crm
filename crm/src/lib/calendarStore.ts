import { useCallback, useMemo } from 'react';
import {
  TeamOperationEvent,
  CalendarEventCategory,
  CalendarEventStatus,
  TeamMemberResource,
  CalendarStats,
  CalendarWeather,
} from '@/types/calendarTypes';
import {
  useCalendarEventsQuery,
  useCalendarStatsQuery,
  useCalendarWeatherQuery,
  useRegisteredUsersQuery,
} from '@/entities/calendar/queries';
import {
  useCreateCalendarEventMutation,
  useUpdateCalendarEventMutation,
  useDeleteCalendarEventMutation,
  useToggleCalendarTaskMutation,
} from '@/entities/calendar/mutations';

export const CATEGORY_DOT_COLORS: Record<CalendarEventCategory, string> = {
  team_task: 'bg-sky-500',
  client_meeting: 'bg-purple-500',
  client_visit: 'bg-purple-500',
  project_op: 'bg-amber-500',
  permit_filing: 'bg-emerald-500',
  city_permit: 'bg-emerald-500',
  warranty_audit: 'bg-teal-500',
  warranty_checkin: 'bg-teal-500',
  reminder: 'bg-rose-500',
  roof_install: 'bg-sky-500',
  boom_delivery: 'bg-amber-500',
  roof_inspection: 'bg-purple-500',
  manual_task: 'bg-sky-500',
};

export const CATEGORY_ACCENT_COLORS: Record<CalendarEventCategory, string> = {
  team_task: '#0284c7',
  client_meeting: '#7c3aed',
  client_visit: '#7c3aed',
  project_op: '#d97706',
  permit_filing: '#059669',
  city_permit: '#059669',
  warranty_audit: '#0d9488',
  warranty_checkin: '#0d9488',
  reminder: '#f43f5e',
  roof_install: '#0284c7',
  boom_delivery: '#d97706',
  roof_inspection: '#7c3aed',
  manual_task: '#0284c7',
};

/**
 * Modernized React hook for unified calendar state across pages and sidebar
 * powered by TanStack Query.
 */
export function useCalendarEvents() {
  const { data: rawEvents = [], isFetching, refetch } = useCalendarEventsQuery();
  const createMutation = useCreateCalendarEventMutation();
  const updateMutation = useUpdateCalendarEventMutation();
  const deleteMutation = useDeleteCalendarEventMutation();
  const toggleMutation = useToggleCalendarTaskMutation();

  const events = useMemo(() => rawEvents || [], [rawEvents]);

  const addEvent = useCallback(
    async (newEvent: TeamOperationEvent) => {
      await createMutation.mutateAsync(newEvent);
    },
    [createMutation]
  );

  const updateEvent = useCallback(
    async (id: string, updates: Partial<TeamOperationEvent>) => {
      await updateMutation.mutateAsync({ id, updates });
    },
    [updateMutation]
  );

  const deleteEvent = useCallback(
    async (id: string) => {
      await deleteMutation.mutateAsync(id);
    },
    [deleteMutation]
  );

  const toggleEventStatus = useCallback(
    async (id: string) => {
      const target = events.find((e) => e.id === id);
      if (!target) return;
      await toggleMutation.mutateAsync({ id, completed: !target.completed });
    },
    [events, toggleMutation]
  );

  const refreshEvents = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const getEventsForDay = useCallback(
    (dayNumber: number) => {
      return events.filter((e) => e.dayNumber === dayNumber);
    },
    [events]
  );

  const getDotsForDay = useCallback(
    (dayNumber: number) => {
      const dayEvts = events.filter((e) => e.dayNumber === dayNumber);
      if (dayEvts.length === 0) return [];
      const categories = Array.from(new Set(dayEvts.map((e) => e.category)));
      return categories.slice(0, 3).map((cat) => CATEGORY_DOT_COLORS[cat] || 'bg-sky-500');
    },
    [events]
  );

  return {
    events,
    isRefreshing: isFetching,
    addEvent,
    updateEvent,
    deleteEvent,
    toggleEventStatus,
    refreshEvents,
    getEventsForDay,
    getDotsForDay,
  };
}

/**
 * Hook to retrieve registered CRM user accounts for team assignments
 */
export function useRegisteredUsers(): { users: TeamMemberResource[]; isLoading: boolean } {
  const { data: rawUsers = [], isLoading } = useRegisteredUsersQuery();

  const users: TeamMemberResource[] = useMemo(() => {
    const colors = [
      'from-sky-500 to-blue-600',
      'from-blue-500 to-indigo-600',
      'from-amber-500 to-orange-600',
      'from-emerald-500 to-teal-600',
      'from-purple-500 to-pink-600',
      'from-rose-500 to-orange-500',
    ];
    return (rawUsers || []).map((u, idx: number) => {
      const initials = (u.full_name || 'User')
        .split(' ')
        .filter(Boolean)
        .map((p: string) => p[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
      return {
        id: u.id,
        name: u.full_name || 'User',
        role: 'team_member',
        roleLabel: 'Team Member',
        email: u.email,
        phone: '(760) 555-0100',
        avatarColor: colors[idx % colors.length] || 'from-sky-500 to-blue-600',
        initials: initials || 'TM',
        status: 'active',
      };
    });
  }, [rawUsers]);

  return { users, isLoading };
}

/**
 * Hook to retrieve dynamic calendar operations and workload stats
 */
export function useCalendarStats(): CalendarStats {
  const { data } = useCalendarStatsQuery();

  return (
    data || {
      activeTeamMembers: 0,
      operationsToday: 0,
      completedToday: 0,
      upcomingDeliveries: 0,
      pendingPermits: 0,
      scheduleConflicts: 0,
    }
  );
}

/**
 * Hook to retrieve live North County weather & OSHA wind safety metrics
 */
export function useCalendarWeather(): CalendarWeather {
  const { data } = useCalendarWeatherQuery();

  return (
    data || {
      tempF: 72,
      windSpeedMph: 8,
      gustMph: 12,
      condition: 'Sunny & Clear',
      safetyStatus: 'safe',
      safetyLabel: 'All Zones Safe for Rooftop Work',
      city: 'Oceanside / North County',
    }
  );
}
