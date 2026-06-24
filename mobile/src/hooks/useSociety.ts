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
    structureType: 'single_building' | 'multi_wing';
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
        const updateActiveMembership = useAuthStore.getState().setActiveProfile;
        if (activeMembership) {
          updateActiveMembership({
            ...activeMembership,
            society: {
              ...activeMembership.society,
              ...res.data,
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
