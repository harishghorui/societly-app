import React, { useState } from 'react';
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Toast from 'react-native-toast-message';
import apiClient from '../api/client';
import CustomAlert from '../components/CustomAlert';
import { useAuthStore } from '../store/useAuthStore';

const AuthScreen = ({ route, navigation }: any) => {
  const { mode, society } = route.params || { mode: 'login' };

  // Form States
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');

  // Resident Specific States (Join Mode)
  const [flatNumber, setFlatNumber] = useState('');
  const [residentRole, setResidentRole] = useState('tenant');

  // Admin Specific States (Create Mode)
  const [societyName, setSocietyName] = useState('');
  const [address, setAddress] = useState('');
  const [govtRegNo, setGovtRegNo] = useState('');

  const [loading, setLoading] = useState(false);

  // Custom Alert State
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
    onConfirm?: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
  });

  const showAlert = (
    title: string,
    message: string,
    type: 'success' | 'error' | 'warning' | 'info',
    onConfirm?: () => void,
  ) => {
    setAlertConfig({
      visible: true,
      title,
      message,
      type,
      onConfirm,
    });
  };

  const handleSubmit = async () => {
    if (!phone || !pin) {
      return Toast.show({
        type: 'error',
        text1: 'Required Fields',
        text2: 'Phone number and PIN are required.',
        position: 'bottom',
      });
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        const res = await apiClient.post('/auth/login', { phone, pin });
        const { token, user } = res.data || {};

        useAuthStore.getState().setAuth(token, user);

        showAlert(
          'Login Successful',
          `Welcome back, ${
            user?.name || 'User'
          }! Click continue to open your dashboard portal workspace.`,
          'success',
          () => {
            setAlertConfig(prev => ({ ...prev, visible: false }));

            if (!user?.memberships || user.memberships.length === 0) {
              navigation.navigate('GatewayScreen');
            } else if (user.memberships.length === 1) {
              useAuthStore.getState().setActiveProfile(user.memberships[0]);
              navigation.navigate('DashboardHome');
            } else {
              navigation.navigate('ProfilePicker');
            }
          },
        );
      } else if (mode === 'join') {
        if (!name || !flatNumber) {
          return Toast.show({
            type: 'error',
            text1: 'Required Fields',
            text2: 'Full Name and Flat Number are required.',
            position: 'bottom',
          });
        }
        await apiClient.post('/auth/join-society', {
          name,
          phone,
          pin,
          societyId: society.id,
          flatNumber,
          role: residentRole,
        });

        showAlert(
          'Request Submitted!',
          'Your request to join the society has been successfully sent. Please wait for the Secretary to review and approve your membership.',
          'success',
          () => {
            setAlertConfig(prev => ({ ...prev, visible: false }));
            navigation.navigate('GatewayScreen');
          },
        );
      } else if (mode === 'create') {
        if (!name || !societyName || !address || !govtRegNo) {
          return Toast.show({
            type: 'error',
            text1: 'Required Fields',
            text2: 'Please fill in all the society details.',
            position: 'bottom',
          });
        }
        const res = await apiClient.post('/auth/create-society', {
          name,
          phone,
          pin,
          societyName,
          address,
          govtRegistrationNo: govtRegNo,
        });

        showAlert(
          'Society Registered!',
          `Your society "${societyName}" is now registered!\n\nRegistration Code: ${
            res.data?.registrationCode || 'N/A'
          }\n\nProvide this code to your residents so they can join.`,
          'success',
          () => {
            setAlertConfig(prev => ({ ...prev, visible: false }));
            navigation.navigate('GatewayScreen');
          },
        );
      }
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Authentication Failed',
        text2:
          error.response?.data?.message ||
          'Something went wrong. Please check your credentials.',
        position: 'bottom',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
        className="bg-[#f7f9fb] p-6" // Using exact fluid surface color
      >
        <View className="bg-white p-6 rounded-3xl border border-slate-100 w-full shadow-sm">
          {/* Dynamic Header Text */}
          <Text className="text-2xl font-bold text-slate-800 mb-1 tracking-tight">
            {mode === 'login' && 'Welcome Back'}
            {mode === 'join' && `Join ${society?.name}`}
            {mode === 'create' && 'Register Your Society'}
          </Text>
          <Text className="text-sm text-[#5f6d7e] mb-6">
            {mode === 'login' && 'Enter credentials to access your dashboard'}
            {mode === 'join' && 'Fill in your flat info to request access'}
            {mode === 'create' && 'Setup your management committee account'}
          </Text>

          {/* Core Profile Fields (Required for Registration) */}
          {mode !== 'login' && (
            <TextInput
              className="w-full bg-[#f1f5f9] border-b-2 border-slate-200 px-4 py-3 text-slate-800 text-base mb-4 rounded-t-xl focus:border-[#006d3b]"
              placeholder="Your Full Name"
              placeholderTextColor="#5f6d7e"
              value={name}
              onChangeText={setName}
            />
          )}

          {/* Credentials Group */}
          <TextInput
            className="w-full bg-[#f1f5f9] border-b-2 border-slate-200 px-4 py-3 text-slate-800 text-base mb-4 rounded-t-xl focus:border-[#006d3b]"
            placeholder="Phone Number"
            placeholderTextColor="#5f6d7e"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />

          <TextInput
            className="w-full bg-[#f1f5f9] border-b-2 border-slate-200 px-4 py-3 text-slate-800 text-base mb-4 rounded-t-xl focus:border-[#006d3b]"
            placeholder="Set Secret PIN (4-6 digits)"
            placeholderTextColor="#5f6d7e"
            secureTextEntry
            keyboardType="numeric"
            value={pin}
            onChangeText={setPin}
          />

          {/* --- DYNAMIC SECTION: RESIDENT INFO --- */}
          {mode === 'join' && (
            <View>
              <TextInput
                className="w-full bg-[#f1f5f9] border-b-2 border-slate-200 px-4 py-3 text-slate-800 text-base mb-4 rounded-t-xl focus:border-[#006d3b]"
                placeholder="Flat Number (e.g., A-402)"
                placeholderTextColor="#5f6d7e"
                value={flatNumber}
                onChangeText={setFlatNumber}
              />

              {/* Custom Segmented Role Picker */}
              <Text className="text-xs font-semibold text-[#5f6d7e] uppercase mb-2 tracking-wider">
                Your Status
              </Text>
              <View className="flex-row bg-slate-100 p-1 rounded-xl mb-6">
                <TouchableOpacity
                  className={`flex-1 py-2 rounded-lg items-center ${
                    residentRole === 'tenant' ? 'bg-white' : ''
                  }`}
                  style={
                    residentRole === 'tenant'
                      ? {
                          shadowColor: '#5f6d7e',
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: 0.1,
                          shadowRadius: 2,
                          elevation: 2,
                        }
                      : {}
                  }
                  onPress={() => setResidentRole('tenant')}
                >
                  <Text
                    className={`font-semibold ${
                      residentRole === 'tenant'
                        ? 'text-[#006d3b]'
                        : 'text-[#5f6d7e]'
                    }`}
                  >
                    Tenant
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className={`flex-1 py-2 rounded-lg items-center ${
                    residentRole === 'owner' ? 'bg-white' : ''
                  }`}
                  style={
                    residentRole === 'owner'
                      ? {
                          shadowColor: '#5f6d7e',
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: 0.1,
                          shadowRadius: 2,
                          elevation: 2,
                        }
                      : {}
                  }
                  onPress={() => setResidentRole('owner')}
                >
                  <Text
                    className={`font-semibold ${
                      residentRole === 'owner'
                        ? 'text-[#006d3b]'
                        : 'text-[#5f6d7e]'
                    }`}
                  >
                    Owner
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* --- DYNAMIC SECTION: SOCIETY BUILDING DETAILS --- */}
          {mode === 'create' && (
            <View>
              <TextInput
                className="w-full bg-[#f1f5f9] border-b-2 border-slate-200 px-4 py-3 text-slate-800 text-base mb-4 rounded-t-xl focus:border-[#006d3b]"
                placeholder="Official Society Name"
                placeholderTextColor="#5f6d7e"
                value={societyName}
                onChangeText={setSocietyName}
              />
              <TextInput
                className="w-full bg-[#f1f5f9] border-b-2 border-slate-200 px-4 py-3 text-slate-800 text-base mb-4 rounded-t-xl focus:border-[#006d3b]"
                placeholder="Complete Physical Address"
                placeholderTextColor="#5f6d7e"
                multiline
                value={address}
                onChangeText={setAddress}
              />
              <TextInput
                className="w-full bg-[#f1f5f9] border-b-2 border-slate-200 px-4 py-3 text-slate-800 text-base mb-6 rounded-t-xl focus:border-[#006d3b]"
                placeholder="Govt Registration Number (Unique Lock)"
                placeholderTextColor="#5f6d7e"
                value={govtRegNo}
                onChangeText={setGovtRegNo}
              />
            </View>
          )}

          {/* Action Button */}
          <TouchableOpacity
            className={`w-full py-3.5 rounded-xl justify-center items-center ${
              loading ? 'bg-emerald-400' : 'bg-[#006d3b]'
            }`}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text className="text-white font-semibold text-base">
              {loading
                ? 'Processing...'
                : mode === 'login'
                ? 'Login'
                : 'Submit Registration'}
            </Text>
          </TouchableOpacity>

          {/* Back Link */}
          <TouchableOpacity
            className="mt-4 items-center"
            onPress={() => navigation.navigate('GatewayScreen')}
          >
            <Text className="text-[#006d3b] text-sm font-medium">
              ← Change Society Selection
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
        onConfirm={alertConfig.onConfirm}
      />
    </>
  );
};

export default AuthScreen;
