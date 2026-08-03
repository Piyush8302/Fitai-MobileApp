// ─── First-time gym registration ─────────────────────────────────────────────
// Scanning a gym's QR when you're NOT a member of that gym lands here instead of
// silently creating a membership. The member only gives what THEY should hand
// over from their own phone — photo, name, email (phone is the FitAI login and
// locked). Everything else the gym wants (gender, DOB, address, emergency
// contact, blood group, goal, height/weight) is filled in later by the owner or
// staff from the member detail page — see the "Edit details" flow there. The
// submit both registers the member here AND marks today's attendance. From the
// next scan onwards the scanner goes straight to attendance and never shows
// this screen again.

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image,
  ActivityIndicator, Alert, Platform, KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { pickSquarePhoto } from '../utils/photo';
import { COLORS, SIZES, FONTS } from '../constants/theme';
import api, { ENDPOINTS } from '../config/api';

const Field = ({ label, hint, children }) => (
  <View style={styles.field}>
    <Text style={styles.label}>
      {label}
      {hint ? <Text style={styles.hint}>  {hint}</Text> : null}
    </Text>
    {children}
  </View>
);

const GymJoinScreen = ({ navigation, route }) => {
  // Everything below comes from the scan response — see selfCheckIn's
  // `needsRegistration` branch on the backend.
  const { gym, regToken, prefill = {} } = route.params || {};

  const [photo, setPhoto] = useState('');                  // base64, gym's copy only
  const [name, setName] = useState(prefill.name === 'Member' ? '' : (prefill.name || ''));
  const [email, setEmail] = useState(prefill.email || '');
  const [busy, setBusy] = useState(false);

  const pickPhoto = (source) => async () => {
    try {
      const b64 = await pickSquarePhoto(source);
      if (b64) setPhoto(b64);
    } catch (e) { Alert.alert('Error', 'Could not read that photo.'); }
  };

  // Sends the form back to the SAME check-in endpoint. The backend creates the
  // membership from `profile` and then marks attendance in one go.
  const submit = async (skipProfile = false) => {
    if (busy) return;
    if (!skipProfile && !name.trim()) return Alert.alert('Name needed', 'Please enter your name so the gym can identify you.');
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) return Alert.alert('Check the email', 'That email address does not look right.');
    setBusy(true);
    try {
      const body = skipProfile
        ? { regToken, skipProfile: true }
        : { regToken, profile: { name: name.trim(), email: email.trim(), avatar: photo || undefined } };
      const res = await api.post(ENDPOINTS.GYM_MY_CHECKIN, body);
      if (res.success) {
        const closed = res.data?.closed;
        Alert.alert(
          closed ? '📝 Registered' : '✅ Registered & checked in',
          res.message || `You're now a member of ${gym?.name || 'this gym'}.`,
          [{ text: 'OK', onPress: () => navigation.navigate('MyGymCard') }],
        );
      } else {
        Alert.alert('Could not register', res.message || 'Please try again.');
      }
    } catch (e) {
      Alert.alert('Error', 'Registration failed. Please try again.');
    } finally { setBusy(false); }
  };

  return (
    <LinearGradient colors={COLORS.gradientDark} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Join Gym</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          {/* Which gym you just scanned */}
          <View style={styles.gymCard}>
            <View style={styles.gymIcon}><Text style={{ fontSize: 22 }}>🏋️</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.gymName}>{gym?.name || 'Gym'}</Text>
              <Text style={styles.gymMeta}>{gym?.location || 'First time here — register to check in'}</Text>
            </View>
          </View>

          {/* Photo — this copy belongs to the gym, it does not replace your app photo */}
          <Field label="Your photo" hint="(optional)">
            <View style={styles.photoRow}>
              {photo ? (
                <Image source={{ uri: photo }} style={styles.photo} />
              ) : (
                <View style={[styles.photo, styles.photoEmpty]}><Ionicons name="person" size={26} color={COLORS.textMuted} /></View>
              )}
              <TouchableOpacity style={styles.photoBtn} onPress={pickPhoto('camera')}>
                <Ionicons name="camera-outline" size={16} color={COLORS.primary} />
                <Text style={styles.photoBtnText}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoBtn} onPress={pickPhoto('gallery')}>
                <Ionicons name="image-outline" size={16} color={COLORS.primary} />
                <Text style={styles.photoBtnText}>Gallery</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.note}>Used on your gym's member list. Your FitAI profile photo stays as it is.</Text>
          </Field>

          <Field label="Full name">
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor={COLORS.textMuted} />
          </Field>

          <Field label="Mobile number">
            <TextInput style={[styles.input, styles.inputLocked]} value={prefill.phone || ''} editable={false} />
            <Text style={styles.note}>This is your FitAI login number and can't be changed here.</Text>
          </Field>

          <Field label="Email" hint="(optional)">
            <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="you@email.com" placeholderTextColor={COLORS.textMuted} keyboardType="email-address" autoCapitalize="none" />
          </Field>

          <Text style={styles.footerNote}>Anything else the gym needs — like your goal, address or an emergency contact — the gym team can add from your member profile.</Text>

          <TouchableOpacity style={[styles.submit, busy && { opacity: 0.6 }]} onPress={() => submit(false)} disabled={busy}>
            {busy ? <ActivityIndicator color={COLORS.onAccent} /> : (
              <>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.onAccent} />
                <Text style={styles.submitText}>Register &amp; Check In</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.skip} onPress={() => submit(true)} disabled={busy}>
            <Text style={styles.skipText}>Skip for now — just check me in</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 54, paddingBottom: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.darkCard, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: SIZES.fontXl, color: COLORS.white, ...FONTS.bold },

  gymCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: SIZES.radius, backgroundColor: COLORS.darkCard, borderWidth: 1, borderColor: COLORS.darkBorder, marginBottom: 18 },
  gymIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary + '18', alignItems: 'center', justifyContent: 'center' },
  gymName: { fontSize: SIZES.fontLg, color: COLORS.white, ...FONTS.bold },
  gymMeta: { fontSize: SIZES.fontXs, color: COLORS.textMuted, marginTop: 2 },

  field: { marginBottom: 14 },
  label: { fontSize: SIZES.fontSm, color: COLORS.textSecondary, ...FONTS.semiBold, marginBottom: 6 },
  hint: { fontSize: SIZES.fontXs, color: COLORS.textMuted, ...FONTS.medium },
  note: { fontSize: SIZES.fontXs, color: COLORS.textMuted, marginTop: 6, lineHeight: 16 },

  input: {
    backgroundColor: COLORS.darkCard, borderWidth: 1, borderColor: COLORS.darkBorder, borderRadius: SIZES.radius,
    paddingHorizontal: 14, paddingVertical: 12, color: COLORS.white, fontSize: SIZES.fontMd, ...FONTS.medium,
  },
  inputText: { color: COLORS.white, fontSize: SIZES.fontMd, ...FONTS.medium },
  inputLocked: { color: COLORS.textMuted, backgroundColor: COLORS.darkSurface },

  photoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  photo: { width: 62, height: 62, borderRadius: 31 },
  photoEmpty: { backgroundColor: COLORS.darkCard, borderWidth: 1, borderColor: COLORS.darkBorder, alignItems: 'center', justifyContent: 'center' },
  photoBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: SIZES.radius, backgroundColor: COLORS.darkCard, borderWidth: 1, borderColor: COLORS.primary + '55',
  },
  photoBtnText: { color: COLORS.primary, fontSize: SIZES.fontSm, ...FONTS.bold },

  footerNote: { fontSize: SIZES.fontXs, color: COLORS.textMuted, lineHeight: 17, marginBottom: 18, marginTop: 4 },

  submit: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.primary, borderRadius: SIZES.radius, paddingVertical: 15, marginTop: 8,
  },
  submitText: { color: COLORS.onAccent, fontSize: SIZES.fontMd, ...FONTS.bold },
  skip: { alignItems: 'center', paddingVertical: 14 },
  skipText: { color: COLORS.textMuted, fontSize: SIZES.fontSm, ...FONTS.medium, textDecorationLine: 'underline' },
});

export default GymJoinScreen;
