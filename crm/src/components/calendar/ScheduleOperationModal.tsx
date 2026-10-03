import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles, FileText } from 'lucide-react';
import {
  OperationCategory,
  OperationPriority,
  TeamOperationEvent,
  TeamMemberResource,
} from '@/types/calendarTypes';
import { fetchRealJobs, fetchPipelineJobs } from '@/api/calendarApi';
import {
  ScheduleSchema,
  PRESET_TITLES,
  PipelineLeadItem,
  RealJobItem,
} from './schedule/types';
import { ScheduleCategoryPriority } from './schedule/ScheduleCategoryPriority';
import { ScheduleAssigneeSection } from './schedule/ScheduleAssigneeSection';
import { ScheduleDateTimeFields } from './schedule/ScheduleDateTimeFields';
import { ScheduleEntityLinking } from './schedule/ScheduleEntityLinking';

interface ScheduleOperationModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDay: number;
  currentYear?: number;
  currentMonth?: number;
  teamMembers?: TeamMemberResource[];
  initialEvent?: TeamOperationEvent | null;
  onAddEvent: (event: TeamOperationEvent) => void;
  onUpdateEvent?: (id: string, updates: Partial<TeamOperationEvent>) => void;
}

export function ScheduleOperationModal({
  isOpen,
  onClose,
  selectedDay,
  currentYear,
  currentMonth,
  teamMembers,
  initialEvent,
  onAddEvent,
  onUpdateEvent,
}: ScheduleOperationModalProps) {
  const year = currentYear || 2026;
  const month = currentMonth || 9;
  const teamMembersList = teamMembers && teamMembers.length > 0 ? teamMembers : [];

  const isEditMode = Boolean(initialEvent);

  // Form states
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<OperationCategory>('team_task');
  const [priority, setPriority] = useState<OperationPriority>('normal');
  const [dateStr, setDateStr] = useState<string>(() => {
    return `${year}-${String(month).padStart(2, '0')}-${String(Math.min(selectedDay || 15, 28)).padStart(2, '0')}`;
  });
  const [startTime, setStartTime] = useState('09:00 AM');
  const [endTime, setEndTime] = useState('10:00 AM');
  const [assignedUserId, setAssignedUserId] = useState<number | string>(() => teamMembersList[0]?.id || 1);
  const [notes, setNotes] = useState('');

  // Optional CRM Entity Linking
  const [entityType, setEntityType] = useState<'none' | 'lead' | 'job'>('none');
  const [selectedEntityId, setSelectedEntityId] = useState<string>('');
  const [entitySearch, setEntitySearch] = useState<string>('');
  const [availableLeads, setAvailableLeads] = useState<PipelineLeadItem[]>([]);
  const [availableJobs, setAvailableJobs] = useState<RealJobItem[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    Promise.all([fetchPipelineJobs(), fetchRealJobs()]).then(([leads, jobs]) => {
      if (!active) return;
      if (Array.isArray(leads)) setAvailableLeads(leads as PipelineLeadItem[]);
      if (Array.isArray(jobs)) setAvailableJobs(jobs as RealJobItem[]);
    });

    return () => {
      active = false;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (initialEvent) {
      setTitle(initialEvent.title || '');
      setCategory(initialEvent.category || 'team_task');
      setPriority(initialEvent.priority || 'normal');
      setDateStr(
        initialEvent.date ||
          `${year}-${String(month).padStart(2, '0')}-${String(Math.min(selectedDay || 15, 28)).padStart(2, '0')}`
      );
      setStartTime(initialEvent.startTime || '09:00 AM');
      setEndTime(initialEvent.endTime || '10:00 AM');
      setAssignedUserId(initialEvent.assignedToUserId || teamMembersList[0]?.id || 1);
      setNotes(initialEvent.description || initialEvent.notes || '');
      if (initialEvent.entityType && (initialEvent.entityType === 'lead' || initialEvent.entityType === 'job')) {
        setEntityType(initialEvent.entityType as 'lead' | 'job');
        setSelectedEntityId(String(initialEvent.entityId || ''));
      } else {
        setEntityType('none');
        setSelectedEntityId('');
      }
    } else {
      setTitle('');
      setCategory('team_task');
      setPriority('normal');
      setDateStr(
        `${year}-${String(month).padStart(2, '0')}-${String(Math.min(selectedDay || 15, 28)).padStart(2, '0')}`
      );
      setStartTime('09:00 AM');
      setEndTime('10:00 AM');
      setAssignedUserId(teamMembersList[0]?.id || 1);
      setNotes('');
      setEntityType('none');
      setSelectedEntityId('');
    }
  }, [initialEvent, isOpen, selectedDay, year, month, teamMembersList]);

  const filteredEntities = useMemo(() => {
    if (entityType === 'lead') {
      return availableLeads.filter(
        (l) =>
          (l.full_name || '').toLowerCase().includes(entitySearch.toLowerCase()) ||
          (l.city || '').toLowerCase().includes(entitySearch.toLowerCase())
      );
    }
    if (entityType === 'job') {
      return availableJobs.filter(
        (j) =>
          (j.customer_name || '').toLowerCase().includes(entitySearch.toLowerCase()) ||
          (j.job_number || '').toLowerCase().includes(entitySearch.toLowerCase())
      );
    }
    return [];
  }, [entityType, availableLeads, availableJobs, entitySearch]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const formData = {
      title,
      scheduledDate: dateStr,
      assignedTo: String(assignedUserId),
    };
    const result = ScheduleSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        if (issue.path[0]) {
          fieldErrors[issue.path[0].toString()] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});

    if (!title.trim()) return;

    const parts = dateStr.split('-');
    const eventYear = Number(parts[0]) || year;
    const eventMonth = Number(parts[1]) || month;
    const eventDay = Number(parts[2]) || selectedDay || 15;

    const assignedMember =
      teamMembersList.find((m) => String(m.id) === String(assignedUserId)) || teamMembersList[0];

    let resolvedEntityName: string | undefined;
    let resolvedLocation: string | undefined;
    let resolvedCity: string | undefined;

    if (entityType === 'lead' && selectedEntityId) {
      const match = availableLeads.find((l) => String(l.id) === selectedEntityId);
      if (match) {
        resolvedEntityName = match.full_name;
        resolvedLocation = match.address;
        resolvedCity = match.city;
      }
    } else if (entityType === 'job' && selectedEntityId) {
      const match = availableJobs.find(
        (j) => String(j.id) === selectedEntityId || j.job_number === selectedEntityId
      );
      if (match) {
        resolvedEntityName = match.customer_name;
        resolvedLocation = match.address;
        resolvedCity = match.city;
      }
    }

    if (isEditMode && initialEvent && onUpdateEvent) {
      onUpdateEvent(initialEvent.id, {
        title: title.trim(),
        category,
        priority,
        date: dateStr,
        dayNumber: eventDay,
        month: eventMonth,
        year: eventYear,
        startTime,
        endTime,
        assignedToUserId: Number(assignedMember?.id || 1),
        assignedToName: assignedMember?.name,
        assignedToRole: assignedMember?.roleLabel || assignedMember?.role,
        assignedToAvatarColor: assignedMember?.avatarColor,
        assignedToInitials: assignedMember?.initials,
        description: notes.trim(),
        notes: notes.trim(),
        entityType: entityType !== 'none' ? entityType : undefined,
        entityId: selectedEntityId ? Number(selectedEntityId) : undefined,
        entityName: resolvedEntityName,
        address: resolvedLocation,
        city: resolvedCity,
      });
    } else {
      const newEvent: TeamOperationEvent = {
        id: `task-${Date.now()}`,
        title: title.trim(),
        category,
        priority,
        date: dateStr,
        dayNumber: eventDay,
        month: eventMonth,
        year: eventYear,
        startTime,
        endTime,
        dueAt: `${dateStr}T${startTime}`,
        completed: false,
        status: 'scheduled',
        assignedToUserId: Number(assignedMember?.id || 1),
        assignedToName: assignedMember?.name || 'Staff',
        assignedToRole: assignedMember?.roleLabel || assignedMember?.role,
        assignedToAvatarColor: assignedMember?.avatarColor,
        assignedToInitials: assignedMember?.initials,
        description: notes.trim(),
        notes: notes.trim(),
        entityType: entityType !== 'none' ? entityType : undefined,
        entityId: selectedEntityId ? Number(selectedEntityId) : undefined,
        entityName: resolvedEntityName,
        address: resolvedLocation,
        city: resolvedCity || 'Carlsbad',
        sourceType: 'task',
      };
      onAddEvent(newEvent);
    }

    onClose();
  };

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-5 bg-slate-950/65 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl bg-white dark:bg-[#0B1320] rounded-3xl shadow-[0_25px_80px_rgba(0,0,0,0.35)] dark:shadow-[0_25px_80px_rgba(0,0,0,0.85)] border border-white/80 dark:border-white/10 overflow-hidden flex flex-col max-h-[90vh] my-auto"
      >
        {/* Header */}
        <div className="shrink-0 px-6 py-4.5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between border-b border-slate-700/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-sky-500/20 border border-sky-400/30 text-[10px] font-black uppercase text-sky-300 tracking-wide">
                Team Operations Hub
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black tracking-tight mt-1 text-white">
              {isEditMode ? 'Edit Operation / Task' : 'Schedule Team Operation / Task'}
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Assign staff, set due dates and times, and link to CRM pipeline records.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-4.5">
            {/* Quick Preset Buttons */}
            <div>
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1.5">
                <Sparkles size={11} className="text-sky-500" />
                <span>Quick Presets</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_TITLES.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setTitle(preset)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      title === preset
                        ? 'bg-sky-50 dark:bg-sky-950/40 text-[#0284c7] dark:text-sky-300 border-sky-300 dark:border-sky-700 font-bold'
                        : 'bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-white/10 hover:bg-white dark:hover:bg-white/10 hover:border-slate-300 dark:hover:border-white/20'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Operation Title */}
            <div>
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1 mb-1">
                <span>Operation / Task Title</span>
                <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Initial Roof Inspection & Consultation"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-900/30 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-2xs"
              />
              {errors.title && <p className="text-rose-500 text-xs mt-1">{errors.title}</p>}
            </div>

            <ScheduleCategoryPriority
              category={category}
              priority={priority}
              onCategoryChange={setCategory}
              onPriorityChange={setPriority}
            />

            <ScheduleAssigneeSection
              teamMembers={teamMembersList}
              assignedUserId={assignedUserId}
              onAssigneeChange={setAssignedUserId}
            />

            <ScheduleDateTimeFields
              dateStr={dateStr}
              startTime={startTime}
              endTime={endTime}
              errorScheduledDate={errors.scheduledDate}
              onDateChange={setDateStr}
              onStartTimeChange={setStartTime}
              onEndTimeChange={setEndTime}
            />

            <ScheduleEntityLinking
              entityType={entityType}
              selectedEntityId={selectedEntityId}
              entitySearch={entitySearch}
              filteredEntities={filteredEntities}
              onEntityTypeChange={(t) => {
                setEntityType(t);
                setSelectedEntityId('');
              }}
              onEntitySearchChange={setEntitySearch}
              onSelectEntityId={setSelectedEntityId}
            />

            {/* Notes & Scope */}
            <div>
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1 mb-1">
                <FileText size={12} className="text-slate-400" />
                <span>Notes / Checklist / Instructions</span>
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add key notes, scope details, or checklist items for the team..."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-900/30 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-2xs resize-none"
              />
            </div>
          </div>

          {/* Sticky Action Footer */}
          <div className="shrink-0 px-6 py-3.5 flex items-center justify-end gap-2.5 border-t border-slate-200/80 dark:border-white/10 bg-slate-50/60 dark:bg-slate-900/60">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#1878B8] via-sky-500 to-[#55C4F5] hover:opacity-95 text-white font-bold text-xs shadow-xs hover:shadow-md transition-all cursor-pointer"
            >
              {isEditMode ? 'Update Operation' : 'Schedule Operation'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

export default ScheduleOperationModal;
