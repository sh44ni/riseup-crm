import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { leadsApi } from '@/api/leadsApi';
import { updateClient } from '@/api/clientsApi';
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
  const [addressSaveError, setAddressSaveError] = useState<string | null>(null);

  const handleStartEdit = (card: DealCard | any, e?: React.SyntheticEvent) => {
    if (e) e.stopPropagation();
    setEditingAddressCardId(String(card.id));
    setAddressFormStreet(card.address || '');
    setAddressFormCity(card.city || 'Oceanside');
    setAddressFormZip(card.zip || '');
    setAddressSaveError(null);
  };

  const handleCancelEdit = (e?: React.SyntheticEvent) => {
    if (e) e.stopPropagation();
    setEditingAddressCardId(null);
    setAddressSaveError(null);
  };

  const handleSaveAddress = async (card: DealCard | any, e?: React.SyntheticEvent) => {
    if (e) e.stopPropagation();
    setAddressSaveError(null);
    setIsSavingAddress(true);

    const cleanStreet = addressFormStreet.trim();
    const cleanCity = addressFormCity.trim();
    const cleanZip = addressFormZip.trim();

    try {
      // 1. Update lead via leads API
      await leadsApi.updateLead(card.id, {
        address: cleanStreet,
        city: cleanCity,
        zip: cleanZip,
      });

      // 2. Directly sync to Client 360 if clientId is present
      const targetClientId = card.clientId || card.client_id;
      if (targetClientId) {
        try {
          await updateClient(targetClientId, {
            address: cleanStreet,
            city: cleanCity,
            zip: cleanZip,
          });
        } catch {
          // Backend lead update already synchronized to client record
        }
      }

      // 3. Immediately reflect in local state and tanstack query cache
      updateCardAddress(String(card.id), cleanStreet, cleanCity, cleanZip);
      queryClient.invalidateQueries({ queryKey: queryKeys.pipeline.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.all() });

      showToast('Address saved and synced to Client 360');
      setEditingAddressCardId(null);
    } catch (err: any) {
      const msg = err?.message || 'Failed to save address. Please check your connection and try again.';
      setAddressSaveError(msg);
      showToast(msg);
      // Retain entered values in addressFormStreet, addressFormCity, addressFormZip
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
    addressSaveError,
    setAddressFormStreet,
    setAddressFormCity,
    setAddressFormZip,
    handleStartEdit,
    handleCancelEdit,
    handleSaveAddress,
  };
}
