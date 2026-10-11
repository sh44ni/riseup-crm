import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/render';
import { ClientEditContactModal } from '../ClientEditContactModal';
import * as clientsApi from '@/api/clientsApi';

describe('ClientEditContactModal', () => {
  const initialData = {
    name: 'Carol Davis',
    email: 'carol.davis@example.com',
    phone: '(760) 550-1033',
    address: '303 Vista Way',
    city: 'Oceanside',
    zip: '92054',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('skips conflict check when only address is edited and calls onSave', async () => {
    const checkSpy = vi.spyOn(clientsApi, 'checkClientContact');
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    renderWithProviders(
      <ClientEditContactModal
        isOpen={true}
        onClose={onClose}
        clientName="Carol Davis"
        clientId={445}
        initialData={initialData}
        onSave={onSave}
      />
    );

    const addressInput = screen.getByPlaceholderText(/1942 Oceanside Blvd/i);
    await userEvent.clear(addressInput);
    await userEvent.type(addressInput, '303 Vista Way Suite B');

    const saveButton = screen.getByRole('button', { name: /Save to Client 360/i });
    await userEvent.click(saveButton);

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        name: 'Carol Davis',
        email: 'carol.davis@example.com',
        phone: '(760) 550-1033',
        address: '303 Vista Way Suite B',
        city: 'Oceanside',
        zip: '92054',
      });
    });

    expect(checkSpy).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('retains entered information and displays clear error message when onSave fails', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('Database network timeout. Failed to persist address.'));
    const onClose = vi.fn();

    renderWithProviders(
      <ClientEditContactModal
        isOpen={true}
        onClose={onClose}
        clientName="Carol Davis"
        clientId={445}
        initialData={initialData}
        onSave={onSave}
      />
    );

    const addressInput = screen.getByPlaceholderText(/1942 Oceanside Blvd/i);
    await userEvent.clear(addressInput);
    await userEvent.type(addressInput, '999 Ocean Crest Blvd');

    const saveButton = screen.getByRole('button', { name: /Save to Client 360/i });
    await userEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/Database network timeout/i)).toBeInTheDocument();
    });

    // Modal stays open and retains input
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByPlaceholderText(/1942 Oceanside Blvd/i)).toHaveValue('999 Ocean Crest Blvd');
  });

  it('ignores conflict if checkClientContact matches the current client itself', async () => {
    vi.spyOn(clientsApi, 'checkClientContact').mockResolvedValue({
      exists: true,
      field: 'email',
      client: {
        id: 445,
        full_name: 'Carol Davis',
        email: 'carol.davis.new@example.com',
        phone: '(760) 550-1033',
        status: 'lead',
      },
      message: null,
    });

    const onSave = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    renderWithProviders(
      <ClientEditContactModal
        isOpen={true}
        onClose={onClose}
        clientName="Carol Davis"
        clientId={445}
        initialData={initialData}
        onSave={onSave}
      />
    );

    const emailInput = screen.getByPlaceholderText(/client@example.com/i);
    await userEvent.clear(emailInput);
    await userEvent.type(emailInput, 'carol.davis.new@example.com');

    const saveButton = screen.getByRole('button', { name: /Save to Client 360/i });
    await userEvent.click(saveButton);

    await waitFor(() => {
      expect(onSave).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('displays clear conflict error and retains data when conflicting with a different client', async () => {
    vi.spyOn(clientsApi, 'checkClientContact').mockResolvedValue({
      exists: true,
      field: 'email',
      client: {
        id: 999,
        full_name: 'Other Person',
        email: 'other@example.com',
        phone: '(760) 555-9999',
        status: 'lead',
      },
      message: 'A client with this email already exists',
    });

    const onSave = vi.fn();
    const onClose = vi.fn();

    renderWithProviders(
      <ClientEditContactModal
        isOpen={true}
        onClose={onClose}
        clientName="Carol Davis"
        clientId={445}
        initialData={initialData}
        onSave={onSave}
      />
    );

    const emailInput = screen.getByPlaceholderText(/client@example.com/i);
    await userEvent.clear(emailInput);
    await userEvent.type(emailInput, 'other@example.com');

    const saveButton = screen.getByRole('button', { name: /Save to Client 360/i });
    await userEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/A client with this email already exists: "Other Person" \(Client #999\)/i)).toBeInTheDocument();
    });

    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByPlaceholderText(/client@example.com/i)).toHaveValue('other@example.com');
  });
});
