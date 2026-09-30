import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '@/lib/api';

export interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  phone?: string;
  avatar_url?: string;
  permissions?: Record<string, string>;
  is_protected_owner?: boolean;
  is_authorized_signatory?: boolean;
  has_signature?: boolean;
  signature_title?: string;
  signature_type?: string;
  signature_data?: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isOwner: boolean;
  login: (password: string, email?: string) => Promise<void>;
  setSessionUser: (token: string, user: User) => void;
  updateUserProfile: (data: Partial<User>) => void;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (permission: string, requiredScope?: 'all' | 'assigned' | 'own') => boolean;
  can: (permission: string) => boolean;
  getScope: (permission: string) => 'none' | 'own' | 'assigned' | 'all';
  hasRole: (roleName: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('crm_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [token, setTokenState] = useState<string | null>(() => {
    return api.getToken() || null;
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isHydrating, setIsHydrating] = useState<boolean>(() => Boolean(api.getToken()));

  // Hydrate user & permissions on mount or when token is present
  const refreshUser = useCallback(async () => {
    if (!api.getToken()) {
      setIsHydrating(false);
      return;
    }
    try {
      const res = await api.getMe();
      if (res && res.user) {
        setUser(res.user);
        localStorage.setItem('crm_user', JSON.stringify(res.user));
      } else {
        setUser(null);
        localStorage.removeItem('crm_user');
      }
    } catch {
      // If token is invalid, purge cached session and reset
      setUser(null);
      localStorage.removeItem('crm_user');
      api.setToken(null);
    } finally {
      setIsHydrating(false);
    }
  }, []);

  useEffect(() => {
    // Don't hydrate session on public pages — a stale token would cause a
    // 401 from /admin/auth/me which redirects the user away from the page.
    const PUBLIC_PAGES = ['/accept-invite', '/contract/sign/', '/changelogs'];
    const isPublicPage = typeof window !== 'undefined' &&
      PUBLIC_PAGES.some(p => window.location.pathname.startsWith(p));

    if (isPublicPage) {
      setIsHydrating(false);
      return;
    }

    if (token) {
      refreshUser();
    } else {
      setIsHydrating(false);
    }
  }, [token, refreshUser]);

  const setSessionUser = useCallback((newToken: string, newUser: User) => {
    setTokenState(newToken);
    api.setToken(newToken);
    setUser(newUser);
    localStorage.setItem('crm_user', JSON.stringify(newUser));
    setIsHydrating(false);
  }, []);

  const updateUserProfile = useCallback((data: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...data };
      localStorage.setItem('crm_user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const login = useCallback(async (password: string, email?: string) => {
    setIsLoading(true);
    try {
      const res = await api.login(password, email);
      if (!res.token) throw new Error('No token received');
      setTokenState(res.token);
      api.setToken(res.token);

      if (!res.user) {
        throw new Error('Authentication failed: Invalid user profile received.');
      }

      const activeUser: User = res.user;
      setUser(activeUser);
      localStorage.setItem('crm_user', JSON.stringify(activeUser));
      setIsHydrating(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // offline
    } finally {
      setUser(null);
      setTokenState(null);
      localStorage.removeItem('crm_user');
      api.setToken(null);
      setIsHydrating(false);
    }
  }, []);

  const isOwner = Boolean(
    !isHydrating &&
    user && (
      user.role === 'owner' ||
      user.is_protected_owner ||
      user?.permissions?.['*'] === 'all'
    )
  );

  const hasPermission = useCallback(
    (permission: string, requiredScope?: 'all' | 'assigned' | 'own'): boolean => {
      if (!user) return false;
      if (isOwner) return true;

      const perms = user.permissions || {};
      if (perms['*'] === 'all') return true;

      // Normalization check (e.g. leads:view vs leads.view)
      const normKey = permission.replace(/:/g, '.');
      const userScope = perms[normKey] || perms[permission];

      if (!userScope || userScope === 'none') return false;
      if (!requiredScope) return true;

      if (requiredScope === 'all') {
        return userScope === 'all';
      }
      if (requiredScope === 'assigned') {
        return userScope === 'all' || userScope === 'assigned';
      }
      if (requiredScope === 'own') {
        return userScope === 'all' || userScope === 'assigned' || userScope === 'own';
      }

      return false;
    },
    [user, isOwner]
  );

  const can = useCallback(
    (permission: string): boolean => {
      return hasPermission(permission);
    },
    [hasPermission]
  );

  const getScope = useCallback(
    (permission: string): 'none' | 'own' | 'assigned' | 'all' => {
      if (!user) return 'none';
      if (isOwner || user.permissions?.['*'] === 'all') return 'all';
      const normKey = permission.replace(/:/g, '.');
      const val = user.permissions?.[normKey] || user.permissions?.[permission];
      if (val === 'all' || val === 'assigned' || val === 'own') return val;
      return 'none';
    },
    [user, isOwner]
  );

  const hasRole = useCallback(
    (roleName: string): boolean => {
      if (!user) return false;
      const cleanUserRole = user.role.toLowerCase().replace(/ /g, '_');
      const cleanTargetRole = roleName.toLowerCase().replace(/ /g, '_');
      return cleanUserRole === cleanTargetRole;
    },
    [user]
  );

  const contextValue = useMemo(
    () => ({
      user,
      token,
      isLoading,
      isOwner,
      login,
      setSessionUser,
      updateUserProfile,
      refreshUser,
      logout,
      hasPermission,
      can,
      getScope,
      hasRole,
    }),
    [
      user,
      token,
      isLoading,
      isOwner,
      login,
      setSessionUser,
      updateUserProfile,
      refreshUser,
      logout,
      hasPermission,
      can,
      getScope,
      hasRole,
    ]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
