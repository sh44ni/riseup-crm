import { describe, it, expect } from 'vitest';

describe('Financial Math — Integer Cents', () => {
  it('eliminates floating point error in addition', () => {
    // Prove the bug exists without cents:
    const floatResult = 0.1 + 0.2;
    expect(floatResult).not.toBe(0.3);

    // Prove cents approach is correct:
    const centResult = Math.round(0.1 * 100) + Math.round(0.2 * 100);
    expect(centResult).toBe(30);
  });

  it('margin calculation in cents avoids rounding errors', () => {
    const costCents = 890000; // $8900.00 in cents
    const margin = 0.30;
    const priceCents = Math.round(costCents / (1.0 - margin));
    // Should be $12,714.29 = 1,271,429 cents
    expect(priceCents).toBe(1271429);
    // As display dollars:
    expect((priceCents / 100).toFixed(2)).toBe('12714.29');
  });

  it('monthly payment calculation in cents', () => {
    const priceCents = 1271400; // $12,714.00
    const months = 60;
    const monthly = Math.round(priceCents / months);
    expect(monthly).toBe(21190); // $211.90
  });

  it('display conversion from cents to dollars is exact', () => {
    const cents = 2687000; // $26,870.00
    const dollars = cents / 100;
    expect(dollars).toBe(26870);
    expect(Number.isInteger(dollars)).toBe(true);
  });

  it('handles zero correctly', () => {
    expect(Math.round(0 * 100)).toBe(0);
    expect(0 / 100).toBe(0);
  });
});
