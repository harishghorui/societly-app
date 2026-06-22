import { useState } from 'react';
import Toast from 'react-native-toast-message';
import apiClient from '../api/client';
import { useAuthStore } from '../store/useAuthStore';
import { ApiResponse } from '../types/api.types';

export const useExpenses = () => {
  const activeMembership = useAuthStore(state => state.activeMembership);
  const societyId = activeMembership?.society?.id;

  const [publishing, setPublishing] = useState(false);

  const createExpense = async (
    title: string,
    amount: string,
    category: string,
    paymentMethod: 'cash' | 'bank',
    onSuccess: () => void,
  ) => {
    if (!societyId) return;

    // 1. Front-End Structural Field Validation Rules
    if (!title.trim() || !amount.trim() || !category.trim()) {
      return Toast.show({
        type: 'error',
        text1: 'Validation Fault',
        text2: 'All form fields are completely mandatory.',
      });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return Toast.show({
        type: 'error',
        text1: 'Validation Fault',
        text2: 'Please supply a real, positive numerical amount.',
      });
    }

    // 2. Dispatch Payload Pipeline
    setPublishing(true);
    try {
      // Axios response interceptor maps this stream directly to our unique ApiResponse layout signature
      const res = await apiClient.post<any, ApiResponse>('/finance/expense', {
        societyId,
        title: title.trim(),
        amount: parsedAmount,
        category,
        paymentMethod,
      });

      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: res.message, // Reads clean transactional message parsed from the back-end payload wrapper
      });
      onSuccess();
    } catch (err: any) {
      console.error('❌ Failed to log operational building expense:', err);

      // Extracts exact typed attributes cleanly according to the schema contract blueprint
      const apiError = err as ApiResponse;

      Toast.show({
        type: 'error',
        text1: apiError.error?.code
          ? `Transaction Rejected [${apiError.error.code}]`
          : 'Execution Error',
        text2:
          apiError.message || 'Could not settle expense logs against reserves.',
      });
    } finally {
      setPublishing(false);
    }
  };

  return {
    createExpense,
    publishing,
  };
};
