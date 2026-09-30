import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  Trophy,
  Crown,
  User,
  Settings,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useCompany } from '@/context/CompanyContext';
import { CoastalWeatherWidget } from '@/components/common/CoastalWeatherWidget';
import { QuoteBannerWidget } from '@/components/common/QuoteBannerWidget';
import { SidebarScheduleWidget } from '@/components/common/SidebarScheduleWidget';
import { SidebarTasksWidget } from '@/components/common/SidebarTasksWidget';
import { api, API_ORIGIN } from '@/lib/api';

const ProfileSettingsModal = React.lazy(() =>
  import('@/components/profile/ProfileSettingsModal').then((m) => ({ default: m.ProfileSettingsModal }))
);

interface Performer {
  rank: number;
  userId?: number;
  name: string;
  role?: string;
  initials: string;
  jobs: number;
  revenue: string;
  revenueRaw?: number;
  avatarUrl?: string | null;
  avatarBg?: string;
}

export function CrmRightPanel({ onQuickAdd }: { onQuickAdd?: () => void }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { licenseNumber, licenseType } = useCompany();
  const [showAllPerformers, setShowAllPerformers] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [performers, setPerformers] = useState<Performer[]>([]);
  const [totalCompletedJobs, setTotalCompletedJobs] = useState<number>(0);
  const [isLoadingPerformers, setIsLoadingPerformers] = useState<boolean>(true);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const loadPerformers = async () => {
    try {
      const res = await api.getTopPerformers();
      if (res && res.ok) {
        setPerformers(res.performers || []);
        setTotalCompletedJobs(res.totalCompletedJobs || 0);
      }
    } catch (err) {
      console.error('Failed to load top performers:', err);
    } finally {
      setIsLoadingPerformers(false);
    }
  };

  useEffect(() => {
    loadPerformers();
    const handleUpdate = () => {
      loadPerformers();
    };
    window.addEventListener('crm:top-performers-updated', handleUpdate);
    window.addEventListener('crm:pipeline-updated', handleUpdate);
    return () => {
      window.removeEventListener('crm:top-performers-updated', handleUpdate);
      window.removeEventListener('crm:pipeline-updated', handleUpdate);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setIsUserMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const getRoleLabel = (role?: string) => {
    switch (role?.toLowerCase()) {
      case 'owner':
      case 'admin':
        return 'Owner / Qualifier';
      case 'sales_rep':
      case 'sales':
        return 'Sales Representative';
      case 'estimator':
        return 'Lead Estimator';
      case 'project_manager':
        return 'Project Manager';
      case 'door_knocker':
        return 'Field Canvasser';
      case 'subcontractor':
        return 'Crew Lead';
      default:
        return 'Team Member';
    }
  };

  const displayName = user?.name || 'Developer Admin';
  const displayEmail = user?.email || 'developer@riseuprac.com';
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('') || 'DA';

  const avatarSrc = user?.avatar_url
    ? user.avatar_url.startsWith('http')
      ? user.avatar_url
      : `${API_ORIGIN}${user.avatar_url}`
    : null;

  const currentRoleLabel = getRoleLabel(user?.role);
  const activePerformers = performers.filter((p) => p.jobs > 0);
  const hasCompletedJobs = totalCompletedJobs > 0 && activePerformers.length > 0;

  const firstPlace = activePerformers[0] || null;
  const secondPlace = activePerformers[1] || null;
  const thirdPlace = activePerformers[2] || null;

  return (
    <aside className="w-76 h-screen flex flex-col light-glass-canvas border-l border-slate-200/80 dark:border-white/10 shrink-0 select-none overflow-y-auto no-scrollbar px-3.5 py-3 space-y-2.5 sticky top-0 z-20 text-slate-800 dark:text-slate-100 relative">
      {/* Background Architectural Dot Texture & Coastal Sunlight Diffusion */}
      <div
        className="absolute inset-0 pointer-events-none opacity-30 [background-image:radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:24px_24px]"
        aria-hidden="true"
      />
      <div
        className="absolute top-0 right-0 w-64 h-64 bg-amber-200/20 dark:bg-sky-500/10 rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      {/* 1. User Profile Pill & Floating Dropdown */}
      <div ref={userMenuRef} className="relative z-30">
        <button
          type="button"
          onClick={() => setIsUserMenuOpen((prev) => !prev)}
          aria-expanded={isUserMenuOpen}
          aria-haspopup="true"
          className={`w-full flex items-center justify-between p-2 rounded-xl light-glass-card glossy-sheen border transition-all cursor-pointer text-left ${
            isUserMenuOpen
              ? 'border-[#1878B8]/60 shadow-[0_0_15px_rgba(24,120,184,0.18)] ring-2 ring-[#1878B8]/15 bg-white/90 dark:bg-slate-900/90'
              : 'border-white/85 dark:border-white/10 shadow-2xs hover:shadow-xs hover:border-[#1878B8]/40'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative shrink-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#1878B8] to-[#55C4F5] flex items-center justify-center font-black text-white text-xs shadow-xs overflow-hidden border border-white dark:border-white/20">
                {avatarSrc ? (
                  <img src={avatarSrc} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 bg-emerald-500" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-[#1F1F1F] dark:text-slate-100 group-hover:text-[#1878B8] transition-colors leading-tight truncate">
                {displayName}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate flex items-center gap-1">
                <span>{currentRoleLabel}</span>
              </div>
            </div>
          </div>
          <ChevronDown
            size={13}
            className={`text-slate-400 transition-transform duration-200 shrink-0 ml-1.5 ${
              isUserMenuOpen ? 'rotate-180 text-[#1878B8]' : ''
            }`}
          />
        </button>

        {/* Floating Liquid Glass Dropdown Menu */}
        {isUserMenuOpen && (
          <div className="absolute top-full left-0 right-0 mt-1.5 z-50 rounded-2xl bg-white/95 dark:bg-[#0B1320]/95 backdrop-blur-2xl border border-white/90 dark:border-white/12 shadow-[0_20px_50px_rgba(15,23,42,0.18)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.85)] p-2.5 space-y-2 animate-in fade-in zoom-in-95 duration-150 text-slate-800 dark:text-slate-100">
            {/* Header: Clean User Identity Card */}
            <div className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-900/80 border border-slate-200/60 dark:border-white/10 flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#1878B8] to-[#55C4F5] flex items-center justify-center font-black text-white text-xs shadow-xs shrink-0 overflow-hidden border border-white dark:border-white/20">
                {avatarSrc ? (
                  <img src={avatarSrc} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-black text-slate-900 dark:text-white truncate leading-tight">{displayName}</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate leading-tight mt-0.5">{displayEmail}</div>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40 text-[9px] font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Active
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-400 font-medium truncate">
                    {currentRoleLabel}
                  </span>
                </div>
              </div>
            </div>

            {/* Menu Options: Profile Settings, Settings, Logout */}
            <div className="space-y-0.5 pt-0.5">
              {/* Profile Settings */}
              <button
                type="button"
                onClick={() => {
                  setIsUserMenuOpen(false);
                  setIsProfileModalOpen(true);
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/90 dark:hover:bg-slate-800/80 transition-all text-left cursor-pointer group"
              >
                <div className="w-6 h-6 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-[#1878B8] dark:text-sky-400 border border-sky-100/80 dark:border-sky-800/40 flex items-center justify-center group-hover:bg-[#1878B8] group-hover:text-white transition-colors shrink-0">
                  <User size={13} />
                </div>
                <span className="flex-1 truncate">Profile Settings</span>
              </button>

              {/* Settings */}
              <button
                type="button"
                onClick={() => {
                  setIsUserMenuOpen(false);
                  navigate('/settings');
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/90 dark:hover:bg-slate-800/80 transition-all text-left cursor-pointer group"
              >
                <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-white/10 flex items-center justify-center group-hover:bg-slate-800 dark:group-hover:bg-slate-700 group-hover:text-white transition-colors shrink-0">
                  <Settings size={13} />
                </div>
                <span className="flex-1 truncate">Settings</span>
              </button>

              {/* Logout */}
              <button
                type="button"
                onClick={async () => {
                  setIsUserMenuOpen(false);
                  await logout();
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-transparent hover:border-rose-200/60 dark:hover:border-rose-900/30 transition-all text-left group cursor-pointer"
              >
                <div className="w-6 h-6 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-500 border border-rose-100 dark:border-rose-900/40 flex items-center justify-center group-hover:bg-rose-600 group-hover:text-white transition-colors shrink-0">
                  <LogOut size={13} />
                </div>
                <span className="flex-1 truncate">Log Out</span>
              </button>
            </div>

            {/* System Info & Version Footer */}
            <div className="pt-2 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between px-1.5 text-[10px]">
              <div className="flex items-center gap-1.5 font-semibold text-slate-600 dark:text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Rise Up CRM v3.1.2</span>
              </div>
              <span className="text-[9px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-200/60 dark:border-emerald-800/50">
                Stable
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Render Profile Settings Studio Modal */}
      {isProfileModalOpen && (
        <React.Suspense fallback={null}>
          <ProfileSettingsModal
            isOpen={isProfileModalOpen}
            onClose={() => setIsProfileModalOpen(false)}
          />
        </React.Suspense>
      )}

      {/* 2. Coastal Weather Widget (Customizable, Glowing Standalone Icons, High Visibility) */}
      <CoastalWeatherWidget />

      {/* 3. Today's Schedule (Synchronized with Calendar Store & Backend API) */}
      <SidebarScheduleWidget />

      {/* 4. Quote & Media Banner (Clean Image-Only, Single or Slideshow Carousel) */}
      <QuoteBannerWidget />

      {/* 5. User Personal Sticky Notes / To-Dos Widget (User-Specific, Priority & Work Category Dropdowns) */}
      <SidebarTasksWidget />

      {/* 6. Top Performers (Podium View & Full Leaderboard) */}
      <div className="relative z-10 rounded-2xl light-glass-panel glossy-sheen border border-white/85 dark:border-white/10 shadow-xs p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Trophy size={13} className="text-amber-500" />
            <h3 className="text-xs font-bold text-[#1F1F1F] dark:text-white">Top Performers</h3>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[9.5px] text-slate-500 dark:text-slate-400 font-medium">This Month</span>
            <Crown size={11} className="text-amber-500" />
          </div>
        </div>

        {isLoadingPerformers ? (
          <div className="py-6 flex flex-col items-center justify-center space-y-2">
            <div className="w-5 h-5 rounded-full border-2 border-[#1878B8] border-t-transparent animate-spin" />
            <span className="text-[10px] text-slate-400 font-medium">Loading rankings...</span>
          </div>
        ) : !hasCompletedJobs ? (
          /* Clean Authentic Zero State */
          <div className="py-5 px-2 flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/40 flex items-center justify-center text-amber-500 shadow-2xs mb-2">
              <Trophy size={18} className="stroke-[2.2]" />
            </div>
            <h4 className="text-[11px] font-bold text-slate-800 dark:text-slate-200 leading-tight">No completed jobs yet</h4>
            <p className="text-[9.5px] text-slate-400 dark:text-slate-400 font-medium mt-1 leading-relaxed max-w-[190px]">
              Jobs completed in the Active Jobs column will rank staff members here in real-time.
            </p>
          </div>
        ) : !showAllPerformers ? (
          /* Real Podium View (Top 3) */
          <div className="pt-2 pb-0.5">
            <div className="flex items-end justify-center gap-2 px-1">
              {/* 2nd Place */}
              <div className="flex-1 flex flex-col items-center">
                {secondPlace ? (
                  <>
                    <div className="relative mb-1">
                      <div className="w-8 h-8 rounded-full bg-white/90 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-700 dark:text-slate-200 shadow-2xs backdrop-blur-xs overflow-hidden">
                        {secondPlace.avatarUrl ? (
                          <img
                            src={
                              secondPlace.avatarUrl.startsWith('http')
                                ? secondPlace.avatarUrl
                                : `${API_ORIGIN}${secondPlace.avatarUrl}`
                            }
                            alt={secondPlace.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          secondPlace.initials
                        )}
                      </div>
                      <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-slate-400 text-white text-[8px] font-black flex items-center justify-center border border-white dark:border-slate-800">
                        2
                      </span>
                    </div>
                    <span className="font-bold text-[#1F1F1F] dark:text-slate-100 text-[10px] truncate max-w-full text-center">
                      {secondPlace.name}
                    </span>
                    <span className="text-[9px] font-semibold text-slate-500 dark:text-slate-400">
                      {secondPlace.jobs} job{secondPlace.jobs === 1 ? '' : 's'}
                    </span>
                  </>
                ) : (
                  <div className="h-14 flex flex-col items-center justify-center opacity-40">
                    <div className="w-7 h-7 rounded-full border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-[9px] text-slate-400">
                      —
                    </div>
                    <span className="text-[9px] text-slate-400 mt-1">Open</span>
                  </div>
                )}
                {/* Pedestal */}
                <div className="w-full h-10 mt-1 rounded-t-lg bg-gradient-to-b from-slate-100/90 to-slate-200/80 dark:from-slate-800/90 dark:to-slate-900/80 border-t-2 border-x border-slate-300/80 dark:border-white/10 flex items-center justify-center shadow-2xs backdrop-blur-xs">
                  <span className="text-xs font-black text-slate-500 dark:text-slate-400">2nd</span>
                </div>
              </div>

              {/* 1st Place (Center / Tallest) */}
              <div className="flex-1 flex flex-col items-center -mt-2 z-10">
                {firstPlace ? (
                  <>
                    <Crown size={13} className="text-amber-500 fill-amber-400 mb-0.5 animate-bounce" />
                    <div className="relative mb-1">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#1878B8] to-[#55C4F5] p-[2px] shadow-xs overflow-hidden">
                        <div className="w-full h-full rounded-full bg-[#1878B8] flex items-center justify-center text-[10.5px] font-bold text-white overflow-hidden">
                          {firstPlace.avatarUrl ? (
                            <img
                              src={
                                firstPlace.avatarUrl.startsWith('http')
                                  ? firstPlace.avatarUrl
                                  : `${API_ORIGIN}${firstPlace.avatarUrl}`
                              }
                              alt={firstPlace.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            firstPlace.initials
                          )}
                        </div>
                      </div>
                      <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-white text-[8.5px] font-black flex items-center justify-center border-2 border-white dark:border-slate-800 shadow-xs">
                        1
                      </span>
                    </div>
                    <span className="font-black text-[#1F1F1F] dark:text-white text-[10.5px] truncate max-w-full text-center">
                      {firstPlace.name}
                    </span>
                    <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400">
                      {firstPlace.jobs} job{firstPlace.jobs === 1 ? '' : 's'}
                    </span>
                  </>
                ) : null}
                {/* Pedestal */}
                <div className="w-full h-14 mt-1 rounded-t-lg bg-gradient-to-b from-amber-100/90 via-amber-50/80 to-amber-100/50 dark:from-amber-950/60 dark:via-amber-900/40 dark:to-amber-950/30 border-t-2 border-x border-amber-300/90 dark:border-amber-600/50 flex flex-col items-center justify-center shadow-xs backdrop-blur-xs">
                  <span className="text-[13px] font-black text-amber-700 dark:text-amber-400 leading-none">1st</span>
                  <span className="text-[7.5px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400 mt-0.5">Top</span>
                </div>
              </div>

              {/* 3rd Place */}
              <div className="flex-1 flex flex-col items-center">
                {thirdPlace ? (
                  <>
                    <div className="relative mb-1">
                      <div className="w-8 h-8 rounded-full bg-amber-50/90 dark:bg-amber-950/60 border-2 border-amber-200/80 dark:border-amber-800/60 flex items-center justify-center text-[10px] font-bold text-amber-800 dark:text-amber-300 shadow-2xs backdrop-blur-xs overflow-hidden">
                        {thirdPlace.avatarUrl ? (
                          <img
                            src={
                              thirdPlace.avatarUrl.startsWith('http')
                                ? thirdPlace.avatarUrl
                                : `${API_ORIGIN}${thirdPlace.avatarUrl}`
                            }
                            alt={thirdPlace.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          thirdPlace.initials
                        )}
                      </div>
                      <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-600/80 text-white text-[8px] font-black flex items-center justify-center border border-white dark:border-slate-800">
                        3
                      </span>
                    </div>
                    <span className="font-bold text-[#1F1F1F] dark:text-slate-100 text-[10px] truncate max-w-full text-center">
                      {thirdPlace.name}
                    </span>
                    <span className="text-[9px] font-semibold text-slate-500 dark:text-slate-400">
                      {thirdPlace.jobs} job{thirdPlace.jobs === 1 ? '' : 's'}
                    </span>
                  </>
                ) : (
                  <div className="h-14 flex flex-col items-center justify-center opacity-40">
                    <div className="w-7 h-7 rounded-full border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-[9px] text-slate-400">
                      —
                    </div>
                    <span className="text-[9px] text-slate-400 mt-1">Open</span>
                  </div>
                )}
                {/* Pedestal */}
                <div className="w-full h-8 mt-1 rounded-t-lg bg-gradient-to-b from-amber-50/80 to-amber-100/40 dark:from-amber-950/50 dark:to-slate-900/80 border-t-2 border-x border-amber-200/70 dark:border-amber-800/40 flex items-center justify-center shadow-2xs backdrop-blur-xs">
                  <span className="text-xs font-black text-amber-700/80 dark:text-amber-400/90">3rd</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Full Ranked List (Expanded View) */
          <div className="space-y-1 text-xs pt-1 max-h-56 overflow-y-auto no-scrollbar">
            {activePerformers.map((perf, idx) => {
              const isFirst = idx === 0;
              const isTopThree = idx < 3;
              const pAvatarSrc = perf.avatarUrl
                ? perf.avatarUrl.startsWith('http')
                  ? perf.avatarUrl
                  : `${API_ORIGIN}${perf.avatarUrl}`
                : null;
              return (
                <div
                  key={perf.userId || perf.name || idx}
                  className={`flex items-center justify-between py-1 px-2 rounded-lg transition-colors ${
                    isFirst
                      ? 'bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200/90 dark:border-amber-800/40 shadow-2xs backdrop-blur-xs'
                      : 'liquid-glass-tile border-white/80 dark:border-white/5 hover:bg-white/90 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`font-black text-[11px] w-2.5 ${
                        isFirst
                          ? 'text-amber-700 dark:text-amber-400'
                          : isTopThree
                          ? 'text-slate-600 dark:text-slate-300'
                          : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 overflow-hidden ${
                        perf.avatarBg || 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                      } ${isFirst ? 'text-white shadow-xs' : ''}`}
                    >
                      {pAvatarSrc ? (
                        <img src={pAvatarSrc} alt={perf.name} className="w-full h-full object-cover" />
                      ) : (
                        perf.initials
                      )}
                    </div>
                    <span
                      className={`text-[10.5px] truncate ${
                        isFirst ? 'font-bold text-[#1F1F1F] dark:text-white' : 'font-medium text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {perf.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[9.5px] font-semibold text-slate-400 dark:text-slate-400">
                      {perf.revenue}
                    </span>
                    <span
                      className={`text-[10.5px] font-bold ${
                        isFirst ? 'text-amber-700 dark:text-amber-400' : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {perf.jobs} job{perf.jobs === 1 ? '' : 's'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Toggle Button */}
        {hasCompletedJobs && (
          <button
            type="button"
            onClick={() => setShowAllPerformers((prev) => !prev)}
            className="w-full py-1.5 px-3 rounded-xl liquid-glass-btn text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:text-[#0284c7] dark:hover:text-sky-400 flex items-center justify-center gap-1.5 transition-all cursor-pointer group shadow-2xs"
          >
            <span>{showAllPerformers ? 'Podium View' : `Full Leaderboard (${activePerformers.length})`}</span>
            <ChevronDown
              size={12}
              className={`text-slate-400 group-hover:text-[#0284c7] transition-transform duration-200 ${
                showAllPerformers ? 'rotate-180' : ''
              }`}
            />
          </button>
        )}
      </div>
    </aside>
  );
}
