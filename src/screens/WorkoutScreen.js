import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS } from '../constants/theme';
import { WORKOUT_CATEGORIES, EXERCISES, WEEKLY_WORKOUT_PLAN } from '../constants/data';
import Header from '../components/Header';
import GradientCard from '../components/GradientCard';

const { width } = Dimensions.get('window');

const WorkoutScreen = ({ navigation }) => {
  const [selectedCategory, setSelectedCategory] = useState('chest');
  const [workoutType, setWorkoutType] = useState('gym');

  return (
    <LinearGradient colors={COLORS.gradientDark} style={styles.container}>
      <Header title="AI Workout Generator" subtitle="Personalized Training Plans" onBack={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Workout Type Toggle */}
        <View style={styles.toggleRow}>
          {['gym', 'home'].map((type) => (
            <TouchableOpacity
              key={type}
              style={[styles.toggleBtn, workoutType === type && styles.toggleActive]}
              onPress={() => setWorkoutType(type)}
            >
              <Text style={styles.toggleIcon}>{type === 'gym' ? '🏢' : '🏠'}</Text>
              <Text style={[styles.toggleText, workoutType === type && styles.toggleTextActive]}>
                {type === 'gym' ? 'Gym Workout' : 'Home Workout'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Weekly Schedule */}
        <Text style={styles.sectionTitle}>📅 Weekly Schedule</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.weekScroll}>
          {WEEKLY_WORKOUT_PLAN.map((day, i) => (
            <TouchableOpacity key={i} style={[styles.dayCard, i === 0 && styles.dayCardActive]}>
              <LinearGradient
                colors={i === 0 ? [day.color + '30', COLORS.darkCard] : [COLORS.darkCard, COLORS.darkSurface]}
                style={styles.dayGrad}
              >
                <Text style={styles.dayIcon}>{day.icon}</Text>
                <Text style={[styles.dayName, i === 0 && { color: day.color }]}>{day.day.slice(0, 3)}</Text>
                <Text style={styles.dayFocus}>{day.focus}</Text>
                {i === 0 && <View style={[styles.todayBadge, { backgroundColor: day.color }]}><Text style={styles.todayText}>Today</Text></View>}
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Muscle Categories */}
        <Text style={styles.sectionTitle}>💪 Muscle Groups</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
          {WORKOUT_CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.catChip, selectedCategory === cat.id && { borderColor: cat.color, backgroundColor: cat.color + '15' }]}
              onPress={() => setSelectedCategory(cat.id)}
            >
              <Text style={styles.catIcon}>{cat.icon}</Text>
              <Text style={[styles.catText, selectedCategory === cat.id && { color: cat.color }]}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Exercises List */}
        <Text style={styles.sectionTitle}>
          🏋️ {WORKOUT_CATEGORIES.find(c => c.id === selectedCategory)?.name} Exercises
        </Text>
        {(EXERCISES[selectedCategory] || EXERCISES.chest).map((ex, i) => (
          <TouchableOpacity key={i} style={styles.exerciseCard} onPress={() => navigation.navigate('GymExercise')}>
            <LinearGradient colors={[COLORS.darkCard, COLORS.darkSurface]} style={styles.exerciseGrad}>
              <View style={styles.exerciseTop}>
                <View style={styles.exerciseHeader}>
                  <Text style={styles.exerciseName}>{ex.name}</Text>
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

              <View style={styles.exerciseStats}>
                <View style={styles.statItem}>
                  <Ionicons name="repeat-outline" size={14} color={COLORS.primary} />
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

              <View style={styles.tipRow}>
                <Ionicons name="bulb-outline" size={14} color={COLORS.warning} />
                <Text style={styles.tipText}>{ex.tips}</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        ))}

        {/* Rest Timer */}
        <Text style={styles.sectionTitle}>⏱️ Rest Timer</Text>
        <GradientCard colors={['#6C63FF15', '#1A1A2E']} style={styles.timerCard}>
          <View style={styles.timerContent}>
            <Text style={styles.timerValue}>01:30</Text>
            <Text style={styles.timerLabel}>Rest Between Sets</Text>
            <View style={styles.timerBtns}>
              {['30s', '60s', '90s', '120s'].map((t, i) => (
                <TouchableOpacity key={i} style={[styles.timerBtn, i === 2 && styles.timerBtnActive]}>
                  <Text style={[styles.timerBtnText, i === 2 && { color: COLORS.primary }]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.startTimerBtn}>
              <LinearGradient colors={COLORS.gradient1} style={styles.startTimerGrad}>
                <Ionicons name="play" size={24} color={COLORS.white} />
                <Text style={styles.startTimerText}>Start Timer</Text>
              </LinearGradient>
            </TouchableOpacity>
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
  toggleRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  toggleBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, backgroundColor: COLORS.darkCard, borderRadius: SIZES.radius,
    borderWidth: 1.5, borderColor: COLORS.darkBorder, gap: 8,
  },
  toggleActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '10' },
  toggleIcon: { fontSize: 20 },
  toggleText: { fontSize: SIZES.fontMd, color: COLORS.textMuted, ...FONTS.semiBold },
  toggleTextActive: { color: COLORS.primary },
  sectionTitle: { fontSize: SIZES.fontXl, color: COLORS.white, ...FONTS.bold, marginBottom: 14, marginTop: 8 },
  weekScroll: { marginBottom: 24 },
  dayCard: { width: 110, marginRight: 10, borderRadius: SIZES.radius, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.darkBorder },
  dayCardActive: { borderColor: COLORS.primary },
  dayGrad: { padding: 14, alignItems: 'center', borderRadius: SIZES.radius },
  dayIcon: { fontSize: 24, marginBottom: 6 },
  dayName: { fontSize: SIZES.fontMd, color: COLORS.white, ...FONTS.bold },
  dayFocus: { fontSize: SIZES.fontXs, color: COLORS.textMuted, textAlign: 'center', marginTop: 4 },
  todayBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, marginTop: 8 },
  todayText: { fontSize: SIZES.fontXs, color: COLORS.white, ...FONTS.bold },
  catScroll: { marginBottom: 24 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: COLORS.darkCard, borderRadius: 24, marginRight: 10,
    borderWidth: 1, borderColor: COLORS.darkBorder,
  },
  catIcon: { fontSize: 18, marginRight: 6 },
  catText: { fontSize: SIZES.fontSm, color: COLORS.textSecondary, ...FONTS.medium },
  exerciseCard: { marginBottom: 12, borderRadius: SIZES.radius, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.darkBorder },
  exerciseGrad: { padding: 16, borderRadius: SIZES.radius },
  exerciseTop: { marginBottom: 12 },
  exerciseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  exerciseName: { fontSize: SIZES.fontLg, color: COLORS.white, ...FONTS.bold },
  diffBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  diffText: { fontSize: SIZES.fontXs, ...FONTS.bold },
  exerciseMuscle: { fontSize: SIZES.fontSm, color: COLORS.textMuted, marginTop: 4 },
  exerciseStats: { flexDirection: 'row', gap: 16, marginBottom: 10 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontSize: SIZES.fontSm, color: COLORS.textSecondary, ...FONTS.medium },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.warning + '08', borderRadius: 8, padding: 8 },
  tipText: { fontSize: SIZES.fontSm, color: COLORS.textMuted, ...FONTS.medium, flex: 1 },
  timerCard: { alignItems: 'center' },
  timerContent: { alignItems: 'center', width: '100%' },
  timerValue: { fontSize: 48, color: COLORS.white, ...FONTS.bold, marginBottom: 4 },
  timerLabel: { fontSize: SIZES.fontSm, color: COLORS.textMuted, ...FONTS.medium, marginBottom: 16 },
  timerBtns: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  timerBtn: {
    paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: COLORS.darkBorder + '40', borderRadius: 20,
  },
  timerBtnActive: { backgroundColor: COLORS.primary + '20', borderWidth: 1, borderColor: COLORS.primary },
  timerBtnText: { fontSize: SIZES.fontSm, color: COLORS.textMuted, ...FONTS.semiBold },
  startTimerBtn: { borderRadius: SIZES.radius, overflow: 'hidden', width: '100%' },
  startTimerGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 8, borderRadius: SIZES.radius },
  startTimerText: { fontSize: SIZES.fontLg, color: COLORS.white, ...FONTS.bold },
});

export default WorkoutScreen;
