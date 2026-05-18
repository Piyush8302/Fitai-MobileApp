import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS } from '../constants/theme';
import Header from '../components/Header';
import api, { ENDPOINTS } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ForgotPasswordScreen = ({ navigation }) => {
  const [step, setStep] = useState(1); // 1 = email, 2 = OTP + new password
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSendOtp = async () => {
    if (!email.trim()) return Alert.alert('Error', 'Enter your email address');
    setLoading(true);
    try {
      const res = await api.post(ENDPOINTS.FORGOT_PASSWORD, { email: email.trim().toLowerCase() });
      if (res.success) {
        Alert.alert('OTP Sent', 'Check your email for reset OTP');
        setStep(2);
      } else {
        Alert.alert('Error', res.message || 'Failed to send OTP');
      }
    } catch (e) { Alert.alert('Error', 'Something went wrong'); }
    setLoading(false);
  };

  const handleResetPassword = async () => {
    if (!otp || !newPassword || !confirmPassword) return Alert.alert('Error', 'Fill all fields');
    if (newPassword.length < 6) return Alert.alert('Error', 'Password must be at least 6 characters');
    if (newPassword !== confirmPassword) return Alert.alert('Error', 'Passwords do not match');

    setLoading(true);
    try {
      const res = await api.post(ENDPOINTS.RESET_PASSWORD, {
        email: email.trim().toLowerCase(), otp, newPassword,
      });
      if (res.success) {
        if (res.token) {
          await AsyncStorage.setItem('token', res.token);
          api.setToken(res.token);
        }
        Alert.alert('Success', 'Password reset successfully!', [
          { text: 'Login', onPress: () => navigation.navigate('Login') }
        ]);
      } else {
        Alert.alert('Error', res.message || 'Failed to reset password');
      }
    } catch (e) { Alert.alert('Error', 'Something went wrong'); }
    setLoading(false);
  };

  return (
    <LinearGradient colors={COLORS.gradientDark} style={styles.container}>
      <Header title="Forgot Password" onBack={() => navigation.goBack()} />
      <View style={styles.content}>
        {step === 1 ? (
          <>
            <Text style={styles.title}>Reset Your Password</Text>
            <Text style={styles.subtitle}>Enter your email and we'll send you a reset OTP</Text>

            <View style={styles.inputBox}>
              <Ionicons name="mail-outline" size={20} color={COLORS.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor={COLORS.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity style={styles.submitBtn} onPress={handleSendOtp} disabled={loading}>
              <LinearGradient colors={COLORS.gradient1} style={styles.submitGradient}>
                {loading ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.submitText}>Send Reset OTP</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.title}>Enter OTP & New Password</Text>
            <Text style={styles.subtitle}>OTP sent to {email}</Text>

            <View style={styles.inputBox}>
              <Ionicons name="keypad-outline" size={20} color={COLORS.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="Enter 6-digit OTP"
                placeholderTextColor={COLORS.textMuted}
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
                maxLength={6}
              />
            </View>

            <View style={styles.inputBox}>
              <Ionicons name="key-outline" size={20} color={COLORS.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="New Password (min 6 chars)"
                placeholderTextColor={COLORS.textMuted}
                secureTextEntry={!showPassword}
                value={newPassword}
                onChangeText={setNewPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputBox}>
              <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="Confirm New Password"
                placeholderTextColor={COLORS.textMuted}
                secureTextEntry={!showPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
            </View>

            <TouchableOpacity style={styles.submitBtn} onPress={handleResetPassword} disabled={loading}>
              <LinearGradient colors={COLORS.gradient1} style={styles.submitGradient}>
                {loading ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.submitText}>Reset Password</Text>}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.resendLink} onPress={handleSendOtp}>
              <Text style={styles.resendText}>Resend OTP</Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity style={styles.backLink} onPress={() => navigation.navigate('Login')}>
          <Text style={styles.backText}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20 },
  title: { fontSize: SIZES.fontXxl, color: COLORS.white, ...FONTS.bold, marginBottom: 8 },
  subtitle: { fontSize: SIZES.fontMd, color: COLORS.textMuted, ...FONTS.medium, marginBottom: 24 },
  inputBox: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.darkCard, borderRadius: SIZES.radius,
    borderWidth: 1, borderColor: COLORS.darkBorder,
    paddingHorizontal: 16, height: 52, marginBottom: 14,
  },
  input: { flex: 1, fontSize: SIZES.fontMd, color: COLORS.white, ...FONTS.medium },
  submitBtn: { marginTop: 10, borderRadius: SIZES.radius, overflow: 'hidden' },
  submitGradient: { paddingVertical: 16, alignItems: 'center', borderRadius: SIZES.radius },
  submitText: { fontSize: SIZES.fontLg, color: COLORS.white, ...FONTS.bold },
  resendLink: { alignItems: 'center', marginTop: 16 },
  resendText: { fontSize: SIZES.fontMd, color: COLORS.accent, ...FONTS.medium },
  backLink: { alignItems: 'center', marginTop: 24 },
  backText: { fontSize: SIZES.fontMd, color: COLORS.primary, ...FONTS.medium },
});

export default ForgotPasswordScreen;
