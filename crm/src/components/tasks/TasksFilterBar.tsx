import React from 'react';
import {
  Users,
  FileText,
  Filter,
} from 'lucide-react';
import { TaskCategory } from '@/types/taskTypes';

interface TasksFilterBarProps {
  activeTab: 'operations' | 'personal_notes';
  onTabChange: (tab: 'operations' | 'personal_notes') => void;
  selectedCategory: 'all' | TaskCategory;
  onSelectCategory: (cat: 'all' | TaskCategory) => void;
  activeTasksCount: number;
  personalTasksCount?: number;
  categoryCounts: Record<string, number>;
}

export function TasksFilterBar({
  activeTab,
  onTabChange,
  selectedCategory,
  onSelectCategory,
  activeTasksCount,
  personalTasksCount = 0,
  categoryCounts,
}: TasksFilterBarProps) {
  const CATEGORIES: Array<{ id: 'all' | TaskCategory; label: string }> = [
    { id: 'all', label: 'All Categories' },
    { id: 'rise_up', label: 'Rise Up' },
    { id: 'estimate_followup', label: 'Estimate Follow-ups' },
    { id: 'permits_city', label: 'City Permits' },
    { id: 'content_creation', label: 'Content Creation' },
    { id: 'marketing', label: 'Marketing' },
  ];

  return (
    <div className="space-y-3 select-none">
      {/* 1. Executive Glass Segmented Mode Switcher */}
      <div className="light-glass-card rounded-2xl p-1.5 border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md shadow-2xs inline-flex items-center gap-1.5 max-w-full overflow-x-auto no-scrollbar">
        {/* Tab 1: My Personal Notes & Reminders (First) */}
        <button
          type="button"
          onClick={() => onTabChange('personal_notes')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-2.5 relative cursor-pointer shrink-0 ${
            activeTab === 'personal_notes'
              ? 'bg-gradient-to-r from-[#1878B8] to-[#2F9FE3] text-white shadow-[0_4px_14px_rgba(47,159,227,0.35)] border border-sky-300/40'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-white/80 dark:hover:bg-slate-800/80 border border-transparent'
          }`}
        >
          <FileText
            size={15}
            className={`shrink-0 transition-colors ${
              activeTab === 'personal_notes' ? 'text-amber-300' : 'text-slate-400 dark:text-slate-500'
            }`}
          />
          <span>My Personal Notes &amp; Reminders</span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-black transition-colors ${
              activeTab === 'personal_notes'
                ? 'bg-white/20 text-white border border-white/30 backdrop-blur-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-white/10'
            }`}
          >
            {personalTasksCount}
          </span>
        </button>

        {/* Tab 2: Team Operations & Client Tasks (Second) */}
        <button
          type="button"
          onClick={() => onTabChange('operations')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-2.5 relative cursor-pointer shrink-0 ${
            activeTab === 'operations'
              ? 'bg-gradient-to-r from-[#1878B8] to-[#2F9FE3] text-white shadow-[0_4px_14px_rgba(47,159,227,0.35)] border border-sky-300/40'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-white/80 dark:hover:bg-slate-800/80 border border-transparent'
          }`}
        >
          <Users
            size={15}
            className={`shrink-0 transition-colors ${
              activeTab === 'operations' ? 'text-sky-200' : 'text-slate-400 dark:text-slate-500'
            }`}
          />
          <span>Team Operations &amp; Client Tasks</span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-black transition-colors ${
              activeTab === 'operations'
                ? 'bg-white/20 text-white border border-white/30 backdrop-blur-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-white/10'
            }`}
          >
            {activeTasksCount}
          </span>
        </button>
      </div>

      {/* 2. Category Filter Pills (when in operations mode) */}
      {activeTab === 'operations' && (
        <div className="flex items-center gap-2 pt-0.5 overflow-x-auto no-scrollbar animate-fadeIn">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 dark:text-slate-500 pl-1 shrink-0 uppercase tracking-wider">
            <Filter size={12} className="text-slate-400 dark:text-slate-500" />
            <span>Category:</span>
          </div>
          <div className="flex items-center gap-1.5 flex-nowrap shrink-0">
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              const count = categoryCounts[cat.id] || 0;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => onSelectCategory(cat.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer shrink-0 ${
                    isSelected
                      ? 'bg-gradient-to-r from-[#1878B8] to-[#2F9FE3] text-white shadow-xs border border-sky-300/40'
                      : 'bg-white/70 dark:bg-slate-900/60 hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200/80 dark:border-white/10 shadow-2xs'
                  }`}
                >
                  <span>{cat.label}</span>
                  {count > 0 && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                        isSelected
                          ? 'bg-white/20 text-white border border-white/25'
                          : 'bg-slate-100 dark:bg-slate-700/80 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-white/5'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
