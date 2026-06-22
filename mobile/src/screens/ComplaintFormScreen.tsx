import { ArrowLeft, X } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomAlert from '../components/CustomAlert';
import { useComplaints } from '../hooks/useComplaints';

const CATEGORIES = [
  'Plumbing',
  'Electrical',
  'Elevator',
  'Security',
  'Cleanliness',
  'Other',
];

export const ComplaintFormScreen = ({ navigation }: any) => {
  const { fileComplaint, submitting } = useComplaints();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [photos, setPhotos] = useState<any[]>([]);

  // Alert State Layouts
  const [alert, setAlert] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info' as any,
  });

  const handlePickImages = () => {
    launchImageLibrary(
      { mediaType: 'photo', quality: 0.8, selectionLimit: 5 },
      response => {
        if (response.assets) {
          setPhotos(prev => [...prev, ...response.assets!].slice(0, 5));
        }
      },
    );
  };

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) {
      return setAlert({
        visible: true,
        title: 'Validation Fault',
        message: 'Please completely fill out all mandatory text fields.',
        type: 'error',
      });
    }

    try {
      await fileComplaint(title, description, category, isAnonymous, photos);
      navigation.goBack();
    } catch (err: any) {
      setAlert({
        visible: true,
        title: 'Submission Rejected',
        message: err.message || 'File upload network error.',
        type: 'error',
      });
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#f7f9fb]">
      <View className="h-16 w-full bg-white px-5 flex-row items-center space-x-3 border-b border-slate-100">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="p-2 -ml-2 rounded-full"
        >
          <ArrowLeft size={22} color="#191c1e" />
        </TouchableOpacity>
        <Text className="text-xl font-black text-slate-900">
          File Helpdesk Ticket
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20 }}
        className="flex-1"
        showsVerticalScrollIndicator={false}
      >
        <View className="bg-white border border-slate-100 rounded-3xl p-5 space-y-4 shadow-sm">
          <TextInput
            placeholder="Issue Title Summary"
            placeholderTextColor="#94a3b8"
            value={title}
            onChangeText={setTitle}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-medium"
          />
          <TextInput
            placeholder="Detailed descriptions..."
            placeholderTextColor="#94a3b8"
            multiline
            numberOfLines={4}
            value={description}
            onChangeText={setDescription}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 h-28 textAlignVertical-top"
          />

          <View className="space-y-2">
            <Text className="text-slate-500 font-bold text-xs uppercase">
              Select Category
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {CATEGORIES.map(cat => {
                const isSelected = category === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl border ${
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

          <View className="space-y-2 pt-2">
            <Text className="text-slate-500 font-bold text-xs uppercase">
              Attachments ({photos.length}/5)
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="flex-row space-x-2"
            >
              <TouchableOpacity
                onPress={handlePickImages}
                className="w-16 h-16 bg-slate-50 border border-dashed border-slate-300 rounded-xl justify-center items-center mr-2"
              >
                <X size={20} color="#64748b" />
              </TouchableOpacity>
              {photos.map((img, idx) => (
                <View key={idx} className="w-16 h-16 rounded-xl relative mr-2">
                  <Image
                    source={{ uri: img.uri }}
                    className="w-full h-full rounded-xl"
                  />
                </View>
              ))}
            </ScrollView>
          </View>

          <View className="flex-row items-center justify-between pt-3 border-t border-slate-100">
            <Text className="text-sm font-bold text-slate-800">
              File Anonymously
            </Text>
            <Switch
              value={isAnonymous}
              onValueChange={setIsAnonymous}
              trackColor={{ true: '#006d3b' }}
            />
          </View>

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={submitting}
            className="w-full py-4 rounded-xl items-center justify-center bg-[#006d3b]"
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-black text-base">
                File Ticket Now
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      <CustomAlert
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        type={alert.type}
        onClose={() => setAlert({ ...alert, visible: false })}
      />
    </SafeAreaView>
  );
};
