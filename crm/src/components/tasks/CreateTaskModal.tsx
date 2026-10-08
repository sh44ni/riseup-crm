import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Plus,
  Clock,
  Calendar,
  User,
  FileText,
  AlertTriangle,
  Sparkles,
  Search,
  Loader2,
  DollarSign,
  Tag,
} from 'lucide-react';
import { CrmTask, TaskCategory, TaskPriority } from '@/types/taskTypes';
import { api } from '@/lib/api';
import { CrmSelect } from '@/components/common/CrmSelect';
import { CrmDateTimePicker } from '@/components/common/CrmDateTimePicker';

interface UserItem {
  id: number;
  name: string;
  email?: string;
  role?: string;
  avatar_url?: string;
}

interface LeadItem {
  id: number;
  full_name?: string;
  name?: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  service_type?: string | null;
  estimated_value?: number | null;
  pipeline_stage?: string | null;
}

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTask: (task: CrmTask) => void;
}

function formatRole(role?: string): string {
  if (!role) return 'Team Member';
  const map: Record<string, string> = {
    owner: 'Owner & Executive',
    project_manager: 'Project Manager',
    field_foreman: 'Field Foreman',
    senior_estimator: 'Senior Estimator',
    sales_rep: 'Sales Representative',
    office_admin: 'Logistics Coordinator',
    field_inspector: 'Field Inspector',
    admin: 'Administrator',
  };
  return map[role.toLowerCase()] || role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function CreateTaskModal({
  isOpen,
  onClose,
  onAddTask,
}: CreateTaskModalProps) {
  const [title, setTitle] = useState('');
  const [clientName, setClientName] = useState('');
  const [estimateAmount, setEstimateAmount] = useState<string>('');
  const [category, setCategory] = useState<TaskCategory>('rise_up');
  const [priority, setPriority] = useState<TaskPriority>('normal');
  const [dueDateTime, setDueDateTime] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(14, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [assignedTo, setAssignedTo] = useState('Unassigned');
  const [assignedToUserId, setAssignedToUserId] = useState<number | undefined>(undefined);
  const [description, setDescription] = useState('');
  const [selectedLeadId, setSelectedLeadId] = useState<number | undefined>(undefined);

  // Dynamic API state
  const [users, setUsers] = useState<UserItem[]>([]);
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);
  const [leadSearch, setLeadSearch] = useState('');
  const [showAllLeads, setShowAllLeads] = useState(false);

  // Fetch live team members and pipeline leads on modal open
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsLoadingUsers(true);
    setIsLoadingLeads(true);

    api.getUsers()
      .then((res: any) => {
        if (!isMounted) return;
        const list = Array.isArray(res?.users) ? res.users : Array.isArray(res) ? res : [];
        setUsers(list);
      })
      .catch((err) => {
        console.warn('Failed to load team members for task assignment:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingUsers(false);
      });

    api.getLeads()
      .then((res: any) => {
        if (!isMounted) return;
        const list = Array.isArray(res?.leads) ? res.leads : Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        setLeads(list);
      })
      .catch((err) => {
        console.warn('Failed to load pipeline leads for task presets:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingLeads(false);
      });

    return () => {
      isMounted = false;
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

  // Filtered leads for quick selection
  const filteredLeads = useMemo(() => {
    if (!leadSearch.trim()) return leads;
    const q = leadSearch.toLowerCase();
    return leads.filter(
      (l) =>
        (l.full_name && l.full_name.toLowerCase().includes(q)) ||
        (l.name && l.name.toLowerCase().includes(q)) ||
        (l.address && l.address.toLowerCase().includes(q)) ||
        (l.service_type && l.service_type.toLowerCase().includes(q))
    );
  }, [leads, leadSearch]);

  if (!isOpen) return null;

  const handleSelectLead = (lead: LeadItem) => {
    const name = lead.full_name || lead.name || 'Lead';
    setClientName(name);
    setSelectedLeadId(lead.id);

    // Auto-populate contextual task title if empty
    if (!title.trim() || title.startsWith('Follow-up:')) {
      const svc = lead.service_type ? ` (${lead.service_type})` : '';
      setTitle(`Follow-up: ${name}${svc}`);
    }

    if (lead.estimated_value && lead.estimated_value > 0) {
      setEstimateAmount(String(lead.estimated_value));
      setCategory('estimate_followup');
    }
  };

  const handleAssigneeSelect = (val: string) => {
    if (val === 'Unassigned' || !val) {
      setAssignedTo('Unassigned');
      setAssignedToUserId(undefined);
    } else {
      const uid = Number(val);
      const matched = users.find((u) => u.id === uid);
      if (matched) {
        setAssignedTo(matched.name);
        setAssignedToUserId(matched.id);
      } else {
        setAssignedTo(val);
        setAssignedToUserId(undefined);
      }
    }
  };

  const handleAssigneeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    handleAssigneeSelect(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const dueDateObj = dueDateTime ? new Date(dueDateTime) : new Date();
    const dueDateIso = dueDateObj.toISOString();
    const dueDateFormatted =
      dueDateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
      ` at ${dueDateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;

    const initials =
      assignedTo && assignedTo !== 'Unassigned'
        ? assignedTo
            .split(' ')
            .map((p) => p[0])
            .join('')
            .slice(0, 2)
            .toUpperCase()
        : undefined;

    const newTask: CrmTask = {
      id: `tsk-${Date.now()}`,
      title: title.trim(),
      clientName: clientName.trim() || undefined,
      estimateAmount: estimateAmount ? Number(estimateAmount) : undefined,
      category,
      priority,
      status: 'active',
      dueDate: dueDateIso,
      dueDateFormatted,
      isUpcoming: true,
      assignedTo: assignedTo || 'Unassigned',
      assignedToUserId,
      assignedInitials: initials,
      description: description.trim() || undefined,
      entityType: selectedLeadId ? 'lead' : undefined,
      entityId: selectedLeadId,
    };

    onAddTask(newTask);
    onClose();
  };

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-5 bg-slate-950/65 backdrop-blur-md overflow-y-auto animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-[#0B1320] rounded-3xl border border-slate-200 dark:border-white/10 shadow-[0_25px_80px_rgba(0,0,0,0.35)] dark:shadow-[0_25px_80px_rgba(0,0,0,0.85)] w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] my-auto"
      >
        {/* Header */}
        <div className="shrink-0 p-5 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between bg-slate-50/70 dark:bg-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 flex items-center justify-center shadow-xs">
              <Plus size={20} className="stroke-[3]" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                Create New Task or Follow-Up
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Operations checklist, client follow-up, or estimate tracking
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-200/60 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden text-xs">
          {/* Form Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Dynamic Lead Presets & Search */}
          <div className="p-3 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/40 space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                <Sparkles size={12} className="text-amber-600 dark:text-amber-400" />
                <span>Link Live Lead / Customer</span>
              </label>
              {leads.length > 4 && (
                <button
                  type="button"
                  onClick={() => setShowAllLeads(!showAllLeads)}
                  className="text-[10.5px] font-bold text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-200 underline cursor-pointer"
                >
                  {showAllLeads ? 'Show Less' : `View All (${leads.length})`}
                </button>
              )}
            </div>

            {isLoadingLeads ? (
              <div className="flex items-center gap-2 py-2 text-amber-700 dark:text-amber-300 text-xs font-semibold">
                <Loader2 size={13} className="animate-spin" />
                <span>Fetching active pipeline leads...</span>
              </div>
            ) : leads.length > 0 ? (
              <div className="space-y-2">
                {/* Search / Filter input if many leads */}
                {(leads.length > 4 || showAllLeads) && (
                  <div className="relative">
                    <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      value={leadSearch}
                      onChange={(e) => setLeadSearch(e.target.value)}
                      placeholder="Search active leads..."
                      className="w-full pl-8 pr-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-amber-300/80 dark:border-amber-800/60 text-[11px] font-medium text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 placeholder-slate-400 dark:placeholder-slate-500"
                    />
                  </div>
                )}

                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                  {(showAllLeads || leadSearch ? filteredLeads : filteredLeads.slice(0, 4)).map((lead) => {
                    const leadDisplayName = lead.full_name || lead.name || 'Unnamed Lead';
                    const isSelected = selectedLeadId === lead.id;
                    return (
                      <button
                        key={lead.id}
                        type="button"
                        onClick={() => handleSelectLead(lead)}
                        className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all shadow-2xs text-left cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950 border-amber-600 font-black shadow-xs'
                            : 'bg-white dark:bg-white/5 border-amber-300 dark:border-amber-800/60 text-slate-800 dark:text-slate-200 hover:border-amber-500'
                        }`}
                      >
                        <span>{leadDisplayName}</span>
                        {lead.estimated_value && lead.estimated_value > 0 ? (
                          <span className={`text-[9.5px] px-1 rounded ${isSelected ? 'bg-amber-600 text-white' : 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200'}`}>
                            ${lead.estimated_value.toLocaleString()}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-amber-800/80 dark:text-amber-400/80 italic">
                No active leads found. You can enter homeowner name manually below.
              </p>
            )}
          </div>

          {/* Title */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700 dark:text-slate-300 block">Task Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Schedule Drone Inspection or Follow-up on Proposal"
              className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 font-semibold focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Client & Estimate Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300 block">Client / Homeowner</label>
              <div className="relative">
                <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => {
                    setClientName(e.target.value);
                    if (selectedLeadId) setSelectedLeadId(undefined);
                  }}
                  placeholder="Homeowner or Job Name"
                  className="w-full pl-8 pr-2.5 py-2 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 font-semibold focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300 block">Linked Estimate $ (Optional)</label>
              <div className="relative">
                <DollarSign size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="number"
                  value={estimateAmount}
                  onChange={(e) => setEstimateAmount(e.target.value)}
                  placeholder="24850"
                  className="w-full pl-8 pr-2.5 py-2 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 font-semibold focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>
          </div>

          {/* Category & Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300 block">Category</label>
              <CrmSelect
                value={category}
                onChange={(val) => setCategory(val as TaskCategory)}
                options={[
                  { value: 'rise_up', label: 'Rise Up Operations' },
                  { value: 'estimate_followup', label: 'Estimate Follow-up' },
                  { value: 'permits_city', label: 'City Permits' },
                  { value: 'content_creation', label: 'Content Creation' },
                  { value: 'marketing', label: 'Marketing' },
                  { value: 'general', label: 'Operations General' },
                ]}
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300 block">Priority</label>
              <CrmSelect
                value={priority}
                onChange={(val) => setPriority(val as TaskPriority)}
                options={[
                  { value: 'urgent', label: '🔴 Urgent' },
                  { value: 'high', label: '🟡 High' },
                  { value: 'normal', label: '🔵 Normal' },
                  { value: 'low', label: '⚪ Low' },
                ]}
              />
            </div>
          </div>

          {/* Due Date & Dynamic Assignee */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300 block">Due Date &amp; Time</label>
              <CrmDateTimePicker
                value={dueDateTime}
                onChange={setDueDateTime}
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300 block">Assignee</label>
              <CrmSelect
                value={assignedToUserId ? String(assignedToUserId) : assignedTo}
                onChange={handleAssigneeSelect}
                disabled={isLoadingUsers}
                options={[
                  { value: 'Unassigned', label: '⚠️ Unassigned' },
                  ...users.map((u) => ({
                    value: String(u.id),
                    label: `${u.name} (${formatRole(u.role)})`,
                  })),
                ]}
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700 dark:text-slate-300 block">Notes &amp; Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add operational notes, customer phone notes, or permit details..."
              className="w-full p-2 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 font-semibold focus:outline-none focus:border-amber-400 resize-none"
            />
          </div>

          </div>

          {/* Sticky Footer Buttons */}
          <div className="shrink-0 px-5 py-3.5 flex items-center justify-end gap-2 border-t border-slate-200/80 dark:border-white/10 bg-slate-50/60 dark:bg-slate-900/60">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-slate-300 font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 text-slate-950 font-black shadow-md shadow-amber-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
            >
              Create Task
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
