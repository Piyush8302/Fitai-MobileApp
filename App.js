import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, applyTheme } from './src/constants/theme';
import * as Notifications from 'expo-notifications';
import { registerForPushNotifications, addNotificationListeners } from './src/utils/notifications';
import { routeFromNotificationData, navigationRef } from './src/navigation/navigationRef';

class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.dark, padding: 20 }}>
          <Text style={{ color: '#FF6B6B', fontSize: 20, fontWeight: 'bold', marginBottom: 10 }}>App Error</Text>
          <Text style={{ color: COLORS.textSecondary, fontSize: 14, textAlign: 'center' }}>{String(this.state.error?.message || this.state.error)}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [themeReady, setThemeReady] = useState(false);
  // Navigator is required lazily AFTER the theme is applied, so every
  // StyleSheet.create() in the app evaluates with the correct palette
  const NavigatorRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const mode = await AsyncStorage.getItem('themeMode');
        applyTheme(mode === 'dark' ? 'dark' : 'light'); // default: light
      } catch (e) {
        applyTheme('light');
      }
      NavigatorRef.current = require('./src/navigation/AppNavigator').default;
      setThemeReady(true);
    })();
  }, []);

  useEffect(() => {
    registerForPushNotifications();
    // Tap on a notification (app foreground/background) → open the relevant screen.
    const cleanup = addNotificationListeners(
      (notification) => {},
      (response) => routeFromNotificationData(response?.notification?.request?.content?.data),
    );
    // App opened from a KILLED state by tapping a notification → route once the
    // navigator is ready. Dedupe by notification id so a stale "last response"
    // doesn't re-route on every normal launch.
    let done = false;
    const coldStart = setInterval(async () => {
      if (done) { clearInterval(coldStart); return; }
      try {
        const last = await Notifications.getLastNotificationResponseAsync();
        const id = last?.notification?.request?.identifier;
        if (last && id && navigationRef.isReady()) {
          const prev = await AsyncStorage.getItem('lastHandledNotifId');
          if (prev !== id) {
            await AsyncStorage.setItem('lastHandledNotifId', id);
            routeFromNotificationData(last?.notification?.request?.content?.data);
          }
          done = true;
        }
      } catch (e) {}
    }, 500);
    const coldStop = setTimeout(() => clearInterval(coldStart), 6000); // give up after ~6s
    return () => { cleanup && cleanup(); clearInterval(coldStart); clearTimeout(coldStop); };
  }, []);

  if (!themeReady) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F4F5FB', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  const AppNavigator = NavigatorRef.current;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: COLORS.dark }}>
      <ErrorBoundary>
        <StatusBar style={COLORS.statusBar} backgroundColor={COLORS.dark} translucent={false} />
        <AppNavigator />
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
