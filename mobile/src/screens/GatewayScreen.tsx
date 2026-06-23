import React, { useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';
import apiClient from '../api/client';
import { ApiResponse } from '../types/api.types';

const GatewayScreen = ({ navigation }: any) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerifyCode = async () => {
    if (!code.trim()) {
      return Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Please enter a society registration code.',
        position: 'bottom',
      });
    }

    setLoading(true);
    try {
      const response = await apiClient.get<any, ApiResponse>(`/societies/verify/${code.trim()}`);

      if (response.success && response.data) {
        Toast.show({
          type: 'success',
          text1: 'Society Found!',
          text2: `Successfully matched with ${response.data.name}`,
          position: 'bottom',
        });

        navigation.navigate('AuthScreen', {
          mode: 'join',
          society: response.data,
        });
      } else {
        throw response;
      }
    } catch (err) {
      const apiError = err as ApiResponse;
      Toast.show({
        type: 'error',
        text1: 'Society Not Found',
        text2:
          apiError.message ||
          'Invalid registration code. Please try again.',
        position: 'bottom',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 justify-center items-center bg-[#f7f9fb] p-6">
      {/* Branding Header */}
      <View className="items-center mb-10">
        <Text className="text-4xl font-extrabold text-[#006d3b] tracking-tight">
          Societly
        </Text>
        <Text className="text-sm text-[#5f6d7e] mt-2 text-center font-medium">
          Your society's digital management hub
        </Text>
      </View>

      {/* Main Action Card */}
      <View className="w-full bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <Text className="text-lg font-bold text-slate-800 mb-4 tracking-tight">
          Find Your Society
        </Text>

        <TextInput
          className="w-full bg-[#f1f5f9] border-b-2 border-slate-200 px-4 py-3 text-slate-800 text-base rounded-t-xl mb-4 focus:border-[#006d3b]"
          placeholder="Enter Registration Code (e.g., NMC-1234)"
          placeholderTextColor="#94a3b8"
          keyboardAppearance="light"
          value={code}
          onChangeText={setCode}
          autoCapitalize="characters"
        />

        <TouchableOpacity
          className={`w-full py-3.5 rounded-xl justify-center items-center ${
            loading ? 'bg-emerald-400' : 'bg-[#006d3b]'
          }`}
          onPress={handleVerifyCode}
          disabled={loading}
        >
          <Text className="text-white font-semibold text-base">
            {loading ? 'Verifying...' : 'Continue'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Admin Path Separator */}
      <View className="flex-row items-center my-8 w-full px-4">
        <View className="flex-1 h-px bg-slate-200" />
        <Text className="mx-4 text-xs font-semibold text-[#5f6d7e] uppercase tracking-wider">
          OR
        </Text>
        <View className="flex-1 h-px bg-slate-200" />
      </View>

      {/* Secretary Onboarding Trigger */}
      <TouchableOpacity
        className="w-full bg-slate-100 border border-slate-200 py-3.5 rounded-xl justify-center items-center active:bg-slate-200"
        onPress={() => navigation.navigate('AuthScreen', { mode: 'create' })}
      >
        <Text className="text-slate-700 font-semibold text-sm">
          Register a New Society (Secretary)
        </Text>
      </TouchableOpacity>

      {/* Already a member link */}
      <TouchableOpacity
        className="mt-6 py-2"
        onPress={() => navigation.navigate('AuthScreen', { mode: 'login' })}
      >
        <Text className="text-[#006d3b] font-semibold text-sm">
          Already a member? Log In here
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default GatewayScreen;
