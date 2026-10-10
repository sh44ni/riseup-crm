import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/render';
import { CreateInvoiceModal } from '../CreateInvoiceModal';
import * as invoicesApi from '@/api/invoicesApi';
import { Client360Record } from '@/types/client360Types';

const mockClient: Client360Record = {
  id: '42',
  name: 'Bryce Kirklen',
  phone: '(760) 555-1234',
  email: 'bryce.kirklen@example.com',
  address: '1234 Ocean View Way',
  city: 'Carlsbad',
  zip: '92008',
  status: 'active_job',
  statusLabel: 'Active Job',
  assignedRep: { name: 'Adam Rep', role: 'Sales Rep', badge: 'Certified' },
  originSource: 'Website Inbound',
  roofSpecs: {
    address: '1234 Ocean View Way',
    cityZip: 'Carlsbad, CA 92008',
    roofMaterial: 'Architectural Shingle',
    roofAreaSqFt: 2800,
    roofSquares: 28,
    stories: '2',
    roofAgeYears: 18,
    hoaCommunity: 'No',
    originRepName: 'Adam Rep',
  },
  billingSummary: {
    totalBilled: 15000,
    collectedCash: 7500,
    pendingDeposit: 7500,
    invoicesOnFileCount: 1,
    paymentHealthStatus: 'deposit_pending',
    paymentHealthMessage: '$7,500 Deposit Invoice Due',
    invoices: [],
  },
  warrantySummary: {
    warrantiesCount: 0,
    hasCertificate: false,
    statusText: 'Pending Installation',
    certificates: [],
  },
  tasks: [],
  timeline: [],
  quotes: [],
};

describe('CreateInvoiceModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('does not render when isOpen is false', () => {
    const { container } = renderWithProviders(
      <CreateInvoiceModal isOpen={false} onClose={vi.fn()} client={mockClient} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders pre-populated client details and CSLB badge when isOpen is true', () => {
    renderWithProviders(
      <CreateInvoiceModal isOpen={true} onClose={vi.fn()} client={mockClient} />
    );

    expect(screen.getByRole('heading', { name: /create invoice/i })).toBeInTheDocument();
    expect(screen.getByText('CSLB #1096492')).toBeInTheDocument();
    expect(screen.getByText('Bryce Kirklen')).toBeInTheDocument();
    expect(screen.getByText('bryce.kirklen@example.com')).toBeInTheDocument();
    expect(screen.getByText(/1234 ocean view way, carlsbad, 92008/i)).toBeInTheDocument();
    expect(screen.getAllByText(/itemized services & materials/i)[0]).toBeInTheDocument();
  });


  const addCatalogItem = async (user: ReturnType<typeof userEvent.setup>, name: RegExp) => {
    await user.click(screen.getByRole('button', { name: /add from catalog/i }));
    await user.click(screen.getByRole('button', { name }));
  };

  it('shows error if submitted with missing service description', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <CreateInvoiceModal isOpen={true} onClose={vi.fn()} client={mockClient} />
    );

    await addCatalogItem(user, /architectural shingle/i);
    await user.clear(screen.getByLabelText(/item 1 description/i));

    await user.click(screen.getByRole('button', { name: /save draft invoice/i }));

    expect(
      await screen.findByText(/all line items must have a service description/i)
    ).toBeInTheDocument();
  });

  it('supports multiple items and computes discount, tax and deposit in the summary', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <CreateInvoiceModal isOpen={true} onClose={vi.fn()} client={mockClient} />
    );

    await addCatalogItem(user, /architectural shingle/i); // $12,500 (non-taxable)
    await addCatalogItem(user, /premium synthetic underlayment/i); // $1,850 (taxable)

    expect(screen.getByLabelText(/item 2 description/i)).toBeInTheDocument();
    expect(screen.getByText(/2 items on this invoice/i)).toBeInTheDocument();
    expect(screen.getAllByText('$14,350.00').length).toBeGreaterThan(0);

    await user.click(screen.getByLabelText(/apply tax/i));
    await user.clear(screen.getByLabelText(/tax rate percent/i));
    await user.type(screen.getByLabelText(/tax rate percent/i), '10');
    // tax on taxable 1,850 only = 185 → total 14,535
    expect(screen.getAllByText('$14,535.00').length).toBeGreaterThan(0);

    await user.click(screen.getByLabelText(/request a deposit now/i));
    await user.click(screen.getByRole('button', { name: '50%' }));
    expect(screen.getByLabelText(/deposit amount/i)).toHaveValue(7267.5);
  });

  it('removes a row and toggles accepted payment methods', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <CreateInvoiceModal isOpen={true} onClose={vi.fn()} client={mockClient} />
    );

    await user.click(screen.getByRole('button', { name: /add item/i }));
    expect(screen.getByLabelText(/item 2 description/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /remove item 2/i }));
    expect(screen.queryByLabelText(/item 2 description/i)).not.toBeInTheDocument();

    const before = screen.getAllByTestId('payment-method').length;
    await user.selectOptions(screen.getByLabelText(/add payment method/i), 'zelle');
    expect(screen.getAllByTestId('payment-method')).toHaveLength(before + 1);
    await user.click(screen.getByRole('button', { name: new RegExp('remove payment method ' + (before + 1), 'i') }));
    expect(screen.getAllByTestId('payment-method')).toHaveLength(before);
  });

  it('calls createClientInvoice with line items, methods and totals on submit', async () => {
    const user = userEvent.setup();
    const handleCreated = vi.fn();
    const mockInvoiceResponse = {
      ok: true,
      invoice: {
        id: 101,
        invoice_number: 'INV-2026-1001',
        amount: 12500,
        balance: 12500,
        pdf_url: '/static/uploads/invoices/Invoice_INV-2026-1001.pdf',
      },
    };

    vi.spyOn(invoicesApi, 'createClientInvoice').mockResolvedValue(mockInvoiceResponse as any);
    vi.spyOn(invoicesApi, 'renderInvoicePdf').mockResolvedValue({
      ok: true,
      pdfUrl: '/static/uploads/invoices/Invoice_INV-2026-1001.pdf',
      url: '/static/uploads/invoices/Invoice_INV-2026-1001.pdf',
      filename: 'Invoice_INV-2026-1001.pdf',
    });

    renderWithProviders(
      <CreateInvoiceModal
        isOpen={true}
        onClose={vi.fn()}
        client={mockClient}
        onInvoiceCreated={handleCreated}
      />
    );

    await addCatalogItem(user, /architectural shingle/i);
    await user.selectOptions(screen.getByLabelText(/add payment method/i), 'zelle');
    await user.click(screen.getByRole('button', { name: /save draft invoice/i }));

    await waitFor(() => {
      expect(invoicesApi.createClientInvoice).toHaveBeenCalledWith(
        '42',
        expect.objectContaining({
          amount: 12500,
          milestoneName: expect.any(String),
          acceptedMethods: expect.arrayContaining([expect.objectContaining({ type: 'check' }), expect.objectContaining({ type: 'zelle' })]),
          taxRate: 0,
          lineItems: expect.arrayContaining([
            expect.objectContaining({ unit_price: 12500, total: 12500, item_type: 'service' }),
          ]),
        })
      );
      expect(handleCreated).toHaveBeenCalledWith(mockInvoiceResponse.invoice);
    });

    expect(await screen.findByText(/invoice inv-2026-1001 created successfully/i)).toBeInTheDocument();
  });
});
