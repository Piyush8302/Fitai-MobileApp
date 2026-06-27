import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS } from '../constants/theme';
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
        <Text style={styles.doneText}>FitAI will review your request. Once approved, a login OTP will be sent to {email}. Then log in as Admin.</Text>
        <GradientButton title="Back to Login" onPress={() => navigation.replace('Login')} style={{ marginTop: 24, width: '100%' }} />
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={COLORS.gradientDark} style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={COLORS.white} />
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={styles.logoCircle}><Text style={styles.logo}>🏋️</Text></View>
            <Text style={styles.title}>Register your Gym</Text>
            <Text style={styles.subtitle}>Submit your details — FitAI will approve your gym owner account.</Text>
          </View>

          <View style={styles.form}>
            <InputField label="Your Name" icon="person-outline" placeholder="e.g. Anand Sharma" value={name} onChangeText={setName} />
            <InputField label="Gym Name" icon="barbell-outline" placeholder="e.g. Anand Fitness Gym" value={gymName} onChangeText={setGymName} />
            <InputField label="Mobile Number" icon="call-outline" placeholder="10-digit number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={10} />
            <InputField label="Email" icon="mail-outline" placeholder="you@email.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />

            <View style={styles.note}>
              <Ionicons name="information-circle-outline" size={16} color={COLORS.primary} />
              <Text style={styles.noteText}>After approval, a login OTP is emailed to you. No password needed.</Text>
            </View>

            <GradientButton title={loading ? '' : 'Submit for Approval'} onPress={submit} disabled={loading} style={{ marginTop: 8 }}>
              {loading && <ActivityIndicator color="#fff" />}
            </GradientButton>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', padding: 30 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.darkCard, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  header: { alignItems: 'center', marginBottom: 28 },
  logoCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.primary + '20', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  logo: { fontSize: 36 },
  title: { fontSize: SIZES.fontTitle, color: COLORS.white, ...FONTS.bold },
  subtitle: { fontSize: SIZES.fontMd, color: COLORS.textMuted, ...FONTS.medium, marginTop: 8, textAlign: 'center', paddingHorizontal: 10 },
  form: {},
  note: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, marginBottom: 6, padding: 12, borderRadius: SIZES.radius, backgroundColor: COLORS.primary + '12', borderWidth: 1, borderColor: COLORS.primary + '30' },
  noteText: { flex: 1, fontSize: SIZES.fontXs, color: COLORS.textSecondary, ...FONTS.medium },

  doneIcon: { width: 84, height: 84, borderRadius: 42, backgroundColor: COLORS.success + '20', alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  doneTitle: { fontSize: SIZES.fontXl, color: COLORS.white, ...FONTS.bold },
  doneText: { fontSize: SIZES.fontMd, color: COLORS.textMuted, ...FONTS.medium, textAlign: 'center', marginTop: 10, lineHeight: 22 },
});

export default GymOwnerRegisterScreen;
