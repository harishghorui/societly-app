import React, { useState, useMemo, useEffect } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Edit2,
  Trash2,
  Plus,
  Search,
  ChevronDown,
  Info,
  Layers,
} from 'lucide-react-native';
import CustomAlert from './CustomAlert';
import Toast from 'react-native-toast-message';
import apiClient from '../api/client';
import { ApiResponse } from '../types/api.types';

export interface RosterEntry {
  id?: string | number;
  flatNumber: string;
  flatType?: '1BHK' | '2BHK' | '3BHK' | 'Shop' | 'Office' | 'Other';
  squareFootage?: string | number;
  wingName: string;
  name: string;
  phone: string;
  role: 'owner' | 'tenant' | 'admin' | 'treasurer' | 'secretary';
  designation?: string;
  advanceWalletBalance?: number | string;
  arrears?: number | string;
  userStatus?: 'invited' | 'active' | 'suspended';
}

interface ResidentRosterEngineProps {
  mode: 'readonly' | 'onboarding' | 'management';
  data: RosterEntry[];
  societyId?: number;
  structureType?: 'single_building' | 'multi_wing';
  onDataChange?: (newData: RosterEntry[]) => void;
  renderExtraActions?: (entry: RosterEntry) => React.ReactNode;
}

const FLAT_TYPES = ['1BHK', '2BHK', '3BHK', 'Shop', 'Office', 'Other'];
const ROLES = ['owner', 'tenant', 'admin', 'treasurer', 'secretary'];

const extractFloor = (flatNumber: string): string => {
  const clean = flatNumber.replace(/[^0-9]/g, '');
  if (!clean) return 'Other';
  if (clean.length === 3) return clean.substring(0, 1);
  if (clean.length >= 4) return clean.substring(0, clean.length - 2);
  return 'Ground';
};

export const ResidentRosterEngine: React.FC<ResidentRosterEngineProps> = ({
  mode,
  data,
  societyId,
  structureType = 'single_building',
  onDataChange,
  renderExtraActions,
}) => {
  const isEditable = mode !== 'readonly';

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWing, setSelectedWing] = useState('All');
  const [selectedFloor, setSelectedFloor] = useState('All');

  // Wing & Floor list compilation
  const wingsList = useMemo(() => {
    const uniqueWings = new Set<string>();
    data.forEach(item => {
      if (item.wingName) uniqueWings.add(item.wingName);
    });
    return ['All', ...Array.from(uniqueWings).sort()];
  }, [data]);

  const floorsList = useMemo(() => {
    const uniqueFloors = new Set<string>();
    data.forEach(item => {
      if (item.flatNumber) {
        uniqueFloors.add(extractFloor(item.flatNumber));
      }
    });
    return ['All', ...Array.from(uniqueFloors).sort((a, b) => {
      if (a === 'Ground') return -1;
      if (b === 'Ground') return 1;
      if (a === 'Other') return 1;
      if (b === 'Other') return -1;
      return parseInt(a, 10) - parseInt(b, 10);
    })];
  }, [data]);

  // Active filter logic
  const filteredData = useMemo(() => {
    return data.filter(item => {
      const matchesSearch =
        (item.name || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
        (item.flatNumber || '').toLowerCase().includes((searchQuery || '').toLowerCase());
      
      const matchesWing = selectedWing === 'All' || item.wingName === selectedWing;
      const matchesFloor = selectedFloor === 'All' || extractFloor(item.flatNumber) === selectedFloor;

      return matchesSearch && matchesWing && matchesFloor;
    });
  }, [data, searchQuery, selectedWing, selectedFloor]);

  // Modal selector helpers
  const [pickerConfig, setPickerConfig] = useState<{
    visible: boolean;
    title: string;
    options: string[];
    onSelect: (val: string) => void;
  } | null>(null);

  // CRUD Form modal states
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<RosterEntry | null>(null);
  
  const [formWing, setFormWing] = useState('');
  const [formFlatNumber, setFormFlatNumber] = useState('');
  const [formFlatType, setFormFlatType] = useState<'1BHK' | '2BHK' | '3BHK' | 'Shop' | 'Office' | 'Other'>('2BHK');
  const [formSquareFootage, setFormSquareFootage] = useState('1000');
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formRole, setFormRole] = useState<'owner' | 'tenant' | 'admin' | 'treasurer' | 'secretary'>('owner');
  const [formDesignation, setFormDesignation] = useState('Resident');
  const [formWallet, setFormWallet] = useState('0');
  const [formArrears, setFormArrears] = useState('0');

  const [loading, setLoading] = useState(false);

  // Custom Alert states for deletes
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'info' | 'success' | 'error' | 'warning';
    onConfirm: (() => void) | undefined;
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
    onConfirm: undefined,
  });

  const openAddForm = () => {
    setEditingEntry(null);
    setFormWing(structureType === 'single_building' ? 'Main' : (wingsList.filter(w => w !== 'All')[0] || 'Main'));
    setFormFlatNumber('');
    setFormFlatType('2BHK');
    setFormSquareFootage('1000');
    setFormName('');
    setFormPhone('');
    setFormRole('owner');
    setFormDesignation('Resident');
    setFormWallet('0');
    setFormArrears('0');
    setFormModalOpen(true);
  };

  const openEditForm = (entry: RosterEntry) => {
    setEditingEntry(entry);
    setFormWing(entry.wingName);
    setFormFlatNumber(entry.flatNumber);
    setFormFlatType(entry.flatType || '2BHK');
    setFormSquareFootage(String(entry.squareFootage || '1000'));
    setFormName(entry.name);
    setFormPhone(entry.phone);
    setFormRole(entry.role);
    setFormDesignation(entry.designation || 'Resident');
    setFormWallet(String(entry.advanceWalletBalance || '0'));
    setFormArrears(String(entry.arrears || '0'));
    setFormModalOpen(true);
  };

  const handleSaveForm = async () => {
    const finalWing = structureType === 'single_building' ? 'Main' : formWing;
    if (!finalWing.trim() || !formFlatNumber.trim() || !formName.trim() || !formPhone.trim()) {
      Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please fill in all mandatory fields.' });
      return;
    }

    const cleanPhone = formPhone.replace(/[^0-9]/g, '');
    if (cleanPhone.length !== 10) {
      Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Phone number must be exactly 10 digits.' });
      return;
    }

    if (mode === 'onboarding') {
      // Local Memory mutation
      const newEntry: RosterEntry = {
        id: editingEntry ? editingEntry.id : Date.now().toString(),
        wingName: finalWing.trim(),
        flatNumber: formFlatNumber.trim(),
        flatType: formFlatType,
        squareFootage: formSquareFootage,
        name: formName.trim(),
        phone: cleanPhone,
        role: formRole,
        designation: formDesignation,
        advanceWalletBalance: formWallet,
        arrears: formArrears,
        userStatus: editingEntry?.userStatus || 'invited',
      };

      if (editingEntry) {
        onDataChange?.(data.map(item => item.id === editingEntry.id ? newEntry : item));
      } else {
        onDataChange?.([...data, newEntry]);
      }
      setFormModalOpen(false);
      Toast.show({ type: 'success', text1: editingEntry ? 'Resident Updated' : 'Resident Added' });
    } else if (mode === 'management') {
      // Direct API sync
      setLoading(true);
      try {
        const payload = {
          id: editingEntry?.id,
          societyId,
          name: formName.trim(),
          phone: cleanPhone,
          flatNumber: formFlatNumber.trim(),
          wingName: finalWing.trim(),
          role: formRole,
          designation: formDesignation,
          advanceWalletBalance: parseFloat(formWallet || '0'),
        };

        const res = await apiClient.post<any, ApiResponse>('/society/directory/upsert', payload);
        if (res.success && res.data) {
          const syncedEntry: RosterEntry = {
            id: res.data.id,
            wingName: finalWing.trim(),
            flatNumber: formFlatNumber.trim(),
            flatType: formFlatType,
            squareFootage: formSquareFootage,
            name: formName.trim(),
            phone: cleanPhone,
            role: formRole,
            designation: formDesignation,
            advanceWalletBalance: formWallet,
            userStatus: res.data.user?.status || res.data.User?.status || 'invited',
          };

          if (editingEntry) {
            onDataChange?.(data.map(item => item.id === editingEntry.id ? syncedEntry : item));
          } else {
            onDataChange?.([...data, syncedEntry]);
          }
          setFormModalOpen(false);
          Toast.show({ type: 'success', text1: editingEntry ? 'Resident Updated Successfully' : 'Resident Created Successfully' });
        } else {
          Toast.show({ type: 'error', text1: 'Upsert Failed', text2: res.message });
        }
      } catch (err: any) {
        Toast.show({ type: 'error', text1: 'Server Error', text2: err.message || 'Could not save resident details.' });
      } finally {
        setLoading(false);
      }
    }
  };

  const confirmDeleteEntry = (entry: RosterEntry) => {
    setAlertConfig({
      visible: true,
      title: 'Revoke Resident?',
      message: `Warning: This action will completely revoke and remove ${entry.name} from flat unit ${entry.flatNumber}. Are you sure you want to proceed?`,
      type: 'warning',
      onConfirm: () => executeDeleteEntry(entry),
    });
  };

  const executeDeleteEntry = async (entry: RosterEntry) => {
    setAlertConfig(prev => ({ ...prev, visible: false }));
    
    if (mode === 'onboarding') {
      onDataChange?.(data.filter(item => item.id !== entry.id));
      Toast.show({ type: 'success', text1: 'Resident Removed' });
    } else if (mode === 'management') {
      setLoading(true);
      try {
        const res = await apiClient.delete<any, ApiResponse>(
          `/society/directory/${entry.id}?societyId=${societyId}`
        );
        if (res.success) {
          onDataChange?.(data.filter(item => item.id !== entry.id));
          Toast.show({ type: 'success', text1: 'Resident Revoked' });
        } else {
          Toast.show({ type: 'error', text1: 'Revoke Failed', text2: res.message });
        }
      } catch (err: any) {
        Toast.show({ type: 'error', text1: 'Server Error', text2: err.message || 'Could not revoke resident membership.' });
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <View className="flex-1">
      {/* 🚀 Filter Ribbon Section */}
      <View className="bg-white border border-slate-100 rounded-3xl p-4 shadow-sm space-y-3 mb-4">
        {/* Search */}
        <View className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 flex-row items-center">
          <Search size={18} color="#94a3b8" />
          <TextInput
            placeholder="Search residents by name or unit..."
            placeholderTextColor="#94a3b8"
            keyboardAppearance="light"
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="flex-1 ml-3 text-slate-800 font-medium p-0"
          />
        </View>

        {/* Dropdowns */}
        <View className="flex-row justify-between space-x-2">
          {/* Wing Filter */}
          {structureType !== 'single_building' && (
            <TouchableOpacity
              onPress={() =>
                setPickerConfig({
                  visible: true,
                  title: 'Filter by Wing',
                  options: wingsList,
                  onSelect: setSelectedWing,
                })
              }
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 flex-row justify-between items-center mr-1"
            >
              <Text className="text-slate-800 text-xs font-bold">
                Wing: {selectedWing}
              </Text>
              <ChevronDown size={14} color="#64748b" />
            </TouchableOpacity>
          )}

          {/* Floor Filter */}
          <TouchableOpacity
            onPress={() =>
              setPickerConfig({
                visible: true,
                title: 'Filter by Floor',
                options: floorsList,
                onSelect: setSelectedFloor,
              })
            }
            className={`flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 flex-row justify-between items-center ${
              structureType !== 'single_building' ? 'ml-1' : ''
            }`}
          >
            <Text className="text-slate-800 text-xs font-bold">
              Floor: {selectedFloor}
            </Text>
            <ChevronDown size={14} color="#64748b" />
          </TouchableOpacity>
        </View>
      </View>

      {/* 🚀 Add Trigger (Admin only) */}
      {isEditable && (
        <TouchableOpacity
          onPress={openAddForm}
          className="bg-[#006d3b] rounded-2xl py-3 px-4 flex-row justify-center items-center active:opacity-90 shadow-sm mb-4"
        >
          <Plus size={16} color="#fff" />
          <Text className="text-white font-black text-sm ml-2">Add New Resident Profile</Text>
        </TouchableOpacity>
      )}

      {/* 🚀 Main list view */}
      <FlatList
        data={filteredData}
        keyExtractor={(item, index) => (item.id ? item.id.toString() : index.toString())}
        scrollEnabled={false} // Disable inner scrolling if parent renders inside ScrollView
        ListEmptyComponent={
          <View className="bg-white border border-slate-100 rounded-3xl p-8 items-center mt-2 shadow-sm">
            <Text className="text-slate-400 text-xs font-medium text-center">
              No matching resident directory profiles found.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const isInvited = item.userStatus === 'invited' || mode === 'onboarding';
          return (
            <View className="p-4 rounded-3xl border border-slate-100 bg-white mb-3 shadow-sm flex-row justify-between items-center">
              <View className="flex-1 mr-2 flex-row items-center">
                <View className="w-12 h-12 rounded-full bg-slate-50 border border-slate-100 justify-center items-center">
                  <Text className="font-extrabold text-slate-700 text-[10px] text-center">
                    {item.wingName !== 'Main' ? `${item.wingName}-` : ''}{item.flatNumber}
                  </Text>
                </View>

                <View className="ml-3 flex-1">
                  <Text className="text-slate-900 font-bold text-base tracking-tight" numberOfLines={1}>
                    {item.name}
                  </Text>
                  <View className="flex-row items-center space-x-2 mt-0.5">
                    <View className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                      <Text className="text-[8px] font-black text-slate-500 uppercase">
                        {item.role}
                      </Text>
                    </View>
                    <Text className="text-slate-400 text-xs font-semibold">
                      {item.phone}
                    </Text>
                  </View>
                </View>
              </View>

              {/* CRUD Actions Panel */}
              {isEditable && (
                <View className="flex-row items-center space-x-2">
                  {renderExtraActions?.(item)}
                  <TouchableOpacity
                    onPress={() => openEditForm(item)}
                    className="w-8 h-8 rounded-full bg-slate-50 items-center justify-center border border-slate-200 active:bg-slate-100 mr-1"
                  >
                    <Edit2 size={12} color="#475569" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => confirmDeleteEntry(item)}
                    className="w-8 h-8 rounded-full bg-rose-50 items-center justify-center border border-rose-100 active:bg-rose-100 ml-1"
                  >
                    <Trash2 size={12} color="#dc2626" />
                  </TouchableOpacity>
                </View>
              )}
              {!isEditable && renderExtraActions && (
                <View className="flex-row items-center space-x-2">
                  {renderExtraActions(item)}
                </View>
              )}
            </View>
          );
        }}
      />

      {/* 🚀 Dynamic Dropdown Options Selector Modal */}
      {pickerConfig && (
        <Modal
          visible={pickerConfig.visible}
          transparent
          animationType="fade"
          onRequestClose={() => setPickerConfig(null)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setPickerConfig(null)}
            className="flex-1 bg-black/40 justify-end"
          >
            <View className="bg-white rounded-t-3xl p-6 max-h-[60%] space-y-4">
              <Text className="text-lg font-black text-slate-900 border-b border-slate-100 pb-2">
                {pickerConfig.title}
              </Text>
              <FlatList
                data={pickerConfig.options}
                keyExtractor={item => item}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => {
                      pickerConfig.onSelect(item);
                      setPickerConfig(null);
                    }}
                    className="py-3.5 border-b border-slate-50 flex-row justify-between items-center"
                  >
                    <Text className="text-slate-800 text-sm font-semibold">
                      {item}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* 🚀 CRUD Add/Edit Input Form Modal */}
      <Modal
        visible={formModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setFormModalOpen(false)}
      >
        <View className="flex-1 bg-black/50 justify-center p-5">
          <View className="bg-white rounded-3xl p-6 space-y-4 shadow-xl max-h-[85%]">
            <View className="border-b border-slate-100 pb-2">
              <Text className="text-lg font-black text-slate-900">
                {editingEntry ? 'Edit Resident Profile' : 'Add Resident Profile'}
              </Text>
            </View>

            <FlatList
              data={[1]} // Hack to enable scroll container for form inputs
              keyExtractor={item => item.toString()}
              renderItem={() => {
                const isInvited = !editingEntry || editingEntry.userStatus === 'invited' || mode === 'onboarding';
                return (
                  <View className="space-y-4 pb-6">
                    {/* Identity Guard message */}
                    {!isInvited && (
                      <View className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex-row items-start space-x-2">
                        <Info size={16} color="#d97706" />
                        <Text className="text-[11px] font-semibold text-amber-800 flex-1 ml-1 leading-relaxed">
                          🔒 Identity parameters (Name, Phone) are locked because the user's account is active. Only structural layout properties can be updated.
                        </Text>
                      </View>
                    )}

                    {/* Name */}
                    <View className="space-y-1">
                      <Text className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                        Full Name *
                      </Text>
                      <View className={`w-full border rounded-xl px-4 py-2.5 ${
                        isInvited ? 'bg-slate-50 border-slate-200' : 'bg-slate-100 border-slate-200 opacity-60'
                      }`}>
                        <TextInput
                          placeholder="e.g. John Doe"
                          placeholderTextColor="#94a3b8"
                          keyboardAppearance="light"
                          editable={isInvited}
                          value={formName}
                          onChangeText={setFormName}
                          className="text-slate-800 font-semibold p-0"
                        />
                      </View>
                    </View>

                    {/* Phone */}
                    <View className="space-y-1">
                      <Text className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                        Mobile Phone *
                      </Text>
                      <View className={`w-full border rounded-xl px-4 py-2.5 ${
                        isInvited ? 'bg-slate-50 border-slate-200' : 'bg-slate-100 border-slate-200 opacity-60'
                      }`}>
                        <TextInput
                          placeholder="10-digit number"
                          placeholderTextColor="#94a3b8"
                          keyboardAppearance="light"
                          keyboardType="numeric"
                          editable={isInvited}
                          value={formPhone}
                          onChangeText={setFormPhone}
                          className="text-slate-800 font-semibold p-0"
                        />
                      </View>
                    </View>

                    {/* Wing / Block Name */}
                    {structureType !== 'single_building' && (
                      <View className="space-y-1">
                        <Text className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                          Wing / Block Name *
                        </Text>
                        <View className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5">
                          <TextInput
                            placeholder="e.g. Wing A (or Main)"
                            placeholderTextColor="#94a3b8"
                            keyboardAppearance="light"
                            value={formWing}
                            onChangeText={setFormWing}
                            className="text-slate-800 font-semibold p-0"
                          />
                        </View>
                      </View>
                    )}

                    {/* Flat Number */}
                    <View className="space-y-1">
                      <Text className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                        Flat / Unit Number *
                      </Text>
                      <View className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5">
                        <TextInput
                          placeholder="e.g. 101"
                          placeholderTextColor="#94a3b8"
                          keyboardAppearance="light"
                          value={formFlatNumber}
                          onChangeText={setFormFlatNumber}
                          className="text-slate-800 font-semibold p-0"
                        />
                      </View>
                    </View>

                    {/* Flat Type (Only Onboarding / Creation) */}
                    {mode === 'onboarding' && (
                      <View className="space-y-1">
                        <Text className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                          Flat Unit Type
                        </Text>
                        <TouchableOpacity
                          onPress={() =>
                            setPickerConfig({
                              visible: true,
                              title: 'Select Flat Type',
                              options: FLAT_TYPES,
                              onSelect: (val: any) => setFormFlatType(val),
                            })
                          }
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex-row justify-between items-center"
                        >
                          <Text className="text-slate-800 font-semibold text-sm">
                            {formFlatType}
                          </Text>
                          <ChevronDown size={14} color="#64748b" />
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* Square Footage (Only Onboarding / Creation) */}
                    {mode === 'onboarding' && (
                      <View className="space-y-1">
                        <Text className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                          Square Footage
                        </Text>
                        <View className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5">
                          <TextInput
                            placeholder="e.g. 1000"
                            placeholderTextColor="#94a3b8"
                            keyboardAppearance="light"
                            keyboardType="numeric"
                            value={formSquareFootage}
                            onChangeText={setFormSquareFootage}
                            className="text-slate-800 font-semibold p-0"
                          />
                        </View>
                      </View>
                    )}

                    {/* Role Selector */}
                    <View className="space-y-1">
                      <Text className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                        Association Role *
                      </Text>
                      <TouchableOpacity
                        onPress={() =>
                          setPickerConfig({
                            visible: true,
                            title: 'Select Role',
                            options: ROLES,
                            onSelect: (val: any) => setFormRole(val),
                          })
                        }
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex-row justify-between items-center"
                      >
                        <Text className="text-slate-800 font-semibold text-sm uppercase">
                          {formRole}
                        </Text>
                        <ChevronDown size={14} color="#64748b" />
                      </TouchableOpacity>
                    </View>

                    {/* Designation */}
                    <View className="space-y-1">
                      <Text className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                        Designation / Label
                      </Text>
                      <View className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5">
                        <TextInput
                          placeholder="e.g. Resident Committee"
                          placeholderTextColor="#94a3b8"
                          keyboardAppearance="light"
                          value={formDesignation}
                          onChangeText={setFormDesignation}
                          className="text-slate-800 font-semibold p-0"
                        />
                      </View>
                    </View>

                    {/* Wallet Balance (Onboarding / Creation only) */}
                    {(!editingEntry || mode === 'onboarding') && (
                      <View className="space-y-1">
                        <Text className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                          Opening Wallet Balance (₹)
                        </Text>
                        <View className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5">
                          <TextInput
                            placeholder="0"
                            placeholderTextColor="#94a3b8"
                            keyboardAppearance="light"
                            keyboardType="numeric"
                            value={formWallet}
                            onChangeText={setFormWallet}
                            className="text-slate-800 font-semibold p-0"
                          />
                        </View>
                      </View>
                    )}

                    {/* Arrears (Onboarding only) */}
                    {mode === 'onboarding' && (
                      <View className="space-y-1">
                        <Text className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                          Opening Arrears Dues (₹)
                        </Text>
                        <View className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5">
                          <TextInput
                            placeholder="0"
                            placeholderTextColor="#94a3b8"
                            keyboardAppearance="light"
                            keyboardType="numeric"
                            value={formArrears}
                            onChangeText={setFormArrears}
                            className="text-slate-800 font-semibold p-0"
                          />
                        </View>
                      </View>
                    )}
                  </View>
                );
              }}
            />

            {/* Form actions */}
            <View className="flex-row space-x-3 pt-2 border-t border-slate-100">
              <TouchableOpacity
                onPress={() => setFormModalOpen(false)}
                disabled={loading}
                className="flex-1 py-3.5 bg-slate-100 rounded-xl items-center justify-center active:bg-slate-200"
              >
                <Text className="text-slate-700 font-black text-sm">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveForm}
                disabled={loading}
                className="flex-1 py-3.5 bg-[#006d3b] rounded-xl items-center justify-center active:bg-[#00522c] flex-row space-x-2"
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text className="text-white font-black text-sm">Save Profile</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 🚀 embedded alert tree */}
      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onConfirm={alertConfig.onConfirm}
        onClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
      />
    </View>
  );
};
