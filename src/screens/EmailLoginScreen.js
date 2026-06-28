import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS } from '../constants/theme';
import InputField from '../components/InputField';
import GradientButton from '../components/GradientButton';
import api, { ENDPOINTS } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { savePushTokenAfterLogin } from '../utils/notifications';

// Email + password login on its own screen (kept off the main login screen so it
// stays clean — phone + OTP is the primary flow there).
const EmailLoginScreen = ({ navigation, route }) => {
  const [email, setEmail] = useState(route?.params?.email || '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) { Alert.alert('Required', 'Enter your email and password'); return; }
    setLoading(true);
    try {
      const res = await api.post(ENDPOINTS.LOGIN, { email: email.trim().toLowerCase(), password });
      setLoading(false);
      if (res.success) {
        await AsyncStorage.setItem('token', res.token);
        await AsyncStorage.setItem('user', JSON.stringify(res.user));
        api.setToken(res.token);
        savePushTokenAfterLogin();

        const isGymRole = ['gym_owner', 'gym_staff', 'admin'].includes(res.user?.role);
        await AsyncStorage.setItem('loginRole', isGymRole ? 'admin' : 'user');
        if (isGymRole) navigation.replace('AdminMain');
        else if (res.user?.isProfileComplete) navigation.replace('Main');
        else navigation.replace('ProfileSetup');
      } else {
        Alert.alert('Login failed', res.message || 'Invalid email or password');
      }
    } catch (e) {
      setLoading(false);
      Alert.alert('Error', 'Network error. Please try again.');
    }
  };

  return (
    <LinearGradient colors={COLORS.gradientDark} style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={COLORS.white} />
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={styles.logoCircle}><Text style={styles.logo}>🏋️</Text></View>
            <Text style={styles.title}>Login with Email</Text>
            <Text style={styles.subtitle}>Use your email & password to continue.</Text>
          </View>

          <View style={styles.form}>
            <InputField label="Email" icon="mail-outline" placeholder="Enter your email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
            <InputField label="Password" icon="lock-closed-outline" placeholder="Enter your password" value={password} onChangeText={setPassword} secureTextEntry />

            <TouchableOpacity style={styles.forgotBtn} onPress={() => navigation.navigate('ForgotPassword')}>
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>

            <GradientButton title={loading ? 'Logging in…' : 'Login'} onPress={handleLogin} disabled={loading} />

            <View style={styles.signupRow}>
              <Text style={styles.signupText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Signup', { mode: 'user' })}>
                <Text style={styles.signupLink}>Sign Up</Text>
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
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.darkCard, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  header: { alignItems: 'center', marginBottom: 28 },
  logoCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.primary + '20', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  logo: { fontSize: 36 },
  title: { fontSize: SIZES.fontTitle, color: COLORS.white, ...FONTS.bold },
  subtitle: { fontSize: SIZES.fontMd, color: COLORS.textMuted, ...FONTS.medium, marginTop: 8, textAlign: 'center' },
  form: {},
  forgotBtn: { alignSelf: 'flex-end', marginBottom: 24, marginTop: 4 },
  forgotText: { fontSize: SIZES.fontMd, color: COLORS.primary, ...FONTS.medium },
  signupRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 30 },
  signupText: { fontSize: SIZES.fontMd, color: COLORS.textMuted },
  signupLink: { fontSize: SIZES.fontMd, color: COLORS.primary, ...FONTS.bold },
});

export default EmailLoginScreen;
