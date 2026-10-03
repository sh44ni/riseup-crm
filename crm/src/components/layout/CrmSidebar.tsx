import React, { useState, useCallback } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Filter,
  UserCheck,
  Calculator,
  FileText,
  Calendar,
  CheckSquare,
  Sparkles,
  BarChart3,
  Settings,
  Hammer,
  ClipboardCheck,
  ShieldCheck,
  DollarSign,
  Globe,
  ChevronRight,
} from 'lucide-react';
import { BrandLogo } from '@/components/common/BrandLogo';
import { SidebarPhotoModal } from './SidebarPhotoModal';
import { useSidebarPhoto } from '@/lib/sidebarPhotoStore';
import { CoastalPalmTrees, MicroPalmTree } from '@/components/common/CoastalPalmTrees';
import { useAuth } from '@/context/AuthContext';
import { useCompany } from '@/context/CompanyContext';
import { usePersonalTasks } from '@/lib/personalTasksStore';
import { useDashboardStats } from '@/lib/dashboardStatsStore';
import { ThemeToggleSwitch } from '@/components/common/ThemeToggleSwitch';
import { useFeature } from '@/features/flags/useFeature';
import { FeatureFlag } from '@/features/flags/types';

interface NavItem {
  name: string;
  path: string;
  icon: any;
  permission?: string;
  disabled?: boolean;
  featureFlag?: FeatureFlag;
  badge?: string;
  badgeColor?: string;
}

interface NavSection {
  title: string;
  iconAccentColor?: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'CORE CRM',
    iconAccentColor: 'bg-sky-400',
    items: [
      { name: 'Dashboard', path: '/', icon: LayoutDashboard },
      { name: 'Leads', path: '/leads', icon: Users, permission: 'leads.view' },
      { name: 'Pipeline', path: '/pipeline', icon: Filter, permission: 'pipeline.view' },
      { name: 'Clients 360', path: '/clients', icon: UserCheck, permission: 'leads.view' },
      { name: 'Estimates', path: '/estimates', icon: Calculator, permission: 'estimates.view' },
      { name: 'Contracts', path: '/contracts', icon: FileText, permission: 'estimates.view' },
      { name: 'Calendar', path: '/calendar', icon: Calendar, permission: 'calendar.view' },
      { name: 'Tasks', path: '/tasks', icon: CheckSquare, permission: 'calendar.view' },
    ],
  },
  {
    title: 'OPERATIONS & TOOLS',
    iconAccentColor: 'bg-[#38BDF8]',
    items: [
      { name: 'Jobs', path: '/jobs', icon: Hammer, permission: 'jobs.view' },
      { name: 'Inspections', path: '/inspections', icon: ClipboardCheck, featureFlag: 'inspections', permission: 'inspections.view' },
      { name: 'Warranties', path: '/warranties', icon: ShieldCheck, featureFlag: 'warranties', permission: 'warranties.view' },
      { name: 'Finances', path: '/finances', icon: DollarSign, featureFlag: 'finances', permission: 'finances.view' },
      { name: 'Web & Marketing', path: '/marketing', icon: Globe, permission: 'reports.view' },
    ],
  },
  {
    title: 'INTELLIGENCE & SYSTEM',
    iconAccentColor: 'bg-purple-400',
    items: [
      { name: 'Analytics', path: '/analytics', icon: BarChart3, permission: 'activity.view' },
      { name: 'Settings & Team', path: '/settings', icon: Settings, permission: 'roles.view' },
      { name: 'Content Studio', path: '#', icon: Sparkles, disabled: true, badge: 'Future', badgeColor: 'bg-amber-500/15 text-amber-400 border-amber-400/30' },
    ],
  },
];

export function CrmSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { can, isOwner } = useAuth();
  const { city, websiteUrl } = useCompany();
  const { activeCount: pendingPersonalTasksCount } = usePersonalTasks();
  const { stats } = useDashboardStats();
  const { photoUrl: sidebarPhoto, savePhoto, resetPhoto, isSaving: isSavingPhoto } = useSidebarPhoto();
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  const isInspectionsEnabled = useFeature('inspections');
  const isWarrantiesEnabled = useFeature('warranties');
  const isFinancesEnabled = useFeature('finances');

  const checkFeatureEnabled = useCallback((flag?: FeatureFlag) => {
    if (!flag) return true;
    if (flag === 'inspections') return isInspectionsEnabled;
    if (flag === 'warranties') return isWarrantiesEnabled;
    if (flag === 'finances') return isFinancesEnabled;
    return false;
  }, [isInspectionsEnabled, isWarrantiesEnabled, isFinancesEnabled]);

  // Tracks the path the user just clicked — set on mouseDown (before the
  // URL changes), so the active style appears instantly with zero delay.
  const [pendingPath, setPendingPath] = useState<string | null>(null);

  // Clear pendingPath whenever the real URL catches up
  React.useEffect(() => {
    setPendingPath(null);
  }, [location.pathname, location.search]);

  const handleNavMouseDown = useCallback((path: string) => {
    if (path === '#') return; // disabled items
    setPendingPath(path);
  }, []);

  // Dedicated query-aware active matcher.
  // Checks pendingPath FIRST so the active style fires the instant the user
  // clicks (mouseDown), before React Router has processed the new URL.
  const isItemActive = useCallback((itemPath: string): boolean => {
    // Optimistic pending check — instant visual response on click
    if (pendingPath !== null) {
      if (itemPath === '/') return pendingPath === '/';
      if (itemPath !== '#') return pendingPath === itemPath || pendingPath.startsWith(itemPath + '/');
    }

    if (itemPath === '/') {
      return location.pathname === '/';
    }
    if (itemPath.includes('?')) {
      const [path, query] = itemPath.split('?');
      return location.pathname === path && location.search.includes(query);
    }
    if (itemPath === '/settings') {
      return location.pathname === '/settings';
    }
    return (
      location.pathname === itemPath ||
      location.pathname.startsWith(itemPath + '/')
    );
  }, [location.pathname, location.search, pendingPath]);

  return (
    <>
      <aside className="w-64 h-screen flex flex-col bg-[#070C15] border-r border-white/[0.08] shrink-0 select-none sticky top-0 z-30 relative overflow-hidden">
        {/* ========================================================
            DYNAMIC PHOTO CANVAS LAYER (Lower Zone with Seamless Blend)
            ======================================================== */}
        {sidebarPhoto && (
          <div
            className="absolute bottom-0 left-0 right-0 h-[75%] bg-cover bg-center transition-all duration-700 pointer-events-none opacity-40 mix-blend-overlay"
            style={{
              backgroundImage: `url('${sidebarPhoto}')`,
              WebkitMaskImage:
                'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 25%, rgba(0,0,0,0.6) 50%, rgba(0,0,0,0.15) 75%, rgba(0,0,0,0) 100%)',
              maskImage:
                'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 25%, rgba(0,0,0,0.6) 50%, rgba(0,0,0,0.15) 75%, rgba(0,0,0,0) 100%)',
            }}
          />
        )}

        {/* Deep Multi-Layer Gradient Overlays for Physical Obsidian Depth */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(180deg, #070C15 0%, rgba(9, 17, 30, 0.85) 40%, rgba(6, 10, 18, 0.95) 100%)',
          }}
        />

        {/* Ambient Cyan / Azure Lighting Refraction Orbs */}
        <div className="absolute -right-12 top-28 w-28 h-56 bg-[#1878B8]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-12 bottom-48 w-32 h-64 bg-[#38BDF8]/15 rounded-full blur-3xl pointer-events-none" />

        {/* Micro-Dot Architectural Texture Overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-15 [background-image:radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:20px_20px]"
          aria-hidden="true"
        />

        {/* ========================================================
            TOP ZONE: BRAND & OFFICIAL SVG LOGO
            ======================================================== */}
        <div className="p-4 border-b border-white/[0.08] relative z-10 bg-[#070C15]/40 backdrop-blur-md flex items-center justify-between gap-2">
          <BrandLogo size="md" />
        </div>

        {/* ========================================================
            MIDDLE ZONE: 3 ORGANIZED WORKFLOW SECTIONS
            ======================================================== */}
        <nav className="flex-1 px-3 py-3 overflow-y-auto relative z-10 space-y-4 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.1)_transparent] hover:[scrollbar-color:rgba(56,189,248,0.4)_transparent]">
          {NAV_SECTIONS.map((section, sIndex) => {
            const visibleItems = section.items.filter((item) => {
              if (item.permission && !isOwner && !can(item.permission)) return false;
              if (item.featureFlag && !checkFeatureEnabled(item.featureFlag)) return false;
              return true;
            });
            if (visibleItems.length === 0) return null;

            return (
              <div key={section.title} className="space-y-1">
                {/* Category Header with Neon Micro-Dot */}
                <div className="px-3 pt-2 pb-1 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${section.iconAccentColor || 'bg-sky-400'} shadow-[0_0_6px_rgba(56,189,248,0.9)] animate-pulse`}
                    />
                    <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                      {section.title}
                    </span>
                  </div>
                  <span className="text-[9px] font-mono text-slate-600 font-semibold">
                    0{sIndex + 1}
                  </span>
                </div>

                {/* Items in Section */}
                <div className="space-y-0.5">
                  {visibleItems.map((item) => {
                    const Icon = item.icon;

                  if (item.disabled) {
                    const tooltipText =
                      item.badge === 'DIP'
                        ? 'Development in progress'
                        : 'Coming soon in a future update';

                    return (
                      <div
                        key={item.name}
                        className="group/item relative flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-500/60 cursor-not-allowed select-none opacity-60 hover:opacity-90 transition-all duration-150"
                        title={tooltipText}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Icon size={15} className="shrink-0 text-slate-500 group-hover/item:text-slate-400 transition-colors" />
                          <span className="truncate group-hover/item:text-slate-400 transition-colors">{item.name}</span>
                        </div>
                        <div className="relative flex items-center">
                          <span
                            className={`px-1.5 py-0.5 rounded-md border text-[9px] font-black uppercase tracking-wider shrink-0 shadow-2xs transition-transform duration-150 group-hover/item:scale-105 ${
                              item.badgeColor ||
                              'bg-amber-500/15 border-amber-400/30 text-amber-400'
                            }`}
                          >
                            {item.badge || 'Future'}
                          </span>

                          {/* Floating Micro-Tooltip on hover */}
                          <div className="absolute right-0 bottom-full mb-1.5 hidden group-hover/item:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#071326] border border-sky-400/30 text-sky-200 text-[10px] font-semibold whitespace-nowrap shadow-[0_4px_16px_rgba(0,0,0,0.6)] z-50 pointer-events-none animate-in fade-in zoom-in-95 duration-100">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                            <span>{tooltipText}</span>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  const active = isItemActive(item.path);

                  return (
                    <NavLink
                      key={item.name}
                      to={item.path}
                      end={item.path === '/'}
                      onMouseDown={() => handleNavMouseDown(item.path)}
                      onClick={
                        // When clicking "Clients 360" while already on /clients
                        // (e.g. inside a client profile), force-reset to the
                        // directory by navigating with resetToDirectory state.
                        item.path === '/clients' && location.pathname.startsWith('/clients')
                          ? (e) => {
                              e.preventDefault();
                              navigate('/clients', { state: { resetToDirectory: true } });
                            }
                          : undefined
                      }
                      className={`group flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 relative select-none active:scale-[0.97] active:opacity-80 ${
                        active
                          ? 'border-l-[3.5px] border-[#38BDF8] bg-gradient-to-r from-[#1878B8]/30 via-sky-500/15 to-transparent text-sky-200 font-bold shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_0_15px_rgba(56,189,248,0.2)]'
                          : 'text-slate-400 hover:text-white hover:bg-white/[0.06] border-l-[3.5px] border-transparent hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          size={15}
                          className={`shrink-0 transition-all duration-150 ${
                            active
                              ? 'text-[#38BDF8] drop-shadow-[0_0_8px_rgba(56,189,248,0.7)] scale-105'
                              : 'text-slate-400 group-hover:text-slate-200 group-hover:scale-105'
                          }`}
                        />
                        <span
                          className={`truncate transition-colors duration-150 ${
                            active
                              ? 'text-white drop-shadow-[0_0_8px_rgba(56,189,248,0.4)]'
                              : 'text-slate-300 group-hover:text-white'
                          }`}
                        >
                          {item.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {(() => {
                          let badgeValue: string | null = null;
                          let badgeColor: string = item.badgeColor || 'bg-sky-500/20 text-sky-300 border-sky-400/30';

                          if (item.name === 'Leads') {
                            if (stats?.newLeads && stats.newLeads > 0) {
                              badgeValue = `${stats.newLeads} New`;
                              badgeColor = 'bg-sky-500/20 text-sky-300 border-sky-400/30';
                            }
                          } else if (item.name === 'Tasks') {
                            if (pendingPersonalTasksCount > 0) {
                              badgeValue = String(pendingPersonalTasksCount);
                              badgeColor = 'bg-amber-500/20 text-amber-300 border-amber-400/30';
                            }
                          } else if (item.badge) {
                            badgeValue = item.badge;
                          }

                          if (!badgeValue) return null;

                          return (
                            <span
                              className={`px-1.5 py-0.2 rounded-md border text-[9px] font-black uppercase tracking-wider shrink-0 shadow-2xs ${badgeColor}`}
                            >
                              {badgeValue}
                            </span>
                          );
                        })()}

                        <ChevronRight
                          size={12}
                          className={`transition-all duration-150 shrink-0 ${
                            active
                              ? 'text-[#38BDF8] opacity-100 translate-x-0.5'
                              : 'text-slate-600 opacity-0 group-hover:opacity-100 group-hover:text-slate-400'
                          }`}
                        />
                      </div>
                    </NavLink>
                  );
                })}
              </div>

              {/* Gradient Divider between sections */}
              {sIndex < NAV_SECTIONS.length - 1 && (
                <div className="pt-2 pb-1 px-3">
                  <div className="h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
                </div>
              )}
            </div>
          );
        })}
        </nav>

        {/* ========================================================
            BOTTOM ZONE: FLOATING LIVE TYPOGRAPHY & VIBRANT SOCIALS
            (No box container - floats seamlessly directly on the blended photo)
            ======================================================== */}
        <div className="px-5 pb-5 pt-2.5 relative z-10 space-y-3 select-none bg-[#070C15]/55 backdrop-blur-md border-t border-white/[0.08] overflow-hidden group/footer">
          {/* Coastal California Oceanside Minimal Art & Palm Trees Backdrop */}
          <div className="absolute inset-0 pointer-events-none z-0 opacity-60 group-hover/footer:opacity-95 transition-opacity duration-500 overflow-hidden">
            <CoastalPalmTrees className="w-full h-full" />
          </div>

          {/* Compact Theme Switcher Toggle */}
          <div className="relative z-10 pb-0.5">
            <ThemeToggleSwitch variant="compact" showLabel />
          </div>

          {/* Slogan Header */}
          <div className="relative z-10 space-y-0.5">
            <div className="font-serif italic font-black text-lg tracking-wide text-white drop-shadow-[0_2px_5px_rgba(0,0,0,0.95)] leading-tight">
              GOOD ROOFS.
            </div>
            <div className="font-serif italic font-black text-lg tracking-wide text-[#38BDF8] drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)] leading-tight">
              BETTER PEOPLE.
            </div>
          </div>

          {/* Decorative Electric Cyan Stroke */}
          <div className="h-[2.5px] w-20 bg-gradient-to-r from-[#38BDF8] via-sky-300 to-transparent rounded-full shadow-[0_0_10px_rgba(56,189,248,0.7)] relative z-10" />

          {/* LIVE Interactive High-Visibility Social Icons Row */}
          <div className="flex items-center gap-2.5 pt-0.5 relative z-10">
            {/* Instagram */}
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noreferrer"
              className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#FD1D1D]/90 via-[#E1306C]/90 to-[#833AB4]/90 hover:from-[#FD1D1D] hover:via-[#E1306C] hover:to-[#833AB4] text-white flex items-center justify-center border border-white/20 transition-all duration-200 hover:scale-110 shadow-[0_2px_8px_rgba(225,48,108,0.4)] cursor-pointer"
              title="Instagram"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
              </svg>
            </a>

            {/* Facebook */}
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noreferrer"
              className="w-8 h-8 rounded-xl bg-[#1877F2]/90 hover:bg-[#1877F2] text-white flex items-center justify-center border border-white/20 transition-all duration-200 hover:scale-110 shadow-[0_2px_8px_rgba(24,119,242,0.4)] cursor-pointer"
              title="Facebook"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </a>

            {/* Google Reviews */}
            <a
              href="https://google.com"
              target="_blank"
              rel="noreferrer"
              className="w-8 h-8 rounded-xl bg-white hover:bg-slate-100 flex items-center justify-center border border-white/40 transition-all duration-200 hover:scale-110 shadow-[0_2px_8px_rgba(0,0,0,0.35)] cursor-pointer"
              title="Google Reviews"
            >
              <svg width="15" height="15" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            </a>

            {/* Yelp */}
            <a
              href="https://yelp.com"
              target="_blank"
              rel="noreferrer"
              className="w-8 h-8 rounded-xl bg-[#E00707]/90 hover:bg-[#E00707] text-white flex items-center justify-center border border-white/20 transition-all duration-200 hover:scale-110 shadow-[0_2px_8px_rgba(224,7,7,0.4)] cursor-pointer"
              title="Yelp Rating"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2a1 1 0 0 1 .99.86L13.5 8l3.8-3.2a1 1 0 0 1 1.34.1l.1.12a1 1 0 0 1-.1 1.34L15 9.5l4.8 1.2a1 1 0 0 1 .74 1.17l-.04.14a1 1 0 0 1-1.17.74L14.5 11.5l2.4 4.3a1 1 0 0 1-.4 1.33l-.13.06a1 1 0 0 1-1.33-.4L13 12.5l-.5 4.8a1 1 0 0 1-.9.89l-.15.01a1 1 0 0 1-.99-.86L10 12.5l-2.4 4.3a1 1 0 0 1-1.33.4l-.13-.06a1 1 0 0 1-.4-1.33l2.4-4.3-4.8 1.2a1 1 0 0 1-1.17-.74l-.04-.14a1 1 0 0 1 .74-1.17L7.8 9.5 4.2 6.36a1 1 0 0 1-.1-1.34l.1-.12a1 1 0 0 1 1.34-.1L9.5 8l.5-5.14A1 1 0 0 1 11 2z" />
              </svg>
            </a>
          </div>

          {/* LIVE Text Domain & City */}
          <div className="pt-2.5 border-t border-white/15 flex items-center justify-between text-[10.5px] font-bold tracking-wider relative z-10">
            <a
              href={websiteUrl || 'https://riseuproofing.com'}
              target="_blank"
              rel="noreferrer"
              className="text-white hover:text-[#38BDF8] transition-colors drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)] truncate max-w-[120px]"
            >
              {websiteUrl ? websiteUrl.replace(/^https?:\/\//, '').replace(/\/.*$/, '').toUpperCase() : 'RISEUPROOFING.COM'}
            </a>
            <span className="text-sky-300 drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)] text-[10px] tracking-wider uppercase font-semibold flex items-center gap-1.5 shrink-0">
              <MicroPalmTree size={12} className="text-[#38BDF8] drop-shadow-[0_0_6px_rgba(56,189,248,0.7)]" />
              <span>{city || 'Oceanside'}, CA</span>
            </span>
          </div>
        </div>
      </aside>

      {/* Dynamic Photo Switcher Modal */}
      {showPhotoModal && (
        <SidebarPhotoModal
          isOpen={showPhotoModal}
          onClose={() => setShowPhotoModal(false)}
          currentPhoto={sidebarPhoto}
          onSave={savePhoto}
          onReset={resetPhoto}
          isSaving={isSavingPhoto}
        />
      )}
    </>
  );
}

export default CrmSidebar;
