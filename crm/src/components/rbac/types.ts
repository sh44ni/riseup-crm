import React from 'react';
import {
  UserPlus,
  Sliders,
  Users,
  FileText,
  FileCheck,
  Briefcase,
  Calendar,
  Camera,
  DollarSign,
  BarChart3,
  Award,
  HardHat,
  ShieldCheck,
  CheckSquare,
} from 'lucide-react';

export interface ModuleConfig {
  view: 'none' | 'own' | 'assigned' | 'all';
  manage: boolean;
}

export interface Role {
  id: number;
  name: string;
  description?: string;
  is_protected?: boolean;
  is_authorized_signatory?: boolean;
  user_count?: number;
  permissions?: Array<{ permission_id: number; key?: string; scope: string }>;
  modules?: Record<string, ModuleConfig>;
}

export interface UserItem {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: string;
  status: string;
  avatar_url?: string;
  last_login_at?: string;
  created_at?: string;
  roles?: Array<{ id: number; name: string; is_protected?: boolean }>;
}

export interface InvitationItem {
  id: number;
  email: string;
  invited_role_ids: number[];
  token: string;
  status: string;
  expires_at: string;
  created_at: string;
  invited_by_name?: string;
  roles?: Array<{ id: number; name: string }>;
}

export interface ModuleDefinition {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  accentColor: string;
  scoped: boolean;
}

export const MODULE_DEFINITIONS: ModuleDefinition[] = [
  {
    id: 'leads',
    label: 'Leads & Inquiries',
    description: 'Inbound prospective homeowners, storm leads & door knocker canvassing submissions',
    icon: UserPlus,
    accentColor: 'from-amber-500 to-orange-500 text-amber-600 bg-amber-50 border-amber-200',
    scoped: true,
  },
  {
    id: 'pipeline',
    label: 'Sales Pipeline',
    description: 'Kanban deal stages, win/loss probabilities, velocity tracking, and stage transitions',
    icon: Sliders,
    accentColor: 'from-sky-500 to-blue-600 text-sky-600 bg-sky-50 border-sky-200',
    scoped: true,
  },
  {
    id: 'clients',
    label: 'Homeowner Profiles (360 Registry)',
    description: 'Homeowner contact registry, 360 property histories, specs, notes, and records',
    icon: Users,
    accentColor: 'from-blue-500 to-cyan-600 text-blue-600 bg-blue-50 border-blue-200',
    scoped: true,
  },
  {
    id: 'estimates',
    label: 'Estimates & Proposals',
    description: 'Roofing cost calculations, material formulas, pricing templates, and sent proposals',
    icon: FileText,
    accentColor: 'from-indigo-500 to-purple-600 text-indigo-600 bg-indigo-50 border-indigo-200',
    scoped: true,
  },
  {
    id: 'contracts',
    label: 'Contracts & Signatures',
    description: 'Legally binding work authorizations, deposit terms, and client signature sign-offs',
    icon: FileCheck,
    accentColor: 'from-emerald-500 to-teal-600 text-emerald-600 bg-emerald-50 border-emerald-200',
    scoped: false,
  },
  {
    id: 'jobs',
    label: 'Production Jobs',
    description: 'Jobsite work orders, crew dispatch schedules, material deliveries, and completion sign-offs',
    icon: Briefcase,
    accentColor: 'from-blue-600 to-indigo-700 text-blue-600 bg-blue-50 border-blue-200',
    scoped: true,
  },
  {
    id: 'calendar',
    label: 'Schedule & Calendar',
    description: 'Roof inspection appointments, crew dispatch calendars, and team events',
    icon: Calendar,
    accentColor: 'from-violet-500 to-purple-600 text-violet-600 bg-violet-50 border-violet-200',
    scoped: true,
  },
  {
    id: 'tasks',
    label: 'Tasks & Follow-ups',
    description: 'Personal sticky notes, homeowner follow-ups, and operational tasks',
    icon: CheckSquare,
    accentColor: 'from-sky-500 to-indigo-600 text-sky-600 bg-sky-50 border-sky-200',
    scoped: true,
  },
  {
    id: 'inspections',
    label: 'Roof Inspections',
    description: '12-point photo audits, drone inspection reports, and storm damage assessments',
    icon: Camera,
    accentColor: 'from-teal-500 to-emerald-600 text-teal-600 bg-teal-50 border-teal-200',
    scoped: false,
  },
  {
    id: 'finances',
    label: 'Finances & Invoicing',
    description: 'Customer invoices, payment processing, project gross margins, and profit ledgers',
    icon: DollarSign,
    accentColor: 'from-rose-500 to-pink-600 text-rose-600 bg-rose-50 border-rose-200',
    scoped: false,
  },
  {
    id: 'reports',
    label: 'Reports & Analytics',
    description: 'Executive revenue KPIs, proposal win rates, roofer leaderboard, and speed-to-lead',
    icon: BarChart3,
    accentColor: 'from-orange-500 to-amber-600 text-orange-600 bg-orange-50 border-orange-200',
    scoped: false,
  },
  {
    id: 'warranties',
    label: 'Warranties & Certificates',
    description: 'Manufacturer material guarantees and Rise Up workmanship roof certificates',
    icon: Award,
    accentColor: 'from-amber-600 to-yellow-600 text-amber-700 bg-amber-50 border-amber-200',
    scoped: false,
  },
  {
    id: 'crew',
    label: 'Field Crew & Subcontractors',
    description: 'In-house journeymen roofer rosters, daily laborers, and certified trade subcontractors',
    icon: HardHat,
    accentColor: 'from-cyan-600 to-sky-600 text-cyan-600 bg-cyan-50 border-cyan-200',
    scoped: false,
  },
  {
    id: 'estimator_settings',
    label: 'Estimator & Pricing Formulas',
    description: 'Base square costs, labor multipliers, pitch steepness factors, and margin floors',
    icon: Sliders,
    accentColor: 'from-slate-600 to-slate-800 text-slate-700 bg-slate-100 border-slate-200',
    scoped: false,
  },
  {
    id: 'users',
    label: 'Team & User Accounts',
    description: 'Staff account provisioning, invitation management, and account deactivation',
    icon: Users,
    accentColor: 'from-emerald-600 to-green-700 text-emerald-700 bg-emerald-50 border-emerald-200',
    scoped: false,
  },
  {
    id: 'roles',
    label: 'Roles & RBAC Privileges',
    description: 'Security role definitions, permission studio assignments, and access policies',
    icon: ShieldCheck,
    accentColor: 'from-purple-600 to-indigo-700 text-purple-700 bg-purple-50 border-purple-200',
    scoped: false,
  },
];
