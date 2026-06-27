import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Linking, KeyboardAvoidingView, Platform } from 'react-native';
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
  const [phone, setPhone] = useState('');
  const [showEmailLogin, setShowEmailLogin] = useState(false); // email/password is now optional
  const [loading, setLoading] = useState(false);
  const [loginMode, setLoginMode] = useState('user'); // 'user' | 'admin'
  // Ref mirrors loginMode so the Google deep-link handler (set up once) always
  // reads the LATEST selected chip, not a stale value.
  const loginModeRef = useRef('user');
  const setMode = (m) => { setLoginMode(m); loginModeRef.current = m; };

  // Where to go after a successful login, based on selected mode + role
  const routeAfterLogin = async (user) => {
    const mode = loginModeRef.current;
    await AsyncStorage.setItem('loginRole', mode); // remember for app refresh
    if (mode === 'admin') {
      navigation.replace('AdminMain');
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

      // Respect the selected chip (User vs Admin) — uses the ref, not stale state
      await routeAfterLogin(user);
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

  // Primary flow — phone + OTP. Carries the selected chip (User/Admin) to the OTP screen.
  const handleSendOtp = async () => {
    const p = (phone || '').replace(/\D/g, '');
    if (p.length < 10) { Alert.alert('Error', 'Enter a valid 10-digit mobile number'); return; }

    // Admin login is gated — only registered & approved gym owners/staff can enter
    if (loginMode === 'admin') {
      setLoading(true);
      try {
        const res = await api.post(ENDPOINTS.OWNER_STATUS, { phone: p });
        setLoading(false);
        if (res.success && res.status === 'approved') {
          navigation.navigate('OTPLogin', { loginRole: 'admin', phone: p, autoSend: true });
        } else if (res.status === 'pending') {
          Alert.alert('Pending approval', 'Your gym registration is awaiting approval. You\'ll get an email once approved.');
        } else if (res.status === 'rejected') {
          Alert.alert('Not approved', 'Your gym registration was not approved. Please contact support.');
        } else {
          Alert.alert('User not registered', 'This number is not a registered gym owner. Please register your gym first.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Register', onPress: () => navigation.navigate('GymOwnerRegister', { phone: p }) },
          ]);
        }
      } catch (e) { setLoading(false); Alert.alert('Error', 'Network error. Please try again.'); }
      return;
    }
    navigation.navigate('OTPLogin', { loginRole: 'user', phone: p, autoSend: true });
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
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
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
            onPress={() => setMode('user')}
          >
            <Text style={styles.modeIcon}>🏃</Text>
            <Text style={[styles.modeText, loginMode === 'user' && styles.modeTextActive]}>Login as User</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, loginMode === 'admin' && styles.modeBtnActive]}
            onPress={() => setMode('admin')}
          >
            <Text style={styles.modeIcon}>🏋️</Text>
            <Text style={[styles.modeText, loginMode === 'admin' && styles.modeTextActive]}>Login as Admin</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          {/* PRIMARY — mobile number + OTP */}
          <InputField
            label="Mobile Number"
            icon="call-outline"
            placeholder="Enter 10-digit number"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            maxLength={10}
          />
          <GradientButton
            title="Send OTP"
            onPress={handleSendOtp}
            style={styles.loginBtn}
          />

          {loginMode === 'admin' ? (
            // Gym owners & staff log in with OTP only — no email/password/Google
            <View style={styles.adminNote}>
              <Ionicons name="shield-checkmark-outline" size={16} color={COLORS.primary} />
              <Text style={styles.adminNoteText}>Gym owners & staff log in securely with OTP only.</Text>
            </View>
          ) : (
            <>
              <View style={styles.divider}>
                <View style={styles.line} />
                <Text style={styles.orText}>OR</Text>
                <View style={styles.line} />
              </View>

              <TouchableOpacity style={styles.socialBtn} onPress={handleGoogleLogin} disabled={loading}>
                <Ionicons name="logo-google" size={22} color="#DB4437" />
                <Text style={styles.socialText}>Continue with Google</Text>
              </TouchableOpacity>

              {/* OPTIONAL — email & password */}
              <TouchableOpacity style={[styles.socialBtn, { marginTop: 12 }]} onPress={() => setShowEmailLogin(v => !v)}>
                <Ionicons name="mail-outline" size={22} color={COLORS.accent} />
                <Text style={styles.socialText}>{showEmailLogin ? 'Hide email login' : 'Login with email & password'}</Text>
              </TouchableOpacity>

              {showEmailLogin && (
                <View style={{ marginTop: 16 }}>
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
                    title={loading ? 'Logging in…' : 'Login'}
                    onPress={handleLogin}
                    disabled={loading}
                    style={styles.loginBtn}
                  />
                </View>
              )}
            </>
          )}

          <View style={styles.signupRow}>
            <Text style={styles.signupText}>
              {loginMode === 'admin' ? 'New gym owner? ' : "Don't have an account? "}
            </Text>
            <TouchableOpacity onPress={() => loginMode === 'admin' ? navigation.navigate('GymOwnerRegister', { phone: (phone || '').replace(/\D/g, '') }) : navigation.navigate('Signup', { mode: loginMode })}>
              <Text style={styles.signupLink}>{loginMode === 'admin' ? 'Register Gym' : 'Sign Up'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
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
  adminNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8, padding: 12, borderRadius: SIZES.radius, backgroundColor: COLORS.primary + '12', borderWidth: 1, borderColor: COLORS.primary + '30' },
  adminNoteText: { fontSize: SIZES.fontSm, color: COLORS.textSecondary, ...FONTS.medium },
  signupRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 30 },
  signupText: { fontSize: SIZES.fontMd, color: COLORS.textMuted },
  signupLink: { fontSize: SIZES.fontMd, color: COLORS.primary, ...FONTS.bold },
});

export default LoginScreen;
