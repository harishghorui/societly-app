import { useCallback, useState } from 'react';
import apiClient from '../api/client';
import { useAuthStore } from '../store/useAuthStore';
import { ApiResponse } from '../types/api.types';

export const useBillingConfig = () => {
  const activeMembership = useAuthStore(state => state.activeMembership);
  const societyId = activeMembership?.society?.id;

  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchBillingConfig = useCallback(async () => {
    if (!societyId) return;
    setLoading(true);
    try {
      const res = await apiClient.get<any, ApiResponse>(
        `/finance/billing-config?societyId=${societyId}`,
      );
      if (res.success && res.data) {
        setConfig(res.data);
      }
    } catch (err) {
      console.error('Failed to sync billing configurations:', err);
    } finally {
      setLoading(false);
    }
  }, [societyId]);

  const saveBillingConfig = async (updatedFields: any) => {
    if (!societyId) return;
    setSaving(true);
    try {
      const res = await apiClient.put<any, ApiResponse>(
        `/finance/billing-config?societyId=${societyId}`,
        updatedFields,
      );
      if (res.success && res.data) {
        setConfig(res.data);
      }
      return res;
    } catch (err: any) {
      return Promise.reject(err);
    } finally {
      setSaving(false);
    }
  };

  return { config, loading, saving, fetchBillingConfig, saveBillingConfig };
};
