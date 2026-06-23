import {
  AuthorizationStatus,
  getInitialNotification,
  getMessaging,
  getToken,
  onMessage,
  onNotificationOpenedApp,
  onTokenRefresh,
  requestPermission,
  hasPermission,
} from '@react-native-firebase/messaging';
import { Platform } from 'react-native';
import Toast from 'react-native-toast-message';
import apiClient from '../api/client';
import { useAuthStore } from '../store/useAuthStore';

class NotificationService {
  private messagingInstance = getMessaging(); // Initialize the modular messaging instance

  // 1. Request OS Permission and Sync Token with Backend
  async registerDevice() {
    try {
      const user = useAuthStore.getState().user;
      if (!user) return;

      // Check current authorization status first
      const currentStatus = await hasPermission(this.messagingInstance);

      if (currentStatus === AuthorizationStatus.DENIED) {
        console.log('⚠️ Notification permission is already denied');
        return;
      }

      let authStatus: number = currentStatus;

      // Only request if permission has not been determined yet
      if (currentStatus === AuthorizationStatus.NOT_DETERMINED) {
        authStatus = await requestPermission(this.messagingInstance);
      }

      const enabled =
        authStatus === AuthorizationStatus.AUTHORIZED ||
        authStatus === AuthorizationStatus.PROVISIONAL;

      if (!enabled) {
        console.log('⚠️ Notification permission denied');
        return;
      }

      // Fetch the unique token string via Modular SDK
      const fcmToken = await getToken(this.messagingInstance);
      if (fcmToken) {
        await this.sendTokenToServer(user.id, fcmToken);
      }

      // 2. Listen for Token Rotations using the proper modular hook
      onTokenRefresh(this.messagingInstance, async newToken => {
        console.log(
          '🔄 FCM Token refreshed automatically by Google (Modular API)',
        );
        await this.sendTokenToServer(user.id, newToken);
      });
    } catch (error) {
      console.error('❌ Failed to register push notifications:', error);
    }
  }

  // 📬 Helper function to execute the backend database sync
  private async sendTokenToServer(userId: number, fcmToken: string) {
    try {
      await apiClient.post('/auth/device-token', {
        userId,
        fcmToken,
        deviceType: Platform.OS, // Maps dynamically to 'android' or 'ios'
      });
      console.log(
        '🚀 Device FCM Token successfully synced with PostgreSQL backend',
      );
    } catch (error) {
      console.error('❌ Failed to sync device token with server:', error);
    }
  }

  // 🔔 Initialize Live Message Event Listeners (Modular)
  initializeListeners() {
    // 💡 SCENARIO A: App is in FOREGROUND
    onMessage(this.messagingInstance, async remoteMessage => {
      console.log(
        '📥 Foreground Push Payload Received (Modular):',
        remoteMessage,
      );

      if (remoteMessage.notification) {
        Toast.show({
          type: 'info',
          text1: remoteMessage.notification.title || 'Notification',
          text2: remoteMessage.notification.body || '',
          position: 'top',
          visibilityTime: 4000,
        });
      }
    });

    // 💡 SCENARIO B: User clicks notification card from background
    onNotificationOpenedApp(this.messagingInstance, remoteMessage => {
      console.log(
        '📭 App opened from background state via notification:',
        remoteMessage.data,
      );
    });

    // 💡 SCENARIO C: App launched from cold dead state via notification
    getInitialNotification(this.messagingInstance)
      .then(remoteMessage => {
        if (remoteMessage) {
          console.log(
            '💀 App launched from cold dead state via notification:',
            remoteMessage.data,
          );
        }
      })
      .catch(err => console.error('Error fetching initial notification:', err));
  }
}

export const notificationService = new NotificationService();
