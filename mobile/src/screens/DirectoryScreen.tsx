import { ArrowLeft, Phone, Search, Wallet, X, IndianRupee } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDirectory } from '../hooks/useDirectory';
import { useAuthStore } from '../store/useAuthStore';
import CustomAlert from '../components/CustomAlert';
import apiClient from '../api/client';
import { ApiResponse } from '../types/api.types';

export const DirectoryScreen = ({ navigation }: any) => {
  const activeMembership = useAuthStore(state => state.activeMembership);
  const isStaff = activeMembership?.role === 'admin' || activeMembership?.role === 'treasurer';

  const {
    directory,
    loading,
    searchQuery,
    setSearchQuery,
    roleFilter,
    setRoleFilter,
    fetchDirectory,
    setRawDirectory,
  } = useDirectory();

  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any | null>(null);
  const [topupAmount, setTopupAmount] = useState('');
  const [topupMethod, setTopupMethod] = useState<'cash' | 'cheque' | 'online'>('cash');
  const [submitting, setSubmitting] = useState(false);

  // Custom Alert configuration states
  const [alert, setAlert] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info' as any,
  });

  useEffect(() => {
    fetchDirectory();
  }, [fetchDirectory]);

  const handleCallNeighbor = (phone: string) => {
    if (!phone || phone === 'Private') return;
    Linking.openURL(`tel:${phone}`);
  };

  const handleOpenTopUpModal = (member: any) => {
    setSelectedMember(member);
    setTopupAmount('');
    setTopupMethod('cash');
    setIsTopUpModalOpen(true);
  };

  const handleSaveTopUp = async () => {
    if (!selectedMember) return;
    const amountNum = parseFloat(topupAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setAlert({
        visible: true,
        title: 'Invalid Amount',
        message: 'Please enter a valid positive top-up amount.',
        type: 'error',
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiClient.post<any, ApiResponse>('/finance/wallet/topup', {
        targetMembershipId: selectedMember.id,
        amount: amountNum,
        paymentMethod: topupMethod,
        societyId: activeMembership?.society?.id,
      });

      if (res.success) {
        // Update local rawDirectory state
        setRawDirectory((prev: any[]) =>
          prev.map((item: any) =>
            item.id === selectedMember.id
              ? {
                  ...item,
                  advanceWalletBalance:
                    Number(item.advanceWalletBalance || 0) + amountNum,
                }
              : item,
          ),
        );

        setIsTopUpModalOpen(false);
        setAlert({
          visible: true,
          title: 'Top Up Success',
          message: `Successfully loaded ₹${amountNum.toFixed(2)} to ${
            selectedMember.user?.name || selectedMember.User?.name
          }'s wallet.`,
          type: 'success',
        });
      } else {
        setAlert({
          visible: true,
          title: 'Top Up Failed',
          message: res.message || 'Could not process wallet top up.',
          type: 'error',
        });
      }
    } catch (err: any) {
      console.error('Wallet top-up error:', err);
      setAlert({
        visible: true,
        title: 'Error',
        message: err.message || 'An error occurred during wallet top up.',
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#f7f9fb]">
      {/* Navbar Title Section */}
      <View className="h-16 w-full bg-white px-5 flex-row items-center border-b border-slate-100 space-x-3">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="p-2 -ml-2 rounded-full active:bg-slate-50"
        >
          <ArrowLeft size={22} color="#191c1e" />
        </TouchableOpacity>
        <View>
          <Text className="text-xl font-black text-slate-900">
            Resident Directory
          </Text>
          <Text className="text-slate-400 text-xs mt-0.5">
            Verified Building Members
          </Text>
        </View>
      </View>

      {/* Search Input Layout Wrapper */}
      <View className="p-4 space-y-3 bg-white border-b border-slate-100">
        <View className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 flex-row items-center">
          <Search size={18} color="#94a3b8" />
          <TextInput
            placeholder="Search by name or flat unit..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="flex-1 ml-3 text-slate-800 font-medium p-0"
          />
        </View>

        {/* Segmented Filter Switch Buttons */}
        <View className="flex-row gap-2 pt-1">
          {[
            { label: 'All neighbors', value: 'all' },
            { label: 'Owners', value: 'owner' },
            { label: 'Tenants', value: 'tenant' },
          ].map(tab => {
            const isSelected = roleFilter === tab.value;
            return (
              <TouchableOpacity
                key={tab.value}
                onPress={() => setRoleFilter(tab.value)}
                className={`px-3 py-1.5 rounded-lg border ${
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
      </View>

      {/* Main List Element Container */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator color="#006d3b" size="large" />
        </View>
      ) : (
        <FlatList
          data={directory}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
          ListEmptyComponent={
            <View className="bg-white border border-slate-100 rounded-2xl p-8 items-center mt-4">
              <Text className="text-slate-400 text-sm font-medium text-center">
                No matching neighbor directory records found.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const userPhone = item.User?.phone || item.user?.phone || '';
            const isPrivate = userPhone === 'Private';
            return (
              <View className="p-4 rounded-2xl border border-slate-100 bg-white mb-3 shadow-sm flex-row justify-between items-center">
                <View className="flex-row items-center space-x-3 flex-1 mr-2">
                  {/* Flat Identifier Circle Icon Widget */}
                  <View className="w-12 h-12 rounded-full bg-slate-50 items-center justify-center border border-slate-100">
                    <Text className="font-black text-slate-700 text-xs text-center">
                      {item.flatNumber}
                    </Text>
                  </View>

                  {/* Name and Privilege Subtitles */}
                  <View className="ml-3 flex-1">
                    <Text
                      className="text-slate-900 font-bold text-base tracking-tight"
                      numberOfLines={1}
                    >
                      {item.user?.name || item.User?.name}
                    </Text>
                    <View className="flex-row items-center space-x-2 mt-1">
                      <View
                        className={`px-2 py-0.5 rounded-md ${
                          item.role === 'admin' ? 'bg-amber-50' : 'bg-slate-100'
                        }`}
                      >
                        <Text
                          className={`text-[10px] font-black uppercase ${
                            item.role === 'admin'
                              ? 'text-amber-700'
                              : 'text-slate-500'
                          }`}
                        >
                          {item.role === 'admin' ? 'Secretary' : item.role}
                        </Text>
                      </View>
                      <Text className="text-slate-400 text-xs font-medium">
                        {isPrivate ? '🔒 Private' : userPhone}
                      </Text>
                    </View>
                    {isStaff && item.advanceWalletBalance !== undefined && (
                      <View className="flex-row items-center mt-1 bg-emerald-50 self-start px-2 py-0.5 rounded border border-emerald-100/50">
                        <Text className="text-[10px] text-emerald-800 font-black uppercase">
                          Wallet: ₹{Number(item.advanceWalletBalance).toFixed(2)}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Actions */}
                <View className="flex-row items-center space-x-2">
                  {isStaff && (
                    <TouchableOpacity
                      onPress={() => handleOpenTopUpModal(item)}
                      className="w-10 h-10 rounded-full items-center justify-center bg-emerald-700 active:bg-emerald-800"
                    >
                      <Wallet size={16} color="#ffffff" />
                    </TouchableOpacity>
                  )}
                  {/* Secure Dynamic Calling Direct Hook Button */}
                  <TouchableOpacity
                    onPress={() => handleCallNeighbor(userPhone)}
                    disabled={isPrivate}
                    className={`w-10 h-10 rounded-full items-center justify-center ${
                      isPrivate
                        ? 'bg-slate-100 opacity-60'
                        : 'bg-emerald-50 active:bg-emerald-100'
                    }`}
                  >
                    <Phone size={16} color={isPrivate ? '#94a3b8' : '#006d3b'} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Wallet Top Up Modal Dialog */}
      {isStaff && (
        <Modal
          visible={isTopUpModalOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setIsTopUpModalOpen(false)}
        >
          <View className="flex-1 bg-black/50 justify-center items-center p-6">
            <View className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-xl space-y-4">
              <View className="flex-row justify-between items-center pb-2 border-b border-slate-100">
                <View className="flex-row items-center space-x-2">
                  <Wallet size={20} color="#006d3b" />
                  <Text className="text-lg font-black text-slate-900">
                    Wallet Top Up
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setIsTopUpModalOpen(false)}
                  className="p-1 rounded-full bg-slate-50 active:bg-slate-100"
                >
                  <X size={18} color="#64748b" />
                </TouchableOpacity>
              </View>

              <View className="space-y-1">
                <Text className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                  Resident
                </Text>
                <Text className="text-slate-800 font-bold text-sm">
                  {selectedMember?.user?.name || selectedMember?.User?.name} ({selectedMember?.flatNumber})
                </Text>
              </View>

              <View className="space-y-1.5">
                <Text className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                  Amount (₹)
                </Text>
                <View className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex-row items-center">
                  <IndianRupee size={16} color="#64748b" />
                  <TextInput
                    placeholder="Enter top-up amount"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                    value={topupAmount}
                    onChangeText={setTopupAmount}
                    className="flex-1 ml-2 text-slate-800 font-black p-0"
                  />
                </View>
              </View>

              <View className="space-y-1.5">
                <Text className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                  Payment Method
                </Text>
                <View className="flex-row gap-2">
                  {[
                    { label: 'Cash', value: 'cash' },
                    { label: 'Cheque', value: 'cheque' },
                    { label: 'Online', value: 'online' },
                  ].map(item => {
                    const isSelected = topupMethod === item.value;
                    return (
                      <TouchableOpacity
                        key={item.value}
                        onPress={() => setTopupMethod(item.value as any)}
                        className={`flex-1 py-3 rounded-xl border items-center justify-center ${
                          isSelected
                            ? 'bg-[#006d3b] border-[#006d3b]'
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <Text
                          className={`text-xs font-black ${
                            isSelected ? 'text-white' : 'text-slate-700'
                          }`}
                        >
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View className="flex-row space-x-3 pt-2">
                <TouchableOpacity
                  onPress={() => setIsTopUpModalOpen(false)}
                  disabled={submitting}
                  className="flex-1 py-3.5 bg-slate-100 rounded-xl items-center justify-center active:bg-slate-200"
                >
                  <Text className="text-slate-700 font-black text-sm">
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSaveTopUp}
                  disabled={submitting}
                  className="flex-1 py-3.5 bg-[#006d3b] rounded-xl items-center justify-center active:bg-[#00522c] flex-row space-x-2"
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text className="text-white font-black text-sm">
                      Confirm
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      <CustomAlert
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        type={alert.type}
        onClose={() => setAlert(prev => ({ ...prev, visible: false }))}
      />
    </SafeAreaView>
  );
};
