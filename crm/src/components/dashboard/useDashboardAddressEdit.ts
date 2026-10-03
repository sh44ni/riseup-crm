import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { leadsApi } from '@/api/leadsApi';
import { DealCard } from './dashboardTypes';

export function useDashboardAddressEdit(
  updateCardAddress: (id: string, street: string, city: string, zip: string) => void,
  showToast: (msg: string) => void
) {
  const queryClient = useQueryClient();
  const [editingAddressCardId, setEditingAddressCardId] = useState<string | null>(null);
  const [addressFormStreet, setAddressFormStreet] = useState('');
  const [addressFormCity, setAddressFormCity] = useState('');
  const [addressFormZip, setAddressFormZip] = useState('');
  const [isSavingAddress, setIsSavingAddress] = useState(false);

  const handleStartEdit = (card: DealCard, e: React.SyntheticEvent) => {
    e.stopPropagation();
    setEditingAddressCardId(card.id);
    setAddressFormStreet(card.address || '');
    setAddressFormCity(card.city || 'Oceanside');
    setAddressFormZip(card.zip || '');
  };

  const handleCancelEdit = (e?: React.SyntheticEvent) => {
    if (e) e.stopPropagation();
    setEditingAddressCardId(null);
  };

  const handleSaveAddress = async (card: DealCard, e?: React.SyntheticEvent) => {
    if (e) e.stopPropagation();
    setIsSavingAddress(true);
    try {
      await leadsApi.updateLead(card.id, {
        address: addressFormStreet.trim(),
        city: addressFormCity.trim(),
        zip: addressFormZip.trim(),
      });
      updateCardAddress(card.id, addressFormStreet.trim(), addressFormCity.trim(), addressFormZip.trim());
      queryClient.invalidateQueries({ queryKey: queryKeys.pipeline.all() });
      showToast('Address saved');
      setEditingAddressCardId(null);
    } catch {
      showToast('Failed to save address');
    } finally {
      setIsSavingAddress(false);
    }
  };

  return {
    editingAddressCardId,
    addressFormStreet,
    addressFormCity,
    addressFormZip,
    isSavingAddress,
    setAddressFormStreet,
    setAddressFormCity,
    setAddressFormZip,
    handleStartEdit,
    handleCancelEdit,
    handleSaveAddress,
  };
}
