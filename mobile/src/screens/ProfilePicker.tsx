import React, { useEffect } from 'react';
import {
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { Membership, useAuthStore } from '../store/useAuthStore';

const ProfilePicker = ({ navigation }: any) => {
  // Read authenticated user state data from your Zustand store instance
  const user = useAuthStore(state => state.user);
  const setActiveProfile = useAuthStore(state => state.setActiveProfile);
  const logout = useAuthStore(state => state.logout);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', () => {
      // If leaving this screen and no active profile is selected, clear auth state
      const currentState = useAuthStore.getState();
      if (!currentState.activeMembership) {
        currentState.logout();
      }
    });
    return unsubscribe;
  }, [navigation]);

  const handleSelectProfile = (profile: Membership) => {
    // 1. Establish the active selection in the global store configuration
    setActiveProfile(profile);

    // 2. Reset the stack to enter the core app layout workspace
    navigation.reset({
      index: 0,
      routes: [{ name: 'DashboardHome' }],
    });
  };

  const handleLogout = () => {
    logout();
    navigation.reset({
      index: 0,
      routes: [{ name: 'GatewayScreen' }],
    });
  };

  // Helper function to render elegant theme badges per user status level
  const renderRoleBadge = (role: string) => {
    const isDark = role === 'admin';
    return (
      <View
        className={`px-2.5 py-1 rounded-md border text-center ${
          isDark
            ? 'bg-slate-900 border-slate-950'
            : 'bg-indigo-5/60 border-indigo-100'
        }`}
      >
        <Text
          className={`text-xs font-bold uppercase tracking-wider ${
            isDark ? 'text-white' : 'text-indigo-600'
          }`}
        >
          {role === 'admin' ? 'Secretary' : role}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
      >
        {/* Profile Context Header Layout */}
        <View className="mb-8 items-center">
          <Text className="text-3xl font-extrabold text-slate-800 tracking-tight">
            Select Profile
          </Text>
          <Text className="text-sm text-slate-400 mt-1.5 text-center px-4">
            Hi {user?.name || 'Resident'}, your identity is linked to multiple
            properties. Choose a building workspace to log into.
          </Text>
        </View>

        {/* Profile List Container Map */}
        <View className="w-full space-y-4">
          {user?.memberships?.map((item: Membership) => (
            <TouchableOpacity
              key={item.id}
              activeOpacity={item.status === 'active' ? 0.7 : 1}
              onPress={() => {
                if (item.status !== 'active') {
                  Toast.show({
                    type: 'error',
                    text1: 'Approval Required',
                    text2: 'This profile is pending approval by the admin.',
                    position: 'bottom',
                  });
                  return;
                }
                handleSelectProfile(item);
              }}
              className={`w-full bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex-row items-center justify-between ${
                item.status !== 'active' ? 'opacity-50' : ''
              }`}
              style={{
                shadowColor: '#0f172a',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.03,
                shadowRadius: 8,
                elevation: 2,
              }}
            >
              <View className="flex-1 pr-4">
                <Text className="text-lg font-bold text-slate-800 tracking-tight mb-0.5">
                  {item.society?.name || 'Unknown Building'}
                </Text>
                <Text className="text-slate-400 text-xs mb-3" numberOfLines={1}>
                  {item.society?.address || 'No address records configured'}
                </Text>

                {item.flatNumber && (
                  <Text className="text-slate-500 font-medium text-xs">
                    Flat Context:{' '}
                    <Text className="text-slate-800 font-bold">
                      {item.flatNumber}
                    </Text>
                  </Text>
                )}
              </View>

              {/* Functional Information Status Elements */}
              <View className="items-end space-y-2">
                {renderRoleBadge(item.role)}
                <View className="flex-row items-center mt-2">
                  <View
                    className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                      item.status === 'active'
                        ? 'bg-emerald-500'
                        : 'bg-amber-500'
                    }`}
                  />
                  <Text
                    className={`text-xs font-semibold uppercase ${
                      item.status === 'active'
                        ? 'text-emerald-600'
                        : 'text-amber-600'
                    }`}
                  >
                    {item.status}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* System Exit Options Link Context */}
        <TouchableOpacity
          onPress={handleLogout}
          className="mt-8 self-center py-2 px-4 rounded-xl active:bg-slate-100"
        >
          <Text className="text-rose-600 font-semibold text-sm">
            Sign out from account
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ProfilePicker;
