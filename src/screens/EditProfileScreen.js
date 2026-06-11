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

  // Profile setup fields
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [targetWeight, setTargetWeight] = useState('');
  const [activityLevel, setActivityLevel] = useState('');
  const [fitnessGoal, setFitnessGoal] = useState('');
  const [dietPreference, setDietPreference] = useState('');
  const [goalTimeline, setGoalTimeline] = useState(null); // months
  const [customMode, setCustomMode] = useState(false);
  const [customValue, setCustomValue] = useState('');
  const [customUnit, setCustomUnit] = useState('months'); // 'weeks' | 'months'
  const [savingProfile, setSavingProfile] = useState(false);

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
        setAge(u.age ? String(u.age) : '');
        setGender(u.gender || '');
        setHeight(u.height ? String(u.height) : '');
        setWeight(u.weight ? String(u.weight) : '');
        setTargetWeight(u.targetWeight ? String(u.targetWeight) : '');
        setActivityLevel(u.activityLevel || '');
        setFitnessGoal(u.fitnessGoal || '');
        setDietPreference(u.dietPreference || '');
        setGoalTimeline(u.goalTimeline || null);
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

  // ===== GOAL TIMELINE =====
  const TIMELINE_GOALS = ['weight_loss', 'weight_gain', 'muscle_building', 'fat_loss'];
  const showTimeline = TIMELINE_GOALS.includes(fitnessGoal);

  const getTimelineOptions = () => {
    const w = parseFloat(weight) || 0;
    const tw = parseFloat(targetWeight) || 0;
    const diff = Math.abs(tw - w);

    if (fitnessGoal === 'muscle_building') {
      return [
        { months: 3, status: 'aggressive' },
        { months: 6, status: 'recommended' },
        { months: 9, status: 'comfortable' },
        { months: 12, status: 'comfortable' },
      ];
    }
    if (!diff || diff < 0.5) return [];

    if (fitnessGoal === 'weight_loss' || fitnessGoal === 'fat_loss') {
      // Safe: ~2 kg/month | Max: ~4 kg/month
      const rec = Math.max(2, Math.ceil(diff / 2));
      return [
        { months: Math.max(1, Math.round(diff / 4)), status: 'critical' },
        { months: Math.ceil(diff / 3), status: 'aggressive' },
        { months: rec, status: 'recommended' },
        { months: rec + Math.max(1, Math.round(rec * 0.5)), status: 'comfortable' },
      ].filter((o, i, a) => o.months >= 1 && a.findIndex(x => x.months === o.months) === i);
    }
    // weight_gain — safe lean gain ~1.5 kg/month
    const rec = Math.max(3, Math.ceil(diff / 1.5));
    return [
      { months: Math.max(1, Math.round(diff / 3.5)), status: 'critical' },
      { months: Math.ceil(diff / 2.5), status: 'aggressive' },
      { months: rec, status: 'recommended' },
      { months: rec + Math.max(2, Math.round(rec * 0.5)), status: 'comfortable' },
    ].filter((o, i, a) => o.months >= 1 && a.findIndex(x => x.months === o.months) === i);
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'critical': return { color: '#FF4444', label: '⚠️ Too Fast' };
      case 'aggressive': return { color: '#FF9800', label: '🔥 Aggressive' };
      case 'recommended': return { color: '#4CAF50', label: '✅ Recommended' };
      case 'comfortable': return { color: '#00D2FF', label: '😌 Comfortable' };
      default: return { color: COLORS.textMuted, label: 'Custom' };
    }
  };

  // Diet plan + precautions calculated from selected timeline
  const getPlanDetails = () => {
    if (!goalTimeline || !showTimeline) return null;
    const w = parseFloat(weight) || 70;
    const tw = parseFloat(targetWeight) || w;
    const diff = Math.abs(tw - w);
    const isLoss = fitnessGoal === 'weight_loss' || fitnessGoal === 'fat_loss';
    const isGain = fitnessGoal === 'weight_gain';
    const rate = diff > 0 ? diff / goalTimeline : 0; // kg/month
    const dailyCal = user?.dailyCalories || 2000;
    const bmr = user?.bmr || Math.round(dailyCal / 1.55);

    // 1 kg body weight ≈ 7700 kcal
    const dailyDelta = Math.round((rate * 7700) / 30);
    let targetCal;
    if (isLoss) targetCal = Math.max(bmr + 100, dailyCal - dailyDelta);
    else if (isGain) targetCal = dailyCal + Math.min(dailyDelta || 400, 500);
    else targetCal = dailyCal + 300;

    const protein = Math.round(w * (isGain || fitnessGoal === 'muscle_building' ? 1.8 : 1.6));
    const tooFast = isLoss ? rate > 3 : isGain ? rate > 2.5 : false;
    // Use days so fractional months (from weeks input) work correctly
    const endDate = new Date(Date.now() + goalTimeline * 30.44 * 24 * 60 * 60 * 1000);

    const precautions = isLoss ? [
      `Never eat below ${bmr} kcal (your BMR) — slows metabolism`,
      `Eat ${protein}g protein daily to preserve muscle`,
      'No crash dieting — weight bounces back (yo-yo effect)',
      'Walk 8,000–10,000 steps daily',
      'Sleep 7–8 hours — poor sleep stalls fat loss',
      'Avoid sugary drinks, maida & fried food',
    ] : isGain ? [
      'Gain with clean food, not junk — quality surplus',
      `Eat ${protein}g protein daily (dal, paneer, eggs, chicken)`,
      'Strength train 3–4x/week or surplus becomes fat',
      'Add banana shake, peanut butter, dry fruits, ghee',
      'Eat 5–6 meals a day — never skip breakfast',
    ] : [
      `Eat ${protein}g protein split across 4–5 meals`,
      'Progressive overload — increase weight/reps weekly',
      '20–40g protein within 2 hours post-workout',
      'Sleep 7–9 hours for muscle recovery',
      'Rest 48 hours between same muscle group',
    ];

    return { rate, targetCal, protein, tooFast, precautions, diff, isLoss, isGain, endDate };
  };

  const applyCustomTimeline = (val, unit) => {
    setCustomValue(val);
    setCustomUnit(unit);
    const num = parseFloat(val);
    if (!num || num <= 0) { setGoalTimeline(null); return; }
    const months = unit === 'weeks' ? parseFloat((num / 4.345).toFixed(2)) : num;
    setGoalTimeline(Math.min(36, Math.max(0.25, months))); // 1 week – 3 years
  };

  // Pretty label for fractional months (e.g. from weeks input)
  const formatTimeline = (m) => {
    if (!m) return '';
    if (m < 1) return `${Math.round(m * 4.345)} weeks`;
    return Number.isInteger(m) ? `${m} month${m > 1 ? 's' : ''}` : `~${m.toFixed(1)} months`;
  };

  const planDetails = getPlanDetails();

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
                <Ionicons name="camera" size={16} color={COLORS.onAccent} />
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
                    <Ionicons name="checkmark" size={16} color={COLORS.onAccent} />
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
                    <Ionicons name="shield-checkmark-outline" size={16} color={COLORS.onAccent} />
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
                    <Ionicons name="shield-checkmark-outline" size={16} color={COLORS.onAccent} />
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

          {/* === Profile Setup Fields === */}
          <Text style={styles.sectionHeader}>Health & Fitness Profile</Text>

          {/* Age & Gender Row */}
          <View style={styles.rowFields}>
            <View style={[styles.fieldCard, { flex: 1, marginRight: 7 }]}>
              <Text style={styles.fieldLabel}>Age</Text>
              <TextInput style={styles.fieldInputSmall} value={age} onChangeText={setAge} keyboardType="number-pad" placeholder="25" placeholderTextColor={COLORS.textMuted} />
            </View>
            <View style={[styles.fieldCard, { flex: 1, marginLeft: 7 }]}>
              <Text style={styles.fieldLabel}>Gender</Text>
              <View style={styles.chipRow}>
                {['male', 'female', 'other'].map(g => (
                  <TouchableOpacity key={g} style={[styles.chip, gender === g && styles.chipActive]} onPress={() => setGender(g)}>
                    <Text style={[styles.chipText, gender === g && styles.chipTextActive]}>{g === 'male' ? '♂' : g === 'female' ? '♀' : '⚧'} {g.charAt(0).toUpperCase() + g.slice(1)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Height & Weight Row */}
          <View style={styles.rowFields}>
            <View style={[styles.fieldCard, { flex: 1, marginRight: 7 }]}>
              <Text style={styles.fieldLabel}>Height (cm)</Text>
              <TextInput style={styles.fieldInputSmall} value={height} onChangeText={setHeight} keyboardType="number-pad" placeholder="175" placeholderTextColor={COLORS.textMuted} />
            </View>
            <View style={[styles.fieldCard, { flex: 1, marginLeft: 7 }]}>
              <Text style={styles.fieldLabel}>Weight (kg)</Text>
              <TextInput style={styles.fieldInputSmall} value={weight} onChangeText={setWeight} keyboardType="number-pad" placeholder="70" placeholderTextColor={COLORS.textMuted} />
            </View>
          </View>

          {/* Target Weight */}
          <View style={styles.fieldCard}>
            <Text style={styles.fieldLabel}>Target Weight (kg)</Text>
            <TextInput style={styles.fieldInputSmall} value={targetWeight} onChangeText={setTargetWeight} keyboardType="number-pad" placeholder="65" placeholderTextColor={COLORS.textMuted} />
          </View>

          {/* Fitness Goal */}
          <View style={styles.fieldCard}>
            <Text style={styles.fieldLabel}>Fitness Goal</Text>
            <View style={styles.chipWrap}>
              {[
                { key: 'weight_loss', label: 'Lose Weight' },
                { key: 'weight_gain', label: 'Gain Weight' },
                { key: 'muscle_building', label: 'Build Muscle' },
                { key: 'fat_loss', label: 'Fat Loss' },
                { key: 'maintenance', label: 'Stay Fit' },
                { key: 'home_workout', label: 'Home Workout' },
                { key: 'gym_workout', label: 'Gym Workout' },
              ].map(g => (
                <TouchableOpacity key={g.key} style={[styles.chip, fitnessGoal === g.key && styles.chipActive]} onPress={() => setFitnessGoal(g.key)}>
                  <Text style={[styles.chipText, fitnessGoal === g.key && styles.chipTextActive]}>{g.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Goal Timeline */}
          {showTimeline && (
            <View style={styles.fieldCard}>
              <Text style={styles.fieldLabel}>
                Goal Timeline {planDetails?.diff > 0 ? `— ${planDetails.diff.toFixed(1)} kg to ${parseFloat(targetWeight) > parseFloat(weight) ? 'gain' : 'lose'}` : ''}
              </Text>
              <View style={styles.chipWrap}>
                {getTimelineOptions().map((opt) => {
                  const st = getStatusStyle(opt.status);
                  const sel = !customMode && goalTimeline === opt.months;
                  return (
                    <TouchableOpacity
                      key={opt.months}
                      style={[styles.chip, sel && { backgroundColor: st.color + '25', borderColor: st.color }]}
                      onPress={() => { setCustomMode(false); setCustomValue(''); setGoalTimeline(opt.months); }}
                    >
                      <Text style={[styles.chipText, sel && { color: st.color, ...FONTS.bold }]}>
                        {opt.months} month{opt.months > 1 ? 's' : ''} · {st.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity
                  style={[styles.chip, customMode && styles.chipActive]}
                  onPress={() => { setCustomMode(true); setGoalTimeline(null); setCustomValue(''); }}
                >
                  <Text style={[styles.chipText, customMode && styles.chipTextActive]}>✏️ Custom</Text>
                </TouchableOpacity>
              </View>

              {/* Custom timeline input */}
              {customMode && (
                <View style={styles.customRow}>
                  <TextInput
                    style={styles.customInput}
                    value={customValue}
                    onChangeText={(v) => applyCustomTimeline(v, customUnit)}
                    keyboardType="number-pad"
                    placeholder="e.g. 6"
                    placeholderTextColor={COLORS.textMuted}
                    maxLength={3}
                  />
                  <View style={styles.unitToggle}>
                    {['weeks', 'months'].map((u) => (
                      <TouchableOpacity
                        key={u}
                        style={[styles.unitBtn, customUnit === u && styles.unitBtnActive]}
                        onPress={() => applyCustomTimeline(customValue, u)}
                      >
                        <Text style={[styles.unitText, customUnit === u && styles.unitTextActive]}>
                          {u.charAt(0).toUpperCase() + u.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
              {customMode && goalTimeline && (
                <Text style={styles.customHint}>
                  = {formatTimeline(goalTimeline)} {planDetails?.tooFast ? '— ⚠️ too fast, risky pace!' : planDetails ? `— ${planDetails.rate.toFixed(1)} kg/month pace` : ''}
                </Text>
              )}

              {/* Plan summary + precautions */}
              {planDetails && goalTimeline && (
                <View style={styles.planBox}>
                  {planDetails.tooFast && (
                    <View style={styles.planWarning}>
                      <Ionicons name="warning" size={16} color="#FF4444" />
                      <Text style={styles.planWarningText}>
                        This pace is too fast and risky — muscle loss, weakness & nutritional deficiency. Choose a slower timeline.
                      </Text>
                    </View>
                  )}
                  <Text style={styles.planTitle}>📋 Your Plan</Text>
                  <View style={styles.planRow}>
                    <Text style={styles.planItem}>🎯 {planDetails.diff > 0 ? `${planDetails.rate.toFixed(1)} kg/month` : 'Body recomposition'}</Text>
                    <Text style={styles.planItem}>🔥 ~{planDetails.targetCal} kcal/day</Text>
                  </View>
                  <View style={styles.planRow}>
                    <Text style={styles.planItem}>💪 {planDetails.protein}g protein/day</Text>
                    <Text style={styles.planItem}>📅 Target: {planDetails.endDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</Text>
                  </View>
                  <Text style={styles.planTitle}>🛡️ Precautions</Text>
                  {planDetails.precautions.map((p, i) => (
                    <Text key={i} style={styles.precautionText}>• {p}</Text>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Activity Level */}
          <View style={styles.fieldCard}>
            <Text style={styles.fieldLabel}>Activity Level</Text>
            <View style={styles.chipWrap}>
              {[
                { key: 'sedentary', label: 'Sedentary' },
                { key: 'lightly_active', label: 'Light' },
                { key: 'moderately_active', label: 'Moderate' },
                { key: 'very_active', label: 'Very Active' },
                { key: 'extra_active', label: 'Athlete' },
              ].map(a => (
                <TouchableOpacity key={a.key} style={[styles.chip, activityLevel === a.key && styles.chipActive]} onPress={() => setActivityLevel(a.key)}>
                  <Text style={[styles.chipText, activityLevel === a.key && styles.chipTextActive]}>{a.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Diet Preference */}
          <View style={styles.fieldCard}>
            <Text style={styles.fieldLabel}>Diet Preference</Text>
            <View style={styles.chipWrap}>
              {[
                { key: 'veg', label: '🥦 Veg' },
                { key: 'non_veg', label: '🍗 Non-Veg' },
                { key: 'vegan', label: '🌱 Vegan' },
                { key: 'eggetarian', label: '🥚 Eggetarian' },
              ].map(d => (
                <TouchableOpacity key={d.key} style={[styles.chip, dietPreference === d.key && styles.chipActive]} onPress={() => setDietPreference(d.key)}>
                  <Text style={[styles.chipText, dietPreference === d.key && styles.chipTextActive]}>{d.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Save Profile Button */}
          <TouchableOpacity
            style={styles.saveProfileBtn}
            onPress={async () => {
              setSavingProfile(true);
              try {
                const updates = {};
                if (age) updates.age = parseInt(age);
                if (gender) updates.gender = gender;
                if (height) updates.height = parseFloat(height);
                if (weight) updates.weight = parseFloat(weight);
                if (targetWeight) updates.targetWeight = parseFloat(targetWeight);
                if (activityLevel) updates.activityLevel = activityLevel;
                if (fitnessGoal) updates.fitnessGoal = fitnessGoal;
                if (dietPreference) updates.dietPreference = dietPreference;
                if (showTimeline && goalTimeline) {
                  updates.goalTimeline = goalTimeline;
                  // Reset start date only when timeline actually changed
                  if (goalTimeline !== user?.goalTimeline) {
                    updates.goalStartDate = new Date().toISOString();
                  }
                }
                const res = await api.put(ENDPOINTS.UPDATE_PROFILE, updates);
                if (res.success) {
                  // Server recalculates BMR, BMI, dailyCalories, proteinNeed via pre-save hook
                  const serverUser = res.user || { ...user, ...updates };
                  setUser(serverUser);
                  // Update local fields from server response
                  if (serverUser.age) setAge(String(serverUser.age));
                  if (serverUser.height) setHeight(String(serverUser.height));
                  if (serverUser.weight) setWeight(String(serverUser.weight));
                  if (serverUser.targetWeight) setTargetWeight(String(serverUser.targetWeight));
                  await AsyncStorage.setItem('user', JSON.stringify(serverUser));
                  Alert.alert('Success', 'Profile updated!');
                } else {
                  Alert.alert('Error', res.message || 'Failed to update');
                }
              } catch (e) {
                Alert.alert('Error', 'Network error');
              } finally {
                setSavingProfile(false);
              }
            }}
            disabled={savingProfile}
          >
            <LinearGradient colors={COLORS.gradient1} style={styles.saveProfileGrad}>
              {savingProfile ? <ActivityIndicator size="small" color={COLORS.white} /> : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.white} />
                  <Text style={styles.saveProfileText}>Save Profile Changes</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <View style={{ height: 200 }} />
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
  avatarInitials: { fontSize: 38, color: COLORS.onAccent, ...FONTS.bold },
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
  savePhotoBtnText: { color: COLORS.onAccent, fontSize: SIZES.fontSm, ...FONTS.bold },

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
  otpVerifyText: { color: COLORS.onAccent, fontSize: SIZES.fontMd, ...FONTS.bold },

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
  fieldSaveTxt: { color: COLORS.onAccent, fontSize: SIZES.fontSm, ...FONTS.bold },
  fieldHint: { fontSize: SIZES.fontXs, color: COLORS.textMuted, marginTop: 8, fontStyle: 'italic' },

  // Section header
  sectionHeader: {
    fontSize: SIZES.fontLg, color: COLORS.white, ...FONTS.bold, marginTop: 20, marginBottom: 14,
  },
  rowFields: { flexDirection: 'row', marginBottom: 0 },
  fieldInputSmall: {
    fontSize: SIZES.fontLg, color: COLORS.white, ...FONTS.medium,
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.darkBorder,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    backgroundColor: COLORS.darkSurface, borderWidth: 1, borderColor: COLORS.darkBorder,
  },
  chipActive: { backgroundColor: COLORS.primary + '25', borderColor: COLORS.primary },
  chipText: { fontSize: SIZES.fontXs, color: COLORS.textMuted, ...FONTS.medium },
  chipTextActive: { color: COLORS.primary, ...FONTS.bold },
  // Custom timeline input
  customRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  customInput: {
    flex: 1, backgroundColor: COLORS.darkSurface, borderRadius: SIZES.radius,
    borderWidth: 1.5, borderColor: COLORS.primary + '50',
    paddingHorizontal: 16, paddingVertical: 12,
    fontSize: SIZES.fontLg, color: COLORS.white, ...FONTS.bold, textAlign: 'center',
  },
  unitToggle: {
    flexDirection: 'row', backgroundColor: COLORS.darkSurface,
    borderRadius: SIZES.radius, padding: 4, borderWidth: 1, borderColor: COLORS.darkBorder,
  },
  unitBtn: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: SIZES.radius - 4 },
  unitBtnActive: { backgroundColor: COLORS.primary },
  unitText: { fontSize: SIZES.fontSm, color: COLORS.textMuted, ...FONTS.medium },
  unitTextActive: { color: COLORS.onAccent, ...FONTS.bold },
  customHint: { fontSize: SIZES.fontXs, color: COLORS.accent, ...FONTS.medium, marginTop: 8 },

  // Goal Timeline plan box
  planBox: {
    marginTop: 14, padding: 14, borderRadius: SIZES.radius,
    backgroundColor: COLORS.darkSurface, borderWidth: 1, borderColor: COLORS.darkBorder,
  },
  planWarning: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#FF444415', borderRadius: SIZES.radius,
    borderWidth: 1, borderColor: '#FF444440', padding: 10, marginBottom: 12,
  },
  planWarningText: { flex: 1, fontSize: SIZES.fontXs, color: '#FF4444', ...FONTS.medium, lineHeight: 17 },
  planTitle: { fontSize: SIZES.fontSm, color: COLORS.white, ...FONTS.bold, marginBottom: 8, marginTop: 4 },
  planRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  planItem: { fontSize: SIZES.fontXs, color: COLORS.textSecondary, ...FONTS.medium },
  precautionText: { fontSize: SIZES.fontXs, color: COLORS.textMuted, ...FONTS.medium, lineHeight: 19, marginBottom: 3 },

  saveProfileBtn: { marginTop: 20, borderRadius: SIZES.radius, overflow: 'hidden' },
  saveProfileGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: SIZES.radius,
  },
  saveProfileText: { color: COLORS.onAccent, fontSize: SIZES.fontMd, ...FONTS.bold },

  // Info Card
  infoCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: COLORS.primary + '10', borderRadius: SIZES.radius,
    padding: 14, marginTop: 8, borderWidth: 1, borderColor: COLORS.primary + '20',
  },
  infoText: { flex: 1, fontSize: SIZES.fontSm, color: COLORS.textSecondary, lineHeight: 20 },
});

export default EditProfileScreen;
