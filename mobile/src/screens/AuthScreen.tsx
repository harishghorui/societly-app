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
import { getAuth, signInWithPhoneNumber } from '@react-native-firebase/auth';

const AuthScreen = ({ route, navigation }: any) => {
  const { mode, society } = route.params || { mode: 'login' };

  // Form States
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const hiddenPinRef = useRef<any>(null);
  const newPinRef = useRef<any>(null);
  const confirmPinRef = useRef<any>(null);
  const [cursorVisible, setCursorVisible] = useState(true);
  const [isPinInputFocused, setIsPinInputFocused] = useState(false);
  const [isNewPinFocused, setIsNewPinFocused] = useState(false);
  const [isConfirmPinFocused, setIsConfirmPinFocused] = useState(false);

  // Multi-step Auth States
  const [loginStep, setLoginStep] = useState<'phone' | 'otp' | 'activate' | 'pin' | 'reset_pin_input'>('phone');
  const [isResettingPin, setIsResettingPin] = useState(false);
  const [confirm, setConfirm] = useState<any>(null);
  const [otpCode, setOtpCode] = useState('');
  const [firebaseToken, setFirebaseToken] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

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

  const handleNewPinChangeDirect = (text: string) => {
    const numericText = text.replace(/[^0-9]/g, '').slice(0, 4);
    setPin(numericText);
    if (numericText.length === 4) {
      confirmPinRef.current?.focus();
    }
  };

  const handleConfirmPinChangeDirect = (text: string) => {
    const numericText = text.replace(/[^0-9]/g, '').slice(0, 4);
    setConfirmPin(numericText);
  };

  const handlePhoneChange = (text: string) => {
    const cleanText = text.replace(/[^0-9]/g, '');
    setPhone(cleanText);
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
    onCancel?: () => void;
    confirmText?: string;
    cancelText?: string;
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
    confirmText?: string,
    cancelText?: string,
    onCancel?: () => void,
  ) => {
    setAlertConfig({
      visible: true,
      title,
      message,
      type,
      onConfirm,
      confirmText,
      cancelText,
      onCancel,
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

  const handleSuccessAuth = (token: string, user: any) => {
    useAuthStore.getState().setAuth(token, user);
    
    if (!user?.memberships || user.memberships.length === 0) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'AuthScreen', params: { mode: 'login' } }],
      });
    } else if (user.memberships.length === 1) {
      if (user.memberships[0].status === 'active') {
        useAuthStore.getState().setActiveProfile(user.memberships[0]);
        navigation.reset({
          index: 0,
          routes: [{ name: 'DashboardHome' }],
        });
      } else {
        useAuthStore.getState().logout();
        Toast.show({
          type: 'info',
          text1: 'Approval Pending',
          text2: 'Your membership is pending approval by the society administrator.',
          position: 'bottom',
        });
        navigation.reset({
          index: 0,
          routes: [{ name: 'AuthScreen', params: { mode: 'login' } }],
        });
      }
    } else {
      navigation.reset({
        index: 0,
        routes: [{ name: 'ProfilePicker' }],
      });
    }
  };

  const handleCheckPhone = async () => {
    const trimmedPhone = phone.trim();
    if (!trimmedPhone) {
      return Toast.show({
        type: 'error',
        text1: 'Required Field',
        text2: 'Phone number is required.',
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

    setLoading(true);
    try {
      const res = await apiClient.post('/auth/check-phone', { phone: trimmedPhone });
      const { status } = res.data || {};

      if (status === 'invited') {
        let formattedPhone = trimmedPhone;
        if (!trimmedPhone.startsWith('+')) {
          formattedPhone = `+91${trimmedPhone}`;
        }
        
        const authInstance = getAuth();
        if (__DEV__) {
          authInstance.settings.appVerificationDisabledForTesting = true;
        }
        console.log("📱 Calling Firebase signInWithPhoneNumber with:", formattedPhone);
        const confirmation = await signInWithPhoneNumber(authInstance, formattedPhone);
        setConfirm(confirmation);
        setLoginStep('otp');
        Toast.show({
          type: 'success',
          text1: 'OTP Sent',
          text2: `A verification code has been sent to ${formattedPhone}`,
          position: 'bottom',
        });
      } else if (status === 'active') {
        setLoginStep('pin');
        setTimeout(() => {
          hiddenPinRef.current?.focus();
        }, 100);
      }
    } catch (error) {
      const apiError = error as ApiResponse;
      if (apiError.error?.code === 'NUMBER_NOT_INDEXED') {
        showAlert(
          'Number Not Registered',
          'Your phone number is not pre-registered in any society database. Please contact your society administrator/secretary to be invited.',
          'error'
        );
      } else {
        Toast.show({
          type: 'error',
          text1: 'Verification Failed',
          text2: apiError.message || 'Something went wrong. Please check your network connection.',
          position: 'bottom',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const trimmedOtp = otpCode.trim();
    if (!trimmedOtp || trimmedOtp.length !== 6) {
      return Toast.show({
        type: 'error',
        text1: 'Invalid OTP',
        text2: 'Please enter a valid 6-digit OTP code.',
        position: 'bottom',
      });
    }

    setLoading(true);
    try {
      const credential = await confirm.confirm(trimmedOtp);
      const authInstance = getAuth();
      if (credential && authInstance.currentUser) {
        const token = await authInstance.currentUser?.getIdToken();
        if (token) {
          setFirebaseToken(token);
          if (isResettingPin) {
            setPin('');
            setConfirmPin('');
            setLoginStep('reset_pin_input');
            Toast.show({
              type: 'success',
              text1: 'Phone Verified',
              text2: 'Please enter your new 4-digit secret PIN.',
              position: 'bottom',
            });
          } else {
            setLoginStep('activate');
            Toast.show({
              type: 'success',
              text1: 'Phone Verified',
              text2: 'Please set up your profile name and secure 4-digit PIN.',
              position: 'bottom',
            });
          }
        } else {
          throw new Error('Could not retrieve Firebase token.');
        }
      } else {
        throw new Error('Verification failed.');
      }
    } catch (error) {
      console.error(error);
      Toast.show({
        type: 'error',
        text1: 'Verification Failed',
        text2: 'Invalid OTP code. Please try again.',
        position: 'bottom',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleActivateAccount = async () => {
    const trimmedName = name.trim();
    const trimmedPin = pin.trim();
    const trimmedConfirmPin = confirmPin.trim();

    if (!trimmedName || !trimmedPin || !trimmedConfirmPin) {
      return Toast.show({
        type: 'error',
        text1: 'Required Fields',
        text2: 'Name and PIN setup fields are required.',
        position: 'bottom',
      });
    }

    if (trimmedPin.length !== 4 || trimmedConfirmPin.length !== 4) {
      return Toast.show({
        type: 'error',
        text1: 'Invalid PIN',
        text2: 'PIN must be exactly 4 digits.',
        position: 'bottom',
      });
    }

    if (trimmedPin !== trimmedConfirmPin) {
      return Toast.show({
        type: 'error',
        text1: 'PIN Mismatch',
        text2: 'The entered PINs do not match.',
        position: 'bottom',
      });
    }

    setLoading(true);
    try {
      const res = await apiClient.post('/auth/activate', {
        phone: phone.trim(),
        firebaseToken,
        name: trimmedName,
        pin: trimmedPin,
      });

      const { token, user } = res.data || {};
      Toast.show({
        type: 'success',
        text1: 'Activation Complete',
        text2: 'Your account is active and you are logged in.',
        position: 'bottom',
      });

      handleSuccessAuth(token, user);
    } catch (error) {
      const apiError = error as ApiResponse;
      Toast.show({
        type: 'error',
        text1: 'Activation Failed',
        text2: apiError.message || 'Could not activate account. Please retry.',
        position: 'bottom',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPinTrigger = () => {
    let formattedPhone = phone.trim();
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = `+91${formattedPhone}`;
    }

    showAlert(
      'Reset PIN Confirmation',
      `Are you sure you want to verify your phone number ${formattedPhone} via OTP to reset your secure PIN?`,
      'info',
      () => {
        setAlertConfig(prev => ({ ...prev, visible: false }));
        setIsResettingPin(true);
        triggerForgotPinSms(formattedPhone);
      },
      'Confirm',
      'Change Number',
      () => {
        setAlertConfig(prev => ({ ...prev, visible: false }));
        setLoginStep('phone');
        setPin('');
      }
    );
  };

  const triggerForgotPinSms = async (formattedPhone: string) => {
    setLoading(true);
    try {
      const authInstance = getAuth();
      if (__DEV__) {
        authInstance.settings.appVerificationDisabledForTesting = true;
      }
      console.log("📱 Calling Firebase signInWithPhoneNumber for Reset PIN with:", formattedPhone);
      const confirmation = await signInWithPhoneNumber(authInstance, formattedPhone);
      setConfirm(confirmation);
      setLoginStep('otp');
      Toast.show({
        type: 'success',
        text1: 'OTP Sent',
        text2: `A verification code has been sent to ${formattedPhone}`,
        position: 'bottom',
      });
    } catch (error) {
      console.error("Firebase Auth trigger failed for reset pin:", error);
      Toast.show({
        type: 'error',
        text1: 'SMS Dispatch Failed',
        text2: 'Could not send verification code. Please check SMS region policies.',
        position: 'bottom',
      });
      setIsResettingPin(false);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPinSubmit = async () => {
    const trimmedPin = pin.trim();
    const trimmedConfirmPin = confirmPin.trim();

    if (!trimmedPin || !trimmedConfirmPin) {
      return Toast.show({
        type: 'error',
        text1: 'Required Fields',
        text2: 'Both PIN fields are required.',
        position: 'bottom',
      });
    }

    if (trimmedPin.length !== 4 || trimmedConfirmPin.length !== 4) {
      return Toast.show({
        type: 'error',
        text1: 'Invalid PIN',
        text2: 'PIN must be exactly 4 digits.',
        position: 'bottom',
      });
    }

    if (trimmedPin !== trimmedConfirmPin) {
      return Toast.show({
        type: 'error',
        text1: 'PIN Mismatch',
        text2: 'The entered PINs do not match.',
        position: 'bottom',
      });
    }

    setLoading(true);
    try {
      await apiClient.post('/auth/reset-pin', {
        phone: phone.trim(),
        firebaseToken,
        pin: trimmedPin,
      });

      showAlert(
        'PIN Reset Complete',
        'Your secret login PIN has been updated successfully. Please log in using your new PIN.',
        'success',
        () => {
          setAlertConfig(prev => ({ ...prev, visible: false }));
          setIsResettingPin(false);
          setLoginStep('phone');
          setPhone('');
          setPin('');
          setConfirmPin('');
        }
      );
    } catch (error) {
      const apiError = error as ApiResponse;
      Toast.show({
        type: 'error',
        text1: 'Reset Failed',
        text2: apiError.message || 'Could not update your PIN. Please try again.',
        position: 'bottom',
      });
    } finally {
      setLoading(false);
    }
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
        handleSuccessAuth(token, user);
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
            navigation.reset({
              index: 0,
              routes: [{ name: 'AuthScreen', params: { mode: 'login' } }],
            });
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
            navigation.reset({
              index: 0,
              routes: [{ name: 'AuthScreen', params: { mode: 'login' } }],
            });
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
            {mode === 'login' && (
              <>
                {loginStep === 'phone' && 'Sign In'}
                {loginStep === 'otp' && 'Verify Code'}
                {loginStep === 'activate' && 'Activate Account'}
                {loginStep === 'pin' && 'Enter PIN'}
                {loginStep === 'reset_pin_input' && 'Reset PIN'}
              </>
            )}
            {mode === 'join' && `Join ${society?.name}`}
            {mode === 'create' && 'Register Your Society'}
          </Text>
          <Text className="text-sm text-[#5f6d7e] mb-6">
            {mode === 'login' && (
              <>
                {loginStep === 'phone' && 'Enter your phone number to check registration status'}
                {loginStep === 'otp' && 'Enter the 6-digit verification code sent to your phone'}
                {loginStep === 'activate' && 'Enter your name and choose a secure 4-digit login PIN'}
                {loginStep === 'pin' && 'Enter your 4-digit secret PIN to log in'}
                {loginStep === 'reset_pin_input' && 'Choose a new secure 4-digit login PIN'}
              </>
            )}
            {mode === 'join' && 'Fill in your flat info to request access'}
            {mode === 'create' && 'Setup your management committee account'}
          </Text>

          {/* Conditional Input Rendering based on Mode */}
          {mode === 'login' ? (
            <View>
              {loginStep === 'phone' && (
                <View>
                  <TextInput
                    className="w-full bg-[#f1f5f9] border-b-2 border-slate-200 px-4 py-3 text-slate-800 text-base mb-4 rounded-t-xl focus:border-[#006d3b]"
                    placeholder="Phone Number"
                    placeholderTextColor="#94a3b8"
                    keyboardType="phone-pad"
                    keyboardAppearance="light"
                    maxLength={10}
                    value={phone}
                    onChangeText={setPhone}
                  />
                  <TouchableOpacity
                    onPress={handleCheckPhone}
                    disabled={loading}
                    className="w-full bg-[#006d3b] py-3.5 rounded-xl justify-center items-center active:bg-[#00522c] mb-4 mt-2"
                  >
                    <Text className="text-white font-bold text-base">
                      {loading ? 'Verifying...' : 'Next'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      setName('');
                      setPhone('');
                      setPin('');
                      setConfirmPin('');
                      navigation.setParams({ mode: 'create' });
                    }}
                    className="w-full py-2.5 rounded-xl justify-center items-center active:bg-slate-100"
                  >
                    <Text className="text-[#006d3b] font-bold text-sm">
                      Register a new society
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {loginStep === 'otp' && (
                <View>
                  <TextInput
                    className="w-full bg-[#f1f5f9] border-b-2 border-slate-200 px-4 py-3 text-slate-800 text-base mb-4 rounded-t-xl focus:border-[#006d3b]"
                    placeholder="6-Digit OTP Code"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                    keyboardAppearance="light"
                    maxLength={6}
                    value={otpCode}
                    onChangeText={setOtpCode}
                  />
                  <TouchableOpacity
                    onPress={handleVerifyOtp}
                    disabled={loading}
                    className="w-full bg-[#006d3b] py-3.5 rounded-xl justify-center items-center active:bg-[#00522c] mb-4 mt-2"
                  >
                    <Text className="text-white font-bold text-base">
                      {loading ? 'Verifying OTP...' : 'Verify OTP'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      setLoginStep('phone');
                      setOtpCode('');
                    }}
                    className="w-full py-2.5 rounded-xl justify-center items-center active:bg-slate-100"
                  >
                    <Text className="text-slate-500 font-semibold text-sm">
                      Change Phone Number
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {loginStep === 'activate' && (
                <View>
                  <TextInput
                    className="w-full bg-[#f1f5f9] border-b-2 border-slate-200 px-4 py-3 text-slate-800 text-base mb-4 rounded-t-xl focus:border-[#006d3b]"
                    placeholder="Your Full Name"
                    placeholderTextColor="#94a3b8"
                    keyboardAppearance="light"
                    value={name}
                    onChangeText={setName}
                  />
                  <TextInput
                    className="w-full bg-[#f1f5f9] border-b-2 border-slate-200 px-4 py-3 text-slate-800 text-base mb-4 rounded-t-xl focus:border-[#006d3b]"
                    placeholder="Set 4-Digit Secret PIN"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                    secureTextEntry
                    maxLength={4}
                    keyboardAppearance="light"
                    value={pin}
                    onChangeText={handlePinChangeDirect}
                  />
                  <TextInput
                    className="w-full bg-[#f1f5f9] border-b-2 border-slate-200 px-4 py-3 text-slate-800 text-base mb-4 rounded-t-xl focus:border-[#006d3b]"
                    placeholder="Confirm 4-Digit Secret PIN"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                    secureTextEntry
                    maxLength={4}
                    keyboardAppearance="light"
                    value={confirmPin}
                    onChangeText={setConfirmPin}
                  />
                  <TouchableOpacity
                    onPress={handleActivateAccount}
                    disabled={loading}
                    className="w-full bg-[#006d3b] py-3.5 rounded-xl justify-center items-center active:bg-[#00522c] mb-4 mt-2"
                  >
                    <Text className="text-white font-bold text-base">
                      {loading ? 'Activating Account...' : 'Activate Account'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {loginStep === 'reset_pin_input' && (
                <View>
                  {/* New PIN custom input */}
                  <View className="mb-4">
                    <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                      New Secret PIN (4 digits)
                    </Text>
                    
                    <View className="flex-row justify-between relative">
                      {[0, 1, 2, 3].map((idx) => {
                        const isFocused = isNewPinFocused && pin.length === idx;
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

                      <TextInput
                        ref={newPinRef}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          opacity: 0.01,
                          color: 'transparent',
                          backgroundColor: 'transparent',
                        }}
                        keyboardType="numeric"
                        keyboardAppearance="light"
                        maxLength={4}
                        value={pin}
                        onChangeText={handleNewPinChangeDirect}
                        onFocus={() => setIsNewPinFocused(true)}
                        onBlur={() => setIsNewPinFocused(false)}
                        caretHidden
                      />
                    </View>
                  </View>

                  {/* Confirm PIN custom input */}
                  <View className="mb-6">
                    <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                      Confirm New PIN (4 digits)
                    </Text>
                    
                    <View className="flex-row justify-between relative">
                      {[0, 1, 2, 3].map((idx) => {
                        const isFocused = isConfirmPinFocused && confirmPin.length === idx;
                        const hasDigit = confirmPin.length > idx;
                        
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

                      <TextInput
                        ref={confirmPinRef}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          opacity: 0.01,
                          color: 'transparent',
                          backgroundColor: 'transparent',
                        }}
                        keyboardType="numeric"
                        keyboardAppearance="light"
                        maxLength={4}
                        value={confirmPin}
                        onChangeText={handleConfirmPinChangeDirect}
                        onFocus={() => setIsConfirmPinFocused(true)}
                        onBlur={() => setIsConfirmPinFocused(false)}
                        caretHidden
                      />
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={handleResetPinSubmit}
                    disabled={loading}
                    className="w-full bg-[#006d3b] py-3.5 rounded-xl justify-center items-center active:bg-[#00522c] mb-4 mt-2"
                  >
                    <Text className="text-white font-bold text-base">
                      {loading ? 'Resetting PIN...' : 'Reset PIN'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      setIsResettingPin(false);
                      setLoginStep('phone');
                      setPin('');
                      setConfirmPin('');
                    }}
                    className="w-full py-2.5 rounded-xl justify-center items-center active:bg-slate-100"
                  >
                    <Text className="text-[#006d3b] font-semibold text-sm">
                      ← Back to Sign In
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {loginStep === 'pin' && (
                <View>
                  <View className="mb-4">
                    <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                      Secret PIN
                    </Text>
                    
                    <View className="flex-row justify-between relative">
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

                      <TextInput
                        ref={hiddenPinRef}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          opacity: 0.01,
                          color: 'transparent',
                          backgroundColor: 'transparent',
                        }}
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
                  </View>
                  <TouchableOpacity
                    onPress={handleForgotPinTrigger}
                    className="self-end mb-4 -mt-2 pr-1"
                  >
                    <Text className="text-[#006d3b] text-xs font-semibold">
                      Forgot PIN?
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleSubmit}
                    disabled={loading}
                    className="w-full bg-[#006d3b] py-3.5 rounded-xl justify-center items-center active:bg-[#00522c] mb-4 mt-2"
                  >
                    <Text className="text-white font-bold text-base">
                      {loading ? 'Logging in...' : 'Login'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      setLoginStep('phone');
                      setPin('');
                    }}
                    className="w-full py-2.5 rounded-xl justify-center items-center active:bg-slate-100"
                  >
                    <Text className="text-[#006d3b] font-semibold text-sm">
                      ← Back to Sign In
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : (
            <>
              {/* Core Profile Fields (Required for Registration) */}
              <TextInput
                className="w-full bg-[#f1f5f9] border-b-2 border-slate-200 px-4 py-3 text-slate-800 text-base mb-4 rounded-t-xl focus:border-[#006d3b]"
                placeholder="Your Full Name"
                placeholderTextColor="#94a3b8"
                keyboardAppearance="light"
                value={name}
                onChangeText={setName}
              />

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

              {/* Custom 4-Box PIN Input */}
              <View className="mb-4">
                <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  Set Secret PIN (4 digits)
                </Text>
                
                <View className="flex-row justify-between relative">
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

                  <TextInput
                    ref={hiddenPinRef}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      opacity: 0.01,
                      color: 'transparent',
                      backgroundColor: 'transparent',
                    }}
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
              </View>
            </>
          )}

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
          {mode !== 'login' && (
            <TouchableOpacity
              className={`w-full py-3.5 rounded-xl justify-center items-center ${
                loading ? 'bg-emerald-400' : 'bg-[#006d3b]'
              }`}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text className="text-white font-semibold text-base">
                {loading ? 'Processing...' : 'Submit Registration'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Back Link */}
          {mode !== 'login' && (
            <TouchableOpacity
              className="mt-4 items-center"
              onPress={() => navigation.setParams({ mode: 'login' })}
            >
              <Text className="text-[#006d3b] text-sm font-medium">
                ← Back to Sign In
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onClose={() => {
          if (alertConfig.onCancel) {
            alertConfig.onCancel();
          } else {
            setAlertConfig(prev => ({ ...prev, visible: false }));
          }
        }}
        onConfirm={alertConfig.onConfirm}
        confirmText={alertConfig.confirmText}
        cancelText={alertConfig.cancelText}
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
