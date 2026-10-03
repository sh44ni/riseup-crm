import React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from '../AuthContext';
import { api } from '@/lib/api';
import { server } from '@/test/server';
import { http, HttpResponse } from 'msw';

function TestConsumer() {
  const {
    user,
    token,
    isOwner,
    hasPermission,
    can,
    getScope,
    hasRole,
    login,
    logout,
    updateUserProfile,
  } = useAuth();

  return (
    <div>
      <div data-testid="user-name">{user ? user.name : 'no-user'}</div>
      <div data-testid="user-role">{user ? user.role : 'no-role'}</div>
      <div data-testid="token">{token || 'no-token'}</div>
      <div data-testid="is-owner">{isOwner ? 'yes' : 'no'}</div>
      <div data-testid="can-leads-view">{can('leads:view') ? 'yes' : 'no'}</div>
      <div data-testid="can-users-manage">{can('users:manage') ? 'yes' : 'no'}</div>
      <div data-testid="scope-leads-view">{getScope('leads:view')}</div>
      <div data-testid="has-role-owner">{hasRole('owner') ? 'yes' : 'no'}</div>
      <div data-testid="has-role-sales-rep">{hasRole('sales_rep') ? 'yes' : 'no'}</div>
      <button onClick={() => login('valid-password', 'rep@test.local')}>Login</button>
      <button onClick={() => logout()}>Logout</button>
      <button onClick={() => updateUserProfile({ name: 'Updated Name' })}>UpdateProfile</button>
    </div>
  );
}

import { setMockUser, resetMockUser } from '@/test/handlers/auth';

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
    api.setToken(null);
    resetMockUser();
  });

  afterEach(() => {
    localStorage.clear();
    api.setToken(null);
    resetMockUser();
  });

  it('initializes with unauthenticated state when api.getMe() returns 401', async () => {
    setMockUser(null);

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user-name').textContent).toBe('no-user');
    });
    expect(screen.getByTestId('token').textContent).toBe('no-token');
    expect(screen.getByTestId('is-owner').textContent).toBe('no');
    expect(screen.getByTestId('can-leads-view').textContent).toBe('no');
    expect(screen.getByTestId('scope-leads-view').textContent).toBe('none');
    expect(localStorage.getItem('crm_user')).toBeNull();
    expect(localStorage.getItem('crm_auth_token')).toBeNull();
  });

  it('hydrates user and permissions from api.getMe() on mount', async () => {
    setMockUser({
      id: 5,
      name: 'Hydrated Rep',
      email: 'rep@test.local',
      role: 'sales_rep',
      permissions: { 'leads.view': 'own' },
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user-name').textContent).toBe('Hydrated Rep');
    });
    expect(screen.getByTestId('user-role').textContent).toBe('sales_rep');
    expect(screen.getByTestId('is-owner').textContent).toBe('no');
    expect(screen.getByTestId('can-leads-view').textContent).toBe('yes');
    expect(screen.getByTestId('can-users-manage').textContent).toBe('no');
    expect(screen.getByTestId('scope-leads-view').textContent).toBe('own');
    expect(screen.getByTestId('has-role-sales-rep').textContent).toBe('yes');
    // No tokens or user in localStorage
    expect(localStorage.getItem('crm_user')).toBeNull();
    expect(localStorage.getItem('crm_auth_token')).toBeNull();
  });

  it('clears session when session hydration fails with 401', async () => {
    server.use(
      http.get('*/api/admin/auth/me', () => {
        return HttpResponse.json({ detail: 'Session expired' }, { status: 401 });
      })
    );

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user-name').textContent).toBe('no-user');
    });
    expect(api.getToken()).toBeNull();
    expect(localStorage.getItem('crm_user')).toBeNull();
  });

  it('handles login and updates state without persisting token to localStorage', async () => {
    const user = userEvent.setup();
    setMockUser(null);

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user-name').textContent).toBe('no-user');
    });

    await user.click(screen.getByText('Login'));

    await waitFor(() => {
      expect(screen.getByTestId('user-name').textContent).toBe('Test Owner');
    });
    // In Phase 5, localStorage must remain clean of sensitive user/token data
    expect(localStorage.getItem('crm_user')).toBeNull();
    expect(localStorage.getItem('crm_auth_token')).toBeNull();
  });

  it('handles logout and clears state', async () => {
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user-name').textContent).toBe('Test Owner');
    });

    await user.click(screen.getByText('Logout'));

    await waitFor(() => {
      expect(screen.getByTestId('user-name').textContent).toBe('no-user');
    });
    expect(screen.getByTestId('token').textContent).toBe('no-token');
    expect(localStorage.getItem('crm_user')).toBeNull();
    expect(localStorage.getItem('crm_auth_token')).toBeNull();
  });

  it('updates profile in state without writing to localStorage', async () => {
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user-name').textContent).toBe('Test Owner');
    });

    await user.click(screen.getByText('UpdateProfile'));

    expect(screen.getByTestId('user-name').textContent).toBe('Updated Name');
    expect(localStorage.getItem('crm_user')).toBeNull();
  });
});
