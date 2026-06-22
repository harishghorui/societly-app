import { useCallback, useState } from 'react';
import apiClient from '../api/client';
import { useAuthStore } from '../store/useAuthStore';

export const useNotifications = () => {
  const user = useAuthStore(state => state.user);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Encapsulated data-fetching logic targeting your clean route configuration
  const fetchNotifications = useCallback(
    async (isRefresh = false) => {
      if (!user?.id) return;

      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        // Points cleanly to your base route app.use('/api/notifications', notificationRoutes)
        const res = await apiClient.get(`/notifications?userId=${user.id}`);
        if (res && res.data) {
          setNotifications(res.data);
        }
      } catch (err) {
        console.error(
          '❌ Error loading notification history logs from server:',
          err,
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user?.id],
  );

  // Bulk state update handler
  const markNotificationsRead = useCallback(async () => {
    if (!user?.id || notifications.length === 0) return;
    try {
      // Points cleanly to PUT /api/notifications/mark-all-read
      await apiClient.put('/notifications/mark-all-read', { userId: user.id });

      // Optimistically update your local component layout state array instantly
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('❌ Error updating notification statuses:', err);
    }
  }, [user?.id, notifications.length]);

  return {
    notifications,
    loading,
    refreshing,
    fetchNotifications,
    markNotificationsRead,
  };
};
