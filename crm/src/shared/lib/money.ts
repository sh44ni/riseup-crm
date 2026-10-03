/**
 * Shared Money and Payment Utilities
 * Handles currency formatting, parsing, and auto-splitting across contract & estimate workflows.
 */

export function formatMoney(
  val: string | number | undefined | null,
  options?: { decimals?: boolean }
): string {
  if (val === undefined || val === null || val === '') return '$0.00';
  const n = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^0-9.-]/g, ''));
  if (isNaN(n)) return '$0.00';
  const showDecimals = options?.decimals ?? true;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(n);
}

export function parseMoney(val: string | number | undefined | null): number {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const cleaned = String(val).replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

export function sumPayments(rows: Array<{ amount: string | number }>): number {
  if (!Array.isArray(rows)) return 0;
  return rows.reduce((acc, r) => {
    const raw =
      typeof r.amount === 'number'
        ? r.amount
        : parseFloat(String(r.amount).replace(/[^0-9.]/g, ''));
    return acc + (isNaN(raw) ? 0 : raw);
  }, 0);
}

export interface PaymentScheduleRow {
  number: string;
  description: string;
  amount: string;
}

export function autoSplitPayments(priceInput: string | number): PaymentScheduleRow[] {
  const price =
    typeof priceInput === 'number'
      ? priceInput
      : parseFloat(String(priceInput).replace(/[^0-9.]/g, ''));
  if (isNaN(price) || price <= 0) return [];

  const pct = (p: number) => Math.round(price * p * 100) / 100;

  // Downpayment milestone: $1,000 or 10% if price < $10,000 per CSLB limit
  const p1 = price < 10000 ? pct(0.1) : 1000;
  const rem = price - p1;
  const p2 = Math.round(rem * 0.35 * 100) / 100;
  const p3 = Math.round(rem * 0.35 * 100) / 100;
  const p4 = Math.round((price - p1 - p2 - p3) * 100) / 100;

  return [
    { number: '1', description: 'Contract Execution / Deposit', amount: String(p1) },
    { number: '2', description: 'Materials Delivered to Site', amount: String(p2) },
    { number: '3', description: 'Completion of Roofing Work', amount: String(p3) },
    { number: '4', description: 'Final Inspection & Punch-List', amount: String(p4) },
  ];
}
