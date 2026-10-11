import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDashboardAddressEdit } from '../useDashboardAddressEdit';
import { leadsApi } from '@/api/leadsApi';
import * as clientsApi from '@/api/clientsApi';

// Mock react-query
const mockInvalidateQueries = vi.fn();
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    invalidateQueries: mockInvalidateQueries,
  }),
}));

describe('useDashboardAddressEdit', () => {
  const updateCardAddress = vi.fn();
  const showToast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts edit with card address, city, and zip', () => {
    const { result } = renderHook(() => useDashboardAddressEdit(updateCardAddress, showToast));

    const card = {
      id: '178',
      clientId: 445,
      address: '303 Vista Way',
      city: 'Oceanside',
      zip: '92054',
      name: 'Carol Davis',
      location: '303 Vista Way, Oceanside',
      service: 'Roofing',
      serviceColor: 'blue' as const,
      time: '2h ago',
    };

    act(() => {
      result.current.handleStartEdit(card as any);
    });

    expect(result.current.editingAddressCardId).toBe('178');
    expect(result.current.addressFormStreet).toBe('303 Vista Way');
    expect(result.current.addressFormCity).toBe('Oceanside');
    expect(result.current.addressFormZip).toBe('92054');
    expect(result.current.addressSaveError).toBeNull();
  });

  it('saves address to both lead and client 360, updates card address, and closes editor on success', async () => {
    const updateLeadSpy = vi.spyOn(leadsApi, 'updateLead').mockResolvedValue({ ok: true });
    const updateClientSpy = vi.spyOn(clientsApi, 'updateClient').mockResolvedValue({ ok: true });

    const { result } = renderHook(() => useDashboardAddressEdit(updateCardAddress, showToast));

    const card = {
      id: '178',
      clientId: 445,
      address: '303 Vista Way',
      city: 'Oceanside',
      zip: '92054',
    };

    act(() => {
      result.current.handleStartEdit(card as any);
    });

    act(() => {
      result.current.setAddressFormStreet('303 Vista Way Suite B');
      result.current.setAddressFormCity('Oceanside');
      result.current.setAddressFormZip('92054');
    });

    await act(async () => {
      await result.current.handleSaveAddress(card as any);
    });

    expect(updateLeadSpy).toHaveBeenCalledWith('178', {
      address: '303 Vista Way Suite B',
      city: 'Oceanside',
      zip: '92054',
    });
    expect(updateClientSpy).toHaveBeenCalledWith(445, {
      address: '303 Vista Way Suite B',
      city: 'Oceanside',
      zip: '92054',
    });
    expect(updateCardAddress).toHaveBeenCalledWith('178', '303 Vista Way Suite B', 'Oceanside', '92054');
    expect(mockInvalidateQueries).toHaveBeenCalledTimes(3);
    expect(showToast).toHaveBeenCalledWith('Address saved and synced to Client 360');
    expect(result.current.editingAddressCardId).toBeNull();
  });

  it('retains inputs, sets addressSaveError, and keeps editor open when save fails', async () => {
    vi.spyOn(leadsApi, 'updateLead').mockRejectedValue(new Error('Failed to reach CRM server.'));

    const { result } = renderHook(() => useDashboardAddressEdit(updateCardAddress, showToast));

    const card = {
      id: '178',
      clientId: 445,
      address: '303 Vista Way',
      city: 'Oceanside',
      zip: '92054',
    };

    act(() => {
      result.current.handleStartEdit(card as any);
    });

    act(() => {
      result.current.setAddressFormStreet('Failed Address Ave');
    });

    await act(async () => {
      await result.current.handleSaveAddress(card as any);
    });

    expect(result.current.editingAddressCardId).toBe('178');
    expect(result.current.addressFormStreet).toBe('Failed Address Ave');
    expect(result.current.addressSaveError).toBe('Failed to reach CRM server.');
    expect(showToast).toHaveBeenCalledWith('Failed to reach CRM server.');
  });
});
