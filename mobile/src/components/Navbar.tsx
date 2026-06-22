import { Bell, Menu } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

interface NavbarProps {
  onMenuPress: () => void;
  navigation: any;
}

export const Navbar: React.FC<NavbarProps> = ({ onMenuPress, navigation }) => {
  return (
    <View className="h-16 w-full bg-white px-5 flex-row justify-between items-center border-b border-slate-100 z-10">
      <TouchableOpacity
        onPress={onMenuPress}
        className="p-2 -ml-2 rounded-full active:bg-slate-50"
      >
        <Menu size={22} color="#191c1e" />
      </TouchableOpacity>
      <View className="flex-row items-center">
        <Text className="text-xl font-black text-[#006d3b] tracking-tighter">
          Societly
        </Text>
      </View>
      <TouchableOpacity
        onPress={() => navigation.navigate('NotificationScreen')}
        className="p-2 -mr-2 rounded-full active:bg-slate-50 relative"
      >
        <Bell size={22} color="#191c1e" />
        <View className="absolute top-2 right-2 w-2 h-2 bg-rose-600 rounded-full" />
      </TouchableOpacity>
    </View>
  );
};
