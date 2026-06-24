import React, { useState, useRef, useEffect } from 'react';
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
} from 'react-native';
import Toast from 'react-native-toast-message';
import apiClient from '../api/client';
import CustomAlert from '../components/CustomAlert';
import { Membership, useAuthStore } from '../store/useAuthStore';
import { ApiResponse } from '../types/api.types';
import { Building, Layers } from 'lucide-react-native';

const AuthScreen = ({ route, navigation }: any) => {
  const { mode, society } = route.params || { mode: 'login' };

  // Form States
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const hiddenPinRef = useRef<any>(null);
  const [cursorVisible, setCursorVisible] = useState(true);
  const [isPinInputFocused, setIsPinInputFocused] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setCursorVisible(v => !v);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const handlePinChangeDirect = (text: string) => {
    const numericText = text.replace(/[^0-9]/g, '').slice(0, 4);
    setPin(numericText);
  };

  const handlePhoneChange = (text: string) => {
    const cleanText = text.replace(/[^0-9]/g, '');
    setPhone(cleanText);
    if (cleanText.length === 10) {
      hiddenPinRef.current?.focus();
    }
  };

  // Resident Specific States (Join Mode)
  const [flatNumber, setFlatNumber] = useState('');
  const [residentRole, setResidentRole] = useState('tenant');

  // Admin Specific States (Create Mode)
  const [societyName, setSocietyName] = useState('');
  const [address, setAddress] = useState('');
  const [govtRegNo, setGovtRegNo] = useState('');
  const [structureType, setStructureType] = useState<'single_building' | 'multi_wing'>('single_building');

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

  // Profile Picker Modal States
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [userMemberships, setUserMemberships] = useState<Membership[]>([]);

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

  const handleSelectProfile = (profile: Membership) => {
    useAuthStore.getState().setActiveProfile(profile);
    setShowProfileModal(false);
    navigation.reset({
      index: 0,
      routes: [{ name: 'DashboardHome' }],
    });
  };

  const handleDismissProfileModal = () => {
    useAuthStore.getState().logout();
    setShowProfileModal(false);
  };

  const handleSubmit = async () => {
    const trimmedPhone = phone.trim();
    const trimmedPin = pin.trim();

    if (!trimmedPhone || !trimmedPin) {
      return Toast.show({
        type: 'error',
        text1: 'Required Fields',
        text2: 'Phone number and PIN are required.',
        position: 'bottom',
      });
    }

    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(trimmedPhone)) {
      return Toast.show({
        type: 'error',
        text1: 'Invalid Phone Number',
        text2: 'Phone number must be exactly 10 digits.',
        position: 'bottom',
      });
    }

    const pinRegex = /^[0-9]{4}$/;
    if (!pinRegex.test(trimmedPin)) {
      return Toast.show({
        type: 'error',
        text1: 'Invalid PIN',
        text2: 'PIN must be exactly 4 digits.',
        position: 'bottom',
      });
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        const res = await apiClient.post('/auth/login', { phone: trimmedPhone, pin: trimmedPin });
        const { token, user } = res.data || {};

        useAuthStore.getState().setAuth(token, user);

        if (!user?.memberships || user.memberships.length === 0) {
          navigation.reset({
            index: 0,
            routes: [{ name: 'GatewayScreen' }],
          });
        } else if (user.memberships.length === 1 && user.memberships[0].status === 'active') {
          useAuthStore.getState().setActiveProfile(user.memberships[0]);
          navigation.reset({
            index: 0,
            routes: [{ name: 'DashboardHome' }],
          });
        } else {
          setUserMemberships(user.memberships || []);
          setShowProfileModal(true);
        }
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
          phone: trimmedPhone,
          pin: trimmedPin,
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
          phone: trimmedPhone,
          pin: trimmedPin,
          societyName,
          address,
          govtRegistrationNo: govtRegNo,
          structureType,
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
    } catch (error) {
      const apiError = error as ApiResponse;
      Toast.show({
        type: 'error',
        text1: 'Authentication Failed',
        text2:
          apiError.message ||
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
              placeholderTextColor="#94a3b8"
              keyboardAppearance="light"
              value={name}
              onChangeText={setName}
            />
          )}

          {/* Credentials Group */}
          <TextInput
            className="w-full bg-[#f1f5f9] border-b-2 border-slate-200 px-4 py-3 text-slate-800 text-base mb-4 rounded-t-xl focus:border-[#006d3b]"
            placeholder="Phone Number"
            placeholderTextColor="#94a3b8"
            keyboardType="phone-pad"
            keyboardAppearance="light"
            maxLength={10}
            value={phone}
            onChangeText={handlePhoneChange}
          />

          {/* Custom 4-Box PIN Input (Fully Masked/Instant Hide) */}
          <View className="mb-4">
            <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              {mode === 'login' ? 'Secret PIN' : 'Set Secret PIN (4 digits)'}
            </Text>
            
            <TouchableOpacity 
              activeOpacity={1} 
              onPress={() => hiddenPinRef.current?.focus()}
              className="flex-row justify-between"
            >
              {[0, 1, 2, 3].map((idx) => {
                const isFocused = isPinInputFocused && pin.length === idx;
                const hasDigit = pin.length > idx;
                
                return (
                  <View
                    key={idx}
                    className={`w-[22%] bg-[#f1f5f9] border-b-2 py-4 items-center justify-center rounded-xl h-14 ${
                      isFocused ? 'border-[#006d3b] bg-slate-50' : 'border-slate-200'
                    }`}
                  >
                    {hasDigit ? (
                      <Text className="text-xl font-bold text-slate-800">*</Text>
                    ) : isFocused && cursorVisible ? (
                      <View className="w-0.5 h-6 bg-[#006d3b]" />
                    ) : null}
                  </View>
                );
              })}
            </TouchableOpacity>

            <TextInput
              ref={hiddenPinRef}
              style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}
              keyboardType="numeric"
              keyboardAppearance="light"
              maxLength={4}
              value={pin}
              onChangeText={handlePinChangeDirect}
              onFocus={() => setIsPinInputFocused(true)}
              onBlur={() => setIsPinInputFocused(false)}
              caretHidden
            />
          </View>

          {/* --- DYNAMIC SECTION: RESIDENT INFO --- */}
          {mode === 'join' && (
            <View>
              <TextInput
                className="w-full bg-[#f1f5f9] border-b-2 border-slate-200 px-4 py-3 text-slate-800 text-base mb-4 rounded-t-xl focus:border-[#006d3b]"
                placeholder="Flat Number (e.g., A-402)"
                placeholderTextColor="#94a3b8"
                keyboardAppearance="light"
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
                placeholderTextColor="#94a3b8"
                keyboardAppearance="light"
                value={societyName}
                onChangeText={setSocietyName}
              />
              <TextInput
                className="w-full bg-[#f1f5f9] border-b-2 border-slate-200 px-4 py-3 text-slate-800 text-base mb-4 rounded-t-xl focus:border-[#006d3b]"
                placeholder="Complete Physical Address"
                placeholderTextColor="#94a3b8"
                keyboardAppearance="light"
                multiline
                value={address}
                onChangeText={setAddress}
              />
              <TextInput
                className="w-full bg-[#f1f5f9] border-b-2 border-slate-200 px-4 py-3 text-slate-800 text-base mb-6 rounded-t-xl focus:border-[#006d3b]"
                placeholder="Govt Registration Number (Unique Lock)"
                placeholderTextColor="#94a3b8"
                keyboardAppearance="light"
                value={govtRegNo}
                onChangeText={setGovtRegNo}
              />
              
              {/* Property Structure Type Selector */}
              <View className="space-y-1.5 mb-6">
                <Text className="text-slate-500 font-bold text-xs uppercase tracking-wide">
                  Property Structure
                </Text>
                <View className="flex-row space-x-3 pt-1">
                  <TouchableOpacity
                    onPress={() => setStructureType('single_building')}
                    className={`flex-1 p-4 rounded-2xl border items-center justify-center space-y-2 bg-slate-50 ${
                      structureType === 'single_building'
                        ? 'border-[#006d3b] bg-emerald-50/20'
                        : 'border-slate-200'
                    }`}
                  >
                    <Building size={20} color={structureType === 'single_building' ? '#006d3b' : '#64748b'} />
                    <Text
                      className={`text-xs font-black ${
                        structureType === 'single_building' ? 'text-[#006d3b]' : 'text-slate-500'
                      }`}
                    >
                      Single Building
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setStructureType('multi_wing')}
                    className={`flex-1 p-4 rounded-2xl border items-center justify-center space-y-2 bg-slate-50 ${
                      structureType === 'multi_wing'
                        ? 'border-[#006d3b] bg-emerald-50/20'
                        : 'border-slate-200'
                    }`}
                  >
                    <Layers size={20} color={structureType === 'multi_wing' ? '#006d3b' : '#64748b'} />
                    <Text
                      className={`text-xs font-black ${
                        structureType === 'multi_wing' ? 'text-[#006d3b]' : 'text-slate-500'
                      }`}
                    >
                      Multi-Wing Complex
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
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
      <Modal
        visible={showProfileModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleDismissProfileModal}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={{
            flex: 1,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}
          onPress={handleDismissProfileModal}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={{ width: '100%', maxWidth: 360 }}
            className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100"
          >
            {/* Header */}
            <View className="items-center mb-6">
              <Text className="text-2xl font-black text-slate-800 tracking-tight text-center">
                Select Profile
              </Text>
              <Text className="text-sm text-slate-400 mt-1.5 text-center px-2">
                Your identity is linked to multiple properties. Choose a building workspace to log into.
              </Text>
            </View>

            {/* List */}
            <ScrollView style={{ maxHeight: 320 }} className="w-full mb-3" showsVerticalScrollIndicator={false}>
              <View>
                {userMemberships.map((item: Membership) => {
                  const isActive = item.status === 'active';
                  return (
                    <TouchableOpacity
                      key={item.id}
                      activeOpacity={isActive ? 0.7 : 1}
                      onPress={() => {
                        if (!isActive) {
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
                      className={`w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 mb-3 flex-row items-center justify-between ${
                        !isActive ? 'opacity-50' : ''
                      }`}
                    >
                      <View className="flex-1 pr-4">
                        <Text className="text-base font-bold text-slate-800 tracking-tight mb-0.5" numberOfLines={1}>
                          {item.society?.name || 'Unknown Building'}
                        </Text>
                        <Text className="text-slate-400 text-xs mb-2" numberOfLines={1}>
                          {item.society?.address || 'No address records configured'}
                        </Text>
                        {item.flatNumber && (
                          <Text className="text-slate-500 font-semibold text-xs">
                            Flat: <Text className="text-slate-800 font-extrabold">{item.flatNumber}</Text>
                          </Text>
                        )}
                      </View>

                      <View className="items-end space-y-1.5 ml-2">
                        <View
                          className={`px-2 py-0.5 rounded border text-center ${
                            item.role === 'admin'
                              ? 'bg-slate-900 border-slate-950'
                              : 'bg-indigo-50 border-indigo-100'
                          }`}
                        >
                          <Text
                            className={`text-[10px] font-bold uppercase tracking-wider ${
                              item.role === 'admin' ? 'text-white' : 'text-indigo-600'
                            }`}
                          >
                            {item.role === 'admin' ? 'Secretary' : item.role}
                          </Text>
                        </View>

                        <View className="flex-row items-center">
                          <View
                            className={`w-1.5 h-1.5 rounded-full mr-1 ${
                              isActive ? 'bg-emerald-500' : 'bg-amber-500'
                            }`}
                          />
                          <Text
                            className={`text-[10px] font-bold uppercase ${
                              isActive ? 'text-emerald-600' : 'text-amber-600'
                            }`}
                          >
                            {item.status}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            {/* Cancel / Sign out Button */}
            <TouchableOpacity
              onPress={handleDismissProfileModal}
              className="w-full bg-rose-50 border border-rose-100 py-3.5 rounded-xl justify-center items-center active:bg-rose-100"
            >
              <Text className="text-rose-600 font-bold text-sm">
                Cancel & Sign out
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

export default AuthScreen;
