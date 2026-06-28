import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS } from '../constants/theme';
import Header from '../components/Header';
import api, { ENDPOINTS } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_FAQ = [
  { q: 'How do I change my fitness goal?', a: 'Go to Profile > Edit Profile and update your fitness goal in the setup wizard.' },
  { q: 'Why is my calorie target showing BMR?', a: 'For weight loss users, we recommend eating at your BMR (Basal Metabolic Rate) to create a safe calorie deficit without harming your health.' },
  { q: 'How does the step counter work?', a: 'Enable the step counter from the Tracking screen. It uses your phone\'s motion sensor. Steps taken while the app is closed are loaded when you reopen the app.' },
  { q: 'How do I track my meals?', a: 'Use the Quick Log on the Tracking screen or browse the Food Database to find and log specific foods with accurate nutrition data.' },
  { q: 'Is my data secure?', a: 'Yes. Your data is encrypted and stored securely. We never share your personal information with third parties.' },
  { q: 'How do I cancel my subscription?', a: 'Go to Profile > Subscription and tap Cancel Subscription. You\'ll retain access until the end of your billing period.' },
];

const ADMIN_FAQ = [
  { q: 'How do members mark attendance?', a: 'Put your gym\'s QR at the counter — members scan it with their phone camera. Check-in only works when they\'re physically at the gym (GPS-verified), so it can\'t be done from home. You can also open a member and tap "Mark Present".' },
  { q: 'How do I add a member?', a: 'Go to the Gym tab > Add Member. Enter their phone, plan and fee (photo optional). A new walk-in who scans your QR is also added automatically.' },
  { q: 'How do I record a payment & set the due date?', a: 'Open a member > Mark Payment. Pick the plan and amount — the next due date auto-fills from the plan, and you can edit it to set a custom due date.' },
  { q: 'How do I add staff and what can they do?', a: 'Gym tab > Staff > Add Staff (name + phone). Staff log in with "Login as Admin" + their phone OTP. They get a restricted view (no cashbook/reports). Tap a staff to edit their details or reassign their gym.' },
  { q: 'Can I run multiple gyms/branches?', a: 'Yes. Tap "Add Gym" in the switcher to add a branch. Use the chips (or swipe) to switch; "All Gyms" shows a combined view.' },
  { q: 'How do I download reports?', a: 'Settings > Reports > Monthly Report (PDF) or Last 3 Months (PDF). For multiple gyms you can pick one branch or download all combined.' },
  { q: 'How do I become a gym owner?', a: 'Register from the login screen ("Register Gym"). A FitAI admin approves your request, then you get an email and can log in with phone/email OTP.' },
];

const HelpSupportScreen = ({ navigation, route }) => {
  const isAdmin = route?.params?.audience === 'admin';
  const FAQ = isAdmin ? ADMIN_FAQ : USER_FAQ;
  const [expanded, setExpanded] = useState(null);
  const [message, setMessage] = useState('');

  const [sending, setSending] = useState(false);
  const handleSend = async () => {
    if (!message.trim()) { Alert.alert('Error', 'Please enter your message'); return; }
    setSending(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) api.setToken(token);
      const res = await api.post(ENDPOINTS.SUPPORT, { message: message.trim() });
      if (res.success) { Alert.alert('Sent!', res.message || 'Your message has been received. We\'ll get back to you soon.'); setMessage(''); }
      else Alert.alert('Error', res.message || 'Could not send your message');
    } catch (e) { Alert.alert('Error', 'Network error. Please try again.'); }
    setSending(false);
  };

  return (
    <LinearGradient colors={COLORS.gradientDark} style={styles.container}>
      <Header title="Help & Support" subtitle={isAdmin ? 'Gym owner & staff help' : "We're here to help"} onBack={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
        {FAQ.map((item, i) => (
          <TouchableOpacity key={i} style={styles.faqCard} onPress={() => setExpanded(expanded === i ? null : i)} activeOpacity={0.8}>
            <View style={styles.faqHeader}>
              <Text style={styles.faqQ}>{item.q}</Text>
              <Ionicons name={expanded === i ? 'chevron-up' : 'chevron-down'} size={18} color={COLORS.textMuted} />
            </View>
            {expanded === i && <Text style={styles.faqA}>{item.a}</Text>}
          </TouchableOpacity>
        ))}

        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Contact Us</Text>
        <View style={styles.contactCard}>
          <TextInput
            style={styles.input}
            placeholder="Describe your issue or question..."
            placeholderTextColor={COLORS.textMuted}
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          <TouchableOpacity style={styles.sendBtn} onPress={handleSend} disabled={sending}>
            <LinearGradient colors={COLORS.gradient1} style={styles.sendBtnGrad}>
              <Ionicons name="send" size={18} color={COLORS.white} />
              <Text style={styles.sendBtnText}>{sending ? 'Sending…' : 'Send Message'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.emailRow} onPress={() => Linking.openURL('mailto:support@fitai.com')}>
          <Ionicons name="mail-outline" size={20} color={COLORS.primary} />
          <Text style={styles.emailText}>support@fitai.com</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingBottom: 20 },
  sectionTitle: { fontSize: SIZES.fontXl, color: COLORS.white, ...FONTS.bold, marginBottom: 14 },
  faqCard: { backgroundColor: COLORS.darkCard, borderRadius: SIZES.radius, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: COLORS.darkBorder },
  faqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  faqQ: { fontSize: SIZES.fontMd, color: COLORS.white, ...FONTS.semiBold, flex: 1, marginRight: 10 },
  faqA: { fontSize: SIZES.fontSm, color: COLORS.textSecondary, ...FONTS.medium, marginTop: 10, lineHeight: 20 },
  contactCard: { backgroundColor: COLORS.darkCard, borderRadius: SIZES.radius, padding: 16, borderWidth: 1, borderColor: COLORS.darkBorder },
  input: { backgroundColor: COLORS.darkSurface, borderRadius: SIZES.radius, padding: 14, color: COLORS.white, fontSize: SIZES.fontMd, ...FONTS.medium, minHeight: 100, borderWidth: 1, borderColor: COLORS.darkBorder, marginBottom: 12 },
  sendBtn: { borderRadius: SIZES.radius, overflow: 'hidden' },
  sendBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 8, borderRadius: SIZES.radius },
  sendBtnText: { fontSize: SIZES.fontMd, color: COLORS.white, ...FONTS.bold },
  emailRow: { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center', marginTop: 20 },
  emailText: { fontSize: SIZES.fontMd, color: COLORS.primary, ...FONTS.medium },
});

export default HelpSupportScreen;
