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
  '/public/invitations',
  '/public/contracts',
  '/contract/sign',
] as const;

export function isOnPublicPage(): boolean {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname;
  return PUBLIC_PAGES.some((p) => path === p || path.startsWith(`${p}/`));
}

export function isPublicEndpoint(path: string): boolean {
  return PUBLIC_ENDPOINTS.some((p) => path.includes(p));
}
