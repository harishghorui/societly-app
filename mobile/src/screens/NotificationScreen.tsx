import {
  ArrowLeft,
  BellRing,
  CheckSquare,
  CreditCard,
  Megaphone,
} from 'lucide-react-native';
import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNotifications } from '../hooks/useNotifications';

export const NotificationScreen = ({ navigation }: any) => {
  const {
    notifications,
    loading,
    refreshing,
    fetchNotifications,
    markNotificationsRead,
  } = useNotifications();

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'invoice':
        return <CreditCard size={18} color="#ba1a1a" />;
      case 'notice':
        return <Megaphone size={18} color="#006d3b" />;
      case 'approval':
        return <CheckSquare size={18} color="#005faf" />;
      default:
        return <BellRing size={18} color="#5f6d7e" />;
    }
  };

  const getBgColor = (type: string) => {
    switch (type) {
      case 'invoice':
        return 'bg-rose-50 border-rose-100';
      case 'notice':
        return 'bg-emerald-50 border-emerald-100';
      case 'approval':
        return 'bg-blue-50 border-blue-100';
      default:
        return 'bg-slate-50 border-slate-100';
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#f7f9fb]">
      {/* App Bar Header */}
      <View className="h-16 w-full bg-white px-5 flex-row items-center border-b border-slate-100 justify-between">
        <View className="flex-row items-center space-x-3">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="p-2 -ml-2 rounded-full active:bg-slate-50"
          >
            <ArrowLeft size={22} color="#191c1e" />
          </TouchableOpacity>
          <Text className="text-xl font-black text-slate-900 ml-2">
            Notifications
          </Text>
        </View>

        {notifications.some(n => !n.isRead) && (
          <TouchableOpacity
            onPress={markNotificationsRead}
            className="px-3 py-1.5 rounded-lg active:bg-slate-50"
          >
            <Text className="text-[#006d3b] text-xs font-bold">
              Mark all read
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Main Stream Rendering Area */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator color="#006d3b" size="large" />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchNotifications(true)}
              colors={['#006d3b']}
            />
          }
          ListEmptyComponent={
            <View className="bg-white border border-slate-100 rounded-2xl p-8 items-center shadow-sm mt-4">
              <Text className="text-slate-400 text-sm font-medium text-center">
                ✨ Your inbox is empty! No notifications logged yet.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View
              className={`p-4 rounded-2xl border bg-white mb-3 shadow-sm flex-row items-start relative ${
                !item.isRead
                  ? 'border-l-4 border-l-[#006d3b]'
                  : 'border-slate-100'
              }`}
            >
              <View
                className={`w-10 h-10 rounded-full items-center justify-center ${getBgColor(
                  item.type,
                )}`}
              >
                {getIcon(item.type)}
              </View>
              <View className="flex-1 ml-3 pr-2">
                <Text
                  className={`text-sm text-slate-900 ${
                    !item.isRead ? 'font-black' : 'font-bold'
                  }`}
                >
                  {item.title}
                </Text>
                <Text className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {item.body}
                </Text>
                <Text className="text-[10px] text-slate-400 mt-2">
                  {new Date(item.createdAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
              {!item.isRead && (
                <View className="w-2 h-2 rounded-full bg-[#006d3b] absolute top-5 right-4" />
              )}
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
};
