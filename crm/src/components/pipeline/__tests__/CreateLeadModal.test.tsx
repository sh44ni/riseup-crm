import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/render';
import { CreateLeadModal } from '../CreateLeadModal';
import { api } from '@/lib/api';

describe('CreateLeadModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when isOpen is false', () => {
    const { container } = renderWithProviders(
      <CreateLeadModal isOpen={false} onClose={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders modal header and form inputs when isOpen is true', () => {
    renderWithProviders(
      <CreateLeadModal isOpen={true} onClose={vi.fn()} />
    );

    expect(screen.getByText('Create New Lead')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. Robert Johnson')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('(760) 000-0000')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('name@example.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create lead/i })).toBeInTheDocument();
  });

  it('shows error if submitted without a valid 10-digit phone number', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <CreateLeadModal isOpen={true} onClose={vi.fn()} />
    );

    const nameInput = screen.getByPlaceholderText('e.g. Robert Johnson');
    const phoneInput = screen.getByPlaceholderText('(760) 000-0000');
    const submitBtn = screen.getByRole('button', { name: /create lead/i });

    await user.type(nameInput, 'Robert Johnson');
    await user.type(phoneInput, '760123'); // only 6 digits
    await user.click(submitBtn);

    expect(screen.getByText(/valid 10-digit phone number/i)).toBeInTheDocument();
  });

  it('submits lead successfully with field mapping and invokes onSubmitLead', async () => {
    const user = userEvent.setup();
    const handleSubmitLead = vi.fn();
    const handleClose = vi.fn();
    const createLeadSpy = vi.spyOn(api, 'createLead').mockResolvedValueOnce({ ok: true, lead: { id: 99 } } as any);

    renderWithProviders(
      <CreateLeadModal
        isOpen={true}
        onClose={handleClose}
        onSubmitLead={handleSubmitLead}
        initialStageId="cold_lead"
      />
    );

    const nameInput = screen.getByPlaceholderText('e.g. Robert Johnson');
    const phoneInput = screen.getByPlaceholderText('(760) 000-0000');
    const emailInput = screen.getByPlaceholderText('name@example.com');
    const submitBtn = screen.getByRole('button', { name: /create lead/i });

    await user.type(nameInput, 'Robert Johnson');
    await user.type(phoneInput, '7605550199');
    await user.type(emailInput, 'robert@example.com');
    await user.click(submitBtn);

    await waitFor(() => {
      expect(createLeadSpy).toHaveBeenCalledTimes(1);
    });

    const callPayload = createLeadSpy.mock.calls[0][0];
    expect(callPayload.name).toBe('Robert Johnson');
    expect(callPayload.phone).toBe('(760) 555-0199');
    expect(callPayload.email).toBe('robert@example.com');
    expect(callPayload.service).toBe('Residential Roofing');
    expect(callPayload.leadSource).toBe('manual');

    expect(handleSubmitLead).toHaveBeenCalledTimes(1);
  });
});
