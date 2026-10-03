import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/render';
import { CreateExistingClientModal } from '../CreateExistingClientModal';
import * as clientsApi from '@/api/clientsApi';

describe('CreateExistingClientModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when isOpen is false', () => {
    const { container } = renderWithProviders(
      <CreateExistingClientModal isOpen={false} onClose={vi.fn()} onSave={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders modal headers, stages, and inputs when isOpen is true', () => {
    renderWithProviders(
      <CreateExistingClientModal isOpen={true} onClose={vi.fn()} onSave={vi.fn()} />
    );

    expect(screen.getByRole('heading', { name: /onboard existing homeowner/i })).toBeInTheDocument();
    expect(screen.getByText('Target Pipeline Stage')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. Robert Henderson')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('(760) 555-0199')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('homeowner@gmail.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /onboard existing homeowner/i })).toBeInTheDocument();
  });

  it('displays error if submitting without homeowner name or contact method', async () => {
    const user = userEvent.setup();
    const handleSave = vi.fn();
    renderWithProviders(
      <CreateExistingClientModal isOpen={true} onClose={vi.fn()} onSave={handleSave} />
    );

    const submitBtn = screen.getByRole('button', { name: /onboard existing homeowner/i });
    await user.click(submitBtn);

    expect(handleSave).not.toHaveBeenCalled();
  });

  it('locks in all state-to-payload fields when form is submitted', async () => {
    const user = userEvent.setup();
    const handleSave = vi.fn().mockResolvedValue({ ok: true });
    const handleClose = vi.fn();
    vi.spyOn(clientsApi, 'checkClientContact').mockResolvedValue({ exists: false });

    renderWithProviders(
      <CreateExistingClientModal isOpen={true} onClose={handleClose} onSave={handleSave} />
    );

    const nameInput = screen.getByPlaceholderText('e.g. Robert Henderson');
    const phoneInput = screen.getByPlaceholderText('(760) 555-0199');
    const emailInput = screen.getByPlaceholderText('homeowner@gmail.com');
    const addressInput = screen.getByPlaceholderText('e.g. 1420 Pacific Coast Hwy');
    const submitBtn = screen.getByRole('button', { name: /onboard existing homeowner/i });

    await user.type(nameInput, 'Robert Henderson');
    await user.type(phoneInput, '(760) 555-0123');
    await user.type(emailInput, 'robert@example.com');
    await user.type(addressInput, '789 Sunset Blvd');
    await user.click(submitBtn);

    await waitFor(() => {
      expect(handleSave).toHaveBeenCalledTimes(1);
    });

    const payload = handleSave.mock.calls[0][0];
    expect(payload.fullName).toBe('Robert Henderson');
    expect(payload.phone).toBe('(760) 555-0123');
    expect(payload.email).toBe('robert@example.com');
    expect(payload.address).toBe('789 Sunset Blvd');
    expect(payload.city).toBe('Oceanside');
    expect(payload.zip).toBe('92054');
    expect(payload.propertyType).toBe('Single Family');
    expect(payload.roofType).toBe('Eagle Concrete Tile');
    expect(payload.roofSqf).toBe(2400);
    expect(payload.stories).toBe(1);
    expect(payload.hoa).toBe(false);
    expect(payload.pipelineStage).toBe('cold_lead');
    expect(payload.serviceType).toBe('Roof Replacement');
    expect(payload.sourceType).toBe('team_member');
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
