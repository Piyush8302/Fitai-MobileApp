import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS } from '../constants/theme';
import InputField from '../components/InputField';
import GradientButton from '../components/GradientButton';
import api, { ENDPOINTS } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { savePushTokenAfterLogin } from '../utils/notifications';

const OTPLoginScreen = ({ navigation }) => {
  const [mode, setMode] = useState('email'); // 'email' or 'phone'
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const otpRefs = useRef([]);

  const handleOtpChange = (text, index) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);
    if (text && index < 5) otpRefs.current[index + 1]?.focus();
    if (!text && index > 0) otpRefs.current[index - 1]?.focus();
  };

  const handleSendOtp = async () => {
    if (mode === 'email') {
      if (!email || !email.includes('@')) {
        Alert.alert('Error', 'Enter a valid email address');
        return;
      }
    } else {
      if (!phone || phone.length < 10) {
        Alert.alert('Error', 'Enter a valid 10-digit phone number');
        return;
      }
    }

    setLoading(true);
    try {
      const payload = mode === 'email' ? { email: email.trim().toLowerCase() } : { phone: phone.trim() };
      const res = await api.post(ENDPOINTS.SEND_OTP, payload);
      if (res.success) {
        setOtpSent(true);
        const target = mode === 'email' ? email : `+91 ${phone}`;
        Alert.alert('OTP Sent', `A 6-digit OTP has been sent to ${target}${res.otp ? `\n\nDev OTP: ${res.otp}` : ''}`);
      } else {
        Alert.alert('Error', res.message || 'Failed to send OTP');
      }
    } catch (e) {
      Alert.alert('Error', 'Network error. Please try again.');
      console.log('Send OTP error:', e);
    }
    setLoading(false);
  };

  const handleVerifyOtp = async () => {
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      Alert.alert('Error', 'Enter the complete 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const payload = mode === 'email'
        ? { email: email.trim().toLowerCase(), otp: otpCode }
        : { phone: phone.trim(), otp: otpCode };
      const res = await api.post(ENDPOINTS.VERIFY_OTP, payload);
      if (res.success) {
        await AsyncStorage.setItem('token', res.token);
        await AsyncStorage.setItem('user', JSON.stringify(res.user));
        api.setToken(res.token);
        savePushTokenAfterLogin();

        if (res.user.isProfileComplete) {
          navigation.replace('Main');
        } else {
          navigation.replace('ProfileSetup');
        }
      } else {
        Alert.alert('Error', res.message || 'Invalid or expired OTP');
      }
    } catch (e) {
      Alert.alert('Error', 'Network error. Please try again.');
      console.log('Verify OTP error:', e);
    }
    setLoading(false);
  };

  const handleResendOtp = async () => {
    setOtp(['', '', '', '', '', '']);
    await handleSendOtp();
  };

  const switchMode = () => {
    setMode(mode === 'email' ? 'phone' : 'email');
    setOtpSent(false);
    setOtp(['', '', '', '', '', '']);
  };

  return (
    <LinearGradient colors={COLORS.gradientDark} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={COLORS.white} />
        </TouchableOpacity>

        <View style={styles.iconCircle}>
          <Text style={styles.icon}>{mode === 'email' ? '📧' : '📱'}</Text>
        </View>

        <Text style={styles.title}>{otpSent ? 'Enter OTP' : 'OTP Login'}</Text>
        <Text style={styles.subtitle}>
          {otpSent
            ? `We sent a 6-digit code to ${mode === 'email' ? email : `+91 ${phone}`}`
            : `Enter your ${mode === 'email' ? 'email' : 'phone number'} to receive OTP`}
        </Text>

        {/* Mode Toggle */}
        {!otpSent && (
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleBtn, mode === 'email' && styles.toggleActive]}
              onPress={() => setMode('email')}
            >
              <Ionicons name="mail-outline" size={18} color={mode === 'email' ? COLORS.white : COLORS.textMuted} />
              <Text style={[styles.toggleText, mode === 'email' && styles.toggleTextActive]}>Email</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, mode === 'phone' && styles.toggleActive]}
              onPress={() => setMode('phone')}
            >
              <Ionicons name="call-outline" size={18} color={mode === 'phone' ? COLORS.white : COLORS.textMuted} />
              <Text style={[styles.toggleText, mode === 'phone' && styles.toggleTextActive]}>Phone</Text>
            </TouchableOpacity>
          </View>
        )}

        {!otpSent ? (
          <View style={styles.form}>
            {mode === 'email' ? (
              <InputField
                label="Email Address"
                icon="mail-outline"
                placeholder="Enter your email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            ) : (
              <InputField
                label="Phone Number"
                icon="call-outline"
                placeholder="Enter 10-digit number"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                maxLength={10}
              />
            )}
            <GradientButton
              title={loading ? '' : 'Send OTP'}
              onPress={handleSendOtp}
              disabled={loading}
              style={styles.btn}
            >
              {loading && <ActivityIndicator color="#fff" />}
            </GradientButton>
          </View>
        ) : (
          <View style={styles.form}>
            <View style={styles.otpRow}>
              {otp.map((digit, i) => (
                <TextInput
                  key={i}
                  ref={(ref) => (otpRefs.current[i] = ref)}
                  style={[styles.otpBox, digit && styles.otpFilled]}
                  value={digit}
                  onChangeText={(text) => handleOtpChange(text, i)}
                  keyboardType="number-pad"
                  maxLength={1}
                  placeholderTextColor={COLORS.textMuted}
                />
              ))}
            </View>

            <GradientButton
              title={loading ? '' : 'Verify OTP'}
              onPress={handleVerifyOtp}
              disabled={loading}
              style={styles.btn}
            >
              {loading && <ActivityIndicator color="#fff" />}
            </GradientButton>

            <TouchableOpacity style={styles.resendRow} onPress={handleResendOtp}>
              <Text style={styles.resendText}>Didn't receive? </Text>
              <Text style={styles.resendLink}>Resend OTP</Text>
            </TouchableOpacity>
          </View>
        )}

        {otpSent && (
          <TouchableOpacity style={styles.switchRow} onPress={switchMode}>
            <Text style={styles.switchText}>
              Try with {mode === 'email' ? 'Phone' : 'Email'} instead
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.darkCard, alignItems: 'center', justifyContent: 'center', marginBottom: 30,
  },
  iconCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: COLORS.primary + '15', alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center', marginBottom: 24, borderWidth: 2, borderColor: COLORS.primary + '30',
  },
  icon: { fontSize: 44 },
  title: { fontSize: SIZES.fontTitle, color: COLORS.white, ...FONTS.bold, textAlign: 'center' },
  subtitle: { fontSize: SIZES.fontMd, color: COLORS.textMuted, ...FONTS.medium, textAlign: 'center', marginTop: 8, marginBottom: 24, lineHeight: 22 },
  toggleRow: {
    flexDirection: 'row', backgroundColor: COLORS.darkCard, borderRadius: SIZES.radius,
    padding: 4, marginBottom: 24, borderWidth: 1, borderColor: COLORS.darkBorder,
  },
  toggleBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, borderRadius: SIZES.radius - 2, gap: 8,
  },
  toggleActive: { backgroundColor: COLORS.primary },
  toggleText: { fontSize: SIZES.fontMd, color: COLORS.textMuted, ...FONTS.medium },
  toggleTextActive: { color: COLORS.white },
  form: {},
  btn: { marginTop: 16 },
  otpRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  otpBox: {
    width: 48, height: 56, borderRadius: SIZES.radius,
    backgroundColor: COLORS.darkCard, borderWidth: 1.5, borderColor: COLORS.darkBorder,
    textAlign: 'center', fontSize: SIZES.fontXl, color: COLORS.white, ...FONTS.bold,
  },
  otpFilled: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '10' },
  resendRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  resendText: { fontSize: SIZES.fontMd, color: COLORS.textMuted },
  resendLink: { fontSize: SIZES.fontMd, color: COLORS.primary, ...FONTS.bold },
  switchRow: { alignItems: 'center', marginTop: 20 },
  switchText: { fontSize: SIZES.fontMd, color: COLORS.accent, ...FONTS.medium },
});

export default OTPLoginScreen;
