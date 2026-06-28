import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { ENDPOINTS } from '../config/api';

// Foreground notification handler
// Wrapped in try-catch: Expo Go SDK 53+ does not support remote notifications
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      // New SDK 53+ API (shouldShowAlert is deprecated → foreground banner wouldn't show)
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
} catch (e) {
  console.log('Notification handler skipped (Expo Go):', e.message);
}

export async function registerForPushNotifications() {
  try {
    if (!Device.isDevice) {
      console.log('Push notifications require a physical device');
      return null;
    }

    // Skip in Expo Go (not supported SDK 53+)
    if (Constants.appOwnership === 'expo') {
      console.log('Push not supported in Expo Go. Use dev build or standalone APK.');
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Push notification permission not granted');
      return null;
    }

    // Android notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'FitAI Notifications',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6C63FF',
        sound: 'default',
        enableLights: true,
        enableVibrate: true,
        showBadge: true,
      });
    }

    // Get push token
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    const pushToken = tokenData.data;
    console.log('Expo push token:', pushToken);

    // Save to server
    const token = await AsyncStorage.getItem('token');
    if (token) {
      api.setToken(token);
      await api.post(ENDPOINTS.SAVE_PUSH_TOKEN, { pushToken });
      console.log('Push token saved to server');
    }
    await AsyncStorage.setItem('expoPushToken', pushToken);
    return pushToken;
  } catch (e) {
    console.log('registerForPushNotifications error:', e.message);
    return null;
  }
}

export async function savePushTokenAfterLogin() {
  try {
    if (Constants.appOwnership === 'expo') return; // Skip in Expo Go
    const pushToken = await AsyncStorage.getItem('expoPushToken');
    if (pushToken) {
      await api.post(ENDPOINTS.SAVE_PUSH_TOKEN, { pushToken });
      console.log('Push token re-saved after login');
    } else {
      await registerForPushNotifications();
    }
  } catch (e) {
    console.log('savePushTokenAfterLogin error:', e.message);
  }
}

export function addNotificationListeners(onReceive, onTap) {
  try {
    const receivedSub = Notifications.addNotificationReceivedListener(onReceive);
    const responseSub = Notifications.addNotificationResponseReceivedListener(onTap);
    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  } catch (e) {
    console.log('Notification listeners skipped:', e.message);
    return () => {};
  }
}
