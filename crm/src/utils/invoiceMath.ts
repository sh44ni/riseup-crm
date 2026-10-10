import type { InvoiceLineItem } from '@/types/client360Types';

export type DiscountType = 'flat' | 'percent';

export interface InvoiceTotals {
  /** Line items with recomputed, rounded row totals (credits are negative). */
  items: InvoiceLineItem[];
  subtotal: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  depositAmount: number;
  balanceAfterDeposit: number;
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Mirrors backend `compute_invoice_totals` so the live totals panel matches what the
 * server stores and the PDF prints. The server remains the source of truth.
 */
export function computeInvoiceTotals(
  lineItems: InvoiceLineItem[],
  opts: {
    taxRate?: number;
    discountType?: DiscountType;
    discountValue?: number;
    deposit?: number;
  } = {}
): InvoiceTotals {
  let gross = 0;
  let taxableGross = 0;
  let lineCredits = 0;

  const items = lineItems.map((raw) => {
    const qty = raw.quantity === undefined || raw.quantity === ('' as unknown) ? 1 : num(raw.quantity);
    const rate = num(raw.unit_price);
    let rowTotal = round2(qty * rate);
    if (raw.item_type === 'discount') {
      rowTotal = -Math.abs(rowTotal);
      lineCredits += Math.abs(rowTotal);
    } else {
      gross += rowTotal;
      if (raw.taxable) taxableGross += rowTotal;
    }
    return { ...raw, quantity: qty, unit_price: rate, total: rowTotal };
  });

  const base = Math.max(0, gross - lineCredits);
  const dv = Math.max(0, num(opts.discountValue));
  const extraDiscount = round2(
    opts.discountType === 'percent' ? (base * Math.min(dv, 100)) / 100 : Math.min(dv, base)
  );
  const discountAmount = round2(lineCredits + extraDiscount);

  const ratio = gross > 0 ? discountAmount / gross : 0;
  const taxableBase = Math.max(0, taxableGross * (1 - ratio));
  const taxRate = Math.max(0, num(opts.taxRate));
  const taxAmount = round2((taxableBase * taxRate) / 100);

  const total = round2(Math.max(0, gross - discountAmount) + taxAmount);
  const depositAmount = round2(Math.min(Math.max(0, num(opts.deposit)), total));

  return {
    items,
    subtotal: round2(gross),
    discountAmount,
    taxRate,
    taxAmount,
    total,
    depositAmount,
    balanceAfterDeposit: round2(total - depositAmount),
  };
}

export const formatMoney = (n: number) =>
  `${n < 0 ? '-' : ''}$${Math.abs(n).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
