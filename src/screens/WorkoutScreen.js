import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image,
  ActivityIndicator, Vibration, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS, SHADOWS } from '../constants/theme';
import { WEEKLY_WORKOUT_PLAN, HOME_WEEKLY_PLAN } from '../constants/data';
import Header from '../components/Header';
import api, { ENDPOINTS } from '../config/api';

// Muscle ids come from the API; these are just the labels and icons we show.
// Anything the API returns that isn't listed still renders, with a default icon.
const MUSCLE_META = {
  chest: { label: 'Chest', icon: '🏋️' },
  back: { label: 'Back', icon: '🚣' },
  legs: { label: 'Legs', icon: '🏃' },
  shoulders: { label: 'Shoulders', icon: '💪' },
  biceps: { label: 'Biceps', icon: '💪' },
  triceps: { label: 'Triceps', icon: '🔥' },
  abs: { label: 'Abs', icon: '⚡' },
  glutes: { label: 'Glutes', icon: '🍑' },
  forearms: { label: 'Forearms', icon: '✊' },
};
const metaFor = (id) => MUSCLE_META[id] || { label: id.charAt(0).toUpperCase() + id.slice(1), icon: '🏋️' };

const DIFF_COLOR = {
  beginner: COLORS.success,
  intermediate: COLORS.warning,
  advanced: COLORS.error,
};

const restOptions = [
  { label: '30s', value: 30 },
  { label: '60s', value: 60 },
  { label: '90s', value: 90 },
  { label: '2m', value: 120 },
];

const WorkoutScreen = ({ navigation }) => {
  const [workoutType, setWorkoutType] = useState('gym');
  const [selectedMuscle, setSelectedMuscle] = useState('chest');
  const [selectedDay, setSelectedDay] = useState(0);

  // Everything below now comes from the API rather than a bundled array.
  const [muscles, setMuscles] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isGym = workoutType === 'gym';
  const weeklyPlan = isGym ? WEEKLY_WORKOUT_PLAN : HOME_WEEKLY_PLAN;

  // ===== REST TIMER =====
  const [restTime, setRestTime] = useState(90);
  const [timeLeft, setTimeLeft] = useState(90);
  const [isRunning, setIsRunning] = useState(false);
  const timerRef = useRef(null);

  // ── data ──────────────────────────────────────────────────────────────
  const loadMuscles = useCallback(async () => {
    try {
      const res = await api.get(ENDPOINTS.EXERCISES_MUSCLES);
      if (res.success && Array.isArray(res.data)) setMuscles(res.data);
    } catch (e) { /* the exercise list below shows its own empty state */ }
  }, []);

  const loadExercises = useCallback(async () => {
    setLoading(true);
    try {
      // Home mode is the same catalogue filtered to what needs no equipment.
      const params = { muscle: selectedMuscle, limit: 30 };
      if (!isGym) params.equipment = 'bodyweight';
      const res = await api.get(ENDPOINTS.EXERCISES, params);
      setExercises(res.success && Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setExercises([]);
    } finally {
      setLoading(false);
    }
  }, [selectedMuscle, isGym]);

  useEffect(() => { loadMuscles(); }, [loadMuscles]);
  useEffect(() => { loadExercises(); }, [loadExercises]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadMuscles(), loadExercises()]);
    setRefreshing(false);
  };

  // Picking a day jumps to the muscle that day trains.
  const focusToMuscle = (focus) => {
    const f = (focus || '').toLowerCase();
    if (f.includes('chest')) return 'chest';
    if (f.includes('back')) return 'back';
    if (f.includes('leg') || f.includes('lower')) return 'legs';
    if (f.includes('shoulder') || f.includes('arm') || f.includes('upper')) return 'shoulders';
    if (f.includes('ab') || f.includes('core') || f.includes('cardio')) return 'abs';
    return null;
  };

  const handleDaySelect = (index) => {
    setSelectedDay(index);
    const m = focusToMuscle(weeklyPlan[index]?.focus);
    if (m) setSelectedMuscle(m);
  };

  useEffect(() => { setSelectedDay(0); }, [workoutType]);

  // ── timer ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setIsRunning(false);
            Vibration.vibrate([0, 500, 200, 500]);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRunning]);

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const selectRestTime = (seconds) => {
    if (isRunning) { clearInterval(timerRef.current); setIsRunning(false); }
    setRestTime(seconds); setTimeLeft(seconds);
  };
  const toggleTimer = () => {
    if (timeLeft === 0) { setTimeLeft(restTime); setIsRunning(true); }
    else setIsRunning(!isRunning);
  };
  const resetTimer = () => { clearInterval(timerRef.current); setIsRunning(false); setTimeLeft(restTime); };

  return (
    <LinearGradient colors={COLORS.gradientDark} style={styles.container}>
      <Header title="Workout" navigation={navigation} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.energy} colors={[COLORS.energy]} />
        }
      >
        {/* ===== GYM / HOME ===== */}
        <View style={styles.toggle}>
          {[
            { key: 'gym', label: 'Gym', icon: 'barbell-outline' },
            { key: 'home', label: 'Home', icon: 'home-outline' },
          ].map((t) => {
            const on = workoutType === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                style={[styles.toggleBtn, on && styles.toggleBtnOn]}
                onPress={() => setWorkoutType(t.key)}
                activeOpacity={0.85}
              >
                <Ionicons name={t.icon} size={17} color={on ? COLORS.onEnergy : COLORS.textMuted} />
                <Text style={[styles.toggleText, on && styles.toggleTextOn]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ===== WEEKLY SCHEDULE ===== */}
        <Text style={styles.sectionTitle}>Weekly schedule</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.railScroll} contentContainerStyle={styles.rail}>
          {weeklyPlan.map((day, i) => {
            const on = i === selectedDay;
            return (
              <TouchableOpacity
                key={i}
                style={[styles.dayCard, on && styles.dayCardOn]}
                onPress={() => handleDaySelect(i)}
                activeOpacity={0.85}
              >
                <Text style={styles.dayIcon}>{day.icon}</Text>
                <Text style={[styles.dayName, on && { color: COLORS.onEnergy }]}>{day.day.slice(0, 3)}</Text>
                <Text style={[styles.dayFocus, on && { color: 'rgba(10,11,13,0.75)' }]} numberOfLines={2}>
                  {day.focus}
                </Text>
                {/* Slot is always here so every card is the same height */}
                <View style={styles.dayBadgeSlot}>
                  {on && (
                    <View style={styles.dayBadge}>
                      <Text style={styles.dayBadgeText}>{i === 0 ? 'TODAY' : 'PICKED'}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ===== MUSCLE GROUPS (from the API) ===== */}
        <Text style={styles.sectionTitle}>Muscle groups</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.railScroll} contentContainerStyle={styles.rail}>
          {muscles.map((m) => {
            const on = selectedMuscle === m.name;
            const meta = metaFor(m.name);
            return (
              <TouchableOpacity
                key={m.name}
                style={[styles.chip, on && styles.chipOn]}
                onPress={() => setSelectedMuscle(m.name)}
                activeOpacity={0.85}
              >
                <Text style={styles.chipIcon}>{meta.icon}</Text>
                <Text style={[styles.chipText, on && { color: COLORS.onEnergy }]}>{meta.label}</Text>
                <Text style={[styles.chipCount, on && { color: 'rgba(10,11,13,0.65)' }]}>{m.count}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ===== EXERCISES ===== */}
        <View style={styles.listHead}>
          <Text style={styles.sectionTitle}>{metaFor(selectedMuscle).label} exercises</Text>
          {!loading && <Text style={styles.listCount}>{exercises.length}</Text>}
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={COLORS.energy} />
          </View>
        ) : exercises.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>
              {isGym ? 'No exercises found for this muscle.' : 'No equipment-free exercises here — try another muscle.'}
            </Text>
          </View>
        ) : (
          exercises.map((ex) => (
            <TouchableOpacity
              key={ex.id}
              style={styles.exCard}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('GymExercise', { exercise: ex })}
            >
              {/* Illustration comes from the API; falls back to an icon tile */}
              {ex.images?.[0] ? (
                <Image source={{ uri: ex.images[0] }} style={styles.exImage} resizeMode="cover" />
              ) : (
                <View style={[styles.exImage, styles.exImageFallback]}>
                  <Text style={{ fontSize: 26 }}>{metaFor(ex.muscle).icon}</Text>
                </View>
              )}

              <View style={styles.exBody}>
                <Text style={styles.exName} numberOfLines={2}>{ex.name}</Text>

                <View style={styles.exMetaRow}>
                  <Text style={styles.exMeta}>{ex.sets} × {ex.reps}</Text>
                  <View style={styles.exDot} />
                  <Text style={styles.exMeta}>{ex.calories_per_set} kcal/set</Text>
                </View>

                <View style={styles.exTags}>
                  <View style={styles.tag}>
                    <Text style={styles.tagText}>{String(ex.equipment || 'other').replace(/_/g, ' ')}</Text>
                  </View>
                  <View style={[styles.tag, { backgroundColor: (DIFF_COLOR[ex.difficulty] || COLORS.textMuted) + '22' }]}>
                    <Text style={[styles.tagText, { color: DIFF_COLOR[ex.difficulty] || COLORS.textMuted }]}>
                      {ex.difficulty}
                    </Text>
                  </View>
                </View>
              </View>

              <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          ))
        )}

        {/* ===== REST TIMER ===== */}
        <Text style={[styles.sectionTitle, { marginTop: 26 }]}>Rest timer</Text>
        <View style={styles.timerCard}>
          <Text style={[styles.timerValue, isRunning && { color: COLORS.energy }, timeLeft === 0 && { color: COLORS.success }]}>
            {formatTime(timeLeft)}
          </Text>
          <Text style={styles.timerLabel}>
            {timeLeft === 0 ? 'Rest complete' : isRunning ? 'Resting…' : 'Rest between sets'}
          </Text>

          <View style={styles.timerTrack}>
            <View
              style={[
                styles.timerFill,
                { width: `${(timeLeft / restTime) * 100}%`, backgroundColor: timeLeft === 0 ? COLORS.success : COLORS.energy },
              ]}
            />
          </View>

          <View style={styles.timerBtns}>
            {restOptions.map((opt) => {
              const on = restTime === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.timerBtn, on && styles.timerBtnOn]}
                  onPress={() => selectRestTime(opt.value)}
                >
                  <Text style={[styles.timerBtnText, on && { color: COLORS.onEnergy }]}>{opt.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity style={styles.startBtn} onPress={toggleTimer} activeOpacity={0.85}>
            <Ionicons name={timeLeft === 0 ? 'refresh' : isRunning ? 'pause' : 'play'} size={20} color={COLORS.onEnergy} />
            <Text style={styles.startBtnText}>
              {timeLeft === 0 ? 'Restart' : isRunning ? 'Pause' : 'Start timer'}
            </Text>
          </TouchableOpacity>

          {(isRunning || timeLeft !== restTime) && (
            <TouchableOpacity style={styles.resetBtn} onPress={resetTimer}>
              <Ionicons name="refresh-outline" size={16} color={COLORS.textMuted} />
              <Text style={styles.resetText}>Reset</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingTop: 8 },

  sectionTitle: { fontSize: SIZES.fontLg, color: COLORS.white, ...FONTS.bold, marginBottom: 12, letterSpacing: -0.3 },

  // Gym / Home
  toggle: {
    flexDirection: 'row', gap: 6, padding: 5, marginBottom: 24,
    backgroundColor: COLORS.darkCard, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.darkBorder,
  },
  toggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 11, borderRadius: 12 },
  toggleBtnOn: { backgroundColor: COLORS.energy },
  toggleText: { fontSize: SIZES.fontMd, color: COLORS.textMuted, ...FONTS.bold },
  toggleTextOn: { color: COLORS.onEnergy },

  // Rails bleed past the page padding so a half-visible item hints at more
  railScroll: { marginHorizontal: -16, marginBottom: 26 },
  rail: { paddingHorizontal: 16, gap: 10 },

  // Day cards — fixed height keeps every card identical
  dayCard: {
    width: 108, height: 132, borderRadius: 18, padding: 12, alignItems: 'center',
    backgroundColor: COLORS.darkCard, borderWidth: 1, borderColor: COLORS.darkBorder,
  },
  dayCardOn: { backgroundColor: COLORS.energy, borderColor: COLORS.energy },
  dayIcon: { fontSize: 22 },
  dayName: { fontSize: SIZES.fontMd, color: COLORS.white, ...FONTS.bold, marginTop: 5 },
  dayFocus: { fontSize: SIZES.fontXs, color: COLORS.textMuted, textAlign: 'center', marginTop: 3, height: 26 },
  dayBadgeSlot: { height: 18, marginTop: 4, justifyContent: 'center' },
  dayBadge: { backgroundColor: COLORS.onEnergy, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  dayBadgeText: { fontSize: 9, color: COLORS.energy, ...FONTS.extraBold, letterSpacing: 0.5 },

  // Muscle chips
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: SIZES.radiusFull,
    backgroundColor: COLORS.darkCard, borderWidth: 1, borderColor: COLORS.darkBorder,
  },
  chipOn: { backgroundColor: COLORS.energy, borderColor: COLORS.energy },
  chipIcon: { fontSize: 14 },
  chipText: { fontSize: SIZES.fontSm, color: COLORS.textSecondary, ...FONTS.bold },
  chipCount: { fontSize: SIZES.fontXs, color: COLORS.textMuted, ...FONTS.semiBold },

  listHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  listCount: { fontSize: SIZES.fontSm, color: COLORS.textMuted, ...FONTS.semiBold, marginBottom: 12 },

  loadingBox: { paddingVertical: 40, alignItems: 'center' },
  emptyBox: {
    padding: 22, borderRadius: 18, alignItems: 'center',
    backgroundColor: COLORS.darkCard, borderWidth: 1, borderColor: COLORS.darkBorder,
  },
  emptyText: { fontSize: SIZES.fontSm, color: COLORS.textMuted, textAlign: 'center' },

  // Exercise row — one shape, repeated
  exCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 10, marginBottom: 10, borderRadius: 18,
    backgroundColor: COLORS.darkCard, borderWidth: 1, borderColor: COLORS.darkBorder,
  },
  exImage: { width: 64, height: 64, borderRadius: 14, backgroundColor: COLORS.darkSurface },
  exImageFallback: { alignItems: 'center', justifyContent: 'center' },
  exBody: { flex: 1 },
  exName: { fontSize: SIZES.fontMd, color: COLORS.white, ...FONTS.bold, lineHeight: 19 },
  exMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 4 },
  exMeta: { fontSize: SIZES.fontXs, color: COLORS.textMuted, ...FONTS.medium },
  exDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: COLORS.textMuted },
  exTags: { flexDirection: 'row', gap: 6, marginTop: 8 },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: SIZES.radiusFull, backgroundColor: COLORS.darkSurface },
  tagText: { fontSize: 10, color: COLORS.textSecondary, ...FONTS.semiBold, textTransform: 'capitalize' },

  // Rest timer
  timerCard: {
    padding: 20, borderRadius: 22, alignItems: 'center',
    backgroundColor: COLORS.darkCard, borderWidth: 1, borderColor: COLORS.darkBorder,
  },
  timerValue: { fontSize: 46, color: COLORS.white, ...FONTS.extraBold, letterSpacing: -1 },
  timerLabel: { fontSize: SIZES.fontSm, color: COLORS.textMuted, ...FONTS.medium, marginTop: 2 },
  timerTrack: { width: '100%', height: 6, borderRadius: SIZES.radiusFull, backgroundColor: COLORS.trackBg, marginTop: 16, overflow: 'hidden' },
  timerFill: { height: '100%', borderRadius: SIZES.radiusFull },
  timerBtns: { flexDirection: 'row', gap: 8, marginTop: 18 },
  timerBtn: {
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: SIZES.radiusFull,
    backgroundColor: COLORS.darkSurface, borderWidth: 1, borderColor: COLORS.darkBorder,
  },
  timerBtnOn: { backgroundColor: COLORS.energy, borderColor: COLORS.energy },
  timerBtnText: { fontSize: SIZES.fontSm, color: COLORS.textSecondary, ...FONTS.bold },
  startBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9,
    width: '100%', paddingVertical: 15, borderRadius: 16, marginTop: 18,
    backgroundColor: COLORS.energy, ...SHADOWS.small,
  },
  startBtnText: { fontSize: SIZES.fontMd, color: COLORS.onEnergy, ...FONTS.extraBold },
  resetBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14 },
  resetText: { fontSize: SIZES.fontSm, color: COLORS.textMuted, ...FONTS.medium },
});

export default WorkoutScreen;
