import React from 'react';
import {
  Bell,
  Sun,
  Wind,
  CloudRain,
  MessageSquare,
  Truck,
  CheckCircle2,
  AlertTriangle,
  Smartphone,
  Send,
} from 'lucide-react';
import { NotificationSettings } from '@/types/settingsTypes';

interface NotificationSettingsTabProps {
  notifications: NotificationSettings;
  onChange: (updated: NotificationSettings) => void;
}

export function NotificationSettingsTab({
  notifications,
  onChange,
}: NotificationSettingsTabProps) {
  const updateMilestone = (
    key: keyof NotificationSettings['clientMilestones'],
    val: boolean
  ) => {
    onChange({
      ...notifications,
      clientMilestones: {
        ...notifications.clientMilestones,
        [key]: val,
      },
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* ================================================================
          SECTION 1: MORNING CREW DISPATCH SMS ROLLOUT
          ================================================================ */}
      <div className="light-glass-card rounded-3xl p-6 border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/15 to-orange-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center border border-amber-300/40 dark:border-amber-500/30">
              <Truck size={20} />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>Field Crew Morning Dispatch SMS Rollout</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-black uppercase tracking-wider border border-emerald-300 dark:border-emerald-700/50">
                  {notifications.crewMorningSmsActive ? 'Active' : 'Disabled'}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Automates jobsite directions, gate codes, and material confirmation texts to foremen every morning.
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={notifications.crewMorningSmsActive}
              onChange={(e) =>
                onChange({
                  ...notifications,
                  crewMorningSmsActive: e.target.checked,
                })
              }
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1878B8]"></div>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">
              Daily Dispatch Trigger Time
            </label>
            <input
              type="text"
              value={notifications.crewRolloutTime}
              onChange={(e) =>
                onChange({ ...notifications, crewRolloutTime: e.target.value })
              }
              className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 focus:border-[#1878B8] font-bold text-slate-900 dark:text-white outline-none shadow-2xs"
            />
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              Dispatched 30 minutes before 7:00 AM jobsite arrival.
            </p>
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">
              Targeted Field Foremen &amp; Inspectors
            </label>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-white/10 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900 dark:text-slate-200">Marco Silva</div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500">Field Foreman (Production)</div>
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-white/10 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900 dark:text-slate-200">Sarah Jenkins</div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500">Field Inspector (Safety &amp; QA)</div>
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================
          SECTION 2: WEATHER HAZARDS & SAFETY WIND HOLDS
          ================================================================ */}
      <div className="light-glass-card rounded-3xl p-6 border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md shadow-xs space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-white/5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500/15 to-blue-500/20 text-[#1878B8] dark:text-sky-400 flex items-center justify-center border border-sky-300/40 dark:border-sky-500/30">
            <Wind size={20} />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
              Weather Hazard & OSHA Safety Wind Holds
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Automatic weather telemetry checks via NOAA API to protect crew safety and prevent roof leaks.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          {/* Wind Hold Alert */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-white/10 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wind size={16} className="text-sky-600 dark:text-sky-400" />
                <span className="font-bold text-slate-800 dark:text-slate-200">Sustained Wind Hold Limit</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifications.weatherWindAlertActive}
                  onChange={(e) =>
                    onChange({
                      ...notifications,
                      weatherWindAlertActive: e.target.checked,
                    })
                  }
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1878B8]"></div>
              </label>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="number"
                value={notifications.windThresholdMph}
                onChange={(e) =>
                  onChange({
                    ...notifications,
                    windThresholdMph: parseInt(e.target.value) || 20,
                  })
                }
                className="w-24 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 font-bold text-slate-900 dark:text-white outline-none text-right"
              />
              <span className="font-bold text-slate-600 dark:text-slate-300">MPH Sustained Winds</span>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              OSHA safety rule: Triggers emergency stand-down SMS to crew foremen.
            </p>
          </div>

          {/* Rain / Precipitation Hold */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-white/10 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CloudRain size={16} className="text-blue-600 dark:text-blue-400" />
                <span className="font-bold text-slate-800 dark:text-slate-200">Rain & Moisture Protection</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifications.weatherRainAlertActive}
                  onChange={(e) =>
                    onChange({
                      ...notifications,
                      weatherRainAlertActive: e.target.checked,
                    })
                  }
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1878B8]"></div>
              </label>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="number"
                value={notifications.rainThresholdPct}
                onChange={(e) =>
                  onChange({
                    ...notifications,
                    rainThresholdPct: parseInt(e.target.value) || 35,
                  })
                }
                className="w-24 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 font-bold text-slate-900 dark:text-white outline-none text-right"
              />
              <span className="font-bold text-slate-600 dark:text-slate-300">% Rain Probability</span>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              Triggers mandatory dry-in inspection & tarp check before opening roofs.
            </p>
          </div>
        </div>
      </div>

      {/* ================================================================
          SECTION 3: CLIENT PROJECT MILESTONES
          ================================================================ */}
      <div className="light-glass-card rounded-3xl p-6 border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Automated Customer Project Milestone Texts
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Real-time SMS updates sent to homeowners as their roofing job progresses.
            </p>
          </div>
          <Bell size={18} className="text-pink-600 dark:text-pink-400" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {[
            {
              key: 'inspectionScheduled' as const,
              title: 'Inspection Scheduled Confirmation',
              desc: 'Texts homeowner with estimator photo, vehicle model, and arrival time window',
            },
            {
              key: 'tearOffStarted' as const,
              title: 'Job Commencement & Tear-off Underway',
              desc: 'Notifies homeowner that dumpster has arrived and roof tear-off has begun',
            },
            {
              key: 'dryInCompleted' as const,
              title: 'Dry-in & Waterproofing Check Complete',
              desc: 'Confirms synthetic underlayment and ice & water shield are 100% watertight',
            },
            {
              key: 'finalWalkthroughReady' as const,
              title: 'Final Walkthrough & Warranty Certificate',
              desc: 'Sends link to 50-year manufacturer warranty certificate and 5-star review request',
            },
          ].map((item) => (
            <div
              key={item.key}
              className="p-3.5 rounded-xl bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-white/10 shadow-2xs flex items-start justify-between gap-3"
            >
              <div>
                <div className="font-bold text-slate-800 dark:text-slate-200">{item.title}</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{item.desc}</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                <input
                  type="checkbox"
                  checked={notifications.clientMilestones[item.key]}
                  onChange={(e) => updateMilestone(item.key, e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-8 h-4 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#1878B8]"></div>
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
