import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS } from '../constants/theme';
import InputField from '../components/InputField';
import GradientButton from '../components/GradientButton';
import api, { API_BASE_URL, ENDPOINTS } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import * as ExpoLinking from 'expo-linking';
import { savePushTokenAfterLogin } from '../utils/notifications';

WebBrowser.maybeCompleteAuthSession();

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginMode, setLoginMode] = useState('user'); // 'user' | 'admin'

  // Where to go after a successful login, based on selected mode + role
  const routeAfterLogin = (user) => {
    if (loginMode === 'admin') {
      navigation.replace('GymAdmin');
      return;
    }
    if (user.isProfileComplete) navigation.replace('Main');
    else navigation.replace('ProfileSetup');
  };

  // Parse Google auth callback URL and handle login
  const handleAuthUrl = async (url) => {
    if (!url) return false;
    const qIndex = url.indexOf('?');
    const queryString = qIndex !== -1 ? url.substring(qIndex + 1) : null;
    if (!queryString) return false;

    const params = {};
    queryString.split('&').forEach(pair => {
      const eqIndex = pair.indexOf('=');
      if (eqIndex !== -1) {
        params[decodeURIComponent(pair.substring(0, eqIndex))] = decodeURIComponent(pair.substring(eqIndex + 1));
      }
    });

    if (params.error) {
      Alert.alert('Error', 'Google login failed. Please try again.');
      return true;
    }

    if (params.token) {
      const user = params.user ? JSON.parse(decodeURIComponent(params.user)) : {};
      await AsyncStorage.setItem('token', params.token);
      await AsyncStorage.setItem('user', JSON.stringify(user));
      api.setToken(params.token);
      savePushTokenAfterLogin();

      if (user.isProfileComplete) {
        navigation.replace('Main');
      } else {
        navigation.replace('ProfileSetup');
      }
      return true;
    }
    return false;
  };

  // Listen for deep link (fallback for when openAuthSessionAsync misses the redirect)
  useEffect(() => {
    const handleDeepLink = async (event) => {
      const url = event?.url || event;
      if (url && (url.includes('token=') || url.includes('error='))) {
        await handleAuthUrl(url);
        setLoading(false);
      }
    };

    const sub = ExpoLinking.addEventListener('url', handleDeepLink);

    // Check if app was opened via deep link
    ExpoLinking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    });

    return () => sub?.remove?.();
  }, []);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);

      const redirectUrl = ExpoLinking.createURL('auth');
      const authUrl = `${API_BASE_URL}/api/auth/google/mobile?redirect=${encodeURIComponent(redirectUrl)}`;
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);

      if (result.type === 'success' && result.url) {
        const handled = await handleAuthUrl(result.url);
        if (!handled) {
          Alert.alert('Error', 'Google login failed. Please try again.');
        }
      } else if (result.type === 'cancel' || result.type === 'dismiss') {
        // User cancelled or browser was dismissed — might have been redirected via deep link
        // The deep link listener above will handle it
        console.log('Browser closed, checking for deep link...');
      }
    } catch (error) {
      Alert.alert('Error', 'Google login failed. Please try again.');
      console.log('Google login error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post(ENDPOINTS.LOGIN, { email: email.trim().toLowerCase(), password });

      if (res.success) {
        // Save token & user data
        await AsyncStorage.setItem('token', res.token);
        await AsyncStorage.setItem('user', JSON.stringify(res.user));
        api.setToken(res.token);
        savePushTokenAfterLogin();

        routeAfterLogin(res.user);
      } else {
        Alert.alert('Login Failed', res.message || 'Invalid credentials');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Please check your connection.');
      console.log('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={COLORS.gradientDark} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <Text style={styles.logo}>🏋️</Text>
          </View>
          <Text style={styles.title}>Welcome Back!</Text>
          <Text style={styles.subtitle}>
            {loginMode === 'admin' ? 'Login to manage your gym' : 'Login to continue your fitness journey'}
          </Text>
        </View>

        {/* Login mode toggle */}
        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[styles.modeBtn, loginMode === 'user' && styles.modeBtnActive]}
            onPress={() => setLoginMode('user')}
          >
            <Text style={styles.modeIcon}>🏃</Text>
            <Text style={[styles.modeText, loginMode === 'user' && styles.modeTextActive]}>Login as User</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, loginMode === 'admin' && styles.modeBtnActive]}
            onPress={() => setLoginMode('admin')}
          >
            <Text style={styles.modeIcon}>🏋️</Text>
            <Text style={[styles.modeText, loginMode === 'admin' && styles.modeTextActive]}>Login as Admin</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          <InputField
            label="Email"
            icon="mail-outline"
            placeholder="Enter your email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <InputField
            label="Password"
            icon="lock-closed-outline"
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity style={styles.forgotBtn} onPress={() => navigation.navigate('ForgotPassword')}>
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>

          <GradientButton
            title={loading ? '' : 'Login'}
            onPress={handleLogin}
            disabled={loading}
            style={styles.loginBtn}
          >
            {loading && <ActivityIndicator color="#fff" />}
          </GradientButton>

          <View style={styles.divider}>
            <View style={styles.line} />
            <Text style={styles.orText}>OR</Text>
            <View style={styles.line} />
          </View>

          <TouchableOpacity style={styles.socialBtn} onPress={handleGoogleLogin}>
            <Ionicons name="logo-google" size={22} color="#DB4437" />
            <Text style={styles.socialText}>Continue with Google</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.socialBtn, { marginTop: 12 }]}
            onPress={() => navigation.navigate('OTPLogin')}
          >
            <Ionicons name="phone-portrait-outline" size={22} color={COLORS.accent} />
            <Text style={styles.socialText}>Login with OTP</Text>
          </TouchableOpacity>

          <View style={styles.signupRow}>
            <Text style={styles.signupText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
              <Text style={styles.signupLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 80, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 40 },
  logoCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: COLORS.primary + '20',
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  logo: { fontSize: 36 },
  title: { fontSize: SIZES.fontTitle, color: COLORS.white, ...FONTS.bold },
  subtitle: { fontSize: SIZES.fontMd, color: COLORS.textMuted, ...FONTS.medium, marginTop: 8 },
  modeToggle: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  modeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: SIZES.radius,
    backgroundColor: COLORS.darkCard, borderWidth: 1.5, borderColor: COLORS.darkBorder,
  },
  modeBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '12' },
  modeIcon: { fontSize: 16 },
  modeText: { fontSize: SIZES.fontSm, color: COLORS.textMuted, ...FONTS.semiBold },
  modeTextActive: { color: COLORS.primary },
  form: {},
  forgotBtn: { alignSelf: 'flex-end', marginBottom: 24 },
  forgotRow: { alignSelf: 'center', marginBottom: 20 },
  forgotText: { fontSize: SIZES.fontMd, color: COLORS.primary, ...FONTS.medium },
  loginBtn: { marginBottom: 24 },
  divider: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  line: { flex: 1, height: 1, backgroundColor: COLORS.darkBorder },
  orText: { marginHorizontal: 16, fontSize: SIZES.fontSm, color: COLORS.textMuted, ...FONTS.medium },
  socialBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.darkCard, borderRadius: SIZES.radius,
    borderWidth: 1, borderColor: COLORS.darkBorder, paddingVertical: 14, gap: 10,
  },
  socialText: { fontSize: SIZES.fontMd, color: COLORS.white, ...FONTS.medium },
  signupRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 30 },
  signupText: { fontSize: SIZES.fontMd, color: COLORS.textMuted },
  signupLink: { fontSize: SIZES.fontMd, color: COLORS.primary, ...FONTS.bold },
});

export default LoginScreen;
