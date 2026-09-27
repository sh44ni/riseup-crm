import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Users,
  FileText,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Search,
  Briefcase,
  UserCheck,
  Flag,
} from 'lucide-react';
import {
  OperationCategory,
  OperationPriority,
  TeamOperationEvent,
  TeamMemberResource,
} from '@/types/calendarTypes';
import { CATEGORY_CONFIG } from '@/data/calendarData';
import { fetchRealJobs, fetchPipelineJobs } from '@/api/calendarApi';
import { z } from 'zod';

const ScheduleSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  scheduledDate: z.string().min(1, 'Date is required'),
  assignedTo: z.string().optional(),
});

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

const PRESET_TITLES = [
  '12-Pt Roof Inspection & Estimate',
  'Order Materials & Shingles',
  'Follow up on City Building Permit',
  'Jobsite Punchlist Walkthrough',
  'Client Scope & Contract Meeting',
  'Warranty Seal & Roof Check-in',
];

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
  const [availableLeads, setAvailableLeads] = useState<any[]>([]);
  const [availableJobs, setAvailableJobs] = useState<any[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch real leads and jobs for linking
  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    Promise.all([fetchPipelineJobs(), fetchRealJobs()]).then(([leads, jobs]) => {
      if (!active) return;
      if (Array.isArray(leads)) setAvailableLeads(leads);
      if (Array.isArray(jobs)) setAvailableJobs(jobs);
    });

    return () => {
      active = false;
    };
  }, [isOpen]);

  // Lock body scroll and listen for Escape key
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

  // Sync initial event for edit mode or reset on open
  useEffect(() => {
    if (initialEvent) {
      setTitle(initialEvent.title || '');
      setCategory(initialEvent.category || 'team_task');
      setPriority(initialEvent.priority || 'normal');
      setDateStr(initialEvent.date || `${year}-${String(month).padStart(2, '0')}-${String(Math.min(selectedDay || 15, 28)).padStart(2, '0')}`);
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
      setDateStr(`${year}-${String(month).padStart(2, '0')}-${String(Math.min(selectedDay || 15, 28)).padStart(2, '0')}`);
      setStartTime('09:00 AM');
      setEndTime('10:00 AM');
      setAssignedUserId(teamMembersList[0]?.id || 1);
      setNotes('');
      setEntityType('none');
      setSelectedEntityId('');
    }
  }, [initialEvent, isOpen, selectedDay, year, month, teamMembersList]);

  // Filter linked entities
  const filteredEntities = useMemo(() => {
    if (entityType === 'lead') {
      return availableLeads.filter((l) =>
        (l.full_name || '').toLowerCase().includes(entitySearch.toLowerCase()) ||
        (l.city || '').toLowerCase().includes(entitySearch.toLowerCase())
      );
    }
    if (entityType === 'job') {
      return availableJobs.filter((j) =>
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
      for (const [key, issues] of Object.entries(result.error.format())) {
        if (key !== '_errors' && Array.isArray((issues as any)._errors)) {
          fieldErrors[key] = (issues as any)._errors[0];
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

    const assignedMember = teamMembersList.find((m) => String(m.id) === String(assignedUserId)) || teamMembersList[0];

    // Linked entity resolution
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
      const match = availableJobs.find((j) => String(j.id) === selectedEntityId || j.job_number === selectedEntityId);
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
        assignedToUserId: Number(assignedMember.id),
        assignedToName: assignedMember.name,
        assignedToRole: assignedMember.roleLabel || assignedMember.role,
        assignedToAvatarColor: assignedMember.avatarColor,
        assignedToInitials: assignedMember.initials,
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
        assignedToUserId: Number(assignedMember.id),
        assignedToName: assignedMember.name,
        assignedToRole: assignedMember.roleLabel || assignedMember.role,
        assignedToAvatarColor: assignedMember.avatarColor,
        assignedToInitials: assignedMember.initials,
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
          {/* Scrollable Form Body */}
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

          {/* Category & Priority Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Category */}
            <div>
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1 block">
                Operation Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as OperationCategory)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-900/30 transition-all bg-white dark:bg-slate-900 cursor-pointer shadow-2xs"
              >
                <option value="team_task">Team Task & Follow-up</option>
                <option value="client_meeting">Client Visit & Meeting</option>
                <option value="project_op">Project Operation / Milestone</option>
                <option value="permit_filing">City Permit Inspection / Filing</option>
                <option value="warranty_audit">Warranty Audit & Roof Check</option>
                <option value="reminder">Reminder & Internal Milestone</option>
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1">
                <Flag size={12} className="text-slate-400" />
                <span>Priority Level</span>
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['normal', 'high', 'urgent'] as OperationPriority[]).map((p) => {
                  const isSelected = priority === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`py-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer text-center ${
                        isSelected
                          ? p === 'urgent'
                            ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-400 dark:border-rose-700 shadow-xs'
                            : p === 'high'
                            ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-400 dark:border-amber-700 shadow-xs'
                            : 'bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 border-sky-400 dark:border-sky-700 shadow-xs'
                          : 'bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-white/10 hover:bg-white dark:hover:bg-white/10'
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Assignee Selection */}
          <div>
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1 mb-1">
              <UserCheck size={13} className="text-sky-600 dark:text-sky-400" />
              <span>Assign Team Member</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {teamMembersList.map((member) => {
                const isSelected = String(assignedUserId) === String(member.id);
                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => setAssignedUserId(member.id)}
                    className={`p-2.5 rounded-2xl border text-left transition-all flex items-center gap-2.5 cursor-pointer ${
                      isSelected
                        ? 'bg-sky-50/90 dark:bg-sky-950/40 border-sky-400 dark:border-sky-700 shadow-xs'
                        : 'bg-white dark:bg-white/5 border-slate-200/80 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg bg-gradient-to-tr ${
                        member.avatarColor || 'from-sky-500 to-blue-600'
                      } text-white flex items-center justify-center text-xs font-black shrink-0 shadow-2xs`}
                    >
                      {member.initials || 'TM'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {member.name}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">
                        {member.roleLabel || member.role}
                      </div>
                    </div>
                    {isSelected && (
                      <CheckCircle2 size={14} className="text-[#0284c7] dark:text-sky-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date and Time Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1">
                <Calendar size={12} className="text-slate-400" />
                <span>Due Date</span>
              </label>
              <input
                type="date"
                required
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-sky-500 shadow-2xs"
              />
              {errors.scheduledDate && <p className="text-rose-500 text-xs mt-1">{errors.scheduledDate}</p>}
            </div>

            <div>
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1">
                <Clock size={12} className="text-slate-400" />
                <span>Start Time</span>
              </label>
              <select
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-sky-500 bg-white dark:bg-slate-900 shadow-2xs cursor-pointer"
              >
                {[
                  '07:00 AM',
                  '07:30 AM',
                  '08:00 AM',
                  '08:30 AM',
                  '09:00 AM',
                  '09:30 AM',
                  '10:00 AM',
                  '10:30 AM',
                  '11:00 AM',
                  '11:30 AM',
                  '12:00 PM',
                  '12:30 PM',
                  '01:00 PM',
                  '01:30 PM',
                  '02:00 PM',
                  '02:30 PM',
                  '03:00 PM',
                  '03:30 PM',
                  '04:00 PM',
                  '05:00 PM',
                ].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1">
                <Clock size={12} className="text-slate-400" />
                <span>End Time</span>
              </label>
              <select
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-sky-500 bg-white dark:bg-slate-900 shadow-2xs cursor-pointer"
              >
                {[
                  '08:00 AM',
                  '09:00 AM',
                  '10:00 AM',
                  '10:30 AM',
                  '11:00 AM',
                  '11:30 AM',
                  '12:00 PM',
                  '01:00 PM',
                  '02:00 PM',
                  '03:00 PM',
                  '03:30 PM',
                  '04:00 PM',
                  '05:00 PM',
                  '06:00 PM',
                ].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Optional Link to CRM Record */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Briefcase size={13} className="text-[#0284c7] dark:text-sky-400" />
                <span>Link to CRM Pipeline (Optional)</span>
              </label>

              <div className="flex items-center gap-1 bg-white dark:bg-white/10 p-0.5 rounded-xl border border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setEntityType('none');
                    setSelectedEntityId('');
                  }}
                  className={`px-2 py-0.5 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                    entityType === 'none' ? 'bg-slate-900 dark:bg-white dark:text-slate-900 text-white' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  None
                </button>
                <button
                  type="button"
                  onClick={() => setEntityType('lead')}
                  className={`px-2 py-0.5 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                    entityType === 'lead' ? 'bg-[#0284c7] text-white' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Lead
                </button>
                <button
                  type="button"
                  onClick={() => setEntityType('job')}
                  className={`px-2 py-0.5 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                    entityType === 'job' ? 'bg-amber-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Job
                </button>
              </div>
            </div>

            {entityType !== 'none' && (
              <div className="space-y-2 pt-1">
                <div className="relative">
                  <input
                    type="text"
                    value={entitySearch}
                    onChange={(e) => setEntitySearch(e.target.value)}
                    placeholder={`Search ${entityType === 'lead' ? 'leads by client name or city' : 'jobs by customer or job #'}`}
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-2xs focus:outline-none focus:border-sky-500"
                  />
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>

                <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                  {filteredEntities.slice(0, 8).map((entity) => {
                    const idStr = String(entity.id);
                    const isSelected = selectedEntityId === idStr;
                    const displayName = entity.full_name || entity.customer_name || 'Client';
                    const displaySub = entity.city ? `${entity.city} • ${entity.service_type || 'Roofing'}` : (entity.job_number || '');

                    return (
                      <button
                        key={idStr}
                        type="button"
                        onClick={() => setSelectedEntityId(idStr)}
                        className={`w-full text-left p-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-sky-50 dark:bg-sky-950/40 text-[#0284c7] dark:text-sky-300 border-sky-300 dark:border-sky-700'
                            : 'bg-white dark:bg-white/5 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10'
                        }`}
                      >
                        <span className="truncate">{displayName}</span>
                        <span className="text-[10.5px] font-normal text-slate-500 dark:text-slate-400 shrink-0 ml-2">
                          {displaySub}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

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
