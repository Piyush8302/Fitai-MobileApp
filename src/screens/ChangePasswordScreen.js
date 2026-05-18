import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS } from '../constants/theme';
import Header from '../components/Header';
import api, { ENDPOINTS } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ChangePasswordScreen = ({ navigation }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const res = await api.put(ENDPOINTS.CHANGE_PASSWORD, { currentPassword, newPassword });
      if (res.success) {
        if (res.token) await AsyncStorage.setItem('token', res.token);
        Alert.alert('Success', 'Password changed successfully!', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        Alert.alert('Error', res.message || 'Failed to change password');
      }
    } catch (e) {
      Alert.alert('Error', 'Something went wrong');
    }
    setLoading(false);
  };

  return (
    <LinearGradient colors={COLORS.gradientDark} style={styles.container}>
      <Header title="Change Password" onBack={() => navigation.goBack()} />
      <View style={styles.content}>
        <Text style={styles.subtitle}>Update your account password</Text>

        {/* Current Password */}
        <View style={styles.inputBox}>
          <Ionicons name="lock-closed-outline" size={20} color={COLORS.textMuted} />
          <TextInput
            style={styles.input}
            placeholder="Current Password"
            placeholderTextColor={COLORS.textMuted}
            secureTextEntry={!showCurrent}
            value={currentPassword}
            onChangeText={setCurrentPassword}
          />
          <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)}>
            <Ionicons name={showCurrent ? 'eye-off' : 'eye'} size={20} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>

        {/* New Password */}
        <View style={styles.inputBox}>
          <Ionicons name="key-outline" size={20} color={COLORS.textMuted} />
          <TextInput
            style={styles.input}
            placeholder="New Password (min 6 chars)"
            placeholderTextColor={COLORS.textMuted}
            secureTextEntry={!showNew}
            value={newPassword}
            onChangeText={setNewPassword}
          />
          <TouchableOpacity onPress={() => setShowNew(!showNew)}>
            <Ionicons name={showNew ? 'eye-off' : 'eye'} size={20} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Confirm */}
        <View style={styles.inputBox}>
          <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.textMuted} />
          <TextInput
            style={styles.input}
            placeholder="Confirm New Password"
            placeholderTextColor={COLORS.textMuted}
            secureTextEntry={!showNew}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
        </View>

        <TouchableOpacity style={styles.submitBtn} onPress={handleChange} disabled={loading}>
          <LinearGradient colors={COLORS.gradient1} style={styles.submitGradient}>
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.submitText}>Change Password</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.forgotLink} onPress={() => navigation.navigate('ForgotPassword')}>
          <Text style={styles.forgotText}>Forgot your password?</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20 },
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
  forgotLink: { alignItems: 'center', marginTop: 20 },
  forgotText: { fontSize: SIZES.fontMd, color: COLORS.primary, ...FONTS.medium },
});

export default ChangePasswordScreen;
