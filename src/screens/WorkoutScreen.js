import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Vibration } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS, SHADOWS } from '../constants/theme';
import { WORKOUT_CATEGORIES, EXERCISES, WEEKLY_WORKOUT_PLAN, HOME_WORKOUT_CATEGORIES, HOME_EXERCISES, HOME_WEEKLY_PLAN } from '../constants/data';
import Header from '../components/Header';
import GradientCard from '../components/GradientCard';

const { width } = Dimensions.get('window');

const WorkoutScreen = ({ navigation }) => {
  const [selectedCategory, setSelectedCategory] = useState('chest');
  const [workoutType, setWorkoutType] = useState('gym');
  const [selectedDay, setSelectedDay] = useState(0);

  // ===== REST TIMER STATE =====
  const [restTime, setRestTime] = useState(90);
  const [timeLeft, setTimeLeft] = useState(90);
  const [isRunning, setIsRunning] = useState(false);
  const timerRef = useRef(null);

  // Map day focus text to category id
  const focusToCategory = (focus, isGymMode) => {
    const f = focus.toLowerCase();
    if (isGymMode) {
      if (f.includes('chest')) return 'chest';
      if (f.includes('back')) return 'back';
      if (f.includes('leg')) return 'legs';
      if (f.includes('shoulder') || f.includes('arms')) return 'shoulders';
      if (f.includes('cardio') || f.includes('abs')) return 'cardio';
      if (f.includes('full')) return 'fullbody';
      return 'chest';
    } else {
      if (f.includes('upper')) return 'upper';
      if (f.includes('lower')) return 'lower';
      if (f.includes('cardio') || f.includes('core')) return 'cardio';
      if (f.includes('full') || f.includes('hiit')) return 'fullbody';
      if (f.includes('yoga') || f.includes('stretch')) return 'yoga';
      return 'upper';
    }
  };

  // Reset category & day when switching workout type
  useEffect(() => {
    setSelectedDay(0);
    if (workoutType === 'gym') {
      setSelectedCategory('chest');
    } else {
      setSelectedCategory('upper');
    }
  }, [workoutType]);

  // When day is selected, update category to match that day's focus
  const handleDaySelect = (index) => {
    setSelectedDay(index);
    const plan = workoutType === 'gym' ? WEEKLY_WORKOUT_PLAN : HOME_WEEKLY_PLAN;
    const focus = plan[index].focus;
    if (focus.toLowerCase().includes('rest')) return; // Rest day — keep current category
    const cat = focusToCategory(focus, workoutType === 'gym');
    setSelectedCategory(cat);
  };

  // Timer countdown logic
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
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
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const selectRestTime = (seconds) => {
    if (isRunning) {
      clearInterval(timerRef.current);
      setIsRunning(false);
    }
    setRestTime(seconds);
    setTimeLeft(seconds);
  };

  const toggleTimer = () => {
    if (timeLeft === 0) {
      setTimeLeft(restTime);
      setIsRunning(true);
    } else {
      setIsRunning(!isRunning);
    }
  };

  const resetTimer = () => {
    clearInterval(timerRef.current);
    setIsRunning(false);
    setTimeLeft(restTime);
  };

  // ===== DATA BASED ON WORKOUT TYPE =====
  const isGym = workoutType === 'gym';
  const categories = isGym ? WORKOUT_CATEGORIES : HOME_WORKOUT_CATEGORIES;
  const exerciseData = isGym ? EXERCISES : HOME_EXERCISES;
  const weeklyPlan = isGym ? WEEKLY_WORKOUT_PLAN : HOME_WEEKLY_PLAN;
  const exercises = exerciseData[selectedCategory] || exerciseData[Object.keys(exerciseData)[0]];
  const accentColor = isGym ? COLORS.primary : '#4CAF50';

  const restOptions = [
    { label: '30s', value: 30 },
    { label: '60s', value: 60 },
    { label: '90s', value: 90 },
    { label: '120s', value: 120 },
  ];

  return (
    <LinearGradient colors={COLORS.gradientDark} style={styles.container}>
      <Header
        title={isGym ? 'Gym Workout' : 'Home Workout'}
        subtitle={isGym ? 'Equipment-Based Training' : 'No Equipment Needed'}
        onBack={() => navigation.goBack()}
        backIcon={<Ionicons name="body-outline" size={22} color={COLORS.white} />}
      />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ===== WORKOUT TYPE TOGGLE ===== */}
        <View style={styles.toggleRow}>
          {['gym', 'home'].map((type) => {
            const active = workoutType === type;
            const color = type === 'gym' ? COLORS.primary : '#4CAF50';
            return (
              <TouchableOpacity
                key={type}
                style={[
                  styles.toggleBtn,
                  active && { borderColor: color, backgroundColor: color, ...SHADOWS.glow(color) },
                ]}
                onPress={() => setWorkoutType(type)}
              >
                <Ionicons
                  name={type === 'gym' ? 'barbell-outline' : 'home-outline'}
                  size={22}
                  color={active ? COLORS.onAccent : COLORS.textMuted}
                />
                <Text style={[styles.toggleText, active && { color: COLORS.onAccent }]}>
                  {type === 'gym' ? 'Gym Workout' : 'Home Workout'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ===== MODE BANNER ===== */}
        <LinearGradient
          colors={isGym ? ['#6C63FF15', COLORS.darkCard] : ['#4CAF5015', COLORS.darkCard]}
          style={styles.modeBanner}
        >
          <View style={styles.bannerContent}>
            <View style={[styles.bannerIconWrap, { backgroundColor: accentColor + '20' }]}>
              <Ionicons name={isGym ? 'barbell' : 'home'} size={24} color={accentColor} />
            </View>
            <View style={styles.bannerTextWrap}>
              <Text style={[styles.bannerTitle, { color: accentColor }]}>
                {isGym ? 'Gym Mode Active' : 'Home Mode Active'}
              </Text>
              <Text style={styles.bannerSub}>
                {isGym ? 'Equipment & machine based exercises' : 'Bodyweight & minimal equipment exercises'}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* ===== WEEKLY SCHEDULE ===== */}
        <Text style={styles.sectionTitle}>📅 Weekly Schedule</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.weekScroll}>
          {weeklyPlan.map((day, i) => {
            const isSelected = i === selectedDay;
            return (
              <TouchableOpacity
                key={i}
                style={[styles.dayCard, isSelected && { borderColor: day.color, borderWidth: 1.5 }]}
                onPress={() => handleDaySelect(i)}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={isSelected ? [day.color, day.color + 'BB'] : [COLORS.darkCard, COLORS.darkSurface]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={styles.dayGrad}
                >
                  <Text style={styles.dayIcon}>{day.icon}</Text>
                  <Text style={[styles.dayName, isSelected && { color: COLORS.onAccent }]}>{day.day.slice(0, 3)}</Text>
                  <Text style={[styles.dayFocus, isSelected && { color: 'rgba(255,255,255,0.9)' }]}>{day.focus}</Text>
                  {isSelected && (
                    <View style={styles.todayBadge}>
                      <Text style={[styles.todayText, { color: day.color }]}>{i === 0 ? 'Today' : 'Selected'}</Text>
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ===== CATEGORIES ===== */}
        <Text style={styles.sectionTitle}>{isGym ? '💪 Muscle Groups' : '🏃 Body Areas'}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.catChip, selectedCategory === cat.id && { borderColor: cat.color, backgroundColor: cat.color, ...SHADOWS.glow(cat.color) }]}
              onPress={() => setSelectedCategory(cat.id)}
            >
              <Text style={styles.catIcon}>{cat.icon}</Text>
              <Text style={[styles.catText, selectedCategory === cat.id && { color: COLORS.onAccent }]}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ===== EXERCISES LIST ===== */}
        <Text style={styles.sectionTitle}>
          {isGym ? '🏋️' : '🤸'} {categories.find(c => c.id === selectedCategory)?.name} Exercises
        </Text>

        {exercises.map((ex, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.exerciseCard, !isGym && { borderColor: '#4CAF5030' }]}
            onPress={() => navigation.navigate('GymExercise')}
          >
            <LinearGradient
              colors={isGym ? [COLORS.darkCard, COLORS.darkSurface] : [COLORS.darkCard, COLORS.darkSurface]}
              style={styles.exerciseGrad}
            >
              {/* Exercise Header */}
              <View style={styles.exerciseTop}>
                <View style={styles.exerciseHeader}>
                  <View style={styles.exerciseNameRow}>
                    <View style={[styles.exNumberBadge, { backgroundColor: accentColor + '20' }]}>
                      <Text style={[styles.exNumberText, { color: accentColor }]}>{i + 1}</Text>
                    </View>
                    <Text style={styles.exerciseName}>{ex.name}</Text>
                  </View>
                  <View style={[styles.diffBadge, {
                    backgroundColor: ex.difficulty === 'Beginner' ? COLORS.success + '20' :
                      ex.difficulty === 'Intermediate' ? COLORS.warning + '20' : COLORS.secondary + '20'
                  }]}>
                    <Text style={[styles.diffText, {
                      color: ex.difficulty === 'Beginner' ? COLORS.success :
                        ex.difficulty === 'Intermediate' ? COLORS.warning : COLORS.secondary
                    }]}>{ex.difficulty}</Text>
                  </View>
                </View>
                <Text style={styles.exerciseMuscle}>🎯 {ex.muscle}</Text>
              </View>

              {/* Exercise Stats */}
              <View style={styles.exerciseStats}>
                <View style={styles.statItem}>
                  <Ionicons name="repeat-outline" size={14} color={accentColor} />
                  <Text style={styles.statText}>{ex.sets} × {ex.reps}</Text>
                </View>
                <View style={styles.statItem}>
                  <Ionicons name="time-outline" size={14} color={COLORS.accent} />
                  <Text style={styles.statText}>{ex.duration}</Text>
                </View>
                <View style={styles.statItem}>
                  <Ionicons name="flame-outline" size={14} color={COLORS.secondary} />
                  <Text style={styles.statText}>{ex.calories} kcal</Text>
                </View>
              </View>

              {/* Equipment Badge */}
              {ex.equipment && (
                <View style={[styles.equipmentRow, isGym ? styles.equipmentGym : styles.equipmentHome]}>
                  <Ionicons
                    name={isGym ? 'barbell-outline' : (ex.equipment === 'None' ? 'checkmark-circle' : 'construct-outline')}
                    size={14}
                    color={isGym ? COLORS.primary : '#4CAF50'}
                  />
                  <Text style={[styles.equipmentText, { color: isGym ? COLORS.primaryLight : '#81C784' }]}>
                    {isGym ? `Equipment: ${ex.equipment}` : (ex.equipment === 'None' ? 'No Equipment Needed' : `Needs: ${ex.equipment}`)}
                  </Text>
                </View>
              )}

              {/* Tips */}
              <View style={styles.tipRow}>
                <Ionicons name="bulb-outline" size={14} color={COLORS.warning} />
                <Text style={styles.tipText}>{ex.tips}</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        ))}

        {/* ===== REST TIMER (FULLY FUNCTIONAL) ===== */}
        <Text style={styles.sectionTitle}>⏱️ Rest Timer</Text>
        <GradientCard colors={isGym ? ['#6C63FF15', COLORS.darkCard] : ['#4CAF5015', COLORS.darkCard]} style={styles.timerCard}>
          <View style={styles.timerContent}>
            {/* Timer Display */}
            <Text style={[
              styles.timerValue,
              isRunning && { color: accentColor },
              timeLeft === 0 && { color: COLORS.success },
            ]}>
              {formatTime(timeLeft)}
            </Text>
            <Text style={styles.timerLabel}>
              {timeLeft === 0 ? '✅ Rest Complete!' : isRunning ? '⏳ Resting...' : 'Rest Between Sets'}
            </Text>

            {/* Progress Bar */}
            {(isRunning || timeLeft !== restTime) && (
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, {
                  width: `${(timeLeft / restTime) * 100}%`,
                  backgroundColor: timeLeft === 0 ? COLORS.success : accentColor,
                }]} />
              </View>
            )}

            {/* Duration Buttons */}
            <View style={styles.timerBtns}>
              {restOptions.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.timerBtn,
                    restTime === opt.value && { backgroundColor: accentColor + '20', borderWidth: 1, borderColor: accentColor },
                  ]}
                  onPress={() => selectRestTime(opt.value)}
                >
                  <Text style={[styles.timerBtnText, restTime === opt.value && { color: accentColor }]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Start / Pause / Restart Button */}
            <TouchableOpacity style={styles.startTimerBtn} onPress={toggleTimer}>
              <LinearGradient
                colors={isGym ? COLORS.gradient1 : ['#4CAF50', '#2E7D32']}
                style={styles.startTimerGrad}
              >
                <Ionicons
                  name={timeLeft === 0 ? 'refresh' : isRunning ? 'pause' : 'play'}
                  size={24}
                  color={COLORS.white}
                />
                <Text style={styles.startTimerText}>
                  {timeLeft === 0 ? 'Restart' : isRunning ? 'Pause' : 'Start Timer'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Reset Button (shown when timer is modified) */}
            {(isRunning || timeLeft !== restTime) && (
              <TouchableOpacity style={styles.resetBtn} onPress={resetTimer}>
                <Ionicons name="refresh-outline" size={18} color={COLORS.textMuted} />
                <Text style={styles.resetText}>Reset Timer</Text>
              </TouchableOpacity>
            )}
          </View>
        </GradientCard>

        <View style={{ height: 40 }} />
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingBottom: 20 },

  // Toggle
  toggleRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  toggleBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, backgroundColor: COLORS.darkCard, borderRadius: SIZES.radius,
    borderWidth: 1.5, borderColor: COLORS.darkBorder, gap: 8,
  },
  toggleText: { fontSize: SIZES.fontMd, color: COLORS.textMuted, ...FONTS.semiBold },

  // Mode Banner
  modeBanner: {
    borderRadius: SIZES.radius, padding: 14, marginBottom: 20,
    borderWidth: 1, borderColor: COLORS.darkBorder,
  },
  bannerContent: { flexDirection: 'row', alignItems: 'center' },
  bannerIconWrap: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  bannerTextWrap: { flex: 1 },
  bannerTitle: { fontSize: SIZES.fontMd, ...FONTS.bold },
  bannerSub: { fontSize: SIZES.fontSm, color: COLORS.textMuted, ...FONTS.medium, marginTop: 2 },

  // Section
  sectionTitle: { fontSize: SIZES.fontXl, color: COLORS.white, ...FONTS.bold, marginBottom: 14, marginTop: 8 },

  // Weekly Schedule
  weekScroll: { marginBottom: 24 },
  dayCard: { width: 110, marginRight: 10, borderRadius: SIZES.radius, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.darkBorder },
  dayGrad: { padding: 14, alignItems: 'center', borderRadius: SIZES.radius },
  dayIcon: { fontSize: 24, marginBottom: 6 },
  dayName: { fontSize: SIZES.fontMd, color: COLORS.white, ...FONTS.bold },
  dayFocus: { fontSize: SIZES.fontXs, color: COLORS.textMuted, textAlign: 'center', marginTop: 4 },
  todayBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, marginTop: 8, backgroundColor: '#FFFFFF' },
  todayText: { fontSize: SIZES.fontXs, ...FONTS.bold },

  // Categories
  catScroll: { marginBottom: 24 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: COLORS.darkCard, borderRadius: 24, marginRight: 10,
    borderWidth: 1, borderColor: COLORS.darkBorder,
  },
  catIcon: { fontSize: 18, marginRight: 6 },
  catText: { fontSize: SIZES.fontSm, color: COLORS.textSecondary, ...FONTS.medium },

  // Exercise Card
  exerciseCard: { marginBottom: 12, borderRadius: SIZES.radius, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.darkBorder },
  exerciseGrad: { padding: 16, borderRadius: SIZES.radius },
  exerciseTop: { marginBottom: 12 },
  exerciseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  exerciseNameRow: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
  exNumberBadge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  exNumberText: { fontSize: SIZES.fontSm, ...FONTS.bold },
  exerciseName: { fontSize: SIZES.fontLg, color: COLORS.white, ...FONTS.bold, flex: 1 },
  diffBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  diffText: { fontSize: SIZES.fontXs, ...FONTS.bold },
  exerciseMuscle: { fontSize: SIZES.fontSm, color: COLORS.textMuted, marginTop: 4, marginLeft: 38 },
  exerciseStats: { flexDirection: 'row', gap: 16, marginBottom: 10 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontSize: SIZES.fontSm, color: COLORS.textSecondary, ...FONTS.medium },

  // Equipment Badge
  equipmentRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 8, padding: 8, marginBottom: 10,
  },
  equipmentGym: { backgroundColor: COLORS.primary + '08' },
  equipmentHome: { backgroundColor: '#4CAF5008' },
  equipmentText: { fontSize: SIZES.fontSm, ...FONTS.medium },

  // Tips
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.warning + '08', borderRadius: 8, padding: 8 },
  tipText: { fontSize: SIZES.fontSm, color: COLORS.textMuted, ...FONTS.medium, flex: 1 },

  // Timer
  timerCard: { alignItems: 'center' },
  timerContent: { alignItems: 'center', width: '100%' },
  timerValue: { fontSize: 52, color: COLORS.white, ...FONTS.bold, marginBottom: 4, letterSpacing: 2 },
  timerLabel: { fontSize: SIZES.fontSm, color: COLORS.textMuted, ...FONTS.medium, marginBottom: 16 },
  progressBarBg: {
    width: '100%', height: 6, backgroundColor: COLORS.darkBorder, borderRadius: 3,
    marginBottom: 16, overflow: 'hidden',
  },
  progressBarFill: { height: 6, borderRadius: 3 },
  timerBtns: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  timerBtn: {
    paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: COLORS.darkBorder + '40', borderRadius: 20,
  },
  timerBtnText: { fontSize: SIZES.fontSm, color: COLORS.textMuted, ...FONTS.semiBold },
  startTimerBtn: { borderRadius: SIZES.radius, overflow: 'hidden', width: '100%' },
  startTimerGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 8, borderRadius: SIZES.radius },
  startTimerText: { fontSize: SIZES.fontLg, color: COLORS.white, ...FONTS.bold },
  resetBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingVertical: 8, paddingHorizontal: 16 },
  resetText: { fontSize: SIZES.fontSm, color: COLORS.textMuted, ...FONTS.medium },
});

export default WorkoutScreen;
