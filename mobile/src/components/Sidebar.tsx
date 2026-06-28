import React from 'react';
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/useAuthStore';
import Toast from 'react-native-toast-message';
import {
  Building,
  CheckSquare,
  CreditCard,
  LayoutDashboard,
  LogOut,
  PlusCircle,
  Settings,
  Sliders,
  User,
  Wrench,
} from 'lucide-react-native';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenNoticeModal: () => void;
  navigation: any;
  onOpenExpenseModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  onOpenNoticeModal,
  navigation,
  onOpenExpenseModal,
}) => {
  const user = useAuthStore((state) => state.user);
  const activeMembership = useAuthStore((state) => state.activeMembership);
  const logout = useAuthStore((state) => state.logout);
  const setActiveProfile = useAuthStore((state) => state.setActiveProfile);

  const role = activeMembership?.role || 'tenant';
  const designation = activeMembership?.designation || 'Resident';
  const flatInfo = activeMembership?.flatNumber
    ? `Unit ${activeMembership.flatNumber}`
    : 'Management Desk';
  const societyName = activeMembership?.society?.name || 'Your Society';

  const handleNavigation = (screenName: string) => {
    onClose(); // Seamlessly collapse drawer backdrop before transition animation fires
    navigation.navigate(screenName);
  };

  const handleSignOut = () => {
    onClose();
    logout();
    navigation.reset({
      index: 0,
      routes: [{ name: 'AuthScreen' }],
    });
  };

  return (
    <Modal
      visible={isOpen}
      animationType="none"
      transparent
      onRequestClose={onClose}
    >
      <View className="flex-1 flex-row">
        <SafeAreaView className="h-full bg-white w-[75%] border-r border-slate-100 shadow-2xl p-6 justify-between flex-col">
          <View className="space-y-6">
            {/* Profile Section */}
            <View className="flex-row items-center space-x-3 pb-6 border-b border-slate-100">
              <View className="w-12 h-12 bg-emerald-700 rounded-full items-center justify-center">
                <Text className="text-white font-black text-lg">
                  {user?.name?.substring(0, 2).toUpperCase() || 'US'}
                </Text>
              </View>
              <View className="ml-3 flex-1">
                <Text
                  className="text-slate-900 font-bold text-base tracking-tight"
                  numberOfLines={1}
                >
                  {user?.name}
                </Text>
                <Text className="text-slate-400 text-xs mt-0.5">
                  {designation} • {flatInfo}
                </Text>
              </View>
            </View>

            {/* Multi-Tenant Workspace Switcher */}
            {user?.memberships && user.memberships.length > 1 && (
              <View className="bg-slate-50 p-3 rounded-2xl border border-slate-100 mb-2">
                <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 pl-1">
                  Switch Workspace
                </Text>
                {user.memberships.map((m) => {
                  const isCurrent = m.id === activeMembership?.id;
                  if (isCurrent) return null;
                  return (
                    <TouchableOpacity
                      key={m.id}
                      onPress={() => {
                        setActiveProfile(m);
                        onClose();
                        Toast.show({
                          type: 'success',
                          text1: 'Workspace Switched',
                          text2: `Connected to ${m.society?.name}`,
                        });
                        navigation.reset({
                          index: 0,
                          routes: [{ name: 'DashboardHome' }],
                        });
                      }}
                      className="flex-row items-center p-2 rounded-xl active:bg-slate-100 mb-1"
                    >
                      <Building size={16} color="#64748b" />
                      <View className="ml-2 flex-1">
                        <Text className="text-slate-700 font-bold text-xs" numberOfLines={1}>
                          {m.society?.name}
                        </Text>
                        <Text className="text-slate-400 text-[9px]">
                          {m.role} • {m.flatNumber || 'Management'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Navigation Menu Links */}
            <ScrollView
              className="space-y-1"
              showsVerticalScrollIndicator={false}
            >
              <TouchableOpacity
                onPress={() => handleNavigation('DashboardHome')}
                className="flex-row items-center space-x-3 p-3 bg-emerald-50 rounded-xl mb-1"
              >
                <LayoutDashboard size={20} color="#006d3b" />
                <Text className="text-[#006d3b] font-bold text-sm ml-3">
                  Dashboard Home
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleNavigation('DirectoryScreen')}
                className="flex-row items-center space-x-3 p-3 active:bg-slate-50 rounded-xl mb-1"
              >
                <User size={20} color="#64748b" />
                <Text className="text-slate-700 font-bold text-sm ml-3">
                  Resident Directory
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={() => handleNavigation('SocietyProfileScreen')}
                className="flex-row items-center space-x-3 p-3 active:bg-slate-50 rounded-xl mb-1"
              >
                <Building size={20} color="#64748b" />
                <Text className="text-slate-700 font-bold text-sm ml-3">
                  Society Profile
                </Text>
              </TouchableOpacity>

              {/* 📊 Resident-Facing Payments Ledger Hub */}
              <TouchableOpacity 
                onPress={() => handleNavigation('ResidentLedgerScreen')}
                className="flex-row items-center space-x-3 p-3 active:bg-slate-50 rounded-xl mb-1"
              >
                <CreditCard size={20} color="#64748b" />
                <Text className="text-slate-700 font-bold text-sm ml-3">
                  Payments Ledger
                </Text>
              </TouchableOpacity>

              {/* 🛠️ Resident-Facing Helpdesk Trigger Link */}
              {role !== 'admin' && (
                <TouchableOpacity
                  onPress={() => handleNavigation('ComplaintScreen')}
                  className="flex-row items-center space-x-3 p-3 active:bg-slate-50 rounded-xl mb-1"
                >
                  <Wrench size={20} color="#64748b" />
                  <Text className="text-slate-700 font-bold text-sm ml-3">
                    Raise Complaint
                  </Text>
                </TouchableOpacity>
              )}

              {/* Polymorphic Admin Management Section */}
              {(role === 'admin' || role === 'secretary') && (
                <View className="pt-4 mt-3 border-t border-slate-100 space-y-1">
                  <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wider pl-3 mb-1">
                    Management Desk
                  </Text>

                  {activeMembership?.society?.onboardingStep !== 'COMPLETED' && (
                    <TouchableOpacity
                      onPress={() => handleNavigation('FinancialOnboardingWizard')}
                      className="flex-row items-center space-x-3 p-3 bg-amber-50/70 border border-amber-100 rounded-xl mb-1"
                    >
                      <Sliders size={20} color="#b45309" />
                      <Text className="text-amber-800 font-bold text-sm ml-3">
                        Setup Wizard
                      </Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    onPress={() => handleNavigation('BillingConfigScreen')}
                    className="flex-row items-center space-x-3 p-3 active:bg-slate-50 rounded-xl mb-1"
                  >
                    <Settings size={20} color="#64748b" />
                    <Text className="text-slate-700 font-bold text-sm ml-3">
                      Billing Configurations
                    </Text>
                  </TouchableOpacity>


                  {/* 🛡️ Admin Entry: Incoming Payments Handshake Verification Desk */}
                  <TouchableOpacity
                    onPress={() => handleNavigation('AdminVerificationDesk')}
                    className="flex-row items-center space-x-3 p-3 active:bg-slate-50 rounded-xl mb-1 bg-emerald-50/40 border border-emerald-100/30"
                  >
                    <CheckSquare size={20} color="#006d3b" />
                    <Text className="text-[#006d3b] font-bold text-sm ml-3">
                      Verify Clearances
                    </Text>
                  </TouchableOpacity>

                  {/* Admin Helpdesk Ticket Management Hub Access */}
                  <TouchableOpacity
                    onPress={() => handleNavigation('ComplaintScreen')}
                    className="flex-row items-center space-x-3 p-3 active:bg-slate-50 rounded-xl mb-1 bg-amber-50/50 border border-amber-100/40"
                  >
                    <Wrench size={20} color="#b45309" />
                    <Text className="text-amber-900 font-bold text-sm ml-3">
                      Complaint Hub
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      onClose();
                      onOpenExpenseModal();
                    }}
                    className="flex-row items-center space-x-3 p-3 active:bg-slate-50 rounded-xl mb-1"
                  >
                    <CreditCard size={20} color="#ba1a1a" />
                    <Text className="text-slate-700 font-bold text-sm ml-3">
                      Log Monthly Expense
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      onClose();
                      onOpenNoticeModal();
                    }}
                    className="flex-row items-center space-x-3 p-3 active:bg-slate-50 rounded-xl mb-1"
                  >
                    <PlusCircle size={20} color="#006d3b" />
                    <Text className="text-slate-700 font-bold text-sm ml-3">
                      Broadcast New Notice
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleNavigation('ApprovalManagementScreen')}
                    className="flex-row items-center space-x-3 p-3 active:bg-slate-50 rounded-xl mb-1"
                  >
                    <CheckSquare size={20} color="#64748b" />
                    <Text className="text-slate-700 font-bold text-sm ml-3">
                      Review Approvals
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              <View className="pt-4 mt-3 border-t border-slate-100">
                <TouchableOpacity className="flex-row items-center space-x-3 p-3 active:bg-slate-50 rounded-xl mb-1">
                  <Settings size={20} color="#64748b" />
                  <Text className="text-slate-700 font-bold text-sm ml-3">
                    Settings
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>

          {/* Logout Action Button */}
          <TouchableOpacity
            onPress={handleSignOut}
            className="flex-row items-center space-x-3 p-3 bg-rose-50 border border-rose-100 rounded-xl active:bg-rose-100"
          >
            <LogOut size={20} color="#ba1a1a" />
            <Text className="text-rose-700 font-black text-sm ml-3">
              Sign Out of Session
            </Text>
          </TouchableOpacity>
        </SafeAreaView>

        {/* Overlay Backdrop Closer */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={onClose}
          className="w-[25%] h-full bg-slate-900/40"
        />
      </View>
    </Modal>
  );
};