import { X } from 'lucide-react-native';
import React, { useState } from 'react';
import { Modal, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';
import apiClient from '../api/client';
import { ApiResponse } from '../types/api.types';

interface NoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  societyId: number | undefined;
  onNoticePublished: (newNotice: any) => void;
}

export const NoticeModal: React.FC<NoticeModalProps> = ({
  isOpen,
  onClose,
  societyId,
  onNoticePublished,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'General' | 'Urgent' | 'Event'>('General');
  const [publishing, setPublishing] = useState(false);

  const categories = ['General', 'Urgent', 'Event'] as const;

  const handlePublish = async () => {
    if (!title.trim() || !description.trim()) {
      return Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Please fill out all fields.',
      });
    }

    setPublishing(true);
    try {
      const res = await apiClient.post('/notices', {
        societyId,
        title: title.trim(),
        description: description.trim(),
        category,
      });

      Toast.show({ type: 'success', text1: 'Broadcast Dispatched!' });
      setTitle('');
      setDescription('');
      setCategory('General');
      if (res.data?.notice) {
        onNoticePublished(res.data.notice);
      }
      onClose();
    } catch (err) {
      const apiError = err as ApiResponse;
      Toast.show({
        type: 'error',
        text1: 'Broadcast Failure',
        text2: apiError.message || 'Could not resolve notice execution.',
      });
    } finally {
      setPublishing(false);
    }
  };

  return (
    <Modal visible={isOpen} animationType="slide" transparent>
      <View className="flex-1 justify-end bg-slate-900/50">
        <View className="bg-white rounded-t-3xl p-6 space-y-4 shadow-xl">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-xl font-bold text-slate-900 tracking-tight">
              Create Notice Broadcast
            </Text>
            <TouchableOpacity onPress={onClose} className="p-1">
              <X size={20} color="#6e7a6f" />
            </TouchableOpacity>
          </View>

          <TextInput
            placeholder="Notice Headline Header"
            placeholderTextColor="#94a3b8"
            keyboardAppearance="light"
            value={title}
            onChangeText={setTitle}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-medium"
          />
          <TextInput
            placeholder="Type detailed description broadcast log message..."
            placeholderTextColor="#94a3b8"
            keyboardAppearance="light"
            multiline
            numberOfLines={4}
            value={description}
            onChangeText={setDescription}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 h-28 textAlignVertical-top"
          />

          <View className="space-y-2">
            <Text className="text-sm font-semibold text-slate-700">Category</Text>
            <View className="flex-row">
              {categories.map((cat, idx) => {
                const isSelected = category === cat;
                let activeBg = 'bg-blue-600';
                if (cat === 'Urgent') activeBg = 'bg-rose-600';
                if (cat === 'Event') activeBg = 'bg-emerald-600';

                return (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setCategory(cat)}
                    className={`flex-1 py-2.5 rounded-lg items-center border ${idx > 0 ? 'ml-2' : ''} ${
                      isSelected ? `${activeBg} border-transparent` : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <Text className={`font-semibold ${isSelected ? 'text-white' : 'text-slate-600'}`}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <TouchableOpacity
            onPress={handlePublish}
            disabled={publishing}
            className={`w-full py-3.5 rounded-xl justify-center items-center ${
              publishing ? 'bg-emerald-700/60' : 'bg-[#006d3b]'
            }`}
          >
            <Text className="text-white font-bold text-base">
              {publishing ? 'Broadcasting...' : 'Broadcast Bulletin Now'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};
