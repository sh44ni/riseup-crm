import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  sortClients,
  getClientProjectValue,
  getSavedClientSort,
  saveClientSort,
  getClientSortStorageKey,
  CLIENT_SORT_OPTIONS,
  DEFAULT_CLIENT_SORT,
} from '../clientSortUtils';
import { Client360Record } from '@/types/client360Types';

const mockClients: Client360Record[] = [
  {
    id: '1',
    name: 'Carlos Davis',
    phone: '555-0101',
    email: 'carlos@example.com',
    address: '100 Main St',
    city: 'San Diego',
    zip: '92101',
    status: 'completed',
    statusLabel: 'Lifetime Client • 50-Year Warranty',
    assignedRep: { name: 'Zack Miller', role: 'Sales Rep', badge: 'Certified' },
    originSource: 'Website',
    roofSpecs: {
      address: '100 Main St',
      cityZip: 'San Diego 92101',
      roofMaterial: 'Tile',
      roofAreaSqFt: 3200,
      roofSquares: 32,
      stories: '2-Story',
      roofAgeYears: 10,
      hoaCommunity: 'No HOA',
      originRepName: 'Zack Miller',
    },
    billingSummary: {
      totalBilled: 35000,
      collectedCash: 35000,
      pendingDeposit: 0,
      invoicesOnFileCount: 2,
      paymentHealthStatus: 'current_and_paid',
      paymentHealthMessage: 'Paid in full',
      invoices: [],
    },
    warrantySummary: { warrantiesCount: 1, hasCertificate: true, statusText: 'Active', certificates: [] },
    tasks: [],
    timeline: [],
    quotes: [],
    createdAt: '2026-01-10T10:00:00Z',
  },
  {
    id: '2',
    name: 'Alice Anderson',
    phone: '555-0102',
    email: 'alice@example.com',
    address: '200 Ocean Ave',
    city: 'Oceanside',
    zip: '92054',
    status: 'active_job',
    statusLabel: 'Existing Client • Active Jobsite',
    assignedRep: { name: 'Bob Roberts', role: 'Sales Rep', badge: 'Certified' },
    originSource: 'Referral',
    roofSpecs: {
      address: '200 Ocean Ave',
      cityZip: 'Oceanside 92054',
      roofMaterial: 'Shingle',
      roofAreaSqFt: 1800,
      roofSquares: 18,
      stories: '1-Story',
      roofAgeYears: 5,
      hoaCommunity: 'Yes (HOA)',
      originRepName: 'Bob Roberts',
    },
    activeJob: {
      jobId: 'JOB-2',
      title: 'Roof Replacement',
      stage: 'IN PROGRESS',
      contractValue: 18500,
      crewLead: 'Mike',
      scheduledStart: '2026-10-01',
    },
    billingSummary: {
      totalBilled: 18500,
      collectedCash: 5000,
      pendingDeposit: 0,
      invoicesOnFileCount: 1,
      paymentHealthStatus: 'current_and_paid',
      paymentHealthMessage: 'Deposit paid',
      invoices: [],
    },
    warrantySummary: { warrantiesCount: 0, hasCertificate: false, statusText: 'Pending', certificates: [] },
    tasks: [],
    timeline: [],
    quotes: [],
    createdAt: '2026-03-15T12:00:00Z',
  },
  {
    id: '3',
    name: 'Brian Brown',
    phone: '555-0103',
    email: 'brian@example.com',
    address: '300 Hill Rd',
    city: 'Carlsbad',
    zip: '92008',
    status: 'closed_lost',
    statusLabel: 'Closed Lost • Win-Back Opportunity',
    assignedRep: { name: 'Alice Adams', role: 'Sales Rep', badge: 'Certified' },
    originSource: 'Inbound',
    roofSpecs: {
      address: '300 Hill Rd',
      cityZip: 'Carlsbad 92008',
      roofMaterial: 'Metal',
      roofAreaSqFt: 2500,
      roofSquares: 25,
      stories: '2-Story',
      roofAgeYears: 15,
      hoaCommunity: 'No HOA',
      originRepName: 'Alice Adams',
    },
    billingSummary: {
      totalBilled: 0,
      collectedCash: 0,
      pendingDeposit: 0,
      invoicesOnFileCount: 0,
      paymentHealthStatus: 'no_billing_archived',
      paymentHealthMessage: 'None',
      invoices: [],
    },
    warrantySummary: { warrantiesCount: 0, hasCertificate: false, statusText: 'None', certificates: [] },
    tasks: [],
    timeline: [],
    quotes: [{ id: 'q1', quoteNumber: 'Q-1', title: 'Quote', amount: 22000, status: 'declined', date: '2026-02-01' }],
    createdAt: '2026-02-20T08:00:00Z',
  },
];

describe('clientSortUtils', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('sorts by homeowner name ascending and descending', () => {
    const asc = sortClients(mockClients, { field: 'name', direction: 'asc' });
    expect(asc.map((c) => c.name)).toEqual(['Alice Anderson', 'Brian Brown', 'Carlos Davis']);

    const desc = sortClients(mockClients, { field: 'name', direction: 'desc' });
    expect(desc.map((c) => c.name)).toEqual(['Carlos Davis', 'Brian Brown', 'Alice Anderson']);
  });

  it('sorts by assigned rep ascending and descending', () => {
    const asc = sortClients(mockClients, { field: 'assignedRep', direction: 'asc' });
    expect(asc.map((c) => c.assignedRep.name)).toEqual(['Alice Adams', 'Bob Roberts', 'Zack Miller']);

    const desc = sortClients(mockClients, { field: 'assignedRep', direction: 'desc' });
    expect(desc.map((c) => c.assignedRep.name)).toEqual(['Zack Miller', 'Bob Roberts', 'Alice Adams']);
  });

  it('sorts by status ascending and descending', () => {
    const asc = sortClients(mockClients, { field: 'status', direction: 'asc' });
    expect(asc.map((c) => c.status)).toEqual(['closed_lost', 'active_job', 'completed']);

    const desc = sortClients(mockClients, { field: 'status', direction: 'desc' });
    expect(desc.map((c) => c.status)).toEqual(['completed', 'active_job', 'closed_lost']);
  });

  it('sorts by createdAt / recently added', () => {
    // Newest first (desc)
    const newest = sortClients(mockClients, { field: 'createdAt', direction: 'desc' });
    expect(newest.map((c) => c.name)).toEqual(['Alice Anderson', 'Brian Brown', 'Carlos Davis']);

    // Oldest first (asc)
    const oldest = sortClients(mockClients, { field: 'createdAt', direction: 'asc' });
    expect(oldest.map((c) => c.name)).toEqual(['Carlos Davis', 'Brian Brown', 'Alice Anderson']);
  });

  it('sorts by project value / revenue', () => {
    // Highest value first (desc)
    const highest = sortClients(mockClients, { field: 'revenue', direction: 'desc' });
    expect(highest.map((c) => c.name)).toEqual(['Carlos Davis', 'Brian Brown', 'Alice Anderson']);
    expect(getClientProjectValue(highest[0])).toBe(35000);
    expect(getClientProjectValue(highest[1])).toBe(22000);
    expect(getClientProjectValue(highest[2])).toBe(18500);

    // Lowest value first (asc)
    const lowest = sortClients(mockClients, { field: 'revenue', direction: 'asc' });
    expect(lowest.map((c) => c.name)).toEqual(['Alice Anderson', 'Brian Brown', 'Carlos Davis']);
  });

  it('sorts by city ascending and descending', () => {
    const asc = sortClients(mockClients, { field: 'city', direction: 'asc' });
    expect(asc.map((c) => c.city)).toEqual(['Carlsbad', 'Oceanside', 'San Diego']);

    const desc = sortClients(mockClients, { field: 'city', direction: 'desc' });
    expect(desc.map((c) => c.city)).toEqual(['San Diego', 'Oceanside', 'Carlsbad']);
  });

  it('sorts by roof area', () => {
    const largest = sortClients(mockClients, { field: 'roofArea', direction: 'desc' });
    expect(largest.map((c) => c.roofSpecs.roofAreaSqFt)).toEqual([3200, 2500, 1800]);

    const smallest = sortClients(mockClients, { field: 'roofArea', direction: 'asc' });
    expect(smallest.map((c) => c.roofSpecs.roofAreaSqFt)).toEqual([1800, 2500, 3200]);
  });

  it('persists and retrieves user sort preference per user ID', () => {
    expect(getClientSortStorageKey(123)).toBe('riseup_clients_sort_user_123');
    expect(getClientSortStorageKey(456)).toBe('riseup_clients_sort_user_456');
    expect(getClientSortStorageKey(null)).toBe('riseup_clients_sort_guest');

    // Default when nothing saved
    expect(getSavedClientSort(123)).toEqual(DEFAULT_CLIENT_SORT);

    // Save for user 123
    saveClientSort({ field: 'assignedRep', direction: 'desc' }, 123);
    expect(getSavedClientSort(123)).toEqual({ field: 'assignedRep', direction: 'desc' });

    // User 456 still has default
    expect(getSavedClientSort(456)).toEqual(DEFAULT_CLIENT_SORT);

    // Save for user 456
    saveClientSort({ field: 'revenue', direction: 'desc' }, 456);
    expect(getSavedClientSort(456)).toEqual({ field: 'revenue', direction: 'desc' });

    // Verify user 123 is unaffected
    expect(getSavedClientSort(123)).toEqual({ field: 'assignedRep', direction: 'desc' });
  });

  it('ignores invalid localStorage content and falls back to default', () => {
    localStorage.setItem('riseup_clients_sort_user_999', 'invalid-json');
    expect(getSavedClientSort(999)).toEqual(DEFAULT_CLIENT_SORT);

    localStorage.setItem('riseup_clients_sort_user_999', JSON.stringify({ field: 'unknown', direction: 'asc' }));
    expect(getSavedClientSort(999)).toEqual(DEFAULT_CLIENT_SORT);
  });
});
