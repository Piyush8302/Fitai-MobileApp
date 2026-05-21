import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, ActivityIndicator, Alert, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS } from '../constants/theme';
import Header from '../components/Header';
import api, { ENDPOINTS } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ProfileScreen = ({ navigation }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) api.setToken(token);

      // Try API first, fallback to stored user
      const res = await api.get(ENDPOINTS.GET_ME);
      if (res.success) {
        const u = res.data || res.user;
        setUser(u);
        // Update stored user data
        await AsyncStorage.setItem('user', JSON.stringify(u));
      } else {
        // Fallback to locally stored user
        const stored = await AsyncStorage.getItem('user');
        if (stored) setUser(JSON.parse(stored));
      }
    } catch (e) {
      console.log('Profile load error:', e);
      // Fallback to locally stored user
      try {
        const stored = await AsyncStorage.getItem('user');
        if (stored) setUser(JSON.parse(stored));
      } catch (e2) { console.log(e2); }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  // Also reload when screen comes into focus (from tab navigation)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadProfile();
    });
    return unsubscribe;
  }, [navigation, loadProfile]);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.removeItem('token');
          await AsyncStorage.removeItem('user');
          api.setToken(null);
          navigation.getParent()?.reset({ index: 0, routes: [{ name: 'Login' }] }) ||
            navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        },
      },
    ]);
  };

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name[0].toUpperCase();
  };

  const getGoalLabel = (goal) => {
    const map = {
      weight_loss: 'Lose Weight',
      fat_loss: 'Fat Loss',
      weight_gain: 'Gain Weight',
      muscle_building: 'Build Muscle',
      height_growth: 'Height Growth',
      maintenance: 'Stay Fit',
      home_workout: 'Home Workout',
      gym_workout: 'Gym Workout',
    };
    return map[goal] || goal || '--';
  };

  const menuItems = [
    { section: 'Account', items: [
      { icon: 'person-outline', label: 'Edit Profile', screen: 'EditProfile' },
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
      { icon: 'people-outline', label: 'Refer & Earn', screen: 'Referral' },
      { icon: 'help-circle-outline', label: 'Help & Support', screen: 'HelpSupport' },
      { icon: 'shield-checkmark-outline', label: 'Privacy Policy', screen: 'PrivacyPolicy' },
      { icon: 'star-outline', label: 'Rate Us', screen: 'RateUs' },
      { icon: 'share-social-outline', label: 'Share App', screen: 'ShareApp' },
    ]},
  ];

  if (loading) {
    return (
      <LinearGradient colors={COLORS.gradientDark} style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={COLORS.gradientDark} style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          {user?.avatar && (user.avatar.startsWith('data:') || user.avatar.startsWith('http')) ? (
            <Image source={{ uri: user.avatar }} style={styles.avatarLargeImg} />
          ) : (
            <View style={styles.avatarLarge}>
              <Text style={styles.avatarText}>{getInitials(user?.name)}</Text>
            </View>
          )}
          <Text style={styles.userName}>{user?.name || 'User'}</Text>
          <Text style={styles.userEmail}>{user?.email || ''}</Text>
          {user?.phone && <Text style={styles.userPhone}>📱 {user.phone}</Text>}
          <View style={styles.badgeRow}>
            <View style={[styles.premiumBadge, !user?.isPremium && { backgroundColor: COLORS.textMuted + '15', borderColor: COLORS.textMuted + '30' }]}>
              <Text style={styles.premiumIcon}>{user?.isPremium ? '👑' : '🆓'}</Text>
              <Text style={[styles.premiumText, !user?.isPremium && { color: COLORS.textMuted }]}>
                {user?.isPremium ? 'Premium Member' : 'Free Plan'}
              </Text>
            </View>
          </View>
        </View>

        {/* Stats Row - Real Data */}
        <View style={styles.statsRow}>
          {[
            { label: 'Weight', value: user?.weight ? `${user.weight} kg` : '--', icon: '⚖️' },
            { label: 'Height', value: user?.height ? `${user.height} cm` : '--', icon: '📏' },
            { label: 'BMI', value: user?.bmi ? `${user.bmi}` : '--', icon: '📊' },
            { label: 'Goal', value: getGoalLabel(user?.fitnessGoal), icon: '🎯' },
          ].map((s, i) => (
            <View key={i} style={styles.statItem}>
              <Text style={styles.statIcon}>{s.icon}</Text>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Extra Health Info */}
        {(user?.dailyCalories || user?.proteinNeed) && (
          <View style={styles.healthRow}>
            {user?.dailyCalories && (() => {
              const tdee = user.dailyCalories;
              const bmrVal = user.bmr || Math.round(tdee / 1.55);
              const g = user.fitnessGoal;
              const target = (g === 'weight_loss' || g === 'fat_loss') ? bmrVal
                : g === 'weight_gain' ? Math.round(tdee * 1.2)
                : g === 'muscle_building' ? Math.round(tdee * 1.15)
                : (g === 'height_growth' || g === 'gym_workout') ? Math.round(tdee * 1.1)
                : tdee;
              return (
                <View style={styles.healthItem}>
                  <Text style={styles.healthIcon}>🔥</Text>
                  <View>
                    <Text style={styles.healthValue}>{target} kcal</Text>
                    <Text style={styles.healthLabel}>Target Calories</Text>
                  </View>
                </View>
              );
            })()}
            {user?.proteinNeed && (
              <View style={styles.healthItem}>
                <Text style={styles.healthIcon}>💪</Text>
                <View>
                  <Text style={styles.healthValue}>{user.proteinNeed}g</Text>
                  <Text style={styles.healthLabel}>Protein Need</Text>
                </View>
              </View>
            )}
            {user?.bmr && (
              <View style={styles.healthItem}>
                <Text style={styles.healthIcon}>⚡</Text>
                <View>
                  <Text style={styles.healthValue}>{user.bmr}</Text>
                  <Text style={styles.healthLabel}>BMR</Text>
                </View>
              </View>
            )}
          </View>
        )}

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
                  {item.value ? (
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
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <Text style={styles.version}>FitAI v2.1.0</Text>
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
  avatarLargeImg: {
    width: 90, height: 90, borderRadius: 45,
    marginBottom: 14, borderWidth: 3, borderColor: COLORS.primary + '40',
  },
  avatarText: { fontSize: 36, color: COLORS.white, ...FONTS.bold },
  userName: { fontSize: SIZES.fontXxl, color: COLORS.white, ...FONTS.bold },
  userEmail: { fontSize: SIZES.fontMd, color: COLORS.textMuted, ...FONTS.medium, marginTop: 4 },
  userPhone: { fontSize: SIZES.fontSm, color: COLORS.textMuted, ...FONTS.medium, marginTop: 4 },
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
    padding: 16, marginBottom: 16,
  },
  statItem: { alignItems: 'center' },
  statIcon: { fontSize: 22, marginBottom: 6 },
  statValue: { fontSize: SIZES.fontLg, color: COLORS.white, ...FONTS.bold },
  statLabel: { fontSize: SIZES.fontXs, color: COLORS.textMuted, marginTop: 2 },
  healthRow: {
    flexDirection: 'row', justifyContent: 'space-around',
    backgroundColor: COLORS.darkCard, borderRadius: SIZES.radiusLg,
    borderWidth: 1, borderColor: COLORS.darkBorder,
    padding: 14, marginBottom: 24,
  },
  healthItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  healthIcon: { fontSize: 20 },
  healthValue: { fontSize: SIZES.fontMd, color: COLORS.white, ...FONTS.bold },
  healthLabel: { fontSize: SIZES.fontXs, color: COLORS.textMuted, ...FONTS.medium },
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
