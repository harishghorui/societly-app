import { StyleSheet, ViewStyle } from 'react-native';

interface ThemeStyles {
  shadowAmbient: ViewStyle;
}

export const globalStyles = StyleSheet.create<ThemeStyles>({
  // Level 2 Ambient Shadow: Diffused Y-4, Blur-20 tinted tracking matrix
  shadowAmbient: {
    shadowColor: '#5f6d7e', // Extracted Brand Slate foundational tint
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, // 8% opacity as required
    shadowRadius: 20,
    elevation: 4, // Android fallback layer matching
  },
});
