import { describe, it, expect } from 'vitest';
import { computeInvoiceTotals } from '../invoiceMath';

const item = (over: any = {}) => ({ description: 'x', quantity: 1, unit_price: 100, total: 0, ...over });

describe('computeInvoiceTotals', () => {
  it('sums multiple items', () => {
    const t = computeInvoiceTotals([item({ unit_price: 100 }), item({ quantity: 2, unit_price: 50 })]);
    expect(t.subtotal).toBe(200);
    expect(t.total).toBe(200);
  });

  it('treats discount rows as negative credits', () => {
    const t = computeInvoiceTotals([item({ unit_price: 1000 }), item({ item_type: 'discount', unit_price: 100 })]);
    expect(t.items[1].total).toBe(-100);
    expect(t.discountAmount).toBe(100);
    expect(t.total).toBe(900);
  });

  it('applies percent discount then tax only on taxable items', () => {
    const t = computeInvoiceTotals(
      [item({ unit_price: 800 }), item({ unit_price: 200, taxable: true })],
      { discountType: 'percent', discountValue: 10, taxRate: 10 }
    );
    // gross 1000, discount 100, taxable base 200 * 0.9 = 180, tax 18
    expect(t.discountAmount).toBe(100);
    expect(t.taxAmount).toBe(18);
    expect(t.total).toBe(918);
  });

  it('clamps flat discount and deposit', () => {
    const t = computeInvoiceTotals([item({ unit_price: 100 })], { discountValue: 999, deposit: 500 });
    expect(t.total).toBe(0);
    expect(t.depositAmount).toBe(0);
    const u = computeInvoiceTotals([item({ unit_price: 100 })], { deposit: 500 });
    expect(u.depositAmount).toBe(100);
  });

  it('tolerates string inputs from form fields', () => {
    const t = computeInvoiceTotals([item({ quantity: '2' as any, unit_price: '12.5' as any })]);
    expect(t.total).toBe(25);
  });
});
