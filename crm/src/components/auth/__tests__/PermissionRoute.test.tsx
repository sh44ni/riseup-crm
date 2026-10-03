import React from 'react';
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import { PermissionRoute } from '../PermissionRoute';

describe('PermissionRoute', () => {
  it('redirects to /login when user is unauthenticated', () => {
    renderWithProviders(
      <PermissionRoute permission="leads.view">
        <div>Protected Secret Deals</div>
      </PermissionRoute>,
      { user: null }
    );

    expect(screen.queryByText('Protected Secret Deals')).not.toBeInTheDocument();
  });

  it('renders children when user is owner regardless of explicit permission', () => {
    renderWithProviders(
      <PermissionRoute permission="finances.manage">
        <div>Financial Management Content</div>
      </PermissionRoute>,
      {
        user: {
          id: 1,
          name: 'Owner User',
          email: 'owner@test.local',
          role: 'owner',
          permissions: {},
        },
      }
    );

    expect(screen.getByText('Financial Management Content')).toBeInTheDocument();
  });

  it('renders children when non-owner user has required permission', () => {
    renderWithProviders(
      <PermissionRoute permission="leads.view">
        <div>Sales Deals Board</div>
      </PermissionRoute>,
      {
        user: {
          id: 2,
          name: 'Sales Rep',
          email: 'rep@test.local',
          role: 'sales_rep',
          permissions: { 'leads.view': 'all' },
        },
      }
    );

    expect(screen.getByText('Sales Deals Board')).toBeInTheDocument();
  });

  it('renders forbidden screen when user lacks required permission', () => {
    renderWithProviders(
      <PermissionRoute permission="finances.view">
        <div>Financial Reports</div>
      </PermissionRoute>,
      {
        user: {
          id: 3,
          name: 'Field Crew',
          email: 'crew@test.local',
          role: 'field_foreman',
          permissions: { 'jobs.view': 'all' },
        },
      }
    );

    expect(screen.queryByText('Financial Reports')).not.toBeInTheDocument();
    expect(screen.getByText('Insufficient Role Privileges')).toBeInTheDocument();
    expect(screen.getByText(/Access Restricted/i)).toBeInTheDocument();
  });
});
