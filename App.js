import React, { useEffect } from 'react';
import { View, Text, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AppNavigator from './src/navigation/AppNavigator';
import { registerForPushNotifications, addNotificationListeners } from './src/utils/notifications';

class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0D0D1A', padding: 20 }}>
          <Text style={{ color: '#FF6B6B', fontSize: 20, fontWeight: 'bold', marginBottom: 10 }}>App Error</Text>
          <Text style={{ color: '#B0B0CC', fontSize: 14, textAlign: 'center' }}>{String(this.state.error?.message || this.state.error)}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  useEffect(() => {
    registerForPushNotifications();
    const cleanup = addNotificationListeners(
      (notification) => console.log('Notification received:', notification),
      (response) => console.log('Notification tapped:', response),
    );
    return cleanup;
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#0D0D1A' }}>
      <ErrorBoundary>
        <StatusBar style="light" backgroundColor="#0D0D1A" translucent={false} />
        <AppNavigator />
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
