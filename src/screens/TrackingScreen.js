import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS } from '../constants/theme';
import Header from '../components/Header';
import GradientCard from '../components/GradientCard';
import ProgressRing from '../components/ProgressRing';
import api, { ENDPOINTS } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const TrackingScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('daily');
  const [mood, setMood] = useState(null);
  const [tracking, setTracking] = useState({});

  const loadTracking = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) api.setToken(token);
      const res = await api.get(ENDPOINTS.TODAY_TRACKING);
      if (res.success) setTracking(res.data);
    } catch (e) { console.log('Tracking load error:', e); }
  }, []);

  useEffect(() => { loadTracking(); }, [loadTracking]);

  const addWater = async () => {
    try {
      const res = await api.post(ENDPOINTS.ADD_WATER, { glasses: 1 });
      if (res.success) {
        setTracking(prev => ({ ...prev, waterIntake: res.data.waterIntake }));
      }
    } catch (e) { console.log('Water error:', e); }
  };

  const logMood = async (selectedMood) => {
    setMood(selectedMood);
    try {
      await api.post(ENDPOINTS.LOG_TRACKING, { mood: selectedMood });
    } catch (e) { console.log('Mood error:', e); }
  };

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weekProgress = [85, 72, 90, 65, 78, 0, 0];

  return (
    <LinearGradient colors={COLORS.gradientDark} style={styles.container}>
      <Header title="Health Tracking" subtitle="Monitor Your Progress" onBack={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Tab Selector */}
        <View style={styles.tabs}>
          {['daily', 'weekly', 'monthly'].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Daily Stats Summary */}
        <View style={styles.statsRow}>
          {[
            { icon: '🔥', label: 'Calories', value: '1,450', target: '2,100', color: COLORS.secondary, progress: 69 },
            { icon: '💧', label: 'Water', value: '6', target: '8 glass', color: COLORS.accent, progress: 75 },
            { icon: '👟', label: 'Steps', value: '5.2K', target: '10K', color: COLORS.success, progress: 52 },
          ].map((s, i) => (
            <View key={i} style={styles.statCardSmall}>
              <LinearGradient colors={[s.color + '15', COLORS.darkCard]} style={styles.statGradSmall}>
                <ProgressRing progress={s.progress} size={60} strokeWidth={6} color={s.color} value={s.value} />
                <Text style={styles.statLabel}>{s.label}</Text>
                <Text style={styles.statTarget}>{s.target}</Text>
              </LinearGradient>
            </View>
          ))}
        </View>

        {/* Weight Tracker */}
        <Text style={styles.sectionTitle}>⚖️ Weight Progress</Text>
        <GradientCard colors={['#6C63FF15', '#1A1A2E']}>
          <View style={styles.weightRow}>
            <View style={styles.weightInfo}>
              <Text style={styles.weightCurrent}>70.2 kg</Text>
              <Text style={styles.weightChange}>-0.3 kg this week</Text>
            </View>
            <View style={styles.weightTarget}>
              <Text style={styles.weightTargetLabel}>Target</Text>
              <Text style={styles.weightTargetValue}>65 kg</Text>
            </View>
          </View>
          {/* Simple Chart */}
          <View style={styles.chart}>
            {['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Now'].map((w, i) => {
              const heights = [72, 71.5, 71, 70.5, 70.2];
              const h = ((heights[i] - 65) / 10) * 100;
              return (
                <View key={i} style={styles.chartCol}>
                  <View style={[styles.chartBar, { height: h, backgroundColor: i === 4 ? COLORS.primary : COLORS.primary + '40' }]} />
                  <Text style={styles.chartLabel}>{w}</Text>
                  <Text style={styles.chartValue}>{heights[i]}</Text>
                </View>
              );
            })}
          </View>
        </GradientCard>

        {/* Weekly Progress Bars */}
        <Text style={styles.sectionTitle}>📊 Weekly Activity</Text>
        <GradientCard>
          {weekDays.map((day, i) => (
            <View key={i} style={styles.weekRow}>
              <Text style={[styles.weekDay, i < 5 && { color: COLORS.white }]}>{day}</Text>
              <View style={styles.weekBar}>
                <LinearGradient
                  colors={weekProgress[i] > 0 ? COLORS.gradient1 : [COLORS.darkBorder, COLORS.darkBorder]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.weekFill, { width: `${weekProgress[i]}%` }]}
                />
              </View>
              <Text style={styles.weekPercent}>{weekProgress[i]}%</Text>
            </View>
          ))}
        </GradientCard>

        {/* Sleep Tracker */}
        <Text style={styles.sectionTitle}>😴 Sleep Tracker</Text>
        <GradientCard colors={['#9C27B015', '#1A1A2E']}>
          <View style={styles.sleepRow}>
            <ProgressRing progress={87} size={90} strokeWidth={8} color="#9C27B0" value="7h" label="of 8h" />
            <View style={styles.sleepInfo}>
              <View style={styles.sleepItem}>
                <Text style={styles.sleepLabel}>Bedtime</Text>
                <Text style={styles.sleepValue}>11:00 PM</Text>
              </View>
              <View style={styles.sleepItem}>
                <Text style={styles.sleepLabel}>Wake Up</Text>
                <Text style={styles.sleepValue}>6:00 AM</Text>
              </View>
              <View style={styles.sleepItem}>
                <Text style={styles.sleepLabel}>Quality</Text>
                <Text style={[styles.sleepValue, { color: COLORS.success }]}>Good</Text>
              </View>
            </View>
          </View>
        </GradientCard>

        {/* Workout Completion */}
        <Text style={styles.sectionTitle}>🏋️ Workout Log</Text>
        <GradientCard>
          {[
            { day: 'Today', workout: 'Chest + Triceps', duration: '45 min', cal: 350, done: true },
            { day: 'Yesterday', workout: 'Back + Biceps', duration: '50 min', cal: 380, done: true },
            { day: 'Mon', workout: 'Legs + Core', duration: '40 min', cal: 320, done: true },
            { day: 'Sun', workout: 'Rest Day', duration: '-', cal: 0, done: false },
          ].map((w, i) => (
            <View key={i} style={styles.logItem}>
              <View style={[styles.logDot, { backgroundColor: w.done ? COLORS.success : COLORS.textMuted }]} />
              <View style={styles.logInfo}>
                <Text style={styles.logDay}>{w.day}</Text>
                <Text style={styles.logWorkout}>{w.workout}</Text>
              </View>
              <Text style={styles.logDuration}>{w.duration}</Text>
              {w.cal > 0 && <Text style={styles.logCal}>{w.cal} kcal</Text>}
            </View>
          ))}
        </GradientCard>

        {/* Mood Tracker */}
        <Text style={styles.sectionTitle}>😊 How do you feel today?</Text>
        <View style={styles.moodRow}>
          {[
            { emoji: '😊', label: 'Great' },
            { emoji: '🙂', label: 'Good' },
            { emoji: '😐', label: 'Okay' },
            { emoji: '😴', label: 'Tired' },
            { emoji: '😢', label: 'Bad' },
          ].map((m, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.moodBtn, mood === i && styles.moodBtnActive]}
              onPress={() => setMood(i)}
            >
              <Text style={styles.moodEmoji}>{m.emoji}</Text>
              <Text style={[styles.moodLabel, mood === i && { color: COLORS.primary }]}>{m.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingBottom: 20 },
  tabs: { flexDirection: 'row', backgroundColor: COLORS.darkCard, borderRadius: SIZES.radius, padding: 4, marginBottom: 20 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: SIZES.radiusSm, alignItems: 'center' },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { fontSize: SIZES.fontSm, color: COLORS.textMuted, ...FONTS.medium },
  tabTextActive: { color: COLORS.white, ...FONTS.bold },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  statCardSmall: { flex: 1, borderRadius: SIZES.radius, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.darkBorder },
  statGradSmall: { padding: 14, alignItems: 'center', borderRadius: SIZES.radius },
  statLabel: { fontSize: SIZES.fontSm, color: COLORS.white, ...FONTS.semiBold, marginTop: 8 },
  statTarget: { fontSize: SIZES.fontXs, color: COLORS.textMuted, marginTop: 2 },
  sectionTitle: { fontSize: SIZES.fontXl, color: COLORS.white, ...FONTS.bold, marginBottom: 14, marginTop: 8 },
  weightRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  weightInfo: {},
  weightCurrent: { fontSize: SIZES.fontTitle, color: COLORS.white, ...FONTS.bold },
  weightChange: { fontSize: SIZES.fontSm, color: COLORS.success, ...FONTS.medium, marginTop: 4 },
  weightTarget: { alignItems: 'flex-end' },
  weightTargetLabel: { fontSize: SIZES.fontSm, color: COLORS.textMuted },
  weightTargetValue: { fontSize: SIZES.fontXl, color: COLORS.primary, ...FONTS.bold },
  chart: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 120 },
  chartCol: { alignItems: 'center', flex: 1 },
  chartBar: { width: 24, borderRadius: 12, minHeight: 10, marginBottom: 6 },
  chartLabel: { fontSize: SIZES.fontXs, color: COLORS.textMuted, marginBottom: 2 },
  chartValue: { fontSize: SIZES.fontXs, color: COLORS.primary, ...FONTS.bold },
  weekRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  weekDay: { width: 36, fontSize: SIZES.fontSm, color: COLORS.textMuted, ...FONTS.medium },
  weekBar: { flex: 1, height: 8, backgroundColor: COLORS.darkBorder, borderRadius: 4, overflow: 'hidden', marginHorizontal: 10 },
  weekFill: { height: '100%', borderRadius: 4 },
  weekPercent: { width: 36, fontSize: SIZES.fontSm, color: COLORS.textSecondary, ...FONTS.bold, textAlign: 'right' },
  sleepRow: { flexDirection: 'row', alignItems: 'center' },
  sleepInfo: { flex: 1, marginLeft: 20 },
  sleepItem: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  sleepLabel: { fontSize: SIZES.fontSm, color: COLORS.textMuted, ...FONTS.medium },
  sleepValue: { fontSize: SIZES.fontMd, color: COLORS.white, ...FONTS.semiBold },
  logItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  logDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  logInfo: { flex: 1 },
  logDay: { fontSize: SIZES.fontSm, color: COLORS.textMuted },
  logWorkout: { fontSize: SIZES.fontMd, color: COLORS.white, ...FONTS.medium },
  logDuration: { fontSize: SIZES.fontSm, color: COLORS.textSecondary, ...FONTS.medium, marginRight: 10 },
  logCal: { fontSize: SIZES.fontSm, color: COLORS.secondary, ...FONTS.bold },
  moodRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  moodBtn: {
    alignItems: 'center', paddingVertical: 14, paddingHorizontal: 10,
    backgroundColor: COLORS.darkCard, borderRadius: SIZES.radius,
    borderWidth: 1.5, borderColor: COLORS.darkBorder, flex: 1, marginHorizontal: 4,
  },
  moodBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '10' },
  moodEmoji: { fontSize: 28, marginBottom: 6 },
  moodLabel: { fontSize: SIZES.fontXs, color: COLORS.textMuted, ...FONTS.medium },
});

export default TrackingScreen;
