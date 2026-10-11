import React from 'react';
import {
  User,
  Users,
  Building2,
  Calculator,
  Sliders,
  Bell,
  PenTool,
} from 'lucide-react';
import { SettingsTab } from '@/types/settingsTypes';
import { useCompany } from '@/context/CompanyContext';
import { useAuth } from '@/context/AuthContext';

interface SettingsNavigationProps {
  activeTab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
  userCount?: number;
}

interface TabItem {
  id: SettingsTab;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  badge: string;
  color?: string;
  disabled?: boolean;
}

export function SettingsNavigation({
  activeTab,
  onTabChange,
  userCount = 7,
}: SettingsNavigationProps) {
  const { licenseNumber } = useCompany();
  const { canSignature } = useAuth();

  const TABS: TabItem[] = [
    {
      id: 'profile',
      label: 'My Profile',
      icon: User,
      badge: 'Active',
      color: 'from-sky-500 to-indigo-600',
    },
    {
      id: 'users',
      label: 'Users & Permissions',
      icon: Users,
      badge: `${userCount} Members`,
      color: 'from-sky-500 to-blue-600',
    },
    ...(canSignature('view')
      ? [
          {
            id: 'signature' as const,
            label: 'Company Signature',
            icon: PenTool,
            badge: 'Contract Signature',
            color: 'from-purple-500 to-indigo-600',
          },
        ]
      : []),
    {
      id: 'company',
      label: 'Company & CSLB',
      icon: Building2,
      badge: licenseNumber || 'CSLB #1115874',
      color: 'from-emerald-500 to-teal-600',
    },
    {
      id: 'pricing',
      label: 'Estimator Pricing & Formulas',
      icon: Calculator,
      badge: 'Live Formula',
      color: 'from-amber-500 to-orange-600',
    },
  ];

  return (
    <div className="light-glass-card rounded-2xl p-1.5 border border-slate-200/80 dark:border-white/10 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md shadow-2xs overflow-x-auto no-scrollbar select-none">
      <div className="flex items-center gap-1.5 min-w-max">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          if (tab.disabled) {
            return (
              <button
                key={tab.id}
                type="button"
                disabled
                className="px-4 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 flex items-center gap-2.5 relative text-slate-400 bg-slate-100/50 border border-dashed border-slate-200/80 cursor-not-allowed opacity-65"
                title={`${tab.label} — Feature Not Developed`}
              >
                <Icon size={15} className="text-slate-400 shrink-0" />
                <span className="text-slate-400">{tab.label}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-slate-200/90 text-slate-500 border border-slate-300/80">
                  {tab.badge}
                </span>
              </button>
            );
          }

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-2.5 relative cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-[#1878B8] to-[#2F9FE3] text-white shadow-[0_4px_14px_rgba(47,159,227,0.35)] border border-sky-300/40'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/80 dark:hover:bg-slate-800/80 border border-transparent'
              }`}
            >
              <Icon
                size={15}
                className={isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'}
              />
              <span className="font-bold">{tab.label}</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                  isActive
                    ? 'bg-white/20 text-white border border-white/30'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200/80 dark:border-white/10'
                }`}
              >
                {tab.badge}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
