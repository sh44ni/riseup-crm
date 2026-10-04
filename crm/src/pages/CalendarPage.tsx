import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, RotateCcw, ShieldCheck, Users, CheckCircle2, Briefcase } from 'lucide-react';
import { CrmPageHero } from '@/components/common/CrmPageHero';
import { CalendarFilterBar } from '@/components/calendar/CalendarFilterBar';
import { CalendarMonthGrid } from '@/components/calendar/CalendarMonthGrid';
import { CalendarSwimlanesView } from '@/components/calendar/CalendarSwimlanesView';
import { CalendarDayInspector } from '@/components/calendar/CalendarDayInspector';
import { ScheduleOperationModal } from '@/components/calendar/ScheduleOperationModal';
import { TeamOperationEvent, OperationCategory } from '@/types/calendarTypes';
import { useCalendarEvents, useRegisteredUsers, useCalendarStats, useCalendarWeather } from '@/lib/calendarStore';

export function CalendarPage() {
  const [searchParams] = useSearchParams();
  const initialDayParam = Number(searchParams.get('day'));
  const [selectedDay, setSelectedDay] = useState<number>(initialDayParam || 15);

  const [viewMode, setViewMode] = useState<'month' | 'swimlanes'>('month');
  const [selectedCategory, setSelectedCategory] = useState<'all' | OperationCategory>('all');
  const [selectedAssignee, setSelectedAssignee] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);

  // Dynamic Date navigation supporting any month and year
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1; // 1-12
  const currentMonthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const handlePrevMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };
  const handleNextMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };
  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDay(today.getDate());
  };

  const { users: teamMembers, isLoading: isTeamMembersLoading } = useRegisteredUsers();
  const stats = useCalendarStats();
  const weather = useCalendarWeather();

  const [editingEvent, setEditingEvent] = useState<TeamOperationEvent | null>(null);

  const {
    events,
    isRefreshing,
    addEvent,
    updateEvent,
    deleteEvent,
    toggleEventStatus,
    refreshEvents,
  } = useCalendarEvents();

  // If URL day parameter changes, update selectedDay
  useEffect(() => {
    const dayFromUrl = Number(searchParams.get('day'));
    if (dayFromUrl && dayFromUrl >= 1 && dayFromUrl <= 31) {
      setSelectedDay(dayFromUrl);
    }
  }, [searchParams]);

  // Global keyboard shortcut: ⌘ / Win + K to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const input = document.querySelector('input[placeholder*="Search operations"]') as HTMLInputElement;
        if (input) input.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Category event counts
  const eventCounts = useMemo(() => {
    const counts: Record<string, number> = { all: events.length };
    events.forEach((evt) => {
      counts[evt.category] = (counts[evt.category] || 0) + 1;
    });
    return counts;
  }, [events]);

  // Filtered events
  const filteredEvents = useMemo(() => {
    let list = events;

    // Filter by category
    if (selectedCategory !== 'all') {
      list = list.filter((e) => e.category === selectedCategory);
    }

    // Filter by status
    if (selectedStatus !== 'all') {
      if (selectedStatus === 'completed') {
        list = list.filter((e) => e.completed || e.status === 'completed');
      } else if (selectedStatus === 'active') {
        list = list.filter((e) => !e.completed && e.status !== 'completed');
      }
    }

    // Filter by registered assignee / team member
    if (selectedAssignee !== 'all') {
      list = list.filter(
        (e) =>
          String(e.assignedToUserId) === selectedAssignee ||
          (e.assignedToName && e.assignedToName.toLowerCase() === selectedAssignee.toLowerCase())
      );
    }

    // Filter by search query
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          (e.description && e.description.toLowerCase().includes(q)) ||
          (e.customerName && e.customerName.toLowerCase().includes(q)) ||
          (e.entityName && e.entityName.toLowerCase().includes(q)) ||
          (e.address && e.address.toLowerCase().includes(q)) ||
          (e.city && e.city.toLowerCase().includes(q)) ||
          (e.assignedToName && e.assignedToName.toLowerCase().includes(q)) ||
          (e.assignedToRole && e.assignedToRole.toLowerCase().includes(q))
      );
    }

    return list;
  }, [events, selectedCategory, selectedStatus, selectedAssignee, search]);

  const handleRefresh = async () => {
    await refreshEvents();
  };

  const handleOpenCreate = () => {
    setEditingEvent(null);
    setShowCreateModal(true);
  };

  const handleQuickSchedule = (memberId: number | string, day: number) => {
    setSelectedDay(day);
    setEditingEvent({
      id: '',
      title: '',
      category: 'team_task',
      priority: 'normal',
      date: `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      dayNumber: day,
      month: currentMonth,
      year: currentYear,
      startTime: '09:00 AM',
      endTime: '10:00 AM',
      completed: false,
      status: 'scheduled',
      assignedToUserId: Number(memberId),
      assignedToName: '',
    });
    setShowCreateModal(true);
  };

  const handleEditEvent = (evt: TeamOperationEvent) => {
    setEditingEvent(evt);
    setShowCreateModal(true);
  };

  const handleUpdateEvent = async (id: string, updates: Partial<TeamOperationEvent>) => {
    await updateEvent(id, updates);
  };

  const handleDeleteEvent = async (id: string) => {
    await deleteEvent(id);
  };

  const handleAddEvent = async (newEvent: TeamOperationEvent) => {
    await addEvent(newEvent);
    setSelectedDay(newEvent.dayNumber);
  };

  const handleToggleStatus = async (eventId: string) => {
    await toggleEventStatus(eventId);
  };

  return (
    <div className="h-full flex flex-col min-h-0 w-full select-none gap-2">
      {/* 1. Unified Hero Banner with Search & Actions */}
      <CrmPageHero
        compact={true}
        pageId="calendar"
        defaultEyebrow="Team Operations & Task Hub • Rise Up CRM"
        defaultTitle="TEAM OPERATIONS & TASK CALENDAR"
        defaultSubtitle="Coordinate team tasks, site visits, milestones, and daily company operations across registered staff."
        showSearch={true}
        searchPlaceholder="Search operations, client visits, team tasks, permits..."
        searchValue={search}
        onSearchChange={setSearch}
        onSearchClear={() => setSearch('')}
        topRightActions={
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* New Task Button */}
            <button
              type="button"
              onClick={handleOpenCreate}
              className="h-8 sm:h-9 flex items-center gap-1.5 px-3 sm:px-4 rounded-xl bg-gradient-to-r from-[#1878B8] via-sky-500 to-[#55C4F5] text-white font-bold text-xs shadow-xs hover:shadow-md hover:scale-[1.02] transition-all cursor-pointer"
            >
              <Plus size={14} className="stroke-[3]" />
              <span>Schedule Operation</span>
            </button>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={handleRefresh}
              title="Refresh schedule"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl liquid-glass-btn flex items-center justify-center text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:border-sky-400 transition-all cursor-pointer shadow-2xs"
            >
              <RotateCcw
                size={14}
                className={`transition-transform duration-500 ${isRefreshing ? 'animate-spin text-sky-600' : ''}`}
              />
            </button>
          </div>
        }
        bottomRightBadges={
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
            {/* 1. Active Team Members (Live from DB) */}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-500/20 dark:border-emerald-800/40 text-[10px] font-bold text-emerald-800 dark:text-emerald-300 shadow-2xs shrink-0 backdrop-blur-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>{stats.activeTeamMembers || teamMembers.length} Staff Active</span>
            </span>

            {/* 2. Live Weather & OSHA Safety */}
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-sky-500/10 dark:bg-sky-950/40 border border-sky-500/20 dark:border-sky-800/40 text-[10px] font-bold text-sky-800 dark:text-sky-300 shadow-2xs shrink-0 backdrop-blur-xs"
              title={weather.safetyLabel}
            >
              <span className="text-amber-500">☀️</span>
              <span>
                {weather.tempF}°F {weather.city.split('/')[0].trim()} • {weather.windSpeedMph}mph (
                {weather.safetyStatus === 'safe' ? 'Safe' : 'Caution'})
              </span>
            </span>

            {/* 3. Operations Today */}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-indigo-500/10 dark:bg-indigo-950/40 border border-indigo-500/20 dark:border-indigo-800/40 text-[10px] font-bold text-indigo-800 dark:text-indigo-300 shadow-2xs shrink-0 backdrop-blur-xs">
              <ShieldCheck size={11} className="text-indigo-600 dark:text-indigo-400" />
              <span>
                {stats.operationsToday > 0
                  ? `${stats.operationsToday} Ops Today (${stats.completedToday} Done)`
                  : `${events.length} Total Scheduled`}
              </span>
            </span>
          </div>
        }
      />

      {/* 2. Filter Bar (Category Pills + View Switcher + Assignee Selector + Status Toggle) */}
      <CalendarFilterBar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        selectedAssignee={selectedAssignee}
        onSelectAssignee={setSelectedAssignee}
        selectedStatus={selectedStatus}
        onSelectStatus={setSelectedStatus}
        eventCounts={eventCounts}
        teamMembers={teamMembers}
      />

      {/* 3. Main Calendar View: Month Grid OR Team Workload + Day Operations Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 items-stretch flex-1 min-h-0">
        {/* Left Column (Month or Workload Swimlanes) */}
        <div className="lg:col-span-8 flex flex-col min-h-0 h-full">
          {viewMode === 'month' ? (
            <CalendarMonthGrid
              currentMonthName={currentMonthName}
              currentYear={currentYear}
              currentMonth={currentMonth}
              selectedDay={selectedDay}
              onSelectDay={setSelectedDay}
              events={filteredEvents}
              onPrevMonth={handlePrevMonth}
              onNextMonth={handleNextMonth}
              onToday={handleToday}
            />
          ) : (
            <CalendarSwimlanesView
              events={filteredEvents}
              selectedDay={selectedDay}
              currentYear={currentYear}
              currentMonth={currentMonth}
              teamMembers={teamMembers}
              onSelectDay={setSelectedDay}
              onSelectEvent={(evt) => setSelectedDay(evt.dayNumber)}
              onQuickSchedule={handleQuickSchedule}
            />
          )}
        </div>

        {/* Right Column (Day Operations & Tasks Inspector) */}
        <div className="lg:col-span-4 flex flex-col min-h-0 h-full">
          <CalendarDayInspector
            selectedDay={selectedDay}
            currentYear={currentYear}
            currentMonth={currentMonth}
            events={events}
            onOpenNewTask={handleOpenCreate}
            onToggleStatus={handleToggleStatus}
            onEditEvent={handleEditEvent}
            onDeleteEvent={handleDeleteEvent}
          />
        </div>
      </div>

      {/* Modal: Schedule New Operation or Edit Existing */}
      <ScheduleOperationModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingEvent(null);
        }}
        selectedDay={selectedDay}
        currentYear={currentYear}
        currentMonth={currentMonth}
        teamMembers={teamMembers}
        initialEvent={editingEvent}
        onAddEvent={handleAddEvent}
        onUpdateEvent={handleUpdateEvent}
      />
    </div>
  );
}

export default CalendarPage;
