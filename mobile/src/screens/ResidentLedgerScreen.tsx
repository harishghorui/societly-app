import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  IndianRupee,
  ReceiptText,
  X,
  Paperclip,
  Wallet,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Text,
  TouchableOpacity,
  View,
  Modal,
  TextInput,
  ScrollView,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { launchImageLibrary } from 'react-native-image-picker';
import apiClient from '../api/client';
import CustomAlert from '../components/CustomAlert';
import { useAuthStore } from '../store/useAuthStore';
import { ApiResponse } from '../types/api.types';

export const ResidentLedgerScreen = ({ navigation }: any) => {
  const activeMembership = useAuthStore(state => state.activeMembership);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [advanceWalletBalance, setAdvanceWalletBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // 📝 Submission states for payment proof
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'cheque'>('cash');
  const [paymentRef, setPaymentRef] = useState('');
  const [remarks, setRemarks] = useState('');
  const [photo, setPhoto] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Custom Alert Modal Configuration states
  const [alert, setAlert] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info' as any,
  });

  const handleOpenPayModal = (invoice: any) => {
    setSelectedInvoice(invoice);
    setPaymentMethod('cash');
    setPaymentRef('');
    setRemarks('');
    setPhoto(null);
    setIsPayModalOpen(true);
  };

  const handlePickPhoto = () => {
    launchImageLibrary(
      { mediaType: 'photo', quality: 0.8 },
      response => {
        if (response.assets && response.assets.length > 0) {
          setPhoto(response.assets[0]);
        }
      },
    );
  };

  const handleSubmitProof = async () => {
    if (!selectedInvoice) return;
    setSubmitting(true);

    const formData = new FormData();
    formData.append('invoiceId', selectedInvoice.id.toString());
    formData.append('paymentMethod', paymentMethod);
    formData.append('paymentRef', paymentRef.trim());
    formData.append('remarks', remarks.trim());
    if (activeMembership?.id) {
      formData.append('membershipId', activeMembership.id.toString());
    }
    
    if (photo) {
      formData.append('proof', {
        uri: photo.uri,
        name: photo.fileName || 'proof_receipt.jpg',
        type: photo.type || 'image/jpeg',
      } as any);
    }

    try {
      const res = await apiClient.post<any, ApiResponse>(
        '/finance/submit-proof',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      if (res.success) {
        const updatedStatus = res.data?.status || 'pending_approval';
        // Update local invoice state
        setInvoices(prev =>
          prev.map(inv =>
            inv.id === selectedInvoice.id
              ? {
                  ...inv,
                  status: updatedStatus,
                  paymentMethod,
                  paymentRef,
                  remarks,
                  proofUrl: res.data?.proofUrl || null,
                  paidAt: res.data?.paidAt || null,
                }
              : inv,
          ),
        );
        setIsPayModalOpen(false);

        const isPaid = updatedStatus === 'paid';
        setAlert({
          visible: true,
          title: isPaid ? 'Payment Confirmed' : 'Proof Submitted',
          message: isPaid
            ? 'Payment has been automatically approved and marked as paid.'
            : 'Payment proof recorded. Waiting for Admin verification.',
          type: 'success',
        });
      }
    } catch (err: any) {
      console.error('Failed submitting payment proof:', err);
      setAlert({
        visible: true,
        title: 'Submission Error',
        message: err.message || 'Failed to submit payment proof.',
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    const fetchMyInvoices = async () => {
      try {
        // Fetching invoices linked to the current logged-in membership instance
        const res = await apiClient.get<any, ApiResponse>(
          `/finance/invoices?membershipId=${activeMembership?.id}`,
        );
        if (res.success && res.data) {
          if (Array.isArray(res.data)) {
            setInvoices(res.data);
            setAdvanceWalletBalance(0);
          } else {
            setInvoices(res.data.invoices || []);
            setAdvanceWalletBalance(res.data.advanceWalletBalance || 0);
          }
        }
      } catch (err) {
        console.error('Failed syncing personal invoice list:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMyInvoices();
  }, [activeMembership]);

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <View className="flex-row items-center space-x-1 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
            <CheckCircle2 size={12} color="#10b981" />
            <Text className="text-[11px] font-black text-[#006d3b] uppercase">
              Paid
            </Text>
          </View>
        );
      case 'overdue':
        return (
          <View className="flex-row items-center space-x-1 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-100">
            <AlertTriangle size={12} color="#f43f5e" />
            <Text className="text-[11px] font-black text-rose-700 uppercase">
              Overdue
            </Text>
          </View>
        );
      case 'pending_approval':
        return (
          <View className="flex-row items-center space-x-1 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-100">
            <Clock size={12} color="#d97706" />
            <Text className="text-[11px] font-black text-amber-600 uppercase">
              Under Review
            </Text>
          </View>
        );
      default:
        return (
          <View className="flex-row items-center space-x-1 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
            <Clock size={12} color="#64748b" />
            <Text className="text-[11px] font-black text-slate-600 uppercase">
              Unpaid
            </Text>
          </View>
        );
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-[#f7f9fb] justify-center items-center">
        <ActivityIndicator size="large" color="#006d3b" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#f7f9fb]">
      {/* Upper Top Navbar Header Bar */}
      <View className="h-16 w-full bg-white px-5 flex-row items-center space-x-3 border-b border-slate-100">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="p-2 -ml-2 rounded-full active:bg-slate-50"
        >
          <ArrowLeft size={22} color="#191c1e" />
        </TouchableOpacity>
        <Text className="text-xl font-black text-slate-900">
          Maintenance Ledger
        </Text>
      </View>

      <FlatList
        data={invoices}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        ListHeaderComponent={
          <View className="bg-emerald-700 rounded-2xl p-5 mb-4 shadow-sm">
            <View className="flex-row justify-between items-center">
              <View className="space-y-1">
                <Text className="text-emerald-100 text-[11px] font-black uppercase tracking-wider">
                  Advance Wallet Balance
                </Text>
                <View className="flex-row items-center">
                  <IndianRupee size={22} color="#ffffff" />
                  <Text className="text-2xl font-black text-white ml-0.5">
                    {Number(advanceWalletBalance).toFixed(2)}
                  </Text>
                </View>
              </View>
              <View className="bg-white/10 p-3 rounded-full">
                <Wallet size={24} color="#ffffff" />
              </View>
            </View>
            <Text className="text-emerald-100/80 text-[11px] font-bold mt-3">
              This balance automatically clears monthly invoices on generation.
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View className="flex-1 py-12 justify-center items-center space-y-2">
            <ReceiptText size={40} color="#94a3b8" />
            <Text className="text-slate-500 font-bold text-sm">
              No historical invoices found for this unit.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const isExpanded = expandedId === item.id;
          let breakdown: any[] = [];
          if (item.maintenanceBreakdown) {
            try {
              breakdown =
                typeof item.maintenanceBreakdown === 'string'
                  ? JSON.parse(item.maintenanceBreakdown)
                  : item.maintenanceBreakdown;
            } catch (e) {
              console.error(e);
            }
          }

          return (
            <View className="bg-white rounded-2xl border border-slate-100 shadow-sm mb-3 overflow-hidden">
              <TouchableOpacity
                onPress={() => toggleExpand(item.id)}
                activeOpacity={0.9}
                className="p-4 flex-row justify-between items-center"
              >
                <View className="space-y-1">
                  <Text className="text-xs font-black text-slate-400 uppercase tracking-wider">
                    {item.billingCycle}
                  </Text>
                  <View className="flex-row items-center space-x-1">
                    <IndianRupee size={15} color="#1e293b" />
                    <Text className="text-lg font-black text-slate-800">
                      {Number(item.amount).toFixed(2)}
                    </Text>
                  </View>
                  <Text className="text-[11px] font-bold text-slate-500">
                    Due: {new Date(item.dueDate).toLocaleDateString('en-IN')}
                  </Text>
                </View>

                <View className="items-end space-y-2">
                  {renderStatusBadge(item.status)}
                  {isExpanded ? (
                    <ChevronUp size={16} color="#64748b" />
                  ) : (
                    <ChevronDown size={16} color="#64748b" />
                  )}
                </View>
              </TouchableOpacity>

              {/* Dynamic Itemized Breakdown Drawer Panel */}
              {isExpanded && (
                <View className="bg-slate-50 px-4 py-3 border-t border-slate-100 space-y-2">
                  <Text className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1">
                    Bill Breakdown
                  </Text>

                  {breakdown.length > 0 ? (
                    breakdown.map((b, i) => (
                      <View
                        key={i}
                        className="flex-row justify-between items-center"
                      >
                        <Text className="text-xs font-bold text-slate-600">
                          {b.head}
                        </Text>
                        <Text className="text-xs font-black text-slate-800">
                          ₹{Number(b.amount).toFixed(2)}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <View className="flex-row justify-between items-center">
                      <Text className="text-xs font-bold text-slate-600">
                        Standard General Maintenance
                      </Text>
                      <Text className="text-xs font-black text-slate-800">
                        ₹{Number(item.amount).toFixed(2)}
                      </Text>
                    </View>
                  )}

                  {item.paidAt && (
                    <View className="border-t border-slate-200/60 pt-2 mt-1 space-y-1">
                      <View className="flex-row justify-between">
                        <Text className="text-[11px] font-bold text-slate-400">
                          Paid Via: {item.paymentMethod?.toUpperCase()}
                        </Text>
                        <Text className="text-[11px] font-bold text-slate-400">
                          On: {new Date(item.paidAt).toLocaleDateString('en-IN')}
                        </Text>
                      </View>
                      {item.proofUrl && (
                        <TouchableOpacity
                          onPress={() => Linking.openURL(item.proofUrl)}
                          className="bg-slate-100 border border-slate-200 py-1.5 px-3 rounded-lg self-start mt-1 active:opacity-90"
                        >
                          <Text className="text-[9px] font-black text-slate-700 uppercase tracking-wide">
                            👁️ View Payment Receipt
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}

                  {item.status === 'pending_approval' && (
                    <View className="border-t border-slate-200/60 pt-3 mt-1 space-y-1">
                      <View className="bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-100 flex-row items-center space-x-1 self-start">
                        <Clock size={10} color="#d97706" />
                        <Text className="text-[10px] font-black text-amber-700 uppercase">
                          Pending Approval
                        </Text>
                      </View>
                      <Text className="text-[11px] font-bold text-slate-500 mt-1">
                        Proof submitted. Waiting for Admin verification.
                      </Text>
                      {item.paymentRef && (
                        <Text className="text-[11px] font-black text-slate-700">
                          Ref: {item.paymentRef}
                        </Text>
                      )}
                      {item.remarks && (
                        <Text className="text-[11px] font-bold italic text-slate-500">
                          Remarks: "{item.remarks}"
                        </Text>
                      )}
                      {item.proofUrl && (
                        <TouchableOpacity
                          onPress={() => Linking.openURL(item.proofUrl)}
                          className="bg-slate-100 border border-slate-200 py-1.5 px-3 rounded-lg self-start mt-2 active:opacity-90"
                        >
                          <Text className="text-[9px] font-black text-slate-700 uppercase tracking-wide">
                            👁️ View Submitted Proof
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}

                  {!item.paidAt && item.status !== 'pending_approval' && (
                    <TouchableOpacity
                      onPress={() => handleOpenPayModal(item)}
                      className="bg-[#006d3b] py-2.5 px-4 rounded-xl items-center mt-3"
                    >
                      <Text className="text-white font-black text-xs">
                        Clear Dues (Submit Proof)
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          );
        }}
      />

      <Modal
        visible={isPayModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsPayModalOpen(false)}
      >
        <View className="flex-1 justify-end bg-slate-900/50">
          <View className="bg-white rounded-t-3xl p-6 space-y-4 shadow-xl max-h-[90%]">
            {/* Header Block */}
            <View className="flex-row justify-between items-center mb-1">
              <View>
                <Text className="text-xl font-black text-slate-900 tracking-tight">
                  Submit Payment Proof
                </Text>
                <Text className="text-slate-400 text-xs mt-0.5">
                  {selectedInvoice?.billingCycle} — ₹{Number(selectedInvoice?.amount).toFixed(2)}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsPayModalOpen(false)}
                className="p-2 bg-slate-50 rounded-full"
              >
                <X size={18} color="#64748b" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Payment Method Selector Segmented Switch */}
              <View className="space-y-1.5 mb-4">
                <Text className="text-slate-500 font-bold text-xs uppercase tracking-wide">
                  Payment Method
                </Text>
                <View className="flex-row bg-slate-100 p-1 rounded-xl">
                  <TouchableOpacity
                    onPress={() => setPaymentMethod('cash')}
                    style={paymentMethod === 'cash' ? { backgroundColor: '#ffffff', shadowColor: '#0f172a', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 1, elevation: 1 } : null}
                    className="flex-1 py-2.5 rounded-lg items-center"
                  >
                    <Text
                      className={`text-xs font-black ${
                        paymentMethod === 'cash' ? 'text-slate-800' : 'text-slate-500'
                      }`}
                    >
                      Cash
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setPaymentMethod('cheque')}
                    style={paymentMethod === 'cheque' ? { backgroundColor: '#ffffff', shadowColor: '#0f172a', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 1, elevation: 1 } : null}
                    className="flex-1 py-2.5 rounded-lg items-center"
                  >
                    <Text
                      className={`text-xs font-black ${
                        paymentMethod === 'cheque' ? 'text-slate-800' : 'text-slate-500'
                      }`}
                    >
                      Cheque / Bank Transfer
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Reference ID input */}
              <View className="space-y-1.5 mb-4">
                <Text className="text-slate-500 font-bold text-xs uppercase tracking-wide">
                  Payment Reference (UTR/Txn ID/Cheque No.)
                </Text>
                <View className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex-row items-center">
                  <TextInput
                    placeholder="e.g. UTR123456789 or Cheque #10024"
                    placeholderTextColor="#94a3b8"
                    value={paymentRef}
                    onChangeText={setPaymentRef}
                    className="flex-1 text-slate-800 font-medium p-0"
                  />
                </View>
              </View>

              {/* Remarks input */}
              <View className="space-y-1.5 mb-4">
                <Text className="text-slate-500 font-bold text-xs uppercase tracking-wide">
                  Remarks / Notes
                </Text>
                <View className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex-row items-center">
                  <TextInput
                    placeholder="e.g. Handed to guard / Paid online on 12th"
                    placeholderTextColor="#94a3b8"
                    value={remarks}
                    onChangeText={setRemarks}
                    multiline
                    numberOfLines={3}
                    className="flex-1 text-slate-800 font-medium p-0"
                  />
                </View>
              </View>

              {/* Receipt / Photo / File Attachment */}
              <View className="space-y-1.5 mb-6">
                <Text className="text-slate-500 font-bold text-xs uppercase tracking-wide">
                  Receipt / Proof Document (Optional)
                </Text>
                <View className="flex-row items-center space-x-3">
                  <TouchableOpacity
                    onPress={handlePickPhoto}
                    className="bg-slate-100 border border-slate-200 py-3 px-4 rounded-xl flex-row items-center space-x-2 active:bg-slate-200"
                  >
                    <Paperclip size={14} color="#475569" />
                    <Text className="text-slate-700 font-black text-xs">
                      {photo ? 'Change File' : 'Attach Photo/File'}
                    </Text>
                  </TouchableOpacity>
                  {photo && (
                    <View className="flex-1 bg-emerald-50 border border-emerald-100 py-2.5 px-3 rounded-xl flex-row items-center justify-between">
                      <Text
                        numberOfLines={1}
                        className="text-[11px] font-bold text-emerald-700 flex-1 mr-2"
                      >
                        ✓ {photo.fileName || 'selected_image.jpg'}
                      </Text>
                      <TouchableOpacity onPress={() => setPhoto(null)}>
                        <X size={14} color="#059669" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>

              {/* Submit Action Button */}
              <TouchableOpacity
                disabled={submitting}
                onPress={handleSubmitProof}
                className="w-full bg-[#006d3b] h-12 rounded-xl flex-row items-center justify-center space-x-1 active:opacity-90 mt-2"
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text className="text-white font-black text-sm">
                    Submit Proof
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

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
