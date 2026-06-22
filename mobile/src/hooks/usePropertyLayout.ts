import { useCallback, useState } from 'react';
import apiClient from '../api/client';
import { useAuthStore } from '../store/useAuthStore';
import { ApiResponse } from '../types/api.types';

export interface FlatLayoutInput {
  flatNumber: string;
  flatType: '1BHK' | '2BHK' | '3BHK' | 'Shop' | 'Office' | 'Other';
  squareFootage: string;
}

export interface WingLayoutInput {
  name: string;
  flats: FlatLayoutInput[];
}

export const usePropertyLayout = () => {
  const activeMembership = useAuthStore(state => state.activeMembership);
  const societyId = activeMembership?.society?.id;
  const requesterMembershipId = activeMembership?.id;

  const [wings, setWings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchPropertyLayout = useCallback(async () => {
    if (!societyId) return;
    setLoading(true);
    try {
      const res = await apiClient.get<any, ApiResponse>(
        `/societies/${societyId}/layout`,
      );
      if (res.success && res.data) {
        setWings(res.data);
      }
    } catch (err) {
      console.error('Failed to sync property layout:', err);
    } finally {
      setLoading(false);
    }
  }, [societyId]);

  const savePropertyLayout = async (wingsInput: WingLayoutInput[]) => {
    if (!societyId || !requesterMembershipId) return;
    setSaving(true);
    try {
      const res = await apiClient.post<any, ApiResponse>(
        `/societies/${societyId}/layout`,
        {
          wings: wingsInput,
          requesterMembershipId,
        },
      );
      if (res.success) {
        await fetchPropertyLayout();
      }
      return res;
    } catch (err: any) {
      // Enforce clean, typed contract validation casting per context rules
      return Promise.reject(err as ApiResponse);
    } finally {
      setSaving(false);
    }
  };

  return {
    wings,
    loading,
    saving,
    fetchPropertyLayout,
    savePropertyLayout,
  };
};
