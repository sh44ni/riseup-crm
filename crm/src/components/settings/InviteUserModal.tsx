import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  UserPlus,
  Mail,
  Phone,
  Shield,
  MapPin,
  CheckCircle2,
  Sparkles,
  Lock,
} from 'lucide-react';
import { RoleType, TeamMember, UserRole } from '@/types/settingsTypes';

interface InviteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvite: (member: {
    name: string;
    email: string;
    phone: string;
    role: RoleType;
    roleLabel: string;
    branch: string;
    avatarColor: string;
    initials: string;
    status: 'active' | 'invited';
    twoFactorEnabled: boolean;
  }) => void;
  roles: UserRole[];
}

export function InviteUserModal({
  isOpen,
  onClose,
  onInvite,
  roles,
}: InviteUserModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedRole, setSelectedRole] = useState<RoleType>('senior_estimator');
  const [branch, setBranch] = useState('Oceanside HQ');
  const [require2FA, setRequire2FA] = useState(true);
  const [sendSms, setSendSms] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Lock body scroll and listen for Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const roleMeta = roles.find((r) => r.id === selectedRole) || roles[1];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;

    setIsSubmitting(true);

    const initials = name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    const gradientColors = [
      'from-sky-500 to-blue-600',
      'from-emerald-500 to-teal-600',
      'from-amber-500 to-orange-600',
      'from-purple-500 to-indigo-600',
      'from-rose-500 to-pink-600',
    ];
    const avatarColor =
      gradientColors[Math.floor(Math.random() * gradientColors.length)];

    setTimeout(() => {
      onInvite({
        name,
        email,
        phone: phone || '(760) 842-7899',
        role: selectedRole,
        roleLabel: roleMeta.title,
        branch,
        avatarColor,
        initials: initials || 'RU',
        status: 'invited',
        twoFactorEnabled: require2FA,
      });
      setIsSubmitting(false);
      onClose();
    }, 500);
  };

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-5 bg-slate-950/65 backdrop-blur-md overflow-y-auto animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="rounded-3xl border border-white/80 dark:border-white/10 bg-white/95 dark:bg-[#0B1320]/95 backdrop-blur-2xl shadow-[0_25px_80px_rgba(15,23,42,0.35)] dark:shadow-[0_25px_80px_rgba(0,0,0,0.85)] max-w-lg w-full overflow-hidden text-slate-800 dark:text-slate-100 flex flex-col max-h-[90vh] my-auto animate-in zoom-in-95 duration-150"
      >
        {/* Modal Header */}
        <div className="shrink-0 px-6 py-5 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between bg-gradient-to-r from-sky-50/60 dark:from-sky-950/20 to-blue-50/40 dark:to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1878B8] to-[#2F9FE3] text-white flex items-center justify-center shadow-[0_2px_10px_rgba(47,159,227,0.3)]">
              <UserPlus size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Invite Team Member
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Add an estimator, crew lead, or office administrator to Rise Up CRM
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="p-6 space-y-4 flex-1 overflow-y-auto">
          {/* Full Name */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Full Legal Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Marcus Bradley"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50/80 dark:bg-white/5 border border-slate-200/90 dark:border-white/10 focus:border-[#1878B8] dark:focus:border-sky-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-[#1878B8]/20 text-xs font-semibold text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all shadow-2xs"
            />
          </div>

          {/* Email & Phone Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Work Email <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="marcus@riseuproofing.com"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50/80 dark:bg-white/5 border border-slate-200/90 dark:border-white/10 focus:border-[#1878B8] dark:focus:border-sky-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-[#1878B8]/20 text-xs font-semibold text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all shadow-2xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Mobile Phone
              </label>
              <div className="relative">
                <Phone
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(760) 842-7898"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50/80 dark:bg-white/5 border border-slate-200/90 dark:border-white/10 focus:border-[#1878B8] dark:focus:border-sky-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-[#1878B8]/20 text-xs font-semibold text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* Role Picker */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Assigned Operational Role <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as RoleType)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 focus:border-[#1878B8] dark:focus:border-sky-500 focus:ring-2 focus:ring-[#1878B8]/20 text-xs font-semibold text-slate-800 dark:text-white outline-none transition-all shadow-2xs"
            >
              <option value="senior_estimator" className="dark:bg-slate-900 dark:text-white">Senior Estimator (Proposals & Contracts)</option>
              <option value="crew_lead" className="dark:bg-slate-900 dark:text-white">Crew Lead Foreman (Field Work Orders & Safety)</option>
              <option value="production_manager" className="dark:bg-slate-900 dark:text-white">Production Manager (Suppliers & Schedules)</option>
              <option value="office_admin" className="dark:bg-slate-900 dark:text-white">Office Administrator (Inbound Leads & City Permits)</option>
              <option value="owner" className="dark:bg-slate-900 dark:text-white">Owner & Executive (Full Unrestricted Access)</option>
            </select>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 italic">
              {roleMeta.description}
            </p>
          </div>

          {/* Branch Assignment */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Territory / Operating Branch
            </label>
            <div className="relative">
              <MapPin
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
              />
              <select
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 focus:border-[#1878B8] dark:focus:border-sky-500 focus:ring-2 focus:ring-[#1878B8]/20 text-xs font-semibold text-slate-800 dark:text-white outline-none transition-all shadow-2xs"
              >
                <option value="Oceanside HQ" className="dark:bg-slate-900 dark:text-white">Oceanside HQ (1942 Oceanside Blvd)</option>
                <option value="Carlsbad Yard" className="dark:bg-slate-900 dark:text-white">Carlsbad Industrial Yard (Production)</option>
                <option value="Coastal Mobile" className="dark:bg-slate-900 dark:text-white">Coastal Mobile Rig (Encinitas / Del Mar)</option>
              </select>
            </div>
          </div>

          {/* Security & Notification Checkboxes */}
          <div className="pt-2 border-t border-slate-200/70 dark:border-white/10 space-y-2.5">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={require2FA}
                onChange={(e) => setRequire2FA(e.target.checked)}
                className="w-4 h-4 rounded text-[#1878B8] focus:ring-[#1878B8] border-slate-300 dark:border-white/20 dark:bg-white/5"
              />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Lock size={12} className="text-emerald-600 dark:text-emerald-400" />
                Enforce Mandatory Two-Factor Authentication (2FA)
              </span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={sendSms}
                onChange={(e) => setSendSms(e.target.checked)}
                className="w-4 h-4 rounded text-[#1878B8] focus:ring-[#1878B8] border-slate-300 dark:border-white/20 dark:bg-white/5"
              />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Send Welcome SMS & Email with one-time secure setup token
              </span>
            </label>
          </div>

          </div>

          {/* Modal Sticky Footer */}
          <div className="shrink-0 px-6 py-3.5 border-t border-slate-200/80 dark:border-white/10 bg-slate-50/60 dark:bg-slate-900/60 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-[#1878B8] to-[#2F9FE3] text-white hover:brightness-110 shadow-[0_3px_12px_rgba(47,159,227,0.35)] transition-all flex items-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Dispatching Invitation...</span>
                </>
              ) : (
                <>
                  <UserPlus size={14} />
                  <span>Send Member Invitation</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
