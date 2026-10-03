import { NextResponse } from 'next/server';

const INITIAL_SERVICES = [
  {
    id: 1,
    slug: 'residential',
    name: 'Tile / Shingle Roof',
    shortLabel: 'Tile / Shingle',
    iconKey: 'home',
    badgeLabel: 'Popular',
    sortOrder: 1,
    isActive: true,
    pricing: {
      pricePerSqftLow: 4.00,
      pricePerSqftHigh: 6.20,
      baseFeeLow: 500,
      baseFeeHigh: 950,
      minSqft: 800,
      maxSqft: 8000,
      aprAvailable: true,
      financingApr: 0,
      financingTermMonths: 60,
    },
    presets: [
      { id: 1, label: '< 2,000 sq ft', sqftValue: 1750, sortOrder: 1 },
      { id: 2, label: '2,000 – 3,500 sq ft', sqftValue: 2750, sortOrder: 2 },
      { id: 3, label: '3,500+ sq ft', sqftValue: 4250, sortOrder: 3 },
    ],
  },
  {
    id: 2,
    slug: 'repair',
    name: 'Leak & Tile Repair',
    shortLabel: 'Leak & Repair',
    iconKey: 'wrench',
    badgeLabel: 'Same-Day',
    sortOrder: 2,
    isActive: true,
    pricing: {
      pricePerSqftLow: 0.40,
      pricePerSqftHigh: 0.80,
      baseFeeLow: 100,
      baseFeeHigh: 600,
      minSqft: 500,
      maxSqft: 8000,
      aprAvailable: true,
      financingApr: 0,
      financingTermMonths: 18,
    },
    presets: [
      { id: 1, label: '< 2,000 sq ft', sqftValue: 1750, sortOrder: 1 },
      { id: 2, label: '2,000 – 3,500 sq ft', sqftValue: 2750, sortOrder: 2 },
      { id: 3, label: '3,500+ sq ft', sqftValue: 4250, sortOrder: 3 },
    ],
  },
  {
    id: 3,
    slug: 'commercial',
    name: 'Commercial Flat Roof',
    shortLabel: 'Commercial Flat',
    iconKey: 'building',
    badgeLabel: 'TPO / BUR',
    sortOrder: 3,
    isActive: true,
    pricing: {
      pricePerSqftLow: 5.00,
      pricePerSqftHigh: 8.00,
      baseFeeLow: 2250,
      baseFeeHigh: 4000,
      minSqft: 1000,
      maxSqft: 15000,
      aprAvailable: true,
      financingApr: 0,
      financingTermMonths: 60,
    },
    presets: [
      { id: 1, label: '< 2,000 sq ft', sqftValue: 1750, sortOrder: 1 },
      { id: 2, label: '2,000 – 3,500 sq ft', sqftValue: 2750, sortOrder: 2 },
      { id: 3, label: '3,500+ sq ft', sqftValue: 4250, sortOrder: 3 },
    ],
  },
  {
    id: 4,
    slug: 'solar',
    name: 'Solar + Roofing',
    shortLabel: 'Solar + Roof',
    iconKey: 'sun',
    badgeLabel: 'Save 30%',
    sortOrder: 4,
    isActive: true,
    pricing: {
      pricePerSqftLow: 7.50,
      pricePerSqftHigh: 11.50,
      baseFeeLow: 1500,
      baseFeeHigh: 3000,
      minSqft: 1000,
      maxSqft: 10000,
      aprAvailable: true,
      financingApr: 0,
      financingTermMonths: 120,
    },
    presets: [
      { id: 1, label: '< 2,000 sq ft', sqftValue: 1750, sortOrder: 1 },
      { id: 2, label: '2,000 – 3,500 sq ft', sqftValue: 2750, sortOrder: 2 },
      { id: 3, label: '3,500+ sq ft', sqftValue: 4250, sortOrder: 3 },
    ],
  },
];

function getBackendUrl(): string {
  return (
    process.env.FASTAPI_BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    (process.env.USE_FASTAPI === 'true' ? 'http://127.0.0.1:8000' : 'http://127.0.0.1:8000')
  );
}

function getApiKey(): string {
  // No hard-coded fallback: the key must be supplied via the environment.
  return process.env.RISEUP_API_KEY || '';
}

export async function GET() {
  try {
    const backendUrl = getBackendUrl();
    const apiKey = getApiKey();

    const res = await fetch(`${backendUrl}/api/estimator/config`, {
      next: { revalidate: 60 },
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.ok && Array.isArray(data.services) && data.services.length > 0) {
        return NextResponse.json(data);
      }
    }
  } catch (err) {
    console.warn('[Estimator Route] Failed to fetch live config from backend, using fallback:', err);
  }

  // Graceful fallback response
  return NextResponse.json({
    ok: true,
    services: INITIAL_SERVICES,
    fallback: true,
  });
}
