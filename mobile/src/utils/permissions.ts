import { PermissionsAndroid, Platform } from 'react-native';

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    return true;
  }

  // POST_NOTIFICATIONS was introduced in Android 13 (API level 33)
  if (Number(Platform.Version) >= 33) {
    try {
      const hasPermission = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );

      if (hasPermission) {
        return true;
      }

      const status = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        {
          title: 'Notification Permission',
          message: 'Societly requires notification permissions to alert you about new notices and invoices.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      );

      return status === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn('Error requesting notification permission:', err);
      return false;
    }
  }

  return true;
};
