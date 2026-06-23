import {
  ArrowLeft,
  Check,
  Layers,
  User,
  X,
} from 'lucide-react-native';
import React, { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import apiClient from '../api/client';
import CustomAlert from '../components/CustomAlert';
import { useAuthStore } from '../store/useAuthStore';
import { ApiResponse } from '../types/api.types';

export const ApprovalManagementScreen = ({ navigation }: any) => {
  const activeMembership = useAuthStore(state => state.activeMembership);
  const societyId = activeMembership?.society?.id;

  const [memberships, setMemberships] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [selectedTab, setSelectedTab] = useState<'pending' | 'active' | 'exited'>('pending');

  // Custom Alert configuration
  const [alert, setAlert] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
  });

  const fetchMemberships = useCallback(async () => {
    if (!societyId) return;
    setLoading(true);
    try {
      const res = await apiClient.get<any, ApiResponse>(
        `/societies/approvals?societyId=${societyId}&status=${selectedTab}`,
      );
      if (res.success && res.data) {
        setMemberships(res.data);
      }
    } catch (err) {
      console.error('Failed fetching memberships:', err);
    } finally {
      setLoading(false);
    }
  }, [societyId, selectedTab]);

  useEffect(() => {
    fetchMemberships();
  }, [fetchMemberships]);

  const executeApprovalAction = async (
    targetId: number,
    targetStatus: 'active' | 'exited',
  ) => {
    setProcessingId(targetId);
    setAlert(prev => ({ ...prev, visible: false }));
    try {
      const res = await apiClient.put<any, ApiResponse>(
        `/societies/approvals/${targetId}`,
        {
          status: targetStatus,
          societyId,
        },
      );

      if (res.success) {
        setAlert({
          visible: true,
          title: 'Action Successful',
          message: res.message || 'Membership status updated successfully.',
          type: 'success',
        });
        // Remove item from the current tab list since its status changed
        setMemberships(prev => prev.filter(item => item.id !== targetId));
      }
    } catch (err) {
      const apiError = err as ApiResponse;
      setAlert({
        visible: true,
        title: 'Action Failed',
        message: apiError.message || 'Failed processing membership action.',
        type: 'error',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleApprovalAction = (
    targetId: number,
    targetStatus: 'active' | 'exited',
    memberName: string,
  ) => {
    let actionLabel = 'approve';
    if (targetStatus === 'exited') {
      actionLabel = selectedTab === 'active' ? 'revoke and deny' : 'deny';
    } else if (selectedTab === 'exited') {
      actionLabel = 're-approve';
    }

    setAlert({
      visible: true,
      title: `${targetStatus === 'active' ? 'Approve' : 'Deny'} Member`,
      message: `Are you sure you want to ${actionLabel} ${memberName}?`,
      type: 'warning',
      confirmText: 'Yes',
      cancelText: 'Cancel',
      onConfirm: () => executeApprovalAction(targetId, targetStatus),
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-[#f7f9fb]">
      {/* Header */}
      <View className="h-16 w-full bg-white px-5 flex-row items-center space-x-3 border-b border-slate-100">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="p-2 -ml-2 rounded-full active:bg-slate-50"
        >
          <ArrowLeft size={22} color="#191c1e" />
        </TouchableOpacity>
        <Text className="text-xl font-black text-slate-900">
          Member Approvals
        </Text>
      </View>

      {/* Tabs */}
      <View className="flex-row bg-white border-b border-slate-100 p-4 justify-between">
        {[
          { label: 'Pending', value: 'pending' },
          { label: 'Approved', value: 'active' },
          { label: 'Denied', value: 'exited' },
        ].map(tab => {
          const isSelected = selectedTab === tab.value;
          return (
            <TouchableOpacity
              key={tab.value}
              onPress={() => setSelectedTab(tab.value as any)}
              className={`flex-1 mx-1 py-2 rounded-xl border items-center justify-center ${
                isSelected
                  ? 'bg-[#006d3b] border-[#006d3b]'
                  : 'bg-slate-50 border-slate-100'
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  isSelected ? 'text-white' : 'text-slate-600'
                }`}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Main List */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator color="#006d3b" size="large" />
        </View>
      ) : (
        <FlatList
          data={memberships}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={{ padding: 20 }}
          ListEmptyComponent={
            <View className="flex-1 py-12 justify-center items-center space-y-2">
              <Layers size={40} color="#94a3b8" />
              <Text className="text-slate-500 font-bold text-sm">
                No {selectedTab === 'pending' ? 'pending' : selectedTab === 'active' ? 'approved' : 'denied'} member records found.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm mb-3">
              <View className="flex-row items-center space-x-3 mb-4">
                <View className="w-10 h-10 rounded-full bg-emerald-50 items-center justify-center border border-emerald-100">
                  <User size={20} color="#006d3b" />
                </View>
                <View className="flex-1 ml-2">
                  <Text className="text-base font-bold text-slate-800 tracking-tight">
                    {item.user?.name || 'Resident applicant'}
                  </Text>
                  <Text className="text-slate-400 text-xs mt-0.5">
                    Phone: {item.user?.phone || 'N/A'}
                  </Text>
                </View>
              </View>

              <View className="bg-slate-50 rounded-xl p-3 mb-4 space-y-1">
                <Text className="text-xs font-bold text-slate-600">
                  Unit Flat: <Text className="font-extrabold text-slate-900">{item.flatNumber || 'N/A'}</Text>
                </Text>
                <Text className="text-xs font-bold text-slate-600">
                  Role: <Text className="font-extrabold capitalize text-slate-900">{item.role}</Text>
                </Text>
                {item.designation && (
                  <Text className="text-xs font-bold text-slate-600">
                    Designation: <Text className="font-extrabold text-slate-900">{item.designation}</Text>
                  </Text>
                )}
              </View>

              {/* Action Buttons based on state */}
              {selectedTab === 'pending' && (
                <View className="flex-row justify-between">
                  <TouchableOpacity
                    disabled={processingId !== null}
                    onPress={() => handleApprovalAction(item.id, 'exited', item.user?.name || 'this applicant')}
                    className="flex-1 flex-row items-center justify-center bg-rose-50 border border-rose-100 py-2.5 rounded-xl mr-2 active:opacity-90 disabled:opacity-50"
                  >
                    <X size={16} color="#ba1a1a" />
                    <Text className="text-rose-600 text-xs font-bold ml-1.5">
                      Deny Request
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    disabled={processingId !== null}
                    onPress={() => handleApprovalAction(item.id, 'active', item.user?.name || 'this applicant')}
                    className="flex-1 flex-row items-center justify-center bg-[#006d3b] py-2.5 rounded-xl ml-2 active:opacity-90 disabled:opacity-50"
                  >
                    <Check size={16} color="#ffffff" />
                    <Text className="text-white text-xs font-bold ml-1.5">
                      Approve
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {selectedTab === 'active' && (
                <TouchableOpacity
                  disabled={processingId !== null}
                  onPress={() => handleApprovalAction(item.id, 'exited', item.user?.name || 'this applicant')}
                  className="w-full flex-row items-center justify-center bg-rose-50 border border-rose-100 py-2.5 rounded-xl active:opacity-90 disabled:opacity-50"
                >
                  <X size={16} color="#ba1a1a" />
                  <Text className="text-rose-600 text-xs font-bold ml-1.5">
                    Revoke Approval & Deny
                  </Text>
                </TouchableOpacity>
              )}

              {selectedTab === 'exited' && (
                <TouchableOpacity
                  disabled={processingId !== null}
                  onPress={() => handleApprovalAction(item.id, 'active', item.user?.name || 'this applicant')}
                  className="w-full flex-row items-center justify-center bg-[#006d3b] py-2.5 rounded-xl active:opacity-90 disabled:opacity-50"
                >
                  <Check size={16} color="#ffffff" />
                  <Text className="text-white text-xs font-bold ml-1.5">
                    Re-approve Member
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        />
      )}

      <CustomAlert
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        type={alert.type}
        confirmText={alert.confirmText}
        cancelText={alert.cancelText}
        onConfirm={alert.onConfirm}
        onClose={() => setAlert(prev => ({ ...prev, visible: false }))}
      />
    </SafeAreaView>
  );
};
