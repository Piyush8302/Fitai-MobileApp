import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { ENDPOINTS } from '../config/api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications() {
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
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

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'FitAI',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6C63FF',
    });
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const tokenData = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined
  );
  const pushToken = tokenData.data;

  const savedToken = await AsyncStorage.getItem('expoPushToken');
  if (savedToken !== pushToken) {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        api.setToken(token);
        await api.post(ENDPOINTS.SAVE_PUSH_TOKEN, { pushToken });
      }
      await AsyncStorage.setItem('expoPushToken', pushToken);
    } catch (e) {
      console.log('Failed to save push token to server:', e);
    }
  }

  return pushToken;
}

export function addNotificationListeners(onReceive, onTap) {
  const receivedSub = Notifications.addNotificationReceivedListener(onReceive);
  const responseSub = Notifications.addNotificationResponseReceivedListener(onTap);
  return () => {
    receivedSub.remove();
    responseSub.remove();
  };
}
