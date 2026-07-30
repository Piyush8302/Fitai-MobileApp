import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Image, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS, SHADOWS } from '../constants/theme';
import { WEEKLY_WORKOUT_PLAN, EXERCISES } from '../constants/data';
import ProgressRing from '../components/ProgressRing';
import GradientCard from '../components/GradientCard';
import api, { ENDPOINTS } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const BANNER_WIDTH = width - 32;

const COMING_SOON_SLIDES = [
  {
    icon: '🧑‍🏫',
    title: 'Personal Mentor',
    desc: '1-on-1 guidance from certified fitness trainers & dieticians',
    badge: 'COMING SOON',
    colors: ['#6C63FF25', COLORS.darkCard],
    accent: '#6C63FF',
  },
  {
    icon: '🥗',
    title: 'Healthy Food Delivery',
    desc: 'Fresh, calorie-counted meals delivered to your doorstep',
    badge: 'COMING SOON',
    colors: ['#4CAF5025', COLORS.darkCard],
    accent: '#4CAF50',
  },
  {
    icon: '🏆',
    title: 'Fitness Challenges',
    desc: 'Compete with friends, win rewards & premium subscriptions',
    badge: 'COMING SOON',
    colors: ['#FF980025', COLORS.darkCard],
    accent: '#FF9800',
  },
];

const HomeScreen = ({ navigation }) => {
  const [user, setUser] = useState({ name: 'User', weight: 70, targetWeight: 65, fitnessGoal: 'weight_loss' });
  const [tracking, setTracking] = useState({ caloriesConsumed: 0, waterIntake: 0, steps: 0, workoutMinutes: 0, caloriesGoal: 2000, waterGoal: 8, stepsGoal: 10000, mealsLogged: [] });
  const [bannerIndex, setBannerIndex] = useState(0);
  const bannerRef = useRef(null);

  // Auto-scroll the coming-soon carousel
  useEffect(() => {
    const timer = setInterval(() => {
      setBannerIndex((prev) => {
        const next = (prev + 1) % COMING_SOON_SLIDES.length;
        bannerRef.current?.scrollTo({ x: next * BANNER_WIDTH, animated: true });
        return next;
      });
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  const loadData = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const savedUser = await AsyncStorage.getItem('user');
      if (token) api.setToken(token);
      if (savedUser) setUser(JSON.parse(savedUser));

      // Load today's tracking
      const trackRes = await api.get(ENDPOINTS.TODAY_TRACKING);
      if (trackRes.success) setTracking(trackRes.data);

      // Load user profile
      const meRes = await api.get(ENDPOINTS.GET_ME);
      if (meRes.success) {
        setUser(meRes.user);
        await AsyncStorage.setItem('user', JSON.stringify(meRes.user));
      }
    } catch (e) { console.log('Home load error:', e); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => { setRefreshing(true); try { await loadData(); } catch (e) {} setRefreshing(false); };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });
    return unsubscribe;
  }, [navigation, loadData]);

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning ☀️';
    if (h < 17) return 'Good Afternoon 👋';
    return 'Good Evening 🌙';
  };

  // Goal-adjusted calorie target (same logic as TrackingScreen getGoalInfo)
  const getGoalAdjustedCalories = () => {
    const dailyCal = user.dailyCalories || tracking.caloriesGoal || 2000;
    const bmr = user.bmr || Math.round(dailyCal / 1.55);
    const safeDeficit = Math.max(bmr + 100, dailyCal - 500);
    switch (user.fitnessGoal) {
      case 'weight_loss':
      case 'fat_loss': return safeDeficit;
      case 'weight_gain': return Math.round(dailyCal + 400);
      case 'muscle_building': return Math.round(dailyCal + 300);
      case 'height_growth':
      case 'gym_workout': return Math.round(dailyCal * 1.1);
      default: return dailyCal;
    }
  };

  const goalLabel = (user.fitnessGoal || 'maintenance').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  const weightDiff = Math.abs((user.weight || 70) - (user.targetWeight || 65));
  // Progress from the weight the user STARTED at (not hardcoded)
  const startW = user.startWeight || user.weight || 70;
  const weightTotal = Math.abs(startW - (user.targetWeight || startW)) || 1;
  const goalPercent = Math.min(100, Math.max(0, Math.round(((weightTotal - weightDiff) / weightTotal) * 100)));
  const adjustedCalGoal = getGoalAdjustedCalories();
  const calPercent = adjustedCalGoal ? Math.round((tracking.caloriesConsumed / adjustedCalGoal) * 100) : 0;
  const overallProgress = Math.round((calPercent + (tracking.waterIntake / tracking.waterGoal * 100) + (tracking.steps / tracking.stepsGoal * 100)) / 3) || 0;
  // Tinted icon on a calm card — the colour identifies the action without
  // four full-bleed gradients competing for attention.
  const quickActions = [
    { id: 'bmi', title: 'BMI', sub: 'Check yours', icon: '⚖️', screen: 'BMI', tint: COLORS.energy },
    { id: 'diet', title: 'Diet', sub: "Today's plan", icon: '🥗', screen: 'Diet', tint: COLORS.active },
    { id: 'workout', title: 'Workout', sub: 'Start now', icon: '🏋️', screen: 'Workout', tint: COLORS.primary },
    { id: 'ai', title: 'AI Chat', sub: 'Ask coach', icon: '🤖', screen: 'AIChat', tint: COLORS.accent },
  ];

  const exploreActions = [
    { id: 'gym', title: 'My Gym', sub: 'Card & check-in', icon: '🎫', screen: 'MyGymCard', tint: COLORS.primary },
    { id: 'articles', title: 'Articles', sub: 'Read up', icon: '📰', screen: 'Articles', tint: COLORS.primaryLight },
    { id: 'food', title: 'Food DB', sub: 'Calories', icon: '🍽', screen: 'FoodDatabase', tint: COLORS.energyLight },
    { id: 'exercises', title: 'Exercises', sub: 'How-to', icon: '💪', screen: 'ExerciseLibrary', tint: COLORS.accent },
    // Gold is reserved for earned things — badges is the one place it belongs.
    { id: 'achievements', title: 'Badges', sub: 'Your wins', icon: '🏆', screen: 'Achievements', tint: COLORS.gold },
  ];

  // Calories are the hero (the ring); the rest read as thin bars beside it —
  // one big number beats four competing tiles.
  const pctOf = (v, g) => (g ? Math.min(100, Math.round((v / g) * 100)) : 0);
  const metrics = [
    { key: 'water', label: 'Water', color: COLORS.accent, value: tracking.waterIntake || 0, goal: tracking.waterGoal || 8, unit: 'glasses' },
    { key: 'steps', label: 'Steps', color: COLORS.primaryLight, value: tracking.steps || 0, goal: tracking.stepsGoal || 10000 },
    { key: 'workout', label: 'Workout', color: COLORS.energyLight, value: tracking.workoutMinutes || 0, goal: tracking.workoutGoal || 45, unit: 'min' },
  ];
  const onTrack = overallProgress >= 60;

  return (
    <LinearGradient colors={COLORS.gradientDark} style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.userName}>{user.name || 'User'}</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.notifBtn} onPress={() => navigation.navigate('Notifications', { scope: 'user' })}>
              <Ionicons name="notifications-outline" size={22} color={COLORS.white} />
              <View style={styles.notifDot} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.avatarBtn} onPress={() => navigation.navigate('EditProfile')}>
              {user.avatar && (user.avatar.startsWith('data:') || user.avatar.startsWith('http')) ? (
                <Image source={{ uri: user.avatar }} style={styles.avatarImg} />
              ) : (
                <Text style={styles.avatarText}>{(user.name || 'U')[0].toUpperCase()}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Today's activity — calorie ring is the hero, everything else supports it */}
        <GradientCard colors={['#6C63FF20', COLORS.darkCard]} style={styles.progressCard}>
          <View style={styles.cardHead}>
            <Text style={styles.cardTitle}>Today's activity</Text>
            <View style={[styles.stateChip, { backgroundColor: onTrack ? COLORS.activeSoft : COLORS.energySoft }]}>
              <Text style={[styles.stateChipText, { color: onTrack ? COLORS.active : COLORS.energy }]}>
                {onTrack ? '🔥 On track' : "Let's move"}
              </Text>
            </View>
          </View>

          <View style={styles.progressRow}>
            <ProgressRing progress={calPercent} size={118} strokeWidth={10} gradient={COLORS.gradientEnergy}>
              <Text style={styles.ringValue}>{(tracking.caloriesConsumed || 0).toLocaleString()}</Text>
              <Text style={styles.ringLabel}>of {adjustedCalGoal.toLocaleString()} kcal</Text>
            </ProgressRing>

            <View style={styles.metrics}>
              {metrics.map((m) => (
                <View key={m.key}>
                  <View style={styles.metricTop}>
                    <View style={styles.metricLabelRow}>
                      <View style={[styles.metricDot, { backgroundColor: m.color }]} />
                      <Text style={styles.metricLabel}>{m.label}</Text>
                    </View>
                    <Text style={styles.metricValue}>
                      {m.value.toLocaleString()}<Text style={styles.metricGoal}> / {m.goal.toLocaleString()}{m.unit ? ` ${m.unit}` : ''}</Text>
                    </Text>
                  </View>
                  <View style={styles.metricTrack}>
                    <View style={[styles.metricFill, { width: `${pctOf(m.value, m.goal)}%`, backgroundColor: m.color }]} />
                  </View>
                </View>
              ))}
            </View>
          </View>
        </GradientCard>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionGrid}>
          {quickActions.map((a) => (
            <TouchableOpacity
              key={a.id}
              style={styles.actionCard}
              onPress={() => navigation.navigate(a.screen)}
              activeOpacity={0.85}
            >
              <View style={[styles.actionChip, { backgroundColor: a.tint + '26' }]}>
                <Text style={{ fontSize: 22 }}>{a.icon}</Text>
              </View>
              <View style={styles.actionText}>
                <Text style={styles.actionTitle} numberOfLines={1}>{a.title}</Text>
                <Text style={styles.actionSub} numberOfLines={1}>{a.sub}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Explore Section */}
        <Text style={styles.sectionTitle}>Explore</Text>
        <View style={styles.actionGrid}>
          {exploreActions.map((a) => (
            <TouchableOpacity
              key={a.id}
              style={styles.actionCard}
              onPress={() => navigation.navigate(a.screen)}
              activeOpacity={0.85}
            >
              <View style={[styles.actionChip, { backgroundColor: a.tint + '26' }]}>
                <Text style={{ fontSize: 22 }}>{a.icon}</Text>
              </View>
              <View style={styles.actionText}>
                <Text style={styles.actionTitle} numberOfLines={1}>{a.title}</Text>
                <Text style={styles.actionSub} numberOfLines={1}>{a.sub}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Current Goal */}
        <GradientCard colors={['#FF6B6B15', COLORS.darkCard]} style={styles.goalCard}>
          <View style={styles.goalHeader}>
            <Text style={styles.cardTitle}>Current Goal</Text>
            <View style={styles.goalBadge}>
              <Text style={styles.goalBadgeText}>{goalLabel}</Text>
            </View>
          </View>
          <View style={styles.goalStats}>
            <View style={styles.goalStat}>
              <Text style={styles.goalStatValue}>{user.weight || 70} kg</Text>
              <Text style={styles.goalStatLabel}>Current</Text>
            </View>
            <View style={styles.goalArrow}>
              <Text style={styles.goalArrowText}>→</Text>
            </View>
            <View style={styles.goalStat}>
              <Text style={[styles.goalStatValue, { color: COLORS.success }]}>{user.targetWeight || 65} kg</Text>
              <Text style={styles.goalStatLabel}>Target</Text>
            </View>
            <View style={styles.goalStat}>
              <Text style={[styles.goalStatValue, { color: COLORS.warning }]}>{weightDiff} kg</Text>
              <Text style={styles.goalStatLabel}>To Go</Text>
            </View>
          </View>
          <View style={styles.goalProgress}>
            <View style={styles.goalProgressBar}>
              <LinearGradient colors={COLORS.gradient2} style={[styles.goalProgressFill, { width: `${goalPercent}%` }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
            </View>
            <Text style={styles.goalPercent}>{goalPercent}%</Text>
          </View>
        </GradientCard>

        {/* Today's Workout - Dynamic */}
        <Text style={styles.sectionTitle}>Today's Workout</Text>
        {(() => {
          const dayIndex = new Date().getDay();
          const dayMap = [6, 0, 1, 2, 3, 4, 5];
          const todayPlan = WEEKLY_WORKOUT_PLAN[dayMap[dayIndex]];
          const focusToCategory = {
            'Chest + Triceps': 'chest', 'Back + Biceps': 'back', 'Legs + Core': 'legs',
            'Shoulders + Arms': 'shoulders', 'Cardio + Abs': 'cardio', 'Full Body': 'fullbody',
          };
          const catId = focusToCategory[todayPlan.focus];
          const exercises = catId && EXERCISES[catId] ? EXERCISES[catId].slice(0, 4).map(e => e.name) : [];
          const isRest = todayPlan.focus === 'Rest Day';
          return (
            <GradientCard onPress={() => navigation.navigate('Workout')} style={styles.workoutCard}>
              <View style={styles.workoutHeader}>
                <View>
                  <Text style={styles.workoutTitle}>{todayPlan.focus} {todayPlan.icon}</Text>
                  <Text style={styles.workoutSub}>{todayPlan.day} {isRest ? '• Recovery & Stretch' : `• ${exercises.length + 4} exercises • 45 min`}</Text>
                </View>
                {!isRest && (
                  <TouchableOpacity style={styles.startBtn} onPress={() => navigation.navigate('Workout')}>
                    <LinearGradient colors={COLORS.gradient1} style={styles.startBtnGrad}>
                      <Ionicons name="play" size={18} color={COLORS.onAccent} />
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </View>
              {!isRest && exercises.length > 0 && (
                <View style={styles.workoutExercises}>
                  {exercises.map((ex, i) => (
                    <View key={i} style={styles.exerciseChip}>
                      <Text style={styles.exerciseChipText}>{ex}</Text>
                    </View>
                  ))}
                </View>
              )}
              {isRest && (
                <Text style={{ fontSize: SIZES.fontSm, color: COLORS.textMuted, ...FONTS.medium, marginTop: 8 }}>
                  Take it easy today. Light stretching, yoga, or a short walk recommended.
                </Text>
              )}
            </GradientCard>
          );
        })()}

        {/* Today's Meals - Real Data */}
        <Text style={styles.sectionTitle}>Today's Meals</Text>
        <View style={styles.mealRow}>
          {(() => {
            const mealTypes = ['breakfast', 'lunch', 'dinner'];
            const mealIcons = { breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍪' };
            const logged = tracking?.mealsLogged || [];
            return mealTypes.map((type, i) => {
              const found = logged.find(m => m.mealType === type);
              return (
                <TouchableOpacity key={i} style={styles.mealCard} onPress={() => navigation.navigate('Tracking')}>
                  <LinearGradient colors={[COLORS.darkCard, COLORS.darkSurface]} style={styles.mealGradient}>
                    <Text style={styles.mealIcon}>{mealIcons[type]}</Text>
                    <Text style={styles.mealTime}>{type.charAt(0).toUpperCase() + type.slice(1)}</Text>
                    <Text style={styles.mealName} numberOfLines={2}>{found ? (found.items?.map(it => it.name).join(', ') || 'Logged') : 'Not yet'}</Text>
                    <Text style={styles.mealCal}>{found ? `${found.totalCalories} kcal` : '-- kcal'}</Text>
                    {found && (
                      <View style={styles.doneBadge}>
                        <Ionicons name="checkmark" size={12} color={COLORS.white} />
                      </View>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              );
            });
          })()}
        </View>

        {/* Motivational Quote */}
        <GradientCard colors={['#9C27B015', COLORS.darkCard]} style={styles.quoteCard}>
          <Text style={styles.quoteIcon}>💪</Text>
          <Text style={styles.quoteText}>"The only bad workout is the one that didn't happen."</Text>
          <Text style={styles.quoteAuthor}>— Daily Motivation</Text>
        </GradientCard>

        {/* ===== COMING SOON CAROUSEL ===== */}
        <Text style={styles.sectionTitle}>✨ What's Next</Text>
        <View style={styles.bannerWrap}>
          <ScrollView
            ref={bannerRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            snapToInterval={BANNER_WIDTH}
            decelerationRate="fast"
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / BANNER_WIDTH);
              setBannerIndex(idx);
            }}
          >
            {COMING_SOON_SLIDES.map((slide, i) => (
              <View key={i} style={{ width: BANNER_WIDTH }}>
                <LinearGradient colors={slide.colors} style={styles.bannerCard}>
                  <View style={styles.bannerLeft}>
                    <View style={[styles.bannerBadge, { backgroundColor: slide.accent + '25', borderColor: slide.accent + '50' }]}>
                      <Text style={[styles.bannerBadgeText, { color: slide.accent }]}>{slide.badge}</Text>
                    </View>
                    <Text style={styles.bannerTitle}>{slide.title}</Text>
                    <Text style={styles.bannerDesc}>{slide.desc}</Text>
                  </View>
                  <View style={[styles.bannerIconWrap, { backgroundColor: slide.accent + '20' }]}>
                    <Text style={styles.bannerIcon}>{slide.icon}</Text>
                  </View>
                </LinearGradient>
              </View>
            ))}
          </ScrollView>
          {/* Dots */}
          <View style={styles.bannerDots}>
            {COMING_SOON_SLIDES.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.bannerDot,
                  bannerIndex === i && { backgroundColor: COLORS.primary, width: 18 },
                ]}
              />
            ))}
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingTop: 55 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  greeting: { fontSize: SIZES.fontMd, color: COLORS.textMuted, ...FONTS.medium },
  userName: { fontSize: SIZES.fontXxl, color: COLORS.white, ...FONTS.bold, marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  notifBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.darkCard, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.darkBorder,
  },
  notifDot: {
    position: 'absolute', top: 10, right: 10,
    width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.secondary,
  },
  avatarBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
  },
  avatarImg: { width: 44, height: 44, borderRadius: 22 },
  avatarText: { fontSize: SIZES.fontLg, color: COLORS.onAccent, ...FONTS.bold },
  progressCard: { marginBottom: 24 },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  cardTitle: { fontSize: SIZES.fontLg, color: COLORS.white, ...FONTS.bold },
  stateChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: SIZES.radiusFull },
  stateChipText: { fontSize: SIZES.fontXs, ...FONTS.bold },
  progressRow: { flexDirection: 'row', alignItems: 'center' },
  // Ring centre — the day's headline number
  ringValue: { fontSize: 25, color: COLORS.white, ...FONTS.extraBold, letterSpacing: -0.5 },
  ringLabel: { fontSize: 10, color: COLORS.textMuted, ...FONTS.medium, marginTop: 2 },
  // Supporting metrics as thin bars
  metrics: { flex: 1, marginLeft: 18, gap: 14 },
  metricTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  metricLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  metricDot: { width: 8, height: 8, borderRadius: 4 },
  metricLabel: { fontSize: SIZES.fontSm, color: COLORS.white, ...FONTS.semiBold },
  metricValue: { fontSize: SIZES.fontSm, color: COLORS.white, ...FONTS.bold },
  metricGoal: { color: COLORS.textMuted, ...FONTS.medium },
  metricTrack: { height: 6, borderRadius: SIZES.radiusFull, backgroundColor: COLORS.trackBg, overflow: 'hidden' },
  metricFill: { height: '100%', borderRadius: SIZES.radiusFull },
  sectionTitle: { fontSize: SIZES.fontXl, color: COLORS.white, ...FONTS.bold, marginBottom: 14, marginTop: 8 },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  actionCard: {
    width: '47%', flexGrow: 1, borderRadius: 18,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, paddingHorizontal: 13,
    backgroundColor: COLORS.darkCard,
    borderWidth: 1, borderColor: COLORS.darkBorder,
    ...SHADOWS.small,
  },
  actionChip: {
    width: 42, height: 42, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  actionText: { flex: 1 },
  actionTitle: { fontSize: SIZES.fontMd, color: COLORS.white, ...FONTS.bold },
  actionSub: { fontSize: 10.5, color: COLORS.textMuted, ...FONTS.medium, marginTop: 1 },
  goalCard: { marginBottom: 24 },
  goalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  goalBadge: { backgroundColor: COLORS.secondary + '20', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  goalBadgeText: { fontSize: SIZES.fontXs, color: COLORS.secondary, ...FONTS.bold },
  goalStats: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginBottom: 16 },
  goalStat: { alignItems: 'center' },
  goalStatValue: { fontSize: SIZES.fontXl, color: COLORS.white, ...FONTS.bold },
  goalStatLabel: { fontSize: SIZES.fontXs, color: COLORS.textMuted, marginTop: 4 },
  goalArrow: { paddingHorizontal: 8 },
  goalArrowText: { fontSize: 24, color: COLORS.textMuted },
  goalProgress: { flexDirection: 'row', alignItems: 'center' },
  goalProgressBar: { flex: 1, height: 8, backgroundColor: COLORS.textMuted + '30', borderRadius: 4, overflow: 'hidden' },
  goalProgressFill: { height: '100%', borderRadius: 4 },
  goalPercent: { fontSize: SIZES.fontSm, color: COLORS.secondary, ...FONTS.bold, marginLeft: 10 },
  workoutCard: { marginBottom: 24 },
  workoutHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  workoutTitle: { fontSize: SIZES.fontLg, color: COLORS.white, ...FONTS.bold },
  workoutSub: { fontSize: SIZES.fontSm, color: COLORS.textMuted, marginTop: 4 },
  startBtn: { borderRadius: 20, overflow: 'hidden' },
  startBtnGrad: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  workoutExercises: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  exerciseChip: {
    backgroundColor: COLORS.primary + '15', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  exerciseChipText: { fontSize: SIZES.fontSm, color: COLORS.primaryLight, ...FONTS.medium },
  mealRow: { flexDirection: 'row', gap: 10, marginBottom: 24, alignItems: 'stretch' },
  mealCard: { flex: 1, borderRadius: SIZES.radius, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.darkBorder },
  mealGradient: { flex: 1, padding: 12, alignItems: 'center', justifyContent: 'center', borderRadius: SIZES.radius, minHeight: 112 },
  mealIcon: { fontSize: 26, marginBottom: 6 },
  mealTime: { fontSize: SIZES.fontXs, color: COLORS.textMuted, ...FONTS.medium },
  mealName: { fontSize: SIZES.fontSm, color: COLORS.white, ...FONTS.semiBold, marginTop: 3, textAlign: 'center' },
  mealCal: { fontSize: SIZES.fontXs, color: COLORS.primary, ...FONTS.bold, marginTop: 3 },
  doneBadge: {
    position: 'absolute', top: 8, right: 8,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: COLORS.success, alignItems: 'center', justifyContent: 'center',
  },
  quoteCard: { marginBottom: 16 },
  quoteIcon: { fontSize: 32, marginBottom: 8, alignSelf: 'center' },
  quoteText: { fontSize: SIZES.fontMd, color: COLORS.textSecondary, ...FONTS.medium, textAlign: 'center', lineHeight: 22, fontStyle: 'italic', alignSelf: 'center' },
  quoteAuthor: { fontSize: SIZES.fontSm, color: COLORS.textMuted, marginTop: 8, alignSelf: 'center' },

  // Coming Soon Carousel
  bannerWrap: { marginBottom: 8 },
  bannerCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: SIZES.radiusLg, padding: 18, minHeight: 110,
    borderWidth: 1, borderColor: COLORS.darkBorder,
  },
  bannerLeft: { flex: 1, paddingRight: 12 },
  bannerBadge: {
    alignSelf: 'flex-start', borderRadius: 10, borderWidth: 1,
    paddingHorizontal: 8, paddingVertical: 3, marginBottom: 8,
  },
  bannerBadgeText: { fontSize: 9, ...FONTS.bold, letterSpacing: 1.2 },
  bannerTitle: { fontSize: SIZES.fontLg, color: COLORS.white, ...FONTS.bold, marginBottom: 4 },
  bannerDesc: { fontSize: SIZES.fontXs, color: COLORS.textMuted, ...FONTS.medium, lineHeight: 17 },
  bannerIconWrap: {
    width: 60, height: 60, borderRadius: 30,
    alignItems: 'center', justifyContent: 'center',
  },
  bannerIcon: { fontSize: 30 },
  bannerDots: {
    flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 10,
  },
  bannerDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: COLORS.darkBorder,
  },
});

export default HomeScreen;
