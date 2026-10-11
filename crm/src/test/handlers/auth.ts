import { http, HttpResponse } from 'msw';

export interface MockUser {
  id: number;
  email: string;
  name: string;
  role: string;
  permissions?: Record<string, string>;
  is_protected_owner?: boolean;
  signature_access?: 'none' | 'view' | 'use' | 'edit';
}

const DEFAULT_MOCK_USER: MockUser = {
  id: 1,
  email: 'owner@test.local',
  name: 'Test Owner',
  role: 'owner',
  permissions: { '*': 'all' },
  is_protected_owner: true,
  signature_access: 'edit',
};

let activeMockUser: MockUser | null = DEFAULT_MOCK_USER;

export function setMockUser(user: MockUser | null) {
  activeMockUser = user;
}

export function resetMockUser() {
  activeMockUser = DEFAULT_MOCK_USER;
}

export const authHandlers = [
  http.get('*/api/admin/auth/me', () => {
    if (!activeMockUser) {
      return HttpResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }
    return HttpResponse.json({
      ok: true,
      user: activeMockUser,
      csrf_token: 'mock-csrf-token-12345678',
    });
  }),

  http.get('*/api/admin/auth', () => {
    if (!activeMockUser) {
      return HttpResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }
    return HttpResponse.json({
      ok: true,
      user: activeMockUser,
      csrf_token: 'mock-csrf-token-12345678',
    });
  }),

  http.post('*/api/admin/auth/login', async ({ request }) => {
    const body = (await request.json()) as { password?: string; email?: string } | null;
    if (body?.password === 'WrongPassword!') {
      return HttpResponse.json({ detail: 'Invalid credentials' }, { status: 401 });
    }
    const loggedInUser: MockUser = {
      id: 1,
      email: body?.email || 'owner@test.local',
      name: 'Test Owner',
      role: 'owner',
      permissions: { '*': 'all' },
      is_protected_owner: true,
      signature_access: 'edit',
    };
    activeMockUser = loggedInUser;
    return HttpResponse.json({
      ok: true,
      token: 'mock-session-token-12345678',
      csrf_token: 'mock-csrf-token-12345678',
      user: loggedInUser,
    });
  }),

  http.post('*/api/admin/auth/logout', () => {
    activeMockUser = null;
    return HttpResponse.json({ ok: true });
  }),

  http.get('*/api/admin/users', () => {
    return HttpResponse.json({
      ok: true,
      users: [
        { id: 1, name: 'Test Owner', email: 'owner@test.local', role: 'owner' },
        { id: 2, name: 'Sales Rep 1', email: 'rep1@test.local', role: 'sales_rep' },
      ],
    });
  }),
];
