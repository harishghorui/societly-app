import { ArrowLeft, Phone, Search } from 'lucide-react-native';
import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDirectory } from '../hooks/useDirectory';

export const DirectoryScreen = ({ navigation }: any) => {
  const {
    directory,
    loading,
    searchQuery,
    setSearchQuery,
    roleFilter,
    setRoleFilter,
    fetchDirectory,
  } = useDirectory();

  useEffect(() => {
    fetchDirectory();
  }, [fetchDirectory]);

  const handleCallNeighbor = (phone: string) => {
    if (!phone || phone === 'Private') return;
    Linking.openURL(`tel:${phone}`);
  };

  return (
    <SafeAreaView className="flex-1 bg-[#f7f9fb]">
      {/* Navbar Title Section */}
      <View className="h-16 w-full bg-white px-5 flex-row items-center border-b border-slate-100 space-x-3">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="p-2 -ml-2 rounded-full active:bg-slate-50"
        >
          <ArrowLeft size={22} color="#191c1e" />
        </TouchableOpacity>
        <View>
          <Text className="text-xl font-black text-slate-900">
            Resident Directory
          </Text>
          <Text className="text-slate-400 text-xs mt-0.5">
            Verified Building Members
          </Text>
        </View>
      </View>

      {/* Search Input Layout Wrapper */}
      <View className="p-4 space-y-3 bg-white border-b border-slate-100">
        <View className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 flex-row items-center">
          <Search size={18} color="#94a3b8" />
          <TextInput
            placeholder="Search by name or flat unit..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="flex-1 ml-3 text-slate-800 font-medium p-0"
          />
        </View>

        {/* Segmented Filter Switch Buttons */}
        <View className="flex-row gap-2 pt-1">
          {[
            { label: 'All neighbors', value: 'all' },
            { label: 'Owners', value: 'owner' },
            { label: 'Tenants', value: 'tenant' },
          ].map(tab => {
            const isSelected = roleFilter === tab.value;
            return (
              <TouchableOpacity
                key={tab.value}
                onPress={() => setRoleFilter(tab.value)}
                className={`px-3 py-1.5 rounded-lg border ${
                  isSelected
                    ? 'bg-[#006d3b] border-[#006d3b]'
                    : 'bg-slate-50 border-slate-100'
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    isSelected ? 'text-white' : 'text-slate-600'
                  }`}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Main List Element Container */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator color="#006d3b" size="large" />
        </View>
      ) : (
        <FlatList
          data={directory}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
          ListEmptyComponent={
            <View className="bg-white border border-slate-100 rounded-2xl p-8 items-center mt-4">
              <Text className="text-slate-400 text-sm font-medium text-center">
                No matching neighbor directory records found.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const userPhone = item.User?.phone || item.user?.phone || '';
            const isPrivate = userPhone === 'Private';
            return (
              <View className="p-4 rounded-2xl border border-slate-100 bg-white mb-3 shadow-sm flex-row justify-between items-center">
                <View className="flex-row items-center space-x-3 flex-1 mr-2">
                  {/* Flat Identifier Circle Icon Widget */}
                  <View className="w-12 h-12 rounded-full bg-slate-50 items-center justify-center border border-slate-100">
                    <Text className="font-black text-slate-700 text-xs text-center">
                      {item.flatNumber}
                    </Text>
                  </View>

                  {/* Name and Privilege Subtitles */}
                  <View className="ml-3 flex-1">
                    <Text
                      className="text-slate-900 font-bold text-base tracking-tight"
                      numberOfLines={1}
                    >
                      {item.user?.name || item.User?.name}
                    </Text>
                    <View className="flex-row items-center space-x-2 mt-1">
                      <View
                        className={`px-2 py-0.5 rounded-md ${
                          item.role === 'admin' ? 'bg-amber-50' : 'bg-slate-100'
                        }`}
                      >
                        <Text
                          className={`text-[10px] font-black uppercase ${
                            item.role === 'admin'
                              ? 'text-amber-700'
                              : 'text-slate-500'
                          }`}
                        >
                          {item.role === 'admin' ? 'Secretary' : item.role}
                        </Text>
                      </View>
                      <Text className="text-slate-400 text-xs font-medium">
                        {isPrivate ? '🔒 Private' : userPhone}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Secure Dynamic Calling Direct Hook Button */}
                <TouchableOpacity
                  onPress={() => handleCallNeighbor(userPhone)}
                  disabled={isPrivate}
                  className={`w-10 h-10 rounded-full items-center justify-center ${
                    isPrivate
                      ? 'bg-slate-100 opacity-60'
                      : 'bg-emerald-50 active:bg-emerald-100'
                  }`}
                >
                  <Phone size={16} color={isPrivate ? '#94a3b8' : '#006d3b'} />
                </TouchableOpacity>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
};
