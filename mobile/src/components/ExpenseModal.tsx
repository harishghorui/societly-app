import { DollarSign, FileText, X } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useExpenses } from '../hooks/useExpenses';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExpenseLogged: () => void; // Sync callback to refresh core dashboard summaries instantly
}

const CATEGORIES = [
  'Sweeper/Janitorial',
  'Watchmen/Security',
  'Water Tanker',
  'Electricity/Utilities',
  'Repairs/Infrastructure',
];

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  onClose,
  onExpenseLogged,
}) => {
  const { createExpense, publishing } = useExpenses();

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank'>('cash');

  const handleResetAndSubmit = () => {
    createExpense(title, amount, category, paymentMethod, () => {
      // Clear out local states on successful API settlement
      setTitle('');
      setAmount('');
      setCategory(CATEGORIES[0]);
      setPaymentMethod('cash');
      onExpenseLogged();
      onClose();
    });
  };

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-slate-900/50">
        <View className="bg-white rounded-t-3xl p-6 space-y-4 shadow-xl max-h-[90%]">
          {/* Header Block */}
          <View className="flex-row justify-between items-center mb-1">
            <View>
              <Text className="text-xl font-black text-slate-900 tracking-tight">
                Log Society Expense
              </Text>
              <Text className="text-slate-400 text-xs mt-0.5">
                Deducts directly from liquid reserve asset sheets
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              className="p-2 bg-slate-50 rounded-full"
            >
              <X size={18} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Title Input */}
            <View className="space-y-1.5 mb-4">
              <Text className="text-slate-500 font-bold text-xs uppercase tracking-wide">
                Expense Title
              </Text>
              <View className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex-row items-center">
                <FileText size={16} color="#94a3b8" />
                <TextInput
                  placeholder="e.g. Watchmen Salary June"
                  placeholderTextColor="#94a3b8"
                  keyboardAppearance="light"
                  value={title}
                  onChangeText={setTitle}
                  className="flex-1 ml-3 text-slate-800 font-medium p-0"
                />
              </View>
            </View>

            {/* Amount Input */}
            <View className="space-y-1.5 mb-4">
              <Text className="text-slate-500 font-bold text-xs uppercase tracking-wide">
                Amount Paid (₹)
              </Text>
              <View className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex-row items-center">
                <Text className="text-slate-400 font-bold text-base">₹</Text>
                <TextInput
                  placeholder="0.00"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                  keyboardAppearance="light"
                  value={amount}
                  onChangeText={setAmount}
                  className="flex-1 ml-3 text-slate-800 font-black p-0"
                />
              </View>
            </View>

            {/* Category Chip Array Selector */}
            <View className="space-y-2 mb-4">
              <Text className="text-slate-500 font-bold text-xs uppercase tracking-wide">
                Expense Category
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {CATEGORIES.map(cat => {
                  const isSelected = category === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => setCategory(cat)}
                      className={`px-3 py-2 rounded-xl border ${
                        isSelected
                          ? 'bg-emerald-50 border-emerald-500'
                          : 'bg-slate-50 border-slate-100'
                      }`}
                    >
                      <Text
                        className={`text-xs font-bold ${
                          isSelected ? 'text-[#006d3b]' : 'text-slate-600'
                        }`}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Payment Source Segmented Switch */}
            <View className="space-y-2 mb-4">
              <Text className="text-slate-500 font-bold text-xs uppercase tracking-wide">
                Paid From
              </Text>
              <View className="flex-row justify-between bg-slate-100 p-1.5 rounded-xl">
                <TouchableOpacity
                  onPress={() => setPaymentMethod('cash')}
                  className={`flex-1 py-2.5 rounded-lg items-center ${
                    paymentMethod === 'cash' ? 'bg-white shadow-sm' : ''
                  }`}
                >
                  <Text
                    className={`text-xs font-black ${
                      paymentMethod === 'cash'
                        ? 'text-slate-900'
                        : 'text-slate-400'
                    }`}
                  >
                    Cash Balance
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setPaymentMethod('bank')}
                  className={`flex-1 py-2.5 rounded-lg items-center ${
                    paymentMethod === 'bank' ? 'bg-white shadow-sm' : ''
                  }`}
                >
                  <Text
                    className={`text-xs font-black ${
                      paymentMethod === 'bank'
                        ? 'text-slate-900'
                        : 'text-slate-400'
                    }`}
                  >
                    Bank Ledgers
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              onPress={handleResetAndSubmit}
              disabled={publishing}
              className={`w-full py-4 rounded-xl justify-center items-center mt-2 ${
                publishing ? 'bg-emerald-700/60' : 'bg-[#006d3b]'
              }`}
            >
              {publishing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-black text-base">
                  Record Operational Expense
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
