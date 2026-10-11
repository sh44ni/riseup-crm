import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OWNER_ONLY_EDIT_REASON, SignatureAccessSelector } from '../SignatureAccessSelector';

describe('SignatureAccessSelector', () => {
  it('renders the four access levels with the current one checked', () => {
    render(<SignatureAccessSelector value="use" onChange={() => {}} />);
    expect(screen.getByRole('radiogroup', { name: /signature access/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /no access/i })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: /can view/i })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: /can use/i })).toBeChecked();
    expect(screen.getByRole('radio', { name: /can edit/i })).not.toBeChecked();
  });

  it('calls onChange with the selected level', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<SignatureAccessSelector value="none" onChange={onChange} />);
    await user.click(screen.getByRole('radio', { name: /can view/i }));
    expect(onChange).toHaveBeenCalledWith('view');
  });

  it('locks only the edit option for non-owners', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<SignatureAccessSelector value="view" onChange={onChange} disableEdit />);
    const edit = screen.getByRole('radio', { name: /can edit/i });
    expect(edit).toBeDisabled();
    expect(edit.closest('label')).toHaveAttribute('title', OWNER_ONLY_EDIT_REASON);
    expect(screen.getByRole('radio', { name: /can use/i })).toBeEnabled();
    await user.click(edit);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('keeps an already-granted edit level visible as checked even when disableEdit is set', () => {
    render(<SignatureAccessSelector value="edit" onChange={() => {}} disableEdit />);
    const edit = screen.getByRole('radio', { name: /can edit/i });
    expect(edit).toBeChecked();
    expect(edit).toBeEnabled();
  });

  it('disables every option when fully disabled', () => {
    render(<SignatureAccessSelector value="edit" onChange={() => {}} disabled lockedReason="Owner role" />);
    for (const radio of screen.getAllByRole('radio')) {
      expect(radio).toBeDisabled();
    }
  });
});
