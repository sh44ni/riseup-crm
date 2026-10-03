import { Suspense } from 'react';
import { Navigate, NavLink, useParams } from 'react-router-dom';
import { CrmPageHero } from '@/components/common/CrmPageHero';
import { PermissionRoute } from '@/components/auth/PermissionRoute';
import { useAuth } from '@/context/AuthContext';
import { ANALYTICS_TABS, findTab, isLive, visibleTabs } from './registry';

const pillBase =
  'flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap';

/** Shell for every analytics tab: hero, pill tab bar (live + greyed "Soon"), active tab body. */
export default function AnalyticsPage() {
  const { tab: tabId } = useParams<{ tab?: string }>();
  const { hasPermission, isOwner } = useAuth();
  const can = (permission: string) => isOwner || hasPermission(permission);
  const tabs = visibleTabs(can);
  const active = findTab(tabId);

  if (!tabId) {
    const first = tabs.find(isLive) ?? ANALYTICS_TABS[0];
    return <Navigate to={`/analytics/${first.id}`} replace />;
  }
  if (!active) return <Navigate to="/analytics" replace />;

  const ActiveComponent = active.component!;

  return (
    <div className="space-y-4 p-4 lg:p-6" data-testid="analytics-page">
      <CrmPageHero
        pageId="analytics"
        defaultEyebrow="Insights"
        defaultTitle="Analytics"
        defaultSubtitle={active.description}
        showSearch={false}
      />

      <nav
        aria-label="Analytics tabs"
        className="light-glass-panel rounded-xl border border-white/85 dark:border-white/10 p-1.5 flex gap-1 overflow-x-auto"
      >
        {tabs.map(({ id, label, icon: Icon, component }) =>
          component ? (
            <NavLink
              key={id}
              to={`/analytics/${id}`}
              className={({ isActive }) =>
                `${pillBase} ${
                  isActive
                    ? 'bg-gradient-to-tr from-[#1878B8] to-[#55C4F5] text-white shadow-md'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-white/70 dark:hover:bg-white/10'
                }`
              }
            >
              <Icon size={13} />
              {label}
            </NavLink>
          ) : (
            <span
              key={id}
              aria-disabled="true"
              title="Coming soon"
              data-testid={`analytics-tab-soon-${id}`}
              className={`${pillBase} text-slate-400 dark:text-slate-500 opacity-70 cursor-not-allowed select-none`}
            >
              <Icon size={13} />
              {label}
              <span className="ml-0.5 rounded-full bg-slate-200/80 dark:bg-white/10 px-1.5 py-px text-[8.5px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Soon
              </span>
            </span>
          ),
        )}
      </nav>

      <PermissionRoute permission={active.permission}>
        <Suspense fallback={<div className="py-10 text-center text-xs text-slate-500">Loading…</div>}>
          <ActiveComponent />
        </Suspense>
      </PermissionRoute>
    </div>
  );
}
