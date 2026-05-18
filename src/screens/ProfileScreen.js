import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS } from '../constants/theme';
import Header from '../components/Header';
import GradientCard from '../components/GradientCard';

const ProfileScreen = ({ navigation }) => {
  const menuItems = [
    { section: 'Account', items: [
      { icon: 'person-outline', label: 'Edit Profile', screen: 'ProfileSetup' },
      { icon: 'fitness-outline', label: 'My Goals', screen: 'GoalSelection' },
      { icon: 'card-outline', label: 'Subscription', screen: 'Subscription' },
      { icon: 'notifications-outline', label: 'Notifications', screen: 'Notifications' },
      { icon: 'lock-closed-outline', label: 'Change Password', screen: 'ChangePassword' },
      { icon: 'trophy-outline', label: 'Achievements', screen: 'Achievements' },
    ]},
    { section: 'Health', items: [
      { icon: 'body-outline', label: 'BMI & Body Analysis', screen: 'BMI' },
      { icon: 'restaurant-outline', label: 'Diet Plans', screen: 'Diet' },
      { icon: 'barbell-outline', label: 'Workout Plans', screen: 'Workout' },
      { icon: 'analytics-outline', label: 'Progress Report', screen: 'Tracking' },
      { icon: 'newspaper-outline', label: 'Health Articles', screen: 'Articles' },
      { icon: 'nutrition-outline', label: 'Food Database', screen: 'FoodDatabase' },
      { icon: 'walk-outline', label: 'Exercise Library', screen: 'ExerciseLibrary' },
    ]},
    { section: 'App', items: [
      { icon: 'moon-outline', label: 'Dark Mode', toggle: true },
      { icon: 'language-outline', label: 'Language', value: 'English' },
      { icon: 'help-circle-outline', label: 'Help & Support' },
      { icon: 'shield-checkmark-outline', label: 'Privacy Policy' },
      { icon: 'star-outline', label: 'Rate Us' },
      { icon: 'share-social-outline', label: 'Share App' },
    ]},
  ];

  return (
    <LinearGradient colors={COLORS.gradientDark} style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarText}>R</Text>
          </View>
          <Text style={styles.userName}>Rahul Sharma</Text>
          <Text style={styles.userEmail}>rahul@example.com</Text>
          <View style={styles.badgeRow}>
            <View style={styles.premiumBadge}>
              <Text style={styles.premiumIcon}>👑</Text>
              <Text style={styles.premiumText}>Premium Member</Text>
            </View>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          {[
            { label: 'Weight', value: '70 kg', icon: '⚖️' },
            { label: 'Height', value: '170 cm', icon: '📏' },
            { label: 'BMI', value: '24.2', icon: '📊' },
            { label: 'Goal', value: 'Lose', icon: '🎯' },
          ].map((s, i) => (
            <View key={i} style={styles.statItem}>
              <Text style={styles.statIcon}>{s.icon}</Text>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Menu Sections */}
        {menuItems.map((section, si) => (
          <View key={si} style={styles.menuSection}>
            <Text style={styles.sectionTitle}>{section.section}</Text>
            <View style={styles.menuCard}>
              {section.items.map((item, ii) => (
                <TouchableOpacity
                  key={ii}
                  style={[styles.menuItem, ii < section.items.length - 1 && styles.menuItemBorder]}
                  onPress={() => item.screen && navigation.navigate(item.screen)}
                >
                  <View style={styles.menuLeft}>
                    <View style={styles.menuIconBg}>
                      <Ionicons name={item.icon} size={20} color={COLORS.primary} />
                    </View>
                    <Text style={styles.menuLabel}>{item.label}</Text>
                  </View>
                  {item.toggle ? (
                    <Switch
                      value={true}
                      trackColor={{ false: COLORS.darkBorder, true: COLORS.primary + '50' }}
                      thumbColor={COLORS.primary}
                    />
                  ) : item.value ? (
                    <Text style={styles.menuValue}>{item.value}</Text>
                  ) : (
                    <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={() => navigation.replace('Login')}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <Text style={styles.version}>FitAI v2.0.0</Text>
        <View style={{ height: 100 }} />
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingTop: 60, paddingBottom: 20 },
  profileHeader: { alignItems: 'center', marginBottom: 24 },
  avatarLarge: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
    marginBottom: 14, borderWidth: 3, borderColor: COLORS.primary + '40',
  },
  avatarText: { fontSize: 36, color: COLORS.white, ...FONTS.bold },
  userName: { fontSize: SIZES.fontXxl, color: COLORS.white, ...FONTS.bold },
  userEmail: { fontSize: SIZES.fontMd, color: COLORS.textMuted, ...FONTS.medium, marginTop: 4 },
  badgeRow: { marginTop: 12 },
  premiumBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.primary + '15', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 6,
    borderWidth: 1, borderColor: COLORS.primary + '30',
  },
  premiumIcon: { fontSize: 14 },
  premiumText: { fontSize: SIZES.fontSm, color: COLORS.primary, ...FONTS.bold },
  statsRow: {
    flexDirection: 'row', justifyContent: 'space-around',
    backgroundColor: COLORS.darkCard, borderRadius: SIZES.radiusLg,
    borderWidth: 1, borderColor: COLORS.darkBorder,
    padding: 16, marginBottom: 24,
  },
  statItem: { alignItems: 'center' },
  statIcon: { fontSize: 22, marginBottom: 6 },
  statValue: { fontSize: SIZES.fontLg, color: COLORS.white, ...FONTS.bold },
  statLabel: { fontSize: SIZES.fontXs, color: COLORS.textMuted, marginTop: 2 },
  menuSection: { marginBottom: 20 },
  sectionTitle: { fontSize: SIZES.fontMd, color: COLORS.textMuted, ...FONTS.semiBold, marginBottom: 10, marginLeft: 4 },
  menuCard: {
    backgroundColor: COLORS.darkCard, borderRadius: SIZES.radiusLg,
    borderWidth: 1, borderColor: COLORS.darkBorder, overflow: 'hidden',
  },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.darkBorder },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuIconBg: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center', justifyContent: 'center',
  },
  menuLabel: { fontSize: SIZES.fontMd, color: COLORS.white, ...FONTS.medium },
  menuValue: { fontSize: SIZES.fontSm, color: COLORS.textMuted, ...FONTS.medium },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 16, backgroundColor: COLORS.error + '10',
    borderRadius: SIZES.radius, borderWidth: 1, borderColor: COLORS.error + '30',
    marginTop: 8,
  },
  logoutText: { fontSize: SIZES.fontLg, color: COLORS.error, ...FONTS.semiBold },
  version: { fontSize: SIZES.fontSm, color: COLORS.textMuted, textAlign: 'center', marginTop: 20 },
});

export default ProfileScreen;
