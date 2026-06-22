import { useCallback, useMemo, useState } from 'react';
import apiClient from '../api/client';
import { useAuthStore } from '../store/useAuthStore';
import { ApiResponse } from '../types/api.types';

export const useDirectory = () => {
  const activeMembership = useAuthStore(state => state.activeMembership);
  const societyId = activeMembership?.society?.id;
  const membershipId = activeMembership?.id;

  const [rawDirectory, setRawDirectory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  const fetchDirectory = useCallback(async () => {
    if (!societyId || !membershipId) return;
    setLoading(true);
    try {
      const res = await apiClient.get<any, ApiResponse>(
        `/society/directory?societyId=${societyId}&requesterMembershipId=${membershipId}`,
      );
      if (res.success && Array.isArray(res.data)) {
        setRawDirectory(res.data);
      }
    } catch (err) {
      console.error('❌ Failed to pull neighbor directory stream:', err);
    } finally {
      setLoading(false);
    }
  }, [societyId, membershipId]);

  // Combined real-time filtering computation matrix
  const filteredDirectory = useMemo(() => {
    return rawDirectory.filter(entry => {
      const matchesSearch =
        entry.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.flatNumber?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesRole = roleFilter === 'all' || entry.role === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [rawDirectory, searchQuery, roleFilter]);

  return {
    directory: filteredDirectory,
    loading,
    searchQuery,
    setSearchQuery,
    roleFilter,
    setRoleFilter,
    fetchDirectory,
  };
};
