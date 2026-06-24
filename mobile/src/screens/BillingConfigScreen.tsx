import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Sliders, Calendar, Percent, IndianRupee, Plus, Trash2, ChevronRight } from 'lucide-react-native';
import { useBillingConfig } from '../hooks/useBillingConfig';
import { useAuthStore } from '../store/useAuthStore';
import CustomAlert from '../components/CustomAlert';

const CALC_TYPES = [
  { label: 'Fixed Flat Rate', value: 'flat_rate' },
  { label: 'Per Sq. Footage', value: 'per_sqft' },
  { label: 'By Apartment Type', value: 'flat_type' }
];

const FEE_TYPES = [
  { label: 'No Late Fees', value: 'none' },
  { label: 'Fixed Flat Amount', value: 'flat' },
  { label: 'Monthly Percentage', value: 'percentage' }
];

interface BreakdownItem {
  id: string;
  head: string;
  amount: string;
}

export const BillingConfigScreen = ({ navigation }: any) => {
  const { config, loading, saving, fetchBillingConfig, saveBillingConfig } = useBillingConfig();

  const activeMembership = useAuthStore(state => state.activeMembership);
  const onboardingStep = activeMembership?.society?.onboardingStep;

  if (onboardingStep !== 'COMPLETED') {
    return (
      <SafeAreaView className="flex-1 bg-[#f7f9fb]">
        {/* Navbar Upper Header */}
        <View className="h-16 w-full bg-white px-5 flex-row items-center space-x-3 border-b border-slate-100">
          <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 -ml-2 rounded-full active:bg-slate-50">
            <ArrowLeft size={22} color="#191c1e" />
          </TouchableOpacity>
          <Text className="text-xl font-black text-slate-900">Billing Controls</Text>
        </View>

        <View className="flex-1 justify-center items-center p-6 space-y-6">
          <View className="bg-amber-50 p-6 rounded-full border border-amber-100 shadow-sm">
            <Sliders size={48} color="#b45309" />
          </View>
          <View className="space-y-2 items-center">
            <Text className="text-slate-950 text-lg font-black text-center">Financial Onboarding Incomplete</Text>
            <Text className="text-slate-500 text-sm text-center leading-relaxed max-w-xs">
              Financial Onboarding Incomplete. Please complete the setup wizard to unlock billing features.
            </Text>
          </View>
          {(activeMembership?.role === 'admin' || activeMembership?.role === 'secretary') && (
            <TouchableOpacity
              onPress={() => navigation.navigate('FinancialOnboardingWizard')}
              className="bg-[#006d3b] px-6 py-3.5 rounded-xl active:bg-[#00522c] shadow-sm flex-row items-center space-x-2"
            >
              <Text className="text-white font-black text-sm">Open Setup Wizard</Text>
              <ChevronRight size={16} color="#ffffff" />
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    );
  }

  const [calcType, setCalcType] = useState('flat_rate');
  const [baseAmount, setBaseAmount] = useState('');
  const [perSqftRate, setPerSqftRate] = useState('');
  const [gracePeriod, setGracePeriod] = useState('');
  const [lateFeeType, setLateFeeType] = useState('none');
  const [lateFeeAmount, setLateFeeAmount] = useState('');

  const [rate1BHK, setRate1BHK] = useState('2000');
  const [rate2BHK, setRate2BHK] = useState('3000');
  const [rate3BHK, setRate3BHK] = useState('4000');

  // New State: Array to manage custom split ledger heads dynamically
  const [breakdownList, setBreakdownList] = useState<BreakdownItem[]>([]);

  const [alert, setAlert] = useState({ visible: false, title: '', message: '', type: 'info' as any });

  useEffect(() => {
    fetchBillingConfig();
  }, [fetchBillingConfig]);

  useEffect(() => {
    if (config) {
      setCalcType(config.calculationType);
      setGracePeriod(String(config.gracePeriodDays || ''));
      setLateFeeType(config.lateFeeType);
      setLateFeeAmount(String(config.lateFeeAmount || ''));
      setPerSqftRate(String(config.perSqftRate || ''));

      if (config.calculationType === 'flat_rate') {
        if (config.maintenanceBreakdown) {
          try {
            const parsed = JSON.parse(config.maintenanceBreakdown);
            if (Array.isArray(parsed) && parsed.length > 0) {
              const mapped = parsed.map((item: any, index: number) => ({
                id: String(index),
                head: item.head,
                amount: String(item.amount)
              }));
              setBreakdownList(mapped);
              
              // Calculate total base amount from breakdown sum
              const total = parsed.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0);
              setBaseAmount(String(total));
            } else {
              setBaseAmount(String(config.baseAmount || ''));
            }
          } catch (e) {
            setBaseAmount(String(config.baseAmount || ''));
          }
        } else {
          setBaseAmount(String(config.baseAmount || ''));
        }
      }

      if (config.flatTypeRates) {
        try {
          const parsed = JSON.parse(config.flatTypeRates);
          if (parsed['1BHK']) setRate1BHK(String(parsed['1BHK']));
          if (parsed['2BHK']) setRate2BHK(String(parsed['2BHK']));
          if (parsed['3BHK']) setRate3BHK(String(parsed['3BHK']));
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, [config]);

  // Breakdown Management Controls
  const addBreakdownItem = () => {
    setBreakdownList([...breakdownList, { id: String(Date.now()), head: '', amount: '' }]);
  };

  const removeBreakdownItem = (id: string) => {
    const updated = breakdownList.filter(item => item.id !== id);
    setBreakdownList(updated);
    updateBaseAmountFromList(updated);
  };

  const updateBreakdownItem = (id: string, field: 'head' | 'amount', value: string) => {
    const updated = breakdownList.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    });
    setBreakdownList(updated);
    if (field === 'amount') {
      updateBaseAmountFromList(updated);
    }
  };

  const updateBaseAmountFromList = (list: BreakdownItem[]) => {
    const total = list.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    setBaseAmount(String(total));
  };

  const handleSave = async () => {
    if (!gracePeriod.trim()) {
      return setAlert({ visible: true, title: 'Validation Fault', message: 'Please establish valid grace period day counts.', type: 'error' });
    }

    // Structure array formatted cleanly for SQL storage parsing
    const cleanBreakdown = breakdownList
      .filter(item => item.head.trim() !== '' && Number(item.amount) > 0)
      .map(item => ({ head: item.head.trim(), amount: Number(item.amount) }));

    const computedBaseAmount = calcType === 'flat_rate' && cleanBreakdown.length > 0 
      ? cleanBreakdown.reduce((sum, item) => sum + item.amount, 0)
      : Number(baseAmount) || 0;

    const payload = {
      calculationType: calcType,
      baseAmount: computedBaseAmount,
      perSqftRate: Number(perSqftRate) || 0,
      gracePeriodDays: Number(gracePeriod) || 10,
      lateFeeType,
      lateFeeAmount: Number(lateFeeAmount) || 0,
      flatTypeRates: JSON.stringify({ '1BHK': Number(rate1BHK), '2BHK': Number(rate2BHK), '3BHK': Number(rate3BHK) }),
      maintenanceBreakdown: JSON.stringify(cleanBreakdown)
    };

    try {
      await saveBillingConfig(payload);
      setAlert({ visible: true, title: 'Configuration Saved', message: 'Society ledger rules updated successfully.', type: 'success' });
    } catch (err: any) {
      setAlert({ visible: true, title: 'Sync Error', message: err.message || 'Failed updating configurations.', type: 'error' });
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-[#f7f9fb] justify-center items-center">
        <ActivityIndicator size="large" color="#006d3b" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#f7f9fb]">
      {/* Navbar Upper Header */}
      <View className="h-16 w-full bg-white px-5 flex-row items-center space-x-3 border-b border-slate-100">
        <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 -ml-2 rounded-full active:bg-slate-50">
          <ArrowLeft size={22} color="#191c1e" />
        </TouchableOpacity>
        <Text className="text-xl font-black text-slate-900">Billing Controls</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }} showsVerticalScrollIndicator={false} className="flex-1 space-y-5">
        
        {/* SECTION 1: CALCULATION STRATEGY MODEL */}
        <View className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
          <View className="flex-row items-center space-x-2">
            <Sliders size={16} color="#006d3b" />
            <Text className="text-sm font-black text-slate-800 uppercase tracking-wider ml-1">Maintenance Strategy</Text>
          </View>
          
          <View className="flex-row flex-wrap gap-2 pt-1">
            {CALC_TYPES.map(type => {
              const isSelected = calcType === type.value;
              return (
                <TouchableOpacity key={type.value} onPress={() => setCalcType(type.value)} className={`px-3 py-2 rounded-xl border ${isSelected ? 'bg-emerald-50 border-emerald-500' : 'bg-slate-50 border-slate-100'}`}>
                  <Text className={`text-xs font-bold ${isSelected ? 'text-[#006d3b]' : 'text-slate-600'}`}>{type.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Render: Flat Rate Strategy with Sub-Breakdown Engine Builder */}
          {calcType === 'flat_rate' && (
            <View className="space-y-4 pt-2">
              <View className="flex-row justify-between items-center">
                <Text className="text-xs font-bold text-slate-500">Bill Components Breakdown (Optional)</Text>
                <TouchableOpacity onPress={addBreakdownItem} className="flex-row items-center space-x-1 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200">
                  <Plus size={12} color="#006d3b" />
                  <Text className="text-[11px] font-black text-[#006d3b]">Add Component</Text>
                </TouchableOpacity>
              </View>

              {breakdownList.map((item) => (
                <View key={item.id} className="flex-row items-center space-x-2">
                  <View className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                    <TextInput 
                      placeholder="e.g. Sinking Fund" 
                      placeholderTextColor="#94a3b8"
                      value={item.head} 
                      onChangeText={(val) => updateBreakdownItem(item.id, 'head', val)}
                      className="text-slate-800 font-bold p-0 text-xs"
                      keyboardAppearance="light"
                    />
                  </View>
                  <View className="w-24 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 flex-row items-center">
                    <IndianRupee size={12} color="#64748b" />
                    <TextInput 
                      placeholder="Amt" 
                      placeholderTextColor="#94a3b8"
                      keyboardType="numeric"
                      value={item.amount} 
                      onChangeText={(val) => updateBreakdownItem(item.id, 'amount', val)}
                      className="flex-1 ml-1 text-slate-800 font-bold p-0 text-xs"
                      keyboardAppearance="light"
                    />
                  </View>
                  <TouchableOpacity onPress={() => removeBreakdownItem(item.id)} className="p-2 bg-rose-50 rounded-xl border border-rose-100">
                    <Trash2 size={14} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ))}

              <View className="space-y-1.5 border-t border-slate-100 pt-3">
                <Text className="text-xs font-bold text-slate-500">
                  {breakdownList.length > 0 ? 'Total Calculated Maintenance (Sum of components)' : 'Standard Base Monthly Maintenance'}
                </Text>
                <View className="bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 flex-row items-center">
                  <IndianRupee size={16} color="#64748b" />
                  <TextInput 
                    keyboardType="numeric" 
                    placeholder="e.g. 2500" 
                    placeholderTextColor="#94a3b8"
                    value={baseAmount} 
                    onChangeText={setBaseAmount} 
                    editable={breakdownList.length === 0} // Blocks typing if using structural breakdown summing lists
                    className={`flex-1 ml-2 font-black p-0 ${breakdownList.length > 0 ? 'text-slate-500' : 'text-slate-800'}`} 
                    keyboardAppearance="light"
                  />
                </View>
              </View>
            </View>
          )}

          {/* Render: Per Sq Footage Rate Input */}
          {calcType === 'per_sqft' && (
            <View className="space-y-1.5 pt-2">
              <Text className="text-xs font-bold text-slate-500">Rate cost multiplier per Sq. Foot (₹)</Text>
              <View className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex-row items-center">
                <IndianRupee size={16} color="#64748b" />
                <TextInput 
                  keyboardType="numeric" 
                  placeholder="e.g. 2.50" 
                  placeholderTextColor="#94a3b8"
                  value={perSqftRate} 
                  onChangeText={setPerSqftRate} 
                  className="flex-1 ml-2 text-slate-800 font-bold p-0" 
                  keyboardAppearance="light"
                />
              </View>
            </View>
          )}

          {/* Render: Variable Flat Type Allocation Inputs */}
          {calcType === 'flat_type' && (
            <View className="space-y-3 pt-2">
              <Text className="text-xs font-bold text-slate-500">Configure Flat Type Pricing Rules (₹)</Text>
              
              <View className="flex-row items-center justify-between space-x-3">
                <Text className="text-xs font-black text-slate-700 w-12">1 BHK</Text>
                <View className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 flex-row items-center flex-1">
                  <TextInput keyboardType="numeric" placeholderTextColor="#94a3b8" value={rate1BHK} onChangeText={setRate1BHK} className="flex-1 text-slate-800 font-bold p-0 text-xs" keyboardAppearance="light" />
                </View>
              </View>

              <View className="flex-row items-center justify-between space-x-3">
                <Text className="text-xs font-black text-slate-700 w-12">2 BHK</Text>
                <View className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 flex-row items-center flex-1">
                  <TextInput keyboardType="numeric" placeholderTextColor="#94a3b8" value={rate2BHK} onChangeText={setRate2BHK} className="flex-1 text-slate-800 font-bold p-0 text-xs" keyboardAppearance="light" />
                </View>
              </View>

              <View className="flex-row items-center justify-between space-x-3">
                <Text className="text-xs font-black text-slate-700 w-12">3 BHK</Text>
                <View className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 flex-row items-center flex-1">
                  <TextInput keyboardType="numeric" placeholderTextColor="#94a3b8" value={rate3BHK} onChangeText={setRate3BHK} className="flex-1 text-slate-800 font-bold p-0 text-xs" keyboardAppearance="light" />
                </View>
              </View>
            </View>
          )}
        </View>

        {/* SECTION 2: GRACE PERIOD SETTINGS */}
        <View className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
          <View className="flex-row items-center space-x-2">
            <Calendar size={16} color="#006d3b" />
            <Text className="text-sm font-black text-slate-800 uppercase tracking-wider ml-1">Payment Window</Text>
          </View>

          <View className="space-y-1.5">
            <Text className="text-xs font-bold text-slate-500">Allowed Grace Period (Days from generation run)</Text>
            <View className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex-row items-center">
              <TextInput 
                keyboardType="numeric" 
                placeholder="e.g. 10 (Due on the 11th)" 
                placeholderTextColor="#94a3b8"
                value={gracePeriod} 
                onChangeText={setGracePeriod} 
                className="flex-1 text-slate-800 font-bold p-0" 
                keyboardAppearance="light"
              />
            </View>
          </View>
        </View>

        {/* SECTION 3: LATE PENALTY CONTROLS */}
        <View className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
          <View className="flex-row items-center space-x-2">
            <Percent size={16} color="#006d3b" />
            <Text className="text-sm font-black text-slate-800 uppercase tracking-wider ml-1">Late Penalty Interventions</Text>
          </View>

          <View className="flex-row flex-wrap gap-2 pt-1">
            {FEE_TYPES.map(fee => {
              const isSelected = lateFeeType === fee.value;
              return (
                <TouchableOpacity key={fee.value} onPress={() => setLateFeeType(fee.value)} className={`px-3 py-2 rounded-xl border ${isSelected ? 'bg-emerald-50 border-emerald-500' : 'bg-slate-50 border-slate-100'}`}>
                  <Text className={`text-xs font-bold ${isSelected ? 'text-[#006d3b]' : 'text-slate-600'}`}>{fee.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {lateFeeType !== 'none' && (
            <View className="space-y-1.5 pt-2">
              <Text className="text-xs font-bold text-slate-500">
                {lateFeeType === 'flat' ? 'Fixed Fine Penalty Charge (₹)' : 'Interest Rate Percentage (%)'}
              </Text>
              <View className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex-row items-center">
                {lateFeeType === 'flat' ? <IndianRupee size={16} color="#64748b" /> : <Text className="text-slate-400 font-bold mr-1">%</Text>}
                <TextInput 
                  keyboardType="numeric" 
                  placeholder={lateFeeType === 'flat' ? "e.g. 100" : "e.g. 2"} 
                  placeholderTextColor="#94a3b8"
                  value={lateFeeAmount} 
                  onChangeText={setLateFeeAmount} 
                  className="flex-1 ml-2 text-slate-800 font-bold p-0" 
                  keyboardAppearance="light"
                />
              </View>
            </View>
          )}
        </View>

        {/* Save CTA Button */}
        <TouchableOpacity onPress={handleSave} disabled={saving} className="w-full bg-[#006d3b] py-4 rounded-xl items-center justify-center shadow-sm active:opacity-90">
          {saving ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-black text-base">Save Settings Matrix</Text>}
        </TouchableOpacity>
      </ScrollView>

      <CustomAlert visible={alert.visible} title={alert.title} message={alert.message} type={alert.type} onClose={() => setAlert({ ...alert, visible: false })} />
    </SafeAreaView>
  );
};