import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { Platform, StatusBar, View } from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

// Store & Service Imports
import { notificationService } from './src/services/notificationService';
import { useAuthStore } from './src/store/useAuthStore';

// Screens
import { AdminVerificationDesk } from './src/screens/AdminVerificationDesk';
import AuthScreen from './src/screens/AuthScreen';
import { BillingConfigScreen } from './src/screens/BillingConfigScreen';
import { ComplaintDetailScreen } from './src/screens/ComplaintDetailScreen';
import { ComplaintFormScreen } from './src/screens/ComplaintFormScreen';
import { ComplaintScreen } from './src/screens/ComplaintScreen';
import DashboardHome from './src/screens/DashboardHome';
import { DirectoryScreen } from './src/screens/DirectoryScreen';
import GatewayScreen from './src/screens/GatewayScreen';
import { NotificationScreen } from './src/screens/NotificationScreen';
import ProfilePicker from './src/screens/ProfilePicker';
import { ResidentLedgerScreen } from './src/screens/ResidentLedgerScreen';
import { SocietyProfileScreen } from './src/screens/SocietyProfileScreen';

const Stack = createNativeStackNavigator();

function AppContent() {
  const insets = useSafeAreaInsets();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) {
      setHydrated(true);
    } else {
      const unsub = useAuthStore.persist.onFinishHydration(() => {
        setHydrated(true);
      });
      return unsub;
    }
  }, []);

  const token = useAuthStore(state => state.token);
  const activeMembership = useAuthStore(state => state.activeMembership);

  useEffect(() => {
    if (!hydrated) return;

    notificationService.initializeListeners();

    if (token) {
      notificationService.registerDevice();
    }
  }, [token, hydrated]);

  const getInitialRoute = (): string => {
    if (token && activeMembership) return 'DashboardHome';
    if (token && !activeMembership) return 'ProfilePicker';
    return 'GatewayScreen';
  };

  if (!hydrated) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f7f9fb' }}>
        <StatusBar
          translucent={false}
          barStyle="dark-content"
          backgroundColor="#f7f9fb"
        />
      </View>
    );
  }

  return (
  <View style={{ flex: 1, backgroundColor: '#f7f9fb' }}>

    {Platform.OS === 'ios' && (
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: insets.top,
          backgroundColor: '#f7f9fb',
          zIndex: 9999,
        }}
      />
    )}

      <StatusBar
        translucent={false}
        barStyle="dark-content"
        backgroundColor="#f7f9fb"
      />

      <NavigationContainer>
        <Stack.Navigator
          initialRouteName={getInitialRoute()}
          screenOptions={{ headerShown: false }}
        >
          <Stack.Screen name="GatewayScreen" component={GatewayScreen} />
          <Stack.Screen name="AuthScreen" component={AuthScreen} />
          <Stack.Screen name="ProfilePicker" component={ProfilePicker} />
          <Stack.Screen name="DashboardHome" component={DashboardHome} />
          <Stack.Screen
            name="NotificationScreen"
            component={NotificationScreen}
          />
          <Stack.Screen name="DirectoryScreen" component={DirectoryScreen} />
          <Stack.Screen name="ComplaintScreen" component={ComplaintScreen} />
          <Stack.Screen
            name="ComplaintFormScreen"
            component={ComplaintFormScreen}
          />
          <Stack.Screen
            name="ComplaintDetailScreen"
            component={ComplaintDetailScreen}
          />
          <Stack.Screen
            name="BillingConfigScreen"
            component={BillingConfigScreen}
          />
          <Stack.Screen
            name="ResidentLedgerScreen"
            component={ResidentLedgerScreen}
          />
          <Stack.Screen
            name="AdminVerificationDesk"
            component={AdminVerificationDesk}
          />
          <Stack.Screen
            name="SocietyProfileScreen"
            component={SocietyProfileScreen}
          />

        </Stack.Navigator>
      </NavigationContainer>

      <Toast />
    </View>
  );
}

function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

export default App;
