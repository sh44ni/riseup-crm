import { describe, it, expect } from 'vitest';
import { formatMoney, sumPayments, autoSplitPayments } from '../../components/pipeline/contract/contractTypes';

describe('formatMoney', () => {
  it('formats whole dollar amounts with commas and no cents', () => {
    expect(formatMoney('1000')).toBe('$1,000.00');
    expect(formatMoney(25000)).toBe('$25,000.00');
  });

  it('returns $0.00 for invalid/empty input', () => {
    expect(formatMoney('abc')).toBe('$0.00');
    expect(formatMoney('')).toBe('$0.00');
  });
});

describe('sumPayments', () => {
  it('sums numeric payment amounts correctly', () => {
    const rows = [
      { number: '1', description: 'Dep', amount: '1000' },
      { number: '2', description: 'Mat', amount: '2000' },
    ];
    expect(sumPayments(rows)).toBe(3000);
  });

  it('ignores non-numeric amounts', () => {
    const rows = [
      { number: '1', description: 'Dep', amount: '1000' },
      { number: '2', description: 'Mat', amount: 'abc' },
    ];
    expect(sumPayments(rows)).toBe(1000);
  });

  it('returns 0 for empty array', () => {
    expect(sumPayments([])).toBe(0);
  });
});

describe('autoSplitPayments', () => {
  it('generates 4 payment rows for a valid price', () => {
    const rows = autoSplitPayments('20000');
    expect(rows).toHaveLength(4);
    expect(rows[0].number).toBe('1');
    expect(rows[1].number).toBe('2');
    expect(rows[2].number).toBe('3');
    expect(rows[3].number).toBe('4');
  });

  it('sum of payment rows equals the total price', () => {
    const rows = autoSplitPayments('15000');
    const total = sumPayments(rows);
    expect(total).toBe(15000);
  });

  it('first payment is $1000 deposit for prices >= $10,000', () => {
    const rows = autoSplitPayments('15000');
    expect(rows[0].amount).toBe('1000');
  });

  it('first payment is 10% for prices under $10,000', () => {
    const rows = autoSplitPayments('8000');
    expect(rows[0].amount).toBe('800');
  });

  it('returns empty array for invalid price string', () => {
    expect(autoSplitPayments('abc')).toEqual([]);
  });

  it('returns empty array for price of 0', () => {
    expect(autoSplitPayments('0')).toEqual([]);
  });
});
