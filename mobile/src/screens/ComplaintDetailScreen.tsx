import { ArrowLeft, Edit3, Trash2, UserPlus, X } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomAlert from '../components/CustomAlert'; // 🚀 1. Imported our real CustomAlert element

const STATUS_OPTIONS = ['open', 'in-progress', 'resolved'];

export const ComplaintDetailScreen = ({ route, navigation }: any) => {
  const {
    complaint,
    isAdmin,
    currentMembershipId,
    onUpdate,
    onDelete,
    isUpdating,
  } = route.params;

  // Polymorphic Mode Flags States
  const [editMode, setEditMode] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Declarative Controlled CustomAlert States
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<
    'success' | 'error' | 'warning' | 'info'
  >('info');
  const [onAlertConfirm, setOnAlertConfirm] = useState<
    (() => void) | undefined
  >(undefined);

  // Controlled Forms Storage States
  const [title, setTitle] = useState(complaint.title);
  const [description, setDescription] = useState(complaint.description);
  const [status, setStatus] = useState(complaint.status);
  const [staff, setStaff] = useState(complaint.assignedStaffName || '');

  const isOwner = complaint.membershipId === currentMembershipId;
  const canModifyText = isOwner && complaint.status === 'open';

  const triggerAlert = (
    title: string,
    message: string,
    type: typeof alertType,
    confirmAction?: () => void,
  ) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertType(type);
    setOnAlertConfirm(() => confirmAction);
    setAlertVisible(true);
  };

  const handleCommitChanges = () => {
    const fields = editMode
      ? { title: title.trim(), description: description.trim() }
      : { status, assignedStaffName: staff.trim() };

    onUpdate(complaint.id, fields);
    navigation.goBack();
  };

  const triggerDeleteCheck = () => {
    // 🚀 Standardized clean usage of our declarative custom alert component
    triggerAlert(
      'Delete Ticket',
      'Are you sure you want to completely erase this ticket entry from society logs permanently?',
      'warning',
      () => {
        setAlertVisible(false);
        onDelete(complaint.id);
        navigation.goBack();
      },
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-[#f7f9fb]">
      {/* Upper Navigation Appbar */}
      <View className="h-16 w-full bg-white px-5 flex-row items-center justify-between border-b border-slate-100">
        <View className="flex-row items-center space-x-3">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="p-2 -ml-2 rounded-full active:bg-slate-50"
          >
            <ArrowLeft size={22} color="#191c1e" />
          </TouchableOpacity>
          <Text className="text-xl font-black text-slate-900 ml-1">
            Ticket Details
          </Text>
        </View>

        <View className="flex-row space-x-1.5">
          {canModifyText && !editMode && (
            <TouchableOpacity
              onPress={() => setEditMode(true)}
              className="p-2 bg-slate-100 rounded-xl"
            >
              <Edit3 size={18} color="#475569" />
            </TouchableOpacity>
          )}
          {isOwner && (
            <TouchableOpacity
              onPress={triggerDeleteCheck}
              className="p-2 bg-rose-50 rounded-xl"
            >
              <Trash2 size={18} color="#ba1a1a" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20 }}
        showsVerticalScrollIndicator={false}
        className="space-y-5"
      >
        {/* 🚀 FIXED SYSTEM CRASH: Turned <div> segments back to high-grade Native <View> elements */}
        <View className="flex-row gap-2 mb-1">
          <View className="bg-slate-100 px-2.5 py-1 rounded-md">
            <Text className="text-[10px] font-black uppercase text-slate-500">
              {complaint.category}
            </Text>
          </View>
          <View
            className={`px-2.5 py-1 rounded-md ${
              status === 'resolved' ? 'bg-emerald-50' : 'bg-amber-50'
            }`}
          >
            <Text
              className={`text-[10px] font-black uppercase ${
                status === 'resolved' ? 'text-emerald-700' : 'text-amber-700'
              }`}
            >
              {status}
            </Text>
          </View>
        </View>

        {/* Form Inputs / View Switching Block */}
        {editMode ? (
          <View className="space-y-4 bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
            <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">
              Edit Content Parameters
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-bold"
            />
            <TextInput
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 h-28 textAlignVertical-top"
            />
          </View>
        ) : (
          <View className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-2">
            <Text className="text-xl font-black text-slate-900 tracking-tight">
              {title}
            </Text>
            <Text className="text-slate-600 text-sm leading-relaxed pt-1">
              {description}
            </Text>
          </View>
        )}

        {/* Attachments Thumbnail Strip */}
        {complaint.attachmentUrls && complaint.attachmentUrls.length > 0 && (
          <View className="space-y-2">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="flex-row"
            >
              {complaint.attachmentUrls.map((url: string, index: number) => (
                <TouchableOpacity
                  key={index}
                  activeOpacity={0.9}
                  onPress={() => setLightboxUrl(url)}
                  className="w-20 h-20 rounded-xl mr-3 border border-slate-200 bg-slate-100"
                >
                  <Image
                    source={{ uri: url }}
                    className="w-full h-full rounded-xl"
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Administrative Action Dashboard Control Unit */}
        {isAdmin && !editMode && (
          <View className="bg-amber-50/40 border border-amber-200 rounded-3xl p-5 space-y-4 shadow-sm">
            <Text className="text-amber-900 font-black text-xs uppercase tracking-wider">
              🛡️ Administration Management Board
            </Text>

            <View className="space-y-2">
              <Text className="text-slate-500 font-bold text-xs">
                Update Status
              </Text>
              <View className="flex-row gap-2">
                {STATUS_OPTIONS.map(opt => {
                  const isSelected = status === opt;
                  return (
                    <TouchableOpacity
                      key={opt}
                      onPress={() => setStatus(opt)}
                      className={`px-4 py-2 rounded-xl border ${
                        isSelected
                          ? 'bg-amber-600 border-amber-600'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <Text
                        className={`text-xs font-black uppercase ${
                          isSelected ? 'text-white' : 'text-slate-600'
                        }`}
                      >
                        {opt}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View className="space-y-2">
              <Text className="text-slate-500 font-bold text-xs">
                Assign Staff Specialist
              </Text>
              <View className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex-row items-center">
                <UserPlus size={16} color="#64748b" />
                <TextInput
                  placeholder="e.g. Shankar Lal (Electrician)"
                  placeholderTextColor="#94a3b8"
                  value={staff}
                  onChangeText={setStaff}
                  className="flex-1 ml-3 text-slate-800 font-medium p-0"
                />
              </View>
            </View>
          </View>
        )}

        {/* Save Modification Actions Button */}
        {(isAdmin || editMode) && (
          <TouchableOpacity
            onPress={handleCommitChanges}
            disabled={isUpdating}
            className="w-full bg-[#006d3b] py-4 rounded-xl items-center justify-center mt-2 shadow-sm"
          >
            {isUpdating ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-black text-base">
                Commit Structural Alterations
              </Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Immersive Image Lightbox Enlargement View */}
      <Modal visible={lightboxUrl !== null} transparent animationType="fade">
        <View className="flex-1 bg-black justify-center items-center relative">
          <TouchableOpacity
            onPress={() => setLightboxUrl(null)}
            className="absolute top-12 right-6 p-3 bg-white/10 rounded-full z-50"
          >
            <X size={22} color="#fff" />
          </TouchableOpacity>
          {lightboxUrl && (
            <Image
              source={{ uri: lightboxUrl }}
              className="w-full h-[80%]"
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>

      {/* 🚀 Declarative Custom Alert Component Placement */}
      <CustomAlert
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        type={alertType}
        onClose={() => setAlertVisible(false)}
        onConfirm={onAlertConfirm}
      />
    </SafeAreaView>
  );
};
