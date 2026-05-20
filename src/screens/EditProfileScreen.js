import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Image, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, SIZES, FONTS } from '../constants/theme';
import api, { ENDPOINTS } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const EditProfileScreen = ({ navigation }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Editable fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [avatar, setAvatar] = useState('');

  // OTP flow states
  const [otpMode, setOtpMode] = useState(null); // 'email' | 'phone' | null
  const [otpValue, setOtpValue] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [pendingValue, setPendingValue] = useState(''); // new email or phone waiting OTP

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) api.setToken(token);
      const res = await api.get(ENDPOINTS.GET_ME);
      if (res.success) {
        const u = res.data || res.user;
        setUser(u);
        setName(u.name || '');
        setEmail(u.email || '');
        setPhone(u.phone || '');
        setAvatar(u.avatar || '');
      }
    } catch (e) {
      console.log('Load user error:', e);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera roll access is needed to pick a photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled && result.assets?.[0]) {
      const base64 = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setAvatar(base64);
    }
  };

  const handleSaveName = async () => {
    if (!name.trim()) return Alert.alert('Error', 'Name cannot be empty');
    if (name.trim() === user?.name) return;
    setSaving(true);
    try {
      const res = await api.put(ENDPOINTS.UPDATE_PROFILE, { name: name.trim() });
      if (res.success) {
        setUser(prev => ({ ...prev, name: name.trim() }));
        await AsyncStorage.setItem('user', JSON.stringify({ ...user, name: name.trim() }));
        Alert.alert('Success', 'Name updated!');
      } else {
        Alert.alert('Error', res.message || 'Failed to update name');
      }
    } catch (e) {
      Alert.alert('Error', 'Network error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAvatar = async () => {
    if (!avatar || avatar === user?.avatar) return;
    setSaving(true);
    try {
      const res = await api.put(ENDPOINTS.UPLOAD_AVATAR, { avatar });
      if (res.success) {
        setUser(prev => ({ ...prev, avatar }));
        await AsyncStorage.setItem('user', JSON.stringify({ ...user, avatar }));
        Alert.alert('Success', 'Profile photo updated!');
      } else {
        Alert.alert('Error', res.message || 'Failed to update photo');
      }
    } catch (e) {
      Alert.alert('Error', 'Network error');
    } finally {
      setSaving(false);
    }
  };

  // --- Email Change Flow ---
  const handleRequestEmailOtp = async () => {
    const newEmail = email.trim().toLowerCase();
    if (!newEmail) return Alert.alert('Error', 'Enter a valid email');
    if (newEmail === user?.email?.toLowerCase()) return Alert.alert('Info', 'This is already your email');
    setOtpSending(true);
    try {
      const res = await api.post(ENDPOINTS.REQUEST_EMAIL_CHANGE, { newEmail });
      if (res.success) {
        setOtpMode('email');
        setPendingValue(newEmail);
        setOtpValue('');
        Alert.alert('OTP Sent', 'Check your new email for the verification code.');
      } else {
        Alert.alert('Error', res.message || 'Failed to send OTP');
      }
    } catch (e) {
      Alert.alert('Error', 'Network error');
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyEmailOtp = async () => {
    if (otpValue.length !== 6) return Alert.alert('Error', 'Enter 6-digit OTP');
    setOtpVerifying(true);
    try {
      const res = await api.post(ENDPOINTS.VERIFY_EMAIL_CHANGE, { otp: otpValue });
      if (res.success) {
        setUser(prev => ({ ...prev, email: pendingValue }));
        setEmail(pendingValue);
        if (res.token) await AsyncStorage.setItem('token', res.token);
        await AsyncStorage.setItem('user', JSON.stringify({ ...user, email: pendingValue }));
        setOtpMode(null);
        setOtpValue('');
        setPendingValue('');
        Alert.alert('Success', 'Email updated successfully!');
      } else {
        Alert.alert('Error', res.message || 'Invalid OTP');
      }
    } catch (e) {
      Alert.alert('Error', 'Network error');
    } finally {
      setOtpVerifying(false);
    }
  };

  // --- Phone Change Flow ---
  const handleRequestPhoneOtp = async () => {
    const newPhone = phone.trim();
    if (!newPhone || newPhone.length < 10) return Alert.alert('Error', 'Enter a valid phone number');
    if (newPhone === user?.phone) return Alert.alert('Info', 'This is already your phone number');
    setOtpSending(true);
    try {
      const res = await api.post(ENDPOINTS.REQUEST_PHONE_CHANGE, { newPhone });
      if (res.success) {
        setOtpMode('phone');
        setPendingValue(newPhone);
        setOtpValue('');
        Alert.alert('OTP Sent', 'Check your new phone for the verification code.');
      } else {
        Alert.alert('Error', res.message || 'Failed to send OTP');
      }
    } catch (e) {
      Alert.alert('Error', 'Network error');
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyPhoneOtp = async () => {
    if (otpValue.length !== 6) return Alert.alert('Error', 'Enter 6-digit OTP');
    setOtpVerifying(true);
    try {
      const res = await api.post(ENDPOINTS.VERIFY_PHONE_CHANGE, { otp: otpValue });
      if (res.success) {
        setUser(prev => ({ ...prev, phone: pendingValue }));
        setPhone(pendingValue);
        await AsyncStorage.setItem('user', JSON.stringify({ ...user, phone: pendingValue }));
        setOtpMode(null);
        setOtpValue('');
        setPendingValue('');
        Alert.alert('Success', 'Phone number updated successfully!');
      } else {
        Alert.alert('Error', res.message || 'Invalid OTP');
      }
    } catch (e) {
      Alert.alert('Error', 'Network error');
    } finally {
      setOtpVerifying(false);
    }
  };

  const cancelOtp = () => {
    setOtpMode(null);
    setOtpValue('');
    setPendingValue('');
    // Reset to original values
    if (otpMode === 'email') setEmail(user?.email || '');
    if (otpMode === 'phone') setPhone(user?.phone || '');
  };

  if (loading) {
    return (
      <LinearGradient colors={COLORS.gradientDark} style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </LinearGradient>
    );
  }

  const getInitials = (n) => {
    if (!n) return '?';
    const parts = n.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return n[0].toUpperCase();
  };

  const emailChanged = email.trim().toLowerCase() !== (user?.email || '').toLowerCase();
  const phoneChanged = phone.trim() !== (user?.phone || '');
  const nameChanged = name.trim() !== (user?.name || '');
  const avatarChanged = avatar !== (user?.avatar || '');

  return (
    <LinearGradient colors={COLORS.gradientDark} style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <TouchableOpacity onPress={pickImage} style={styles.avatarWrapper}>
              {avatar && avatar.startsWith('data:') ? (
                <Image source={{ uri: avatar }} style={styles.avatarImage} />
              ) : avatar && avatar.startsWith('http') ? (
                <Image source={{ uri: avatar }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitials}>{getInitials(name)}</Text>
                </View>
              )}
              <View style={styles.cameraIcon}>
                <Ionicons name="camera" size={16} color={COLORS.white} />
              </View>
            </TouchableOpacity>
            <Text style={styles.avatarHint}>Tap to change photo</Text>
            {avatarChanged && (
              <TouchableOpacity style={styles.savePhotoBtn} onPress={handleSaveAvatar} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color={COLORS.white} /> : (
                  <Text style={styles.savePhotoBtnText}>Save Photo</Text>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* OTP Verification Modal (inline) */}
          {otpMode && (
            <View style={styles.otpCard}>
              <View style={styles.otpHeader}>
                <Ionicons name={otpMode === 'email' ? 'mail' : 'call'} size={24} color={COLORS.primary} />
                <Text style={styles.otpTitle}>Verify {otpMode === 'email' ? 'Email' : 'Phone'}</Text>
              </View>
              <Text style={styles.otpDesc}>
                Enter the 6-digit OTP sent to{'\n'}
                <Text style={styles.otpHighlight}>{pendingValue}</Text>
              </Text>
              <TextInput
                style={styles.otpInput}
                value={otpValue}
                onChangeText={setOtpValue}
                keyboardType="number-pad"
                maxLength={6}
                placeholder="Enter OTP"
                placeholderTextColor={COLORS.textMuted}
              />
              <View style={styles.otpActions}>
                <TouchableOpacity style={styles.otpCancelBtn} onPress={cancelOtp}>
                  <Text style={styles.otpCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.otpVerifyBtn, otpValue.length !== 6 && { opacity: 0.5 }]}
                  onPress={otpMode === 'email' ? handleVerifyEmailOtp : handleVerifyPhoneOtp}
                  disabled={otpVerifying || otpValue.length !== 6}
                >
                  {otpVerifying ? (
                    <ActivityIndicator size="small" color={COLORS.white} />
                  ) : (
                    <Text style={styles.otpVerifyText}>Verify</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Name Field */}
          <View style={styles.fieldCard}>
            <Text style={styles.fieldLabel}>Full Name</Text>
            <View style={styles.fieldRow}>
              <Ionicons name="person-outline" size={20} color={COLORS.textMuted} style={styles.fieldIcon} />
              <TextInput
                style={styles.fieldInput}
                value={name}
                onChangeText={setName}
                placeholder="Enter your name"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>
            {nameChanged && (
              <TouchableOpacity style={styles.fieldSaveBtn} onPress={handleSaveName} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color={COLORS.white} /> : (
                  <>
                    <Ionicons name="checkmark" size={16} color={COLORS.white} />
                    <Text style={styles.fieldSaveTxt}>Save Name</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Email Field */}
          <View style={styles.fieldCard}>
            <Text style={styles.fieldLabel}>Email Address</Text>
            <View style={styles.fieldRow}>
              <Ionicons name="mail-outline" size={20} color={COLORS.textMuted} style={styles.fieldIcon} />
              <TextInput
                style={styles.fieldInput}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!otpMode}
              />
            </View>
            {emailChanged && !otpMode && (
              <TouchableOpacity style={styles.fieldSaveBtn} onPress={handleRequestEmailOtp} disabled={otpSending}>
                {otpSending ? <ActivityIndicator size="small" color={COLORS.white} /> : (
                  <>
                    <Ionicons name="shield-checkmark-outline" size={16} color={COLORS.white} />
                    <Text style={styles.fieldSaveTxt}>Verify & Update</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
            <Text style={styles.fieldHint}>OTP verification required to change email</Text>
          </View>

          {/* Phone Field */}
          <View style={styles.fieldCard}>
            <Text style={styles.fieldLabel}>Phone Number</Text>
            <View style={styles.fieldRow}>
              <Ionicons name="call-outline" size={20} color={COLORS.textMuted} style={styles.fieldIcon} />
              <TextInput
                style={styles.fieldInput}
                value={phone}
                onChangeText={setPhone}
                placeholder="Enter phone number"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="phone-pad"
                editable={!otpMode}
              />
            </View>
            {phoneChanged && !otpMode && (
              <TouchableOpacity style={styles.fieldSaveBtn} onPress={handleRequestPhoneOtp} disabled={otpSending}>
                {otpSending ? <ActivityIndicator size="small" color={COLORS.white} /> : (
                  <>
                    <Ionicons name="shield-checkmark-outline" size={16} color={COLORS.white} />
                    <Text style={styles.fieldSaveTxt}>Verify & Update</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
            <Text style={styles.fieldHint}>OTP verification required to change phone</Text>
          </View>

          {/* Info */}
          <View style={styles.infoCard}>
            <Ionicons name="information-circle-outline" size={20} color={COLORS.primary} />
            <Text style={styles.infoText}>
              Changing your email or phone number requires OTP verification to keep your account secure.
            </Text>
          </View>

          <View style={{ height: 120 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 54, paddingBottom: 16,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.darkCard, alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: SIZES.fontXl, color: COLORS.white, ...FONTS.bold },
  scroll: { paddingHorizontal: 16, paddingTop: 8 },

  // Avatar
  avatarSection: { alignItems: 'center', marginBottom: 24 },
  avatarWrapper: { position: 'relative' },
  avatarImage: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: COLORS.primary + '60' },
  avatarPlaceholder: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: COLORS.primary + '60',
  },
  avatarInitials: { fontSize: 38, color: COLORS.white, ...FONTS.bold },
  cameraIcon: {
    position: 'absolute', bottom: 2, right: 2,
    backgroundColor: COLORS.primary, width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: COLORS.dark,
  },
  avatarHint: { fontSize: SIZES.fontSm, color: COLORS.textMuted, marginTop: 8 },
  savePhotoBtn: {
    marginTop: 10, backgroundColor: COLORS.primary, borderRadius: SIZES.radius,
    paddingHorizontal: 20, paddingVertical: 8,
  },
  savePhotoBtnText: { color: COLORS.white, fontSize: SIZES.fontSm, ...FONTS.bold },

  // OTP Card
  otpCard: {
    backgroundColor: COLORS.darkCard, borderRadius: SIZES.radiusLg, padding: 20,
    marginBottom: 20, borderWidth: 1, borderColor: COLORS.primary + '40',
  },
  otpHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  otpTitle: { fontSize: SIZES.fontLg, color: COLORS.white, ...FONTS.bold },
  otpDesc: { fontSize: SIZES.fontMd, color: COLORS.textSecondary, marginBottom: 16, lineHeight: 22 },
  otpHighlight: { color: COLORS.primary, ...FONTS.bold },
  otpInput: {
    backgroundColor: COLORS.darkSurface, borderRadius: SIZES.radius, padding: 14,
    fontSize: 22, color: COLORS.white, textAlign: 'center', letterSpacing: 8, ...FONTS.bold,
    borderWidth: 1, borderColor: COLORS.darkBorder,
  },
  otpActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  otpCancelBtn: {
    flex: 1, paddingVertical: 12, borderRadius: SIZES.radius,
    backgroundColor: COLORS.darkSurface, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.darkBorder,
  },
  otpCancelText: { color: COLORS.textMuted, fontSize: SIZES.fontMd, ...FONTS.semiBold },
  otpVerifyBtn: {
    flex: 1, paddingVertical: 12, borderRadius: SIZES.radius,
    backgroundColor: COLORS.primary, alignItems: 'center',
  },
  otpVerifyText: { color: COLORS.white, fontSize: SIZES.fontMd, ...FONTS.bold },

  // Field Cards
  fieldCard: {
    backgroundColor: COLORS.darkCard, borderRadius: SIZES.radiusLg, padding: 16,
    marginBottom: 14, borderWidth: 1, borderColor: COLORS.darkBorder,
  },
  fieldLabel: { fontSize: SIZES.fontSm, color: COLORS.textMuted, ...FONTS.semiBold, marginBottom: 10 },
  fieldRow: { flexDirection: 'row', alignItems: 'center' },
  fieldIcon: { marginRight: 12 },
  fieldInput: {
    flex: 1, fontSize: SIZES.fontLg, color: COLORS.white, ...FONTS.medium,
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.darkBorder,
  },
  fieldSaveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: 12, backgroundColor: COLORS.primary, borderRadius: SIZES.radius,
    paddingVertical: 10,
  },
  fieldSaveTxt: { color: COLORS.white, fontSize: SIZES.fontSm, ...FONTS.bold },
  fieldHint: { fontSize: SIZES.fontXs, color: COLORS.textMuted, marginTop: 8, fontStyle: 'italic' },

  // Info Card
  infoCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: COLORS.primary + '10', borderRadius: SIZES.radius,
    padding: 14, marginTop: 8, borderWidth: 1, borderColor: COLORS.primary + '20',
  },
  infoText: { flex: 1, fontSize: SIZES.fontSm, color: COLORS.textSecondary, lineHeight: 20 },
});

export default EditProfileScreen;
