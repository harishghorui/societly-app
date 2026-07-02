import React, { useState, useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Info,
  Plus,
  Trash2,
  IndianRupee,
  PlusCircle,
  Layers,
} from 'lucide-react-native';
import apiClient from '../api/client';
import { useAuthStore } from '../store/useAuthStore';
import { ApiResponse } from '../types/api.types';
import CustomAlert from '../components/CustomAlert';
import { usePropertyLayout, WingLayoutInput } from '../hooks/usePropertyLayout';
import { ResidentRosterEngine, RosterEntry } from '../components/ResidentRosterEngine';

const FLAT_TYPES = ['1BHK', '2BHK', '3BHK', 'Shop', 'Office', 'Other'];

interface UnifiedFlatInput {
  flatNumber: string;
  flatType: '1BHK' | '2BHK' | '3BHK' | 'Shop' | 'Office' | 'Other';
  squareFootage: string;
  residentName: string;
  phone: string;
  advanceWalletBalance: string;
  arrears: string;
}

interface UnifiedWingInput {
  name: string;
  flats: UnifiedFlatInput[];
}

export const FinancialOnboardingWizard = ({ navigation }: any) => {
  const activeMembership = useAuthStore(state => state.activeMembership);
  const setActiveProfile = useAuthStore(state => state.setActiveProfile);
  
  const currentStep = activeMembership?.society?.onboardingStep || 'PROFILE';
  const societyId = activeMembership?.society?.id;

  // Read structureType directly from active Zustand store profile
  const structureType = activeMembership?.society?.structureType || 'single_building';
  const isSingleBuilding = structureType === 'single_building';

  // Step 1: Opening Reserves State
  const [cashBalance, setCashBalance] = useState('');
  const [bankBalance, setBankBalance] = useState('');

  // Step 2: Consolidated Layout & Resident hook assets
  const { wings, saving: savingLayout, fetchPropertyLayout, savePropertyLayout } =
    usePropertyLayout();

  const [localWings, setLocalWings] = useState<UnifiedWingInput[]>([]);
  const [submitting, setSubmitting] = useState(false);
  
  const [alert, setAlert] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info' as any,
  });

  // Fetch layout on mount
  useEffect(() => {
    fetchPropertyLayout();
  }, [fetchPropertyLayout]);

  // Fetch latest society onboardingStep status on mount to keep local store in sync
  useEffect(() => {
    const fetchLatestStatus = async () => {
      if (!societyId || !activeMembership) return;
      try {
        const res = await apiClient.get<any, ApiResponse>(`/societies/${societyId}`);
        if (res.success && res.data) {
          const latestStep = res.data.onboardingStep;
          if (latestStep && latestStep !== activeMembership.society?.onboardingStep) {
            setActiveProfile({
              ...activeMembership,
              society: {
                ...activeMembership.society,
                onboardingStep: latestStep,
              },
            });
          }
        }
      } catch (err) {
        console.error('Failed to fetch society status on mount:', err);
      }
    };
    fetchLatestStatus();
  }, [societyId, activeMembership, setActiveProfile]);

  // Sync layout inputs based on wings data
  useEffect(() => {
    if (wings && wings.length > 0) {
      const mapped = wings.map((w: any) => ({
        name: w.name,
        flats: (w.flats || []).map((f: any) => ({
          flatNumber: f.flatNumber,
          flatType: f.flatType || '2BHK',
          squareFootage: String(f.squareFootage || '1000'),
          residentName: '',
          phone: '',
          advanceWalletBalance: '0',
          arrears: '0',
        })),
      }));
      setLocalWings(mapped);
    } else {
      if (isSingleBuilding) {
        setLocalWings([
          {
            name: 'Main',
            flats: []
          }
        ]);
      } else {
        setLocalWings([
          {
            name: 'Main',
            flats: []
          }
        ]);
      }
    }
  }, [wings, isSingleBuilding]);

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
    if (updated.length === 0 && isSingleBuilding) {
      updated.push({ name: 'Main', flats: [] });
    }
    const flatsCount = updated[wingIndex].flats.length;
    const floor = Math.floor(flatsCount / 4) + 1;
    const flatNum = `${floor}0${(flatsCount % 4) + 1}`;

    updated[wingIndex].flats.push({
      flatNumber: flatNum,
      flatType: '2BHK',
      squareFootage: '1000',
      residentName: '',
      phone: '',
      advanceWalletBalance: '0',
      arrears: '0',
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
    field: keyof UnifiedFlatInput,
    value: string,
  ) => {
    const updated = [...localWings];
    updated[wingIndex].flats[flatIndex] = {
      ...updated[wingIndex].flats[flatIndex],
      [field]: value,
    } as any;
    setLocalWings(updated);
  };

  const handleLoadDemo = () => {
    if (isSingleBuilding) {
      setLocalWings([
        {
          name: 'Main',
          flats: [
            { flatNumber: '101', flatType: '2BHK', squareFootage: '1000', residentName: 'Aarav Sharma', phone: '9876543210', advanceWalletBalance: '1500', arrears: '3000' },
            { flatNumber: '102', flatType: '1BHK', squareFootage: '750', residentName: 'Aditi Rao', phone: '9876543211', advanceWalletBalance: '0', arrears: '0' },
            { flatNumber: '201', flatType: '3BHK', squareFootage: '1500', residentName: 'Kabir Singh', phone: '9876543212', advanceWalletBalance: '500', arrears: '1500' }
          ]
        }
      ]);
    } else {
      setLocalWings([
        {
          name: 'Wing A',
          flats: [
            { flatNumber: '101', flatType: '2BHK', squareFootage: '1000', residentName: 'Aarav Sharma', phone: '9876543210', advanceWalletBalance: '1500', arrears: '3000' },
            { flatNumber: '102', flatType: '1BHK', squareFootage: '750', residentName: 'Aditi Rao', phone: '9876543211', advanceWalletBalance: '0', arrears: '0' }
          ]
        },
        {
          name: 'Wing B',
          flats: [
            { flatNumber: '201', flatType: '3BHK', squareFootage: '1500', residentName: 'Kabir Singh', phone: '9876543212', advanceWalletBalance: '500', arrears: '1500' }
          ]
        }
      ]);
    }
  };

  const rosterData = useMemo(() => {
    const flatList: RosterEntry[] = [];
    (localWings || []).forEach((wing, wingIdx) => {
      (wing.flats || []).forEach((flat, flatIdx) => {
        flatList.push({
          id: `${wingIdx}-${flatIdx}`,
          flatNumber: flat.flatNumber,
          flatType: flat.flatType,
          squareFootage: flat.squareFootage,
          wingName: wing.name,
          name: flat.residentName,
          phone: flat.phone,
          role: 'tenant',
          designation: 'Resident',
          advanceWalletBalance: flat.advanceWalletBalance,
          arrears: flat.arrears,
          userStatus: 'invited',
        });
      });
    });
    return flatList;
  }, [localWings]);

  const handleRosterChange = (newRoster: RosterEntry[]) => {
    const wingMap: { [key: string]: UnifiedFlatInput[] } = {};
    newRoster.forEach(item => {
      const wingName = item.wingName || 'Main';
      if (!wingMap[wingName]) {
        wingMap[wingName] = [];
      }
      wingMap[wingName].push({
        flatNumber: item.flatNumber,
        flatType: item.flatType || '2BHK',
        squareFootage: String(item.squareFootage || '1000'),
        residentName: item.name,
        phone: item.phone,
        advanceWalletBalance: String(item.advanceWalletBalance || '0'),
        arrears: String(item.arrears || '0'),
      });
    });

    const updatedWings = Object.keys(wingMap).map(name => ({
      name,
      flats: wingMap[name],
    }));

    setLocalWings(updatedWings);
  };

  // Submit Step 1: Initialize reserves
  const handleInitializeReserves = async () => {
    const cash = parseFloat(cashBalance);
    const bank = parseFloat(bankBalance);

    if (isNaN(cash) || cash < 0 || isNaN(bank) || bank < 0) {
      setAlert({
        visible: true,
        title: 'Validation Error',
        message: 'Please enter valid non-negative Cash and Bank balances.',
        type: 'error',
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiClient.post<any, ApiResponse>('/onboarding/initialize', {
        societyId,
        startingCashBalance: cash,
        startingBankBalance: bank,
      });

      if (res.success && activeMembership) {
        // Advance state locally
        setActiveProfile({
          ...activeMembership,
          society: {
            ...activeMembership.society,
            onboardingStep: 'FINANCIAL',
          },
        });
        setAlert({
          visible: true,
          title: 'Reserves Initialized',
          message: 'Society opening balances set successfully. Please proceed to setup your resident matrix.',
          type: 'success',
        });
      } else {
        setAlert({
          visible: true,
          title: 'Initialization Failed',
          message: res.message || 'Could not save balances.',
          type: 'error',
        });
      }
    } catch (err) {
      const errorResponse = err as ApiResponse;
      setAlert({
        visible: true,
        title: 'Network Error',
        message: errorResponse.message || 'An error occurred during balance setup.',
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Step 2: Consolidated matrix save (layout + residents)
  const handleFinalizeOnboarding = async () => {
    // Validations
    if (!isSingleBuilding && localWings.length === 0) {
      setAlert({
        visible: true,
        title: 'Validation Error',
        message: 'Multi-wing complexes must have at least one wing.',
        type: 'error',
      });
      return;
    }

    for (let w = 0; w < localWings.length; w++) {
      const wing = localWings[w];
      if (!isSingleBuilding && !wing.name.trim()) {
        setAlert({
          visible: true,
          title: 'Validation Error',
          message: `Wing at position ${w + 1} is missing a name.`,
          type: 'error',
        });
        return;
      }
      if (wing.flats.length === 0) {
        setAlert({
          visible: true,
          title: 'Validation Error',
          message: isSingleBuilding 
            ? 'Please configure at least one flat.'
            : `Wing '${wing.name}' has no flats configured.`,
          type: 'error',
        });
        return;
      }

      for (let f = 0; f < wing.flats.length; f++) {
        const flat = wing.flats[f];
        if (!flat.flatNumber.trim()) {
          setAlert({
            visible: true,
            title: 'Validation Error',
            message: `Flat number in Wing '${wing.name}' position ${f + 1} is empty.`,
            type: 'error',
          });
          return;
        }

        const size = parseFloat(flat.squareFootage);
        if (isNaN(size) || size <= 0) {
          setAlert({
            visible: true,
            title: 'Validation Error',
            message: `Square footage for flat '${flat.flatNumber}' must be positive.`,
            type: 'error',
          });
          return;
        }

        // Validate resident fields: if name or phone is present, both must be present
        const nameFilled = !!flat.residentName.trim();
        const phoneFilled = !!flat.phone.trim();
        if (nameFilled || phoneFilled) {
          if (!nameFilled || !phoneFilled) {
            setAlert({
              visible: true,
              title: 'Validation Error',
              message: `Flat '${flat.flatNumber}' has incomplete resident details. Please provide both Name and Phone.`,
              type: 'error',
            });
            return;
          }
          const cleanPhone = flat.phone.replace(/[^0-9]/g, '');
          if (cleanPhone.length !== 10) {
            setAlert({
              visible: true,
              title: 'Validation Error',
              message: `Flat '${flat.flatNumber}' resident phone number must be exactly 10 digits.`,
              type: 'error',
            });
            return;
          }
        }
      }
    }

    setSubmitting(true);
    try {
      // 1. Save Property Layout (Wings/Flats specs)
      const layoutPayload: WingLayoutInput[] = localWings.map(w => ({
        name: w.name,
        flats: w.flats.map(f => ({
          flatNumber: f.flatNumber.trim(),
          flatType: f.flatType,
          squareFootage: f.squareFootage,
        }))
      }));
      await savePropertyLayout(layoutPayload);

      // 2. Seed active resident profiles with ledger arrears/credits
      const residentsPayload: any[] = [];
      localWings.forEach(w => {
        w.flats.forEach(f => {
          if (f.residentName.trim() && f.phone.trim()) {
            const parsedArrears = parseFloat(f.arrears || '0');
            residentsPayload.push({
              flatNumber: f.flatNumber.trim(),
              wingName: isSingleBuilding ? 'Main' : w.name.trim(),
              name: f.residentName.trim(),
              phone: f.phone.trim().replace(/[^0-9]/g, ''),
              advanceWalletBalance: parseFloat(f.advanceWalletBalance || '0'),
              historicalInvoices: parsedArrears > 0 ? [
                {
                  billingCycle: 'Arrears (Opening)',
                  amount: parsedArrears,
                  dueDate: new Date(),
                  status: 'pending'
                }
              ] : []
            });
          }
        });
      });

      if (residentsPayload.length > 0) {
        const res = await apiClient.post<any, ApiResponse>('/onboarding/bulk-seed', {
          societyId,
          residents: residentsPayload,
        });

        if (!res.success) {
          throw res;
        }
      }

      // 3. Finalize onboardingStep state
      if (activeMembership) {
        setActiveProfile({
          ...activeMembership,
          society: {
            ...activeMembership.society,
            onboardingStep: 'COMPLETED',
          },
        });
      }

      setAlert({
        visible: true,
        title: 'Onboarding Complete!',
        message: 'Your property structure, ledger balance baselines, and resident records are successfully saved.',
        type: 'success',
      });
    } catch (err) {
      const errorResponse = err as ApiResponse;
      setAlert({
        visible: true,
        title: 'Setup Failed',
        message: errorResponse.message || 'An error occurred during database seeding.',
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const renderContent = () => {
    if (currentStep === 'PROFILE' || currentStep === 'LAYOUT') {
      return (
        <ScrollView className="p-5" contentContainerStyle={{ paddingBottom: 40 }}>
          <View className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex-row items-start space-x-3 mb-6">
            <Info size={20} color="#047857" className="mt-0.5" />
            <View className="flex-1">
              <Text className="text-emerald-800 font-bold text-sm">Step 1: Opening Reserves</Text>
              <Text className="text-emerald-700/90 text-xs mt-1 leading-relaxed">
                Initialize your society's existing cash-in-hand and bank balances. This serves as the baseline ledger starting point.
              </Text>
            </View>
          </View>

          <View className="space-y-4">
            <View className="space-y-1.5">
              <Text className="text-slate-500 text-xs font-black uppercase tracking-wider">Cash Balance (₹)</Text>
              <View className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 flex-row items-center">
                <IndianRupee size={16} color="#64748b" />
                <TextInput
                  placeholder="0.00"
                  placeholderTextColor="#94a3b8"
                  keyboardAppearance="light"
                  keyboardType="numeric"
                  value={cashBalance}
                  onChangeText={setCashBalance}
                  className="flex-1 ml-2 text-slate-800 font-black p-0"
                />
              </View>
            </View>

            <View className="space-y-1.5">
              <Text className="text-slate-500 text-xs font-black uppercase tracking-wider">Bank Balance (₹)</Text>
              <View className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 flex-row items-center">
                <IndianRupee size={16} color="#64748b" />
                <TextInput
                  placeholder="0.00"
                  placeholderTextColor="#94a3b8"
                  keyboardAppearance="light"
                  keyboardType="numeric"
                  value={bankBalance}
                  onChangeText={setBankBalance}
                  className="flex-1 ml-2 text-slate-800 font-black p-0"
                />
              </View>
            </View>

            <TouchableOpacity
              onPress={handleInitializeReserves}
              disabled={submitting}
              className="w-full bg-[#006d3b] rounded-xl py-4 items-center justify-center mt-6 active:bg-[#00522c] flex-row space-x-2 shadow-sm"
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Text className="text-white font-black text-sm">Save & Proceed</Text>
                  <ChevronRight size={16} color="#ffffff" />
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      );
    }

    if (currentStep === 'FINANCIAL') {
      const totalFlatsCount = localWings.reduce((sum, w) => sum + w.flats.length, 0);

      return (
        <ScrollView className="p-5" contentContainerStyle={{ paddingBottom: 60 }}>
          <View className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex-row items-start space-x-3 mb-6">
            <Info size={20} color="#047857" className="mt-0.5" />
            <View className="flex-1">
              <Text className="text-emerald-800 font-bold text-sm">Step 2: Property Layout & Resident Matrix</Text>
              <Text className="text-emerald-700/90 text-xs mt-1 leading-relaxed">
                Add units, types, and sizes, along with resident names and their starting ledger balances (credit/arrears).
              </Text>
            </View>
          </View>

          <View className="flex-row justify-between items-center mb-4">
            <View className="flex-row items-center space-x-2">
              <Text className="text-slate-900 font-black text-base">Resident Matrix</Text>
              <View className="bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-full ml-1">
                <Text className="text-[#006d3b] text-[9px] font-black uppercase">
                  Units: {totalFlatsCount}
                </Text>
              </View>
            </View>
            <View className="flex-row items-center space-x-2">
              <TouchableOpacity
                onPress={handleLoadDemo}
                className="px-2.5 py-1.5 bg-slate-100 rounded-lg active:bg-slate-200 mr-2"
              >
                <Text className="text-slate-600 font-black text-xs">Load Demo Data</Text>
              </TouchableOpacity>
              {!isSingleBuilding && (
                <TouchableOpacity
                  onPress={handleAddWing}
                  className="flex-row items-center space-x-1 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-100 active:opacity-85"
                >
                  <Plus size={12} color="#006d3b" />
                  <Text className="text-[#006d3b] text-[10px] font-black uppercase ml-0.5">
                    Add Wing
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View className="space-y-4">
            <ResidentRosterEngine
              mode="onboarding"
              data={rosterData}
              structureType={structureType}
              onDataChange={handleRosterChange}
            />

            <TouchableOpacity
              onPress={handleFinalizeOnboarding}
              disabled={submitting || savingLayout}
              className="w-full bg-[#006d3b] rounded-xl py-4 items-center justify-center mt-6 active:bg-[#00522c] flex-row space-x-2 shadow-sm"
            >
              {submitting || savingLayout ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Text className="text-white font-black text-sm">Finalize Onboarding</Text>
                  <CheckCircle2 size={16} color="#ffffff" />
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      );
    }

    // Completed State
    return (
      <View className="flex-1 justify-center items-center p-8 space-y-6">
        <View className="bg-emerald-50 p-6 rounded-full border border-emerald-100">
          <CheckCircle2 size={64} color="#10b981" />
        </View>
        <View className="space-y-2 items-center">
          <Text className="text-slate-900 text-xl font-black">Onboarding Fully Completed</Text>
          <Text className="text-slate-500 text-sm text-center leading-relaxed">
            Your society's opening financial assets and initial resident list have been successfully migrated and finalized.
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('DashboardHome')}
          className="bg-[#006d3b] px-8 py-3.5 rounded-xl active:bg-[#00522c] shadow-sm"
        >
          <Text className="text-white font-black text-sm">Go to Dashboard</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-[#f7f9fb]">
      {/* Header bar */}
      <View className="h-16 w-full bg-white px-5 flex-row items-center border-b border-slate-100 space-x-3">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="p-2 -ml-2 rounded-full active:bg-slate-50"
        >
          <ArrowLeft size={22} color="#191c1e" />
        </TouchableOpacity>
        <View>
          <Text className="text-xl font-black text-slate-900">Financial Onboarding</Text>
          <Text className="text-slate-400 text-xs mt-0.5 text-left">Setup Wizard</Text>
        </View>
      </View>

      {renderContent()}

      <CustomAlert
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        type={alert.type}
        onClose={() => {
          setAlert(prev => ({ ...prev, visible: false }));
          if (alert.type === 'success' && currentStep === 'COMPLETED') {
            navigation.navigate('DashboardHome');
          }
        }}
      />
    </SafeAreaView>
  );
};
