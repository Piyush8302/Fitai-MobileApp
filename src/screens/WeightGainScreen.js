import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES, FONTS } from '../constants/theme';
import Header from '../components/Header';
import GradientCard from '../components/GradientCard';
import ProgressRing from '../components/ProgressRing';

const WeightGainScreen = ({ navigation }) => (
  <LinearGradient colors={COLORS.gradientDark} style={styles.container}>
    <Header title="Weight Gain Program" subtitle="Healthy Mass Building Plan" onBack={() => navigation.goBack()} />
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
      {/* Progress */}
      <GradientCard colors={['#4CAF5015', COLORS.darkCard]} style={styles.card}>
        <View style={styles.row}>
          <ProgressRing progress={40} size={100} strokeWidth={10} color={COLORS.success} value="40%" label="Progress" />
          <View style={styles.info}>
            <View style={styles.infoItem}>
              <Text style={styles.label}>Current</Text>
              <Text style={styles.value}>55 kg</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.label}>Target</Text>
              <Text style={[styles.value, { color: COLORS.success }]}>65 kg</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.label}>Surplus</Text>
              <Text style={[styles.value, { color: COLORS.warning }]}>+500 kcal</Text>
            </View>
          </View>
        </View>
      </GradientCard>

      {/* High Calorie Meals */}
      <Text style={styles.sectionTitle}>🍛 High-Calorie Meal Plan</Text>
      {[
        { time: 'Breakfast 7 AM', meal: 'Banana Shake + Oats + Peanut Butter', cal: 550, icon: '🍲' },
        { time: 'Mid-Morning 10 AM', meal: 'Dry Fruits + Boiled Eggs', cal: 350, icon: '🥜' },
        { time: 'Lunch 1 PM', meal: 'Chicken/Paneer + Rice + Roti + Dal', cal: 700, icon: '🍛' },
        { time: 'Snack 4 PM', meal: 'Protein Shake + Banana', cal: 400, icon: '🥤' },
        { time: 'Pre-Workout 6 PM', meal: 'Banana + Black Coffee', cal: 150, icon: '☕' },
        { time: 'Post-Workout 8 PM', meal: 'Whey Protein + Sweet Potato', cal: 350, icon: '🍠' },
        { time: 'Dinner 9 PM', meal: 'Chapati + Egg Curry + Salad', cal: 500, icon: '🥘' },
      ].map((m, i) => (
        <TouchableOpacity key={i} style={styles.mealItem}>
          <LinearGradient colors={[COLORS.darkCard, COLORS.darkSurface]} style={styles.mealGrad}>
            <Text style={styles.mealIcon}>{m.icon}</Text>
            <View style={styles.mealInfo}>
              <Text style={styles.mealTime}>{m.time}</Text>
              <Text style={styles.mealName}>{m.meal}</Text>
            </View>
            <View style={styles.calBadge}>
              <Text style={styles.calText}>{m.cal}</Text>
              <Text style={styles.calUnit}>kcal</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      ))}

      {/* Strength Workouts */}
      <Text style={styles.sectionTitle}>💪 Strength Training</Text>
      {[
        { name: 'Squats', sets: '4x12', muscle: 'Legs', icon: '🦵' },
        { name: 'Bench Press', sets: '4x10', muscle: 'Chest', icon: '🏋️' },
        { name: 'Deadlift', sets: '3x8', muscle: 'Back', icon: '🏋️' },
        { name: 'Shoulder Press', sets: '4x10', muscle: 'Shoulders', icon: '💪' },
        { name: 'Barbell Curl', sets: '3x12', muscle: 'Biceps', icon: '🦾' },
      ].map((w, i) => (
        <View key={i} style={styles.workoutItem}>
          <Text style={styles.workoutIcon}>{w.icon}</Text>
          <View style={styles.workoutInfo}>
            <Text style={styles.workoutName}>{w.name}</Text>
            <Text style={styles.workoutMeta}>{w.muscle} • {w.sets}</Text>
          </View>
        </View>
      ))}

      {/* Mass Gainer Tips */}
      <Text style={styles.sectionTitle}>📌 Weight Gain Tips</Text>
      <GradientCard>
        {[
          { icon: '🍌', text: 'Eat calorie-dense foods like banana, nuts, ghee' },
          { icon: '🥛', text: 'Drink milk with protein powder before bed' },
          { icon: '🍚', text: 'Eat 5-6 meals a day, don\'t skip any' },
          { icon: '🏋️', text: 'Focus on compound exercises for mass gain' },
          { icon: '😴', text: 'Sleep 8+ hours for muscle recovery' },
          { icon: '💧', text: 'Stay hydrated, drink 3+ liters water' },
        ].map((t, i) => (
          <View key={i} style={styles.tipItem}>
            <Text style={styles.tipIcon}>{t.icon}</Text>
            <Text style={styles.tipText}>{t.text}</Text>
          </View>
        ))}
      </GradientCard>

      {/* Protein Tracker */}
      <Text style={styles.sectionTitle}>🥩 Daily Protein Tracker</Text>
      <GradientCard colors={['#6C63FF15', COLORS.darkCard]}>
        <View style={styles.proteinRow}>
          <ProgressRing progress={72} size={80} color={COLORS.primary} value="108g" label="of 150g" />
          <View style={styles.proteinList}>
            {[
              { source: 'Eggs (4)', amount: '24g' },
              { source: 'Chicken (200g)', amount: '40g' },
              { source: 'Whey Protein', amount: '25g' },
              { source: 'Dal + Rice', amount: '19g' },
            ].map((p, i) => (
              <View key={i} style={styles.proteinItem}>
                <Text style={styles.proteinSource}>{p.source}</Text>
                <Text style={styles.proteinAmount}>{p.amount}</Text>
              </View>
            ))}
          </View>
        </View>
      </GradientCard>

      <View style={{ height: 40 }} />
    </ScrollView>
  </LinearGradient>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingBottom: 20 },
  card: { marginBottom: 24 },
  row: { flexDirection: 'row', alignItems: 'center' },
  info: { flex: 1, marginLeft: 20 },
  infoItem: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  label: { fontSize: SIZES.fontSm, color: COLORS.textMuted, ...FONTS.medium },
  value: { fontSize: SIZES.fontMd, color: COLORS.white, ...FONTS.bold },
  sectionTitle: { fontSize: SIZES.fontXl, color: COLORS.white, ...FONTS.bold, marginBottom: 14, marginTop: 16 },
  mealItem: { marginBottom: 10, borderRadius: SIZES.radius, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.darkBorder },
  mealGrad: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: SIZES.radius },
  mealIcon: { fontSize: 28, marginRight: 14 },
  mealInfo: { flex: 1 },
  mealTime: { fontSize: SIZES.fontXs, color: COLORS.textMuted, ...FONTS.medium },
  mealName: { fontSize: SIZES.fontMd, color: COLORS.white, ...FONTS.medium, marginTop: 2 },
  calBadge: { alignItems: 'center', backgroundColor: COLORS.success + '15', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  calText: { fontSize: SIZES.fontMd, color: COLORS.success, ...FONTS.bold },
  calUnit: { fontSize: SIZES.fontXs, color: COLORS.textMuted },
  workoutItem: {
    flexDirection: 'row', alignItems: 'center', padding: 14, marginBottom: 10,
    backgroundColor: COLORS.darkCard, borderRadius: SIZES.radius,
    borderWidth: 1, borderColor: COLORS.darkBorder,
  },
  workoutIcon: { fontSize: 24, marginRight: 14 },
  workoutInfo: { flex: 1 },
  workoutName: { fontSize: SIZES.fontMd, color: COLORS.white, ...FONTS.semiBold },
  workoutMeta: { fontSize: SIZES.fontSm, color: COLORS.textMuted, marginTop: 2 },
  tipItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  tipIcon: { fontSize: 20, marginRight: 12 },
  tipText: { fontSize: SIZES.fontMd, color: COLORS.textSecondary, ...FONTS.medium, flex: 1 },
  proteinRow: { flexDirection: 'row', alignItems: 'center' },
  proteinList: { flex: 1, marginLeft: 20 },
  proteinItem: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  proteinSource: { fontSize: SIZES.fontSm, color: COLORS.textSecondary, ...FONTS.medium },
  proteinAmount: { fontSize: SIZES.fontSm, color: COLORS.primary, ...FONTS.bold },
});

export default WeightGainScreen;
