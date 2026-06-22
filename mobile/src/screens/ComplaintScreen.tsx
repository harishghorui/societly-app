import { ArrowLeft, Plus } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useComplaints } from '../hooks/useComplaints';
import { useAuthStore } from '../store/useAuthStore';

const STATUS_TABS = ['open', 'in-progress', 'resolved'];

export const ComplaintScreen = ({ navigation }: any) => {
  const activeMembership = useAuthStore(state => state.activeMembership);
  const role = activeMembership?.role || 'tenant';
  const membershipId = activeMembership?.id;

  const {
    complaints,
    setComplaints,
    loading,
    updating,
    fetchComplaints,
    editComplaint,
    removeComplaint,
  } = useComplaints();
  const [activeTab, setActiveTab] = useState<string>('open');

  // 🚀 Real-time event listener to handle updates automatically on focus entry
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchComplaints();
    });
    return unsubscribe;
  }, [navigation, fetchComplaints]);

  const filteredComplaints = useMemo(() => {
    return complaints.filter(c => c.status === activeTab);
  }, [complaints, activeTab]);

  const handleRowPress = (item: any) => {
    // 🚀 ROUTE OUT TO FULL-SCREEN CONTEXT PASSING ALL INTEGRATION HANDLERS
    navigation.navigate('ComplaintDetailScreen', {
      complaint: item,
      isAdmin: role === 'admin',
      currentMembershipId: membershipId,
      onUpdate: async (id: number, fields: any) => {
        await editComplaint(id, fields);
        // Sync the internal screen state instantly
        setComplaints(prev =>
          prev.map(c => (c.id === id ? { ...c, ...fields } : c)),
        );
      },
      onDelete: async (id: number) => {
        await removeComplaint(id);
        setComplaints(prev => prev.filter(c => c.id !== id));
      },
      isUpdating: updating,
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-[#f7f9fb]">
      <View className="h-16 w-full bg-white px-5 flex-row items-center justify-between border-b border-slate-100">
        <View className="flex-row items-center space-x-3">
          <TouchableOpacity
            onPress={() => navigation.navigate('DashboardHome')}
            className="p-2 -ml-2 rounded-full active:bg-slate-50"
          >
            <ArrowLeft size={22} color="#191c1e" />
          </TouchableOpacity>
          <Text className="text-xl font-black text-slate-900 ml-1">
            Helpdesk Dashboard
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('ComplaintFormScreen')}
          className="bg-[#006d3b] p-2 rounded-xl"
        >
          <Plus size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <View className="bg-white flex-row border-b border-slate-100 p-2 justify-around">
        {STATUS_TABS.map(tab => {
          const isSelected = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              className={`py-2 px-6 rounded-xl ${
                isSelected ? 'bg-emerald-50' : ''
              }`}
            >
              <Text
                className={`text-xs font-black uppercase tracking-wide ${
                  isSelected ? 'text-[#006d3b]' : 'text-slate-400'
                }`}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator color="#006d3b" size="large" />
        </View>
      ) : (
        <FlatList
          data={filteredComplaints}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => handleRowPress(item)}
              activeOpacity={0.8}
              className="p-5 rounded-2xl border border-slate-100 bg-white mb-3 shadow-sm space-y-3"
            >
              <View className="flex-row justify-between items-start">
                <View className="flex-1 pr-2">
                  <View className="flex-row items-center space-x-2 mb-1.5">
                    <View className="bg-slate-100 px-2 py-0.5 rounded-md">
                      <Text className="text-[10px] font-black uppercase text-slate-500">
                        {item.category}
                      </Text>
                    </View>
                    {item.membershipId === null && (
                      <View className="bg-purple-50 px-2 py-0.5 rounded-md">
                        <Text className="text-[10px] font-black uppercase text-purple-700">
                          🔒 Anonymous
                        </Text>
                      </View>
                    )}
                    {item.assignedStaffName && (
                      <View className="bg-blue-50 px-2 py-0.5 rounded-md">
                        <Text className="text-[10px] font-black uppercase text-blue-700">
                          🛠️ {item.assignedStaffName}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text className="font-bold text-slate-900 text-base">
                    {item.title}
                  </Text>
                  <Text
                    numberOfLines={2}
                    className="text-slate-500 text-xs mt-1 leading-relaxed"
                  >
                    {item.description}
                  </Text>
                </View>
              </View>

              {item.attachmentUrls && item.attachmentUrls.length > 0 && (
                <View className="flex-row items-center space-x-1.5 pt-1">
                  {item.attachmentUrls
                    .slice(0, 4)
                    .map((url: string, idx: number) => (
                      <Image
                        key={idx}
                        source={{ uri: url }}
                        className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100"
                      />
                    ))}
                </View>
              )}
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
};
