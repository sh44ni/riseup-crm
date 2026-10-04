import React from 'react';
import { ModuleConfig, ModuleDefinition } from '../types';

interface ModulePermissionRowProps {
  module: ModuleDefinition;
  modConfig: ModuleConfig;
  isProtected?: boolean;
  disabled?: boolean;
  onViewChange: (moduleId: string, newView: 'none' | 'own' | 'assigned' | 'all') => void;
  onManageChange: (moduleId: string, newManage: boolean) => void;
}

export function ModulePermissionRow({
  module,
  modConfig,
  isProtected = false,
  disabled = false,
  onViewChange,
  onManageChange,
}: ModulePermissionRowProps) {
  const Icon = module.icon;
  const currentView = isProtected ? 'all' : (modConfig.view || 'none');
  const currentManage = isProtected ? true : Boolean(modConfig.manage);
  const isRowDisabled = isProtected || disabled;
  const canManageDisabled = isRowDisabled || currentView === 'none';

  // Compute summary badge
  let summaryBadge = {
    label: 'No Access',
    className: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10',
  };
  if (currentView !== 'none') {
    let scopeText = 'Org-Wide';
    if (currentView === 'own') scopeText = 'Own Only';
    else if (currentView === 'assigned') scopeText = 'Assigned';

    if (currentManage) {
      summaryBadge = {
        label: `Full Manage (${scopeText})`,
        className: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 font-black',
      };
    } else {
      summaryBadge = {
        label: `View Only (${scopeText})`,
        className: 'bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/50 font-bold',
      };
    }
  }

  return (
    <div className="p-4 hover:bg-slate-50/50 hover:dark:bg-slate-800/30 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
      {/* Left: Module Info */}
      <div className="flex items-start gap-3 md:w-5/12">
        <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 shadow-2xs ${module.accentColor}`}>
          <Icon size={17} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-900 dark:text-white">{module.label}</span>
            <span className={`px-2 py-0.2 rounded-full text-[10px] uppercase tracking-wider border ${summaryBadge.className}`}>
              {summaryBadge.label}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">
            {module.description}
          </p>
        </div>
      </div>

      {/* Right: The Radios Control Box */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 md:w-7/12 justify-end">
        {/* 1. View Access Radios */}
        <div className="space-y-1">
          <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
            View Access
          </label>
          <div className="inline-flex items-center p-1 bg-slate-100/90 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-white/10 gap-1 shadow-2xs">
            {/* None */}
            <button
              type="button"
              disabled={isRowDisabled}
              onClick={() => onViewChange(module.id, 'none')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                currentView === 'none'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold border border-slate-200 dark:border-white/10'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 hover:dark:text-white'
              } ${isRowDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              None
            </button>

            {/* Scoped Options */}
            {module.scoped ? (
              <>
                <button
                  type="button"
                  disabled={isRowDisabled}
                  onClick={() => onViewChange(module.id, 'own')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    currentView === 'own'
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-2xs font-bold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-amber-600 hover:dark:text-amber-300'
                  } ${isRowDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                  title="Can only view records created by this user (e.g. Door Knocker)"
                >
                  Own Only
                </button>
                <button
                  type="button"
                  disabled={isRowDisabled}
                  onClick={() => onViewChange(module.id, 'assigned')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    currentView === 'assigned'
                      ? 'bg-sky-600 text-white shadow-2xs font-bold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-sky-600 hover:dark:text-sky-300'
                  } ${isRowDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                  title="Can view records assigned to user or created by them (e.g. Sales Rep)"
                >
                  Assigned
                </button>
                <button
                  type="button"
                  disabled={isRowDisabled}
                  onClick={() => onViewChange(module.id, 'all')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    currentView === 'all'
                      ? 'bg-emerald-600 text-white shadow-2xs font-bold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-emerald-600 hover:dark:text-emerald-300'
                  } ${isRowDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                  title="Can view all organization records (e.g. Door Knocker Lead / Manager)"
                >
                  Org-Wide
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={isRowDisabled}
                onClick={() => onViewChange(module.id, 'all')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  currentView === 'all'
                    ? 'bg-emerald-600 text-white shadow-2xs font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 hover:dark:text-white'
                } ${isRowDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                Can View
              </button>
            )}
          </div>
        </div>

        {/* 2. Manage Access Radios */}
        <div className="space-y-1">
          <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Manage Access
          </label>
          <div className={`inline-flex items-center p-1 rounded-xl border gap-1 shadow-2xs ${
            canManageDisabled ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-200/60 dark:border-white/5 opacity-60' : 'bg-slate-100/90 dark:bg-slate-800/80 border-slate-200 dark:border-white/10'
          }`}>
            <button
              type="button"
              disabled={canManageDisabled}
              onClick={() => onManageChange(module.id, false)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                !currentManage
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold border border-slate-200 dark:border-white/10'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 hover:dark:text-white'
              } ${canManageDisabled ? 'cursor-not-allowed' : ''}`}
            >
              Read Only
            </button>

            <button
              type="button"
              disabled={canManageDisabled}
              onClick={() => onManageChange(module.id, true)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                currentManage
                  ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-white shadow-2xs font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 hover:dark:text-white'
              } ${canManageDisabled ? 'cursor-not-allowed' : ''}`}
              title="Allows creating, updating, editing, and deleting records in this module"
            >
              Can Manage
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
