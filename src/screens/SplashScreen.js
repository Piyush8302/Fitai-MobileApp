import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES, FONTS } from '../constants/theme';
import api from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { savePushTokenAfterLogin } from '../utils/notifications';

const SplashScreen = ({ navigation }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();

    const checkAuth = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        const user = await AsyncStorage.getItem('user');

        if (token && user) {
          api.setToken(token);
          savePushTokenAfterLogin();
          const userData = JSON.parse(user);

          setTimeout(() => {
            if (userData.isProfileComplete) {
              navigation.replace('Main');
            } else {
              navigation.replace('ProfileSetup');
            }
          }, 2500);
        } else {
          setTimeout(() => navigation.replace('Onboarding'), 2500);
        }
      } catch (e) {
        setTimeout(() => navigation.replace('Onboarding'), 2500);
      }
    };

    checkAuth();
  }, []);

  return (
    <LinearGradient colors={['#0D0D1A', '#1A1A2E', '#0D0D1A']} style={styles.container}>
      <Animated.View style={[styles.logoContainer, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoIcon}>🏋️</Text>
        </View>
        <Text style={styles.appName}>FitAI</Text>
        <Text style={styles.tagline}>Your AI Fitness Coach</Text>
      </Animated.View>
      <Animated.View style={[styles.bottom, { opacity: fadeAnim }]}>
        <View style={styles.loader}>
          <LinearGradient colors={COLORS.gradient1} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.loaderBar} />
        </View>
        <Text style={styles.version}>v1.0.0</Text>
      </Animated.View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  logoContainer: { alignItems: 'center' },
  logoCircle: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: COLORS.primary + '20',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: COLORS.primary + '40', marginBottom: 20,
  },
  logoIcon: { fontSize: 50 },
  appName: { fontSize: 42, color: COLORS.white, ...FONTS.extraBold, letterSpacing: 2 },
  tagline: { fontSize: SIZES.fontLg, color: COLORS.textMuted, ...FONTS.medium, marginTop: 8 },
  bottom: { position: 'absolute', bottom: 60, alignItems: 'center' },
  loader: {
    width: 120, height: 4, backgroundColor: COLORS.darkBorder,
    borderRadius: 2, overflow: 'hidden', marginBottom: 16,
  },
  loaderBar: { width: '60%', height: '100%', borderRadius: 2 },
  version: { fontSize: SIZES.fontSm, color: COLORS.textMuted },
});

export default SplashScreen;
