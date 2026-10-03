import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/render';
import { ProfileSettingsModal } from '../ProfileSettingsModal';
import { api } from '@/lib/api';

describe('ProfileSettingsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when isOpen is false', () => {
    const { container } = renderWithProviders(
      <ProfileSettingsModal isOpen={false} onClose={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders with active user initial data', () => {
    renderWithProviders(
      <ProfileSettingsModal isOpen={true} onClose={vi.fn()} />,
      {
        user: {
          id: 1,
          name: 'Jane Doe',
          email: 'jane.doe@example.com',
          phone: '(760) 555-0123',
          role: 'owner',
        },
      }
    );

    expect(screen.getByText('Profile & Security Studio')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Jane Doe')).toBeInTheDocument();
    expect(screen.getByDisplayValue('(760) 555-0123')).toBeInTheDocument();
  });

  it('saves updated profile and calls api.updateProfile', async () => {
    const user = userEvent.setup();
    const updateProfileSpy = vi.spyOn(api, 'updateProfile').mockResolvedValueOnce({ ok: true } as any);

    renderWithProviders(
      <ProfileSettingsModal isOpen={true} onClose={vi.fn()} />,
      {
        user: {
          id: 1,
          name: 'Jane Doe',
          email: 'jane.doe@example.com',
          role: 'owner',
        },
      }
    );

    const nameInput = screen.getByDisplayValue('Jane Doe');
    const saveBtn = screen.getByRole('button', { name: /save contact changes/i });

    await user.clear(nameInput);
    await user.type(nameInput, 'Jane Smith');
    await user.click(saveBtn);

    await waitFor(() => {
      expect(updateProfileSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Jane Smith',
        })
      );
    });

    expect(nameInput).toHaveValue('Jane Smith');
  });
});
