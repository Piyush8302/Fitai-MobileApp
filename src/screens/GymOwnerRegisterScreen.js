import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS, SHADOWS } from '../constants/theme';
import InputField from '../components/InputField';
import GradientButton from '../components/GradientButton';
import api, { ENDPOINTS } from '../config/api';

// Gym owners can't self-create an account — they register here and a FitAI
// super-admin approves them in the admin panel. After approval a login OTP is
// emailed and they can sign in as Admin.
const GymOwnerRegisterScreen = ({ navigation, route }) => {
  const [name, setName] = useState('');
  const [gymName, setGymName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState(route?.params?.phone || '');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const scrollRef = useRef(null);

  // Bring a focused field above the keyboard (Android edge-to-edge needs this)
  const scrollToEnd = () => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);

  const submit = async () => {
    const p = (phone || '').replace(/\D/g, '');
    if (!name.trim()) return Alert.alert('Required', 'Enter your name');
    if (!gymName.trim()) return Alert.alert('Required', 'Enter your gym name');
    if (p.length < 10) return Alert.alert('Required', 'Enter a valid 10-digit number');
    if (!email.includes('@')) return Alert.alert('Required', 'Enter a valid email (approval OTP is sent there)');

    setLoading(true);
    try {
      const res = await api.post(ENDPOINTS.REGISTER_OWNER, { name: name.trim(), gymName: gymName.trim(), email: email.trim().toLowerCase(), phone: p });
      if (res.success) setDone(true);
      else Alert.alert('Error', res.message || 'Could not submit');
    } catch (e) { Alert.alert('Error', 'Network error. Please try again.'); }
    setLoading(false);
  };

  if (done) {
    return (
      <LinearGradient colors={COLORS.gradientDark} style={[styles.container, styles.center]}>
        <View style={styles.doneIcon}><Ionicons name="checkmark-done" size={44} color={COLORS.success} /></View>
        <Text style={styles.doneTitle}>Registration submitted!</Text>
        <Text style={styles.doneText}>FitAI will review your request. Once approved, a login OTP is sent to {email}. Then log in as Admin.</Text>
        <GradientButton title="Back to Login" onPress={() => navigation.replace('Login')} style={{ marginTop: 24, width: '100%' }} />
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={COLORS.gradientDark} style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={COLORS.white} />
          </TouchableOpacity>

          <View style={styles.header}>
            <LinearGradient colors={COLORS.gradient1} style={styles.logoCircle}>
              <Ionicons name="business" size={32} color="#FFF" />
            </LinearGradient>
            <Text style={styles.title}>Register your Gym</Text>
            <Text style={styles.subtitle}>Submit your details — FitAI approves your gym owner account.</Text>
          </View>

          {/* Form card */}
          <View style={styles.card}>
            <InputField label="Your Name" icon="person-outline" placeholder="e.g. Anand Sharma" value={name} onChangeText={setName} returnKeyType="next" />
            <InputField label="Gym Name" icon="barbell-outline" placeholder="e.g. Anand Fitness Gym" value={gymName} onChangeText={setGymName} returnKeyType="next" />
            <InputField label="Mobile Number" icon="call-outline" placeholder="10-digit number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={10} onFocus={scrollToEnd} returnKeyType="next" />
            <InputField label="Email" icon="mail-outline" placeholder="you@email.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" onFocus={scrollToEnd} returnKeyType="done" onSubmitEditing={submit} />

            <View style={styles.note}>
              <Ionicons name="shield-checkmark-outline" size={18} color={COLORS.primary} />
              <Text style={styles.noteText}>After approval, a login OTP is emailed to you. No password needed.</Text>
            </View>

            <GradientButton title={loading ? '' : 'Submit for Approval'} onPress={submit} disabled={loading} style={{ marginTop: 6 }}>
              {loading && <ActivityIndicator color="#fff" />}
            </GradientButton>
          </View>

          <TouchableOpacity style={styles.loginRow} onPress={() => navigation.replace('Login')}>
            <Text style={styles.loginText}>Already approved? </Text>
            <Text style={styles.loginLink}>Login</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', padding: 30 },
  scroll: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 56, paddingBottom: 160 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.darkCard, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  header: { alignItems: 'center', marginBottom: 22 },
  logoCircle: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center', marginBottom: 14, ...SHADOWS.glow(COLORS.primary) },
  title: { fontSize: SIZES.fontTitle, color: COLORS.white, ...FONTS.bold },
  subtitle: { fontSize: SIZES.fontMd, color: COLORS.textMuted, ...FONTS.medium, marginTop: 8, textAlign: 'center', paddingHorizontal: 16 },

  card: { backgroundColor: COLORS.darkCard, borderRadius: SIZES.radiusLg, borderWidth: 1, borderColor: COLORS.darkBorder, padding: 18, ...SHADOWS.medium },
  note: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, marginBottom: 10, padding: 12, borderRadius: SIZES.radius, backgroundColor: COLORS.primary + '12', borderWidth: 1, borderColor: COLORS.primary + '30' },
  noteText: { flex: 1, fontSize: SIZES.fontXs, color: COLORS.textSecondary, ...FONTS.medium, lineHeight: 17 },

  loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 22 },
  loginText: { fontSize: SIZES.fontMd, color: COLORS.textMuted },
  loginLink: { fontSize: SIZES.fontMd, color: COLORS.primary, ...FONTS.bold },

  doneIcon: { width: 84, height: 84, borderRadius: 42, backgroundColor: COLORS.success + '20', alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  doneTitle: { fontSize: SIZES.fontXl, color: COLORS.white, ...FONTS.bold },
  doneText: { fontSize: SIZES.fontMd, color: COLORS.textMuted, ...FONTS.medium, textAlign: 'center', marginTop: 10, lineHeight: 22 },
});

export default GymOwnerRegisterScreen;
