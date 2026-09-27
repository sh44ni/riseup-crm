import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Lock, Home } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface PermissionRouteProps {
  permission: string;
  scope?: 'all' | 'assigned' | 'own';
  children: React.ReactNode;
}

export function PermissionRoute({ permission, scope, children }: PermissionRouteProps) {
  const { user, hasPermission, isOwner } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const allowed = isOwner || hasPermission(permission, scope);

  if (!allowed) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-3xl bg-white border border-slate-200/80 p-8 text-center space-y-5 shadow-xl backdrop-blur-md">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-xs">
            <Lock size={30} />
          </div>

          <div className="space-y-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
              Access Restricted
            </span>
            <h2 className="text-lg font-bold text-slate-900">Insufficient Role Privileges</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Your assigned role (<span className="font-semibold text-slate-800">{user.role.replace(/_/g, ' ')}</span>) does not have the required permission (
              <span className="font-mono text-amber-700 font-semibold text-[11px] bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/80">{permission}</span>) to view this module.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 text-left space-y-1">
            <div className="font-bold text-slate-800">Need access to this feature?</div>
            <div>
              Contact an administrator or owner to update your role permissions in the Permission Matrix.
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-900 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>Go Back</span>
            </button>
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#1878B8] via-sky-500 to-[#55C4F5] hover:opacity-95 transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <Home size={14} />
              <span>Dashboard</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
