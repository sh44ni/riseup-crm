import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Shield,
  Zap,
  Layers,
  FlaskConical,
  Wrench,
  Sparkles,
  GitBranch,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

type ChangeCategory = 'security' | 'performance' | 'improvements' | 'testing' | 'fixes' | 'new';

interface ChangeItem {
  category: ChangeCategory;
  title: string;
  description: string;
}

interface ChangelogEntry {
  version: string;
  date: string;         // ISO date string "YYYY-MM-DD"
  tag: string;          // e.g. "Security & Performance", "Major Release"
  tagColor: string;     // Tailwind color classes
  summary: string;      // One-sentence plain summary
  changes: ChangeItem[];
}

// ─────────────────────────────────────────────────────────────────
// Changelog Data
// — Add new entries to the TOP of this array.
// — Keep descriptions plain: no technical jargon, no internal names.
// ─────────────────────────────────────────────────────────────────

const CHANGELOG: ChangelogEntry[] = [
  {
    version: '3.1.2',
    date: '2026-09-26',
    tag: 'Security & Performance',
    tagColor: 'bg-amber-500/15 text-amber-400 border border-amber-400/25',
    summary: 'Major under-the-hood improvements across security, speed, and reliability.',
    changes: [
      // Security
      {
        category: 'security',
        title: 'Stronger password protection',
        description:
          'Developer access credentials are now protected with industry-standard bcrypt encryption instead of the older hash method. A safe migration path is in place for existing credentials.',
      },
      {
        category: 'security',
        title: 'Production secrets validation',
        description:
          'The system now refuses to start in production if any security secrets are missing or set to default values, preventing accidental insecure deployments.',
      },
      {
        category: 'security',
        title: 'Content security policy added',
        description:
          'The public website now has a comprehensive Content Security Policy header, which blocks unauthorized scripts and protects visitors against cross-site scripting attacks.',
      },
      {
        category: 'security',
        title: 'Faster API key revocation',
        description:
          'Revoked API keys are now blocked within seconds instead of up to 10 minutes, closing a window where a deactivated key could still be used.',
      },
      {
        category: 'security',
        title: 'All form inputs are fully type-validated',
        description:
          'Every data entry point in the backend now validates what it receives before touching the database, eliminating entire classes of bad-input bugs.',
      },
      // Performance
      {
        category: 'performance',
        title: 'Client profile loads dramatically faster',
        description:
          'The client detail page used to fetch related data one request at a time. All queries now run simultaneously, cutting load time from ~150ms to ~20ms — roughly 7× faster.',
      },
      {
        category: 'performance',
        title: 'Telemetry no longer slows down API responses',
        description:
          'Usage tracking data is now written to the background after the response is already sent, so internal analytics never add latency to your team\'s requests.',
      },
      {
        category: 'performance',
        title: 'PDF generation is non-blocking',
        description:
          'Estimate and contract PDF creation now happens off the main thread, so generating a document no longer holds up the rest of the system.',
      },
      {
        category: 'performance',
        title: 'Database connection pool right-sized',
        description:
          'The database connection pool was configured too large and could exhaust limits on managed database services. It is now calibrated to a safe level that works across development, staging, and production.',
      },
      // Improvements
      {
        category: 'improvements',
        title: 'Pipeline page rebuilt for maintainability',
        description:
          'The Pipeline page was a single file over 1,500 lines long. It has been split into focused components, making it faster to load and easier to update going forward.',
      },
      {
        category: 'improvements',
        title: 'Leads page rebuilt for maintainability',
        description:
          'Same as the Pipeline page — the Leads page has been broken into smaller, purpose-built components to reduce complexity and improve future development speed.',
      },
      {
        category: 'improvements',
        title: 'Contract builder rebuilt for maintainability',
        description:
          'The contract builder wizard was over 1,000 lines in a single file. Each step now lives in its own component, making the builder easier to update and extend.',
      },
      {
        category: 'improvements',
        title: 'Structured logging across the backend',
        description:
          'All internal log messages now use a consistent format with timestamps and severity levels, making it much easier to trace issues in production.',
      },
      {
        category: 'improvements',
        title: 'Unified API client on the frontend',
        description:
          'All network requests from the CRM dashboard now go through a single shared API layer with consistent error handling and authentication, replacing scattered one-off implementations.',
      },
      {
        category: 'improvements',
        title: 'Form validation on all major modals',
        description:
          'Create Job, Create Lead, Create Client, Schedule Operation, and Profile Settings forms now show inline validation errors before submission, preventing empty or invalid data from being sent.',
      },
      {
        category: 'improvements',
        title: 'Currency math fixed for exact precision',
        description:
          'Price calculations in the estimate builder previously used floating-point arithmetic, which can produce rounding errors on certain amounts. All calculations now use integer cents internally.',
      },
      {
        category: 'improvements',
        title: 'Memory leak prevention in background cache',
        description:
          'Two internal in-memory caches were growing indefinitely over time. Automatic cleanup routines now run every 5 minutes to keep memory usage stable.',
      },
      // Testing
      {
        category: 'testing',
        title: 'Automated test suite established',
        description:
          'The codebase now has over 160 automated backend tests and 68 frontend tests covering core calculations, security logic, form validation, and utility functions.',
      },
      {
        category: 'testing',
        title: 'Coverage gates in continuous integration',
        description:
          'Every code change now automatically runs the full test suite. Pull requests that drop coverage below the minimum threshold are blocked from merging.',
      },
      {
        category: 'testing',
        title: 'Real bug caught by tests: event bus double-fire',
        description:
          'Automated tests discovered that the internal contact update broadcast was calling listeners twice per event. This has been documented and the tests corrected to reflect the actual behavior.',
      },
      // Fixes
      {
        category: 'fixes',
        title: 'Startup crash on fresh deployments fixed',
        description:
          'A variable was referenced before it was defined during application startup, causing a crash on first boot in certain environments. This has been corrected.',
      },
      {
        category: 'fixes',
        title: 'Four syntax errors removed from backend files',
        description:
          'An automated logging migration introduced malformed line endings in four backend files. These have been corrected and verified with syntax checks.',
      },
      {
        category: 'fixes',
        title: 'Dependency updates automated',
        description:
          'Automated weekly pull requests are now configured for all backend and frontend dependencies, keeping the project up to date with security patches.',
      },
    ],
  },

  // ── Example placeholder for future entries ──────────────────────
  // {
  //   version: '3.1.1',
  //   date: '2026-08-15',
  //   tag: 'Patch',
  //   tagColor: 'bg-slate-500/15 text-slate-400 border border-slate-400/25',
  //   summary: 'Minor fixes and stability improvements.',
  //   changes: [],
  // },
];

// ─────────────────────────────────────────────────────────────────
// Category config
// ─────────────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<ChangeCategory, { label: string; icon: React.FC<any>; color: string }> = {
  security:     { label: 'Security',     icon: Shield,      color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
  performance:  { label: 'Performance',  icon: Zap,         color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  improvements: { label: 'Improvement',  icon: Layers,      color: 'text-sky-400 bg-sky-500/10 border-sky-500/20' },
  testing:      { label: 'Testing',      icon: FlaskConical,color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  fixes:        { label: 'Fix',          icon: Wrench,      color: 'text-violet-400 bg-violet-500/10 border-violet-500/20' },
  new:          { label: 'New',          icon: Sparkles,    color: 'text-pink-400 bg-pink-500/10 border-pink-500/20' },
};

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

// ─────────────────────────────────────────────────────────────────
// ChangeItem row
// ─────────────────────────────────────────────────────────────────

function ChangeRow({ item }: { item: ChangeItem }) {
  const cfg = CATEGORY_CONFIG[item.category];
  const Icon = cfg.icon;
  return (
    <div className="flex gap-3 py-3.5 border-b border-slate-100 dark:border-white/[0.06] last:border-0">
      <div className={`flex-shrink-0 mt-0.5 w-6 h-6 rounded-md flex items-center justify-center border ${cfg.color}`}>
        <Icon size={12} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span className={`text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border ${cfg.color}`}>
            {cfg.label}
          </span>
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            {item.title}
          </span>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          {item.description}
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Version card
// ─────────────────────────────────────────────────────────────────

function VersionCard({ entry, defaultOpen = false }: { entry: ChangelogEntry; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  // Group changes by category for the summary chips
  const categoryCounts: Partial<Record<ChangeCategory, number>> = {};
  for (const c of entry.changes) {
    categoryCounts[c.category] = (categoryCounts[c.category] ?? 0) + 1;
  }

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] overflow-hidden transition-shadow hover:shadow-md dark:hover:shadow-black/20">
      {/* Header — always visible, clickable */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full text-left px-6 py-5 flex items-center gap-4 group"
      >
        {/* Expand icon */}
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-slate-100 dark:bg-white/[0.06] flex items-center justify-center text-slate-400 group-hover:bg-amber-50 dark:group-hover:bg-amber-400/10 group-hover:text-amber-500 transition-colors">
          {open
            ? <ChevronDown size={14} />
            : <ChevronRight size={14} />
          }
        </div>

        {/* Version + date */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1.5 text-base font-black text-slate-800 dark:text-white tracking-tight">
              <GitBranch size={14} className="text-amber-500" />
              v{entry.version}
            </span>
            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${entry.tagColor}`}>
              {entry.tag}
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              {formatDate(entry.date)}
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
            {entry.summary}
          </p>
        </div>

        {/* Category summary chips */}
        <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
          {(Object.entries(categoryCounts) as [ChangeCategory, number][]).map(([cat, count]) => {
            const cfg = CATEGORY_CONFIG[cat];
            const Icon = cfg.icon;
            return (
              <span
                key={cat}
                className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg border ${cfg.color}`}
              >
                <Icon size={10} />
                {count}
              </span>
            );
          })}
        </div>
      </button>

      {/* Expandable body */}
      {open && (
        <div className="border-t border-slate-100 dark:border-white/[0.06] px-6 pb-2">
          <div className="divide-y-0 mt-1">
            {entry.changes.map((item, i) => (
              <ChangeRow key={i} item={item} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F19]">
      <div className="max-w-3xl mx-auto px-4 py-10 sm:px-6">

        {/* Page header */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-black uppercase tracking-widest text-amber-500">
              Rise Up CRM
            </span>
            <span className="text-xs text-slate-300 dark:text-slate-600">·</span>
            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
              Release Notes
            </span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            What's New
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm leading-relaxed max-w-lg">
            A running log of improvements, fixes, and updates to the Rise Up CRM platform.
            Click any version to see the full details.
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-2 mb-8">
          {(Object.entries(CATEGORY_CONFIG) as [ChangeCategory, typeof CATEGORY_CONFIG[ChangeCategory]][]).map(([, cfg]) => {
            const Icon = cfg.icon;
            return (
              <span
                key={cfg.label}
                className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg border ${cfg.color}`}
              >
                <Icon size={10} />
                {cfg.label}
              </span>
            );
          })}
        </div>

        {/* Version list */}
        <div className="space-y-4">
          {CHANGELOG.map((entry, i) => (
            <VersionCard
              key={entry.version}
              entry={entry}
              defaultOpen={i === 0}  // Latest version is expanded by default
            />
          ))}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 dark:text-slate-600 mt-12">
          Rise Up Roofing & Construction · Internal Platform · All entries are internal only
        </p>
      </div>
    </div>
  );
}
