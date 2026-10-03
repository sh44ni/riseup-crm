import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BackwardMoveModal, BackwardMoveWarning } from '../BackwardMoveModal';

describe('BackwardMoveModal', () => {
  const sampleWarning: BackwardMoveWarning = {
    dealName: 'John Doe Residence',
    fromTitle: 'Estimate Sent',
    toTitle: 'Contacted',
    fromStep: 4,
    toStep: 2,
  };

  it('renders nothing when warning is null', () => {
    const { container } = render(<BackwardMoveModal warning={null} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders modal with warning details when warning is provided', () => {
    render(<BackwardMoveModal warning={sampleWarning} onClose={vi.fn()} />);

    expect(screen.getByText('Backward Move Not Permitted')).toBeInTheDocument();
    expect(screen.getByText('Sales Pipeline Progression Policy')).toBeInTheDocument();
    expect(screen.getByText('John Doe Residence')).toBeInTheDocument();
    expect(screen.getByText('Step 4: Estimate Sent')).toBeInTheDocument();
    expect(screen.getByText('Step 2: Contacted')).toBeInTheDocument();
  });

  it('calls onClose when clicking close button', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();
    render(<BackwardMoveModal warning={sampleWarning} onClose={handleClose} />);

    const closeBtn = screen.getByRole('button', { name: /close dialog/i });
    await user.click(closeBtn);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when clicking backdrop', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();
    render(<BackwardMoveModal warning={sampleWarning} onClose={handleClose} />);

    const dialog = screen.getByRole('dialog');
    await user.click(dialog);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when clicking modal content', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();
    render(<BackwardMoveModal warning={sampleWarning} onClose={handleClose} />);

    const content = screen.getByText('Backward Move Not Permitted');
    await user.click(content);

    expect(handleClose).not.toHaveBeenCalled();
  });

  it('calls onClose when pressing Escape key', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();
    render(<BackwardMoveModal warning={sampleWarning} onClose={handleClose} />);

    await user.keyboard('{Escape}');

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when pressing Enter key', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();
    render(<BackwardMoveModal warning={sampleWarning} onClose={handleClose} />);

    await user.keyboard('{Enter}');

    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
