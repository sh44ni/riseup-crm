import React from 'react';
import {
  DollarSign,
  Target,
  Trophy,
  TrendingUp,
} from 'lucide-react';
import { ReportTab } from '@/types/reportTypes';

interface ReportsNavigationProps {
  activeTab: ReportTab;
  onTabChange: (tab: ReportTab) => void;
}

export function ReportsNavigation({
  activeTab,
  onTabChange,
}: ReportsNavigationProps) {
  const TABS: Array<{ id: ReportTab; label: string; icon: any; accentColor: string }> = [
    {
      id: 'revenue',
      label: 'Revenue & Financial Velocity',
      icon: DollarSign,
      accentColor: 'text-[#0284c7]',
    },
    {
      id: 'sales_reps',
      label: 'Estimator & Sales Leaderboard',
      icon: Trophy,
      accentColor: 'text-purple-500',
    },
  ];

  return (
    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 select-none">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer shadow-xs shrink-0 ${
              isActive
                ? 'bg-slate-950 dark:bg-sky-600 text-white shadow-md shadow-slate-900/20 scale-[1.01]'
                : 'bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white border border-slate-200/90 dark:border-white/10'
            }`}
          >
            <Icon size={14} className={isActive ? (tab.id === 'revenue' ? 'text-sky-300' : 'text-purple-300') : 'text-slate-500 dark:text-slate-400'} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
