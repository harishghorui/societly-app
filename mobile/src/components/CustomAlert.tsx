import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';

interface CustomAlertProps {
  visible: boolean;
  title: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  onClose: () => void;
  onConfirm?: () => void;
  confirmText?: string;
  cancelText?: string;
}

const CustomAlert = ({
  visible,
  title,
  message,
  type = 'info',
  onClose,
  onConfirm,
  confirmText = 'OK',
  cancelText = 'Cancel',
}: CustomAlertProps) => {
  
  // Icon and theme config based on Alert Type
  const getTypeConfig = () => {
    switch (type) {
      case 'success':
        return {
          iconBg: 'bg-emerald-50 border-emerald-100',
          iconColor: 'text-emerald-600',
          btnBg: 'bg-emerald-600 active:bg-emerald-700',
          borderColor: 'border-emerald-500',
          svg: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ),
        };
      case 'error':
        return {
          iconBg: 'bg-rose-50 border-rose-100',
          iconColor: 'text-rose-600',
          btnBg: 'bg-rose-600 active:bg-rose-700',
          borderColor: 'border-rose-500',
          svg: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ),
        };
      case 'warning':
        return {
          iconBg: 'bg-amber-50 border-amber-100',
          iconColor: 'text-amber-600',
          btnBg: 'bg-amber-500 active:bg-amber-600',
          borderColor: 'border-amber-500',
          svg: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          ),
        };
      case 'info':
      default:
        return {
          iconBg: 'bg-indigo-50 border-indigo-100',
          iconColor: 'text-indigo-600',
          btnBg: 'bg-indigo-600 active:bg-indigo-700',
          borderColor: 'border-indigo-500',
          svg: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          ),
        };
    }
  };

  const config = getTypeConfig();

  // Since React Native on mobile doesn't render HTML/SVG natively without extra packages like react-native-svg,
  // we will construct custom high-fidelity CSS/Native Wind elements for visual representations of these icons 
  // to avoid adding heavy native library dependencies that would require rebuilding the app.
  const renderVisualIcon = () => {
    switch (type) {
      case 'success':
        return (
          <View className={`w-14 h-14 rounded-full ${config.iconBg} border items-center justify-center mb-4`}>
            <View className="w-6 h-3 border-l-4 border-b-4 border-emerald-600 -rotate-45 -mt-1" />
          </View>
        );
      case 'error':
        return (
          <View className={`w-14 h-14 rounded-full ${config.iconBg} border items-center justify-center mb-4 relative`}>
            <View className="w-7 h-1 bg-rose-600 rotate-45 absolute" />
            <View className="w-7 h-1 bg-rose-600 -rotate-45 absolute" />
          </View>
        );
      case 'warning':
        return (
          <View className={`w-14 h-14 rounded-full ${config.iconBg} border items-center justify-center mb-4`}>
            <Text className="text-amber-600 text-3xl font-bold -mt-1">!</Text>
          </View>
        );
      case 'info':
      default:
        return (
          <View className={`w-14 h-14 rounded-full ${config.iconBg} border items-center justify-center mb-4`}>
            <Text className="text-indigo-600 text-2xl font-bold -mt-0.5">i</Text>
          </View>
        );
    }
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      {/* Semi-transparent Backdrop with Blur feel */}
      <View style={styles.backdrop} className="flex-1 justify-center items-center bg-slate-900/60 px-6">
        
        {/* Sleek Alert Container */}
        <View className="bg-white w-full max-w-[340px] rounded-3xl p-6 items-center shadow-2xl border border-slate-100">
          
          {/* Animated Header Visual Icon */}
          {renderVisualIcon()}

          {/* Title */}
          <Text className="text-slate-800 text-xl font-bold text-center mb-2 tracking-tight">
            {title}
          </Text>

          {/* Message */}
          <Text className="text-slate-500 text-sm text-center mb-6 leading-relaxed">
            {message}
          </Text>

          {/* Buttons Row */}
          <View className="flex-row w-full justify-between items-center">
            {onConfirm && (
              <TouchableOpacity
                className="flex-1 py-3 border border-slate-200 rounded-xl items-center justify-center mr-2 active:bg-slate-50"
                onPress={onClose}
              >
                <Text className="text-slate-600 font-semibold text-base">
                  {cancelText}
                </Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              className={`flex-1 py-3 ${config.btnBg} rounded-xl items-center justify-center`}
              onPress={onConfirm ? onConfirm : onClose}
            >
              <Text className="text-white font-semibold text-base">
                {confirmText}
              </Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
  },
});

export default CustomAlert;
