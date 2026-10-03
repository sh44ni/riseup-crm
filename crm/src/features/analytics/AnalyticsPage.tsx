import { Suspense } from 'react';
import { Navigate, NavLink, useParams } from 'react-router-dom';
import { CrmPageHero } from '@/components/common/CrmPageHero';
import { PermissionRoute } from '@/components/auth/PermissionRoute';
import { useAuth } from '@/context/AuthContext';
import { ANALYTICS_TABS, findTab, visibleTabs } from './registry';

/** Shell for every analytics tab: hero, permission-filtered tab bar, active tab body. */
export default function AnalyticsPage() {
  const { tab: tabId } = useParams<{ tab?: string }>();
  const { hasPermission, isOwner } = useAuth();
  const can = (permission: string) => isOwner || hasPermission(permission);
  const tabs = visibleTabs(can);
  const active = findTab(tabId);

  if (!tabId) {
    const first = tabs[0] ?? ANALYTICS_TABS[0];
    return <Navigate to={`/analytics/${first.id}`} replace />;
  }
  if (!active) return <Navigate to="/analytics" replace />;

  const ActiveComponent = active.component;

  return (
    <div className="space-y-5 p-4 lg:p-6" data-testid="analytics-page">
      <CrmPageHero
        pageId="analytics"
        defaultEyebrow="Analytics"
        defaultTitle="Analytics"
        defaultSubtitle={active.description}
        showSearch={false}
      />

      {tabs.length > 1 && (
        <nav aria-label="Analytics tabs" className="flex gap-1 border-b border-slate-200 dark:border-white/10">
          {tabs.map(({ id, label, icon: Icon }) => (
            <NavLink
              key={id}
              to={`/analytics/${id}`}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 -mb-px transition-colors ${
                  isActive
                    ? 'border-[#1878B8] text-[#1878B8]'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`
              }
            >
              <Icon size={14} />
              {label}
            </NavLink>
          ))}
        </nav>
      )}

      <PermissionRoute permission={active.permission}>
        <Suspense fallback={<div className="py-10 text-center text-xs text-slate-500">Loading…</div>}>
          <ActiveComponent />
        </Suspense>
      </PermissionRoute>
    </div>
  );
}
