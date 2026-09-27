import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  TeamOperationEvent,
  DispatchEvent,
  CalendarEventCategory,
  CalendarEventStatus,
  TeamMemberResource,
  CalendarStats,
  CalendarWeather,
} from '@/types/calendarTypes';
import {
  fetchCalendarEventsFromBackend,
  createCalendarEventOnBackend,
  updateCalendarEventOnBackend,
  deleteCalendarEventOnBackend,
  toggleTaskComplete,
  fetchRegisteredUsers,
  fetchCalendarStats,
  fetchCalendarWeather,
} from '@/api/calendarApi';


const STORAGE_KEY = 'crm_team_operations_calendar';
const SYNC_EVENT_NAME = 'crm_calendar_events_change';

// Color map for calendar categories and dot indicators
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
 * Safe local storage loader
 */
export function loadCalendarEvents(): TeamOperationEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('crm_calendar_dispatches');
    if (!raw) return [];
    const parsed: TeamOperationEvent[] = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to parse calendar events from storage:', err);
    return [];
  }
}

/**
 * Safe local storage saver with cross-tab event dispatch
 */
export function saveCalendarEvents(events: TeamOperationEvent[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    window.dispatchEvent(new CustomEvent(SYNC_EVENT_NAME, { detail: events }));
  } catch (err) {
    console.error('Failed to save calendar events to storage:', err);
  }
}

/**
 * React hook for unified calendar state across pages and sidebar
 */
export function useCalendarEvents() {
  const [events, setEvents] = useState<TeamOperationEvent[]>(loadCalendarEvents);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Sync across tabs and components
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          setEvents(JSON.parse(e.newValue));
        } catch {
          // Ignore parse errors
        }
      }
    };

    const handleCustomEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && Array.isArray(detail)) {
        setEvents(detail);
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener(SYNC_EVENT_NAME, handleCustomEvent);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(SYNC_EVENT_NAME, handleCustomEvent);
    };
  }, []);

  // Background revalidation with backend API on mount
  useEffect(() => {
    let isMounted = true;
    fetchCalendarEventsFromBackend().then((backendEvents) => {
      if (backendEvents !== null && isMounted && Array.isArray(backendEvents)) {
        setEvents(backendEvents);
        saveCalendarEvents(backendEvents);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // Add event (Optimistic with immediate state & backend sync)
  const addEvent = useCallback(async (newEvent: TeamOperationEvent) => {
    setEvents((prev) => {
      const updated = [newEvent, ...prev.filter((e) => e.id !== newEvent.id)];
      saveCalendarEvents(updated);
      return updated;
    });

    const saved = await createCalendarEventOnBackend(newEvent);
    if (saved && saved.id !== newEvent.id) {
      setEvents((prev) => {
        const updated = prev.map((e) => (e.id === newEvent.id ? saved : e));
        saveCalendarEvents(updated);
        return updated;
      });
    }
  }, []);

  // Update event
  const updateEvent = useCallback(async (id: string, updates: Partial<TeamOperationEvent>) => {
    setEvents((prev) => {
      const updated = prev.map((e) => (e.id === id ? { ...e, ...updates } : e));
      saveCalendarEvents(updated);
      return updated;
    });

    await updateCalendarEventOnBackend(id, updates);
  }, []);

  // Delete event
  const deleteEvent = useCallback(async (id: string) => {
    setEvents((prev) => {
      const updated = prev.filter((e) => e.id !== id);
      saveCalendarEvents(updated);
      return updated;
    });

    await deleteCalendarEventOnBackend(id);
  }, []);

  // Toggle event completion (optimistic update with instant UI feedback)
  const toggleEventStatus = useCallback(async (id: string) => {
    let targetCompleted = false;
    setEvents((prev) => {
      const updated = prev.map((e) => {
        if (e.id === id) {
          const nextCompleted = !e.completed;
          targetCompleted = nextCompleted;
          const nextStatus: CalendarEventStatus = nextCompleted ? 'completed' : 'scheduled';
          return {
            ...e,
            completed: nextCompleted,
            status: nextStatus,
            completedAt: nextCompleted ? new Date().toISOString() : undefined,
          };
        }
        return e;
      });
      saveCalendarEvents(updated);
      return updated;
    });

    await toggleTaskComplete(id, targetCompleted);
  }, []);

  // Refresh
  const refreshEvents = useCallback(async () => {
    setIsRefreshing(true);
    const backendData = await fetchCalendarEventsFromBackend();
    if (backendData !== null && Array.isArray(backendData)) {
      setEvents(backendData);
      saveCalendarEvents(backendData);
    }
    setIsRefreshing(false);
  }, []);

  // Helper: Get events for a specific day number
  const getEventsForDay = useCallback(
    (dayNumber: number) => {
      return events.filter((e) => e.dayNumber === dayNumber);
    },
    [events]
  );

  // Helper: Compute activity dot colors for a specific day
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
    isRefreshing,
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
  const [users, setUsers] = useState<TeamMemberResource[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem('crm_registered_team_users');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    fetchRegisteredUsers().then((backendUsers) => {
      if (active && Array.isArray(backendUsers) && backendUsers.length > 0) {
        const colors = [
          'from-sky-500 to-blue-600',
          'from-blue-500 to-indigo-600',
          'from-amber-500 to-orange-600',
          'from-emerald-500 to-teal-600',
          'from-purple-500 to-pink-600',
          'from-rose-500 to-orange-500',
        ];
        const mapped: TeamMemberResource[] = backendUsers.map((u: any, idx: number) => {
          const initials = (u.name || 'User')
            .split(' ')
            .filter(Boolean)
            .map((p: string) => p[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
          const roleLabel = (u.role || 'Team Member')
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (c: string) => c.toUpperCase());
          return {
            id: u.id,
            name: u.name,
            role: u.role || 'team_member',
            roleLabel: roleLabel,
            email: u.email,
            phone: u.phone || '(760) 555-0100',
            avatarUrl: u.avatar_url,
            avatarColor: colors[idx % colors.length],
            initials: initials || 'TM',
            status: u.status || 'active',
          };
        });
        setUsers(mapped);
        try {
          localStorage.setItem('crm_registered_team_users', JSON.stringify(mapped));
        } catch {}
      }
      if (active) setIsLoading(false);
    }).catch(() => {
      if (active) setIsLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  return { users, isLoading };
}

/**
 * Hook to retrieve dynamic calendar operations and workload stats
 */
export function useCalendarStats(): CalendarStats {
  const [stats, setStats] = useState<CalendarStats>({
    activeTeamMembers: 0,
    operationsToday: 0,
    completedToday: 0,
    upcomingDeliveries: 0,
    pendingPermits: 0,
    scheduleConflicts: 0,
  });

  useEffect(() => {
    let active = true;
    fetchCalendarStats().then((data) => {
      if (active && data) setStats(data);
    });
    return () => {
      active = false;
    };
  }, []);

  return stats;
}

/**
 * Hook to retrieve live North County weather & OSHA wind safety metrics
 */
export function useCalendarWeather(): CalendarWeather {
  const [weather, setWeather] = useState<CalendarWeather>({
    tempF: 72,
    windSpeedMph: 8,
    gustMph: 12,
    condition: 'Sunny & Clear',
    safetyStatus: 'safe',
    safetyLabel: 'All Zones Safe for Rooftop Work',
    city: 'Oceanside / North County',
  });

  useEffect(() => {
    let active = true;
    fetchCalendarWeather().then((data) => {
      if (active && data) setWeather(data);
    });
    return () => {
      active = false;
    };
  }, []);

  return weather;
}
