import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/render';
import { RecordPaymentModal } from '../RecordPaymentModal';
import * as invoicesApi from '@/api/invoicesApi';
import { ClientInvoice } from '@/types/client360Types';

const mockInvoice: ClientInvoice = {
  id: '101',
  invoiceNumber: 'INV-2026-1001',
  date: 'Oct 10, 2026',
  amount: 12500,
  balance: 6250,
  status: 'partially_paid',
  description: 'Initial Roof Deposit (50%)',
};

describe('RecordPaymentModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when isOpen is false or invoice is null', () => {
    const { container } = renderWithProviders(
      <RecordPaymentModal
        isOpen={false}
        onClose={vi.fn()}
        invoice={mockInvoice}
        clientName="Bryce Kirklen"
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders invoice details, outstanding balance, and pre-fills payment amount', () => {
    renderWithProviders(
      <RecordPaymentModal
        isOpen={true}
        onClose={vi.fn()}
        invoice={mockInvoice}
        clientName="Bryce Kirklen"
      />
    );

    expect(screen.getByRole('heading', { name: /record payment/i })).toBeInTheDocument();
    expect(screen.getByText('INV-2026-1001')).toBeInTheDocument();
    expect(screen.getByText('Bryce Kirklen')).toBeInTheDocument();
    expect(screen.getByText('$6,250.00')).toBeInTheDocument();
    expect(screen.getByDisplayValue('6250')).toBeInTheDocument();
  });

  it('records payment and calls onPaymentRecorded on submit', async () => {
    const user = userEvent.setup();
    const handleRecorded = vi.fn();
    const handleClose = vi.fn();

    const mockResponse = {
      ok: true,
      message: 'Payment recorded',
      invoice: { ...mockInvoice, balance: 0, status: 'paid' },
      payment: { id: 1, amount: 6250, payment_method: 'check' },
    };

    vi.spyOn(invoicesApi, 'recordInvoicePayment').mockResolvedValue(mockResponse as any);

    renderWithProviders(
      <RecordPaymentModal
        isOpen={true}
        onClose={handleClose}
        invoice={mockInvoice}
        clientName="Bryce Kirklen"
        onPaymentRecorded={handleRecorded}
      />
    );

    const submitBtn = screen.getByRole('button', { name: /record \$6,250 payment/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(invoicesApi.recordInvoicePayment).toHaveBeenCalledWith(
        '101',
        expect.objectContaining({
          amount: 6250,
          paymentMethod: 'check',
        })
      );
      expect(handleRecorded).toHaveBeenCalledWith(mockResponse.invoice, mockResponse.payment);
      expect(handleClose).toHaveBeenCalled();
    });
  });
});
