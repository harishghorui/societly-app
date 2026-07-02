import { PlusCircle, ShieldCheck, Sliders, ChevronRight } from 'lucide-react-native';
import React, { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  BackHandler,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import apiClient from '../api/client';
import { useAuthStore } from '../store/useAuthStore';
import { globalStyles } from '../utils/theme';
import { ApiResponse } from '../types/api.types';

import CustomAlert from '../components/CustomAlert';

// Modular Component Imports
import { ExpenseModal } from '../components/ExpenseModal';
import { Navbar } from '../components/Navbar';
import { NoticeModal } from '../components/NoticeModal';
import { Sidebar } from '../components/Sidebar';

// Custom Scalable Senior Hooks
import { useFinance } from '../hooks/useFinance';

const { width } = Dimensions.get('window');

const DashboardHome = ({ navigation }: any) => {
  const user = useAuthStore(state => state.user);
  const activeMembership = useAuthStore(state => state.activeMembership);

  const role = activeMembership?.role || 'tenant';
  const membershipId = activeMembership?.id;
  const societyId = activeMembership?.society?.id;
  const societyName = activeMembership?.society?.name || 'Your Society';
  const flatInfo = activeMembership?.flatNumber
    ? `Unit ${activeMembership.flatNumber}`
    : 'Management Desk';

  // Double-tap back button to exit app on Android
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android') return;

      let lastBackPressed = 0;
      const onBackPress = () => {
        const timeNow = Date.now();
        if (lastBackPressed && timeNow - lastBackPressed < 2000) {
          BackHandler.exitApp();
          return true;
        }
        lastBackPressed = timeNow;
        Toast.show({
          type: 'info',
          text1: 'Press back again to exit',
          position: 'bottom',
          visibilityTime: 2000,
        });
        return true;
      };

      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        onBackPress,
      );

      return () => {
        subscription.remove();
      };
    }, [])
  );

  // Component UI Visibility States
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [noticeModalOpen, setNoticeModalOpen] = useState(false);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);

  // Core Functional Real-Time States
  const [notices, setNotices] = useState<any[]>([]);
  const [fetchingNotices, setFetchingNotices] = useState(false);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [fetchingApprovals, setFetchingApprovals] = useState(false);
  const [activeInvoice, setActiveInvoice] = useState<any | null>(null);
  const [fetchingInvoice, setFetchingInvoice] = useState(false);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [fetchingExpenses, setFetchingExpenses] = useState(false);

  const [alertConfig, setAlertConfig] = useState<{
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

  // Encapsulated Finance Logic Architecture
  const { summary, fetchFinanceSummary } = useFinance();

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const past = new Date(dateString);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${Math.max(1, diffMins)}m ago`;
    return `${Math.floor(diffMins / 60)}h ago`;
  };

  const calculateDaysDue = (dueDateString: string) => {
    const due = new Date(dueDateString);
    const diffDays = Math.ceil(
      (due.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
    );
    return diffDays > 0 ? `Due in ${diffDays} days` : 'Overdue';
  };

  const fetchExpenseHistory = useCallback(async () => {
    if (!societyId) return;
    setFetchingExpenses(true);
    try {
      const res = await apiClient.get(
        `/finance/history?societyId=${societyId}`,
      );
      if (res && res.data) {
        setExpenses(res.data);
      }
    } catch (err) {
      const apiError = err as ApiResponse;
      console.error('❌ Failed to fetch expense history:', apiError);
    } finally {
      setFetchingExpenses(false);
    }
  }, [societyId]);

  const loadDashboardData = async () => {
    if (!societyId) return;
    setFetchingNotices(true);
    try {
      const noticeRes = await apiClient.get(
        `/notices?societyId=${societyId}`,
      );
      if (noticeRes && noticeRes.data) {
        setNotices(noticeRes.data);
      }

      if (role === 'admin') {
        setFetchingApprovals(true);
        const approvalRes = await apiClient.get(
          `/societies/approvals?societyId=${societyId}&status=pending`,
        );
        if (approvalRes && approvalRes.data) {
          setPendingApprovals(approvalRes.data);
        }
      } else if (membershipId) {
        setFetchingInvoice(true);
        const invoiceRes = await apiClient.get(
          `/invoices/resident?membershipId=${membershipId}`,
        );
        if (invoiceRes && invoiceRes.data) {
          setActiveInvoice(invoiceRes.data);
        }
      }

      if (role === 'admin' || role === 'treasurer') {
        fetchExpenseHistory();
      }
    } catch (err) {
      const apiError = err as ApiResponse;
      console.error('Dashboard engine load error:', apiError);
    } finally {
      setFetchingNotices(false);
      setFetchingApprovals(false);
      setFetchingInvoice(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    fetchFinanceSummary();
  }, [societyId, role, membershipId]);

  const executeApprovalAction = async (
    targetId: number,
    targetStatus: 'active' | 'exited',
  ) => {
    setAlertConfig(prev => ({ ...prev, visible: false }));
    try {
      const res = await apiClient.put<any, any>(`/societies/approvals/${targetId}`, {
        status: targetStatus,
        societyId,
      });
      setAlertConfig({
        visible: true,
        title: 'Action Completed',
        message: res.message || `Member successfully ${targetStatus === 'active' ? 'approved' : 'denied'}.`,
        type: 'success',
      });
      setPendingApprovals(prev => prev.filter(item => item.id !== targetId));
    } catch (error) {
      const apiError = error as ApiResponse;
      setAlertConfig({
        visible: true,
        title: 'Action Failed',
        message: apiError.message || 'Failed to update member status.',
        type: 'error',
      });
    }
  };

  const handleApprovalAction = (
    targetId: number,
    targetStatus: 'active' | 'exited',
    memberName: string,
  ) => {
    const actionLabel = targetStatus === 'active' ? 'approve' : 'deny';
    setAlertConfig({
      visible: true,
      title: `${targetStatus === 'active' ? 'Approve' : 'Deny'} Member`,
      message: `Are you sure you want to ${actionLabel} ${memberName}?`,
      type: 'warning',
      confirmText: `Yes, ${targetStatus === 'active' ? 'Approve' : 'Deny'}`,
      cancelText: 'Cancel',
      onConfirm: () => executeApprovalAction(targetId, targetStatus),
    });
  };

  const handleActionGridPress = (moduleLabel: string) => {
    switch (moduleLabel) {
      case 'Complaints':
      case 'Help Desk':
        navigation.navigate('ComplaintScreen');
        break;
      case 'Profile':
        navigation.navigate('DirectoryScreen');
        break;
      default:
        Toast.show({
          type: 'info',
          text1: 'Coming Soon',
          text2: `${moduleLabel} module is rolling out shortly.`,
        });
        break;
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#f7f9fb]">
      <Navbar
        onMenuPress={() => setSidebarOpen(true)}
        navigation={navigation}
      />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        className="flex-1 p-5"
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome Block */}
        <View className="mb-6 flex-row justify-between items-end">
          <View>
            <Text className="text-2xl font-black text-slate-900 tracking-tight">
              Welcome, {user?.name || 'User'}
            </Text>
            <Text className="text-xs font-semibold text-slate-400 mt-0.5">
              {flatInfo} • {societyName}
            </Text>
          </View>
          <View className="bg-slate-100 border border-slate-200 px-3 py-1 rounded-full flex-row items-center">
            <ShieldCheck size={14} color="#3e4a40" />
            <Text className="text-slate-700 text-xs font-bold uppercase tracking-wide ml-1">
              {role === 'admin' ? 'Secretary' : role}
            </Text>
          </View>
        </View>

        {/* Onboarding Intercept Banner */}
        {activeMembership?.society?.onboardingStep !== 'COMPLETED' && (
          <View className="bg-amber-50 border border-amber-200 rounded-3xl p-5 mb-6 shadow-sm space-y-3">
            <View className="flex-row items-center space-x-2">
              <View className="bg-amber-100 p-2 rounded-full">
                <Sliders size={18} color="#b45309" />
              </View>
              <Text className="text-amber-900 font-black text-sm">Financial Onboarding Incomplete</Text>
            </View>
            <Text className="text-amber-800 text-xs leading-relaxed">
              Financial Onboarding Incomplete. Please complete the setup wizard to unlock billing features.
            </Text>
            {(role === 'admin' || role === 'secretary') && (
              <TouchableOpacity
                onPress={() => navigation.navigate('FinancialOnboardingWizard')}
                className="bg-[#006d3b] rounded-xl py-2.5 items-center justify-center active:bg-[#00522c] flex-row space-x-1.5 self-start px-4 shadow-sm"
              >
                <Text className="text-white font-black text-xs">Complete Setup</Text>
                <ChevronRight size={14} color="#ffffff" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Polymorphic Workspace Routing Panels */}
        {role === 'admin' || role === 'treasurer' ? (
          <View className="space-y-6">
            {/* Dynamic Core Analytical Financial Dashboard Matrix */}
            <View className="space-y-3">
              <View className="flex-row justify-between">
                <View
                  style={globalStyles.shadowAmbient}
                  className="bg-white border border-slate-100 rounded-2xl p-4 w-[48%]"
                >
                  <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                    Total Collected
                  </Text>
                  <Text className="text-2xl font-black text-[#006d3b] mt-2">
                    ₹{Number(summary?.totalCollected || 0).toFixed(2)}
                  </Text>
                </View>
                <View
                  style={globalStyles.shadowAmbient}
                  className="bg-white border border-slate-100 rounded-2xl p-4 w-[48%]"
                >
                  <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                    Pending Dues
                  </Text>
                  <Text className="text-2xl font-black text-rose-700 mt-2">
                    ₹{Number(summary?.totalPending || 0).toFixed(2)}
                  </Text>
                </View>
              </View>

              <View className="flex-row justify-between">
                <View
                  style={globalStyles.shadowAmbient}
                  className="bg-white border border-slate-100 rounded-2xl p-4 w-[48%]"
                >
                  <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                    Bank Balance
                  </Text>
                  <Text className="text-lg font-bold text-slate-800 mt-1">
                    ₹{Number(summary?.bankBalance || 0).toFixed(2)}
                  </Text>
                </View>
                <View
                  style={globalStyles.shadowAmbient}
                  className="bg-white border border-slate-100 rounded-2xl p-4 w-[48%]"
                >
                  <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                    Cash Reserves
                  </Text>
                  <Text className="text-lg font-bold text-slate-800 mt-1">
                    ₹{Number(summary?.cashBalance || 0).toFixed(2)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Historical Expense Auditing Matrix */}
            <View className="space-y-3">
              <View className="flex-row justify-between items-center">
                <Text className="text-lg font-bold text-slate-800 tracking-tight">
                  Past Payouts & Expenses
                </Text>
                <TouchableOpacity
                  onPress={() => setExpenseModalOpen(true)}
                  className="flex-row items-center"
                >
                  <PlusCircle size={14} color="#006d3b" />
                  <Text className="text-[#006d3b] text-xs font-bold ml-1">
                    Log Expense
                  </Text>
                </TouchableOpacity>
              </View>

              {fetchingExpenses ? (
                <ActivityIndicator color="#006d3b" />
              ) : expenses.length === 0 ? (
                <View className="bg-white border border-slate-100 p-6 rounded-2xl items-center">
                  <Text className="text-slate-400 text-xs">
                    No logged expenses found.
                  </Text>
                </View>
              ) : (
                <View className="bg-white border border-slate-100 rounded-2xl divide-y divide-slate-100 overflow-hidden shadow-sm">
                  {expenses.map(exp => (
                    <View key={exp.id} className="p-4 flex-row justify-between items-center">
                      <View className="flex-1 mr-3">
                        <Text className="font-bold text-slate-800 text-sm" numberOfLines={1}>
                          {exp.title}
                        </Text>
                        <Text className="text-slate-400 text-[10px] mt-0.5 font-semibold">
                          {exp.category} • {exp.paymentMethod.toUpperCase()}
                        </Text>
                      </View>
                      <View className="items-end">
                        <Text className="font-black text-rose-600 text-sm">
                          - ₹{Number(exp.amount).toFixed(2)}
                        </Text>
                        <Text className="text-slate-400 text-[9px] mt-0.5">
                          {new Date(exp.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Approvals Scroller Strip */}
            {role === 'admin' && (
              <View className="space-y-3">
                <Text className="text-xl font-bold text-slate-800 tracking-tight">
                  Pending Approvals
                </Text>
                {fetchingApprovals ? (
                  <ActivityIndicator color="#006d3b" />
                ) : pendingApprovals.length === 0 ? (
                  <View className="bg-white border border-slate-100 p-4 rounded-2xl">
                    <Text className="text-slate-400 text-xs">
                      No pending registration approvals.
                    </Text>
                  </View>
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    className="flex-row"
                  >
                    {pendingApprovals.map(item => (
                      <View
                        key={item.id}
                        style={{ width: width * 0.7 }}
                        className="bg-white border border-slate-100 p-4 mr-4 rounded-2xl shadow-sm"
                      >
                        <Text className="font-bold text-slate-800 text-sm mb-1">
                          {item.user?.name}
                        </Text>
                        <Text className="text-slate-400 text-xs mb-3">
                          Unit {item.flatNumber || 'N/A'} • {item.role}
                        </Text>
                        <View className="flex-row justify-between">
                          <TouchableOpacity
                            onPress={() =>
                              handleApprovalAction(item.id, 'exited', item.user?.name || 'this applicant')
                            }
                            className="flex-1 bg-slate-100 py-1.5 rounded-lg items-center mr-1"
                          >
                            <Text className="text-slate-600 text-xs font-bold">
                              Deny
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() =>
                              handleApprovalAction(item.id, 'active', item.user?.name || 'this applicant')
                            }
                            className="flex-1 bg-[#006d3b] py-1.5 rounded-lg items-center ml-1"
                          >
                            <Text className="text-white text-xs font-bold">
                              Approve
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                )}
              </View>
            )}
          </View>
        ) : (
          <View className="space-y-6">
            {/* Society master balance pool snapshot for residents when transparency is enabled */}
            {summary?.transparencyEnabled && (
              <View className="space-y-3">
                <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Society Finance Pool
                </Text>
                <View className="flex-row justify-between">
                  <View
                    style={globalStyles.shadowAmbient}
                    className="bg-white border border-slate-100 rounded-2xl p-4 w-[48%]"
                  >
                    <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                      Bank Balance
                    </Text>
                    <Text className="text-lg font-bold text-slate-800 mt-1">
                      ₹{Number(summary?.bankBalance || 0).toFixed(2)}
                    </Text>
                  </View>
                  <View
                    style={globalStyles.shadowAmbient}
                    className="bg-white border border-slate-100 rounded-2xl p-4 w-[48%]"
                  >
                    <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                      Cash Reserves
                    </Text>
                    <Text className="text-lg font-bold text-slate-800 mt-1">
                      ₹{Number(summary?.cashBalance || 0).toFixed(2)}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Resident Ledger Widget Card */}
            {fetchingInvoice ? (
              <View className="bg-white rounded-3xl border border-slate-100 p-6 items-center justify-center h-40">
                <ActivityIndicator color="#006d3b" />
              </View>
            ) : activeInvoice ? (
              <View
                style={globalStyles.shadowAmbient}
                className="bg-white rounded-3xl border border-slate-100 p-6"
              >
                <View className="flex-row justify-between items-start mb-6">
                  <View>
                    <Text className="text-lg font-bold text-slate-800">
                      Maintenance Dues
                    </Text>
                    <Text className="text-xs text-[#5f6d7e] mt-0.5">
                      Cycle: {activeInvoice.billingCycle}
                    </Text>
                  </View>
                  <View className="bg-amber-50 px-2.5 py-0.5 rounded-full">
                    <Text className="text-amber-700 text-xs font-bold uppercase">
                      {activeInvoice.status}
                    </Text>
                  </View>
                </View>
                <View className="flex-row justify-between items-end">
                  <View>
                    <Text className="text-4xl font-black text-slate-900">
                      ₹{Number(activeInvoice.amount).toFixed(2)}
                    </Text>
                    <Text className="text-xs font-bold text-slate-500 mt-1.5">
                      ⚠️ {calculateDaysDue(activeInvoice.dueDate)}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => navigation.navigate('ResidentLedgerScreen')} className="bg-[#006d3b] px-6 py-3 rounded-xl">
                    <Text className="text-white font-bold text-xs">
                      Pay Now
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View
                style={globalStyles.shadowAmbient}
                className="bg-white rounded-3xl border border-slate-100 p-6 flex-row items-center justify-between"
              >
                <Text className="text-base font-bold text-slate-800">
                  🎉 No Outstanding Maintenance Bills
                </Text>
              </View>
            )}

            {/* Matrix Operational Actions Grid */}
            <View className="flex-row flex-wrap justify-between">
              {[
                'Amenity Booking',
                'Visitor Pass',
                'Help Desk',
                'Complaints',
                'Profile',
              ].map((lbl, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => handleActionGridPress(lbl)}
                  style={{ width: (width - 50) / 2 }}
                  className="bg-white border border-slate-100 rounded-2xl p-4 mb-4 items-center shadow-sm"
                >
                  <View className="w-10 h-10 bg-slate-50 rounded-full items-center justify-center mb-2">
                    <Text className="text-base">
                      {lbl === 'Profile'
                        ? '👥'
                        : lbl === 'Complaints' || lbl === 'Help Desk'
                        ? '🛠️'
                        : '🗓️'}
                    </Text>
                  </View>
                  <Text className="text-slate-800 font-bold text-xs text-center">
                    {lbl}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Render Modular Shared Notice Board feed */}
        <View className="space-y-3 mt-4">
          <View className="flex-row justify-between items-center mb-1">
            <Text className="text-xl font-bold text-slate-800 tracking-tight">
              Notice Board
            </Text>
            {role === 'admin' && (
              <TouchableOpacity
                onPress={() => setNoticeModalOpen(true)}
                className="flex-row items-center space-x-1 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100"
              >
                <PlusCircle size={14} color="#006d3b" />
                <Text className="text-[#006d3b] text-xs font-bold ml-1">
                  New
                </Text>
              </TouchableOpacity>
            )}
          </View>
          {fetchingNotices ? (
            <ActivityIndicator color="#006d3b" />
          ) : notices.length === 0 ? (
            <View className="bg-white border border-slate-100 p-6 rounded-2xl items-center">
              <Text className="text-slate-400 text-xs">
                No notice broadcasts found.
              </Text>
            </View>
          ) : (
            <View className="bg-white border border-slate-100 rounded-3xl divide-y divide-slate-100 overflow-hidden shadow-sm">
              {notices.map(notice => {
                const category = notice.category || 'General';
                return (
                  <View key={notice.id} className="p-4 flex-row items-start">
                    <View className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center mt-0.5">
                      <Text className="text-base">📢</Text>
                    </View>
                    <View className="flex-1 ml-3">
                      <View className="flex-row justify-between items-center">
                        <View className="flex-row items-center flex-1 mr-2">
                          <Text
                            className="font-bold text-slate-800 text-sm flex-shrink mr-2"
                            numberOfLines={1}
                          >
                            {notice.title}
                          </Text>
                          <View className={`px-1.5 py-0.5 rounded border ${
                            category === 'Urgent'
                              ? 'bg-rose-50 border-rose-100'
                              : category === 'Event'
                              ? 'bg-emerald-50 border-emerald-100'
                              : 'bg-blue-50 border-blue-100'
                          }`}>
                            <Text className={`text-[9px] font-bold ${
                              category === 'Urgent'
                                ? 'text-rose-600'
                                : category === 'Event'
                                ? 'text-emerald-600'
                                : 'text-blue-600'
                            }`}>
                              {category}
                            </Text>
                          </View>
                        </View>
                        <Text className="text-slate-400 text-xs">
                          {formatTimeAgo(notice.createdAt)}
                        </Text>
                      </View>
                      <Text className="text-slate-500 text-xs mt-1 leading-relaxed">
                        {notice.description}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* MODULAR COMPONENT LAYERS */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onOpenNoticeModal={() => setNoticeModalOpen(true)}
        onOpenExpenseModal={() => setExpenseModalOpen(true)}
        navigation={navigation}
      />

      <NoticeModal
        isOpen={noticeModalOpen}
        onClose={() => setNoticeModalOpen(false)}
        societyId={societyId}
        onNoticePublished={newNotice =>
          setNotices(prev => [newNotice, ...prev])
        }
      />

      <ExpenseModal
        isOpen={expenseModalOpen}
        onClose={() => setExpenseModalOpen(false)}
        onExpenseLogged={() => {
          fetchFinanceSummary();
          fetchExpenseHistory();
        }}
      />

      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        confirmText={alertConfig.confirmText}
        cancelText={alertConfig.cancelText}
        onConfirm={alertConfig.onConfirm}
        onClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
      />
    </SafeAreaView>
  );
};

export default DashboardHome;
