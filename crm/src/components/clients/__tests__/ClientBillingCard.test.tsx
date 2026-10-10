import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/render';
import { ClientBillingCard } from '../ClientBillingCard';
import type { BillingSummary, ClientInvoice } from '@/types/client360Types';

const inv = (id: number, over: Partial<ClientInvoice> = {}): ClientInvoice => ({
  id: String(id),
  invoiceNumber: `INV-2026-00${id}`,
  date: 'Oct 1, 2026',
  amount: 1000 * id,
  balance: 1000 * id,
  status: 'sent',
  description: `Milestone ${id}`,
  ...over,
});

const billing = (invoices: ClientInvoice[]): BillingSummary => ({
  totalBilled: 6000,
  collectedCash: 1000,
  pendingDeposit: 0,
  invoicesOnFileCount: invoices.length,
  paymentHealthStatus: 'deposit_pending',
  paymentHealthMessage: '$5,000 Balance Pending',
  invoices,
});

describe('ClientBillingCard recent invoices', () => {
  it('shows only the two newest invoices', () => {
    renderWithProviders(
      <ClientBillingCard billing={billing([inv(1), inv(3), inv(2)])} onViewAll={vi.fn()} />
    );
    expect(screen.getByText('INV-2026-003')).toBeInTheDocument();
    expect(screen.getByText('INV-2026-002')).toBeInTheDocument();
    expect(screen.queryByText('INV-2026-001')).not.toBeInTheDocument();
    expect(screen.getByText('+1 more')).toBeInTheDocument();
  });

  it('shows an empty state with create CTA when there are no invoices', async () => {
    const onCreate = vi.fn();
    renderWithProviders(
      <ClientBillingCard billing={billing([])} onOpenCreateInvoice={onCreate} />
    );
    expect(screen.getByText(/no invoices yet/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /create first invoice/i }));
    expect(onCreate).toHaveBeenCalled();
  });

  it('offers record payment only for invoices with a balance', async () => {
    const onPay = vi.fn();
    renderWithProviders(
      <ClientBillingCard
        billing={billing([inv(2, { balance: 0, status: 'paid' }), inv(3)])}
        onRecordPayment={onPay}
      />
    );
    const payButtons = screen.getAllByRole('button', { name: /record payment for/i });
    expect(payButtons).toHaveLength(1);
    await userEvent.click(payButtons[0]);
    expect(onPay).toHaveBeenCalledWith(expect.objectContaining({ invoiceNumber: 'INV-2026-003' }));
  });
});
