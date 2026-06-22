import { useCallback, useState } from 'react';
import Toast from 'react-native-toast-message';
import apiClient from '../api/client';
import { useAuthStore } from '../store/useAuthStore';

export const useFinance = () => {
  const activeMembership = useAuthStore(state => state.activeMembership);
  const societyId = activeMembership?.society?.id;

  const [summary, setSummary] = useState({
    totalCollected: 0,
    totalPending: 0,
    cashBalance: 0,
    bankBalance: 0,
  });
  const [loading, setLoading] = useState(false);

  const fetchFinanceSummary = useCallback(async () => {
    if (!societyId) return;
    setLoading(true);
    try {
      const res = await apiClient.get(
        `/finance/summary?societyId=${societyId}`,
      );
      if (res && res.data) {
        setSummary(res.data);
      }
    } catch (err) {
      console.error('❌ Failed to fetch financial balances:', err);
    } finally {
      setLoading(false);
    }
  }, [societyId]);

  const recordManualPayment = async (
    invoiceId: number,
    method: 'cash' | 'cheque',
  ) => {
    try {
      await apiClient.post('/finance/pay-manual', {
        invoiceId,
        paymentMethod: method,
      });
      Toast.show({ type: 'success', text1: 'Payment Processed Natively' });
      await fetchFinanceSummary(); // Refresh balances immediately
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Verification Fault' });
    }
  };

  return {
    summary,
    loading,
    fetchFinanceSummary,
    recordManualPayment,
  };
};
