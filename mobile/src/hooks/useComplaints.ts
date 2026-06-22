import { useCallback, useState } from 'react';
import apiClient from '../api/client';
import { useAuthStore } from '../store/useAuthStore';
import { ApiResponse } from '../types/api.types';

export const useComplaints = () => {
  const activeMembership = useAuthStore(state => state.activeMembership);
  const societyId = activeMembership?.society?.id;
  const membershipId = activeMembership?.id;
  const role = activeMembership?.role || 'tenant';

  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchComplaints = useCallback(async () => {
    if (!societyId || !membershipId) return;
    setLoading(true);
    try {
      const res = await apiClient.get<any, ApiResponse>(
        `/complaints?societyId=${societyId}&membershipId=${membershipId}&role=${role}`,
      );
      if (res.success && Array.isArray(res.data)) {
        setComplaints(res.data);
      }
    } catch (err) {
      console.error('Failed fetching complaints matrix:', err);
    } finally {
      setLoading(false);
    }
  }, [societyId, membershipId, role]);

  const fileComplaint = async (
    title: string,
    description: string,
    category: string,
    isAnonymous: boolean,
    photoAssets: any[],
  ) => {
    const formData = new FormData();
    formData.append('societyId', societyId!.toString());
    formData.append('membershipId', membershipId!.toString());
    formData.append('title', title.trim());
    formData.append('description', description.trim());
    formData.append('category', category);
    formData.append('isAnonymous', isAnonymous.toString());

    photoAssets.forEach((asset, idx) => {
      formData.append('photos', {
        uri: asset.uri,
        name: asset.fileName || `complaint_img_${idx}.jpg`,
        type: asset.type || 'image/jpeg',
      } as any);
    });

    setSubmitting(true);
    try {
      const res = await apiClient.post<any, ApiResponse>(
        '/complaints',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      await fetchComplaints();
      return res; // Let the screen intercept success metrics
    } catch (err: any) {
      return Promise.reject(err);
    } finally {
      setSubmitting(false);
    }
  };

  const editComplaint = async (id: number, fields: any) => {
    setUpdating(true);
    try {
      const res = await apiClient.put<any, ApiResponse>(
        `/complaints/${id}`,
        fields,
      );
      if (res.success) {
        setComplaints(prev =>
          prev.map(item => (item.id === id ? { ...item, ...fields } : item)),
        );
      }
      return res;
    } catch (err) {
      return Promise.reject(err);
    } finally {
      setUpdating(false);
    }
  };

  const removeComplaint = async (id: number) => {
    try {
      const res = await apiClient.delete<any, ApiResponse>(`/complaints/${id}`);
      if (res.success) {
        setComplaints(prev => prev.filter(item => item.id !== id));
      }
      return res;
    } catch (err) {
      return Promise.reject(err);
    }
  };

  return {
    complaints,
    setComplaints,
    loading,
    updating,
    submitting,
    fetchComplaints,
    fileComplaint,
    editComplaint,
    removeComplaint,
  };
};
