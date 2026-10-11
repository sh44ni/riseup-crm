import React from 'react';
import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/server';
import { renderWithProviders } from '@/test/render';
import { CompanySignatureTab } from '../CompanySignatureTab';

const configuredSignature = {
  version: 2,
  signer_name: 'Edith Guerrero',
  signer_title: 'President',
  signature_type: 'typed',
  signature_data: 'Edith Guerrero',
  configured_at: '2026-10-01T10:00:00Z',
  configured_by_name: 'Test Owner',
  updated_at: '2026-10-05T10:00:00Z',
  updated_by_name: 'Test Owner',
};

const history = [
  {
    id: 2,
    version: 2,
    action: 'updated',
    signer_name: 'Edith Guerrero',
    signer_title: 'President',
    signature_type: 'typed',
    reason: 'Title changed after promotion',
    changed_fields: ['signer_title'],
    changed_by_name: 'Test Owner',
    changed_by_email: 'owner@test.local',
    created_at: '2026-10-05T10:00:00Z',
  },
  {
    id: 1,
    version: 1,
    action: 'configured',
    signer_name: 'Edith Guerrero',
    signer_title: 'Owner',
    signature_type: 'typed',
    reason: null,
    changed_fields: [],
    changed_by_name: 'Test Owner',
    changed_by_email: 'owner@test.local',
    created_at: '2026-10-01T10:00:00Z',
  },
];

function useConfiguredSignature(access: 'view' | 'edit' = 'edit') {
  server.use(
    http.get('*/api/admin/company-signature', () =>
      HttpResponse.json({ configured: true, access, signature: configuredSignature })
    ),
    http.get('*/api/admin/company-signature/history', () => HttpResponse.json({ history }))
  );
}

const viewer = {
  id: 7,
  email: 'viewer@test.local',
  name: 'Vera Viewer',
  role: 'sales_rep',
  permissions: {},
  signature_access: 'view' as const,
};

describe('CompanySignatureTab', () => {
  it('shows the empty state with a set-up action for editors', async () => {
    renderWithProviders(<CompanySignatureTab />);
    expect(await screen.findByRole('button', { name: /set up signature/i })).toBeInTheDocument();
  });

  it('tells view-only users to ask someone with Edit access when not set up', async () => {
    server.use(
      http.get('*/api/admin/company-signature', () =>
        HttpResponse.json({ configured: false, access: 'view', signature: null })
      )
    );
    renderWithProviders(<CompanySignatureTab />, { user: viewer });
    expect(await screen.findByText(/ask someone with Edit access/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /set up signature/i })).not.toBeInTheDocument();
  });

  it('renders the configured signature and its history', async () => {
    useConfiguredSignature();
    renderWithProviders(<CompanySignatureTab />);
    expect(await screen.findByRole('button', { name: /change signature/i })).toBeInTheDocument();
    expect(screen.getAllByText(/President/).length).toBeGreaterThan(0);
    expect(await screen.findByTestId('signature-history-v2')).toBeInTheDocument();
    expect(screen.getByTestId('signature-history-v1')).toBeInTheDocument();
    expect(screen.getByText(/Title changed after promotion/)).toBeInTheDocument();
  });

  it('is read-only for users with view access', async () => {
    useConfiguredSignature('view');
    renderWithProviders(<CompanySignatureTab />, { user: viewer });
    expect(await screen.findByTestId('signature-history-v2')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /change signature/i })).not.toBeInTheDocument();
  });

  it('requires a reason before a change can be saved and sends expected_version', async () => {
    useConfiguredSignature();
    let putBody: Record<string, unknown> | null = null;
    server.use(
      http.put('*/api/admin/company-signature', async ({ request }) => {
        putBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ configured: true, signature: { ...configuredSignature, version: 3 } });
      })
    );

    const user = userEvent.setup();
    renderWithProviders(<CompanySignatureTab />);
    await user.click(await screen.findByRole('button', { name: /change signature/i }));

    const save = screen.getByRole('button', { name: /save change/i });
    expect(save).toBeDisabled();

    const title = screen.getByLabelText(/signer title/i);
    await user.clear(title);
    await user.type(title, 'Owner & President');
    // Changed, but still no reason → disabled
    expect(save).toBeDisabled();

    const reason = screen.getByLabelText(/reason for change/i);
    await user.type(reason, 'abc');
    expect(save).toBeDisabled();
    await user.type(reason, ' title update');
    expect(save).toBeEnabled();

    await user.click(save);
    await waitFor(() => expect(putBody).not.toBeNull());
    expect(putBody).toMatchObject({
      signer_name: 'Edith Guerrero',
      signer_title: 'Owner & President',
      signature_type: 'typed',
      reason: 'abc title update',
      expected_version: 2,
    });
  });

  it('shows a friendly message on a version conflict', async () => {
    useConfiguredSignature();
    server.use(
      http.put('*/api/admin/company-signature', () =>
        HttpResponse.json({ detail: 'Signature was changed by someone else' }, { status: 409 })
      )
    );

    const user = userEvent.setup();
    renderWithProviders(<CompanySignatureTab />);
    await user.click(await screen.findByRole('button', { name: /change signature/i }));
    const title = screen.getByLabelText(/signer title/i);
    await user.clear(title);
    await user.type(title, 'CEO');
    await user.type(screen.getByLabelText(/reason for change/i), 'Corporate restructure');
    await user.click(screen.getByRole('button', { name: /save change/i }));

    expect(await screen.findByText(/someone else changed the company signature/i)).toBeInTheDocument();
  });
});
