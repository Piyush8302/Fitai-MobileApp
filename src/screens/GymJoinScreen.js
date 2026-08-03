// ─── First-time gym registration ─────────────────────────────────────────────
// Scanning a gym's QR when you're NOT a member of that gym lands here instead of
// silently creating a membership. The member fills in what the gym needs once —
// the same details the public web check-in page asks a walk-in for — and the
// submit both registers them AND marks today's attendance. From the next scan
// onwards the scanner goes straight to attendance and never shows this screen.

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

// DOB as plain typed text — the app's wheel picker only offers a few years
// around today, which is useless for a birth year.
const parseDob = (s) => {
  const m = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/.exec(String(s || '').trim());
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  if (isNaN(d.getTime()) || d.getMonth() !== Number(mm) - 1 || d > new Date()) return null;
  return d;
};

const GENDERS = [
  { key: 'male', label: 'Male' },
  { key: 'female', label: 'Female' },
  { key: 'other', label: 'Other' },
];
const GOALS = ['Weight loss', 'Muscle gain', 'General fitness', 'Strength', 'Stamina'];

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
  const [gender, setGender] = useState('');
  const [dob, setDob] = useState('');                      // typed as DD/MM/YYYY
  const [address, setAddress] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [goal, setGoal] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
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
    const dobDate = dob.trim() ? parseDob(dob) : null;
    if (dob.trim() && !dobDate) return Alert.alert('Check the date', 'Enter your date of birth as DD/MM/YYYY.');
    setBusy(true);
    try {
      const body = skipProfile
        ? { regToken, skipProfile: true }
        : {
            regToken,
            profile: {
              name: name.trim(), email: email.trim(), gender, dob: dobDate ? dobDate.toISOString() : undefined,
              address: address.trim(), emergencyName: emergencyName.trim(), emergencyPhone: emergencyPhone.trim(),
              bloodGroup: bloodGroup.trim(), goal, height, weight,
              avatar: photo || undefined,
            },
          };
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

          <Field label="Gender" hint="(optional)">
            <View style={styles.chipRow}>
              {GENDERS.map((g) => (
                <TouchableOpacity key={g.key} style={[styles.chip, gender === g.key && styles.chipOn]} onPress={() => setGender(gender === g.key ? '' : g.key)}>
                  <Text style={[styles.chipText, gender === g.key && styles.chipTextOn]}>{g.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Field>

          <Field label="Date of birth" hint="(optional)">
            <TextInput style={styles.input} value={dob} onChangeText={setDob} placeholder="DD/MM/YYYY" placeholderTextColor={COLORS.textMuted} keyboardType="numbers-and-punctuation" maxLength={10} />
          </Field>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Field label="Height (cm)" hint="(optional)">
                <TextInput style={styles.input} value={height} onChangeText={setHeight} placeholder="170" placeholderTextColor={COLORS.textMuted} keyboardType="numeric" />
              </Field>
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Weight (kg)" hint="(optional)">
                <TextInput style={styles.input} value={weight} onChangeText={setWeight} placeholder="70" placeholderTextColor={COLORS.textMuted} keyboardType="numeric" />
              </Field>
            </View>
          </View>

          <Field label="Your goal" hint="(optional)">
            <View style={styles.chipRow}>
              {GOALS.map((g) => (
                <TouchableOpacity key={g} style={[styles.chip, goal === g && styles.chipOn]} onPress={() => setGoal(goal === g ? '' : g)}>
                  <Text style={[styles.chipText, goal === g && styles.chipTextOn]}>{g}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Field>

          <Field label="Address" hint="(optional)">
            <TextInput style={[styles.input, styles.inputArea]} value={address} onChangeText={setAddress} placeholder="House, street, area" placeholderTextColor={COLORS.textMuted} multiline />
          </Field>

          <View style={styles.row}>
            <View style={{ flex: 1.4 }}>
              <Field label="Emergency contact" hint="(optional)">
                <TextInput style={styles.input} value={emergencyName} onChangeText={setEmergencyName} placeholder="Name" placeholderTextColor={COLORS.textMuted} />
              </Field>
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Blood group" hint="">
                <TextInput style={styles.input} value={bloodGroup} onChangeText={setBloodGroup} placeholder="O+" placeholderTextColor={COLORS.textMuted} autoCapitalize="characters" />
              </Field>
            </View>
          </View>

          <Field label="Emergency number" hint="(optional)">
            <TextInput style={styles.input} value={emergencyPhone} onChangeText={setEmergencyPhone} placeholder="10-digit number" placeholderTextColor={COLORS.textMuted} keyboardType="phone-pad" maxLength={15} />
          </Field>

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
  row: { flexDirection: 'row', gap: 12 },

  input: {
    backgroundColor: COLORS.darkCard, borderWidth: 1, borderColor: COLORS.darkBorder, borderRadius: SIZES.radius,
    paddingHorizontal: 14, paddingVertical: 12, color: COLORS.white, fontSize: SIZES.fontMd, ...FONTS.medium,
  },
  inputText: { color: COLORS.white, fontSize: SIZES.fontMd, ...FONTS.medium },
  inputLocked: { color: COLORS.textMuted, backgroundColor: COLORS.darkSurface },
  inputArea: { minHeight: 76, textAlignVertical: 'top' },

  photoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  photo: { width: 62, height: 62, borderRadius: 31 },
  photoEmpty: { backgroundColor: COLORS.darkCard, borderWidth: 1, borderColor: COLORS.darkBorder, alignItems: 'center', justifyContent: 'center' },
  photoBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: SIZES.radius, backgroundColor: COLORS.darkCard, borderWidth: 1, borderColor: COLORS.primary + '55',
  },
  photoBtnText: { color: COLORS.primary, fontSize: SIZES.fontSm, ...FONTS.bold },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, backgroundColor: COLORS.darkCard, borderWidth: 1, borderColor: COLORS.darkBorder },
  chipOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: SIZES.fontSm, color: COLORS.textSecondary, ...FONTS.semiBold },
  chipTextOn: { color: COLORS.onAccent },

  submit: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.primary, borderRadius: SIZES.radius, paddingVertical: 15, marginTop: 8,
  },
  submitText: { color: COLORS.onAccent, fontSize: SIZES.fontMd, ...FONTS.bold },
  skip: { alignItems: 'center', paddingVertical: 14 },
  skipText: { color: COLORS.textMuted, fontSize: SIZES.fontSm, ...FONTS.medium, textDecorationLine: 'underline' },
});

export default GymJoinScreen;
