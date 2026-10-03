/**
 * Canonical registry of public routes and pages for the CRM frontend.
 * Aligns with backend PUBLIC_BACKEND_ROUTES in backend/app/core/public_routes.py.
 */

export const PUBLIC_PAGES = [
  '/login',
  '/accept-invite',
  '/contract/sign',
  '/changelogs',
] as const;

export const PUBLIC_ENDPOINTS = [
  '/auth/login',
  '/auth/me',
  '/admin/auth/login',
  '/admin/auth/me',
  '/admin/auth',
  '/public/invitations',
  '/public/contracts',
  '/contract/sign',
] as const;

export const EXTERNAL_PUBLIC_PAGES = [
  '/contract/sign',
  '/sign/contract',
  '/accept-invite',
] as const;

export function isOnPublicPage(): boolean {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname;
  return PUBLIC_PAGES.some((p) => path === p || path.startsWith(`${p}/`));
}

export function isExternalPublicPage(): boolean {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname;
  return EXTERNAL_PUBLIC_PAGES.some((p) => path === p || path.startsWith(`${p}/`));
}

export function isPublicEndpoint(path: string): boolean {
  return PUBLIC_ENDPOINTS.some((p) => path.includes(p));
}
