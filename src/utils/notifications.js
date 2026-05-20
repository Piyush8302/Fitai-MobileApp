import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { ENDPOINTS } from '../config/api';

// Foreground notification handler — shows notification even when app is open
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    priority: Notifications.AndroidNotificationPriority.MAX,
  }),
});

export async function registerForPushNotifications() {
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  // Request permissions
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

  // Create HIGH importance notification channel for Android
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
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }

  // Get Expo push token
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    const pushToken = tokenData.data;
    console.log('Expo push token:', pushToken);

    // Always try to save token to server
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        api.setToken(token);
        await api.post(ENDPOINTS.SAVE_PUSH_TOKEN, { pushToken });
        console.log('Push token saved to server');
      }
      await AsyncStorage.setItem('expoPushToken', pushToken);
    } catch (e) {
      console.log('Failed to save push token to server:', e);
    }

    return pushToken;
  } catch (e) {
    console.log('Failed to get push token:', e);
    return null;
  }
}

// Re-register push token after login (important!)
export async function savePushTokenAfterLogin() {
  try {
    const pushToken = await AsyncStorage.getItem('expoPushToken');
    if (pushToken) {
      await api.post(ENDPOINTS.SAVE_PUSH_TOKEN, { pushToken });
      console.log('Push token re-saved after login');
    } else {
      // Try to get a fresh token
      await registerForPushNotifications();
    }
  } catch (e) {
    console.log('savePushTokenAfterLogin error:', e);
  }
}

export function addNotificationListeners(onReceive, onTap) {
  const receivedSub = Notifications.addNotificationReceivedListener(onReceive);
  const responseSub = Notifications.addNotificationResponseReceivedListener(onTap);
  return () => {
    receivedSub.remove();
    responseSub.remove();
  };
}
