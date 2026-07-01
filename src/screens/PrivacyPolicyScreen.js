import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES, FONTS } from '../constants/theme';
import Header from '../components/Header';

const SECTIONS = [
  { title: 'Information We Collect', content: 'We collect information you provide directly: name, email, phone number, age, gender, height, weight, fitness goals, and dietary preferences. We also collect usage data such as workout logs, meal tracking, step counts, and app interaction patterns to personalize your experience.' },
  { title: 'How We Use Your Data', content: 'Your data is used to: calculate your BMI, BMR, and daily calorie needs; generate personalized workout and diet plans; track your fitness progress; provide AI-powered health recommendations; and improve our services.' },
  { title: 'Data Storage & Security', content: 'Your data is stored on secure servers with encryption at rest and in transit. We use industry-standard security measures including JWT authentication, bcrypt password hashing, and HTTPS connections. Your password is never stored in plain text.' },
  { title: 'Third-Party Services', content: 'We use the following third-party services: Google OAuth for authentication, Expo Push Notifications for alerts, and MongoDB Atlas for data storage. These services have their own privacy policies governing their use of your data.' },
  { title: 'Data Sharing', content: 'We do not sell, trade, or share your personal information with third parties for marketing purposes. We may share anonymized, aggregated data for research or analytics purposes.' },
  { title: 'Your Rights', content: 'You have the right to: access your personal data, correct inaccurate data, delete your account and all associated data, export your data, and opt out of notifications at any time.' },
  { title: 'Data Retention', content: 'We retain your data as long as your account is active. If you delete your account, your personal data will be removed within 30 days. Some anonymized data may be retained for analytics.' },
  { title: 'Contact Us', content: 'For privacy-related questions or concerns, contact us at yadavpiyush8302@gmail.com. We will respond within 48 hours.' },
];

const PrivacyPolicyScreen = ({ navigation }) => (
  <LinearGradient colors={COLORS.gradientDark} style={styles.container}>
    <Header title="Privacy Policy" subtitle="Your data, your rights" onBack={() => navigation.goBack()} />
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
      <Text style={styles.updated}>Last updated: May 2026</Text>

      <View style={styles.introCard}>
        <Text style={styles.introText}>
          FitAI is committed to protecting your privacy. This policy explains what data we collect, how we use it, and your rights regarding your personal information.
        </Text>
      </View>

      {SECTIONS.map((s, i) => (
        <View key={i} style={styles.section}>
          <Text style={styles.sectionNum}>{i + 1}</Text>
          <View style={styles.sectionContent}>
            <Text style={styles.sectionTitle}>{s.title}</Text>
            <Text style={styles.sectionText}>{s.content}</Text>
          </View>
        </View>
      ))}

      <View style={{ height: 40 }} />
    </ScrollView>
  </LinearGradient>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingBottom: 20 },
  updated: { fontSize: SIZES.fontSm, color: COLORS.textMuted, ...FONTS.medium, marginBottom: 16 },
  introCard: { backgroundColor: COLORS.primary + '10', borderRadius: SIZES.radius, padding: 16, marginBottom: 20, borderLeftWidth: 3, borderLeftColor: COLORS.primary },
  introText: { fontSize: SIZES.fontMd, color: COLORS.textSecondary, ...FONTS.medium, lineHeight: 22 },
  section: { flexDirection: 'row', marginBottom: 20 },
  sectionNum: { fontSize: SIZES.fontXl, color: COLORS.primary, ...FONTS.bold, width: 30, marginTop: 2 },
  sectionContent: { flex: 1 },
  sectionTitle: { fontSize: SIZES.fontLg, color: COLORS.white, ...FONTS.bold, marginBottom: 6 },
  sectionText: { fontSize: SIZES.fontSm, color: COLORS.textSecondary, ...FONTS.medium, lineHeight: 20 },
});

export default PrivacyPolicyScreen;
