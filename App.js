import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, applyTheme } from './src/constants/theme';
import { registerForPushNotifications, addNotificationListeners } from './src/utils/notifications';

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
    const cleanup = addNotificationListeners(
      (notification) => console.log('Notification received:', notification),
      (response) => console.log('Notification tapped:', response),
    );
    return cleanup;
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
