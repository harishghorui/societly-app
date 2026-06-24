import {
  ArrowLeft,
  Building,
  Edit2,
  FileText,
  Key,
  Layers,
  MapPin,
  Save,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import CustomAlert from '../components/CustomAlert';
import { useSociety } from '../hooks/useSociety';
import { useAuthStore } from '../store/useAuthStore';
import { ApiResponse } from '../types/api.types';

export const SocietyProfileScreen = ({ navigation }: any) => {
  const activeMembership = useAuthStore(state => state.activeMembership);
  const role = activeMembership?.role;
  const isAdmin = role === 'admin';

  // Society Profile Hook
  const { society, loading: loadingProfile, saving: savingProfile, fetchSocietyProfile, saveSocietyProfile } =
    useSociety();

  // Screen UI State
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [govtRegNo, setGovtRegNo] = useState('');
  const [structureType, setStructureType] = useState<'single_building' | 'multi_wing'>('multi_wing');

  // Confirmation Alert States
  const [alert, setAlert] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info' as 'info' | 'success' | 'error' | 'warning',
    onConfirm: undefined as (() => void) | undefined,
  });

  const loadAllData = async () => {
    await fetchSocietyProfile();
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Sync profile inputs
  useEffect(() => {
    if (society) {
      setName(society.name || '');
      setAddress(society.address || '');
      setGovtRegNo(society.govtRegistrationNo || '');
      setStructureType(society.structureType || 'multi_wing');
    }
  }, [society]);

  const handleSaveAll = () => {
    // Validations
    if (!name.trim() || !address.trim() || !govtRegNo.trim()) {
      return Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Please fill out all society profile fields.',
      });
    }

    if (structureType !== society?.structureType) {
      setAlert({
        visible: true,
        title: 'Change Structure Type?',
        message: 'Warning: Changing your society structure type will invalidate existing wing/flat mapping layouts. Do you want to proceed?',
        type: 'warning',
        onConfirm: executeSaveAll,
      });
      return;
    }

    setAlert({
      visible: true,
      title: 'Confirm Save',
      message: 'Saving changes will overwrite the society profile configuration. Proceed?',
      type: 'info',
      onConfirm: executeSaveAll,
    });
  };

  const executeSaveAll = async () => {
    setAlert(prev => ({ ...prev, visible: false }));
    try {
      // Save Profile Details
      await saveSocietyProfile({
        name: name.trim(),
        address: address.trim(),
        govtRegistrationNo: govtRegNo.trim(),
        structureType,
      });

      Toast.show({
        type: 'success',
        text1: 'Configuration Saved',
        text2: 'Profile details updated.',
      });
      setIsEditing(false);
      loadAllData();
    } catch (err) {
      const errorResponse = err as ApiResponse;
      setAlert({
        visible: true,
        title: 'Save Failed',
        message: errorResponse.message || 'Could not update configurations.',
        type: 'error',
        onConfirm: undefined,
      });
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#f7f9fb]">
      {/* Header Bar */}
      <View className="h-16 w-full bg-white px-5 flex-row items-center justify-between border-b border-slate-100">
        <View className="flex-row items-center space-x-3">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="p-2 -ml-2 rounded-full active:bg-slate-50"
          >
            <ArrowLeft size={22} color="#191c1e" />
          </TouchableOpacity>
          <Text className="text-xl font-black text-slate-900 ml-1">
            Society Profile
          </Text>
        </View>

        {isAdmin && !isEditing && (
          <TouchableOpacity
            onPress={() => setIsEditing(true)}
            className="flex-row items-center space-x-1.5 bg-emerald-50 px-4 py-2 rounded-full border border-emerald-100"
          >
            <Edit2 size={14} color="#006d3b" />
            <Text className="text-[#006d3b] text-xs font-bold ml-1">Edit</Text>
          </TouchableOpacity>
        )}
      </View>

      {loadingProfile && !isEditing ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#006d3b" />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        >
          {/* Section 1: Society Info Card */}
          <View className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm mb-4 space-y-4">
            <View className="flex-row items-center space-x-3">
              <View className="w-12 h-12 rounded-2xl bg-emerald-50 items-center justify-center border border-emerald-100">
                <Building size={24} color="#006d3b" />
              </View>
              <View className="flex-1 ml-2">
                <Text className="text-slate-800 text-lg font-black tracking-tight leading-tight">
                  {society?.name || 'Society Registry'}
                </Text>
                <Text className="text-slate-400 text-xs mt-0.5 uppercase font-bold tracking-wider">
                  Code: {society?.registrationCode || 'N/A'}
                </Text>
              </View>
            </View>

            <View className="border-t border-slate-50 pt-4 space-y-4">
              {/* Name */}
              <View className="space-y-1">
                <Text className="text-slate-500 font-bold text-xs uppercase tracking-wide">
                  Society Name
                </Text>
                {isEditing ? (
                  <View className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex-row items-center">
                    <Building size={16} color="#94a3b8" />
                    <TextInput
                      placeholder="Greenwood Heights"
                      placeholderTextColor="#94a3b8"
                      keyboardAppearance="light"
                      value={name}
                      onChangeText={setName}
                      className="flex-1 ml-3 text-slate-800 font-semibold p-0"
                    />
                  </View>
                ) : (
                  <Text className="text-slate-800 font-semibold text-sm bg-slate-50 px-4 py-3 rounded-xl border border-slate-50">
                    {society?.name || 'Not Configured'}
                  </Text>
                )}
              </View>

              {/* Address */}
              <View className="space-y-1">
                <Text className="text-slate-500 font-bold text-xs uppercase tracking-wide">
                  Physical Address
                </Text>
                {isEditing ? (
                  <View className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex-row items-start">
                    <MapPin size={16} color="#94a3b8" className="mt-1" />
                    <TextInput
                      placeholder="Complete Postal Address"
                      placeholderTextColor="#94a3b8"
                      keyboardAppearance="light"
                      multiline
                      numberOfLines={3}
                      value={address}
                      onChangeText={setAddress}
                      className="flex-1 ml-3 text-slate-800 font-semibold p-0 h-16 textAlignVertical-top"
                    />
                  </View>
                ) : (
                  <Text className="text-slate-800 font-semibold text-sm bg-slate-50 px-4 py-3 rounded-xl border border-slate-50">
                    {society?.address || 'Not Configured'}
                  </Text>
                )}
              </View>

              {/* Govt Registration */}
              <View className="space-y-1">
                <Text className="text-slate-500 font-bold text-xs uppercase tracking-wide">
                  Govt Registration No
                </Text>
                {isEditing ? (
                  <View className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex-row items-center">
                    <FileText size={16} color="#94a3b8" />
                    <TextInput
                      placeholder="MAH-MUM-12345/2026"
                      placeholderTextColor="#94a3b8"
                      keyboardAppearance="light"
                      value={govtRegNo}
                      onChangeText={setGovtRegNo}
                      className="flex-1 ml-3 text-slate-800 font-semibold p-0"
                    />
                  </View>
                ) : (
                  <Text className="text-slate-800 font-semibold text-sm bg-slate-50 px-4 py-3 rounded-xl border border-slate-50">
                    {society?.govtRegistrationNo || 'Not Configured'}
                  </Text>
                )}
              </View>

              {/* Registration Code (Immutable) */}
              {!isEditing && (
                <View className="space-y-1">
                  <Text className="text-slate-500 font-bold text-xs uppercase tracking-wide">
                     Inviting Code
                  </Text>
                  <View className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <Key size={16} color="#94a3b8" />
                      <Text className="ml-3 text-slate-800 font-extrabold text-sm tracking-widest">
                        {society?.registrationCode || 'N/A'}
                      </Text>
                    </View>
                    <Text className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                      Share to Join
                    </Text>
                  </View>
                </View>
              )}

              {/* Structure Type Selection (Edit Mode only) */}
              <View className="space-y-1.5">
                <Text className="text-slate-500 font-bold text-xs uppercase tracking-wide">
                  Property Structure
                </Text>
                {isEditing ? (
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
                ) : (
                  <Text className="text-slate-800 font-semibold text-sm bg-slate-50 px-4 py-3 rounded-xl border border-slate-50 capitalize">
                    {structureType === 'single_building' ? 'Single Building (No Wings)' : 'Multi-Wing / Multi-Tower Complex'}
                  </Text>
                )}
              </View>
            </View>
          </View>

          {/* Edit actions */}
          {isEditing && (
            <View className="flex-row space-x-3 mt-4">
              <TouchableOpacity
                onPress={() => setIsEditing(false)}
                disabled={savingProfile}
                className="flex-1 bg-slate-100 py-3.5 rounded-xl justify-center items-center active:opacity-90"
              >
                <Text className="text-slate-600 font-black text-sm">
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSaveAll}
                disabled={savingProfile}
                className="flex-2 flex-row items-center justify-center bg-[#006d3b] py-3.5 px-6 rounded-xl active:opacity-90 ml-3"
                style={{ flex: 2 }}
              >
                {savingProfile ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Save size={16} color="#fff" />
                    <Text className="text-white font-black text-sm ml-2">
                      Save Profile
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}

      {/* Overwrite Confirmation Custom Alert */}
      <CustomAlert
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        type={alert.type}
        onConfirm={alert.onConfirm}
        onClose={() => setAlert(prev => ({ ...prev, visible: false }))}
      />
    </SafeAreaView>
  );
};

export default SocietyProfileScreen;
