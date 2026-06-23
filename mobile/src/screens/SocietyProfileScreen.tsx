import {
  ArrowLeft,
  Building,
  Edit2,
  FileText,
  Key,
  Layers,
  MapPin,
  Plus,
  PlusCircle,
  Save,
  Trash2,
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
import { usePropertyLayout, WingLayoutInput, FlatLayoutInput } from '../hooks/usePropertyLayout';
import { useSociety } from '../hooks/useSociety';
import { useAuthStore } from '../store/useAuthStore';

const FLAT_TYPES = ['1BHK', '2BHK', '3BHK', 'Shop', 'Office', 'Other'];

export const SocietyProfileScreen = ({ navigation }: any) => {
  const activeMembership = useAuthStore(state => state.activeMembership);
  const role = activeMembership?.role;
  const isAdmin = role === 'admin';

  // Society Profile Hook
  const { society, loading: loadingProfile, saving: savingProfile, fetchSocietyProfile, saveSocietyProfile } =
    useSociety();

  // Property Layout Hook
  const { wings, loading: loadingLayout, saving: savingLayout, fetchPropertyLayout, savePropertyLayout } =
    usePropertyLayout();

  // Screen UI State
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [govtRegNo, setGovtRegNo] = useState('');
  const [structureType, setStructureType] = useState<'single_building' | 'multi_wing'>('multi_wing');

  // Local editable layout state
  const [localWings, setLocalWings] = useState<WingLayoutInput[]>([]);

  // Confirmation Alert States
  const [alert, setAlert] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info' as 'info' | 'success' | 'error',
    onConfirm: undefined as (() => void) | undefined,
  });

  const loadAllData = async () => {
    await fetchSocietyProfile();
    await fetchPropertyLayout();
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

  // Sync layout inputs based on wings data
  useEffect(() => {
    if (wings && wings.length > 0) {
      const mapped = wings.map((w: any) => ({
        name: w.name,
        flats: (w.flats || []).map((f: any) => ({
          flatNumber: f.flatNumber,
          flatType: f.flatType,
          squareFootage: String(f.squareFootage),
        })),
      }));
      setLocalWings(mapped);
    } else {
      setLocalWings([]);
    }
  }, [wings]);

  const handleStructureTypeChange = (type: 'single_building' | 'multi_wing') => {
    setStructureType(type);
    if (type === 'single_building') {
      // For single building, we merge all existing flats into one implicit 'Main' wing
      const allFlats: FlatLayoutInput[] = localWings.flatMap(w => w.flats);
      setLocalWings([{ name: 'Main', flats: allFlats }]);
    } else {
      // Re-initialize as multi-wing if it was single
      if (localWings.length === 1 && localWings[0].name === 'Main') {
        setLocalWings([{ name: 'Wing A', flats: localWings[0].flats }]);
      } else if (localWings.length === 0) {
        setLocalWings([{ name: 'Wing A', flats: [] }]);
      }
    }
  };

  // Layout editing handlers
  const handleAddWing = () => {
    const nextLetter = String.fromCharCode(65 + localWings.length);
    setLocalWings([...localWings, { name: `Wing ${nextLetter}`, flats: [] }]);
  };

  const handleRemoveWing = (wingIndex: number) => {
    setLocalWings(localWings.filter((_, idx) => idx !== wingIndex));
  };

  const handleUpdateWingName = (wingIndex: number, newName: string) => {
    const updated = [...localWings];
    updated[wingIndex].name = newName;
    setLocalWings(updated);
  };

  const handleAddFlat = (wingIndex: number) => {
    const updated = [...localWings];
    if (updated.length === 0 && structureType === 'single_building') {
      updated.push({ name: 'Main', flats: [] });
    }
    const flatsCount = updated[wingIndex].flats.length;
    const floor = Math.floor(flatsCount / 4) + 1;
    const flatNum = `${floor}0${(flatsCount % 4) + 1}`;

    updated[wingIndex].flats.push({
      flatNumber: flatNum,
      flatType: '2BHK',
      squareFootage: '1000',
    });
    setLocalWings(updated);
  };

  const handleRemoveFlat = (wingIndex: number, flatIndex: number) => {
    const updated = [...localWings];
    updated[wingIndex].flats = updated[wingIndex].flats.filter((_, idx) => idx !== flatIndex);
    setLocalWings(updated);
  };

  const handleUpdateFlat = (
    wingIndex: number,
    flatIndex: number,
    field: keyof FlatLayoutInput,
    value: string,
  ) => {
    const updated = [...localWings];
    updated[wingIndex].flats[flatIndex] = {
      ...updated[wingIndex].flats[flatIndex],
      [field]: value,
    };
    setLocalWings(updated);
  };

  const handleSaveAll = () => {
    // Validations
    if (!name.trim() || !address.trim() || !govtRegNo.trim()) {
      return Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Please fill out all society profile fields.',
      });
    }

    if (structureType === 'multi_wing' && localWings.length === 0) {
      return Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Multi-wing societies must have at least one wing.',
      });
    }

    // Validate flats inside wings
    for (let w = 0; w < localWings.length; w++) {
      const wing = localWings[w];
      if (structureType === 'multi_wing' && !wing.name.trim()) {
        return Toast.show({
          type: 'error',
          text1: 'Validation Error',
          text2: `Wing at position ${w + 1} is missing a name.`,
        });
      }
      if (wing.flats.length === 0) {
        return Toast.show({
          type: 'error',
          text1: 'Validation Error',
          text2: structureType === 'single_building' 
            ? 'Please configure at least one flat.'
            : `Wing '${wing.name}' has no flats configured.`,
        });
      }
      for (let f = 0; f < wing.flats.length; f++) {
        const flat = wing.flats[f];
        if (!flat.flatNumber.trim()) {
          return Toast.show({
            type: 'error',
            text1: 'Validation Error',
            text2: `Flat number in Wing '${wing.name}' position ${f + 1} is empty.`,
          });
        }
        const size = parseFloat(flat.squareFootage);
        if (isNaN(size) || size <= 0) {
          return Toast.show({
            type: 'error',
            text1: 'Validation Error',
            text2: `Square footage for flat '${flat.flatNumber}' must be positive.`,
          });
        }
      }
    }

    setAlert({
      visible: true,
      title: 'Overwrite Layout Config',
      message: 'Saving changes will overwrite the society profile and property layout ledger. Proceed?',
      type: 'info',
      onConfirm: executeSaveAll,
    });
  };

  const executeSaveAll = async () => {
    setAlert(prev => ({ ...prev, visible: false }));
    try {
      // 1. Save Profile Details
      await saveSocietyProfile({
        name: name.trim(),
        address: address.trim(),
        govtRegistrationNo: govtRegNo.trim(),
        structureType,
      });

      // 2. Save Property Layout (Wings/Flats)
      await savePropertyLayout(localWings);

      Toast.show({
        type: 'success',
        text1: 'Configuration Saved',
        text2: 'Profile details and property layouts updated.',
      });
      setIsEditing(false);
      loadAllData();
    } catch (err: any) {
      setAlert({
        visible: true,
        title: 'Save Failed',
        message: err.message || 'Could not update configurations.',
        type: 'error',
        onConfirm: undefined,
      });
    }
  };

  const totalFlatsCount = localWings.reduce((sum, w) => sum + w.flats.length, 0);

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

      {(loadingProfile || loadingLayout) && !isEditing ? (
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
                  <View className="flex-row justify-between bg-slate-100 p-1.5 rounded-xl">
                    <TouchableOpacity
                      onPress={() => handleStructureTypeChange('single_building')}
                      className={`flex-1 py-2.5 rounded-lg items-center ${
                        structureType === 'single_building' ? 'bg-white shadow-sm' : ''
                      }`}
                    >
                      <Text
                        className={`text-xs font-black ${
                          structureType === 'single_building'
                            ? 'text-slate-900'
                            : 'text-slate-400'
                        }`}
                      >
                        Single Building
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleStructureTypeChange('multi_wing')}
                      className={`flex-1 py-2.5 rounded-lg items-center ${
                        structureType === 'multi_wing' ? 'bg-white shadow-sm' : ''
                      }`}
                    >
                      <Text
                        className={`text-xs font-black ${
                          structureType === 'multi_wing'
                            ? 'text-slate-900'
                            : 'text-slate-400'
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

          {/* Section 2: Property Layout Configurations */}
          <View className="mb-4">
            <View className="flex-row justify-between items-center mb-2 px-1">
              <Text className="text-base font-black text-slate-900 uppercase tracking-wide">
                Property Master Layout
              </Text>
              {!isEditing && (
                <View className="bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full">
                  <Text className="text-[#006d3b] text-[10px] font-black uppercase">
                    Total units: {totalFlatsCount}
                  </Text>
                </View>
              )}
              {isEditing && structureType === 'multi_wing' && (
                <TouchableOpacity
                  onPress={handleAddWing}
                  className="flex-row items-center space-x-1 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 active:opacity-85"
                >
                  <Plus size={12} color="#006d3b" />
                  <Text className="text-[#006d3b] text-[10px] font-black uppercase ml-1">
                    Add Wing
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Layout view / edit layout logic */}
            {isEditing ? (
              <View className="space-y-4">
                {structureType === 'single_building' ? (
                  // Single Building Flats List directly
                  <View className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-4">
                    <View className="flex-row justify-between items-center pb-2 border-b border-slate-50">
                      <Text className="font-black text-slate-800 text-sm">
                        Appartment Flats List
                      </Text>
                      <TouchableOpacity
                        onPress={() => handleAddFlat(0)}
                        className="flex-row items-center bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100"
                      >
                        <PlusCircle size={12} color="#006d3b" />
                        <Text className="text-[#006d3b] text-xs font-bold ml-1">Add unit</Text>
                      </TouchableOpacity>
                    </View>

                    {localWings[0]?.flats.length === 0 ? (
                      <Text className="text-slate-400 text-xs text-center py-4 italic font-semibold">
                        No flats added yet. Click 'Add unit' above.
                      </Text>
                    ) : (
                      <View className="space-y-2">
                        {localWings[0]?.flats.map((flat, flatIdx) => (
                          <View
                            key={flatIdx}
                            className="flex-row items-center space-x-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-100"
                          >
                            <View className="flex-1" style={{ flex: 1.2 }}>
                              <Text className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                                Flat No.
                              </Text>
                              <TextInput
                                placeholder="101"
                                placeholderTextColor="#94a3b8"
                                keyboardAppearance="light"
                                value={flat.flatNumber}
                                onChangeText={val => handleUpdateFlat(0, flatIdx, 'flatNumber', val)}
                                className="text-slate-800 font-bold text-xs p-0 bg-transparent"
                              />
                            </View>

                            <View className="flex-1" style={{ flex: 1.5 }}>
                              <Text className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                                Area (Sq.Ft)
                              </Text>
                              <TextInput
                                placeholder="1000"
                                placeholderTextColor="#94a3b8"
                                keyboardAppearance="light"
                                keyboardType="numeric"
                                value={flat.squareFootage}
                                onChangeText={val => handleUpdateFlat(0, flatIdx, 'squareFootage', val)}
                                className="text-slate-800 font-bold text-xs p-0 bg-transparent"
                              />
                            </View>

                            <View className="flex-row flex-wrap flex-1 gap-1" style={{ flex: 2 }}>
                              {FLAT_TYPES.map(type => {
                                const isSelected = flat.flatType === type;
                                return (
                                  <TouchableOpacity
                                    key={type}
                                    onPress={() => handleUpdateFlat(0, flatIdx, 'flatType', type)}
                                    className={`px-1.5 py-1 rounded-md border ${
                                      isSelected
                                        ? 'bg-emerald-50 border-emerald-400'
                                        : 'bg-white border-slate-200'
                                    }`}
                                  >
                                    <Text
                                      className={`text-[9px] font-bold ${
                                        isSelected ? 'text-[#006d3b]' : 'text-slate-500'
                                      }`}
                                    >
                                      {type}
                                    </Text>
                                  </TouchableOpacity>
                                );
                              })}
                            </View>

                            <TouchableOpacity
                              onPress={() => handleRemoveFlat(0, flatIdx)}
                              className="p-2 bg-rose-50 rounded-lg active:opacity-80 ml-1"
                            >
                              <Trash2 size={13} color="#e11d48" />
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                ) : (
                  // Multi-Wing Complexes with multiple wings cards
                  localWings.map((wing, wingIdx) => (
                    <View
                      key={wingIdx}
                      className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-4"
                    >
                      {/* Wing Header */}
                      <View className="flex-row justify-between items-center pb-2 border-b border-slate-50">
                        <View className="flex-row items-center flex-1 pr-4">
                          <Layers size={16} color="#006d3b" />
                          <TextInput
                            placeholder="Wing Name"
                            placeholderTextColor="#94a3b8"
                            keyboardAppearance="light"
                            value={wing.name}
                            onChangeText={val => handleUpdateWingName(wingIdx, val)}
                            className="flex-1 ml-3 text-slate-800 font-black text-sm p-0"
                          />
                        </View>
                        <View className="flex-row items-center space-x-2">
                          <TouchableOpacity
                            onPress={() => handleAddFlat(wingIdx)}
                            className="p-1.5 bg-emerald-50 rounded-lg border border-emerald-100"
                          >
                            <PlusCircle size={14} color="#006d3b" />
                          </TouchableOpacity>
                          {localWings.length > 1 && (
                            <TouchableOpacity
                              onPress={() => handleRemoveWing(wingIdx)}
                              className="p-1.5 bg-rose-50 rounded-lg border border-rose-100 ml-1"
                            >
                              <Trash2 size={14} color="#e11d48" />
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>

                      {/* Flats Listing */}
                      {wing.flats.length === 0 ? (
                        <Text className="text-slate-400 text-xs text-center py-4 italic font-semibold">
                          No units added in this wing. Click the '+' button.
                        </Text>
                      ) : (
                        <View className="space-y-2">
                          {wing.flats.map((flat, flatIdx) => (
                            <View
                              key={flatIdx}
                              className="flex-row items-center space-x-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-100"
                            >
                              <View className="flex-1" style={{ flex: 1.2 }}>
                                <Text className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                                  Flat No.
                                </Text>
                                <TextInput
                                  placeholder="101"
                                  placeholderTextColor="#94a3b8"
                                  keyboardAppearance="light"
                                  value={flat.flatNumber}
                                  onChangeText={val => handleUpdateFlat(wingIdx, flatIdx, 'flatNumber', val)}
                                  className="text-slate-800 font-bold text-xs p-0 bg-transparent"
                                />
                              </View>

                              <View className="flex-1" style={{ flex: 1.5 }}>
                                <Text className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                                  Area (Sq.Ft)
                                </Text>
                                <TextInput
                                  placeholder="1000"
                                  placeholderTextColor="#94a3b8"
                                  keyboardAppearance="light"
                                  keyboardType="numeric"
                                  value={flat.squareFootage}
                                  onChangeText={val => handleUpdateFlat(wingIdx, flatIdx, 'squareFootage', val)}
                                  className="text-slate-800 font-bold text-xs p-0 bg-transparent"
                                />
                              </View>

                              <View className="flex-row flex-wrap flex-1 gap-1" style={{ flex: 2 }}>
                                {FLAT_TYPES.map(type => {
                                  const isSelected = flat.flatType === type;
                                  return (
                                    <TouchableOpacity
                                      key={type}
                                      onPress={() => handleUpdateFlat(wingIdx, flatIdx, 'flatType', type)}
                                      className={`px-1.5 py-1 rounded-md border ${
                                        isSelected
                                          ? 'bg-emerald-50 border-emerald-400'
                                          : 'bg-white border-slate-200'
                                      }`}
                                    >
                                      <Text
                                        className={`text-[9px] font-bold ${
                                          isSelected ? 'text-[#006d3b]' : 'text-slate-500'
                                        }`}
                                      >
                                        {type}
                                      </Text>
                                    </TouchableOpacity>
                                  );
                                })}
                              </View>

                              <TouchableOpacity
                                onPress={() => handleRemoveFlat(wingIdx, flatIdx)}
                                className="p-2 bg-rose-50 rounded-lg active:opacity-80 ml-1"
                              >
                                <Trash2 size={13} color="#e11d48" />
                              </TouchableOpacity>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  ))
                )}
              </View>
            ) : (
              // View Mode Layout Summary details
              <View className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-4">
                {localWings.length === 0 || totalFlatsCount === 0 ? (
                  <Text className="text-slate-400 text-xs text-center py-4 italic font-semibold">
                    No layout structures configured for this property.
                  </Text>
                ) : structureType === 'single_building' ? (
                  // Simple flat lists grouped
                  <View className="space-y-3">
                    <Text className="text-slate-500 text-xs font-black uppercase tracking-wider mb-1">
                      Configured Apartments
                    </Text>
                    <View className="flex-row flex-wrap gap-2">
                      {localWings[0].flats.map((f, idx) => (
                        <View key={idx} className="bg-slate-50 border border-slate-100 px-3 py-2 rounded-xl">
                          <Text className="text-slate-800 text-xs font-black">{f.flatNumber}</Text>
                          <Text className="text-slate-400 text-[8px] mt-0.5 font-bold uppercase">{f.flatType} • {f.squareFootage} Sq.Ft</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : (
                  // Multi-Wing listing details
                  <View className="space-y-4">
                    {localWings.map((w, idx) => (
                      <View key={idx} className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                        <Text className="text-slate-800 text-sm font-black mb-2 flex-row items-center">
                          🏢 {w.name} ({w.flats.length} Units)
                        </Text>
                        <View className="flex-row flex-wrap gap-2">
                          {w.flats.map((f, fIdx) => (
                            <View key={fIdx} className="bg-white border border-slate-100 px-3 py-1.5 rounded-lg">
                              <Text className="text-slate-700 text-xs font-bold">{f.flatNumber}</Text>
                              <Text className="text-slate-400 text-[7px] font-bold uppercase">{f.flatType} • {f.squareFootage} sq.ft</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Edit actions */}
          {isEditing && (
            <View className="flex-row space-x-3 mt-4">
              <TouchableOpacity
                onPress={() => setIsEditing(false)}
                disabled={savingProfile || savingLayout}
                className="flex-1 bg-slate-100 py-3.5 rounded-xl justify-center items-center active:opacity-90"
              >
                <Text className="text-slate-600 font-black text-sm">
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSaveAll}
                disabled={savingProfile || savingLayout}
                className="flex-2 flex-row items-center justify-center bg-[#006d3b] py-3.5 px-6 rounded-xl active:opacity-90 ml-3"
                style={{ flex: 2 }}
              >
                {savingProfile || savingLayout ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Save size={16} color="#fff" />
                    <Text className="text-white font-black text-sm ml-2">
                      Save All Configs
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
