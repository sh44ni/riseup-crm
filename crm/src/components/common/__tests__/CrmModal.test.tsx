import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CrmModal } from '../CrmModal';

describe('CrmModal', () => {
  it('does not render when isOpen is false', () => {
    render(
      <CrmModal isOpen={false} onClose={vi.fn()} title="Hidden Modal">
        <div>Modal Content</div>
      </CrmModal>
    );

    expect(screen.queryByText('Hidden Modal')).not.toBeInTheDocument();
    expect(screen.queryByText('Modal Content')).not.toBeInTheDocument();
  });

  it('renders title, subtitle, and children when isOpen is true', () => {
    render(
      <CrmModal
        isOpen={true}
        onClose={vi.fn()}
        title="Active Modal Title"
        subtitle="Subtitle info here"
      >
        <div>Modal Children Content</div>
      </CrmModal>
    );

    expect(screen.getByText('Active Modal Title')).toBeInTheDocument();
    expect(screen.getByText('Subtitle info here')).toBeInTheDocument();
    expect(screen.getByText('Modal Children Content')).toBeInTheDocument();
  });

  it('locks body scroll when open and restores on unmount', () => {
    const { unmount } = render(
      <CrmModal isOpen={true} onClose={vi.fn()} title="Scroll Lock Modal">
        <div>Content</div>
      </CrmModal>
    );

    expect(document.body.style.overflow).toBe('hidden');

    unmount();
    expect(document.body.style.overflow).toBe('');
  });

  it('triggers onClose when pressing Escape key', () => {
    const handleClose = vi.fn();
    render(
      <CrmModal isOpen={true} onClose={handleClose} title="Escape Test">
        <div>Content</div>
      </CrmModal>
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('triggers onClose when clicking the backdrop overlay', () => {
    const handleClose = vi.fn();
    render(
      <CrmModal isOpen={true} onClose={handleClose} title="Backdrop Test">
        <div data-testid="modal-content">Content</div>
      </CrmModal>
    );

    // Click backdrop
    const backdrop = screen.getByText('Backdrop Test').closest('.fixed.inset-0');
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop!);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('does not trigger onClose when clicking inside the modal card', () => {
    const handleClose = vi.fn();
    render(
      <CrmModal isOpen={true} onClose={handleClose} title="Card Click Test">
        <div data-testid="inner-content">Inner Content</div>
      </CrmModal>
    );

    const inner = screen.getByTestId('inner-content');
    fireEvent.click(inner);
    expect(handleClose).not.toHaveBeenCalled();
  });
});
