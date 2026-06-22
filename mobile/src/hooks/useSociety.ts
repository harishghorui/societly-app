import { useCallback, useState } from 'react';
import apiClient from '../api/client';
import { useAuthStore } from '../store/useAuthStore';
import { ApiResponse } from '../types/api.types';

export const useSociety = () => {
  const activeMembership = useAuthStore(state => state.activeMembership);
  const societyId = activeMembership?.society?.id;

  const [society, setSociety] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchSocietyProfile = useCallback(async () => {
    if (!societyId) return;
    setLoading(true);
    try {
      const res = await apiClient.get<any, ApiResponse>(`/societies/${societyId}`);
      if (res.success && res.data) {
        setSociety(res.data);
      }
    } catch (err) {
      console.error('Failed to sync society profile:', err);
    } finally {
      setLoading(false);
    }
  }, [societyId]);

  const saveSocietyProfile = async (updatedFields: {
    name: string;
    address: string;
    govtRegistrationNo: string;
  }) => {
    if (!societyId) return;
    setSaving(true);
    try {
      const res = await apiClient.put<any, ApiResponse>(
        `/societies/${societyId}`,
        updatedFields,
      );
      if (res.success && res.data) {
        setSociety(res.data);
        // Update the active membership's society details in Zustand store
        const updateActiveMembership = useAuthStore.getState().setActiveProfile;
        if (activeMembership) {
          updateActiveMembership({
            ...activeMembership,
            society: {
              ...activeMembership.society,
              name: res.data.name,
              address: res.data.address,
            },
          });
        }
      }
      return res;
    } catch (err: any) {
      return Promise.reject(err);
    } finally {
      setSaving(false);
    }
  };

  return { society, loading, saving, fetchSocietyProfile, saveSocietyProfile };
};
