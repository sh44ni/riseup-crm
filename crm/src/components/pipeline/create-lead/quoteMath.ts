export interface LiveQuoteResult {
  sqft: number | null;
  low: number | null;
  high: number | null;
  midpoint: number | null;
  monthly: number | null;
  term: number;
}

export function calculateLiveQuote(rawSqfStr: string, serviceName: string): LiveQuoteResult {
  const rawSqf = parseInt(rawSqfStr, 10);
  const hasSize = !isNaN(rawSqf) && rawSqf > 0;
  const sqft = hasSize ? rawSqf : 0;
  const svc = (serviceName || '').toLowerCase();

  let lowRate = 4.0;
  let highRate = 6.2;
  let baseLow = 500;
  let baseHigh = 950;
  let term = 60;

  if (svc.includes('repair') || svc.includes('leak')) {
    lowRate = 0.4;
    highRate = 0.8;
    baseLow = 100;
    baseHigh = 600;
    term = 18;
  } else if (svc.includes('commercial') || svc.includes('flat')) {
    lowRate = 5.0;
    highRate = 8.0;
    baseLow = 2250;
    baseHigh = 4000;
    term = 60;
  } else if (svc.includes('solar')) {
    lowRate = 7.5;
    highRate = 11.5;
    baseLow = 1500;
    baseHigh = 3000;
    term = 120;
  }

  if (!hasSize) {
    return { sqft: null, low: null, high: null, midpoint: null, monthly: null, term };
  }

  const low = Math.round(baseLow + sqft * lowRate);
  const high = Math.round(baseHigh + sqft * highRate);
  const midpoint = Math.round((low + high) / 2);
  const monthly = Math.round(midpoint / term);

  return { sqft, low, high, midpoint, monthly, term };
}
