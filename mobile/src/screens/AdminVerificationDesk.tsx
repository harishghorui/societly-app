import {
  ArrowLeft,
  Check,
  IndianRupee,
  Layers,
  User,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Text,
  TouchableOpacity,
  View,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import apiClient from '../api/client';
import CustomAlert from '../components/CustomAlert';
import { useAuthStore } from '../store/useAuthStore';
import { ApiResponse } from '../types/api.types';

export const AdminVerificationDesk = ({ navigation }: any) => {
  const activeMembership = useAuthStore(state => state.activeMembership);
  const [pendingInvoices, setPendingInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);

  // Custom Alert Modal Configuration states
  const [alert, setAlert] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info' as any,
  });

  const fetchPendingPayments = async () => {
    const societyId = activeMembership?.society?.id;
    if (!societyId) return;
    try {
      // Pull only outstanding or pending ledger records for approval validation
      const res = await apiClient.get<any, ApiResponse>(
        `/finance/invoices-pending?societyId=${societyId}`,
      );
      if (res.success && res.data) {
        setPendingInvoices(res.data);
      }
    } catch (err) {
      console.error('Failed pulling pending invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingPayments();
  }, [activeMembership]);

  const handleVerifyPayment = async (
    invoiceId: number,
    method: 'cash' | 'cheque',
  ) => {
    setProcessingId(invoiceId);
    try {
      // 🚀 Hits your exact backend router configuration path
      const res = await apiClient.post<any, ApiResponse>(
        '/finance/pay-manual',
        {
          invoiceId,
          paymentMethod: method,
        },
      );

      if (res.success) {
        setAlert({
          visible: true,
          title: 'Payment Confirmed',
          message: 'Invoice marked paid and balances synced successfully.',
          type: 'success',
        });
        // Remove verified item from active lists view state layout
        setPendingInvoices(prev => prev.filter(inv => inv.id !== invoiceId));
      }
    } catch (error: any) {
      setAlert({
        visible: true,
        title: 'Execution Failure',
        message: error.message || 'Failed validating payment.',
        type: 'error',
      });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#f7f9fb]">
      {/* Navbar Header bar */}
      <View className="h-16 w-full bg-white px-5 flex-row items-center space-x-3 border-b border-slate-100">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="p-2 -ml-2 rounded-full active:bg-slate-50"
        >
          <ArrowLeft size={22} color="#191c1e" />
        </TouchableOpacity>
        <Text className="text-xl font-black text-slate-900">
          Verification Desk
        </Text>
      </View>

      <FlatList
        data={pendingInvoices}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={{ padding: 20 }}
        ListEmptyComponent={
          <View className="flex-1 py-12 justify-center items-center space-y-2">
            <Layers size={40} color="#94a3b8" />
            <Text className="text-slate-500 font-bold text-sm">
              No incoming payments require verification.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm mb-3 space-y-4">
            <View className="flex-row justify-between items-start">
              <View className="space-y-1">
                <View className="flex-row items-center space-x-1">
                  <User size={13} color="#64748b" />
                  <Text className="text-xs font-black text-slate-600">
                    Flat: {item.membership?.flatNumber || 'N/A'}
                  </Text>
                </View>
                <Text className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  Cycle: {item.billingCycle}
                </Text>
              </View>
              <View className="flex-row items-center flex-col items-end">
                <View className="flex-row items-center">
                  <IndianRupee size={14} color="#0f172a" />
                  <Text className="text-base font-black text-slate-800">
                    {Number(item.amount).toFixed(2)}
                  </Text>
                </View>
                {item.status === 'pending_approval' && (
                  <View className="bg-amber-100 px-1.5 py-0.5 rounded mt-1">
                    <Text className="text-[8px] font-black text-amber-700 uppercase">
                      Resident Submitted
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {item.status === 'pending_approval' && (
              <View className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-1">
                <Text className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  Payment Verification Proof
                </Text>
                <Text className="text-xs font-bold text-slate-700">
                  Resident Method: <Text className="font-black capitalize text-slate-900">{item.paymentMethod || 'N/A'}</Text>
                </Text>
                {item.paymentRef && (
                  <Text className="text-xs font-bold text-slate-700">
                    Ref / UTR / Cheque: <Text className="font-black text-slate-900">{item.paymentRef}</Text>
                  </Text>
                )}
                {item.remarks && (
                  <Text className="text-xs font-bold italic text-slate-500 mt-1">
                    Remarks: "{item.remarks}"
                  </Text>
                )}
                {item.proofUrl && (
                  <TouchableOpacity
                    onPress={() => Linking.openURL(item.proofUrl)}
                    className="bg-indigo-50 border border-indigo-100 py-1.5 px-3 rounded-lg self-start mt-2 active:opacity-90"
                  >
                    <Text className="text-[10px] font-black text-indigo-700 uppercase tracking-wide">
                      👁️ View Proof Document
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Verification Processing Action Buttons Grid */}
            <View className="flex-row space-x-2 border-t border-slate-50 pt-3">
              <TouchableOpacity
                disabled={processingId === item.id}
                onPress={() => handleVerifyPayment(item.id, 'cash')}
                className="flex-1 bg-emerald-600 h-10 rounded-xl flex-row items-center justify-center space-x-1 active:opacity-90"
              >
                {processingId === item.id ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Check size={14} color="#fff" />
                    <Text className="text-white font-black text-xs">
                      Verify Cash
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                disabled={processingId === item.id}
                onPress={() => handleVerifyPayment(item.id, 'cheque')}
                className="flex-1 bg-slate-800 h-10 rounded-xl flex-row items-center justify-center space-x-1 active:opacity-90"
              >
                {processingId === item.id ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Check size={14} color="#fff" />
                    <Text className="text-white font-black text-xs">
                      Verify Cheque / Bank
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <CustomAlert
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        type={alert.type}
        onClose={() => setAlert({ ...alert, visible: false })}
      />
    </SafeAreaView>
  );
};
